/* ═══════════════════════════════════════════════════════════════
   BÀI 6 — Điều hướng, thao tác và xem file
   Chặng 01 · Linux căn bản
   ═══════════════════════════════════════════════════════════════ */

Lesson.register({
  id: 'bai-06',
  title: 'Điều hướng, thao tác và xem file',
  minutes: 45,
  practice: 'Thực hành 25 phút',
  level: 'Người mới bắt đầu',

  intro:
    'Bài 5 cho bạn tấm bản đồ. Bài này cho bạn đôi tay. Mười lệnh dưới đây chiếm khoảng ' +
    '<b>80% số lần gõ phím</b> trong một ngày làm việc thật: đi lại trong cây thư mục, tạo, chép, ' +
    'đổi tên, xoá và đọc file. Chúng đơn giản tới mức dễ bị học qua loa — rồi ba tháng sau bạn ' +
    'xoá nhầm thư mục build vì không hiểu dấu <code>*</code> được ai mở rộng. ' +
    'Phần cuối bài là <b>liên kết cứng và liên kết mềm</b>: hai khái niệm nghe hàn lâm, nhưng ' +
    'bạn sẽ tự tay chứng minh rằng chính chúng là lý do BusyBox nhét được hơn ba trăm lệnh vào ' +
    'một file duy nhất — và bạn sẽ tìm thấy đúng thủ thuật đó đang chạy trên máy mình ngay lúc này.',

  goals: [
    'Đi lại chính xác trong cây thư mục bằng <code>cd</code> và đọc kết quả <code>ls -l</code> từng cột',
    'Tạo, chép, di chuyển và xoá file cùng thư mục bằng <code>mkdir cp mv rm</code> với đúng tuỳ chọn',
    'Giải thích được ai mở rộng dấu <code>*</code> và vì sao điều đó thay đổi cách bạn viết lệnh',
    'Chọn đúng công cụ để xem file: <code>cat</code>, <code>less</code>, <code>head</code>, <code>tail</code>',
    'Phân biệt liên kết cứng và liên kết mềm bằng số inode, không phải bằng cách nhớ thuộc lòng',
    'Chỉ ra thủ thuật multi-call trên chính máy bạn và tính được nó tiết kiệm bao nhiêu dung lượng'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. ĐỌC ls -l
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Đọc cho hết một dòng ls -l' },

    { t: 'p', x:
      'Bạn đã gặp <code>ls -l</code> nhiều lần rồi, nhưng chưa lần nào đọc hết. Mỗi dòng có ' +
      '<b>bảy cột</b>, và mỗi cột trả lời một câu hỏi khác nhau. Đây là dòng thật từ máy bạn:' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      '-rw-r--r-- 1 shinarus shinarus 29 Aug  1 15:59 main.c' },

    { t: 'fig',
      cap: 'Bảy cột của ls -l. Cột 1 gộp hai thông tin khác nhau: loại file và quyền truy cập.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Sơ đồ mổ xẻ bảy cột của kết quả lệnh ls -l">' +
        '<rect class="d-box-p" x="14" y="24" width="26" height="30" rx="4"/>' +
        '<rect class="d-box-a" x="42" y="24" width="86" height="30" rx="4"/>' +
        '<rect class="d-box" x="132" y="24" width="26" height="30" rx="4"/>' +
        '<rect class="d-box" x="162" y="24" width="150" height="30" rx="4"/>' +
        '<rect class="d-box" x="316" y="24" width="52" height="30" rx="4"/>' +
        '<rect class="d-box" x="372" y="24" width="118" height="30" rx="4"/>' +
        '<rect class="d-box-g" x="494" y="24" width="80" height="30" rx="4"/>' +
        '<text class="d-tm" x="27" y="44" text-anchor="middle">-</text>' +
        '<text class="d-tm" x="85" y="44" text-anchor="middle">rw-r--r--</text>' +
        '<text class="d-tm" x="145" y="44" text-anchor="middle">1</text>' +
        '<text class="d-tm" x="237" y="44" text-anchor="middle">shinarus shinarus</text>' +
        '<text class="d-tm" x="342" y="44" text-anchor="middle">29</text>' +
        '<text class="d-tm" x="431" y="44" text-anchor="middle">Aug  1 15:59</text>' +
        '<text class="d-tm" x="534" y="44" text-anchor="middle">main.c</text>' +

        '<line class="d-line" x1="27" y1="58" x2="27" y2="86"/>' +
        '<text class="d-t" x="14" y="102">1. Loại</text>' +
        '<text class="d-ts" x="14" y="120">- file · d thư mục · l liên kết</text>' +
        '<text class="d-ts" x="14" y="136">c thiết bị ký tự · b thiết bị khối</text>' +

        '<line class="d-line" x1="85" y1="58" x2="255" y2="150"/>' +
        '<text class="d-t" x="255" y="102">2. Quyền — Bài 8</text>' +
        '<text class="d-ts" x="255" y="120">Ba nhóm: chủ sở hữu · nhóm · người khác</text>' +

        '<line class="d-line" x1="145" y1="58" x2="255" y2="150"/>' +
        '<text class="d-t" x="255" y="150">3. Số liên kết cứng</text>' +
        '<text class="d-ts" x="255" y="168">Bao nhiêu cái tên cùng trỏ vào nội dung này</text>' +

        '<line class="d-line" x1="237" y1="58" x2="14" y2="168"/>' +
        '<text class="d-t" x="14" y="168">4-5. Chủ · Nhóm</text>' +
        '<text class="d-ts" x="14" y="186">Bài 8</text>' +

        '<line class="d-line" x1="342" y1="58" x2="500" y2="196"/>' +
        '<text class="d-t" x="500" y="102">6. Kích thước (byte)</text>' +
        '<text class="d-ts" x="500" y="120">-h để đổi sang K, M, G</text>' +
        '<text class="d-t" x="500" y="150">7. Sửa lần cuối</text>' +
        '<text class="d-ts" x="500" y="168">-t sắp xếp theo cột này</text>' +
        '<text class="d-t" x="500" y="196">8. Tên</text>' +
        '</svg>' },

    { t: 'cmdx', cmd: 'ls',
      title: 'Sáu tuỳ chọn ls bạn sẽ dùng suốt đời',
      rows: [
        ['-l', '<i>long</i> — một file một dòng, đủ bảy cột như trên.',
         'Không có nó thì <code>ls</code> chỉ in tên, không biết gì thêm.'],
        ['-a', '<i>all</i> — hiện cả file bắt đầu bằng dấu chấm.',
         'Ở Linux, "file ẩn" đơn giản là <b>tên bắt đầu bằng <code>.</code></b>. Không có thuộc tính ẩn nào cả — đó là quy ước, không phải cơ chế.'],
        ['-h', '<i>human-readable</i> — 4096 thành <code>4.0K</code>.',
         'Chỉ có tác dụng khi đi cùng <code>-l</code>.'],
        ['-t', '<i>time</i> — sắp xếp theo thời gian sửa, mới nhất trước.',
         '<code>ls -lt | head</code> trả lời ngay "tôi vừa động vào file nào?".'],
        ['-R', '<i>recursive</i> — xuống hết mọi thư mục con.',
         'Cẩn thận trong cây mã nguồn kernel: hơn 80 nghìn file.'],
        ['-d', '<i>directory</i> — nói về <b>chính thư mục</b>, không phải nội dung.',
         '<code>ls -l duan</code> liệt kê bên trong; <code>ls -ld duan</code> mô tả cái thư mục.'],
        ['-i', '<i>inode</i> — hiện số inode ở cột đầu.',
         'Đây là chìa khoá để phân biệt liên kết cứng ở cuối bài.']
      ]},

    { t: 'cal', kind: 'tip', title: 'Gộp tuỳ chọn thoải mái', x:
      '<p><code>ls -l -a -h</code> và <code>ls -lah</code> hoàn toàn giống nhau — Bài 4 đã giải thích ' +
      'vì sao các tuỳ chọn một chữ có thể dính liền. Trong thực tế hầu như ai cũng gõ ' +
      '<code>ls -lah</code> theo phản xạ.</p>' },

    { t: 'cal', kind: 'warn', title: 'ls không có màu khi kết quả bị chuyển hướng', x:
      '<p>Trên terminal, <code>ls</code> tô màu thư mục khác file. Nhưng khi bạn viết ' +
      '<code>ls &gt; ds.txt</code> hoặc <code>ls | grep …</code>, màu biến mất.</p>' +
      '<p>Đó là <b>cố ý</b>: <code>ls</code> phát hiện đầu ra không phải màn hình nên bỏ mã màu, ' +
      'nếu không file kết quả sẽ đầy ký tự rác kiểu <code>^[[0m</code>. Bài 10 sẽ giải thích cơ chế ' +
      'chuyển hướng này.</p>' },

    /* ══════════════════════════════════════════════
       2. TẠO, CHÉP, DI CHUYỂN, XOÁ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Bốn lệnh làm thay đổi đĩa' },

    { t: 'p', x:
      '<code>ls</code> và <code>cd</code> vô hại. Bốn lệnh dưới đây thì không — chúng ghi lên đĩa, ' +
      'và Linux <b>không có thùng rác</b>. Hãy học kỹ tuỳ chọn của chúng ngay từ đầu.' },

    { t: 'table',
      head: ['Lệnh', 'Việc nó làm', 'Tuỳ chọn phải thuộc'],
      rows: [
        ['<code>mkdir</code>', 'Tạo thư mục',
         '<code>-p</code> tạo cả cây cha, và <b>không báo lỗi nếu đã tồn tại</b>'],
        ['<code>cp</code>', 'Chép — bản gốc còn nguyên',
         '<code>-r</code> cho thư mục · <code>-a</code> giữ nguyên thời gian và quyền · <code>-v</code> nói ra đang làm gì'],
        ['<code>mv</code>', 'Di chuyển <b>hoặc</b> đổi tên — cùng một lệnh',
         '<code>-n</code> không ghi đè · <code>-v</code> nói ra'],
        ['<code>rm</code>', 'Xoá vĩnh viễn',
         '<code>-r</code> cho thư mục · <code>-f</code> không hỏi · <code>-i</code> hỏi từng file'],
        ['<code>rmdir</code>', 'Xoá thư mục <b>rỗng</b>',
         'Không có tuỳ chọn nào đáng nhớ — nó an toàn vì chỉ làm được khi thư mục rỗng']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao mv vừa là "di chuyển" vừa là "đổi tên"', x:
      '<p>Vì với hệ thống file, hai việc đó là <b>một</b>. Một thư mục thực chất là bảng ánh xạ ' +
      '<i>tên → số inode</i>. Nội dung file nằm ở chỗ khác, thư mục chỉ giữ cái tên.</p>' +
      '<p>Đổi tên trong cùng thư mục = sửa một dòng trong bảng. Chuyển sang thư mục khác trên ' +
      '<b>cùng phân vùng</b> = xoá dòng ở bảng này, thêm dòng ở bảng kia. Cả hai đều không ' +
      'đụng tới một byte dữ liệu nào — đó là lý do <code>mv</code> một file 4 GB trong cùng ổ ' +
      'xong ngay lập tức, còn <code>cp</code> thì phải chờ.</p>' +
      '<p>Sang phân vùng khác thì <code>mv</code> buộc phải chép thật rồi xoá, và lúc đó nó chậm ' +
      'đúng bằng <code>cp</code>.</p>' },

    { t: 'cal', kind: 'danger', title: 'Ba câu lệnh rm đã phá sự nghiệp của nhiều người', x:
      '<p><code>rm -rf /</code> — xoá toàn bộ hệ thống. Bản <code>rm</code> hiện đại chặn sẵn ' +
      'trường hợp này, nhưng đừng thử.</p>' +
      '<p><code>rm -rf $DIR/*</code> khi biến <code>$DIR</code> <b>rỗng</b> — nó biến thành ' +
      '<code>rm -rf /*</code>. Đây là lỗi đã xoá sạch máy chủ thật, nhiều lần. Bài 13 sẽ dạy bạn ' +
      '<code>set -u</code> để bash dừng lại thay vì thay biến rỗng vào.</p>' +
      '<p><code>rm -rf duan /build</code> — thừa một dấu cách trước <code>/build</code>, và bạn ' +
      'vừa yêu cầu xoá hai thứ thay vì một.</p>' +
      '<p><b>Thói quen tự bảo vệ:</b> gõ <code>ls</code> với đúng đường dẫn đó trước, nhìn kết quả, ' +
      'rồi mới đổi <code>ls</code> thành <code>rm -r</code>.</p>' },

    /* ══════════════════════════════════════════════
       3. WILDCARD
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Ký tự đại diện: ai thật sự mở rộng dấu sao' },

    { t: 'p', x:
      'Đây là chỗ hầu hết người mới hiểu sai, và hiểu sai ở đây dẫn thẳng tới tai nạn. ' +
      'Khi bạn gõ <code>rm *.o</code>, <b><code>rm</code> không bao giờ nhìn thấy dấu sao</b>.' },

    { t: 'fig',
      cap: 'Shell mở rộng ký tự đại diện trước khi chương trình chạy. Chương trình chỉ nhận danh sách tên đã có sẵn.',
      svg:
        '<svg viewBox="0 0 720 210" width="720" role="img" aria-label="Sơ đồ shell mở rộng dấu sao thành danh sách tên file trước khi gọi lệnh rm">' +
        '<rect class="d-box" x="20" y="20" width="180" height="46" rx="6"/>' +
        '<text class="d-t" x="110" y="40" text-anchor="middle">Bạn gõ</text>' +
        '<text class="d-tm" x="110" y="58" text-anchor="middle">rm *.o</text>' +

        '<line class="d-line" x1="200" y1="43" x2="252" y2="43"/>' +
        '<path class="d-arrow" d="M252 43 l-8 -4 v8 z"/>' +

        '<rect class="d-box-p" x="256" y="12" width="200" height="62" rx="6"/>' +
        '<text class="d-t" x="356" y="34" text-anchor="middle">Shell (bash)</text>' +
        '<text class="d-ts" x="356" y="52" text-anchor="middle">nhìn vào thư mục hiện tại</text>' +
        '<text class="d-ts" x="356" y="66" text-anchor="middle">tìm mọi tên khớp mẫu</text>' +

        '<line class="d-line" x1="456" y1="43" x2="508" y2="43"/>' +
        '<path class="d-arrow" d="M508 43 l-8 -4 v8 z"/>' +

        '<rect class="d-box-g" x="512" y="12" width="190" height="62" rx="6"/>' +
        '<text class="d-t" x="607" y="34" text-anchor="middle">rm thật sự nhận được</text>' +
        '<text class="d-tm" x="607" y="54" text-anchor="middle">rm main.o uart.o</text>' +
        '<text class="d-ts" x="607" y="68" text-anchor="middle">hai đối số, không có dấu sao</text>' +

        '<rect class="d-box-w" x="20" y="108" width="682" height="80" rx="6"/>' +
        '<text class="d-t" x="40" y="132">Hệ quả 1 — nếu không có file nào khớp, bash giao nguyên chuỗi *.o cho lệnh.</text>' +
        '<text class="d-ts" x="40" y="150">Đó là lý do thông báo lỗi hiện ra đúng chữ *.o chứ không phải một tên file.</text>' +
        '<text class="d-t" x="40" y="172">Hệ quả 2 — nháy kép chặn mở rộng: "*.o" giữ nguyên dấu sao, Bài 4 đã nói.</text>' +
        '</svg>' },

    { t: 'table',
      head: ['Mẫu', 'Khớp với', 'Ví dụ thật'],
      rows: [
        ['<code>*</code>', 'Bất kỳ chuỗi nào, kể cả rỗng',
         '<code>*.c</code> → <code>gpio.c main.c uart.c</code>'],
        ['<code>?</code>', 'Đúng <b>một</b> ký tự bất kỳ',
         '<code>?pio.c</code> → chỉ <code>gpio.c</code>'],
        ['<code>[abc]</code>', 'Một ký tự nằm trong danh sách',
         '<code>[gu]*</code> → <code>gpio.c uart.c</code>, bỏ qua <code>main.c</code>'],
        ['<code>[0-9]</code>', 'Một ký tự trong khoảng',
         '<code>bai0[12].txt</code> → <code>bai01.txt bai02.txt</code>, bỏ <code>bai10.txt</code>'],
        ['<code>[!a]</code>', 'Một ký tự <b>không</b> nằm trong danh sách',
         '<code>[!m]*.c</code> → mọi file <code>.c</code> không bắt đầu bằng m'],
        ['<code>{a,b}</code>', 'Mở rộng dấu ngoặc — <b>không</b> cần file tồn tại',
         '<code>echo bai{1,2}</code> → <code>bai1 bai2</code>']
      ]},

    { t: 'cal', kind: 'warn', title: 'Ký tự đại diện không phải biểu thức chính quy', x:
      '<p>Chúng nhìn giống nhau nhưng nghĩa khác hẳn. Với ký tự đại diện của shell, ' +
      '<code>*</code> nghĩa là "chuỗi bất kỳ". Với biểu thức chính quy của <code>grep</code>, ' +
      '<code>*</code> nghĩa là "ký tự đứng trước, lặp không hoặc nhiều lần".</p>' +
      '<p>Vì thế <code>ls *.c</code> và <code>grep "*.c"</code> làm hai việc hoàn toàn khác nhau. ' +
      'Bài 11 sẽ dành hẳn một mục cho khác biệt này — nó là nguồn nhầm lẫn kinh điển.</p>' },

    { t: 'cal', kind: 'why', title: 'Vì sao thiết kế này lại hợp lý', x:
      '<p>Vì nếu mỗi chương trình tự xử lý dấu sao, thì <code>rm</code>, <code>cp</code>, ' +
      '<code>gcc</code> và mọi lệnh khác đều phải cài lại cùng một đoạn mã, và chắc chắn sẽ khác ' +
      'nhau ở vài chi tiết.</p>' +
      '<p>Đặt việc đó vào shell nghĩa là <b>viết một lần, mọi chương trình hưởng lợi</b> — kể cả ' +
      'chương trình bạn tự viết ngày mai. Đây là lần đầu bạn gặp triết lý Unix; Bài 10 sẽ nói ' +
      'thẳng về nó. Trên Windows thì ngược lại: <code>cmd.exe</code> giao nguyên dấu sao cho ' +
      'chương trình, nên mỗi chương trình xử lý một kiểu.</p>' },

    /* ══════════════════════════════════════════════
       4. XEM FILE
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Bốn cách xem một file, và cách chọn đúng' },

    { t: 'p', x:
      'Người mới thường chỉ biết <code>cat</code> rồi dùng nó cho mọi thứ. Đến khi <code>cat</code> ' +
      'một file log 200 nghìn dòng thì màn hình trôi vèo trong mười giây và không đọc được gì. ' +
      'Bốn công cụ dưới đây có bốn nhiệm vụ khác nhau.' },

    { t: 'table',
      head: ['Lệnh', 'Dùng khi', 'Vì sao'],
      rows: [
        ['<code>cat</code>', 'File ngắn, dưới một màn hình',
         'Đổ hết ra rồi thoát. Ưu điểm là <b>ghép được nhiều file</b> và nối được vào lệnh khác'],
        ['<code>less</code>', 'File dài, cần cuộn và tìm kiếm',
         'Không nạp cả file vào RAM — mở được file 10 GB tức thì. Hỗ trợ tìm kiếm'],
        ['<code>head</code>', 'Chỉ cần biết file này là cái gì',
         'Tiêu đề, dòng đầu của CSV, dòng <code>#!</code> của script'],
        ['<code>tail</code>', 'Chỉ cần biết vừa xảy ra chuyện gì',
         'Log mới nhất luôn ở <b>cuối</b> file. <code>tail -f</code> theo dõi trực tiếp']
      ]},

    { t: 'cal', kind: 'info', title: 'Vì sao tên nó là cat', x:
      '<p><code>cat</code> viết tắt của <i>concatenate</i> — <b>nối</b>. Nhiệm vụ gốc của nó là ' +
      'ghép nhiều file thành một luồng: <code>cat a.txt b.txt &gt; gop.txt</code>.</p>' +
      '<p>Việc "in một file ra màn hình" chỉ là trường hợp đặc biệt khi bạn đưa cho nó đúng một ' +
      'file. Hiểu điều này giúp bạn nhớ vì sao nó vô dụng với file dài — nó chưa bao giờ được ' +
      'thiết kế để đọc.</p>' },

    { t: 'cmdx', cmd: 'head / tail',
      title: 'Các dạng bạn sẽ gõ hằng ngày',
      rows: [
        ['head file', 'Mười dòng đầu — con số mặc định.', ''],
        ['head -3 file', 'Ba dòng đầu.', 'Viết đầy đủ là <code>head -n 3</code>.'],
        ['head -c 20 file', 'Hai mươi <b>byte</b> đầu, không quan tâm dòng.',
         'Dùng để liếc phần đầu file nhị phân mà không làm loạn terminal.'],
        ['tail -3 file', 'Ba dòng cuối.', 'Lệnh phản xạ khi một dịch vụ vừa chết.'],
        ['tail -n +198 file', 'Từ dòng 198 <b>tới hết</b>.',
         'Dấu <code>+</code> đảo ý nghĩa: đếm từ đầu file thay vì từ cuối.'],
        ['tail -f file', 'In tiếp mọi dòng mới được ghi vào, cho tới khi bạn nhấn Ctrl+C.',
         '<b>Cách theo dõi log của thiết bị.</b> Bài 47 sẽ dùng để xem log khởi động của board.']
      ]},

    { t: 'cal', kind: 'tip', title: 'Sáu phím để sống sót trong less', x:
      '<p><kbd>Space</kbd> trang sau · <kbd>b</kbd> trang trước · <kbd>g</kbd> về đầu · ' +
      '<kbd>G</kbd> xuống cuối · <kbd>/</kbd> gõ chữ cần tìm rồi <kbd>Enter</kbd> · ' +
      '<kbd>n</kbd> kết quả kế tiếp · <kbd>q</kbd> thoát.</p>' +
      '<p>Chính xác là các phím của <code>man</code> ở Bài 4 — vì <code>man</code> hiển thị nội ' +
      'dung <b>bằng</b> <code>less</code>. Học một lần dùng cho cả hai.</p>' },

    { t: 'cal', kind: 'warn', title: 'Đừng cat file nhị phân', x:
      '<p><code>cat /bin/ls</code> sẽ phun hàng nghìn byte rác vào terminal, trong đó có các mã ' +
      'điều khiển làm hỏng bảng ký tự — sau đó mọi thứ bạn gõ hiện ra thành ký hiệu lạ.</p>' +
      '<p>Nếu lỡ tay: gõ <code>reset</code> rồi <kbd>Enter</kbd> (dù màn hình không hiện gì), ' +
      'terminal sẽ trở lại bình thường.</p>' +
      '<p>Muốn nhìn nội dung file nhị phân, dùng <code>od -An -c</code> hoặc <code>xxd</code> — ' +
      'chúng chuyển byte thành ký tự an toàn trước khi in.</p>' },

    /* ══════════════════════════════════════════════
       5. LIÊN KẾT
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Liên kết cứng và liên kết mềm' },

    { t: 'p', x:
      'Ở Bài 5 bạn đã thấy <code>/bin -&gt; usr/bin</code> và tự hỏi mũi tên đó là gì. ' +
      'Để trả lời, cần biết một sự thật về hệ thống file: <b>tên file và nội dung file là hai thứ ' +
      'tách rời nhau</b>.' },

    { t: 'terms', items: [
      ['inode', '', 'Cấu trúc dữ liệu chứa <b>mọi thứ về một file trừ cái tên</b>: kích thước, ' +
       'quyền, chủ sở hữu, thời gian, và vị trí các khối dữ liệu trên đĩa. Mỗi inode có một số ' +
       'định danh duy nhất trong phân vùng. Xem bằng <code>ls -i</code>.'],
      ['Thư mục', '', 'Không "chứa" file. Nó chỉ là một <b>bảng ánh xạ tên → số inode</b>. ' +
       'Đó là toàn bộ vai trò của nó.'],
      ['Liên kết cứng', 'hard link', 'Thêm một <b>tên mới</b> vào bảng, trỏ tới inode <b>đã có</b>. ' +
       'Hai tên hoàn toàn bình đẳng — không có cái nào là "bản gốc". Tạo bằng <code>ln a b</code>.'],
      ['Liên kết mềm', 'symlink', 'Một file riêng biệt, có inode riêng, nội dung của nó là ' +
       '<b>một đường dẫn dạng chuỗi ký tự</b>. Tạo bằng <code>ln -s a b</code>.'],
      ['Số liên kết', 'link count', 'Cột thứ ba của <code>ls -l</code>: có bao nhiêu cái tên đang ' +
       'trỏ vào inode này. Kernel chỉ giải phóng dữ liệu khi số này về <b>0</b>.']
    ]},

    { t: 'fig',
      cap: 'Liên kết cứng là tên thứ hai của cùng một inode; liên kết mềm là một file riêng chứa đường dẫn. Xoá bản gốc phá hỏng liên kết mềm nhưng không ảnh hưởng liên kết cứng.',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Sơ đồ so sánh liên kết cứng và liên kết mềm, cho thấy liên kết cứng trỏ thẳng vào inode còn liên kết mềm trỏ vào tên file">' +
        '<text class="d-t" x="20" y="18">LIÊN KẾT CỨNG — ln goc.txt cung.txt</text>' +

        '<rect class="d-box" x="20" y="30" width="120" height="34" rx="5"/>' +
        '<text class="d-tm" x="80" y="52" text-anchor="middle">goc.txt</text>' +
        '<rect class="d-box" x="20" y="76" width="120" height="34" rx="5"/>' +
        '<text class="d-tm" x="80" y="98" text-anchor="middle">cung.txt</text>' +

        '<line class="d-line" x1="140" y1="47" x2="252" y2="66"/>' +
        '<path class="d-arrow" d="M252 66 l-9 -1 l3 -7 z"/>' +
        '<line class="d-line" x1="140" y1="93" x2="252" y2="76"/>' +
        '<path class="d-arrow" d="M252 76 l-9 1 l3 7 z"/>' +

        '<rect class="d-box-p" x="256" y="46" width="150" height="50" rx="5"/>' +
        '<text class="d-t" x="331" y="66" text-anchor="middle">inode 56384</text>' +
        '<text class="d-ts" x="331" y="84" text-anchor="middle">số liên kết = 2</text>' +

        '<line class="d-line" x1="406" y1="71" x2="452" y2="71"/>' +
        '<path class="d-arrow" d="M452 71 l-8 -4 v8 z"/>' +
        '<rect class="d-box-g" x="456" y="46" width="150" height="50" rx="5"/>' +
        '<text class="d-t" x="531" y="66" text-anchor="middle">Dữ liệu trên đĩa</text>' +
        '<text class="d-ts" x="531" y="84" text-anchor="middle">chỉ có một bản</text>' +

        '<text class="d-ts" x="620" y="66">Xoá goc.txt</text>' +
        '<text class="d-ts" x="620" y="84">→ vẫn đọc được</text>' +

        '<line class="d-line" x1="20" y1="130" x2="700" y2="130"/>' +

        '<text class="d-t" x="20" y="158">LIÊN KẾT MỀM — ln -s goc.txt mem.txt</text>' +

        '<rect class="d-box-a" x="20" y="170" width="120" height="50" rx="5"/>' +
        '<text class="d-tm" x="80" y="190" text-anchor="middle">mem.txt</text>' +
        '<text class="d-ts" x="80" y="208" text-anchor="middle">inode 56398</text>' +

        '<line class="d-line" x1="140" y1="195" x2="192" y2="195"/>' +
        '<path class="d-arrow" d="M192 195 l-8 -4 v8 z"/>' +

        '<rect class="d-box-w" x="196" y="170" width="176" height="50" rx="5"/>' +
        '<text class="d-ts" x="284" y="190" text-anchor="middle">nội dung chỉ là chuỗi</text>' +
        '<text class="d-tm" x="284" y="208" text-anchor="middle">"goc.txt"</text>' +

        '<line class="d-line" x1="372" y1="195" x2="424" y2="195"/>' +
        '<path class="d-arrow" d="M424 195 l-8 -4 v8 z"/>' +

        '<rect class="d-box" x="428" y="170" width="150" height="50" rx="5"/>' +
        '<text class="d-ts" x="503" y="190" text-anchor="middle">tra lại cái TÊN đó</text>' +
        '<text class="d-ts" x="503" y="208" text-anchor="middle">trong thư mục</text>' +

        '<text class="d-ts" x="596" y="190">Xoá goc.txt</text>' +
        '<text class="d-ts" x="596" y="208">→ liên kết gãy</text>' +

        '<rect class="d-box-w" x="20" y="240" width="682" height="46" rx="6"/>' +
        '<text class="d-t" x="40" y="262">Khác biệt gốc rễ: liên kết cứng trỏ vào INODE, liên kết mềm trỏ vào TÊN.</text>' +
        '<text class="d-ts" x="40" y="280">Mọi tính chất còn lại của hai loại đều suy ra được từ một câu này.</text>' +
        '</svg>' },

    { t: 'table',
      head: ['Tiêu chí', 'Liên kết cứng', 'Liên kết mềm'],
      rows: [
        ['Tạo bằng', '<code>ln goc dich</code>', '<code>ln -s goc dich</code>'],
        ['Số inode', '<b>Giống hệt</b> bản gốc', 'Khác — nó là file riêng'],
        ['Ký tự đầu ở <code>ls -l</code>', '<code>-</code>, y như file thường', '<code>l</code>, kèm mũi tên'],
        ['Xoá bản gốc', 'Không sao, dữ liệu vẫn còn', '<b>Gãy</b> — <code>No such file or directory</code>'],
        ['Trỏ tới thư mục', '<b>Không được</b> — kernel cấm', 'Được'],
        ['Qua phân vùng khác', '<b>Không được</b> — số inode chỉ có nghĩa trong một phân vùng', 'Được'],
        ['Tốn bao nhiêu', 'Một dòng trong bảng thư mục', 'Một inode + độ dài đường dẫn'],
        ['Dùng trong nhúng để', 'BusyBox: một binary, ba trăm tên lệnh', '<code>/bin → usr/bin</code>, chọn phiên bản thư viện']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao liên kết cứng không thể trỏ tới thư mục', x:
      '<p>Vì nó sẽ tạo ra <b>vòng lặp</b>. Nếu <code>/a/b</code> là liên kết cứng tới <code>/a</code>, ' +
      'thì <code>/a/b/b/b/b/…</code> hợp lệ vô hạn. Mọi công cụ duyệt cây — <code>find</code>, ' +
      '<code>du</code>, chương trình sao lưu — sẽ chạy mãi không dừng.</p>' +
      '<p>Liên kết mềm cũng tạo được vòng lặp tương tự, nhưng kernel <b>phát hiện được</b>: nó đếm ' +
      'số lần đi qua liên kết mềm và dừng ở ngưỡng 40, trả về lỗi <code>Too many levels of symbolic ' +
      'links</code>. Với liên kết cứng thì không có cách nào phân biệt — vì liên kết cứng ' +
      '<b>không phải</b> một loại file đặc biệt, nó chỉ là một cái tên.</p>' },

    { t: 'cal', kind: 'why', title: 'Vì sao liên kết cứng không vượt được phân vùng', x:
      '<p>Vì liên kết cứng lưu <b>số inode</b>, mà số inode chỉ có ý nghĩa bên trong một hệ thống ' +
      'file. Inode 56384 của phân vùng gốc và inode 56384 của thẻ SD là hai file hoàn toàn khác nhau.</p>' +
      '<p>Bạn sẽ gặp lỗi này thật khi thử liên kết một file trong WSL sang <code>/mnt/c</code> — ' +
      'phần thực hành có kết quả cụ thể.</p>' },

    /* ══════════════════════════════════════════════
       6. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: dựng một cây dự án rồi mổ xẻ liên kết' },

    { t: 'p', x:
      'Toàn bộ phần này chạy trong <b>WSL</b>, bên trong <code>~/embedded/bai06</code>. Mọi thứ ' +
      'bạn tạo đều nằm gọn trong thư mục đó và sẽ được xoá ở bước cuối, nên cứ thoải mái thử.' },

    { t: 'steps', items: [

      { title: 'Dựng cây thư mục kiểu một dự án nhúng',
        blocks: [
          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/embedded/bai06\n' +
            'cd ~/embedded/bai06\n' +
            'mkdir -p duan/src duan/include duan/build duan/docs\n' +
            'touch duan/src/main.c duan/src/uart.c duan/src/gpio.c\n' +
            'touch duan/include/uart.h duan/include/gpio.h\n' +
            'touch duan/docs/README.md duan/docs/ghi-chu.txt\n' +
            'echo "int main(void) { return 0; }" > duan/src/main.c\n' +
            'ls -R duan' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'duan:\n' +
            'build\n' +
            'docs\n' +
            'include\n' +
            'src\n' +
            '\n' +
            'duan/build:\n' +
            '\n' +
            'duan/docs:\n' +
            'README.md\n' +
            'ghi-chu.txt\n' +
            '\n' +
            'duan/include:\n' +
            'gpio.h\n' +
            'uart.h\n' +
            '\n' +
            'duan/src:\n' +
            'gpio.c\n' +
            'main.c\n' +
            'uart.c' },

          { t: 'cmdx', cmd: 'mkdir -p duan/src duan/include',
            title: 'Mổ xẻ câu lệnh',
            rows: [
              ['mkdir', '<i>make directory</i>.', ''],
              ['-p', '<i>parents</i> — tạo luôn mọi thư mục cha còn thiếu, và <b>không báo lỗi nếu đích đã tồn tại</b>.',
               'Tính chất thứ hai quan trọng hơn: nhờ nó, <code>mkdir -p</code> chạy lại lần thứ hai vẫn thành công. Script cài đặt nào cũng dựa vào điều này.'],
              ['duan/src duan/include', 'Nhiều đối số — tạo nhiều thư mục trong một lần gọi.',
               'Gần như mọi lệnh thao tác file đều nhận nhiều đối số như vậy.'],
              ['touch', 'Tạo file rỗng, hoặc cập nhật thời gian nếu file đã có.',
               'Tên bắt nguồn từ nhiệm vụ gốc: "chạm" vào file để đổi mốc thời gian, buộc <code>make</code> biên dịch lại.']
            ]},

          { t: 'p', x:
            'Bạn có thể đã nghe tới lệnh <code>tree</code> để vẽ cây đẹp hơn. Thử xem:' },
          { t: 'code', where: 'wsl', code: 'tree duan' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'bash: tree: command not found' },

          { t: 'cal', kind: 'info', title: 'Lỗi này là bài học, không phải sự cố', x:
            '<p><code>tree</code> <b>không</b> nằm trong bản cài mặc định của Ubuntu. Bài 12 sẽ dạy ' +
            'bạn cài nó bằng <code>sudo apt install tree</code>.</p>' +
            '<p>Nhưng hãy nhớ điều quan trọng hơn: trên một board nhúng thật, ' +
            '<code>tree</code> <b>gần như chắc chắn không có</b>, và bạn cũng không cài thêm được. ' +
            'Vì vậy hai lệnh dưới đây mới là kỹ năng thật — chúng dùng công cụ luôn có sẵn:</p>' },

          { t: 'code', where: 'wsl', code:
            'find duan | sort' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'duan\n' +
            'duan/build\n' +
            'duan/docs\n' +
            'duan/docs/README.md\n' +
            'duan/docs/ghi-chu.txt\n' +
            'duan/include\n' +
            'duan/include/gpio.h\n' +
            'duan/include/uart.h\n' +
            'duan/src\n' +
            'duan/src/gpio.c\n' +
            'duan/src/main.c\n' +
            'duan/src/uart.c' },

          { t: 'cal', kind: 'tip', x:
            '<p><code>find</code> in ra <b>đường dẫn đầy đủ</b> của từng thứ, mỗi thứ một dòng. ' +
            'Định dạng này xấu hơn <code>tree</code> với mắt người, nhưng tốt hơn hẳn với máy: ' +
            'bạn nối được thẳng vào <code>grep</code>, <code>xargs</code> hay vòng lặp. ' +
            'Bài 11 sẽ khai thác cạn lệnh này.</p>' }
        ]},

      { title: 'Đọc kết quả ls dưới sáu góc nhìn',
        blocks: [
          { t: 'code', where: 'wsl', code:
            'ls -la duan/src\n' +
            'ls -lh duan/src\n' +
            'ls -lt duan/src\n' +
            'ls -ld duan' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'total 12\n' +
            'drwxr-xr-x 2 shinarus shinarus 4096 Aug  1 15:59 .\n' +
            'drwxr-xr-x 6 shinarus shinarus 4096 Aug  1 15:59 ..\n' +
            '-rw-r--r-- 1 shinarus shinarus    0 Aug  1 15:59 gpio.c\n' +
            '-rw-r--r-- 1 shinarus shinarus   29 Aug  1 15:59 main.c\n' +
            '-rw-r--r-- 1 shinarus shinarus    0 Aug  1 15:59 uart.c\n' +
            '\n' +
            'total 4.0K\n' +
            '-rw-r--r-- 1 shinarus shinarus  0 Aug  1 15:59 gpio.c\n' +
            '-rw-r--r-- 1 shinarus shinarus 29 Aug  1 15:59 main.c\n' +
            '-rw-r--r-- 1 shinarus shinarus  0 Aug  1 15:59 uart.c\n' +
            '\n' +
            '-rw-r--r-- 1 shinarus shinarus 29 Aug  1 15:59 main.c\n' +
            '-rw-r--r-- 1 shinarus shinarus  0 Aug  1 15:59 uart.c\n' +
            '-rw-r--r-- 1 shinarus shinarus  0 Aug  1 15:59 gpio.c\n' +
            '\n' +
            'drwxr-xr-x 6 shinarus shinarus 4096 Aug  1 15:59 duan' },

          { t: 'cal', kind: 'info', title: 'Bốn chi tiết đáng để ý', x:
            '<p><b>total 12</b> không phải tổng kích thước file mà là số <b>khối 1 KiB</b> mà thư ' +
            'mục này chiếm trên đĩa. Ba file rỗng vẫn tốn chỗ vì mỗi file cần ít nhất một khối.</p>' +
            '<p><code>-la</code> làm hiện <code>.</code> và <code>..</code> — chúng là mục thật ' +
            'trong bảng thư mục, không phải ký hiệu do shell bịa ra.</p>' +
            '<p><code>-lt</code> đảo thứ tự: <code>main.c</code> lên đầu vì nó được ghi sau cùng ' +
            '(lệnh <code>echo</code> ở bước 1). Ba file kia cùng một giây nên thứ tự giữa chúng ' +
            'không có ý nghĩa.</p>' +
            '<p><code>-ld duan</code> mô tả <b>chính thư mục</b>: số liên kết <b>6</b>. Không phải ' +
            'ngẫu nhiên — đó là <code>.</code> của chính nó, <code>duan</code> trong thư mục cha, ' +
            'cộng bốn mục <code>..</code> của bốn thư mục con.</p>' }
        ]},

      { title: 'Chứng minh shell mới là kẻ mở rộng dấu sao',
        blocks: [
          { t: 'code', where: 'wsl', code:
            'cd ~/embedded/bai06/duan/src\n' +
            'ls *.c\n' +
            'ls ?pio.c\n' +
            'ls [gu]*' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'gpio.c\n' +
            'main.c\n' +
            'uart.c\n' +
            '\n' +
            'gpio.c\n' +
            '\n' +
            'gpio.c\n' +
            'uart.c' },

          { t: 'p', x:
            'Bây giờ yêu cầu một mẫu <b>không khớp gì cả</b>. Hãy đọc kỹ thông báo lỗi:' },
          { t: 'code', where: 'wsl', code:
            'ls *.cpp\n' +
            'echo "ma thoat: $?"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'ls: cannot access \'*.cpp\': No such file or directory\n' +
            'ma thoat: 2' },

          { t: 'cal', kind: 'why', title: 'Thông báo lỗi vừa tiết lộ toàn bộ cơ chế', x:
            '<p><code>ls</code> than phiền về một file <b>tên là <code>*.cpp</code></b>. Nghĩa là nó ' +
            'thật sự nhận được chuỗi có dấu sao làm đối số.</p>' +
            '<p>Vì sao? Vì bash tìm trong thư mục, không thấy tên nào khớp, nên theo mặc định nó ' +
            '<b>giao nguyên mẫu</b> cho lệnh thay vì giao danh sách rỗng. Khi có file khớp thì ' +
            '<code>ls</code> không bao giờ thấy dấu sao — bằng chứng là ba lệnh ở trên chạy trơn tru.</p>' +
            '<p>Đây chính là cái bẫy đằng sau <code>rm -rf $DIR/*</code>: nếu biến rỗng, mẫu trở ' +
            'thành <code>/*</code> và lần này nó <b>khớp thật</b>.</p>' },

          { t: 'p', x: 'Xem trực tiếp cái mà lệnh nhận được, bằng cách hỏi <code>echo</code>:' },
          { t: 'code', where: 'wsl', code:
            'echo *\n' +
            'echo "*"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'gpio.c main.c uart.c\n' +
            '*' },

          { t: 'cal', kind: 'tip', title: 'Mẹo an toàn dùng được cả đời', x:
            '<p>Trước khi chạy một lệnh nguy hiểm có ký tự đại diện, <b>thay lệnh đó bằng ' +
            '<code>echo</code></b>. Bash mở rộng y hệt, nhưng <code>echo</code> chỉ in ra chứ ' +
            'không xoá gì.</p>' +
            '<p><code>echo rm -rf build/*</code> cho bạn xem chính xác danh sách sắp bị xoá. ' +
            'Hài lòng rồi thì bỏ chữ <code>echo</code> đi.</p>' }
        ]},

      { title: 'Chép, đổi tên và xoá — kèm ba lỗi cố tình',
        blocks: [
          { t: 'code', where: 'wsl', code:
            'cd ~/embedded/bai06\n' +
            'cp duan/src/main.c duan/src/main.c.bak\n' +
            'cp -r duan duan-copy\n' +
            'ls duan-copy' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'build\n' +
            'docs\n' +
            'include\n' +
            'src' },

          { t: 'p', x: 'Giờ thử chép một thư mục mà <b>quên</b> <code>-r</code>:' },
          { t: 'code', where: 'wsl', code:
            'cp duan thumuc-dich\n' +
            'echo "ma thoat: $?"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'cp: -r not specified; omitting directory \'duan\'\n' +
            'ma thoat: 1' },

          { t: 'p', x:
            'Tiếp theo, so sánh <code>cp -r</code> với <code>cp -a</code>. Khác biệt nằm ở ' +
            '<b>thời gian sửa</b> — và nó quan trọng hơn bạn tưởng:' },
          { t: 'code', where: 'wsl', code:
            'mkdir -p src2 && touch -d \'2020-01-01 10:00\' src2/cu.txt\n' +
            'cp -a src2 dst-a\n' +
            'cp -r src2 dst-r\n' +
            'ls -l --time-style=long-iso dst-a dst-r' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'dst-a:\n' +
            'total 0\n' +
            '-rw-r--r-- 1 shinarus shinarus 0 2020-01-01 17:00 cu.txt\n' +
            '\n' +
            'dst-r:\n' +
            'total 0\n' +
            '-rw-r--r-- 1 shinarus shinarus 0 2026-08-01 16:01 cu.txt' },

          { t: 'cal', kind: 'why', title: 'Vì sao dân nhúng luôn dùng cp -a', x:
            '<p><code>cp -r</code> tạo file <b>mới tinh</b>: thời gian là lúc chép, quyền có thể ' +
            'bị đổi theo <code>umask</code> (Bài 8), liên kết mềm bị biến thành bản sao thật.</p>' +
            '<p><code>cp -a</code> (<i>archive</i>) giữ nguyên tất cả: thời gian, quyền, chủ sở hữu, ' +
            'và giữ liên kết mềm đúng là liên kết mềm.</p>' +
            '<p>Khi bạn chép một rootfs ở Chặng 09, dùng nhầm <code>-r</code> sẽ làm hỏng quyền của ' +
            'hàng nghìn file và biến mọi liên kết mềm thành bản sao — rootfs phình to và ' +
            'thiết bị không khởi động được. <b>Chép cây hệ thống thì luôn <code>cp -a</code>.</b></p>' },

          { t: 'p', x: 'Đổi tên, di chuyển, rồi xoá — kèm một lỗi nữa:' },
          { t: 'code', where: 'wsl', code:
            'mv duan/src/main.c.bak duan/src/main.c.old\n' +
            'mv duan/docs/ghi-chu.txt duan/\n' +
            'rm duan/src/main.c.old\n' +
            'rm duan/build\n' +
            'echo "ma thoat: $?"\n' +
            'rm -r duan/build\n' +
            'echo "ma thoat: $?"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'rm: cannot remove \'duan/build\': Is a directory\n' +
            'ma thoat: 1\n' +
            'ma thoat: 0' },

          { t: 'cal', kind: 'info', x:
            '<p>Hai lệnh <code>mv</code> đầu tiên không in gì — Unix im lặng khi thành công, đúng ' +
            'nguyên tắc bạn đã gặp ở Bài 4. Lệnh thứ nhất đổi tên tại chỗ, lệnh thứ hai chuyển file ' +
            'lên thư mục cha mà <b>giữ nguyên tên</b>, vì đích là một thư mục.</p>' +
            '<p><code>rm</code> từ chối thư mục và trả về 1. Đây là <b>lớp bảo vệ cố ý</b>: xoá một ' +
            'thư mục là xoá mọi thứ bên trong, nên hệ thống bắt bạn nói rõ ý định bằng ' +
            '<code>-r</code>.</p>' }
        ]},

      { title: 'Xem file: cat, head, tail và wc',
        blocks: [
          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/embedded/bai06/xem && cd ~/embedded/bai06/xem\n' +
            'seq 1 200 | sed \'s/^/dong /\' > nhat-ky.log\n' +
            'wc nhat-ky.log' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            ' 200  400 1692 nhat-ky.log' },

          { t: 'cmdx', cmd: 'wc nhat-ky.log',
            title: 'Ba con số đó là gì',
            rows: [
              ['200', 'Số <b>dòng</b>. Lấy riêng bằng <code>wc -l</code>.',
               'Con số dùng nhiều nhất: "log có bao nhiêu dòng lỗi?".'],
              ['400', 'Số <b>từ</b>. Lấy riêng bằng <code>wc -w</code>.',
               'Mỗi dòng có hai từ: chữ "dong" và con số.'],
              ['1692', 'Số <b>byte</b>. Lấy riêng bằng <code>wc -c</code>.',
               'Bài 5 đã dùng đúng tuỳ chọn này để bắt <code>/proc/cpuinfo</code> lộ ra 9294 byte dù <code>ls</code> báo 0.']
            ]},

          { t: 'p', x: 'Bốn cách nhìn khác nhau vào cùng một file:' },
          { t: 'code', where: 'wsl', code:
            'head -3 nhat-ky.log\n' +
            'tail -3 nhat-ky.log\n' +
            'tail -n +198 nhat-ky.log\n' +
            'head -c 20 nhat-ky.log; echo' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'dong 1\n' +
            'dong 2\n' +
            'dong 3\n' +
            '\n' +
            'dong 198\n' +
            'dong 199\n' +
            'dong 200\n' +
            '\n' +
            'dong 198\n' +
            'dong 199\n' +
            'dong 200\n' +
            '\n' +
            'dong 1\n' +
            'dong 2\n' +
            'dong 3' },

          { t: 'cal', kind: 'info', title: 'Vì sao head -c 20 dừng đúng chỗ đó', x:
            '<p><code>dong 1\\n</code> là 7 byte, <code>dong 2\\n</code> thêm 7 nữa là 14, rồi ' +
            '<code>dong 3</code> là 6 byte nữa — vừa tròn <b>20</b>. Nó cắt <b>ngay trước</b> ký tự ' +
            'xuống dòng thứ ba, nên phải thêm lệnh <code>echo</code> để dấu nhắc không dính vào ' +
            'dòng kết quả.</p>' +
            '<p>Chi tiết vụn vặt này lại là điều bạn cần khi đọc file nhị phân — ' +
            '<code>-c</code> đếm byte, không quan tâm dòng.</p>' },

          { t: 'p', x:
            'Xem 16 byte đầu của một chương trình thật, an toàn, không làm loạn terminal:' },
          { t: 'code', where: 'wsl', code:
            'head -c 16 /bin/cat | od -An -c' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            ' 177   E   L   F 002 001 001  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0  \\0' },

          { t: 'cal', kind: 'tip', title: 'Bốn byte bạn sẽ nhìn thấy hàng nghìn lần', x:
            '<p><code>0x7F</code> rồi ba ký tự <code>E L F</code> là <b>chữ ký</b> của định dạng ' +
            'ELF — định dạng file thực thi của mọi hệ Linux. Byte tiếp theo, <code>002</code>, ' +
            'nghĩa là 64-bit.</p>' +
            '<p>Bài 3 đã cho bạn thấy điều gì xảy ra khi kernel đọc chữ ký này và thấy kiến trúc ' +
            'không khớp: <code>Exec format error</code>. Bài 21 sẽ mổ xẻ cả cấu trúc ELF.</p>' },

          { t: 'cal', kind: 'warn', title: 'less không chạy được trong script, chỉ gõ tay', x:
            '<p>Hãy tự gõ <code>less nhat-ky.log</code> ngay bây giờ và thử: <kbd>Space</kbd>, ' +
            '<kbd>G</kbd>, <kbd>g</kbd>, gõ <code>/dong 150</code> rồi <kbd>Enter</kbd>, ' +
            'cuối cùng <kbd>q</kbd> để thoát.</p>' +
            '<p>Không thể chụp lại kết quả của nó vào bài học vì <code>less</code> vẽ cả màn hình ' +
            'chứ không in ra dòng — nó cần một terminal thật. Đó cũng là lý do bạn không bao giờ ' +
            'dùng <code>less</code> trong script.</p>' }
        ]},

      { title: 'Liên kết cứng và mềm: tự tay chứng minh',
        blocks: [
          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/embedded/bai06/lien-ket && cd ~/embedded/bai06/lien-ket\n' +
            'printf \'dong 1\\ndong 2\\ndong 3\\n\' > goc.txt\n' +
            'ln goc.txt cung.txt\n' +
            'ln -s goc.txt mem.txt\n' +
            'ls -li' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '56384 -rw-r--r-- 2 shinarus shinarus 21 Aug  1 16:00 cung.txt\n' +
            '56384 -rw-r--r-- 2 shinarus shinarus 21 Aug  1 16:00 goc.txt\n' +
            '56398 lrwxrwxrwx 1 shinarus shinarus  7 Aug  1 16:00 mem.txt -> goc.txt' },

          { t: 'cal', kind: 'info', title: 'Đọc ba dòng này thật kỹ — mọi thứ nằm ở đây', x:
            '<p><code>goc.txt</code> và <code>cung.txt</code> có <b>cùng số inode 56384</b>. ' +
            'Chúng không phải hai file — chúng là <b>hai cái tên của một file</b>.</p>' +
            '<p>Cột số liên kết của cả hai đều là <b>2</b>. Trước khi tạo liên kết cứng, nó là 1.</p>' +
            '<p><code>mem.txt</code> có inode <b>khác</b> (56398), ký tự đầu là <code>l</code>, và ' +
            'kích thước là <b>7</b> — đúng bằng độ dài chuỗi <code>goc.txt</code>. Toàn bộ nội dung ' +
            'của liên kết mềm chính là đường dẫn đó.</p>' },

          { t: 'p', x: 'Ghi thêm vào <b>một</b> tên, rồi đọc bằng <b>các tên khác</b>:' },
          { t: 'code', where: 'wsl', code:
            'echo "dong 4" >> cung.txt\n' +
            'cat goc.txt\n' +
            'cat mem.txt' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'dong 1\n' +
            'dong 2\n' +
            'dong 3\n' +
            'dong 4\n' +
            '\n' +
            'dong 1\n' +
            'dong 2\n' +
            'dong 3\n' +
            'dong 4' },

          { t: 'p', x:
            'Bây giờ là thí nghiệm quyết định. Xoá cái tên "gốc" và xem chuyện gì xảy ra với ' +
            'hai cái tên còn lại:' },
          { t: 'code', where: 'wsl', code:
            'rm goc.txt\n' +
            'ls -li\n' +
            'cat cung.txt\n' +
            'cat mem.txt' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '56384 -rw-r--r-- 1 shinarus shinarus 28 Aug  1 16:00 cung.txt\n' +
            '56398 lrwxrwxrwx 1 shinarus shinarus  7 Aug  1 16:00 mem.txt -> goc.txt\n' +
            '\n' +
            'dong 1\n' +
            'dong 2\n' +
            'dong 3\n' +
            'dong 4\n' +
            '\n' +
            'cat: mem.txt: No such file or directory' },

          { t: 'cal', kind: 'why', title: 'rm không xoá file — nó xoá một cái tên', x:
            '<p>Số liên kết của inode 56384 vừa tụt từ 2 xuống <b>1</b>. Dữ liệu còn nguyên vẹn, ' +
            'đọc qua <code>cung.txt</code> vẫn đủ bốn dòng.</p>' +
            '<p>Tên thật của lời gọi hệ thống mà <code>rm</code> dùng là <code>unlink()</code> — ' +
            '"gỡ liên kết", chứ không phải "xoá". Kernel chỉ giải phóng các khối dữ liệu khi số ' +
            'liên kết chạm <b>0</b>.</p>' +
            '<p><code>mem.txt</code> thì gãy, vì nó chỉ lưu chuỗi <code>"goc.txt"</code> và cái tên ' +
            'đó không còn trong bảng thư mục nữa. Chú ý: <code>ls</code> vẫn liệt kê nó bình ' +
            'thường — bản thân liên kết mềm vẫn tồn tại, chỉ là trỏ vào hư không.</p>' },

          { t: 'code', where: 'wsl', code: 'file mem.txt' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'mem.txt: broken symbolic link to goc.txt' },

          { t: 'p', x: 'Cuối cùng, kiểm chứng hai giới hạn của liên kết cứng:' },
          { t: 'code', where: 'wsl', code:
            'ln cung.txt /mnt/c/Users/DELL/thu-nghiem.txt\n' +
            'mkdir -p tm\n' +
            'ln tm tm2' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'ln: failed to create hard link \'cung.txt\' => \'/mnt/c/Users/DELL/thu-nghiem.txt\':\n' +
            'Invalid cross-device link\n' +
            'ln: tm: hard link not allowed for directory' },

          { t: 'cal', kind: 'info', x:
            '<p><code>Invalid cross-device link</code> — chính là điều đã dự đoán ở phần lý thuyết. ' +
            '<code>/mnt/c</code> là ổ Windows gắn qua 9p, còn <code>~</code> nằm trên ext4; ' +
            'số inode của phân vùng này vô nghĩa với phân vùng kia.</p>' +
            '<p>Còn <code>hard link not allowed for directory</code> là kernel chặn vòng lặp. ' +
            'Liên kết mềm thì không sao: <code>ln -s tm tm2</code> chạy được ngay.</p>' }
        ]},

      { title: 'Tìm thủ thuật BusyBox đang chạy trên máy bạn',
        blocks: [
          { t: 'p', x:
            'Bài 4 đã tiết lộ rằng <code>ls</code> trên máy bạn không phải GNU coreutils mà là ' +
            'uutils. Bây giờ hãy xem <b>cách</b> nó được lắp đặt — và bạn sẽ nhận ra chính xác thủ ' +
            'thuật mà BusyBox dùng trên mọi thiết bị nhúng.' },
          { t: 'code', where: 'wsl', code:
            'ls -l /usr/bin/ls\n' +
            'readlink -f /usr/bin/ls' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'lrwxrwxrwx 1 root root 29 Mar 30 23:50 /usr/bin/ls -> ../lib/cargo/bin/coreutils/ls\n' +
            '/usr/lib/cargo/bin/coreutils/ls' },

          { t: 'p', x: 'Đó mới là liên kết mềm. Giờ nhìn vào đích của nó, kèm số inode:' },
          { t: 'code', where: 'wsl', code:
            'ls -li /usr/lib/cargo/bin/coreutils/ls \\\n' +
            '       /usr/lib/cargo/bin/coreutils/cat \\\n' +
            '       /usr/lib/cargo/bin/coreutils/cp' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '1585 -rwxr-xr-x 115 root root 11352352 Apr 16 19:41 /usr/lib/cargo/bin/coreutils/cat\n' +
            '1585 -rwxr-xr-x 115 root root 11352352 Apr 16 19:41 /usr/lib/cargo/bin/coreutils/cp\n' +
            '1585 -rwxr-xr-x 115 root root 11352352 Apr 16 19:41 /usr/lib/cargo/bin/coreutils/ls' },

          { t: 'cal', kind: 'why', title: 'Ba lệnh khác nhau, một inode duy nhất', x:
            '<p><code>ls</code>, <code>cat</code> và <code>cp</code> đều là <b>inode 1585</b>. ' +
            'Chúng là ba <b>liên kết cứng</b> tới cùng một chương trình 11 MB.</p>' +
            '<p>Cột số liên kết ghi <b>115</b>: có 115 cái tên đang trỏ vào file này.</p>' +
            '<p>Chương trình đó khi khởi chạy sẽ đọc <code>argv[0]</code> — cái tên mà nó được gọi — ' +
            'rồi tự quyết định phải cư xử như <code>ls</code> hay như <code>cat</code>. Kỹ thuật này ' +
            'gọi là <b>multi-call binary</b>.</p>' },

          { t: 'code', where: 'wsl', code:
            'ls /usr/lib/cargo/bin/coreutils | wc -l\n' +
            'du -sh /usr/lib/cargo/bin/coreutils/' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '114\n' +
            '11M\t/usr/lib/cargo/bin/coreutils/' },

          { t: 'cal', kind: 'info', title: 'Con số biết nói: 114 lệnh, 11 MB', x:
            '<p>Thư mục có <b>114</b> tên lệnh nhưng chỉ chiếm <b>11 MB</b> — vì trên đĩa chỉ có ' +
            'đúng một bản dữ liệu.</p>' +
            '<p>Nếu mỗi lệnh là một file riêng, 114 × 11 MB = khoảng <b>1,2 GB</b>. Trên một thiết ' +
            'bị nhúng có 16 MB flash, con số đó là bất khả thi.</p>' +
            '<p>BusyBox làm chính xác điều này với hơn 300 lệnh, nhưng binary chỉ khoảng 1 MB vì nó ' +
            'được viết tối giản. Ở <b>Chặng 09</b> bạn sẽ tự dựng rootfs bằng BusyBox và tận mắt ' +
            'thấy <code>ls</code>, <code>sh</code>, <code>mount</code> đều là liên kết tới cùng ' +
            'một file — kiến thức của bài này sẽ giúp bạn hiểu ngay thay vì bối rối.</p>' },

          { t: 'p', x: 'Dọn dẹp toàn bộ những gì bài này tạo ra:' },
          { t: 'code', where: 'wsl', code:
            'cd ~\n' +
            'rm -rf ~/embedded/bai06\n' +
            'ls ~/embedded' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'bai03\n' +
            'bai04\n' +
            'bai05\n' +
            'images' },

          { t: 'cal', kind: 'tip', x:
            '<p>Chú ý thứ tự: <code>cd ~</code> <b>trước</b> khi xoá. Xoá thư mục mà bạn đang đứng ' +
            'trong đó là hợp lệ ở Linux, nhưng sau đó <code>pwd</code> báo lỗi và mọi đường dẫn ' +
            'tương đối đều hỏng — vì thư mục hiện tại của bạn không còn tên nào trỏ tới nữa.</p>' }
        ]}
    ]},

    /* ══════════════════════════════════════════════
       7. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>bash: tree: command not found</code>',
         '<code>tree</code> không có trong bản cài mặc định',
         'Dùng <code>ls -R</code> hoặc <code>find</code>; muốn cài thì xem Bài 12'],
        ['<code>cp: -r not specified; omitting directory \'duan\'</code>',
         'Chép thư mục mà quên <code>-r</code>',
         'Thêm <code>-r</code>, hoặc <code>-a</code> nếu là cây hệ thống'],
        ['<code>rm: cannot remove \'duan/build\': Is a directory</code>',
         '<code>rm</code> cố ý từ chối thư mục để bảo vệ bạn',
         '<code>rm -r</code>. Chạy <code>ls</code> với đúng đường dẫn đó trước'],
        ['<code>ls: cannot access \'*.cpp\': No such file or directory</code>',
         'Không có file nào khớp nên bash giao nguyên mẫu cho lệnh',
         'Bình thường. Kiểm tra bằng <code>echo *.cpp</code> trước khi lo lắng'],
        ['<code>ln: failed to create hard link …: Invalid cross-device link</code>',
         'Liên kết cứng không vượt được ranh giới phân vùng',
         'Dùng <code>ln -s</code>'],
        ['<code>ln: tm: hard link not allowed for directory</code>',
         'Kernel cấm, vì sẽ tạo vòng lặp vô hạn trong cây thư mục',
         'Dùng <code>ln -s</code>'],
        ['<code>cat: mem.txt: No such file or directory</code> dù <code>ls</code> vẫn thấy file',
         'Liên kết mềm bị gãy — đích đã bị xoá hoặc đổi tên',
         '<code>ls -l</code> xem nó trỏ đi đâu, <code>file mem.txt</code> xác nhận'],
        ['<code>rmdir: failed to remove \'x\': Directory not empty</code>',
         '<code>rmdir</code> chỉ xoá được thư mục rỗng',
         '<code>rm -r x</code> nếu chắc chắn, sau khi đã <code>ls -R x</code>'],
        ['Terminal hiện toàn ký hiệu lạ sau khi <code>cat</code> một file',
         'File nhị phân chứa mã điều khiển làm hỏng bảng ký tự',
         'Gõ <code>reset</code> rồi Enter. Lần sau dùng <code>od -An -c</code>']
      ]},

    /* ══════════════════════════════════════════════
       8. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', items: [
      'Một dòng <code>ls -l</code> có <b>bảy cột</b>. Cột đầu gộp <b>loại file</b> và <b>quyền</b>; ' +
      'cột ba là <b>số liên kết cứng</b>, không phải số file con.',
      '<code>mkdir -p</code> chạy lại lần hai vẫn thành công — tính chất bắt buộc với script cài đặt.',
      '<code>mv</code> chỉ sửa bảng <i>tên → inode</i>, nên di chuyển trong cùng phân vùng là ' +
      '<b>tức thời</b> dù file lớn cỡ nào.',
      'Chép cây hệ thống thì dùng <b><code>cp -a</code></b>, không dùng <code>-r</code>: ' +
      '<code>-a</code> giữ nguyên thời gian, quyền và liên kết mềm.',
      '<b>Shell mở rộng ký tự đại diện</b>, chương trình không bao giờ thấy dấu sao. Nếu không ' +
      'khớp gì, bash giao nguyên mẫu — đó là gốc rễ của tai nạn <code>rm -rf $DIR/*</code>.',
      'Kiểm tra trước bằng cách đặt <code>echo</code> lên đầu lệnh nguy hiểm.',
      '<code>cat</code> để ghép · <code>less</code> để đọc file dài · <code>head</code> để biết ' +
      'file là gì · <code>tail -f</code> để theo dõi log đang chạy.',
      '<b>Liên kết cứng trỏ vào inode, liên kết mềm trỏ vào tên.</b> Mọi khác biệt còn lại đều ' +
      'suy ra từ câu này.',
      '<code>rm</code> gọi <code>unlink()</code>: nó gỡ một cái tên. Dữ liệu chỉ mất khi số liên ' +
      'kết về <b>0</b>.',
      'Trên máy bạn, <b>114</b> lệnh coreutils cùng dùng <b>inode 1585</b>, tổng cộng <b>11 MB</b> ' +
      'thay vì 1,2 GB. Đó chính là thủ thuật multi-call của BusyBox ở Chặng 09.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo', x:
      '<p>Bạn đã tạo, chép và xoá được file, nhưng chưa <b>sửa nội dung</b> file nào — mọi thứ đến ' +
      'giờ vẫn dựa vào <code>echo &gt;</code>. <b>Bài 7 — Soạn thảo trong terminal: nano và vim</b> ' +
      'lấp chỗ trống đó.</p>' +
      '<p><code>nano</code> bạn dùng được sau ba phút. <code>vim</code> mất công hơn, nhưng bài đó ' +
      'sẽ giải thích vì sao bạn <b>bắt buộc</b> phải biết nó: khi đăng nhập SSH vào một thiết bị ' +
      'nhúng, thứ duy nhất có sẵn để sửa file cấu hình thường là <code>vi</code> — không chuột, ' +
      'không menu, và không có cách nào cài thêm gì.</p>' },

    { t: 'hr' }
  ],

  /* ══════════════════════════════════════════════
     QUIZ
     ══════════════════════════════════════════════ */
  quiz: [
    {
      q: 'Bạn gõ <code>rm *.o</code> trong thư mục không có file <code>.o</code> nào. Chương trình <code>rm</code> nhận được đối số gì?',
      opts: [
        'Không nhận được đối số nào — bash bỏ qua lệnh',
        'Nhận đúng chuỗi <code>*.o</code>, vì không khớp gì nên bash giao nguyên mẫu',
        'Nhận danh sách toàn bộ file trong thư mục',
        '<code>rm</code> tự mở rộng dấu sao, không liên quan tới bash'
      ],
      a: 1,
      why: 'Bash mở rộng ký tự đại diện <b>trước</b> khi gọi chương trình. Khi không có tên nào khớp, ' +
           'mặc định nó giao nguyên chuỗi cho lệnh — bằng chứng là thông báo lỗi hiện đúng chữ ' +
           '<code>*.cpp</code> ở phần thực hành. Chính vì mẫu <b>được</b> mở rộng khi có file khớp mà ' +
           '<code>rm -rf $DIR/*</code> với <code>$DIR</code> rỗng lại nguy hiểm: nó thành ' +
           '<code>rm -rf /*</code> và lần này khớp thật.'
    },
    {
      q: 'Sau <code>ln goc.txt cung.txt</code>, bạn chạy <code>rm goc.txt</code>. Nội dung file ra sao?',
      opts: [
        'Mất hoàn toàn, vì đã xoá bản gốc',
        'Còn nguyên — <code>rm</code> chỉ gỡ một cái tên, số liên kết tụt từ 2 xuống 1',
        'Còn nhưng chỉ root đọc được',
        'Chuyển sang trạng thái chờ xoá'
      ],
      a: 1,
      why: 'Không có khái niệm "bản gốc" với liên kết cứng — <code>goc.txt</code> và ' +
           '<code>cung.txt</code> là hai cái tên hoàn toàn bình đẳng của inode 56384. Lời gọi hệ ' +
           'thống mà <code>rm</code> dùng tên là <code>unlink()</code>. Kernel chỉ giải phóng dữ liệu ' +
           'khi số liên kết chạm <b>0</b>.'
    },
    {
      q: 'Trên máy bạn, <code>ls -li</code> cho thấy <code>ls</code>, <code>cat</code> và <code>cp</code> trong <code>/usr/lib/cargo/bin/coreutils/</code> đều là inode 1585 với số liên kết 115. Chương trình dựa vào đâu để biết phải cư xử như lệnh nào?',
      opts: [
        'Dựa vào biến môi trường',
        'Dựa vào <code>argv[0]</code> — cái tên mà nó được gọi',
        'Dựa vào thư mục hiện tại',
        'Mỗi tên là một bản sao riêng nên không cần biết'
      ],
      a: 1,
      why: 'Đây là kỹ thuật <b>multi-call binary</b>. Khi bạn gõ <code>cat</code>, kernel nạp inode ' +
           '1585 và truyền chuỗi <code>"cat"</code> làm <code>argv[0]</code>; chương trình đọc giá trị ' +
           'đó rồi rẽ nhánh. Nhờ vậy 114 lệnh chỉ tốn <b>11 MB</b> thay vì khoảng 1,2 GB. ' +
           'BusyBox dùng đúng thủ thuật này cho hơn 300 lệnh — bạn sẽ gặp lại ở Chặng 09.'
    },
    {
      q: 'Bạn chép một rootfs bằng <code>cp -r</code> thay vì <code>cp -a</code>, và thiết bị không khởi động được. Nguyên nhân khả dĩ nhất?',
      opts: [
        'Dữ liệu bị chép thiếu',
        '<code>cp -r</code> không chép được thư mục con',
        '<code>-r</code> tạo file mới: quyền bị đổi theo umask và liên kết mềm bị biến thành bản sao thật',
        '<code>cp -r</code> chỉ chạy được với quyền root'
      ],
      a: 2,
      why: '<code>cp -r</code> tạo file <b>mới tinh</b> nên mất thời gian gốc, mất chủ sở hữu, quyền ' +
           'bị <code>umask</code> can thiệp (Bài 8), và mỗi liên kết mềm bị thay bằng bản sao đầy đủ ' +
           'của đích. Rootfs vì thế phình to và các file cần bit thực thi hoặc setuid không còn chạy ' +
           'đúng. <code>cp -a</code> giữ nguyên tất cả — quy tắc bất di bất dịch khi chép cây hệ thống.'
    },
    {
      q: '<code>ls -l</code> vẫn liệt kê <code>mem.txt</code> bình thường, nhưng <code>cat mem.txt</code> báo <code>No such file or directory</code>. Chuyện gì xảy ra?',
      opts: [
        'File bị hỏng ở tầng đĩa',
        '<code>mem.txt</code> là liên kết mềm và đích của nó đã bị xoá hoặc đổi tên',
        'Bạn thiếu quyền đọc',
        'File đang bị một tiến trình khác khoá'
      ],
      a: 1,
      why: 'Bản thân liên kết mềm vẫn tồn tại — nó là một file thật với inode riêng, nội dung là ' +
           'chuỗi đường dẫn — nên <code>ls</code> hiển thị bình thường. Nhưng khi <code>cat</code> ' +
           'mở nó, kernel tra cái tên trong chuỗi đó và không tìm thấy. Xác nhận bằng ' +
           '<code>file mem.txt</code>: <code>broken symbolic link to goc.txt</code>. Nếu là vấn đề ' +
           'quyền thì thông báo sẽ là <code>Permission denied</code>.'
    },
    {
      q: 'Bạn đứng trong <code>~/embedded/bai06</code> và chạy <code>rm -rf ~/embedded/bai06</code>. Chuyện gì xảy ra?',
      opts: [
        'Lệnh bị từ chối vì không thể xoá thư mục đang đứng',
        'Xoá thành công, nhưng sau đó <code>pwd</code> báo lỗi và mọi đường dẫn tương đối đều hỏng',
        'Hệ thống tự chuyển bạn về thư mục nhà',
        'Chỉ nội dung bị xoá, thư mục vẫn còn'
      ],
      a: 1,
      why: 'Linux cho phép xoá thư mục đang là thư mục làm việc — kernel giữ tham chiếu tới inode nên ' +
           'tiến trình không sập, nhưng inode đó không còn cái tên nào trỏ tới. Kết quả là ' +
           '<code>pwd</code> không dựng lại được đường dẫn và mọi đường dẫn tương đối mất điểm neo. ' +
           'Thói quen đúng là <code>cd ~</code> trước khi xoá, như bước cuối phần thực hành.'
    }
  ]
});

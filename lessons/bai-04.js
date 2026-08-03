/* ============================================================
   BÀI 4 — Shell và cấu trúc một câu lệnh
   Chặng 01 · Linux căn bản
   ============================================================ */
Lesson.register({
  id: 'bai-04',
  title: 'Shell và cấu trúc một câu lệnh',
  minutes: 40,
  practice: 'Thực hành 20 phút',
  level: 'Người mới bắt đầu',

  intro:
    'Ba bài đầu bạn đã gõ vài chục câu lệnh mà chưa thật sự hiểu <i>ai</i> đang đọc chúng và ' +
    '<i>theo luật nào</i>. Bài này lấp đúng khoảng trống đó. Sau bài này bạn sẽ nhìn một câu lệnh lạ ' +
    'và tách được nó thành từng mảnh, biết tra cứu mảnh nào ở đâu, và — quan trọng nhất với nghề nhúng — ' +
    'biết đọc <b>mã thoát</b> để trả lời câu hỏi "lệnh vừa rồi có thành công không?" mà không cần đoán. ' +
    'Đây là bài mở đầu Chặng 01, chặng dài nhất nhưng cũng là chặng mọi thứ phía sau đứng lên trên.',

  goals: [
    'Giải thích được shell là gì và nó nằm ở đâu giữa bạn và kernel',
    'Tách được một câu lệnh bất kỳ thành lệnh, tuỳ chọn và đối số',
    'Phân biệt tuỳ chọn ngắn và tuỳ chọn dài, biết khi nào gộp được và khi nào không',
    'Dùng <code>type</code>, <code>which</code>, <code>command -v</code> để biết một lệnh thật sự đến từ đâu',
    'Tra cứu bằng <code>man</code>, <code>--help</code> và <code>help</code>, biết cái nào dùng cho loại lệnh nào',
    'Đọc được mã thoát <code>$?</code> và dùng <code>&amp;&amp;</code>, <code>||</code> để nối lệnh theo kết quả'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. SHELL LÀ GÌ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Shell là gì' },

    { t: 'p', x:
      'Kernel Linux không có giao diện. Nó chỉ cung cấp một tập hàm để chương trình gọi vào — ' +
      '<b>lời gọi hệ thống</b> (system call). Bạn không thể "nói chuyện" trực tiếp với kernel, ' +
      'vì kernel không biết đọc chữ.' },

    { t: 'p', x:
      '<b>Shell</b> là chương trình lấp khoảng trống đó. Nó đọc dòng chữ bạn gõ, phân tích cú pháp, ' +
      'tìm chương trình tương ứng, yêu cầu kernel chạy chương trình đó, rồi chờ và báo lại kết quả. ' +
      'Nói cách khác, shell là một <b>thông dịch viên</b> — và cũng là một <b>ngôn ngữ lập trình</b> ' +
      'đầy đủ, điều bạn sẽ khai thác ở Bài 13.' },

    { t: 'fig',
      cap: 'Shell chỉ là một chương trình bình thường chạy trong không gian người dùng. Nó không có đặc quyền gì hơn bạn — mọi việc đụng đến phần cứng đều phải nhờ kernel.',
      svg:
      '<svg viewBox="0 0 720 264" width="720" role="img" aria-label="Vị trí của shell giữa người dùng và kernel Linux">' +
        '<rect class="d-box" x="24" y="16" width="180" height="46" rx="8" stroke-width="1.5"/>' +
        '<text class="d-t" x="114" y="38" text-anchor="middle">Bạn</text>' +
        '<text class="d-ts" x="114" y="54" text-anchor="middle">gõ chữ, đọc kết quả</text>' +

        '<path class="d-line" d="M204 39 H262" stroke-width="1.5"/>' +
        '<path class="d-arrow" d="M262 34 l8 5 -8 5 z"/>' +

        '<rect class="d-box" x="272" y="16" width="180" height="46" rx="8" stroke-width="1.5"/>' +
        '<text class="d-t" x="362" y="38" text-anchor="middle">Terminal</text>' +
        '<text class="d-ts" x="362" y="54" text-anchor="middle">cửa sổ hiển thị, không hiểu lệnh</text>' +

        '<path class="d-line" d="M452 39 H510" stroke-width="1.5"/>' +
        '<path class="d-arrow" d="M510 34 l8 5 -8 5 z"/>' +

        '<rect class="d-box-p" x="520" y="16" width="176" height="46" rx="8" stroke-width="2"/>' +
        '<text class="d-t" x="608" y="38" text-anchor="middle">Shell — bash</text>' +
        '<text class="d-ts" x="608" y="54" text-anchor="middle">phân tích và thực thi</text>' +

        '<path class="d-line" d="M608 62 V102" stroke-width="1.5"/>' +
        '<path class="d-arrow" d="M603 102 l5 8 5 -8 z"/>' +
        '<text class="d-ts" x="618" y="86">gọi fork + exec</text>' +

        '<rect class="d-box-a" x="272" y="108" width="424" height="52" rx="8" stroke-width="1.5"/>' +
        '<text class="d-t"  x="292" y="132">Chương trình được chạy — ls, gcc, qemu…</text>' +
        '<text class="d-ts" x="292" y="150">Mỗi lệnh bên ngoài là một tiến trình riêng, có mã thoát riêng</text>' +

        '<path class="d-line" d="M484 160 V196" stroke-width="1.5"/>' +
        '<path class="d-arrow" d="M479 196 l5 8 5 -8 z"/>' +
        '<text class="d-ts" x="494" y="182">lời gọi hệ thống: open, read, write…</text>' +

        '<rect class="d-box-p" x="24" y="202" width="672" height="46" rx="8" stroke-width="2"/>' +
        '<text class="d-t"  x="44" y="224">Kernel Linux</text>' +
        '<text class="d-ts" x="44" y="240">Nơi duy nhất được chạm vào phần cứng, bộ nhớ và tiến trình</text>' +
      '</svg>' },

    { t: 'terms', items: [
      ['Terminal', 'emulator',
       'Cửa sổ hiển thị chữ. Nó chỉ vẽ ký tự và nhận phím — hoàn toàn <b>không</b> hiểu câu lệnh. ' +
       'Cửa sổ WSL bạn đang dùng là một terminal.'],
      ['Shell', '',
       'Chương trình đọc và thực thi câu lệnh. Trên máy bạn là <b>bash</b>. Đổi terminal thì shell ' +
       'vẫn thế, và ngược lại.'],
      ['Bash', 'Bourne Again SHell',
       'Shell mặc định của Ubuntu. Bản trên máy bạn là <b>5.3.9</b>. Trên thiết bị nhúng thật, ' +
       'bash thường bị thay bằng shell tí hon của BusyBox (Chặng 09) — nhỏ hơn nhiều nhưng thiếu tính năng.'],
      ['Dấu nhắc', 'prompt',
       'Chuỗi shell in ra để báo "tôi đang chờ lệnh", ví dụ <code>shinarus@Shinarus:~$</code>. ' +
       'Ký tự <code>$</code> nghĩa là người dùng thường, <code>#</code> nghĩa là root — ' +
       'nhìn ký tự này trước khi gõ bất cứ thứ gì nguy hiểm.']
    ]},

    { t: 'cal', kind: 'why', title: 'Vì sao dân nhúng phải hiểu chỗ này sớm', x:
      '<p>Trên máy tính để bàn, shell chỉ là một tiện ích. Trên thiết bị nhúng, shell thường là ' +
      '<b>giao diện duy nhất</b> bạn có: một sợi cáp UART, một cửa sổ chữ, không chuột, không đồ hoạ.</p>' +
      '<p>Hơn thế, kịch bản khởi động của thiết bị (Chặng 09) chính là các script shell. Khi board không ' +
      'boot lên được, thứ bạn đọc để tìm nguyên nhân là các dòng lệnh shell chạy lúc khởi động. ' +
      'Không hiểu shell nghĩa là không sửa được board.</p>' },

    /* ══════════════════════════════════════════════
       2. CẤU TRÚC CÂU LỆNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Cấu trúc của một câu lệnh' },

    { t: 'p', x:
      'Mọi câu lệnh Linux, không có ngoại lệ đáng kể, đều theo một khuôn duy nhất:' },

    { t: 'code', where: 'wsl', nocopy: true, lang: 'text', code:
      'lệnh  [tuỳ chọn...]  [đối số...]' },

    { t: 'p', x:
      'Shell tách dòng bạn gõ thành các <b>từ</b>, ngăn cách bởi khoảng trắng. Từ đầu tiên là ' +
      '<b>tên lệnh</b>. Mọi từ sau đó được giao nguyên vẹn cho chương trình, và chính chương trình — ' +
      'không phải shell — quyết định từ nào là tuỳ chọn, từ nào là đối số.' },

    { t: 'fig',
      cap: 'Shell chỉ cắt dòng lệnh thành từ rồi trao lại. Việc hiểu -l nghĩa là gì hoàn toàn do chương trình ls tự quyết — đó là lý do mỗi lệnh có bộ tuỳ chọn riêng và bạn phải tra cứu.',
      svg:
      '<svg viewBox="0 0 720 210" width="720" role="img" aria-label="Mổ xẻ câu lệnh ls -l -h /etc thành lệnh, tuỳ chọn và đối số">' +
        '<rect class="d-box" x="24" y="20" width="672" height="46" rx="8" stroke-width="1.5"/>' +
        '<text class="d-tm" x="60"  y="49">ls</text>' +
        '<text class="d-tm" x="200" y="49">-l</text>' +
        '<text class="d-tm" x="340" y="49">--human-readable</text>' +
        '<text class="d-tm" x="560" y="49">/etc</text>' +

        '<path class="d-line" d="M66 66 V96" stroke-width="1"/>' +
        '<path class="d-line" d="M206 66 V96" stroke-width="1"/>' +
        '<path class="d-line" d="M346 66 V96" stroke-width="1"/>' +
        '<path class="d-line" d="M566 66 V96" stroke-width="1"/>' +

        '<rect class="d-box-p" x="24" y="100" width="150" height="44" rx="6" stroke-width="2"/>' +
        '<text class="d-t"  x="99" y="120" text-anchor="middle">TÊN LỆNH</text>' +
        '<text class="d-ts" x="99" y="136" text-anchor="middle">chương trình sẽ chạy</text>' +

        '<rect class="d-box-a" x="184" y="100" width="150" height="44" rx="6" stroke-width="1.5"/>' +
        '<text class="d-t"  x="259" y="120" text-anchor="middle">TUỲ CHỌN NGẮN</text>' +
        '<text class="d-ts" x="259" y="136" text-anchor="middle">một gạch, một chữ cái</text>' +

        '<rect class="d-box-a" x="344" y="100" width="196" height="44" rx="6" stroke-width="1.5"/>' +
        '<text class="d-t"  x="442" y="120" text-anchor="middle">TUỲ CHỌN DÀI</text>' +
        '<text class="d-ts" x="442" y="136" text-anchor="middle">hai gạch, một từ đầy đủ</text>' +

        '<rect class="d-box-g" x="550" y="100" width="146" height="44" rx="6" stroke-width="1.5"/>' +
        '<text class="d-t"  x="623" y="120" text-anchor="middle">ĐỐI SỐ</text>' +
        '<text class="d-ts" x="623" y="136" text-anchor="middle">thứ để lệnh tác động lên</text>' +

        '<text class="d-ts" x="24" y="176">Tuỳ chọn thay đổi CÁCH lệnh làm việc. Đối số nói lệnh làm việc VỚI CÁI GÌ.</text>' +
        '<text class="d-ts" x="24" y="194">Bỏ đối số đi, phần lớn lệnh sẽ chọn một mặc định hợp lý — ls không có đối số nghĩa là "thư mục hiện tại".</text>' +
      '</svg>' },

    { t: 'h3', x: 'Tuỳ chọn ngắn và tuỳ chọn dài' },

    { t: 'table',
      head: ['', 'Tuỳ chọn ngắn', 'Tuỳ chọn dài'],
      rows: [
        ['Hình dạng', '<code>-l</code>, <code>-a</code>, <code>-h</code>', '<code>--long</code>, <code>--all</code>, <code>--human-readable</code>'],
        ['Số gạch', 'Một', 'Hai'],
        ['Gộp được không', '<b>Có</b>: <code>-lah</code> ≡ <code>-l -a -h</code>', '<b>Không</b>. Mỗi tuỳ chọn một từ riêng'],
        ['Kèm giá trị', '<code>-n 5</code> hoặc <code>-n5</code>', '<code>--lines=5</code> hoặc <code>--lines 5</code>'],
        ['Dùng khi', 'Gõ tay hằng ngày — ngắn, nhanh', '<b>Viết trong script</b> — đọc lại sau sáu tháng vẫn hiểu'],
        ['Rủi ro', 'Khó nhớ, dễ nhầm giữa các lệnh', 'Dài dòng, đôi khi không được hỗ trợ']
      ]},

    { t: 'cal', kind: 'tip', title: 'Quy ước nên theo suốt khoá học', x:
      '<p>Gõ tay thì dùng tuỳ chọn ngắn cho nhanh. Nhưng khi viết vào <b>script</b>, ' +
      '<b>Makefile</b> hay tài liệu — luôn dùng tuỳ chọn dài.</p>' +
      '<p>Lý do rất thực tế: <code>tar -xzf</code> khiến người đọc phải tra cứu, còn ' +
      '<code>tar --extract --gzip --file</code> thì tự giải thích. Script build của bạn ở Chặng 09 ' +
      'sẽ được đọc lại rất nhiều lần, kể cả bởi chính bạn của sáu tháng sau.</p>' },

    { t: 'h3', x: 'Khoảng trắng là dấu phân cách — và đó là cái bẫy đầu tiên' },

    { t: 'p', x:
      'Vì shell cắt dòng lệnh theo khoảng trắng, một tên file có dấu cách sẽ bị hiểu thành <b>hai đối số</b>. ' +
      'Đây là lỗi phổ biến nhất của người mới, và ở phần thực hành bạn sẽ cố tình gây ra nó.' },

    { t: 'table',
      head: ['Bạn gõ', 'Shell hiểu thành', 'Kết quả'],
      rows: [
        ['<code>rm hai tu.txt</code>', 'Hai đối số: <code>hai</code> và <code>tu.txt</code>', 'Báo lỗi không tìm thấy cả hai'],
        ['<code>rm "hai tu.txt"</code>', 'Một đối số: <code>hai tu.txt</code>', 'Đúng ý bạn'],
        ['<code>rm hai\\ tu.txt</code>', 'Một đối số — dấu <code>\\</code> huỷ ý nghĩa của khoảng trắng', 'Cũng đúng, nhưng khó đọc hơn'],
        ['<code>echo $x</code> với <code>x="a  b"</code>', 'Hai đối số, khoảng trắng thừa bị nuốt', 'In ra <code>a b</code>'],
        ['<code>echo "$x"</code>', 'Một đối số nguyên vẹn', 'In ra <code>a  b</code>']
      ]},

    { t: 'cal', kind: 'warn', title: 'Luật vàng về nháy kép', x:
      '<p>Trong script, hãy bọc <b>mọi</b> biến bằng nháy kép: viết <code>"$duong_dan"</code> chứ không ' +
      'phải <code>$duong_dan</code>.</p>' +
      '<p>Không bọc, một đường dẫn chứa dấu cách sẽ vỡ thành nhiều đối số và lệnh của bạn tác động ' +
      'nhầm lên file khác. Với một script chạy <code>rm</code> lúc khởi động thiết bị, hậu quả không ' +
      'phải là "in sai" mà là "xoá nhầm". Bài 13 sẽ đào sâu chủ đề trích dẫn này.</p>' },

    /* ══════════════════════════════════════════════
       3. LỆNH ĐẾN TỪ ĐÂU
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Một lệnh thật sự đến từ đâu' },

    { t: 'p', x:
      'Khi bạn gõ <code>ls</code>, shell không tìm ngay một file tên <code>ls</code>. Nó đi qua một ' +
      'chuỗi bước có thứ tự cố định, và biết thứ tự này giúp bạn giải thích được rất nhiều tình huống ' +
      '"máy tôi chạy khác máy anh".' },

    { t: 'fig',
      cap: 'Thứ tự tra cứu tên lệnh trong bash. Điểm quan trọng: builtin luôn thắng file ngoài — đó là lý do type cho câu trả lời chính xác hơn which.',
      svg:
      '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Thứ tự bash phân giải một tên lệnh: alias, hàm, builtin, PATH">' +
        '<rect class="d-box-p" x="240" y="12" width="240" height="38" rx="8" stroke-width="2"/>' +
        '<text class="d-t" x="360" y="36" text-anchor="middle">Bạn gõ một tên lệnh</text>' +

        '<path class="d-line" d="M360 50 V66" stroke-width="1.5"/>' +
        '<path class="d-arrow" d="M355 66 l5 8 5 -8 z"/>' +

        '<rect class="d-box" x="240" y="74" width="240" height="38" rx="8" stroke-width="1.5"/>' +
        '<text class="d-t" x="360" y="98" text-anchor="middle">1 · Có phải bí danh (alias)?</text>' +
        '<path class="d-line" d="M480 93 H592" stroke-width="1" stroke-dasharray="3 3"/>' +
        '<text class="d-ts" x="598" y="90">Có → thay thế rồi</text>' +
        '<text class="d-ts" x="598" y="104">xét lại từ đầu</text>' +

        '<path class="d-line" d="M360 112 V128" stroke-width="1.5"/>' +
        '<path class="d-arrow" d="M355 128 l5 8 5 -8 z"/>' +

        '<rect class="d-box" x="240" y="136" width="240" height="38" rx="8" stroke-width="1.5"/>' +
        '<text class="d-t" x="360" y="160" text-anchor="middle">2 · Có phải hàm shell?</text>' +
        '<path class="d-line" d="M480 155 H592" stroke-width="1" stroke-dasharray="3 3"/>' +
        '<text class="d-ts" x="598" y="158">Có → chạy hàm</text>' +

        '<path class="d-line" d="M360 174 V190" stroke-width="1.5"/>' +
        '<path class="d-arrow" d="M355 190 l5 8 5 -8 z"/>' +

        '<rect class="d-box-a" x="240" y="198" width="240" height="38" rx="8" stroke-width="1.5"/>' +
        '<text class="d-t" x="360" y="222" text-anchor="middle">3 · Có phải lệnh dựng sẵn?</text>' +
        '<path class="d-line" d="M480 217 H592" stroke-width="1" stroke-dasharray="3 3"/>' +
        '<text class="d-ts" x="598" y="214">Có → bash tự làm,</text>' +
        '<text class="d-ts" x="598" y="228">không tạo tiến trình</text>' +

        '<path class="d-line" d="M360 236 V252" stroke-width="1.5"/>' +
        '<path class="d-arrow" d="M355 252 l5 8 5 -8 z"/>' +

        '<rect class="d-box-g" x="240" y="260" width="240" height="38" rx="8" stroke-width="1.5"/>' +
        '<text class="d-t" x="360" y="284" text-anchor="middle">4 · Dò từng thư mục trong PATH</text>' +
        '<path class="d-line" d="M240 279 H128" stroke-width="1" stroke-dasharray="3 3"/>' +
        '<text class="d-ts" x="16" y="276">Không thấy ở đâu cả →</text>' +
        '<text class="d-ts" x="16" y="290">command not found (127)</text>' +
      '</svg>' },

    { t: 'table',
      head: ['Loại lệnh', 'Ví dụ', 'Nằm ở đâu', 'Tra bằng'],
      rows: [
        ['Dựng sẵn <i>(builtin)</i>', '<code>cd</code>, <code>echo</code>, <code>type</code>, <code>export</code>',
         'Bên trong chính bash', '<code>help &lt;lệnh&gt;</code>'],
        ['File thực thi', '<code>ls</code>, <code>gcc</code>, <code>qemu-system-aarch64</code>',
         'Một thư mục trong <code>$PATH</code>', '<code>man &lt;lệnh&gt;</code>'],
        ['Bí danh <i>(alias)</i>', '<code>ll</code> thường là <code>ls -l</code>',
         'Định nghĩa trong <code>~/.bashrc</code>', '<code>alias</code>'],
        ['Hàm shell', 'Do bạn hoặc script định nghĩa', 'Trong bộ nhớ của phiên làm việc', '<code>declare -f</code>']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao cd bắt buộc phải là builtin', x:
      '<p>Mỗi lệnh bên ngoài chạy trong một <b>tiến trình con</b> riêng. Tiến trình con có bản sao ' +
      'thư mục làm việc của cha; đổi bản sao rồi thoát thì bản gốc không đổi.</p>' +
      '<p>Nếu <code>cd</code> là một chương trình ngoài, nó sẽ đổi thư mục của chính nó rồi kết thúc, ' +
      'và shell của bạn vẫn đứng nguyên chỗ cũ — hoàn toàn vô dụng. Vì thế <code>cd</code> buộc phải ' +
      'do bash tự thực hiện. Đó cũng là lý do <code>which cd</code> không in ra gì cả: ' +
      'không hề tồn tại file nào tên <code>cd</code>.</p>' +
      '<p>Cơ chế tiến trình cha–con này là nội dung chính của Bài 9 và Bài 20.</p>' },

    { t: 'cmdx', cmd: 'type -a ls',
      title: 'Ba lệnh tra cứu, ba mức độ chính xác',
      rows: [
        ['type', '<b>Lệnh nên dùng.</b> Là builtin của bash nên nó biết tất cả: alias, hàm, builtin và file.',
         '<code>type -t</code> chỉ in loại; <code>type -a</code> in mọi vị trí tìm thấy.'],
        ['which', 'Chương trình ngoài, <b>chỉ</b> dò trong <code>$PATH</code>. Không biết gì về builtin hay alias.',
         'Với <code>which cd</code> nó không in gì và trả mã thoát <b>1</b> — dễ khiến người mới tưởng <code>cd</code> không tồn tại.'],
        ['command -v', 'Chuẩn POSIX, có ở cả BusyBox. Biết builtin, in tên gọn gàng.',
         '<b>Đây là cách viết đúng trong script</b>, vì <code>which</code> có thể không tồn tại trên thiết bị nhúng.']
      ]},

    /* ══════════════════════════════════════════════
       4. TRA CỨU
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Tra cứu: man, --help và help' },

    { t: 'p', x:
      'Không ai nhớ hết tuỳ chọn. Kỹ năng thật sự không phải là thuộc lòng mà là <b>tra nhanh</b>. ' +
      'Có ba nguồn, và chọn nhầm nguồn là lý do người mới hay kết luận "lệnh này không có tài liệu".' },

    { t: 'table',
      head: ['Cách tra', 'Dùng cho', 'Đặc điểm'],
      rows: [
        ['<code>&lt;lệnh&gt; --help</code>', 'Lệnh ngoài', 'Nhanh nhất, in thẳng ra màn hình. Dùng khi chỉ cần nhớ lại một tuỳ chọn'],
        ['<code>man &lt;lệnh&gt;</code>', 'Lệnh ngoài', 'Đầy đủ nhất: mô tả, ví dụ, mã thoát, lệnh liên quan. Mở trong trình xem, thoát bằng <kbd>q</kbd>'],
        ['<code>help &lt;lệnh&gt;</code>', '<b>Chỉ</b> lệnh dựng sẵn', '<code>man cd</code> sẽ thất bại — <code>cd</code> không phải file nên không có trang man riêng'],
        ['<code>apropos &lt;từ khoá&gt;</code>', 'Khi <i>chưa biết</i> tên lệnh', 'Tìm theo mô tả. Ví dụ <code>apropos "list directory"</code>']
      ]},

    { t: 'h3', x: 'Số hiệu mục trong man' },

    { t: 'p', x:
      'Trang man được chia thành các mục đánh số. Bạn sẽ thấy ký hiệu như <code>ls(1)</code> hay ' +
      '<code>open(2)</code> — con số trong ngoặc chính là mục. Với dân nhúng, mục <b>2</b> và <b>3</b> ' +
      'là tài liệu làm việc hằng ngày từ Chặng 03 trở đi.' },

    { t: 'table',
      head: ['Mục', 'Nội dung', 'Ví dụ'],
      rows: [
        ['1', 'Lệnh cho người dùng thường', '<code>man 1 ls</code>'],
        ['2', '<b>Lời gọi hệ thống</b> — cửa vào kernel', '<code>man 2 open</code>, <code>man 2 ioctl</code>'],
        ['3', '<b>Hàm thư viện C</b>', '<code>man 3 printf</code>, <code>man 3 malloc</code>'],
        ['4', 'File thiết bị đặc biệt trong <code>/dev</code>', '<code>man 4 tty</code>'],
        ['5', 'Định dạng file cấu hình', '<code>man 5 fstab</code>'],
        ['7', 'Khái niệm tổng quát', '<code>man 7 signal</code>'],
        ['8', 'Lệnh quản trị hệ thống', '<code>man 8 mount</code>']
      ]},

    { t: 'cal', kind: 'tip', title: 'Phím cần nhớ khi đang ở trong man', x:
      '<p><kbd>Space</kbd> sang trang · <kbd>b</kbd> lùi trang · <kbd>/</kbd> rồi gõ từ khoá để tìm · ' +
      '<kbd>n</kbd> tới kết quả tiếp theo · <kbd>g</kbd> về đầu · <kbd>G</kbd> xuống cuối · ' +
      '<kbd>q</kbd> thoát.</p>' +
      '<p>Đây chính là bộ phím của <code>less</code> — bạn sẽ gặp lại nguyên bộ này ở Bài 6, và ' +
      'gần giống nó trong <code>vim</code> ở Bài 7. Học một lần, dùng ba chỗ.</p>' },

    { t: 'cal', kind: 'warn', title: 'Máy bạn dùng coreutils bản Rust — hãy biết trước điều này', x:
      '<p>Ubuntu 26.04 thay bộ lệnh cơ bản của GNU bằng <b>uutils coreutils</b> viết bằng Rust. ' +
      'Ở thực hành bạn sẽ tự kiểm chứng: <code>ls --version</code> in ra ' +
      '<code>ls (uutils coreutils) 0.8.0</code>.</p>' +
      '<p>Hệ quả bạn sẽ thấy ngay: thông báo lỗi khác GNU (<code>error: unexpected argument</code> ' +
      'thay vì <code>invalid option</code>), và <code>ls --help</code> trình bày khác mọi tài liệu ' +
      'trên mạng. Chức năng chính thì tương thích.</p>' +
      '<p><b>Vì sao điều này quan trọng với nghề nhúng:</b> thiết bị nhúng thường dùng phiên bản thứ ba, ' +
      '<b>BusyBox</b>, còn tối giản hơn nữa. Cùng một cái tên <code>ls</code> có thể là ba chương trình ' +
      'khác nhau với bộ tuỳ chọn khác nhau. Bài học rút ra: <b>luôn tra cứu trên chính hệ thống bạn ' +
      'đang làm việc</b>, đừng tin bài viết trên mạng. Bản GNU vẫn còn trên máy bạn dưới tên ' +
      '<code>gnuls</code>, <code>gnudir</code>.</p>' },

    /* ══════════════════════════════════════════════
       5. MÃ THOÁT
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Mã thoát — cách máy trả lời "có được không"' },

    { t: 'p', x:
      'Mỗi lệnh khi kết thúc trả về một số nguyên từ 0 đến 255 cho tiến trình cha. Số đó gọi là ' +
      '<b>mã thoát</b> (exit code hoặc exit status). Quy ước ngược với trực giác:' },

    { t: 'list', items: [
      '<b>0 nghĩa là thành công.</b> Chỉ có đúng một cách để thành công.',
      '<b>Khác 0 nghĩa là thất bại.</b> Có nhiều cách để hỏng, nên cần nhiều mã khác nhau.'
    ]},

    { t: 'p', x:
      'Shell lưu mã thoát của lệnh vừa chạy trong biến <code>$?</code>. Đây là biến quan trọng nhất ' +
      'trong toàn bộ Chặng 01: nó là nền của mọi script tự động, mọi Makefile, và mọi hệ thống CI.' },

    { t: 'table',
      head: ['Mã', 'Ý nghĩa quy ước', 'Bạn gặp khi'],
      rows: [
        ['<b>0</b>', 'Thành công', 'Mọi lệnh chạy trót lọt'],
        ['<b>1</b>', 'Lỗi chung', '<code>grep</code> không tìm thấy dòng nào; <code>false</code>'],
        ['<b>2</b>', 'Dùng sai cú pháp hoặc không tìm thấy file', '<code>ls file-khong-co</code>; <code>ls --alll</code>'],
        ['<b>126</b>', 'Tìm thấy file nhưng <b>không chạy được</b>', 'Quên <code>chmod +x</code> cho script'],
        ['<b>127</b>', '<b>Không tìm thấy lệnh</b>', 'Gõ sai tên, hoặc chương trình chưa được cài'],
        ['<b>130</b>', 'Bị dừng bởi <kbd>Ctrl</kbd>+<kbd>C</kbd>', '128 + 2, với 2 là số hiệu tín hiệu SIGINT'],
        ['<b>143</b>', 'Bị dừng bởi <code>kill</code>', '128 + 15, với 15 là SIGTERM']
      ]},

    { t: 'cal', kind: 'info', title: 'Quy tắc 128 + N', x:
      '<p>Khi một tiến trình bị <b>tín hiệu</b> giết chứ không tự thoát, shell báo mã ' +
      '<code>128 + số hiệu tín hiệu</code>.</p>' +
      '<p><kbd>Ctrl</kbd>+<kbd>C</kbd> gửi SIGINT số 2 → <b>130</b>. Lệnh <code>kill</code> mặc định ' +
      'gửi SIGTERM số 15 → <b>143</b>. Ở phần thực hành bạn sẽ tự tạo ra con số 143 này.</p>' +
      '<p>Đây không phải chi tiết vụn vặt: khi thiết bị nhúng của bạn tắt máy, init gửi SIGTERM cho ' +
      'mọi tiến trình và <b>chờ</b> chúng dọn dẹp. Chương trình nào không xử lý tín hiệu tử tế sẽ bị ' +
      'giết cứng và có thể làm hỏng dữ liệu. Toàn bộ Bài 21 dành cho chủ đề này.</p>' },

    { t: 'h3', x: 'Nối lệnh theo kết quả: &amp;&amp; và ||' },

    { t: 'p', x:
      'Biết mã thoát rồi thì hai toán tử sau trở nên hiển nhiên — và bạn đã dùng chúng từ Bài 3 mà ' +
      'chưa được giải thích.' },

    { t: 'table',
      head: ['Viết', 'Nghĩa', 'Ví dụ thực tế'],
      rows: [
        ['<code>A &amp;&amp; B</code>', 'Chạy B <b>chỉ khi</b> A thành công (mã 0)',
         '<code>make &amp;&amp; ./chuong-trinh</code> — chỉ chạy khi build xong'],
        ['<code>A || B</code>', 'Chạy B <b>chỉ khi</b> A thất bại (mã khác 0)',
         '<code>cd ~/embedded || mkdir ~/embedded</code>'],
        ['<code>A ; B</code>', 'Chạy B <b>bất kể</b> A ra sao',
         'Hai việc không liên quan đến nhau'],
        ['<code>A &amp;&amp; B || C</code>', 'A xong thì B, ngược lại thì C',
         'Dạng if-then-else rút gọn']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao dấu ; và dấu &amp;&amp; không thay nhau được', x:
      '<p>Câu <code>make ; ./chuong-trinh</code> vẫn chạy chương trình <b>ngay cả khi build thất bại</b> — ' +
      'bạn sẽ chạy bản cũ mà tưởng là bản mới, rồi mất một buổi đi tìm lỗi không tồn tại.</p>' +
      '<p>Với <code>make &amp;&amp; ./chuong-trinh</code>, build hỏng thì dừng ngay tại đó. ' +
      'Trong mọi script build và mọi lệnh nhiều bước, <code>&amp;&amp;</code> gần như luôn là lựa chọn đúng.</p>' },

    /* ══════════════════════════════════════════════
       6. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: mổ xẻ câu lệnh trên máy của bạn' },

    { t: 'p', x:
      'Toàn bộ phần này chạy trong <b>WSL</b>. Mọi kết quả in ra bên dưới được chụp từ chính máy bạn, ' +
      'nên nếu bạn thấy khác thì hãy dừng lại tìm hiểu — sự khác biệt luôn có lý do và lý do đó ' +
      'thường đáng học.' },

    { t: 'steps', items: [

      { title: 'Xác định shell bạn đang dùng',
        blocks: [
          { t: 'p', x:
            'Trước khi học luật chơi, hãy xác nhận mình đang chơi với ai. Ba lệnh, ba góc nhìn khác nhau:' },

          { t: 'code', where: 'wsl', code:
            'echo $SHELL\n' +
            'ps -p $$ -o comm=\n' +
            'bash --version | head -1' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '/bin/bash\n' +
            'bash\n' +
            'GNU bash, version 5.3.9(1)-release (x86_64-pc-linux-gnu)' },

          { t: 'cmdx', cmd: 'ps -p $$ -o comm=',
            title: 'Mổ xẻ câu lệnh',
            rows: [
              ['ps', 'Liệt kê tiến trình đang chạy. Bài 9 sẽ dùng lệnh này rất nhiều.', ''],
              ['-p $$', 'Chỉ xem tiến trình có PID cho trước. <code>$$</code> là biến đặc biệt: <b>PID của chính shell hiện tại</b>.',
               'Đây là mẹo kinh điển để hỏi "tôi đang ngồi trong shell nào".'],
              ['-o comm=', 'Chỉ in cột <code>comm</code> (tên lệnh). Dấu <code>=</code> ở cuối xoá luôn dòng tiêu đề.',
               'Không có <code>=</code> thì kết quả có thêm một dòng <code>COMMAND</code>.']
            ]},

          { t: 'cal', kind: 'why', title: 'Vì sao hỏi hai lần bằng hai cách', x:
            '<p><code>$SHELL</code> chỉ là một <b>biến môi trường</b> ghi shell đăng nhập mặc định của ' +
            'tài khoản. Nó <b>không</b> cho biết bạn đang thật sự ở trong shell nào — gõ <code>sh</code> ' +
            'rồi xem, <code>$SHELL</code> vẫn nói <code>/bin/bash</code> trong khi bạn đang ở trong ' +
            '<code>sh</code>.</p>' +
            '<p><code>ps -p $$</code> hỏi thẳng kernel về tiến trình thật. Khi gỡ lỗi một script chạy ' +
            'sai trên thiết bị nhúng — nơi <code>/bin/sh</code> thường là BusyBox chứ không phải bash — ' +
            'sự phân biệt này tiết kiệm cho bạn hàng giờ.</p>' }
        ]},

      { title: 'Dựng sân tập và tách một câu lệnh thành từng mảnh',
        blocks: [
          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/embedded/bai04/demo && cd ~/embedded/bai04/demo\n' +
            'touch bao-cao.txt ghi-chu.md\n' +
            'mkdir tai-lieu\n' +
            'printf \'xin chao\\n\' > bao-cao.txt' },

          { t: 'p', x:
            'Giờ chạy <code>ls</code> ở dạng trần trụi nhất — không tuỳ chọn, không đối số:' },
          { t: 'code', where: 'wsl', code: 'ls' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'bao-cao.txt\n' +
            'ghi-chu.md\n' +
            'tai-lieu' },

          { t: 'p', x:
            'Thêm một tuỳ chọn để đổi <b>cách</b> hiển thị:' },
          { t: 'code', where: 'wsl', code: 'ls -l' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'total 8\n' +
            '-rw-r--r-- 1 shinarus shinarus    9 Aug  1 15:35 bao-cao.txt\n' +
            '-rw-r--r-- 1 shinarus shinarus    0 Aug  1 15:35 ghi-chu.md\n' +
            'drwxr-xr-x 2 shinarus shinarus 4096 Aug  1 15:35 tai-lieu' },

          { t: 'p', x:
            'Ba dòng dưới đây <b>cho kết quả giống hệt nhau</b>. Hãy chạy cả ba và đối chiếu:' },
          { t: 'code', where: 'wsl', code:
            'ls -l -a -h\n' +
            'ls -lah\n' +
            'ls --all --human-readable -l' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'total 16K\n' +
            'drwxr-xr-x 3 shinarus shinarus 4.0K Aug  1 15:35 .\n' +
            'drwxr-xr-x 3 shinarus shinarus 4.0K Aug  1 15:35 ..\n' +
            '-rw-r--r-- 1 shinarus shinarus    9 Aug  1 15:35 bao-cao.txt\n' +
            '-rw-r--r-- 1 shinarus shinarus    0 Aug  1 15:35 ghi-chu.md\n' +
            'drwxr-xr-x 3 shinarus shinarus 4.0K Aug  1 15:35 tai-lieu' },

          { t: 'cmdx', cmd: 'ls -lah',
            title: 'Mổ xẻ câu lệnh',
            rows: [
              ['ls', 'Liệt kê nội dung thư mục. Không có đối số nên nó lấy mặc định là thư mục hiện tại.', ''],
              ['-l', '<i>long</i> — mỗi mục một dòng, kèm quyền, chủ sở hữu, kích thước, thời gian sửa.',
               'Cột quyền <code>-rw-r--r--</code> là nội dung chính của Bài 8.'],
              ['-a', '<i>all</i> — hiện cả mục bắt đầu bằng dấu chấm.',
               '<code>.</code> là thư mục hiện tại, <code>..</code> là thư mục cha. File có tên bắt đầu bằng <code>.</code> được coi là file ẩn — đó là toàn bộ cơ chế "ẩn" trong Linux, không có thuộc tính đặc biệt nào cả.'],
              ['-h', '<i>human-readable</i> — đổi byte thành <code>4.0K</code>, <code>2.3M</code>.',
               'Chỉ có tác dụng khi đi kèm <code>-l</code>. Chạy riêng <code>ls -h</code> sẽ không thấy gì khác.'],
              ['-lah', 'Ba tuỳ chọn ngắn gộp lại sau một dấu gạch.',
               'Chỉ tuỳ chọn <b>ngắn</b> mới gộp được. <code>--all--human-readable</code> là vô nghĩa.']
            ]},

          { t: 'cal', kind: 'info', title: 'Đọc dòng total 16K', x:
            '<p>Con số này <b>không</b> phải tổng kích thước các file. Nó là tổng số <b>khối đĩa</b> mà ' +
            'các mục trong thư mục chiếm. Một file 9 byte vẫn ăn trọn một khối 4 KB.</p>' +
            '<p>Chênh lệch giữa "kích thước file" và "chỗ thật sự chiếm trên đĩa" trở nên rất quan trọng ' +
            'ở Chặng 09, khi bạn nhét cả hệ thống file vào vài megabyte flash.</p>' }
        ]},

      { title: 'Hỏi xem mỗi lệnh thật sự đến từ đâu',
        blocks: [
          { t: 'code', where: 'wsl', code:
            'type ls\n' +
            'type cd\n' +
            'type -t ls\n' +
            'type -t cd' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'ls is hashed (/usr/bin/ls)\n' +
            'cd is a shell builtin\n' +
            'file\n' +
            'builtin' },

          { t: 'cal', kind: 'info', title: 'Chữ "hashed" nghĩa là gì', x:
            '<p>Lần đầu bạn gọi <code>ls</code>, bash phải dò lần lượt từng thư mục trong ' +
            '<code>$PATH</code> — trên máy bạn danh sách đó có hơn <b>40 thư mục</b>. Tìm được rồi, ' +
            'bash ghi nhớ đường dẫn vào một bảng băm để lần sau khỏi dò lại.</p>' +
            '<p>Ở một phiên bash hoàn toàn mới, dòng đầu sẽ là <code>ls is /usr/bin/ls</code>. ' +
            'Sau khi chạy <code>ls</code> một lần, nó đổi thành <code>ls is hashed (/usr/bin/ls)</code>. ' +
            'Cùng một sự thật, chỉ khác chỗ bash đọc ra.</p>' },

          { t: 'p', x: 'Giờ so sánh với <code>which</code>:' },
          { t: 'code', where: 'wsl', code:
            'which ls\n' +
            'which cd\n' +
            'echo $?\n' +
            'command -v cd' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '/usr/bin/ls\n' +
            '1\n' +
            'cd' },

          { t: 'cal', kind: 'why', title: 'Bạn vừa thấy giới hạn của which', x:
            '<p><code>which cd</code> không in gì và trả mã thoát <b>1</b>. Người mới đọc kết quả này rất ' +
            'dễ kết luận sai rằng <code>cd</code> không tồn tại.</p>' +
            '<p>Sự thật: <code>which</code> là một <b>chương trình ngoài</b>, nó chỉ biết dò file trong ' +
            '<code>$PATH</code> và mù hoàn toàn với builtin. Trong khi <code>type</code> và ' +
            '<code>command -v</code> là builtin của bash nên nhìn thấy mọi thứ.</p>' +
            '<p><b>Kết luận dùng được ngay:</b> gõ tay thì <code>type</code>, viết script thì ' +
            '<code>command -v</code>. Quên <code>which</code> đi — nhiều hệ nhúng còn không cài nó.</p>' },

          { t: 'p', x:
            'Một lệnh có thể tồn tại ở nhiều nơi cùng lúc. Xem tất cả bằng <code>-a</code>:' },
          { t: 'code', where: 'wsl', code: 'type -a echo' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'echo is a shell builtin\n' +
            'echo is /usr/bin/echo\n' +
            'echo is /bin/echo' },

          { t: 'cal', kind: 'tip', x:
            '<p>Có tới ba <code>echo</code> trên máy bạn, và bash luôn chọn cái đầu tiên: <b>builtin</b>. ' +
            'Đây là lý do <code>echo</code> chạy nhanh hơn hẳn — không cần tạo tiến trình mới.</p>' +
            '<p>Đó cũng là nguồn của một lớp lỗi khó chịu: <code>echo</code> builtin của bash và ' +
            '<code>/usr/bin/echo</code> xử lý tuỳ chọn hơi khác nhau. Script chạy tốt trên máy bạn có thể ' +
            'cư xử khác trên thiết bị nhúng dùng BusyBox.</p>' }
        ]},

      { title: 'Tra cứu và phát hiện lệnh trên máy bạn không phải bản GNU',
        blocks: [
          { t: 'p', x: 'Hỏi <code>ls</code> xem nó là ai:' },
          { t: 'code', where: 'wsl', code:
            'ls --version\n' +
            'readlink -f "$(command -v ls)"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'ls (uutils coreutils) 0.8.0\n' +
            '/usr/lib/cargo/bin/coreutils/ls' },

          { t: 'cal', kind: 'info', title: 'Đây là một phát hiện thật, không phải bài tập giả', x:
            '<p>Đường dẫn <code>/usr/lib/cargo/bin/coreutils/ls</code> tiết lộ tất cả: ' +
            '<code>cargo</code> là trình quản lý gói của <b>Rust</b>. Ubuntu 26.04 đã thay bộ lệnh cơ bản ' +
            'của GNU bằng bản viết lại bằng Rust.</p>' +
            '<p>Vì thế nếu bạn tra một bài viết trên mạng và thấy <code>ls --help</code> in ra khác hẳn — ' +
            'bạn không làm sai gì cả. Bản GNU vẫn còn trên máy dưới tên <code>gnuls</code>.</p>' },

          { t: 'p', x: 'So sánh ba cách tra cứu, chú ý cách cuối cùng thất bại:' },
          { t: 'code', where: 'wsl', code:
            'ls --help | head -6' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'List directory contents.\n' +
            'Ignore files and directories starting with a \'.\' by default\n' +
            '\n' +
            'Usage: ls [OPTION]... [FILE]...\n' +
            '\n' +
            'Arguments:' },

          { t: 'code', where: 'wsl', code: 'help cd | head -3' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'cd: cd [-L|[-P [-e]]] [-@] [dir]\n' +
            '    Change the shell working directory.' },

          { t: 'code', where: 'wsl', code:
            'man cd\n' +
            'echo $?' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'No manual entry for cd\n' +
            '16' },

          { t: 'cal', kind: 'why', title: 'Vì sao man cd thất bại — và đó là điều đúng', x:
            '<p><code>man</code> tra tài liệu của các <b>file chương trình</b>. <code>cd</code> không phải ' +
            'file, nó nằm bên trong bash, nên đương nhiên không có trang man riêng. Tài liệu của nó ' +
            'nằm trong tài liệu của bash và được lấy ra bằng <code>help cd</code>.</p>' +
            '<p>Mã thoát <b>16</b> ở đây là một ví dụ đẹp: <code>man</code> tự định nghĩa mã lỗi riêng ' +
            'của nó. Quy ước duy nhất được bảo đảm trên toàn hệ thống là "0 thành công, khác 0 thất bại"; ' +
            'ý nghĩa cụ thể của từng số khác 0 là chuyện riêng của mỗi chương trình và được ghi trong ' +
            'trang man, mục <code>EXIT STATUS</code>.</p>' },

          { t: 'p', x: 'Cuối cùng, thử mở một trang man đầy đủ và tập thoát ra:' },
          { t: 'code', where: 'wsl', code: 'man ls' },
          { t: 'cal', kind: 'tip', x:
            '<p>Gõ <code>/human</code> rồi <kbd>Enter</kbd> để nhảy tới phần nói về ' +
            '<code>--human-readable</code>, <kbd>n</kbd> để tới kết quả sau, rồi <kbd>q</kbd> để thoát. ' +
            'Tập phản xạ này ngay từ bây giờ: tra man nhanh hơn mở trình duyệt, và trên board thật ' +
            'thì bạn không có trình duyệt.</p>' }
        ]},

      { title: 'Tạo ra năm mã thoát khác nhau bằng chính tay bạn',
        blocks: [
          { t: 'p', x: 'Mã <b>0</b> và mã <b>2</b> — thành công và thất bại thông thường:' },
          { t: 'code', where: 'wsl', code:
            'ls bao-cao.txt > /dev/null\n' +
            'echo $?\n' +
            'ls khong-co.txt\n' +
            'echo $?' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '0\n' +
            'ls: cannot access \'khong-co.txt\': No such file or directory\n' +
            '2' },

          { t: 'cal', kind: 'warn', title: 'Cái bẫy lớn nhất của $?', x:
            '<p><code>$?</code> chỉ giữ mã thoát của <b>lệnh vừa chạy xong ngay trước đó</b> — và ' +
            '<code>echo</code> cũng là một lệnh. Hãy tự thử:</p>' +
            '<p><code>ls khong-co.txt 2>/dev/null</code> · <code>echo $?</code> in ra <b>2</b> · ' +
            '<code>echo $?</code> lần nữa in ra <b>0</b>.</p>' +
            '<p>Số 0 lần hai là mã thoát của chính lệnh <code>echo</code> đầu tiên. Muốn dùng lại nhiều lần ' +
            'thì phải cất đi ngay: <code>rc=$?</code>. Đây là lỗi kinh điển trong script kiểm thử tự động.</p>' },

          { t: 'p', x: 'Mã <b>127</b> — lệnh không tồn tại:' },
          { t: 'code', where: 'wsl', code:
            'lss\n' +
            'echo $?' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'bash: lss: command not found\n' +
            '127' },

          { t: 'p', x:
            'Mã <b>126</b> — file có đó nhưng không chạy được. Đây là lỗi mà mọi người mới đều gặp ' +
            'trong tuần đầu tiên:' },
          { t: 'code', where: 'wsl', code:
            'printf \'#!/bin/bash\\necho "Toi da chay duoc"\\n\' > chao.sh\n' +
            'ls -l chao.sh\n' +
            './chao.sh\n' +
            'echo $?' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '-rw-r--r-- 1 shinarus shinarus 36 Aug  1 15:40 chao.sh\n' +
            'bash: ./chao.sh: Permission denied\n' +
            '126' },

          { t: 'p', x: 'Cấp quyền thực thi rồi chạy lại:' },
          { t: 'code', where: 'wsl', code:
            'chmod +x chao.sh\n' +
            'ls -l chao.sh\n' +
            './chao.sh\n' +
            'echo $?' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '-rwxr-xr-x 1 shinarus shinarus 36 Aug  1 15:40 chao.sh\n' +
            'Toi da chay duoc\n' +
            '0' },

          { t: 'cal', kind: 'info', title: 'Ba chữ x vừa xuất hiện', x:
            '<p>So hai dòng <code>ls -l</code>: <code>-rw-r--r--</code> đã thành <code>-rwxr-xr-x</code>. ' +
            'Ba chữ <code>x</code> mới là <b>bit thực thi</b>, và chúng là toàn bộ khác biệt giữa ' +
            '"một file văn bản" và "một chương trình chạy được".</p>' +
            '<p>Phân biệt 126 với 127 rất đáng nhớ: <b>127</b> là "không tìm thấy", <b>126</b> là ' +
            '"tìm thấy nhưng không chạy được". Ở Chặng 09, khi thiết bị báo ' +
            '<code>can\'t run /etc/init.d/rcS: Permission denied</code>, bạn sẽ biết ngay là quên ' +
            '<code>chmod +x</code> chứ không phải sai đường dẫn. Bài 8 dành trọn cho quyền file.</p>' },

          { t: 'p', x: 'Mã <b>143</b> — bị tín hiệu giết. Cho một lệnh chạy nền rồi kết liễu nó:' },
          { t: 'code', where: 'wsl', code:
            'sleep 30 &\n' +
            'kill %1\n' +
            'wait %1\n' +
            'echo $?' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '143' },

          { t: 'cmdx', cmd: 'sleep 30 &',
            title: 'Mổ xẻ câu lệnh',
            rows: [
              ['sleep 30', 'Không làm gì trong 30 giây. Một "chương trình bận" tiện lợi để thí nghiệm.', ''],
              ['&', 'Đẩy lệnh xuống chạy nền, trả dấu nhắc lại cho bạn ngay lập tức.',
               'Bài 9 sẽ mổ xẻ đầy đủ cơ chế job.'],
              ['%1', 'Cách gọi tên job nền số 1.', 'Có thể thay bằng PID thật.'],
              ['wait %1', 'Chờ job kết thúc rồi <b>lấy mã thoát của nó</b>.',
               'Không có <code>wait</code> thì <code>$?</code> là mã thoát của <code>kill</code>, không phải của <code>sleep</code>.']
            ]},

          { t: 'p', x: 'Cuối cùng, dùng mã thoát để nối lệnh — đúng cách và sai cách:' },
          { t: 'code', where: 'wsl', code:
            'ls bao-cao.txt && echo "TON TAI"\n' +
            'ls khong-co.txt || echo "KHONG TON TAI"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'bao-cao.txt\n' +
            'TON TAI\n' +
            'ls: cannot access \'khong-co.txt\': No such file or directory\n' +
            'KHONG TON TAI' },

          { t: 'cal', kind: 'tip', title: 'Bạn vừa viết câu lệnh có điều kiện đầu tiên', x:
            '<p>Không cần <code>if</code>, không cần script. Đây chính là dạng rút gọn bạn sẽ gặp trong ' +
            'gần như mọi tài liệu Linux, ví dụ <code>sudo apt update &amp;&amp; sudo apt install …</code> ' +
            'mà bạn đã gõ ở Bài 3 — giờ thì bạn biết vì sao nó được viết như vậy: cài đặt chỉ nên chạy ' +
            'khi việc làm mới danh mục đã thành công.</p>' }
        ]}
    ]},

    /* ══════════════════════════════════════════════
       7. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>bash: lss: command not found</code> · mã 127',
         'Gõ sai tên lệnh, hoặc chương trình chưa được cài, hoặc không nằm trong <code>$PATH</code>',
         'Kiểm tra chính tả; <code>type -a &lt;lệnh&gt;</code>; nếu chưa cài thì <code>sudo apt install</code>'],
        ['<code>bash: ./chao.sh: Permission denied</code> · mã 126',
         'File tồn tại nhưng thiếu bit thực thi',
         '<code>chmod +x chao.sh</code> rồi chạy lại'],
        ['<code>ls: cannot access \'x\': No such file or directory</code> · mã 2',
         'Sai tên file hoặc sai thư mục hiện tại',
         '<code>pwd</code> để biết mình đang ở đâu, <code>ls</code> để xem có gì'],
        ['<code>error: unexpected argument \'--alll\' found</code>',
         'Sai tên tuỳ chọn. Máy bạn dùng uutils nên thông báo khác GNU',
         'Đọc dòng <code>tip:</code> ngay dưới — nó gợi ý đúng tên tuỳ chọn'],
        ['<code>rm: cannot remove \'hai\'</code> và <code>\'tu.txt\'</code>',
         'Tên file có dấu cách nhưng không được bọc nháy',
         '<code>rm "hai tu.txt"</code>'],
        ['<code>No manual entry for cd</code> · mã 16',
         '<code>cd</code> là builtin, không phải file, nên không có trang man',
         'Dùng <code>help cd</code>'],
        ['<code>which cd</code> không in gì, mã 1',
         '<code>which</code> chỉ dò file trong <code>$PATH</code>, mù với builtin',
         'Dùng <code>type cd</code> hoặc <code>command -v cd</code>'],
        ['<code>ls -h</code> không thấy khác gì',
         '<code>-h</code> chỉ có tác dụng cùng <code>-l</code>, vì không có <code>-l</code> thì không in cột kích thước',
         'Dùng <code>ls -lh</code>']
      ]},

    /* ══════════════════════════════════════════════
       8. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', items: [
      '<b>Shell</b> là chương trình đọc và thực thi lệnh; <b>terminal</b> chỉ là cửa sổ hiển thị. ' +
      'Máy bạn dùng <b>bash 5.3.9</b>.',
      'Khuôn của mọi câu lệnh: <b>lệnh [tuỳ chọn] [đối số]</b>. Tuỳ chọn đổi <i>cách</i> làm, ' +
      'đối số nói làm <i>với cái gì</i>.',
      'Tuỳ chọn <b>ngắn gộp được</b> (<code>-lah</code>), tuỳ chọn <b>dài thì không</b>. ' +
      'Gõ tay dùng ngắn, viết script dùng dài.',
      '<b>Khoảng trắng là dấu phân cách.</b> Tên có dấu cách phải bọc nháy kép — và trong script, ' +
      'luôn viết <code>"$bien"</code>.',
      'Thứ tự phân giải tên lệnh: <b>alias → hàm → builtin → PATH</b>. Vì thế <code>cd</code> ' +
      'buộc phải là builtin, và <code>which cd</code> không tìm ra gì.',
      'Tra cứu: <code>--help</code> để nhớ nhanh, <code>man</code> để hiểu sâu, <code>help</code> ' +
      'cho builtin. Mục <b>2</b> và <b>3</b> của man là tài liệu chính từ Chặng 03.',
      'Lệnh trên máy bạn là <b>uutils coreutils 0.8.0</b> viết bằng Rust, không phải GNU — ' +
      'luôn tra cứu trên chính hệ thống đang dùng.',
      'Mã thoát: <b>0</b> thành công · <b>1</b> lỗi chung · <b>2</b> sai đối số · <b>126</b> ' +
      'không chạy được · <b>127</b> không tìm thấy · <b>128+N</b> bị tín hiệu N giết.',
      '<code>$?</code> chỉ sống được <b>một lệnh</b>. Cần dùng lại thì <code>rc=$?</code> ngay lập tức.',
      '<code>&amp;&amp;</code> chạy tiếp khi thành công, <code>||</code> chạy tiếp khi thất bại. ' +
      'Trong script build, <code>&amp;&amp;</code> gần như luôn đúng hơn <code>;</code>.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo', x:
      '<p><b>Bài 5 — Hệ thống file Linux (FHS)</b> trả lời câu hỏi bạn hẳn đã tự đặt ra khi thấy ' +
      '<code>/usr/bin/ls</code> và <code>/usr/lib/cargo/bin/coreutils/ls</code>: vì sao lại có ngần ấy ' +
      'thư mục, và ai quyết định cái gì nằm ở đâu.</p>' +
      '<p>Quan trọng hơn, bạn sẽ gặp <code>/proc</code> và <code>/sys</code> — hai thư mục ' +
      '<b>không nằm trên đĩa</b>. Bạn sẽ đọc tốc độ CPU và danh sách thiết bị của máy mình bằng ' +
      'đúng lệnh <code>cat</code>, và hiểu vì sao mọi driver bạn viết ở Chặng 10 đều xuất hiện ' +
      'ở đó dưới dạng file.</p>' }
  ],

  /* ══════════════════════════════════════════════
     QUIZ
     ══════════════════════════════════════════════ */
  quiz: [
    {
      q: 'Trong câu lệnh <code>ls -lh /etc</code>, đâu là đối số?',
      opts: [
        '<code>-lh</code>',
        '<code>/etc</code>',
        'Cả <code>-lh</code> và <code>/etc</code>',
        '<code>ls</code>'
      ],
      a: 1,
      why: 'Tuỳ chọn (bắt đầu bằng dấu gạch) đổi <i>cách</i> lệnh làm việc; đối số nói lệnh làm việc ' +
           '<i>với cái gì</i>. Ở đây <code>-lh</code> là hai tuỳ chọn ngắn gộp lại, còn <code>/etc</code> ' +
           'là thứ để <code>ls</code> tác động lên. Bỏ đối số đi thì <code>ls</code> dùng mặc định là ' +
           'thư mục hiện tại.'
    },
    {
      q: 'Vì sao <code>which cd</code> không in ra gì và trả mã thoát 1?',
      opts: [
        'Vì <code>cd</code> chưa được cài trên máy',
        'Vì <code>cd</code> là lệnh dựng sẵn của bash, không tồn tại file nào tên <code>cd</code> trong <code>$PATH</code>',
        'Vì <code>which</code> cần quyền root',
        'Vì <code>cd</code> đang bị một alias che mất'
      ],
      a: 1,
      why: '<code>which</code> là chương trình ngoài và chỉ biết dò file trong <code>$PATH</code>. ' +
           '<code>cd</code> bắt buộc phải là builtin: nếu nó là chương trình ngoài, nó sẽ chạy trong ' +
           'tiến trình con, đổi thư mục của tiến trình con rồi thoát, còn shell của bạn vẫn đứng nguyên. ' +
           'Dùng <code>type cd</code> hoặc <code>command -v cd</code> để có câu trả lời đúng.'
    },
    {
      q: 'Bạn chạy một script và nhận <code>Permission denied</code> với mã thoát 126. Nguyên nhân nhiều khả năng nhất là gì?',
      opts: [
        'Script không tồn tại ở đường dẫn đó',
        'Script tồn tại nhưng thiếu bit thực thi — quên <code>chmod +x</code>',
        'Bạn cần chạy bằng <code>sudo</code>',
        'Dòng shebang bị sai'
      ],
      a: 1,
      why: 'Phân biệt hai mã rất gần nhau: <b>127</b> là "không tìm thấy lệnh", <b>126</b> là ' +
           '"tìm thấy rồi nhưng không chạy được". Mã 126 nghĩa là shell đã định vị được file — vấn đề ' +
           'nằm ở quyền. So sánh <code>ls -l</code> trước và sau <code>chmod +x</code> sẽ thấy ba chữ ' +
           '<code>x</code> xuất hiện.'
    },
    {
      q: 'Đoạn sau in ra gì? <code>ls khong-co.txt 2>/dev/null</code> · <code>echo $?</code> · <code>echo $?</code>',
      opts: [
        '<code>2</code> rồi <code>2</code>',
        '<code>2</code> rồi <code>0</code>',
        '<code>0</code> rồi <code>0</code>',
        '<code>1</code> rồi <code>1</code>'
      ],
      a: 1,
      why: '<code>$?</code> luôn là mã thoát của <b>lệnh ngay trước đó</b>. Lần đầu, lệnh trước là ' +
           '<code>ls</code> thất bại nên in <b>2</b>. Nhưng chính lệnh <code>echo</code> đó cũng thành công, ' +
           'nên lần thứ hai <code>$?</code> đã là mã thoát của <code>echo</code>, tức <b>0</b>. ' +
           'Muốn dùng lại nhiều lần phải cất ngay: <code>rc=$?</code>.'
    },
    {
      q: 'Trong một script build, nên viết <code>make ; ./chuong-trinh</code> hay <code>make &amp;&amp; ./chuong-trinh</code>?',
      opts: [
        'Hai cách tương đương nhau',
        '<code>;</code> — để luôn chạy được chương trình',
        '<code>&amp;&amp;</code> — vì nếu build thất bại thì không được chạy tiếp',
        '<code>||</code> — để chạy chương trình khi build lỗi'
      ],
      a: 2,
      why: 'Dấu <code>;</code> chạy lệnh sau bất kể lệnh trước ra sao. Build hỏng mà vẫn chạy tiếp thì ' +
           'bạn sẽ chạy file thực thi <b>cũ</b> còn sót lại và tưởng đó là bản mới — một buổi chiều đi ' +
           'tìm lỗi không tồn tại. <code>&amp;&amp;</code> chỉ chạy tiếp khi lệnh trước trả mã 0.'
    },
    {
      q: 'Bạn đọc một hướng dẫn trên mạng, làm theo, nhưng lệnh trên máy bạn báo <code>error: unexpected argument</code> thay vì <code>invalid option</code> như trong bài viết. Nguyên nhân?',
      opts: [
        'WSL2 làm hỏng lệnh',
        'Bạn cần cập nhật hệ thống',
        'Máy bạn dùng uutils coreutils viết bằng Rust chứ không phải GNU coreutils, nên thông báo lỗi và một số tuỳ chọn khác nhau',
        'Bài viết đó sai hoàn toàn'
      ],
      a: 2,
      why: 'Ubuntu 26.04 thay GNU coreutils bằng uutils. <code>ls --version</code> trên máy bạn in ' +
           '<code>ls (uutils coreutils) 0.8.0</code> và file thật nằm ở ' +
           '<code>/usr/lib/cargo/bin/coreutils/ls</code>. Cùng một cái tên lệnh có thể là ba chương trình ' +
           'khác nhau — GNU, uutils, hoặc BusyBox trên thiết bị nhúng. Bài học: luôn tra cứu bằng ' +
           '<code>--help</code> và <code>man</code> trên chính hệ thống đang làm việc.'
    }
  ]
});

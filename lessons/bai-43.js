/* Bài 43 — Cú pháp DTS
   Chặng 08 — Device Tree
   Bài thứ hai của Chặng 08. Dạy cú pháp: /dts-v1/, node và unit-address, thuộc tính và các
   kiểu giá trị, compatible / model / reg / status, #address-cells và #size-cells, label và
   phandle, chuỗi .dtsi include-and-override, /delete-node/ và /delete-property/, cuối cùng
   là overlay (/plugin/, fragment, __symbols__, __fixups__). Thực hành gọi dtc theo cả hai
   chiều trên máy thật. Mọi số liệu đo 2026-09-05 trên WSL2 Ubuntu, DTC 1.7.2, QEMU 10.2.1,
   cây nguồn ~/bai38/linux-6.18.45 do Bài 40 build. Bài này KHÔNG boot QEMU — việc sửa DTB
   rồi nạp lại và kiểm chứng qua /proc/device-tree là nội dung Bài 45. */

Lesson.register({
  id: 'bai-43',
  title: 'Cú pháp DTS',
  minutes: 50,
  practice: 'Thực hành 45 phút',
  level: 'Trung cấp',

  intro:
    'Bài 42 kết thúc bằng một lời hứa và một khoảng trống. Lời hứa: bạn đã hiểu <b>vì sao</b> ' +
    'Device Tree phải tồn tại. Khoảng trống: bạn đã <i>nhìn</i> tám dòng mô tả con UART ' +
    'PL011 và đoán nghĩa qua bảng đối chiếu, chứ chưa hề biết đọc chúng. Tại sao tên node ' +
    'lại là <code>pl011@9000000</code> mà không phải <code>uart0</code>? Vì sao ' +
    '<code>reg = &lt;0x00 0x9000000 0x00 0x1000&gt;</code> có <b>bốn</b> con số cho <b>một</b> ' +
    'vùng địa chỉ? Dấu <code>&amp;</code> trong <code>&amp;refclk</code> là gì? Bài này lấp ' +
    'kín khoảng trống đó.<br><br>' +
    'Cú pháp DTS nhỏ đến mức đáng ngạc nhiên: chỉ có <b>node</b> và <b>thuộc tính</b>, lồng ' +
    'nhau thành cây. Không có vòng lặp, không có hàm, không có phép tính. Trong một tiếng ' +
    'bạn học hết. Cái khó không nằm ở cú pháp mà ở <i>quy ước</i> — ai quyết định ' +
    '<code>reg</code> đọc ra sao, vì sao một node phải mang địa chỉ trong tên, và làm thế nào ' +
    'hai node trỏ được vào nhau khi cả cây chỉ là dữ liệu tĩnh. Ba câu hỏi đó chiếm phần lớn ' +
    'bài.<br><br>' +
    'Bạn sẽ tự tay gọi <code>dtc</code> — trình dịch đứng giữa <code>.dts</code> và ' +
    '<code>.dtb</code> trong sơ đồ ở Bài 42 — theo <b>cả hai chiều</b>. Dịch xuôi để biến ' +
    'file bạn viết thành khối nhị phân; dịch ngược để mở khối nhị phân của QEMU ra đọc. ' +
    'Chiều ngược lại đặc biệt đáng giá, vì nó cho bạn thấy <b>cái gì sống sót qua quá trình ' +
    'biên dịch và cái gì bốc hơi</b> — và đó là cách nhanh nhất để hiểu DTB thật sự chứa gì.',

  goals: [
    'Viết được một file <code>.dts</code> hoàn chỉnh từ con số không: khai báo phiên bản, ' +
      'node gốc, node con có <b>unit-address</b>, và thuộc tính đủ bốn kiểu giá trị.',
    'Giải mã được một thuộc tính <code>reg</code> bất kỳ bằng cách tra ' +
      '<code>#address-cells</code> và <code>#size-cells</code> <b>của node cha</b> — và giải ' +
      'thích được vì sao phải hỏi node cha chứ không phải chính nó.',
    'Phân biệt được <b>label</b> (chỉ tồn tại lúc dịch) với <b>phandle</b> (con số thật nằm ' +
      'trong <code>.dtb</code>), và biết <code>&amp;label</code> cho ra kết quả khác nhau khi ' +
      'nằm trong <code>&lt;…&gt;</code> hay đứng một mình.',
    'Dùng được chuỗi <code>.dtsi</code> → <code>.dts</code>: tách phần dùng chung, rồi ' +
      '<b>mở lại</b> một node bằng <code>&amp;label</code> để ghi đè, thêm, hoặc xoá thuộc ' +
      'tính của nó.',
    'Gọi <code>dtc</code> theo cả hai chiều và chỉ ra được chính xác những gì bị mất khi ' +
      'dịch xuôi: label, chú thích, kiểu dữ liệu, thứ tự thuộc tính.',
    'Đọc được cấu trúc một <b>overlay</b>: <code>/plugin/</code>, <code>fragment@N</code>, ' +
      '<code>target</code>, <code>__symbols__</code>, <code>__fixups__</code> — và áp một ' +
      'overlay vào cây gốc bằng <code>fdtoverlay</code>.'
  ],

  blocks: [

    /* ============================================================
       1. DÂY CHUYỀN: TỪ VĂN BẢN TỚI KHỐI NHỊ PHÂN
       ============================================================ */
    { t: 'h2', x: 'Dây chuyền: từ văn bản bạn gõ tới khối nhị phân kernel đọc' },

    { t: 'p', x:
      'Trước khi học cú pháp, cần biết rõ cú pháp đó đi đâu. Bài 42 đã cho bạn sơ đồ tổng ' +
      'quát; đây là bản chi tiết hơn, có thêm một mắt xích mà Bài 42 cố tình bỏ qua: ' +
      '<b>bộ tiền xử lý C</b>. Nó có mặt vì file DTS thật trong kernel dùng ' +
      '<code>#include</code> và hằng số kiểu <code>GPIO_ACTIVE_HIGH</code> — thứ mà bản thân ' +
      '<code>dtc</code> hoàn toàn không hiểu.' },

    { t: 'fig',
      cap: 'Dây chuyền đầy đủ. Điểm quan trọng nhất: mũi tên đứt nét đi ngược — <code>dtc</code> ' +
           'dịch được cả hai chiều, và chiều ngược là công cụ học tập tốt nhất bạn có, vì nó ' +
           'phơi ra chính xác những gì còn sống sót trong file nhị phân.',
      svg:
        '<svg viewBox="0 0 720 232" width="720" role="img" aria-label="Sơ đồ dây chuyền biên dịch Device Tree: file dts và dtsi qua bộ tiền xử lý C thành một file dts phẳng, qua dtc thành dtb, và mũi tên đứt nét đi ngược từ dtb về dts">' +
        '<text class="d-ts" x="18" y="16">1 — BẠN VIẾT</text>' +
        '<rect class="d-box" x="18" y="24" width="146" height="66" rx="6"/>' +
        '<text class="d-tm" x="30" y="44">board.dts</text>' +
        '<text class="d-tm" x="30" y="60">soc.dtsi</text>' +
        '<text class="d-tm" x="30" y="76">gpio.h</text>' +
        '<line class="d-line" x1="164" y1="57" x2="196" y2="57"/>' +
        '<path class="d-arrow" d="M 204 57 l -10 -5 l 0 10 z"/>' +
        '<text class="d-ts" x="206" y="16">2 — TIỀN XỬ LÝ</text>' +
        '<rect class="d-box-p" x="206" y="24" width="140" height="66" rx="6"/>' +
        '<text class="d-t" x="218" y="46">cpp</text>' +
        '<text class="d-ts" x="218" y="63">gộp #include,</text>' +
        '<text class="d-ts" x="218" y="79">thay macro</text>' +
        '<line class="d-line" x1="346" y1="57" x2="378" y2="57"/>' +
        '<path class="d-arrow" d="M 386 57 l -10 -5 l 0 10 z"/>' +
        '<text class="d-ts" x="388" y="16">3 — MỘT FILE PHẲNG</text>' +
        '<rect class="d-box" x="388" y="24" width="146" height="66" rx="6"/>' +
        '<text class="d-tm" x="400" y="46">board.dts.pp</text>' +
        '<text class="d-ts" x="400" y="63">không còn #include,</text>' +
        '<text class="d-ts" x="400" y="79">chỉ còn node + thuộc tính</text>' +
        '<line class="d-line" x1="534" y1="57" x2="566" y2="57"/>' +
        '<path class="d-arrow" d="M 574 57 l -10 -5 l 0 10 z"/>' +
        '<text class="d-ts" x="576" y="16">4 — DỊCH</text>' +
        '<rect class="d-box-p" x="576" y="24" width="126" height="66" rx="6"/>' +
        '<text class="d-t" x="588" y="52">dtc</text>' +
        '<text class="d-ts" x="588" y="70">-I dts -O dtb</text>' +
        '<line class="d-line" x1="639" y1="90" x2="639" y2="118"/>' +
        '<path class="d-arrow" d="M 639 126 l -5 -10 l 10 0 z"/>' +
        '<rect class="d-box-a" x="452" y="130" width="250" height="60" rx="6"/>' +
        '<text class="d-t" x="464" y="150">Khối nhị phân — kernel đọc</text>' +
        '<text class="d-tm" x="464" y="168">board.dtb  ·  magic d00dfeed</text>' +
        '<text class="d-ts" x="464" y="183">không có label, không có chú thích</text>' +
        '<line class="d-line" x1="452" y1="160" x2="360" y2="160" stroke-dasharray="5 4"/>' +
        '<path class="d-arrow" d="M 352 160 l 10 -5 l 0 10 z"/>' +
        '<rect class="d-box-g" x="120" y="130" width="230" height="60" rx="6"/>' +
        '<text class="d-t" x="132" y="150">Dịch ngược để đọc</text>' +
        '<text class="d-tm" x="132" y="168">dtc -I dtb -O dts</text>' +
        '<text class="d-ts" x="132" y="183">bạn sẽ dùng liên tục ở phần Thực hành</text>' +
        '<text class="d-ts" x="18" y="216">Bước 2 chỉ cần khi file có #include hoặc macro. File bạn tự viết trong bài này đi thẳng từ 1 sang 4.</text>' +
        '</svg>' },

    { t: 'cal', kind: 'why', title: 'Vì sao lại là bộ tiền xử lý của C, giữa một chuyện chẳng liên quan gì tới C',
      x: 'Vì nó có sẵn, nó đơn giản, và nó làm đúng hai việc DTS cần: ghép file và thay tên ' +
         'bằng số. Kernel không muốn viết một hệ thống macro riêng chỉ để cho phép ' +
         '<code>&lt;GPIO_ACTIVE_HIGH&gt;</code> thay vì <code>&lt;0&gt;</code>, nên nó mượn ' +
         '<code>cpp</code>. Hệ quả bạn phải nhớ: <b><code>dtc</code> một mình không đọc nổi ' +
         'phần lớn file <code>.dts</code> trong cây kernel.</b> Gõ ' +
         '<code>dtc -I dts …</code> thẳng vào một file có <code>#include</code> sẽ nhận ' +
         '<code>syntax error</code> ngay dòng đầu tiên — bạn sẽ gặp lỗi đó thật ở phần Lỗi thường gặp.' },

    { t: 'terms',
      items: [
        ['Node', '—', 'Một "hộp" trong cây, đại diện cho một thiết bị, một bus, hoặc một nhóm thông tin. Viết là <code>tên { … };</code>.'],
        ['Property', 'thuộc tính', 'Một cặp <i>tên = giá trị</i> nằm bên trong node. Đây là nơi chứa mọi dữ liệu thật.'],
        ['Unit address', '—', 'Phần sau dấu <code>@</code> trong tên node, ví dụ <code>9000000</code> trong <code>pl011@9000000</code>. Nó phải bằng địa chỉ đầu tiên trong <code>reg</code>.'],
        ['Cell', '—', 'Đơn vị đếm của Device Tree: <b>một số nguyên không dấu 32 bit</b>, big-endian. Mọi con số trong <code>&lt;…&gt;</code> đều là một cell.'],
        ['Label', 'nhãn', 'Cái tên bạn dán trước node để tham chiếu tới nó về sau: <code>uart0: serial@1010c000</code>. <b>Chỉ tồn tại lúc dịch.</b>'],
        ['Phandle', '—', 'Con số duy nhất mà <code>dtc</code> gán cho một node để node khác trỏ tới. Đây là thứ thật sự nằm trong <code>.dtb</code>, thay chỗ cho label.'],
        ['Overlay', '—', 'Một mảnh Device Tree rời, dịch riêng, dán đè lên cây gốc lúc chạy. Đuôi quy ước là <code>.dtso</code> → <code>.dtbo</code>.']
      ] },

    { t: 'h3', x: 'Một điều phải biết trước khi viết dòng đầu tiên: DTB không có kiểu dữ liệu' },

    { t: 'p', x:
      'Trong file <code>.dts</code> bạn phân biệt rất rõ chuỗi, số, và dãy byte — ba cách ' +
      'viết khác hẳn nhau. Trong file <code>.dtb</code> thì <b>không</b>. Mỗi thuộc tính chỉ ' +
      'là một cặp <i>tên</i> và <i>một dãy byte, kèm độ dài</i>. Định dạng nhị phân không lưu ' +
      '"đây là chuỗi" hay "đây là số" ở bất cứ đâu.' },

    { t: 'cal', kind: 'info', title: 'Hệ quả trực tiếp, và bạn sẽ tận mắt thấy ở bước 3',
      x: 'Khi <code>dtc</code> dịch ngược một <code>.dtb</code>, nó phải <b>đoán</b> kiểu. ' +
         'Quy tắc đoán rất thô: dài chia hết cho 4 thì in ra dạng ' +
         '<code>&lt;0x…&gt;</code>; toàn ký tự in được và kết thúc bằng NUL thì in ra dạng ' +
         'chuỗi; còn lại in ra dạng byte <code>[…]</code>. Nên bốn byte bạn viết là ' +
         '<code>[de ad be ef]</code> sẽ quay về thành <code>&lt;0xdeadbeef&gt;</code> — ' +
         '<i>khác cách viết, giống hệt nội dung</i>. Đây không phải lỗi của ' +
         '<code>dtc</code>: thông tin về kiểu đã bị vứt đi từ lúc dịch xuôi, không ai lấy lại ' +
         'được. Nhớ điều này và bạn sẽ không bao giờ hoảng khi thấy file dịch ngược trông ' +
         'khác file gốc.' },

    { t: 'p', x:
      'Vì sao lại thiết kế "keo kiệt" như vậy? Vì phía đọc là kernel, ở thời điểm sớm nhất ' +
      'của quá trình boot — chưa có cấp phát bộ nhớ, chưa có driver, chưa có gì. Càng ít việc ' +
      'phải làm càng tốt. Kernel <b>đã biết</b> thuộc tính <code>reg</code> là các cell và ' +
      '<code>compatible</code> là chuỗi, vì đó là quy ước bất di bất dịch — nên lưu thêm ' +
      'thông tin kiểu vào file chỉ tổ tốn chỗ và tốn thời gian phân tích.' },

    /* ============================================================
       2. NODE VÀ THUỘC TÍNH
       ============================================================ */
    { t: 'h2', x: 'Toàn bộ cú pháp: node, thuộc tính, và không còn gì khác' },

    { t: 'p', x:
      'Đây là một file DTS hợp lệ, đủ nhỏ để đọc hết trong mười giây, và đã chứa <b>mọi</b> ' +
      'thành phần cú pháp mà bài này dạy. Đọc lướt qua trước; từng mảnh sẽ được mổ xẻ ngay ' +
      'phía dưới.' },

    { t: 'code', where: 'file', name: 'board.dts', lang: 'dts', code:
      '/dts-v1/;\n' +
      '\n' +
      '/ {\n' +
      '\tmodel = "Learning Board v1";\n' +
      '\tcompatible = "learn,board-v1";\n' +
      '\t#address-cells = <1>;\n' +
      '\t#size-cells = <1>;\n' +
      '\n' +
      '\tchosen {\n' +
      '\t\tbootargs = "console=ttyAMA0,115200 root=/dev/ram0";\n' +
      '\t};\n' +
      '\n' +
      '\taliases {\n' +
      '\t\tserial0 = &uart0;\n' +
      '\t};\n' +
      '\n' +
      '\trefclk: clock-24mhz {\n' +
      '\t\tcompatible = "fixed-clock";\n' +
      '\t\t#clock-cells = <0>;\n' +
      '\t\tclock-frequency = <24000000>;\n' +
      '\t};\n' +
      '\n' +
      '\tsoc {\n' +
      '\t\tcompatible = "simple-bus";\n' +
      '\t\t#address-cells = <1>;\n' +
      '\t\t#size-cells = <1>;\n' +
      '\t\tranges;\n' +
      '\n' +
      '\t\tuart0: serial@1010c000 {\n' +
      '\t\t\tcompatible = "arm,pl011", "arm,primecell";\n' +
      '\t\t\treg = <0x1010c000 0x1000>;\n' +
      '\t\t\tclocks = <&refclk>;\n' +
      '\t\t\tclock-names = "uartclk";\n' +
      '\t\t\tstatus = "okay";\n' +
      '\t\t};\n' +
      '\n' +
      '\t\tuart1: serial@1010d000 {\n' +
      '\t\t\tcompatible = "arm,pl011", "arm,primecell";\n' +
      '\t\t\treg = <0x1010d000 0x1000>;\n' +
      '\t\t\tclocks = <&refclk>;\n' +
      '\t\t\tclock-names = "uartclk";\n' +
      '\t\t\tstatus = "disabled";\n' +
      '\t\t};\n' +
      '\t};\n' +
      '};',
      notes: [
        'Bạn sẽ gõ đúng file này ở bước 2 của phần Thực hành, nên chưa cần chép lại lúc đọc.',
        'Thụt đầu dòng bằng <b>tab</b> là quy ước của kernel. Cú pháp không bắt buộc, nhưng mọi file trong cây nguồn đều theo, và <code>dtc</code> cũng in ra bằng tab khi dịch ngược.'
      ] },

    { t: 'h3', x: 'Dòng đầu tiên: <code>/dts-v1/;</code>' },

    { t: 'p', x:
      'Bắt buộc, và phải là thứ đầu tiên trong file (chú thích thì được phép đứng trước). Nó ' +
      'khai báo bạn đang dùng cú pháp DTS phiên bản 1 — phiên bản duy nhất còn dùng ngày nay. ' +
      'Thiếu nó, <code>dtc</code> quay về chế độ tương thích ngược với cú pháp cổ và sẽ báo ' +
      '<code>syntax error</code> ngay dòng 1, vì file của bạn viết theo cú pháp mới. Đây là ' +
      'lỗi số một của người mới, và bạn sẽ gặp nó thật ở phần <i>Lỗi thường gặp</i>.' },

    { t: 'cal', kind: 'tip', title: 'Mẹo nhớ: dấu gạch chéo bao quanh nghĩa là "chỉ thị"',
      x: 'DTS có một nhúm <b>chỉ thị</b> (directive) đều viết theo khuôn ' +
         '<code>/tên/</code>: <code>/dts-v1/</code>, <code>/include/</code>, ' +
         '<code>/plugin/</code>, <code>/delete-node/</code>, <code>/delete-property/</code>, ' +
         '<code>/bits/</code>, <code>/memreserve/</code>. Thấy hai dấu gạch chéo ôm lấy một ' +
         'từ thì đó là lệnh cho <code>dtc</code>, không phải dữ liệu cho kernel. Bảy cái đó ' +
         'là <b>toàn bộ</b> danh sách — không cần học thuộc, chỉ cần nhận ra khuôn.' },

    { t: 'h3', x: 'Node: tên, dấu <code>@</code>, và cặp ngoặc nhọn' },

    { t: 'fig',
      cap: 'Giải phẫu một dòng khai báo node. Ba phần bên trái đều tuỳ chọn hoặc bắt buộc theo ' +
           'hoàn cảnh khác nhau — nhưng dấu chấm phẩy sau ngoặc đóng thì luôn bắt buộc, và đó ' +
           'là lỗi gõ nhầm phổ biến nhất.',
      svg:
        '<svg viewBox="0 0 720 200" width="720" role="img" aria-label="Sơ đồ giải phẫu dòng khai báo node uart0 hai chấm serial a còng 1010c000, chỉ ra label, tên node, unit address và cặp ngoặc nhọn">' +
        '<rect class="d-box" x="18" y="24" width="684" height="46" rx="6"/>' +
        '<text class="d-tm" x="40" y="52">uart0:  serial  @  1010c000  {  …  };</text>' +
        '<line class="d-line" x1="58" y1="70" x2="58" y2="96"/>' +
        '<path class="d-arrow" d="M 58 104 l -5 -10 l 10 0 z"/>' +
        '<rect class="d-box-a" x="18" y="106" width="150" height="62" rx="6"/>' +
        '<text class="d-t" x="30" y="126">label</text>' +
        '<text class="d-ts" x="30" y="143">tuỳ chọn · chỉ có lúc dịch</text>' +
        '<text class="d-ts" x="30" y="159">không vào .dtb</text>' +
        '<line class="d-line" x1="132" y1="70" x2="216" y2="96"/>' +
        '<path class="d-arrow" d="M 224 100 l -11 -3 l 4 -9 z"/>' +
        '<rect class="d-box-p" x="180" y="106" width="160" height="62" rx="6"/>' +
        '<text class="d-t" x="192" y="126">tên node</text>' +
        '<text class="d-ts" x="192" y="143">nói LOẠI thiết bị,</text>' +
        '<text class="d-ts" x="192" y="159">không nói vai trò</text>' +
        '<line class="d-line" x1="228" y1="70" x2="420" y2="96"/>' +
        '<path class="d-arrow" d="M 428 100 l -11 -3 l 4 -9 z"/>' +
        '<rect class="d-box-p" x="352" y="106" width="196" height="62" rx="6"/>' +
        '<text class="d-t" x="364" y="126">unit-address</text>' +
        '<text class="d-ts" x="364" y="143">phải bằng số đầu của reg,</text>' +
        '<text class="d-ts" x="364" y="159">hex, không có tiền tố 0x</text>' +
        '<line class="d-line" x1="300" y1="70" x2="620" y2="96"/>' +
        '<path class="d-arrow" d="M 628 100 l -11 -3 l 4 -9 z"/>' +
        '<rect class="d-box-w" x="560" y="106" width="142" height="62" rx="6"/>' +
        '<text class="d-t" x="572" y="126">thân + dấu ;</text>' +
        '<text class="d-ts" x="572" y="143">quên dấu chấm phẩy</text>' +
        '<text class="d-ts" x="572" y="159">= syntax error</text>' +
        '<text class="d-ts" x="18" y="192">Node gốc là trường hợp đặc biệt: tên của nó chỉ là một dấu gạch chéo — / { … };</text>' +
        '</svg>' },

    { t: 'p', x:
      'Ba điều về tên node mà người mới hay hiểu sai, xếp theo mức độ gây nhầm:' },

    { t: 'list', ordered: true, items: [
      '<b>Tên node mô tả <i>loại</i> thiết bị, không mô tả vai trò.</b> Node cổng nối tiếp ' +
        'của QEMU tên là <code>pl011@9000000</code> chứ không phải <code>console</code>, vì ' +
        'nó <i>là</i> một con PL011; việc nó đóng vai console là chuyện khác, và được nói ở ' +
        'chỗ khác (<code>/chosen/stdout-path</code>, đúng thứ Bài 42 đã cho bạn thấy). Quy ' +
        'ước đặt tên chung nằm trong đặc tả Devicetree: <code>serial</code>, ' +
        '<code>ethernet</code>, <code>flash</code>, <code>i2c</code>, <code>gpio</code>…',
      '<b>Unit-address không phải để cho đẹp — nó là thứ làm tên node trở nên duy nhất.</b> ' +
        'Hai con UART cùng loại nằm cạnh nhau đều muốn tên <code>serial</code>. Device Tree ' +
        'giải quyết bằng cách gắn địa chỉ vào: <code>serial@1010c000</code> và ' +
        '<code>serial@1010d000</code>. Quy tắc bắt buộc: <b>trong cùng một node cha, không ' +
        'hai node con nào được trùng tên đầy đủ.</b>',
      '<b>Unit-address phải khớp với con số đầu tiên trong <code>reg</code>, viết dạng ' +
        'hex không có tiền tố <code>0x</code> và không có số 0 thừa ở đầu.</b> ' +
        '<code>reg = &lt;0x1010c000 …&gt;</code> thì tên phải là <code>@1010c000</code>. ' +
        'Sai lệch không làm hỏng cây, nhưng <code>dtc</code> sẽ cảnh báo, và người đọc sau ' +
        'bạn sẽ mất niềm tin vào cả file.'
    ] },

    { t: 'cal', kind: 'warn', title: 'Node không có địa chỉ thì không được mang <code>@</code>, và ngược lại',
      x: 'Quy tắc này đối xứng hai chiều và <code>dtc</code> kiểm cả hai. Node ' +
         '<code>soc</code> trong ví dụ trên không có <code>reg</code> nên không có ' +
         '<code>@</code> — nó chỉ là một cái hộp gom nhóm. Nếu bạn viết ' +
         '<code>serial@1010c000</code> mà quên <code>reg</code>, bạn nhận ' +
         '<code>Warning (unit_address_vs_reg): node has a unit name, but no reg or ranges ' +
         'property</code>. Nếu bạn viết <code>reg</code> mà quên <code>@</code>, bạn nhận ' +
         'đúng câu đó nhưng đảo vế. Cả hai đều chỉ là <i>cảnh báo</i>, file vẫn dịch ra ' +
         '<code>.dtb</code> — nên rất dễ bỏ qua. Đừng bỏ qua.' },

    { t: 'h3', x: 'Thuộc tính: bốn kiểu giá trị, và kiểu thứ năm là "không có giá trị"' },

    { t: 'table',
      head: ['Kiểu', 'Cách viết', 'Ví dụ thật trong cây <code>virt</code>', 'Nằm trong <code>.dtb</code> ra sao'],
      rows: [
        ['Chuỗi', 'Nháy kép', '<code>device_type = "memory";</code>',
         'Các byte của chuỗi, cộng một byte <code>0x00</code> kết thúc'],
        ['Danh sách chuỗi', 'Nhiều chuỗi, ngăn bằng dấu phẩy',
         '<code>compatible = "arm,pl011", "arm,primecell";</code>',
         'Các chuỗi nối đuôi nhau, mỗi chuỗi vẫn giữ byte NUL riêng'],
        ['Dãy cell', 'Ngoặc nhọn, mỗi số là 32 bit',
         '<code>reg = &lt;0x00 0x9000000 0x00 0x1000&gt;;</code>',
         '4 byte big-endian cho mỗi số — ở đây là 16 byte'],
        ['Dãy byte', 'Ngoặc vuông, mỗi cặp hex là 1 byte',
         '<code>mac-address = [00 11 22 33 44 55];</code>',
         'Đúng những byte đó, không thêm gì'],
        ['Boolean', 'Chỉ có tên, không có dấu <code>=</code>',
         '<code>dma-coherent;</code> · <code>ranges;</code>',
         '<b>Độ dài bằng 0.</b> Có mặt = đúng, vắng mặt = sai. Không có cách viết "sai"']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao boolean không có giá trị <code>false</code>',
      x: 'Vì nó không cần. Kernel hỏi "thuộc tính này có tồn tại không?" chứ không hỏi giá trị ' +
         'của nó — hàm thật sự tên là <code>of_property_read_bool()</code> và nó chỉ đi tìm ' +
         'tên. Muốn tắt, bạn <b>xoá dòng đó đi</b>, không viết ' +
         '<code>dma-coherent = &lt;0&gt;;</code> — cách viết đó tạo ra một thuộc tính dài 4 ' +
         'byte, và <code>of_property_read_bool()</code> vẫn trả về <i>đúng</i> vì tên vẫn có ' +
         'mặt. <b>Đây là cái bẫy tinh vi nhất trong toàn bộ cú pháp DTS</b>, vì file vẫn dịch ' +
         'sạch, không một cảnh báo nào, mà hành vi thì ngược hẳn ý bạn.' },

    { t: 'p', x:
      'Một số điểm nhỏ về cách viết mà bạn sẽ gặp ngay khi mở file thật:' },

    { t: 'list', items: [
      'Số trong <code>&lt;…&gt;</code> viết được cả hệ mười và hệ mười sáu. ' +
        '<code>&lt;24000000&gt;</code> và <code>&lt;0x16e3600&gt;</code> là <b>cùng một ' +
        'thứ</b>; <code>dtc</code> luôn in ra hệ mười sáu khi dịch ngược, nên đừng ngạc nhiên ' +
        'khi con số nhìn lạ hẳn đi.',
      'Muốn một giá trị 64 bit thì dùng <code>/bits/ 64 &lt;0x123456789abcdef0&gt;</code>. ' +
        'Nhưng nó vẫn được lưu thành <b>hai cell 32 bit liên tiếp</b> — và dịch ngược ra ' +
        'đúng như vậy, kiểu 64 bit biến mất không dấu vết. Bạn sẽ thấy tận mắt ở bước 3.',
      'Tên thuộc tính được phép chứa <code>#</code>, <code>-</code>, <code>,</code>, ' +
        '<code>.</code>, <code>+</code>, <code>?</code>. Dấu <code>#</code> ở đầu ' +
        '(<code>#address-cells</code>) là quy ước cho "đây là một con số đếm", không phải chú ' +
        'thích.',
      'Chú thích dùng <code>/* … */</code> hoặc <code>// …</code> đúng như C. Cả hai đều ' +
        '<b>không</b> vào <code>.dtb</code> — dịch ngược ra là mất sạch.'
    ] },

    /* ============================================================
       3. BỐN THUỘC TÍNH GẶP Ở MỌI FILE
       ============================================================ */
    { t: 'h2', x: 'Bốn thuộc tính bạn sẽ gặp trong gần như mọi node' },

    { t: 'p', x:
      'Đặc tả Devicetree định nghĩa vài chục thuộc tính chuẩn, nhưng bốn cái dưới đây chiếm ' +
      'phần lớn những gì bạn đọc hằng ngày. Hiểu kỹ bốn cái này là hiểu được 80% một file ' +
      'DTS lạ.' },

    { t: 'h3', x: '<code>compatible</code> — quan trọng nhất, và là lý do cả cơ chế chạy được' },

    { t: 'p', x:
      'Đây là <b>chìa khoá khớp thiết bị với driver</b>. Kernel duyệt cây, gặp một node, đọc ' +
      'chuỗi <code>compatible</code> của nó, rồi đi tìm driver nào đăng ký nhận đúng chuỗi ' +
      'đó. Bài 42 đã cho bạn con số: <b>58</b> file DTS trong cây 6.18.45 cùng nhắc tới ' +
      '<code>pl011</code>, và tất cả dùng chung <i>một</i> driver. Cơ chế khớp cụ thể ' +
      '(<code>of_match_table</code>, hàm <code>probe()</code>) là nội dung Bài 44; ở đây bạn ' +
      'chỉ cần nắm cú pháp và quy ước đặt tên.' },

    { t: 'code', where: 'file', lang: 'dts', nocopy: true, code:
      'compatible = "arm,pl011", "arm,primecell";\n' +
      '/*            ^ most specific        ^ more generic     */',
      notes: [
        '<b>Thứ tự có ý nghĩa: từ cụ thể nhất tới tổng quát nhất.</b> Kernel thử khớp chuỗi đầu trước; không có driver nào nhận thì lùi sang chuỗi sau.',
        'Đây là cách một bo mạch mới chạy được với kernel cũ: chip mới khai <code>compatible = "hang,chip-moi", "hang,chip-cu"</code>, và kernel chưa biết chip mới vẫn lái được nó bằng driver của chip cũ.'
      ] },

    { t: 'cal', kind: 'tip', title: 'Khuôn của một chuỗi compatible: <code>nhà-sản-xuất,model</code>',
      x: 'Luôn có dấu phẩy, và <b>không có khoảng trắng sau dấu phẩy</b> — nó nằm trong một ' +
         'chuỗi duy nhất, không phải hai chuỗi. <code>"arm,pl011"</code>, ' +
         '<code>"brcm,bcm2837"</code>, <code>"qemu,platform"</code>, ' +
         '<code>"fixed-clock"</code>. Ngoại lệ là vài chuỗi tổng quát rất cũ không có tiền tố ' +
         'nhà sản xuất: <code>"simple-bus"</code>, <code>"fixed-clock"</code>, ' +
         '<code>"memory"</code>. Cách nhớ: <b>thấy dấu phẩy trong chuỗi thì phần trước nó là ' +
         'tên hãng</b>, và bạn tra được hãng đó trong ' +
         '<code>Documentation/devicetree/bindings/vendor-prefixes.yaml</code>.' },

    { t: 'h3', x: '<code>model</code> — tên người đọc, không phải tên máy đọc' },

    { t: 'p', x:
      'Một chuỗi duy nhất, đặt ở node gốc, ghi tên bo mạch cho con người. QEMU ' +
      '<code>virt</code> ghi <code>model = "linux,dummy-virt"</code> — chính là chuỗi bạn đã ' +
      '<code>cat</code> ra ở Bài 42. Kernel <i>không</i> dùng nó để quyết định bất cứ điều ' +
      'gì; nó chỉ in ra log và cho vào <code>/proc/device-tree/model</code>. Đừng nhầm ' +
      '<code>model</code> với <code>compatible</code>: <b>một cái để đọc, một cái để khớp.</b>' },

    { t: 'h3', x: '<code>reg</code> — thiết bị nằm ở đâu trong không gian địa chỉ' },

    { t: 'p', x:
      'Danh sách các vùng địa chỉ mà thiết bị chiếm, mỗi vùng gồm một <b>địa chỉ bắt đầu</b> ' +
      'và một <b>kích thước</b>. Đây là thuộc tính khiến người mới bối rối nhất, vì <i>số ' +
      'lượng cell dùng cho mỗi phần không nằm trong chính nó</i> — nó nằm ở node cha. Đó là ' +
      'nội dung của mục ngay sau đây.' },

    { t: 'p', x:
      'Một node được phép khai <b>nhiều</b> vùng. Node <code>flash@0</code> trong cây ' +
      '<code>virt</code> khai hai vùng liền nhau, mỗi vùng 64 MiB:' },

    { t: 'code', where: 'file', lang: 'dts', nocopy: true, code:
      'flash@0 {\n' +
      '\tbank-width = <0x04>;\n' +
      '\treg = <0x00 0x00       0x00 0x4000000\n' +
      '\t       0x00 0x4000000  0x00 0x4000000>;\n' +
      '\tcompatible = "cfi-flash";\n' +
      '};',
      notes: [
        'Đây là node thật, lấy từ bản dịch ngược DTB của QEMU ở bước 1 — chỉ được xuống dòng lại cho dễ nhìn; bản gốc in tất cả trên một dòng.',
        'Tám cell = <b>hai</b> vùng × (2 cell địa chỉ + 2 cell kích thước). Vùng 1 bắt đầu ở <code>0x0</code>, vùng 2 ở <code>0x4000000</code>, cả hai dài <code>0x4000000</code> = 64 MiB.'
      ] },

    { t: 'h3', x: '<code>status</code> — có dùng thiết bị này hay không' },

    { t: 'table',
      head: ['Giá trị', 'Nghĩa', 'Khi nào dùng'],
      rows: [
        ['<code>"okay"</code>', 'Thiết bị đang hoạt động, kernel tạo device và tìm driver cho nó.',
         'Mặc định. <b>Vắng mặt <code>status</code> cũng đồng nghĩa với <code>okay</code></b> — đây là lý do phần lớn node không viết nó.'],
        ['<code>"disabled"</code>', 'Thiết bị có tồn tại trên chip nhưng không được nối ra ngoài, hoặc chân đã dùng cho việc khác. Kernel bỏ qua node.',
         'Rất phổ biến trong <code>.dtsi</code> của SoC: khai hết mọi ngoại vi ở trạng thái <code>disabled</code>, để từng bo mạch tự bật cái mình dùng.'],
        ['<code>"reserved"</code>', 'Thiết bị có thật và đang chạy, nhưng do một bên khác quản lý (firmware, nhân bảo mật).',
         'Hiếm. Gặp trên hệ có nhiều nhân xử lý dùng chung ngoại vi.'],
        ['<code>"fail"</code>', 'Thiết bị hỏng, đã phát hiện lúc kiểm tra.', 'Rất hiếm, chủ yếu do firmware ghi vào lúc chạy.']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao <code>disabled</code> lại là mặc định trong file .dtsi của SoC',
      x: 'Một con SoC thường có 6 con UART, 4 bus I2C, 3 bộ SPI — nhưng một bo mạch cụ thể chỉ ' +
         'nối ra vài cái. File <code>.dtsi</code> mô tả <b>con chip</b>, nên nó khai đủ cả ' +
         'sáu con UART với địa chỉ thật; file <code>.dts</code> mô tả <b>bo mạch</b>, nên nó ' +
         'bật đúng những cái được hàn ra chân cắm. Nếu làm ngược lại — mặc định ' +
         '<code>okay</code> — kernel sẽ dựng driver cho những ngoại vi không nối đi đâu cả, ' +
         'tốn bộ nhớ, tốn thời gian boot, và đôi khi treo máy vì chạm vào thanh ghi của một ' +
         'khối chưa được cấp xung nhịp. <b>Bạn sẽ dựng đúng mô hình này bằng tay ở bước 4.</b>' },

    /* ============================================================
       4. #ADDRESS-CELLS VÀ #SIZE-CELLS
       ============================================================ */
    { t: 'h2', x: '<code>#address-cells</code> và <code>#size-cells</code>: ai quyết định cách đọc <code>reg</code>' },

    { t: 'p', x:
      'Đây là phần khó nhất của bài, và cũng là phần đáng đầu tư nhất — hiểu xong nó, bạn đọc ' +
      'được <i>bất kỳ</i> thuộc tính <code>reg</code> nào trên đời. Chỉ có một quy tắc, và ' +
      'nó phản trực giác:' },

    { t: 'cal', kind: 'info', title: 'Quy tắc duy nhất, hãy đọc chậm',
      x: 'Thuộc tính <code>reg</code> của một node được đọc theo ' +
         '<code>#address-cells</code> và <code>#size-cells</code> khai trong <b>node cha</b> ' +
         'của nó — <i>không</i> phải trong chính nó. Hai thuộc tính đó khi khai trong node X ' +
         'là để nói về <b>các con của X</b>, chứ không nói về X.' },

    { t: 'p', x:
      'Vì sao lại thế? Vì <code>#address-cells</code> mô tả <b>một không gian địa chỉ</b>, mà ' +
      'không gian địa chỉ là thứ do bus tạo ra, không phải do thiết bị. Node cha ' +
      '<i>chính là</i> cái bus đó. Nói "các con của tao được đánh địa chỉ bằng 2 cell" là ' +
      'việc của bus; con thiết bị chỉ điền địa chỉ vào theo khuôn đã có sẵn. Cách nhớ ngắn ' +
      'gọn: <b>bus phát biểu, thiết bị tuân theo</b>.' },

    { t: 'fig',
      cap: 'Giải mã một reg thật của QEMU virt. Bốn con số không tự nói lên gì; chỉ khi tra ' +
           '#address-cells = 2 và #size-cells = 2 ở node gốc, chúng mới tách ra thành "địa chỉ ' +
           '0x9000000, dài 0x1000". Đổi hai con số ở node cha thì cùng bốn cell đó mang nghĩa ' +
           'hoàn toàn khác.',
      svg:
        '<svg viewBox="0 0 720 252" width="720" role="img" aria-label="Sơ đồ giải mã thuộc tính reg của node pl011: node gốc khai address-cells bằng 2 và size-cells bằng 2, nên bốn cell của reg tách thành hai cell địa chỉ và hai cell kích thước">' +
        '<rect class="d-box-p" x="18" y="22" width="684" height="56" rx="6"/>' +
        '<text class="d-t" x="32" y="42">NODE CHA — node gốc /</text>' +
        '<text class="d-tm" x="32" y="64">#address-cells = &lt;0x02&gt;;   #size-cells = &lt;0x02&gt;;</text>' +
        '<text class="d-ts" x="430" y="64">← hai dòng này nói về CÁC CON, không nói về /</text>' +
        '<line class="d-line" x1="360" y1="78" x2="360" y2="100"/>' +
        '<path class="d-arrow" d="M 360 108 l -5 -10 l 10 0 z"/>' +
        '<rect class="d-box" x="18" y="110" width="684" height="52" rx="6"/>' +
        '<text class="d-t" x="32" y="130">NODE CON — pl011@9000000</text>' +
        '<text class="d-tm" x="32" y="152">reg = &lt;  0x00   0x9000000  |  0x00   0x1000  &gt;;</text>' +
        '<rect class="d-box-a" x="18" y="176" width="330" height="58" rx="6"/>' +
        '<text class="d-t" x="30" y="196">2 cell đầu = ĐỊA CHỈ</text>' +
        '<text class="d-tm" x="30" y="214">0x00_00000000 | 0x09000000</text>' +
        '<text class="d-ts" x="30" y="229">ghép lại thành 64 bit → 0x9000000</text>' +
        '<rect class="d-box-g" x="372" y="176" width="330" height="58" rx="6"/>' +
        '<text class="d-t" x="384" y="196">2 cell sau = KÍCH THƯỚC</text>' +
        '<text class="d-tm" x="384" y="214">0x00_00000000 | 0x00001000</text>' +
        '<text class="d-ts" x="384" y="229">= 4096 byte = một trang nhớ</text>' +
        '<line class="d-line" x1="150" y1="162" x2="150" y2="172"/>' +
        '<line class="d-line" x1="500" y1="162" x2="500" y2="172"/>' +
        '</svg>' },

    { t: 'p', x:
      'Ba ví dụ dưới đây đều lấy từ cùng một file — bản dịch ngược DTB của QEMU ' +
      '<code>virt</code> mà bạn sẽ tự tạo ở bước 1. Chúng cho thấy ba cặp giá trị khác nhau ' +
      'cùng tồn tại trong <i>một</i> cây, và vì sao phải hỏi đúng node cha mỗi lần.' },

    { t: 'table',
      head: ['Node cha', 'Cặp giá trị', 'Node con và <code>reg</code> của nó', 'Đọc ra là'],
      rows: [
        ['<code>/</code> (gốc)', '<code>#address-cells = 2</code><br><code>#size-cells = 2</code>',
         '<code>memory@40000000</code><br><code>reg = &lt;0x00 0x40000000 0x00 0x20000000&gt;</code>',
         'Địa chỉ <code>0x40000000</code>, dài <code>0x20000000</code> = <b>536 870 912 B = 512 MiB</b> — đúng bằng <code>-m 512</code> bạn truyền cho QEMU'],
        ['<code>/cpus</code>', '<code>#address-cells = 1</code><br><code>#size-cells = <b>0</b></code>',
         '<code>cpu@1</code><br><code>reg = &lt;0x01&gt;</code>',
         '<b>Chỉ có địa chỉ, không có kích thước.</b> "Địa chỉ" ở đây là <i>số hiệu CPU</i> — một CPU không chiếm vùng nhớ nào'],
        ['<code>/platform-bus@c000000</code>', '<code>#address-cells = 1</code><br><code>#size-cells = 1</code>',
         '<code>ranges = &lt;0x00 0x00 0xc000000 0x2000000&gt;</code>',
         'Bus con dùng <b>1</b> cell địa chỉ trong khi cha nó dùng <b>2</b> — nên <code>ranges</code> có 1+2+1 = 4 cell']
      ] },

    { t: 'cal', kind: 'info', title: 'Ba dòng trên là ba bài học riêng biệt — đừng lướt qua',
      x: 'Dòng 1 là trường hợp thường gặp nhất trên ARM64: 2/2, vì không gian địa chỉ 64 bit ' +
         'cần hai cell 32 bit mới chứa hết. Dòng 2 chứng minh <code>#size-cells = 0</code> là ' +
         'hợp lệ và <b>rất</b> hữu ích — dùng cho mọi thứ "có số hiệu nhưng không chiếm vùng ' +
         'nhớ": CPU, địa chỉ thiết bị trên bus I2C, chip select trên bus SPI. Dòng 3 là bằng ' +
         'chứng rằng cặp giá trị này <i>thay đổi theo từng tầng</i>: bạn không thể học thuộc ' +
         '"cây này dùng 2/2" rồi áp cho cả file.' },

    { t: 'h3', x: '<code>ranges</code>: cầu nối giữa hai không gian địa chỉ' },

    { t: 'p', x:
      'Khi một bus con dùng hệ địa chỉ riêng, kernel cần biết cách quy đổi sang hệ của cha. ' +
      'Đó là việc của <code>ranges</code>, và nó đọc theo khuôn ' +
      '<b>&lt;địa-chỉ-con, địa-chỉ-cha, kích-thước&gt;</b>. Với ' +
      '<code>platform-bus@c000000</code> ở bảng trên: <code>0x00</code> (địa chỉ con, 1 cell) ' +
      '· <code>0x00 0xc000000</code> (địa chỉ cha, 2 cell) · <code>0x2000000</code> (kích ' +
      'thước, 1 cell). Nghĩa là: <i>"địa chỉ 0 trong hệ của tôi chính là 0xc000000 trong hệ ' +
      'của cha, và vùng quy đổi này dài 32 MiB"</i>.' },

    { t: 'cal', kind: 'tip', title: '<code>ranges;</code> trống nghĩa là "hai hệ trùng khít"',
      x: 'Trong file <code>board.dts</code> ở trên, node <code>soc</code> khai ' +
         '<code>ranges;</code> không có giá trị — một thuộc tính boolean. Nó có nghĩa: ' +
         '<b>địa chỉ của con cũng chính là địa chỉ của cha, không cần quy đổi gì</b>. Đây là ' +
         'trường hợp gần như luôn đúng với bus trên SoC, nên bạn sẽ thấy nó ở khắp nơi. ' +
         'Ngược lại, <b>hoàn toàn không có</b> thuộc tính <code>ranges</code> lại mang nghĩa ' +
         'thứ ba, mạnh hơn: <i>hai không gian không quy đổi được cho nhau</i> — kernel sẽ ' +
         'không ánh xạ thanh ghi của node con vào bộ nhớ. Ba trạng thái, đừng lẫn: ' +
         '<b>có giá trị</b> = quy đổi theo bảng · <b>trống</b> = trùng khít · ' +
         '<b>vắng mặt</b> = không quy đổi được.' },

    /* ============================================================
       5. LABEL VÀ PHANDLE
       ============================================================ */
    { t: 'h2', x: 'Label và phandle: cách hai node trỏ vào nhau' },

    { t: 'p', x:
      'Cây Device Tree không chỉ là danh sách thiết bị — các thiết bị còn <i>liên quan</i> ' +
      'tới nhau. Con UART cần biết nó lấy xung nhịp từ bộ tạo xung nào; đèn LED cần biết nó ' +
      'nối vào chân GPIO nào của bộ điều khiển nào. Trong một cây dữ liệu tĩnh, "trỏ tới" ' +
      'phải được biểu diễn bằng một con số. Con số đó gọi là <b>phandle</b>.' },

    { t: 'p', x:
      'Nhưng viết số bằng tay thì không ai chịu nổi. Nên DTS cho bạn viết <b>label</b> — một ' +
      'cái tên — và để <code>dtc</code> tự sinh số. Đây là toàn bộ cơ chế:' },

    { t: 'code', where: 'file', lang: 'dts', nocopy: true, code:
      '/* YOU WRITE: using a label */\n' +
      'refclk: clock-24mhz {          /* attach the label "refclk" to this node */\n' +
      '\t#clock-cells = <0>;\n' +
      '};\n' +
      '\n' +
      'uart0: serial@1010c000 {\n' +
      '\tclocks = <&refclk>;    /* point at the node labelled refclk */\n' +
      '};',
      notes: ['So sánh với kết quả sau khi dịch, ngay bên dưới — đó là chỗ cơ chế lộ ra.'] },

    { t: 'code', where: 'file', lang: 'dts', nocopy: true, code:
      '/* DTC PRODUCES: the label is gone, a phandle appears */\n' +
      'clock-24mhz {\n' +
      '\t#clock-cells = <0x00>;\n' +
      '\tphandle = <0x01>;      /* dtc added this property itself */\n' +
      '};\n' +
      '\n' +
      'serial@1010c000 {\n' +
      '\tclocks = <0x01>;       /* &refclk became the number 1 */\n' +
      '};',
      notes: [
        'Đây <b>không</b> phải ví dụ minh hoạ — đó là output thật bạn sẽ tự tạo ra ở bước 2.',
        'Chú ý hai điều cùng lúc: nhãn <code>refclk:</code> và <code>uart0:</code> đã biến mất hoàn toàn, và node được trỏ tới <i>mọc thêm</i> một thuộc tính <code>phandle</code> mà bạn chưa từng gõ.'
      ] },

    { t: 'cal', kind: 'warn', title: 'Label không có trong <code>.dtb</code> — và đây là điều gây bất ngờ nhiều nhất',
      x: 'Label thuần tuý là công cụ lúc dịch, giống như tên biến trong C không có trong file ' +
         'thực thi đã strip. Sau khi <code>dtc</code> chạy xong, cái tên ' +
         '<code>refclk</code> <b>không tồn tại ở đâu cả</b> trong file nhị phân. Hệ quả rất ' +
         'thực tế: bạn <i>không</i> tra được node theo label lúc chạy, và một overlay muốn ' +
         'nhắm vào <code>&amp;soc</code> sẽ thất bại — trừ khi cây gốc được dịch với cờ ' +
         '<code>-@</code> để giữ lại bảng tên. Mục overlay ở cuối bài nói kỹ chuyện này, và ' +
         'bước 5 sẽ cho bạn thấy đúng thông báo lỗi khi quên cờ đó.' },

    { t: 'h3', x: 'Một dấu <code>&amp;</code>, hai kết quả hoàn toàn khác nhau' },

    { t: 'p', x:
      'Đây là chi tiết nhỏ mà tài liệu hay bỏ qua, và nó làm người mới bối rối thật sự. Cùng ' +
      'một cú pháp <code>&amp;label</code> cho ra hai loại giá trị khác hẳn, tuỳ vào <b>nó ' +
      'đứng trong hay ngoài cặp ngoặc nhọn</b>:' },

    { t: 'table',
      head: ['Bạn viết', 'Dtc sinh ra', 'Kiểu giá trị', 'Dùng khi'],
      rows: [
        ['<code>clocks = &lt;&amp;refclk&gt;;</code>', '<code>clocks = &lt;0x01&gt;;</code>',
         'Một <b>cell</b> chứa phandle',
         'Trỏ tới một thiết bị khác — chiếm đúng 1 cell nên ghép được với các cell tham số phía sau'],
        ['<code>serial0 = &amp;uart0;</code>', '<code>serial0 = "/soc/serial@1010c000";</code>',
         'Một <b>chuỗi</b> chứa đường dẫn đầy đủ',
         'Khai bí danh trong node <code>aliases</code>, hoặc <code>stdout-path</code> — nơi cần đường dẫn dạng văn bản']
      ] },

    { t: 'cal', kind: 'why', title: 'Vì sao phải có hai dạng, thay vì thống nhất một',
      x: 'Vì hai bên đọc khác nhau. <code>clocks</code> do <i>driver</i> đọc lúc chạy, sau khi ' +
         'kernel đã dựng xong cây trong bộ nhớ và tra phandle thành con trỏ node chỉ mất vài ' +
         'lệnh máy — dùng số là nhanh nhất. Còn <code>aliases</code> và ' +
         '<code>stdout-path</code> do <i>bootloader và mã boot rất sớm</i> đọc, khi cây còn ' +
         'là khối byte phẳng chưa dựng, tra phandle lúc đó rất đắt — nên dùng thẳng đường dẫn ' +
         'văn bản. <b>Mẹo nhớ: trong ngoặc nhọn thì ra số, ngoài ngoặc nhọn thì ra đường ' +
         'dẫn.</b> Bạn sẽ thấy cả hai xảy ra trong cùng một lần dịch ở bước 2.' },

    { t: 'h3', x: 'Vì sao <code>#clock-cells</code>, <code>#gpio-cells</code> lại tồn tại' },

    { t: 'p', x:
      'Trỏ tới một thiết bị thường chưa đủ — còn phải nói <i>cái nào</i> bên trong nó. Bộ ' +
      'điều khiển GPIO có 54 chân; nói "tôi dùng &amp;gpio" là vô nghĩa nếu không kèm số ' +
      'chân. Nên sau phandle còn có thêm <b>tham số</b>, và số lượng tham số do chính node ' +
      'được trỏ tới quy định, qua thuộc tính <code>#…-cells</code>:' },

    { t: 'code', where: 'file', lang: 'dts', nocopy: true, code:
      '/* The target node declares: "to point at me, add 2 parameter cells" */\n' +
      'gpio: gpio@7e200000 {\n' +
      '\tgpio-controller;\n' +
      '\t#gpio-cells = <2>;\n' +
      '};\n' +
      '\n' +
      '/* The consumer must obey: 1 phandle + 2 cells = 3 cells */\n' +
      'led_act {\n' +
      '\tgpios = <&gpio 2 GPIO_ACTIVE_HIGH>;\n' +
      '};',
      notes: [
        'Ý nghĩa của hai cell tham số (ở đây: số hiệu chân, và cờ mức tích cực) do <b>binding</b> của bộ điều khiển GPIO quy định — không phải do cú pháp DTS. Đó là ranh giới giữa Bài 43 và Bài 44.',
        '<code>GPIO_ACTIVE_HIGH</code> là macro C, đến từ <code>#include &lt;dt-bindings/gpio/gpio.h&gt;</code> — chính là mắt xích <code>cpp</code> trong sơ đồ đầu bài. Bản thân <code>dtc</code> không hiểu nó.'
      ] },

    { t: 'cal', kind: 'info', title: 'Đây là lý do <code>#clock-cells = &lt;0&gt;</code> xuất hiện trong ví dụ của bài',
      x: 'Bộ tạo xung <code>refclk</code> chỉ phát ra <i>một</i> tín hiệu duy nhất, nên không ' +
         'cần tham số nào để chọn — nó khai <code>#clock-cells = &lt;0&gt;</code>, và bên dùng ' +
         'viết <code>clocks = &lt;&amp;refclk&gt;</code> gọn lỏn. Một bộ quản lý xung nhịp của ' +
         'SoC thật thì phát ra hàng trăm đường xung, nên nó khai ' +
         '<code>#clock-cells = &lt;1&gt;</code> và bên dùng phải viết ' +
         '<code>clocks = &lt;&amp;ccu 42&gt;</code>. <b>Con số sau dấu <code>#</code> luôn trả ' +
         'lời đúng một câu hỏi: "muốn trỏ vào tao, phải kèm mấy con số nữa?"</b>' },

    /* ============================================================
       6. .DTSI, INCLUDE VÀ GHI ĐÈ
       ============================================================ */
    { t: 'h2', x: 'Chuỗi include: một con chip, nhiều bo mạch' },

    { t: 'p', x:
      'Bài 42 đã đưa ra con số: <b>58</b> file DTS trong cây 6.18.45 nhắc tới ' +
      '<code>pl011</code>. Nếu mỗi file phải tự mô tả lại con UART đó từ đầu thì Device Tree ' +
      'chỉ đơn thuần dời chỗ trùng lặp từ code C sang file text — chẳng giải quyết được gì. ' +
      'Cơ chế giúp nó thật sự khác là <b>include và ghi đè</b>.' },

    { t: 'p', x:
      'Quy ước phân chia rất rõ ràng, và bạn nên ghi nhớ nó vì mọi cây kernel đều theo:' },

    { t: 'table',
      head: ['Đuôi file', 'Mô tả cái gì', 'Ai viết', 'Ví dụ trong cây kernel'],
      rows: [
        ['<code>.dtsi</code>', 'Một <b>con chip</b> (SoC), hoặc một nhóm chức năng dùng chung nhiều bo mạch. Là "thư viện", không dịch trực tiếp.',
         'Nhà sản xuất chip', '<code>bcm2837.dtsi</code>, <code>imx8mm.dtsi</code>'],
        ['<code>.dts</code>', 'Một <b>bo mạch</b> cụ thể. Include các <code>.dtsi</code> cần thiết rồi bổ sung, bật/tắt, chỉnh sửa.',
         'Nhà làm bo mạch', '<code>bcm2837-rpi-3-b.dts</code>'],
        ['<code>.dtso</code>', 'Một <b>mảnh vá</b> áp lên cây đã có sẵn lúc chạy — bo mở rộng, cape, HAT.',
         'Nhà làm bo mở rộng', '<code>rpi-poe-overlay.dtso</code>']
      ] },

    { t: 'fig',
      cap: 'Cùng một soc-common.dtsi, hai bo mạch, hai blob khác nhau. Board A chỉ bật uart0; ' +
           'board B bật cả hai và nâng tần số xung nhịp. Không dòng nào của file .dtsi bị chép ' +
           'lại — mọi khác biệt nằm trong hai file .dts vài chục byte.',
      svg:
        '<svg viewBox="0 0 720 236" width="720" role="img" aria-label="Sơ đồ chuỗi include: một file soc-common.dtsi được hai file board-a.dts và board-b.dts include, mỗi file ghi đè khác nhau và cho ra hai blob khác nhau">' +
        '<rect class="d-box-p" x="240" y="16" width="240" height="54" rx="6"/>' +
        '<text class="d-t" x="256" y="36">Mô tả CON CHIP</text>' +
        '<text class="d-tm" x="256" y="55">soc-common.dtsi · 626 B</text>' +
        '<line class="d-line" x1="300" y1="70" x2="150" y2="96"/>' +
        '<line class="d-line" x1="420" y1="70" x2="570" y2="96"/>' +
        '<path class="d-arrow" d="M 144 100 l 10 -3 l -3 10 z"/>' +
        '<path class="d-arrow" d="M 576 100 l -10 -3 l 3 10 z"/>' +
        '<rect class="d-box" x="18" y="102" width="300" height="70" rx="6"/>' +
        '<text class="d-t" x="32" y="122">Mô tả BO MẠCH A</text>' +
        '<text class="d-tm" x="32" y="140">board-a.dts · 137 B</text>' +
        '<text class="d-ts" x="32" y="160">bật uart0</text>' +
        '<rect class="d-box" x="402" y="102" width="300" height="70" rx="6"/>' +
        '<text class="d-t" x="416" y="122">Mô tả BO MẠCH B</text>' +
        '<text class="d-tm" x="416" y="140">board-b.dts · 240 B</text>' +
        '<text class="d-ts" x="416" y="160">bật uart0 + uart1 · xung 24 → 48 MHz</text>' +
        '<line class="d-line" x1="168" y1="172" x2="168" y2="188"/>' +
        '<line class="d-line" x1="552" y1="172" x2="552" y2="188"/>' +
        '<path class="d-arrow" d="M 168 196 l -5 -10 l 10 0 z"/>' +
        '<path class="d-arrow" d="M 552 196 l -5 -10 l 10 0 z"/>' +
        '<rect class="d-box-g" x="18" y="198" width="300" height="30" rx="6"/>' +
        '<text class="d-tm" x="32" y="218">board-a.dtb · 730 B</text>' +
        '<rect class="d-box-g" x="402" y="198" width="300" height="30" rx="6"/>' +
        '<text class="d-tm" x="416" y="218">board-b.dtb · 756 B</text>' +
        '</svg>' },

    { t: 'h3', x: 'Ghi đè bằng <code>&amp;label { … }</code> ở mức ngoài cùng' },

    { t: 'p', x:
      'Đây là cú pháp bạn sẽ gặp nhiều nhất khi đọc file <code>.dts</code> thật, và nó trông ' +
      'lạ vì <b>không nằm trong node nào cả</b> — nó bắt đầu ngay ở lề trái, sau khối ' +
      '<code>/ { … };</code>:' },

    { t: 'code', where: 'file', name: 'board-b.dts', lang: 'dts', code:
      '/dts-v1/;\n' +
      '/include/ "soc-common.dtsi"\n' +
      '\n' +
      '/ {\n' +
      '\tmodel = "Learning Board B";\n' +
      '\tcompatible = "learn,board-b";\n' +
      '};\n' +
      '\n' +
      '&uart0 {\n' +
      '\tstatus = "okay";\n' +
      '};\n' +
      '\n' +
      '&uart1 {\n' +
      '\tstatus = "okay";\n' +
      '\tcurrent-speed = <115200>;\n' +
      '};\n' +
      '\n' +
      '&refclk {\n' +
      '\tclock-frequency = <48000000>;\n' +
      '};',
      notes: [
        '<code>&amp;uart0 { … }</code> đọc là: <i>"tìm node đang mang nhãn <code>uart0</code> ở bất kỳ đâu trong cây, rồi trộn những dòng sau vào nó"</i>. Bạn không cần biết node đó nằm sâu bao nhiêu tầng, cũng không cần viết lại đường dẫn.',
        'Ba khối ghi đè ở đây làm ba việc khác nhau: <b>đổi giá trị</b> đã có (<code>status</code> từ <code>"disabled"</code> thành <code>"okay"</code>), <b>thêm mới</b> một thuộc tính chưa từng có (<code>current-speed</code>), và <b>sửa</b> một node hoàn toàn khác nhánh (<code>refclk</code> nằm ngoài <code>soc</code>).'
      ] },

    { t: 'cal', kind: 'info', title: 'Luật trộn: sau thắng trước, và chỉ ở mức từng thuộc tính',
      x: '<code>dtc</code> đọc file từ trên xuống. Gặp cùng một thuộc tính lần thứ hai thì ' +
         '<b>giá trị sau đè giá trị trước</b>, và những thuộc tính khác của node <i>không</i> ' +
         'bị ảnh hưởng. Trong ví dụ trên, khối <code>&amp;uart1</code> chỉ nhắc tới ' +
         '<code>status</code> và <code>current-speed</code> — nhưng ' +
         '<code>compatible</code>, <code>reg</code>, <code>clocks</code>, ' +
         '<code>clock-names</code> mà <code>.dtsi</code> đã khai vẫn còn nguyên trong blob. ' +
         '<b>Ghi đè là trộn, không phải thay thế.</b> Đây là lý do một file ' +
         '<code>.dts</code> bo mạch thật chỉ dài vài trăm dòng trong khi cây kết quả có hàng ' +
         'nghìn node.' },

    { t: 'cal', kind: 'warn', title: 'Thứ tự dòng <code>/include/</code> quyết định ai thắng',
      x: 'Nếu bạn đặt <code>/include/ "soc-common.dtsi"</code> xuống <b>cuối</b> file thay vì ' +
         'đầu, mọi ghi đè của bạn sẽ bị chính file <code>.dtsi</code> đè ngược lại, và ' +
         '<code>uart0</code> quay về <code>"disabled"</code> — không có cảnh báo nào cả. ' +
         'Đây là lỗi rất khó nhìn ra vì file vẫn dịch thành công. Quy tắc an toàn: ' +
         '<b><code>/include/</code> luôn nằm ngay sau <code>/dts-v1/;</code></b>, và mọi thứ ' +
         'của bạn nằm sau nó. Còn một hệ quả nữa: <code>&amp;uart0</code> chỉ dùng được ' +
         '<i>sau khi</i> nhãn đó đã được định nghĩa, nên đặt include cuối file thì bạn thậm ' +
         'chí không dịch nổi.' },

    { t: 'h3', x: 'Xoá: <code>/delete-property/</code> và <code>/delete-node/</code>' },

    { t: 'p', x:
      'Ghi đè chỉ sửa và thêm. Muốn <i>bỏ</i> hẳn một thứ mà file <code>.dtsi</code> đã khai, ' +
      'bạn cần hai directive riêng. Trường hợp dùng thật: SoC có sáu con UART nhưng bo mạch ' +
      'của bạn dùng chân đó cho việc khác, và bạn không muốn node rác nằm trong ' +
      '<code>/proc/device-tree</code>.' },

    { t: 'code', where: 'file', name: 'board-c.dts', lang: 'dts', code:
      '/dts-v1/;\n' +
      '/include/ "soc-common.dtsi"\n' +
      '\n' +
      '/ {\n' +
      '\tmodel = "Learning Board C";\n' +
      '\tcompatible = "learn,board-c";\n' +
      '};\n' +
      '\n' +
      '&uart0 {\n' +
      '\tstatus = "okay";\n' +
      '\t/delete-property/ clock-names;\n' +
      '};\n' +
      '\n' +
      '/delete-node/ &uart1;',
      notes: [
        'Hai directive ở hai vị trí khác nhau: <code>/delete-property/</code> nằm <b>bên trong</b> khối ghi đè của node chủ; <code>/delete-node/</code> nằm ở <b>mức ngoài cùng</b> và nhận thẳng <code>&amp;label</code>.',
        'Chú ý dấu chấm phẩy cuối cả hai dòng — chúng là câu lệnh, không phải khối.'
      ] },

    { t: 'cal', kind: 'danger', title: 'Xoá một node vẫn đang bị trỏ tới thì <code>dtc</code> từ chối dịch',
      x: 'Nếu bạn đổi dòng cuối thành <code>/delete-node/ &amp;refclk;</code>, ' +
         '<code>dtc</code> báo <code>ERROR (phandle_references)</code> và dừng — vì hai con ' +
         'UART vẫn còn <code>clocks = &lt;&amp;refclk&gt;</code> trỏ vào node vừa bị xoá, và ' +
         'một phandle treo lơ lửng sẽ khiến kernel truy cập vào node không tồn tại lúc boot. ' +
         'Đây là <i>tính năng</i>, không phải phiền toái: <code>dtc</code> bắt lỗi ngay lúc ' +
         'dịch thay vì để bạn debug một cái treo máy lúc 3 giờ sáng. <b>Bước 6 sẽ cho bạn ' +
         'gặp đúng thông báo lỗi này.</b> Quy tắc: xoá node lá trước, xoá node bị trỏ tới sau ' +
         'khi đã xoá hết bên trỏ.' },

    { t: 'cal', kind: 'tip', title: '<code>/include/</code> của dtc và <code>#include</code> của cpp không phải một',
      x: '<code>/include/ "x.dtsi"</code> là directive của <b>chính dtc</b> — nó chỉ ghép file ' +
         'DTS và không hiểu macro. <code>#include &lt;x.h&gt;</code> là của <b>cpp</b>, phải ' +
         'chạy trước, và mới là cách mở đường cho <code>dt-bindings</code>. Cây kernel dùng ' +
         '<code>#include</code> gần như ở mọi nơi (kể cả để include <code>.dtsi</code>), vì ' +
         'file nào cũng đi qua <code>cpp</code>. Bài này dùng <code>/include/</code> cho các ' +
         'ví dụ tự viết để bạn chạy được <code>dtc</code> một mình, không cần ' +
         '<code>cpp</code> — nhưng bước 6 sẽ cho bạn thấy đường đi đầy đủ với một file ' +
         '<code>.dts</code> thật của kernel.' },

    /* ============================================================
       7. OVERLAY
       ============================================================ */
    { t: 'h2', x: 'Overlay: vá cây sau khi nó đã được dịch xong' },

    { t: 'p', x:
      'Include giải quyết việc dùng lại <i>lúc dịch</i>. Nhưng có những thứ chỉ biết ' +
      '<i>lúc chạy</i>: người dùng vừa cắm thêm một bo mở rộng vào chân cắm 40 pin, hoặc ' +
      'cùng một sản phẩm bán ra ba phiên bản cảm biến khác nhau. Dịch sẵn ba cây hoàn chỉnh ' +
      'thì tốn chỗ và khó bảo trì. <b>Overlay</b> là mảnh vá nhị phân áp lên cây gốc.' },

    { t: 'p', x:
      'Về mặt cú pháp, một overlay trông giống hệt một khối ghi đè bình thường — chỉ khác hai ' +
      'chi tiết ở đầu file:' },

    { t: 'code', where: 'file', name: 'led.dtso', lang: 'dts', code:
      '/dts-v1/;\n' +
      '/plugin/;                 /* the only syntactic difference */\n' +
      '\n' +
      '&soc {\n' +
      '\t#address-cells = <1>;\n' +
      '\t#size-cells = <1>;\n' +
      '\n' +
      '\tled-controller@1020000 {\n' +
      '\t\tcompatible = "learn,led-ctrl";\n' +
      '\t\treg = <0x1020000 0x100>;\n' +
      '\t\tlabel = "status-led";\n' +
      '\t};\n' +
      '};\n' +
      '\n' +
      '&uart1 {\n' +
      '\tstatus = "okay";\n' +
      '};',
      notes: [
        '<code>/plugin/;</code> báo cho <code>dtc</code>: <i>"file này không phải một cây hoàn chỉnh, các nhãn <code>&amp;soc</code> và <code>&amp;uart1</code> nằm ở cây khác — đừng báo lỗi không tìm thấy"</i>.',
        'Phải khai lại <code>#address-cells</code>/<code>#size-cells</code> vì lúc dịch overlay, <code>dtc</code> <b>không đọc được cây gốc</b> nên không biết node <code>soc</code> dùng mấy cell. Thiếu hai dòng này bạn sẽ nhận hai cảnh báo <code>reg_format</code> và <code>avoid_default_addr_size</code> — bước 5 sẽ cho bạn thấy.'
      ] },

    { t: 'h3', x: 'Cái mà <code>/plugin/;</code> thật sự sinh ra' },

    { t: 'p', x:
      'File <code>.dtso</code> mười mấy dòng ở trên, sau khi dịch rồi dịch ngược, biến thành ' +
      'một cấu trúc bạn chưa từng gõ. Đây mới là hình dạng thật của một overlay:' },

    { t: 'code', where: 'out', nocopy: true, lang: 'dts', code:
      '/ {\n' +
      '\n' +
      '\tfragment@0 {\n' +
      '\t\ttarget = <0xffffffff>;\n' +
      '\n' +
      '\t\t__overlay__ {\n' +
      '\t\t\t#address-cells = <0x01>;\n' +
      '\t\t\t#size-cells = <0x01>;\n' +
      '\n' +
      '\t\t\tled-controller@1020000 {\n' +
      '\t\t\t\tcompatible = "learn,led-ctrl";\n' +
      '\t\t\t\treg = <0x1020000 0x100>;\n' +
      '\t\t\t\tlabel = "status-led";\n' +
      '\t\t\t};\n' +
      '\t\t};\n' +
      '\t};\n' +
      '\n' +
      '\tfragment@1 {\n' +
      '\t\ttarget = <0xffffffff>;\n' +
      '\n' +
      '\t\t__overlay__ {\n' +
      '\t\t\tstatus = "okay";\n' +
      '\t\t};\n' +
      '\t};\n' +
      '\n' +
      '\t__fixups__ {\n' +
      '\t\tsoc = "/fragment@0:target:0";\n' +
      '\t\tuart1 = "/fragment@1:target:0";\n' +
      '\t};\n' +
      '};',
      notes: ['Bạn sẽ tự tạo ra đúng output này ở bước 5 — nó không phải sơ đồ minh hoạ.'] },

    { t: 'list', ordered: true, items: [
      '<b>Mỗi khối <code>&amp;label</code> thành một <code>fragment@N</code>.</b> Hai khối trong file nguồn → <code>fragment@0</code> và <code>fragment@1</code>.',
      '<b>Nội dung bạn viết bị bọc trong <code>__overlay__</code>.</b> Đây là phần sẽ được trộn vào node đích.',
      '<b><code>target = &lt;0xffffffff&gt;</code> là chỗ trống chờ điền.</b> Lúc dịch overlay, <code>dtc</code> chưa biết phandle của <code>soc</code> trong cây gốc là số mấy, nên nó điền một giá trị không thể hợp lệ để dễ phát hiện nếu ai đó quên vá.',
      '<b><code>__fixups__</code> là danh sách việc phải làm.</b> Dòng <code>soc = "/fragment@0:target:0"</code> đọc là: <i>"tra nhãn <code>soc</code> trong cây gốc, lấy phandle của nó, ghi vào byte thứ 0 của thuộc tính <code>target</code> thuộc node <code>/fragment@0</code>"</i>.'
    ] },

    { t: 'cal', kind: 'why', title: 'Vì sao cây gốc bắt buộc phải dịch với cờ <code>-@</code>',
      x: 'Nhìn lại <code>__fixups__</code>: bước đầu tiên là <b>tra nhãn <code>soc</code> ' +
         'trong cây gốc</b>. Nhưng bạn đã biết từ mục label ở trên — nhãn không tồn tại trong ' +
         '<code>.dtb</code>. Cờ <code>-@</code> chính là thứ bảo <code>dtc</code> giữ lại ' +
         'chúng, dưới dạng một node đặc biệt <code>__symbols__</code> ánh xạ ' +
         '<i>nhãn → đường dẫn</i>. Không có node đó thì không có gì để tra, và ' +
         '<code>fdtoverlay</code> từ chối: <code>FDT_ERR_BADOFFSET</code>, kèm gợi ý ' +
         '<i>"make sure you have compiled the base blob with \'-@\' option"</i>. Trong đo đạc ' +
         'của bài này, đúng một cờ <code>-@</code> làm blob gốc phình từ <b>730 B</b> lên ' +
         '<b>941 B</b> — 211 byte đó chính là bảng tên.' },

    { t: 'cal', kind: 'warn', title: 'Chỉ node <b>có nhãn</b> mới làm đích của overlay được',
      x: 'Trong lần chạy thử đầu tiên khi soạn bài này, overlay nhắm vào ' +
         '<code>&amp;soc</code> đã thất bại với <code>FDT_ERR_NOTFOUND</code>, dù cây gốc ' +
         '<i>đã</i> dịch với <code>-@</code>. Lý do: file <code>.dtsi</code> viết ' +
         '<code>soc { … }</code> chứ không phải <code>soc: soc { … }</code> — node không có ' +
         'nhãn thì không vào <code>__symbols__</code>, và không vào bảng tên thì overlay ' +
         'không trỏ tới được. Sửa bằng đúng năm ký tự <code>soc: </code>. <b>Đây chính là lý ' +
         'do file <code>.dtsi</code> của các hãng dán nhãn cho gần như mọi node</b>, kể cả ' +
         'những node chính họ không bao giờ tham chiếu tới: họ không biết trước bo mở rộng của ' +
         'người khác sẽ cần vá vào đâu.' },

    { t: 'cal', kind: 'info', title: 'Kernel nào cũng bật <code>-@</code>? Không — nó là một tuỳ chọn cấu hình',
      x: 'Makefile của kernel chỉ thêm <code>-@</code> khi <code>CONFIG_OF_OVERLAY=y</code>. ' +
         'Cấu hình <code>defconfig</code> ARM64 mà bạn dựng ở Bài 40 <b>có</b> bật nó — và ' +
         'bước 6 sẽ chứng minh điều đó bằng cách so <code>sha256sum</code> giữa file ' +
         '<code>.dtb</code> bạn tự dịch và file kernel đã dựng sẵn. Đây cũng là bẫy hay gặp ' +
         'khi bạn dịch tay một <code>.dts</code> của kernel rồi thấy kích thước không khớp: ' +
         'không phải bạn sai, chỉ là thiếu một cờ.' },

    { t: 'p', x:
      'Có ba thời điểm áp overlay, và bài này chỉ làm cái thứ nhất — hai cái sau thuộc phạm ' +
      'vi các bài sau:' },

    { t: 'table',
      head: ['Áp lúc nào', 'Bằng công cụ gì', 'Bài nào'],
      rows: [
        ['<b>Trước khi boot</b>, trộn sẵn thành một blob duy nhất', '<code>fdtoverlay</code> trên máy phát triển',
         '<b>Bài này</b>, bước 5'],
        ['<b>Lúc boot</b>, bootloader trộn rồi mới trao cho kernel', 'Lệnh <code>fdt apply</code> của U-Boot',
         'Bạn đã có nền từ Chặng 06; Bài 45 sẽ nối lại'],
        ['<b>Khi hệ đã chạy</b>, nạp nóng qua sysfs hoặc trình quản lý bo mở rộng', '<code>/sys/kernel/config/device-tree/overlays/</code>',
         'Ngoài phạm vi Chặng 08 — cần <code>CONFIG_OF_CONFIGFS</code>']
      ] },

    /* ============================================================
       THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: đi cả hai chiều của <code>dtc</code>' },

    { t: 'p', x:
      'Sáu bước dưới đây đi từ đọc một cây có sẵn, tới tự viết một cây, tới vá một cây đã ' +
      'dịch, rồi kết thúc bằng một file <code>.dts</code> thật của kernel. Tất cả chạy trong ' +
      'WSL, không boot QEMU lần nào — bài này học <b>cú pháp</b>; việc nạp cây đã sửa vào một ' +
      'máy đang chạy là của Bài 45. Toàn bộ file nằm trong <code>~/bai43</code> và có thể xoá ' +
      'sạch khi học xong.' },

    { t: 'cal', kind: 'info', title: 'Cần gì trước khi bắt đầu',
      x: 'Chỉ hai thứ, cả hai bạn đã có: gói <code>device-tree-compiler</code> (cài từ ' +
         'Bài 42 — kiểm tra bằng <code>dtc --version</code>) và cây kernel đã dựng ở Bài 40 ' +
         'tại <code>~/bai38/linux-6.18.45</code>, dùng ở bước 1 và bước 6. Không cần biên ' +
         'dịch lại gì cả.' },

    { t: 'steps', items: [

      /* ---------------- BƯỚC 1 ---------------- */
      { title: 'Bước 1 — Lấy một cây Device Tree thật và đọc nó',
        blocks: [

        { t: 'p', x:
          'Bài 42 đã lấy cây của QEMU một lần rồi, nhưng khi đó bạn chỉ nhìn nó như một khối ' +
          'nhị phân bí ẩn. Lần này lấy lại, và đọc từng dòng với con mắt đã biết cú pháp. ' +
          'Điểm khác duy nhất so với Bài 42: thêm <code>-append</code>, để cây có luôn ' +
          '<code>/chosen/bootargs</code> — sợi chỉ cuối cùng mà Bài 41 để lại chưa gỡ.' },

        { t: 'code', where: 'wsl', code:
          'mkdir -p ~/bai43 && cd ~/bai43\n' +
          'qemu-system-aarch64 \\\n' +
          '  -machine virt,dumpdtb=virt.dtb \\\n' +
          '  -cpu cortex-a53 -m 512 -smp 2 -nographic \\\n' +
          '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
          '  -append "console=ttyAMA0 loglevel=7"\n' +
          'ls -l virt.dtb' },

        { t: 'cmdx', title: 'Vì sao dòng lệnh QEMU lại có những cờ này',
          cmd: 'qemu-system-aarch64 -machine virt,dumpdtb=virt.dtb -smp 2 -kernel … -append …',
          rows: [
            ['<code>-machine virt,dumpdtb=virt.dtb</code>',
             'Bảo QEMU: dựng cây Device Tree cho máy ảo <code>virt</code>, ghi ra file, rồi <b>thoát ngay</b>.',
             'Kernel không hề chạy — bạn chỉ mượn QEMU làm máy sinh DTB'],
            ['<code>-smp 2</code>',
             'Hai lõi CPU. Cây sẽ có hai node <code>cpu@0</code> và <code>cpu@1</code>.',
             'Bắt buộc cho bước phân tích <code>#size-cells = &lt;0&gt;</code> ở dưới'],
            ['<code>-kernel …/Image</code>',
             'QEMU từ chối <code>-append</code> nếu không có <code>-kernel</code>.',
             'File chỉ được mở để kiểm tra, không được nạp — thoát trước khi boot'],
            ['<code>-append "…"</code>',
             'Chuỗi tham số dòng lệnh kernel. QEMU chép nó vào <code>/chosen/bootargs</code>.',
             'Đây là cách nó vào cây; Bài 41 chỉ mới nói tới nó ở phía kernel']
          ] },

        { t: 'code', where: 'out', nocopy: true, code:
          '-rw-r--r-- 1 shinarus shinarus 1048576 Sep  5 11:44 virt.dtb' },

        { t: 'cal', kind: 'info', title: '1 048 576 byte đúng bằng 1 MiB — và đó không phải kích thước thật',
          x: 'QEMU luôn đệm file <code>dumpdtb</code> lên tròn 1 MiB, để bootloader có chỗ ' +
             'chèn thêm node mà không phải dời cả khối. Cây thật bên trong nhỏ hơn nhiều — ' +
             'phần thừa toàn số 0. Bạn đã gặp đúng con số này ở Bài 42; nó cố định, không ' +
             'phụ thuộc máy bạn.' },

        { t: 'p', x:
          'Bây giờ đi chiều ngược — từ nhị phân về văn bản. Đây là nửa mà Bài 42 chưa làm:' },

        { t: 'code', where: 'wsl', code:
          'dtc -I dtb -O dts -o virt.dts virt.dtb\n' +
          'wc -l virt.dts' },

        { t: 'cmdx', title: 'Bốn cờ của <code>dtc</code>, và tại sao phải khai cả hai chiều',
          cmd: 'dtc -I dtb -O dts -o virt.dts virt.dtb',
          rows: [
            ['<code>-I dtb</code>', '<b>I</b>nput: đầu vào là blob nhị phân.',
             'Sai cờ này thì dtc cố đọc nhị phân như văn bản và báo <code>syntax error</code> ngay dòng 1'],
            ['<code>-O dts</code>', '<b>O</b>utput: đầu ra là văn bản DTS.', 'Đảo <code>-I</code>/<code>-O</code> là được chiều xuôi'],
            ['<code>-o virt.dts</code>', 'Ghi vào file. Dùng <code>-o -</code> để in thẳng ra màn hình.', 'Chữ <code>o</code> thường, khác với <code>-O</code> hoa'],
            ['<code>virt.dtb</code>', 'File nguồn, luôn đứng cuối, không có cờ đi kèm.', '—']
          ] },

        { t: 'code', where: 'out', nocopy: true, code: '407 virt.dts' },

        { t: 'cal', kind: 'info', title: '407 dòng — và con số này phụ thuộc vào cờ QEMU bạn vừa gõ',
          x: 'Với <code>-smp 1</code> và không có <code>-append</code>, cùng lệnh này cho ' +
             '<b>393</b> dòng. Chênh lệch đến từ đúng hai chỗ: node <code>cpu@1</code> xuất ' +
             'hiện thêm (kéo theo một loạt phandle bị đánh số lại), và một dòng ' +
             '<code>bootargs</code> mới trong <code>/chosen</code>. <b>Nếu số của bạn khác ' +
             '407, hãy kiểm tra lại <code>-smp</code> và <code>-append</code> trước khi nghi ' +
             'ngờ điều gì khác.</b>' },

        { t: 'p', x:
          'Mở mười hai dòng đầu. Đây là node gốc, và bạn đã đủ vốn để đọc hết:' },

        { t: 'code', where: 'wsl', code: 'head -12 virt.dts' },

        { t: 'code', where: 'out', nocopy: true, lang: 'dts', code:
          '/dts-v1/;\n' +
          '\n' +
          '/ {\n' +
          '\tinterrupt-parent = <0x8003>;\n' +
          '\tdma-coherent;\n' +
          '\tmodel = "linux,dummy-virt";\n' +
          '\t#size-cells = <0x02>;\n' +
          '\t#address-cells = <0x02>;\n' +
          '\tcompatible = "linux,dummy-virt";\n' +
          '\n' +
          '\tpsci {\n' +
          '\t\tmigrate = <0xc4000005>;' },

        { t: 'list', items: [
          '<code>/dts-v1/;</code> — <code>dtc</code> tự sinh ra dòng này khi in DTS, dù trong blob không có gì tương ứng.',
          '<code>interrupt-parent = &lt;0x8003&gt;</code> — một <b>phandle</b>, và là bằng chứng đầu tiên rằng label đã biến mất: bạn không biết node nào mang số 0x8003 nếu không đi tìm.',
          '<code>dma-coherent;</code> — một thuộc tính <b>boolean</b>, không có dấu <code>=</code>. Sự tồn tại của nó chính là giá trị.',
          '<code>model</code> và <code>compatible</code> trùng chuỗi ở đây chỉ vì <code>virt</code> là máy ảo; trên bo mạch thật hai giá trị này khác hẳn nhau.',
          '<code>#size-cells = &lt;0x02&gt;</code> và <code>#address-cells = &lt;0x02&gt;</code> — hai dòng quyết định cách đọc <code>reg</code> của <b>mọi</b> node con trực tiếp của <code>/</code>.'
        ] },

        { t: 'p', x:
          'Giờ soi ba node cụ thể để đối chiếu với phần lý thuyết. Trước hết là ' +
          '<code>/chosen</code> — node không mô tả phần cứng nào cả:' },

        { t: 'code', where: 'wsl', code: "sed -n '/chosen {/,/};/p' virt.dts" },

        { t: 'code', where: 'out', nocopy: true, lang: 'dts', code:
          '\tchosen {\n' +
          '\t\tbootargs = "console=ttyAMA0 loglevel=7";\n' +
          '\t\tstdout-path = "/pl011@9000000";\n' +
          '\t\trng-seed = <0x68334b9a 0xc4786373 0x42f3a7a2 0x199d25ec 0x9d588747 0x9dfb50a1 0xece5c954 0x321e9ea5>;\n' +
          '\t\tkaslr-seed = <0xd68e7537 0x29416e5d>;\n' +
          '\t};',
          notes: [
            '<b>Hai dòng <code>rng-seed</code> và <code>kaslr-seed</code> sẽ khác trên máy bạn, và khác cả giữa hai lần chạy liên tiếp</b> — QEMU sinh chúng ngẫu nhiên mỗi lần để kernel có nguồn entropy sớm. Bốn con số kia thì cố định.'
          ] },

        { t: 'cal', kind: 'why', title: 'Đây là chỗ hai sợi chỉ của Bài 41 và Bài 42 nối vào nhau',
          x: '<code>bootargs</code> chính là chuỗi bạn vừa truyền qua <code>-append</code>: ' +
             'kernel cmdline <b>không</b> nằm trong <code>Image</code>, nó được rót vào cây ' +
             'rồi kernel đọc ra từ đó. Còn <code>stdout-path = "/pl011@9000000"</code> là ' +
             'câu trả lời cho câu hỏi Bài 42 đặt ra: một bo mạch không có ' +
             '<code>console=</code> vẫn in được log, vì cây đã chỉ thẳng vào node cổng nối ' +
             'tiếp. Chú ý nó là một <b>chuỗi đường dẫn</b>, không phải phandle — đúng như ' +
             'bảng "một dấu <code>&amp;</code>, hai kết quả" ở trên đã nói, vì mã boot rất ' +
             'sớm đọc nó khi cây còn phẳng.' },

        { t: 'p', x:
          'Tiếp theo là node cổng nối tiếp mà <code>stdout-path</code> vừa trỏ tới:' },

        { t: 'code', where: 'wsl', code: "sed -n '/pl011@9000000 {/,/};/p' virt.dts" },

        { t: 'code', where: 'out', nocopy: true, lang: 'dts', code:
          '\tpl011@9000000 {\n' +
          '\t\tclock-names = "uartclk", "apb_pclk";\n' +
          '\t\tclocks = <0x8000 0x8000>;\n' +
          '\t\tinterrupts = <0x00 0x01 0x04>;\n' +
          '\t\treg = <0x00 0x9000000 0x00 0x1000>;\n' +
          '\t\tcompatible = "arm,pl011", "arm,primecell";\n' +
          '\t};' },

        { t: 'cal', kind: 'info', title: 'Đọc bốn cell của <code>reg</code> bằng quy tắc vừa học',
          x: 'Cha của node này là <code>/</code>, và <code>/</code> khai 2/2. Nên bốn cell ' +
             'tách thành <b>địa chỉ</b> <code>0x00 0x9000000</code> → ghép 64 bit = ' +
             '<code>0x9000000</code>, và <b>kích thước</b> <code>0x00 0x1000</code> = ' +
             '<b>4096 byte</b>. Đúng bằng con số <code>0x9000000</code> mà Bài 42 đã bắt bạn ' +
             'gõ vào <code>earlycon=pl011,0x9000000</code> — giờ bạn thấy nó đến từ đâu. ' +
             'Hai giá trị <code>0x8000</code> giống hệt nhau trong <code>clocks</code> là hai ' +
             'phandle trỏ cùng một bộ tạo xung, ứng với hai tên trong ' +
             '<code>clock-names</code>.' },

        { t: 'p', x:
          'Node thứ ba là <code>/cpus</code> — nơi <code>#size-cells</code> bằng <b>0</b>, ' +
          'trường hợp mà phần lý thuyết đã hứa sẽ cho bạn thấy tận mắt:' },

        { t: 'code', where: 'wsl', code:
          "sed -n '/^\\tcpus {/,/^\\t};/p' virt.dts | grep -v '^$'" },

        { t: 'code', where: 'out', nocopy: true, lang: 'dts', code:
          '\tcpus {\n' +
          '\t\t#size-cells = <0x00>;\n' +
          '\t\t#address-cells = <0x01>;\n' +
          '\t\tcpu-map {\n' +
          '\t\t\tsocket0 {\n' +
          '\t\t\t\tcluster0 {\n' +
          '\t\t\t\t\tcore0 {\n' +
          '\t\t\t\t\t\tcpu = <0x8002>;\n' +
          '\t\t\t\t\t};\n' +
          '\t\t\t\t\tcore1 {\n' +
          '\t\t\t\t\t\tcpu = <0x8001>;\n' +
          '\t\t\t\t\t};\n' +
          '\t\t\t\t};\n' +
          '\t\t\t};\n' +
          '\t\t};\n' +
          '\t\tcpu@0 {\n' +
          '\t\t\tphandle = <0x8002>;\n' +
          '\t\t\treg = <0x00>;\n' +
          '\t\t\tenable-method = "psci";\n' +
          '\t\t\tcompatible = "arm,cortex-a53";\n' +
          '\t\t\tdevice_type = "cpu";\n' +
          '\t\t};\n' +
          '\t\tcpu@1 {\n' +
          '\t\t\tphandle = <0x8001>;\n' +
          '\t\t\treg = <0x01>;\n' +
          '\t\t\tenable-method = "psci";\n' +
          '\t\t\tcompatible = "arm,cortex-a53";\n' +
          '\t\t\tdevice_type = "cpu";\n' +
          '\t\t};\n' +
          '\t};',
          notes: ['Các dòng trống đã bị <code>grep -v</code> lược đi cho gọn; bản gốc có một dòng trống trước mỗi node con.'] },

        { t: 'cal', kind: 'info', title: 'Ba điều node này chứng minh cùng lúc',
          x: '<b>Một:</b> <code>reg = &lt;0x00&gt;</code> và <code>reg = &lt;0x01&gt;</code> ' +
             'chỉ có <i>một</i> cell, vì cha khai <code>#address-cells = 1</code> và ' +
             '<code>#size-cells = 0</code> — CPU có số hiệu chứ không chiếm vùng nhớ. ' +
             '<b>Hai:</b> tên node <code>cpu@0</code>/<code>cpu@1</code> khớp đúng với giá ' +
             'trị <code>reg</code> của chính nó, đúng quy tắc unit-address. ' +
             '<b>Ba:</b> <code>core0</code> và <code>core1</code> trong ' +
             '<code>cpu-map</code> không lặp lại thông tin CPU mà chỉ <i>trỏ</i> tới hai node ' +
             'kia bằng phandle <code>0x8002</code> và <code>0x8001</code> — cùng con số xuất ' +
             'hiện ở thuộc tính <code>phandle</code> bên dưới. Bạn vừa đọc được một liên kết ' +
             'chéo trong cây mà không cần công cụ nào.' },

        { t: 'p', x:
          'Cuối cùng, thay vì đọc bằng mắt, hãy hỏi máy. <code>fdtget</code> tra thẳng một ' +
          'thuộc tính trong file <code>.dtb</code> mà không cần dịch ngược — công cụ này bạn ' +
          'sẽ dùng rất nhiều về sau khi làm script:' },

        { t: 'code', where: 'wsl', code:
          "fdtget virt.dtb / '#address-cells'\n" +
          "fdtget virt.dtb /cpus '#size-cells'\n" +
          'fdtget -t s virt.dtb /chosen bootargs\n' +
          'fdtget -t x virt.dtb /pl011@9000000 reg\n' +
          'fdtget -l virt.dtb /cpus' },

        { t: 'cmdx', title: 'Cách gọi <code>fdtget</code>',
          cmd: 'fdtget [-t KIỂU] file.dtb <node> <thuộc-tính>…',
          rows: [
            ['<code>-t s</code>', 'Ép hiểu giá trị là chuỗi.', 'Nhớ lại: DTB không lưu kiểu, nên <b>bạn</b> phải nói'],
            ['<code>-t x</code>', 'In dưới dạng số hex, cách nhau bằng khoảng trắng.', 'Hợp cho <code>reg</code>, phandle, cờ'],
            ['<code>-l</code>', 'Liệt kê các node <i>con</i> của node đã cho.', 'Duyệt cây mà không cần dịch ngược'],
            ['<code>-p</code>', 'Liệt kê tên các <i>thuộc tính</i> của node đã cho.', 'Cặp đôi với <code>-l</code>'],
            ['<code>&lt;node&gt; &lt;thuộc-tính&gt;</code>', 'Luôn đi theo <b>cặp</b>, và có thể lặp nhiều cặp.',
             'Đưa một node kèm hai thuộc tính sẽ bị từ chối: <code>must have an even number of arguments</code>']
          ] },

        { t: 'code', where: 'out', nocopy: true, code:
          '2\n' +
          '0\n' +
          'console=ttyAMA0 loglevel=7\n' +
          '0 9000000 0 1000\n' +
          'cpu-map\n' +
          'cpu@0\n' +
          'cpu@1' },

        { t: 'cal', kind: 'tip', title: 'Năm dòng lệnh, năm câu trả lời — và không dòng nào cần dịch ngược',
          x: 'Hai số đầu (<code>2</code> và <code>0</code>) xác nhận lại chính hai cặp giá ' +
             'trị bạn vừa đọc bằng mắt: gốc dùng 2 cell địa chỉ, <code>/cpus</code> dùng 0 ' +
             'cell kích thước. Dòng <code>0 9000000 0 1000</code> là đúng bốn cell của ' +
             '<code>reg</code>, in thô — <code>fdtget</code> không ghép hộ bạn thành 64 bit, ' +
             'nó chỉ đưa số. <b>Đây là cách kiểm tra nhanh nhất khi bạn nghi một cây có sai ' +
             'sót</b>, và cũng là cách một script CI kiểm tra hàng trăm file <code>.dtb</code> ' +
             'mà không cần đọc DTS.' }
      ] },

      /* ---------------- BƯỚC 2 ---------------- */
      { title: 'Bước 2 — Viết một cây từ đầu, rồi xem dtc làm gì với nó',
        blocks: [

        { t: 'p', x:
          'Bây giờ đổi vai: bạn viết DTS, <code>dtc</code> dịch. File dưới đây chính là ' +
          '<code>board.dts</code> đã xuất hiện ở phần lý thuyết — nó cố tình gói đủ mọi thứ ' +
          'bài này dạy: node lồng nhau, unit-address, cả bốn thuộc tính chuẩn, label, ' +
          'phandle, và một node <code>aliases</code> để bẫy sự khác nhau giữa hai dạng của ' +
          'dấu <code>&amp;</code>.' },

        { t: 'code', where: 'wsl', code:
          'cd ~/bai43\n' +
          "cat > board.dts <<'EOF'\n" +
          '/dts-v1/;\n' +
          '\n' +
          '/ {\n' +
          '\tmodel = "Learning Board v1";\n' +
          '\tcompatible = "learn,board-v1";\n' +
          '\t#address-cells = <1>;\n' +
          '\t#size-cells = <1>;\n' +
          '\n' +
          '\tchosen {\n' +
          '\t\tbootargs = "console=ttyAMA0,115200 root=/dev/ram0";\n' +
          '\t};\n' +
          '\n' +
          '\taliases {\n' +
          '\t\tserial0 = &uart0;\n' +
          '\t};\n' +
          '\n' +
          '\trefclk: clock-24mhz {\n' +
          '\t\tcompatible = "fixed-clock";\n' +
          '\t\t#clock-cells = <0>;\n' +
          '\t\tclock-frequency = <24000000>;\n' +
          '\t};\n' +
          '\n' +
          '\tsoc {\n' +
          '\t\tcompatible = "simple-bus";\n' +
          '\t\t#address-cells = <1>;\n' +
          '\t\t#size-cells = <1>;\n' +
          '\t\tranges;\n' +
          '\n' +
          '\t\tuart0: serial@1010c000 {\n' +
          '\t\t\tcompatible = "arm,pl011", "arm,primecell";\n' +
          '\t\t\treg = <0x1010c000 0x1000>;\n' +
          '\t\t\tclocks = <&refclk>;\n' +
          '\t\t\tclock-names = "uartclk";\n' +
          '\t\t\tstatus = "okay";\n' +
          '\t\t};\n' +
          '\n' +
          '\t\tuart1: serial@1010d000 {\n' +
          '\t\t\tcompatible = "arm,pl011", "arm,primecell";\n' +
          '\t\t\treg = <0x1010d000 0x1000>;\n' +
          '\t\t\tclocks = <&refclk>;\n' +
          '\t\t\tclock-names = "uartclk";\n' +
          '\t\t\tstatus = "disabled";\n' +
          '\t\t};\n' +
          '\t};\n' +
          '};\n' +
          'EOF',
          notes: [
            'Dùng <code>cat > … &lt;&lt;\'EOF\'</code> với <code>EOF</code> trong nháy đơn để shell không diễn giải <code>$</code> hay <code>&amp;</code> — bạn đã dùng khuôn này từ Chặng 01.',
            'Nếu bạn gõ tay trong trình soạn thảo, hãy dùng <b>tab</b> để thụt dòng cho khớp quy ước kernel. Cú pháp không bắt buộc, nhưng khi so sánh với output của <code>dtc</code> sẽ dễ nhìn hơn nhiều.'
          ] },

        { t: 'p', x: 'Dịch nó, rồi so kích thước hai file:' },

        { t: 'code', where: 'wsl', code:
          'dtc -I dts -O dtb -o board.dtb board.dts\n' +
          'ls -l board.dts board.dtb' },

        { t: 'code', where: 'out', nocopy: true, code:
          '-rw-r--r-- 1 shinarus shinarus 867 Sep  5 11:44 board.dtb\n' +
          '-rw-r--r-- 1 shinarus shinarus 800 Sep  5 11:44 board.dts' },

        { t: 'cal', kind: 'info', title: 'Không có cảnh báo nào — và blob <i>to hơn</i> nguồn',
          x: '<code>dtc</code> im lặng nghĩa là mọi kiểm tra đều qua: tên node khớp ' +
             '<code>reg</code>, không có phandle treo, không có unit-address thiếu ' +
             '<code>reg</code>. Còn chuyện <b>867 &gt; 800</b> thoạt nghe vô lý — dịch mà lại ' +
             'phình ra? Vì DTS dùng tab và xuống dòng để cho <i>người</i> đọc, trong khi DTB ' +
             'phải trả giá cho <i>máy</i> đọc: mỗi thuộc tính mang thêm 12 byte tiêu đề (thẻ ' +
             'bắt đầu, độ dài, con trỏ tên), mỗi số nguyên luôn chiếm đủ 4 byte kể cả khi giá ' +
             'trị là <code>0</code>. Với cây nhỏ, phần chi phí đó lớn hơn phần khoảng trắng ' +
             'tiết kiệm được. Với cây thật thì ngược lại — bạn sẽ thấy ở bước 6.' },

        { t: 'p', x:
          'Giờ là phần đáng giá nhất của bước này: dịch ngược ngay file vừa tạo, và so từng ' +
          'dòng với thứ bạn đã gõ.' },

        { t: 'code', where: 'wsl', code: 'dtc -I dtb -O dts -o - board.dtb' },

        { t: 'code', where: 'out', nocopy: true, lang: 'dts', code:
          '/dts-v1/;\n' +
          '\n' +
          '/ {\n' +
          '\tmodel = "Learning Board v1";\n' +
          '\tcompatible = "learn,board-v1";\n' +
          '\t#address-cells = <0x01>;\n' +
          '\t#size-cells = <0x01>;\n' +
          '\n' +
          '\tchosen {\n' +
          '\t\tbootargs = "console=ttyAMA0,115200 root=/dev/ram0";\n' +
          '\t};\n' +
          '\n' +
          '\taliases {\n' +
          '\t\tserial0 = "/soc/serial@1010c000";\n' +
          '\t};\n' +
          '\n' +
          '\tclock-24mhz {\n' +
          '\t\tcompatible = "fixed-clock";\n' +
          '\t\t#clock-cells = <0x00>;\n' +
          '\t\tclock-frequency = <0x16e3600>;\n' +
          '\t\tphandle = <0x01>;\n' +
          '\t};\n' +
          '\n' +
          '\tsoc {\n' +
          '\t\tcompatible = "simple-bus";\n' +
          '\t\t#address-cells = <0x01>;\n' +
          '\t\t#size-cells = <0x01>;\n' +
          '\t\tranges;\n' +
          '\n' +
          '\t\tserial@1010c000 {\n' +
          '\t\t\tcompatible = "arm,pl011", "arm,primecell";\n' +
          '\t\t\treg = <0x1010c000 0x1000>;\n' +
          '\t\t\tclocks = <0x01>;\n' +
          '\t\t\tclock-names = "uartclk";\n' +
          '\t\t\tstatus = "okay";\n' +
          '\t\t};\n' +
          '\n' +
          '\t\tserial@1010d000 {\n' +
          '\t\t\tcompatible = "arm,pl011", "arm,primecell";\n' +
          '\t\t\treg = <0x1010d000 0x1000>;\n' +
          '\t\t\tclocks = <0x01>;\n' +
          '\t\t\tclock-names = "uartclk";\n' +
          '\t\t\tstatus = "disabled";\n' +
          '\t\t};\n' +
          '\t};\n' +
          '};' },

        { t: 'table',
          head: ['Bạn đã gõ', 'Dtc trả lại', 'Chuyện gì đã xảy ra'],
          rows: [
            ['<code>refclk: clock-24mhz {</code>', '<code>clock-24mhz {</code>',
             '<b>Label bốc hơi.</b> Không có chỗ nào trong blob lưu chữ <code>refclk</code>.'],
            ['<i>(không gõ gì)</i>', '<code>phandle = &lt;0x01&gt;;</code>',
             '<b>Dtc tự thêm.</b> Node bị trỏ tới cần một số định danh, và <code>dtc</code> phát số 1 cho nó.'],
            ['<code>clocks = &lt;&amp;refclk&gt;;</code>', '<code>clocks = &lt;0x01&gt;;</code>',
             'Trong ngoặc nhọn → <b>thành số</b>, đúng con số vừa được phát.'],
            ['<code>serial0 = &amp;uart0;</code>', '<code>serial0 = "/soc/serial@1010c000";</code>',
             'Ngoài ngoặc nhọn → <b>thành chuỗi đường dẫn</b>. Cùng cú pháp, kết quả khác hẳn.'],
            ['<code>clock-frequency = &lt;24000000&gt;;</code>', '<code>clock-frequency = &lt;0x16e3600&gt;;</code>',
             'Chỉ đổi cách in. <code>dtc</code> luôn in số ở dạng hex khi dịch ngược; giá trị không đổi.'],
            ['<code>&lt;1&gt;</code>', '<code>&lt;0x01&gt;</code>', 'Cũng chỉ là cách in. Đừng nhầm là dữ liệu bị sửa.']
          ] },

        { t: 'cal', kind: 'why', title: 'Vì sao đây là bài tập quan trọng nhất của cả bài',
          x: 'Bạn vừa nhìn thấy <b>ranh giới giữa cái dành cho người và cái dành cho máy</b>. ' +
             'Mọi thứ tiện cho người viết — nhãn, số thập phân, cách xuống dòng — chỉ tồn tại ' +
             'ở phía trái. Blob chỉ giữ đúng những gì kernel cần lúc chạy. Khi sau này bạn ' +
             'debug một bo mạch thật và chỉ có file <code>.dtb</code> trong tay, đây chính là ' +
             'lý do bản dịch ngược trông xa lạ so với file <code>.dts</code> của nhà sản ' +
             'xuất: <b>không phải bạn lấy nhầm file</b>.' }
      ] },

      /* ---------------- BƯỚC 3 ---------------- */
      { title: 'Bước 3 — Bốn kiểu giá trị, và vì sao DTB quên mất kiểu',
        blocks: [

        { t: 'p', x:
          'Phần lý thuyết đã khẳng định DTB chỉ lưu <i>tên</i> và <i>độ dài byte</i>, không ' +
          'lưu kiểu. Bước này chứng minh điều đó bằng cách viết một file chứa đủ mọi kiểu, ' +
          'dịch xuôi rồi dịch ngược, và xem cái gì sống sót.' },

        { t: 'code', where: 'wsl', code:
          'mkdir -p ~/bai43/types && cd ~/bai43/types\n' +
          "cat > types.dts <<'EOF'\n" +
          '/dts-v1/;\n' +
          '\n' +
          '/ {\n' +
          '\ta-string = "hello";\n' +
          '\ta-string-list = "first", "second";\n' +
          '\ta-cell-array = <0x01 0x02 0x03>;\n' +
          '\ta-byte-array = [de ad be ef];\n' +
          '\ta-64bit = /bits/ 64 <0x123456789abcdef0>;\n' +
          '\ta-boolean;\n' +
          '\tan-empty-string = "";\n' +
          '\ta-mixed = "abc", <0x10>, [ff];\n' +
          '};\n' +
          'EOF\n' +
          'dtc -I dts -O dtb -o types.dtb types.dts\n' +
          'dtc -I dtb -O dts -o - types.dtb' },

        { t: 'code', where: 'out', nocopy: true, lang: 'dts', code:
          '/dts-v1/;\n' +
          '\n' +
          '/ {\n' +
          '\ta-string = "hello";\n' +
          '\ta-string-list = "first", "second";\n' +
          '\ta-cell-array = <0x01 0x02 0x03>;\n' +
          '\ta-byte-array = <0xdeadbeef>;\n' +
          '\ta-64bit = <0x12345678 0x9abcdef0>;\n' +
          '\ta-boolean;\n' +
          '\tan-empty-string = [00];\n' +
          '\ta-mixed = [61 62 63 00 00 00 00 10 ff];\n' +
          '};' },

        { t: 'table',
          head: ['Thuộc tính', 'Giữ nguyên?', 'Vì sao'],
          rows: [
            ['<code>a-string</code>, <code>a-string-list</code>', '<b>Có</b>',
             '<code>dtc</code> đoán là chuỗi khi mọi byte đều in được và byte cuối là <code>\\0</code>. Đoán đúng — nhưng vẫn chỉ là đoán.'],
            ['<code>a-cell-array</code>', '<b>Có</b>', 'Độ dài chia hết cho 4 và không giống chuỗi → đoán là mảng cell. Đoán đúng.'],
            ['<code>a-byte-array</code>', '<b>Không</b> — <code>[de ad be ef]</code> thành <code>&lt;0xdeadbeef&gt;</code>',
             'Bốn byte, không in được → <code>dtc</code> chọn mảng cell. <b>Dữ liệu y hệt, cách hiểu khác.</b>'],
            ['<code>a-64bit</code>', '<b>Không</b> — thành hai cell 32 bit',
             '<code>/bits/ 64</code> chỉ là chỉ thị lúc <i>ghi</i>; blob không có chỗ nào ghi "đây là số 64 bit". Driver phải biết trước mà ghép.'],
            ['<code>a-boolean</code>', '<b>Có</b>', 'Độ dài 0 byte là trường hợp duy nhất không thể nhầm lẫn với gì khác.'],
            ['<code>an-empty-string</code>', '<b>Không</b> — <code>""</code> thành <code>[00]</code>',
             'Chuỗi rỗng vẫn có ký tự kết thúc, nên trong blob nó là <b>một byte 0</b>, không phải rỗng. Khác hẳn boolean.'],
            ['<code>a-mixed</code>', '<b>Không</b> — thành một mảng byte 9 phần tử',
             'Ghép chuỗi + cell + byte thì không còn khuôn nào nhận ra được. <code>61 62 63</code> là mã ASCII của <code>abc</code>, rồi <code>00</code> kết chuỗi, rồi 4 byte của <code>0x10</code>, rồi <code>ff</code>.']
          ] },

        { t: 'cal', kind: 'warn', title: 'Bốn trong tám dòng đổi hình dạng — hãy nhớ con số này',
          x: 'Chỉ một nửa số thuộc tính quay về đúng như lúc viết. <b>Bản dịch ngược không ' +
             'phải bản gốc</b> — nó là <i>phỏng đoán tốt nhất</i> của <code>dtc</code> dựa ' +
             'trên độ dài và nội dung byte. Hệ quả rất thực tế: đừng bao giờ dịch ngược một ' +
             '<code>.dtb</code>, sửa vài dòng, rồi dịch lại và coi đó là bản vá của file ' +
             'nguồn — bạn có thể vừa âm thầm đổi một mảng byte thành mảng cell. Muốn sửa cây ' +
             'lâu dài thì sửa file <code>.dts</code> gốc; muốn vá nhanh một blob thì dùng ' +
             '<code>fdtput</code> hoặc overlay.' },

        { t: 'p', x:
          'Nhìn thẳng vào phần tiêu đề của blob để thấy nó thật sự lưu gì. ' +
          '<code>fdtdump</code> in cả tiêu đề lẫn nội dung:' },

        { t: 'code', where: 'wsl', code: 'fdtdump types.dtb | head -12' },

        { t: 'code', where: 'out', nocopy: true, code:
          '/dts-v1/;\n' +
          '// magic:\t\t0xd00dfeed\n' +
          '// totalsize:\t\t0x143 (323)\n' +
          '// off_dt_struct:\t0x38\n' +
          '// off_dt_strings:\t0xe8\n' +
          '// off_mem_rsvmap:\t0x28\n' +
          '// version:\t\t17\n' +
          '// last_comp_version:\t16\n' +
          '// boot_cpuid_phys:\t0x0\n' +
          '// size_dt_strings:\t0x5b\n' +
          '// size_dt_struct:\t0xb0' },

        { t: 'cal', kind: 'info', title: 'Không có một trường nào tên là "type" — đó chính là bằng chứng',
          x: 'Tiêu đề chỉ có bốn nhóm thông tin: chữ ký <code>0xd00dfeed</code> (chuỗi ' +
             '<i>dood-feed</i>, để nhận ra đây là FDT), tổng kích thước, và vị trí + độ dài ' +
             'của <b>hai vùng</b> — vùng cấu trúc (<code>dt_struct</code>, 0xb0 = 176 byte) ' +
             'chứa cây node, và vùng chuỗi (<code>dt_strings</code>, 0x5b = 91 byte) chứa ' +
             '<i>tên</i> các thuộc tính, gộp lại một lần để không lặp. Kiểu dữ liệu không ' +
             'xuất hiện ở đâu cả, và đó là lý do bảng phía trên có bốn dòng "Không". ' +
             '<code>version: 17</code> là phiên bản định dạng FDT hiện hành — mọi ' +
             '<code>.dtb</code> bạn gặp ngày nay đều là 17.' }
      ] },

      /* ---------------- BƯỚC 4 ---------------- */
      { title: 'Bước 4 — Chuỗi include: một con chip, ba bo mạch',
        blocks: [

        { t: 'p', x:
          'Bước này dựng đúng mô hình mà mọi cây kernel dùng: một file <code>.dtsi</code> mô ' +
          'tả con chip với mọi ngoại vi ở trạng thái <code>disabled</code>, rồi ba file ' +
          '<code>.dts</code> bo mạch bật, chỉnh và xoá theo nhu cầu riêng. Bắt đầu bằng file ' +
          'thư viện:' },

        { t: 'code', where: 'wsl', code:
          'mkdir -p ~/bai43/inc && cd ~/bai43/inc\n' +
          "cat > soc-common.dtsi <<'EOF'\n" +
          '/ {\n' +
          '\t#address-cells = <1>;\n' +
          '\t#size-cells = <1>;\n' +
          '\n' +
          '\trefclk: clock-24mhz {\n' +
          '\t\tcompatible = "fixed-clock";\n' +
          '\t\t#clock-cells = <0>;\n' +
          '\t\tclock-frequency = <24000000>;\n' +
          '\t};\n' +
          '\n' +
          '\tsoc {\n' +
          '\t\tcompatible = "simple-bus";\n' +
          '\t\t#address-cells = <1>;\n' +
          '\t\t#size-cells = <1>;\n' +
          '\t\tranges;\n' +
          '\n' +
          '\t\tuart0: serial@1010c000 {\n' +
          '\t\t\tcompatible = "arm,pl011", "arm,primecell";\n' +
          '\t\t\treg = <0x1010c000 0x1000>;\n' +
          '\t\t\tclocks = <&refclk>;\n' +
          '\t\t\tclock-names = "uartclk";\n' +
          '\t\t\tstatus = "disabled";\n' +
          '\t\t};\n' +
          '\n' +
          '\t\tuart1: serial@1010d000 {\n' +
          '\t\t\tcompatible = "arm,pl011", "arm,primecell";\n' +
          '\t\t\treg = <0x1010d000 0x1000>;\n' +
          '\t\t\tclocks = <&refclk>;\n' +
          '\t\t\tclock-names = "uartclk";\n' +
          '\t\t\tstatus = "disabled";\n' +
          '\t\t};\n' +
          '\t};\n' +
          '};\n' +
          'EOF',
          notes: [
            '<b>Không có <code>/dts-v1/;</code> ở đầu.</b> File <code>.dtsi</code> không bao giờ đứng một mình, nên dòng khai phiên bản là việc của file <code>.dts</code> include nó. Thêm vào đây sẽ thành hai dòng <code>/dts-v1/;</code> và <code>dtc</code> báo lỗi.',
            'Cả hai con UART đều <code>disabled</code> — đúng quy ước "file .dtsi mô tả con chip, mặc định tắt", như phần lý thuyết đã giải thích.'
          ] },

        { t: 'p', x:
          'Bo mạch A đơn giản nhất: đặt tên, và bật đúng một con UART.' },

        { t: 'code', where: 'wsl', code:
          "cat > board-a.dts <<'EOF'\n" +
          '/dts-v1/;\n' +
          '/include/ "soc-common.dtsi"\n' +
          '\n' +
          '/ {\n' +
          '\tmodel = "Learning Board A";\n' +
          '\tcompatible = "learn,board-a";\n' +
          '};\n' +
          '\n' +
          '&uart0 {\n' +
          '\tstatus = "okay";\n' +
          '};\n' +
          'EOF' },

        { t: 'p', x:
          'Bo mạch B làm nhiều hơn: bật cả hai UART, đặt tốc độ cho con thứ hai, và thay ' +
          'thạch anh 24 MHz bằng loại 48 MHz — tức là sửa một node nằm ngoài nhánh ' +
          '<code>soc</code>.' },

        { t: 'code', where: 'wsl', code:
          "cat > board-b.dts <<'EOF'\n" +
          '/dts-v1/;\n' +
          '/include/ "soc-common.dtsi"\n' +
          '\n' +
          '/ {\n' +
          '\tmodel = "Learning Board B";\n' +
          '\tcompatible = "learn,board-b";\n' +
          '};\n' +
          '\n' +
          '&uart0 {\n' +
          '\tstatus = "okay";\n' +
          '};\n' +
          '\n' +
          '&uart1 {\n' +
          '\tstatus = "okay";\n' +
          '\tcurrent-speed = <115200>;\n' +
          '};\n' +
          '\n' +
          '&refclk {\n' +
          '\tclock-frequency = <48000000>;\n' +
          '};\n' +
          'EOF' },

        { t: 'p', x:
          'Bo mạch C dùng chân của UART thứ hai cho việc khác, nên nó <i>xoá</i> hẳn node đó, ' +
          'và bỏ luôn một thuộc tính thừa của UART thứ nhất:' },

        { t: 'code', where: 'wsl', code:
          "cat > board-c.dts <<'EOF'\n" +
          '/dts-v1/;\n' +
          '/include/ "soc-common.dtsi"\n' +
          '\n' +
          '/ {\n' +
          '\tmodel = "Learning Board C";\n' +
          '\tcompatible = "learn,board-c";\n' +
          '};\n' +
          '\n' +
          '&uart0 {\n' +
          '\tstatus = "okay";\n' +
          '\t/delete-property/ clock-names;\n' +
          '};\n' +
          '\n' +
          '/delete-node/ &uart1;\n' +
          'EOF' },

        { t: 'p', x: 'Dịch cả ba, rồi so kích thước với file nguồn:' },

        { t: 'code', where: 'wsl', code:
          'dtc -I dts -O dtb -o board-a.dtb board-a.dts\n' +
          'dtc -I dts -O dtb -o board-b.dtb board-b.dts\n' +
          'dtc -I dts -O dtb -o board-c.dtb board-c.dts\n' +
          'ls -l soc-common.dtsi board-?.dts board-?.dtb' },

        { t: 'code', where: 'out', nocopy: true, code:
          '-rw-r--r-- 1 shinarus shinarus 730 Sep  5 11:44 board-a.dtb\n' +
          '-rw-r--r-- 1 shinarus shinarus 137 Sep  5 11:44 board-a.dts\n' +
          '-rw-r--r-- 1 shinarus shinarus 756 Sep  5 11:44 board-b.dtb\n' +
          '-rw-r--r-- 1 shinarus shinarus 240 Sep  5 11:44 board-b.dts\n' +
          '-rw-r--r-- 1 shinarus shinarus 558 Sep  5 11:44 board-c.dtb\n' +
          '-rw-r--r-- 1 shinarus shinarus 192 Sep  5 11:44 board-c.dts\n' +
          '-rw-r--r-- 1 shinarus shinarus 626 Sep  5 11:44 soc-common.dtsi' },

        { t: 'cal', kind: 'info', title: 'Ba blob khác nhau, sinh ra từ ba file nguồn tổng cộng 569 byte',
          x: 'Đây là con số nói lên toàn bộ giá trị của cơ chế include. Ba bo mạch chỉ tốn ' +
             '<b>137 + 240 + 192 = 569 byte</b> mô tả riêng, cộng thêm <b>626 byte</b> mô tả ' +
             'chung dùng lại được. Nếu không có include, mỗi file phải chép nguyên 626 byte ' +
             'đó — và tệ hơn nhiều, khi con chip có lỗi cần sửa, bạn phải sửa ba chỗ thay vì ' +
             'một. Trong chính cây kernel bạn đã dựng, <b>58 file <code>.dts</code>/<code>.dtsi</code> ' +
             'cùng khai <code>arm,pl011</code></b> — con số bạn đã tự đếm ở Bài 42. Nhân kiểu ' +
             'chép-dán đó lên 58 lần và bạn hiểu ' +
             'vì sao cộng đồng kernel không quay lại board file.' },

        { t: 'p', x:
          'Kích thước chỉ là dấu hiệu gián tiếp. Hãy nhìn thẳng vào kết quả trộn — hai con ' +
          'UART của bo mạch B sau khi dịch:' },

        { t: 'code', where: 'wsl', code:
          "dtc -I dtb -O dts -o - board-b.dtb | sed -n '/serial@/,/};/p'" },

        { t: 'code', where: 'out', nocopy: true, lang: 'dts', code:
          '\t\tserial@1010c000 {\n' +
          '\t\t\tcompatible = "arm,pl011", "arm,primecell";\n' +
          '\t\t\treg = <0x1010c000 0x1000>;\n' +
          '\t\t\tclocks = <0x01>;\n' +
          '\t\t\tclock-names = "uartclk";\n' +
          '\t\t\tstatus = "okay";\n' +
          '\t\t};\n' +
          '\t\tserial@1010d000 {\n' +
          '\t\t\tcompatible = "arm,pl011", "arm,primecell";\n' +
          '\t\t\treg = <0x1010d000 0x1000>;\n' +
          '\t\t\tclocks = <0x01>;\n' +
          '\t\t\tclock-names = "uartclk";\n' +
          '\t\t\tstatus = "okay";\n' +
          '\t\t\tcurrent-speed = <0x1c200>;\n' +
          '\t\t};' },

        { t: 'cal', kind: 'info', title: 'Đây là "trộn, không thay thế" hiện ra thành chữ',
          x: 'File <code>board-b.dts</code> chỉ viết <b>hai</b> dòng cho ' +
             '<code>&amp;uart1</code>, nhưng node kết quả có <b>sáu</b> thuộc tính: bốn dòng ' +
             '<code>compatible</code>, <code>reg</code>, <code>clocks</code>, ' +
             '<code>clock-names</code> đến từ <code>.dtsi</code> và còn nguyên vẹn; ' +
             '<code>status</code> bị đè từ <code>"disabled"</code> thành ' +
             '<code>"okay"</code>; <code>current-speed</code> là thứ hoàn toàn mới. Giá trị ' +
             '<code>0x1c200</code> chính là 115 200 viết ở hệ 16 — <code>dtc</code> chỉ đổi ' +
             'cách in, như bước 2 đã cho thấy.' },

        { t: 'p', x:
          'Còn khối <code>&amp;refclk</code> ở cuối <code>board-b.dts</code> thì sao? Hỏi ' +
          'thẳng cả hai blob, so hai giá trị cạnh nhau:' },

        { t: 'code', where: 'wsl', code:
          'fdtget -t x board-a.dtb /clock-24mhz clock-frequency\n' +
          'fdtget -t x board-b.dtb /clock-24mhz clock-frequency' },

        { t: 'code', where: 'out', nocopy: true, code:
          '16e3600\n' +
          '2dc6c00' },

        { t: 'cal', kind: 'info', title: 'Hai con số này là 24 MHz và 48 MHz',
          x: '<code>0x16e3600</code> = 24 000 000 và <code>0x2dc6c00</code> = 48 000 000. ' +
             'Bo mạch A giữ nguyên giá trị của <code>.dtsi</code>; bo mạch B đã đè lên bằng ' +
             'đúng ba dòng. Điểm đáng chú ý: <code>&amp;refclk</code> nằm ở nhánh hoàn toàn ' +
             'khác <code>&amp;uart1</code>, mà bạn <b>không phải viết đường dẫn nào cả</b> — ' +
             'nhãn đủ để <code>dtc</code> tìm ra. Đó chính là thứ khiến file bo mạch thật chỉ ' +
             'dài vài trăm dòng.' },

        { t: 'p', x:
          'Cuối cùng, kiểm tra hai directive xoá của bo mạch C có thật sự hiệu lực không. ' +
          '<code>fdtget -l</code> liệt kê node con, <code>-p</code> liệt kê tên thuộc tính:' },

        { t: 'code', where: 'wsl', code:
          'fdtget -l board-c.dtb /soc\n' +
          'echo "---"\n' +
          'fdtget -p board-c.dtb /soc/serial@1010c000' },

        { t: 'code', where: 'out', nocopy: true, code:
          'serial@1010c000\n' +
          '---\n' +
          'compatible\n' +
          'reg\n' +
          'clocks\n' +
          'status' },

        { t: 'cal', kind: 'info', title: 'Cả hai directive đều làm đúng việc — và bằng chứng nằm ở cái <i>vắng mặt</i>',
          x: 'Node <code>/soc</code> giờ chỉ còn <b>một</b> con thay vì hai: ' +
             '<code>serial@1010d000</code> đã bị <code>/delete-node/ &amp;uart1;</code> xoá ' +
             'khỏi cây. Và trong bốn thuộc tính còn lại của UART thứ nhất, ' +
             '<code>clock-names</code> đã biến mất theo lệnh ' +
             '<code>/delete-property/</code> — trong khi <code>clocks</code>, ' +
             '<code>reg</code>, <code>compatible</code> vẫn nguyên. So với ' +
             '<code>board-b.dtb</code> ở trên (hai node, sáu thuộc tính) thì khác biệt rất rõ.' },

        { t: 'p', x:
          'Bây giờ cố tình phạm sai lầm mà phần lý thuyết đã cảnh báo: xoá bộ tạo xung trong ' +
          'khi vẫn còn thứ trỏ vào nó.' },

        { t: 'code', where: 'wsl', code:
          "sed 's|/delete-node/ &uart1;|/delete-node/ \\&refclk;|' board-c.dts > board-bad.dts\n" +
          'tail -1 board-bad.dts\n' +
          'dtc -I dts -O dtb -o board-bad.dtb board-bad.dts\n' +
          'echo "exit=$?"',
          notes: ['Dấu <code>&amp;</code> trong phần thay thế của <code>sed</code> mang nghĩa "toàn bộ chuỗi vừa khớp", nên phải viết <code>\\&amp;</code> để nó là ký tự thường — đây là bẫy kinh điển của <code>sed</code>.'] },

        { t: 'code', where: 'out', nocopy: true, code:
          '/delete-node/ &refclk;\n' +
          'soc-common.dtsi:17.26-23.5: ERROR (phandle_references): /soc/serial@1010c000: Reference to non-existent node or label "refclk"\n' +
          '\n' +
          '  also defined at board-bad.dts:9.8-12.3\n' +
          'soc-common.dtsi:25.26-31.5: ERROR (phandle_references): /soc/serial@1010d000: Reference to non-existent node or label "refclk"\n' +
          '\n' +
          'ERROR: Input tree has errors, aborting (use -f to force output)\n' +
          'exit=2' },

        { t: 'cal', kind: 'why', title: 'Thông báo lỗi này chỉ vào <code>soc-common.dtsi</code>, không phải file bạn vừa sửa',
          x: 'Và đó là chi tiết đáng học nhất ở đây. <code>dtc</code> báo lỗi tại <b>chỗ có ' +
             'tham chiếu hỏng</b> (dòng 17 và dòng 25 của file <code>.dtsi</code>), chứ không ' +
             'phải tại chỗ bạn gõ <code>/delete-node/</code>. Khi debug một cây thật gồm hàng ' +
             'chục file include lồng nhau, hãy đọc số dòng theo đúng nghĩa đen của nó rồi lần ' +
             'ngược lên: <b>nguyên nhân thường nằm ở file khác với nơi báo lỗi</b>. Chú ý cả ' +
             'dòng <code>also defined at board-bad.dts:9.8-12.3</code> — <code>dtc</code> ' +
             'đang chỉ cho bạn khối ghi đè liên quan. Và <code>exit=2</code> nghĩa là ' +
             '<b>không có file <code>.dtb</code> nào được tạo</b>: lỗi này chặn build, không ' +
             'chỉ là cảnh báo.' }
      ] },

      /* ---------------- BƯỚC 5 ---------------- */
      { title: 'Bước 5 — Overlay: vá một blob đã dịch xong',
        blocks: [

        { t: 'p', x:
          'Bước này lặp lại kịch bản thật của một bo mở rộng: cây gốc đã dịch và nằm sẵn ' +
          'trong thiết bị, giờ cần thêm một con điều khiển LED và bật con UART thứ hai — mà ' +
          'không được dịch lại cây gốc. Trước hết, chép file <code>.dtsi</code> sang thư mục ' +
          'mới và <b>dán nhãn cho node <code>soc</code></b>:' },

        { t: 'code', where: 'wsl', code:
          'mkdir -p ~/bai43/ovl && cd ~/bai43/ovl\n' +
          "sed 's/^\\tsoc {/\\tsoc: soc {/' ../inc/soc-common.dtsi > soc-common.dtsi\n" +
          'cp ../inc/board-a.dts base.dts\n' +
          'grep -n "soc" soc-common.dtsi' },

        { t: 'code', where: 'out', nocopy: true, code: '11:\tsoc: soc {',
          notes: ['Đúng <b>một</b> dòng khớp trong cả file — chuỗi <code>soc</code> không xuất hiện ở bất kỳ đâu khác, kể cả trong <code>compatible = "simple-bus"</code>. Đó là cách nhanh nhất để chắc chắn <code>sed</code> đã sửa đúng một chỗ cần sửa.'] },

        { t: 'cal', kind: 'why', title: 'Năm ký tự này là điều kiện bắt buộc, và bỏ quên nó là lỗi thật đã xảy ra',
          x: 'Lần đầu soạn bước này, node <code>soc</code> không có nhãn và ' +
             '<code>fdtoverlay</code> thất bại với <code>FDT_ERR_NOTFOUND</code> dù cây gốc ' +
             '<i>đã</i> dịch đúng cờ. Lý do đã nói ở phần lý thuyết: không có nhãn thì không ' +
             'vào <code>__symbols__</code>, không vào bảng tên thì overlay không có gì để ' +
             'nhắm tới. Bạn sẽ thấy chính bảng đó ngay dưới đây. <b>Đây là lý do file ' +
             '<code>.dtsi</code> của các hãng dán nhãn cho gần như mọi node.</b>' },

        { t: 'p', x: 'Viết overlay. Chú ý hai dòng đầu và hai dòng khai cell:' },

        { t: 'code', where: 'wsl', code:
          "cat > led.dtso <<'EOF'\n" +
          '/dts-v1/;\n' +
          '/plugin/;\n' +
          '\n' +
          '&soc {\n' +
          '\t#address-cells = <1>;\n' +
          '\t#size-cells = <1>;\n' +
          '\n' +
          '\tled-controller@1020000 {\n' +
          '\t\tcompatible = "learn,led-ctrl";\n' +
          '\t\treg = <0x1020000 0x100>;\n' +
          '\t\tlabel = "status-led";\n' +
          '\t};\n' +
          '};\n' +
          '\n' +
          '&uart1 {\n' +
          '\tstatus = "okay";\n' +
          '};\n' +
          'EOF' },

        { t: 'p', x:
          'Dịch cây gốc <b>không</b> có <code>-@</code> trước, để thấy hậu quả. Dịch overlay ' +
          'như bình thường, rồi thử trộn:' },

        { t: 'code', where: 'wsl', code:
          'dtc -I dts -O dtb -o base-plain.dtb base.dts\n' +
          'dtc -I dts -O dtb -o led.dtbo led.dtso\n' +
          'ls -l base-plain.dtb led.dtbo\n' +
          'fdtoverlay -i base-plain.dtb -o merged-bad.dtb led.dtbo\n' +
          'echo "exit=$?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          '-rw-r--r-- 1 shinarus shinarus 730 Sep  5 11:45 base-plain.dtb\n' +
          '-rw-r--r-- 1 shinarus shinarus 504 Sep  5 11:45 led.dtbo\n' +
          '\n' +
          "Failed to apply 'led.dtbo': FDT_ERR_BADOFFSET\n" +
          "base blob does not have a '/__symbols__' node, make sure you have compiled the base blob with '-@' option\n" +
          'exit=1' },

        { t: 'cal', kind: 'info', title: 'Thông báo lỗi tự nói ra cách sửa — hiếm khi được như thế',
          x: 'Dòng thứ hai nêu đúng nguyên nhân (<i>thiếu node ' +
             '<code>/__symbols__</code></i>) và đúng cách khắc phục (<i>dịch lại cây gốc với ' +
             '<code>-@</code></i>). Chú ý lỗi nằm ở phía <b>cây gốc</b>, không phải overlay: ' +
             'file <code>led.dtbo</code> 504 byte đã dịch xong, hoàn toàn hợp lệ. Ghi nhớ ' +
             'con số <b>730 byte</b> của <code>base-plain.dtb</code> để so ở bước tiếp.' },

        { t: 'p', x:
          'Trước khi sửa, hãy xem bên trong <code>led.dtbo</code> — đây là chỗ ' +
          '<code>/plugin/;</code> lộ ra nó đã làm gì:' },

        { t: 'code', where: 'wsl', code: 'dtc -I dtb -O dts -o - led.dtbo' },

        { t: 'code', where: 'out', nocopy: true, lang: 'dts', code:
          '/dts-v1/;\n' +
          '\n' +
          '/ {\n' +
          '\n' +
          '\tfragment@0 {\n' +
          '\t\ttarget = <0xffffffff>;\n' +
          '\n' +
          '\t\t__overlay__ {\n' +
          '\t\t\t#address-cells = <0x01>;\n' +
          '\t\t\t#size-cells = <0x01>;\n' +
          '\n' +
          '\t\t\tled-controller@1020000 {\n' +
          '\t\t\t\tcompatible = "learn,led-ctrl";\n' +
          '\t\t\t\treg = <0x1020000 0x100>;\n' +
          '\t\t\t\tlabel = "status-led";\n' +
          '\t\t\t};\n' +
          '\t\t};\n' +
          '\t};\n' +
          '\n' +
          '\tfragment@1 {\n' +
          '\t\ttarget = <0xffffffff>;\n' +
          '\n' +
          '\t\t__overlay__ {\n' +
          '\t\t\tstatus = "okay";\n' +
          '\t\t};\n' +
          '\t};\n' +
          '\n' +
          '\t__fixups__ {\n' +
          '\t\tsoc = "/fragment@0:target:0";\n' +
          '\t\tuart1 = "/fragment@1:target:0";\n' +
          '\t};\n' +
          '};' },

        { t: 'cal', kind: 'info', title: 'Hai khối bạn viết đã thành hai <code>fragment</code>, và <code>target</code> vẫn còn trống',
          x: 'Giá trị <code>0xffffffff</code> ở cả hai <code>target</code> là chỗ chờ điền — ' +
             'lúc dịch overlay, <code>dtc</code> không hề đọc cây gốc nên không biết ' +
             '<code>soc</code> mang phandle số mấy. Danh sách việc phải làm nằm trong ' +
             '<code>__fixups__</code>: hai dòng, ứng với hai fragment. So sánh với bảng ' +
             '<code>__symbols__</code> ở dưới và bạn sẽ thấy chúng khớp nhau như ổ khoá với ' +
             'chìa: <b>overlay hỏi theo tên, cây gốc trả lời bằng đường dẫn</b>.' },

        { t: 'p', x: 'Giờ dịch lại cây gốc với đúng một cờ khác:' },

        { t: 'code', where: 'wsl', code:
          'dtc -@ -I dts -O dtb -o base.dtb base.dts\n' +
          'ls -l base.dtb\n' +
          "dtc -I dtb -O dts -o - base.dtb | sed -n '/__symbols__/,/};/p'" },

        { t: 'code', where: 'out', nocopy: true, code:
          '-rw-r--r-- 1 shinarus shinarus 941 Sep  5 11:45 base.dtb\n' +
          '\t__symbols__ {\n' +
          '\t\trefclk = "/clock-24mhz";\n' +
          '\t\tsoc = "/soc";\n' +
          '\t\tuart0 = "/soc/serial@1010c000";\n' +
          '\t\tuart1 = "/soc/serial@1010d000";\n' +
          '\t};' },

        { t: 'cal', kind: 'info', title: '941 − 730 = 211 byte, và đó chính là bốn dòng bạn đang nhìn',
          x: 'Cờ <code>-@</code> không đổi một chút nào nội dung phần cứng; nó chỉ thêm node ' +
             '<code>__symbols__</code> ánh xạ <b>bốn nhãn → bốn đường dẫn</b>. Đây là lần đầu ' +
             'trong cả bài bạn thấy chữ <code>refclk</code>, <code>soc</code>, ' +
             '<code>uart0</code>, <code>uart1</code> <i>tồn tại trong một file .dtb</i> — ở ' +
             'bước 2 chúng đã bốc hơi hoàn toàn. Nói chính xác thì <code>-@</code> không phải ' +
             '"giữ label lại"; nó <b>chép label thành dữ liệu</b> trong một node phụ. Cây ' +
             'phần cứng vẫn không biết gì về nhãn.' },

        { t: 'p', x: 'Trộn lại, lần này thành công:' },

        { t: 'code', where: 'wsl', code:
          'fdtoverlay -i base.dtb -o merged.dtb led.dtbo\n' +
          'echo "exit=$?"\n' +
          'ls -l merged.dtb' },

        { t: 'code', where: 'out', nocopy: true, code:
          'exit=0\n' +
          '-rw-r--r-- 1 shinarus shinarus 1047 Sep  5 11:45 merged.dtb' },

        { t: 'cmdx', title: 'Ba tham số của <code>fdtoverlay</code>',
          cmd: 'fdtoverlay -i base.dtb -o merged.dtb led.dtbo',
          rows: [
            ['<code>-i base.dtb</code>', '<b>i</b>nput: cây gốc, bắt buộc đã dịch với <code>-@</code>.', 'Không sửa file này'],
            ['<code>-o merged.dtb</code>', '<b>o</b>utput: cây kết quả sau khi vá.', 'Đây mới là file đem đi boot'],
            ['<code>led.dtbo</code>', 'Một hoặc <b>nhiều</b> overlay, áp lần lượt theo thứ tự viết.',
             'Nhiều overlay cùng sửa một node thì cái sau thắng — giống luật trộn của include']
          ] },

        { t: 'p', x:
          'Kích thước không chứng minh được overlay đã áp <i>đúng chỗ</i>. Hỏi thẳng cây kết ' +
          'quả:' },

        { t: 'code', where: 'wsl', code:
          'fdtget -l merged.dtb /soc\n' +
          'echo "---"\n' +
          'fdtget -t s merged.dtb /soc/serial@1010d000 status\n' +
          'fdtget -t s merged.dtb /soc/led-controller@1020000 compatible\n' +
          'fdtget -t x merged.dtb /soc/led-controller@1020000 reg' },

        { t: 'code', where: 'out', nocopy: true, code:
          'led-controller@1020000\n' +
          'serial@1010c000\n' +
          'serial@1010d000\n' +
          '---\n' +
          'okay\n' +
          'learn,led-ctrl\n' +
          '1020000 100' },

        { t: 'cal', kind: 'info', title: 'Bốn dòng này xác nhận cả hai fragment đều đã hạ cánh đúng',
          x: 'Node <code>/soc</code> giờ có <b>ba</b> con thay vì hai — ' +
             '<code>led-controller@1020000</code> là node mới, và nó nằm <i>bên trong</i> ' +
             '<code>/soc</code> chứ không phải ở gốc, tức <code>fragment@0</code> đã tra đúng ' +
             'phandle của <code>soc</code>. Dòng <code>okay</code> cho thấy ' +
             '<code>fragment@1</code> cũng đã đè được <code>status</code> của ' +
             '<code>uart1</code> từ <code>"disabled"</code> lên. Còn ' +
             '<code>1020000 100</code> là hai cell — <b>đúng 1 cell địa chỉ + 1 cell kích ' +
             'thước</b>, nhờ hai dòng <code>#address-cells</code>/<code>#size-cells</code> ' +
             'bạn đã khai trong fragment. Bỏ chúng đi thì <code>dtc</code> mặc định 2/1 và ' +
             'cảnh báo <code>reg_format</code> ngay lúc dịch — thông báo đầy đủ nằm ở bảng ' +
             '<i>Lỗi thường gặp</i>.' },

        { t: 'cal', kind: 'tip', title: 'Cây <code>merged.dtb</code> này boot được — nhưng đó là việc của Bài 45',
          x: 'File 1 047 byte bạn vừa tạo là một cây hoàn chỉnh, hợp lệ, có thể truyền cho ' +
             'QEMU bằng <code>-dtb merged.dtb</code>. Bài này dừng ở cú pháp; Bài 45 sẽ nạp ' +
             'một cây đã sửa vào máy đang chạy và kiểm chứng bằng ' +
             '<code>/proc/device-tree</code> — lúc đó bạn sẽ thấy node ' +
             '<code>led-controller</code> xuất hiện thật trong hệ đang boot.' }
      ] },

      /* ---------------- BƯỚC 6 ---------------- */
      { title: 'Bước 6 — Một file .dts thật của kernel, đi hết dây chuyền',
        blocks: [

        { t: 'p', x:
          'Năm bước trước dùng file tự viết, cố ý nhỏ để nhìn rõ từng chi tiết. Bước cuối ' +
          'này lấy một file thật trong cây kernel bạn đã dựng ở Bài 40, đẩy nó qua cả ' +
          '<code>cpp</code> lẫn <code>dtc</code>, rồi so kết quả với file mà chính hệ thống ' +
          'build của kernel đã tạo ra. Chọn Raspberry Pi 3 Model B — một bo mạch thật, phổ ' +
          'biến, và có sẵn trong cây ARM64.' },

        { t: 'code', where: 'wsl', code:
          'mkdir -p ~/bai43/rpi && cd ~/bai43/rpi\n' +
          'K=~/bai38/linux-6.18.45\n' +
          'wc -l $K/arch/arm64/boot/dts/broadcom/bcm2837-rpi-3-b.dts\n' +
          'cat $K/arch/arm64/boot/dts/broadcom/bcm2837-rpi-3-b.dts' },

        { t: 'code', where: 'out', nocopy: true, code:
          '2 /home/shinarus/bai38/linux-6.18.45/arch/arm64/boot/dts/broadcom/bcm2837-rpi-3-b.dts\n' +
          '// SPDX-License-Identifier: GPL-2.0\n' +
          '#include "arm/broadcom/bcm2837-rpi-3-b.dts"' },

        { t: 'cal', kind: 'info', title: 'Hai dòng — và một cú sốc nhỏ có ích',
          x: 'File <code>.dts</code> của Raspberry Pi 3 trong nhánh ARM64 <b>không mô tả gì ' +
             'cả</b>: nó chỉ <code>#include</code> file cùng tên bên nhánh ARM 32 bit. Vì ' +
             'phần cứng của bo mạch giống hệt nhau ở cả hai chế độ; chỉ kernel là khác. File ' +
             'thật bên <code>arch/arm/…</code> dài <b>154 dòng</b>. <b>Bài học: đừng đánh ' +
             'giá một file DTS qua độ dài của nó</b> — cái bạn thấy hầu như luôn là đỉnh của ' +
             'một chuỗi include, và chỗ này chính là lúc <code>#include</code> của ' +
             '<code>cpp</code> (chứ không phải <code>/include/</code> của <code>dtc</code>) ' +
             'ra tay.' },

        { t: 'p', x:
          'Chạy <code>cpp</code> với đúng bộ cờ mà Makefile của kernel dùng. Đây là mắt xích ' +
          'đầu tiên trong sơ đồ dây chuyền ở đầu bài:' },

        { t: 'code', where: 'wsl', code:
          'cpp -nostdinc -undef -D__DTS__ -x assembler-with-cpp \\\n' +
          '  -I $K/scripts/dtc/include-prefixes \\\n' +
          '  -I $K/arch/arm64/boot/dts/broadcom \\\n' +
          '  -o rpi3.dts.pp $K/arch/arm64/boot/dts/broadcom/bcm2837-rpi-3-b.dts\n' +
          'wc -l rpi3.dts.pp' },

        { t: 'cmdx', title: 'Năm cờ, và vì sao thiếu bất kỳ cờ nào cũng hỏng',
          cmd: 'cpp -nostdinc -undef -D__DTS__ -x assembler-with-cpp -I … -o out.pp in.dts',
          rows: [
            ['<code>-nostdinc</code>', 'Không tìm trong <code>/usr/include</code> của máy chủ.',
             'Nếu không, <code>#include &lt;linux/…&gt;</code> có thể vớ nhầm header của Ubuntu'],
            ['<code>-undef</code>', 'Xoá mọi macro mà <code>cpp</code> tự định nghĩa sẵn.',
             'Máy chủ định nghĩa <code>linux</code> = 1, và mọi chữ <code>linux</code> trong DTS sẽ biến thành <code>1</code>'],
            ['<code>-D__DTS__</code>', 'Định nghĩa macro báo cho các header biết chúng đang được dùng từ DTS.',
             'Nhiều file <code>dt-bindings/*.h</code> rẽ nhánh theo macro này'],
            ['<code>-x assembler-with-cpp</code>', 'Coi đầu vào là hợp ngữ, không phải C.',
             '<b>Quan trọng nhất.</b> Ở chế độ C, <code>cpp</code> sẽ vấp vì DTS không phải C hợp lệ'],
            ['<code>-I &lt;thư-mục&gt;</code>', 'Nơi tìm file được include. Ở đây cần hai chỗ.',
             '<code>include-prefixes</code> chứa <code>dt-bindings/</code> và các liên kết <code>arm/</code>, <code>arm64/</code>']
          ] },

        { t: 'code', where: 'out', nocopy: true, code: '1212 rpi3.dts.pp' },

        { t: 'cal', kind: 'info', title: 'Từ 2 dòng lên 1 212 dòng — gấp 606 lần',
          x: 'Con số này là toàn bộ chuỗi include mở bung ra. Nếu bạn chạy ' +
             '<code>cpp</code> thẳng lên file ARM 154 dòng thì được <b>1 209</b> dòng — ' +
             'chênh đúng 3 dòng, là các dòng đánh dấu vị trí mà <code>cpp</code> chèn khi đi ' +
             'qua thêm một lớp file bọc. Nói cách khác, lớp bọc ARM64 không thêm nội dung ' +
             'nào, đúng như hai dòng bạn vừa đọc.' },

        { t: 'p', x:
          '<code>cpp</code> để lại dấu vết đường đi của nó dưới dạng các dòng bắt đầu bằng ' +
          '<code>#</code>. Đếm xem đã có bao nhiêu file bị kéo vào:' },

        { t: 'code', where: 'wsl', code:
          "grep '^# [0-9]* \"' rpi3.dts.pp | sed 's/^# [0-9]* \"//; s/\".*//' \\\n" +
          '  | sort -u | sed "s|$K/||"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'arch/arm64/boot/dts/broadcom/bcm2837-rpi-3-b.dts\n' +
          'scripts/dtc/include-prefixes/arm/broadcom/bcm2835-common.dtsi\n' +
          'scripts/dtc/include-prefixes/arm/broadcom/bcm2835-rpi-common.dtsi\n' +
          'scripts/dtc/include-prefixes/arm/broadcom/bcm2835-rpi.dtsi\n' +
          'scripts/dtc/include-prefixes/arm/broadcom/bcm2836-rpi.dtsi\n' +
          'scripts/dtc/include-prefixes/arm/broadcom/bcm2837-rpi-3-b.dts\n' +
          'scripts/dtc/include-prefixes/arm/broadcom/bcm2837.dtsi\n' +
          'scripts/dtc/include-prefixes/arm/broadcom/bcm283x-rpi-led-deprecated.dtsi\n' +
          'scripts/dtc/include-prefixes/arm/broadcom/bcm283x-rpi-smsc9514.dtsi\n' +
          'scripts/dtc/include-prefixes/arm/broadcom/bcm283x-rpi-usb-host.dtsi\n' +
          'scripts/dtc/include-prefixes/arm/broadcom/bcm283x-rpi-wifi-bt.dtsi\n' +
          'scripts/dtc/include-prefixes/arm/broadcom/bcm283x.dtsi\n' +
          'scripts/dtc/include-prefixes/dt-bindings/clock/bcm2835-aux.h\n' +
          'scripts/dtc/include-prefixes/dt-bindings/clock/bcm2835.h\n' +
          'scripts/dtc/include-prefixes/dt-bindings/gpio/gpio.h\n' +
          'scripts/dtc/include-prefixes/dt-bindings/interrupt-controller/irq.h\n' +
          'scripts/dtc/include-prefixes/dt-bindings/pinctrl/bcm2835.h\n' +
          'scripts/dtc/include-prefixes/dt-bindings/power/raspberrypi-power.h\n' +
          'scripts/dtc/include-prefixes/dt-bindings/soc/bcm2835-pm.h\n' +
          '<built-in>\n' +
          '<command-line>' },

        { t: 'cal', kind: 'info', title: '19 file thật, chia làm ba tầng rõ rệt',
          x: '(Hai dòng <code>&lt;built-in&gt;</code> và <code>&lt;command-line&gt;</code> ' +
             'không phải file — <code>cpp</code> ghi chúng để đánh dấu macro của chính nó.) ' +
             'Còn lại: <b>2 file <code>.dts</code></b> — lớp bọc ARM64 và file bo mạch thật; ' +
             '<b>10 file <code>.dtsi</code></b> xếp từ chung tới riêng (<code>bcm283x</code> ' +
             '→ <code>bcm2835</code> → <code>bcm2836</code> → <code>bcm2837</code>, cộng vài ' +
             'mảnh chức năng như wifi-bt, usb-host, smsc9514); và <b>7 header ' +
             '<code>dt-bindings/</code></b> chỉ chứa macro hằng số như ' +
             '<code>GPIO_ACTIVE_HIGH</code>. Bốn tên chip xếp tăng dần đúng là lịch sử dòng ' +
             'Raspberry Pi — và mỗi đời chỉ viết thêm phần khác biệt.' },

        { t: 'p', x:
          'Bây giờ tới mắt xích thứ hai. Dịch hai lần, một lần không cờ và một lần có ' +
          '<code>-@</code>, rồi đặt cạnh file mà kernel đã tự dựng:' },

        { t: 'code', where: 'wsl', code:
          'dtc -I dts -O dtb -o rpi3-plain.dtb rpi3.dts.pp 2>/dev/null\n' +
          'dtc -@ -I dts -O dtb -o rpi3.dtb rpi3.dts.pp 2>/dev/null\n' +
          'ls -l rpi3-plain.dtb rpi3.dtb \\\n' +
          '  $K/arch/arm64/boot/dts/broadcom/bcm2837-rpi-3-b.dtb',
          notes: ['<code>2>/dev/null</code> giấu một loạt cảnh báo về binding — chúng có thật và không phải lỗi của bạn; cây kernel bật sẵn nhiều kiểm tra mà chính nó chưa thoả hết. Bài 44 sẽ nói về binding.'] },

        { t: 'code', where: 'out', nocopy: true, code:
          '-rw-r--r-- 1 shinarus shinarus 21605 Aug 27 21:41 /home/shinarus/bai38/linux-6.18.45/arch/arm64/boot/dts/broadcom/bcm2837-rpi-3-b.dtb\n' +
          '-rw-r--r-- 1 shinarus shinarus 15607 Sep  5 11:45 rpi3-plain.dtb\n' +
          '-rw-r--r-- 1 shinarus shinarus 21605 Sep  5 11:45 rpi3.dtb' },

        { t: 'cal', kind: 'info', title: '15 607 so với 21 605 — bảng tên chiếm 5 998 byte, tức 28 % cả file',
          x: 'Ở bước 5, <code>-@</code> chỉ làm cây đồ chơi phình thêm 211 byte. Ở một cây ' +
             'thật với hàng trăm nhãn, nó tốn gần <b>6 KB</b>. Đó là cái giá của khả năng ' +
             'nhận overlay, và là lý do <code>-@</code> phải là tuỳ chọn chứ không mặc định: ' +
             'thiết bị không bao giờ cắm bo mở rộng thì không nên trả giá đó. Đồng thời chú ' +
             'ý: file <code>21605</code> của bạn <b>bằng đúng</b> kích thước file kernel đã ' +
             'dựng — đó không phải trùng hợp.' },

        { t: 'p', x:
          'Kích thước bằng nhau vẫn có thể là trùng hợp. So băm nội dung để chắc chắn:' },

        { t: 'code', where: 'wsl', code:
          'sha256sum rpi3.dtb $K/arch/arm64/boot/dts/broadcom/bcm2837-rpi-3-b.dtb\n' +
          'grep CONFIG_OF_OVERLAY $K/.config' },

        { t: 'code', where: 'out', nocopy: true, code:
          'c2d92e315f9a9e56a9218fda540e4a7abdb7b09ac9acc8f07546cc7488c65b6f  rpi3.dtb\n' +
          'c2d92e315f9a9e56a9218fda540e4a7abdb7b09ac9acc8f07546cc7488c65b6f  /home/shinarus/bai38/linux-6.18.45/arch/arm64/boot/dts/broadcom/bcm2837-rpi-3-b.dtb\n' +
          'CONFIG_OF_OVERLAY=y' },

        { t: 'cal', kind: 'why', title: 'Hai chuỗi băm giống nhau từng ký tự — bạn vừa tự tay tái tạo một bước build của kernel',
          x: 'Đây là kết luận mạnh nhất của cả bài. Hệ thống build của kernel <b>không làm gì ' +
             'bí ẩn</b> với file DTS: nó chạy đúng <code>cpp</code> rồi đúng ' +
             '<code>dtc</code>, với đúng những cờ bạn vừa gõ. Dòng cuối giải thích nốt vì sao ' +
             'phải là <code>rpi3.dtb</code> (có <code>-@</code>) chứ không phải ' +
             '<code>rpi3-plain.dtb</code>: cấu hình ARM64 bạn dựng ở Bài 40 có ' +
             '<code>CONFIG_OF_OVERLAY=y</code>, nên Makefile tự thêm <code>-@</code>. ' +
             '<b>Lần sau bạn dịch tay một <code>.dts</code> của kernel mà kích thước không ' +
             'khớp, hãy nghi ngay một cờ bị thiếu chứ đừng nghi file.</b>' },

        { t: 'p', x:
          'Xong phần thực hành. Nếu muốn dọn sạch, cả thư mục có thể xoá — không bài nào sau ' +
          'này phụ thuộc vào nó (khác với <code>~/bai38</code> và <code>~/bai40</code>, hai ' +
          'thư mục phải giữ):' },

        { t: 'code', where: 'wsl', code:
          'du -sh ~/bai43\n' +
          '# rm -rf ~/bai43     # uncomment this line to delete it' },

        { t: 'code', where: 'out', nocopy: true, code: '1.2M\t/home/shinarus/bai43',
          notes: ['Hơn một nửa con số đó là <code>virt.dtb</code>: QEMU đệm nó lên tròn 1 MiB dù cây thật chỉ hơn 9 KB. Nếu bạn còn giữ thêm bản dump nào khác thì mỗi bản cộng thêm 1 MiB nữa.'] }
      ] }

    ] },

    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Mọi thông báo dưới đây đều được ghi lại từ chính những lần chạy hỏng trong lúc soạn ' +
      'bài này — không có dòng nào bịa ra. Điểm chung: <code>dtc</code> nói khá rõ, nhưng nó ' +
      'nói về <b>chỗ phát hiện lỗi</b>, không phải chỗ bạn gõ sai.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>Error: nover.dts:1.1-2 syntax error</code><br><code>FATAL ERROR: Unable to parse input tree</code>',
         'Thiếu <code>/dts-v1/;</code> ở dòng đầu file <code>.dts</code>. <code>dtc</code> vấp ngay ký tự đầu tiên, nên số dòng luôn là <code>1.1-2</code>.',
         'Thêm <code>/dts-v1/;</code> làm dòng đầu tiên. <b>Riêng file <code>.dtsi</code> thì không được thêm</b> — dòng này thuộc về file <code>.dts</code> include nó.'],

        ['<code>Error: nosemi.dts:8.1-2 syntax error</code><br><code>FATAL ERROR: Unable to parse input tree</code>',
         'Thiếu dấu <code>;</code> sau dấu <code>}</code> đóng một node. Trong DTS, <b>mọi</b> node và <b>mọi</b> thuộc tính đều kết thúc bằng <code>;</code> — khác hẳn C.',
         'Số dòng báo là <b>dòng kế tiếp</b>, không phải dòng thiếu dấu: <code>dtc</code> chỉ biết có gì đó sai khi đọc tới token sau đó. Nhìn lên trên một dòng.'],

        ['<code>Error: /home/&lt;bạn&gt;/bai43/board.dtb:1.1-2 syntax error</code>',
         'Bạn dùng <code>-I dts</code> cho một file <code>.dtb</code>. <code>dtc</code> cố đọc dữ liệu nhị phân như văn bản và chết ở byte đầu.',
         'Đổi thành <code>-I dtb</code>. Nhớ luật: <b><code>-I</code> mô tả cái đi vào, <code>-O</code> mô tả cái đi ra</b>, và cả hai đều không suy ra từ phần mở rộng tên file.'],

        ['<code>Warning (unit_address_vs_reg): /serial@1010c000: node has a unit name, but no reg or ranges property</code>',
         'Tên node có phần <code>@địa-chỉ</code> nhưng node lại không có <code>reg</code> (hoặc <code>ranges</code>) để đối chiếu.',
         'Đây là <b>cảnh báo</b>, <code>exit=0</code> và file <code>.dtb</code> vẫn được tạo — nhưng đừng bỏ qua: hoặc thêm <code>reg</code>, hoặc bỏ phần <code>@…</code> khỏi tên. Node không có địa chỉ thì không được mang unit-address.'],

        ['<code>ERROR (phandle_references): /soc/serial@1010c000: Reference to non-existent node or label "refclk"</code>',
         'Một <code>&amp;label</code> trỏ vào node không tồn tại: gõ sai tên nhãn, quên include file định nghĩa nó, hoặc vừa <code>/delete-node/</code> mất nó trong khi vẫn còn thứ trỏ tới.',
         '<code>exit=2</code> và <b>không có file nào được tạo</b>. Đọc số dòng theo đúng nghĩa đen — nó chỉ vào nơi <i>tham chiếu</i> nằm, thường là file <code>.dtsi</code>, chứ không phải file bạn vừa sửa.'],

        ['<code>Failed to apply \'led.dtbo\': FDT_ERR_BADOFFSET</code><br><code>base blob does not have a \'/__symbols__\' node, make sure you have compiled the base blob with \'-@\' option</code>',
         'Cây gốc được dịch không có cờ <code>-@</code>, nên không có bảng tên để overlay tra cứu.',
         'Dịch lại <b>cây gốc</b> (không phải overlay) bằng <code>dtc -@ …</code>. Lỗi nằm ở phía cây gốc dù thông báo xuất hiện lúc áp overlay.'],

        ['<code>Failed to apply \'led.dtbo\': FDT_ERR_NOTFOUND</code>',
         'Cây gốc <i>có</i> <code>__symbols__</code>, nhưng thiếu đúng cái nhãn mà overlay nhắm tới — thường vì node đích không được dán nhãn trong file nguồn.',
         'So <code>__fixups__</code> của overlay với <code>__symbols__</code> của cây gốc: <code>dtc -I dtb -O dts -o - base.dtb | grep -A9 __symbols__</code>. Thiếu tên nào thì dán nhãn cho node đó rồi dịch lại.'],

        ['<code>Warning (reg_format): …:reg: property has invalid length (8 bytes) (#address-cells == 2, #size-cells == 1)</code>',
         'Trong overlay, khối <code>__overlay__</code> không khai <code>#address-cells</code>/<code>#size-cells</code>, nên <code>dtc</code> dùng mặc định 2/1 thay vì 1/1 của node đích.',
         'Khai lại cả hai ngay trong khối <code>&amp;target</code> của overlay, đúng bằng giá trị node cha thật sự có. Kèm theo là một loạt <code>Failed prerequisite \'reg_format\'</code> — đó là hệ quả, không phải lỗi riêng.'],

        ['<code>Error: must have an even number of arguments</code> (kèm nguyên khối hướng dẫn dùng)',
         '<code>fdtget</code> nhận các cặp <code>&lt;node&gt; &lt;thuộc-tính&gt;</code>, nên số tham số sau tên file phải chẵn. Gõ <code>fdtget f.dtb / \'#address-cells\' \'#size-cells\'</code> là ba tham số lẻ.',
         'Tách thành hai lần gọi, hoặc lặp lại tên node: <code>fdtget f.dtb / \'#address-cells\' / \'#size-cells\'</code>. Đừng hoảng vì khối usage dài — dòng cuối cùng mới là thông báo thật.']
      ] },

    { t: 'recap', title: 'Tóm tắt', items: [
      'DTS là <b>văn bản</b> cho người viết, DTB là <b>nhị phân</b> cho kernel đọc; <code>dtc</code> đi được cả hai chiều, và trước nó còn một mắt xích nữa là <code>cpp</code> khi file dùng <code>#include</code>.',
      'Một node là <code>label: tên@địa-chỉ { … };</code>. Phần <code>@địa-chỉ</code> phải khớp giá trị đầu của <code>reg</code>, viết hệ 16 không có <code>0x</code>, không có số 0 thừa ở đầu.',
      'DTB <b>quên kiểu</b>: nó chỉ lưu tên và số byte. Đó là lý do <code>[de ad be ef]</code> quay về thành <code>&lt;0xdeadbeef&gt;</code> và <code>""</code> quay về thành <code>[00]</code> — bản dịch ngược đúng về dữ liệu nhưng khác về hình thức.',
      '<b>Node cha quyết định cách đọc <code>reg</code> của con</b>, qua <code>#address-cells</code> và <code>#size-cells</code>. <code>#size-cells = &lt;0&gt;</code> nghĩa là <code>reg</code> chỉ còn là số định danh, như <code>cpu@1 reg = &lt;0x01&gt;</code>.',
      'Label chỉ tồn tại lúc dịch; thứ sống sót trong blob là <b>phandle</b>, một con số. <code>&amp;label</code> trong <code>&lt;&gt;</code> thành cell phandle, ngoài <code>&lt;&gt;</code> thành chuỗi đường dẫn — hai kết quả hoàn toàn khác nhau.',
      'Include <b>trộn</b> chứ không thay thế: <code>&amp;uart1</code> hai dòng của bo mạch B cho ra node sáu thuộc tính. Muốn bỏ thì phải nói thẳng bằng <code>/delete-property/</code> hoặc <code>/delete-node/</code>.',
      'Overlay là bản vá cho blob đã dịch xong. Nó cần <code>/plugin/;</code> ở phía mình và <b>cờ <code>-@</code> ở phía cây gốc</b> — <code>-@</code> ghi thêm node <code>__symbols__</code>, tốn 211 byte với cây đồ chơi và <b>5 998 byte</b> với cây Raspberry Pi 3 thật.',
      'Bạn đã tái tạo đúng một bước build của kernel: <code>cpp</code> rồi <code>dtc -@</code> trên <code>bcm2837-rpi-3-b.dts</code> cho ra file <b>21 605 byte</b> có <b>sha256 trùng từng ký tự</b> với file kernel tự dựng. Hệ thống build không làm gì bí ẩn cả.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: '<b>Bài 44 — Binding và cơ chế khớp driver.</b> Cả bài này bạn viết ' +
         '<code>compatible = "learn,led-ctrl"</code> mà chưa hề có driver nào tên như vậy, ' +
         'và <code>dtc</code> vẫn dịch trơn tru — vì <code>dtc</code> kiểm tra <i>cú pháp</i>, ' +
         'không kiểm tra <i>ý nghĩa</i>. Bài 44 gỡ đúng chỗ đó: chuỗi <code>compatible</code> ' +
         'được so với cái gì trong kernel, tại sao thứ tự từ riêng đến chung lại quyết định ' +
         'driver nào thắng, và tài liệu binding trong ' +
         '<code>Documentation/devicetree/bindings/</code> ràng buộc những gì. Bạn sẽ chạy ' +
         '<code>make dtbs_check</code> trên chính cây kernel ở <code>~/bai38</code> và thấy ' +
         'loạt cảnh báo mà bài này đã cố tình giấu đi bằng <code>2&gt;/dev/null</code> — lần ' +
         'này đọc hiểu được từng dòng.' }

  ],

  quiz: [
    { q: 'Node <code>flash@0</code> nằm trong một node cha có <code>#address-cells = &lt;2&gt;</code> và <code>#size-cells = &lt;2&gt;</code>. Thuộc tính <code>reg</code> của nó có 8 cell. Điều đó nghĩa là gì?',
      opts: [
        'File DTS bị sai, vì 8 không chia hết cho 2',
        'Node mô tả <b>hai</b> vùng nhớ, mỗi vùng gồm 2 cell địa chỉ + 2 cell kích thước',
        'Node mô tả một vùng nhớ 64 bit với 4 cell dự phòng',
        'Số cell trong <code>reg</code> không liên quan tới <code>#address-cells</code>'
      ],
      a: 1,
      why: 'Một vùng tốn <code>#address-cells + #size-cells</code> = 2 + 2 = 4 cell, nên 8 cell là đúng hai vùng. Đây chính là <code>flash@0</code> của máy <code>virt</code> mà bạn đã đọc ở bước 1: hai ngân hàng flash 64 MiB liền nhau. Quy tắc gốc: <b>node cha quyết định cách đọc <code>reg</code> của con</b>, và <code>reg</code> là danh sách vùng chứ không phải một vùng.' },

    { q: 'Bạn dịch <code>board.dts</code> thành <code>board.dtb</code> rồi dịch ngược lại. Vì sao dòng <code>clocks = &lt;&amp;refclk&gt;</code> trở thành <code>clocks = &lt;0x01&gt;</code>?',
      opts: [
        '<code>dtc</code> đã tối ưu hoá và bỏ bớt tham chiếu',
        'Vì <code>refclk</code> là node đầu tiên trong file',
        'Vì label không tồn tại trong file <code>.dtb</code>; thứ được lưu là <b>phandle</b>, một con số <code>dtc</code> tự cấp phát',
        'Vì thiếu cờ <code>-@</code> lúc dịch xuôi'
      ],
      a: 2,
      why: 'Label là công cụ của người viết, sống đúng đến lúc dịch xong rồi biến mất. Cái đi vào blob là phandle — số nguyên do <code>dtc</code> cấp, ở đây là <code>0x01</code>. Cờ <code>-@</code> <i>không</i> khôi phục label vào chỗ này; nó chỉ chép thêm bảng tên vào node phụ <code>__symbols__</code>, còn <code>clocks</code> vẫn là <code>&lt;0x01&gt;</code>.' },

    { q: 'File <code>soc-common.dtsi</code> đặt <code>status = "disabled"</code> cho cả hai UART. File <code>board-b.dts</code> chỉ viết <code>&amp;uart1 { status = "okay"; current-speed = &lt;115200&gt;; };</code>. Node <code>serial@1010d000</code> trong blob kết quả có bao nhiêu thuộc tính?',
      opts: ['2', '4', '6', '7'],
      a: 2,
      why: 'Sáu. Include <b>trộn</b> chứ không thay thế: bốn thuộc tính <code>compatible</code>, <code>reg</code>, <code>clocks</code>, <code>clock-names</code> từ <code>.dtsi</code> còn nguyên; <code>status</code> bị đè giá trị mới (vẫn là một thuộc tính, không phải hai); <code>current-speed</code> được thêm. Luật hợp nhất áp dụng ở mức <i>từng thuộc tính</i>, không phải mức node — muốn xoá thì phải nói thẳng bằng <code>/delete-property/</code>.' },

    { q: 'Bạn chạy <code>fdtoverlay -i base.dtb -o merged.dtb led.dtbo</code> và nhận được <code>Failed to apply \'led.dtbo\': FDT_ERR_NOTFOUND</code>. Nguyên nhân khả dĩ nhất là gì?',
      opts: [
        'Cây gốc được dịch thiếu cờ <code>-@</code>',
        'File <code>led.dtbo</code> thiếu <code>/plugin/;</code>',
        'Cây gốc <i>có</i> <code>__symbols__</code>, nhưng node đích của overlay không được dán nhãn nên không có tên trong bảng đó',
        'Overlay và cây gốc dùng số <code>#address-cells</code> khác nhau'
      ],
      a: 2,
      why: 'Phân biệt hai lỗi rất giống nhau: thiếu hẳn <code>-@</code> cho <code>FDT_ERR_BADOFFSET</code> kèm câu nhắc "compile the base blob with \'-@\' option"; còn <code>FDT_ERR_NOTFOUND</code> nghĩa là bảng tên <i>có</i> nhưng <i>thiếu một tên cụ thể</i>. Đúng lỗi đã xảy ra khi soạn bài này: node <code>soc</code> chưa có nhãn, nên <code>__symbols__</code> chỉ liệt kê <code>refclk</code>, <code>uart0</code>, <code>uart1</code>. Cách kiểm tra: đặt <code>__fixups__</code> của overlay cạnh <code>__symbols__</code> của cây gốc.' },

    { q: 'Trong file DTS, cách viết nào tạo ra một <b>chuỗi đường dẫn</b> chứ không phải một cell phandle?',
      opts: [
        '<code>clocks = &lt;&amp;refclk&gt;;</code>',
        '<code>serial0 = &amp;uart0;</code>',
        '<code>interrupt-parent = &lt;&amp;gic&gt;;</code>',
        'Cả ba đều tạo ra phandle'
      ],
      a: 1,
      why: 'Dấu ngoặc nhọn mới là thứ quyết định, không phải dấu <code>&amp;</code>. Nằm <i>trong</i> <code>&lt;&gt;</code> thì <code>&amp;label</code> thành một cell phandle; nằm <i>ngoài</i> thì thành chuỗi đường dẫn đầy đủ. Bạn đã thấy tận mắt ở bước 2: <code>serial0 = &amp;uart0;</code> dịch ra thành <code>serial0 = "/soc/serial@1010c000";</code>. Lý do là hai loại người đọc khác nhau — driver tra phandle rất nhanh, còn code khởi động sớm chỉ cần một đường dẫn đọc được.' },

    { q: 'Bạn dịch tay một file <code>.dts</code> của kernel bằng <code>cpp</code> rồi <code>dtc</code>, nhưng file <code>.dtb</code> thu được nhỏ hơn file mà kernel tự build khoảng 6 KB. Nghi ngờ hợp lý nhất?',
      opts: [
        'Cây kernel của bạn đã bị hỏng, cần <code>make mrproper</code>',
        'Bạn quên một cờ — nhiều khả năng là <code>-@</code>, vì cấu hình có <code>CONFIG_OF_OVERLAY=y</code>',
        'Phiên bản <code>dtc</code> hệ thống khác phiên bản <code>dtc</code> trong cây kernel',
        '<code>cpp</code> đã bỏ sót vài file include'
      ],
      a: 1,
      why: 'Chênh lệch <i>chỉ</i> ở kích thước, với nội dung phần cứng giống nhau, là dấu hiệu kinh điển của node <code>__symbols__</code> bị thiếu — đúng 5 998 byte ở bo Raspberry Pi 3. Khi <code>CONFIG_OF_OVERLAY=y</code>, Makefile của kernel tự thêm <code>-@</code>, còn dòng lệnh của bạn thì không. Bằng chứng dứt điểm là <code>sha256sum</code>: thêm <code>-@</code> vào và hai chuỗi băm trùng nhau từng ký tự, đúng như bước 6 đã chứng minh. Và tuyệt đối đừng chạy <code>make mrproper</code> — cây <code>~/bai38</code> là thứ các chặng sau còn dùng.' }
  ]
});

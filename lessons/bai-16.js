/* Bài 16 — Make và Makefile */
Lesson.register({
  id: 'bai-16',
  title: 'Make và Makefile',
  minutes: 50,
  practice: 'Thực hành 35 phút',
  level: 'Trung cấp',

  intro:
    'Ở Bài 15 bạn gõ tay hai lệnh <code>gcc -c</code> rồi một lệnh liên kết. Với ba file thì ' +
    'còn chịu được. Trong bài này bạn sẽ dựng một dự án <b>60 file</b> và đo: build đầy đủ mất ' +
    '<b>1,535 giây</b>, còn sửa một file rồi build lại chỉ mất <b>0,187 giây</b> — nhanh hơn ' +
    '<b>8,2 lần</b>. Với kernel Linux, cùng tỉ lệ ấy là khác biệt giữa <i>đi uống cà phê</i> và ' +
    '<i>bấm build rồi xem kết quả ngay</i>. Công cụ tạo ra khác biệt đó tên là <b>make</b>, và ' +
    'nó chỉ biết làm đúng một việc: <b>so sánh thời gian sửa file</b>. Toàn bộ sức mạnh lẫn ' +
    'toàn bộ cạm bẫy của nó đều bắt nguồn từ câu vừa rồi.',

  goals: [
    'Viết được Makefile cho một dự án nhiều file, có <code>clean</code> và <code>.PHONY</code>',
    'Giải thích được vì sao <code>make</code> so thời gian sửa file chứ không so nội dung, và hậu quả của lựa chọn đó',
    'Dùng thành thạo biến, biến tự động <code>$@ $&lt; $^</code> và pattern rule <code>%.o: %.c</code>',
    'Chẩn đoán được ba lỗi Makefile phổ biến nhất: <code>missing separator</code>, <code>No rule to make target</code>, và object cũ không được biên dịch lại',
    'Sinh phụ thuộc header tự động bằng <code>-MMD -MP</code> và giải thích file <code>.d</code> chứa gì',
    'Đọc hiểu được các quy ước trong Makefile của kernel: <code>obj-y</code>, <code>V=1</code>, <code>$(MAKE) -C</code>'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. VÌ SAO CẦN MAKE
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Vấn đề mà make sinh ra để giải' },

    { t: 'p', x:
      'Bài 15 cho bạn một hiểu biết then chốt: <b>mỗi file <code>.c</code> được biên dịch độc ' +
      'lập</b> thành một file <code>.o</code>, rồi mới ghép lại. Điều đó có một hệ quả rất ' +
      'thực dụng — nếu bạn chỉ sửa <b>một</b> file <code>.c</code>, thì chỉ <b>một</b> file ' +
      '<code>.o</code> cần được làm lại. Ba mươi chín file kia vẫn còn nguyên giá trị.' },

    { t: 'p', x:
      'Nhưng con người thì không giỏi nhớ chuyện đó. Sau nửa giờ sửa code, bạn không còn chắc ' +
      'file nào đã đổi, file nào chưa. Cách an toàn duy nhất mà một người làm được là ' +
      '<b>biên dịch lại tất cả</b> — và trả giá bằng thời gian.' },

    { t: 'p', x:
      'Đây là số đo thật trên máy bạn, với một dự án <b>60 file <code>.c</code></b> nhỏ ' +
      '(bạn sẽ tự dựng lại ở phần thực hành):' },

    { t: 'table',
      head: ['Việc', 'Thời gian đo được', 'So với build đầy đủ'],
      rows: [
        ['Build đầy đủ, một tiến trình (<code>make</code>)', '<b>1,535 s</b>', '—'],
        ['Sửa <b>một</b> file rồi <code>make</code>', '<b>0,187 s</b>', 'nhanh hơn <b>8,2 lần</b>'],
        ['Không sửa gì, chạy <code>make</code>', '<b>0,004 s</b>', 'nhanh hơn <b>384 lần</b>'],
        ['Build đầy đủ, 6 tiến trình (<code>make -j6</code>)', '<b>0,555 s</b>', 'nhanh hơn <b>2,8 lần</b>']
      ]},

    { t: 'cal', kind: 'why', title: 'Hai cách tăng tốc, đừng nhầm lẫn chúng', x:
      '<p>Bảng trên chứa <b>hai</b> kỹ thuật khác hẳn nhau.</p>' +
      '<p><b>Build tăng dần</b> (dòng 2 và 3) — làm <i>ít việc hơn</i>. Đây là đóng góp chính ' +
      'của <code>make</code>, và nó tiết kiệm <b>8,2 lần</b>.</p>' +
      '<p><b>Build song song</b> <code>-j6</code> (dòng 4) — làm <i>cùng lượng việc</i> nhưng ' +
      'trên 6 lõi cùng lúc. Tiết kiệm <b>2,8 lần</b> trên máy 6 CPU của bạn.</p>' +
      '<p>Chú ý 2,8 chứ không phải 6: bước liên kết cuối cùng không song song được, và các ' +
      'tiến trình còn tranh nhau ổ đĩa. Đây là lý do bạn nên nhớ tỉ lệ <b>2,8 trên 6</b> này — trong ' +
      'thực tế, tăng <code>-j</code> lên gấp đôi <b>không</b> làm build nhanh gấp đôi.</p>' +
      '<p>Hai kỹ thuật này <b>nhân</b> với nhau, không thay thế nhau. Ở <b>Chặng 07</b> khi ' +
      'build kernel, bạn sẽ dùng cả hai.</p>' },

    { t: 'fig',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="So sánh biên dịch lại toàn bộ 60 file với biên dịch lại đúng một file">' +
        '<text class="d-t" x="20" y="24">Sua 1 dong trong mod7.c — sau do lam gi?</text>' +

        '<rect class="d-box-w" x="20" y="44" width="320" height="86" rx="8"/>' +
        '<text class="d-t" x="180" y="68" text-anchor="middle">Bang tay: bien dich lai tat ca</text>' +
        '<text class="d-ts" x="180" y="88" text-anchor="middle">60 lan chay gcc + 1 lan lien ket</text>' +
        '<text class="d-t" x="180" y="114" text-anchor="middle">1,535 s</text>' +

        '<rect class="d-box-g" x="380" y="44" width="320" height="86" rx="8"/>' +
        '<text class="d-t" x="540" y="68" text-anchor="middle">make: chi lam phan da cu</text>' +
        '<text class="d-ts" x="540" y="88" text-anchor="middle">1 lan chay gcc + 1 lan lien ket</text>' +
        '<text class="d-t" x="540" y="114" text-anchor="middle">0,187 s</text>' +

        '<line class="d-line" x1="340" y1="87" x2="374" y2="87"/>' +
        '<path class="d-arrow" d="M374 87 l-8 -4 v8 z"/>' +

        '<rect class="d-box" x="20" y="150" width="680" height="80" rx="8"/>' +
        '<text class="d-t" x="40" y="176">make lam duoc dieu do bang dung mot phep so sanh:</text>' +
        '<text class="d-tm" x="40" y="202">mod7.o cu hon mod7.c ?  -&gt; chay lai gcc</text>' +
        '<text class="d-tm" x="40" y="220">mod7.o moi hon mod7.c ? -&gt; bo qua</text>' +
        '</svg>',
      cap:
        'Toàn bộ giá trị của make nằm ở phép so sánh hai dòng cuối. Không có trí tuệ nào ở ' +
        'đây — chỉ là so hai con dấu thời gian.' },

    /* ══════════════════════════════════════════════
       2. BA THÀNH PHẦN CỦA MỘT QUY TẮC
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Một quy tắc gồm đúng ba phần' },

    { t: 'p', x:
      'File <code>Makefile</code> là một danh sách <b>quy tắc</b> (rule). Mỗi quy tắc trả lời ' +
      'ba câu hỏi: <b>làm ra cái gì</b>, <b>cần có sẵn những gì</b>, và <b>làm bằng cách nào</b>.' },

    { t: 'fig',
      svg:
        '<svg viewBox="0 0 720 210" width="720" role="img" aria-label="Giải phẫu một quy tắc make gồm mục tiêu, điều kiện tiên quyết và công thức">' +
        '<rect class="d-box" x="20" y="16" width="680" height="76" rx="8"/>' +
        '<text class="d-tm" x="44" y="48">main.o: main.c ops.h print.h</text>' +
        '<text class="d-ts" x="44" y="76">|--TAB--&gt;|</text>' +
        '<text class="d-tm" x="132" y="76">gcc -Wall -c main.c</text>' +

        '<line class="d-line" x1="70" y1="54" x2="70" y2="110"/>' +
        '<path class="d-arrow" d="M70 110 l-4 -8 h8 z"/>' +
        '<rect class="d-box-p" x="20" y="116" width="180" height="70" rx="6"/>' +
        '<text class="d-t" x="110" y="140" text-anchor="middle">MUC TIEU</text>' +
        '<text class="d-ts" x="110" y="158" text-anchor="middle">target — file se duoc</text>' +
        '<text class="d-ts" x="110" y="174" text-anchor="middle">tao ra hoac cap nhat</text>' +

        '<line class="d-line" x1="240" y1="54" x2="330" y2="110"/>' +
        '<path class="d-arrow" d="M330 110 l-8 -3 l1 8 z"/>' +
        '<rect class="d-box-a" x="215" y="116" width="230" height="70" rx="6"/>' +
        '<text class="d-t" x="330" y="140" text-anchor="middle">DIEU KIEN TIEN QUYET</text>' +
        '<text class="d-ts" x="330" y="158" text-anchor="middle">prerequisite — nhung file ma</text>' +
        '<text class="d-ts" x="330" y="174" text-anchor="middle">muc tieu phu thuoc vao</text>' +

        '<line class="d-line" x1="240" y1="82" x2="570" y2="110"/>' +
        '<path class="d-arrow" d="M570 110 l-8 -2 l0 8 z"/>' +
        '<rect class="d-box-g" x="460" y="116" width="240" height="70" rx="6"/>' +
        '<text class="d-t" x="580" y="140" text-anchor="middle">CONG THUC</text>' +
        '<text class="d-ts" x="580" y="158" text-anchor="middle">recipe — lenh shell chay khi</text>' +
        '<text class="d-ts" x="580" y="174" text-anchor="middle">muc tieu cu hon tien quyet</text>' +
        '</svg>',
      cap:
        'Ba phần, và một chi tiết chết người: dòng công thức phải bắt đầu bằng ký tự TAB thật, ' +
        'không phải dấu cách.' },

    { t: 'code', where: 'file', name: 'Makefile — dạng sơ khai nhất', code:
      'program: main.o ops.o print.o\n' +
      '\tgcc -o program main.o ops.o print.o\n' +
      '\n' +
      'main.o: main.c ops.h print.h\n' +
      '\tgcc -Wall -c main.c\n' +
      '\n' +
      'ops.o: ops.c ops.h\n' +
      '\tgcc -Wall -c ops.c\n' +
      '\n' +
      'print.o: print.c print.h\n' +
      '\tgcc -Wall -c print.c\n' +
      '\n' +
      'clean:\n' +
      '\trm -f program main.o ops.o print.o',
      notes: [
        'Chín dòng lệnh, bốn quy tắc. Mục tiêu đầu tiên trong file — ở đây là ' +
        '<code>program</code> — là mục tiêu <b>mặc định</b>: gõ <code>make</code> không kèm ' +
        'tham số thì nó làm mục tiêu này.'
      ] },

    { t: 'cal', kind: 'danger', title: 'TAB, không phải dấu cách. Đây là lỗi số một của người mới', x:
      '<p>Mọi dòng công thức <b>phải</b> bắt đầu bằng một ký tự TAB. Bốn dấu cách nhìn giống hệt ' +
      'trên màn hình nhưng <code>make</code> từ chối thẳng:</p>' +
      '<p><code>Makefile:2: *** missing separator.  Stop.</code></p>' +
      '<p>Thông báo này khó hiểu vì nó không hề nhắc tới chữ "tab". Hãy nhớ luôn: ' +
      '<b>missing separator = bạn dùng dấu cách ở đầu dòng công thức</b>.</p>' +
      '<p>Cách kiểm tra chắc chắn: <code>cat -A Makefile</code>. Ký tự TAB hiện ra là ' +
      '<code>^I</code>. Nếu bạn thấy khoảng trắng thường thay vì <code>^I</code>, đó là thủ ' +
      'phạm.</p>' +
      '<p>Trong trình soạn thảo, nhớ tắt "chuyển tab thành dấu cách" cho file Makefile. VS Code ' +
      'nhận diện Makefile và tự làm đúng; <code>nano</code> thì cần <code>-T 8</code> và ' +
      'không bật <code>--tabstospaces</code>.</p>' },

    { t: 'p', x: 'Chạy lần đầu, <code>make</code> làm cả bốn việc:' },

    { t: 'code', where: 'out', nocopy: true, code:
      'gcc -Wall -c main.c\n' +
      'gcc -Wall -c ops.c\n' +
      'gcc -Wall -c print.c\n' +
      'gcc -o program main.o ops.o print.o' },

    { t: 'p', x: 'Chạy lại ngay lập tức, nó không làm gì cả:' },

    { t: 'code', where: 'out', nocopy: true, code:
      'make: \'program\' is up to date.' },

    { t: 'cal', kind: 'info', title: 'make in ra chính lệnh nó chạy — và đó là tính năng', x:
      '<p>Mặc định <code>make</code> <b>vọng lại</b> từng lệnh trước khi thực thi. Nhờ vậy bạn ' +
      'luôn đọc được cờ nào đã được truyền, thứ tự nào đã diễn ra.</p>' +
      '<p>Khi build một dự án lạ và gặp lỗi biên dịch, dòng <code>gcc …</code> mà ' +
      '<code>make</code> in ra chính là thứ bạn cần copy để chạy tay và mổ xẻ.</p>' +
      '<p>Đặt dấu <code>@</code> ở đầu dòng công thức thì lệnh đó không bị vọng lại. Kernel ' +
      'Linux dùng kỹ thuật này để in <code>  CC      fs/read_write.o</code> gọn gàng thay vì ' +
      'dòng <code>gcc</code> dài hai trăm ký tự — bạn sẽ dựng lại đúng cơ chế đó ở bước 6.</p>' },

    /* ══════════════════════════════════════════════
       3. MAKE QUYẾT ĐỊNH THẾ NÀO
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'make quyết định bằng đồng hồ, không bằng nội dung' },

    { t: 'p', x:
      'Khi bạn gõ <code>make</code>, nó dựng một <b>đồ thị phụ thuộc</b> từ các quy tắc, rồi ' +
      'duyệt từ dưới lên. Với mỗi mục tiêu, luật quyết định chỉ có một câu:' },

    { t: 'cal', kind: 'why', title: 'Luật duy nhất', x:
      '<p><b>Nếu mục tiêu không tồn tại, hoặc có ít nhất một điều kiện tiên quyết <i>mới hơn</i> ' +
      'mục tiêu, thì chạy công thức. Ngược lại thì bỏ qua.</b></p>' +
      '<p>"Mới hơn" ở đây là so <b>thời gian sửa file</b> (mtime) mà bạn đã gặp ở Bài 6 với ' +
      '<code>ls -l</code> và <code>stat</code>. <code>make</code> <b>không</b> đọc nội dung ' +
      'file, <b>không</b> tính mã băm, <b>không</b> biết bạn đã sửa gì.</p>' +
      '<p>Lựa chọn này có lý do: so hai con số 64-bit tốn vài nano giây, còn đọc và băm 60 file ' +
      'thì tốn hàng chục mili giây. Đó là vì sao <code>make</code> không việc gì mất ' +
      '<b>0,004 s</b> khi không có gì thay đổi.</p>' +
      '<p>Nhưng cái giá phải trả rất cụ thể, và bạn sẽ tự tay gây ra nó ở bước 4: nếu quy tắc ' +
      '<b>không khai báo</b> một phụ thuộc, <code>make</code> sẽ không bao giờ biết tới nó.</p>' },

    { t: 'fig',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Đồ thị phụ thuộc của dự án ba file, từ mã nguồn và header tới file thực thi">' +
        '<text class="d-ts" x="20" y="20">nguon</text>' +
        '<text class="d-ts" x="290" y="20">doi tuong</text>' +
        '<text class="d-ts" x="560" y="20">ket qua</text>' +

        '<rect class="d-box-a" x="20" y="32" width="150" height="38" rx="6"/>' +
        '<text class="d-tm" x="95" y="56" text-anchor="middle">main.c</text>' +
        '<rect class="d-box-a" x="20" y="86" width="150" height="38" rx="6"/>' +
        '<text class="d-tm" x="95" y="110" text-anchor="middle">ops.c</text>' +
        '<rect class="d-box-a" x="20" y="140" width="150" height="38" rx="6"/>' +
        '<text class="d-tm" x="95" y="164" text-anchor="middle">print.c</text>' +
        '<rect class="d-box-w" x="20" y="200" width="150" height="38" rx="6"/>' +
        '<text class="d-tm" x="95" y="224" text-anchor="middle">ops.h</text>' +
        '<rect class="d-box-w" x="20" y="248" width="150" height="38" rx="6"/>' +
        '<text class="d-tm" x="95" y="272" text-anchor="middle">print.h</text>' +

        '<line class="d-line" x1="170" y1="51" x2="286" y2="51"/>' +
        '<path class="d-arrow" d="M286 51 l-8 -4 v8 z"/>' +
        '<line class="d-line" x1="170" y1="105" x2="286" y2="105"/>' +
        '<path class="d-arrow" d="M286 105 l-8 -4 v8 z"/>' +
        '<line class="d-line" x1="170" y1="159" x2="286" y2="159"/>' +
        '<path class="d-arrow" d="M286 159 l-8 -4 v8 z"/>' +
        '<line class="d-line" x1="170" y1="215" x2="286" y2="60"/>' +
        '<path class="d-arrow" d="M286 60 l-6 7 l-2 -8 z"/>' +
        '<line class="d-line" x1="170" y1="219" x2="286" y2="112"/>' +
        '<path class="d-arrow" d="M286 112 l-7 5 l-1 -8 z"/>' +
        '<line class="d-line" x1="170" y1="262" x2="286" y2="68"/>' +
        '<path class="d-arrow" d="M286 68 l-5 8 l-3 -7 z"/>' +
        '<line class="d-line" x1="170" y1="266" x2="286" y2="168"/>' +
        '<path class="d-arrow" d="M286 168 l-7 5 l-1 -8 z"/>' +

        '<rect class="d-box" x="292" y="32" width="150" height="38" rx="6"/>' +
        '<text class="d-tm" x="367" y="56" text-anchor="middle">main.o</text>' +
        '<rect class="d-box" x="292" y="86" width="150" height="38" rx="6"/>' +
        '<text class="d-tm" x="367" y="110" text-anchor="middle">ops.o</text>' +
        '<rect class="d-box" x="292" y="140" width="150" height="38" rx="6"/>' +
        '<text class="d-tm" x="367" y="164" text-anchor="middle">print.o</text>' +

        '<line class="d-line" x1="442" y1="51" x2="556" y2="98"/>' +
        '<path class="d-arrow" d="M556 98 l-8 -1 l1 8 z"/>' +
        '<line class="d-line" x1="442" y1="105" x2="556" y2="105"/>' +
        '<path class="d-arrow" d="M556 105 l-8 -4 v8 z"/>' +
        '<line class="d-line" x1="442" y1="159" x2="556" y2="112"/>' +
        '<path class="d-arrow" d="M556 112 l-7 -5 l-1 8 z"/>' +

        '<rect class="d-box-p" x="562" y="86" width="138" height="38" rx="6"/>' +
        '<text class="d-tm" x="631" y="110" text-anchor="middle">program</text>' +

        '<text class="d-ts" x="292" y="212">Sua ops.h -&gt; main.o va ops.o cu hon no</text>' +
        '<text class="d-ts" x="292" y="230">-&gt; hai file nay bien dich lai</text>' +
        '<text class="d-ts" x="292" y="252">-&gt; program gio cu hon chung</text>' +
        '<text class="d-ts" x="292" y="270">-&gt; lien ket lai. print.o KHONG bi dung toi.</text>' +
        '</svg>',
      cap:
        'Sửa một header lan truyền lên trên theo đúng các mũi tên đã khai báo — và chỉ theo ' +
        'những mũi tên đã khai báo.' },

    { t: 'p', x:
      'Đây là bằng chứng thật: sau khi build xong, chỉ cần <code>touch ops.h</code> (đổi thời ' +
      'gian sửa mà không đổi nội dung) rồi chạy lại <code>make</code>:' },

    { t: 'code', where: 'out', nocopy: true, code:
      'gcc -Wall -c main.c\n' +
      'gcc -Wall -c ops.c\n' +
      'gcc -o program main.o ops.o print.o' },

    { t: 'cal', kind: 'info', title: 'print.o vắng mặt — đó chính là điều đáng chú ý', x:
      '<p><code>make</code> biên dịch lại <code>main.o</code> và <code>ops.o</code> vì cả hai ' +
      'khai báo <code>ops.h</code> là điều kiện tiên quyết. <code>print.o</code> thì không, nên ' +
      'nó được để yên.</p>' +
      '<p>Chú ý: nội dung <code>ops.h</code> <b>không hề đổi</b> — <code>touch</code> chỉ đổi ' +
      'đồng hồ. <code>make</code> vẫn build lại. Bằng chứng rõ ràng rằng nó thực sự chỉ nhìn ' +
      'thời gian.</p>' +
      '<p>Điều này cũng giải thích một lỗi kinh điển: chép mã nguồn từ máy khác sang bằng ' +
      '<code>cp</code> thường làm mọi file mang thời gian <i>hiện tại</i>, mới hơn cả file ' +
      '<code>.o</code>, nên toàn bộ dự án bị build lại từ đầu dù không có gì thay đổi.</p>' },

    { t: 'cmdx', cmd: 'make [tùy chọn] [mục tiêu]', title: 'Sáu tùy chọn dùng hằng ngày',
      rows: [
        ['<code>make</code>', 'Làm <b>mục tiêu đầu tiên</b> trong Makefile', 'Vì thế mục tiêu chính luôn được viết lên đầu file'],
        ['<code>make clean</code>', 'Làm đúng mục tiêu tên <code>clean</code>', 'Tên mục tiêu là tham số, không phải lệnh con của make'],
        ['<code>make -n</code>', '<b>In ra</b> các lệnh sẽ chạy nhưng <b>không chạy</b>', 'Cực kỳ hữu ích với Makefile lạ: xem trước nó định làm gì trước khi cho phép'],
        ['<code>make -j6</code>', 'Chạy tối đa 6 công thức <b>song song</b>', 'Đặt bằng số CPU. Máy bạn có 6, xem bằng <code>nproc</code>'],
        ['<code>make -C dir</code>', 'Chuyển sang <code>dir</code> rồi mới chạy', 'Nền tảng của build đa thư mục; kernel dùng liên tục'],
        ['<code>make CFLAGS=-Os</code>', 'Ghi đè biến <code>CFLAGS</code> từ dòng lệnh', 'Ưu tiên cao hơn giá trị đặt trong Makefile — cách chuẩn để đổi cờ tạm thời']
      ]},

    { t: 'cal', kind: 'tip', title: 'make -n là thói quen an toàn nên có', x:
      '<p>Khi tải về một dự án lạ, <code>make -n</code> cho bạn đọc toàn bộ kịch bản trước khi ' +
      'một lệnh nào được thực thi. Một công thức <code>clean</code> viết ẩu kiểu ' +
      '<code>rm -rf $(BUILD_DIR)/</code> — với <code>BUILD_DIR</code> chưa được gán — sẽ trở ' +
      'thành <code>rm -rf /</code>.</p>' +
      '<p>Bạn đã gặp đúng lớp nguy hiểm này ở Bài 13 khi học <code>set -u</code>. Ở đây, ' +
      '<code>make -n</code> đóng vai trò của <code>set -u</code>: nhìn trước khi làm.</p>' },

    /* ══════════════════════════════════════════════
       4. BIẾN, BIẾN TỰ ĐỘNG, PATTERN RULE
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Rút Makefile 15 dòng xuống, mà mạnh hơn' },

    { t: 'p', x:
      'Makefile sơ khai ở trên lặp lại chữ <code>gcc -Wall -c</code> ba lần và liệt kê ' +
      '<code>main.o ops.o print.o</code> hai lần. Thêm file thứ tư là phải sửa ba chỗ. Ba công ' +
      'cụ sau xóa hết sự lặp đó.' },

    { t: 'h3', x: 'Biến' },

    { t: 'p', x:
      'Cú pháp gán là <code>NAME = giá trị</code>, cú pháp dùng là <code>$(NAME)</code>. Có bốn ' +
      'toán tử gán và sự khác nhau giữa hai cái đầu là câu hỏi phỏng vấn kinh điển:' },

    { t: 'table',
      head: ['Toán tử', 'Tên', 'Khi nào giá trị bên phải được tính'],
      rows: [
        ['<code>=</code>', 'Gán trễ (recursive)', '<b>Mỗi lần</b> biến được dùng. Nên nó thấy giá trị <b>cuối cùng</b> của các biến bên trong'],
        ['<code>:=</code>', 'Gán ngay (simple)', '<b>Ngay tại dòng gán</b>, một lần duy nhất. Đây là thứ bạn thường muốn'],
        ['<code>?=</code>', 'Gán nếu chưa có', 'Chỉ gán khi biến còn rỗng — dùng để cho phép người ngoài ghi đè'],
        ['<code>+=</code>', 'Nối thêm', 'Thêm vào cuối, cách bằng một dấu cách']
      ]},

    { t: 'code', where: 'file', name: 'Makefile — thử = và :=', code:
      'A  = hello\n' +
      'B  = $(A) world\n' +
      'A  = bye\n' +
      '\n' +
      'C := hello\n' +
      'D := $(C) world\n' +
      'C := bye\n' +
      '\n' +
      'try:\n' +
      '\t@echo "B (dung =)  = $(B)"\n' +
      '\t@echo "D (dung :=) = $(D)"' },

    { t: 'code', where: 'out', nocopy: true, code:
      'B (dung =)  = bye world\n' +
      'D (dung :=) = hello world' },

    { t: 'cal', kind: 'warn', title: 'Hai dòng này giải thích rất nhiều lỗi build khó hiểu', x:
      '<p><code>B</code> dùng <code>=</code>, nên <code>$(A)</code> chỉ được tra <b>lúc dòng ' +
      'echo chạy</b> — khi đó <code>A</code> đã là <code>bye</code>. Thứ tự các dòng trong ' +
      'Makefile <b>không</b> quyết định kết quả.</p>' +
      '<p><code>D</code> dùng <code>:=</code>, chụp lại giá trị của <code>C</code> ngay tại chỗ, ' +
      'nên vẫn là <code>hello world</code>. Thứ tự <b>có</b> quyết định.</p>' +
      '<p><b>Quy tắc thực dụng:</b> mặc định dùng <code>:=</code>. Nó dễ đoán và nhanh hơn ' +
      '(không tính lại mỗi lần dùng). Chỉ dùng <code>=</code> khi bạn <i>cố ý</i> muốn giá trị ' +
      'được tính muộn — ví dụ biến tham chiếu tới thứ được định nghĩa ở file khác include sau.</p>' +
      '<p>Kernel Linux dùng cả hai và rất kỹ tính về việc chọn cái nào — đó là lý do bạn hay ' +
      'thấy <code>:=</code> trong <code>Makefile</code> gốc và <code>+=</code> trong các ' +
      '<code>Makefile</code> con.</p>' },

    { t: 'h3', x: 'Biến tự động' },

    { t: 'p', x:
      '<code>make</code> tự đặt sẵn một nhóm biến bên trong mỗi công thức, mô tả chính quy tắc ' +
      'đang chạy. Chúng làm cho một công thức có thể phục vụ mọi file.' },

    { t: 'table',
      head: ['Biến', 'Nghĩa', 'Trong quy tắc <code>main.o: main.c ops.h print.h</code>'],
      rows: [
        ['<code>$@</code>', '<b>Mục tiêu</b> đang được làm', '<code>main.o</code>'],
        ['<code>$&lt;</code>', 'Điều kiện tiên quyết <b>đầu tiên</b>', '<code>main.c</code>'],
        ['<code>$^</code>', '<b>Tất cả</b> tiên quyết, bỏ trùng lặp', '<code>main.c ops.h print.h</code>'],
        ['<code>$?</code>', 'Chỉ những tiên quyết <b>mới hơn</b> mục tiêu', 'thay đổi theo từng lần chạy'],
        ['<code>$*</code>', 'Phần khớp với dấu <code>%</code> trong pattern rule', '<code>main</code>']
      ]},

    { t: 'cal', kind: 'tip', title: 'Mẹo nhớ $@ và $<', x:
      '<p><code>$@</code> — dấu <b>a</b>-còng, chữ <b>a</b> như <i>aim</i>, cái đích bạn nhắm ' +
      'tới. Đó là <b>đầu ra</b>.</p>' +
      '<p><code>$&lt;</code> — mũi tên <b>chỉ vào trong</b>, như dấu chuyển hướng nhập của shell ' +
      'ở Bài 10. Đó là <b>đầu vào</b>.</p>' +
      '<p>Hai cái này chiếm hơn 90% số lần bạn dùng biến tự động. <code>$^</code> gần như chỉ ' +
      'xuất hiện ở dòng liên kết.</p>' },

    { t: 'h3', x: 'Pattern rule' },

    { t: 'p', x:
      'Ba quy tắc <code>main.o</code>, <code>ops.o</code>, <code>print.o</code> có cùng một ' +
      'hình dạng. Dấu <code>%</code> gộp chúng thành một: "bất kỳ file <code>.o</code> nào cũng ' +
      'làm được từ file <code>.c</code> cùng tên, theo cách này".' },

    { t: 'code', where: 'file', name: 'Makefile — bản rút gọn, 15 dòng', code:
      'CC      = gcc\n' +
      'CFLAGS  = -Wall -Wextra -O2\n' +
      'OBJS    = main.o ops.o print.o\n' +
      'TARGET  = program\n' +
      '\n' +
      '$(TARGET): $(OBJS)\n' +
      '\t$(CC) $(CFLAGS) -o $@ $^\n' +
      '\n' +
      '%.o: %.c\n' +
      '\t$(CC) $(CFLAGS) -c $< -o $@\n' +
      '\n' +
      'clean:\n' +
      '\trm -f $(TARGET) $(OBJS)\n' +
      '\n' +
      '.PHONY: clean',
      notes: [
        'Thêm file <code>irq.c</code> vào dự án giờ chỉ cần sửa <b>một</b> chỗ: thêm ' +
        '<code>irq.o</code> vào <code>OBJS</code>. Pattern rule tự lo phần còn lại.'
      ] },

    { t: 'code', where: 'out', nocopy: true, code:
      'gcc -Wall -Wextra -O2 -c main.c -o main.o\n' +
      'gcc -Wall -Wextra -O2 -c ops.c -o ops.o\n' +
      'gcc -Wall -Wextra -O2 -c print.c -o print.o\n' +
      'gcc -Wall -Wextra -O2 -o program main.o ops.o print.o' },

    { t: 'cal', kind: 'info', title: 'Đọc ngược output để hiểu biến tự động', x:
      '<p>Ba dòng đầu: <code>$&lt;</code> đã thành <code>main.c</code>/<code>ops.c</code>' +
      '/<code>print.c</code>, <code>$@</code> thành <code>main.o</code>/…</p>' +
      '<p>Dòng cuối: <code>$@</code> là <code>program</code>, còn <code>$^</code> bung ra ' +
      'trọn ba file <code>.o</code>. Nếu ở đó bạn viết nhầm <code>$&lt;</code> thay ' +
      '<code>$^</code>, chỉ <code>main.o</code> được liên kết và bạn nhận ' +
      '<code>undefined reference to \'add\'</code> — đúng lỗi Bài 15 đã mổ xẻ.</p>' },

    { t: 'h3', x: 'Hàm xử lý danh sách' },

    { t: 'p', x:
      'Khi số file lớn, liệt kê tay cũng phiền. <code>make</code> có sẵn các hàm biến đổi ' +
      'danh sách. Đây là output thật của một Makefile chỉ để thử chúng, với ' +
      '<code>SRCS = main.c driver/gpio.c driver/uart.c</code>:' },

    { t: 'code', where: 'out', nocopy: true, code:
      'patsubst : main.o driver/gpio.o driver/uart.o\n' +
      'suffix   : main.o driver/gpio.o driver/uart.o\n' +
      'notdir   : main.c gpio.c uart.c\n' +
      'dir      : ./ driver/ driver/\n' +
      'addprefix: build/main.o build/gpio.o build/uart.o\n' +
      'words    : 3\n' +
      'shell    : parse-time-shell' },

    { t: 'cmdx', cmd: 'Các hàm sinh ra bảy dòng trên', title: 'Bảy hàm đủ dùng cho 95% Makefile',
      rows: [
        ['<code>$(wildcard *.c)</code>', 'Liệt kê file có thật trong thư mục', 'Tiện nhưng nguy hiểm: file mới thêm sẽ tự vào build mà bạn không hay'],
        ['<code>$(patsubst %.c,%.o,$(SRCS))</code>', 'Thay theo mẫu', 'Dạng tổng quát nhất'],
        ['<code>$(SRCS:.c=.o)</code>', 'Viết tắt của dòng trên', 'Dạng hay gặp nhất trong Makefile thật'],
        ['<code>$(notdir …)</code> / <code>$(dir …)</code>', 'Tách tên file / tách đường dẫn', 'Cặp đôi để chuyển file <code>.o</code> sang thư mục build riêng'],
        ['<code>$(addprefix build/,…)</code>', 'Thêm tiền tố vào mọi phần tử', 'Cách chuẩn để không rải file <code>.o</code> lẫn vào mã nguồn'],
        ['<code>$(words …)</code>', 'Đếm số phần tử', 'Hữu ích khi in tiến độ'],
        ['<code>$(shell lệnh)</code>', 'Chạy lệnh shell <b>lúc đọc Makefile</b>', 'Chạy <b>trước</b> mọi công thức, và chạy <b>mỗi lần</b> gọi make. Đừng đặt việc nặng vào đây']
      ]},

    /* ══════════════════════════════════════════════
       5. .PHONY
       ══════════════════════════════════════════════ */
    { t: 'h2', x: '.PHONY — khi mục tiêu không phải là một file' },

    { t: 'p', x:
      '<code>clean</code>, <code>all</code>, <code>install</code>, <code>test</code> đều là ' +
      '<b>động từ</b>, không phải file. Nhưng <code>make</code> không biết điều đó — với nó, ' +
      'mọi mục tiêu đều là một tên file. Hãy xem chuyện gì xảy ra khi thư mục tình cờ có một ' +
      'file tên <code>clean</code>:' },

    { t: 'code', where: 'wsl', code:
      'touch clean\n' +
      'make clean' },

    { t: 'code', where: 'out', nocopy: true, code:
      'make: \'clean\' is up to date.' },

    { t: 'cal', kind: 'why', title: 'make làm đúng luật — và vì thế làm sai ý bạn', x:
      '<p>Luật vẫn là luật cũ: mục tiêu <code>clean</code> <b>tồn tại</b>, và nó không có điều ' +
      'kiện tiên quyết nào để mà cũ hơn. Kết luận: không cần làm gì.</p>' +
      '<p>Công thức <code>rm -f …</code> không hề chạy. File <code>program</code> vẫn còn ' +
      'nguyên. Không có thông báo lỗi nào — đây là loại hỏng hóc <i>im lặng</i>, khó chịu nhất.</p>' +
      '<p>Khai báo <code>.PHONY: clean</code> nói với <code>make</code>: "<code>clean</code> ' +
      'không bao giờ là một file, đừng đi tìm nó, cứ chạy công thức". Sau khi thêm dòng đó, ' +
      'kết quả đúng như mong đợi:</p>' },

    { t: 'code', where: 'out', nocopy: true, code:
      'rm -f program main.o ops.o print.o' },

    { t: 'cal', kind: 'tip', title: 'Quy tắc: mọi mục tiêu là động từ đều phải có .PHONY', x:
      '<p>Không chỉ để tránh va tên file. Có <code>.PHONY</code>, <code>make</code> còn ' +
      '<b>bỏ hẳn</b> việc tra cứu 163 quy tắc ngầm cho mục tiêu đó, nên nhanh hơn một chút — ' +
      'điều này thấy rõ trong dự án lớn.</p>' +
      '<p>Cách viết gọn thường gặp: gom một dòng ở cuối file<br>' +
      '<code>.PHONY: all clean install test</code></p>' +
      '<p>Còn <code>all</code> thì để làm gì? Nó là mục tiêu đầu tiên, đóng vai trò "làm mọi ' +
      'thứ", với danh sách tiên quyết là các đích thật: <code>all: program docs</code>.</p>' },

    /* ══════════════════════════════════════════════
       6. QUY TẮC NGẦM
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'make đã biết sẵn 163 quy tắc trước khi bạn viết dòng nào' },

    { t: 'p', x:
      'Trong một thư mục chỉ có <code>hello.c</code> và <b>không hề có Makefile</b>:' },

    { t: 'code', where: 'wsl', code:
      'ls\n' +
      'make hello\n' +
      './hello' },

    { t: 'code', where: 'out', nocopy: true, code:
      'hello.c\n' +
      'cc     hello.c   -o hello\n' +
      'hello' },

    { t: 'p', x:
      'Nó lấy quy tắc đó ở đâu ra? Từ cơ sở dữ liệu dựng sẵn, xem được bằng ' +
      '<code>make -p -f /dev/null</code>:' },

    { t: 'code', where: 'out', nocopy: true, code:
      '%: %.c\n' +
      '#  recipe to execute (built-in):\n' +
      '\t$(LINK.c) $^ $(LOADLIBES) $(LDLIBS) -o $@\n' +
      '\n' +
      'COMPILE.c = $(CC) $(CFLAGS) $(CPPFLAGS) $(TARGET_ARCH) -c\n' +
      'LINK.c = $(CC) $(CFLAGS) $(CPPFLAGS) $(LDFLAGS) $(TARGET_ARCH)\n' +
      'OUTPUT_OPTION = -o $@\n' +
      'CC = cc' },

    { t: 'cal', kind: 'info', title: 'Ba điều rút ra từ bảy dòng này', x:
      '<p><b>Một:</b> quy tắc ngầm được viết bằng đúng cú pháp pattern rule và biến tự động mà ' +
      'bạn vừa học. Không có phép màu nào.</p>' +
      '<p><b>Hai:</b> biến mặc định là <code>CC = cc</code>, và <code>CFLAGS</code> ' +
      '<b>rỗng</b> — không <code>-Wall</code>, không <code>-O2</code>. Vì thế build bằng quy ' +
      'tắc ngầm không có cảnh báo nào cả. Luôn tự đặt <code>CFLAGS</code>.</p>' +
      '<p><b>Ba:</b> đếm bằng <code>make -p -f /dev/null | grep -c \'^[%.][^ ]*:\'</code> cho ' +
      '<b>163</b> quy tắc dựng sẵn, phủ cả Fortran, Pascal, Lex, Yacc và RCS. Phần lớn là di ' +
      'sản của thập niên 1980.</p>' +
      '<p>Trong dự án thật, quy tắc ngầm là <b>nguồn gây bối rối</b> nhiều hơn là tiện lợi — ' +
      'khi Makefile của bạn thiếu một quy tắc, <code>make</code> lặng lẽ dùng quy tắc ngầm với ' +
      'cờ sai. Kernel Linux tắt hẳn chúng bằng <code>MAKEFLAGS += -r</code>.</p>' },

    /* ══════════════════════════════════════════════
       7. CÁI BẪY PHỤ THUỘC HEADER
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Cái bẫy lớn nhất: phụ thuộc header' },

    { t: 'p', x:
      'Bản Makefile rút gọn đẹp hơn hẳn bản sơ khai — nhưng nó đã <b>đánh mất</b> một thứ. ' +
      'Pattern rule <code>%.o: %.c</code> chỉ khai báo <b>một</b> điều kiện tiên quyết: file ' +
      '<code>.c</code>. Không còn dòng nào nhắc tới <code>ops.h</code> nữa.' },

    { t: 'p', x:
      'Hậu quả không phải lý thuyết. Đây là một phiên chạy thật. File <code>ops.h</code> chứa ' +
      '<code>#define FACTOR 1</code> và <code>ops.c</code> tính ' +
      '<code>return (a + b) * FACTOR;</code>:' },

    { t: 'code', where: 'wsl', code:
      'make clean && make\n' +
      './program\n' +
      'sed -i \'s/#define FACTOR 1/#define FACTOR 10/\' ops.h\n' +
      'make\n' +
      './program' },

    { t: 'code', where: 'out', nocopy: true, code:
      'add(2,3) = 5\n' +
      'subtract(9,4) = 5\n' +
      'make: \'program\' is up to date.\n' +
      'add(2,3) = 5\n' +
      'subtract(9,4) = 5' },

    { t: 'cal', kind: 'danger', title: 'Bạn vừa sửa mã nguồn và chương trình vẫn chạy mã cũ', x:
      '<p>Hằng số đã đổi từ 1 thành 10. Chương trình phải in <code>50</code>. Nó in ' +
      '<code>5</code>. Và <code>make</code> báo <i>up to date</i> — không lỗi, không cảnh báo.</p>' +
      '<p>Ép build lại từ đầu bằng <code>make clean &amp;&amp; make</code> thì ra ' +
      '<code>50</code> ngay. Nghĩa là mã nguồn của bạn <b>đúng</b>; chỉ có hệ thống build là ' +
      'nói dối.</p>' +
      '<p><b>Vì sao đây là lỗi tốn thời gian nhất trong nghề embedded:</b> triệu chứng là "tôi ' +
      'sửa rồi mà nó không có tác dụng". Bạn sẽ nghi mã nguồn, nghi phần cứng, nghi trình gỡ ' +
      'lỗi — trong khi thủ phạm là một file <code>.o</code> cũ trên đĩa.</p>' +
      '<p>Dấu hiệu nhận biết: <b>nếu <code>make clean &amp;&amp; make</code> làm vấn đề biến ' +
      'mất, thì vấn đề là ở phụ thuộc, không phải ở code.</b> Hãy ghi câu này vào sổ.</p>' },

    { t: 'p', x:
      'Cách chữa <b>không phải</b> là quay lại liệt kê header bằng tay — với dự án thật, danh ' +
      'sách đó dài, lồng nhau và luôn lạc hậu. Cách chữa là bảo chính trình biên dịch khai báo ' +
      'hộ, vì nó là kẻ duy nhất biết chắc file <code>.c</code> đã đọc những header nào.' },

    { t: 'cmdx', cmd: 'gcc -MMD -MP -c ops.c -o ops.o', title: 'Hai cờ sinh phụ thuộc tự động',
      rows: [
        ['<code>-MD</code>', 'Vừa biên dịch bình thường, vừa ghi ra file <code>.d</code> chứa danh sách phụ thuộc', 'Khác với <code>-M</code> (chỉ in phụ thuộc, <b>không</b> biên dịch)'],
        ['<code>-MMD</code>', 'Như <code>-MD</code> nhưng <b>bỏ qua header hệ thống</b>', 'Đây là cái bạn muốn: <code>stdio.h</code> gần như không bao giờ đổi, đưa vào chỉ làm file <code>.d</code> phình ra'],
        ['<code>-MP</code>', 'Thêm một mục tiêu giả <b>rỗng</b> cho mỗi header', 'Chống lỗi khi bạn <b>xóa</b> một header — xem callout bên dưới'],
        ['<code>-include $(DEPS)</code>', 'Trong Makefile: nạp các file <code>.d</code>', 'Dấu gạch đầu nghĩa là "không sao nếu file chưa tồn tại" — lần build đầu tiên chưa có file <code>.d</code> nào']
      ]},

    { t: 'code', where: 'file', name: 'Makefile — bản hoàn chỉnh, có phụ thuộc tự động', code:
      'CC      = gcc\n' +
      'CFLAGS  = -Wall -Wextra -O2 -MMD -MP\n' +
      'OBJS    = main.o ops.o print.o\n' +
      'DEPS    = $(OBJS:.o=.d)\n' +
      'TARGET  = program\n' +
      '\n' +
      '$(TARGET): $(OBJS)\n' +
      '\t$(CC) $(CFLAGS) -o $@ $^\n' +
      '\n' +
      '%.o: %.c\n' +
      '\t$(CC) $(CFLAGS) -c $< -o $@\n' +
      '\n' +
      'clean:\n' +
      '\trm -f $(TARGET) $(OBJS) $(DEPS)\n' +
      '\n' +
      '-include $(DEPS)\n' +
      '\n' +
      '.PHONY: clean' },

    { t: 'p', x: 'Sau khi build, mỗi file <code>.o</code> có một file <code>.d</code> đi kèm:' },

    { t: 'code', where: 'wsl', code: 'cat main.d' },

    { t: 'code', where: 'out', nocopy: true, code:
      'main.o: main.c ops.h print.h\n' +
      'ops.h:\n' +
      'print.h:' },

    { t: 'cal', kind: 'why', title: 'File .d là một mẩu Makefile — không hơn không kém', x:
      '<p>Dòng đầu chính là quy tắc mà bạn đã viết tay ở bản sơ khai: ' +
      '<code>main.o: main.c ops.h print.h</code>. Chỉ khác là lần này <b>trình biên dịch</b> ' +
      'viết nó, nên nó không bao giờ sai và không bao giờ lạc hậu.</p>' +
      '<p><code>-include $(DEPS)</code> dán những dòng đó vào Makefile. <code>make</code> gộp ' +
      'chúng với pattern rule, và phụ thuộc header sống lại.</p>' +
      '<p><b>Hai dòng <code>ops.h:</code> và <code>print.h:</code> rỗng là do <code>-MP</code>.</b> ' +
      'Chúng nói "có một quy tắc làm ra <code>ops.h</code>, và nó chẳng cần làm gì". Vì sao cần? ' +
      'Giả sử bạn <b>xóa</b> <code>print.h</code> và sửa code cho hết dùng nó. File ' +
      '<code>.d</code> cũ vẫn đòi <code>print.h</code>, và <code>make</code> sẽ chết với ' +
      '<code>No rule to make target \'print.h\'</code>. Mục tiêu giả rỗng chặn đúng tình huống ' +
      'đó.</p>' +
      '<p>Vòng đời hơi kỳ lạ nhưng hoạt động: build lần đầu chưa có <code>.d</code> nào, nên ' +
      'mọi file được biên dịch — vốn dĩ là đúng. Từ lần thứ hai trở đi, <code>.d</code> đã có ' +
      'và chính xác.</p>' },

    { t: 'p', x:
      'Thử lại đúng kịch bản đã lừa được bản Makefile trước — đổi <code>FACTOR</code> từ 10 ' +
      'thành 100:' },

    { t: 'code', where: 'out', nocopy: true, code:
      'gcc -Wall -Wextra -O2 -MMD -MP -c main.c -o main.o\n' +
      'gcc -Wall -Wextra -O2 -MMD -MP -c ops.c -o ops.o\n' +
      'gcc -Wall -Wextra -O2 -MMD -MP -o program main.o ops.o print.o\n' +
      'add(2,3) = 500\n' +
      'subtract(9,4) = 500' },

    { t: 'cal', kind: 'info', title: 'Hai file được biên dịch lại, một file thì không', x:
      '<p><code>main.o</code> và <code>ops.o</code> cùng đọc <code>ops.h</code> nên cùng phải ' +
      'làm lại. <code>print.o</code> không đọc, nên nó được để yên — <code>make</code> vừa ' +
      '<b>đúng</b> vừa <b>tối thiểu</b>, đúng lúc, không cần bạn khai báo gì.</p>' +
      '<p>Bốn dòng thêm vào Makefile (<code>-MMD -MP</code>, <code>DEPS</code>, ' +
      '<code>-include</code>, và <code>$(DEPS)</code> trong <code>clean</code>) là <b>khoản đầu ' +
      'tư có lãi cao nhất</b> trong cả bài này. Mọi Makefile bạn viết từ nay nên có chúng.</p>' },

    /* ══════════════════════════════════════════════
       8. ĐỌC MAKEFILE KIỂU KERNEL
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Đọc Makefile kiểu kernel' },

    { t: 'p', x:
      'Hệ thống build của kernel Linux tên là <b>Kbuild</b>. Nó là <code>make</code> thuần — ' +
      'không có công cụ nào khác — nhưng dùng bốn quy ước mà bạn cần nhận ra. Ở ' +
      '<b>Chặng 07</b> bạn sẽ build kernel thật; mục này chuẩn bị mắt cho bạn.' },

    { t: 'h3', x: 'Quy ước 1 — danh sách obj-y' },

    { t: 'p', x:
      'Thay vì một biến <code>OBJS</code> khổng lồ, mỗi thư mục con có một Makefile chỉ gồm ' +
      'vài dòng <code>obj-y += name.o</code>. Chữ <code>y</code> là <i>yes</i> — lấy từ ' +
      'cấu hình kernel, nơi mỗi tính năng có giá trị <code>y</code> (dịch vào kernel), ' +
      '<code>m</code> (dịch thành module) hoặc <code>n</code> (bỏ).' },

    { t: 'code', where: 'file', name: 'Makefile — mô phỏng quy ước obj-y', code:
      'obj-y += main.o\n' +
      'obj-y += driver/gpio.o\n' +
      'obj-y += driver/uart.o\n' +
      'obj-y += lib/util.o\n' +
      '\n' +
      'obj-optional-y := yes\n' +
      'ifeq ($(obj-optional-y),yes)\n' +
      '  obj-y += lib/optional.o\n' +
      'endif\n' +
      '\n' +
      'app: $(obj-y)\n' +
      '\t$(CC) $(CFLAGS) -o $@ $^' },

    { t: 'cal', kind: 'why', title: 'Vì sao dùng += chứ không phải một danh sách', x:
      '<p>Với <code>+=</code>, việc bật/tắt một tính năng chỉ là <b>thêm hay không thêm</b> một ' +
      'dòng — như khối <code>ifeq</code> ở trên. Không ai phải sửa một danh sách trung tâm, nên ' +
      'hai người sửa hai driver khác nhau không đụng độ nhau khi trộn nhánh.</p>' +
      '<p>Kernel có hơn mười nghìn tùy chọn cấu hình. Mỗi tùy chọn <code>CONFIG_XYZ</code> trở ' +
      'thành một biến make, và dòng <code>obj-$(CONFIG_XYZ) += xyz.o</code> tự động biến thành ' +
      '<code>obj-y +=</code>, <code>obj-m +=</code> hoặc <code>obj-n +=</code> (bị bỏ qua). ' +
      'Một dòng, ba hành vi, không cần một chữ <code>if</code> nào.</p>' +
      '<p>Đây là mẹo hay nhất trong Kbuild và bạn sẽ thấy nó ở <b>mọi</b> Makefile con của ' +
      'kernel.</p>' },

    { t: 'h3', x: 'Quy ước 2 — V=1 và output gọn' },

    { t: 'p', x:
      'Kernel in <code>  CC      fs/read_write.o</code> thay vì dòng <code>gcc</code> dài hai ' +
      'trăm ký tự. Cơ chế nằm gọn trong sáu dòng:' },

    { t: 'code', where: 'file', name: 'Makefile — công tắc im lặng', code:
      'V ?= 0\n' +
      'ifeq ($(V),1)\n' +
      '  Q =\n' +
      'else\n' +
      '  Q = @\n' +
      'endif\n' +
      '\n' +
      '%.o: %.c\n' +
      '\t$(Q)echo "  CC      $@"\n' +
      '\t$(Q)$(CC) $(CFLAGS) -c $< -o $@' },

    { t: 'code', where: 'wsl', code: 'make' },

    { t: 'code', where: 'out', nocopy: true, code:
      '  CC      main.o\n' +
      '  CC      driver/gpio.o\n' +
      '  CC      driver/uart.o\n' +
      '  CC      lib/util.o\n' +
      '  CC      lib/optional.o\n' +
      '  LD      app' },

    { t: 'code', where: 'wsl', code: 'make clean && make V=1' },

    { t: 'code', where: 'out', nocopy: true, code:
      'echo "  CC      main.o"\n' +
      '  CC      main.o\n' +
      'gcc -Wall -O2 -c main.c -o main.o\n' +
      'echo "  CC      driver/gpio.o"\n' +
      '  CC      driver/gpio.o\n' +
      'gcc -Wall -O2 -c driver/gpio.c -o driver/gpio.o' },

    { t: 'cal', kind: 'tip', title: 'V=1 là điều đầu tiên cần nhớ khi build kernel lỗi', x:
      '<p>Biến <code>Q</code> chứa dấu <code>@</code> khi im lặng và <b>rỗng</b> khi ' +
      '<code>V=1</code>. Dấu <code>@</code> ở đầu công thức tắt việc vọng lệnh — nên ' +
      '<code>$(Q)</code> chính là một công tắc bật/tắt tiếng.</p>' +
      '<p><code>V ?= 0</code> dùng <code>?=</code> đúng chỗ: đặt mặc định nhưng vẫn cho phép ' +
      '<code>make V=1</code> ghi đè từ dòng lệnh.</p>' +
      '<p>Khi build kernel gặp lỗi biên dịch khó hiểu, <code>make V=1</code> cho bạn xem đúng ' +
      'dòng <code>gcc</code> thật — với đủ vài chục cờ <code>-I</code>, ' +
      '<code>-D</code>, <code>-f</code>. Không có nó, bạn chỉ thấy ' +
      '<code>  CC      drivers/gpio/gpio-abc.o</code> và không biết gì thêm.</p>' },

    { t: 'h3', x: 'Quy ước 3 — make đệ quy qua nhiều thư mục' },

    { t: 'code', where: 'file', name: 'Makefile — gọi make trong thư mục con', code:
      'all:\n' +
      '\t$(MAKE) -C sub f.o' },

    { t: 'code', where: 'out', nocopy: true, code:
      'make -C sub f.o\n' +
      'make[1]: Entering directory \'/tmp/proj/sub\'\n' +
      'gcc -c f.c -o f.o\n' +
      'make[1]: Leaving directory \'/tmp/proj/sub\'' },

    { t: 'cal', kind: 'info', title: 'Ba chi tiết trong bốn dòng output này', x:
      '<p><b><code>$(MAKE)</code> chứ không phải <code>make</code>.</b> Biến này giữ đúng đường ' +
      'dẫn tới bản <code>make</code> đang chạy, và quan trọng hơn — nó truyền tiếp ' +
      '<code>-j6</code> xuống các tiến trình con qua một cơ chế gọi là <i>jobserver</i>. Viết ' +
      '<code>make</code> trần thì mỗi thư mục con lại tự chạy 6 tiến trình, và máy bạn nhận ' +
      'hàng chục tiến trình gcc cùng lúc.</p>' +
      '<p><b><code>make[1]</code></b> — số trong ngoặc là <b>độ sâu đệ quy</b>. Khi build kernel ' +
      'bạn sẽ thấy <code>make[2]</code>, <code>make[3]</code>. Đây là manh mối đầu tiên để biết ' +
      'lỗi xảy ra ở tầng nào.</p>' +
      '<p><b><code>Entering directory</code></b> — dòng này tồn tại để trình soạn thảo có thể ' +
      'nhảy tới đúng file khi lỗi được báo bằng đường dẫn tương đối.</p>' },

    { t: 'terms', items: [
      ['Rule', 'quy tắc', 'Một mục tiêu, danh sách tiên quyết và công thức. Đơn vị cơ bản của Makefile'],
      ['Target', 'mục tiêu', 'Thứ được làm ra. Thường là tên file; nếu là động từ thì phải khai báo <code>.PHONY</code>'],
      ['Prerequisite', 'điều kiện tiên quyết', 'File mà mục tiêu phụ thuộc vào. Nếu nó mới hơn mục tiêu thì công thức chạy'],
      ['Recipe', 'công thức', 'Các dòng lệnh shell, mỗi dòng bắt đầu bằng <b>TAB</b>, chạy khi mục tiêu lỗi thời'],
      ['Pattern rule', 'quy tắc mẫu', 'Quy tắc dùng <code>%</code> để phục vụ mọi file cùng dạng, ví dụ <code>%.o: %.c</code>'],
      ['Automatic variable', 'biến tự động', '<code>$@ $&lt; $^ $? $*</code> — make tự đặt trong mỗi công thức'],
      ['Incremental build', 'build tăng dần', 'Chỉ làm lại phần đã lỗi thời. Đo được: <b>0,187 s</b> thay vì <b>1,535 s</b>'],
      ['Jobserver', 'máy chủ công việc', 'Cơ chế make dùng để chia hạn ngạch <code>-j</code> cho các tiến trình make con'],
      ['Kbuild', 'hệ thống build kernel', 'Tập quy ước make của kernel Linux: <code>obj-y</code>, <code>V=1</code>, Makefile mỗi thư mục']
    ]},

    /* ══════════════════════════════════════════════
       9. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: từ Makefile sơ khai tới Makefile dùng được thật' },

    { t: 'p', x:
      'Sáu bước. Bạn sẽ viết Makefile ba lần — mỗi lần sửa một khuyết điểm của lần trước — ' +
      'rồi tự tay gây ra cái bẫy phụ thuộc header và tự chữa nó. Bước 5 đo tốc độ trên dự án ' +
      '60 file.' },

    { t: 'code', where: 'wsl', code: 'mkdir -p ~/bai16 && cd ~/bai16' },

    { t: 'steps', items: [

      /* ─────────── BƯỚC 1 ─────────── */
      { title: 'Bước 1 — Dựng dự án ba file và Makefile sơ khai', blocks: [
        { t: 'p', x:
          'Dự án giống Bài 15 nhưng thêm một mô-đun in ấn, để có ba file <code>.c</code> và hai ' +
          'header — vừa đủ để thấy sự lan truyền phụ thuộc.' },

        { t: 'code', where: 'wsl', name: 'tạo mã nguồn', code:
          'cat > ops.h <<\'EOF\'\n' +
          '#ifndef OPS_H\n' +
          '#define OPS_H\n' +
          '#define FACTOR 1\n' +
          'int add(int a, int b);\n' +
          'int subtract(int a, int b);\n' +
          '#endif\n' +
          'EOF\n' +
          'cat > ops.c <<\'EOF\'\n' +
          '#include "ops.h"\n' +
          'int add(int a, int b) { return (a + b) * FACTOR; }\n' +
          'int subtract(int a, int b)  { return (a - b) * FACTOR; }\n' +
          'EOF\n' +
          'cat > print.h <<\'EOF\'\n' +
          '#ifndef PRINT_H\n' +
          '#define PRINT_H\n' +
          'void print_result(const char *name, int value);\n' +
          '#endif\n' +
          'EOF\n' +
          'cat > print.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '#include "print.h"\n' +
          'void print_result(const char *name, int value) { printf("%s = %d\\n", name, value); }\n' +
          'EOF\n' +
          'cat > main.c <<\'EOF\'\n' +
          '#include "ops.h"\n' +
          '#include "print.h"\n' +
          'int main(void)\n' +
          '{\n' +
          '    print_result("add(2,3)", add(2, 3));\n' +
          '    print_result("subtract(9,4)",  subtract(9, 4));\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'ls' },

        { t: 'code', where: 'out', nocopy: true, code:
          'print.c\n' +
          'print.h\n' +
          'main.c\n' +
          'ops.c\n' +
          'ops.h' },

        { t: 'p', x:
          'Giờ viết Makefile sơ khai. Dùng <code>cat &gt; … &lt;&lt;\'EOF\'</code> vì cách này ' +
          'giữ nguyên ký tự TAB — nếu bạn gõ vào trình soạn thảo, hãy chắc chắn nó không đổi ' +
          'TAB thành dấu cách.' },

        { t: 'code', where: 'wsl', name: 'tạo Makefile', code:
          'printf \'%b\\n\' \\\n' +
          '  \'program: main.o ops.o print.o\' \\\n' +
          '  \'\\tgcc -o program main.o ops.o print.o\' \\\n' +
          '  \'\' \\\n' +
          '  \'main.o: main.c ops.h print.h\' \\\n' +
          '  \'\\tgcc -Wall -c main.c\' \\\n' +
          '  \'\' \\\n' +
          '  \'ops.o: ops.c ops.h\' \\\n' +
          '  \'\\tgcc -Wall -c ops.c\' \\\n' +
          '  \'\' \\\n' +
          '  \'print.o: print.c print.h\' \\\n' +
          '  \'\\tgcc -Wall -c print.c\' \\\n' +
          '  \'\' \\\n' +
          '  \'clean:\' \\\n' +
          '  \'\\trm -f program main.o ops.o print.o\' > Makefile\n' +
          'cat -A Makefile | grep gcc' },

        { t: 'code', where: 'out', nocopy: true, code:
          '^Igcc -o program main.o ops.o print.o$\n' +
          '^Igcc -Wall -c main.c$\n' +
          '^Igcc -Wall -c ops.c$\n' +
          '^Igcc -Wall -c print.c$' },

        { t: 'cal', kind: 'tip', title: 'Kiểm tra TAB trước khi chạy make', x:
          '<p><code>cat -A</code> hiện TAB thành <code>^I</code> và cuối dòng thành ' +
          '<code>$</code>. Bốn dòng trên bắt đầu bằng <code>^I</code> — đúng.</p>' +
          '<p>Chú ý lệnh trên dùng <code>printf \'%b\\n\'</code> chứ không phải ' +
          '<code>\'%s\\n\'</code>. Chỉ <code>%b</code> mới diễn giải <code>\\t</code> trong ' +
          '<b>đối số</b> thành ký tự TAB thật; <code>%s</code> in ra hai ký tự ' +
          '<code>\\</code> và <code>t</code>, và bạn nhận ngay ' +
          '<code>missing separator</code>.</p>' +
          '<p>Nếu bạn thấy khoảng trắng thường thay vì <code>^I</code>, sửa lại ngay; nếu không ' +
          'bạn sẽ nhận <code>missing separator</code> ở bước sau và mất mười phút.</p>' +
          '<p><code>cat -A</code> là công cụ bạn đã dùng ở <b>Bài 13</b> để soi ký tự vô hình ' +
          '(kể cả ký tự xuống dòng kiểu Windows <code>^M</code>). Ở đây nó lại có ích.</p>' },

        { t: 'code', where: 'wsl', code: 'make && ./program' },

        { t: 'code', where: 'out', nocopy: true, code:
          'gcc -Wall -c main.c\n' +
          'gcc -Wall -c ops.c\n' +
          'gcc -Wall -c print.c\n' +
          'gcc -o program main.o ops.o print.o\n' +
          'add(2,3) = 5\n' +
          'subtract(9,4) = 5' },

        { t: 'cal', kind: 'info', title: 'Lần chạy đầu tiên làm đủ bốn việc — và một mốc cần nhớ', x:
          '<p>Chưa có file <code>.o</code> nào tồn tại, nên <code>make</code> phải làm cả bốn việc: ' +
          'biên dịch <code>main.c</code>, <code>ops.c</code>, <code>print.c</code>, rồi liên kết — ' +
          'đúng cơ chế "chạy lần đầu" bạn vừa đọc ở phần lý thuyết phía trên.</p>' +
          '<p><code>add(2,3) = 5</code> và <code>subtract(9,4) = 5</code> khớp với ' +
          '<code>FACTOR</code> đang là <b>1</b> trong <code>ops.h</code>: <code>(2+3)*1=5</code> và ' +
          '<code>(9-4)*1=5</code>. Ghi nhớ đúng hai con số này — bước 4 sẽ đổi <code>FACTOR</code> ' +
          'và dùng chính hai giá trị này để phát hiện một Makefile báo sai.</p>' }
      ]},

      /* ─────────── BƯỚC 2 ─────────── */
      { title: 'Bước 2 — Quan sát make quyết định', blocks: [
        { t: 'p', x:
          'Ba thí nghiệm liên tiếp, mỗi cái chứng minh một điều.' },

        { t: 'code', where: 'wsl', name: 'thí nghiệm 1 — không sửa gì', code: 'make' },

        { t: 'code', where: 'out', nocopy: true, code:
          'make: \'program\' is up to date.' },

        { t: 'code', where: 'wsl', name: 'thí nghiệm 2 — chạm vào một file .c', code:
          'touch ops.c\n' +
          'make' },

        { t: 'code', where: 'out', nocopy: true, code:
          'gcc -Wall -c ops.c\n' +
          'gcc -o program main.o ops.o print.o' },

        { t: 'code', where: 'wsl', name: 'thí nghiệm 3 — chạm vào một header', code:
          'touch ops.h\n' +
          'make' },

        { t: 'code', where: 'out', nocopy: true, code:
          'gcc -Wall -c main.c\n' +
          'gcc -Wall -c ops.c\n' +
          'gcc -o program main.o ops.o print.o' },

        { t: 'cal', kind: 'why', title: 'Ba kết quả, ba bài học', x:
          '<p><b>Thí nghiệm 1:</b> không có tiên quyết nào mới hơn → không làm gì. Chi phí gần ' +
          'bằng không.</p>' +
          '<p><b>Thí nghiệm 2:</b> <code>ops.c</code> mới hơn <code>ops.o</code> → biên dịch ' +
          'lại đúng một file. Sau đó <code>ops.o</code> mới hơn <code>program</code> → ' +
          'liên kết lại. <b>Sự lan truyền đi lên đúng một tầng một.</b></p>' +
          '<p><b>Thí nghiệm 3:</b> <code>ops.h</code> là tiên quyết của <b>hai</b> quy tắc, nên ' +
          'hai file được làm lại. <code>print.o</code> vắng mặt — đúng như đồ thị phụ thuộc đã ' +
          'vẽ.</p>' +
          '<p>Chú ý <code>touch</code> <b>không đổi nội dung</b> file. <code>make</code> vẫn ' +
          'build lại. Đây là bằng chứng trực tiếp cho câu "make quyết định bằng đồng hồ".</p>' },

        { t: 'p', x:
          'Thêm một thí nghiệm nữa: <code>make -n</code> cho xem trước mà không làm gì.' },

        { t: 'code', where: 'wsl', code:
          'touch main.c\n' +
          'make -n\n' +
          'echo \'--- chay that:\'\n' +
          'make' },

        { t: 'code', where: 'out', nocopy: true, code:
          'gcc -Wall -c main.c\n' +
          'gcc -o program main.o ops.o print.o\n' +
          '--- chay that:\n' +
          'gcc -Wall -c main.c\n' +
          'gcc -o program main.o ops.o print.o' },

        { t: 'cal', kind: 'info', title: 'Hai output giống hệt nhau — đó là ý nghĩa của -n', x:
          '<p><code>make -n</code> in ra chính xác kịch bản sẽ chạy, rồi dừng. Vì nó không chạy ' +
          'gì nên file <code>main.o</code> vẫn cũ, và lần <code>make</code> thật sau đó vẫn phải ' +
          'làm đúng những việc ấy.</p>' +
          '<p>Với Makefile lạ tải từ Internet, hãy tập <code>make -n | less</code> trước khi ' +
          '<code>make</code>.</p>' }
      ]},

      /* ─────────── BƯỚC 3 ─────────── */
      { title: 'Bước 3 — Gây ra hai lỗi Makefile phổ biến nhất', blocks: [
        { t: 'p', x:
          'Cố ý làm hỏng để nhận ra thông báo sau này. Thí nghiệm trong một thư mục riêng để ' +
          'không đụng dự án chính.' },

        { t: 'code', where: 'wsl', name: 'lỗi 1 — dùng dấu cách thay TAB', code:
          'mkdir -p ~/bai16/try && cd ~/bai16/try\n' +
          'printf \'all:\\n    echo hello\\n\' > Makefile\n' +
          'cat -A Makefile\n' +
          'make\n' +
          'echo "exit=$?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'all:$\n' +
          '    echo hello$\n' +
          'Makefile:2: *** missing separator.  Stop.\n' +
          'exit=2' },

        { t: 'code', where: 'wsl', name: 'sửa lại bằng TAB thật', code:
          'printf \'all:\\n\\techo hello\\n\' > Makefile\n' +
          'make' },

        { t: 'code', where: 'out', nocopy: true, code:
          'echo hello\n' +
          'hello' },

        { t: 'cal', kind: 'info', title: 'Vì sao make in ra lệnh rồi mới in kết quả', x:
          '<p>Dòng <code>echo hello</code> đầu tiên là <code>make</code> <b>vọng lại</b> công ' +
          'thức. Dòng <code>hello</code> thứ hai mới là output của lệnh.</p>' +
          '<p>Đặt <code>@</code> trước lệnh — <code>\t@echo hello</code> — thì chỉ còn một ' +
          'dòng. Đây chính là cơ chế đằng sau <code>$(Q)</code> của kernel.</p>' },

        { t: 'code', where: 'wsl', name: 'lỗi 2 — thiếu quy tắc cho một tiên quyết', code:
          'printf \'app: main.o missing.o\\n\\tgcc -o app main.o missing.o\\n\' > Makefile\n' +
          'make\n' +
          'echo "exit=$?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'make: *** No rule to make target \'main.o\', needed by \'app\'.  Stop.\n' +
          'exit=2' },

        { t: 'cmdx', cmd: 'No rule to make target \'X\', needed by \'Y\'', title: 'Ba nguyên nhân, theo thứ tự phổ biến',
          rows: [
            ['File nguồn không tồn tại', 'Không có <code>main.c</code> trong thư mục nên quy tắc ngầm cũng bó tay', 'Kiểm tra bằng <code>ls</code>. Đây là trường hợp ở trên'],
            ['Gõ sai tên', '<code>mian.o</code> thay vì <code>main.o</code>', 'Đọc kỹ tên trong ngoặc — <code>make</code> lặp lại đúng chuỗi bạn viết'],
            ['File <code>.d</code> cũ đòi một header đã bị xóa', 'Phụ thuộc tự động trỏ tới file không còn nữa', 'Đây chính là thứ cờ <code>-MP</code> sinh ra để chặn'],
            ['<code>needed by \'Y\'</code>', 'Cho biết <b>quy tắc nào</b> đang đòi', 'Manh mối quan trọng nhất trong thông báo: nó chỉ thẳng dòng cần sửa']
          ]},

        { t: 'code', where: 'wsl', name: 'lỗi 3 — .PHONY bị thiếu', code:
          'cd ~/bai16\n' +
          'touch clean\n' +
          'make clean\n' +
          'ls program' },

        { t: 'code', where: 'out', nocopy: true, code:
          'make: \'clean\' is up to date.\n' +
          'program' },

        { t: 'code', where: 'wsl', name: 'thêm .PHONY rồi thử lại', code:
          'printf \'\\n.PHONY: clean\\n\' >> Makefile\n' +
          'make clean\n' +
          'ls program' },

        { t: 'code', where: 'out', nocopy: true, code:
          'rm -f program main.o ops.o print.o\n' +
          'ls: cannot access \'program\': No such file or directory' },

        { t: 'cal', kind: 'warn', title: 'Lỗi im lặng nguy hiểm hơn lỗi ồn ào', x:
          '<p>Hai lỗi đầu dừng <code>make</code> lại với mã thoát <b>2</b>. Bạn thấy ngay, sửa ' +
          'ngay.</p>' +
          '<p>Lỗi <code>.PHONY</code> thì <code>make</code> thoát với mã <b>0</b> — nghĩa là ' +
          '"thành công". Trong một script CI, không ai phát hiện ra. Bạn chỉ nhận ra khi build ' +
          'tiếp theo dùng lại object cũ và cho kết quả sai.</p>' +
          '<p>Bằng chứng nằm ngay trong hai lần chạy <code>ls program</code> ở trên: trước khi thêm ' +
          '<code>.PHONY</code>, nó in ra <code>program</code> — file thực thi vẫn còn nguyên, chứng ' +
          'tỏ công thức <code>rm -f</code> chưa từng chạy. Sau khi thêm <code>.PHONY</code>, ' +
          '<code>ls program</code> báo <code>cannot access \'program\': No such file or ' +
          'directory</code> — lần này <code>rm -f</code> đã thực sự xoá nó.</p>' +
          '<p>Nhớ lại <b>Bài 4</b>: mã thoát 0 là lời hứa "tôi đã làm xong việc". ' +
          '<code>make</code> ở đây <i>không nói dối</i> — nó thật sự đã hoàn thành việc "đảm bảo ' +
          'file <code>clean</code> tồn tại". Chỉ là việc đó không phải việc bạn muốn.</p>' },

        { t: 'code', where: 'wsl', code: 'rm -f clean && rm -rf ~/bai16/try' }
      ]},

      /* ─────────── BƯỚC 4 ─────────── */
      { title: 'Bước 4 — Rút gọn Makefile, rồi tự tay rơi vào bẫy header', blocks: [
        { t: 'p', x:
          'Viết lại Makefile bằng biến, biến tự động và pattern rule — từ 15 dòng lệnh xuống ' +
          'còn 6.' },

        { t: 'code', where: 'wsl', name: 'Makefile bản 2', code:
          'cd ~/bai16\n' +
          'cat > Makefile <<\'EOF\'\n' +
          'CC      = gcc\n' +
          'CFLAGS  = -Wall -Wextra -O2\n' +
          'OBJS    = main.o ops.o print.o\n' +
          'TARGET  = program\n' +
          '\n' +
          '$(TARGET): $(OBJS)\n' +
          '\t$(CC) $(CFLAGS) -o $@ $^\n' +
          '\n' +
          '%.o: %.c\n' +
          '\t$(CC) $(CFLAGS) -c $< -o $@\n' +
          '\n' +
          'clean:\n' +
          '\trm -f $(TARGET) $(OBJS)\n' +
          '\n' +
          '.PHONY: clean\n' +
          'EOF\n' +
          'make clean >/dev/null; make\n' +
          './program' },

        { t: 'code', where: 'out', nocopy: true, code:
          'gcc -Wall -Wextra -O2 -c main.c -o main.o\n' +
          'gcc -Wall -Wextra -O2 -c ops.c -o ops.o\n' +
          'gcc -Wall -Wextra -O2 -c print.c -o print.o\n' +
          'gcc -Wall -Wextra -O2 -o program main.o ops.o print.o\n' +
          'add(2,3) = 5\n' +
          'subtract(9,4) = 5' },

        { t: 'cal', kind: 'info', title: 'Kết quả giống hệt bước 1 — bản rút gọn vẫn đúng, ít nhất là lúc này', x:
          '<p><code>add(2,3) = 5</code> và <code>subtract(9,4) = 5</code> — đúng bằng kết quả ở ' +
          'bước 1, khi <code>FACTOR</code> vẫn là <b>1</b>. Makefile ngắn hơn nhưng cho ra cùng một ' +
          'chương trình đúng: rút gọn cú pháp chưa làm mất gì.</p>' +
          '<p>Đừng vội kết luận nó tương đương bản 1. Thí nghiệm tiếp theo sẽ lộ ra đúng chỗ khác ' +
          'nhau.</p>' },

        { t: 'p', x:
          'Ngắn hơn, dễ mở rộng hơn. Giờ đổi hằng số <code>FACTOR</code> trong header từ 1 thành ' +
          '10. Kết quả đúng phải là <code>50</code>.' },

        { t: 'code', where: 'wsl', code:
          'sed -i \'s/#define FACTOR 1/#define FACTOR 10/\' ops.h\n' +
          'grep \'#define FACTOR\' ops.h\n' +
          'make\n' +
          './program' },

        { t: 'code', where: 'out', nocopy: true, code:
          '#define FACTOR 10\n' +
          'make: \'program\' is up to date.\n' +
          'add(2,3) = 5\n' +
          'subtract(9,4) = 5' },

        { t: 'cal', kind: 'danger', title: 'Đây là khoảnh khắc quan trọng nhất của cả bài', x:
          '<p>Bạn vừa sửa mã nguồn. <code>make</code> nói mọi thứ đã cập nhật. Chương trình chạy ' +
          'mã cũ. Không một dấu hiệu nào cảnh báo.</p>' +
          '<p>Nguyên nhân: pattern rule <code>%.o: %.c</code> chỉ khai báo file <code>.c</code> ' +
          'là tiên quyết. Bản Makefile sơ khai ở bước 1 có dòng ' +
          '<code>ops.o: ops.c ops.h</code> nên <b>không</b> mắc lỗi này. Bạn vừa đánh đổi ' +
          'tính đúng đắn lấy sự ngắn gọn.</p>' +
          '<p>Kiểm chứng rằng mã nguồn không có lỗi:</p>' },

        { t: 'code', where: 'wsl', code: 'make clean && make >/dev/null && ./program' },

        { t: 'code', where: 'out', nocopy: true, code:
          'rm -f program main.o ops.o print.o\n' +
          'add(2,3) = 50\n' +
          'subtract(9,4) = 50' },

        { t: 'cal', kind: 'tip', title: 'Phép thử chẩn đoán bạn sẽ dùng suốt nghề', x:
          '<p><b>Nếu <code>make clean &amp;&amp; make</code> làm triệu chứng biến mất, thì lỗi ' +
          'nằm ở khai báo phụ thuộc, không nằm ở mã nguồn.</b></p>' +
          '<p>Nhiều lập trình viên biết mẹo "cứ clean rồi build lại" mà không biết vì sao nó có ' +
          'tác dụng — và vì thế họ clean mọi lúc, biến build 0,2 giây thành build 2,3 giây. Bạn ' +
          'thì hiểu nguyên nhân, nên bước 6 sẽ chữa tận gốc.</p>' }
      ]},

      /* ─────────── BƯỚC 5 ─────────── */
      { title: 'Bước 5 — Đo tốc độ trên dự án 60 file', blocks: [
        { t: 'p', x:
          'Ba file thì mọi cách đều nhanh. Hãy dựng một dự án đủ lớn để con số nói lên điều gì. ' +
          'Chú ý <code>$(wildcard *.c)</code> — không phải liệt kê 60 tên bằng tay.' },

        { t: 'code', where: 'wsl', name: 'sinh 60 mô-đun', code:
          'rm -rf ~/bai16big && mkdir -p ~/bai16big && cd ~/bai16big\n' +
          'for i in $(seq 1 60); do\n' +
          '  printf \'#include <stdio.h>\\nint mod%d(void) { return %d; }\\n\' "$i" "$i" > mod$i.c\n' +
          'done\n' +
          'printf \'#include <stdio.h>\\nint main(void) { printf("60 modules\\\\n"); return 0; }\\n\' > main.c\n' +
          'ls *.c | wc -l' },

        { t: 'code', where: 'out', nocopy: true, code: '61' },

        { t: 'cal', kind: 'info', title: '61, không phải 60 — vì sao', x:
          '<p>Vòng lặp <code>for</code> ở trên chỉ sinh đúng <b>60</b> file <code>mod1.c</code> … ' +
          '<code>mod60.c</code>. Dòng <code>printf</code> ngay sau đó tạo thêm <code>main.c</code> — ' +
          'điểm vào chương trình — nên tổng cộng có <b>61</b> file <code>.c</code>. Bước này vẫn gọi ' +
          'là "dự án 60 file" vì 60 là số mô-đun dùng để đo tốc độ; <code>main.c</code> chỉ gọi ' +
          'chúng, không tính vào số đo.</p>' },

        { t: 'code', where: 'wsl', name: 'Makefile dùng wildcard', code:
          'cat > Makefile <<\'EOF\'\n' +
          'CC     = gcc\n' +
          'CFLAGS = -Wall -O2\n' +
          'SRCS   = $(wildcard *.c)\n' +
          'OBJS   = $(SRCS:.c=.o)\n' +
          '\n' +
          'app: $(OBJS)\n' +
          '\t$(CC) $(CFLAGS) -o $@ $^\n' +
          '\n' +
          '%.o: %.c\n' +
          '\t$(CC) $(CFLAGS) -c $< -o $@\n' +
          '\n' +
          'clean:\n' +
          '\trm -f app $(OBJS)\n' +
          '\n' +
          '.PHONY: clean\n' +
          'EOF\n' +
          'make clean >/dev/null\n' +
          'time make >/dev/null' },

        { t: 'code', where: 'out', nocopy: true, code:
          'real\t0m1.535s' },

        { t: 'code', where: 'wsl', name: 'sửa một file rồi build lại', code:
          'touch mod7.c\n' +
          'time make >/dev/null' },

        { t: 'code', where: 'out', nocopy: true, code:
          'real\t0m0.187s' },

        { t: 'code', where: 'wsl', name: 'không sửa gì', code:
          'time make >/dev/null' },

        { t: 'code', where: 'out', nocopy: true, code:
          'real\t0m0.004s' },

        { t: 'code', where: 'wsl', name: 'build đầy đủ nhưng song song 6 tiến trình', code:
          'nproc\n' +
          'make clean >/dev/null\n' +
          'time make -j6 >/dev/null' },

        { t: 'code', where: 'out', nocopy: true, code:
          '6\n' +
          'real\t0m0.555s' },

        { t: 'cal', kind: 'why', title: 'Bốn con số, ba kết luận', x:
          '<p><b>1,535 → 0,187 s</b> khi chỉ sửa một file: nhanh hơn <b>8,2 lần</b>. Đây là ' +
          'toàn bộ lý do <code>make</code> tồn tại.</p>' +
          '<p><b>1,535 → 0,555 s</b> với <code>-j6</code> trên máy 6 CPU: nhanh hơn ' +
          '<b>2,8 lần</b>, <b>không</b> phải 6 lần. Bước liên kết cuối chỉ là một tiến trình, ' +
          'và 6 tiến trình gcc tranh nhau đọc header trên đĩa. Hãy nhớ tỉ lệ này để không kỳ ' +
          'vọng sai khi build kernel ở Chặng 07.</p>' +
          '<p><b>0,004 s</b> khi không có gì đổi: gần như miễn phí. Vì thế gõ <code>make</code> ' +
          'thay vì tự hỏi "mình đã build chưa nhỉ" luôn là lựa chọn đúng.</p>' +
          '<p>Kết hợp cả hai: <code>make -j6</code> sau khi sửa một file mất khoảng bằng ' +
          '<b>0,187 s</b> — vì chỉ có một file để dịch, song song chẳng giúp gì. Song song có ' +
          'giá trị ở build đầy đủ; build tăng dần có giá trị hằng ngày.</p>' +
          '<p><b>Số của bạn sẽ khác một chút.</b> Trên máy này, hai lần đo build đầy đủ liên ' +
          'tiếp cho <b>1,535 s</b> và <b>1,536 s</b> — rất ổn định vì cache đĩa đã ấm sẵn từ các ' +
          'bước trước. Hãy chạy mỗi phép đo hai ba lần — điều cần khớp là <b>tỉ lệ</b>, không ' +
          'phải chữ số lẻ.</p>' },

        { t: 'code', where: 'wsl', code: 'cd ~ && rm -rf ~/bai16big' }
      ]},

      /* ─────────── BƯỚC 6 ─────────── */
      { title: 'Bước 6 — Chữa tận gốc bằng -MMD -MP, và mô phỏng kiểu kernel', blocks: [
        { t: 'p', x:
          'Quay lại dự án ba file và viết Makefile bản 3 — bản bạn nên dùng làm mẫu cho mọi dự ' +
          'án C nhỏ từ nay về sau.' },

        { t: 'code', where: 'wsl', name: 'Makefile bản 3', code:
          'cd ~/bai16\n' +
          'cat > Makefile <<\'EOF\'\n' +
          'CC      = gcc\n' +
          'CFLAGS  = -Wall -Wextra -O2 -MMD -MP\n' +
          'OBJS    = main.o ops.o print.o\n' +
          'DEPS    = $(OBJS:.o=.d)\n' +
          'TARGET  = program\n' +
          '\n' +
          '$(TARGET): $(OBJS)\n' +
          '\t$(CC) $(CFLAGS) -o $@ $^\n' +
          '\n' +
          '%.o: %.c\n' +
          '\t$(CC) $(CFLAGS) -c $< -o $@\n' +
          '\n' +
          'clean:\n' +
          '\trm -f $(TARGET) $(OBJS) $(DEPS)\n' +
          '\n' +
          '-include $(DEPS)\n' +
          '\n' +
          '.PHONY: clean\n' +
          'EOF\n' +
          'make clean >/dev/null; make >/dev/null\n' +
          'ls *.d\n' +
          'cat main.d' },

        { t: 'code', where: 'out', nocopy: true, code:
          'print.d\n' +
          'main.d\n' +
          'ops.d\n' +
          'main.o: main.c ops.h print.h\n' +
          'ops.h:\n' +
          'print.h:' },

        { t: 'p', x:
          'Dòng đầu của <code>main.d</code> chính là quy tắc bạn viết tay ở bước 1. Giờ thử lại ' +
          'kịch bản đã lừa được bản 2 — đổi <code>FACTOR</code> từ 10 lên 100:' },

        { t: 'code', where: 'wsl', code:
          'sed -i \'s/#define FACTOR 10/#define FACTOR 100/\' ops.h\n' +
          'make\n' +
          './program' },

        { t: 'code', where: 'out', nocopy: true, code:
          'gcc -Wall -Wextra -O2 -MMD -MP -c main.c -o main.o\n' +
          'gcc -Wall -Wextra -O2 -MMD -MP -c ops.c -o ops.o\n' +
          'gcc -Wall -Wextra -O2 -MMD -MP -o program main.o ops.o print.o\n' +
          'add(2,3) = 500\n' +
          'subtract(9,4) = 500' },

        { t: 'cal', kind: 'info', title: 'Đúng, tối thiểu, và tự động', x:
          '<p>Hai file đọc <code>ops.h</code> được biên dịch lại; <code>print.o</code> thì ' +
          'không. Bạn không khai báo một phụ thuộc nào — trình biên dịch tự khai hộ.</p>' +
          '<p>Bản 3 vừa <b>ngắn</b> như bản 2 vừa <b>đúng</b> như bản 1. Đó là toàn bộ ý nghĩa ' +
          'của bốn dòng thêm vào.</p>' },

        { t: 'p', x:
          'Cuối cùng, dựng lại quy ước Kbuild trong một dự án nhỏ có thư mục con — để ở Chặng 07 ' +
          'bạn nhận ra ngay khi gặp:' },

        { t: 'code', where: 'wsl', name: 'dự án kiểu kernel', code:
          'rm -rf ~/bai16kb && mkdir -p ~/bai16kb/driver ~/bai16kb/lib && cd ~/bai16kb\n' +
          'cat > main.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          'int gpio_init(void); int uart_init(void); int util_init(void);\n' +
          'int main(void)\n' +
          '{\n' +
          '    printf("gpio=%d uart=%d util=%d\\n", gpio_init(), uart_init(), util_init());\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'echo \'int gpio_init(void) { return 1; }\' > driver/gpio.c\n' +
          'echo \'int uart_init(void) { return 2; }\' > driver/uart.c\n' +
          'echo \'int util_init(void) { return 3; }\' > lib/util.c' },

        { t: 'code', where: 'wsl', name: 'Makefile kiểu Kbuild', code:
          'cat > Makefile <<\'EOF\'\n' +
          'CC      = gcc\n' +
          'CFLAGS  = -Wall -O2\n' +
          'V      ?= 0\n' +
          'ifeq ($(V),1)\n' +
          '  Q =\n' +
          'else\n' +
          '  Q = @\n' +
          'endif\n' +
          '\n' +
          'obj-y += main.o\n' +
          'obj-y += driver/gpio.o\n' +
          'obj-y += driver/uart.o\n' +
          'obj-y += lib/util.o\n' +
          '\n' +
          'app: $(obj-y)\n' +
          '\t$(Q)echo "  LD      $@"\n' +
          '\t$(Q)$(CC) $(CFLAGS) -o $@ $^\n' +
          '\n' +
          '%.o: %.c\n' +
          '\t$(Q)echo "  CC      $@"\n' +
          '\t$(Q)$(CC) $(CFLAGS) -c $< -o $@\n' +
          '\n' +
          'clean:\n' +
          '\t$(Q)rm -f app $(obj-y)\n' +
          '\n' +
          '.PHONY: clean\n' +
          'EOF\n' +
          'make\n' +
          './app' },

        { t: 'code', where: 'out', nocopy: true, code:
          '  CC      main.o\n' +
          '  CC      driver/gpio.o\n' +
          '  CC      driver/uart.o\n' +
          '  CC      lib/util.o\n' +
          '  LD      app\n' +
          'gpio=1 uart=2 util=3' },

        { t: 'code', where: 'wsl', name: 'bật chế độ ồn ào', code:
          'make clean && make V=1 | head -6' },

        { t: 'code', where: 'out', nocopy: true, code:
          'echo "  CC      main.o"\n' +
          '  CC      main.o\n' +
          'gcc -Wall -O2 -c main.c -o main.o\n' +
          'echo "  CC      driver/gpio.o"\n' +
          '  CC      driver/gpio.o\n' +
          'gcc -Wall -O2 -c driver/gpio.c -o driver/gpio.o' },

        { t: 'cal', kind: 'tip', title: 'Bạn vừa dựng lại đúng ba quy ước của kernel', x:
          '<p><code>obj-y +=</code> để gom danh sách, <code>$(Q)</code> để im lặng, ' +
          '<code>V=1</code> để bật lại tiếng. Pattern rule <code>%.o: %.c</code> hoạt động ' +
          'xuyên qua thư mục con mà không cần thêm gì — <code>%</code> khớp cả ' +
          '<code>driver/gpio</code>.</p>' +
          '<p>Ở <b>Chặng 07</b> khi build kernel thật, output sẽ trông y hệt, chỉ khác là có ' +
          'thêm <code>make[1]</code>, <code>make[2]</code> vì Kbuild gọi ' +
          '<code>$(MAKE) -C</code> xuống từng thư mục. Bạn đã biết cả ba mảnh ghép.</p>' },

        { t: 'p', x: 'Dọn dẹp:' },

        { t: 'code', where: 'wsl', code: 'cd ~ && rm -rf ~/bai16 ~/bai16kb ~/bai16big' }
      ]}

    ]},

    /* ══════════════════════════════════════════════
       10. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Ba dòng đầu là lỗi <b>ồn ào</b> — <code>make</code> dừng lại với mã thoát 2, bạn sửa ' +
      'ngay. Ba dòng cuối là lỗi <b>im lặng</b> — <code>make</code> báo thành công và bạn mất ' +
      'hàng giờ. Loại thứ hai mới là loại cần thuộc.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>Makefile:2: *** missing separator.  Stop.</code>',
         'Dòng công thức bắt đầu bằng <b>dấu cách</b> thay vì TAB',
         '<code>cat -A Makefile</code> — dòng công thức phải mở đầu bằng <code>^I</code>. Tắt "chuyển tab thành dấu cách" cho file Makefile trong trình soạn thảo'],

        ['<code>*** No rule to make target \'main.o\', needed by \'app\'.</code>',
         'Không có quy tắc nào (kể cả quy tắc ngầm) làm ra <code>main.o</code> — thường vì <code>main.c</code> không tồn tại hoặc gõ sai tên',
         'Đọc phần <code>needed by</code> để biết quy tắc nào đang đòi. Kiểm tra bằng <code>ls</code>. Nếu là header đã xóa thì thêm cờ <code>-MP</code>'],

        ['<code>*** recipe commences before first target.  Stop.</code>',
         'File bắt đầu bằng một dòng TAB trước khi có mục tiêu nào',
         'Thường do copy-paste hụt mất dòng <code>name:</code>. Xem lại vài dòng đầu file'],

        ['<code>make: \'clean\' is up to date.</code>',
         'Thư mục có một <b>file</b> tên <code>clean</code>, nên <code>make</code> coi mục tiêu đã xong',
         'Thêm <code>.PHONY: clean</code>. Khai báo <code>.PHONY</code> cho mọi mục tiêu là động từ: <code>all clean install test</code>'],

        ['Sửa header xong chương trình vẫn chạy mã cũ, <code>make</code> báo <i>up to date</i>',
         '<b>Lỗi tốn thời gian nhất bài này.</b> Pattern rule <code>%.o: %.c</code> không khai báo header là tiên quyết',
         'Thêm <code>-MMD -MP</code> vào <code>CFLAGS</code>, <code>DEPS = $(OBJS:.o=.d)</code> và <code>-include $(DEPS)</code>. Phép thử nhanh: nếu <code>make clean &amp;&amp; make</code> làm triệu chứng biến mất thì đúng là lỗi này'],

        ['Toàn bộ dự án bị build lại dù không sửa gì',
         'Thời gian sửa file bị đẩy lên mới hơn file <code>.o</code> — thường do <code>cp</code>, giải nén, hoặc chép qua <code>/mnt/c</code>',
         'Dùng <code>cp -p</code> hoặc <code>rsync -a</code> để giữ nguyên mtime. Kiểm tra bằng <code>ls -l --time-style=full-iso</code>'],

        ['<code>undefined reference to \'add\'</code> khi liên kết trong Makefile',
         'Dòng liên kết dùng <code>$&lt;</code> (chỉ tiên quyết <b>đầu tiên</b>) thay vì <code>$^</code> (<b>tất cả</b>)',
         'Dòng liên kết phải là <code>$(CC) $(CFLAGS) -o $@ $^</code>. Xác nhận bằng <code>make -n</code>'],

        ['Build song song <code>-j</code> lúc được lúc hỏng, mỗi lần lỗi một chỗ khác nhau',
         'Thiếu khai báo phụ thuộc, nên thứ tự chạy không xác định làm lộ ra',
         'Kiểm tra bằng <code>make clean &amp;&amp; make -j1</code>: nếu <code>-j1</code> luôn chạy được thì lỗi là ở phụ thuộc chứ không phải ở code'],

        ['Makefile in ra <code>\\tgcc …</code> thay vì thụt lề',
         'Dùng <code>printf \'%s\\n\'</code> để tạo Makefile — <code>%s</code> không diễn giải <code>\\t</code>',
         'Dùng <code>printf \'%b\\n\'</code>, hoặc dùng heredoc <code>cat &gt; Makefile &lt;&lt;\'EOF\'</code> với ký tự TAB thật'],

        ['Biến có giá trị lạ, không giống chỗ bạn gán',
         'Dùng <code>=</code> nên biến được tính lại lúc dùng, và đã bị gán đè ở dòng dưới',
         'Đổi sang <code>:=</code>. In ra để kiểm tra bằng một mục tiêu tạm: <code>show:</code> rồi <code>@echo $(NAME)</code>']
      ]},

    /* ══════════════════════════════════════════════
       11. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', title: 'Tóm tắt Bài 16', items: [
      'Một quy tắc gồm <b>ba phần</b>: mục tiêu, điều kiện tiên quyết, công thức. Dòng công thức <b>phải</b> bắt đầu bằng ký tự <b>TAB</b> — dấu cách cho <code>missing separator</code>.',
      '<code>make</code> chỉ có <b>một</b> luật: chạy công thức nếu mục tiêu không tồn tại hoặc có tiên quyết <b>mới hơn</b>. Nó so <b>thời gian sửa file</b>, không đọc nội dung — bằng chứng: <code>touch</code> một file không đổi nội dung vẫn kích hoạt build lại.',
      'Đo trên dự án 60 file: build đầy đủ <b>1,535 s</b>, sửa một file rồi build lại <b>0,187 s</b> (<b>8,2 lần</b> nhanh hơn), không sửa gì <b>0,004 s</b>, và <code>-j6</code> trên 6 CPU cho <b>0,555 s</b> — nhanh hơn <b>2,8 lần</b> chứ không phải 6.',
      'Biến tự động <code>$@</code> (mục tiêu), <code>$&lt;</code> (tiên quyết đầu tiên), <code>$^</code> (tất cả) cùng pattern rule <code>%.o: %.c</code> rút Makefile từ 15 dòng lệnh xuống 6. Dòng liên kết phải dùng <code>$^</code>, không phải <code>$&lt;</code>.',
      '<code>:=</code> tính giá trị <b>ngay tại dòng gán</b>, <code>=</code> tính <b>mỗi lần dùng</b>. Mặc định hãy dùng <code>:=</code>.',
      '<b>Mọi mục tiêu là động từ đều cần <code>.PHONY</code>.</b> Không có nó, một file trùng tên làm <code>make clean</code> im lặng không làm gì, mà vẫn thoát với mã <b>0</b>.',
      'Pattern rule đánh đổi tính đúng đắn lấy sự ngắn gọn: nó <b>không</b> biết gì về header. Chữa bằng bốn dòng — <code>-MMD -MP</code> trong <code>CFLAGS</code>, <code>DEPS = $(OBJS:.o=.d)</code>, <code>-include $(DEPS)</code>, và thêm <code>$(DEPS)</code> vào <code>clean</code>.',
      'Phép thử chẩn đoán cần thuộc: <b>nếu <code>make clean &amp;&amp; make</code> làm triệu chứng biến mất thì lỗi nằm ở khai báo phụ thuộc, không nằm ở mã nguồn.</b>',
      'Kbuild của kernel là <code>make</code> thuần với ba quy ước: <code>obj-y +=</code> gom danh sách theo cấu hình, <code>$(Q)</code> để im lặng và <code>V=1</code> để xem lệnh thật, <code>$(MAKE) -C</code> để đi xuống thư mục con (số <code>make[1]</code> là độ sâu đệ quy).'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo', x:
      '<p>Trong bài này mọi thứ đều là mã của bạn. Nhưng dòng <code>printf</code> trong ' +
      '<code>print.c</code> đến từ <b>thư viện C</b> — thứ bạn chưa hề biên dịch. Ở Bài 15 bạn ' +
      'đã thấy <code>nm hello</code> báo <code>U printf@GLIBC_2.2.5</code> và ' +
      '<code>ldd</code> chỉ ra <code>libc.so.6</code>.</p>' +
      '<p><b>Bài 17 — Thư viện tĩnh và động</b> mổ xẻ đúng chỗ đó. Bạn sẽ tự tạo cả ' +
      '<code>libops.a</code> lẫn <code>libops.so</code> từ chính <code>ops.c</code> của bài ' +
      'này, đo kích thước hai chương trình kết quả, và trả lời được câu hỏi mà Chặng 02 đặt ra ' +
      'từ đầu: vì sao bản <code>hello</code> tĩnh nặng <b>705 328 byte</b> còn bản động chỉ ' +
      '<b>15 952 byte</b> — và vì sao thiết bị nhúng vẫn thường chọn bản nặng hơn.</p>' }

  ],

  /* ══════════════════════════════════════════════
     12. QUIZ
     ══════════════════════════════════════════════ */
  quiz: [
    {
      q: 'Bạn chạy <code>touch ops.h</code> — chỉ đổi thời gian, nội dung y nguyên — rồi <code>make</code>. Nó biên dịch lại hai file. Vì sao?',
      opts: [
        'make đã đọc ops.h và phát hiện nội dung khác với lần trước',
        'make chỉ so thời gian sửa file, và ops.h giờ mới hơn hai file .o phụ thuộc vào nó',
        'touch làm hỏng bộ nhớ đệm của make nên nó phải làm lại',
        'make luôn biên dịch lại mọi file có #include một header vừa được mở'
      ],
      a: 1,
      why: '<code>make</code> <b>không bao giờ</b> đọc nội dung file. Nó chỉ so hai con dấu thời gian (mtime), vì phép so hai số 64-bit tốn vài nano giây còn đọc và băm 60 file tốn hàng chục mili giây. Đó là lý do <code>make</code> mất <b>0,004 s</b> khi không có gì đổi. Hệ quả trực tiếp: <code>cp</code> mã nguồn từ máy khác sang sẽ làm mọi file mới hơn object và kích hoạt build lại toàn bộ.'
    },
    {
      q: 'Makefile của bạn có <code>clean: rm -f app *.o</code> nhưng không có <code>.PHONY</code>. Một đồng nghiệp vô tình tạo file tên <code>clean</code>. Chuyện gì xảy ra khi chạy <code>make clean</code>?',
      opts: [
        'make báo lỗi vì không phân biệt được file và mục tiêu',
        'make xóa luôn file clean rồi chạy công thức',
        'make in "clean is up to date", không chạy công thức, và thoát với mã 0',
        'make chạy công thức bình thường vì clean không có điều kiện tiên quyết'
      ],
      a: 2,
      why: 'Mục tiêu <code>clean</code> tồn tại như một file và không có tiên quyết nào mới hơn, nên theo đúng luật, <code>make</code> kết luận không cần làm gì. Điều nguy hiểm là <b>mã thoát vẫn là 0</b> — một script CI sẽ coi như thành công. Đây là lỗi <i>im lặng</i>, khác hẳn <code>missing separator</code> vốn dừng ngay với mã 2. Quy tắc: mọi mục tiêu là động từ đều phải khai báo <code>.PHONY</code>.'
    },
    {
      q: 'Trong quy tắc <code>program: main.o ops.o print.o</code>, công thức viết <code>gcc -o $@ $&lt;</code>. Kết quả là gì?',
      opts: [
        'Liên kết đúng — $< là tất cả các file .o',
        'Lỗi missing separator vì $< không dùng được ở dòng liên kết',
        'undefined reference, vì $< chỉ là main.o — hai file .o kia không được liên kết',
        'make từ chối chạy vì $@ và $< không dùng chung được'
      ],
      a: 2,
      why: '<code>$&lt;</code> là <b>tiên quyết đầu tiên</b>, ở đây là <code>main.o</code>. Lệnh trở thành <code>gcc -o program main.o</code>, nên <code>add</code> và <code>print_result</code> không có nhà cung cấp và bạn nhận đúng lỗi <code>undefined reference</code> của Bài 15. Dòng liên kết phải dùng <code>$^</code> — "tất cả tiên quyết". Mẹo nhớ: <code>$&lt;</code> mũi tên chỉ vào trong = <b>một</b> đầu vào, dùng ở dòng biên dịch; <code>$^</code> dùng ở dòng liên kết.'
    },
    {
      q: 'Bạn sửa một hằng số trong <code>config.h</code>, chạy <code>make</code>, nhưng chương trình vẫn chạy giá trị cũ và make báo <i>up to date</i>. Chạy <code>make clean &amp;&amp; make</code> thì đúng. Chẩn đoán?',
      opts: [
        'Trình biên dịch có lỗi tối ưu hóa, thử hạ xuống -O0',
        'Header guard trong config.h bị sai nên nội dung mới không được nạp',
        'Makefile không khai báo header là điều kiện tiên quyết — cần -MMD -MP và -include',
        'Cần chạy make -B để buộc build lại mỗi lần'
      ],
      a: 2,
      why: 'Việc <code>make clean &amp;&amp; make</code> chữa được triệu chứng chứng minh <b>mã nguồn đúng</b> — chỉ hệ thống build là sai. Pattern rule <code>%.o: %.c</code> chỉ khai báo file <code>.c</code>, nên <code>make</code> không hề biết header đã đổi. Cách chữa đúng là để trình biên dịch tự khai báo: <code>-MMD -MP</code> sinh file <code>.d</code> chứa dòng <code>main.o: main.c config.h</code>, rồi <code>-include</code> nạp nó vào. <code>make -B</code> thì build lại <b>mọi thứ</b> mỗi lần — đúng kết quả nhưng vứt bỏ toàn bộ giá trị của make.'
    },
    {
      q: 'Trên máy 6 CPU, build đầy đủ dự án 60 file mất <b>1,535 s</b> với một tiến trình và <b>0,555 s</b> với <code>-j6</code>. Vì sao không phải khoảng 0,2 s?',
      opts: [
        'Vì make chỉ dùng được tối đa 3 lõi',
        'Vì bước liên kết cuối cùng không song song được và các tiến trình gcc còn tranh nhau ổ đĩa',
        'Vì -j6 phải chờ tất cả file .o xong mới bắt đầu, làm mất thời gian đồng bộ',
        'Vì mỗi tiến trình gcc chỉ chạy được ở 50% tốc độ khi có nhiều tiến trình'
      ],
      a: 1,
      why: 'Tăng tốc song song luôn bị chặn bởi phần <b>không song song được</b> — ở đây là lệnh liên kết cuối, chỉ một tiến trình. Cộng thêm 6 tiến trình gcc cùng đọc header từ đĩa. Kết quả đo được là <b>2,8 lần</b> trên 6 lõi. Hãy nhớ tỉ lệ này khi build kernel ở Chặng 07: tăng <code>-j</code> lên gấp đôi <b>không</b> làm build nhanh gấp đôi. Lưu ý build song song và build tăng dần là hai kỹ thuật khác nhau và chúng nhân với nhau.'
    },
    {
      q: 'Trong Makefile của kernel bạn thấy <code>obj-$(CONFIG_GPIO_ABC) += gpio-abc.o</code>. Dòng này làm gì khi <code>CONFIG_GPIO_ABC</code> có giá trị <code>n</code>?',
      opts: [
        'Gây lỗi vì obj-n không phải biến hợp lệ',
        'Thêm gpio-abc.o vào obj-y như bình thường',
        'Thêm gpio-abc.o vào biến obj-n, mà không quy tắc nào dùng tới, nên file bị bỏ qua',
        'Xóa gpio-abc.o khỏi danh sách obj-y nếu nó đã có ở đó'
      ],
      a: 2,
      why: 'Tên biến được ghép từ giá trị cấu hình: <code>y</code> cho <code>obj-y</code> (dịch vào kernel), <code>m</code> cho <code>obj-m</code> (thành module), <code>n</code> cho <code>obj-n</code> — một biến mà không quy tắc nào tham chiếu tới, nên nội dung của nó bị lãng quên. Một dòng, ba hành vi, không cần <code>ifeq</code> nào. Đây là mẹo hay nhất trong Kbuild và bạn sẽ gặp nó ở mọi Makefile con của kernel.'
    }
  ]
});

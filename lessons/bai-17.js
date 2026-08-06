/* Bài 17 — Thư viện tĩnh và động */
Lesson.register({
  id: 'bai-17',
  title: 'Thư viện tĩnh và động',
  minutes: 55,
  practice: 'Thực hành 35 phút',
  level: 'Trung cấp',

  intro:
    'Chặng 02 mở đầu bằng một câu hỏi: vì sao chương trình <code>hello world</code> liên kết ' +
    'tĩnh nặng gần một megabyte còn bản động chỉ 16 KB? Bài này trả lời trọn vẹn. Trên máy ' +
    'bạn, con số thật là <b>816 912 byte</b> so với <b>15 952 byte</b> — chênh <b>51,2 lần</b>, ' +
    'cho <i>cùng một</i> file <code>hello.c</code> mười một dòng. Nhưng câu trả lời thú vị hơn ' +
    'nằm ở chiều ngược lại: dù nặng gấp 51 lần, bản tĩnh vẫn thường là lựa chọn <b>đúng</b> ' +
    'cho thiết bị nhúng. Bạn sẽ tự tạo cả hai loại thư viện, đo cả hai, và hiểu vì sao.',

  goals: [
    'Tạo được thư viện tĩnh <code>.a</code> bằng <code>ar</code> và thư viện động <code>.so</code> bằng <code>gcc -shared -fPIC</code>',
    'Giải thích được vì sao <code>.so</code> bắt buộc phải biên dịch với <code>-fPIC</code>, dựa trên mã máy thật',
    'Liệt kê đúng thứ tự trình thông dịch động tìm thư viện, và dùng được <code>LD_LIBRARY_PATH</code>, <code>-rpath</code>, <code>$ORIGIN</code>',
    'Đọc được <code>ldd</code>, <code>nm -D</code>, <code>readelf -d</code> để biết một chương trình cần gì lúc chạy',
    'Giải thích được <code>soname</code> và cách đánh số phiên bản thư viện <code>.so.1.0.0</code>',
    'Chọn được tĩnh hay động cho một thiết bị nhúng cụ thể, dựa trên số đo chứ không cảm tính'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. BA CÁCH MỘT HÀM ĐẾN ĐƯỢC CHƯƠNG TRÌNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Ba cách một hàm đến được chương trình của bạn' },

    { t: 'p', x:
      'Ở Bài 15 bạn học rằng trình liên kết ghép mọi ký hiệu <b>U</b> với một ký hiệu ' +
      '<b>T</b>. Câu hỏi còn bỏ ngỏ là: <b>T</b> đó nằm ở đâu? Có đúng ba khả năng, và cả bài ' +
      'này xoay quanh khác biệt giữa chúng.' },

    { t: 'table',
      head: ['Nguồn', 'Đuôi file', 'Mã được sao chép vào file chạy?', 'Khi nào được nối'],
      rows: [
        ['File đối tượng rời', '<code>.o</code>', '<b>Có</b>, toàn bộ', 'Lúc liên kết (giai đoạn 4)'],
        ['Thư viện <b>tĩnh</b>', '<code>.a</code>', '<b>Có</b>, nhưng chỉ những <code>.o</code> thực sự cần', 'Lúc liên kết (giai đoạn 4)'],
        ['Thư viện <b>động</b>', '<code>.so</code>', '<b>Không</b> — chỉ ghi lại cái tên', 'Lúc <b>chạy</b>, bởi trình thông dịch động']
      ]},

    { t: 'cal', kind: 'why', title: 'Dòng thứ ba là điều mới mẻ duy nhất trong bài', x:
      '<p>Hai dòng đầu bạn đã biết: mã máy được chép thẳng vào file thực thi, và sau đó file ' +
      'đó tự đứng một mình.</p>' +
      '<p>Dòng thứ ba đảo ngược hoàn toàn. Trình liên kết <b>không</b> chép mã. Nó chỉ ghi vào ' +
      'file một dòng ghi chú: "tôi cần <code>libops.so</code>". Việc tìm file đó, nạp nó vào ' +
      'bộ nhớ và nối các lời gọi hàm được hoãn lại tới <b>mỗi lần chương trình khởi động</b>.</p>' +
      '<p>Điều này nghe như một sự phức tạp không cần thiết — cho tới khi bạn thấy con số: ' +
      '<b>20 chương trình</b> hello world liên kết động chiếm tổng cộng <b>319 040 byte</b> ' +
      'trên đĩa; hai mươi bản tĩnh chiếm <b>16 338 240 byte</b>. Gấp <b>51 lần</b>. Cả hai bộ ' +
      'làm việc y hệt nhau.</p>' },

    { t: 'fig',
      svg:
        '<svg viewBox="0 0 720 330" width="720" role="img" aria-label="So sánh liên kết tĩnh và liên kết động, từ mã nguồn tới lúc chương trình chạy">' +
        '<text class="d-t" x="20" y="20">LIEN KET TINH</text>' +

        '<rect class="d-box-a" x="20" y="32" width="110" height="36" rx="6"/>' +
        '<text class="d-tm" x="75" y="55" text-anchor="middle">main.o</text>' +
        '<rect class="d-box-w" x="20" y="76" width="110" height="36" rx="6"/>' +
        '<text class="d-tm" x="75" y="99" text-anchor="middle">libops.a</text>' +

        '<line class="d-line" x1="130" y1="50" x2="215" y2="70"/>' +
        '<path class="d-arrow" d="M215 70 l-8 -2 l0 8 z"/>' +
        '<line class="d-line" x1="130" y1="94" x2="215" y2="76"/>' +
        '<path class="d-arrow" d="M215 76 l-8 2 l0 -8 z"/>' +

        '<rect class="d-box" x="220" y="54" width="90" height="36" rx="6"/>' +
        '<text class="d-t" x="265" y="77" text-anchor="middle">ld</text>' +

        '<line class="d-line" x1="310" y1="72" x2="376" y2="72"/>' +
        '<path class="d-arrow" d="M376 72 l-8 -4 v8 z"/>' +

        '<rect class="d-box-g" x="382" y="46" width="150" height="52" rx="6"/>' +
        '<text class="d-tm" x="457" y="68" text-anchor="middle">prog_static</text>' +
        '<text class="d-ts" x="457" y="86" text-anchor="middle">chua san moi thu</text>' +

        '<line class="d-line" x1="532" y1="72" x2="590" y2="72"/>' +
        '<path class="d-arrow" d="M590 72 l-8 -4 v8 z"/>' +
        '<rect class="d-box-p" x="596" y="46" width="104" height="52" rx="6"/>' +
        '<text class="d-t" x="648" y="68" text-anchor="middle">CHAY</text>' +
        '<text class="d-ts" x="648" y="86" text-anchor="middle">khong can gi them</text>' +

        '<line class="d-line" x1="20" y1="130" x2="700" y2="130"/>' +

        '<text class="d-t" x="20" y="160">LIEN KET DONG</text>' +

        '<rect class="d-box-a" x="20" y="172" width="110" height="36" rx="6"/>' +
        '<text class="d-tm" x="75" y="195" text-anchor="middle">main.o</text>' +
        '<rect class="d-box-w" x="20" y="216" width="110" height="36" rx="6"/>' +
        '<text class="d-tm" x="75" y="239" text-anchor="middle">libops.so</text>' +

        '<line class="d-line" x1="130" y1="190" x2="215" y2="210"/>' +
        '<path class="d-arrow" d="M215 210 l-8 -2 l0 8 z"/>' +
        '<line class="d-line" x1="130" y1="234" x2="215" y2="216"/>' +
        '<path class="d-arrow" d="M215 216 l-8 2 l0 -8 z"/>' +

        '<rect class="d-box" x="220" y="194" width="90" height="36" rx="6"/>' +
        '<text class="d-t" x="265" y="217" text-anchor="middle">ld</text>' +

        '<line class="d-line" x1="310" y1="212" x2="376" y2="212"/>' +
        '<path class="d-arrow" d="M376 212 l-8 -4 v8 z"/>' +

        '<rect class="d-box-g" x="382" y="186" width="150" height="52" rx="6"/>' +
        '<text class="d-tm" x="457" y="208" text-anchor="middle">prog_dynamic</text>' +
        '<text class="d-ts" x="457" y="226" text-anchor="middle">chi ghi mot cai TEN</text>' +

        '<line class="d-line" x1="532" y1="212" x2="590" y2="212"/>' +
        '<path class="d-arrow" d="M590 212 l-8 -4 v8 z"/>' +
        '<rect class="d-box-p" x="596" y="186" width="104" height="52" rx="6"/>' +
        '<text class="d-t" x="648" y="208" text-anchor="middle">CHAY</text>' +
        '<text class="d-ts" x="648" y="226" text-anchor="middle">ld.so di TIM .so</text>' +

        '<line class="d-line" x1="75" y1="252" x2="640" y2="252"/>' +
        '<line class="d-line" x1="640" y1="252" x2="640" y2="242"/>' +
        '<path class="d-arrow" d="M640 242 l-4 8 h8 z"/>' +
        '<text class="d-ts" x="200" y="270">libops.so phai con o do LUC CHAY — neu thieu: error while loading shared libraries</text>' +

        '<rect class="d-box" x="20" y="286" width="680" height="36" rx="6"/>' +
        '<text class="d-ts" x="40" y="309">prog_static = 16 008 B  ·  prog_dynamic = 15 984 B + libops.so 15 216 B  ·  ban tinh hoan toan (-static) = 816 912 B</text>' +
        '</svg>',
      cap:
        'Cùng một mã nguồn, hai đường đi. Khác biệt cốt lõi: bản tĩnh không cần gì thêm lúc ' +
        'chạy, bản động phải tìm được file .so — và đó vừa là ưu điểm vừa là nhược điểm.' },

    /* ══════════════════════════════════════════════
       2. THƯ VIỆN TĨNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thư viện tĩnh .a — chỉ là một cái túi đựng .o' },

    { t: 'p', x:
      'Đây là phần dễ nhất của bài, vì thư viện tĩnh gần như không có gì bí ẩn. Nó là một ' +
      '<b>kho lưu trữ</b> (archive): nhiều file <code>.o</code> gói chung, cộng thêm một mục ' +
      'lục ký hiệu. Công cụ tạo ra nó tên là <code>ar</code>, có từ trước cả Linux.' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -c add.c sub.c mul.c\n' +
      'ar rcs libops.a add.o sub.o mul.o\n' +
      'ar tv libops.a' },

    { t: 'code', where: 'out', nocopy: true, code:
      'rw-r--r-- 0/0   1224 Jan  1 07:00 1970 add.o\n' +
      'rw-r--r-- 0/0   1224 Jan  1 07:00 1970 sub.o\n' +
      'rw-r--r-- 0/0   1224 Jan  1 07:00 1970 mul.o' },

    { t: 'cmdx', cmd: 'ar rcs libops.a add.o sub.o mul.o', title: 'Ba chữ cái sau ar',
      rows: [
        ['<code>r</code>', '<b>Replace</b> — thêm file vào kho, ghi đè nếu đã có', 'Đây là thao tác chính; chạy lại lệnh sau khi sửa một file là đủ để cập nhật'],
        ['<code>c</code>', '<b>Create</b> — tạo kho mới mà không cảnh báo', 'Không có <code>c</code>, <code>ar</code> in ra cảnh báo "creating…" mỗi lần đầu'],
        ['<code>s</code>', '<b>Symbol index</b> — dựng mục lục ký hiệu', 'Bắt buộc, nếu không trình liên kết không biết hàm nào nằm ở thành viên nào. Tương đương chạy <code>ranlib</code>'],
        ['<code>ar t</code>', 'Liệt kê tên các thành viên', '<code>t</code> là <i>table of contents</i>'],
        ['<code>ar tv</code>', 'Liệt kê kèm quyền, kích thước, thời gian', 'Thời gian là <code>Jan 1 1970</code> vì Ubuntu mặc định bật chế độ <b>xác định</b> (deterministic) — xem callout bên dưới'],
        ['<code>ar d</code>', '<b>Delete</b> — bỏ một thành viên ra khỏi kho', 'Ít dùng, nhưng có ích khi cần loại một module'],
        ['<code>ar x</code>', '<b>Extract</b> — moi các file <code>.o</code> ra lại', 'Cách xem một thư viện lạ chứa gì']
      ]},

    { t: 'cal', kind: 'info', title: 'Vì sao mọi thành viên đều mang ngày 1/1/1970', x:
      '<p>Ubuntu biên dịch <code>binutils</code> với chế độ <b>deterministic</b> bật sẵn: ' +
      '<code>ar</code> ghi số 0 vào các trường thời gian, UID và GID.</p>' +
      '<p>Lý do là <b>build tái lập được</b> (reproducible build): cùng mã nguồn phải cho ra ' +
      'file <code>.a</code> giống nhau <b>từng byte</b>, bất kể ai build và build lúc nào. Nếu ' +
      'nhúng thời gian thật vào, hai lần build cách nhau một giây sẽ cho hai file khác nhau, ' +
      'và không ai kiểm chứng được rằng bản nhị phân phát hành đúng là từ mã nguồn công bố.</p>' +
      '<p>Đây là chuẩn mực trong ngành nhúng, nơi bạn cần chứng minh firmware trên thiết bị ' +
      'khớp với mã nguồn đã kiểm định. Yocto ở <b>Chặng 11</b> dành rất nhiều công sức cho ' +
      'đúng mục tiêu này.</p>' },

    { t: 'p', x: 'Mục lục ký hiệu chính là thứ làm cho <code>.a</code> hữu ích:' },

    { t: 'code', where: 'wsl', code: 'nm libops.a' },

    { t: 'code', where: 'out', nocopy: true, code:
      'add.o:\n' +
      '0000000000000000 T add\n' +
      '\n' +
      'sub.o:\n' +
      '0000000000000000 T sub\n' +
      '\n' +
      'mul.o:\n' +
      '0000000000000000 T mul' },

    { t: 'p', x:
      'Giờ liên kết một chương trình <b>chỉ gọi <code>add()</code></b> và xem trình liên kết ' +
      'lấy những gì:' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall main.c -L. -lops -o prog_static\n' +
      './prog_static\n' +
      'nm prog_static | grep -E \' T (add|sub|mul)\'' },

    { t: 'code', where: 'out', nocopy: true, code:
      'add(2,3) = 5\n' +
      '000000000000117f T add' },

    { t: 'cal', kind: 'why', title: 'Chỉ add được lấy — sub và mul bị bỏ lại', x:
      '<p>Trình liên kết <b>không</b> nuốt cả file <code>.a</code>. Nó duyệt mục lục ký hiệu, ' +
      'tìm thành viên nào cung cấp ký hiệu đang thiếu, rồi chỉ moi <b>đúng thành viên đó</b> ra.</p>' +
      '<p>Đây là lý do người ta chia thư viện thành <b>nhiều file <code>.c</code> nhỏ, mỗi ' +
      'file một nhóm hàm</b>. Nếu bạn nhét cả ba hàm vào một <code>ops.c</code> duy nhất, ' +
      'chương trình chỉ dùng <code>add()</code> vẫn phải mang theo <code>sub()</code> và ' +
      '<code>mul()</code> — vì đơn vị lấy ra nhỏ nhất là <b>một file <code>.o</code></b>, ' +
      'không phải một hàm.</p>' +
      '<p>Với thiết bị nhúng có 4 MB flash, quy tắc "một hàm lớn — một file" là thật sự tiết ' +
      'kiệm. Cờ <code>-ffunction-sections -Wl,--gc-sections</code> ở <b>Bài 18</b> sẽ đẩy ' +
      'nguyên tắc này xuống mức từng hàm.</p>' },

    { t: 'cmdx', cmd: 'gcc main.c -L. -lops -o prog_static', title: 'Hai cờ tìm thư viện',
      rows: [
        ['<code>-L.</code>', 'Thêm thư mục hiện tại vào <b>đường tìm thư viện lúc liên kết</b>', 'Không có nó, <code>ld</code> chỉ tìm ở <code>/usr/lib</code>, <code>/lib</code> …'],
        ['<code>-lops</code>', 'Tìm file tên <code>libops.so</code>, nếu không có thì <code>libops.a</code>', 'Chữ <code>lib</code> ở đầu và đuôi file đều <b>tự thêm</b> — đây là quy ước, không phải phép màu'],
        ['Thứ tự', '<code>-lops</code> phải đứng <b>sau</b> <code>main.c</code>', 'Xem callout dưới — đây là lỗi kinh điển']
      ]},

    { t: 'cal', kind: 'danger', title: 'Thứ tự tham số liên kết có ý nghĩa — và nó ngược trực giác', x:
      '<p>Lệnh này <b>thất bại</b>:</p>' +
      '<p><code>gcc -Wall -L. -lops main.c -o prog</code></p>' +
      '<p><code>main.c:(.text+0x13): undefined reference to \'add\'</code></p>' +
      '<p>Vì trình liên kết đọc các tham số <b>từ trái sang phải, đúng một lượt</b>. Khi nó gặp ' +
      '<code>-lops</code>, danh sách ký hiệu còn thiếu vẫn <b>rỗng</b> — chưa ai cần gì cả — ' +
      'nên nó bỏ qua toàn bộ thư viện. Đến khi đọc <code>main.c</code> và phát hiện cần ' +
      '<code>add</code> thì thư viện đã trôi qua mất rồi.</p>' +
      '<p><b>Quy tắc:</b> thư viện luôn đứng <b>sau</b> thứ dùng nó. Cùng lý do, ' +
      '<code>gcc -lm quad.c</code> cũng hỏng còn <code>gcc quad.c -lm</code> thì chạy.</p>' +
      '<p>Nếu hai thư viện phụ thuộc vòng vào nhau, hãy lặp lại: ' +
      '<code>-la -lb -la</code>, hoặc bọc bằng ' +
      '<code>-Wl,--start-group … -Wl,--end-group</code>. Kernel dùng cách thứ hai.</p>' },

    /* ══════════════════════════════════════════════
       3. THƯ VIỆN ĐỘNG
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thư viện động .so — nạp lúc chạy' },

    { t: 'p', x:
      'Tạo thư viện động cần <b>hai</b> thay đổi so với thư viện tĩnh: biên dịch với ' +
      '<code>-fPIC</code>, và liên kết với <code>-shared</code>.' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall -fPIC -c add.c sub.c mul.c\n' +
      'gcc -shared -o libops.so add.o sub.o mul.o\n' +
      'stat -c \'%s %n\' libops.so libops.a\n' +
      'file libops.so' },

    { t: 'code', where: 'out', nocopy: true, code:
      '15216 libops.so\n' +
      '3948 libops.a\n' +
      'libops.so: ELF 64-bit LSB shared object, x86-64, version 1 (SYSV), dynamically linked, BuildID[sha1]=3e9e5d4c41134950099eebb0053f5a0f49bee6d5, not stripped' },

    { t: 'cal', kind: 'info', title: 'File .so nặng gấp gần 4 lần file .a — vì nó là một chương trình', x:
      '<p><b>3 948 byte</b> cho <code>.a</code>: ba file <code>.o</code> ghép lại cộng mục lục.</p>' +
      '<p><b>15 216 byte</b> cho <code>.so</code>: ngoài mã máy, nó còn có bảng ký hiệu động, ' +
      'bảng relocation, danh sách thư viện nó cần, và các đoạn khởi tạo. Chữ ' +
      '<code>shared object</code> trong output của <code>file</code> nói rõ: đây là một ' +
      '<b>đối tượng ELF hoàn chỉnh</b>, gần như một chương trình, chỉ thiếu hàm ' +
      '<code>main</code>.</p>' +
      '<p>Vì thế so kích thước <code>.a</code> với <code>.so</code> là so nhầm thứ. Cái đáng ' +
      'so là <b>tổng dung lượng của N chương trình</b> — và ở đó bản động thắng đậm.</p>' },

    { t: 'code', where: 'wsl', code:
      'gcc -Wall main.c -L. -lops -o prog_dynamic\n' +
      'stat -c \'%s %n\' prog_dynamic prog_static\n' +
      './prog_dynamic' },

    { t: 'code', where: 'out', nocopy: true, code:
      '15984 prog_dynamic\n' +
      '16008 prog_static\n' +
      './prog_dynamic: error while loading shared libraries: libops.so: cannot open shared object file: No such file or directory' },

    { t: 'cal', kind: 'warn', title: 'Liên kết thành công nhưng chạy thất bại — hãy quen với điều này', x:
      '<p>Đây là khác biệt lớn nhất, thực dụng nhất giữa hai loại thư viện. ' +
      '<code>gcc</code> không báo lỗi gì; file <code>prog_dynamic</code> được tạo ra bình ' +
      'thường. Chỉ tới khi chạy, chương trình mới chết với mã thoát <b>127</b>.</p>' +
      '<p>Nguyên nhân: trình liên kết lúc build tìm thấy <code>libops.so</code> nhờ ' +
      '<code>-L.</code>. Nhưng cờ <code>-L</code> <b>chỉ có tác dụng lúc build</b>. Lúc chạy, ' +
      'người đi tìm là một chương trình khác — <b>trình thông dịch động</b> — và nó không hề ' +
      'biết gì về <code>-L.</code>.</p>' +
      '<p>Trong nghề nhúng bạn sẽ gặp đúng thông báo này khi copy một chương trình sang thiết ' +
      'bị mà quên copy thư viện đi kèm. Nó là lý do đầu tiên khiến nhiều nhóm chọn liên kết ' +
      'tĩnh.</p>' },

    { t: 'p', x:
      'Ba công cụ cho biết một chương trình cần gì lúc chạy. Chúng trả lời ba câu hỏi khác ' +
      'nhau, đừng nhầm:' },

    { t: 'code', where: 'wsl', code:
      'readelf -d prog_dynamic | head -5\n' +
      'echo \'---\'\n' +
      'ldd prog_dynamic' },

    { t: 'code', where: 'out', nocopy: true, code:
      'Dynamic section at offset 0x2db0 contains 28 entries:\n' +
      '  Tag        Type                         Name/Value\n' +
      ' 0x0000000000000001 (NEEDED)             Shared library: [libops.so]\n' +
      ' 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]\n' +
      '---\n' +
      '\tlinux-vdso.so.1 (0x00007ab790217000)\n' +
      '\tlibops.so => not found\n' +
      '\tlibc.so.6 => /usr/lib/x86_64-linux-gnu/libc.so.6 (0x00007ab78fe00000)\n' +
      '\t/lib64/ld-linux-x86-64.so.2 (0x00007ab790219000)' },

    { t: 'table',
      head: ['Công cụ', 'Trả lời câu hỏi', 'Lưu ý'],
      rows: [
        ['<code>readelf -d</code>', '<b>Chương trình <i>khai</i> là cần gì?</b> Đọc mục <code>NEEDED</code> trong file', 'Chỉ đọc file, <b>không</b> chạy gì. An toàn tuyệt đối'],
        ['<code>ldd</code>', '<b>Những cái tên đó sẽ được giải quyết thành file nào?</b>', 'Nó thật sự <b>nhờ trình thông dịch động nạp thử</b>. Đừng chạy <code>ldd</code> trên file lạ không tin cậy'],
        ['<code>nm -D</code>', '<b>Thư viện này xuất ra những hàm nào?</b>', 'Chữ <code>-D</code> là <i>dynamic</i> — bảng ký hiệu động, khác bảng <code>.symtab</code> thường']
      ]},

    { t: 'cal', kind: 'info', title: 'Bốn dòng của ldd, giải mã từng dòng', x:
      '<p><code>linux-vdso.so.1</code> — <b>không phải file trên đĩa</b>. Đây là một vùng nhớ ' +
      'do kernel gắn thẳng vào mọi tiến trình, chứa vài hàm siêu nhanh như ' +
      '<code>gettimeofday()</code> để tránh phải gọi hệ thống. Bạn sẽ gặp lại nó ở ' +
      '<b>Chặng 07</b>.</p>' +
      '<p><code>libops.so =&gt; not found</code> — thủ phạm. Chương trình khai là cần, nhưng ' +
      'không tìm ra.</p>' +
      '<p><code>libc.so.6</code> — thư viện C, được tìm thấy vì nó nằm trong đường tìm chuẩn.</p>' +
      '<p><code>/lib64/ld-linux-x86-64.so.2</code> — chính là <b>trình thông dịch động</b>. ' +
      'Đây là chương trình mà kernel khởi động <b>trước</b> chương trình của bạn; nó nạp các ' +
      '<code>.so</code> rồi mới nhảy vào <code>_start</code>. Tên của nó được ghi cứng trong ' +
      'file thực thi, ở section <code>.interp</code> — Bài 18 sẽ mở ra xem.</p>' },

    /* ══════════════════════════════════════════════
       4. PIC
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Vì sao .so bắt buộc phải có -fPIC' },

    { t: 'p', x:
      '<code>PIC</code> viết tắt của <b>Position Independent Code</b> — mã máy độc lập vị ' +
      'trí. Nghĩa là: mã này chạy đúng dù được nạp vào <b>bất kỳ địa chỉ nào</b> trong bộ nhớ.' },

    { t: 'cal', kind: 'why', title: 'Vì sao thư viện động không thể biết trước địa chỉ của mình', x:
      '<p>Một chương trình liên kết tĩnh biết chính xác nó sẽ nằm ở đâu — trình liên kết đã ' +
      'chốt mọi địa chỉ lúc build.</p>' +
      '<p>Thư viện động thì không thể. Cùng một <code>libc.so.6</code> được <b>hàng trăm tiến ' +
      'trình</b> dùng chung, mỗi tiến trình có bản đồ bộ nhớ riêng, và mỗi tiến trình lại nạp ' +
      'một tập <code>.so</code> khác nhau. Không có địa chỉ nào là an toàn cho tất cả.</p>' +
      '<p>Thêm nữa, Linux hiện đại bật <b>ASLR</b> — ngẫu nhiên hoá bố cục bộ nhớ mỗi lần ' +
      'chạy, để kẻ tấn công không đoán được địa chỉ hàm. Bạn đã thấy điều đó trong ' +
      '<code>ldd</code>: chạy hai lần cho hai địa chỉ nạp khác nhau.</p>' +
      '<p>Vậy nên mã trong <code>.so</code> phải tự xoay xở: <b>không được chứa địa chỉ tuyệt ' +
      'đối nào</b>. Đó chính là ý nghĩa của <code>-fPIC</code>.</p>' },

    { t: 'p', x:
      'Khác biệt nhìn thấy được ngay trong mã máy. Đây là một hàm tăng biến toàn cục, biên ' +
      'dịch hai kiểu:' },

    { t: 'code', where: 'file', name: 'counter.c', lang: 'c', code:
      'int counter = 0;\n' +
      'int increment(void) { return ++counter; }' },

    { t: 'code', where: 'wsl', code:
      'gcc -fno-pie -fno-PIC -c counter.c -o counter.nopic.o\n' +
      'gcc -fPIC          -c counter.c -o counter.pic.o\n' +
      'objdump -d counter.nopic.o | grep -A8 \'<increment>:\'\n' +
      'objdump -d counter.pic.o   | grep -A8 \'<increment>:\'' },

    { t: 'code', where: 'out', nocopy: true, code:
      '--- khong PIC:\n' +
      '0000000000000000 <increment>:\n' +
      '   0:\tf3 0f 1e fa          \tendbr64\n' +
      '   4:\t55                   \tpush   %rbp\n' +
      '   5:\t48 89 e5             \tmov    %rsp,%rbp\n' +
      '   8:\t8b 05 00 00 00 00    \tmov    0x0(%rip),%eax        # e <increment+0xe>\n' +
      '   e:\t83 c0 01             \tadd    $0x1,%eax\n' +
      '  11:\t89 05 00 00 00 00    \tmov    %eax,0x0(%rip)        # 17 <increment+0x17>\n' +
      '--- co PIC:\n' +
      '0000000000000000 <increment>:\n' +
      '   0:\tf3 0f 1e fa          \tendbr64\n' +
      '   4:\t55                   \tpush   %rbp\n' +
      '   5:\t48 89 e5             \tmov    %rsp,%rbp\n' +
      '   8:\t48 8b 05 00 00 00 00 \tmov    0x0(%rip),%rax        # f <increment+0xf>\n' +
      '   f:\t8b 00                \tmov    (%rax),%eax\n' +
      '  11:\t8d 50 01             \tlea    0x1(%rax),%edx\n' +
      '  14:\t48 8b 05 00 00 00 00 \tmov    0x0(%rip),%rax        # 1b <increment+0x1b>\n' +
      '  1b:\t89 10                \tmov    %edx,(%rax)' },

    { t: 'cal', kind: 'info', title: 'Bản PIC có thêm một lần truy cập bộ nhớ — đó là cái giá', x:
      '<p>Bản <b>không PIC</b>: <code>mov 0x0(%rip),%eax</code> — nạp thẳng giá trị của ' +
      '<code>counter</code>. Số <code>0x0</code> sẽ được trình liên kết điền thành khoảng cách ' +
      'thật, cố định vĩnh viễn.</p>' +
      '<p>Bản <b>PIC</b>: hai lệnh. <code>mov 0x0(%rip),%rax</code> lấy <b>địa chỉ</b> của ' +
      '<code>counter</code> từ một bảng tên là <b>GOT</b> (Global Offset Table), rồi ' +
      '<code>mov (%rax),%eax</code> mới lấy giá trị.</p>' +
      '<p>GOT nằm trong vùng dữ liệu ghi được, và được trình thông dịch động điền lúc nạp. ' +
      'Nhờ vậy phần <b>mã</b> không bao giờ phải sửa — nó dùng chung được giữa các tiến trình, ' +
      'chỉ mỗi tiến trình có GOT riêng.</p>' +
      '<p>Cái giá: <b>một lần đọc bộ nhớ phụ trội cho mỗi lần truy cập biến toàn cục</b>. Rất ' +
      'nhỏ, nhưng có thật — và là một lý do nữa vì sao hệ nhúng hiệu năng cao đôi khi chọn ' +
      'liên kết tĩnh.</p>' },

    { t: 'p', x:
      'Nếu bạn quên <code>-fPIC</code> và thư viện có biến toàn cục, trình liên kết từ chối ' +
      'thẳng — kèm hướng dẫn khắc phục ngay trong thông báo:' },

    { t: 'code', where: 'wsl', code: 'gcc -shared -o libcounter_bad.so counter.nopic.o' },

    { t: 'code', where: 'out', nocopy: true, code:
      '/usr/bin/x86_64-linux-gnu-ld.bfd: counter.nopic.o: warning: relocation against `counter\' in read-only section `.text\'\n' +
      '/usr/bin/x86_64-linux-gnu-ld.bfd: counter.nopic.o: relocation R_X86_64_PC32 against symbol `counter\' can not be used when making a shared object; recompile with -fPIC\n' +
      '/usr/bin/x86_64-linux-gnu-ld.bfd: final link failed: bad value\n' +
      'collect2: error: ld returned 1 exit status' },

    { t: 'cal', kind: 'tip', title: 'Trên Ubuntu hiện nay, quên -fPIC thường vẫn chạy — đừng dựa vào đó', x:
      '<p>Nếu bạn thử <code>gcc -shared</code> với các file <code>.o</code> biên dịch bình ' +
      'thường (không có <code>-fPIC</code>), rất có thể nó <b>vẫn thành công</b>. Lý do: GCC ' +
      'trên Ubuntu bật sẵn <code>-fPIE</code> để hỗ trợ ASLR cho chương trình thực thi, và ' +
      'PIE đã tạo ra mã gần như độc lập vị trí rồi.</p>' +
      '<p>Nhưng <b>PIE không phải PIC</b>. PIE giả định mã chỉ được nạp một lần, ở vai trò ' +
      'chương trình chính, và các ký hiệu không bị thay thế bởi thư viện khác. Với những mã ' +
      'nguồn phức tạp hơn, hoặc khi biên dịch chéo cho ARM với toolchain không bật PIE, bạn sẽ ' +
      'gặp đúng lỗi ở trên.</p>' +
      '<p><b>Quy tắc thực dụng:</b> luôn viết <code>-fPIC</code> khi build thư viện động. Nó ' +
      'không bao giờ sai, và nó nói rõ ý định của bạn.</p>' },

    /* ══════════════════════════════════════════════
       5. LOADER TÌM Ở ĐÂU
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Trình thông dịch động tìm thư viện ở đâu' },

    { t: 'p', x:
      'Đây là phần bạn sẽ dùng nhiều nhất trong công việc thật. Khi một chương trình khai ' +
      '<code>NEEDED: libops.so</code>, <code>ld.so</code> tìm cái tên đó theo <b>đúng thứ tự ' +
      'sau</b>, dừng ngay khi tìm thấy:' },

    { t: 'table',
      head: ['#', 'Nơi tìm', 'Đặt bằng cách nào', 'Dùng khi nào'],
      rows: [
        ['1', '<code>DT_RPATH</code> ghi trong file', '<code>-Wl,-rpath,…</code> (cũ, không có RUNPATH)', 'Hầu như không nên dùng nữa'],
        ['2', 'Biến môi trường <code>LD_LIBRARY_PATH</code>', '<code>LD_LIBRARY_PATH=. ./prog</code>', '<b>Thử nghiệm, gỡ lỗi.</b> Không dùng trong sản phẩm'],
        ['3', '<code>DT_RUNPATH</code> ghi trong file', '<code>-Wl,-rpath,…</code> (mặc định hiện nay)', '<b>Đóng gói phần mềm mang theo thư viện riêng</b>'],
        ['4', 'Bộ nhớ đệm <code>/etc/ld.so.cache</code>', '<code>ldconfig</code> quét <code>/etc/ld.so.conf.d/</code>', 'Thư viện cài đặt vào hệ thống'],
        ['5', 'Đường mặc định <code>/lib</code>, <code>/usr/lib</code> …', 'Có sẵn, không cần đặt gì', 'Thư viện hệ thống chuẩn']
      ]},

    { t: 'cal', kind: 'warn', title: 'RPATH đứng trước LD_LIBRARY_PATH, RUNPATH đứng sau — khác biệt này gây đau đầu', x:
      '<p>Đọc lại bảng: mục 1 (<code>RPATH</code>) ở <b>trên</b> <code>LD_LIBRARY_PATH</code>, ' +
      'còn mục 3 (<code>RUNPATH</code>) ở <b>dưới</b>.</p>' +
      '<p>Nghĩa là với <code>RPATH</code> kiểu cũ, bạn <b>không thể</b> dùng ' +
      '<code>LD_LIBRARY_PATH</code> để đè lên khi gỡ lỗi — đường ghi cứng trong file luôn ' +
      'thắng. Đó chính là lý do <code>RUNPATH</code> ra đời và trở thành mặc định.</p>' +
      '<p>Trên máy bạn, <code>gcc -Wl,-rpath,…</code> sinh ra <b><code>RUNPATH</code></b>. Nếu ' +
      'gặp một hệ thống cũ sinh ra <code>RPATH</code>, thêm ' +
      '<code>-Wl,--enable-new-dtags</code>.</p>' },

    { t: 'p', x: 'Xem tận mắt <code>ld.so</code> đi tìm, bằng biến <code>LD_DEBUG</code>:' },

    { t: 'code', where: 'wsl', code:
      'LD_DEBUG=libs LD_LIBRARY_PATH=. ./prog_dynamic 2>&1 | head -12' },

    { t: 'code', where: 'out', nocopy: true, code:
      '      7584:\tfind library=libops.so [0]; searching\n' +
      '      7584:\t search path=./glibc-hwcaps/x86-64-v4:./glibc-hwcaps/x86-64-v3:./glibc-hwcaps/x86-64-v2:.\t\t(LD_LIBRARY_PATH)\n' +
      '      7584:\t  trying file=./glibc-hwcaps/x86-64-v4/libops.so\n' +
      '      7584:\t    (no such file)\n' +
      '      7584:\t  trying file=./glibc-hwcaps/x86-64-v3/libops.so\n' +
      '      7584:\t    (no such file)\n' +
      '      7584:\t  trying file=./glibc-hwcaps/x86-64-v2/libops.so\n' +
      '      7584:\t    (no such file)\n' +
      '      7584:\t  trying file=./libops.so\n' +
      '      7584:\t\n' +
      '      7584:\tfind library=libc.so.6 [0]; searching\n' +
      '      7584:\t search path=./glibc-hwcaps/x86-64-v4:./glibc-hwcaps/x86-64-v3:./glibc-hwcaps/x86-64-v2:.\t\t(LD_LIBRARY_PATH)' },

    { t: 'cal', kind: 'tip', title: 'LD_DEBUG là công cụ gỡ lỗi thư viện mạnh nhất mà ít người biết', x:
      '<p><code>7584</code> là PID. Bạn thấy rõ từng file được thử và kết quả.</p>' +
      '<p>Các giá trị hữu ích khác: <code>LD_DEBUG=libs</code> (tìm thư viện), ' +
      '<code>=bindings</code> (mỗi ký hiệu được nối vào đâu), <code>=reloc</code> (quá trình ' +
      'relocation), <code>=statistics</code> (thời gian nạp), <code>=all</code> (tất cả — rất ' +
      'nhiều dòng). <code>LD_DEBUG=help ./prog</code> liệt kê đầy đủ.</p>' +
      '<p>Ba thư mục <code>glibc-hwcaps/x86-64-v2/v3/v4</code> là cơ chế chọn bản thư viện tối ' +
      'ưu cho từng thế hệ CPU. Chúng không tồn tại nên bị bỏ qua ngay.</p>' },

    { t: 'p', x:
      'Ba cách khắc phục lỗi <code>cannot open shared object file</code>, xếp theo mức độ ' +
      'nên dùng trong sản phẩm thật:' },

    { t: 'code', where: 'wsl', code:
      '# 1. Tam thoi — chi cho lan chay nay\n' +
      'LD_LIBRARY_PATH=. ./prog_dynamic\n' +
      '\n' +
      '# 2. Ghi vao chinh file thuc thi — $ORIGIN = thu muc chua file do\n' +
      'gcc -Wall main.c -L. -lops -Wl,-rpath,\'$ORIGIN\' -o prog_dynamic\n' +
      './prog_dynamic\n' +
      '\n' +
      '# 3. Cai vao he thong (can quyen root)\n' +
      '# sudo cp libops.so /usr/local/lib/ && sudo ldconfig' },

    { t: 'code', where: 'out', nocopy: true, code:
      'add(2,3) = 5\n' +
      'add(2,3) = 5' },

    { t: 'code', where: 'wsl', code:
      'readelf -d prog_dynamic | grep -E \'NEEDED|RUNPATH\'\n' +
      'ldd prog_dynamic | grep ops' },

    { t: 'code', where: 'out', nocopy: true, code:
      ' 0x0000000000000001 (NEEDED)             Shared library: [libops.so]\n' +
      ' 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]\n' +
      ' 0x000000000000001d (RUNPATH)            Library runpath: [$ORIGIN]\n' +
      '\tlibops.so => /home/shinarus/bai17/libops.so (0x000078f38c946000)' },

    { t: 'cal', kind: 'why', title: '$ORIGIN là mẹo quan trọng nhất trong cả bài này', x:
      '<p><code>$ORIGIN</code> không phải biến shell. Nó là một <b>ký hiệu đặc biệt do ' +
      '<code>ld.so</code> hiểu</b>, được thay bằng thư mục chứa file thực thi <b>lúc chạy</b>.</p>' +
      '<p>Nhờ vậy bạn đóng gói được một thư mục di động:</p>' +
      '<p><code>/opt/myapp/bin/controller</code> với ' +
      '<code>-Wl,-rpath,\'$ORIGIN/../lib\'</code> sẽ tự tìm thư viện ở ' +
      '<code>/opt/myapp/lib/</code>. Copy nguyên thư mục <code>/opt/myapp</code> sang chỗ ' +
      'khác, sang thiết bị khác — vẫn chạy, không cần sửa gì, không cần ' +
      '<code>LD_LIBRARY_PATH</code>, không cần <code>ldconfig</code>.</p>' +
      '<p>Đây là cách các ứng dụng nhúng thương mại được đóng gói. Nhớ <b>dấu nháy đơn</b> ' +
      'quanh <code>\'$ORIGIN\'</code> — nếu không, shell sẽ nuốt mất <code>$ORIGIN</code> và ' +
      'thay bằng chuỗi rỗng.</p>' },

    { t: 'p', x:
      'Cách thứ 3 dựa vào bộ nhớ đệm mà <code>ldconfig</code> dựng sẵn. Trên máy bạn nó đang ' +
      'chứa:' },

    { t: 'code', where: 'wsl', code: 'ldconfig -p | head -1' },

    { t: 'code', where: 'out', nocopy: true, code:
      '489 libs found in cache `/etc/ld.so.cache\'' },

    { t: 'cal', kind: 'info', title: 'Vì sao có bộ nhớ đệm', x:
      '<p><b>489</b> thư viện. Nếu <code>ld.so</code> phải quét từng thư mục cho từng thư viện ' +
      'của từng chương trình khởi động, chi phí sẽ rất lớn — mọi lệnh bạn gõ đều chậm đi.</p>' +
      '<p><code>/etc/ld.so.cache</code> là bảng tra cứu nhị phân sẵn: tên thư viện → đường dẫn ' +
      'đầy đủ. <code>ldconfig</code> dựng lại nó, và <b>chỉ khi bạn chạy ' +
      '<code>ldconfig</code></b>. Đó là lý do sau khi copy một <code>.so</code> mới vào ' +
      '<code>/usr/local/lib</code>, bạn <b>bắt buộc</b> phải chạy <code>sudo ldconfig</code> — ' +
      'quên bước này là lỗi cực kỳ phổ biến.</p>' },

    /* ══════════════════════════════════════════════
       6. SONAME
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'soname — cách đánh số phiên bản thư viện' },

    { t: 'p', x:
      'Bạn đã thấy <code>libc.so.<b>6</b></code> chứ không phải <code>libc.so</code>. Con số ' +
      'đó là <b>soname</b>, và nó giải một bài toán thật: làm sao nâng cấp thư viện mà không ' +
      'làm hỏng các chương trình đang dùng nó.' },

    { t: 'code', where: 'wsl', code:
      'gcc -shared -Wl,-soname,libops.so.1 -o libops.so.1.0.0 add.o sub.o mul.o\n' +
      'ln -sf libops.so.1.0.0 libops.so.1\n' +
      'ln -sf libops.so.1     libops.so\n' +
      'ls -l libops.so*' },

    { t: 'code', where: 'out', nocopy: true, code:
      'lrwxrwxrwx 1 shinarus shinarus    11 Aug  5 21:38 libops.so -> libops.so.1\n' +
      'lrwxrwxrwx 1 shinarus shinarus    15 Aug  5 21:38 libops.so.1 -> libops.so.1.0.0\n' +
      '-rwxr-xr-x 1 shinarus shinarus 15216 Aug  5 21:38 libops.so.1.0.0' },

    { t: 'code', where: 'wsl', code:
      'readelf -d libops.so.1.0.0 | grep SONAME\n' +
      'gcc -Wall main.c -L. -lops -Wl,-rpath,\'$ORIGIN\' -o prog_versioned\n' +
      'readelf -d prog_versioned | grep NEEDED' },

    { t: 'code', where: 'out', nocopy: true, code:
      ' 0x000000000000000e (SONAME)             Library soname: [libops.so.1]\n' +
      ' 0x0000000000000001 (NEEDED)             Shared library: [libops.so.1]\n' +
      ' 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]' },

    { t: 'cal', kind: 'why', title: 'Chương trình khai libops.so.1 chứ không phải libops.so', x:
      '<p>Bạn liên kết bằng <code>-lops</code>, tức là qua liên kết mềm ' +
      '<code>libops.so</code>. Nhưng trong file thực thi lại ghi ' +
      '<code>NEEDED: libops.so.<b>1</b></code>.</p>' +
      '<p>Vì trình liên kết đọc trường <code>SONAME</code> bên trong thư viện và <b>chép nó</b> ' +
      'vào <code>NEEDED</code>, thay vì chép tên file mà nó mở. Đây là toàn bộ mấu chốt của ' +
      'cơ chế phiên bản.</p>' },

    { t: 'fig',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Ba tầng tên của một thư viện động: linker name, soname, real name">' +
        '<rect class="d-box-a" x="20" y="24" width="200" height="56" rx="6"/>' +
        '<text class="d-tm" x="120" y="46" text-anchor="middle">libops.so</text>' +
        '<text class="d-ts" x="120" y="64" text-anchor="middle">linker name — chi luc build</text>' +

        '<line class="d-line" x1="220" y1="52" x2="266" y2="52"/>' +
        '<path class="d-arrow" d="M266 52 l-8 -4 v8 z"/>' +

        '<rect class="d-box-p" x="272" y="24" width="200" height="56" rx="6"/>' +
        '<text class="d-tm" x="372" y="46" text-anchor="middle">libops.so.1</text>' +
        '<text class="d-ts" x="372" y="64" text-anchor="middle">soname — ghi vao NEEDED</text>' +

        '<line class="d-line" x1="472" y1="52" x2="518" y2="52"/>' +
        '<path class="d-arrow" d="M518 52 l-8 -4 v8 z"/>' +

        '<rect class="d-box-g" x="524" y="24" width="176" height="56" rx="6"/>' +
        '<text class="d-tm" x="612" y="46" text-anchor="middle">libops.so.1.0.0</text>' +
        '<text class="d-ts" x="612" y="64" text-anchor="middle">real name — file that</text>' +

        '<text class="d-ts" x="20" y="106">Nang cap SUA LOI: chi doi file that, soname giu nguyen -> moi chuong trinh cu chay tiep</text>' +
        '<rect class="d-box" x="20" y="116" width="680" height="42" rx="6"/>' +
        '<text class="d-tm" x="40" y="142">libops.so.1  ->  libops.so.1.0.<tspan class="d-t">1</tspan>          NEEDED van la libops.so.1   OK</text>' +

        '<text class="d-ts" x="20" y="184">Doi API KHONG tuong thich: tang soname -> hai ban ton tai song song, khong dam nhau</text>' +
        '<rect class="d-box-w" x="20" y="194" width="680" height="42" rx="6"/>' +
        '<text class="d-tm" x="40" y="220">libops.so.<tspan class="d-t">2</tspan>  ->  libops.so.2.0.0          chuong trinh cu van tim libops.so.1</text>' +
        '</svg>',
      cap:
        'Ba tầng tên tồn tại để một máy có thể chứa đồng thời libops.so.1 và libops.so.2. ' +
        'Chỉ tăng số soname khi phá vỡ tương thích — đó là hợp đồng với mọi chương trình đã ' +
        'biên dịch.' },

    { t: 'terms', items: [
      ['linker name', '<code>libX.so</code>', 'Liên kết mềm chỉ dùng lúc build, do gói <code>-dev</code> cung cấp. Trên thiết bị chạy thật thường <b>không có</b> file này'],
      ['soname', '<code>libX.so.N</code>', 'Ghi bên trong thư viện. Là cái tên được chép vào <code>NEEDED</code> của chương trình. Tăng <code>N</code> = phá vỡ tương thích'],
      ['real name', '<code>libX.so.N.m.p</code>', 'File thật chứa mã. <code>m</code> minor, <code>p</code> patch — đổi tự do miễn API không đổi'],
      ['ABI', 'Application Binary Interface', 'Giao diện ở mức nhị phân: kích thước struct, thứ tự tham số, quy ước gọi hàm. Đổi ABI mà không tăng soname = chương trình cũ sập một cách khó hiểu'],
      ['symbol versioning', '—', 'Cơ chế tinh vi hơn của glibc: một <code>.so</code> chứa nhiều phiên bản của <b>cùng một hàm</b>. Đó là lý do <code>libc.so.6</code> đứng ở số 6 suốt hơn 25 năm']
    ]},

    /* ══════════════════════════════════════════════
       7. KHI CÓ CẢ HAI
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Khi thư mục có cả .a lẫn .so — ai thắng?' },

    { t: 'p', x:
      'Trong thư mục làm việc của bạn hiện có cả <code>libops.a</code> và ' +
      '<code>libops.so</code>. Cùng một cờ <code>-lops</code>, trình liên kết chọn cái nào?' },

    { t: 'code', where: 'wsl', code:
      'gcc main.c -L. -lops -Wl,-rpath,\'$ORIGIN\' -o prog_priority\n' +
      'readelf -d prog_priority | grep NEEDED\n' +
      'echo \'--- ep dung ban tinh:\'\n' +
      'gcc main.c -L. -Wl,-Bstatic -lops -Wl,-Bdynamic -o prog_force_static\n' +
      'readelf -d prog_force_static | grep NEEDED\n' +
      'stat -c \'%s %n\' prog_priority prog_force_static' },

    { t: 'code', where: 'out', nocopy: true, code:
      ' 0x0000000000000001 (NEEDED)             Shared library: [libops.so.1]\n' +
      ' 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]\n' +
      '--- ep dung ban tinh:\n' +
      ' 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]\n' +
      '15984 prog_priority\n' +
      '16008 prog_force_static' },

    { t: 'cmdx', cmd: 'gcc main.c -L. -Wl,-Bstatic -lops -Wl,-Bdynamic -o prog',
      title: 'Ép tĩnh cho đúng một thư viện',
      rows: [
        ['<code>-Wl,</code>', 'Chuyển phần sau dấu phẩy thẳng cho <code>ld</code>', '<code>gcc</code> không hiểu <code>-Bstatic</code>; nó chỉ chuyển tiếp'],
        ['<code>-Bstatic</code>', 'Từ đây trở đi, chỉ nhận <code>.a</code>', 'Là một <b>công tắc</b>, có tác dụng với mọi <code>-l</code> đứng sau nó'],
        ['<code>-Bdynamic</code>', 'Bật lại chế độ ưu tiên <code>.so</code>', '<b>Bắt buộc phải có</b> — nếu quên, cả <code>libc</code> cũng bị liên kết tĩnh']
      ]},

    { t: 'cal', kind: 'why', title: 'Mặc định luôn ưu tiên .so — và vì sao bạn cần biết cách ép', x:
      '<p><code>NEEDED: libops.so.1</code> chứng minh: gặp cả hai, <code>ld</code> chọn bản ' +
      '<b>động</b>. Đây là quy tắc cố định, không phụ thuộc file nào mới hơn.</p>' +
      '<p>Hệ quả thực tế: bạn build một chương trình, chạy tốt trên máy phát triển, copy sang ' +
      'thiết bị — và nó chết vì thiết bị không có <code>.so</code> đó. Bạn <i>tưởng</i> mình ' +
      'đã liên kết tĩnh vì thư mục có <code>.a</code>.</p>' +
      '<p>Cặp <code>-Bstatic</code>/<code>-Bdynamic</code> là cách ép <b>một thư viện cụ thể</b> ' +
      'vào chương trình trong khi <code>libc</code> vẫn động. Đây là cấu hình rất hay dùng ' +
      'trong nhúng: thư viện riêng của bạn thì tĩnh (khỏi lo triển khai), thư viện hệ thống ' +
      'thì động (khỏi phình dung lượng).</p>' },

    /* ══════════════════════════════════════════════
       8. CHỌN TĨNH HAY ĐỘNG
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Tĩnh hay động — quyết định bằng số đo' },

    { t: 'p', x:
      'Giờ trả lời câu hỏi mở đầu Chặng 02. Đây là <code>hello.c</code> — mười một dòng, ' +
      'chỉ gọi <code>printf</code> — biên dịch hai kiểu:' },

    { t: 'code', where: 'wsl', code:
      'gcc -O2 -o hello_dynamic hello.c\n' +
      'gcc -O2 -static -o hello_static hello.c\n' +
      'stat -c \'%s %n\' hello_dynamic hello_static\n' +
      'size hello_dynamic hello_static' },

    { t: 'code', where: 'out', nocopy: true, code:
      '15952 hello_dynamic\n' +
      '816912 hello_static\n' +
      '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
      '   1382\t    600\t      8\t   1990\t    7c6\thello_dynamic\n' +
      ' 699895\t  22824\t  22560\t 745279\t  b5f3f\thello_static' },

    { t: 'cal', kind: 'info', title: 'Đọc bảng size — 1 382 byte mã so với 699 895 byte mã', x:
      '<p><code>size</code> chia file thành ba phần (Bài 18 sẽ mổ kỹ):</p>' +
      '<p><b><code>text</code></b> — mã máy. <b>1 382</b> byte ở bản động, <b>699 895</b> byte ' +
      'ở bản tĩnh. Chênh <b>506 lần</b>. Toàn bộ phần dôi ra là <code>printf</code> cùng bộ ' +
      'máy khởi tạo của glibc, đã được chép vào file.</p>' +
      '<p><b><code>data</code></b> — biến toàn cục có giá trị khởi tạo. <b>600</b> so với ' +
      '<b>22 824</b>.</p>' +
      '<p><b><code>bss</code></b> — biến toàn cục bằng 0, <b>không chiếm chỗ trên đĩa</b>, chỉ ' +
      'chiếm RAM. <b>8</b> so với <b>22 560</b>.</p>' +
      '<p>Chú ý <code>dec = 745 279</code> nhỏ hơn kích thước file <code>816 912</code>: phần ' +
      'chênh là bảng ký hiệu, thông tin gỡ lỗi và phần đệm căn trang. ' +
      '<code>strip</code> ở Bài 18 sẽ cắt bớt.</p>' },

    { t: 'p', x:
      'Nhưng so một chương trình là so sai. Cái quyết định dung lượng firmware là ' +
      '<b>tổng của cả hệ thống</b>. Hai mươi chương trình nhỏ:' },

    { t: 'code', where: 'wsl', code:
      'du -cb app*_dynamic | tail -1\n' +
      'du -cb app*_static | tail -1\n' +
      'stat -c%s /usr/lib/x86_64-linux-gnu/libc.so.6' },

    { t: 'code', where: 'out', nocopy: true, code:
      '319040\ttotal\n' +
      '16338240\ttotal\n' +
      '2186512' },

    { t: 'table',
      head: ['Cách làm', 'Tổng trên đĩa', 'Phép tính'],
      rows: [
        ['20 chương trình <b>động</b> + <code>libc.so.6</code>', '<b>2 505 552 B</b>', '319 040 + 2 186 512'],
        ['20 chương trình <b>tĩnh</b>', '<b>16 338 240 B</b>', 'mỗi bản mang một bản sao glibc riêng'],
        ['Chênh lệch', '<b>6,5 lần</b>', '16 338 240 ÷ 2 505 552']
      ]},

    { t: 'cal', kind: 'why', title: 'Điểm hoà vốn — và vì sao nó lại nghiêng về phía tĩnh trong nhúng', x:
      '<p>Với <b>1</b> chương trình: động tốn 15 952 + 2 186 512 = <b>2,2 MB</b>; tĩnh tốn ' +
      '<b>0,8 MB</b>. <b>Tĩnh thắng.</b></p>' +
      '<p>Với <b>20</b> chương trình: động tốn <b>2,5 MB</b>; tĩnh tốn <b>16,3 MB</b>. ' +
      '<b>Động thắng đậm.</b></p>' +
      '<p>Điểm hoà vốn rơi vào khoảng <b>3 chương trình</b>. Một bản Ubuntu có hàng nghìn — ' +
      'nên desktop dùng động là đương nhiên.</p>' +
      '<p>Nhưng nhiều thiết bị nhúng chỉ chạy <b>một</b> chương trình ứng dụng trên nền ' +
      'BusyBox. Ở quy mô đó, tĩnh vừa nhỏ hơn, vừa đơn giản hơn. Đây chính là lý do bạn sẽ ' +
      'thấy <code>CONFIG_STATIC</code> trong BusyBox ở <b>Chặng 09</b>.</p>' },

    { t: 'p', x: 'Bảng so sánh đầy đủ, dùng để ra quyết định:' },

    { t: 'table',
      head: ['Tiêu chí', 'Liên kết tĩnh <code>.a</code>', 'Liên kết động <code>.so</code>'],
      rows: [
        ['Kích thước 1 chương trình', '<b>816 912 B</b> (lớn)', '<b>15 952 B</b> (nhỏ)'],
        ['Tổng khi có nhiều chương trình', 'Tăng tuyến tính — <b>tệ</b>', 'Dùng chung thư viện — <b>tốt</b>'],
        ['RAM khi chạy nhiều tiến trình', 'Mỗi tiến trình một bản mã riêng', '<b>Phần mã dùng chung một bản vật lý</b>'],
        ['Vá lỗi bảo mật trong libc', 'Phải <b>build lại toàn bộ</b> ứng dụng', 'Thay một file <code>.so</code> là xong'],
        ['Triển khai', '<b>Một file, chép là chạy</b>', 'Phải mang theo mọi <code>.so</code> phụ thuộc'],
        ['Thời gian khởi động', '<b>Nhanh nhất</b> — không phải nạp gì', 'Chậm hơn: <code>ld.so</code> tìm, nạp, relocate'],
        ['Tốc độ gọi hàm', '<code>call</code> trực tiếp', 'Qua <b>PLT/GOT</b>, thêm một lần gián tiếp'],
        ['Cứu hộ khi hệ thống hỏng', '<b>Vẫn chạy</b> dù <code>/lib</code> hỏng', 'Chết ngay nếu thiếu <code>ld.so</code>'],
        ['Giấy phép LGPL', 'Ràng buộc chặt — phải cho phép người dùng thay thư viện', 'Thoả mãn dễ dàng'],
        ['Plugin nạp lúc chạy', 'Không thể', '<code>dlopen()</code> — cách duy nhất']
      ]},

    { t: 'cal', kind: 'danger', title: 'glibc tĩnh vẫn cần file .so lúc chạy — cái bẫy nguy hiểm nhất', x:
      '<p>Liên kết tĩnh <b>không</b> đảm bảo chương trình tự đứng một mình, nếu bạn dùng ' +
      'glibc và gọi các hàm tra cứu tên (<code>getaddrinfo</code>, <code>gethostbyname</code>, ' +
      '<code>getpwnam</code>). Trình liên kết cảnh báo thẳng:</p>' +
      '<p><code>warning: Using \'getaddrinfo\' in statically linked applications requires at ' +
      'runtime the shared libraries from the glibc version used for linking</code></p>' +
      '<p>Nguyên nhân: cơ chế <b>NSS</b> (Name Service Switch) của glibc đọc ' +
      '<code>/etc/nsswitch.conf</code> rồi <code>dlopen()</code> các module ' +
      '<code>libnss_files.so</code>, <code>libnss_dns.so</code> <b>lúc chạy</b>. Không có ' +
      'cách nào nhét chúng vào file tĩnh.</p>' +
      '<p>Hậu quả trên thiết bị: chương trình chạy được, nhưng phân giải tên máy im lặng thất ' +
      'bại — một lỗi rất khó truy. Đây là lý do lớn nhất khiến ngành nhúng chọn ' +
      '<b>musl</b> hoặc <b>uClibc-ng</b> thay glibc khi cần liên kết tĩnh. Chặng 04 và ' +
      'Chặng 11 sẽ quay lại điểm này.</p>' },

    { t: 'p', x:
      'Cuối cùng, một minh chứng cho ưu điểm lớn nhất của thư viện động. Sửa ' +
      '<code>add()</code> thành <code>a + b + 1000</code>, build lại <b>chỉ thư viện</b>, ' +
      'rồi chạy lại <b>chính hai file thực thi cũ</b> — không biên dịch lại chúng:' },

    { t: 'code', where: 'wsl', code:
      'sed -i \'s/return a + b;/return a + b + 1000;/\' add.c\n' +
      'gcc -fPIC -c add.c -o add.o\n' +
      'gcc -shared -o libops.so add.o sub.o mul.o\n' +
      'echo \'--- chay lai CHUONG TRINH CU, khong bien dich lai:\'\n' +
      './prog_dynamic\n' +
      'echo \'--- con ban tinh thi sao:\'\n' +
      './prog_static' },

    { t: 'code', where: 'out', nocopy: true, code:
      '--- chay lai CHUONG TRINH CU, khong bien dich lai:\n' +
      'add(2,3) = 1005\n' +
      '--- con ban tinh thi sao:\n' +
      'add(2,3) = 5' },

    { t: 'cal', kind: 'why', title: 'Đây là toàn bộ lý do thư viện động tồn tại', x:
      '<p><code>prog_dynamic</code> đổi hành vi mà <b>không hề được chạm tới</b>. Bản tĩnh giữ ' +
      'nguyên vì mã của <code>add()</code> đã nằm sẵn bên trong nó.</p>' +
      '<p>Đổi <code>1000</code> thành một lỗ hổng bảo mật trong glibc và bạn hiểu ngay giá trị ' +
      'thực: nhà phân phối thay <b>một</b> file <code>libc.so.6</code>, mọi chương trình trên ' +
      'máy được vá. Nếu tất cả liên kết tĩnh, phải build lại <b>từng cái</b>, và phải biết ' +
      'chắc mình có mã nguồn của từng cái.</p>' +
      '<p>Mặt trái nằm ở đúng cùng một cơ chế: nếu ai đó thay <code>libops.so</code> bằng bản ' +
      'độc hại, chương trình của bạn thi hành mã đó mà không hay biết. Quyền ghi vào thư mục ' +
      'thư viện là quyền rất nhạy cảm.</p>' },

    /* ══════════════════════════════════════════════
       9. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: xây một thư viện theo cả hai cách' },

    { t: 'p', x:
      'Bạn sẽ tạo một thư viện ba hàm, đóng gói nó thành <code>.a</code> rồi thành ' +
      '<code>.so</code>, gặp và tự sửa lỗi <code>cannot open shared object file</code>, chứng ' +
      'minh được ưu điểm của thư viện động, và cuối cùng đo cả ba cách liên kết. Toàn bộ mọi ' +
      'kết quả dưới đây là output thật từ máy bạn.' },

    { t: 'steps', items: [

      /* ---- Bước 1 ---- */
      { title: 'Tạo dự án thư viện năm file', blocks: [
        { t: 'p', x:
          'Chia ba hàm ra <b>ba file <code>.c</code> riêng</b> — đây là chủ đích, bước 2 sẽ ' +
          'cho bạn thấy vì sao nó quan trọng.' },

        { t: 'code', where: 'wsl', code:
          'mkdir -p ~/bai17-th && cd ~/bai17-th' },

        { t: 'code', where: 'file', name: '~/bai17-th/ops.h', lang: 'c', code:
          '#ifndef OPS_H\n' +
          '#define OPS_H\n' +
          '\n' +
          'int add(int a, int b);\n' +
          'int sub(int a, int b);\n' +
          'int mul(int a, int b);\n' +
          '\n' +
          '#endif',
          notes: ['Chỉ có <b>khai báo</b>. Đây là phần giao diện mà người dùng thư viện nhìn thấy; ' +
                  'phần cài đặt nằm trong các file <code>.c</code>. Header guard bạn đã học ở Bài 15.'] },

        { t: 'code', where: 'file', name: '~/bai17-th/add.c', lang: 'c', code:
          '#include "ops.h"\n' +
          'int add(int a, int b) { return a + b; }' },

        { t: 'code', where: 'file', name: '~/bai17-th/sub.c', lang: 'c', code:
          '#include "ops.h"\n' +
          'int sub(int a, int b) { return a - b; }' },

        { t: 'code', where: 'file', name: '~/bai17-th/mul.c', lang: 'c', code:
          '#include "ops.h"\n' +
          'int mul(int a, int b) { return a * b; }' },

        { t: 'code', where: 'file', name: '~/bai17-th/main.c', lang: 'c', code:
          '#include <stdio.h>\n' +
          '#include "ops.h"\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    printf("add(2,3) = %d\\n", add(2, 3));\n' +
          '    return 0;\n' +
          '}',
          notes: ['Chú ý: chương trình <b>chỉ gọi <code>add()</code></b>, không gọi ' +
                  '<code>sub()</code> hay <code>mul()</code>. Đây là điều kiện cho phép thí ' +
                  'nghiệm ở bước sau.'] },

        { t: 'cal', kind: 'tip', title: 'Dùng heredoc để tạo file nhanh', x:
          '<p>Thay vì mở trình soạn thảo năm lần, bạn có thể dùng heredoc như đã học ở Bài 13:</p>' +
          '<p><code>cat &gt; add.c &lt;&lt;\'EOF\'</code> → gõ nội dung → dòng cuối gõ ' +
          '<code>EOF</code>.</p>' +
          '<p>Dấu nháy đơn quanh <code>\'EOF\'</code> ngăn shell diễn giải <code>$</code> và ' +
          '<code>\\</code> bên trong — bắt buộc ở đây vì <code>main.c</code> có ' +
          '<code>\\n</code>.</p>' }
      ]},

      /* ---- Bước 2 ---- */
      { title: 'Đóng gói thành thư viện tĩnh và xem trình liên kết lấy gì', blocks: [
        { t: 'p', x:
          'Biên dịch tới mức <code>.o</code> (dừng ở giai đoạn 3 của Bài 15), rồi gói bằng ' +
          '<code>ar</code>:' },

        { t: 'code', where: 'wsl', code:
          'gcc -Wall -Wextra -c add.c sub.c mul.c\n' +
          'ar rcs libops.a add.o sub.o mul.o\n' +
          'ar tv libops.a' },

        { t: 'code', where: 'out', nocopy: true, code:
          'rw-r--r-- 0/0   1224 Jan  1 07:00 1970 add.o\n' +
          'rw-r--r-- 0/0   1224 Jan  1 07:00 1970 sub.o\n' +
          'rw-r--r-- 0/0   1224 Jan  1 07:00 1970 mul.o' },

        { t: 'p', x: 'Mục lục ký hiệu cho biết hàm nào nằm ở thành viên nào:' },

        { t: 'code', where: 'wsl', code: 'nm libops.a' },

        { t: 'code', where: 'out', nocopy: true, code:
          'add.o:\n' +
          '0000000000000000 T add\n' +
          '\n' +
          'sub.o:\n' +
          '0000000000000000 T sub\n' +
          '\n' +
          'mul.o:\n' +
          '0000000000000000 T mul' },

        { t: 'p', x: 'Liên kết và kiểm tra xem <code>sub</code>, <code>mul</code> có bị lôi vào không:' },

        { t: 'code', where: 'wsl', code:
          'gcc -Wall main.c -L. -lops -o prog_static\n' +
          './prog_static\n' +
          'nm prog_static | grep -E \' T (add|sub|mul)$\'\n' +
          'stat -c \'%s %n\' libops.a prog_static' },

        { t: 'code', where: 'out', nocopy: true, code:
          'add(2,3) = 5\n' +
          '000000000000117f T add\n' +
          '3948 libops.a\n' +
          '16008 prog_static' },

        { t: 'cal', kind: 'info', title: 'Kết quả cần đọc kỹ: chỉ một dòng', x:
          '<p>Lệnh <code>grep</code> tìm cả ba hàm nhưng chỉ <code>add</code> xuất hiện. ' +
          '<code>sub.o</code> và <code>mul.o</code> nằm nguyên trong <code>libops.a</code>, ' +
          'không được chép vào <code>prog_static</code>.</p>' +
          '<p>Thử ngay: thêm <code>printf("%d", sub(9,4));</code> vào <code>main.c</code>, build ' +
          'lại và chạy <code>grep</code> lần nữa — bạn sẽ thấy hai dòng.</p>' }
      ]},

      /* ---- Bước 3 ---- */
      { title: 'Tạo thư viện động và gặp lỗi lúc chạy', blocks: [
        { t: 'p', x:
          'Biên dịch lại cùng ba file, lần này thêm <code>-fPIC</code>, rồi liên kết bằng ' +
          '<code>-shared</code>:' },

        { t: 'code', where: 'wsl', code:
          'gcc -Wall -Wextra -fPIC -c add.c sub.c mul.c\n' +
          'gcc -shared -o libops.so add.o sub.o mul.o\n' +
          'stat -c \'%s %n\' libops.so\n' +
          'file libops.so' },

        { t: 'code', where: 'out', nocopy: true, code:
          '15216 libops.so\n' +
          'libops.so: ELF 64-bit LSB shared object, x86-64, version 1 (SYSV), dynamically linked, BuildID[sha1]=3e9e5d4c41134950099eebb0053f5a0f49bee6d5, not stripped' },

        { t: 'p', x:
          'Liên kết lại chương trình. Lệnh giống hệt bước 2 — chỉ khác là bây giờ thư mục có ' +
          'thêm <code>libops.so</code>:' },

        { t: 'code', where: 'wsl', code:
          'gcc -Wall main.c -L. -lops -o prog_dynamic\n' +
          'stat -c \'%s %n\' prog_dynamic\n' +
          './prog_dynamic\n' +
          'echo "exit=$?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          '15984 prog_dynamic\n' +
          './prog_dynamic: error while loading shared libraries: libops.so: cannot open shared object file: No such file or directory\n' +
          'exit=127' },

        { t: 'cal', kind: 'warn', title: 'Lỗi này là chủ đích — hãy dừng lại một nhịp', x:
          '<p>Bạn <b>không</b> gõ sai. Thư viện đang nằm ngay trong thư mục hiện tại, ' +
          '<code>gcc</code> đã tìm thấy nó lúc build, vậy mà chương trình vẫn chết.</p>' +
          '<p>Điểm mấu chốt: <b>người tìm lúc build và người tìm lúc chạy là hai chương trình ' +
          'khác nhau</b>, dùng hai bộ quy tắc khác nhau. <code>-L.</code> chỉ nói với người ' +
          'thứ nhất.</p>' +
          '<p>Mã thoát <b>127</b> theo quy ước nghĩa là "không tìm thấy thứ cần chạy" — cùng mã ' +
          'với <code>command not found</code> mà bạn gặp ở Bài 4.</p>' },

        { t: 'p', x: 'Chẩn đoán bằng hai công cụ:' },

        { t: 'code', where: 'wsl', code:
          'ldd prog_dynamic\n' +
          'readelf -d prog_dynamic | grep NEEDED' },

        { t: 'code', where: 'out', nocopy: true, code:
          '\tlinux-vdso.so.1 (0x00007264c41da000)\n' +
          '\tlibops.so => not found\n' +
          '\tlibc.so.6 => /usr/lib/x86_64-linux-gnu/libc.so.6 (0x00007264c3e00000)\n' +
          '\t/lib64/ld-linux-x86-64.so.2 (0x00007264c41dc000)\n' +
          ' 0x0000000000000001 (NEEDED)             Shared library: [libops.so]\n' +
          ' 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]' },

        { t: 'cal', kind: 'tip', title: 'Địa chỉ trong ngoặc của bạn sẽ khác', x:
          '<p>Các số như <code>0x00007264c3e00000</code> là địa chỉ nạp, do ASLR sinh ngẫu ' +
          'nhiên. Chạy <code>ldd prog_dynamic</code> hai lần liên tiếp bạn sẽ thấy chúng đổi. ' +
          'Điều duy nhất cần đọc là <code>=&gt; not found</code>.</p>' }
      ]},

      /* ---- Bước 4 ---- */
      { title: 'Sửa lỗi bằng hai cách, so sánh hai cách', blocks: [
        { t: 'p', x:
          'Cách nhanh nhất — đặt biến môi trường <b>chỉ cho lần chạy này</b>, không cần build lại:' },

        { t: 'code', where: 'wsl', code:
          'LD_LIBRARY_PATH=. ./prog_dynamic\n' +
          'echo "exit=$?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'add(2,3) = 5\n' +
          'exit=0' },

        { t: 'cmdx', cmd: 'LD_LIBRARY_PATH=. ./prog_dynamic', title: 'Cú pháp đặt biến trước lệnh',
          rows: [
            ['<code>LD_LIBRARY_PATH=.</code>', 'Đặt biến môi trường <b>chỉ cho tiến trình này</b>', 'Không có <code>export</code>, không dấu chấm phẩy — shell của bạn không bị ảnh hưởng'],
            ['<code>.</code>', 'Thư mục hiện tại', 'Nhiều thư mục thì ngăn bằng dấu hai chấm: <code>.:/opt/lib</code>'],
            ['<code>./prog_dynamic</code>', 'Lệnh được chạy với biến đó', 'Kiểm chứng: gõ <code>echo $LD_LIBRARY_PATH</code> sau đó, kết quả rỗng']
          ]},

        { t: 'p', x:
          'Cách bền vững — ghi đường tìm vào <b>chính file thực thi</b>, dùng ' +
          '<code>$ORIGIN</code> để đường dẫn là tương đối:' },

        { t: 'code', where: 'wsl', code:
          'gcc -Wall main.c -L. -lops -Wl,-rpath,\'$ORIGIN\' -o prog_dynamic\n' +
          './prog_dynamic\n' +
          'readelf -d prog_dynamic | grep -E \'NEEDED|RUNPATH\'\n' +
          'ldd prog_dynamic | grep ops' },

        { t: 'code', where: 'out', nocopy: true, code:
          'add(2,3) = 5\n' +
          ' 0x0000000000000001 (NEEDED)             Shared library: [libops.so]\n' +
          ' 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]\n' +
          ' 0x000000000000001d (RUNPATH)            Library runpath: [$ORIGIN]\n' +
          '\tlibops.so => /home/shinarus/bai17-th/libops.so (0x0000730daac68000)' },

        { t: 'p', x: 'Xem <code>ld.so</code> thật sự đi tìm ở đâu:' },

        { t: 'code', where: 'wsl', code:
          'LD_DEBUG=libs ./prog_dynamic 2>&1 | grep ops | head -4' },

        { t: 'code', where: 'out', nocopy: true, code:
          '      8082:\tfind library=libops.so [0]; searching\n' +
          '      8082:\t  trying file=/home/shinarus/bai17-th/glibc-hwcaps/x86-64-v4/libops.so\n' +
          '      8082:\t  trying file=/home/shinarus/bai17-th/glibc-hwcaps/x86-64-v3/libops.so\n' +
          '      8082:\t  trying file=/home/shinarus/bai17-th/glibc-hwcaps/x86-64-v2/libops.so' },

        { t: 'cal', kind: 'why', title: '$ORIGIN đã được thay bằng đường dẫn thật', x:
          '<p>Trong file ghi <code>$ORIGIN</code>, nhưng khi chạy, <code>ld.so</code> thay nó ' +
          'bằng <code>/home/shinarus/bai17-th</code> — thư mục chứa <code>prog_dynamic</code>.</p>' +
          '<p>Kiểm chứng sức mạnh của cách này: ' +
          '<code>mkdir /tmp/pkg && cp prog_dynamic libops.so /tmp/pkg/ && /tmp/pkg/prog_dynamic</code>. ' +
          'Nó vẫn chạy, dù bạn đang ở thư mục khác và không đặt biến môi trường nào.</p>' +
          '<p>So sánh: nếu chỉ dùng <code>LD_LIBRARY_PATH=.</code> thì phải <code>cd</code> vào ' +
          'đúng thư mục mới chạy được. Đó là lý do <code>LD_LIBRARY_PATH</code> chỉ nên dùng ' +
          'để thử nghiệm.</p>' }
      ]},

      /* ---- Bước 5 ---- */
      { title: 'Chứng minh ưu điểm lớn nhất của thư viện động', blocks: [
        { t: 'p', x:
          'Sửa <code>add()</code>, build lại <b>chỉ thư viện</b>, rồi chạy lại hai file thực ' +
          'thi cũ mà <b>không</b> biên dịch lại chúng:' },

        { t: 'code', where: 'wsl', code:
          'sed -i \'s/return a + b;/return a + b + 1000;/\' add.c\n' +
          'gcc -fPIC -c add.c -o add.o\n' +
          'gcc -shared -o libops.so add.o sub.o mul.o\n' +
          'echo \'--- prog_dynamic (KHONG bien dich lai):\'\n' +
          './prog_dynamic\n' +
          'echo \'--- prog_static (KHONG bien dich lai):\'\n' +
          './prog_static' },

        { t: 'code', where: 'out', nocopy: true, code:
          '--- prog_dynamic (KHONG bien dich lai):\n' +
          'add(2,3) = 1005\n' +
          '--- prog_static (KHONG bien dich lai):\n' +
          'add(2,3) = 5' },

        { t: 'cal', kind: 'why', title: 'Hai kết quả khác nhau từ hai file không hề bị chạm tới', x:
          '<p><code>prog_dynamic</code> nạp mã mới vì nó chỉ giữ <b>cái tên</b> ' +
          '<code>libops.so</code>, còn mã nằm ở file bên ngoài — file mà bạn vừa thay.</p>' +
          '<p><code>prog_static</code> giữ nguyên vì mã của <code>add()</code> đã được chép vào ' +
          'bên trong nó từ bước 2.</p>' +
          '<p>Đây là cơ chế cho phép vá lỗ hổng bảo mật của <code>libc</code> trên cả hệ thống ' +
          'bằng cách thay một file. Và cũng là cơ chế khiến một thư viện bị tráo đổi có thể ' +
          'chiếm quyền điều khiển chương trình.</p>' },

        { t: 'p', x: 'Trả lại như cũ trước khi sang bước sau:' },

        { t: 'code', where: 'wsl', code:
          'sed -i \'s/return a + b + 1000;/return a + b;/\' add.c\n' +
          'gcc -fPIC -c add.c -o add.o\n' +
          'gcc -shared -o libops.so add.o sub.o mul.o' }
      ]},

      /* ---- Bước 6 ---- */
      { title: 'Đánh số phiên bản đúng chuẩn với soname', blocks: [
        { t: 'p', x:
          'Xoá file <code>.so</code> phẳng và dựng lại theo bộ ba tên chuẩn của Linux:' },

        { t: 'code', where: 'wsl', code:
          'rm -f libops.so\n' +
          'gcc -shared -Wl,-soname,libops.so.1 -o libops.so.1.0.0 add.o sub.o mul.o\n' +
          'ln -sf libops.so.1.0.0 libops.so.1\n' +
          'ln -sf libops.so.1     libops.so\n' +
          'ls -l libops.so*' },

        { t: 'code', where: 'out', nocopy: true, code:
          'lrwxrwxrwx 1 shinarus shinarus    11 Aug  5 21:42 libops.so -> libops.so.1\n' +
          'lrwxrwxrwx 1 shinarus shinarus    15 Aug  5 21:42 libops.so.1 -> libops.so.1.0.0\n' +
          '-rwxr-xr-x 1 shinarus shinarus 15216 Aug  5 21:42 libops.so.1.0.0' },

        { t: 'code', where: 'wsl', code:
          'readelf -d libops.so.1.0.0 | grep SONAME\n' +
          'gcc -Wall main.c -L. -lops -Wl,-rpath,\'$ORIGIN\' -o prog_versioned\n' +
          'readelf -d prog_versioned | grep NEEDED\n' +
          './prog_versioned\n' +
          'nm -D libops.so.1.0.0 | grep \' T \'' },

        { t: 'code', where: 'out', nocopy: true, code:
          ' 0x000000000000000e (SONAME)             Library soname: [libops.so.1]\n' +
          ' 0x0000000000000001 (NEEDED)             Shared library: [libops.so.1]\n' +
          ' 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]\n' +
          'add(2,3) = 5\n' +
          '00000000000010f9 T add\n' +
          '0000000000001127 T mul\n' +
          '0000000000001111 T sub' },

        { t: 'cal', kind: 'info', title: 'Bạn liên kết qua libops.so nhưng file ghi libops.so.1', x:
          '<p>Chuỗi liên kết mềm: <code>-lops</code> mở <code>libops.so</code> → ' +
          '<code>libops.so.1</code> → <code>libops.so.1.0.0</code>. Nhưng ' +
          '<code>NEEDED</code> lại ghi <code>libops.so.1</code>, vì trình liên kết chép ' +
          'trường <code>SONAME</code> chứ không chép tên file.</p>' +
          '<p>Thử ngay: <code>rm libops.so</code> rồi <code>./prog_versioned</code> — vẫn ' +
          'chạy, vì lúc chạy chỉ cần <code>libops.so.1</code>. Đó chính là lý do thiết bị chạy ' +
          'thật không cần gói <code>-dev</code>.</p>' }
      ]},

      /* ---- Bước 7 ---- */
      { title: 'Đo ba cách liên kết và ép tĩnh một thư viện', blocks: [
        { t: 'p', x:
          'Cuối cùng, dựng ba biến thể của cùng một chương trình và đặt chúng cạnh nhau:' },

        { t: 'code', where: 'wsl', code:
          'gcc -Wall main.c -L. -Wl,-Bstatic -lops -Wl,-Bdynamic -o prog_force_static\n' +
          'readelf -d prog_force_static | grep NEEDED\n' +
          './prog_force_static\n' +
          'gcc -static -Wall main.c -L. -lops -o prog_full_static\n' +
          'stat -c \'%s %n\' prog_dynamic prog_force_static prog_full_static\n' +
          'size prog_dynamic prog_full_static' },

        { t: 'code', where: 'out', nocopy: true, code:
          ' 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]\n' +
          'add(2,3) = 5\n' +
          '15984 prog_dynamic\n' +
          '16008 prog_force_static\n' +
          '816912 prog_full_static\n' +
          '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
          '   1507\t    640\t      8\t   2155\t    86b\tprog_dynamic\n' +
          ' 699331\t  22776\t  22560\t 744667\t  b5cdb\tprog_full_static' },

        { t: 'table',
          head: ['Biến thể', 'Kích thước', '<code>libops</code>', '<code>libc</code>', 'Chạy được ở máy trắng?'],
          rows: [
            ['<code>prog_dynamic</code>', '15 984 B', 'động', 'động', 'Không — thiếu <code>libops.so.1</code>'],
            ['<code>prog_force_static</code>', '16 008 B', '<b>tĩnh</b>', 'động', 'Có, nếu máy có glibc'],
            ['<code>prog_full_static</code>', '<b>816 912 B</b>', 'tĩnh', '<b>tĩnh</b>', '<b>Có, luôn luôn</b>']
          ]},

        { t: 'cal', kind: 'tip', title: 'prog_force_static là cấu hình đáng nhớ nhất trong bài', x:
          '<p>Chỉ hơn bản hoàn toàn động <b>24 byte</b>, nhưng đã bỏ được phụ thuộc vào ' +
          '<code>libops.so</code>. So với bản <code>-static</code>, nó nhỏ hơn <b>51 lần</b>.</p>' +
          '<p>Trong thực tế nhúng, đây thường là điểm cân bằng đúng: thư viện <b>của bạn</b> ' +
          'liên kết tĩnh (không phải lo triển khai, không phải lo phiên bản), còn ' +
          '<code>libc</code> liên kết động (dùng chung với BusyBox và mọi thứ khác trên ' +
          'thiết bị, và vá được khi có lỗ hổng).</p>' },

        { t: 'p', x: 'Dọn dẹp khi đã xong:' },

        { t: 'code', where: 'wsl', code: 'cd ~ && rm -rf ~/bai17-th' }
      ]}

    ]},

    /* ══════════════════════════════════════════════
       10. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Mọi thông báo dưới đây được tạo ra thật trên máy bạn trong lúc chuẩn bị bài này. Nhớ ' +
      'mặt chúng sẽ tiết kiệm cho bạn rất nhiều giờ.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>ld: cannot find -lops: No such file or directory</code>',
         'Trình liên kết không thấy <code>libops.a</code> hay <code>libops.so</code> trong đường tìm',
         'Thêm <code>-L</code> trỏ tới thư mục chứa thư viện. Kiểm tra tên file có đủ tiền tố <code>lib</code> và đuôi đúng'],

        ['<code>main.c:(.text+0x13): undefined reference to `add\'</code>',
         '<code>-lops</code> đặt <b>trước</b> <code>main.c</code>; trình liên kết đọc một lượt từ trái sang phải',
         'Đặt mọi <code>-l…</code> ở <b>cuối</b> dòng lệnh, sau các file nguồn và <code>.o</code>'],

        ['<code>undefined reference to `sqrt\'</code>',
         'Dùng hàm toán học mà quên <code>-lm</code> — glibc vẫn tách <code>libm</code> riêng',
         'Thêm <code>-lm</code> vào <b>cuối</b> lệnh: <code>gcc quad.c -o quad -lm</code>'],

        ['<code>error while loading shared libraries: libops.so: cannot open shared object file</code> (thoát <b>127</b>)',
         'Liên kết thành công nhưng lúc chạy <code>ld.so</code> không tìm ra <code>.so</code>. <code>-L</code> không có tác dụng lúc chạy',
         'Thử nghiệm: <code>LD_LIBRARY_PATH=. ./prog</code>. Sản phẩm: build lại với <code>-Wl,-rpath,\'$ORIGIN\'</code>, hoặc chép vào <code>/usr/local/lib</code> rồi <code>sudo ldconfig</code>'],

        ['<code>relocation R_X86_64_PC32 against symbol `counter\' can not be used when making a shared object; recompile with -fPIC</code>',
         'Gói các <code>.o</code> không độc lập vị trí vào một <code>.so</code>',
         'Biên dịch lại <b>mọi</b> file nguồn của thư viện với <code>-fPIC</code>, rồi mới <code>gcc -shared</code>'],

        ['<code>./libtest.a: error adding symbols: archive has no index; run ranlib to add one</code>',
         'Tạo kho bằng <code>ar rcS</code> (chữ <b>S</b> hoa = bỏ mục lục) hoặc quên cờ <code>s</code>',
         'Dùng <code>ar rcs</code> (chữ <b>s</b> thường), hoặc chữa file đã có bằng <code>ranlib libtest.a</code>'],

        ['<code>ar: creating libnew.a</code>',
         'Không phải lỗi — chỉ là thông báo vì thiếu cờ <code>c</code>',
         'Thêm <code>c</code>: <code>ar rcs …</code>. Nếu không, mỗi lần tạo kho mới sẽ có dòng thừa này trong log build'],

        ['<code>RUNPATH  Library runpath: []</code> — rỗng, rồi chạy vẫn lỗi 127',
         'Viết <code>-Wl,-rpath,$ORIGIN</code> <b>không có nháy đơn</b>; shell đã thay <code>$ORIGIN</code> bằng chuỗi rỗng trước khi <code>gcc</code> nhìn thấy',
         'Luôn viết <code>-Wl,-rpath,\'$ORIGIN\'</code>. Kiểm chứng bằng <code>readelf -d</code> sau khi build'],

        ['<code>cannot find -lgcc_s: … have you installed the static version of the gcc_s library ?</code>',
         'Dùng <code>-Wl,-Bstatic</code> mà quên <code>-Wl,-Bdynamic</code> sau đó; công tắc còn bật nên cả thư viện hệ thống cũng bị đòi bản tĩnh',
         'Luôn đóng cặp: <code>-Wl,-Bstatic -lops -Wl,-Bdynamic</code>'],

        ['<code>not a dynamic executable</code> (từ <code>ldd</code>, thoát mã <b>1</b>)',
         'Chạy <code>ldd</code> trên file liên kết tĩnh — nó không có phụ thuộc động nào',
         'Không phải lỗi. Đây là cách nhanh nhất để xác nhận một file đã liên kết tĩnh hoàn toàn'],

        ['<code>nm: libops.so: no symbols</code>',
         'File đã bị <code>strip</code>; bảng ký hiệu thường <code>.symtab</code> đã bị cắt',
         'Dùng <code>nm <b>-D</b></code> — bảng ký hiệu động không bao giờ bị strip, vì <code>ld.so</code> cần nó lúc chạy'],

        ['<code>warning: Using \'getaddrinfo\' in statically linked applications requires at runtime the shared libraries from the glibc version used for linking</code>',
         'Liên kết tĩnh với glibc nhưng dùng hàm NSS — các module <code>libnss_*.so</code> vẫn phải nạp lúc chạy',
         'Chấp nhận và mang theo <code>libnss_*.so</code>, hoặc chuyển sang <b>musl</b>/<b>uClibc-ng</b> nếu thật sự cần một file độc lập']
      ]},

    /* ══════════════════════════════════════════════
       11. RECAP
       ══════════════════════════════════════════════ */
    { t: 'recap', items: [
      'Thư viện <b>tĩnh <code>.a</code></b> chỉ là kho chứa nhiều <code>.o</code> cộng mục lục ký hiệu, tạo bằng <code>ar rcs</code>. Trình liên kết moi ra <b>đúng những thành viên cần</b> — đơn vị nhỏ nhất là <b>một file <code>.o</code></b>, nên hãy chia thư viện thành nhiều file nhỏ.',
      'Thư viện <b>động <code>.so</code></b> là một đối tượng ELF hoàn chỉnh, tạo bằng <code>gcc -fPIC</code> rồi <code>gcc -shared</code>. Trình liên kết <b>không chép mã</b>, chỉ ghi tên vào mục <code>NEEDED</code>.',
      '<code>-fPIC</code> bắt buộc vì <code>.so</code> phải chạy đúng ở <b>mọi địa chỉ</b>. Cái giá là mỗi lần truy cập biến toàn cục phải qua <b>GOT</b> — thêm một lệnh đọc bộ nhớ, thấy rõ trong <code>objdump -d</code>.',
      'Thứ tự tham số liên kết <b>có ý nghĩa</b>: thư viện phải đứng <b>sau</b> thứ dùng nó. <code>gcc -lops main.c</code> luôn cho <code>undefined reference</code>.',
      '<code>ld.so</code> tìm thư viện theo thứ tự <b>RPATH → LD_LIBRARY_PATH → RUNPATH → ld.so.cache → đường mặc định</b>. Hệ thống của bạn có <b>489</b> thư viện trong cache.',
      'Ba cách sửa lỗi <code>cannot open shared object file</code>: <code>LD_LIBRARY_PATH</code> (chỉ để thử), <code>-Wl,-rpath,\'$ORIGIN\'</code> (<b>tốt nhất cho gói mang theo</b>), hoặc <code>ldconfig</code> (cài vào hệ thống).',
      '<b>soname</b> là hợp đồng ABI: ba tầng tên <code>libX.so</code> → <code>libX.so.<b>1</b></code> → <code>libX.so.1.0.0</code>. Trình liên kết chép <b>soname</b> vào <code>NEEDED</code>, không chép tên file — nhờ đó nâng cấp bản vá không phá vỡ chương trình cũ.',
      'Số đo trên máy bạn: <code>hello</code> động <b>15 952 B</b> so với tĩnh <b>816 912 B</b> — <b>51,2 lần</b>. Nhưng 20 chương trình động cộng <code>libc.so.6</code> chỉ <b>2,5 MB</b>, còn 20 bản tĩnh tốn <b>16,3 MB</b>. Điểm hoà vốn ở khoảng <b>3 chương trình</b>.',
      'Cấu hình đáng nhớ nhất cho nhúng: <code>-Wl,-Bstatic -lmylib -Wl,-Bdynamic</code> — thư viện của bạn tĩnh, <code>libc</code> động. Trên máy bạn nó chỉ nặng hơn bản hoàn toàn động <b>24 byte</b>.',
      'Liên kết tĩnh với <b>glibc</b> không cho ra file thật sự độc lập nếu chương trình dùng NSS (<code>getaddrinfo</code>…). Đó là lý do ngành nhúng dùng <b>musl</b> hoặc <b>uClibc-ng</b> khi cần tĩnh.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo', x:
      '<p>Suốt bài này bạn đã dùng <code>nm</code>, <code>readelf -d</code>, <code>size</code>, ' +
      '<code>objdump -d</code> như những chiếc hộp đen: gõ vào, nhận kết quả, tin là đúng. ' +
      '<b>Bài 18 — Giải phẫu file ELF</b> sẽ mở nắp hộp ra.</p>' +
      '<p>Bạn sẽ đọc header ELF từng trường một, hiểu vì sao <code>size</code> báo ' +
      '<code>bss = 22 560</code> mà file trên đĩa không hề chứa 22 560 byte số 0, tìm ra ' +
      'section <code>.interp</code> chứa chuỗi <code>/lib64/ld-linux-x86-64.so.2</code> mà ' +
      'bạn đã thấy trong <code>ldd</code>, và phân biệt <b>section</b> (dành cho trình liên ' +
      'kết) với <b>segment</b> (dành cho kernel lúc nạp).</p>' +
      '<p>Con số bạn sẽ tự đo được: <code>strip</code> cắt bao nhiêu byte khỏi ' +
      '<code>prog_full_static</code> — chênh lệch giữa <b>816 912</b> byte kích thước file và ' +
      '<b>744 667</b> byte mà <code>size</code> cộng lại chính là manh mối đầu tiên. Đó cũng ' +
      'là bài đóng lại Chặng 02, ngay trước khi bạn bước sang lập trình hệ thống ở ' +
      '<b>Chặng 03</b>.</p>' },

    { t: 'hr' }

  ],

  quiz: [
    {
      q: 'Bạn liên kết chương trình bằng <code>gcc main.c -L. -lops -o prog</code> và nó build thành công. Nhưng khi chạy <code>./prog</code> thì gặp <code>error while loading shared libraries: libops.so: cannot open shared object file</code>, dù file <code>libops.so</code> đang nằm ngay trong thư mục đó. Vì sao?',
      opts: [
        'Thư viện bị hỏng, phải build lại bằng <code>-fPIC</code>',
        'Cờ <code>-L.</code> chỉ có tác dụng lúc liên kết; lúc chạy <code>ld.so</code> dùng một bộ quy tắc tìm kiếm khác và không biết gì về <code>-L.</code>',
        'Thiếu quyền thực thi trên <code>libops.so</code>',
        'Phải chạy <code>sudo ./prog</code> vì thư viện động cần quyền root'
      ],
      a: 1,
      why: 'Có <b>hai</b> chương trình đi tìm thư viện, ở hai thời điểm khác nhau: <code>ld</code> lúc build (nghe lời <code>-L</code>) và <code>ld.so</code> lúc chạy (chỉ nghe RPATH, <code>LD_LIBRARY_PATH</code>, RUNPATH, <code>ld.so.cache</code>, đường mặc định). Nhớ rõ ranh giới này là chìa khoá gỡ mọi lỗi thư viện động. Sửa bằng <code>LD_LIBRARY_PATH=. ./prog</code> để thử, hoặc build lại với <code>-Wl,-rpath,\'$ORIGIN\'</code> cho sản phẩm.'
    },
    {
      q: 'Thư viện <code>libops.a</code> chứa ba thành viên <code>add.o</code>, <code>sub.o</code>, <code>mul.o</code>. Chương trình của bạn chỉ gọi <code>add()</code>. Sau khi liên kết tĩnh, file thực thi chứa gì?',
      opts: [
        'Cả ba hàm — trình liên kết chép nguyên file <code>.a</code> vào',
        'Chỉ riêng hàm <code>add()</code>, các hàm khác trong cùng file bị loại từng hàm một',
        'Chỉ nội dung của <code>add.o</code>; <code>sub.o</code> và <code>mul.o</code> không được lấy',
        'Không chứa hàm nào — <code>.a</code> luôn được nạp lúc chạy'
      ],
      a: 2,
      why: 'Trình liên kết lấy theo đơn vị <b>thành viên</b>, tức là <b>cả file <code>.o</code></b>, chứ không phải từng hàm. Vì mỗi hàm ở đây nằm trong một <code>.c</code> riêng nên kết quả trùng với "chỉ hàm add". Nếu bạn nhét cả ba hàm vào một <code>ops.c</code>, chương trình sẽ phải mang theo cả ba. Đó là lý do thư viện thật được chia nhỏ ra nhiều file nguồn.'
    },
    {
      q: 'Vì sao mã trong một thư viện động bắt buộc phải biên dịch với <code>-fPIC</code>?',
      opts: [
        'Để mã chạy nhanh hơn nhờ bỏ qua bảng GOT',
        'Vì cùng một <code>.so</code> được nhiều tiến trình nạp vào các địa chỉ khác nhau, nên mã không được chứa địa chỉ tuyệt đối nào',
        'Vì <code>gcc</code> chỉ chấp nhận cờ <code>-shared</code> khi có <code>-fPIC</code>',
        'Để giảm kích thước file <code>.so</code>'
      ],
      a: 1,
      why: 'PIC = Position Independent Code. Một <code>.so</code> không thể biết trước nó sẽ nằm ở đâu: mỗi tiến trình có bản đồ bộ nhớ riêng và ASLR còn ngẫu nhiên hoá vị trí mỗi lần chạy. Mã PIC truy cập dữ liệu <b>gián tiếp qua GOT</b> nên phần mã không bao giờ phải sửa — chính điều đó cho phép nhiều tiến trình dùng chung một bản mã vật lý trong RAM. Đáp án A ngược hoàn toàn: PIC <b>chậm hơn một chút</b>, và đó là cái giá phải trả.'
    },
    {
      q: 'Nhóm bạn phát hành <code>libcontrol.so.1.0.0</code> với soname <code>libcontrol.so.1</code>. Giờ cần sửa một lỗi bên trong mà <b>không</b> đổi bất kỳ khai báo hàm hay struct nào. Nên làm gì?',
      opts: [
        'Phát hành <code>libcontrol.so.2.0.0</code> với soname <code>libcontrol.so.2</code>',
        'Phát hành <code>libcontrol.so.1.0.1</code>, giữ nguyên soname <code>libcontrol.so.1</code>, trỏ lại liên kết mềm',
        'Đổi tên file thành <code>libcontrol.so</code> cho gọn rồi phát hành',
        'Bắt buộc build lại toàn bộ chương trình đang dùng thư viện đó'
      ],
      a: 1,
      why: 'Soname là hợp đồng <b>ABI</b>, chỉ tăng khi phá vỡ tương thích nhị phân. Sửa lỗi bên trong mà giữ nguyên giao diện thì ABI không đổi, nên chỉ tăng số minor/patch của <i>real name</i> và trỏ lại liên kết mềm <code>libcontrol.so.1</code>. Mọi chương trình cũ vẫn khai <code>NEEDED: libcontrol.so.1</code> và tự động dùng bản mới — đó chính là điều bạn đã chứng minh ở bước 5 khi <code>prog_dynamic</code> in ra <code>1005</code> mà không hề được biên dịch lại. Tăng lên <code>.so.2</code> sẽ làm mọi chương trình cũ chết vì không tìm ra thư viện.'
    },
    {
      q: 'Thiết bị nhúng của bạn chỉ chạy <b>một</b> ứng dụng duy nhất trên nền một hệ thống tệp tối giản, flash 4 MB. Dựa trên các số đo trong bài, cách liên kết nào hợp lý nhất?',
      opts: [
        'Liên kết động toàn bộ, vì bản động luôn nhỏ hơn 51 lần',
        'Liên kết tĩnh, vì với một chương trình thì bản tĩnh (0,8 MB) nhỏ hơn tổng bản động cộng libc (2,2 MB), lại không có rủi ro thiếu thư viện lúc chạy',
        'Luôn dùng <code>-Wl,-Bstatic</code> cho mọi thư viện kể cả libc, không cần cân nhắc gì',
        'Liên kết động rồi đặt <code>LD_LIBRARY_PATH</code> trong script khởi động'
      ],
      a: 1,
      why: 'Điểm hoà vốn nằm ở khoảng <b>3 chương trình</b>: dưới ngưỡng đó, chi phí mang theo cả <code>libc.so.6</code> (<b>2 186 512 B</b>) lớn hơn phần dôi ra của liên kết tĩnh. Đáp án A so nhầm — 51,2 lần là so <i>một file thực thi</i>, không phải so <i>tổng hệ thống</i>. Đáp án C bỏ qua bẫy NSS của glibc và bẫy giấy phép LGPL. Đáp án D thêm phụ thuộc lúc chạy mà không được lợi gì khi chỉ có một chương trình.'
    },
    {
      q: 'Đồng nghiệp báo: chương trình build được trên máy phát triển nhưng copy sang thiết bị thì chết ngay. Bạn chỉ có file thực thi trong tay, chưa chạy được nó. Lệnh nào nên gõ <b>đầu tiên</b>?',
      opts: [
        '<code>ldd program</code> — nó liệt kê ngay thư viện nào không tìm thấy',
        '<code>readelf -d program | grep NEEDED</code> — chỉ đọc file, không thực thi gì',
        '<code>nm program</code> — xem có ký hiệu nào chưa được giải quyết',
        '<code>strip program</code> — loại bảng ký hiệu để file nhẹ hơn'
      ],
      a: 1,
      why: '<code>ldd</code> hữu ích nhưng nó <b>thật sự nhờ trình thông dịch động nạp file</b> — với một file lạ hoặc không tin cậy, đó là hành vi có rủi ro, và trên máy phát triển nó lại trả lời sai câu hỏi (nó cho biết <i>máy này</i> có gì, không phải <i>thiết bị kia</i> thiếu gì). <code>readelf -d</code> chỉ đọc dữ liệu trong file nên an toàn tuyệt đối và cho đúng thứ cần biết: chương trình <i>khai</i> là cần những thư viện nào. Sau đó bạn đối chiếu danh sách đó với những gì có trên thiết bị. <code>nm</code> không giúp vì mọi ký hiệu động đều còn ở dạng chưa giải quyết trong file thực thi.'
    }
  ]
});

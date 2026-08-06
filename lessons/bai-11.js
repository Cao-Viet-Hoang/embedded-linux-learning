/* ═══════════════════════════════════════════════════════════════
   BÀI 11 — Tìm kiếm và xử lý văn bản
   Chặng 01 · Linux căn bản
   ═══════════════════════════════════════════════════════════════ */

Lesson.register({
  id: 'bai-11',
  title: 'Tìm kiếm và xử lý văn bản',
  minutes: 55,
  practice: 'Thực hành 35 phút',
  level: 'Người mới bắt đầu',

  intro:
    'Mã nguồn nhân Linux có hơn <b>80 000 file</b>. Một bản dựng Yocto in ra hàng chục nghìn ' +
    'dòng nhật ký. Không ai đọc hết được — bạn phải biết <b>hỏi</b>. Bài này đưa vào năm công cụ ' +
    'mạnh nhất của dòng lệnh: <code>find</code> tìm file, <code>grep</code> tìm nội dung, ' +
    '<code>sed</code> sửa hàng loạt, <code>awk</code> tính toán theo cột, và ' +
    '<code>xargs</code> nối chúng lại với nhau. Kèm theo là bộ tứ <code>sort uniq wc cut</code> ' +
    'để biến kết quả thô thành một bảng thống kê đọc được. Toàn bộ sức mạnh này dựng trên đúng ' +
    'dấu <code>|</code> bạn học ở Bài 10. Kết thúc bài, bạn sẽ tự viết được câu lệnh mà lộ ' +
    'trình đặt ra cho cả Chặng 01: <b>tìm mọi file <code>.c</code> chứa một chuỗi và thống kê ' +
    'kết quả</b>.',

  goals: [
    'Dùng <code>find</code> lọc file theo tên, loại, kích thước, quyền và thời gian',
    'Giải thích khác biệt giữa <code>-exec ... \\;</code> và <code>-exec ... +</code> bằng số đo thật',
    'Viết biểu thức chính quy cơ bản và phân biệt được BRE với ERE',
    'Dùng <code>grep</code> tìm chuỗi trong cả cây thư mục, đếm và lọc theo ngữ cảnh',
    'Thay thế hàng loạt bằng <code>sed</code> và tính toán theo cột bằng <code>awk</code>',
    'Ghép <code>sort uniq wc cut</code> thành một dây chuyền thống kê hoàn chỉnh'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. NĂM CÔNG CỤ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Năm công cụ, mỗi cái làm đúng một việc' },

    { t: 'p', x:
      'Đây là triết lý Unix của Bài 10 hiện hình. Không có lệnh nào "tìm kiếm và xử lý văn bản". ' +
      'Có năm lệnh nhỏ, mỗi lệnh giỏi một việc, và bạn ghép chúng lại.' },

    { t: 'table',
      head: ['Công cụ', 'Trả lời câu hỏi', 'Đơn vị làm việc'],
      rows: [
        ['<code>find</code>', '<b>File nào</b> thoả điều kiện?', 'Cây thư mục'],
        ['<code>grep</code>', '<b>Dòng nào</b> chứa mẫu này?', 'Dòng'],
        ['<code>sed</code>', 'Sửa mỗi dòng thành gì?', 'Dòng, theo luồng'],
        ['<code>awk</code>', 'Tính gì từ <b>các cột</b> của mỗi dòng?', 'Cột trong dòng'],
        ['<code>xargs</code>', 'Biến dòng chảy thành <b>tham số</b> cho lệnh khác', 'Tham số']
      ]},

    { t: 'fig',
      cap: 'Dây chuyền điển hình: find chọn file, grep chọn dòng, awk chọn cột, sort/uniq gom nhóm. Mỗi mũi tên là một dấu | và mang văn bản thuần.',
      svg:
        '<svg viewBox="0 0 720 220" width="720" role="img" aria-label="Sơ đồ dây chuyền find grep awk sort uniq, mỗi tầng thu hẹp dữ liệu dần">' +
        '<rect class="d-box-p" x="20" y="46" width="118" height="52" rx="6"/>' +
        '<text class="d-tm" x="79" y="70" text-anchor="middle">find</text>' +
        '<text class="d-ts" x="79" y="88" text-anchor="middle">chọn FILE</text>' +

        '<rect class="d-box-p" x="172" y="46" width="118" height="52" rx="6"/>' +
        '<text class="d-tm" x="231" y="70" text-anchor="middle">grep</text>' +
        '<text class="d-ts" x="231" y="88" text-anchor="middle">chọn DÒNG</text>' +
        '<line class="d-line" x1="138" y1="72" x2="166" y2="72"/>' +
        '<path class="d-arrow" d="M166 72 l-8 -4 v8 z"/>' +

        '<rect class="d-box-p" x="324" y="46" width="118" height="52" rx="6"/>' +
        '<text class="d-tm" x="383" y="70" text-anchor="middle">awk</text>' +
        '<text class="d-ts" x="383" y="88" text-anchor="middle">chọn CỘT</text>' +
        '<line class="d-line" x1="290" y1="72" x2="318" y2="72"/>' +
        '<path class="d-arrow" d="M318 72 l-8 -4 v8 z"/>' +

        '<rect class="d-box-p" x="476" y="46" width="118" height="52" rx="6"/>' +
        '<text class="d-tm" x="535" y="70" text-anchor="middle">sort | uniq -c</text>' +
        '<text class="d-ts" x="535" y="88" text-anchor="middle">gom NHÓM</text>' +
        '<line class="d-line" x1="442" y1="72" x2="470" y2="72"/>' +
        '<path class="d-arrow" d="M470 72 l-8 -4 v8 z"/>' +

        '<rect class="d-box-g" x="628" y="46" width="72" height="52" rx="6"/>' +
        '<text class="d-ts" x="664" y="70" text-anchor="middle">BẢNG</text>' +
        '<text class="d-ts" x="664" y="86" text-anchor="middle">thống kê</text>' +
        '<line class="d-line" x1="594" y1="72" x2="622" y2="72"/>' +
        '<path class="d-arrow" d="M622 72 l-8 -4 v8 z"/>' +

        '<text class="d-ts" x="20" y="132">2062 file .h</text>' +
        '<text class="d-ts" x="172" y="132">1847 dòng khớp</text>' +
        '<text class="d-ts" x="324" y="132">277 tên file</text>' +
        '<text class="d-ts" x="476" y="132">5 thư mục</text>' +
        '<text class="d-ts" x="628" y="132">1 câu trả lời</text>' +

        '<rect class="d-box-a" x="20" y="156" width="680" height="42" rx="4"/>' +
        '<text class="d-t" x="30" y="176">Dữ liệu hẹp dần qua từng tầng. Đó là con số thật bạn sẽ đo được ở phần thực hành,</text>' +
        '<text class="d-t" x="30" y="192">khi tìm chuỗi ioctl trong toàn bộ /usr/include của máy này.</text>' +
        '</svg>' },

    { t: 'code', where: 'wsl', lang: 'bash', code:
      'grep --version | head -1\n' +
      'sed --version | head -1\n' +
      'awk --version | head -1\n' +
      'sort --version | head -1' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      'grep (GNU grep) 3.12\n' +
      'sed (GNU sed) 4.9\n' +
      'GNU Awk 5.3.2, API 4.0, PMA Avon 8-g1, (GNU MPFR 4.2.2, GNU MP 6.3.0)\n' +
      'sort (uutils coreutils) 0.8.0' },

    { t: 'cal', kind: 'info', title: 'Để ý dòng cuối: sort ở đây không phải bản GNU', x:
      '<p>Ubuntu bản mới thay bộ <code>coreutils</code> của GNU bằng <b>uutils</b> — bản viết ' +
      'lại bằng Rust. Đó là lý do ở Bài 8 bạn thấy thông báo lỗi lạ ' +
      '<code>Operation not permitted (os error 1)</code> thay vì câu quen thuộc của GNU.</p>' +
      '<p>Cú pháp tương thích nên bạn không cần đổi gì. Nhưng hãy nhớ điều này khi làm nhúng: ' +
      '<b>trên thiết bị thật, những lệnh này thường lại là bản BusyBox</b> — gọn hơn nhiều và ' +
      'thiếu khá nhiều tuỳ chọn. Một script chạy ngon trên máy bàn có thể gãy trên board. ' +
      'Chặng 04 sẽ cho bạn tự tay đối chiếu.</p>' },

    /* ══════════════════════════════════════════════
       2. FIND
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'find: duyệt cây thư mục theo điều kiện' },

    { t: 'p', x:
      'Cú pháp của <code>find</code> khác mọi lệnh khác bạn đã gặp, và đó là lý do nó khó nhớ. ' +
      'Hãy đọc nó như một câu: <b>tìm ở đâu — thoả điều kiện gì — rồi làm gì</b>.' },

    { t: 'fig',
      cap: 'Ba phần của một câu lệnh find. Phần "làm gì" mặc định là -print, đó là lý do bạn thường chỉ thấy hai phần đầu.',
      svg:
        '<svg viewBox="0 0 720 200" width="720" role="img" aria-label="Cấu trúc ba phần của lệnh find: đường dẫn, điều kiện, hành động">' +
        '<rect class="d-box" x="20" y="20" width="680" height="34" rx="4"/>' +
        '<text class="d-tm" x="34" y="42">find  project  -type f  -name \'*.c\'  -size +100c  -exec wc -l {} +</text>' +

        '<rect class="d-box-p" x="20" y="72" width="90" height="46" rx="6"/>' +
        '<text class="d-t" x="65" y="92" text-anchor="middle">TÌM Ở ĐÂU</text>' +
        '<text class="d-ts" x="65" y="108" text-anchor="middle">đường dẫn gốc</text>' +
        '<line class="d-line" x1="65" y1="72" x2="65" y2="58"/>' +

        '<rect class="d-box-a" x="140" y="72" width="330" height="46" rx="6"/>' +
        '<text class="d-t" x="305" y="92" text-anchor="middle">ĐIỀU KIỆN</text>' +
        '<text class="d-ts" x="305" y="108" text-anchor="middle">nhiều điều kiện viết cạnh nhau = phải thoả TẤT CẢ</text>' +
        '<line class="d-line" x1="305" y1="72" x2="305" y2="58"/>' +

        '<rect class="d-box-g" x="500" y="72" width="200" height="46" rx="6"/>' +
        '<text class="d-t" x="600" y="92" text-anchor="middle">LÀM GÌ</text>' +
        '<text class="d-ts" x="600" y="108" text-anchor="middle">mặc định là -print</text>' +
        '<line class="d-line" x1="600" y1="72" x2="600" y2="58"/>' +

        '<rect class="d-box-w" x="20" y="140" width="680" height="44" rx="4"/>' +
        '<text class="d-t" x="34" y="160">Dấu nháy quanh \'*.c\' là BẮT BUỘC. Không có nó, shell bung dấu * trước khi find kịp thấy,</text>' +
        '<text class="d-t" x="34" y="176">và find sẽ báo: paths must precede expression</text>' +
        '</svg>' },

    { t: 'cmdx', cmd: 'find [đường dẫn] [điều kiện] [hành động]', title: 'Các điều kiện dùng nhiều nhất',
      rows: [
        ['<code>-name \'*.c\'</code>', 'Tên khớp mẫu, <b>phân biệt</b> hoa thường', 'Mẫu áp vào <b>tên file</b>, không phải cả đường dẫn'],
        ['<code>-iname \'*.C\'</code>', 'Như trên nhưng <b>không</b> phân biệt hoa thường', 'Trên máy này <code>-name \'*.C\'</code> cho 0 file, <code>-iname</code> cho 5'],
        ['<code>-type f</code> / <code>d</code> / <code>l</code>', 'Chỉ file thường / thư mục / symlink', 'Cùng bộ ký tự loại file bạn học ở Bài 5'],
        ['<code>-size +100c</code>', 'Lớn hơn 100 <b>byte</b>', 'Hậu tố: <code>c</code> byte, <code>k</code> KB, <code>M</code> MB. Không có hậu tố = <b>block 512 byte</b>'],
        ['<code>-empty</code>', 'File rỗng hoặc thư mục rỗng', 'Rất hay khi dọn cây build'],
        ['<code>-perm -u+x</code>', 'Có bit thực thi cho chủ sở hữu', 'Dấu <code>-</code> nghĩa là "có ít nhất". Bài 8 đã dạy các bit này'],
        ['<code>-newer f</code>', 'Sửa sau file f', 'Cách tìm những gì vừa thay đổi trong bản dựng'],
        ['<code>-maxdepth 1</code>', 'Không xuống sâu quá 1 tầng', 'Phải viết <b>trước</b> các điều kiện khác'],
        ['<code>-o</code>', 'HOẶC — mặc định giữa hai điều kiện là VÀ', '<code>-name \'*.c\' -o -name \'*.h\'</code>'],
        ['<code>! -name \'*.o\'</code>', 'Phủ định', 'Loại trừ file trung gian']
      ]},

    { t: 'cal', kind: 'danger', title: 'Cái bẫy -size -1k khiến bạn tưởng không có file nào', x:
      '<p>Trên thư mục thử nghiệm gồm 7 file từ 32 đến 198 byte, <code>find project -type f -size ' +
      '-1k</code> trả về <b>rỗng</b>. Không phải lỗi.</p>' +
      '<p><code>find</code> <b>làm tròn lên</b> trước khi so sánh. Một file 32 byte được tính là ' +
      '1k, mà "nhỏ hơn 1k" thì phải là 0k — không file nào thoả. Muốn so theo byte, dùng hậu tố ' +
      '<code>c</code>: <code>-size -1024c</code>.</p>' },

    { t: 'h3', x: '-exec: hai dấu kết thúc, chênh nhau 94 lần' },

    { t: 'p', x:
      'Sau khi chọn được file, bạn thường muốn làm gì đó với chúng. <code>find</code> có sẵn ' +
      '<code>-exec</code>, nhưng nó có <b>hai</b> cách kết thúc và khác biệt giữa chúng là rất ' +
      'lớn.' },

    { t: 'table',
      head: ['Cách viết', 'Cách chạy', 'Đo trên 2062 file .h của máy này'],
      rows: [
        ['<code>-exec grep -l ioctl {} \\;</code>', 'Gọi grep <b>một lần cho mỗi file</b> — 2062 tiến trình', '<b>2,070 s</b>'],
        ['<code>-exec grep -l ioctl {} +</code>', 'Gom hết tên file, gọi grep <b>một lần</b>', '<b>0,022 s</b>'],
        ['<code>| xargs grep -l ioctl</code>', 'Cũng gom lại, cùng nguyên lý', 'Tương đương dòng trên'],
        ['<code>grep -rl --include=\'*.h\' ioctl</code>', 'grep tự duyệt cây, không cần find', '<b>0,019 s</b>']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao chênh tới 94 lần, và bài học nằm ở đâu', x:
      '<p>2,070 chia 0,022 ra <b>94 lần</b>. Toàn bộ chênh lệch nằm ở chi phí ' +
      '<code>fork</code> + <code>exec</code> mà bạn đã học ở Bài 9: mỗi lần tạo tiến trình mới ' +
      'kernel phải cấp không gian địa chỉ, nạp file nhị phân, nối lại thư viện.</p>' +
      '<p>Làm việc đó 2062 lần thay vì 1 lần chính là toàn bộ 2 giây bị mất.</p>' +
      '<p><b>Quy tắc:</b> mặc định dùng <code>+</code>. Chỉ dùng <code>\\;</code> khi lệnh của ' +
      'bạn thật sự chỉ nhận <b>một</b> tham số mỗi lần — ví dụ <code>-exec mv {} {}.bak \\;</code>.</p>' +
      '<p>Bài học này sẽ quay lại ám ảnh bạn ở Chặng 05: một script Yocto viết ẩu với ' +
      '<code>\\;</code> có thể kéo dài bản dựng thêm hàng chục phút.</p>' },

    { t: 'cal', kind: 'warn', title: 'Tên file có dấu cách sẽ phá vỡ xargs', x:
      '<p>Với một file tên <code>name with a space.c</code>, câu ' +
      '<code>find trap -name \'*.c\' | xargs ls -l</code> cho ra:</p>' +
      '<p><code>ls: cannot access \'trap/name\': No such file or directory</code> — lặp lại bốn ' +
      'lần, mã thoát <b>123</b>.</p>' +
      '<p>Vì <code>xargs</code> cắt theo <b>khoảng trắng</b>. Lời giải là đổi ký tự phân cách ' +
      'sang byte 0 — thứ không thể xuất hiện trong tên file:</p>' +
      '<p><code>find trap -name \'*.c\' -print0 | xargs -0 ls -l</code></p>' +
      '<p>Hãy tập viết <code>-print0 | xargs -0</code> thành phản xạ. Trên cây mã nguồn thật, ' +
      'sớm muộn cũng có một file tên chứa dấu cách.</p>' },

    /* ══════════════════════════════════════════════
       3. REGEX
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Biểu thức chính quy: ngôn ngữ mô tả mẫu' },

    { t: 'p', x:
      'Biểu thức chính quy — <i>regular expression</i>, viết tắt <b>regex</b> — là một chuỗi ' +
      'nhỏ mô tả <b>hình dạng</b> của văn bản cần tìm. Nó là ngôn ngữ chung của ' +
      '<code>grep</code>, <code>sed</code>, <code>awk</code>, và của cả trình soạn thảo vim bạn ' +
      'học ở Bài 7.' },

    { t: 'table',
      head: ['Ký hiệu', 'Nghĩa', 'Ví dụ khớp'],
      rows: [
        ['<code>^</code>', 'Đầu dòng', '<code>^gpio</code> khớp <code>gpio17</code>, không khớp <code>my_gpio</code>'],
        ['<code>$</code>', 'Cuối dòng', '<code>;$</code> khớp mọi dòng kết thúc bằng dấu chấm phẩy'],
        ['<code>.</code>', '<b>Một</b> ký tự bất kỳ', '<code>tty...0</code> khớp <code>/dev/ttyUSB0</code>'],
        ['<code>[abc]</code>', 'Một trong các ký tự liệt kê', '<code>[0-9][0-9]</code> khớp hai chữ số liền nhau'],
        ['<code>[^abc]</code>', 'Một ký tự <b>không</b> nằm trong danh sách', 'Dấu <code>^</code> ở đây nghĩa khác hẳn ngoài ngoặc'],
        ['<code>*</code>', 'Lặp phần trước <b>0 hoặc nhiều</b> lần', '<code>gpio_*</code> khớp cả <code>gpio17</code> vì <code>_</code> lặp 0 lần'],
        ['<code>\\+</code> (BRE) · <code>+</code> (ERE)', 'Lặp <b>1 hoặc nhiều</b> lần', ''],
        ['<code>\\?</code> (BRE) · <code>?</code> (ERE)', 'Có hoặc không', ''],
        ['<code>\\{2,4\\}</code> · <code>{2,4}</code>', 'Lặp từ 2 tới 4 lần', '<code>[0-9]{4}-[0-9]{2}-[0-9]{2}</code> khớp <code>2026-08-01</code>'],
        ['<code>\\|</code> · <code>|</code>', 'Hoặc', '<code>^(gpio|i2c)</code>'],
        ['<code>\\(...\\)</code> · <code>(...)</code>', 'Nhóm, và <b>ghi nhớ</b> để tham chiếu lại', 'Dùng nhiều trong <code>sed</code>'],
        ['<code>[[:digit:]]</code>', 'Lớp POSIX: chữ số', 'Còn có <code>:alpha: :upper: :lower: :space: :alnum:</code>']
      ]},

    { t: 'cal', kind: 'why', title: 'BRE và ERE: vì sao có hai bộ cú pháp và bạn nên chọn cái nào', x:
      '<p><b>BRE</b> (Basic Regular Expression) là mặc định của <code>grep</code> và ' +
      '<code>sed</code>. Trong BRE, các ký tự <code>+ ? { } ( ) |</code> là <b>ký tự thường</b>; ' +
      'muốn dùng chúng làm toán tử phải thêm dấu <code>\\</code>.</p>' +
      '<p><b>ERE</b> (Extended) bật bằng cờ <code>-E</code>, và ngược lại: chúng là toán tử, ' +
      'muốn dùng làm ký tự thường mới phải thoát.</p>' +
      '<p>Kiểm chứng trên file gồm ba dòng <code>oo</code>, <code>o+</code>, <code>abc</code>:</p>' +
      '<p><code>grep -n \'o+\'</code> → chỉ dòng <b>2</b>, vì dấu cộng bị hiểu là chữ cộng<br>' +
      '<code>grep -En \'o+\'</code> → dòng <b>1 và 2</b>, vì dấu cộng là toán tử lặp</p>' +
      '<p><b>Lời khuyên thực dụng: luôn viết <code>grep -E</code> và <code>sed -E</code>.</b> ' +
      'Cú pháp ERE giống với regex của Python, JavaScript và mọi thứ bạn sẽ gặp về sau, nên bạn ' +
      'chỉ phải nhớ một bộ quy tắc.</p>' },

    { t: 'cal', kind: 'danger', title: 'Dấu chấm không thoát là lỗi thầm lặng nguy hiểm nhất', x:
      '<p>Trên file ba dòng <code>version 6.18.33</code>, <code>build 6218933</code>, ' +
      '<code>kernel 6a18b33</code>:</p>' +
      '<p><code>grep \'6.18.33\'</code> → khớp <b>cả ba dòng</b><br>' +
      '<code>grep \'6\\.18\\.33\'</code> → khớp <b>đúng một dòng</b></p>' +
      '<p>Vì <code>.</code> là "một ký tự bất kỳ", nên <code>6.18.33</code> cũng khớp ' +
      '<code>6218933</code> và <code>6a18b33</code>. Đây là lỗi không báo gì cả — bạn chỉ thấy ' +
      'kết quả nhiều hơn dự kiến và dễ bỏ qua.</p>' +
      '<p>Khi tìm phiên bản, đường dẫn hay địa chỉ IP, hoặc thoát dấu chấm, hoặc dùng ' +
      '<code>-F</code> để tắt hẳn regex và tìm chuỗi thuần.</p>' },

    /* ══════════════════════════════════════════════
       4. GREP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'grep: tìm dòng khớp mẫu' },

    { t: 'p', x:
      'Tên lệnh là viết tắt của một câu lệnh trong trình soạn thảo <code>ed</code> đời đầu: ' +
      '<b>g</b>lobal <b>r</b>egular <b>e</b>xpression <b>p</b>rint. Nó vẫn làm đúng việc đó — ' +
      'in mọi dòng khớp mẫu.' },

    { t: 'cmdx', cmd: 'grep [cờ] MẪU [file...]', title: 'Cờ bạn sẽ dùng hằng ngày',
      rows: [
        ['<code>-r</code>', 'Duyệt <b>đệ quy</b> cả cây thư mục', 'Thay cho cặp <code>find | xargs</code> trong đa số trường hợp'],
        ['<code>-n</code>', 'In kèm <b>số dòng</b>', 'Bắt buộc khi bạn định mở file ra sửa'],
        ['<code>-l</code>', 'Chỉ in <b>tên file</b> có khớp', 'Chữ L thường. Dùng để đưa sang lệnh khác'],
        ['<code>-c</code>', '<b>Đếm số dòng</b> khớp trong từng file', 'Đếm <b>dòng</b>, không phải số lần xuất hiện'],
        ['<code>-i</code>', 'Không phân biệt hoa thường', 'Trên thư mục thử: <code>todo</code> cho 0, <code>-i todo</code> cho 4'],
        ['<code>-w</code>', 'Khớp <b>trọn từ</b>', '<code>-w gpio</code> bỏ qua <code>gpio_set</code> và <code>my_gpio</code>'],
        ['<code>-v</code>', '<b>Đảo ngược</b> — in dòng KHÔNG khớp', '<code>grep -v \'^#\'</code> để bỏ comment'],
        ['<code>-o</code>', 'Chỉ in <b>phần khớp</b>, không in cả dòng', 'Nền tảng của mọi thống kê'],
        ['<code>-E</code>', 'Dùng cú pháp ERE', 'Nên bật mặc định'],
        ['<code>-F</code>', 'Tìm <b>chuỗi thuần</b>, tắt regex', 'Khi mẫu có nhiều dấu chấm, ngoặc'],
        ['<code>-A 2 -B 1</code>', 'In thêm 2 dòng <b>sau</b>, 1 dòng <b>trước</b>', '<code>-C 3</code> là 3 dòng cả hai phía'],
        ['<code>--include=\'*.c\'</code>', 'Khi dùng <code>-r</code>, chỉ xét file khớp mẫu này', 'Có <code>--exclude</code> và <code>--exclude-dir</code> tương ứng']
      ]},

    { t: 'cal', kind: 'info', title: 'Mã thoát của grep là một câu trả lời, không phải lỗi', x:
      '<p><code>grep gpio_init main.c</code> tìm thấy → <b>rc=0</b>. ' +
      '<code>grep khongcochuoinay main.c</code> không thấy → <b>rc=1</b>.</p>' +
      '<p>Đây không phải thất bại — đó là cách grep <b>trả lời câu hỏi có/không</b>. Bài 13 sẽ ' +
      'dùng trực tiếp trong <code>if grep -q ...</code>, với cờ <code>-q</code> nghĩa là ' +
      '"im lặng, tôi chỉ cần mã thoát".</p>' +
      '<p>Còn <b>rc=2</b> mới là lỗi thật: file không đọc được, mẫu regex sai.</p>' },

    { t: 'h3', x: 'grep -r và find có kết quả khác nhau — hãy hiểu vì sao' },

    { t: 'p', x:
      'Cùng câu hỏi "file <code>.h</code> nào trong <code>/usr/include</code> chứa chuỗi ' +
      '<code>ioctl</code>", hai cách viết cho hai con số khác nhau:' },

    { t: 'code', where: 'wsl', lang: 'bash', code:
      "find /usr/include -name '*.h' -exec grep -l ioctl {} + 2>/dev/null | wc -l\n" +
      "grep -rl --include='*.h' ioctl /usr/include 2>/dev/null | wc -l" },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      '281\n' +
      '277' },

    { t: 'p', x: 'Chênh đúng 4 file. So sánh hai danh sách để tìm ra chúng:' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      '/usr/include/ncurses.h\n' +
      '/usr/include/ncursesw/curses.h\n' +
      '/usr/include/ncursesw/ncurses.h\n' +
      '/usr/include/ncursesw/term.h' },

    { t: 'cal', kind: 'why', title: 'Cả bốn đều là symlink — và đó là toàn bộ câu chuyện', x:
      '<p><code>/usr/include</code> chứa <b>19 symlink</b>. <code>find -name \'*.h\'</code> ' +
      'liệt kê chúng vì tên khớp; <code>grep -r</code> thì <b>không đi theo symlink</b> ' +
      '(muốn thế phải dùng <code>-R</code> viết hoa).</p>' +
      '<p>Không có cách nào "đúng" — chỉ có cách <b>phù hợp câu hỏi</b>. Đếm nội dung thật thì ' +
      '<code>grep -r</code> đúng, vì đi theo symlink sẽ đếm cùng một file hai lần. Kiểm kê ' +
      'mọi đường vào file thì <code>find</code> đúng.</p>' +
      '<p>Bài học lớn hơn cho nghề: <b>khi hai công cụ cho hai con số, đừng chọn bừa con số ' +
      'đẹp hơn — hãy tìm ra vì sao chúng khác.</b> Chênh lệch luôn có nguyên nhân, và nguyên ' +
      'nhân đó thường chính là thứ bạn đang cần biết.</p>' },

    /* ══════════════════════════════════════════════
       5. SED
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'sed: sửa văn bản theo luồng' },

    { t: 'p', x:
      'Tên đầy đủ là <b>s</b>tream <b>ed</b>itor. Nó đọc từng dòng, áp một lệnh biến đổi, in ra ' +
      'kết quả, rồi quên dòng đó đi. Vì không bao giờ giữ cả file trong bộ nhớ, ' +
      '<code>sed</code> sửa được file 10 GB trên một thiết bị chỉ có 64 MB RAM.' },

    { t: 'fig',
      cap: 'Bốn phần của lệnh s. Ba dấu / chỉ là dấu phân cách — thay được bằng ký tự khác khi mẫu có chứa dấu gạch chéo.',
      svg:
        '<svg viewBox="0 0 720 210" width="720" role="img" aria-label="Giải phẫu lệnh thay thế s của sed gồm địa chỉ, mẫu tìm, chuỗi thay và cờ">' +
        '<rect class="d-box" x="20" y="20" width="680" height="34" rx="4"/>' +
        '<text class="d-tm" x="40" y="42">sed  \'/^baud/  s /ttyS0/ ttyAMA0/ g\'  config.txt</text>' +

        '<rect class="d-box-a" x="20" y="74" width="150" height="46" rx="6"/>' +
        '<text class="d-t" x="95" y="94" text-anchor="middle">ĐỊA CHỈ</text>' +
        '<text class="d-ts" x="95" y="110" text-anchor="middle">chỉ dòng nào · bỏ trống = mọi dòng</text>' +
        '<line class="d-line" x1="95" y1="74" x2="95" y2="58"/>' +

        '<rect class="d-box-p" x="190" y="74" width="140" height="46" rx="6"/>' +
        '<text class="d-t" x="260" y="94" text-anchor="middle">MẪU TÌM</text>' +
        '<text class="d-ts" x="260" y="110" text-anchor="middle">là biểu thức chính quy</text>' +
        '<line class="d-line" x1="260" y1="74" x2="260" y2="58"/>' +

        '<rect class="d-box-g" x="350" y="74" width="150" height="46" rx="6"/>' +
        '<text class="d-t" x="425" y="94" text-anchor="middle">THAY BẰNG</text>' +
        '<text class="d-ts" x="425" y="110" text-anchor="middle">&amp; = toàn bộ phần khớp</text>' +
        '<line class="d-line" x1="425" y1="74" x2="425" y2="58"/>' +

        '<rect class="d-box-w" x="520" y="74" width="180" height="46" rx="6"/>' +
        '<text class="d-t" x="610" y="94" text-anchor="middle">CỜ</text>' +
        '<text class="d-ts" x="610" y="110" text-anchor="middle">g = mọi lần trong dòng</text>' +
        '<line class="d-line" x1="610" y1="74" x2="610" y2="58"/>' +

        '<rect class="d-box-w" x="20" y="146" width="680" height="48" rx="4"/>' +
        '<text class="d-t" x="34" y="166">KHÔNG có g: chỉ thay lần ĐẦU TIÊN của mỗi dòng.</text>' +
        '<text class="d-tm" x="34" y="184">echo a-b-c-d | sed \'s/-/+/\'  →  a+b-c-d          thêm g  →  a+b+c+d</text>' +
        '</svg>' },

    { t: 'cmdx', cmd: 'sed [cờ] \'lệnh\' [file]', title: 'Những lệnh sed đủ dùng cho 95% công việc',
      rows: [
        ['<code>s/cũ/mới/</code>', 'Thay lần đầu trên mỗi dòng', 'Lệnh dùng nhiều nhất, chiếm gần hết thời gian bạn dùng sed'],
        ['<code>s/cũ/mới/g</code>', 'Thay <b>mọi</b> lần trên mỗi dòng', 'g = global'],
        ['<code>s|/dev/|/media/|</code>', 'Đổi dấu phân cách sang <code>|</code>', 'Bắt buộc khi mẫu chứa dấu <code>/</code>'],
        ['<code>2p</code> với cờ <code>-n</code>', 'In dòng thứ 2', '<code>-n</code> tắt in tự động; <code>2,4p</code> in khoảng dòng'],
        ['<code>/^#/d</code>', '<b>Xoá</b> mọi dòng bắt đầu bằng #', 'Cách dọn file cấu hình'],
        ['<code>/^baud/s/=/ = /</code>', 'Chỉ thay <b>trên dòng khớp địa chỉ</b>', 'Ghép địa chỉ với lệnh s'],
        ['<code>-E \'s/^(\\w+)=(.*)$/\\2 &lt;- \\1/\'</code>', 'Nhóm bắt và <b>tham chiếu ngược</b> <code>\\1 \\2</code>', 'Cách đảo thứ tự, tách trường'],
        ['<code>-e</code>', 'Ghép nhiều lệnh trong một lần chạy', '<code>-e \'/^$/d\' -e \'/^#/d\'</code>'],
        ['<code>-i</code>', 'Sửa <b>trực tiếp</b> vào file', '<b>Không có đường lui.</b> Đọc callout bên dưới'],
        ['<code>-i.bak</code>', 'Sửa file, đồng thời giữ bản gốc thành <code>file.bak</code>', 'Luôn dùng dạng này']
      ]},

    { t: 'cal', kind: 'danger', title: 'sed -i không hỏi lại, không hoàn tác được', x:
      '<p>Mặc định <code>sed</code> chỉ in ra màn hình, <b>không đụng vào file</b>. Cờ ' +
      '<code>-i</code> đảo ngược điều đó và ghi thẳng vào file.</p>' +
      '<p>Một biểu thức sai với <code>-i</code> trên cả cây mã nguồn là một buổi chiều mất ' +
      'trắng. Hai thói quen bắt buộc:</p>' +
      '<p><b>1.</b> Chạy <b>không</b> có <code>-i</code> trước, đọc kết quả bằng mắt.<br>' +
      '<b>2.</b> Khi chạy thật, dùng <code>-i.bak</code>. Trên máy này ' +
      '<code>sed -i.bak \'s/9600/57600/\' edit2.txt</code> tạo ra hai file: ' +
      '<code>edit2.txt</code> đã sửa và <code>edit2.txt.bak</code> còn nguyên.</p>' },

    /* ══════════════════════════════════════════════
       6. AWK
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'awk: mỗi dòng là một hàng, mỗi khoảng trắng là một cột' },

    { t: 'p', x:
      '<code>awk</code> mang tên ba tác giả — Aho, Weinberger, Kernighan. Khác với ' +
      '<code>sed</code> chỉ thấy dòng, <code>awk</code> tự động <b>cắt mỗi dòng thành cột</b> ' +
      'và cho bạn tính toán trên chúng. Nó là một ngôn ngữ lập trình đầy đủ, nhưng bạn chỉ cần ' +
      'khoảng mười phần trăm của nó.' },

    { t: 'fig',
      cap: 'awk tự cắt dòng thành các trường $1 $2 $3… Bạn không phải đếm ký tự, không phải viết vòng lặp — đó là toàn bộ lý do awk tồn tại.',
      svg:
        '<svg viewBox="0 0 720 230" width="720" role="img" aria-label="Mô hình trường của awk, một dòng log được cắt thành các biến đô-la 1 tới đô-la 5">' +
        '<rect class="d-box" x="20" y="18" width="680" height="30" rx="4"/>' +
        '<text class="d-tm" x="34" y="38">2026-08-01  10:02:14  ERROR  uart  timeout during read 250</text>' +

        '<rect class="d-box-p" x="20" y="66" width="120" height="40" rx="5"/>' +
        '<text class="d-tm" x="80" y="84" text-anchor="middle">$1</text>' +
        '<text class="d-ts" x="80" y="99" text-anchor="middle">2026-08-01</text>' +
        '<rect class="d-box-p" x="150" y="66" width="110" height="40" rx="5"/>' +
        '<text class="d-tm" x="205" y="84" text-anchor="middle">$2</text>' +
        '<text class="d-ts" x="205" y="99" text-anchor="middle">10:02:14</text>' +
        '<rect class="d-box-a" x="270" y="66" width="90" height="40" rx="5"/>' +
        '<text class="d-tm" x="315" y="84" text-anchor="middle">$3</text>' +
        '<text class="d-ts" x="315" y="99" text-anchor="middle">ERROR</text>' +
        '<rect class="d-box-p" x="370" y="66" width="80" height="40" rx="5"/>' +
        '<text class="d-tm" x="410" y="84" text-anchor="middle">$4</text>' +
        '<text class="d-ts" x="410" y="99" text-anchor="middle">uart</text>' +
        '<rect class="d-box" x="460" y="66" width="150" height="40" rx="5"/>' +
        '<text class="d-tm" x="535" y="84" text-anchor="middle">$5 $6 $7</text>' +
        '<text class="d-ts" x="535" y="99" text-anchor="middle">timeout during read</text>' +
        '<rect class="d-box-g" x="620" y="66" width="80" height="40" rx="5"/>' +
        '<text class="d-tm" x="660" y="84" text-anchor="middle">$8 = $NF</text>' +
        '<text class="d-ts" x="660" y="99" text-anchor="middle">250</text>' +

        '<rect class="d-box-a" x="20" y="128" width="330" height="76" rx="4"/>' +
        '<text class="d-t" x="34" y="148">BIẾN CÓ SẴN</text>' +
        '<text class="d-tm" x="34" y="166">$0</text><text class="d-ts" x="80" y="166">cả dòng</text>' +
        '<text class="d-tm" x="34" y="182">NF</text><text class="d-ts" x="80" y="182">số cột của dòng này</text>' +
        '<text class="d-tm" x="34" y="198">NR</text><text class="d-ts" x="80" y="198">số thứ tự dòng đang đọc</text>' +

        '<rect class="d-box-g" x="370" y="128" width="330" height="76" rx="4"/>' +
        '<text class="d-t" x="384" y="148">CẤU TRÚC CHƯƠNG TRÌNH</text>' +
        '<text class="d-tm" x="384" y="166">MẪU { HÀNH ĐỘNG }</text>' +
        '<text class="d-ts" x="384" y="182">bỏ MẪU = làm với mọi dòng</text>' +
        '<text class="d-ts" x="384" y="198">bỏ HÀNH ĐỘNG = in cả dòng khớp</text>' +
        '</svg>' },

    { t: 'table',
      head: ['Câu lệnh', 'Kết quả trên file log 6 dòng', 'Ý tưởng'],
      rows: [
        ['<code>awk \'{print $3}\'</code>', 'INFO WARN ERROR INFO ERROR INFO', 'In một cột'],
        ['<code>awk \'{print NR, NF, $NF}\'</code>', '<code>1 8 12</code>, <code>2 9 44</code>…', '<code>$NF</code> là cột cuối, không cần biết có bao nhiêu cột'],
        ['<code>awk \'$3 == "ERROR"\'</code>', 'Hai dòng ERROR nguyên vẹn', 'Chỉ có mẫu, không có hành động → in cả dòng'],
        ['<code>awk \'/i2c/ {print $2, $3}\'</code>', '<code>10:02:13 WARN</code>…', 'Mẫu cũng có thể là regex'],
        ['<code>awk \'{t += $NF} END {print t}\'</code>', '<b>885</b>', '<code>END</code> chạy sau dòng cuối'],
        ['<code>awk \'{d[$3]++} END {for (k in d) print k, d[k]}\'</code>', '<code>ERROR 2</code> <code>INFO 3</code> <code>WARN 1</code>', '<b>Mảng kết hợp</b> — thứ mạnh nhất của awk'],
        ['<code>awk -F: \'{print $1, $6}\'</code>', '<code>root /root</code>…', '<code>-F</code> đổi dấu phân cách, ở đây là dấu hai chấm của <code>/etc/passwd</code>'],
        ['<code>awk \'{printf "%-5s %d\\n", $3, $NF}\'</code>', 'Cột thẳng hàng', '<code>printf</code> giống hệt hàm cùng tên trong C']
      ]},

    { t: 'cal', kind: 'tip', title: 'Khi nào dùng cut, khi nào phải dùng awk', x:
      '<p><code>cut</code> nhanh và đơn giản nhưng có một điểm mù chí mạng: nó coi ' +
      '<b>mỗi</b> dấu phân cách là một ranh giới cột.</p>' +
      '<p><code>echo "a    b    c" | cut -d\' \' -f2</code> → in ra <b>chuỗi rỗng</b>, vì cột ' +
      '2 nằm giữa dấu cách thứ nhất và thứ hai.<br>' +
      '<code>echo "a    b    c" | awk \'{print $2}\'</code> → in ra <b>b</b>.</p>' +
      '<p><code>awk</code> coi <b>một chuỗi khoảng trắng liên tiếp</b> là một dấu phân cách — ' +
      'đúng thứ bạn cần khi đọc đầu ra của <code>ls -l</code>, <code>ps</code>, ' +
      '<code>df</code> hay bất kỳ bảng nào căn thẳng cột.</p>' +
      '<p>Quy tắc: file có dấu phân cách <b>cố định</b> như <code>/etc/passwd</code> → ' +
      '<code>cut -d:</code>. Bảng <b>căn cột bằng khoảng trắng</b> → <code>awk</code>. Muốn ' +
      'cứu <code>cut</code> thì bóp khoảng trắng trước: <code>tr -s \' \' | cut -d\' \' -f2</code>.</p>' },

    /* ══════════════════════════════════════════════
       7. BỘ TỨ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'sort, uniq, wc, cut: biến kết quả thô thành bảng' },

    { t: 'table',
      head: ['Lệnh', 'Cờ quan trọng', 'Ghi nhớ'],
      rows: [
        ['<code>sort</code>', '<code>-n</code> theo số · <code>-r</code> đảo · <code>-u</code> bỏ trùng · <code>-h</code> hiểu 2K 1M 3G',
         'Mặc định sắp theo <b>chuỗi</b>: 10 đứng trước 2. Quên <code>-n</code> là sai kết quả'],
        ['<code>sort -t: -k2 -rn</code>', '<code>-t</code> đặt dấu phân cách · <code>-k</code> chọn cột',
         'Cách xếp hạng đầu ra của <code>grep -c</code>'],
        ['<code>uniq</code>', '<code>-c</code> đếm · <code>-d</code> chỉ in dòng trùng · <code>-u</code> chỉ in dòng duy nhất',
         '<b>Chỉ gộp các dòng giống nhau NẰM CẠNH NHAU</b> — phải <code>sort</code> trước'],
        ['<code>wc</code>', '<code>-l</code> dòng · <code>-w</code> từ · <code>-c</code> byte',
         '<code>wc -l file</code> in kèm tên file; <code>wc -l &lt; file</code> chỉ in số'],
        ['<code>cut</code>', '<code>-d</code> dấu phân cách · <code>-f</code> chọn cột · <code>-c</code> chọn ký tự',
         'Nhanh nhưng không chịu được khoảng trắng liên tiếp'],
        ['<code>tr</code>', '<code>-d</code> xoá · <code>-s</code> bóp gọn lặp lại',
         'Chỉ đổi <b>ký tự</b>, không đổi chuỗi. <code>tr \' \' \'\\n\'</code> tách từ thành dòng'],
        ['<code>head -n -1</code>', 'Bỏ dòng <b>cuối</b>', 'Số âm — mẹo ít người biết'],
        ['<code>tail -n +2</code>', 'Bắt đầu <b>từ</b> dòng 2', 'Cách bỏ dòng tiêu đề của một bảng']
      ]},

    { t: 'cal', kind: 'warn', title: 'uniq không sort trước là lỗi kinh điển nhất của người mới', x:
      '<p><code>printf \'a\\nb\\na\\n\' | uniq -c</code> cho ra <code>1 a</code>, ' +
      '<code>1 b</code>, <code>1 a</code> — <b>ba dòng</b>, chữ a xuất hiện hai lần trong ' +
      'bảng đếm.</p>' +
      '<p>Vì <code>uniq</code> chỉ so sánh dòng hiện tại với dòng <b>ngay trước</b> nó. Nó ' +
      'không nhớ gì cả, và chính vì thế nó xử lý được file lớn hơn RAM.</p>' +
      '<p><b>Công thức phải thuộc lòng: <code>| sort | uniq -c | sort -rn</code></b> — sắp ' +
      'xếp để gom, đếm, rồi xếp hạng theo số lần. Bạn sẽ gõ chuỗi này hàng nghìn lần trong ' +
      'đời nghề.</p>' },

    { t: 'cal', kind: 'info', title: 'grep -c đếm DÒNG, không đếm số LẦN', x:
      '<p>Trên file hai dòng <code>aaa</code> và <code>baa</code>:</p>' +
      '<p><code>grep -c \'a\' x.txt</code> → <b>2</b> (hai dòng có chứa chữ a)<br>' +
      '<code>grep -o \'a\' x.txt | wc -l</code> → <b>5</b> (chữ a xuất hiện năm lần)</p>' +
      '<p>Nhầm hai con số này là cách nhanh nhất để báo cáo sai. Khi ai đó hỏi "xuất hiện bao ' +
      'nhiêu lần", gần như luôn là câu thứ hai.</p>' },

    /* ══════════════════════════════════════════════
       8. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: từ cây mã nguồn đến bảng thống kê' },

    { t: 'p', x:
      'Bảy bước dưới đây dựng một dự án C thu nhỏ — đúng hình dạng của một dự án nhúng thật, ' +
      'chỉ nhỏ hơn — rồi lần lượt tra hỏi nó bằng cả năm công cụ. Bước cuối ghép tất cả thành ' +
      'một câu lệnh duy nhất, và đó chính là mốc <b>M1</b> của lộ trình. Toàn bộ đầu ra bạn ' +
      'thấy trong bài là kết quả thật chạy trên máy này.' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Dựng bãi tập', blocks: [
        { t: 'p', x:
          'Bạn cần một cây thư mục có đủ thứ để tra hỏi: mã nguồn, header, file trung gian ' +
          '<code>.o</code>, một file rỗng, một file cấu hình và một file nhật ký. Dùng here-doc ' +
          'của Bài 10 để tạo nội dung nhiều dòng.' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'mkdir -p ~/embedded/bai11/project/src ~/embedded/bai11/project/drivers ~/embedded/bai11/project/include\n' +
          'cd ~/embedded/bai11\n' +
          '\n' +
          "cat > project/src/main.c <<'EOF'\n" +
          '#include "gpio.h"\n' +
          '#include <stdio.h>\n' +
          '\n' +
          '/* TODO: read config from file */\n' +
          'int main(void)\n' +
          '{\n' +
          '    gpio_init();\n' +
          '    gpio_set(17, 1);\n' +
          '    printf("gpio 17 = 1\\n");\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          '\n' +
          "cat > project/src/uart.c <<'EOF'\n" +
          '#include "uart.h"\n' +
          '\n' +
          'int uart_init(int baud)\n' +
          '{\n' +
          '    return baud > 0 ? 0 : -1;\n' +
          '}\n' +
          'EOF\n' +
          '\n' +
          "cat > project/drivers/gpio.c <<'EOF'\n" +
          '#include "gpio.h"\n' +
          '\n' +
          'static int gpio_state[64];\n' +
          '\n' +
          'int gpio_init(void)\n' +
          '{\n' +
          '    return 0;\n' +
          '}\n' +
          '\n' +
          'int gpio_set(int pin, int value)\n' +
          '{\n' +
          '    gpio_state[pin] = value;\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF' },
        { t: 'p', x: 'Hai header, một file cấu hình và một file nhật ký:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "cat > project/include/gpio.h <<'EOF'\n" +
          '#ifndef GPIO_H\n' +
          '#define GPIO_H\n' +
          'int gpio_init(void);\n' +
          'int gpio_set(int pin, int value);\n' +
          '#endif\n' +
          'EOF\n' +
          '\n' +
          "cat > project/include/uart.h <<'EOF'\n" +
          '#ifndef UART_H\n' +
          '#define UART_H\n' +
          'int uart_init(int baud);\n' +
          '#endif\n' +
          'EOF\n' +
          '\n' +
          "cat > project/config.txt <<'EOF'\n" +
          '# device configuration\n' +
          'port = /dev/ttyS0\n' +
          'baud = 9600\n' +
          'debug = 0\n' +
          '\n' +
          '# network section\n' +
          'ip = 192.168.1.10\n' +
          'EOF\n' +
          '\n' +
          "cat > project/device.log <<'EOF'\n" +
          '2026-08-01 10:02:11 INFO  uart  init complete baud rate 115200\n' +
          '2026-08-01 10:02:12 INFO  gpio  registered 32 pins total 32\n' +
          '2026-08-01 10:02:13 WARN  i2c   could not find any device 0\n' +
          '2026-08-01 10:02:14 ERROR uart  timeout during read 250\n' +
          '2026-08-01 10:02:15 INFO  gpio  pin 17 set to high 1\n' +
          '2026-08-01 10:02:16 ERROR i2c   CRC check failed code 487\n' +
          'EOF' },
        { t: 'p', x:
          'Cuối cùng thêm hai file rỗng để làm mồi cho <code>-empty</code>, và bật nhầm bit ' +
          'thực thi cho một file <code>.c</code> — một lỗi có thật, rất hay gặp khi chép mã ' +
          'nguồn từ phân vùng Windows sang:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'touch project/src/main.o project/empty.txt\n' +
          'chmod +x project/src/main.c\n' +
          'find project | sort' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'project\n' +
          'project/config.txt\n' +
          'project/device.log\n' +
          'project/drivers\n' +
          'project/drivers/gpio.c\n' +
          'project/empty.txt\n' +
          'project/include\n' +
          'project/include/gpio.h\n' +
          'project/include/uart.h\n' +
          'project/src\n' +
          'project/src/main.c\n' +
          'project/src/main.o\n' +
          'project/src/uart.c' },
        { t: 'cal', kind: 'info', title: 'find không có đối số điều kiện nào thì in tất cả', x:
          '<p><code>find project</code> tương đương <code>find project -print</code>: không điều kiện ' +
          'nghĩa là mọi thứ đều thoả. Nó in cả thư mục lẫn file, và <b>bắt đầu bằng chính ' +
          'đường dẫn gốc</b> — dòng <code>project</code> đầu tiên chính là thư mục <code>project</code>.</p>' +
          '<p>Thứ tự tự nhiên của <code>find</code> phụ thuộc vào thứ tự đĩa trả về, không phải ' +
          'thứ tự chữ cái. Vì thế bài này thêm <code>| sort</code> để bạn và máy này nhìn thấy ' +
          'cùng một thứ tự.</p>' }
      ]},

      /* ---------- BƯỚC 2 ---------- */
      { title: 'find: hỏi hệ thống file bằng điều kiện', blocks: [
        { t: 'p', x:
          'Giờ tra hỏi cây vừa dựng. Chạy từng câu và đối chiếu với đầu ra bên dưới — mỗi câu ' +
          'minh hoạ đúng một loại điều kiện.' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "find project -type f -name '*.c'\n" +
          "echo '--- .c or .h'\n" +
          "find project -type f \\( -name '*.c' -o -name '*.h' \\) | sort\n" +
          "echo '--- everything except .o'\n" +
          "find project -type f ! -name '*.o' | sort" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'project/src/uart.c\n' +
          'project/src/main.c\n' +
          'project/drivers/gpio.c\n' +
          '--- .c or .h\n' +
          'project/drivers/gpio.c\n' +
          'project/include/gpio.h\n' +
          'project/include/uart.h\n' +
          'project/src/main.c\n' +
          'project/src/uart.c\n' +
          '--- everything except .o\n' +
          'project/config.txt\n' +
          'project/device.log\n' +
          'project/drivers/gpio.c\n' +
          'project/include/gpio.h\n' +
          'project/include/uart.h\n' +
          'project/empty.txt\n' +
          'project/src/main.c\n' +
          'project/src/uart.c' },
        { t: 'cmdx', cmd: "find project -type f \\( -name '*.c' -o -name '*.h' \\)", title: 'Vì sao phải có cặp ngoặc, và vì sao phải thoát nó',
          rows: [
            ['<code>-type f</code>', 'Chỉ file thường', 'Đứng ngoài ngoặc nên áp cho <b>cả hai</b> nhánh'],
            ['<code>\\(</code>', 'Mở nhóm điều kiện', 'Dấu <code>(</code> là ký tự đặc biệt của bash — không thoát thì bash báo lỗi cú pháp'],
            ['<code>-o</code>', 'HOẶC', 'Không có ngoặc, <code>-type f -name a -o -name b</code> đọc thành <b>(f VÀ a) HOẶC b</b> — sai hoàn toàn'],
            ['<code>!</code>', 'Phủ định điều kiện ngay sau nó', 'Có thể viết <code>-not</code> cho dễ đọc']
          ]},
        { t: 'p', x: 'Bây giờ là ba điều kiện hay dùng nhất khi dọn dẹp một cây build:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'find project -type f -empty\n' +
          "echo '--- larger than 200 bytes'\n" +
          'find project -type f -size +200c\n' +
          "echo '--- has execute bit for owner'\n" +
          'find project -type f -perm -u+x' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'project/empty.txt\n' +
          'project/src/main.o\n' +
          '--- larger than 200 bytes\n' +
          'project/device.log\n' +
          '--- has execute bit for owner\n' +
          'project/src/main.c' },
        { t: 'cal', kind: 'why', title: 'Câu cuối vừa tìm ra một lỗi thật trong dự án', x:
          '<p>Một file <code>.c</code> <b>không được phép</b> có bit thực thi — nó là văn bản ' +
          'để trình biên dịch đọc, không phải chương trình để kernel chạy. Bit <code>x</code> ' +
          'đó là dấu vết của việc chép mã nguồn qua một hệ thống file không lưu quyền Unix, ' +
          'thường là ổ NTFS của Windows hoặc một file zip.</p>' +
          '<p>Hậu quả không phải lý thuyết: <code>git</code> sẽ ghi nhận thay đổi mode ' +
          '<code>100644 → 100755</code> và bạn nhận một bình luận trong code review. Câu lệnh ' +
          'vừa rồi là cách kiểm tra cả cây trong một giây, và cách sửa là ' +
          '<code>find project -name \'*.c\' -exec chmod 644 {} +</code>.</p>' },
        { t: 'p', x: 'Còn đây là cái bẫy mà callout ở phần lý thuyết đã cảnh báo:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'find project -type f -size -1k\n' +
          "echo '--- switch to byte unit'\n" +
          'find project -type f -size -1024c | sort' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'project/empty.txt\n' +
          'project/src/main.o\n' +
          '--- switch to byte unit\n' +
          'project/config.txt\n' +
          'project/device.log\n' +
          'project/drivers/gpio.c\n' +
          'project/empty.txt\n' +
          'project/include/gpio.h\n' +
          'project/include/uart.h\n' +
          'project/src/main.c\n' +
          'project/src/main.o\n' +
          'project/src/uart.c' },
        { t: 'cal', kind: 'danger', title: 'Hai câu, chín file chênh lệch — và cả hai đều không báo lỗi', x:
          '<p><code>-size -1k</code> chỉ trả về <b>2</b> file, đúng hai file <b>rỗng</b>. ' +
          '<code>-size -1024c</code> trả về cả <b>9</b>.</p>' +
          '<p>Vì <code>find</code> <b>làm tròn lên</b> khi bạn dùng đơn vị k hoặc M. File ' +
          '<code>uart.c</code> nặng 77 byte được tính thành 1k, mà "nhỏ hơn 1k" nghĩa là 0k — ' +
          'chỉ file 0 byte mới thoả.</p>' +
          '<p>Đây là loại lỗi tệ nhất trong nghề: <b>không có thông báo, chỉ có kết quả sai</b>. ' +
          'Bạn tưởng cây build sạch trong khi nó đầy file rác. Quy tắc: khi cần chính xác, ' +
          '<b>luôn dùng hậu tố <code>c</code></b>.</p>' }
      ]},

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Đo cái giá của dấu \\; và cái bẫy tên file có dấu cách', blocks: [
        { t: 'p', x:
          'Phần lý thuyết nói <code>\\;</code> chậm hơn <code>+</code> khoảng 94 lần. Đừng tin, ' +
          'hãy đo. Trước hết nhìn tận mắt khác biệt về <b>số lần gọi lệnh</b>:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'find project -type f -name \'*.c\' -exec echo "-- single call:" {} \\;\n' +
          "echo '--- change terminator to +'\n" +
          'find project -type f -name \'*.c\' -exec echo "-- single call:" {} +' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '-- single call: project/src/uart.c\n' +
          '-- single call: project/src/main.c\n' +
          '-- single call: project/drivers/gpio.c\n' +
          '--- change terminator to +\n' +
          '-- single call: project/src/uart.c project/src/main.c project/drivers/gpio.c' },
        { t: 'cal', kind: 'info', title: 'Ba dòng so với một dòng — đó là toàn bộ câu chuyện', x:
          '<p>Với <code>\\;</code>, <code>echo</code> chạy <b>ba lần</b>, mỗi lần nhận một tên ' +
          'file. Với <code>+</code>, <code>echo</code> chạy <b>một lần</b> và nhận cả ba tên ' +
          'làm ba tham số.</p>' +
          '<p>Ba lần thì không ai để ý. Hãy nhân nó lên quy mô thật.</p>' },
        { t: 'p', x:
          'Trên máy này <code>/usr/include</code> có <b>2062</b> file <code>.h</code>. Đo cùng ' +
          'một công việc bằng bốn cách:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "find /usr/include -name '*.h' 2>/dev/null | wc -l\n" +
          '\n' +
          "echo '=== 1. one grep call per file'\n" +
          "time find /usr/include -name '*.h' -exec grep -l ioctl {} \\; 2>/dev/null | wc -l\n" +
          "echo '=== 2. batched, one grep call'\n" +
          "time find /usr/include -name '*.h' -exec grep -l ioctl {} + 2>/dev/null | wc -l\n" +
          "echo '=== 3. xargs also batches'\n" +
          "time find /usr/include -name '*.h' -print0 2>/dev/null | xargs -0 grep -l ioctl | wc -l\n" +
          "echo '=== 4. grep walks the tree itself'\n" +
          "time grep -rl --include='*.h' ioctl /usr/include 2>/dev/null | wc -l" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '2062\n' +
          '=== 1. one grep call per file\n' +
          '281\n' +
          'real\t0m2.607s\n' +
          'user\t0m1.167s\n' +
          'sys\t0m0.791s\n' +
          '=== 2. batched, one grep call\n' +
          '281\n' +
          'real\t0m0.029s\n' +
          'user\t0m0.015s\n' +
          'sys\t0m0.017s\n' +
          '=== 3. xargs also batches\n' +
          '281\n' +
          'real\t0m0.026s\n' +
          'user\t0m0.022s\n' +
          'sys\t0m0.010s\n' +
          '=== 4. grep walks the tree itself\n' +
          '277\n' +
          'real\t0m0.023s\n' +
          'user\t0m0.014s\n' +
          'sys\t0m0.008s' },
        { t: 'cal', kind: 'why', title: 'Con số của bạn sẽ khác — nhưng tỉ lệ thì không', x:
          '<p>Đo ba lần liên tiếp trên máy này, cột <code>real</code> của <code>\\;</code> cho ' +
          '<b>4,014 s</b> rồi <b>2,504 s</b> rồi <b>2,607 s</b>; còn <code>+</code> cho ' +
          '<b>0,027</b>, <b>0,029</b>, <b>0,029</b>. Lần đầu chậm hơn vì bộ nhớ đệm của kernel ' +
          'chưa giữ nội dung các file.</p>' +
          '<p>Điều <b>không</b> đổi là tỉ lệ: luôn quanh <b>90 đến 130 lần</b>. Toàn bộ chênh ' +
          'lệch là chi phí tạo 2062 tiến trình <code>grep</code> thay vì 1 — đúng cơ chế ' +
          '<code>fork</code> + <code>exec</code> của Bài 9.</p>' +
          '<p>Rút ra hai điều. <b>Một</b>, khi báo cáo số đo phải nói rõ đo mấy lần và điều kiện ' +
          'ra sao — một phép đo đơn lẻ không phải bằng chứng. <b>Hai</b>, con số tuyệt đối ' +
          'thay đổi theo máy, nhưng <b>bậc độ lớn</b> thì phản ánh đúng bản chất.</p>' },
        { t: 'p', x:
          'Chú ý con số <b>277</b> ở dòng cuối, khác 281 của ba cách trên — đó chính là bốn ' +
          'symlink mà phần lý thuyết đã mổ xẻ. Giờ tới cái bẫy đắt giá nhất của <code>xargs</code>:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'mkdir -p trap\n' +
          "printf 'int a;\\n' > 'trap/name with a space.c'\n" +
          "printf 'int b;\\n' > 'trap/normal.c'\n" +
          "find trap -name '*.c' | xargs ls -l\n" +
          'echo "rc=$?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          "ls: cannot access 'trap/name': No such file or directory\n" +
          "ls: cannot access 'with': No such file or directory\n" +
          "ls: cannot access 'a': No such file or directory\n" +
          "ls: cannot access 'space.c': No such file or directory\n" +
          '-rw-r--r-- 1 shinarus shinarus 7 Aug  6 08:04 trap/normal.c\n' +
          'rc=123' },
        { t: 'p', x: 'Một tên file bị xé thành bốn. Cách sửa là đổi ký tự phân cách:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "find trap -name '*.c' -print0 | xargs -0 ls -l\n" +
          'echo "rc=$?"\n' +
          'rm -rf trap' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          "-rw-r--r-- 1 shinarus shinarus 7 Aug  6 08:04 trap/name with a space.c\n" +
          '-rw-r--r-- 1 shinarus shinarus 7 Aug  6 08:04 trap/normal.c\n' +
          'rc=0' },
        { t: 'cmdx', cmd: "find ... -print0 | xargs -0 lenh", title: 'Vì sao byte 0 là lời giải duy nhất đúng',
          rows: [
            ['<code>-print0</code>', 'Kết thúc mỗi tên file bằng <b>byte 0</b> thay vì ký tự xuống dòng', 'Byte 0 là ký tự <b>duy nhất</b> không thể có trong tên file Linux'],
            ['<code>xargs -0</code>', 'Đọc theo byte 0 thay vì theo khoảng trắng', 'Hai cờ này luôn đi thành cặp'],
            ['<code>rc=123</code>', 'Mã thoát của <code>xargs</code> khi lệnh con thất bại', 'Bài 4 đã dạy đọc mã thoát; ở đây nó nói cho bạn biết có chuyện không ổn'],
            ['<code>-exec ... +</code>', 'Cách khác, an toàn sẵn', '<code>find</code> truyền tên file trực tiếp, không qua shell, nên dấu cách không phá được gì']
          ]},
        { t: 'cal', kind: 'tip', title: 'Ba cách viết, chọn cách nào', x:
          '<p><b>Chỉ tìm chuỗi trong file:</b> dùng <code>grep -r --include</code>. Ngắn nhất, ' +
          'nhanh nhất, không có bẫy.</p>' +
          '<p><b>Cần lọc theo thuộc tính file</b> (kích thước, thời gian, quyền) rồi mới xử lý: ' +
          'dùng <code>find ... -exec ... +</code>.</p>' +
          '<p><b>Cần chạy song song hoặc kiểm soát số tham số mỗi lần:</b> dùng ' +
          '<code>-print0 | xargs -0</code>, vì <code>xargs</code> có <code>-P</code> để chạy ' +
          'nhiều tiến trình cùng lúc và <code>-n</code> để chia lô. Ở Chặng 11 bạn sẽ thấy ' +
          'đúng kiểu này trong script của Buildroot.</p>' }
      ]},

      /* ---------- BƯỚC 4 ---------- */
      { title: 'grep: đọc mã nguồn bằng câu hỏi', blocks: [
        { t: 'p', x:
          'Đây là kỹ năng bạn sẽ dùng nhiều nhất trong cả sự nghiệp: đứng trước một cây mã ' +
          'nguồn lạ và tìm ra chỗ cần sửa. Bắt đầu bằng câu hỏi cơ bản nhất — chuỗi ' +
          '<code>gpio</code> nằm ở đâu:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "grep -rn 'gpio' project --include='*.c'" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'project/src/main.c:1:#include "gpio.h"\n' +
          'project/src/main.c:7:    gpio_init();\n' +
          'project/src/main.c:8:    gpio_set(17, 1);\n' +
          'project/src/main.c:9:    printf("gpio 17 = 1\\n");\n' +
          'project/drivers/gpio.c:1:#include "gpio.h"\n' +
          'project/drivers/gpio.c:3:static int gpio_state[64];\n' +
          'project/drivers/gpio.c:5:int gpio_init(void)\n' +
          'project/drivers/gpio.c:10:int gpio_set(int pin, int value)\n' +
          'project/drivers/gpio.c:12:    gpio_state[pin] = value;' },
        { t: 'cal', kind: 'tip', title: 'Định dạng file:dòng:nội dung không phải ngẫu nhiên', x:
          '<p>Cả ba trường ngăn nhau bằng dấu hai chấm là <b>quy ước chung của toàn bộ hệ sinh ' +
          'thái Unix</b>. <code>gcc</code> báo lỗi theo đúng định dạng này, <code>vim</code> ' +
          'và VS Code đọc được nó để nhảy thẳng tới dòng, và ở bước 7 bạn sẽ tách nó bằng ' +
          '<code>awk -F:</code>.</p>' +
          '<p>Trong <code>vim</code> (Bài 7), gõ <code>:grep -rn gpio project</code> rồi ' +
          '<code>:copen</code> sẽ mở đúng danh sách này thành một cửa sổ bấm được. Đó là lý do ' +
          'nên tập phản xạ luôn thêm <code>-n</code>.</p>' },
        { t: 'p', x:
          'Bốn biến thể trả lời bốn câu hỏi khác nhau. Hãy để ý cùng một chuỗi ' +
          '<code>gpio</code> nhưng số dòng trả về khác hẳn:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "echo '--- which files have it, not asking which line'\n" +
          "grep -rl 'gpio' project\n" +
          "echo '--- how many lines per file'\n" +
          "grep -rc 'gpio' project --include='*.c'\n" +
          "echo '--- whole word gpio only, not gpio_set'\n" +
          "grep -rnw 'gpio' project --include='*.c'" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '--- which files have it, not asking which line\n' +
          'project/device.log\n' +
          'project/src/main.c\n' +
          'project/drivers/gpio.c\n' +
          'project/include/gpio.h\n' +
          '--- how many lines per file\n' +
          'project/src/uart.c:0\n' +
          'project/src/main.c:4\n' +
          'project/drivers/gpio.c:5\n' +
          '--- whole word gpio only, not gpio_set\n' +
          'project/src/main.c:1:#include "gpio.h"\n' +
          'project/src/main.c:9:    printf("gpio 17 = 1\\n");\n' +
          'project/drivers/gpio.c:1:#include "gpio.h"' },
        { t: 'cal', kind: 'why', title: 'Ba con số nói ba chuyện khác nhau — đọc kỹ', x:
          '<p><b>Với <code>-l</code>:</b> có <b>4</b> file, kể cả <code>device.log</code> và ' +
          '<code>gpio.h</code>, vì lần này không có <code>--include</code> nên grep xét mọi file.</p>' +
          '<p><b>Với <code>-c</code>:</b> <code>uart.c</code> hiện ra với số <b>0</b>. Nhiều ' +
          'người bất ngờ ở đây: <code>-c</code> báo cáo <b>mọi</b> file nó đã xét, kể cả file ' +
          'không khớp. Ở bước 7 bạn sẽ phải lọc bỏ những dòng 0 này bằng <code>awk</code>.</p>' +
          '<p><b>Với <code>-w</code>:</b> chỉ còn <b>3</b> dòng thay vì 9. <code>-w</code> đòi ' +
          'hai bên chuỗi phải là ranh giới từ, nên <code>gpio_init</code> và ' +
          '<code>gpio_state</code> bị loại — trong C dấu gạch dưới là ký tự hợp lệ của tên. ' +
          'Đây chính là cách bạn tìm biến <code>i</code> mà không bị ngập trong ' +
          '<code>if</code>, <code>int</code>, <code>init</code>.</p>' },
        { t: 'p', x:
          'Hai cờ cuối cho công việc thật: lọc file cấu hình, và xem ngữ cảnh quanh một lỗi ' +
          'trong nhật ký.' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "grep -v '^#' project/config.txt | grep -v '^$'\n" +
          "echo '--- 1 line before and 1 after each error'\n" +
          "grep -n -A 1 -B 1 'ERROR' project/device.log" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'port = /dev/ttyS0\n' +
          'baud = 9600\n' +
          'debug = 0\n' +
          'ip = 192.168.1.10\n' +
          '--- 1 line before and 1 after each error\n' +
          '3-2026-08-01 10:02:13 WARN  i2c   could not find any device 0\n' +
          '4:2026-08-01 10:02:14 ERROR uart  timeout during read 250\n' +
          '5-2026-08-01 10:02:15 INFO  gpio  pin 17 set to high 1\n' +
          '6:2026-08-01 10:02:16 ERROR i2c   CRC check failed code 487' },
        { t: 'cal', kind: 'info', title: 'Dấu hai chấm và dấu gạch ngang phân biệt dòng khớp với dòng ngữ cảnh', x:
          '<p>Dòng <code>4:</code> và <code>6:</code> dùng dấu <b>hai chấm</b> — đó là dòng thật ' +
          'sự khớp. Dòng <code>3-</code> và <code>5-</code> dùng dấu <b>gạch ngang</b> — chúng ' +
          'chỉ được in kèm cho có ngữ cảnh.</p>' +
          '<p>Chi tiết nhỏ này cứu bạn khi đọc log kernel dài hàng nghìn dòng: mắt lướt tìm dấu ' +
          'hai chấm là ra ngay dòng gốc. Ở Chặng 12, khi đọc một <i>kernel oops</i>, ' +
          '<code>dmesg | grep -A 20 -B 5 \'Unable to handle\'</code> sẽ là câu lệnh đầu tiên ' +
          'bạn gõ.</p>' },
        { t: 'p', x:
          'Cuối cùng, kiểm chứng ba mã thoát mà Bài 4 đã dạy — chúng là nền móng cho ' +
          '<code>if</code> trong Bài 13:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "grep -q 'gpio_init' project/src/main.c; echo \"found        rc=$?\"\n" +
          "grep -q 'nosuchstring' project/src/main.c; echo \"not found    rc=$?\"\n" +
          "grep -q 'x' project/missing.txt; echo \"missing file rc=$?\"" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'found        rc=0\n' +
          'not found    rc=1\n' +
          'grep: project/missing.txt: No such file or directory\n' +
          'missing file rc=2' }
      ]},

      /* ---------- BƯỚC 5 ---------- */
      { title: 'sed: xem trước, rồi mới sửa', blocks: [
        { t: 'p', x:
          'Tình huống thật: bạn chuyển dự án từ một board dùng UART <code>ttyS0</code> sang ' +
          'board ARM dùng <code>ttyAMA0</code>, đồng thời nâng tốc độ từ 9600 lên 115200. ' +
          '<b>Luôn chạy không có <code>-i</code> trước</b> để đọc kết quả bằng mắt:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "sed 's/ttyS0/ttyAMA0/' project/config.txt\n" +
          "echo '--- original file untouched'\n" +
          "grep 'port' project/config.txt" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '# device configuration\n' +
          'port = /dev/ttyAMA0\n' +
          'baud = 9600\n' +
          'debug = 0\n' +
          '\n' +
          '# network section\n' +
          'ip = 192.168.1.10\n' +
          '--- original file untouched\n' +
          'port = /dev/ttyS0' },
        { t: 'cal', kind: 'why', title: 'Mặc định sed không đụng vào file — đó là thiết kế, không phải thiếu sót', x:
          '<p><code>sed</code> đọc file, biến đổi, rồi in ra <b>stdout</b>. File gốc nguyên vẹn. ' +
          'Nhờ vậy nó ghép được vào đường ống của Bài 10 và bạn có thể thử bao nhiêu lần cũng ' +
          'được mà không mất gì.</p>' +
          '<p>Hãy biến điều này thành thói quen bắt buộc: <b>chạy sạch một lần, đọc, rồi mới ' +
          'thêm <code>-i</code></b>. Với biểu thức chính quy, khoảng cách giữa "đúng ý" và ' +
          '"phá cả cây mã nguồn" chỉ là một ký tự.</p>' },
        { t: 'p', x: 'Bây giờ sửa thật, hai thay thế trong một lần chạy, có giữ bản sao:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "sed -i.bak -e 's|/dev/ttyS0|/dev/ttyAMA0|' -e 's/9600/115200/' project/config.txt\n" +
          'ls project/config.txt*\n' +
          "echo '--- edited copy'\n" +
          "grep -E 'port|baud' project/config.txt\n" +
          "echo '--- backup untouched'\n" +
          "grep -E 'port|baud' project/config.txt.bak" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'project/config.txt\n' +
          'project/config.txt.bak\n' +
          '--- edited copy\n' +
          'port = /dev/ttyAMA0\n' +
          'baud = 115200\n' +
          '--- backup untouched\n' +
          'port = /dev/ttyS0\n' +
          'baud = 9600' },
        { t: 'cmdx', cmd: "sed -i.bak -e 's|/dev/ttyS0|/dev/ttyAMA0|' -e 's/9600/115200/' project/config.txt", title: 'Mổ xẻ từng mảnh',
          rows: [
            ['<code>-i.bak</code>', 'Sửa thẳng vào file, chép bản cũ thành <code>config.txt.bak</code>', '<b>Không có dấu cách</b> giữa <code>-i</code> và <code>.bak</code>'],
            ['<code>-e</code>', 'Mỗi <code>-e</code> là một lệnh sed, chạy tuần tự trên từng dòng', 'Không có <code>-e</code> thì chỉ được một lệnh'],
            ['<code>s|…|…|</code>', 'Dấu phân cách đổi thành <code>|</code>', '<b>Bắt buộc</b> ở đây vì mẫu chứa dấu <code>/</code> của đường dẫn'],
            ['<code>s/9600/115200/</code>', 'Vẫn dùng dấu <code>/</code> vì mẫu không chứa nó', 'Dấu phân cách chỉ cần <b>khác</b> mọi ký tự trong mẫu'],
            ['<i>không có cờ</i> <code>g</code>', 'Chỉ thay lần đầu trên mỗi dòng', 'Ở đây đúng ý — mỗi dòng chỉ có một giá trị']
          ]},
        { t: 'cal', kind: 'tip', title: 'Mẹo dấu phân cách cứu bạn khỏi rừng dấu gạch chéo', x:
          '<p>Nếu cố viết <code>s/\\/dev\\/ttyS0/\\/dev\\/ttyAMA0/</code> bạn sẽ phải thoát bốn ' +
          'dấu gạch chéo và rất dễ nhầm. Cộng đồng gọi hiện tượng này là <i>leaning toothpick ' +
          'syndrome</i> — hội chứng que tăm nghiêng.</p>' +
          '<p><code>sed</code> chấp nhận <b>bất kỳ</b> ký tự nào ngay sau chữ <code>s</code> làm ' +
          'dấu phân cách. Khi làm việc với đường dẫn, hãy dùng <code>s|…|…|</code> hoặc ' +
          '<code>s#…#…#</code>. Bạn sẽ dùng mẹo này liên tục ở Chặng 11 khi viết công thức ' +
          'Buildroot sửa đường dẫn trong file cấu hình.</p>' },
        { t: 'p', x: 'Ba lệnh sed còn lại đủ dùng cho hầu hết công việc còn lại:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "echo '--- remove comments and blank lines'\n" +
          "sed -e '/^#/d' -e '/^$/d' project/config.txt\n" +
          "echo '--- print only lines 2 to 3 of the log'\n" +
          "sed -n '2,3p' project/device.log\n" +
          "echo '--- reorder using capture groups'\n" +
          "sed -E 's/^([a-z]+) = (.*)$/\\2 <- \\1/' project/config.txt.bak | grep -v '^#' | grep -v '^$'" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '--- remove comments and blank lines\n' +
          'port = /dev/ttyAMA0\n' +
          'baud = 115200\n' +
          'debug = 0\n' +
          'ip = 192.168.1.10\n' +
          '--- print only lines 2 to 3 of the log\n' +
          '2026-08-01 10:02:12 INFO  gpio  registered 32 pins total 32\n' +
          '2026-08-01 10:02:13 WARN  i2c   could not find any device 0\n' +
          '--- reorder using capture groups\n' +
          '/dev/ttyS0 <- port\n' +
          '9600 <- baud\n' +
          '0 <- debug\n' +
          '192.168.1.10 <- ip' },
        { t: 'cal', kind: 'info', title: 'Nhóm bắt: dấu ngoặc ghi nhớ, \\1 \\2 gọi lại', x:
          '<p><code>([a-z]+)</code> nói với sed: "khớp phần này <b>và nhớ nó lại</b>". Cặp ngoặc ' +
          'thứ nhất thành <code>\\1</code>, cặp thứ hai thành <code>\\2</code>. Vế thay thế ' +
          'chỉ việc gọi chúng ra theo thứ tự bạn muốn.</p>' +
          '<p>Với <code>-E</code> bạn viết <code>(</code> trần. Không có <code>-E</code> phải ' +
          'viết <code>\\(</code> — thêm một lý do để luôn bật <code>-E</code>.</p>' +
          '<p>Đây là cơ chế đằng sau mọi thao tác "đổi định dạng hàng loạt": đổi ' +
          '<code>ngay/thang/nam</code> thành <code>nam-thang-ngay</code>, tách một bảng CSV, ' +
          'hay đổi tên hàng trăm hàm khi một API kernel thay đổi.</p>' }
      ]},

      /* ---------- BƯỚC 6 ---------- */
      { title: 'awk: biến nhật ký thành bảng số liệu', blocks: [
        { t: 'p', x:
          'File <code>device.log</code> có sáu dòng, mỗi dòng nhiều cột: ngày, giờ, mức, phân ' +
          'hệ, mô tả, và một con số ở cuối. Đây đúng hình dạng của log thật mà bạn sẽ đọc suốt ' +
          'các chặng sau. Bắt đầu bằng việc lấy cột:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "awk '{print $3, $4}' project/device.log\n" +
          "echo '--- record number, field count, last field'\n" +
          "awk '{print NR, NF, $NF}' project/device.log" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'INFO uart\n' +
          'INFO gpio\n' +
          'WARN i2c\n' +
          'ERROR uart\n' +
          'INFO gpio\n' +
          'ERROR i2c\n' +
          '--- record number, field count, last field\n' +
          '1 9 115200\n' +
          '2 9 32\n' +
          '3 10 0\n' +
          '4 8 250\n' +
          '5 10 1\n' +
          '6 9 487' },
        { t: 'cal', kind: 'why', title: 'Cột 8, 9, 10 — vì sao $NF quan trọng đến thế', x:
          '<p>Nhìn cột giữa: các dòng có <b>8, 9 và 10</b> cột khác nhau, vì phần mô tả dài ' +
          'ngắn không đều. Nếu bạn viết <code>$9</code> để lấy con số cuối, ba dòng sẽ sai.</p>' +
          '<p><code>$NF</code> nghĩa là "cột cuối cùng, dù có bao nhiêu cột". Còn ' +
          '<code>$(NF-1)</code> là cột áp chót. Đây là lý do <code>awk</code> đọc được đầu ra ' +
          'của <code>ls -l</code>, <code>ps</code>, <code>df</code> mà không cần biết tên file ' +
          'dài bao nhiêu.</p>' +
          '<p><code>NR</code> (number of records) hữu ích ở cuối chương trình: nó chính là ' +
          'tổng số dòng đã đọc.</p>' },
        { t: 'p', x:
          'Bây giờ là ba việc mà <code>grep</code> không làm được: lọc theo <b>cột cụ thể</b>, ' +
          'cộng dồn, và đếm theo nhóm.' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "awk '$3 == \"ERROR\"' project/device.log\n" +
          "echo '--- sum the last column'\n" +
          "awk '{total += $NF} END {print \"total =\", total, \"over\", NR, \"lines\"}' project/device.log\n" +
          "echo '--- count by log level'\n" +
          "awk '{count[$3]++} END {for (k in count) print k, count[k]}' project/device.log\n" +
          "echo '--- count by subsystem, aligned'\n" +
          "awk '{count[$4]++} END {for (k in count) printf \"%-6s %d\\n\", k, count[k]}' project/device.log | sort" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '2026-08-01 10:02:14 ERROR uart  timeout during read 250\n' +
          '2026-08-01 10:02:16 ERROR i2c   CRC check failed code 487\n' +
          '--- sum the last column\n' +
          'total = 115970 over 6 lines\n' +
          '--- count by log level\n' +
          'WARN 1\n' +
          'ERROR 2\n' +
          'INFO 3\n' +
          '--- count by subsystem, aligned\n' +
          'gpio   2\n' +
          'i2c    2\n' +
          'uart   2' },
        { t: 'cmdx', cmd: "awk '{count[$3]++} END {for (k in count) print k, count[k]}'", title: 'Mảng kết hợp — thứ mạnh nhất của awk',
          rows: [
            ['<code>count[$3]++</code>', 'Lấy cột 3 làm <b>khoá</b>, tăng ô đếm tương ứng lên 1', 'Không phải khai báo mảng, không phải khởi tạo về 0 — awk tự lo'],
            ['<code>END { }</code>', 'Khối chạy <b>một lần</b> sau khi đọc hết dòng cuối', 'Cặp với <code>BEGIN { }</code> chạy trước dòng đầu'],
            ['<code>for (k in count)</code>', 'Duyệt mọi khoá đã gặp', '<b>Thứ tự không xác định</b> — đó là lý do phải nối thêm <code>| sort</code>'],
            ['<code>printf "%-6s %d\\n"</code>', 'Căn trái 6 ký tự, rồi một số nguyên', 'Cú pháp y hệt <code>printf</code> của C mà bạn sẽ gặp lại ở Chặng 02'],
            ['<code>total += $NF</code>', 'Cộng dồn qua các dòng', 'Biến trong awk <b>không cần khai báo</b> và mặc định bằng 0']
          ]},
        { t: 'cal', kind: 'info', title: 'Ba dòng awk thay cho một chương trình C hai mươi dòng', x:
          '<p>Câu <code>{count[$3]++} END {...}</code> vừa làm bốn việc: tách cột, dựng bảng băm, ' +
          'đếm, và in kết quả. Viết bằng C sẽ mất hai mươi dòng và một cấu trúc dữ liệu tự cài.</p>' +
          '<p>Đó là lý do <code>awk</code> vẫn sống khoẻ sau năm mươi năm và có mặt trong ' +
          '<b>mọi</b> bản BusyBox. Trên một thiết bị nhúng không có Python, ' +
          '<code>awk</code> thường là công cụ xử lý dữ liệu mạnh nhất bạn có.</p>' },
        { t: 'p', x:
          'Cuối cùng, cờ <code>-F</code> cho file có dấu phân cách cố định. Đây là cách đọc ' +
          '<code>/etc/passwd</code> mà Bài 8 đã giới thiệu:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "awk -F: '$3 >= 1000 {print $1, $3, $7}' /etc/passwd" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'nobody 65534 /usr/sbin/nologin\n' +
          'shinarus 1000 /bin/bash' },
        { t: 'cal', kind: 'tip', title: 'So sánh số hay so sánh chuỗi — awk tự quyết, và đôi khi quyết sai', x:
          '<p><code>$3 &gt;= 1000</code> chạy đúng vì awk thấy cả hai vế đều là số. Nhưng nếu ' +
          'cột chứa <code>0012</code>, awk vẫn coi là số 12; còn <code>1.2.3</code> thì thành ' +
          'chuỗi và so sánh theo bảng chữ cái.</p>' +
          '<p>Muốn ép về số, cộng 0: <code>($3+0) &gt;= 1000</code>. Muốn ép về chuỗi, nối chuỗi ' +
          'rỗng: <code>($3 "") == "1000"</code>. Nhớ mẹo này khi lọc phiên bản kernel hay địa ' +
          'chỉ IP.</p>' }
      ]},

      /* ---------- BƯỚC 7 ---------- */
      { title: 'Sản phẩm cuối chặng: một câu lệnh, một bảng thống kê', blocks: [
        { t: 'p', x:
          'Đây là mốc <b>M1</b> của lộ trình: <i>tìm mọi file <code>.c</code> chứa một chuỗi và ' +
          'thống kê kết quả</i>. Đừng viết cả câu một lần — hãy dựng từng tầng và nhìn kết quả ' +
          'sau mỗi tầng. Đó là cách người làm nghề viết đường ống.' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "echo '=== layer 1: which files contain the string'\n" +
          "grep -rl --include='*.c' 'gpio' project\n" +
          "echo '=== layer 2: count per file, drop zero'\n" +
          "grep -rc --include='*.c' 'gpio' project | awk -F: '$2 > 0'\n" +
          "echo '=== layer 3: rank by line count'\n" +
          "grep -rc --include='*.c' 'gpio' project | awk -F: '$2 > 0' | sort -t: -k2 -rn" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '=== layer 1: which files contain the string\n' +
          'project/src/main.c\n' +
          'project/drivers/gpio.c\n' +
          '=== layer 2: count per file, drop zero\n' +
          'project/src/main.c:4\n' +
          'project/drivers/gpio.c:5\n' +
          '=== layer 3: rank by line count\n' +
          'project/drivers/gpio.c:5\n' +
          'project/src/main.c:4' },
        { t: 'p', x:
          'Tầng cuối biến danh sách thành một bảng có tổng. Câu lệnh này viết trên nhiều dòng — ' +
          'bash cho phép xuống dòng ngay sau dấu <code>|</code>:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "grep -rc --include='*.c' 'gpio' project |\n" +
          "awk -F: '$2 > 0 { total += $2; n++; printf \"%-24s %3d\\n\", $1, $2 }\n" +
          "         END { printf \"%-24s %3d in %d files\\n\", \"TOTAL\", total, n }'" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'project/src/main.c         4\n' +
          'project/drivers/gpio.c     5\n' +
          'TOTAL                      9 in 2 files' },
        { t: 'p', x:
          'Và biến thể thực dụng hơn: gộp theo <b>thư mục</b>, để biết phân hệ nào của dự án ' +
          'đụng nhiều nhất tới chuỗi đang tìm.' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "grep -rc --include='*.c' 'gpio' project |\n" +
          "awk -F: '$2 > 0 { sub(/\\/[^\\/]+$/, \"\", $1); dir[$1] += $2 }\n" +
          "         END { for (d in dir) printf \"%-16s %3d\\n\", d, dir[d] }' | sort -k2 -rn" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'project/drivers    5\n' +
          'project/src        4' },
        { t: 'cmdx', cmd: 'sub(/\\/[^\\/]+$/, "", $1)', title: 'Cắt tên file để chỉ còn đường dẫn thư mục',
          rows: [
            ['<code>sub(mẫu, thay, biến)</code>', 'Hàm thay thế của awk, sửa <b>trực tiếp</b> vào biến', 'Có <code>gsub</code> nếu muốn thay mọi lần'],
            ['<code>/\\/[^\\/]+$/</code>', 'Dấu gạch chéo cuối cùng và mọi thứ sau nó', '<code>[^\\/]</code> là "ký tự không phải gạch chéo"'],
            ['<code>$</code>', 'Neo vào cuối chuỗi', 'Không có nó, mẫu sẽ khớp dấu gạch chéo đầu tiên và cắt sai'],
            ['<code>dir[$1] += $2</code>', 'Cộng dồn vào ô mang tên thư mục', 'Cùng một cơ chế mảng kết hợp của bước 6']
          ]},
        { t: 'p', x:
          'Bãi tập chỉ có ba file nên con số nhỏ. Hãy thả đúng câu lệnh đó lên quy mô thật — ' +
          '2062 file header của hệ thống:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "grep -rc --include='*.h' 'ioctl' /usr/include 2>/dev/null |\n" +
          "awk -F: '$2 > 0 { sub(/\\/[^\\/]+$/, \"\", $1); total[$1] += $2; nfiles[$1]++ }\n" +
          "         END { for (d in total) printf \"%6d  %3d file  %s\\n\", total[d], nfiles[d], d }' |\n" +
          'sort -rn | head -5' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '  1172  161 file  /usr/include/linux\n' +
          '   358   23 file  /usr/include/drm\n' +
          '    46    3 file  /usr/include/xen\n' +
          '    41    2 file  /usr/include/mtd\n' +
          '    32    4 file  /usr/include/misc' },
        { t: 'cal', kind: 'why', title: 'Bảng này vừa dạy bạn một điều về chính Linux', x:
          '<p><code>/usr/include/linux</code> chứa <b>1172</b> lần nhắc tới <code>ioctl</code> ' +
          'trải trên <b>161</b> file — bỏ xa mọi thư mục khác. Đó không phải ngẫu nhiên: ' +
          '<code>ioctl</code> là cửa chính để userspace ra lệnh cho driver, và thư mục ' +
          '<code>linux/</code> chính là bản hợp đồng giữa kernel và ứng dụng.</p>' +
          '<p>Bạn sẽ tự tay viết phía kernel của những lệnh này ở <b>Bài 53</b>, và gọi chúng ' +
          'từ phía userspace ở <b>Bài 19</b>. Câu lệnh bạn vừa gõ chính là cách người ta khảo ' +
          'sát một cây mã nguồn xa lạ trước khi động vào nó.</p>' },
        { t: 'p', x:
          'Bài tập cuối — và cũng là một cái bẫy. Đếm xem tên <code>struct</code> nào hay gặp ' +
          'nhất trong toàn bộ header hệ thống. Chạy cả ba câu và so sánh:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "echo '=== character class: lowercase only'\n" +
          "grep -rhoE --include='*.h' 'struct [a-z_]+' /usr/include 2>/dev/null | sort | uniq -c | sort -rn | head -3\n" +
          "echo '=== add digits'\n" +
          "grep -rhoE --include='*.h' 'struct [a-z0-9_]+' /usr/include 2>/dev/null | sort | uniq -c | sort -rn | head -3\n" +
          "echo '=== add uppercase too'\n" +
          "grep -rhoE --include='*.h' 'struct [A-Za-z0-9_]+' /usr/include 2>/dev/null | sort | uniq -c | sort -rn | head -3" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '=== character class: lowercase only\n' +
          '    863 struct _\n' +
          '    451 struct v\n' +
          '    245 struct rkisp\n' +
          '=== add digits\n' +
          '    863 struct _\n' +
          '    164 struct cec_msg\n' +
          '    122 struct timespec\n' +
          '=== add uppercase too\n' +
          '    164 struct cec_msg\n' +
          '    122 struct timespec\n' +
          '    118 struct in6_addr\n' },
        { t: 'cal', kind: 'danger', title: 'Ba câu, ba câu trả lời khác nhau, không câu nào báo lỗi', x:
          '<p>Câu <b>một</b> nói tên struct phổ biến nhất là <code>struct v</code> — vô nghĩa. ' +
          'Nó cắt <code>struct v4l2_format</code> ngay tại chữ số <code>4</code>, vì lớp ký tự ' +
          '<code>[a-z_]</code> không có chữ số.</p>' +
          '<p>Câu <b>hai</b> sửa được chữ số nhưng vẫn để lại <code>struct _</code> đứng đầu ' +
          'với 863 lần: nó cắt <code>struct _IO_FILE</code> tại chữ <code>I</code> hoa.</p>' +
          '<p>Chỉ câu <b>ba</b> cho câu trả lời thật: <code>struct cec_msg</code>, 164 lần.</p>' +
          '<p><b>Đây là bài học quan trọng nhất của cả Bài 11.</b> Một biểu thức chính quy sai ' +
          'không bao giờ báo lỗi — nó chỉ lặng lẽ trả về một con số trông rất hợp lý. Cách tự ' +
          'vệ duy nhất: <b>luôn nhìn vài dòng kết quả thô bằng mắt</b> trước khi tin vào bảng ' +
          'thống kê. Nếu câu một được đem đi báo cáo, sẽ không ai phát hiện ra cho tới lúc quá ' +
          'muộn.</p>' },
        { t: 'p', x: 'Dọn dẹp:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'cd ~\n' +
          'rm -rf ~/embedded/bai11\n' +
          'ls ~/embedded' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'bai03  bai04  bai05  bai19  bai24  images' }
      ]}
    ]},

    /* ══════════════════════════════════════════════
       9. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>find: paths must precede expression: `main.c\'</code>',
         'Quên nháy quanh mẫu, shell đã bung <code>*.c</code> thành danh sách file trước khi find nhìn thấy',
         'Luôn viết <code>-name \'*.c\'</code> trong nháy đơn'],
        ['<code>find: missing argument to `-exec\'</code>',
         'Dấu <code>+</code> không đứng ngay sau <code>{}</code>',
         'Phải là <code>-exec lenh {} +</code>. Với <code>\\;</code> thì <code>{}</code> đặt đâu cũng được'],
        ['<code>find project -size -1k</code> chỉ ra file rỗng, bỏ sót mọi file nhỏ',
         '<code>find</code> làm tròn <b>lên</b>: file 77 byte được tính là 1k',
         'Dùng đơn vị byte: <code>-size -1024c</code>'],
        ['<code>ls: cannot access \'trap/name\': No such file or directory</code>, mã thoát <b>123</b>',
         '<code>xargs</code> cắt theo khoảng trắng, tên file có dấu cách bị xé nhỏ',
         '<code>find … -print0 | xargs -0 …</code>, hoặc dùng <code>-exec … +</code>'],
        ['<code>grep \'6.18.33\'</code> khớp <b>3</b> dòng thay vì 1',
         'Dấu <code>.</code> trong regex nghĩa là "một ký tự bất kỳ"',
         'Thoát nó: <code>6\\.18\\.33</code>, hoặc tắt hẳn regex bằng <code>grep -F</code>'],
        ['<code>grep -E \'struct [a-z_]+\'</code> cho ra <code>struct v</code> đứng đầu bảng',
         'Lớp ký tự thiếu chữ số và chữ hoa nên tên bị cắt giữa chừng',
         'Kiểm tra vài dòng kết quả thô trước khi thống kê; dùng <code>[A-Za-z0-9_]+</code>'],
        ['<code>grep \'o+\'</code> không khớp <code>oo</code>',
         'Mặc định grep dùng BRE, ở đó dấu <code>+</code> là ký tự thường',
         'Thêm <code>-E</code>, hoặc viết <code>o\\+</code>'],
        ['<code>grep -c</code> in ra cả những file có số <b>0</b>',
         'Đúng thiết kế: <code>-c</code> báo cáo mọi file đã xét',
         'Lọc bằng <code>awk -F: \'$2 &gt; 0\'</code>'],
        ['<code>grep -q chuoi file; echo $?</code> ra <b>1</b> nhưng bạn tưởng là lỗi',
         'rc=1 nghĩa là "không tìm thấy" — một câu trả lời, không phải thất bại. rc=2 mới là lỗi',
         'Trong script, phân biệt rõ: <code>if grep -q …</code> chỉ hỏi có hay không'],
        ['<code>sed: -e expression #1, char 8: unknown option to `s\'</code>',
         'Mẫu chứa dấu <code>/</code> trong khi dấu phân cách cũng là <code>/</code>',
         'Đổi dấu phân cách: <code>s|/dev/x|/dev/y|</code>'],
        ['<code>sed -i</code> chạy xong và file hỏng, không có bản lưu',
         '<code>-i</code> ghi đè trực tiếp, không hỏi lại, không hoàn tác được',
         'Luôn chạy thử không có <code>-i</code> trước, rồi dùng <code>-i.bak</code>'],
        ['<code>sed \'s/-/+/\'</code> chỉ đổi được dấu gạch đầu tiên của mỗi dòng',
         'Thiếu cờ <code>g</code>',
         '<code>s/-/+/g</code>'],
        ['<code>uniq -c</code> cho cùng một giá trị xuất hiện ở nhiều dòng khác nhau',
         '<code>uniq</code> chỉ gộp các dòng giống nhau <b>nằm cạnh nhau</b>',
         'Luôn <code>sort</code> trước: <code>| sort | uniq -c | sort -rn</code>'],
        ['<code>sort</code> xếp <code>10</code> đứng trước <code>2</code>',
         'Mặc định sort so sánh theo <b>chuỗi</b>, không theo số',
         'Thêm <code>-n</code>, hoặc <code>-h</code> nếu dữ liệu có hậu tố K M G'],
        ['<code>cut -d\' \' -f2</code> in ra chuỗi rỗng trên đầu ra của <code>ls -l</code>',
         '<code>cut</code> coi mỗi dấu cách là một ranh giới cột',
         'Dùng <code>awk \'{print $2}\'</code>, hoặc bóp khoảng trắng: <code>tr -s \' \' | cut …</code>'],
        ['<code>awk: cmd. line:1: {print $1} — bash: $1: unbound variable</code> hoặc chương trình awk rỗng',
         'Viết chương trình awk trong nháy <b>kép</b> nên bash thay <code>$1</code> trước',
         'Chương trình awk luôn nằm trong nháy <b>đơn</b>']
      ]},

    /* ══════════════════════════════════════════════
       10. RECAP
       ══════════════════════════════════════════════ */
    { t: 'recap', title: 'Tóm tắt Bài 11', items: [
      'Năm công cụ, mỗi cái một đơn vị làm việc: <b>find</b> lọc file, <b>grep</b> lọc dòng, <b>sed</b> sửa dòng, <b>awk</b> tính theo cột, <b>xargs</b> biến dòng chảy thành tham số.',
      '<code>find</code> đọc theo ba phần: <b>tìm ở đâu — điều kiện gì — làm gì</b>. Nhiều điều kiện viết cạnh nhau nghĩa là <b>VÀ</b>; muốn HOẶC phải viết <code>-o</code> và bọc trong <code>\\( \\)</code>.',
      '<code>-size</code> có đơn vị k, M thì <b>làm tròn lên</b>. Đo chính xác phải dùng hậu tố <code>c</code>: <code>-size -1024c</code>.',
      '<code>-exec … \\;</code> gọi lệnh <b>một lần cho mỗi file</b>; <code>-exec … +</code> gom lại gọi <b>một lần</b>. Đo trên 2062 file: <b>2,607 s</b> so với <b>0,029 s</b> — chênh khoảng <b>90 lần</b>, và toàn bộ chênh lệch là chi phí fork+exec của Bài 9.',
      '<code>find -print0 | xargs -0</code> là cách viết an toàn duy nhất khi tên file có dấu cách. Không có nó, một tên file bị xé thành bốn tham số và <code>xargs</code> trả về mã thoát <b>123</b>.',
      '<b>BRE</b> (mặc định) coi <code>+ ? { } ( ) |</code> là ký tự thường; <b>ERE</b> (<code>-E</code>) coi chúng là toán tử. Lời khuyên: luôn viết <code>grep -E</code> và <code>sed -E</code>.',
      'Dấu <code>.</code> chưa thoát khớp <b>mọi</b> ký tự: <code>grep \'6.18.33\'</code> khớp 3 dòng, <code>grep \'6\\.18\\.33\'</code> khớp đúng 1.',
      'Mã thoát của <code>grep</code> là một câu trả lời: <b>0</b> có, <b>1</b> không, <b>2</b> mới là lỗi thật. Bài 13 sẽ dùng nó trong <code>if grep -q</code>.',
      '<code>grep -r</code> <b>không</b> đi theo symlink, <code>find</code> thì có. Trên <code>/usr/include</code> chênh đúng <b>4</b> file. Khi hai công cụ cho hai con số, hãy tìm nguyên nhân chứ đừng chọn con số đẹp hơn.',
      '<code>sed</code> mặc định <b>không đụng vào file</b> — nó in ra stdout. Cờ <code>-i</code> ghi đè và không có đường lui, nên luôn dùng <code>-i.bak</code>.',
      'Dấu phân cách của <code>s</code> đổi được: dùng <code>s|…|…|</code> khi mẫu chứa đường dẫn. Nhóm bắt <code>(…)</code> gọi lại bằng <code>\\1 \\2</code>.',
      '<code>awk</code> tự cắt dòng thành <code>$1 $2 …</code>; <code>$NF</code> là cột cuối, <code>NR</code> là số thứ tự dòng. Log thật có số cột không đều — dùng <code>$NF</code>, đừng đếm tay.',
      'Mảng kết hợp <code>{count[$3]++} END {for (k in count) …}</code> là ba dòng thay cho hai mươi dòng C. Thứ tự duyệt <b>không xác định</b>, phải nối <code>| sort</code>.',
      '<code>cut</code> cho file có dấu phân cách cố định, <code>awk</code> cho bảng căn cột bằng khoảng trắng. Công thức thống kê phải thuộc: <code>| sort | uniq -c | sort -rn</code>.',
      '<b>Một biểu thức chính quy sai không bao giờ báo lỗi.</b> Ba lớp ký tự khác nhau cho ba câu trả lời khác nhau về cùng một câu hỏi — chỉ câu thứ ba đúng. Luôn nhìn kết quả thô trước khi tin bảng thống kê.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo', x:
      '<p>Bạn vừa tra hỏi được cây mã nguồn. Nhưng mã nguồn đó từ đâu tới, và các công cụ bạn ' +
      'đang dùng — <code>grep</code>, <code>sed</code>, <code>gcc</code> — được cài vào máy ' +
      'bằng cách nào?</p>' +
      '<p><b>Bài 12 — Quản lý gói</b> mở nắp <code>apt</code> ra xem bên trong: một gói ' +
      '<code>.deb</code> thật ra chứa gì, <code>dpkg</code> ghi sổ ở đâu, vì sao phải có khoá ' +
      'GPG, và điều gì xảy ra khi cây phụ thuộc gãy. Bạn sẽ tự tay tháo tung một gói ' +
      '<code>.deb</code> ra thành các file thành phần, tra ngược từ một file bất kỳ trên đĩa ' +
      'về gói đã cài nó, và đo xem toàn bộ cross-toolchain ARM64 trên máy này chiếm bao nhiêu ' +
      'megabyte.</p>' },

    { t: 'hr' }
  ],

  quiz: [
    {
      q: 'Bạn chạy <code>find src -type f -size -1k</code> trên thư mục có bảy file từ 77 đến 198 byte, và không file nào hiện ra. Vì sao?',
      opts: [
        'Vì <code>-size</code> chỉ hoạt động với thư mục, không hoạt động với file',
        'Vì find làm tròn <b>lên</b>: file 77 byte được tính là 1k, mà "nhỏ hơn 1k" nghĩa là 0k',
        'Vì thiếu dấu nháy quanh tham số <code>-1k</code>',
        'Vì phải viết <code>-size &lt;1k</code> mới đúng cú pháp'
      ],
      a: 1,
      why: 'Khi dùng đơn vị k hoặc M, <code>find</code> làm tròn kích thước <b>lên</b> bội số gần nhất trước khi so sánh. Mọi file từ 1 đến 1024 byte đều thành 1k, nên điều kiện "nhỏ hơn 1k" chỉ đúng với file <b>0 byte</b>. Đây là loại lỗi nguy hiểm vì không có thông báo nào — bạn chỉ nhận một danh sách rỗng trông rất bình thường. Muốn so sánh chính xác, dùng hậu tố byte: <code>-size -1024c</code>.'
    },
    {
      q: 'Trên 2062 file header, <code>-exec grep -l ioctl {} \\;</code> mất 2,607 giây còn <code>-exec grep -l ioctl {} +</code> chỉ mất 0,029 giây. Hai giây rưỡi đó bị tiêu vào đâu?',
      opts: [
        'Vào việc đọc đĩa, vì dấu <code>\\;</code> khiến find đọc mỗi file hai lần',
        'Vào chi phí tạo 2062 tiến trình grep thay vì một tiến trình duy nhất',
        'Vào việc find phải sắp xếp lại danh sách file trước mỗi lần gọi',
        'Vào bộ nhớ đệm của kernel, vì dấu <code>+</code> dùng cache còn <code>\\;</code> thì không'
      ],
      a: 1,
      why: 'Mỗi lần <code>fork</code> + <code>exec</code> buộc kernel cấp một không gian địa chỉ mới, nạp file nhị phân <code>grep</code>, nối lại thư viện động rồi dọn dẹp khi tiến trình chết — đúng cơ chế bạn đã học ở Bài 9. Làm việc đó 2062 lần thay vì 1 lần chính là toàn bộ khoảng chênh. Bằng chứng nhìn thấy được: <code>-exec echo {} \\;</code> in ra ba dòng riêng biệt, còn <code>-exec echo {} +</code> in một dòng chứa cả ba tên. Bộ nhớ đệm có ảnh hưởng, nhưng chỉ làm lần đo đầu tiên chậm hơn, không giải thích được tỉ lệ 90 lần lặp lại ở mọi lần đo.'
    },
    {
      q: 'Bạn đếm tên <code>struct</code> phổ biến nhất trong header hệ thống bằng <code>grep -rhoE \'struct [a-z_]+\'</code> và kết quả đứng đầu là <code>struct v</code> với 451 lần. Chẩn đoán đúng nhất là gì?',
      opts: [
        'Đúng rồi, thư viện video định nghĩa nhiều struct tên ngắn',
        'Lớp ký tự thiếu chữ số nên tên bị cắt: <code>struct v4l2_format</code> chỉ khớp tới chữ v',
        'Cờ <code>-h</code> đã làm mất tên file nên kết quả bị gộp sai',
        'Phải dùng <code>-w</code> thì mới đếm đúng trọn từ'
      ],
      a: 1,
      why: 'Một tên như <code>struct v4l2_format</code> chứa chữ số, mà lớp <code>[a-z_]</code> chỉ nhận chữ thường và gạch dưới, nên phần khớp dừng ngay tại chữ số 4 và để lại <code>struct v</code>. Thêm chữ số vào lớp vẫn chưa đủ — <code>struct _IO_FILE</code> sẽ bị cắt tại chữ I hoa, cho ra 863 lần <code>struct _</code>. Chỉ <code>[A-Za-z0-9_]+</code> mới cho câu trả lời thật là <code>struct cec_msg</code>. Bài học tổng quát: <b>regex sai không bao giờ báo lỗi</b>, nó chỉ trả về một con số trông hợp lý, nên luôn phải nhìn vài dòng kết quả thô trước khi tin bảng thống kê.'
    },
    {
      q: 'Câu nào <b>không</b> an toàn khi thư mục có file tên <code>bao cao thang 8.c</code>?',
      opts: [
        '<code>find . -name \'*.c\' -exec wc -l {} +</code>',
        '<code>find . -name \'*.c\' -print0 | xargs -0 wc -l</code>',
        '<code>find . -name \'*.c\' | xargs wc -l</code>',
        '<code>grep -rc --include=\'*.c\' gpio .</code>'
      ],
      a: 2,
      why: '<code>xargs</code> mặc định cắt dòng vào theo <b>khoảng trắng</b>, nên tên file trên bị xé thành bốn tham số riêng và <code>wc</code> báo bốn lỗi không tìm thấy file, mã thoát 123. Ba cách còn lại đều an toàn vì không đi qua khâu tách theo khoảng trắng: <code>-exec … +</code> truyền tên file trực tiếp cho lệnh con, <code>-print0 | xargs -0</code> đổi ký tự phân cách sang byte 0 — ký tự duy nhất không thể xuất hiện trong tên file Linux — còn <code>grep -r</code> tự duyệt cây, không qua shell.'
    },
    {
      q: 'Bạn cần lấy cột thứ hai từ đầu ra của <code>ls -l</code>. Cách nào cho kết quả đúng?',
      opts: [
        '<code>ls -l | cut -d\' \' -f2</code>',
        '<code>ls -l | awk \'{print $2}\'</code>',
        '<code>ls -l | cut -c2</code>',
        '<code>ls -l | sed -n \'2p\'</code>'
      ],
      a: 1,
      why: '<code>ls -l</code> căn cột bằng <b>nhiều</b> dấu cách liên tiếp. <code>cut</code> coi <b>mỗi</b> dấu cách là một ranh giới cột nên cột 2 của nó thường rơi vào khoảng trống và in ra chuỗi rỗng. <code>awk</code> coi cả một chuỗi khoảng trắng liên tiếp là <b>một</b> dấu phân cách, đúng thứ bạn cần. Đáp án C lấy ký tự thứ hai chứ không phải cột, còn D in dòng thứ hai của cả bảng. Muốn cứu <code>cut</code> thì bóp khoảng trắng trước: <code>tr -s \' \' | cut -d\' \' -f2</code>. Quy tắc: dấu phân cách cố định như <code>/etc/passwd</code> thì dùng <code>cut -d:</code>, bảng căn cột thì dùng <code>awk</code>.'
    },
    {
      q: 'Script của bạn có dòng <code>if grep -q PANIC boot.log; then …</code>. Đồng nghiệp sửa thành <code>if grep PANIC boot.log &gt; /dev/null; then …</code> và nói hai cách như nhau. Nhận xét nào đúng nhất?',
      opts: [
        'Sai hoàn toàn, chuyển hướng vào /dev/null làm mã thoát luôn bằng 0',
        'Kết quả logic giống nhau, nhưng <code>-q</code> dừng ngay khi gặp dòng khớp đầu tiên nên nhanh hơn trên file lớn',
        'Hai cách khác nhau vì <code>-q</code> trả về 0 khi không tìm thấy',
        'Cách của đồng nghiệp đúng hơn vì <code>-q</code> chỉ dùng được với <code>-r</code>'
      ],
      a: 1,
      why: 'Cả hai đều dựa vào cùng một mã thoát: 0 khi có dòng khớp, 1 khi không, 2 khi lỗi thật sự — chuyển hướng stdout không đụng gì tới mã thoát. Khác biệt nằm ở hiệu năng: <code>-q</code> báo cho grep biết người gọi chỉ cần câu trả lời có/không, nên nó <b>thoát ngay</b> tại dòng khớp đầu tiên thay vì quét hết file. Trên một file log khởi động vài trăm megabyte, khác biệt đó là thật. Đây cũng là mẫu câu bạn sẽ viết liên tục ở Bài 13.'
    }
  ]
});

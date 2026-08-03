/* ═══════════════════════════════════════════════════════════════
   BÀI 13 — Bash script
   Chặng 01 · Linux căn bản
   ═══════════════════════════════════════════════════════════════ */

Lesson.register({
  id: 'bai-13',
  title: 'Bash script',
  minutes: 55,
  practice: 'Thực hành 35 phút',
  level: 'Người mới bắt đầu',

  intro:
    'Từ Bài 4 tới Bài 12 bạn đã gõ hàng trăm câu lệnh. Bài này dạy bạn <b>cất chúng vào một ' +
    'file</b> để không phải gõ lại lần thứ hai — và quan trọng hơn, để chúng chạy đúng ngay cả ' +
    'khi bạn không ngồi trước màn hình. Đó là toàn bộ ý nghĩa của một script. Nhưng script cũng ' +
    'là nơi những lỗi tốn kém nhất sinh ra: bạn sẽ thấy tận mắt một biến rỗng biến ' +
    '<code>rm -rf $thumuc/</code> thành <code>rm -rf /</code>, và một dấu nháy kép làm tan biến ' +
    'nguy cơ đó. Đây là bài cuối của Chặng 01. Sau bài này bạn không còn chỉ <i>dùng</i> ' +
    'Linux — bạn <b>lập trình</b> nó. Mọi hệ thống nhúng bạn gặp sau này đều khởi động bằng ' +
    'script, build bằng script, và kiểm thử bằng script.',

  goals: [
    'Viết một script có shebang, cấp quyền thực thi và chạy được bằng <code>./tenscript.sh</code>',
    'Giải thích chính xác vì sao <code>"$x"</code> an toàn còn <code>$x</code> thì không',
    'Dùng mã trả về <code>$?</code> để phân biệt "chạy sai" với "chạy đúng nhưng không tìm thấy"',
    'Viết hàm nhận tham số, dùng <code>local</code>, và trả về mã trạng thái bằng <code>return</code>',
    'Giải thích tác dụng của từng công tắc trong <code>set -euo pipefail</code>',
    'Dùng <code>trap</code> để dọn dẹp thư mục tạm kể cả khi script thất bại giữa chừng',
    'Viết trọn một script tự động biên dịch chương trình C cho ARM64'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. SHEBANG
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Từ dòng lệnh tới file: shebang và quyền thực thi' },

    { t: 'p', x:
      'Một script chỉ là <b>một file văn bản chứa các câu lệnh</b>, đúng những câu lệnh bạn vẫn ' +
      'gõ. Không có cú pháp bí ẩn nào cả. Nhưng để hệ điều hành chịu chạy nó, cần hai thứ: ' +
      '<b>dòng shebang</b> ở đầu file và <b>bit thực thi</b> trong quyền của file.' },

    { t: 'fig',
      cap: 'Kernel đọc hai byte đầu tiên của file. Thấy #! nó lấy phần còn lại của dòng làm tên chương trình thông dịch và gọi chương trình đó với file làm tham số.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Sơ đồ kernel đọc shebang và gọi trình thông dịch">' +
        '<rect class="d-box" x="20" y="20" width="200" height="60" rx="6"/>' +
        '<text class="d-t" x="120" y="44" text-anchor="middle">BAN GÕ</text>' +
        '<text class="d-tm" x="120" y="64" text-anchor="middle">./build.sh arm64</text>' +

        '<rect class="d-box-p" x="270" y="20" width="200" height="60" rx="6"/>' +
        '<text class="d-t" x="370" y="44" text-anchor="middle">KERNEL</text>' +
        '<text class="d-ts" x="370" y="64" text-anchor="middle">doc 2 byte dau file</text>' +
        '<line class="d-line" x1="220" y1="50" x2="264" y2="50"/>' +
        '<path class="d-arrow" d="M264 50 l-8 -4 v8 z"/>' +

        '<rect class="d-box-g" x="520" y="20" width="180" height="60" rx="6"/>' +
        '<text class="d-tm" x="610" y="44" text-anchor="middle">#!</text>' +
        '<text class="d-ts" x="610" y="64" text-anchor="middle">0x23 0x21</text>' +
        '<line class="d-line" x1="470" y1="50" x2="514" y2="50"/>' +
        '<path class="d-arrow" d="M514 50 l-8 -4 v8 z"/>' +

        '<rect class="d-box-a" x="20" y="110" width="680" height="44" rx="6"/>' +
        '<text class="d-tm" x="34" y="128">#!/bin/bash</text>' +
        '<text class="d-ts" x="34" y="146">dong dau tien cua file — phan sau #! la duong dan tuyet doi toi chuong trinh thong dich</text>' +

        '<rect class="d-box-p" x="20" y="180" width="680" height="52" rx="6"/>' +
        '<text class="d-t" x="34" y="200">Ket qua: kernel khong chay file .sh, no chay lenh sau day</text>' +
        '<text class="d-tm" x="34" y="222">/bin/bash ./build.sh arm64</text>' +
        '</svg>' },

    { t: 'table',
      head: ['Cách chạy', 'Cần shebang?', 'Cần <code>chmod +x</code>?', 'Khi nào dùng'],
      rows: [
        ['<code>./build.sh</code>', '<b>Có</b>', '<b>Có</b>', 'Cách chuẩn. Script trở thành một lệnh thật sự'],
        ['<code>bash build.sh</code>', 'Không', 'Không', 'Chạy nhanh khi đang thử nghiệm'],
        ['<code>source build.sh</code><br><code>. build.sh</code>', 'Không', 'Không', 'Chạy <b>trong shell hiện tại</b>, không sinh tiến trình con. Dùng để nạp biến môi trường'],
        ['<code>bash -n build.sh</code>', 'Không', 'Không', '<b>Chỉ kiểm tra cú pháp</b>, không chạy gì'],
        ['<code>bash -x build.sh</code>', 'Không', 'Không', 'Chạy và in ra <b>từng lệnh</b> trước khi thực hiện — công cụ gỡ lỗi số một']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao script nào cũng nên có shebang, kể cả khi bạn định chạy bằng bash', x:
      '<p>Không có shebang, script vẫn chạy — nhưng chạy bằng <b>shell nào là chuyện may rủi</b>. ' +
      'Ai đó chạy nó bằng <code>sh</code> thay vì <code>bash</code> là mọi cú pháp riêng của ' +
      'bash sẽ hỏng.</p>' +
      '<p>Trên máy này <code>/bin/sh</code> là một liên kết trỏ tới <code>dash</code> — một ' +
      'shell khác, nhỏ hơn, nhanh hơn, và <b>không hiểu</b> <code>[[ ]]</code>, mảng, hay ' +
      '<code>${bien^^}</code>. Bạn sẽ tự tay kiểm chứng điều đó ở bước 1.</p>' +
      '<p>Trong nhúng, chuyện này càng gay gắt: BusyBox trên thiết bị chỉ cung cấp một shell ' +
      'tối giản kiểu <code>ash</code>. Một script viết bằng cú pháp bash sẽ chạy hoàn hảo trên ' +
      'máy bạn và chết trên thiết bị. Shebang khai báo rõ ràng yêu cầu, và lỗi hiện ra ngay ' +
      'dòng đầu chứ không phải ở dòng thứ 200.</p>' },

    { t: 'terms', items: [
      ['shebang', '#!', 'Hai ký tự đầu file, cho kernel biết dùng chương trình nào để thông dịch phần còn lại. Đọc là "sha-bang"'],
      ['bit thực thi', 'x', 'Quyền <code>x</code> trong <code>rwxr-xr-x</code>. Thiếu nó, kernel từ chối chạy — mã trả về <b>126</b>'],
      ['bash', '', 'Bourne-Again SHell. Shell mặc định của Ubuntu, giàu tính năng. Trên máy này là bản <b>5.3.9</b>'],
      ['dash', '', 'Debian Almquist Shell. Nhỏ, nhanh, chỉ theo chuẩn POSIX. Là <code>/bin/sh</code> trên Ubuntu'],
      ['POSIX', '', 'Chuẩn chung cho các hệ Unix. Script "POSIX thuần" chạy được trên mọi shell, kể cả BusyBox trên thiết bị nhúng'],
      ['tiến trình con', 'subshell', 'Script chạy bằng <code>./</code> hay <code>bash</code> tạo ra một tiến trình mới. Biến đặt trong đó <b>không</b> ảnh hưởng shell cha']
    ]},

    /* ══════════════════════════════════════════════
       2. BIẾN VÀ DẤU NHÁY
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Biến và dấu nháy — nơi 90 % lỗi script sinh ra' },

    { t: 'p', x:
      'Gán biến trong bash trông đơn giản tới mức lừa người: <code>ten="linux"</code>. Nhưng ' +
      '<b>không được có khoảng trắng quanh dấu bằng</b>, và mỗi lần dùng lại biến bạn phải ' +
      'quyết định có bọc dấu nháy hay không. Quyết định sai chỗ đó là nguyên nhân của gần như ' +
      'mọi thảm hoạ script.' },

    { t: 'table',
      head: ['Viết', 'Bash hiểu là', 'Kết quả'],
      rows: [
        ['<code>ten="linux"</code>', 'Gán chuỗi <code>linux</code> cho biến <code>ten</code>', 'Đúng'],
        ['<code>ten = "linux"</code>', 'Chạy <b>lệnh</b> tên <code>ten</code> với hai tham số <code>=</code> và <code>linux</code>', '<code>ten: command not found</code>, mã <b>127</b>'],
        ['<code>ten =" linux"</code>', 'Vẫn là lời gọi lệnh <code>ten</code>', 'Cùng lỗi trên'],
        ['<code>$ten</code>', 'Lấy giá trị, <b>rồi tách theo khoảng trắng và bung ký tự đại diện</b>', 'Nguy hiểm nếu giá trị có khoảng trắng hoặc <code>*</code>'],
        ['<code>"$ten"</code>', 'Lấy giá trị, giữ nguyên thành <b>một chuỗi duy nhất</b>', '<b>An toàn. Đây là mặc định bạn nên dùng</b>'],
        ['<code>\'$ten\'</code>', 'Không thay thế gì cả', 'In ra đúng bốn ký tự <code>$ten</code>']
      ]},

    { t: 'fig',
      cap: 'Cùng một biến, hai cách viết, hai số phận. Dấu nháy kép chặn bước tách từ và bung ký tự đại diện — hai bước xảy ra sau khi biến đã được thay thế.',
      svg:
        '<svg viewBox="0 0 720 296" width="720" role="img" aria-label="So sánh biến có nháy kép và không có nháy kép">' +
        '<rect class="d-box" x="20" y="18" width="680" height="34" rx="4"/>' +
        '<text class="d-tm" x="34" y="40">f="thumuc/ten co khoang trang.txt"</text>' +

        '<rect class="d-box-w" x="20" y="70" width="330" height="112" rx="6"/>' +
        '<text class="d-tm" x="36" y="92">ls -l $f</text>' +
        '<text class="d-ts" x="36" y="112">bash thay the -&gt; roi TACH theo khoang trang</text>' +
        '<text class="d-tm" x="36" y="132">ls -l thumuc/ten co khoang trang.txt</text>' +
        '<text class="d-ts" x="36" y="152">= 4 tham so rieng biet</text>' +
        '<text class="d-t" x="36" y="172">4 loi "No such file". Ma tra ve 2</text>' +

        '<rect class="d-box-g" x="370" y="70" width="330" height="112" rx="6"/>' +
        '<text class="d-tm" x="386" y="92">ls -l "$f"</text>' +
        '<text class="d-ts" x="386" y="112">bash thay the -&gt; KHONG tach</text>' +
        '<text class="d-tm" x="386" y="132">ls -l \'thumuc/ten co khoang trang.txt\'</text>' +
        '<text class="d-ts" x="386" y="152">= 1 tham so duy nhat</text>' +
        '<text class="d-t" x="386" y="172">Chay dung. Ma tra ve 0</text>' +

        '<rect class="d-box" x="20" y="200" width="680" height="34" rx="4"/>' +
        '<text class="d-tm" x="34" y="222">duong=""      # bien rong, vi du do doc file cau hinh that bai</text>' +

        '<rect class="d-box-w" x="20" y="248" width="330" height="34" rx="6"/>' +
        '<text class="d-tm" x="36" y="270">rm -rf $duong/   →   rm -rf /</text>' +

        '<rect class="d-box-g" x="370" y="248" width="330" height="34" rx="6"/>' +
        '<text class="d-tm" x="386" y="270">rm -rf "$duong/" →   rm -rf ""</text>' +
        '</svg>' },

    { t: 'cal', kind: 'danger', title: 'Đây là cách người ta xoá nhầm cả máy chủ, và nó đã xảy ra nhiều lần', x:
      '<p>Kịch bản: script đọc đường dẫn từ file cấu hình vào biến <code>$duong</code>. Một ' +
      'ngày file cấu hình bị thiếu dòng đó, biến thành rỗng. Dòng ' +
      '<code>rm -rf $duong/build</code> lúc này bash nhìn thành <code>rm -rf /build</code> — ' +
      'và nếu là <code>rm -rf $duong/</code> thì thành <b><code>rm -rf /</code></b>.</p>' +
      '<p>Với dấu nháy, <code>rm -rf "$duong/"</code> trở thành <code>rm -rf "/"</code>… vẫn ' +
      'nguy hiểm. Vì thế quy tắc thật sự an toàn gồm <b>ba</b> lớp:</p>' +
      '<p><b>1.</b> Luôn bọc <code>"$bien"</code>.<br>' +
      '<b>2.</b> Bật <code>set -u</code> để script <b>chết ngay</b> khi gặp biến chưa đặt.<br>' +
      '<b>3.</b> Kiểm tra trước khi xoá: <code>[ -n "$duong" ] || exit 1</code>.</p>' +
      '<p>Ba lớp này rẻ tới mức không có lý do gì để bỏ qua. Bạn sẽ dùng cả ba trong script ở ' +
      'phần thực hành.</p>' },

    { t: 'terms', items: [
      ['tách từ', 'word splitting', 'Sau khi thay giá trị biến, bash cắt kết quả tại mỗi khoảng trắng thành nhiều tham số. <b>Nháy kép chặn bước này</b>'],
      ['bung ký tự đại diện', 'globbing', 'Nếu giá trị chứa <code>*</code> hay <code>?</code>, bash thay nó bằng danh sách file khớp. Nháy kép cũng chặn bước này'],
      ['<code>${x:-mặc định}</code>', '', 'Dùng giá trị mặc định khi <code>x</code> chưa đặt hoặc rỗng. Cách chuẩn để xử lý tham số tuỳ chọn'],
      ['<code>${#x}</code>', '', 'Độ dài chuỗi. Với mảng thì là số phần tử'],
      ['<code>${x^^}</code>', '', 'Chuyển hết sang chữ hoa. <b>Cú pháp riêng của bash</b>, dash không hiểu'],
      ['<code>export</code>', '', 'Đưa biến sang <b>biến môi trường</b> để tiến trình con nhìn thấy. Không export thì biến chỉ sống trong script hiện tại']
    ]},

    /* ══════════════════════════════════════════════
       3. MÃ TRẢ VỀ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Mã trả về: ngôn ngữ mà các chương trình dùng để nói chuyện' },

    { t: 'p', x:
      'Mỗi lệnh kết thúc đều để lại một số nguyên từ 0 đến 255. Bạn đọc nó bằng ' +
      '<code>$?</code>. Số đó — chứ không phải chữ trên màn hình — mới là cách script biết ' +
      'chuyện gì vừa xảy ra. Bạn đã gặp nó nhiều lần rồi: mã <b>127</b> khi ' +
      '<code>gpiodetect</code> thiếu thư viện ở Bài 12, mã <b>1</b> khi <code>grep</code> ' +
      'không tìm thấy gì ở Bài 11.' },

    { t: 'table',
      head: ['Mã', 'Ý nghĩa quy ước', 'Ví dụ đã gặp'],
      rows: [
        ['<b>0</b>', '<b>Thành công.</b> Chỉ duy nhất số 0 nghĩa là đúng', '<code>grep</code> tìm thấy · <code>apt-get check</code> sạch'],
        ['<b>1</b>', 'Thất bại chung, hoặc "chạy đúng nhưng không có kết quả"', '<code>grep</code> không tìm thấy dòng nào'],
        ['<b>2</b>', 'Dùng sai cú pháp hoặc lỗi hệ thống file', '<code>ls</code> một đường dẫn không tồn tại'],
        ['<b>100</b>', 'Riêng apt: có vấn đề về gói', '<code>apt-get check</code> khi cây phụ thuộc gãy'],
        ['<b>126</b>', 'Tìm thấy file nhưng <b>không chạy được</b>', 'Quên <code>chmod +x</code> · shebang trỏ sai · file có ký tự CRLF'],
        ['<b>127</b>', '<b>Không tìm thấy lệnh</b>, hoặc thiếu thư viện chia sẻ', '<code>gpiodetect</code> thiếu <code>libgpiod.so.3</code>'],
        ['<b>130</b>', 'Bị người dùng ngắt bằng <kbd>Ctrl</kbd>+<kbd>C</kbd>', '128 + 2, với 2 là số hiệu tín hiệu SIGINT']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao thành công là 0 chứ không phải 1', x:
      '<p>Có <b>một</b> cách để đúng, nhưng <b>rất nhiều</b> cách để sai. Quy ước 0 = thành ' +
      'công giải phóng 255 giá trị còn lại để mỗi chương trình mô tả chi tiết kiểu thất bại của ' +
      'nó.</p>' +
      '<p>Hệ quả trực tiếp lên cú pháp: <code>if lenh; then …</code> chạy nhánh <code>then</code> ' +
      'khi mã trả về là <b>0</b>. Nói cách khác, <code>if</code> trong bash <b>không kiểm tra ' +
      'đúng/sai, nó kiểm tra thành công/thất bại</b>. Hiểu điều này là hiểu vì sao ' +
      '<code>if grep -q root /etc/passwd</code> đọc lên nghe rất tự nhiên mà không cần dấu ngoặc ' +
      'nào.</p>' +
      '<p>Đây cũng là nền tảng cho <code>&amp;&amp;</code> ("chạy tiếp nếu thành công") và ' +
      '<code>||</code> ("chạy tiếp nếu thất bại") mà bạn đã gặp từ Bài 4.</p>' },

    { t: 'cal', kind: 'warn', title: 'Đọc $? ngay lập tức, hoặc mất nó', x:
      '<p><code>$?</code> chỉ giữ mã của lệnh <b>vừa chạy xong</b>. Chỉ cần một lệnh ' +
      '<code>echo</code> xen vào là giá trị cũ biến mất — vì chính <code>echo</code> cũng ghi ' +
      'mã của nó lên đó.</p>' +
      '<p>Muốn dùng lại về sau thì lưu ngay: <code>ma=$?</code> ở dòng liền kề. Đây là lỗi mà ' +
      'hầu như ai cũng mắc đúng một lần, thường vào lúc đang debug một script dài.</p>' },

    /* ══════════════════════════════════════════════
       4. RẼ NHÁNH VÀ VÒNG LẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Rẽ nhánh và vòng lặp' },

    { t: 'p', x:
      'Một chi tiết gây bất ngờ cho mọi người đến từ ngôn ngữ khác: <b><code>[</code> không ' +
      'phải cú pháp, nó là một lệnh</b>. Có hẳn một file <code>/usr/bin/[</code> trên đĩa. Vì ' +
      'thế mới phải có khoảng trắng quanh nó — như quanh mọi tên lệnh khác — và ' +
      '<code>[$x = 1]</code> sẽ báo <code>command not found</code>.' },

    { t: 'table',
      head: ['Dạng', 'Là gì', 'Nên dùng khi'],
      rows: [
        ['<code>[ … ]</code>', 'Một <b>lệnh</b>, tương đương <code>test</code>. Có trong mọi shell', 'Cần script chạy được cả trên dash và BusyBox'],
        ['<code>[[ … ]]</code>', '<b>Từ khoá</b> của bash. Không tách từ, không bung ký tự đại diện', 'Chắc chắn chạy bằng bash. An toàn hơn, hỗ trợ <code>=~</code> khớp regex'],
        ['<code>(( … ))</code>', 'Ngữ cảnh <b>số học</b>', 'So sánh và tính toán số'],
        ['<code>$(( … ))</code>', 'Tính toán rồi <b>trả về giá trị</b>', '<code>i=$((i + 1))</code>']
      ]},

    { t: 'table',
      head: ['Phép kiểm tra', 'Ý nghĩa', 'Bẫy'],
      rows: [
        ['<code>-f <i>file</i></code>', 'Tồn tại và là file thường', ''],
        ['<code>-d <i>duong</i></code>', 'Tồn tại và là thư mục', ''],
        ['<code>-e <i>duong</i></code>', 'Tồn tại, bất kể loại gì', 'Dùng khi không quan tâm file hay thư mục'],
        ['<code>-x <i>file</i></code>', 'Có quyền thực thi', 'Kiểm tra trước khi gọi một script khác'],
        ['<code>-z "$x"</code>', 'Chuỗi <b>rỗng</b>', '<b>Luôn</b> bọc nháy, nếu không biến rỗng làm hỏng cú pháp'],
        ['<code>-n "$x"</code>', 'Chuỗi <b>có nội dung</b>', 'Ngược lại của <code>-z</code>'],
        ['<code>"$a" = "$b"</code>', 'So sánh <b>chuỗi</b>', ''],
        ['<code>"$a" -eq "$b"</code>', 'So sánh <b>số</b> bằng nhau', 'Dùng <code>=</code> cho số cũng chạy nhưng so theo ký tự: <code>"10"</code> khác <code>"010"</code>'],
        ['<code>-gt -lt -ge -le -ne</code>', 'Lớn hơn, nhỏ hơn, ≥, ≤, khác — cho <b>số</b>', '<b>Đừng dùng <code>&gt;</code> và <code>&lt;</code></b> trong <code>[ ]</code>: bash hiểu là chuyển hướng và tạo ra một file']
      ]},

    { t: 'cal', kind: 'danger', title: 'Bẫy kinh điển: [ "$so" > 10 ] không hề so sánh gì cả', x:
      '<p>Bash nhìn thấy <code>&gt;</code> và hiểu là <b>chuyển hướng đầu ra</b>. Nó tạo ra ' +
      'trong thư mục hiện tại <b>một file rỗng tên là <code>10</code></b>, rồi lệnh ' +
      '<code>[ "$so" ]</code> còn lại trả về "chuỗi có nội dung" — tức là <b>luôn đúng</b>.</p>' +
      '<p>Script của bạn sẽ chạy nhánh <code>then</code> trong <b>mọi</b> trường hợp, im lặng và ' +
      'không báo lỗi gì. Bạn sẽ tự tay tạo ra file <code>10</code> đó ở bước 3 để nhớ đời.</p>' +
      '<p>Viết đúng: <code>[ "$so" -gt 10 ]</code>. Hoặc dùng <code>(( so &gt; 10 ))</code>, nơi ' +
      '<code>&gt;</code> mang đúng nghĩa toán học.</p>' },

    { t: 'p', x:
      'Vòng lặp thì có ba dạng, và bạn sẽ dùng cả ba: <code>for</code> duyệt một danh sách, ' +
      '<code>while</code> lặp chừng nào điều kiện còn đúng, và <code>case</code> — không phải ' +
      'vòng lặp mà là rẽ nhánh nhiều đường, thay cho một chuỗi <code>if elif</code> dài dòng.' },

    { t: 'cal', kind: 'tip', title: 'case là lựa chọn tự nhiên cho việc chọn kiến trúc', x:
      '<p>Trong nhúng, bạn liên tục phải ánh xạ "tên kiến trúc" sang "tên trình biên dịch": ' +
      '<code>arm64</code> → <code>aarch64-linux-gnu-gcc</code>, <code>armhf</code> → ' +
      '<code>arm-linux-gnueabihf-gcc</code>. Đây đúng là việc của <code>case</code>.</p>' +
      '<p>Ba điểm cú pháp cần nhớ: mỗi nhánh <b>kết thúc bằng <code>;;</code></b>; gộp nhiều ' +
      'mẫu bằng <code>|</code>; và <code>*)</code> ở cuối bắt mọi trường hợp còn lại — ' +
      '<b>luôn luôn viết nhánh này</b>, để đầu vào lạ bị từ chối thay vì lọt qua im lặng.</p>' },

    /* ══════════════════════════════════════════════
       5. HÀM
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Hàm và tham số' },

    { t: 'p', x:
      'Hàm trong bash không khai báo kiểu, không khai báo tham số. Nó nhận tham số <b>đúng như ' +
      'một script nhận tham số dòng lệnh</b>: <code>$1</code>, <code>$2</code>, <code>$@</code>. ' +
      'Sự tương đồng này không phải trùng hợp — nó khiến bạn có thể tách một đoạn script thành ' +
      'hàm mà gần như không phải sửa gì.' },

    { t: 'table',
      head: ['Biến', 'Ý nghĩa', 'Ghi chú'],
      rows: [
        ['<code>$0</code>', 'Tên script như đã được gọi', 'Trong hàm vẫn là tên script, <b>không</b> phải tên hàm'],
        ['<code>$1</code> <code>$2</code> …', 'Tham số thứ nhất, thứ hai…', 'Từ <code>$10</code> trở đi phải viết <code>${10}</code>'],
        ['<code>$#</code>', 'Số lượng tham số', 'Kiểm tra đầu script: <code>[ $# -lt 1 ] && …</code>'],
        ['<code>"$@"</code>', 'Tất cả tham số, <b>mỗi cái một chuỗi riêng</b>', '<b>Đây là dạng bạn muốn dùng</b>'],
        ['<code>"$*"</code>', 'Tất cả tham số <b>gộp thành một chuỗi</b>', 'Chỉ dùng khi in ra màn hình'],
        ['<code>$?</code>', 'Mã trả về của lệnh vừa xong', 'Lưu ngay nếu cần dùng lại'],
        ['<code>$$</code>', 'PID của tiến trình script', 'Đặt tên file tạm không trùng nhau'],
        ['<code>shift</code>', 'Đẩy tham số sang trái một chỗ', '<code>$2</code> thành <code>$1</code>. Dùng khi xử lý cờ dòng lệnh']
      ]},

    { t: 'cal', kind: 'why', title: '"$@" và "$*" khác nhau đúng ở một chỗ, và chỗ đó rất quan trọng', x:
      '<p>Gọi script với ba tham số <code>mot</code>, <code>"hai ba"</code>, <code>bon</code>:</p>' +
      '<p><code>"$@"</code> giữ nguyên <b>ba</b> chuỗi, trong đó <code>hai ba</code> vẫn là một ' +
      'chuỗi liền. <code>"$*"</code> nối tất cả lại thành <b>một</b> chuỗi ' +
      '<code>mot hai ba bon</code> — ranh giới giữa các tham số biến mất vĩnh viễn.</p>' +
      '<p>Nếu tham số là tên file có khoảng trắng, <code>"$*"</code> phá hỏng dữ liệu. Quy tắc ' +
      'thuộc lòng: <b>chuyển tiếp tham số thì dùng <code>"$@"</code>, in ra màn hình thì dùng ' +
      '<code>"$*"</code></b>. Bạn sẽ thấy cả hai được dùng đúng chỗ trong script ở phần thực ' +
      'hành.</p>' },

    { t: 'cal', kind: 'tip', title: 'local — một từ khoá, tránh được cả một lớp lỗi', x:
      '<p>Mặc định, biến gán trong hàm là <b>biến toàn cục</b>. Một hàm dùng biến ' +
      '<code>i</code> làm biến đếm sẽ lặng lẽ đè lên biến <code>i</code> của vòng lặp đang gọi ' +
      'nó.</p>' +
      '<p><code>local lenh="$1"</code> giới hạn biến trong phạm vi hàm. Thói quen nên có: ' +
      '<b>mọi biến bên trong hàm đều khai báo <code>local</code></b>, trừ khi bạn thật sự muốn ' +
      'nó thoát ra ngoài.</p>' +
      '<p>Và nhớ phân biệt: <code>return</code> kết thúc <b>hàm</b> với một mã trạng thái, ' +
      '<code>exit</code> kết thúc <b>cả script</b>. Nhầm hai cái này là script dừng giữa chừng ' +
      'mà không hiểu tại sao.</p>' },

    /* ══════════════════════════════════════════════
       6. SET -EUO PIPEFAIL
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'set -euo pipefail: ba công tắc an toàn' },

    { t: 'p', x:
      'Mặc định bash rất khoan dung: một lệnh thất bại thì nó <b>bỏ qua và chạy tiếp</b>. Với ' +
      'một dòng lệnh gõ tay thì tiện, vì bạn nhìn thấy lỗi và tự xử lý. Với một script chạy lúc ' +
      '3 giờ sáng trên máy build thì đó là công thức của thảm hoạ: mỗi lệnh sau đó làm việc ' +
      'trên một hệ thống đã sai trạng thái.' },

    { t: 'fig',
      cap: 'Ba công tắc, ba loại lỗi khác nhau. Đặt chúng ngay dưới shebang của mọi script nghiêm túc.',
      svg:
        '<svg viewBox="0 0 720 268" width="720" role="img" aria-label="Ba công tắc của set -euo pipefail và loại lỗi mà mỗi cái bắt được">' +
        '<rect class="d-box-p" x="20" y="18" width="680" height="38" rx="4"/>' +
        '<text class="d-tm" x="34" y="42">#!/bin/bash</text>' +
        '<text class="d-tm" x="200" y="42">set -euo pipefail</text>' +
        '<text class="d-ts" x="400" y="42">hai dong dau tien cua moi script nghiem tuc</text>' +

        '<rect class="d-box-w" x="20" y="74" width="216" height="120" rx="6"/>' +
        '<text class="d-tm" x="128" y="96" text-anchor="middle">-e</text>' +
        '<text class="d-t" x="128" y="118" text-anchor="middle">errexit</text>' +
        '<text class="d-ts" x="128" y="140" text-anchor="middle">dung ngay khi mot lenh</text>' +
        '<text class="d-ts" x="128" y="156" text-anchor="middle">tra ve khac 0</text>' +
        '<text class="d-ts" x="128" y="180" text-anchor="middle">bat: cd that bai, build loi</text>' +

        '<rect class="d-box-w" x="252" y="74" width="216" height="120" rx="6"/>' +
        '<text class="d-tm" x="360" y="96" text-anchor="middle">-u</text>' +
        '<text class="d-t" x="360" y="118" text-anchor="middle">nounset</text>' +
        '<text class="d-ts" x="360" y="140" text-anchor="middle">dung ngay khi dung mot</text>' +
        '<text class="d-ts" x="360" y="156" text-anchor="middle">bien chua duoc dat</text>' +
        '<text class="d-ts" x="360" y="180" text-anchor="middle">bat: go sai ten bien</text>' +

        '<rect class="d-box-w" x="484" y="74" width="216" height="120" rx="6"/>' +
        '<text class="d-tm" x="592" y="96" text-anchor="middle">-o pipefail</text>' +
        '<text class="d-t" x="592" y="118" text-anchor="middle">pipefail</text>' +
        '<text class="d-ts" x="592" y="140" text-anchor="middle">duong ong that bai neu</text>' +
        '<text class="d-ts" x="592" y="156" text-anchor="middle">BAT KY khau nao that bai</text>' +
        '<text class="d-ts" x="592" y="180" text-anchor="middle">bat: loi giua duong ong</text>' +

        '<rect class="d-box-a" x="20" y="212" width="680" height="42" rx="4"/>' +
        '<text class="d-t" x="34" y="232">Khong co pipefail:  false | true   -&gt;  ma tra ve 0   (bash chi lay ma cua khau CUOI)</text>' +
        '<text class="d-t" x="34" y="250">Co pipefail     :  false | true   -&gt;  ma tra ve 1</text>' +
        '</svg>' },

    { t: 'cmdx', cmd: 'set -euo pipefail', title: 'Từng ký tự làm gì',
      rows: [
        ['<code>set</code>', 'Lệnh dựng sẵn thay đổi hành vi của chính shell đang chạy', 'Có hiệu lực từ dòng đó tới hết script'],
        ['<code>-e</code>', 'Thoát ngay khi một lệnh trả về khác 0', '<b>Công tắc quan trọng nhất.</b> Biến "chạy tiếp trên trạng thái sai" thành "dừng và báo lỗi"'],
        ['<code>-u</code>', 'Coi biến chưa đặt là lỗi', 'Bắt được lỗi gõ sai tên biến — thứ mà bash bình thường im lặng cho qua'],
        ['<code>-o pipefail</code>', 'Mã trả về của đường ống là mã của khâu thất bại cuối cùng', 'Không có nó, <code>lenh_hong | tee log</code> luôn báo thành công'],
        ['Gộp lại', '<code>-e</code> và <code>-u</code> gộp được thành <code>-eu</code>', '<code>pipefail</code> phải viết riêng vì nó là tuỳ chọn dạng tên']
      ]},

    { t: 'cal', kind: 'warn', title: 'set -e có một ngoại lệ mà bạn phải biết, nếu không sẽ tưởng nó hỏng', x:
      '<p><code>set -e</code> <b>không</b> làm script dừng khi lệnh thất bại nằm trong một ngữ ' +
      'cảnh <i>đang được kiểm tra</i>: điều kiện của <code>if</code>, của <code>while</code>, ' +
      'vế trái của <code>&amp;&amp;</code> hoặc <code>||</code>, hay sau <code>!</code>.</p>' +
      '<p>Điều đó hoàn toàn hợp lý: <code>if grep -q abc file; then</code> có mục đích là ' +
      '<i>hỏi</i> xem grep thành công hay không. Nếu <code>set -e</code> giết script ngay khi ' +
      'grep trả về 1 thì không viết được câu <code>if</code> nào cả.</p>' +
      '<p>Hệ quả thực dụng: khi bạn <b>cố tình</b> muốn một lệnh được phép thất bại, hãy viết ' +
      '<code>lenh || true</code>. Bạn sẽ kiểm chứng ngoại lệ này ở bước 4.</p>' },

    /* ══════════════════════════════════════════════
       7. HERE-DOC VÀ TRAP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'here-doc và trap' },

    { t: 'p', x:
      'Hai công cụ cuối cùng trước khi vào thực hành. <b>here-doc</b> để ghi nhiều dòng vào một ' +
      'file mà không phải gọi <code>echo</code> hàng chục lần; <b>trap</b> để đảm bảo việc dọn ' +
      'dẹp <i>luôn</i> chạy, kể cả khi script chết giữa chừng.' },

    { t: 'table',
      head: ['Viết', 'Có thay biến bên trong không?', 'Dùng cho'],
      rows: [
        ['<code>cat &gt; f &lt;&lt;EOF</code>', '<b>Có.</b> <code>$ten</code> và <code>$(lenh)</code> đều được thay', 'Sinh file cấu hình có nội dung động'],
        ['<code>cat &gt; f &lt;&lt;\'EOF\'</code>', '<b>Không.</b> Chép nguyên xi từng ký tự', 'Ghi ra một <b>script khác</b>, hoặc nội dung có chứa <code>$</code>'],
        ['<code>cat &gt; f &lt;&lt;-EOF</code>', 'Có', 'Dấu <code>-</code> cho phép thụt lề dòng <code>EOF</code> bằng <b>tab</b>'],
        ['<code>cat &gt;&gt; f &lt;&lt;EOF</code>', 'Có', '<code>&gt;&gt;</code> nối thêm thay vì ghi đè']
      ]},

    { t: 'cal', kind: 'tip', title: 'Dấu nháy quanh EOF là chi tiết quyết định', x:
      '<p><code>&lt;&lt;EOF</code> và <code>&lt;&lt;\'EOF\'</code> trông gần như giống hệt nhau, ' +
      'nhưng cách chúng đối xử với nội dung thì ngược nhau hoàn toàn.</p>' +
      '<p>Đây là lỗi rất hay gặp khi bạn viết một script <b>sinh ra script khác</b> — chính ' +
      'việc bạn sẽ làm ở Chặng 09 khi tạo file <code>init</code> cho rootfs. Quên dấu nháy là ' +
      'mọi biến trong script con bị thay bằng giá trị của script cha ngay lúc sinh file, và bạn ' +
      'nhận được một file toàn dòng trống.</p>' +
      '<p>Mẹo nhớ: <b>dấu nháy đơn ở đây làm đúng việc mà dấu nháy đơn vẫn làm ở mọi nơi khác — ' +
      'chặn mọi thay thế.</b></p>' },

    { t: 'p', x:
      '<code>trap</code> đăng ký một lệnh sẽ được chạy khi script nhận một tín hiệu, hoặc khi ' +
      'nó kết thúc. Tín hiệu <code>EXIT</code> là loại đặc biệt và hữu ích nhất: nó chạy ' +
      '<b>trong mọi trường hợp</b> — thoát bình thường, thoát vì lỗi do <code>set -e</code>, ' +
      'hay bị người dùng nhấn <kbd>Ctrl</kbd>+<kbd>C</kbd>.' },

    { t: 'terms', items: [
      ['<code>trap \'lenh\' EXIT</code>', '', 'Chạy <code>lenh</code> khi script kết thúc <b>vì bất cứ lý do gì</b>. Đây là dạng bạn sẽ dùng nhiều nhất'],
      ['<code>trap \'lenh\' INT TERM</code>', '', 'Chỉ khi bị ngắt (<kbd>Ctrl</kbd>+<kbd>C</kbd>) hoặc bị yêu cầu dừng'],
      ['<code>trap - EXIT</code>', '', 'Gỡ bẫy đã đặt'],
      ['<code>mktemp -d</code>', '', 'Tạo một thư mục tạm với tên <b>ngẫu nhiên, chắc chắn không trùng</b>, và in đường dẫn ra. Luôn dùng nó thay cho <code>/tmp/build</code> tự đặt'],
      ['SIGINT', '', 'Tín hiệu số 2, sinh ra khi nhấn <kbd>Ctrl</kbd>+<kbd>C</kbd>. Script thoát với mã 130'],
      ['SIGTERM', '', 'Tín hiệu số 15, lời yêu cầu dừng lịch sự. Đây là tín hiệu <code>systemd</code> gửi khi tắt một dịch vụ']
    ]},

    { t: 'cal', kind: 'why', title: 'Vì sao cặp mktemp + trap là chuẩn mực, không phải tuỳ chọn', x:
      '<p>Ba vấn đề được giải cùng lúc chỉ bằng hai dòng:</p>' +
      '<p><b>1. Trùng tên.</b> Hai lần chạy song song cùng dùng <code>/tmp/build</code> sẽ giẫm ' +
      'lên nhau. <code>mktemp -d</code> cho mỗi lần một tên riêng.<br>' +
      '<b>2. Rác tích tụ.</b> Không dọn thì <code>/tmp</code> đầy dần sau hàng nghìn lần chạy ' +
      'trên máy build.<br>' +
      '<b>3. Dọn dẹp khi thất bại.</b> Đây mới là điểm mấu chốt — <code>rm -rf</code> đặt ở ' +
      'cuối script <b>không bao giờ chạy</b> nếu script chết ở giữa. <code>trap … EXIT</code> ' +
      'thì luôn chạy.</p>' +
      '<p>Bạn sẽ kiểm chứng điểm 3 ở bước 5: cho script thất bại có chủ đích và xác nhận thư ' +
      'mục tạm vẫn bị xoá sạch.</p>' },

    /* ══════════════════════════════════════════════
       8. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: từ dòng lệnh tới script build ARM64' },

    { t: 'p', x:
      'Bảy bước. Bốn bước đầu bạn sẽ <b>cố tình phạm</b> từng lỗi kinh điển để nhìn thấy hậu ' +
      'quả thật; ba bước cuối ghép mọi thứ lại thành một script build hoàn chỉnh cho ARM64. ' +
      'Toàn bộ bài tập nằm trong <code>~/b13</code> và sẽ được xoá sạch ở bước 7.' },

    { t: 'code', where: 'wsl', code: 'mkdir -p ~/b13 && cd ~/b13' },

    { t: 'steps', items: [

      /* ─────────── BƯỚC 1 ─────────── */
      { title: 'Bước 1 — Script đầu tiên, và bốn cách làm nó không chạy', blocks: [
        { t: 'p', x:
          'Bắt đầu bằng bản không có shebang, để thấy chính xác dòng đó thêm được gì.' },

        { t: 'code', where: 'wsl', code:
          'echo \'echo "xin chao tu $0"\' > khongco.sh\n' +
          'chmod +x khongco.sh\n' +
          './khongco.sh\n' +
          'file khongco.sh' },

        { t: 'code', where: 'out', nocopy: true, code:
          'xin chao tu ./khongco.sh\n' +
          'khongco.sh: ASCII text' },

        { t: 'p', x:
          'Nó <b>chạy</b> — nhưng hãy để ý <code>file</code> chỉ thấy "ASCII text", một file văn ' +
          'bản bình thường. Bây giờ thêm shebang bằng here-doc và so sánh.' },

        { t: 'code', where: 'wsl', code:
          'cat > cochao.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'echo "xin chao tu $0"\n' +
          'EOF\n' +
          'chmod +x cochao.sh\n' +
          './cochao.sh\n' +
          'file cochao.sh' },

        { t: 'code', where: 'out', nocopy: true, code:
          'xin chao tu ./cochao.sh\n' +
          'cochao.sh: Bourne-Again shell script, ASCII text executable' },

        { t: 'cal', kind: 'why', title: 'Cùng một kết quả, nhưng hai cơ chế hoàn toàn khác nhau', x:
          '<p>Với file <b>có</b> shebang, kernel đọc <code>#!/bin/bash</code> và tự gọi ' +
          '<code>/bin/bash ./cochao.sh</code>. Đó là con đường chính thức.</p>' +
          '<p>Với file <b>không</b> có shebang, kernel từ chối vì không nhận ra định dạng. ' +
          'Shell hiện tại thấy vậy bèn <b>tự đoán</b> rằng đây là script và chạy nó bằng chính ' +
          'nó. Bạn đang phụ thuộc vào lòng tốt của shell, và lòng tốt đó không có trong tiêu ' +
          'chuẩn nào.</p>' +
          '<p>Chú ý <code>file</code> giờ nói "Bourne-Again shell script … executable". Chính ' +
          'shebang đã biến file văn bản thành một chương trình có danh tính rõ ràng. Cùng cơ chế ' +
          'mà <code>file</code> nhận ra ELF ARM64 ở Bài 3, chỉ khác là ở đây dấu hiệu nhận dạng ' +
          'do bạn tự viết.</p>' },

        { t: 'p', x:
          'Giờ tới ba cách phổ biến khiến một script từ chối chạy. Cách thứ nhất: quên ' +
          '<code>chmod +x</code>.' },

        { t: 'code', where: 'wsl', code:
          'cp cochao.sh chuachmod.sh\n' +
          'chmod -x chuachmod.sh\n' +
          './chuachmod.sh\n' +
          'echo "ma tra ve = $?"\n' +
          'bash chuachmod.sh' },

        { t: 'code', where: 'out', nocopy: true, code:
          'bash: ./chuachmod.sh: Permission denied\n' +
          'ma tra ve = 126\n' +
          'xin chao tu chuachmod.sh' },

        { t: 'cal', kind: 'info', title: 'Permission denied nhưng bash vẫn chạy được — không hề mâu thuẫn', x:
          '<p><code>./chuachmod.sh</code> yêu cầu kernel <b>thực thi file</b>, và kernel kiểm ' +
          'tra bit <code>x</code>. Không có thì từ chối, mã <b>126</b>: "tìm thấy nhưng không ' +
          'chạy được".</p>' +
          '<p><code>bash chuachmod.sh</code> lại là chuyện khác: bạn đang chạy chương trình ' +
          '<code>bash</code> — vốn có quyền <code>x</code> — và đưa file kia cho nó ' +
          '<b>đọc</b>. Đọc thì chỉ cần quyền <code>r</code>.</p>' +
          '<p>Đây chính là mô hình quyền của Bài 8, nhìn từ một góc mới. Và nó cũng giải thích ' +
          'vì sao mã 126 khác hẳn mã 127: 126 là "có file, không chạy được", 127 là "không có ' +
          'file nào cả".</p>' },

        { t: 'p', x: 'Cách thứ hai: shebang gõ sai.' },

        { t: 'code', where: 'wsl', code:
          'printf \'#!/bin/basj\\necho "khong bao gio in ra"\\n\' > sai.sh\n' +
          'chmod +x sai.sh\n' +
          './sai.sh\n' +
          'echo "ma tra ve = $?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'bash: ./sai.sh: /bin/basj: bad interpreter: No such file or directory\n' +
          'ma tra ve = 126' },

        { t: 'p', x:
          'Cách thứ ba là cái bẫy nguy hiểm nhất với người dùng Windows, vì <b>mắt thường không ' +
          'nhìn thấy gì sai</b>: file được lưu với ký tự xuống dòng kiểu Windows.' },

        { t: 'code', where: 'wsl', code:
          'printf \'#!/bin/bash\\r\\necho "co chay khong"\\r\\n\' > crlf.sh\n' +
          'chmod +x crlf.sh\n' +
          './crlf.sh\n' +
          'echo "ma tra ve = $?"\n' +
          'cat -A crlf.sh' },

        { t: 'code', where: 'out', nocopy: true, code:
          'bash: ./crlf.sh: /bin/bash^M: bad interpreter: No such file or directory\n' +
          'ma tra ve = 126\n' +
          '#!/bin/bash^M$\n' +
          'echo "co chay khong"^M$' },

        { t: 'cmdx', cmd: 'cat -A crlf.sh', title: 'Nhìn thấy thứ vô hình',
          rows: [
            ['<code>cat -A</code>', 'Hiện <b>mọi</b> ký tự không in được', 'Gộp của <code>-v</code>, <code>-E</code> và <code>-T</code>'],
            ['<code>$</code> cuối dòng', 'Ký tự xuống dòng của Unix (LF, mã 10)', 'Bình thường'],
            ['<code>^M</code>', 'Ký tự carriage return (CR, mã 13)', '<b>Thủ phạm.</b> Nó dính vào cuối chuỗi <code>/bin/bash</code>, tạo ra tên chương trình <code>/bin/bash&lt;CR&gt;</code> không tồn tại'],
            ['Cách chữa', '<code>sed -i \'s/\\r$//\' script.sh</code>', 'Hoặc <code>dos2unix script.sh</code>. Tốt hơn nữa: cấu hình trình soạn thảo dùng LF']
          ]},

        { t: 'cal', kind: 'danger', title: 'Bẫy này sẽ tìm đến bạn, vì bạn đang làm việc trên Windows', x:
          '<p>Bạn sửa file trong VS Code hoặc Notepad trên Windows, lưu lại, rồi chạy trong ' +
          'WSL. Nếu trình soạn thảo dùng CRLF, mọi script đều chết với thông báo ' +
          '<code>bad interpreter</code> — trong khi nội dung file nhìn hoàn toàn đúng.</p>' +
          '<p>Hai cách phòng: đặt trình soạn thảo dùng LF cho file <code>.sh</code> (VS Code ' +
          'hiện <b>CRLF</b>/<b>LF</b> ở góc dưới bên phải, bấm vào là đổi được), và thêm một ' +
          'file <code>.gitattributes</code> với dòng <code>*.sh text eol=lf</code>.</p>' +
          '<p>Ở Chặng 09 bạn sẽ nạp script vào rootfs của thiết bị nhúng. Một ký tự ' +
          '<code>^M</code> trong script <code>init</code> ở đó ' +
          'nghĩa là thiết bị không khởi động được, và bạn không có màn hình để đọc thông báo ' +
          'lỗi.</p>' },

        { t: 'p', x:
          'Bước cuối của phần này: chứng minh vì sao shebang phải ghi <code>bash</code> chứ ' +
          'không phải <code>sh</code>.' },

        { t: 'code', where: 'wsl', code:
          'cat > sosanh.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'if [[ "abc" == a* ]]; then echo "[[ ]] hoat dong"; fi\n' +
          'echo "shell dang chay: $BASH_VERSION"\n' +
          'EOF\n' +
          'bash sosanh.sh\n' +
          'sh sosanh.sh\n' +
          'ls -l /bin/sh' },

        { t: 'code', where: 'out', nocopy: true, code:
          '[[ ]] hoat dong\n' +
          'shell dang chay: 5.3.9(1)-release\n' +
          'sosanh.sh: 2: [[: not found\n' +
          'shell dang chay: \n' +
          'lrwxrwxrwx 1 root root 4 Feb  3 03:26 /bin/sh -> dash' },

        { t: 'cal', kind: 'warn', title: 'Đây là bài học quan trọng nhất của bước 1', x:
          '<p><code>/bin/sh</code> <b>không phải</b> bash — nó là một liên kết trỏ tới ' +
          '<code>dash</code>. Cùng một file script, chạy bằng <code>bash</code> thì ổn, chạy ' +
          'bằng <code>sh</code> thì <code>[[: not found</code> và <code>$BASH_VERSION</code> ' +
          'rỗng.</p>' +
          '<p>Vậy nên: viết <code>#!/bin/bash</code> khi bạn dùng cú pháp riêng của bash ' +
          '(<code>[[ ]]</code>, mảng, <code>${x^^}</code>), và <code>#!/bin/sh</code> khi bạn ' +
          '<b>cố ý</b> viết script POSIX thuần để nó chạy được cả trên BusyBox của thiết bị ' +
          'nhúng.</p>' +
          '<p>Điều tệ nhất là viết <code>#!/bin/sh</code> nhưng dùng cú pháp bash: trên máy bạn ' +
          'có thể vẫn chạy nếu <code>/bin/sh</code> trỏ tới bash, rồi chết trên thiết bị. Từ ' +
          'Chặng 09 trở đi, đây là lỗi bạn sẽ phải rất cảnh giác.</p>' }
      ]},

      /* ─────────── BƯỚC 2 ─────────── */
      { title: 'Bước 2 — Dấu nháy: nhìn tận mắt lý do phải bọc biến', blocks: [
        { t: 'p', x:
          'Trước hết là khác biệt giữa hai loại nháy, và cái bẫy khoảng trắng quanh dấu bằng.' },

        { t: 'code', where: 'wsl', code:
          'cat > nhay.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'ten="kernel"\n' +
          'echo "phien ban cua $ten"\n' +
          'echo \'phien ban cua $ten\'\n' +
          'echo "hom nay la $(date +%Y)"\n' +
          'echo \'hom nay la $(date +%Y)\'\n' +
          'EOF\n' +
          'bash nhay.sh\n' +
          'bash -c \'ten = "Linux"\'\n' +
          'echo "ma tra ve = $?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'phien ban cua kernel\n' +
          'phien ban cua $ten\n' +
          'hom nay la 2026\n' +
          'hom nay la $(date +%Y)\n' +
          'bash: line 1: ten: command not found\n' +
          'ma tra ve = 127' },

        { t: 'cal', kind: 'info', title: 'Ba dòng, ba bài học', x:
          '<p><b>Nháy kép thay thế, nháy đơn thì không.</b> Cả biến <code>$ten</code> lẫn thay ' +
          'thế lệnh <code>$(date …)</code> đều theo quy tắc này.</p>' +
          '<p><b><code>ten = "Linux"</code> không phải phép gán.</b> Bash tách theo khoảng ' +
          'trắng, thấy từ đầu tiên là <code>ten</code> và đi tìm một lệnh tên như vậy. Mã ' +
          '<b>127</b> — "không tìm thấy lệnh" — chính là mã bạn đã gặp ở Bài 12 khi ' +
          '<code>gpiodetect</code> thiếu thư viện.</p>' +
          '<p><b>Quy tắc:</b> không khoảng trắng nào quanh dấu <code>=</code> khi gán. Đây là ' +
          'lỗi mà mọi người mới đều mắc, thường trong mười phút đầu tiên.</p>' },

        { t: 'p', x:
          'Bây giờ tới phần quan trọng nhất của cả bài. Tạo một file có tên chứa khoảng trắng ' +
          'rồi truy cập nó theo hai cách.' },

        { t: 'code', where: 'wsl', code:
          'mkdir -p thumuc && touch "thumuc/ten co khoang trang.txt"\n' +
          'cat > tachtu.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'f="thumuc/ten co khoang trang.txt"\n' +
          'echo "--- co nhay:"\n' +
          'ls -l "$f"; echo "ma tra ve = $?"\n' +
          'echo "--- khong nhay:"\n' +
          'ls -l $f;   echo "ma tra ve = $?"\n' +
          'EOF\n' +
          'bash tachtu.sh' },

        { t: 'code', where: 'out', nocopy: true, code:
          '--- co nhay:\n' +
          '-rw-r--r-- 1 shinarus shinarus 0 Aug  1 18:02 thumuc/ten co khoang trang.txt\n' +
          'ma tra ve = 0\n' +
          '--- khong nhay:\n' +
          'ls: cannot access \'thumuc/ten\': No such file or directory\n' +
          'ls: cannot access \'co\': No such file or directory\n' +
          'ls: cannot access \'khoang\': No such file or directory\n' +
          'ls: cannot access \'trang.txt\': No such file or directory\n' +
          'ma tra ve = 2' },

        { t: 'cal', kind: 'why', title: 'Bốn thông báo lỗi cho một file — đó là tách từ đang diễn ra', x:
          '<p>Không có nháy, bash làm hai việc theo thứ tự: thay <code>$f</code> bằng giá trị ' +
          'của nó, <b>rồi cắt chuỗi kết quả tại mỗi khoảng trắng</b>. ' +
          '<code>ls</code> nhận được <b>bốn</b> tham số riêng biệt và than phiền bốn lần.</p>' +
          '<p>Có nháy, bước cắt bị bỏ qua. <code>ls</code> nhận đúng <b>một</b> tham số.</p>' +
          '<p>Đây là lý do sâu xa vì sao Bài 4 khuyên bạn đừng đặt tên file có khoảng trắng, và ' +
          'vì sao <code>find -print0 | xargs -0</code> ở Bài 11 phải tồn tại. <b>Cùng một vấn ' +
          'đề, ba lần gặp lại ở ba bài khác nhau.</b></p>' },

        { t: 'p', x:
          'Tách từ mới là một nửa. Nửa còn lại: biến chứa <code>*</code> sẽ bị bung thành danh ' +
          'sách file.' },

        { t: 'code', where: 'wsl', code:
          'cat > sao.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'cd thumuc || exit 1\n' +
          'mau="*.txt"\n' +
          'echo "co nhay   : $mau"\n' +
          'echo "khong nhay: " $mau\n' +
          'EOF\n' +
          'bash sao.sh' },

        { t: 'code', where: 'out', nocopy: true, code:
          'co nhay   : *.txt\n' +
          'khong nhay:  ten co khoang trang.txt' },

        { t: 'p', x:
          'Và cuối cùng, chứng minh trực quan điều nguy hiểm nhất — không xoá gì thật, chỉ in ra ' +
          'lệnh <b>sẽ</b> được chạy.' },

        { t: 'code', where: 'wsl', code:
          'cat > nguyhiem.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'duong=""\n' +
          'echo "lenh se chay: rm -rf $duong/"\n' +
          'echo "voi nhay    : rm -rf \\"$duong/\\""\n' +
          'EOF\n' +
          'bash nguyhiem.sh' },

        { t: 'code', where: 'out', nocopy: true, code:
          'lenh se chay: rm -rf /\n' +
          'voi nhay    : rm -rf "/"' },

        { t: 'cal', kind: 'danger', title: 'Nhìn kỹ dòng đầu tiên', x:
          '<p>Biến rỗng cộng với dấu <code>/</code> viết sát sau nó tạo ra chính xác ' +
          '<b><code>rm -rf /</code></b>. Không có lỗi cú pháp nào, không có cảnh báo nào. Script ' +
          'sẽ chạy và làm đúng những gì bạn viết.</p>' +
          '<p>Dấu nháy giúp lộ ra vấn đề (<code>rm -rf "/"</code> vẫn là thảm hoạ, nhưng ít nhất ' +
          'bạn thấy nó), còn thứ thật sự chặn được là <code>set -u</code> ở bước 5 và một dòng ' +
          'kiểm tra:</p>' +
          '<p><code>[ -n "$duong" ] || { echo "duong rong"; exit 1; }</code></p>' +
          '<p>Ba lớp bảo vệ này tốn ba giây để viết. Hãy tập thành phản xạ ngay từ script đầu ' +
          'tiên, chứ đừng đợi tới lúc script của bạn chạy trên máy build của công ty.</p>' },

        { t: 'p', x: 'Vài phép biến đổi chuỗi tiện dụng bạn sẽ dùng ở bước 6:' },

        { t: 'code', where: 'wsl', code:
          'cat > chuadat.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'echo "gia tri : [$khongtontai]"\n' +
          'echo "mac dinh: [${khongtontai:-arm64}]"\n' +
          'ten="linux"\n' +
          'echo "do dai  : ${#ten}"\n' +
          'echo "hoa     : ${ten^^}"\n' +
          'echo "thay    : ${ten/linux/embedded}"\n' +
          'EOF\n' +
          'bash chuadat.sh' },

        { t: 'code', where: 'out', nocopy: true, code:
          'gia tri : []\n' +
          'mac dinh: [arm64]\n' +
          'do dai  : 5\n' +
          'hoa     : LINUX\n' +
          'thay    : embedded' },

        { t: 'cal', kind: 'tip', title: '${x:-mặc định} là cách xử lý tham số tuỳ chọn', x:
          '<p>Dòng thứ nhất cho thấy hành vi mặc định của bash: biến chưa đặt được thay bằng ' +
          '<b>chuỗi rỗng</b>, im lặng, không cảnh báo. Chính sự im lặng đó là nguồn gốc của thảm ' +
          'hoạ vừa xem ở trên.</p>' +
          '<p><code>${khongtontai:-arm64}</code> nói: "dùng giá trị của biến, nhưng nếu nó chưa ' +
          'đặt hoặc rỗng thì dùng <code>arm64</code>". Ở bước 6 bạn sẽ viết ' +
          '<code>KIEN_TRUC="${1:-arm64}"</code> — nghĩa là "lấy tham số thứ nhất, không có thì ' +
          'mặc định arm64". Một dòng, xử lý gọn toàn bộ trường hợp người dùng không truyền tham ' +
          'số.</p>' }
      ]},

      /* ─────────── BƯỚC 3 ─────────── */
      { title: 'Bước 3 — Mã trả về, if, và cái bẫy dấu lớn hơn', blocks: [
        { t: 'p', x:
          'Trước khi viết <code>if</code>, hãy nhìn thấy thứ mà <code>if</code> thật sự đọc.' },

        { t: 'code', where: 'wsl', code:
          'cat > mtv.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'ls /etc/hostname > /dev/null\n' +
          'echo "ls thanh cong  -> $?"\n' +
          'ls /khong/ton/tai > /dev/null 2>&1\n' +
          'echo "ls that bai    -> $?"\n' +
          'grep -q root /etc/passwd\n' +
          'echo "grep tim thay  -> $?"\n' +
          'grep -q khongcogi /etc/passwd\n' +
          'echo "grep khong thay-> $?"\n' +
          'EOF\n' +
          'bash mtv.sh' },

        { t: 'code', where: 'out', nocopy: true, code:
          'ls thanh cong  -> 0\n' +
          'ls that bai    -> 2\n' +
          'grep tim thay  -> 0\n' +
          'grep khong thay-> 1' },

        { t: 'cal', kind: 'info', title: 'grep trả về 1 không phải là lỗi', x:
          '<p>Bạn đã biết điều này từ Bài 11: mã <b>1</b> của <code>grep</code> nghĩa là "chạy ' +
          'hoàn hảo, không có dòng nào khớp", còn mã <b>2</b> mới là lỗi thật (file không tồn ' +
          'tại, quyền không đủ).</p>' +
          '<p>Phân biệt này quan trọng khi bạn bật <code>set -e</code> ở bước 5: script sẽ chết ' +
          'ở một câu <code>grep</code> hoàn toàn bình thường chỉ vì nó không tìm thấy gì. Cách ' +
          'xử lý là đặt grep vào trong <code>if</code>, hoặc viết <code>grep … || true</code>.</p>' },

        { t: 'p', x:
          'Giờ tới <code>if</code>, và bằng chứng rằng <code>[</code> chỉ là một lệnh.' },

        { t: 'code', where: 'wsl', code:
          'cat > ifla.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'if grep -q root /etc/passwd; then\n' +
          '  echo "co nguoi dung root"\n' +
          'fi\n' +
          'if [ -f /etc/hostname ]; then\n' +
          '  echo "/etc/hostname la file thuong"\n' +
          'fi\n' +
          'if [ ! -d /khong/co ]; then\n' +
          '  echo "/khong/co khong phai thu muc"\n' +
          'fi\n' +
          'EOF\n' +
          'bash ifla.sh\n' +
          'type [\n' +
          'ls -l /usr/bin/[\n' +
          'type -a [[' },

        { t: 'code', where: 'out', nocopy: true, code:
          'co nguoi dung root\n' +
          '/etc/hostname la file thuong\n' +
          '/khong/co khong phai thu muc\n' +
          '[ is a shell builtin\n' +
          'lrwxrwxrwx 1 root root 28 Mar 30 23:50 /usr/bin/[ -> ../lib/cargo/bin/coreutils/[\n' +
          '[[ is a shell keyword' },

        { t: 'cal', kind: 'why', title: 'Có thật một chương trình tên là "[" trên đĩa', x:
          '<p><code>type [</code> nói nó là lệnh dựng sẵn của shell — bash tự xử lý cho nhanh. ' +
          'Nhưng <code>ls -l /usr/bin/[</code> chứng minh <b>vẫn tồn tại một file thật</b> mang ' +
          'cái tên đó, để các chương trình khác (như <code>find -exec</code>) cũng gọi được. ' +
          'Trên Ubuntu 26.04 nó trỏ vào bộ uutils viết bằng Rust mà bạn đã gặp ở Bài 12.</p>' +
          '<p><code>[[</code> thì khác hẳn: nó là <b>từ khoá</b>, bash phân tích ngay ở tầng cú ' +
          'pháp. Vì thế <code>[[ ]]</code> không bị tách từ và không cần bọc nháy — nhưng cũng ' +
          'vì thế nó chỉ có trong bash.</p>' +
          '<p>Hệ quả thực dụng của việc <code>[</code> là một lệnh: <b>phải có khoảng trắng ' +
          'quanh nó</b>, y như quanh bất kỳ tên lệnh nào. <code>[$x = 1]</code> báo ' +
          '<code>command not found</code> đúng như khi bạn gõ sai tên một lệnh.</p>' },

        { t: 'p', x: 'Bây giờ là cái bẫy đắt giá nhất trong bài. Hãy chạy và quan sát kỹ.' },

        { t: 'code', where: 'wsl', code:
          'ls\n' +
          'bash -c \'so=15; if [ "$so" > 10 ]; then echo "nhanh then da chay"; fi\'\n' +
          'ls' },

        { t: 'code', where: 'out', nocopy: true, code:
          'chuachmod.sh  cochao.sh  crlf.sh  ifla.sh  khongco.sh  mtv.sh\n' +
          'nguyhiem.sh   nhay.sh    sai.sh   sao.sh   sosanh.sh   tachtu.sh  thumuc\n' +
          'nhanh then da chay\n' +
          '10            chuachmod.sh  cochao.sh  crlf.sh  ifla.sh  khongco.sh  mtv.sh\n' +
          'nguyhiem.sh   nhay.sh       sai.sh     sao.sh   sosanh.sh  tachtu.sh  thumuc' },

        { t: 'cal', kind: 'danger', title: 'Một file tên "10" vừa xuất hiện trong thư mục của bạn', x:
          '<p>Bash không hề so sánh gì. Nó đọc <code>&gt; 10</code> là <b>chuyển hướng đầu ra ' +
          'vào file tên <code>10</code></b>, tạo file đó ra, rồi chạy phần còn lại là ' +
          '<code>[ "15" ]</code> — nghĩa là "chuỗi này có nội dung không?" — và câu trả lời ' +
          'luôn là có.</p>' +
          '<p>Đổi <code>so=15</code> thành <code>so=3</code> thì nhánh <code>then</code> ' +
          '<b>vẫn</b> chạy. Điều kiện của bạn hoàn toàn vô nghĩa, mà script không hề báo lỗi.</p>' +
          '<p>Viết đúng: <code>[ "$so" -gt 10 ]</code>. Hoặc <code>(( so &gt; 10 ))</code> nếu ' +
          'bạn thích ký hiệu toán học — trong ngoặc kép đó, <code>&gt;</code> mang đúng nghĩa ' +
          '"lớn hơn". Xoá file rác đi bằng <code>rm 10</code>.</p>' },

        { t: 'p', x:
          'Một bẫy nữa cùng họ: biến rỗng làm hỏng cú pháp của <code>[</code>.' },

        { t: 'code', where: 'wsl', code:
          'rm -f 10\n' +
          'bash -c \'x=""; if [ $x = "abc" ]; then echo yes; fi\'\n' +
          'bash -c \'x=""; if [ "$x" = "abc" ]; then echo yes; else echo "co nhay: chay binh thuong"; fi\'' },

        { t: 'code', where: 'out', nocopy: true, code:
          'bash: line 1: [: =: unary operator expected\n' +
          'co nhay: chay binh thuong' },

        { t: 'cal', kind: 'why', title: 'Vì sao thiếu nháy lại thành lỗi cú pháp', x:
          '<p>Biến rỗng, không nháy, nên nó <b>biến mất hoàn toàn</b> khỏi dòng lệnh. ' +
          '<code>[ $x = "abc" ]</code> trở thành <code>[ = "abc" ]</code> — lệnh <code>[</code> ' +
          'nhận được hai tham số bắt đầu bằng toán tử <code>=</code> và không hiểu nổi.</p>' +
          '<p>Có nháy, <code>[ "" = "abc" ]</code> vẫn đủ ba tham số và so sánh bình thường, trả ' +
          'lời "không bằng nhau". Đây là lý do vì sao trong bảng ở phần lý thuyết, ' +
          '<code>-z "$x"</code> luôn được viết kèm dấu nháy.</p>' },

        { t: 'p', x:
          'Kết thúc bước này bằng <code>case</code> và vòng lặp — hai thứ bạn sẽ dùng nguyên xi ' +
          'trong script build ở bước 6.' },

        { t: 'code', where: 'wsl', code:
          'cat > case.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'for kt in arm64 armhf x86_64 mips; do\n' +
          '  case "$kt" in\n' +
          '    arm64)        echo "$kt -> aarch64-linux-gnu-gcc" ;;\n' +
          '    armhf|arm)    echo "$kt -> arm-linux-gnueabihf-gcc" ;;\n' +
          '    x86_64|amd64) echo "$kt -> gcc" ;;\n' +
          '    *)            echo "$kt -> chua ho tro" ;;\n' +
          '  esac\n' +
          'done\n' +
          'EOF\n' +
          'bash case.sh' },

        { t: 'code', where: 'out', nocopy: true, code:
          'arm64 -> aarch64-linux-gnu-gcc\n' +
          'armhf -> arm-linux-gnueabihf-gcc\n' +
          'x86_64 -> gcc\n' +
          'mips -> chua ho tro' },

        { t: 'code', where: 'wsl', code:
          'cat > lap.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'for f in *.sh; do\n' +
          '  printf "%-14s %s dong\\n" "$f" "$(wc -l < "$f")"\n' +
          'done | head -5\n' +
          'echo "--- while doc tung dong"\n' +
          'head -3 /etc/passwd | while IFS=: read -r ten _ uid _; do\n' +
          '  echo "nguoi dung $ten co UID $uid"\n' +
          'done\n' +
          'EOF\n' +
          'bash lap.sh' },

        { t: 'code', where: 'out', nocopy: true, code:
          'case.sh        9 dong\n' +
          'chuachmod.sh   2 dong\n' +
          'chuadat.sh     7 dong\n' +
          'cochao.sh      2 dong\n' +
          'crlf.sh        2 dong\n' +
          '--- while doc tung dong\n' +
          'nguoi dung root co UID 0\n' +
          'nguoi dung daemon co UID 1\n' +
          'nguoi dung bin co UID 2' },

        { t: 'cmdx', cmd: 'while IFS=: read -r ten _ uid _; do … done', title: 'Mẫu đọc file theo dòng — học một lần, dùng mãi',
          rows: [
            ['<code>IFS=:</code>', 'Đặt ký tự phân tách <b>chỉ cho lệnh này</b>', '<code>/etc/passwd</code> ngăn trường bằng dấu hai chấm'],
            ['<code>read -r</code>', 'Đọc một dòng, cắt theo IFS, gán vào các biến', '<b><code>-r</code> là bắt buộc</b>: không có nó, dấu <code>\\</code> trong dữ liệu bị nuốt'],
            ['<code>ten _ uid _</code>', 'Bốn biến. <code>_</code> là quy ước "không quan tâm"', 'Biến <b>cuối cùng</b> nhận hết phần dư của dòng'],
            ['<code>for</code> hay <code>while</code>?', '<code>for</code> duyệt danh sách <b>đã biết</b>, <code>while read</code> duyệt <b>dòng</b>', 'Đừng dùng <code>for dong in $(cat f)</code> — nó tách theo khoảng trắng chứ không theo dòng']
          ]}
      ]},

      /* ─────────── BƯỚC 4 ─────────── */
      { title: 'Bước 4 — Hàm và tham số', blocks: [
        { t: 'p', x:
          'Hàm là cách bạn đặt tên cho một ý tưởng. Hai hàm dưới đây — một để ghi log có mốc ' +
          'thời gian, một để kiểm tra công cụ có tồn tại — sẽ đi thẳng vào script build ở bước 6 ' +
          'mà không cần sửa gì.' },

        { t: 'code', where: 'wsl', code:
          'cat > ham.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'log() {\n' +
          '  echo "[$(date +%H:%M:%S)] $*"\n' +
          '}\n' +
          'kiem_tra_lenh() {\n' +
          '  local lenh="$1"\n' +
          '  if command -v "$lenh" > /dev/null 2>&1; then\n' +
          '    echo "co    : $lenh -> $(command -v "$lenh")"\n' +
          '    return 0\n' +
          '  else\n' +
          '    echo "thieu : $lenh"\n' +
          '    return 1\n' +
          '  fi\n' +
          '}\n' +
          'log "bat dau kiem tra"\n' +
          'kiem_tra_lenh gcc\n' +
          'kiem_tra_lenh aarch64-linux-gnu-gcc\n' +
          'kiem_tra_lenh congcukhongtontai\n' +
          'echo "ma tra ve cua lan cuoi = $?"\n' +
          'log "xong"\n' +
          'EOF\n' +
          'bash ham.sh' },

        { t: 'code', where: 'out', nocopy: true, code:
          '[18:03:15] bat dau kiem tra\n' +
          'co    : gcc -> /usr/bin/gcc\n' +
          'co    : aarch64-linux-gnu-gcc -> /usr/bin/aarch64-linux-gnu-gcc\n' +
          'thieu : congcukhongtontai\n' +
          'ma tra ve cua lan cuoi = 1\n' +
          '[18:03:15] xong' },

        { t: 'cmdx', cmd: 'kiem_tra_lenh()', title: 'Bốn quyết định thiết kế trong mười dòng',
          rows: [
            ['<code>local lenh="$1"</code>', 'Đặt tên cho tham số ngay dòng đầu', 'Đọc dễ hơn hẳn việc rải <code>$1</code> khắp hàm. <code>local</code> ngăn nó rò ra ngoài'],
            ['<code>command -v</code>', 'Hỏi "lệnh này có tồn tại không" và in đường dẫn', '<b>Chuẩn POSIX</b>, chạy được cả trên dash. <code>which</code> thì không phải lúc nào cũng có'],
            ['<code>&gt; /dev/null 2&gt;&amp;1</code>', 'Vứt cả đầu ra lẫn báo lỗi', 'Ta chỉ cần <b>mã trả về</b>, không cần chữ'],
            ['<code>return 0</code> / <code>return 1</code>', 'Hàm trả về <b>trạng thái</b>, không phải giá trị', 'Nhờ đó gọi được <code>if kiem_tra_lenh gcc; then …</code>']
          ]},

        { t: 'cal', kind: 'why', title: 'Hàm bash trả về trạng thái, không trả về giá trị', x:
          '<p>Đây là điểm khác biệt lớn nhất so với các ngôn ngữ khác. <code>return 1</code> ' +
          '<b>không</b> trả số 1 cho người gọi — nó đặt mã trạng thái, đọc bằng ' +
          '<code>$?</code>.</p>' +
          '<p>Muốn hàm trả về một <i>giá trị</i> thì <code>echo</code> nó ra và người gọi bắt lấy ' +
          'bằng <code>ket_qua="$(ten_ham)"</code>. Đó là lý do hàm <code>kiem_tra_lenh</code> ở ' +
          'trên phải nuốt đầu ra của <code>command -v</code> — nếu để nó in bừa, mọi lời gọi ' +
          'kiểu <code>$(…)</code> sẽ nhận rác.</p>' +
          '<p>Nhớ: <code>return</code> thoát khỏi <b>hàm</b>, <code>exit</code> thoát khỏi ' +
          '<b>cả script</b>.</p>' },

        { t: 'p', x: 'Bây giờ tới tham số dòng lệnh, thứ biến script thành công cụ dùng lại được.' },

        { t: 'code', where: 'wsl', code:
          'cat > thamso.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'echo "ten script : $0"\n' +
          'echo "tham so 1  : $1"\n' +
          'echo "tham so 2  : $2"\n' +
          'echo "so tham so : $#"\n' +
          'echo "tat ca     : $@"\n' +
          'for t in "$@"; do\n' +
          '  echo "  [$t]"\n' +
          'done\n' +
          'EOF\n' +
          'chmod +x thamso.sh\n' +
          './thamso.sh arm64 "ban dung nhieu tu"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'ten script : ./thamso.sh\n' +
          'tham so 1  : arm64\n' +
          'tham so 2  : ban dung nhieu tu\n' +
          'so tham so : 2\n' +
          'tat ca     : arm64 ban dung nhieu tu\n' +
          '  [arm64]\n' +
          '  [ban dung nhieu tu]' },

        { t: 'p', x:
          'Chú ý <code>$#</code> bằng <b>2</b> chứ không phải 5: dấu nháy khi <i>gọi</i> script ' +
          'đã giữ "ban dung nhieu tu" thành một tham số. Bây giờ so sánh ' +
          '<code>"$@"</code> với <code>"$*"</code>.' },

        { t: 'code', where: 'wsl', code:
          'cat > saoat.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'echo \'dung "$@":\'\n' +
          'for t in "$@"; do echo "  [$t]"; done\n' +
          'echo \'dung "$*":\'\n' +
          'for t in "$*"; do echo "  [$t]"; done\n' +
          'EOF\n' +
          'bash saoat.sh mot "hai ba" bon' },

        { t: 'code', where: 'out', nocopy: true, code:
          'dung "$@":\n' +
          '  [mot]\n' +
          '  [hai ba]\n' +
          '  [bon]\n' +
          'dung "$*":\n' +
          '  [mot hai ba bon]' },

        { t: 'cal', kind: 'warn', title: 'Ba dòng so với một dòng — ranh giới tham số đã biến mất', x:
          '<p><code>"$@"</code> giữ nguyên ba tham số, trong đó <code>hai ba</code> vẫn liền ' +
          'khối. <code>"$*"</code> nối tất cả thành một chuỗi và <b>không có cách nào khôi ' +
          'phục</b> ranh giới ban đầu.</p>' +
          '<p>Hậu quả thật: script của bạn nhận danh sách tên file rồi chuyển tiếp cho ' +
          '<code>gcc</code>. Dùng <code>"$*"</code> là mọi tên file có khoảng trắng đều hỏng.</p>' +
          '<p>Quy tắc: <b>chuyển tiếp thì <code>"$@"</code>, hiển thị thì <code>"$*"</code></b> — ' +
          'đúng như hàm <code>log()</code> ở trên dùng <code>$*</code> vì nó chỉ in ra màn ' +
          'hình.</p>' }
      ]},

      /* ─────────── BƯỚC 5 ─────────── */
      { title: 'Bước 5 — Ba công tắc an toàn, here-doc và trap', blocks: [
        { t: 'p', x:
          'Bước này chứng minh vì sao ba dòng <code>set -euo pipefail</code> không phải là nghi ' +
          'thức mê tín. Bắt đầu bằng một script <b>không</b> có chúng.' },

        { t: 'code', where: 'wsl', code:
          'cat > khongset.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'thumuc="/khong/ton/tai"\n' +
          'cd "$thumuc"\n' +
          'echo "van chay tiep, va bay gio dang o: $(pwd)"\n' +
          'echo "gia su o day co lenh rm -rf ./build"\n' +
          'EOF\n' +
          'bash khongset.sh\n' +
          'echo "rc=$?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'khongset.sh: line 3: cd: /khong/ton/tai: No such file or directory\n' +
          'van chay tiep, va bay gio dang o: /home/shinarus/b13\n' +
          'gia su o day co lenh rm -rf ./build\n' +
          'rc=0' },

        { t: 'cal', kind: 'danger', title: 'Đọc lại dòng thứ hai của kết quả — đó là toàn bộ vấn đề', x:
          '<p><code>cd</code> thất bại. Script <b>vẫn chạy tiếp</b>, nhưng nó đang đứng ở ' +
          '<code>~/b13</code> chứ không phải nơi nó tưởng. Dòng tiếp theo — trong đời thật là ' +
          '<code>rm -rf ./build</code> hoặc <code>make install</code> — sẽ tác động lên ' +
          '<b>nhầm thư mục</b>.</p>' +
          '<p>Và mã trả về cuối cùng là <b>0</b>: với hệ thống CI, script này vừa "thành công". ' +
          'Đây chính là kiểu hỏng tệ nhất — hỏng mà không ai biết.</p>' },

        { t: 'p', x: 'Thêm đúng một dòng <code>set -e</code>:' },

        { t: 'code', where: 'wsl', code:
          'cat > coset.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'set -e\n' +
          'thumuc="/khong/ton/tai"\n' +
          'cd "$thumuc"\n' +
          'echo "dong nay khong bao gio in ra"\n' +
          'EOF\n' +
          'bash coset.sh\n' +
          'echo "rc=$?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'coset.sh: line 4: cd: /khong/ton/tai: No such file or directory\n' +
          'rc=1' },

        { t: 'p', x:
          'Dừng ngay tại chỗ, mã trả về <b>1</b>. Bây giờ tới <code>set -u</code>, thứ bắt lỗi ' +
          'gõ nhầm tên biến — hãy nhìn kỹ, trong script dưới đây có một chữ cái bị thiếu.' },

        { t: 'code', where: 'wsl', code:
          'cat > setu.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'set -u\n' +
          'thu_muc_build="/tmp/build-test"\n' +
          'echo "chuan bi xoa: $thu_muc_buld"\n' +
          'EOF\n' +
          'bash setu.sh\n' +
          'echo "rc=$?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'setu.sh: line 4: thu_muc_buld: unbound variable\n' +
          'rc=1' },

        { t: 'cal', kind: 'why', title: 'set -u chính là lớp bảo vệ đã thiếu ở bước 2', x:
          '<p>Biến tên <code>thu_muc_buld</code> (thiếu chữ <code>i</code>) chưa từng được gán. ' +
          'Không có <code>set -u</code>, bash lặng lẽ thay nó bằng chuỗi rỗng — và ' +
          '<code>rm -rf $thu_muc_buld/</code> sẽ thành <code>rm -rf /</code>, đúng thảm hoạ bạn ' +
          'đã thấy ở bước 2.</p>' +
          '<p>Có <code>set -u</code>, script chết ngay tại dòng đó với thông báo chỉ thẳng vào ' +
          'tên biến sai. Một dòng cấu hình đổi lấy cả một lớp lỗi.</p>' +
          '<p>Khi bạn <i>cố ý</i> muốn một biến có thể chưa đặt, viết ' +
          '<code>${bien:-}</code> — cú pháp giá trị mặc định ở bước 2 vô hiệu hoá ' +
          '<code>set -u</code> cho riêng chỗ đó.</p>' },

        { t: 'p', x:
          'Công tắc thứ ba khó thấy nhất. Một đường ống trả về mã của lệnh <b>cuối cùng</b>, nên ' +
          'lệnh đầu có chết cũng không ai biết.' },

        { t: 'code', where: 'wsl', code:
          'cat > pipe.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'echo "--- khong co pipefail"\n' +
          'false | true\n' +
          'echo "ma tra ve = $?"\n' +
          'set -o pipefail\n' +
          'echo "--- co pipefail"\n' +
          'false | true\n' +
          'echo "ma tra ve = $?"\n' +
          'EOF\n' +
          'bash pipe.sh' },

        { t: 'code', where: 'out', nocopy: true, code:
          '--- khong co pipefail\n' +
          'ma tra ve = 0\n' +
          '--- co pipefail\n' +
          'ma tra ve = 1' },

        { t: 'cal', kind: 'warn', title: 'Vì sao pipefail là bắt buộc với người làm nhúng', x:
          '<p><code>false</code> thất bại, <code>true</code> thành công, và cả đường ống báo ' +
          '<b>0</b>. Đổi sang tình huống thật: ' +
          '<code>make 2&gt;&amp;1 | tee build.log</code>. <code>tee</code> gần như luôn thành ' +
          'công, nên script của bạn sẽ báo build thành công <b>kể cả khi <code>make</code> chết ' +
          'ngay dòng đầu</b>.</p>' +
          '<p>Từ Chặng 07 trở đi bạn sẽ ghi log mọi lần biên dịch kernel bằng đúng mẫu ' +
          '<code>| tee</code> đó. Không có <code>pipefail</code>, bạn sẽ mất hàng giờ để hiểu vì ' +
          'sao "build thành công" mà không có file ảnh nào được sinh ra.</p>' },

        { t: 'p', x:
          'Ba công tắc hợp lại. Nhưng <code>set -e</code> có một ngoại lệ mà bạn phải tự tay ' +
          'kiểm chứng, nếu không sẽ tưởng nó hỏng:' },

        { t: 'code', where: 'wsl', code:
          'cat > baye.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'set -e\n' +
          'if grep -q khongcogi /etc/passwd; then\n' +
          '  echo "tim thay"\n' +
          'else\n' +
          '  echo "khong tim thay - va script VAN chay tiep"\n' +
          'fi\n' +
          'echo "den cuoi script"\n' +
          'EOF\n' +
          'bash baye.sh\n' +
          'echo "rc=$?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'khong tim thay - va script VAN chay tiep\n' +
          'den cuoi script\n' +
          'rc=0' },

        { t: 'cal', kind: 'info', title: 'grep trả về 1 nhưng script không chết — đúng như thiết kế', x:
          '<p>Lệnh nằm trong điều kiện của <code>if</code>, <code>while</code>, sau ' +
          '<code>&amp;&amp;</code>, <code>||</code>, hoặc sau <code>!</code> đều <b>miễn nhiễm</b> ' +
          'với <code>set -e</code>. Nếu không thì <code>if</code> sẽ vô nghĩa: mọi điều kiện sai ' +
          'đều giết script.</p>' +
          '<p>Nhờ vậy bạn có hai cách viết một lệnh "được phép thất bại":</p>' +
          '<p><code>if ! lenh_co_the_that_bai; then xu_ly_loi; fi</code></p>' +
          '<p><code>lenh_co_the_that_bai || true</code></p>' +
          '<p>Cách thứ hai đọc là "chạy lệnh, nếu hỏng thì coi như xong" — bạn sẽ thấy nó khắp ' +
          'các script build thật.</p>' },

        { t: 'p', x:
          'Chuyển sang here-doc. Đây là cách một script <b>sinh ra file cấu hình</b> — việc bạn ' +
          'sẽ làm liên tục từ Chặng 09 khi tạo script <code>init</code> cho rootfs.' },

        { t: 'code', where: 'wsl', code:
          'cat > heredoc.sh <<\'OUTER\'\n' +
          '#!/bin/bash\n' +
          'ten="arm64"\n' +
          'cat > cauhinh.txt <<EOF\n' +
          'kien truc = $ten\n' +
          'ngay tao  = $(date +%Y-%m-%d)\n' +
          'EOF\n' +
          'echo "--- co thay the bien:"\n' +
          'cat cauhinh.txt\n' +
          'cat > nguyenban.txt <<\'EOF\'\n' +
          'kien truc = $ten\n' +
          'lenh      = $(date)\n' +
          'EOF\n' +
          'echo "--- KHONG thay the (nhay quanh EOF):"\n' +
          'cat nguyenban.txt\n' +
          'OUTER\n' +
          'bash heredoc.sh' },

        { t: 'code', where: 'out', nocopy: true, code:
          '--- co thay the bien:\n' +
          'kien truc = arm64\n' +
          'ngay tao  = 2026-08-01\n' +
          '--- KHONG thay the (nhay quanh EOF):\n' +
          'kien truc = $ten\n' +
          'lenh      = $(date)' },

        { t: 'cal', kind: 'tip', title: 'Dấu nháy quanh EOF quyết định tất cả', x:
          '<p><code>&lt;&lt;EOF</code> — bash thay thế biến và lệnh. Dùng khi bạn muốn <b>nhúng ' +
          'giá trị</b> vào file được sinh ra.</p>' +
          '<p><code>&lt;&lt;\'EOF\'</code> — không thay thế gì cả, chép nguyên xi. Dùng khi nội ' +
          'dung <b>chính nó là một script</b> có chứa <code>$</code>.</p>' +
          '<p>Chính vì lý do này mà mọi khối lệnh trong bài học hôm nay đều dùng ' +
          '<code>&lt;&lt;\'EOF\'</code>: nếu không, bash sẽ thay <code>$1</code> và ' +
          '<code>$(date)</code> <b>ngay lúc tạo file</b>, và bạn nhận được một script rỗng nghĩa. ' +
          'Đây là lỗi số một khi người ta viết script sinh ra script khác.</p>' },

        { t: 'p', x:
          'Cuối cùng: cặp <code>mktemp</code> + <code>trap</code>, khuôn mẫu dọn dẹp mà mọi ' +
          'script build nghiêm túc đều dùng.' },

        { t: 'code', where: 'wsl', code:
          'cat > trapfail.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'set -euo pipefail\n' +
          'tam="$(mktemp -d)"\n' +
          'trap \'echo "  [trap] don dep $tam"; rm -rf "$tam"\' EXIT\n' +
          'echo "thu muc tam: $tam"\n' +
          'false\n' +
          'echo "khong bao gio in ra"\n' +
          'EOF\n' +
          'bash trapfail.sh\n' +
          'echo "rc=$?"\n' +
          'ls -d /tmp/tmp.* 2>/dev/null | wc -l' },

        { t: 'code', where: 'out', nocopy: true, code:
          'thu muc tam: /tmp/tmp.tDL53NGosZ\n' +
          '  [trap] don dep /tmp/tmp.tDL53NGosZ\n' +
          'rc=1\n' +
          '0' },

        { t: 'cmdx', cmd: 'trap \'rm -rf "$tam"\' EXIT', title: 'Bốn chi tiết làm nên sự khác biệt',
          rows: [
            ['<code>mktemp -d</code>', 'Nhân tạo một thư mục tên <b>ngẫu nhiên</b>, không trùng', 'Tự viết <code>/tmp/build</code> là mời gọi hai lần chạy song song giẫm lên nhau'],
            ['<code>trap … EXIT</code>', 'Chạy lệnh này khi script kết thúc, <b>bằng mọi cách</b>', 'Thành công, thất bại, hay <kbd>Ctrl</kbd>+<kbd>C</kbd> — đều chạy'],
            ['Nháy <b>đơn</b> quanh lệnh trap', 'Hoãn việc thay <code>$tam</code> tới <b>lúc trap chạy</b>', 'Nháy kép sẽ chốt giá trị ngay lúc đăng ký — hỏng nếu biến đổi sau đó'],
            ['Đặt trap ngay sau mktemp', 'Không để khoảng trống nào giữa "tạo" và "hẹn xoá"', 'Bất kỳ lệnh nào chen vào giữa cũng có thể chết và bỏ lại rác']
          ]},

        { t: 'cal', kind: 'why', title: 'Script chết ở dòng "false" mà thư mục tạm vẫn được xoá', x:
          '<p>Đó là toàn bộ lý do <code>trap</code> tồn tại. Nếu bạn viết <code>rm -rf "$tam"</code> ' +
          'ở dòng cuối script, thì mọi lần script thất bại giữa chừng đều để lại một thư mục ' +
          'rác trong <code>/tmp</code>.</p>' +
          '<p><code>ls -d /tmp/tmp.* | wc -l</code> trả về <b>0</b>: không còn gì sót lại. Với ' +
          'kernel ở Chặng 07 và Buildroot ở Chặng 11, mỗi thư mục tạm bị bỏ quên là hàng trăm ' +
          'megabyte. ' +
          'Đây không phải chuyện sạch sẽ cho vui — đó là dung lượng đĩa thật.</p>' }
      ]},

      /* ─────────── BƯỚC 6 ─────────── */
      { title: 'Bước 6 — Ghép tất cả: script build cho ARM64', blocks: [
        { t: 'p', x:
          'Đây là đích đến của cả bài. Một script nhận kiến trúc làm tham số, tự chọn trình biên ' +
          'dịch chéo, kiểm tra công cụ và mã nguồn, biên dịch trong thư mục tạm, báo cáo kích ' +
          'thước và định dạng, rồi dọn sạch sau lưng. Mọi kỹ thuật trong đó bạn đều vừa thực ' +
          'hành ở năm bước trước.' },

        { t: 'code', where: 'wsl', code:
          'mkdir -p ~/b13/capstone && cd ~/b13/capstone\n' +
          'cat > hello.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    printf("Xin chao tu Embedded Linux\\n");\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF' },

        { t: 'code', where: 'file', name: '~/b13/capstone/build.sh', lang: 'bash', code:
          '#!/bin/bash\n' +
          'set -euo pipefail\n' +
          '\n' +
          'KIEN_TRUC="${1:-arm64}"\n' +
          'NGUON="${2:-hello.c}"\n' +
          '\n' +
          'TAM="$(mktemp -d)"\n' +
          'trap \'rm -rf "$TAM"\' EXIT\n' +
          '\n' +
          'log() { printf \'[%s] %s\\n\' "$(date +%H:%M:%S)" "$*"; }\n' +
          'loi() { printf \'[LOI] %s\\n\' "$*" >&2; exit 1; }\n' +
          '\n' +
          'can_co() {\n' +
          '  local lenh="$1"\n' +
          '  command -v "$lenh" > /dev/null 2>&1 || loi "thieu cong cu: $lenh"\n' +
          '  log "co $lenh -> $(command -v "$lenh")"\n' +
          '}\n' +
          '\n' +
          'case "$KIEN_TRUC" in\n' +
          '  arm64)      CC="aarch64-linux-gnu-gcc"; CO_THEM=(-static) ;;\n' +
          '  x86|amd64)  CC="gcc";                   CO_THEM=() ;;\n' +
          '  *)          loi "kien truc chua ho tro: $KIEN_TRUC" ;;\n' +
          'esac\n' +
          '\n' +
          'can_co "$CC"\n' +
          '[ -f "$NGUON" ] || loi "khong tim thay ma nguon: $NGUON"\n' +
          '\n' +
          'DICH="$TAM/hello-$KIEN_TRUC"\n' +
          'log "bien dich $NGUON cho $KIEN_TRUC"\n' +
          '"$CC" "${CO_THEM[@]}" -o "$DICH" "$NGUON"\n' +
          '\n' +
          'log "kich thuoc: $(stat -c %s "$DICH") byte"\n' +
          'log "dinh dang : $(file -b "$DICH" | cut -d, -f1-2)"\n' +
          '\n' +
          'cp "$DICH" "./hello-$KIEN_TRUC"\n' +
          'log "ket qua   : ./hello-$KIEN_TRUC"',
          notes: [
            'Tạo file này bằng trình soạn thảo, hoặc bằng here-doc <code>cat &gt; build.sh &lt;&lt;\'EOF\'</code> — <b>nhớ dấu nháy quanh EOF</b>, nếu không mọi <code>$1</code> và <code>$(date)</code> sẽ bị thay thế ngay lúc tạo file.',
            'Sau khi tạo xong, nhớ <code>chmod +x build.sh</code>.'
          ] },

        { t: 'cmdx', cmd: 'build.sh', title: 'Từng dòng, và nó đến từ bước nào',
          rows: [
            ['<code>set -euo pipefail</code>', 'Ba công tắc an toàn', 'Bước 5'],
            ['<code>KIEN_TRUC="${1:-arm64}"</code>', 'Tham số 1, mặc định <code>arm64</code>', 'Bước 2 (giá trị mặc định) + bước 4 (tham số)'],
            ['<code>TAM="$(mktemp -d)"</code>', 'Thư mục tạm riêng cho lần chạy này', 'Bước 5'],
            ['<code>trap \'rm -rf "$TAM"\' EXIT</code>', 'Hẹn xoá, chạy dù thành công hay thất bại', 'Bước 5'],
            ['<code>log()</code> / <code>loi()</code>', 'Hai hàm in thông báo. <code>loi()</code> ghi ra <b>stderr</b> rồi <code>exit 1</code>', 'Bước 4'],
            ['<code>can_co()</code>', 'Kiểm tra công cụ, chết ngay nếu thiếu', 'Bước 4'],
            ['<code>case "$KIEN_TRUC" in</code>', 'Chọn trình biên dịch theo kiến trúc', 'Bước 3'],
            ['<code>CO_THEM=(-static)</code>', 'Một <b>mảng</b> chứa cờ thêm', 'ARM64 dùng <code>-static</code> vì WSL không có thư viện ARM64 — Bài 3'],
            ['<code>"${CO_THEM[@]}"</code>', 'Bung mảng thành các tham số riêng biệt', 'Cùng nguyên lý <code>"$@"</code> ở bước 4'],
            ['<code>[ -f "$NGUON" ] || loi …</code>', 'Kiểm tra file tồn tại', 'Bước 3, dạng viết tắt của <code>if</code>'],
            ['<code>cp "$DICH" "./hello-…"</code>', 'Chỉ chép kết quả ra ngoài <b>khi đã thành công</b>', 'Nếu biên dịch hỏng, không có file rác nào xuất hiện']
          ]},

        { t: 'p', x: 'Chạy thử. Trước hết là bản x86 quen thuộc:' },

        { t: 'code', where: 'wsl', code:
          'chmod +x build.sh\n' +
          './build.sh x86\n' +
          'echo "rc=$?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          '[18:16:02] co gcc -> /usr/bin/gcc\n' +
          '[18:16:02] bien dich hello.c cho x86\n' +
          '[18:16:02] kich thuoc: 15952 byte\n' +
          '[18:16:02] dinh dang : ELF 64-bit LSB pie executable, x86-64\n' +
          '[18:16:02] ket qua   : ./hello-x86\n' +
          'rc=0' },

        { t: 'p', x: 'Bây giờ là điều bài học này hướng tới — biên dịch chéo cho ARM64:' },

        { t: 'code', where: 'wsl', code:
          './build.sh arm64\n' +
          'echo "rc=$?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          '[18:16:02] co aarch64-linux-gnu-gcc -> /usr/bin/aarch64-linux-gnu-gcc\n' +
          '[18:16:02] bien dich hello.c cho arm64\n' +
          '[18:16:03] kich thuoc: 705328 byte\n' +
          '[18:16:03] dinh dang : ELF 64-bit LSB executable, ARM aarch64\n' +
          '[18:16:03] ket qua   : ./hello-arm64\n' +
          'rc=0' },

        { t: 'cal', kind: 'info', title: 'Hai con số này bạn đã gặp ở Bài 3 — giờ script tự đo được chúng', x:
          '<p><b>15 952</b> byte cho x86 động, <b>705 328</b> byte cho ARM64 tĩnh — tỷ lệ ' +
          '<b>44,2 lần</b>. Ở Bài 3 bạn phải tự gõ <code>ls -l</code> và tự so sánh; ở đây script ' +
          'gọi <code>stat -c %s</code> và <code>file -b</code> rồi báo cáo giúp bạn.</p>' +
          '<p>Đó chính là bước chuyển từ "người dùng dòng lệnh" sang "kỹ sư": việc đo đạc được ' +
          'ghi vào script nên nó lặp lại được, không phụ thuộc trí nhớ, và chạy y hệt trên máy ' +
          'người khác.</p>' },

        { t: 'p', x:
          'Ba đường thất bại. Không tham số — dùng mặc định; kiến trúc lạ; và thiếu mã nguồn.' },

        { t: 'code', where: 'wsl', code:
          './build.sh\n' +
          'echo "rc=$?"\n' +
          './build.sh mips\n' +
          'echo "rc=$?"\n' +
          './build.sh x86 khongco.c\n' +
          'echo "rc=$?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          '[18:16:03] co aarch64-linux-gnu-gcc -> /usr/bin/aarch64-linux-gnu-gcc\n' +
          '[18:16:03] bien dich hello.c cho arm64\n' +
          '[18:16:03] kich thuoc: 705328 byte\n' +
          '[18:16:03] dinh dang : ELF 64-bit LSB executable, ARM aarch64\n' +
          '[18:16:03] ket qua   : ./hello-arm64\n' +
          'rc=0\n' +
          '[LOI] kien truc chua ho tro: mips\n' +
          'rc=1\n' +
          '[18:16:03] co gcc -> /usr/bin/gcc\n' +
          '[LOI] khong tim thay ma nguon: khongco.c\n' +
          'rc=1' },

        { t: 'cal', kind: 'why', title: 'Mã trả về 1 mới là phần quan trọng nhất của ba dòng này', x:
          '<p>Script không chỉ in thông báo — nó <b>trả về 1</b>. Nhờ vậy một script khác gọi nó ' +
          'có thể viết <code>./build.sh arm64 || exit 1</code> và biết chính xác chuyện gì đã ' +
          'xảy ra.</p>' +
          '<p>Chú ý cả thứ tự kiểm tra: với <code>mips</code>, script chết <b>trước khi</b> làm ' +
          'bất cứ việc gì. Với <code>khongco.c</code>, nó kiểm tra trình biên dịch trước rồi mới ' +
          'phát hiện thiếu mã nguồn. Nguyên tắc: <b>thất bại càng sớm càng tốt, và nói rõ vì ' +
          'sao</b>.</p>' +
          '<p>Thông báo lỗi ra <code>&gt;&amp;2</code> (stderr) chứ không phải stdout, nên khi ai ' +
          'đó chạy <code>./build.sh arm64 &gt; ketqua.log</code>, lỗi vẫn hiện trên màn hình.</p>' },

        { t: 'p', x: 'Kiểm chứng kết quả và, quan trọng hơn, kiểm chứng việc dọn dẹp:' },

        { t: 'code', where: 'wsl', code:
          'ls -l hello-*\n' +
          './hello-x86\n' +
          './hello-arm64\n' +
          'echo "rc=$?"\n' +
          'ls -d /tmp/tmp.* 2>/dev/null | wc -l' },

        { t: 'code', where: 'out', nocopy: true, code:
          '-rwxr-xr-x 1 shinarus shinarus 705328 Aug  1 18:16 hello-arm64\n' +
          '-rwxr-xr-x 1 shinarus shinarus  15952 Aug  1 18:16 hello-x86\n' +
          'Xin chao tu Embedded Linux\n' +
          'bash: ./hello-arm64: cannot execute binary file: Exec format error\n' +
          'rc=126\n' +
          '0' },

        { t: 'cal', kind: 'info', title: 'Exec format error ở đây là dấu hiệu thành công', x:
          '<p>Đúng như Bài 3: file ARM64 <b>không</b> chạy được trên CPU x86, và kernel từ chối ' +
          'với mã <b>126</b> — cùng mã bạn gặp ở bước 1 khi thiếu quyền <code>x</code>. Cả hai ' +
          'đều là "tìm thấy file, nhưng không thực thi được".</p>' +
          '<p>Nếu file này chạy được thì mới đáng lo: nghĩa là bạn đã biên dịch nhầm kiến ' +
          'trúc.</p>' +
          '<p>Và <code>ls -d /tmp/tmp.*</code> trả về <b>0</b> sau năm lần chạy script, kể cả hai ' +
          'lần thất bại. <code>trap</code> đã làm đúng việc của nó.</p>' },

        { t: 'p', x:
          'Ở Chặng 04 bạn sẽ đưa file ARM64 này vào QEMU và <b>thấy nó thật sự in ra dòng chữ ' +
          'đó</b> trên một CPU ARM mô phỏng. Script bạn vừa viết chính là bước đầu tiên của quy ' +
          'trình đó.' }
      ]},

      /* ─────────── BƯỚC 7 ─────────── */
      { title: 'Bước 7 — Gỡ lỗi script, vài mẫu hay dùng, và dọn dẹp', blocks: [
        { t: 'p', x:
          'Hai công cụ gỡ lỗi bạn cần biết. Thứ nhất: kiểm tra cú pháp mà <b>không chạy</b> — ' +
          'vô giá khi script sẽ đụng tới lệnh nguy hiểm.' },

        { t: 'code', where: 'wsl', code:
          'cat > loicuphap.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'if [ -f /etc/hostname ]; then\n' +
          '  echo "co file"\n' +
          'echo "quen fi"\n' +
          'EOF\n' +
          'bash -n loicuphap.sh\n' +
          'echo "rc=$?"\n' +
          'bash -n build.sh\n' +
          'echo "build.sh rc=$?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'loicuphap.sh: line 5: syntax error: unexpected end of file from `if\' command on line 2\n' +
          'rc=2\n' +
          'build.sh rc=0' },

        { t: 'p', x:
          'Thứ hai: <code>bash -x</code> in ra từng lệnh <b>sau khi</b> mọi biến đã được thay ' +
          'thế. Đây là cách nhanh nhất để hiểu vì sao script làm điều bạn không mong đợi.' },

        { t: 'code', where: 'wsl', code: 'bash -x build.sh x86 2>&1 | head -14' },

        { t: 'code', where: 'out', nocopy: true, code:
          '+ set -euo pipefail\n' +
          '+ KIEN_TRUC=x86\n' +
          '+ NGUON=hello.c\n' +
          '++ mktemp -d\n' +
          '+ TAM=/tmp/tmp.H1LiZ9A4Rq\n' +
          '+ trap \'rm -rf "$TAM"\' EXIT\n' +
          '+ case "$KIEN_TRUC" in\n' +
          '+ CC=gcc\n' +
          '+ CO_THEM=()\n' +
          '+ can_co gcc\n' +
          '+ local lenh=gcc\n' +
          '+ command -v gcc\n' +
          '++ command -v gcc\n' +
          '+ log \'co gcc -> /usr/bin/gcc\'' },

        { t: 'cal', kind: 'tip', title: 'Số dấu cộng cho biết bạn đang ở độ sâu nào', x:
          '<p><code>+</code> là lệnh ở mức ngoài cùng. <code>++</code> là lệnh nằm trong một thay ' +
          'thế <code>$(…)</code> hoặc lồng sâu hơn — nhìn dòng ' +
          '<code>++ mktemp -d</code> theo sau là <code>+ TAM=/tmp/tmp.H1LiZ9A4Rq</code>, bạn ' +
          'thấy đúng thứ tự: chạy lệnh trước, gán kết quả sau.</p>' +
          '<p>Điểm mấu chốt: <code>bash -x</code> in ra <b>giá trị đã thay thế</b>, không phải mã ' +
          'nguồn. <code>+ KIEN_TRUC=x86</code> chứng minh <code>${1:-arm64}</code> đã nhận đúng ' +
          'tham số. Khi một biến trống rỗng gây lỗi, dòng <code>-x</code> sẽ phơi bày ngay.</p>' +
          '<p>Bật giữa chừng bằng <code>set -x</code> và tắt bằng <code>set +x</code> — dấu ' +
          '<code>+</code> tắt công tắc, dấu <code>-</code> bật, ngược với trực giác.</p>' },

        { t: 'p', x:
          'Vài mẫu ngắn bạn sẽ dùng thường xuyên. Số học, <code>printf</code>, dạng viết tắt ' +
          'của <code>if</code>, và phân luồng thông báo lỗi:' },

        { t: 'code', where: 'wsl', code:
          'cat > mau.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'a=705328\n' +
          'b=15952\n' +
          'echo "hieu   : $((a - b)) byte"\n' +
          'echo "ty le  : $((a / b)) lan (chia nguyen)"\n' +
          'printf \'%-12s %8d byte\\n\' "hello-arm64" "$a"\n' +
          'printf \'%-12s %8d byte\\n\' "hello-x86" "$b"\n' +
          'command -v gcc > /dev/null && echo "gcc co san"\n' +
          'command -v congcula > /dev/null || echo "congcula khong co"\n' +
          'echo "dong binh thuong"\n' +
          'echo "dong loi" >&2\n' +
          'EOF\n' +
          'bash mau.sh\n' +
          'echo "--- chi giu stdout:"\n' +
          'bash mau.sh 2>/dev/null | tail -2\n' +
          'echo "--- chi giu stderr:"\n' +
          'bash mau.sh 2>&1 >/dev/null' },

        { t: 'code', where: 'out', nocopy: true, code:
          'hieu   : 689376 byte\n' +
          'ty le  : 44 lan (chia nguyen)\n' +
          'hello-arm64    705328 byte\n' +
          'hello-x86       15952 byte\n' +
          'gcc co san\n' +
          'congcula khong co\n' +
          'dong binh thuong\n' +
          'dong loi\n' +
          '--- chi giu stdout:\n' +
          'congcula khong co\n' +
          'dong binh thuong\n' +
          '--- chi giu stderr:\n' +
          'dong loi' },

        { t: 'cmdx', cmd: 'printf \'%-12s %8d byte\\n\' "hello-x86" 15952', title: 'Vì sao script nghiêm túc dùng printf chứ không dùng echo',
          rows: [
            ['<code>%-12s</code>', 'Chuỗi, căn <b>trái</b>, rộng tối thiểu 12 ký tự', 'Bỏ dấu <code>-</code> thì căn phải'],
            ['<code>%8d</code>', 'Số nguyên, căn phải, rộng 8', 'Nhờ đó các con số thẳng cột, dễ đọc'],
            ['<code>\\n</code>', 'Xuống dòng — <b>phải viết tay</b>', '<code>printf</code> không tự thêm, khác <code>echo</code>'],
            ['Tham số lặp lại', 'Nếu còn tham số dư, chuỗi định dạng được <b>dùng lại</b>', '<code>printf \'%s\\n\' a b c</code> in ba dòng'],
            ['Vì sao không dùng <code>echo</code>', '<code>echo</code> xử lý <code>-n</code>, <code>-e</code> và dấu <code>\\</code> <b>khác nhau</b> giữa bash và dash', '<code>printf</code> là chuẩn POSIX, hành xử giống nhau ở mọi nơi']
          ]},

        { t: 'cal', kind: 'info', title: 'Hai dòng chuyển hướng đó không đối xứng như trông thấy', x:
          '<p><code>2&gt;/dev/null</code> vứt stderr, giữ stdout. Dễ hiểu.</p>' +
          '<p><code>2&gt;&amp;1 &gt;/dev/null</code> làm ngược lại — giữ stderr, vứt stdout — và ' +
          '<b>thứ tự là bắt buộc</b>. Nó đọc là: "cho luồng 2 đi cùng nơi luồng 1 đang đi (màn ' +
          'hình), <i>rồi sau đó</i> đổi luồng 1 sang <code>/dev/null</code>". Luồng 2 đã bị sao ' +
          'chép đích rồi nên không đổi theo.</p>' +
          '<p>Viết ngược lại thành <code>&gt;/dev/null 2&gt;&amp;1</code> là vứt <b>cả hai</b> — ' +
          'chính là mẫu bạn dùng trong hàm <code>can_co()</code> ở bước 4. Cùng hai ký hiệu, hai ' +
          'thứ tự, hai kết quả hoàn toàn khác.</p>' },

        { t: 'p', x: 'Dọn dẹp toàn bộ bài thực hành:' },

        { t: 'code', where: 'wsl', code:
          'cd ~ && rm -rf ~/b13\n' +
          'ls -d ~/b13 2>/dev/null || echo "da xoa ~/b13"' },

        { t: 'code', where: 'out', nocopy: true, code: 'da xoa ~/b13' },

        { t: 'cal', kind: 'tip', title: 'Bước tiếp theo tự nhiên: shellcheck', x:
          '<p><code>shellcheck</code> là chương trình đọc script bash và chỉ ra chính xác những ' +
          'lỗi bạn đã gặp hôm nay — thiếu nháy quanh biến, dùng <code>&gt;</code> thay ' +
          '<code>-gt</code>, <code>$*</code> thay <code>"$@"</code>. Trên máy bạn nó chưa được ' +
          'cài; sau Bài 12 thì việc đó chỉ là <code>sudo apt install shellcheck</code>.</p>' +
          '<p>Chạy nó trên mọi script trước khi tin tưởng. Nó bắt được lớp lỗi mà ' +
          '<code>bash -n</code> không thấy: <code>bash -n</code> chỉ kiểm tra cú pháp, còn ' +
          '<code>shellcheck</code> hiểu <i>ý định</i>.</p>' }
      ]},
    ]},

    /* ══════════════════════════════════════════════
       9. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Mọi dòng dưới đây đều xuất hiện thật trong lúc kiểm chứng bài này. Bảng này đáng để đọc ' +
      'lại mỗi khi một script từ chối hợp tác.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>bash: ./x.sh: Permission denied</code> (mã 126)',
         'File chưa có bit thực thi',
         '<code>chmod +x x.sh</code>. Hoặc chạy tạm bằng <code>bash x.sh</code> — đọc file thì chỉ cần quyền <code>r</code>'],

        ['<code>bad interpreter: No such file or directory</code>',
         'Shebang gõ sai, hoặc trình thông dịch không tồn tại',
         'Kiểm tra <code>ls -l /bin/bash</code>. Đọc kỹ đường dẫn trong dòng <code>#!</code>'],

        ['<code>/bin/bash^M: bad interpreter</code>',
         'File lưu với xuống dòng kiểu Windows (CRLF)',
         '<code>sed -i \'s/\\r$//\' x.sh</code> hoặc <code>dos2unix x.sh</code>. Xem bằng <code>cat -A</code>. Đặt trình soạn thảo dùng LF'],

        ['<code>x.sh: line 1: ten: command not found</code> (mã 127)',
         'Có khoảng trắng quanh dấu <code>=</code> khi gán biến',
         'Viết <code>ten="Linux"</code>, không có khoảng trắng nào ở hai bên dấu bằng'],

        ['<code>ls: cannot access \'thumuc/ten\': No such file…</code> lặp nhiều lần',
         'Biến chứa khoảng trắng nhưng không được bọc nháy — bash tách thành nhiều tham số',
         'Luôn viết <code>"$bien"</code>. Đây là lỗi phổ biến nhất trong mọi script bash'],

        ['<code>[: =: unary operator expected</code>',
         'Biến rỗng và không có nháy, nên nó biến mất khỏi dòng lệnh',
         '<code>[ "$x" = "abc" ]</code>. Hoặc dùng <code>[[ ]]</code> vốn không bị tách từ'],

        ['<code>[: too many arguments</code>',
         'Cùng nguyên nhân: biến chứa khoảng trắng, không nháy',
         'Bọc nháy. Với chuỗi nhiều từ, ưu tiên <code>[[ "$x" == "$y" ]]</code>'],

        ['Không báo lỗi, nhưng xuất hiện một file tên <code>10</code>',
         '<code>[ "$so" &gt; 10 ]</code> — <code>&gt;</code> là chuyển hướng, không phải so sánh',
         '<code>[ "$so" -gt 10 ]</code> cho số, hoặc <code>(( so &gt; 10 ))</code>. Xoá file rác bằng <code>rm 10</code>'],

        ['<code>[[: not found</code>',
         'Script chạy bằng <code>sh</code> (dash) chứ không phải bash',
         'Chạy bằng <code>bash x.sh</code>, và đặt shebang <code>#!/bin/bash</code>. Hoặc thay <code>[[ ]]</code> bằng <code>[ ]</code> để giữ tính POSIX'],

        ['<code>x.sh: line 4: bien: unbound variable</code>',
         '<code>set -u</code> đang bật và biến chưa được gán — thường do gõ sai tên',
         'Sửa tên biến. Nếu <b>cố ý</b> cho phép rỗng thì viết <code>${bien:-}</code>'],

        ['<code>syntax error: unexpected end of file</code>',
         'Thiếu <code>fi</code>, <code>done</code>, <code>esac</code> hoặc <code>}</code>',
         '<code>bash -n x.sh</code> chỉ ra dòng mở khối bị bỏ dở. Thụt lề nhất quán để nhìn thấy sớm'],

        ['<code>unexpected EOF while looking for matching `\'\'</code>',
         'Thiếu một dấu nháy đóng',
         '<code>bash -n x.sh</code>. Trình soạn thảo có tô màu cú pháp sẽ hiện rõ vùng bị lệch màu'],

        ['<code>warning: here-document delimited by end-of-file</code>',
         'Từ kết thúc here-doc (<code>EOF</code>) bị thụt lề hoặc gõ sai',
         'Từ kết thúc phải nằm <b>sát lề trái</b>, không khoảng trắng. Dùng <code>&lt;&lt;-EOF</code> nếu cần thụt lề bằng Tab'],

        ['Script sinh ra file thiếu hết nội dung có <code>$</code>',
         'Here-doc viết <code>&lt;&lt;EOF</code> nên biến bị thay thế ngay lúc tạo file',
         'Viết <code>&lt;&lt;\'EOF\'</code> khi nội dung chính nó là script'],

        ['Đường ống báo thành công dù lệnh đầu chết',
         'Bash trả về mã của lệnh <b>cuối</b> trong đường ống',
         '<code>set -o pipefail</code>. Bắt buộc với mẫu <code>make … | tee build.log</code>'],

        ['Script vẫn chạy tiếp sau khi một lệnh thất bại',
         'Chưa bật <code>set -e</code>',
         'Thêm <code>set -euo pipefail</code> ngay dưới shebang'],

        ['Bật <code>set -e</code> rồi mà script vẫn không dừng',
         'Lệnh nằm trong <code>if</code>, <code>while</code>, sau <code>&amp;&amp;</code>, <code>||</code> hoặc <code>!</code> — đó là ngoại lệ có chủ đích',
         'Kiểm tra mã trả về bằng tay ở những chỗ đó, hoặc dùng <code>|| loi "…"</code>'],

        ['<code>/tmp</code> đầy dần sau nhiều lần chạy script',
         'Script tạo thư mục tạm nhưng chết giữa chừng nên không kịp xoá',
         '<code>trap \'rm -rf "$TAM"\' EXIT</code> ngay sau <code>mktemp -d</code>. Kiểm tra bằng <code>ls -d /tmp/tmp.*</code>'],

        ['<code>trap</code> xoá nhầm thư mục, hoặc không xoá gì',
         'Dùng nháy kép quanh lệnh trap nên <code>$TAM</code> bị chốt giá trị lúc đăng ký',
         'Dùng nháy <b>đơn</b>: <code>trap \'rm -rf "$TAM"\' EXIT</code>'],

        ['<code>cannot execute binary file: Exec format error</code> (mã 126)',
         'Chạy file ARM64 trên CPU x86 — đúng như Bài 3',
         'Không phải lỗi của script. Cần QEMU hoặc phần cứng thật, sẽ làm ở Chặng 04'],

        ['Hàm sửa biến nhưng phần còn lại của script không thấy thay đổi',
         'Biến được khai báo <code>local</code> nên chỉ tồn tại trong hàm',
         'Bỏ <code>local</code> nếu <b>cố ý</b> muốn sửa biến toàn cục. Tốt hơn: <code>echo</code> giá trị ra và bắt bằng <code>x="$(ham)"</code>'],

        ['Vòng lặp <code>while read</code> chạy xong mà biến bên trong mất giá trị',
         'Vế phải đường ống chạy trong tiến trình con riêng',
         'Dùng <code>while read … done &lt; file</code> thay vì <code>cat file | while read …</code>']
      ]},

    /* ══════════════════════════════════════════════
       10. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', title: 'Tóm tắt Bài 13', items: [
      'Shebang <code>#!/bin/bash</code> ở <b>dòng đầu tiên</b> nói cho kernel biết dùng chương trình nào để đọc file. Cộng với <code>chmod +x</code>, nó biến một file văn bản thành một chương trình.',
      '<code>/bin/sh</code> trên máy bạn trỏ tới <b>dash</b>, không phải bash. <code>[[ ]]</code>, mảng và <code>${x^^}</code> đều không tồn tại ở đó — đây là nguồn gốc của lỗi "chạy trên máy tôi nhưng chết trên thiết bị".',
      'Ký tự <b>CRLF</b> của Windows tạo ra <code>/bin/bash^M: bad interpreter</code>, một lỗi vô hình khi nhìn bằng mắt. Xem bằng <code>cat -A</code>, chữa bằng <code>dos2unix</code>.',
      '<b>Luôn bọc biến trong nháy kép.</b> Không nháy, bash tách chuỗi tại mọi khoảng trắng rồi bung dấu <code>*</code> — bạn đã thấy một file thành bốn thông báo lỗi, và <code>rm -rf $duong/</code> với biến rỗng thành <code>rm -rf /</code>.',
      'Không có khoảng trắng nào quanh dấu <code>=</code> khi gán. <code>ten = "x"</code> cho mã <b>127</b>, "không tìm thấy lệnh".',
      'Mã trả về là ngôn ngữ chung: <b>0</b> thành công, khác 0 là thất bại. <b>126</b> = tìm thấy nhưng không chạy được, <b>127</b> = không tìm thấy, <b>130</b> = bị <kbd>Ctrl</kbd>+<kbd>C</kbd>. Đọc <code>$?</code> <b>ngay lập tức</b>, vì lệnh kế tiếp sẽ ghi đè nó.',
      '<code>if</code> không kiểm tra "đúng/sai" — nó kiểm tra <b>mã trả về bằng 0 hay không</b>. Vì thế <code>if grep -q …</code> chạy được mà không cần dấu ngoặc nào.',
      '<code>[</code> là một <b>chương trình thật</b> (<code>/usr/bin/[</code>), nên phải có khoảng trắng quanh nó. <code>[[</code> là <b>từ khoá</b> của bash, không bị tách từ nhưng cũng không chạy trên dash.',
      'Dùng <code>-gt -lt -eq</code> cho số, <code>=</code> và <code>!=</code> cho chuỗi. Viết <code>[ "$so" &gt; 10 ]</code> không so sánh gì cả — nó tạo ra một file tên <code>10</code> và điều kiện luôn đúng.',
      '<code>local</code> giữ biến trong hàm. <code>return</code> đặt <b>mã trạng thái</b> chứ không trả giá trị; muốn trả giá trị thì <code>echo</code> ra và bắt bằng <code>$(…)</code>.',
      '<b><code>"$@"</code> giữ nguyên ranh giới tham số, <code>"$*"</code> làm mất.</b> Chuyển tiếp thì dùng <code>"$@"</code>, hiển thị thì dùng <code>"$*"</code>.',
      '<code>${1:-arm64}</code> = "tham số 1, không có thì mặc định arm64". Đây là cách xử lý tham số tuỳ chọn gọn nhất, và nó cũng vô hiệu hoá <code>set -u</code> đúng chỗ bạn muốn.',
      '<code>set -e</code> dừng khi lệnh thất bại, <code>set -u</code> dừng khi gặp biến chưa đặt, <code>set -o pipefail</code> khiến đường ống thất bại nếu <b>bất kỳ</b> khâu nào hỏng. Ba dòng này chặn ba lớp lỗi im lặng.',
      'Ngoại lệ của <code>set -e</code>: lệnh trong <code>if</code>, <code>while</code>, sau <code>&amp;&amp;</code>, <code>||</code>, <code>!</code> được phép thất bại. Đó là chủ ý, không phải lỗi.',
      '<code>&lt;&lt;EOF</code> thay thế biến, <code>&lt;&lt;\'EOF\'</code> chép nguyên xi. Dấu nháy quanh <code>EOF</code> là chi tiết quyết định khi script sinh ra script khác.',
      '<code>mktemp -d</code> + <code>trap \'rm -rf "$TAM"\' EXIT</code> là khuôn mẫu dọn dẹp chuẩn. Bạn đã chứng minh nó chạy <b>cả khi script thất bại</b>, để lại <b>0</b> thư mục rác trong <code>/tmp</code>.',
      '<code>bash -n</code> kiểm tra cú pháp mà không chạy; <code>bash -x</code> in ra từng lệnh <b>sau khi</b> đã thay thế biến. Hai công cụ này giải quyết phần lớn bí ẩn trong script.',
      'Script <code>build.sh</code> bạn viết đã đo được: x86 động <b>15 952</b> byte, ARM64 tĩnh <b>705 328</b> byte — chênh <b>44,2 lần</b>, khớp với con số ở Bài 3. Chạy trực tiếp file ARM64 cho <code>Exec format error</code>, mã <b>126</b>, đúng như dự đoán.',
      'Ghi thông báo lỗi ra <code>&gt;&amp;2</code>. Nhờ đó lỗi vẫn hiện trên màn hình khi người dùng chuyển hướng đầu ra vào file log.',
      'Dùng <code>printf</code> thay <code>echo</code> trong script nghiêm túc: nó là chuẩn POSIX và hành xử giống nhau ở mọi shell, còn <code>echo</code> thì không.'
    ]},

    /* ══════════════════════════════════════════════
       11. BÀI TIẾP THEO
       ══════════════════════════════════════════════ */
    { t: 'cal', kind: 'info', title: 'Bài tiếp theo', x:
      '<p>Bạn vừa kết thúc <b>Chặng 01 — Linux căn bản</b>. Mười ba bài, và bây giờ bạn dùng được ' +
      'dòng lệnh như một công cụ chứ không phải như một câu đố: bạn hiểu hệ thống file, tiến ' +
      'trình, quyền, đường ống, tìm kiếm văn bản, quản lý gói, và tự động hoá được mọi thứ đó ' +
      'bằng script.</p>' +
      '<p><b>Bài 14</b> mở ra <b>Chặng 02 — C và công cụ build</b>: <i>C cho embedded — ôn tập ' +
      'trọng tâm</i>. Bạn sẽ đi từ <code>hello.c</code> hôm nay tới bốn giai đoạn thật sự bên ' +
      'trong một lần biên dịch, và tới những thứ chỉ quan trọng khi lập trình nhúng: con trỏ ' +
      'trỏ vào địa chỉ phần cứng, từ khoá <code>volatile</code> mà thiếu nó trình biên dịch sẽ ' +
      '<b>xoá mất</b> vòng lặp chờ thanh ghi của bạn, thao tác bit để bật một chân GPIO, và ' +
      '<code>struct</code> ánh xạ đúng vào bản đồ thanh ghi của chip.</p>' +
      '<p>Con số cụ thể bạn sẽ đo được ở đó: cùng một hàm, biên dịch với <code>-O0</code> và ' +
      '<code>-O2</code>, xem trình biên dịch sinh ra bao nhiêu lệnh máy ARM64 khác nhau — và vì ' +
      'sao một biến thiếu <code>volatile</code> có thể khiến chương trình treo vĩnh viễn trên ' +
      'thiết bị thật mà chạy hoàn hảo trên máy tính của bạn.</p>' }
  ],

  /* ══════════════════════════════════════════════
     12. QUIZ
     ══════════════════════════════════════════════ */
  quiz: [
    {
      q: 'Bạn viết script trên VS Code ở Windows rồi chạy trong WSL, và nhận được ' +
         '<code>bash: ./build.sh: /bin/bash^M: bad interpreter: No such file or directory</code>. ' +
         'Nội dung file nhìn hoàn toàn đúng. Nguyên nhân là gì?',
      opts: [
        'Thiếu quyền thực thi, cần chạy <code>chmod +x build.sh</code>',
        'File dùng ký tự xuống dòng CRLF của Windows; ký tự <code>\\r</code> dính vào cuối shebang tạo thành tên chương trình không tồn tại',
        'Đường dẫn <code>/bin/bash</code> sai, trên Ubuntu bash nằm ở <code>/usr/bin/bash</code>',
        'WSL không cho phép chạy script nằm trên phân vùng Windows'
      ],
      a: 1,
      why: 'Chuỗi <code>^M</code> trong thông báo chính là ký tự carriage return (mã 13) hiện ra ' +
           'dưới dạng nhìn thấy được. Kernel đọc shebang và tìm chương trình tên ' +
           '<code>/bin/bash&lt;CR&gt;</code>, tất nhiên không có. Xem bằng <code>cat -A</code> ' +
           '(mỗi dòng sẽ kết thúc bằng <code>^M$</code> thay vì chỉ <code>$</code>), chữa bằng ' +
           '<code>sed -i \'s/\\r$//\'</code> hoặc <code>dos2unix</code>. Nếu chỉ thiếu quyền thì ' +
           'thông báo sẽ là <code>Permission denied</code> — cùng mã 126 nhưng khác nguyên nhân.'
    },
    {
      q: 'Script chứa <code>duong="$1"</code> rồi <code>rm -rf $duong/</code>. Người dùng chạy ' +
         'script mà quên truyền tham số. Chuyện gì xảy ra?',
      opts: [
        'Script báo lỗi "tham số bắt buộc" và dừng lại',
        'Lệnh trở thành <code>rm -rf /</code> và script chạy nó, không hề báo lỗi',
        '<code>rm</code> từ chối vì đường dẫn rỗng, mã trả về 1',
        'Bash tự động thay biến rỗng bằng thư mục hiện tại'
      ],
      a: 1,
      why: 'Biến chưa đặt được thay bằng <b>chuỗi rỗng</b>, im lặng. Dấu <code>/</code> viết sát ' +
           'sau đó còn nguyên, nên dòng lệnh thật sự chạy là <code>rm -rf /</code>. Không có lỗi ' +
           'cú pháp nào để bash phàn nàn — script làm đúng những gì được viết. Ba lớp bảo vệ: ' +
           'bọc nháy <code>"$duong"</code>, bật <code>set -u</code> để bash chết ngay khi gặp ' +
           'biến chưa đặt, và kiểm tra tường minh bằng ' +
           '<code>[ -n "$duong" ] || exit 1</code>.'
    },
    {
      q: 'Script build của bạn có dòng <code>make 2&gt;&amp;1 | tee build.log</code> và bật ' +
         '<code>set -e</code>. <code>make</code> chết ngay dòng đầu, nhưng script vẫn chạy tiếp ' +
         'và cuối cùng báo "build thành công". Thiếu gì?',
      opts: [
        '<code>set -u</code> — cần nó để bắt biến chưa đặt trong Makefile',
        '<code>set -o pipefail</code> — không có nó, đường ống trả về mã của <code>tee</code>, mà <code>tee</code> gần như luôn thành công',
        '<code>trap ERR</code> — chỉ có nó mới bắt được lỗi của <code>make</code>',
        'Cần bỏ <code>2&gt;&amp;1</code> vì nó nuốt mất mã trả về'
      ],
      a: 1,
      why: 'Mặc định, mã trả về của một đường ống là mã của lệnh <b>cuối cùng</b>. ' +
           '<code>set -e</code> nhìn vào mã đó, thấy 0 từ <code>tee</code>, và kết luận mọi thứ ' +
           'ổn. Bạn đã kiểm chứng bằng <code>false | true</code>: không có pipefail thì ' +
           '<code>$?</code> = 0, có pipefail thì = 1. Đây là lý do <code>set -euo pipefail</code> ' +
           'luôn đi thành bộ ba, và nó đặc biệt quan trọng từ Chặng 07 khi bạn ghi log mọi lần ' +
           'biên dịch kernel.'
    },
    {
      q: 'Đâu là khác biệt đúng giữa <code>"$@"</code> và <code>"$*"</code>?',
      opts: [
        '<code>"$@"</code> chỉ chứa tham số đầu tiên, <code>"$*"</code> chứa tất cả',
        'Không có khác biệt khi cả hai đều được bọc nháy kép',
        '<code>"$@"</code> giữ nguyên từng tham số thành các phần riêng biệt; <code>"$*"</code> nối tất cả thành một chuỗi duy nhất',
        '<code>"$*"</code> giữ nguyên ranh giới tham số, <code>"$@"</code> thì không'
      ],
      a: 2,
      why: 'Bạn đã chứng minh điều này bằng <code>bash saoat.sh mot "hai ba" bon</code>: vòng lặp ' +
           'trên <code>"$@"</code> in ra ba dòng, giữ nguyên <code>hai ba</code> thành một khối; ' +
           'vòng lặp trên <code>"$*"</code> in ra <b>một</b> dòng và ranh giới ban đầu mất vĩnh ' +
           'viễn. Quy tắc thực dụng: <b>chuyển tiếp tham số cho lệnh khác thì luôn dùng ' +
           '<code>"$@"</code></b>; chỉ dùng <code>"$*"</code> khi bạn muốn in ra màn hình, như ' +
           'hàm <code>log()</code> trong script build.'
    },
    {
      q: 'Bạn viết <code>if [ "$so" &gt; 10 ]; then echo "lon hon"; fi</code>. Chạy với ' +
         '<code>so=3</code> thì nhánh <code>then</code> <b>vẫn</b> chạy, và trong thư mục xuất ' +
         'hiện một file lạ tên <code>10</code>. Giải thích nào đúng?',
      opts: [
        'Bash so sánh chuỗi nên "3" đứng sau "10" theo thứ tự bảng chữ cái, và file <code>10</code> là file tạm của bash',
        'Bash hiểu <code>&gt; 10</code> là chuyển hướng đầu ra vào file tên <code>10</code>, nên điều kiện còn lại chỉ là <code>[ "3" ]</code> — kiểm tra chuỗi có rỗng không, luôn đúng',
        'Thiếu dấu nháy quanh số 10; viết <code>[ "$so" &gt; "10" ]</code> là sửa được',
        'Lỗi của <code>[</code>; dùng <code>[[ "$so" &gt; 10 ]]</code> sẽ so sánh số đúng'
      ],
      a: 1,
      why: 'Bash xử lý chuyển hướng <b>trước</b> khi gọi lệnh, nên <code>&gt; 10</code> bị lấy ra ' +
           'khỏi dòng lệnh và biến thành thao tác tạo file. Lệnh <code>[</code> chỉ còn nhận một ' +
           'tham số <code>"3"</code>, nghĩa là "chuỗi này có nội dung không?" — câu trả lời luôn ' +
           'là có. Bọc nháy quanh <code>10</code> không cứu được vì vấn đề nằm ở toán tử. Đáp án ' +
           'cuối cũng sai: <code>[[ "$so" &gt; 10 ]]</code> chạy được nhưng so sánh <b>chuỗi</b>, ' +
           'nên <code>"9" &gt; "10"</code> là đúng. Viết <code>[ "$so" -gt 10 ]</code> hoặc ' +
           '<code>(( so &gt; 10 ))</code>.'
    },
    {
      q: 'Script của bạn tạo thư mục tạm bằng <code>TAM="$(mktemp -d)"</code> và xoá nó bằng ' +
         '<code>rm -rf "$TAM"</code> ở <b>dòng cuối</b>. Sau vài tuần, <code>/tmp</code> đầy ' +
         'hàng chục thư mục <code>tmp.XXXXXX</code>. Cách sửa đúng là gì?',
      opts: [
        'Chuyển sang tên cố định <code>/tmp/build</code> để mỗi lần chạy đều ghi đè lên lần trước',
        'Thêm <code>trap \'rm -rf "$TAM"\' EXIT</code> ngay sau dòng <code>mktemp</code>, dùng nháy đơn',
        'Thêm <code>set -e</code> để script không bao giờ chạy tới dòng cuối khi có lỗi',
        'Đặt một tác vụ định kỳ dọn <code>/tmp</code> mỗi đêm'
      ],
      a: 1,
      why: 'Rác tích lại vì script <b>chết giữa chừng</b> nên không bao giờ tới được dòng xoá. ' +
           '<code>trap … EXIT</code> chạy khi script kết thúc bằng mọi cách — thành công, thất ' +
           'bại, hay <kbd>Ctrl</kbd>+<kbd>C</kbd> — nên đúng vấn đề. Bạn đã kiểm chứng: script ' +
           'chết ở dòng <code>false</code>, mã trả về 1, mà thư mục tạm vẫn được xoá, ' +
           '<code>ls -d /tmp/tmp.*</code> đếm được 0. Nháy <b>đơn</b> là bắt buộc để hoãn việc ' +
           'thay <code>$TAM</code> tới lúc trap thật sự chạy. Tên cố định lại tạo ra lỗi mới: ' +
           'hai lần chạy song song sẽ giẫm lên nhau. <code>set -e</code> làm vấn đề <i>tệ hơn</i> ' +
           'vì script dừng sớm hơn nữa.'
    }
  ]
});

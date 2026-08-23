/* ═══════════════════════════════════════════════════════════════
   BÀI 10 — Pipe, redirect và triết lý Unix
   Chặng 01 · Linux căn bản
   ═══════════════════════════════════════════════════════════════ */

Lesson.register({
  id: 'bai-10',
  title: 'Pipe, redirect và triết lý Unix',
  minutes: 50,
  practice: 'Thực hành 30 phút',
  level: 'Người mới bắt đầu',

  intro:
    'Bạn đã gõ <code>2&gt;/dev/null</code>, <code>| head</code>, <code>&gt; file.txt</code> ' +
    'suốt sáu bài vừa rồi mà chưa ai giải thích chúng là gì. Bài này trả nợ. Toàn bộ cơ chế nằm ' +
    'gọn trong ba con số — <b>0, 1, 2</b> — và một ý tưởng: mọi chương trình đều có một dòng vào ' +
    'và hai dòng ra, còn shell thì được phép <b>nối lại</b> chúng tuỳ ý trước khi chương trình ' +
    'kịp chạy. Hiểu điều đó, bạn sẽ tự trả lời được vì sao ' +
    '<code>sudo echo x &gt; /etc/hosts</code> ở Bài 8 thất bại, và vì sao ' +
    '<code>seq 1 1000000000 | head -3</code> trả kết quả trong <b>0,004 giây</b> thay vì chạy ' +
    'cả tiếng đồng hồ. Phần cuối bài là triết lý Unix — lý do Linux có hàng trăm lệnh tí hon ' +
    'thay vì mười lệnh khổng lồ, và vì sao điều đó quan trọng với người làm nhúng.',

  goals: [
    'Gọi tên ba dòng chảy chuẩn và số hiệu của chúng, đọc được chúng trong <code>/proc</code>',
    'Dùng đúng <code>&gt;</code>, <code>&gt;&gt;</code>, <code>&lt;</code>, <code>2&gt;</code>, <code>&amp;&gt;</code> và giải thích vì sao thứ tự viết lại quan trọng',
    'Nối nhiều lệnh bằng <code>|</code> và giải thích vì sao chúng chạy song song chứ không lần lượt',
    'Đọc mã thoát của từng tầng đường ống bằng <code>PIPESTATUS</code> và bật <code>pipefail</code>',
    'Dùng <code>tee</code>, here-doc và <code>&lt;(...)</code> để giải các bài toán mà chuyển hướng thường không giải được',
    'Nêu bốn nguyên tắc của triết lý Unix và chỉ ra chúng trong một câu lệnh thật'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. BA DÒNG CHẢY
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Ba dòng chảy mà chương trình nào cũng có' },

    { t: 'p', x:
      'Khi kernel khởi động một tiến trình, nó trao sẵn cho tiến trình đó ba kênh vào/ra đã mở. ' +
      'Chương trình không cần biết đầu kia nối vào đâu — bàn phím, file, hay một chương trình ' +
      'khác. Nó chỉ việc đọc từ kênh 0 và ghi vào kênh 1 hoặc 2. <b>Chính sự thờ ơ đó làm nên ' +
      'toàn bộ sức mạnh của dòng lệnh.</b>' },

    { t: 'terms', items: [
      ['stdin', 'standard input · fd 0', 'Dòng <b>vào</b>. Mặc định nối với bàn phím.'],
      ['stdout', 'standard output · fd 1', 'Dòng <b>ra</b> chính, chứa kết quả. Mặc định nối với màn hình.'],
      ['stderr', 'standard error · fd 2', 'Dòng ra dành <b>riêng cho thông báo lỗi</b>. Cũng nối ' +
       'với màn hình, nhưng là một kênh <b>tách biệt</b>.'],
      ['File descriptor', 'fd · bộ mô tả file', 'Một số nguyên nhỏ mà kernel dùng để chỉ một file ' +
       'đang mở của tiến trình. Bạn tự tạo thêm được: fd 3, 4, 5…'],
      ['Chuyển hướng', 'redirection', 'Shell nối lại một fd vào chỗ khác <b>trước khi</b> chương ' +
       'trình chạy. Chương trình hoàn toàn không biết.'],
      ['Đường ống', 'pipe', 'Một bộ đệm trong kernel nối stdout của tiến trình này vào stdin của ' +
       'tiến trình kia.']
    ]},

    { t: 'fig',
      cap: 'Chương trình chỉ biết ba con số 0, 1, 2. Shell là kẻ quyết định đầu kia của mỗi con số nối vào đâu — và nó làm việc đó ngay sau fork, trước exec.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Sơ đồ ba dòng chảy chuẩn stdin fd 0, stdout fd 1, stderr fd 2 của một chương trình">' +
        '<rect class="d-box-p" x="270" y="80" width="180" height="80" rx="8"/>' +
        '<text class="d-t" x="360" y="112" text-anchor="middle">CHƯƠNG TRÌNH</text>' +
        '<text class="d-ts" x="360" y="132" text-anchor="middle">không biết đầu kia là gì</text>' +

        '<rect class="d-box-a" x="30" y="98" width="150" height="44" rx="6"/>' +
        '<text class="d-t" x="105" y="118" text-anchor="middle">bàn phím · file</text>' +
        '<text class="d-tm" x="105" y="134" text-anchor="middle">hoặc lệnh khác</text>' +
        '<line class="d-line" x1="180" y1="120" x2="264" y2="120"/>' +
        '<path class="d-arrow" d="M264 120 l-8 -4 v8 z"/>' +
        '<text class="d-tm" x="222" y="112" text-anchor="middle">fd 0</text>' +
        '<text class="d-ts" x="222" y="142" text-anchor="middle">stdin</text>' +

        '<rect class="d-box-g" x="540" y="40" width="150" height="44" rx="6"/>' +
        '<text class="d-t" x="615" y="60" text-anchor="middle">KẾT QUẢ</text>' +
        '<text class="d-ts" x="615" y="76" text-anchor="middle">màn hình · file · lệnh khác</text>' +
        '<line class="d-line" x1="450" y1="105" x2="534" y2="70"/>' +
        '<path class="d-arrow" d="M534 70 l-9 0 l4 8 z"/>' +
        '<text class="d-tm" x="470" y="84">fd 1</text>' +
        '<text class="d-ts" x="470" y="99">stdout</text>' +

        '<rect class="d-box-w" x="540" y="160" width="150" height="44" rx="6"/>' +
        '<text class="d-t" x="615" y="180" text-anchor="middle">THÔNG BÁO LỖI</text>' +
        '<text class="d-ts" x="615" y="196" text-anchor="middle">luôn ra màn hình nếu không đổi</text>' +
        '<line class="d-line" x1="450" y1="136" x2="534" y2="176"/>' +
        '<path class="d-arrow" d="M534 176 l-8 -5 l-1 9 z"/>' +
        '<text class="d-tm" x="470" y="160">fd 2</text>' +
        '<text class="d-ts" x="470" y="175">stderr</text>' +

        '<text class="d-ts" x="30" y="228">Đường ống | chỉ mang fd 1. Lỗi ở fd 2 vẫn rơi thẳng ra màn hình — đó là thiết kế có chủ đích, không phải thiếu sót.</text>' +
        '</svg>' },

    { t: 'p', x:
      'Ba con số này không phải khái niệm trừu tượng. Chúng là ba file thật trong ' +
      '<code>/proc</code> mà bạn đã biết cách đọc từ Bài 5:' },

    { t: 'code', where: 'wsl', lang: 'bash', code: 'ls -l /dev/stdin /dev/stdout /dev/stderr' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      'lrwxrwxrwx 1 root root 15 Aug  1 16:46 /dev/stderr -> /proc/self/fd/2\n' +
      'lrwxrwxrwx 1 root root 15 Aug  1 16:46 /dev/stdin -> /proc/self/fd/0\n' +
      'lrwxrwxrwx 1 root root 15 Aug  1 16:46 /dev/stdout -> /proc/self/fd/1' },

    { t: 'cal', kind: 'why', title: 'Vì sao lỗi phải có một dòng chảy riêng', x:
      '<p>Hãy tưởng tượng lỗi và kết quả trộn chung một dòng. Câu lệnh ' +
      '<code>ls *.txt &gt; list.txt</code> sẽ nhét luôn dòng ' +
      '<code>No such file or directory</code> vào giữa danh sách, và bước xử lý tiếp theo sẽ coi ' +
      'thông báo lỗi đó là một tên file.</p>' +
      '<p>Tách làm hai kênh giải quyết triệt để: <b>fd 1 chỉ chứa dữ liệu để máy đọc, fd 2 chỉ ' +
      'chứa lời nói cho người đọc</b>. Đó là lý do ở Bài 8 và Bài 9 bạn gõ được ' +
      '<code>find /usr/bin -perm -4000 2&gt;/dev/null</code> — vứt hết lời than phiền, giữ ' +
      'nguyên danh sách.</p>' +
      '<p>Hệ quả cần nhớ: <b>stderr không đi qua đường ống</b>. Bạn sẽ thấy hậu quả trong phần ' +
      'thực hành.</p>' },

    /* ══════════════════════════════════════════════
       2. CHUYỂN HƯỚNG
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Chuyển hướng: nối lại đầu dây' },

    { t: 'table',
      head: ['Toán tử', 'Nghĩa', 'Ghi nhớ'],
      rows: [
        ['<code>&gt; f</code>', 'stdout vào file <b>f</b>, <b>xoá sạch</b> nội dung cũ', 'Viết đủ là <code>1&gt; f</code>'],
        ['<code>&gt;&gt; f</code>', 'stdout <b>nối thêm</b> vào cuối f', 'Dùng cho file log'],
        ['<code>&lt; f</code>', 'stdin lấy từ file f', 'Viết đủ là <code>0&lt; f</code>'],
        ['<code>2&gt; f</code>', 'Chỉ stderr vào f', 'Không có khoảng trắng giữa <code>2</code> và <code>&gt;</code>'],
        ['<code>2&gt;&gt; f</code>', 'stderr nối thêm vào f', ''],
        ['<code>&gt; f 2&gt;&amp;1</code>', 'stdout vào f, rồi stderr đi <b>theo</b> stdout', 'Dạng chuẩn, chạy ở mọi shell'],
        ['<code>&amp;&gt; f</code>', 'Cả hai vào f — viết tắt của dòng trên', 'Riêng của bash, ngắn hơn'],
        ['<code>2&gt;&amp;1</code>', 'Gộp stderr vào chỗ stdout <b>đang</b> trỏ tới', 'Dấu <code>&amp;</code> nghĩa là "fd số 1", không phải "file tên 1"'],
        ['<code>&gt;&amp;2</code>', 'Đẩy stdout sang stderr', 'Cách in thông báo lỗi trong script'],
        ['<code>&lt;&lt;&lt; "chuoi"</code>', 'Đưa thẳng một chuỗi vào stdin', 'Gọi là <i>here-string</i>']
      ]},

    { t: 'cal', kind: 'danger', title: 'Dấu > xoá file TRƯỚC KHI lệnh chạy — và đây là cái bẫy đắt giá nhất', x:
      '<p>Shell xử lý chuyển hướng ngay sau <code>fork()</code>, <b>trước</b> khi ' +
      '<code>exec()</code> nạp chương trình. Nghĩa là tới lúc lệnh của bạn bắt đầu chạy, file đã ' +
      'bị cắt về 0 byte rồi.</p>' +
      '<p>Vì thế <code>grep 1 source.txt &gt; source.txt</code> <b>xoá sạch</b> ' +
      '<code>source.txt</code>. Phần thực hành sẽ cho bạn tự tay phá một file để không bao giờ quên.</p>' +
      '<p>Cách đúng luôn là qua file tạm:</p>' +
      '<p><code>grep 1 source.txt &gt; temp.txt &amp;&amp; mv temp.txt source.txt</code></p>' },

    { t: 'cal', kind: 'tip', title: 'set -o noclobber: tấm lưới an toàn', x:
      '<p>Bật <code>set -o noclobber</code> thì <code>&gt;</code> sẽ <b>từ chối</b> ghi đè file đã ' +
      'có, báo <code>cannot overwrite existing file</code>. Khi thật sự muốn đè, viết ' +
      '<code>&gt;|</code>.</p>' +
      '<p>Đáng đặt trong <code>~/.bashrc</code> nếu bạn hay làm việc với dữ liệu không sao lưu. ' +
      'Nhưng đừng dựa vào nó trong script — script chạy ở máy khác sẽ không có thiết lập này.</p>' },

    { t: 'h3', x: 'Thứ tự viết quyết định kết quả' },

    { t: 'p', x:
      'Đây là chỗ khiến nhiều người mất hàng giờ. Hai câu lệnh dưới đây trông như nhau nhưng cho ' +
      'kết quả trái ngược:' },

    { t: 'code', where: 'wsl', lang: 'bash', code:
      'ls a.txt missing.txt > correct.txt 2>&1     # cả hai vào file\n' +
      'ls a.txt missing.txt 2>&1 > wrong.txt       # chỉ stdout vào file' },

    { t: 'fig',
      cap: '2>&1 nghĩa là "cho fd 2 trỏ tới chỗ fd 1 ĐANG trỏ tới, ngay lúc này". Vì thế phải đặt nó SAU khi đã đổi fd 1.',
      svg:
        '<svg viewBox="0 0 720 260" width="720" role="img" aria-label="So sánh thứ tự hai toán tử chuyển hướng, giải thích vì sao 2 lớn hơn và 1 phải đặt sau">' +
        '<rect class="d-box-g" x="20" y="14" width="330" height="26" rx="4"/>' +
        '<text class="d-t" x="185" y="32" text-anchor="middle">&gt; correct.txt  2&gt;&amp;1     ĐÚNG</text>' +
        '<rect class="d-box-w" x="380" y="14" width="320" height="26" rx="4"/>' +
        '<text class="d-t" x="540" y="32" text-anchor="middle">2&gt;&amp;1  &gt; wrong.txt     SAI</text>' +

        '<rect class="d-box" x="20" y="54" width="330" height="44" rx="4"/>' +
        '<text class="d-ts" x="30" y="72">Bước 1 — fd 1 rời màn hình, trỏ vào correct.txt</text>' +
        '<text class="d-tm" x="30" y="90">1 → correct.txt      2 → màn hình</text>' +
        '<rect class="d-box" x="380" y="54" width="320" height="44" rx="4"/>' +
        '<text class="d-ts" x="390" y="72">Bước 1 — fd 2 chép chỗ fd 1 đang trỏ: màn hình</text>' +
        '<text class="d-tm" x="390" y="90">1 → màn hình      2 → màn hình</text>' +

        '<rect class="d-box" x="20" y="106" width="330" height="44" rx="4"/>' +
        '<text class="d-ts" x="30" y="124">Bước 2 — fd 2 chép chỗ fd 1: correct.txt</text>' +
        '<text class="d-tm" x="30" y="142">1 → correct.txt      2 → correct.txt</text>' +
        '<rect class="d-box" x="380" y="106" width="320" height="44" rx="4"/>' +
        '<text class="d-ts" x="390" y="124">Bước 2 — fd 1 rời đi, nhưng fd 2 KHÔNG theo</text>' +
        '<text class="d-tm" x="390" y="142">1 → wrong.txt       2 → màn hình</text>' +

        '<rect class="d-box-g" x="20" y="158" width="330" height="40" rx="4"/>' +
        '<text class="d-t" x="30" y="176">Kết quả: file chứa CẢ HAI</text>' +
        '<text class="d-tm" x="30" y="192">ls: cannot access... + a.txt</text>' +
        '<rect class="d-box-w" x="380" y="158" width="320" height="40" rx="4"/>' +
        '<text class="d-t" x="390" y="176">Kết quả: file chỉ có a.txt</text>' +
        '<text class="d-tm" x="390" y="192">lỗi vẫn hiện ra màn hình</text>' +

        '<text class="d-ts" x="20" y="228">Mẹo nhớ: 2&gt;&amp;1 là một bản CHỤP, không phải một sợi dây. Nó chép chỗ đến của fd 1 tại thời điểm đọc lệnh,</text>' +
        '<text class="d-ts" x="20" y="246">rồi hai fd sống độc lập. Vì thế nó phải đứng CUỐI.</text>' +
        '</svg>' },

    { t: 'cal', kind: 'why', title: 'Và đây là lời giải cho câu đố còn nợ từ Bài 8', x:
      '<p>Bạn đã thấy <code>sudo echo x &gt;&gt; /etc/hosts</code> thất bại với ' +
      '<code>bash: /etc/hosts: Permission denied</code>.</p>' +
      '<p>Bây giờ thì rõ: <b>shell mở file trước, rồi mới chạy lệnh</b>. Thao tác mở file do ' +
      'chính bash làm với quyền người dùng thường — <code>sudo</code> còn chưa được gọi. Tiền tố ' +
      '<code>bash:</code> trong thông báo lỗi là chữ ký của thủ phạm.</p>' +
      '<p>Cách đúng là đẩy dữ liệu <b>qua một chương trình đang chạy dưới quyền root</b>:</p>' +
      '<p><code>echo x | sudo tee -a /etc/hosts</code></p>' +
      '<p>Ở đây <code>tee</code> mới là kẻ mở file, và nó chạy dưới <code>sudo</code>.</p>' },

    /* ══════════════════════════════════════════════
       3. /dev/null VÀ HỌ HÀNG
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Bốn file thiết bị dùng làm nguồn và thùng rác' },

    { t: 'code', where: 'wsl', lang: 'bash', code: 'ls -l /dev/null /dev/zero /dev/full /dev/urandom' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      'crw-rw-rw- 1 root root 1, 3 Aug  1 16:51 /dev/null\n' +
      'crw-rw-rw- 1 root root 1, 5 Aug  1 16:51 /dev/zero\n' +
      'crw-rw-rw- 1 root root 1, 7 Aug  1 16:51 /dev/full\n' +
      'crw-rw-rw- 1 root root 1, 9 Aug  1 16:51 /dev/urandom' },

    { t: 'table',
      head: ['File', 'Số hiệu', 'Đọc ra gì', 'Ghi vào thì sao', 'Dùng để'],
      rows: [
        ['<code>/dev/null</code>', '1, 3', 'Rỗng ngay lập tức', 'Nuốt sạch, báo thành công', 'Vứt bỏ đầu ra không cần'],
        ['<code>/dev/zero</code>', '1, 5', 'Byte <code>0x00</code> vô tận', 'Nuốt sạch', 'Tạo file rỗng có kích thước định trước, xoá ổ đĩa'],
        ['<code>/dev/full</code>', '1, 7', 'Byte 0 vô tận', '<b>Luôn báo lỗi hết đĩa</b>', 'Thử xem chương trình xử lý lỗi đầy đĩa ra sao'],
        ['<code>/dev/urandom</code>', '1, 9', 'Byte ngẫu nhiên vô tận', 'Nuốt sạch', 'Sinh khoá, sinh dữ liệu thử']
      ]},

    { t: 'cal', kind: 'info', title: 'Cột quyền 666 và cặp số 1, 3', x:
      '<p>Cả bốn đều là <code>crw-rw-rw-</code> — thiết bị ký tự, ai cũng đọc ghi được, đúng như ' +
      'phân tích ở Bài 8. Cặp số thay chỗ kích thước file là <b>major, minor</b> mà bạn đã gặp ở ' +
      'Bài 5: major <b>1</b> là nhóm driver "bộ nhớ", minor phân biệt từng cửa.</p>' +
      '<p><code>/dev/full</code> nghe vô dụng nhưng lại rất quý với người làm nhúng: nó là cách ' +
      'duy nhất dễ dàng để kiểm tra chương trình của bạn có xử lý đúng lỗi ' +
      '<code>No space left on device</code> hay không — tình huống chắc chắn sẽ xảy ra trên một ' +
      'thẻ nhớ 4 GB.</p>' },

    /* ══════════════════════════════════════════════
       4. ĐƯỜNG ỐNG
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Đường ống: nối stdout của lệnh này vào stdin của lệnh kia' },

    { t: 'p', x:
      'Dấu <code>|</code> bảo shell tạo một <b>bộ đệm trong kernel</b>, nối fd 1 của lệnh bên ' +
      'trái vào fd 0 của lệnh bên phải. Không có file tạm nào được tạo, không byte nào chạm ổ ' +
      'đĩa.' },

    { t: 'fig',
      cap: 'Cả hai lệnh chạy CÙNG LÚC, không lần lượt. Bộ đệm pipe chỉ 64 KB — khi nó đầy, kernel cho lệnh bên trái ngủ cho tới khi bên phải đọc bớt.',
      svg:
        '<svg viewBox="0 0 720 230" width="720" role="img" aria-label="Sơ đồ đường ống nối stdout của seq vào stdin của grep rồi sang wc, chạy song song">' +
        '<rect class="d-box-p" x="20" y="60" width="150" height="56" rx="6"/>' +
        '<text class="d-tm" x="95" y="84" text-anchor="middle">seq 1 20</text>' +
        '<text class="d-ts" x="95" y="102" text-anchor="middle">tiến trình A</text>' +

        '<rect class="d-box-a" x="205" y="66" width="90" height="44" rx="6"/>' +
        '<text class="d-ts" x="250" y="84" text-anchor="middle">bộ đệm</text>' +
        '<text class="d-ts" x="250" y="100" text-anchor="middle">64 KB</text>' +
        '<line class="d-line" x1="170" y1="88" x2="199" y2="88"/>' +
        '<path class="d-arrow" d="M199 88 l-8 -4 v8 z"/>' +
        '<text class="d-tm" x="184" y="78" text-anchor="middle">1</text>' +

        '<rect class="d-box-p" x="330" y="60" width="150" height="56" rx="6"/>' +
        '<text class="d-tm" x="405" y="84" text-anchor="middle">grep 1</text>' +
        '<text class="d-ts" x="405" y="102" text-anchor="middle">tiến trình B</text>' +
        '<line class="d-line" x1="295" y1="88" x2="324" y2="88"/>' +
        '<path class="d-arrow" d="M324 88 l-8 -4 v8 z"/>' +
        '<text class="d-tm" x="310" y="78" text-anchor="middle">0</text>' +

        '<rect class="d-box-a" x="515" y="66" width="60" height="44" rx="6"/>' +
        '<text class="d-ts" x="545" y="92" text-anchor="middle">đệm</text>' +
        '<line class="d-line" x1="480" y1="88" x2="509" y2="88"/>' +
        '<path class="d-arrow" d="M509 88 l-8 -4 v8 z"/>' +

        '<rect class="d-box-g" x="610" y="60" width="90" height="56" rx="6"/>' +
        '<text class="d-tm" x="655" y="84" text-anchor="middle">wc -l</text>' +
        '<text class="d-ts" x="655" y="102" text-anchor="middle">tiến trình C</text>' +
        '<line class="d-line" x1="575" y1="88" x2="604" y2="88"/>' +
        '<path class="d-arrow" d="M604 88 l-8 -4 v8 z"/>' +

        '<rect class="d-box-w" x="20" y="140" width="680" height="30" rx="4"/>' +
        '<text class="d-t" x="30" y="160">Cả A, B, C đều được fork ngay từ đầu và cùng chạy — bạn kiểm chứng được bằng ps ở Bài 9</text>' +

        '<text class="d-ts" x="20" y="196">fd 2 của cả ba tiến trình vẫn trỏ thẳng ra màn hình. Đường ống KHÔNG mang lỗi.</text>' +
        '<text class="d-ts" x="20" y="214">Muốn ống mang cả lỗi thì viết 2&gt;&amp;1 | ...  hoặc dạng viết tắt của bash là |&amp;</text>' +
        '</svg>' },

    { t: 'cal', kind: 'why', title: 'Vì sao chạy song song lại quan trọng đến thế', x:
      '<p>Nếu đường ống chạy lần lượt, <code>seq 1 1000000000 | head -3</code> sẽ phải sinh đủ ' +
      'một tỷ dòng — khoảng <b>9,5 GB</b> — rồi mới đưa cho <code>head</code>.</p>' +
      '<p>Thực tế bạn sẽ đo được <b>0,004 giây</b>. Vì <code>head</code> in xong ba dòng là ' +
      'đóng đầu đọc, kernel gửi tín hiệu <code>SIGPIPE</code> cho <code>seq</code>, và ' +
      '<code>seq</code> chết ngay tại chỗ với mã thoát <b>141</b> = 128 + 13. Bạn nhận ra công ' +
      'thức 128 + n từ Bài 9.</p>' +
      '<p>Đây là lý do bạn có thể yên tâm gõ <code>| head</code> sau một lệnh sinh dữ liệu vô ' +
      'tận. Đường ống không chỉ nối dữ liệu, nó còn <b>truyền ngược tín hiệu dừng</b>.</p>' },

    { t: 'h3', x: 'Mã thoát của một đường ống là mã thoát của lệnh cuối cùng' },

    { t: 'p', x:
      'Đây là nguồn gốc của một loại lỗi rất khó tìm trong script CI: cả đường ống báo thành ' +
      'công trong khi tầng đầu tiên đã chết.' },

    { t: 'code', where: 'wsl', lang: 'bash', code:
      'false | true\n' +
      'echo "rc=$?"\n' +
      'false | true\n' +
      'echo "PIPESTATUS = ${PIPESTATUS[@]}"' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      'rc=0\n' +
      'PIPESTATUS = 1 0' },

    { t: 'cmdx', cmd: 'Ba công cụ kiểm soát mã thoát của đường ống',
      rows: [
        ['<code>$?</code>', 'Mã thoát của <b>lệnh cuối cùng</b> trong ống', 'Mặc định của POSIX'],
        ['<code>${PIPESTATUS[@]}</code>', 'Mảng mã thoát của <b>từng tầng</b>, theo thứ tự', 'Riêng của bash. Phải đọc <b>ngay</b> sau đường ống — lệnh kế tiếp sẽ ghi đè mảng này'],
        ['<code>set -o pipefail</code>', 'Cả ống trả về mã thoát <b>khác 0 cuối cùng</b> gặp được', 'Bật một lần cho cả script. Bài 13 sẽ đưa nó vào bộ ba <code>set -euo pipefail</code>'],
        ['<code>|&amp;</code>', 'Viết tắt của <code>2&gt;&amp;1 |</code> — ống mang cả stderr', 'Riêng của bash 4 trở lên']
      ]},

    { t: 'cal', kind: 'warn', title: 'PIPESTATUS bay hơi sau đúng một lệnh', x:
      '<p><code>echo "a"; echo "${PIPESTATUS[@]}"</code> sẽ cho bạn mã thoát của ' +
      '<code>echo "a"</code>, không phải của đường ống trước đó. Nếu cần dùng lại, chép ngay: ' +
      '<code>rc=("${PIPESTATUS[@]}")</code>.</p>' },

    /* ══════════════════════════════════════════════
       5. TEE
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'tee: rẽ dòng chảy làm hai' },

    { t: 'p', x:
      'Tên lấy từ chữ T trong ống nước: một đầu vào, hai đầu ra. <code>tee</code> đọc stdin, ghi ' +
      'vào file <b>và</b> đẩy tiếp ra stdout để tầng sau vẫn nhận được.' },

    { t: 'code', where: 'wsl', lang: 'bash', code: 'seq 1 5 | tee saved.txt | wc -l' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code: '5' },

    { t: 'cmdx', cmd: 'tee [tuỳ chọn] file...',
      rows: [
        ['<code>tee f</code>', 'Ghi đè f, đồng thời in ra stdout', 'Tương đương <code>&gt;</code> nhưng không nuốt dòng chảy'],
        ['<code>-a</code>', '<b>append</b> — nối thêm vào cuối f', 'Tương đương <code>&gt;&gt;</code>'],
        ['<code>tee f1 f2</code>', 'Ghi vào nhiều file cùng lúc', ''],
        ['<code>sudo tee</code>', '<b>Cách duy nhất</b> để ghi vào file của root qua đường ống', 'Vì tee mới là kẻ mở file, và nó chạy dưới sudo']
      ]},

    { t: 'cal', kind: 'tip', title: 'Ba tình huống mà tee là lời giải duy nhất', x:
      '<p><b>1. Ghi file cần quyền root:</b> <code>echo x | sudo tee -a /etc/hosts</code>.</p>' +
      '<p><b>2. Vừa xem vừa lưu một bản dựng dài:</b> ' +
      '<code>make 2&gt;&amp;1 | tee build.log | grep -i error</code> — bạn thấy lỗi ngay trên ' +
      'màn hình mà vẫn có nhật ký đầy đủ để mổ xẻ sau. Từ Chặng 05 trở đi bạn sẽ dùng câu này ' +
      'gần như hằng ngày, vì một lần dựng Yocto in ra hàng chục nghìn dòng.</p>' +
      '<p><b>3. Chia dữ liệu cho hai hướng xử lý:</b> ghi bản thô vào file, đồng thời lọc ' +
      'tiếp ở tầng sau.</p>' },

    /* ══════════════════════════════════════════════
       6. HERE-DOC, PROCESS SUBSTITUTION
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Khi nguồn dữ liệu không phải file: here-doc và <(...)' },

    { t: 'h3', x: 'Here-doc: nhét cả một khối văn bản vào stdin' },

    { t: 'p', x:
      'Bạn sẽ gặp cấu trúc này ở khắp nơi trong tài liệu nhúng — tạo file cấu hình, nạp lệnh ' +
      'vào U-Boot, viết script cài đặt. Nó nói: "đọc mọi dòng cho tới khi gặp từ khoá kết thúc, ' +
      'coi đó là stdin".' },

    { t: 'code', where: 'wsl', lang: 'bash', code:
      'NAME="shinarus"\n' +
      '\n' +
      'cat <<EOF > with-subst.txt\n' +
      'hello $NAME\n' +
      'current directory is $(pwd)\n' +
      'EOF\n' +
      '\n' +
      "cat <<'EOF' > no-subst.txt\n" +
      'hello $NAME\n' +
      'current directory is $(pwd)\n' +
      'EOF' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      '--- with-subst.txt\n' +
      'hello shinarus\n' +
      'current directory is /home/shinarus/embedded/bai10\n' +
      '--- no-subst.txt\n' +
      'hello $NAME\n' +
      'current directory is $(pwd)' },

    { t: 'cal', kind: 'why', title: 'Dấu nháy quanh EOF là công tắc bật/tắt việc thay thế biến', x:
      '<p><code>&lt;&lt;EOF</code> — bash <b>vẫn</b> thay thế <code>$BIEN</code> và ' +
      '<code>$(lenh)</code> bên trong khối. Dùng khi bạn muốn nhúng giá trị động.</p>' +
      '<p><code>&lt;&lt;\'EOF\'</code> — bash <b>không</b> đụng vào gì cả, khối văn bản đi ' +
      'nguyên xi. Dùng khi bạn đang viết ra một script khác, một file cấu hình có ký tự ' +
      '<code>$</code>, hoặc một đoạn Makefile.</p>' +
      '<p><b>Đây là lỗi số một khi tạo file cấu hình bằng here-doc.</b> Quên cặp nháy là ' +
      '<code>$PATH</code> trong file bạn định viết ra sẽ bị thay bằng biến PATH của máy bạn. ' +
      'Mặc định nên dùng có nháy, chỉ bỏ nháy khi thực sự cần thay thế.</p>' },

    { t: 'p', x:
      'Anh em rút gọn của nó là <b>here-string</b> <code>&lt;&lt;&lt;</code>, đưa một chuỗi ' +
      'duy nhất vào stdin. Lưu ý nó tự thêm một ký tự xuống dòng ở cuối:' },

    { t: 'code', where: 'wsl', lang: 'bash', code: 'wc -c <<< "abcdef"' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code: '7' },

    { t: 'h3', x: 'Process substitution: biến đầu ra của một lệnh thành một file' },

    { t: 'p', x:
      'Nhiều lệnh chỉ nhận <b>tên file</b> chứ không đọc stdin — <code>diff</code> là ví dụ điển ' +
      'hình, nó cần <b>hai</b> file. Cú pháp <code>&lt;(lenh)</code> giải quyết bằng cách tạo ' +
      'một file descriptor giả trong <code>/dev/fd/</code> rồi đưa tên đó cho lệnh:' },

    { t: 'code', where: 'wsl', lang: 'bash', code:
      'diff <(seq 1 5) <(seq 3 7)\n' +
      'ls -l <(echo hi)' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      '1,2d0\n' +
      '< 1\n' +
      '< 2\n' +
      '5a4,5\n' +
      '> 6\n' +
      '> 7\n' +
      'rc=1\n' +
      'lr-x------ 1 shinarus shinarus 64 Aug  1 16:51 /dev/fd/63 -> pipe:[12458]' },

    { t: 'cal', kind: 'info', title: '/dev/fd/63 chính là một đường ống đội lốt file', x:
      '<p>Dòng cuối lộ hết cơ chế: <code>&lt;(echo hi)</code> tạo một pipe, gán cho nó fd 63, ' +
      'rồi truyền chuỗi <code>/dev/fd/63</code> vào cho <code>ls</code> như một tên file bình ' +
      'thường. <code>ls</code> hoàn toàn không biết mình đang nhìn vào một đường ống.</p>' +
      '<p>Đây lại là ý tưởng "mọi thứ đều là file" của Bài 5, lần này áp dụng ngược: ' +
      '<b>bất cứ dòng dữ liệu nào cũng có thể mang một cái tên trong hệ thống file</b>.</p>' +
      '<p><code>diff</code> trả về <b>rc=1</b> khi hai bên khác nhau — không phải lỗi, đó là ' +
      'câu trả lời. Bài 13 sẽ dùng tính chất này trong <code>if</code>.</p>' },

    { t: 'h3', x: 'FIFO: đường ống có tên, sống trên đĩa' },

    { t: 'p', x:
      'Đường ống <code>|</code> chết cùng câu lệnh. Nếu cần hai chương trình chạy độc lập nói ' +
      'chuyện với nhau, tạo một <b>named pipe</b> bằng <code>mkfifo</code>:' },

    { t: 'code', where: 'wsl', lang: 'bash', code:
      'mkfifo mypipe\n' +
      "stat -c '%F %a %n' mypipe\n" +
      'ls -l mypipe' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      'fifo 644 mypipe\n' +
      'prw-r--r-- 1 shinarus shinarus 0 Aug  6 07:59 mypipe' },

    { t: 'cal', kind: 'info', title: 'Chữ p đầu dòng và kích thước 0', x:
      '<p>Ký tự đầu là <code>p</code> — loại file thứ năm bạn gặp, sau <code>-</code> ' +
      '<code>d</code> <code>l</code> <code>c</code> của Bài 5 và Bài 8. Kích thước luôn ' +
      '<b>0 byte</b> vì dữ liệu không bao giờ nằm trên đĩa, nó chỉ chảy qua bộ đệm trong RAM.</p>' +
      '<p>FIFO là cơ chế liên lạc cơ bản giữa các tiến trình trên thiết bị nhúng, nơi không có ' +
      'chỗ cho một hệ thống nhắn tin nặng nề.</p>' },

    /* ══════════════════════════════════════════════
       7. TRIẾT LÝ UNIX
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Triết lý Unix: vì sao Linux có hàng trăm lệnh tí hon' },

    { t: 'p', x:
      'Năm 1978, Doug McIlroy — chính là người đã nghĩ ra dấu <code>|</code> — tóm tắt cách làm ' +
      'việc ở Bell Labs thành mấy dòng vẫn còn nguyên giá trị:' },

    { t: 'table',
      head: ['Nguyên tắc', 'Nghĩa là', 'Bạn đã thấy nó ở đâu'],
      rows: [
        ['Mỗi chương trình làm <b>một việc</b>, làm cho tốt',
         'Thà viết công cụ mới còn hơn nhồi tính năng vào công cụ cũ',
         '<code>wc</code> chỉ biết đếm. <code>sort</code> chỉ biết sắp xếp.'],
        ['Đầu ra của chương trình này là <b>đầu vào</b> của chương trình kia',
         'Không đoán trước ai sẽ đọc kết quả của mình',
         'Mọi đường ống bạn gõ từ Bài 6 tới giờ'],
        ['Đầu ra phải là <b>văn bản</b>, vì văn bản là giao diện chung',
         'Không dùng định dạng nhị phân độc quyền giữa các công cụ',
         '<code>/proc</code> là văn bản, <code>ps</code> in ra văn bản'],
        ['Thiết kế và dựng phần mềm <b>sớm</b>, sẵn sàng vứt bản vụng đi',
         'Thử nhanh còn hơn thiết kế lâu trên giấy',
         'Cách bạn ghép dần một đường ống, thêm từng tầng một']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao người làm nhúng cần điều này hơn ai hết', x:
      '<p>Trên máy bàn, một công cụ nặng vài trăm MB không ai để ý. Trên một thiết bị có ' +
      '<b>16 MB flash</b>, mỗi kilobyte đều phải trả giá.</p>' +
      '<p>Triết lý "mỗi công cụ một việc" cho phép bạn <b>chọn đúng những gì cần</b> và bỏ hết ' +
      'phần còn lại. Đó chính xác là cách BusyBox hoạt động — một file nhị phân duy nhất, ' +
      'nhưng bạn bật/tắt được từng lệnh con. Ở Chặng 04 bạn sẽ tự tay cấu hình nó và thấy ' +
      'kích thước rootfs thay đổi theo từng lựa chọn.</p>' +
      '<p>Và vì mọi công cụ đều nói chuyện bằng văn bản qua stdin/stdout, một script bạn viết ' +
      'hôm nay trên WSL sẽ chạy y hệt trên board ARM ngày mai — dù ở đó ' +
      '<code>grep</code> là bản BusyBox rút gọn chứ không phải GNU grep.</p>' },

    { t: 'h3', x: 'Đo thử: đường ống so với file trung gian' },

    { t: 'p', x:
      'Cùng một bài toán — lọc 2 triệu dòng, sắp xếp giảm dần, đếm kết quả — làm theo hai cách. ' +
      'Cách thứ nhất dùng ba file trung gian:' },

    { t: 'code', where: 'wsl', lang: 'bash', code:
      'seq 1 2000000 > t1.txt\n' +
      'grep 7 t1.txt > t2.txt\n' +
      'sort -rn t2.txt > t3.txt\n' +
      'wc -l < t3.txt' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      '937118\n' +
      '\n' +
      'real    0m0.324s\n' +
      '\n' +
      '14888896  t1.txt\n' +
      ' 6983704  t2.txt\n' +
      ' 6983704  t3.txt' },

    { t: 'p', x: 'Cách thứ hai, cùng kết quả, một dòng duy nhất:' },

    { t: 'code', where: 'wsl', lang: 'bash', code: 'seq 1 2000000 | grep 7 | sort -rn | wc -l' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      '937118\n' +
      '\n' +
      'real    0m0.232s' },

    { t: 'cal', kind: 'info', title: 'Con số thật: nhanh hơn 1,4 lần và không chạm đĩa một byte nào', x:
      '<p><b>0,324 s</b> so với <b>0,232 s</b>, và quan trọng hơn nhiều: cách thứ nhất ghi ' +
      '<b>28 856 304 byte</b> ≈ <b>27,5 MB</b> xuống đĩa, cách thứ hai ghi <b>0 byte</b>.</p>' +
      '<p>Trên máy bàn với ổ SSD, chênh lệch thời gian nhỏ. Trên một thiết bị nhúng dùng thẻ ' +
      'eMMC hoặc NAND, 27,5 MB ghi thừa vừa chậm gấp bội, vừa <b>ăn mòn số chu kỳ ghi</b> của ' +
      'chip nhớ. Đó là lý do script trên thiết bị luôn ưu tiên đường ống, và tuyệt đối tránh ' +
      'file tạm trong vòng lặp.</p>' },

    { t: 'cal', kind: 'warn', title: 'Nhưng đừng nói bừa rằng bỏ cat sẽ nhanh hơn', x:
      '<p>Có một lời khuyên lan truyền khắp Internet: <code>cat f | grep x</code> chậm hơn ' +
      '<code>grep x f</code>. Hãy đo trên chính máy này với một file 22 MB:</p>' +
      '<p><code>grep -c 7 large.txt</code> → 1405677, <b>real 0m0,036s</b><br>' +
      '<code>cat large.txt | grep -c 7</code> → 1405677, <b>real 0m0,037s</b></p>' +
      '<p><b>Bằng nhau.</b> Lý do thật để bỏ <code>cat</code> không phải tốc độ, mà là:</p>' +
      '<p>1. Bạn tốn thêm một tiến trình mà chẳng để làm gì.<br>' +
      '2. <code>grep</code> mất khả năng <b>in tên file</b> khi tìm nhiều file.<br>' +
      '3. <code>grep</code> mất khả năng nhảy vị trí trong file, chỉ đọc tuần tự được.</p>' +
      '<p>Bài học lớn hơn: <b>đo trước khi tin</b>. Đây là kỷ luật xuyên suốt phần còn lại của ' +
      'khoá học.</p>' },

    /* ══════════════════════════════════════════════
       8. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: tự tay nối lại từng sợi dây' },

    { t: 'p', x:
      'Mọi đầu ra dưới đây là kết quả thật, chạy trên đúng máy bạn đang dùng. Riêng số hiệu ' +
      'pipe (<code>pipe:[1971]</code>) và số fd sẽ khác ở máy bạn — đó là bình thường, chúng do ' +
      'kernel cấp phát động.' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Nhìn tận mắt ba file descriptor', blocks: [
        { t: 'p', x:
          'Trước hết tạo chỗ làm việc, rồi hỏi kernel xem tiến trình hiện tại đang mở những gì. ' +
          'Thư mục <code>/proc/self/fd</code> chứa một symlink cho mỗi fd đang mở.' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'mkdir -p ~/embedded/bai10 && cd ~/embedded/bai10\n' +
          'ls -l /proc/self/fd' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'total 0\n' +
          'lrwx------ 1 shinarus shinarus 64 Aug  1 16:51 0 -> pipe:[1971]\n' +
          'lrwx------ 1 shinarus shinarus 64 Aug  1 16:51 1 -> pipe:[1972]\n' +
          'lrwx------ 1 shinarus shinarus 64 Aug  1 16:51 2 -> pipe:[1972]\n' +
          'lr-x------ 1 shinarus shinarus 64 Aug  1 16:51 3 -> /proc/426/fd' },
        { t: 'cal', kind: 'info', title: 'Đọc bốn dòng này như một bản khai báo', x:
          '<p>fd <b>1</b> và fd <b>2</b> cùng trỏ vào <code>pipe:[1972]</code> — cùng một đường ' +
          'ống. Đó là dấu vết của một lệnh <code>2&gt;&amp;1</code> ở đâu đó phía trên.</p>' +
          '<p>fd <b>3</b> là do chính lệnh <code>ls</code> mở ra để đọc thư mục — nó tự thấy ' +
          'mình trong gương. Con số 426 là PID của <code>ls</code>.</p>' +
          '<p>Nếu bạn chạy trong terminal thật, cả ba sẽ trỏ tới <code>/dev/pts/0</code> — thiết ' +
          'bị terminal. Cùng một chương trình, khác đầu dây.</p>' },
        { t: 'p', x: 'Ba lối tắt có tên cho ba fd đó:' },
        { t: 'code', where: 'wsl', lang: 'bash', code: 'ls -l /dev/stdin /dev/stdout /dev/stderr' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'lrwxrwxrwx 1 root root 15 Aug  1 16:46 /dev/stderr -> /proc/self/fd/2\n' +
          'lrwxrwxrwx 1 root root 15 Aug  1 16:46 /dev/stdin -> /proc/self/fd/0\n' +
          'lrwxrwxrwx 1 root root 15 Aug  1 16:46 /dev/stdout -> /proc/self/fd/1' },
        { t: 'cal', kind: 'info', title: 'Ba lối tắt này trỏ đúng vào ba fd bạn vừa thấy', x:
          '<p><code>/dev/stdin</code>, <code>/dev/stdout</code>, <code>/dev/stderr</code> chỉ là symlink ' +
          'cố định trỏ tới <code>/proc/self/fd/0</code>, <code>/proc/self/fd/1</code>, ' +
          '<code>/proc/self/fd/2</code> — đúng chiêu <code>/proc/self</code> "tự thấy mình trong gương" ' +
          'mà fd 3 của lệnh <code>ls</code> ở trên vừa minh hoạ.</p>' +
          '<p>Ba đường dẫn này không cố định cho một tiến trình cụ thể nào — mở chúng ở bất kỳ chương ' +
          'trình nào, <code>self</code> lại trỏ về đúng ba fd của chương trình đó. Bạn sẽ gặp chúng như ' +
          'lối viết thay cho số hiệu fd, ví dụ <code>echo loi &gt; /dev/stderr</code> thay vì ' +
          '<code>echo loi 1&gt;&amp;2</code>.</p>' }
      ]},

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Tách stdout khỏi stderr bằng một lệnh cố tình sai', blocks: [
        { t: 'p', x:
          'Cách chắc chắn nhất để thấy hai dòng chảy là khác nhau: bắt một lệnh vừa thành công ' +
          'vừa thất bại cùng lúc. Hỏi <code>ls</code> về một file có thật và một file không có.' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'echo "content" > a.txt\n' +
          'ls a.txt missing.txt\n' +
          'echo "rc=$?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          "ls: cannot access 'missing.txt': No such file or directory\n" +
          'a.txt\n' +
          'rc=2' },
        { t: 'cal', kind: 'info', title: 'Vì sao rc=2, không phải rc=1', x:
          '<p><code>ls</code> trả về <b>2</b> khi nó không truy cập được một tham số bạn đưa thẳng trên ' +
          'dòng lệnh — đúng trường hợp <code>missing.txt</code>. Tài liệu của <code>ls</code> gọi mức ' +
          'này là "trouble nghiêm trọng", cao hơn mã <b>1</b> dành cho những trục trặc nhỏ hơn, như một ' +
          'file biến mất giữa chừng lúc đang liệt kê một thư mục chứ không phải một tham số bạn gõ ' +
          'thẳng.</p>' +
          '<p>Cùng lúc đó dòng <code>a.txt</code> vẫn in ra bình thường: một tham số lỗi không cản các ' +
          'tham số còn lại được xử lý tiếp.</p>' },
        { t: 'p', x:
          'Hai dòng đó đi qua hai kênh khác nhau, dù trên màn hình chúng nằm cạnh nhau. Bây giờ ' +
          'chặn từng kênh một:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'echo "--- keep only stdout"\n' +
          'ls a.txt missing.txt 2>/dev/null\n' +
          'echo "--- keep only stderr"\n' +
          'ls a.txt missing.txt 2>&1 >/dev/null' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '--- keep only stdout\n' +
          'a.txt\n' +
          '--- keep only stderr\n' +
          "ls: cannot access 'missing.txt': No such file or directory" },
        { t: 'cmdx', cmd: 'Vì sao 2>&1 >/dev/null lại giữ được lỗi',
          rows: [
            ['<code>2&gt;&amp;1</code>', 'fd 2 chép chỗ fd 1 <b>đang</b> trỏ tới: màn hình', 'Đọc từ trái sang phải'],
            ['<code>&gt;/dev/null</code>', 'fd 1 chuyển sang thùng rác, fd 2 <b>không</b> đi theo', 'fd 2 vẫn ở màn hình'],
            ['Kết quả', 'Kết quả bị vứt, lỗi được giữ', 'Đây chính là mẹo "chỉ xem lỗi"']
          ]},
        { t: 'p', x: 'Và hai cách gộp cả hai vào một file — kiểm chứng chúng cho ra file giống hệt nhau:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'ls a.txt missing.txt > result.txt 2>&1\n' +
          'ls a.txt missing.txt &> result2.txt\n' +
          'diff result.txt result2.txt && echo "TWO FILES ARE IDENTICAL"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'TWO FILES ARE IDENTICAL' },
        { t: 'cal', kind: 'why', title: 'diff im lặng là bằng chứng mạnh nhất có thể', x:
          '<p><code>diff</code> không in gì trước dòng <code>TWO FILES ARE IDENTICAL</code> — với ' +
          '<code>diff</code>, im lặng nghĩa là <b>hai file byte-for-byte giống nhau</b>, mã thoát 0 ' +
          'khiến <code>&amp;&amp;</code> chạy tiếp lệnh <code>echo</code>.</p>' +
          '<p>Vậy <code>&amp;&gt; f</code> đúng là <b>viết tắt</b> của <code>&gt; f 2&gt;&amp;1</code>, ' +
          'không phải một cơ chế khác đi tới cùng kết quả bằng đường khác. Nhớ rằng <code>&amp;&gt;</code> ' +
          'là <b>riêng của bash</b> — một script mở đầu bằng <code>#!/bin/sh</code> chạy qua dash sẽ ' +
          'không hiểu cú pháp này.</p>' }
      ]},

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Chứng minh thứ tự toán tử làm đổi kết quả', blocks: [
        { t: 'p', x:
          'Đây là bước quan trọng nhất của bài. Hai câu lệnh chỉ khác nhau ở chỗ đặt ' +
          '<code>2&gt;&amp;1</code>, và chúng cho hai kết quả khác nhau.' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'ls a.txt missing.txt > correct.txt 2>&1\n' +
          'echo "--- content of correct.txt"\n' +
          'cat correct.txt' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '--- content of correct.txt\n' +
          "ls: cannot access 'missing.txt': No such file or directory\n" +
          'a.txt' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'ls a.txt missing.txt 2>&1 > wrong.txt\n' +
          'echo "--- content of wrong.txt"\n' +
          'cat wrong.txt' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          "ls: cannot access 'missing.txt': No such file or directory\n" +
          '--- content of wrong.txt\n' +
          'a.txt' },
        { t: 'cal', kind: 'warn', title: 'Hãy để ý dòng lỗi nhảy lên TRƯỚC dòng "--- content of wrong.txt"', x:
          '<p>Ở lần thứ hai, thông báo lỗi in ra <b>màn hình ngay khi <code>ls</code> chạy</b>, ' +
          'nên nó xuất hiện trước dòng <code>echo</code>. File <code>wrong.txt</code> chỉ chứa ' +
          '<code>a.txt</code>.</p>' +
          '<p>Trong script tự động chạy đêm, kiểu nhầm này khiến file log trông sạch bong trong ' +
          'khi lỗi thật đã bay đi mất. <b>Quy tắc: <code>2&gt;&amp;1</code> luôn đứng cuối ' +
          'cùng.</b></p>' }
      ]},

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Nối lệnh bằng đường ống và thấy stderr không đi qua', blocks: [
        { t: 'p', x: 'Bắt đầu bằng đường ống đơn giản nhất, rồi ghép dần từng tầng:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'seq 1 100 | wc -l\n' +
          'seq 1 20 | grep 1 | sort -rn | head -3' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '100\n' +
          '19\n' +
          '18\n' +
          '17' },
        { t: 'cal', kind: 'info', title: 'Vì sao là 19, 18, 17 chứ không phải 20, 19, 18', x:
          '<p><code>grep 1</code> so khớp <b>chuỗi ký tự</b> "1", không so khớp giá trị số. Trong dải ' +
          '1–20, số <b>20</b> không chứa ký tự "1" nên bị loại — <code>grep</code> chỉ giữ lại 1, 10, ' +
          '11, 12, …, 19. Sắp giảm dần bằng <code>sort -rn</code> thì lớn nhất còn lại là <b>19</b>, ' +
          'nên <code>head -3</code> in ra đúng 19, 18, 17.</p>' +
          '<p>Bài học rộng hơn: <code>grep</code> không biết gì về số học. Lọc số bằng công cụ so khớp ' +
          'chuỗi luôn cần kiểm lại bằng mắt trước khi tin kết quả.</p>' },
        { t: 'cal', kind: 'tip', title: 'Cách xây một đường ống dài mà không sai', x:
          '<p>Đừng viết cả bốn tầng rồi mới chạy. Gõ <code>seq 1 20</code>, xem. Thêm ' +
          '<code>| grep 1</code>, xem. Thêm <code>| sort -rn</code>, xem. <b>Mỗi lần thêm một ' +
          'tầng và kiểm tra ngay.</b> Đó chính là nguyên tắc thứ tư của McIlroy — dựng sớm, sửa ' +
          'sớm.</p>' },
        { t: 'p', x:
          'Bây giờ là bài học quan trọng: đường ống <b>chỉ mang fd 1</b>. Đếm số dòng mà ' +
          '<code>wc</code> nhận được khi lệnh trái sinh ra một dòng kết quả và một dòng lỗi:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'ls a.txt missing.txt | wc -l\n' +
          'ls a.txt missing.txt |& wc -l' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          "ls: cannot access 'missing.txt': No such file or directory\n" +
          '1\n' +
          '2' },
        { t: 'cal', kind: 'why', title: 'Số 1 và số 2 nói lên tất cả', x:
          '<p>Lần đầu <code>wc</code> chỉ đếm được <b>1</b> dòng, và thông báo lỗi vẫn hiện ra ' +
          'màn hình — nó không hề đi vào ống.</p>' +
          '<p>Lần sau với <code>|&amp;</code> (viết đủ là <code>2&gt;&amp;1 |</code>), ' +
          '<code>wc</code> đếm <b>2</b> dòng và màn hình sạch trơn.</p>' +
          '<p>Ghi nhớ tình huống này: khi bạn lọc đầu ra của một lệnh dựng mà mãi không thấy ' +
          'dòng lỗi cần tìm, gần như chắc chắn lỗi đó đang ở fd 2 và bạn quên ' +
          '<code>2&gt;&amp;1</code>.</p>' },
        { t: 'p', x: 'Cuối cùng, rẽ dòng chảy làm hai bằng <code>tee</code>:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'seq 1 5 | tee saved.txt | wc -l\n' +
          'echo "--- saved.txt still has all 5 lines"\n' +
          'cat saved.txt\n' +
          'seq 6 8 | tee -a saved.txt > /dev/null\n' +
          'echo "--- after tee -a"\n' +
          'cat saved.txt' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '5\n' +
          '--- saved.txt still has all 5 lines\n' +
          '1\n2\n3\n4\n5\n' +
          '--- after tee -a\n' +
          '1\n2\n3\n4\n5\n6\n7\n8' },
        { t: 'cal', kind: 'why', title: 'Ba con số 5, rồi 1-5, rồi 1-8 chứng minh cả rẽ nhánh lẫn nối thêm', x:
          '<p>Dòng đầu tiên, <b>5</b>, là <code>wc -l</code> đếm được ở đầu <b>sau</b> của ống — chứng ' +
          'minh <code>tee</code> vẫn đẩy tiếp dữ liệu cho tầng kế bên, đúng như bảng <code>tee</code> ở ' +
          'phần lý thuyết đã liệt kê.</p>' +
          '<p><code>saved.txt</code> đã có sẵn đủ 5 dòng dù bạn chưa hề gọi lệnh nào ghi trực tiếp vào ' +
          'nó — đó là tác dụng phụ của <code>tee saved.txt</code> đứng giữa ống. Sau đó <code>tee -a</code> ' +
          'nối thêm <b>6, 7, 8</b> vào cuối thay vì xoá 5 dòng cũ, dù đầu ra của chính nó bị vứt vào ' +
          '<code>/dev/null</code> — cờ <code>-a</code> chỉ đổi cách <code>tee</code> mở file, không liên ' +
          'quan gì tới việc đầu ra stdout của nó có được xem hay không.</p>' }
      ]},

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Mã thoát của đường ống và cú SIGPIPE ngoạn mục', blocks: [
        { t: 'p', x:
          'Một đường ống mặc định chỉ báo cáo mã thoát của <b>tầng cuối</b>. Hãy tự tay bắt lỗi ' +
          'này:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'false | true\n' +
          'echo "rc of whole pipe = $?"\n' +
          'false | true\n' +
          'echo "PIPESTATUS = ${PIPESTATUS[@]}"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'rc of whole pipe = 0\n' +
          'PIPESTATUS = 1 0' },
        { t: 'cal', kind: 'info', title: 'Đọc đúng hai con số vừa in ra', x:
          '<p><code>rc of whole pipe = 0</code> là mã thoát của <code>true</code> — tầng <b>cuối cùng</b>, ' +
          'và <code>true</code> luôn trả về 0. <code>$?</code> chỉ nhìn thấy đúng con số đó.</p>' +
          '<p><code>PIPESTATUS = 1 0</code> lại cho thấy toàn bộ sự thật: phần tử đầu tiên, <b>1</b>, là ' +
          'mã thoát thật của <code>false</code> — tầng đã thất bại; phần tử thứ hai, <b>0</b>, là của ' +
          '<code>true</code>. Chỉ nhìn <code>$?</code>, bạn sẽ tin rằng cả đường ống trót lọt dù tầng ' +
          'đầu vừa chết.</p>' },
        { t: 'p', x: 'Bật <code>pipefail</code> và chạy lại đúng câu lệnh đó:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'set -o pipefail\n' +
          'false | true\n' +
          'echo "rc with pipefail = $?"\n' +
          'set +o pipefail' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'rc with pipefail = 1' },
        { t: 'cal', kind: 'why', title: 'rc nhảy từ 0 lên 1 — đúng bằng mã thoát của false', x:
          '<p>Cùng một câu lệnh <code>false | true</code>, chỉ khác việc bật <code>set -o pipefail</code> ' +
          'trước đó, kết quả đổi từ <b>0</b> sang <b>1</b>. Đó chính là định nghĩa trong bảng cmdx ở ' +
          'phần lý thuyết: pipefail khiến cả ống trả về <b>mã khác 0 cuối cùng gặp được</b>; ở đây chỉ có ' +
          'một mã khác 0 duy nhất — mã 1 của <code>false</code>.</p>' },
        { t: 'cal', kind: 'danger', title: 'Nếu quên pipefail, script CI của bạn sẽ nói dối', x:
          '<p><code>make 2&gt;&amp;1 | tee build.log</code> — nếu <code>make</code> thất bại mà ' +
          '<code>tee</code> thành công, cả câu lệnh trả về <b>0</b>. Hệ thống tích hợp liên tục ' +
          'sẽ đóng dấu "dựng thành công" lên một bản dựng hỏng.</p>' +
          '<p>Vì thế Bài 13 sẽ dạy bạn mở đầu mọi script bằng ' +
          '<code>set -euo pipefail</code>.</p>' },
        { t: 'p', x:
          'Bây giờ đến phần ấn tượng nhất. Yêu cầu <code>seq</code> đếm tới một tỷ, nhưng chỉ ' +
          'lấy ba dòng đầu:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'time (seq 1 1000000000 | head -3)\n' +
          'seq 1 1000000000 | head -3 > /dev/null\n' +
          'echo "PIPESTATUS = ${PIPESTATUS[@]}"\n' +
          'kill -l 13' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '1\n2\n3\n' +
          '\n' +
          'real    0m0.004s\n' +
          'user    0m0.001s\n' +
          'sys     0m0.003s\n' +
          'PIPESTATUS = 141 0\n' +
          'PIPE' },
        { t: 'cal', kind: 'info', title: '141 = 128 + 13, và 13 là SIGPIPE', x:
          '<p>Công thức 128 + số hiệu tín hiệu là thứ bạn đã học ở Bài 9 khi thấy 143 ' +
          '(SIGTERM) và 137 (SIGKILL). Ở đây <code>kill -l 13</code> xác nhận tín hiệu số 13 ' +
          'tên là <b>PIPE</b>.</p>' +
          '<p>Chuỗi sự kiện: <code>head</code> in xong 3 dòng thì thoát và đóng đầu đọc của ' +
          'ống. <code>seq</code> ghi tiếp vào một ống không còn ai đọc, kernel bắn ' +
          '<code>SIGPIPE</code> vào nó, nó chết. Tất cả trong <b>0,004 giây</b>.</p>' +
          '<p>Đây là bằng chứng không thể chối cãi rằng hai tầng chạy <b>song song</b>. Nếu ' +
          'chúng chạy lần lượt, bạn sẽ phải chờ <code>seq</code> sinh đủ 9,5 GB.</p>' }
      ]},

      /* ---------- BƯỚC 6 ---------- */
      { title: 'Here-doc, noclobber, process substitution, xargs', blocks: [
        { t: 'p', x:
          'Bốn công cụ giải bốn bài toán mà chuyển hướng thường không giải được. Bắt đầu bằng ' +
          'here-doc, so sánh có nháy và không nháy:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'NAME="shinarus"\n' +
          'cat <<EOF > with-subst.txt\n' +
          'hello $NAME\n' +
          'current directory is $(pwd)\n' +
          'EOF\n' +
          "cat <<'EOF' > no-subst.txt\n" +
          'hello $NAME\n' +
          'current directory is $(pwd)\n' +
          'EOF\n' +
          'echo "--- with substitution"; cat with-subst.txt\n' +
          'echo "--- without substitution"; cat no-subst.txt\n' +
          'wc -c <<< "abcdef"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '--- with substitution\n' +
          'hello shinarus\n' +
          'current directory is /home/shinarus/embedded/bai10\n' +
          '--- without substitution\n' +
          'hello $NAME\n' +
          'current directory is $(pwd)\n' +
          '7' },
        { t: 'cal', kind: 'info', title: 'Ba dòng cuối xác nhận cả hai vế của quy tắc dấu nháy', x:
          '<p><code>with-subst.txt</code> chứa <code>hello shinarus</code> và đường dẫn thật của thư ' +
          'mục hiện tại — <code>$NAME</code> và <code>$(pwd)</code> đã bị thay bằng giá trị lúc chạy, ' +
          'đúng như <code>&lt;&lt;EOF</code> không có nháy đã làm ở phần lý thuyết.</p>' +
          '<p><code>no-subst.txt</code> giữ nguyên văn <code>$NAME</code> và <code>$(pwd)</code> — cặp ' +
          'nháy quanh <code>\'EOF\'</code> đã tắt hoàn toàn việc thay thế.</p>' +
          '<p>Số <b>7</b> cuối cùng là <code>wc -c &lt;&lt;&lt; "abcdef"</code>: chuỗi <code>abcdef</code> ' +
          'chỉ có 6 ký tự, nhưng here-string tự thêm một dấu xuống dòng ở cuối trước khi đưa vào stdin, ' +
          'nên <code>wc -c</code> đếm được 7 byte.</p>' },
        { t: 'p', x: 'Tiếp theo, bật tấm lưới an toàn <code>noclobber</code> và thử ghi đè:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'echo "original" > nc.txt\n' +
          'set -o noclobber\n' +
          'echo "overwrite" > nc.txt\n' +
          'echo "rc=$?"\n' +
          'echo "overwrite no matter what" >| nc.txt\n' +
          'echo "rc=$?"; cat nc.txt\n' +
          'set +o noclobber' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'bash: nc.txt: cannot overwrite existing file\n' +
          'rc=1\n' +
          'rc=0\n' +
          'overwrite no matter what' },
        { t: 'cal', kind: 'tip', title: 'Bốn dòng này là cả một cuộc thử nghiệm hoàn chỉnh', x:
          '<p>Lần ghi đầu tiên bị chặn đúng như lời hứa: <code>bash: nc.txt: cannot overwrite existing ' +
          'file</code> và <code>rc=1</code> — nội dung cũ <code>original</code> vẫn còn nguyên trong ' +
          '<code>nc.txt</code> lúc này.</p>' +
          '<p>Đổi sang <code>&gt;|</code>, lệnh thành công (<code>rc=0</code>) và <code>cat</code> cho ' +
          'thấy nội dung đã đổi thành <code>overwrite no matter what</code> — <code>&gt;|</code> là lối ' +
          'thoát duy nhất khỏi <code>noclobber</code> mà không cần tắt nó bằng <code>set +o ' +
          'noclobber</code>.</p>' },
        { t: 'p', x:
          'Rồi biến đầu ra của lệnh thành file để đưa cho <code>diff</code> — thứ mà đường ống ' +
          'không làm được vì <code>diff</code> cần hai nguồn cùng lúc:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'diff <(seq 1 5) <(seq 3 7)\n' +
          'echo "rc=$?"\n' +
          'ls -l <(echo hi)' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '1,2d0\n' +
          '< 1\n' +
          '< 2\n' +
          '5a4,5\n' +
          '> 6\n' +
          '> 7\n' +
          'rc=1\n' +
          'lr-x------ 1 shinarus shinarus 64 Aug  1 16:51 /dev/fd/63 -> pipe:[12458]' },
        { t: 'cal', kind: 'info', title: 'Kết quả giống hệt ví dụ ở phần lý thuyết — và đó là điểm cần nhớ', x:
          '<p><code>rc=1</code> chỉ đơn giản nghĩa là hai dải số khác nhau, không phải lỗi — bạn đã học ' +
          'điều này ở mục 6 phần lý thuyết. Dòng <code>/dev/fd/63 -&gt; pipe:[12458]</code> lộ đúng cơ ' +
          'chế: <code>&lt;(echo hi)</code> chỉ là một pipe được gắn một cái tên trong hệ thống file để ' +
          '<code>ls</code> mở như một file bình thường.</p>' +
          '<p>Vì đây là process substitution, số hiệu pipe có thể khác trên máy bạn mỗi lần chạy — chỉ ' +
          'riêng <code>rc=1</code> và cấu trúc bốn dòng của <code>diff</code> ở trên là cố định.</p>' },
        { t: 'p', x:
          'Và <code>xargs</code>, giải bài toán ngược lại: nhiều lệnh <b>không</b> đọc stdin, ' +
          'chúng chỉ nhận tham số. <code>xargs</code> biến dòng chảy thành tham số:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'seq 1 5 | xargs\n' +
          'echo "--- split into groups of 2 args"\n' +
          'seq 1 5 | xargs -n 2 echo' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '1 2 3 4 5\n' +
          '--- split into groups of 2 args\n' +
          '1 2\n' +
          '3 4\n' +
          '5' },
        { t: 'cal', kind: 'tip', title: 'xargs là cầu nối giữa hai thế giới', x:
          '<p><code>echo</code> không đọc stdin — <code>seq 1 5 | echo</code> in ra một dòng ' +
          'trống. <code>xargs</code> đứng giữa, gom stdin lại rồi <b>gọi lệnh với chúng làm ' +
          'tham số</b>.</p>' +
          '<p>Bài 11 sẽ dùng nó rất nhiều với <code>find</code>, và sẽ giải thích vì sao cặp ' +
          '<code>find -print0 | xargs -0</code> mới là cách viết an toàn khi tên file có dấu ' +
          'cách.</p>' },
        { t: 'p', x: 'Cuối cùng, tạo một đường ống có tên nằm trên hệ thống file:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'mkfifo mypipe\n' +
          "stat -c '%F %a %n' mypipe\n" +
          'ls -l mypipe\n' +
          'cat mypipe > received.txt &\n' +
          'echo "data flowing through the pipe" > mypipe\n' +
          'sleep 1; cat received.txt' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'fifo 644 mypipe\n' +
          'prw-r--r-- 1 shinarus shinarus 0 Aug  6 07:59 mypipe\n' +
          'data flowing through the pipe' },
        { t: 'cal', kind: 'why', title: 'Dòng cuối chứng minh đúng lời hứa của FIFO: hai tiến trình độc lập', x:
          '<p><code>cat mypipe &gt; received.txt &amp;</code> chạy <b>trong nền</b>, là một tiến trình ' +
          'hoàn toàn tách biệt khỏi lệnh <code>echo</code> chạy sau nó — không có dấu <code>|</code> nào ' +
          'nối trực tiếp hai lệnh này trên cùng một dòng. Chúng gặp nhau <b>duy nhất</b> qua file ' +
          '<code>mypipe</code> nằm trên hệ thống file.</p>' +
          '<p>Dòng <code>data flowing through the pipe</code> xuất hiện trong <code>received.txt</code> ' +
          'chứng minh dữ liệu đã đi trọn vẹn từ tiến trình ghi sang tiến trình đọc, đúng như phần lý ' +
          'thuyết đã nói: named pipe dùng khi "cần hai chương trình chạy độc lập nói chuyện với nhau". ' +
          'Đường ống ẩn danh <code>|</code> không làm được việc này vì nó chỉ tồn tại trong đúng một câu ' +
          'lệnh.</p>' }
      ]},

      /* ---------- BƯỚC 7 ---------- */
      { title: 'Tự tay phá một file, rồi dọn dẹp', blocks: [
        { t: 'p', x:
          'Bước cuối là cái bẫy đắt giá nhất của chương này. Bạn sẽ cố lọc một file rồi ghi ' +
          'ngược vào chính nó. Hãy làm thật, trên một file rác, để không bao giờ làm nhầm trên ' +
          'file thật.' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'seq 1 10 > source.txt\n' +
          'wc -l source.txt\n' +
          'grep 1 source.txt > source.txt\n' +
          'echo "rc=$?"\n' +
          'wc -c source.txt' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '10 source.txt\n' +
          "grep: source.txt: input file is also the output\n" +
          'rc=2\n' +
          '0 source.txt' },
        { t: 'cal', kind: 'danger', title: 'grep đã kịp cảnh báo, nhưng file vẫn mất sạch — 0 byte', x:
          '<p>Hãy đọc kỹ trình tự: <code>grep</code> phát hiện được vấn đề và <b>từ chối chạy</b> ' +
          'với mã thoát 2. Nhưng file đã <b>0 byte</b> rồi.</p>' +
          '<p>Vì kẻ xoá file không phải <code>grep</code> — mà là <b>bash</b>, khi nó xử lý ' +
          '<code>&gt; source.txt</code> trước lúc <code>grep</code> được nạp vào bộ nhớ. Đến khi ' +
          '<code>grep</code> mở file để đọc thì chẳng còn gì.</p>' +
          '<p>Không phải công cụ nào cũng lịch sự cảnh báo như vậy. Với ' +
          '<code>sort</code>, <code>awk</code> hay <code>sed</code> không có ' +
          '<code>-i</code>, bạn mất dữ liệu trong im lặng.</p>' },
        { t: 'p', x: 'Cách đúng luôn đi qua một file tạm:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'seq 1 10 > source.txt\n' +
          'grep 1 source.txt > temp.txt && mv temp.txt source.txt\n' +
          'wc -l source.txt; cat source.txt' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '2 source.txt\n' +
          '1\n' +
          '10' },
        { t: 'cal', kind: 'info', title: 'Đúng 2 dòng còn lại — như bạn đã thấy ở Bước 4', x:
          '<p><code>grep 1</code> giữ lại những dòng <b>chứa ký tự "1"</b> trong 10 dòng <code>1</code> ' +
          'tới <code>10</code>. Chỉ có <b>1</b> và <b>10</b> thoả điều kiện đó — các số 2 đến 9 không có ' +
          'ký tự "1" nên bị loại, kể cả khi bạn nghĩ "lọc số 1" nghĩa là một phép so sánh số học.</p>' },
        { t: 'cal', kind: 'why', title: 'Vì sao phải là && chứ không phải dấu chấm phẩy', x:
          '<p><code>&amp;&amp;</code> chỉ chạy <code>mv</code> khi <code>grep</code> thành công. ' +
          'Nếu đổi thành <code>;</code>, một lần <code>grep</code> thất bại sẽ khiến ' +
          '<code>mv</code> đè file rỗng lên bản gốc — đúng thảm hoạ mà bạn vừa tránh được.</p>' },
        { t: 'p', x:
          'Trước khi dọn, thử tạo một fd của riêng mình. Đây là cách script chuyên nghiệp mở ' +
          'một file nhật ký một lần rồi ghi nhiều lần, thay vì mở/đóng liên tục:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'exec 3> note.log\n' +
          'echo "line via fd 3" >&3\n' +
          'exec 3>&-\n' +
          'cat note.log\n' +
          'echo "write to a closed fd" >&3\n' +
          'echo "rc=$?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'line via fd 3\n' +
          'bash: line 6: 3: Bad file descriptor\n' +
          'rc=1' },
        { t: 'cmdx', cmd: 'exec dùng cho chuyển hướng',
          rows: [
            ['<code>exec 3&gt; f</code>', 'Mở f, gán cho fd 3, giữ mở suốt phiên', 'Không kèm tên lệnh thì exec chỉ đổi fd, không thay chương trình'],
            ['<code>&gt;&amp;3</code>', 'Ghi vào fd 3', 'Dùng ở bất kỳ lệnh nào sau đó'],
            ['<code>exec 3&gt;&amp;-</code>', 'Đóng fd 3', 'Dấu <code>-</code> nghĩa là đóng'],
            ['<code>exec &gt; f 2&gt;&amp;1</code>', 'Chuyển hướng <b>toàn bộ</b> phần còn lại của script vào f', 'Mẹo ghi log cho cả script chỉ bằng một dòng']
          ]},
        { t: 'cal', kind: 'info', title: 'Bad file descriptor xác nhận fd 3 đã đóng thật, không chỉ trống', x:
          '<p>Dòng đầu, <code>line via fd 3</code>, chứng minh <code>exec 3&gt; note.log</code> hoạt ' +
          'động: ghi qua <code>&gt;&amp;3</code> đúng là ghi vào file. Sau <code>exec 3&gt;&amp;-</code>, ' +
          'cố ghi lại vào fd 3 cho ra <code>bash: line 6: 3: Bad file descriptor</code> và ' +
          '<code>rc=1</code> — đúng loại lỗi bạn nhận được khi thao tác trên một số fd mà kernel không ' +
          'còn coi là hợp lệ, khác hẳn việc ghi vào một fd đang mở nhưng trỏ sai chỗ.</p>' },
        { t: 'p', x: 'Dọn dẹp và kiểm tra thư mục làm việc:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'cd ~\n' +
          'rm -rf ~/embedded/bai10\n' +
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
        ['<code>grep: source.txt: input file is also the output</code>, và file còn <b>0 byte</b>',
         'Bash cắt file về 0 khi xử lý <code>&gt;</code>, trước khi grep chạy',
         'Luôn qua file tạm: <code>grep x f &gt; tam &amp;&amp; mv tam f</code>'],
        ['<code>bash: /etc/motd: Permission denied</code> dù đã gõ <code>sudo</code>',
         'Chính bash mở file, dưới quyền người dùng thường. sudo còn chưa được gọi',
         '<code>echo x | sudo tee -a /etc/motd</code>'],
        ['Lỗi vẫn hiện ra màn hình dù đã có <code>&gt; log.txt 2&gt;&amp;1</code>… nhưng viết là <code>2&gt;&amp;1 &gt; log.txt</code>',
         '<code>2&gt;&amp;1</code> chép chỗ fd 1 <b>tại thời điểm đó</b> — lúc đó fd 1 vẫn là màn hình',
         'Đặt <code>2&gt;&amp;1</code> ở cuối cùng, hoặc dùng <code>&amp;&gt;</code>'],
        ['Đường ống trả về <code>rc=0</code> trong khi tầng đầu đã thất bại',
         'Mã thoát của ống mặc định là mã thoát của tầng cuối',
         '<code>set -o pipefail</code>, hoặc đọc <code>${PIPESTATUS[@]}</code> ngay sau đó'],
        ['Lọc đầu ra của lệnh dựng bằng <code>| grep error</code> mà không thấy gì, dù rõ ràng có lỗi',
         'Thông báo lỗi ở fd 2, đường ống chỉ mang fd 1',
         'Viết <code>lenh 2&gt;&amp;1 | grep error</code> hoặc <code>lenh |&amp; grep error</code>'],
        ['<code>bash: nc.txt: cannot overwrite existing file</code>',
         '<code>noclobber</code> đang bật, <code>&gt;</code> bị cấm đè file đã có',
         'Dùng <code>&gt;|</code> nếu thật sự muốn đè, hoặc <code>set +o noclobber</code>'],
        ['<code>bash: 3: Bad file descriptor</code>',
         'Ghi vào một fd chưa mở hoặc đã đóng bằng <code>exec 3&gt;&amp;-</code>',
         'Mở lại bằng <code>exec 3&gt; file</code> trước khi ghi'],
        ['<code>bash: echo: write error: No space left on device</code> khi ghi vào <code>/dev/full</code>',
         'Đúng như thiết kế — <code>/dev/full</code> sinh ra để luôn báo đầy',
         'Không phải lỗi. Dùng nó để thử xem chương trình xử lý đầy đĩa ra sao'],
        ['<code>${PIPESTATUS[@]}</code> cho ra <code>0</code> dù ống vừa thất bại',
         'Đã có một lệnh khác chạy xen vào và ghi đè mảng',
         'Đọc ngay dòng liền sau đường ống, hoặc chép ra: <code>rc=("${PIPESTATUS[@]}")</code>'],
        ['File cấu hình tạo bằng here-doc bị mất hết dấu <code>$</code> và biến bị thay giá trị',
         'Viết <code>&lt;&lt;EOF</code> thay vì <code>&lt;&lt;\'EOF\'</code>',
         'Mặc định dùng <code>&lt;&lt;\'EOF\'</code>, chỉ bỏ nháy khi cần thay thế biến'],
        ['<code>seq 1 5 | echo</code> in ra một dòng trống',
         '<code>echo</code> không đọc stdin, nó chỉ in tham số',
         'Chèn <code>xargs</code>: <code>seq 1 5 | xargs echo</code>'],
        ['Mã thoát <code>141</code> khi chạy một đường ống có <code>head</code>',
         '128 + 13 = SIGPIPE. Tầng sau đóng ống trước khi tầng trước ghi xong',
         'Không phải lỗi, đó là cơ chế dừng sớm. Bỏ qua nó khi dùng <code>pipefail</code>']
      ]},

    /* ══════════════════════════════════════════════
       10. RECAP
       ══════════════════════════════════════════════ */
    { t: 'recap', title: 'Tóm tắt Bài 10', items: [
      'Mọi tiến trình sinh ra đã có sẵn ba fd: <b>0 stdin</b>, <b>1 stdout</b>, <b>2 stderr</b>. Xem chúng ở <code>/proc/self/fd</code>.',
      'Lỗi có kênh riêng để <b>kết quả dành cho máy đọc</b> không bị lẫn <b>lời nói dành cho người đọc</b>.',
      '<code>&gt;</code> ghi đè, <code>&gt;&gt;</code> nối thêm, <code>&lt;</code> lấy stdin từ file, <code>2&gt;</code> chỉ bắt lỗi.',
      '<b>Shell cắt file về 0 byte trước khi lệnh chạy.</b> Vì thế <code>grep x f &gt; f</code> huỷ file — luôn qua file tạm.',
      '<code>2&gt;&amp;1</code> là một <b>bản chụp</b>, không phải sợi dây. Nó phải đứng <b>cuối</b>: <code>&gt; f 2&gt;&amp;1</code>. Bản viết tắt là <code>&amp;&gt; f</code>.',
      '<code>sudo lenh &gt; /etc/f</code> luôn thất bại vì bash mở file, không phải sudo. Đáp án là <code>| sudo tee</code>.',
      'Các tầng trong đường ống chạy <b>song song</b>. Bằng chứng: <code>seq 1 1000000000 | head -3</code> xong trong <b>0,004 s</b> với mã thoát <b>141</b> = 128 + SIGPIPE.',
      'Đường ống <b>chỉ mang fd 1</b>. Muốn mang cả lỗi: <code>2&gt;&amp;1 |</code> hoặc <code>|&amp;</code>.',
      'Mã thoát của ống là của tầng cuối. Dùng <code>${PIPESTATUS[@]}</code> để xem từng tầng, <code>set -o pipefail</code> để bắt lỗi thật.',
      '<code>tee</code> rẽ dòng làm hai — vừa lưu file vừa cho tầng sau xử lý tiếp.',
      '<code>&lt;&lt;\'EOF\'</code> giữ nguyên văn bản, <code>&lt;&lt;EOF</code> thay thế biến. Nhầm cặp nháy là hỏng file cấu hình.',
      '<code>&lt;(lenh)</code> biến đầu ra thành một tên file trong <code>/dev/fd/</code>; <code>mkfifo</code> tạo ống có tên, loại file <b>p</b>, luôn 0 byte.',
      'Triết lý Unix: <b>mỗi công cụ một việc</b>, <b>nối bằng văn bản</b>, <b>dựng sớm sửa sớm</b>. Đó là nền móng của BusyBox và của mọi rootfs nhúng.',
      'Đường ống nhanh hơn file trung gian <b>0,232 s</b> so với <b>0,324 s</b>, và tiết kiệm <b>27,5 MB</b> ghi xuống đĩa — con số quyết định trên bộ nhớ flash.',
      'Nhưng <code>cat f | grep</code> và <code>grep f</code> đo được <b>bằng nhau, 0,031 s</b>. <b>Luôn đo trước khi tin.</b>'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo', x:
      '<p>Bạn đã có ống dẫn, giờ cần thứ để chảy qua ống. <b>Bài 11 — Tìm kiếm và xử lý văn ' +
      'bản</b> đưa vào năm công cụ mạnh nhất trong kho dòng lệnh: <code>find</code>, ' +
      '<code>grep</code> cùng biểu thức chính quy, <code>sed</code>, <code>awk</code> và ' +
      '<code>xargs</code>, kèm bộ tứ <code>sort uniq wc cut</code>.</p>' +
      '<p>Kết thúc Bài 11 bạn sẽ viết được một câu lệnh duy nhất tìm mọi file ' +
      '<code>.c</code> có chứa một chuỗi trong toàn bộ mã nguồn kernel, đếm số lần xuất hiện ' +
      'theo từng thư mục con và xếp hạng chúng — đúng mục tiêu đầu ra mà lộ trình đặt ra cho ' +
      'Chặng 01. Toàn bộ sức mạnh đó dựng trên đúng dấu <code>|</code> bạn vừa học.</p>' },

    { t: 'hr' }
  ],

  quiz: [
    {
      q: 'Bạn gõ <code>grep error log.txt &gt; log.txt</code> và sau đó file rỗng 0 byte. Ai đã xoá nội dung?',
      opts: [
        'grep, vì nó đọc file rồi ghi đè lên',
        'Bash, khi xử lý dấu <code>&gt;</code> trước lúc grep được nạp',
        'Kernel, vì file bị mở hai lần cùng lúc',
        'Không ai cả, dữ liệu vẫn còn nhưng ls hiển thị sai'
      ],
      a: 1,
      why: 'Shell xử lý mọi chuyển hướng ngay sau fork và trước exec. Tới lúc grep thật sự chạy thì file đã bị cắt về 0 byte. Bằng chứng: grep còn kịp báo <code>input file is also the output</code> và từ chối chạy, mà file vẫn mất sạch. Nguyên tắc này cũng giải thích vì sao sudo không cứu được <code>sudo lenh &gt; /etc/file</code>.'
    },
    {
      q: 'Câu lệnh nào ghi được <b>cả</b> kết quả và lỗi vào <code>log.txt</code>?',
      opts: [
        '<code>lenh 2&gt;&amp;1 &gt; log.txt</code>',
        '<code>lenh &gt; log.txt 2&gt;&amp;1</code>',
        '<code>lenh 2&gt; log.txt 1&gt; log.txt</code>',
        '<code>lenh &gt; log.txt &gt; 2</code>'
      ],
      a: 1,
      why: '<code>2&gt;&amp;1</code> chép <b>chỗ mà fd 1 đang trỏ tới ngay tại thời điểm đọc lệnh</b>, không phải tạo một liên kết sống. Vì thế fd 1 phải được đổi trước, rồi mới tới lượt fd 2 chép theo. Đáp án A đổi ngược thứ tự nên fd 2 chép nhầm màn hình. Dạng viết tắt tương đương là <code>&amp;&gt; log.txt</code>.'
    },
    {
      q: 'Bạn chạy <code>seq 1 1000000000 | head -3</code>. Vì sao nó xong trong 0,004 giây thay vì mất hàng phút?',
      opts: [
        'Bash nhận ra head chỉ cần 3 dòng nên tự sửa tham số của seq',
        'seq có tối ưu riêng, nó biết dừng khi đủ',
        'head thoát và đóng ống, kernel gửi SIGPIPE khiến seq chết ngay',
        'Kết quả được lấy từ bộ nhớ đệm của lần chạy trước'
      ],
      a: 2,
      why: 'Hai tầng chạy song song. Khi head in đủ 3 dòng, nó thoát và đầu đọc của ống bị đóng. Lần ghi tiếp theo của seq vào một ống không còn người đọc khiến kernel bắn SIGPIPE (tín hiệu 13) vào seq. Bạn kiểm chứng được bằng <code>${PIPESTATUS[@]}</code> cho ra <code>141 0</code>, mà 141 = 128 + 13 — đúng công thức đã học ở Bài 9.'
    },
    {
      q: 'Bạn viết <code>make 2&gt;&amp;1 | tee build.log</code> trong script CI. Bản dựng hỏng nhưng script báo thành công. Nguyên nhân đúng nhất là gì?',
      opts: [
        'tee đã nuốt mã thoát của make và luôn trả về 0',
        'Mã thoát của một đường ống mặc định là mã thoát của tầng cuối, tức là tee',
        '<code>2&gt;&amp;1</code> đã biến lỗi thành kết quả bình thường nên make không còn thất bại',
        'File build.log ghi thành công nên bash coi cả câu lệnh là thành công'
      ],
      a: 1,
      why: 'Đây là chẩn đoán bạn sẽ phải làm thật trong đời nghề. POSIX quy định <code>$?</code> của đường ống là mã thoát của lệnh <b>cuối cùng</b>. tee ghi file trót lọt nên trả về 0, che mất thất bại của make. Hai cách chữa: <code>set -o pipefail</code> để cả ống trả về mã khác 0, hoặc đọc <code>${PIPESTATUS[0]}</code> ngay dòng kế tiếp. Đáp án A sai ở chỗ tee không "nuốt" gì cả — nó chỉ vô tình là tầng cuối.'
    },
    {
      q: 'Bạn muốn thêm một dòng vào <code>/etc/hosts</code>. Cách nào chạy được?',
      opts: [
        '<code>sudo echo "127.0.0.1 board" &gt;&gt; /etc/hosts</code>',
        '<code>echo "127.0.0.1 board" | sudo tee -a /etc/hosts</code>',
        '<code>sudo (echo "127.0.0.1 board" &gt;&gt; /etc/hosts)</code>',
        '<code>echo "127.0.0.1 board" &gt;&gt; sudo /etc/hosts</code>'
      ],
      a: 1,
      why: 'Ở đáp án A, kẻ mở <code>/etc/hosts</code> là bash của bạn với quyền người dùng thường, còn sudo chỉ nâng quyền cho <code>echo</code> — quá muộn. Đáp án B chuyển việc mở file sang <code>tee</code>, và chính tee mới là tiến trình chạy dưới sudo. Cờ <code>-a</code> tương đương <code>&gt;&gt;</code>; bỏ nó đi là bạn xoá sạch /etc/hosts.'
    },
    {
      q: 'Bạn tạo file cấu hình bằng <code>cat &lt;&lt;EOF &gt; app.conf</code> và trong file có dòng <code>PATH=$PATH:/opt/bin</code>. Kết quả file sẽ thế nào?',
      opts: [
        'Đúng như bạn viết, vì here-doc luôn giữ nguyên văn bản',
        '<code>$PATH</code> bị thay bằng giá trị PATH của máy bạn lúc chạy lệnh',
        'Bash báo lỗi vì biến chưa được định nghĩa trong here-doc',
        'Dòng đó bị bỏ qua hoàn toàn'
      ],
      a: 1,
      why: 'Không có cặp nháy quanh từ khoá kết thúc thì bash <b>vẫn</b> thay thế biến và <code>$(lenh)</code> bên trong khối. File của bạn sẽ chứa một đường dẫn dài ngoằng của máy bạn thay vì chuỗi <code>$PATH</code>. Viết <code>&lt;&lt;\'EOF\'</code> để bash không đụng vào gì cả. Quy tắc thực dụng: mặc định dùng có nháy, chỉ bỏ nháy khi thực sự muốn nhúng giá trị động.'
    }
  ]
});

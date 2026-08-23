/* ═══════════════════════════════════════════════════════════════
   BÀI 8 — Người dùng, nhóm, quyền và sudo
   Chặng 01 · Linux căn bản
   ═══════════════════════════════════════════════════════════════ */

Lesson.register({
  id: 'bai-08',
  title: 'Người dùng, nhóm, quyền và sudo',
  minutes: 50,
  practice: 'Thực hành 30 phút',
  level: 'Người mới bắt đầu',

  intro:
    'Bạn đã gặp <code>Permission denied</code> ít nhất bốn lần trong bảy bài vừa rồi: khi chạy ' +
    '<code>./hello.sh</code> chưa có quyền thực thi, khi ghi vào <code>/sys</code>, khi đọc ' +
    '<code>/proc</code> của tiến trình người khác. Mỗi lần bạn được bảo "Bài 8 sẽ giải thích". ' +
    'Đây là Bài 8. Sau bài này, chín ký tự <code>rwxr-xr-x</code> sẽ không còn là bùa chú mà là ' +
    'một câu tiếng Việt bạn đọc trôi chảy — và bạn sẽ hiểu vì sao con số <b>755</b> lại nói cùng ' +
    'một điều. Phần cuối bài trả lời một câu hỏi riêng của nghề nhúng: vì sao chạy mọi thứ dưới ' +
    'quyền <b>root</b> là điều cấm kỵ trên máy để bàn nhưng lại là chuyện bình thường trên thiết bị.',

  goals: [
    'Đọc được chín ký tự quyền và dịch qua lại giữa dạng chữ và dạng số bát phân',
    'Dùng <code>chmod</code> ở cả hai dạng và biết khi nào dạng nào tiện hơn',
    'Giải thích <code>r</code>, <code>w</code>, <code>x</code> có nghĩa khác nhau với file và với thư mục',
    'Tính được quyền mặc định của file mới từ giá trị <code>umask</code>',
    'Chỉ ra bit setuid trên <code>/usr/bin/passwd</code> và giải thích vì sao nó bắt buộc phải có',
    'Nêu được vì sao thiết bị nhúng thường chạy dưới quyền root và rủi ro kèm theo'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. AI LÀ AI
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Trước hết: bạn là ai trong mắt kernel' },

    { t: 'p', x:
      'Kernel không biết bạn tên <i>shinarus</i>. Nó chỉ biết <b>số</b>. Mọi quyết định cho phép ' +
      'hay từ chối đều dựa trên vài con số gắn vào tiến trình của bạn.' },

    { t: 'terms', items: [
      ['UID', 'user ID', 'Số định danh người dùng. <b>UID 0 là root</b> — con số này mới là thứ ' +
       'quyết định quyền lực, không phải cái tên. Người dùng thường bắt đầu từ 1000.'],
      ['GID', 'group ID', 'Số định danh nhóm chính. Mỗi tiến trình có đúng một GID chính.'],
      ['Nhóm phụ', 'supplementary groups', 'Bạn có thể thuộc nhiều nhóm cùng lúc. Đây là cách ' +
       'Linux cấp quyền dùng phần cứng: vào nhóm <code>dialout</code> để mở cổng nối tiếp, nhóm ' +
       '<code>kvm</code> để dùng máy ảo.'],
      ['root', 'superuser', 'Người dùng UID 0. Kernel <b>bỏ qua gần như mọi kiểm tra quyền</b> ' +
       'với UID 0. Không phải root "có mọi quyền" — mà là kernel không thèm hỏi.'],
      ['/etc/passwd', '', 'Danh sách người dùng. Ai cũng đọc được, vì mọi chương trình cần tra ' +
       '"UID 1000 là ai" để hiển thị tên.'],
      ['/etc/shadow', '', 'Mật khẩu đã băm. <b>Chỉ root đọc được.</b> Tách khỏi ' +
       '<code>passwd</code> chính vì lý do này.']
    ]},

    { t: 'p', x: 'Đây là danh tính thật của bạn trên máy này:' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      'uid=1000(shinarus) gid=1000(shinarus) groups=1000(shinarus),4(adm),24(cdrom),\n' +
      '27(sudo),30(dip),46(plugdev),100(users)' },

    { t: 'cal', kind: 'info', title: 'Nhóm 27(sudo) là chìa khoá của toàn bộ bài này', x:
      '<p>Bạn thuộc nhóm <code>sudo</code>. Đó là lý do lệnh <code>sudo</code> chấp nhận bạn — ' +
      'không phải vì bạn "là quản trị viên", mà vì file cấu hình <code>/etc/sudoers</code> có một ' +
      'dòng nói rằng thành viên nhóm này được phép.</p>' +
      '<p>Trên một thiết bị nhúng do bạn dựng, nhóm đó có tồn tại hay không là do <b>bạn</b> quyết ' +
      'định. Rất nhiều rootfs tối giản không có <code>sudo</code> nào cả — chỉ có root.</p>' },

    { t: 'fig',
      cap: 'Kernel quyết định bằng cách so UID của tiến trình với chủ sở hữu file. Chỉ một nhóm quyền được áp dụng, và nó dừng ở lần khớp đầu tiên.',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Sơ đồ quy trình kernel kiểm tra quyền truy cập file theo thứ tự chủ sở hữu, nhóm, người khác">' +
        '<rect class="d-box-p" x="240" y="14" width="240" height="42" rx="6"/>' +
        '<text class="d-t" x="360" y="32" text-anchor="middle">Tiến trình mở file</text>' +
        '<text class="d-tm" x="360" y="48" text-anchor="middle">uid=1000 gid=1000</text>' +

        '<line class="d-line" x1="360" y1="56" x2="360" y2="76"/>' +
        '<path class="d-arrow" d="M360 76 l-4 -8 h8 z"/>' +

        '<rect class="d-box-w" x="180" y="80" width="360" height="40" rx="6"/>' +
        '<text class="d-t" x="360" y="98" text-anchor="middle">UID có phải 0 (root) không?</text>' +
        '<text class="d-ts" x="360" y="114" text-anchor="middle">nếu đúng → cho qua, không kiểm tra gì thêm</text>' +

        '<line class="d-line" x1="360" y1="120" x2="360" y2="140"/>' +
        '<path class="d-arrow" d="M360 140 l-4 -8 h8 z"/>' +

        '<rect class="d-box" x="180" y="144" width="360" height="38" rx="6"/>' +
        '<text class="d-t" x="360" y="162" text-anchor="middle">UID có bằng chủ sở hữu file không?</text>' +
        '<text class="d-ts" x="360" y="176" text-anchor="middle">nếu đúng → chỉ xét 3 ký tự ĐẦU, bỏ qua phần còn lại</text>' +

        '<line class="d-line" x1="360" y1="182" x2="360" y2="202"/>' +
        '<path class="d-arrow" d="M360 202 l-4 -8 h8 z"/>' +

        '<rect class="d-box" x="180" y="206" width="360" height="38" rx="6"/>' +
        '<text class="d-t" x="360" y="224" text-anchor="middle">Có thuộc nhóm của file không?</text>' +
        '<text class="d-ts" x="360" y="238" text-anchor="middle">nếu đúng → chỉ xét 3 ký tự GIỮA</text>' +

        '<line class="d-line" x1="360" y1="244" x2="360" y2="264"/>' +
        '<path class="d-arrow" d="M360 264 l-4 -8 h8 z"/>' +

        '<rect class="d-box-a" x="180" y="268" width="360" height="26" rx="6"/>' +
        '<text class="d-t" x="360" y="286" text-anchor="middle">Còn lại → xét 3 ký tự CUỐI</text>' +

        '<text class="d-ts" x="20" y="170">Dừng ở</text>' +
        '<text class="d-ts" x="20" y="188">lần khớp</text>' +
        '<text class="d-ts" x="20" y="206">đầu tiên.</text>' +
        '<text class="d-ts" x="580" y="170">Đây là lý do</text>' +
        '<text class="d-ts" x="580" y="188">chủ sở hữu có thể</text>' +
        '<text class="d-ts" x="580" y="206">bị cấm trong khi</text>' +
        '<text class="d-ts" x="580" y="224">người lạ được cho.</text>' +
        '</svg>' },

    { t: 'cal', kind: 'warn', title: 'Hệ quả trái khoáy: chủ sở hữu có thể bị khoá ngoài file của chính mình', x:
      '<p>File <code>----rwxrwx</code> nghĩa là chủ sở hữu <b>không có quyền gì</b>, còn mọi người ' +
      'khác đọc ghi thoải mái. Kernel dừng ở lần khớp đầu tiên, nên nó không "nâng cấp" xuống ' +
      'nhóm sau đó.</p>' +
      '<p>Nghe vô lý, nhưng chủ sở hữu vẫn <code>chmod</code> lại được — quyền đổi chế độ file gắn ' +
      'với <b>quyền sở hữu</b>, không nằm trong chín ký tự kia.</p>' },

    /* ══════════════════════════════════════════════
       2. CHÍN KÝ TỰ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Chín ký tự và con số tương đương' },

    { t: 'fig',
      cap: 'Ba nhóm ba ký tự. Mỗi nhóm là một chữ số bát phân vì ba bit biểu diễn được đúng các giá trị 0 đến 7.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Sơ đồ chuyển đổi giữa chín ký tự quyền rwxr-xr-x và số bát phân 755">' +
        '<rect class="d-box" x="30" y="20" width="40" height="40" rx="4"/>' +
        '<text class="d-tm" x="50" y="45" text-anchor="middle">-</text>' +
        '<text class="d-ts" x="50" y="76" text-anchor="middle">loại</text>' +

        '<rect class="d-box-g" x="86" y="20" width="150" height="40" rx="4"/>' +
        '<text class="d-tm" x="161" y="45" text-anchor="middle">r    w    x</text>' +
        '<text class="d-t" x="161" y="80" text-anchor="middle">chủ sở hữu</text>' +

        '<rect class="d-box-a" x="242" y="20" width="150" height="40" rx="4"/>' +
        '<text class="d-tm" x="317" y="45" text-anchor="middle">r    -    x</text>' +
        '<text class="d-t" x="317" y="80" text-anchor="middle">nhóm</text>' +

        '<rect class="d-box-w" x="398" y="20" width="150" height="40" rx="4"/>' +
        '<text class="d-tm" x="473" y="45" text-anchor="middle">r    -    x</text>' +
        '<text class="d-t" x="473" y="80" text-anchor="middle">người khác</text>' +

        '<text class="d-ts" x="110" y="112">4</text>' +
        '<text class="d-ts" x="158" y="112">2</text>' +
        '<text class="d-ts" x="206" y="112">1</text>' +
        '<text class="d-ts" x="266" y="112">4</text>' +
        '<text class="d-ts" x="314" y="112">0</text>' +
        '<text class="d-ts" x="362" y="112">1</text>' +
        '<text class="d-ts" x="422" y="112">4</text>' +
        '<text class="d-ts" x="470" y="112">0</text>' +
        '<text class="d-ts" x="518" y="112">1</text>' +

        '<line class="d-line" x1="86" y1="122" x2="236" y2="122"/>' +
        '<line class="d-line" x1="242" y1="122" x2="392" y2="122"/>' +
        '<line class="d-line" x1="398" y1="122" x2="548" y2="122"/>' +

        '<text class="d-t" x="161" y="146" text-anchor="middle">4+2+1 = 7</text>' +
        '<text class="d-t" x="317" y="146" text-anchor="middle">4+0+1 = 5</text>' +
        '<text class="d-t" x="473" y="146" text-anchor="middle">4+0+1 = 5</text>' +

        '<rect class="d-box-p" x="242" y="164" width="236" height="40" rx="6"/>' +
        '<text class="d-t" x="360" y="190" text-anchor="middle">chmod 755</text>' +

        '<text class="d-ts" x="30" y="228">r = 4 (đọc) · w = 2 (ghi) · x = 1 (thực thi). Ba số nguyên tố của quyền — cộng lại không bao giờ trùng nhau.</text>' +
        '</svg>' },

    { t: 'table',
      head: ['Số', 'Ký tự', 'Nghĩa'],
      rows: [
        ['<code>7</code>', '<code>rwx</code>', 'Đọc, ghi, thực thi'],
        ['<code>6</code>', '<code>rw-</code>', 'Đọc, ghi — mặc định của file dữ liệu'],
        ['<code>5</code>', '<code>r-x</code>', 'Đọc, thực thi — mặc định của chương trình và thư mục dùng chung'],
        ['<code>4</code>', '<code>r--</code>', 'Chỉ đọc'],
        ['<code>3</code>', '<code>-wx</code>', 'Ghi và thực thi, không đọc — hiếm, nhưng có ý nghĩa với thư mục'],
        ['<code>2</code>', '<code>-w-</code>', 'Chỉ ghi'],
        ['<code>1</code>', '<code>--x</code>', 'Chỉ thực thi — với thư mục nghĩa là "đi qua được nhưng không liệt kê được"'],
        ['<code>0</code>', '<code>---</code>', 'Không gì cả']
      ]},

    { t: 'h3', x: 'Bốn con số bạn sẽ gõ 95% thời gian' },

    { t: 'table',
      head: ['Số', 'Kết quả', 'Dùng cho'],
      rows: [
        ['<code>644</code>', '<code>rw-r--r--</code>', 'File văn bản, mã nguồn, cấu hình thường'],
        ['<code>755</code>', '<code>rwxr-xr-x</code>', 'Script, chương trình, và <b>mọi thư mục</b>'],
        ['<code>600</code>', '<code>rw-------</code>', 'Khoá riêng SSH, file chứa mật khẩu'],
        ['<code>777</code>', '<code>rwxrwxrwx</code>', '<b>Gần như luôn là sai.</b> Xem cảnh báo bên dưới']
      ]},

    { t: 'cal', kind: 'danger', title: 'chmod 777 không phải là "sửa lỗi phân quyền"', x:
      '<p>Khi gặp <code>Permission denied</code>, nhiều người gõ <code>chmod 777</code> và thấy ' +
      '"hết lỗi". Thực ra họ vừa cho <b>mọi tiến trình trên máy</b> quyền ghi đè file đó.</p>' +
      '<p>Với khoá SSH thì <code>ssh</code> sẽ <b>từ chối dùng</b> khoá có quyền quá rộng và báo ' +
      '<code>UNPROTECTED PRIVATE KEY FILE</code>. Với script khởi động trên thiết bị nhúng thì ' +
      'bất kỳ tiến trình nào bị chiếm quyền cũng có thể sửa nó và giành quyền root ở lần khởi ' +
      'động sau.</p>' +
      '<p>Cách làm đúng: đọc thông báo lỗi, xác định <b>ai</b> đang bị chặn ở <b>quyền nào</b>, ' +
      'rồi mở đúng chừng đó.</p>' },

    /* ══════════════════════════════════════════════
       3. FILE vs THƯ MỤC
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'r, w, x nghĩa khác nhau với file và với thư mục' },

    { t: 'p', x:
      'Đây là chỗ gây nhầm lẫn nhiều nhất, vì cùng ba chữ cái nhưng ý nghĩa gần như không liên ' +
      'quan. Hãy nhớ lại Bài 6: <b>thư mục là một bảng ánh xạ tên → inode</b>. Mọi thứ dưới đây ' +
      'suy ra từ đó.' },

    { t: 'table',
      head: ['Bit', 'Với file', 'Với thư mục'],
      rows: [
        ['<code>r</code>', 'Đọc được nội dung',
         '<b>Liệt kê được các tên</b> bên trong. Không có nó thì <code>ls</code> thất bại'],
        ['<code>w</code>', 'Sửa được nội dung',
         '<b>Tạo, xoá, đổi tên</b> file bên trong. Chú ý: xoá một file phụ thuộc vào quyền ghi của <b>thư mục</b>, không phải của file'],
        ['<code>x</code>', 'Chạy được như chương trình',
         '<b>Đi qua được</b> — <code>cd</code> vào, hoặc mở một file bên trong bằng đường dẫn đầy đủ']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao xoá file lại không cần quyền ghi trên chính file đó', x:
      '<p>Vì xoá không phải là sửa file. Xoá là <b>gỡ một dòng khỏi bảng thư mục</b> — đúng như ' +
      'lời gọi <code>unlink()</code> bạn đã gặp ở Bài 6.</p>' +
      '<p>Nên điều kiện là quyền <code>w</code> trên <b>thư mục chứa nó</b>. Một file chỉ đọc ' +
      '<code>444</code> vẫn bị xoá sạch nếu thư mục cha cho ghi. Đây là lý do quyền của thư mục ' +
      'quan trọng hơn quyền của file khi bảo vệ dữ liệu.</p>' },

    { t: 'cal', kind: 'info', title: 'Cặp r và x của thư mục: hai thứ tách rời được', x:
      '<p><b>Có <code>r</code>, không <code>x</code></b> (ví dụ <code>644</code>): bạn thấy được ' +
      'danh sách tên nhưng không <code>cd</code> vào được và không mở được file nào bên trong.</p>' +
      '<p><b>Có <code>x</code>, không <code>r</code></b> (ví dụ <code>311</code>): bạn ' +
      '<b>không</b> liệt kê được, nhưng nếu <b>biết chính xác tên</b> thì vẫn mở được file. ' +
      'Phần thực hành sẽ cho bạn tự tay dựng đúng tình huống này.</p>' +
      '<p>Kiểu thư mục thứ hai là cách người ta bảo vệ <code>/home</code> trên máy chủ dùng chung: ' +
      'ai cũng đi qua được để tới thư mục của mình, nhưng không ai xem được danh sách người dùng.</p>' },

    { t: 'cal', kind: 'tip', title: 'Vì sao thư mục hầu như luôn là 755 chứ không phải 644', x:
      '<p>Vì thiếu bit <code>x</code> thì thư mục coi như vô dụng — không vào được, không mở được ' +
      'file nào bên trong.</p>' +
      '<p>Đây cũng là lý do <code>chmod -R 644 folder</code> là một trong những lệnh phá hoại phổ ' +
      'biến nhất: nó gỡ bit <code>x</code> khỏi <b>mọi thư mục con</b> và bạn mất luôn lối vào. ' +
      'Muốn đặt hàng loạt thì dùng <code>chmod -R u=rwX,go=rX</code> — chữ <code>X</code> viết hoa ' +
      'nghĩa là "chỉ đặt <code>x</code> cho thư mục và cho file vốn đã thực thi được".</p>' },

    /* ══════════════════════════════════════════════
       4. CHMOD
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'chmod: hai cách nói cùng một điều' },

    { t: 'p', x:
      '<code>chmod</code> (<i>change mode</i> — đổi chế độ) nhận đối số ở hai dạng. Dạng số ' +
      '<b>đặt lại toàn bộ</b> chín bit. Dạng chữ <b>cộng thêm hoặc bớt đi</b> so với hiện trạng. ' +
      'Chọn sai dạng là nguồn của rất nhiều tai nạn.' },

    { t: 'cmdx', cmd: 'chmod [tuỳ chọn] CHẾ_ĐỘ FILE...', title: 'Dạng chữ: ai · phép · quyền',
      rows: [
        ['<code>u</code>', 'user — chủ sở hữu', 'Ba ký tự đầu'],
        ['<code>g</code>', 'group — nhóm của file', 'Ba ký tự giữa'],
        ['<code>o</code>', 'others — mọi người khác', 'Ba ký tự cuối'],
        ['<code>a</code>', 'all — cả ba nhóm', 'Bằng <code>ugo</code>. Bỏ trống cũng hiểu là <code>a</code>'],
        ['<code>+</code>', 'Thêm quyền, giữ nguyên phần còn lại', '<code>chmod u+x f</code>'],
        ['<code>-</code>', 'Bớt quyền, giữ nguyên phần còn lại', '<code>chmod go-r f</code>'],
        ['<code>=</code>', 'Đặt <b>đúng bằng</b>, xoá những gì không liệt kê', '<code>chmod u=rw f</code>'],
        ['<code>-R</code>', 'Đệ quy xuống mọi thư mục con', 'Nguy hiểm — xem cảnh báo ở trên về <code>X</code> hoa'],
        ['<code>--reference=F</code>', 'Sao chép chế độ của file khác', 'Tiện khi phục hồi một file bị đặt sai']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao dạng số lại phổ biến hơn trong tài liệu', x:
      '<p>Vì nó <b>tuyệt đối</b>. <code>chmod 644 f</code> cho cùng một kết quả bất kể file đang ' +
      'ở trạng thái nào — viết trong tài liệu hay script cài đặt thì đó là tính chất bắt buộc.</p>' +
      '<p>Ngược lại <code>chmod +x f</code> phụ thuộc vào <code>umask</code> hiện tại và vào quyền ' +
      'cũ, nên kết quả có thể khác nhau giữa hai máy. Dùng dạng chữ khi bạn gõ tay và chỉ muốn ' +
      'đụng vào <b>một</b> bit; dùng dạng số khi bạn viết vào script.</p>' },

    { t: 'cal', kind: 'tip', title: 'Mã thoát 126 là dấu hiệu riêng của "quên chmod +x"', x:
      '<p>Nếu <code>./script.sh</code> báo <code>Permission denied</code> và <code>echo $?</code> ' +
      'cho <b>126</b>, gần như chắc chắn là thiếu bit <code>x</code>. Nhớ phân biệt:</p>' +
      '<ul>' +
      '<li><b>126</b> — tìm thấy file nhưng không chạy được (thiếu <code>x</code>, hoặc file ở ' +
      'phân vùng gắn với <code>noexec</code>)</li>' +
      '<li><b>127</b> — không tìm thấy lệnh. Đây chính là mã bạn nhận được ở Bài 6 khi gõ ' +
      '<code>tree</code></li>' +
      '</ul>' +
      '<p>Hai con số này tiết kiệm cho bạn rất nhiều thời gian đoán mò.</p>' },

    { t: 'h3', x: 'chown và chgrp: đổi chủ, không đổi quyền' },

    { t: 'p', x:
      '<code>chown</code> đổi chủ sở hữu, <code>chgrp</code> đổi nhóm. Cú pháp gộp thường dùng là ' +
      '<code>chown chu:nhom file</code>. Điểm mấu chốt: <b>người dùng thường không được phép cho ' +
      'đi file của mình</b> — chỉ root mới <code>chown</code> được.' },

    { t: 'cal', kind: 'why', title: 'Vì sao Linux cấm bạn tặng file cho người khác', x:
      '<p>Vì hạn ngạch đĩa (<i>disk quota</i>) tính theo chủ sở hữu. Nếu ai cũng ' +
      '<code>chown</code> được, bạn chỉ cần đổ đầy đĩa rồi gán hết cho một người khác là vượt ' +
      'hạn ngạch của mình.</p>' +
      '<p>Còn một lý do bảo mật nữa: kết hợp với bit setuid ở phần dưới, quyền cho đi file sẽ ' +
      'thành quyền tạo cửa hậu. Phần thực hành sẽ cho bạn thấy thông báo từ chối thật.</p>' },

    /* ══════════════════════════════════════════════
       5. UMASK
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'umask: vì sao file mới luôn là 644' },

    { t: 'p', x:
      'Bạn <code>touch</code> một file và nó ra <code>rw-r--r--</code>. Không ai đặt số đó. ' +
      'Nó là kết quả của một phép trừ: hệ thống muốn tạo file với quyền tối đa, rồi ' +
      '<b>gỡ bỏ</b> những bit nằm trong <code>umask</code>.' },

    { t: 'table',
      head: ['Loại', 'Quyền tối đa hệ thống đề xuất', 'Trừ umask 022', 'Kết quả'],
      rows: [
        ['File', '<code>666</code> <span class="muted">rw-rw-rw-</span>', '<code>022</code>',
         '<b>644</b> <span class="muted">rw-r--r--</span>'],
        ['Thư mục', '<code>777</code> <span class="muted">rwxrwxrwx</span>', '<code>022</code>',
         '<b>755</b> <span class="muted">rwxr-xr-x</span>']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao file khởi đầu từ 666 mà không phải 777', x:
      '<p>Vì kernel <b>không bao giờ</b> tự đặt bit thực thi cho một file mới. Một file văn bản ' +
      'vừa được tạo mà tự nhiên chạy được là một lỗ hổng: chỉ cần lừa được nạn nhân ghi nội dung ' +
      'tuỳ ý vào đó là có ngay một chương trình.</p>' +
      '<p>Thư mục thì ngược lại — không có <code>x</code> thì thư mục vô dụng, nên nó khởi đầu ' +
      'từ <code>777</code>. Đó là toàn bộ lý do cùng một <code>umask 022</code> lại cho ra ' +
      '<code>644</code> cho file và <code>755</code> cho thư mục.</p>' },

    { t: 'cmdx', cmd: 'umask [-S] [giá_trị]', title: 'Đọc và đặt mặt nạ quyền',
      rows: [
        ['<code>umask</code>', 'In giá trị hiện tại dạng số', 'Máy này: <code>0022</code>'],
        ['<code>umask -S</code>', 'In dạng chữ — cho biết những gì <b>còn lại</b>, không phải phần bị gỡ',
         'Máy này: <code>u=rwx,g=rx,o=rx</code>'],
        ['<code>umask 077</code>', 'Đặt mặt nạ mới cho <b>shell hiện tại</b>',
         'File mới sẽ là <code>600</code> — hoàn toàn riêng tư'],
        ['<code>umask 002</code>', 'Nới cho nhóm ghi được', 'File <code>664</code>, thư mục <code>775</code> — kiểu làm việc nhóm']
      ]},

    { t: 'cal', kind: 'warn', title: 'umask chỉ sống trong shell hiện tại', x:
      '<p><code>umask</code> là lệnh dựng sẵn của bash, giống <code>cd</code> ở Bài 4. Nó sửa một ' +
      'thuộc tính của <b>tiến trình shell</b>, và thuộc tính đó được truyền cho các tiến trình ' +
      'con. Đóng terminal là mất.</p>' +
      '<p>Muốn cố định thì đặt trong <code>~/.bashrc</code>. Trên thiết bị nhúng, giá trị này ' +
      'thường nằm trong script khởi tạo của init — và nếu nó sai, mọi file mà ứng dụng của bạn ' +
      'ghi ra lúc chạy đều sai quyền theo.</p>' },

    /* ══════════════════════════════════════════════
       6. BA BIT ĐẶC BIỆT
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Ba bit đặc biệt: setuid, setgid, sticky' },

    { t: 'p', x:
      'Chín bit vừa học nằm ở ba chữ số cuối. Còn một chữ số thứ tư ở phía trước — thường là ' +
      '<code>0</code> nên không ai để ý. Đây chính là chỗ <code>chmod 4755</code> khác ' +
      '<code>chmod 755</code>.' },

    { t: 'table',
      head: ['Bit', 'Số', 'Hiện ở đâu', 'Tác dụng'],
      rows: [
        ['<b>setuid</b>', '<code>4000</code>', 'Chữ <code>s</code> thay <code>x</code> của chủ sở hữu — <code>rw<b>s</b>r-xr-x</code>',
         'Chương trình chạy dưới quyền <b>chủ sở hữu file</b>, không phải người gọi'],
        ['<b>setgid</b>', '<code>2000</code>', 'Chữ <code>s</code> thay <code>x</code> của nhóm — <code>rwxr-<b>s</b>r-x</code>',
         'Với file: chạy dưới quyền nhóm của file. Với <b>thư mục</b>: file tạo ra bên trong thừa kế nhóm của thư mục'],
        ['<b>sticky</b>', '<code>1000</code>', 'Chữ <code>t</code> thay <code>x</code> của người khác — <code>rwxrwxrw<b>t</b></code>',
         'Chỉ chủ sở hữu file mới xoá được file của mình, dù thư mục cho mọi người ghi']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao passwd bắt buộc phải có setuid', x:
      '<p>Đổi mật khẩu nghĩa là ghi vào <code>/etc/shadow</code>. File đó là ' +
      '<code>-rw-r-----&nbsp;root&nbsp;shadow</code> — bạn thậm chí không <b>đọc</b> được, ' +
      'nói gì đến ghi.</p>' +
      '<p>Nhưng bạn vẫn đổi được mật khẩu của mình. Bí mật nằm ở <code>/usr/bin/passwd</code>: ' +
      'chế độ <b>4755</b>, chủ sở hữu <b>root</b>. Khi bạn chạy nó, kernel khởi động tiến trình ' +
      'với UID hiệu lực = <b>0</b>. Trong vài mili-giây đó, chương trình có toàn quyền root — ' +
      'và bản thân nó phải tự giới hạn chỉ sửa đúng dòng của bạn.</p>' +
      '<p><code>sudo</code> hoạt động y hệt: cũng là <b>4755 root</b>. Không có setuid thì ' +
      'không có <code>sudo</code>.</p>' },

    { t: 'cal', kind: 'danger', title: 'Setuid là bề mặt tấn công lớn nhất trên một rootfs nhúng', x:
      '<p>Một chương trình setuid-root có <b>lỗi tràn bộ đệm</b> nghĩa là kẻ tấn công có root. ' +
      'Vì thế:</p>' +
      '<ul>' +
      '<li>Danh sách file setuid trên thiết bị phải <b>ngắn và biết rõ từng cái</b>. Phần thực ' +
      'hành sẽ dạy bạn lệnh liệt kê nó.</li>' +
      '<li>Đừng bao giờ đặt setuid cho script shell — kernel Linux <b>bỏ qua</b> setuid trên ' +
      'script chính vì lý do an toàn, nên nó không có tác dụng mà chỉ khiến bạn tưởng nhầm là ' +
      'đã an toàn.</li>' +
      '<li>Gắn phân vùng dữ liệu với tuỳ chọn <code>nosuid</code> để kernel phớt lờ mọi bit ' +
      'setuid ở đó.</li>' +
      '</ul>' },

    { t: 'cal', kind: 'info', title: 'Sticky bit: vì sao /tmp không thành bãi chiến trường', x:
      '<p><code>/tmp</code> là <code>drwxrwxrwt</code> — chữ <code>t</code> cuối cùng. Mọi người ' +
      'ghi được vào đó, nhưng theo quy tắc ở phần trên thì "ai ghi được thư mục thì xoá được mọi ' +
      'file trong đó". Sticky bit huỷ bỏ đúng ngoại lệ đó: bạn chỉ xoá được file của chính mình.</p>' +
      '<p>Tên gọi "sticky" là di sản: ngày xưa bit này giữ chương trình <i>dính</i> lại trong bộ ' +
      'nhớ hoán đổi cho lần chạy sau. Ý nghĩa đó đã biến mất, cái tên thì ở lại.</p>' },

    /* ══════════════════════════════════════════════
       7. SUDO
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'sudo, su và vì sao đừng đăng nhập thẳng bằng root' },

    { t: 'table',
      head: ['Lệnh', 'Làm gì', 'Hỏi mật khẩu của ai'],
      rows: [
        ['<code>sudo lenh</code>', 'Chạy <b>một</b> lệnh dưới quyền root rồi trả lại quyền',
         'Của <b>chính bạn</b>'],
        ['<code>sudo -i</code>', 'Mở hẳn một shell đăng nhập của root', 'Của chính bạn'],
        ['<code>sudo -u ai lenh</code>', 'Chạy dưới quyền một người dùng khác', 'Của chính bạn'],
        ['<code>su -</code>', 'Chuyển sang root, giữ nguyên phiên', 'Của <b>root</b> — nên trên Ubuntu thường thất bại vì root không có mật khẩu'],
        ['<code>sudo -n lenh</code>', 'Không hỏi gì cả, thất bại ngay nếu cần mật khẩu',
         'Không hỏi — dùng trong script để kiểm tra']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao sudo tốt hơn su dù cùng dẫn tới root', x:
      '<ul>' +
      '<li><b>Không cần chia sẻ mật khẩu root.</b> Mười người quản trị, mười mật khẩu riêng. ' +
      'Một người nghỉ việc thì xoá một tài khoản, không phải đổi mật khẩu chung cho cả đội.</li>' +
      '<li><b>Có nhật ký.</b> Mọi lệnh <code>sudo</code> đều được ghi lại kèm tên người chạy.</li>' +
      '<li><b>Phạm vi hẹp.</b> <code>/etc/sudoers</code> cho phép giới hạn từng người chỉ chạy ' +
      'được vài lệnh cụ thể.</li>' +
      '<li><b>Cửa sổ quyền lực ngắn.</b> Một lệnh rồi thôi, thay vì cả một phiên làm việc dưới ' +
      'quyền root nơi mọi lỗi đánh máy đều có thể là thảm hoạ.</li>' +
      '</ul>' },

    { t: 'h3', x: 'Và bây giờ là chuyện riêng của nghề nhúng' },

    { t: 'p', x:
      'Mọi thứ ở trên là văn hoá của máy chủ và máy để bàn: nhiều người dùng, chia sẻ tài nguyên, ' +
      'phải bảo vệ nhau. Thiết bị nhúng không giống vậy chút nào — và chuẩn mực đảo ngược gần như ' +
      'hoàn toàn.' },

    { t: 'table',
      head: ['', 'Máy để bàn / máy chủ', 'Thiết bị nhúng'],
      rows: [
        ['Số người dùng thật', 'Nhiều người, cùng lúc', 'Thường là <b>không có ai</b> — không có bàn phím, không có ai đăng nhập'],
        ['Tiến trình chạy dưới quyền', 'Người dùng thường, tách biệt', 'Rất thường xuyên là <b>root</b>, tất cả'],
        ['Lý do', 'Bảo vệ người dùng khỏi nhau', 'Ứng dụng phải chạm thẳng vào <code>/dev</code>, <code>/sys</code>, GPIO, I2C — mọi thứ đó vốn chỉ root mới với tới'],
        ['Rootfs', 'Có <code>sudo</code>, có nhiều tài khoản', 'BusyBox tối giản, nhiều khi <b>không có <code>sudo</code></b>, chỉ có <code>root</code> và vài tài khoản hệ thống'],
        ['Rủi ro', 'Một tài khoản bị chiếm', 'Một lỗi trong ứng dụng = <b>toàn quyền thiết bị</b>, kể cả ghi đè firmware']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao chạy root trên thiết bị vừa là chuyện thường vừa là món nợ kỹ thuật', x:
      '<p>Nó <b>thường</b> vì đó là con đường ít trở ngại nhất: không phải nghĩ về nhóm ' +
      '<code>gpio</code>, không phải viết quy tắc udev, không phải gỡ lỗi ' +
      '<code>Permission denied</code> lúc 2 giờ sáng trước hạn giao hàng.</p>' +
      '<p>Nó là <b>món nợ</b> vì thiết bị của bạn rồi sẽ nối mạng. Lúc đó, một lỗi phân tích gói ' +
      'tin trong ứng dụng — vốn chỉ nên làm hỏng ứng dụng đó — sẽ trao cho kẻ tấn công quyền ghi ' +
      'lên phân vùng khởi động.</p>' +
      '<p>Cách trả nợ, theo thứ tự tăng dần công sức: cho ứng dụng chạy bằng một tài khoản riêng ' +
      '→ dùng quy tắc udev cấp quyền nhóm cho đúng thiết bị cần → dùng <i>capabilities</i> để cấp ' +
      'từng đặc quyền lẻ thay vì cả gói root. Chặng 08 và Chặng 12 sẽ quay lại chuyện này khi bạn ' +
      'đã có một rootfs thật để bảo vệ.</p>' },

    { t: 'cal', kind: 'info', title: 'Một cách nhìn giúp bạn nhớ mãi', x:
      '<p>Trên máy tính, hệ thống quyền bảo vệ <b>người dùng khỏi người dùng khác</b>.</p>' +
      '<p>Trên thiết bị nhúng, nó bảo vệ <b>thiết bị khỏi chính phần mềm của nó</b>.</p>' +
      '<p>Cùng một cơ chế, hai mục đích hoàn toàn khác nhau. Ai nhìn ra điều này sớm sẽ thiết kế ' +
      'rootfs tốt hơn hẳn.</p>' },

    /* ══════════════════════════════════════════════
       THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: tự tay bị từ chối, rồi tự tay mở khoá' },

    { t: 'p', x:
      'Bảy bước dưới đây cố ý dẫn bạn đâm vào <code>Permission denied</code> sáu lần khác nhau. ' +
      'Mỗi lần một nguyên nhân riêng. Đọc kỹ thông báo và mã thoát — đó là kỹ năng thật sự bạn ' +
      'mang theo ra ngoài thực địa, chứ không phải việc thuộc lòng con số 755.' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Xác định bạn là ai và bạn thuộc những nhóm nào',
        blocks: [
          { t: 'p', x:
            'Trước khi nói về quyền, phải biết danh tính. Ba lệnh này trả lời ba câu hỏi khác nhau ' +
            'nên đừng nhầm chúng với nhau.' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'mkdir -p ~/embedded/bai08 && cd ~/embedded/bai08\n' +
            'whoami\n' +
            'id\n' +
            'id -nG' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'shinarus\n' +
            'uid=1000(shinarus) gid=1000(shinarus) groups=1000(shinarus),4(adm),24(cdrom),27(sudo),30(dip),46(plugdev),100(users)\n' +
            'shinarus adm cdrom sudo dip plugdev users' },
          { t: 'cmdx', cmd: 'whoami · id · id -nG', title: 'Ba câu hỏi khác nhau',
            rows: [
              ['<code>whoami</code>', 'Chỉ tên đăng nhập', 'Bằng <code>id -un</code>'],
              ['<code>id</code>', 'Toàn bộ: UID, GID chính, mọi nhóm phụ kèm số',
               'Đây là lệnh bạn nên dùng khi gỡ lỗi phân quyền'],
              ['<code>id -nG</code>', '<code>-n</code> = tên thay vì số, <code>-G</code> = chỉ danh sách nhóm',
               'Dạng gọn để mắt đọc nhanh, hoặc để đưa vào script']
            ]},
          { t: 'cal', kind: 'info', x:
            '<p>Đây đúng là bộ số bạn đã đọc kỹ ở đầu bài: UID <b>1000</b>, và nhóm <code>27(sudo)</code> ' +
            'vẫn nằm trong danh sách. Khác biệt duy nhất là lần này chính tay bạn gõ lệnh và thấy nó ' +
            'hiện ra, không phải đọc một đoạn chép sẵn.</p>' },
          { t: 'p', x: 'Bây giờ xem hai dòng của chính bạn và của root trong sổ hộ tịch của hệ thống:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'grep "^shinarus:" /etc/passwd\n' +
            'grep "^root:" /etc/passwd\n' +
            'ls -l /etc/passwd /etc/shadow' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'shinarus:x:1000:1000::/home/shinarus:/bin/bash\n' +
            'root:x:0:0:root:/root:/bin/bash\n' +
            '-rw-r--r-- 1 root root   1384 Jul 31 21:35 /etc/passwd\n' +
            '-rw-r----- 1 root shadow  780 Jul 31 21:35 /etc/shadow' },
          { t: 'cal', kind: 'info', title: 'Đọc dòng /etc/passwd: bảy trường ngăn bởi dấu hai chấm', x:
            '<p><code>shinarus</code> : <code>x</code> : <code>1000</code> : <code>1000</code> : ' +
            '<code></code> : <code>/home/shinarus</code> : <code>/bin/bash</code></p>' +
            '<p>Lần lượt là <b>tên</b> · <b>mật khẩu</b> · <b>UID</b> · <b>GID</b> · <b>mô tả</b> ' +
            '(để trống) · <b>thư mục nhà</b> · <b>shell đăng nhập</b>.</p>' +
            '<p>Chữ <code>x</code> ở trường thứ hai nghĩa là "mật khẩu không ở đây, tra ' +
            '<code>/etc/shadow</code>". Ngày xưa nó nằm thẳng ở đây, ai cũng đọc được, và ' +
            'người ta bẻ khoá hàng loạt. Đối chiếu quyền hai file: <code>644</code> cho ai cũng ' +
            'đọc, <code>640 root:shadow</code> cho gần như không ai.</p>' +
            '<p>Chú ý dòng root: UID và GID đều là <b>0</b>. Đó mới là điều làm nên root.</p>' },
          { t: 'p', x: 'Thử đọc file mật khẩu — thất bại đầu tiên trong bài, và là thất bại đúng:' },
          { t: 'code', where: 'wsl', lang: 'bash', code: 'head -1 /etc/shadow\necho "rc=$?"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            "head: cannot open '/etc/shadow' for reading: Permission denied\n" +
            'rc=1' },
          { t: 'cal', kind: 'why', title: 'Đây là lần đầu bạn thấy quyền tệp chặn một lệnh thật', x:
            '<p><code>Permission denied</code> đến từ chính kernel: bit <code>r</code> trên ' +
            '<code>/etc/shadow</code> chỉ bật cho chủ sở hữu <code>root</code> và nhóm <code>shadow</code> ' +
            '— UID 1000 của bạn không khớp cả hai, đúng như quyền <code>640 root:shadow</code> vừa đọc ' +
            'ở trên. Không cần đợi ai xác nhận, chính con số đó đã dự đoán trước kết quả này.</p>' +
            '<p><code>rc=1</code> ở đây chỉ là "thất bại chung chung" mà <code>head</code> tự chọn — ' +
            'khác hẳn hai mã <b>126</b>/<b>127</b> có ý nghĩa cố định mà bạn sẽ gặp ở bước 4. Bước 7 sẽ ' +
            'cho bạn thấy một kiểu từ chối khác hẳn cả về câu chữ lẫn nguyên nhân: ' +
            '<code>Operation not permitted</code>, xảy ra khi thao tác cần một đặc quyền chứ không ' +
            'phải chỉ thiếu một bit quyền.</p>' },
          { t: 'p', x: 'Cuối cùng, xem ba dòng trong sổ nhóm:' },
          { t: 'code', where: 'wsl', lang: 'bash', code: 'grep -E "^(sudo|dialout|kvm):" /etc/group' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'dialout:x:20:\n' +
            'sudo:x:27:shinarus\n' +
            'kvm:x:991:' },
          { t: 'cmdx', cmd: 'grep -E "^(sudo|dialout|kvm):" /etc/group', title: 'Cờ và ký hiệu trong mẫu tìm',
            rows: [
              ['<code>grep</code>', 'Lọc ra những dòng khớp một mẫu, in nguyên dòng khớp', ''],
              ['<code>-E</code>', 'Bật <i>biểu thức chính quy mở rộng</i> — dấu <code>|</code> được ' +
               'hiểu là "hoặc" thay vì một ký tự thường',
               'Không có <code>-E</code>, muốn dùng <code>|</code> phải viết <code>\\|</code>. Bài 11 ' +
               'sẽ nói kỹ về hai kiểu biểu thức chính quy'],
              ['<code>^</code>', 'Neo mẫu vào <b>đầu dòng</b> — chỉ khớp khi tên nhóm nằm ngay từ ký tự ' +
               'đầu tiên, không khớp nếu nó nằm giữa dòng', ''],
              ['<code>(sudo|dialout|kvm)</code>', 'Ba lựa chọn trong một cặp ngoặc, khớp bất kỳ cái nào ' +
               'trong ba tên', 'Không có ngoặc thì <code>|</code> chia cắt toàn bộ mẫu, không riêng gì ' +
               'phần bên trong'],
              ['<code>:</code>', 'Dấu hai chấm ngay sau tên nhóm, đúng định dạng mỗi dòng của ' +
               '<code>/etc/group</code>', 'Đảm bảo mẫu dừng đúng ở tên nhóm — không có nó, một nhóm khác ' +
               'tên dài hơn nhưng bắt đầu bằng cùng chuỗi ký tự cũng sẽ khớp nhầm']
            ]},
          { t: 'cal', kind: 'why', title: 'Ba dòng này nói trước tương lai của bạn', x:
            '<p><code>sudo:x:27:shinarus</code> — tên bạn nằm ở trường cuối. Đó là toàn bộ lý do ' +
            'bạn dùng được <code>sudo</code>.</p>' +
            '<p><code>dialout:x:20:</code> — <b>trống</b>. Đây là nhóm sở hữu các cổng nối tiếp ' +
            '<code>/dev/ttyUSB*</code>. Khi bạn cắm bộ chuyển USB-UART vào bo mạch thật ở Chặng 02 ' +
            'và <code>minicom</code> báo không mở được cổng, nguyên nhân sẽ chính là dòng này.</p>' +
            '<p><code>kvm:x:991:</code> — cũng trống, dù máy bạn <b>có</b> <code>/dev/kvm</code>. ' +
            'Bước 7 sẽ cho bạn thấy hậu quả.</p>' }
        ]},

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Đọc quyền mặc định của file và thư mục vừa tạo',
        blocks: [
          { t: 'p', x:
            'Tạo ba thứ, không đặt quyền gì cả, rồi xem hệ thống tự chọn giúp bạn cái gì. Con số ' +
            'bạn sắp thấy là kết quả trực tiếp của <code>umask</code> ở bước 5.' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            "echo 'echo hello' > greet.sh\n" +
            'echo "this is a note" > notes.txt\n' +
            'mkdir store\n' +
            'ls -l' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'total 12\n' +
            '-rw-r--r-- 1 shinarus shinarus   11 Aug  6 08:05 greet.sh\n' +
            '-rw-r--r-- 1 shinarus shinarus   15 Aug  6 08:05 notes.txt\n' +
            'drwxr-xr-x 2 shinarus shinarus 4096 Aug  6 08:05 store' },
          { t: 'p', x:
            '<code>ls -l</code> cho dạng chữ. Muốn thấy con số thì dùng <code>stat</code> — lệnh ' +
            'này in đúng những trường bạn yêu cầu, nên nó cũng là lệnh dùng trong script:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            "stat -c '%a %A %U %G %n' greet.sh notes.txt store" },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '644 -rw-r--r-- shinarus shinarus greet.sh\n' +
            '644 -rw-r--r-- shinarus shinarus notes.txt\n' +
            '755 drwxr-xr-x shinarus shinarus store' },
          { t: 'cmdx', cmd: "stat -c '%a %A %U %G %n' FILE", title: 'Các ký hiệu định dạng hay dùng',
            rows: [
              ['<code>-c</code>', '<i>custom format</i> — in theo mẫu bạn viết, không in bảng dài mặc định', ''],
              ['<code>%a</code>', 'Quyền dạng <b>số bát phân</b>', '<code>644</code>'],
              ['<code>%A</code>', 'Quyền dạng <b>chữ</b>, y như <code>ls -l</code>', '<code>-rw-r--r--</code>'],
              ['<code>%U</code> <code>%G</code>', 'Tên chủ sở hữu và tên nhóm', '<code>%u</code> <code>%g</code> thường cho số'],
              ['<code>%n</code>', 'Tên file', 'Luôn đặt cuối cho dễ đọc'],
              ['<code>%s</code>', 'Kích thước byte', 'Không dùng ở đây nhưng rất hay cần']
            ]},
          { t: 'cal', kind: 'tip', title: 'stat là cách duy nhất đọc quyền một cách máy đọc được', x:
            '<p>Đừng bao giờ cắt cột từ <code>ls -l</code> trong script. Định dạng ' +
            '<code>ls</code> thay đổi theo hệ thống và theo ngôn ngữ hiển thị. ' +
            '<code>stat -c \'%a\'</code> thì luôn cho đúng một con số.</p>' +
            '<p>Ghi nhớ ngay hai con số vừa thấy: file mới là <b>644</b>, thư mục mới là ' +
            '<b>755</b>. Bước 5 sẽ giải thích chúng từ đâu ra.</p>' }
        ]},

      /* ---------- BƯỚC 3 ---------- */
      { title: 'chmod dạng số và dạng chữ trên cùng một file',
        blocks: [
          { t: 'p', x:
            'Bốn con số kinh điển trước. Sau mỗi lần đổi, <code>stat</code> xác nhận ngay — đây là ' +
            'thói quen tốt: đừng tin lệnh đã chạy, hãy kiểm chứng kết quả.' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            "chmod 755 greet.sh; stat -c '%a %A %n' greet.sh\n" +
            "chmod 644 greet.sh; stat -c '%a %A %n' greet.sh\n" +
            "chmod 600 greet.sh; stat -c '%a %A %n' greet.sh\n" +
            "chmod 777 greet.sh; stat -c '%a %A %n' greet.sh" },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '755 -rwxr-xr-x greet.sh\n' +
            '644 -rw-r--r-- greet.sh\n' +
            '600 -rw------- greet.sh\n' +
            '777 -rwxrwxrwx greet.sh' },
          { t: 'cal', kind: 'info', title: 'Bốn dòng này khớp đúng bảng bạn vừa đọc ở trên', x:
            '<p>So khớp từng ký tự với bảng "Bốn con số bạn sẽ gõ 95% thời gian": <code>rwxr-xr-x</code>, ' +
            '<code>rw-r--r--</code>, <code>rw-------</code>, <code>rwxrwxrwx</code> — đúng cả bốn, ' +
            'không lệch một chữ cái nào.</p>' +
            '<p>Chú ý mỗi lệnh <b>đặt lại toàn bộ</b> chín bit chứ không cộng dồn vào kết quả của dòng ' +
            'trước: từ <code>755</code> nhảy thẳng xuống <code>600</code> rồi vọt lên <code>777</code> mà ' +
            'không cần đi qua bước trung gian nào. Đây chính là tính "tuyệt đối" của dạng số đã nêu ở ' +
            'phần lý thuyết — đổi thứ tự bốn lệnh này, mỗi dòng kết quả vẫn y hệt, không phụ thuộc vào ' +
            'trạng thái trước đó.</p>' },
          { t: 'p', x:
            'Bây giờ dạng chữ. Đưa file về <code>644</code> rồi cộng trừ từng chút một — và ' +
            '<b>để ý con số thay đổi thế nào sau mỗi lệnh</b>:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'chmod 644 greet.sh\n' +
            "chmod u+x  greet.sh; stat -c '%a %A %n' greet.sh\n" +
            "chmod go-r greet.sh; stat -c '%a %A %n' greet.sh\n" +
            "chmod a+r  greet.sh; stat -c '%a %A %n' greet.sh\n" +
            "chmod u=rw,go=r greet.sh; stat -c '%a %A %n' greet.sh" },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '744 -rwxr--r-- greet.sh\n' +
            '700 -rwx------ greet.sh\n' +
            '744 -rwxr--r-- greet.sh\n' +
            '644 -rw-r--r-- greet.sh' },
          { t: 'cal', kind: 'info', title: 'Đọc lại bốn dòng trên như một câu chuyện', x:
            '<ol>' +
            '<li><code>u+x</code> từ <code>644</code> → <code>744</code>. Chỉ <b>một</b> bit đổi. ' +
            'Nhóm và người khác không bị đụng tới.</li>' +
            '<li><code>go-r</code> → <code>700</code>. Gỡ <code>r</code> khỏi nhóm và người khác, ' +
            'phần của chủ sở hữu giữ nguyên <code>7</code>.</li>' +
            '<li><code>a+r</code> → <code>744</code>. Trả lại <code>r</code> cho cả ba, nhưng ' +
            '<code>x</code> vẫn chỉ chủ sở hữu có — <code>+</code> không hề đụng tới bit khác.</li>' +
            '<li><code>u=rw,go=r</code> → <code>644</code>. Dấu <code>=</code> <b>xoá</b> bit ' +
            '<code>x</code> của chủ sở hữu vì nó không được liệt kê. Đây là khác biệt sống còn ' +
            'giữa <code>=</code> và <code>+</code>.</li>' +
            '</ol>' },
          { t: 'cal', kind: 'tip', title: 'Ghép nhiều mệnh đề bằng dấu phẩy, không có khoảng trắng', x:
            '<p><code>chmod u=rw,go=r f</code> chạy được. <code>chmod u=rw, go=r f</code> thì ' +
            'không — shell sẽ coi <code>go=r</code> là một tên file. Bài 4 đã cảnh báo: khoảng ' +
            'trắng là dấu phân cách đối số, và <code>chmod</code> không có cách nào biết bạn định ' +
            'nói gì khác.</p>' }
        ]},

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Đâm vào mã thoát 126 rồi tự mở khoá',
        blocks: [
          { t: 'p', x:
            'File <code>greet.sh</code> đang ở <code>644</code>. Nội dung là một script bash hoàn ' +
            'toàn hợp lệ. Thử chạy nó:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            "stat -c '%a %A %n' greet.sh\n" +
            './greet.sh\n' +
            'echo "rc=$?"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '644 -rw-r--r-- greet.sh\n' +
            'bash: ./greet.sh: Permission denied\n' +
            'rc=126' },
          { t: 'p', x: 'Thêm đúng một bit rồi chạy lại:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'chmod u+x greet.sh\n' +
            './greet.sh\n' +
            'echo "rc=$?"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'hello\n' +
            'rc=0' },
          { t: 'p', x:
            'Còn một đường vòng đáng biết: gọi trình thông dịch một cách tường minh thì bit ' +
            '<code>x</code> không cần thiết nữa.' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'chmod 644 greet.sh\n' +
            'bash greet.sh\n' +
            'echo "rc=$?"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'hello\n' +
            'rc=0' },
          { t: 'cal', kind: 'why', title: 'Vì sao bash greet.sh chạy được còn ./greet.sh thì không', x:
            '<p><code>./greet.sh</code> nghĩa là "kernel ơi, <b>thực thi</b> file này". Kernel kiểm ' +
            'tra bit <code>x</code> và từ chối.</p>' +
            '<p><code>bash greet.sh</code> nghĩa là "kernel ơi, thực thi <code>/bin/bash</code>" — ' +
            'mà <code>/bin/bash</code> thì có <code>x</code>. Sau đó bash chỉ <b>đọc</b> ' +
            '<code>greet.sh</code> như một file văn bản, và <code>r</code> thì file có.</p>' +
            '<p>Hệ quả thực tế: bit <code>x</code> trên script <b>không phải</b> một cơ chế bảo ' +
            'mật. Ai đọc được file thì luôn chạy được nội dung nó. Muốn thật sự chặn thì phải gỡ ' +
            'quyền <code>r</code>.</p>' },
          { t: 'cal', kind: 'tip', title: 'Bộ ba mã thoát cần thuộc lòng', x:
            '<p><b>126</b> = tìm thấy nhưng không chạy được (thiếu <code>x</code>). <b>127</b> = ' +
            'không tìm thấy lệnh, như <code>tree</code> ở Bài 6. <b>0</b> = thành công.</p>' +
            '<p>Khi một script khởi động trên thiết bị nhúng im lặng không chạy, ' +
            '<code>echo $?</code> phân biệt ngay "sai đường dẫn" với "quên <code>chmod +x</code> ' +
            'lúc đóng gói rootfs". Chặng 06 sẽ gặp lại đúng tình huống này.</p>' }
        ]},

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Chứng minh umask quyết định quyền của file mới',
        blocks: [
          { t: 'p', x: 'Đọc mặt nạ hiện tại ở cả hai dạng:' },
          { t: 'code', where: 'wsl', lang: 'bash', code: 'umask\numask -S' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '0022\n' +
            'u=rwx,g=rx,o=rx' },
          { t: 'cal', kind: 'warn', title: 'Hai dòng này nói ngược nhau — đừng đọc nhầm', x:
            '<p><code>0022</code> là những bit <b>bị gỡ bỏ</b>: gỡ <code>w</code> của nhóm và của ' +
            'người khác.</p>' +
            '<p><code>u=rwx,g=rx,o=rx</code> là những bit <b>còn lại</b> — đúng là ' +
            '<code>755</code>, tức quyền tối đa cho thư mục mới.</p>' +
            '<p>Cùng một thông tin, hai cách nói trái dấu. Rất nhiều người mất một buổi vì đọc ' +
            'nhầm chiều.</p>' },
          { t: 'p', x:
            'Bây giờ đặt ba mặt nạ khác nhau và xem quyền file thay đổi. Mỗi lệnh nằm trong ' +
            '<b>ngoặc đơn</b> — đó là shell con, để mặt nạ mới không rò rỉ ra phiên làm việc chính ' +
            'của bạn.' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            "( umask 027; touch f027.txt; mkdir d027; stat -c '%a %A %n' f027.txt d027 )\n" +
            "( umask 077; touch f077.txt; mkdir d077; stat -c '%a %A %n' f077.txt d077 )\n" +
            "( umask 002; touch f002.txt; mkdir d002; stat -c '%a %A %n' f002.txt d002 )\n" +
            'umask' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '640 -rw-r----- f027.txt\n' +
            '750 drwxr-x--- d027\n' +
            '600 -rw------- f077.txt\n' +
            '700 drwx------ d077\n' +
            '664 -rw-rw-r-- f002.txt\n' +
            '775 drwxrwxr-x d002\n' +
            '0022' },
          { t: 'table',
            head: ['umask', 'File: 666 trừ mặt nạ', 'Thư mục: 777 trừ mặt nạ', 'Ý đồ'],
            rows: [
              ['<code>027</code>', '<b>640</b>', '<b>750</b>', 'Nhóm đọc được, người ngoài không thấy gì'],
              ['<code>077</code>', '<b>600</b>', '<b>700</b>', 'Hoàn toàn riêng tư — mặt nạ của <code>~/.ssh</code>'],
              ['<code>002</code>', '<b>664</b>', '<b>775</b>', 'Nhóm ghi được — kiểu thư mục dự án chung'],
              ['<code>022</code>', '<b>644</b>', '<b>755</b>', 'Mặc định của máy bạn']
            ]},
          { t: 'cal', kind: 'info', title: 'Vì sao dòng umask cuối cùng vẫn là 0022', x:
            '<p>Vì ba lệnh trên chạy trong <b>shell con</b> do cặp ngoặc đơn tạo ra. Shell con ' +
            'nhận bản sao môi trường của cha, sửa gì thì sửa, và chết đi khi ngoặc đóng lại. ' +
            'Không có gì chảy ngược lên cha.</p>' +
            '<p>Đây là một mẫu rất đáng dùng lại: mọi thay đổi tạm thời — <code>umask</code>, ' +
            '<code>cd</code>, biến môi trường — đặt trong ngoặc đơn thì bạn không phải nhớ dọn ' +
            'dẹp. Bài 13 sẽ dùng lại nhiều lần khi viết script.</p>' } ]},

      /* ---------- BƯỚC 6 ---------- */
      { title: 'Tách rời r và x của thư mục để thấy chúng thật sự khác nhau',
        blocks: [
          { t: 'p', x:
            'Đây là bước quan trọng nhất của bài. Hai thí nghiệm dưới đây phá tan ngộ nhận phổ ' +
            'biến nhất về phân quyền thư mục. Dựng sân khấu trước:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'mkdir -p vault\n' +
            'echo "secret content" > vault/secret.txt' },
          { t: 'h4', x: 'Thí nghiệm A — có r, không có x (chế độ 644)' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'chmod 644 vault\n' +
            'ls vault;              echo "rc_ls=$?"\n' +
            'cd vault;              echo "rc_cd=$?"\n' +
            'cat vault/secret.txt;   echo "rc_cat=$?"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'secret.txt\n' +
            'rc_ls=0\n' +
            'bash: cd: vault: Permission denied\n' +
            'rc_cd=1\n' +
            'cat: vault/secret.txt: Permission denied\n' +
            'rc_cat=1' },
          { t: 'cal', kind: 'info', title: 'Bạn thấy tên file nhưng không chạm được vào nó', x:
            '<p><code>ls</code> thành công vì bit <code>r</code> cho phép <b>đọc bảng tên</b> của ' +
            'thư mục. Nhưng <code>cd</code> và <code>cat</code> đều cần bit <code>x</code> để ' +
            '<b>đi qua</b> thư mục, và bit đó không có.</p>' +
            '<p>Hình dung thư mục như một tấm biển ghi danh sách phòng ban trước cửa toà nhà: ' +
            '<code>r</code> cho bạn đọc tấm biển, <code>x</code> mới cho bạn bước qua cửa.</p>' },
          { t: 'h4', x: 'Thí nghiệm B — có x, không có r (chế độ 311)' },
          { t: 'p', x:
            '<code>311</code> = <code>-wx</code> cho chủ sở hữu, <code>--x</code> cho nhóm và ' +
            'người khác. Không ai đọc được danh sách, nhưng ai cũng đi qua được.' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'chmod 311 vault\n' +
            'ls vault;              echo "rc_ls=$?"\n' +
            'cat vault/secret.txt;   echo "rc_cat=$?"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            "ls: cannot open directory 'vault': Permission denied\n" +
            'rc_ls=2\n' +
            'secret content\n' +
            'rc_cat=0' },
          { t: 'cal', kind: 'why', title: 'Đây chính là cách /home được bảo vệ trên máy chủ thật', x:
            '<p>Bạn <b>không liệt kê được</b> thư mục, nhưng nếu <b>biết chính xác tên file</b> ' +
            'thì vẫn đọc được nội dung. Quyền của thư mục không hề bảo vệ file bên trong — nó chỉ ' +
            'giấu <i>danh sách tên</i>.</p>' +
            '<p>Mô hình này gọi là "thư mục chỉ đi qua". Nó cho phép mọi người dùng đi tới ' +
            '<code>/home/ten-cua-minh</code> mà không ai xem được danh sách toàn bộ người dùng ' +
            'trên máy.</p>' +
            '<p>Rút ra: <b>đừng bao giờ coi thư mục không đọc được là một cách giấu bí mật.</b> ' +
            'Muốn bảo vệ nội dung thì đặt quyền lên chính file — hoặc mã hoá nó.</p>' },
          { t: 'p', x: 'Trả thư mục về bình thường trước khi đi tiếp:' },
          { t: 'code', where: 'wsl', lang: 'bash', code: 'chmod 755 vault' },
          { t: 'cal', kind: 'warn', title: 'Nhớ trả quyền lại, nếu không rm -rf cũng thất bại', x:
            '<p>Bỏ quên một thư mục ở chế độ <code>311</code> hay <code>000</code> thì đến lúc dọn ' +
            'dẹp, <code>rm -rf</code> sẽ báo <code>Permission denied</code> cho từng file bên ' +
            'trong — vì nó không liệt kê hoặc không đi vào được. Bạn sẽ phải ' +
            '<code>chmod -R u+rwX</code> trước rồi mới xoá được.</p>' }
        ]},

      /* ---------- BƯỚC 7 ---------- */
      { title: 'Gặp bức tường root: chown, setuid, sticky và sudo',
        blocks: [
          { t: 'p', x:
            'Bước cuối gom mọi giới hạn của người dùng thường vào một chỗ. Trước hết, thử cho đi ' +
            'file của chính mình:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'chown root greet.sh; echo "rc=$?"\n' +
            'chgrp kvm  greet.sh; echo "rc=$?"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            "chown: changing ownership of 'greet.sh': Operation not permitted (os error 1)\n" +
            'rc=1\n' +
            "chgrp: changing group of 'greet.sh': Operation not permitted (os error 1)\n" +
            'rc=1' },
          { t: 'cal', kind: 'info', title: 'Operation not permitted khác Permission denied', x:
            '<p>Hai thông báo này tương ứng hai mã lỗi khác nhau của kernel: <code>EPERM</code> ' +
            '(thao tác chỉ dành cho đặc quyền) và <code>EACCES</code> (bit quyền không cho).</p>' +
            '<p>Phân biệt được chúng giúp bạn đoán đúng hướng sửa: <code>EACCES</code> thì ' +
            '<code>chmod</code> giải quyết được; <code>EPERM</code> thì <code>chmod</code> vô ' +
            'ích, bạn cần root.</p>' },
          { t: 'p', x: 'Tiếp theo, nhìn tận mắt bit setuid trên hai chương trình bạn dùng hằng ngày:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'ls -l /usr/bin/passwd\n' +
            'readlink -f /usr/bin/sudo\n' +
            'ls -l /usr/lib/cargo/bin/sudo' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '-rwsr-xr-x 1 root root 93640 Feb  3  2026 /usr/bin/passwd\n' +
            '/usr/lib/cargo/bin/sudo\n' +
            '-rwsr-xr-x 1 root root 1082656 Mar 11 20:27 /usr/lib/cargo/bin/sudo' },
          { t: 'cal', kind: 'info', title: 'Chữ s ở vị trí thứ tư — đó là toàn bộ phép màu', x:
            '<p><code>-rw<b>s</b>r-xr-x</code>: đáng lẽ vị trí đó là <code>x</code> của chủ sở ' +
            'hữu. Chữ <code>s</code> nghĩa là "vẫn thực thi được, <b>và</b> chạy dưới UID của chủ ' +
            'sở hữu" — mà chủ sở hữu ở đây là <code>root</code>.</p>' +
            '<p>Số bát phân đầy đủ của nó là <b>4755</b>. Chữ số <code>4</code> đứng trước chính ' +
            'là setuid.</p>' +
            '<p>Bạn cũng vừa gặp lại đường dẫn <code>/usr/lib/cargo/bin/</code> từ Bài 6 — máy này ' +
            'dùng bộ coreutils viết bằng Rust, và <code>sudo</code> cũng nằm trong đó.</p>' },
          { t: 'p', x:
            'Liệt kê <b>mọi</b> chương trình setuid trên máy. Đây là lệnh bạn sẽ chạy trên từng ' +
            'rootfs mình dựng ra:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'find /usr/bin -perm -4000 -type f 2>/dev/null | sort' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '/usr/bin/chfn\n' +
            '/usr/bin/chsh\n' +
            '/usr/bin/fusermount3\n' +
            '/usr/bin/gpasswd\n' +
            '/usr/bin/mount\n' +
            '/usr/bin/passwd\n' +
            '/usr/bin/su\n' +
            '/usr/bin/sudo.ws\n' +
            '/usr/bin/umount' },
          { t: 'cmdx', cmd: 'find /usr/bin -perm -4000 -type f 2>/dev/null', title: 'Mổ xẻ lệnh kiểm tra an ninh này',
            rows: [
              ['<code>/usr/bin</code>', 'Nơi bắt đầu tìm', 'Trên thiết bị thật hãy quét từ <code>/</code>'],
              ['<code>-perm -4000</code>', 'Dấu <b>trừ</b> nghĩa là "có <b>ít nhất</b> bit này". Không có dấu trừ là "bằng đúng"',
               '<code>-perm 4000</code> gần như không khớp gì'],
              ['<code>-type f</code>', 'Chỉ file thường', 'Loại bỏ thư mục và liên kết mềm'],
              ['<code>2>/dev/null</code>', 'Vứt bỏ dòng báo lỗi "không vào được thư mục"',
               'Bài 10 sẽ giải thích cặn kẽ ký hiệu <code>2></code>'],
              ['<code>-perm -2000</code>', 'Đổi sang tìm <b>setgid</b>', 'Cũng cần kiểm tra khi rà soát']
            ]},
          { t: 'cal', kind: 'tip', title: 'Chín file. Chỉ chín thôi — và đó là điểm mấu chốt', x:
            '<p>Một bản Ubuntu đầy đủ chỉ có chín chương trình setuid-root. Mỗi cái đều được rà ' +
            'soát an ninh nhiều năm.</p>' +
            '<p>Khi bạn dựng rootfs ở Chặng 06, hãy chạy đúng lệnh này và <b>giải thích được từng ' +
            'dòng</b>. Một dòng lạ trong danh sách đó là dấu hiệu hoặc bạn đóng gói sai, hoặc ai ' +
            'đó đã cài cửa hậu.</p>' },
          { t: 'p', x: 'Sticky bit trên <code>/tmp</code> — thư mục ai cũng ghi được nhưng vẫn trật tự:' },
          { t: 'code', where: 'wsl', lang: 'bash', code: "ls -ld /tmp\nstat -c '%a %A %n' /tmp" },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'drwxrwxrwt 8 root root 160 Aug  6 08:05 /tmp\n' +
            '1777 drwxrwxrwt /tmp' },
          { t: 'p', x:
            'Cuối cùng, ba bức tường còn lại: ghi vào file hệ thống, dùng <code>sudo</code> trong ' +
            'script, và mở thiết bị mình không thuộc nhóm.' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'echo test >> /etc/hostname; echo "rc=$?"\n' +
            'sudo -n id; echo "rc=$?"' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'bash: /etc/hostname: Permission denied\n' +
            'rc=1\n' +
            'sudo: interactive authentication is required\n' +
            'rc=1' },
          { t: 'cal', kind: 'warn', title: 'Thông báo lỗi đến từ bash, không phải từ echo', x:
            '<p>Để ý tiền tố <code>bash:</code>. Chính shell mở file để chuyển hướng ' +
            '<code>>></code>, nên chính shell bị từ chối — <code>echo</code> thậm chí chưa kịp ' +
            'chạy.</p>' +
            '<p>Đây là lý do <code>sudo echo x >> /etc/hostname</code> <b>vẫn thất bại</b>: ' +
            '<code>sudo</code> chỉ nâng quyền cho <code>echo</code>, còn việc mở file là do shell ' +
            'của bạn làm với quyền thường. Bài 10 sẽ dạy cách đúng bằng ' +
            '<code>sudo tee</code>.</p>' },

          { t: 'cal', kind: 'info', title: 'sudo -n thất bại ngay lập tức — đúng như bảng lý thuyết đã hứa', x:
            '<p><code>sudo: interactive authentication is required</code> là hệ quả trực tiếp của cờ ' +
            '<code>-n</code> (<i>non-interactive</i>): <code>sudo</code> cần mật khẩu của bạn nhưng bị ' +
            'cấm hỏi, nên nó thoát ngay với <code>rc=1</code> thay vì dừng lại chờ bạn gõ.</p>' +
            '<p>Đây đúng là công dụng đã nêu ở bảng phần lý thuyết: dùng <code>sudo -n</code> trong ' +
            'script để <b>kiểm tra</b> xem lệnh phía sau có cần mật khẩu hay không, mà không làm cả ' +
            'script bị treo chờ một input không bao giờ tới.</p>' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'ls -l /dev/kvm /dev/null /dev/sda\n' +
            'head -c 4 /dev/sda' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'crw-rw---- 1 root kvm  10, 232 Aug  6 08:05 /dev/kvm\n' +
            'crw-rw-rw- 1 root root  1,   3 Aug  6 08:05 /dev/null\n' +
            'brw-rw---- 1 root disk  8,   0 Aug  6 08:05 /dev/sda\n' +
            "head: cannot open '/dev/sda' for reading: Permission denied" },
          { t: 'cal', kind: 'why', title: 'Ba dòng này là toàn bộ mô hình bảo mật phần cứng của Linux', x:
            '<p><code>/dev/null</code> là <code>666</code> — vô hại nên cho tất cả.</p>' +
            '<p><code>/dev/sda</code> là <code>660 root:disk</code>. Bạn không thuộc nhóm ' +
            '<code>disk</code> (kiểm lại <code>id -nG</code> ở bước 1), nên bị chặn. Nếu đọc được ' +
            'đĩa thô thì mọi quyền trên file trở nên vô nghĩa — bạn đọc thẳng từng byte của ' +
            '<code>/etc/shadow</code>.</p>' +
            '<p><code>/dev/kvm</code> là <code>660 root:kvm</code>, và nhóm <code>kvm</code> ' +
            'trống. Đây là mẫu hình bạn sẽ gặp <b>liên tục</b> trong nghề nhúng: quyền dùng một ' +
            'phần cứng = tư cách thành viên một nhóm. GPIO, I2C, SPI, cổng nối tiếp đều theo đúng ' +
            'khuôn này, và quy tắc udev là thứ gán nhóm cho từng node thiết bị.</p>' },
          { t: 'p', x: 'Dọn dẹp:' },
          { t: 'code', where: 'wsl', lang: 'bash', code:
            'cd ~\nrm -rf ~/embedded/bai08\nls ~/embedded' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'bai03\nbai04\nbai05\nbai10\nbai10perf\nbai19\nbai24\nimages' }
        ]}
    ]},

    /* ══════════════════════════════════════════════
       LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>bash: ./script.sh: Permission denied</code> · <code>$?</code> = <b>126</b>',
         'File không có bit <code>x</code>',
         '<code>chmod +x script.sh</code>. Hoặc chạy tạm bằng <code>bash script.sh</code>'],
        ['<code>bash: script.sh: command not found</code> · <code>$?</code> = <b>127</b>',
         'Quên <code>./</code> — thư mục hiện tại không nằm trong <code>PATH</code>',
         'Gõ <code>./script.sh</code>. Xem lại Bài 4 về cách shell tìm lệnh'],
        ['<code>cat: f: Permission denied</code> trong khi <code>ls</code> vẫn thấy file',
         'Thư mục cha thiếu bit <code>x</code>, hoặc chính file thiếu <code>r</code>',
         '<code>stat -c \'%a %n\' . f</code> để xem cả hai. Thư mục hầu như luôn phải là <code>755</code>'],
        ['<code>ls: cannot open directory: Permission denied</code>',
         'Thư mục thiếu bit <code>r</code> (còn <code>x</code> thì vẫn đi qua được)',
         '<code>chmod u+r vault</code>. Nếu là thư mục của người khác thì cần root'],
        ['<code>chown: changing ownership: Operation not permitted</code>',
         'Người dùng thường không được cho đi file của mình',
         'Dùng <code>sudo chown</code>. Nếu chỉ muốn đổi nhóm sang một nhóm bạn đã thuộc thì <code>chgrp</code> được phép'],
        ['<code>sudo: interactive authentication is required</code>',
         '<code>sudo</code> cần mật khẩu nhưng không có terminal để hỏi (chạy trong script, cron, hoặc qua <code>wsl -- bash file</code>)',
         'Chạy trực tiếp trong terminal. Trong script thì dùng <code>sudo -n</code> để phát hiện sớm và báo lỗi rõ ràng'],
        ['<code>bash: /etc/xxx: Permission denied</code> dù đã có <code>sudo</code> ở đầu dòng',
         'Shell của bạn mở file để chuyển hướng <code>&gt;</code>, không phải lệnh sau <code>sudo</code>',
         '<code>echo x | sudo tee -a /etc/xxx</code>. Bài 10 giải thích'],
        ['<code>rm: cannot remove ...: Permission denied</code> khi xoá cây thư mục',
         'Một thư mục con thiếu <code>r</code> hoặc <code>x</code> nên không duyệt vào được',
         '<code>chmod -R u+rwX dir/</code> rồi xoá lại. Chú ý <code>X</code> viết hoa'],
        ['<code>UNPROTECTED PRIVATE KEY FILE</code> khi dùng <code>ssh</code>',
         'Khoá riêng có quyền quá rộng, thường do vừa <code>chmod 777</code>',
         '<code>chmod 600 ~/.ssh/id_*</code> và <code>chmod 700 ~/.ssh</code>'],
        ['Ứng dụng chạy được bằng <code>sudo</code> nhưng không chạy được bình thường',
         'Nó cần một node trong <code>/dev</code> thuộc nhóm bạn chưa tham gia',
         '<code>ls -l</code> node đó, rồi thêm mình vào nhóm. <b>Phải đăng xuất đăng nhập lại</b> — nhóm chỉ được nạp lúc đăng nhập']
      ]},

    /* ══════════════════════════════════════════════
       RECAP
       ══════════════════════════════════════════════ */
    { t: 'recap', title: 'Tóm tắt Bài 8', items: [
      'Kernel chỉ biết <b>số</b>: UID và GID. <b>UID 0</b> là root, và root được cho qua trước khi mọi kiểm tra quyền diễn ra.',
      'Kernel xét <b>đúng một</b> nhóm ba ký tự và dừng ở lần khớp đầu tiên: chủ sở hữu → nhóm → người khác. Nó không xét tiếp để nới thêm.',
      '<code>r=4</code>, <code>w=2</code>, <code>x=1</code>. Bốn con số cần thuộc: <b>644</b> file dữ liệu, <b>755</b> chương trình và mọi thư mục, <b>600</b> khoá riêng, <b>777</b> gần như luôn là sai.',
      'Với thư mục: <code>r</code> = liệt kê tên, <code>w</code> = tạo/xoá/đổi tên bên trong, <code>x</code> = đi qua. Bạn đã tự tay chứng minh <b>644</b> cho <code>ls</code> nhưng chặn <code>cd</code>, còn <b>311</b> chặn <code>ls</code> nhưng vẫn cho <code>cat</code>.',
      'Xoá file phụ thuộc quyền ghi của <b>thư mục cha</b>, không phải của file — vì xoá là gỡ một dòng khỏi bảng thư mục.',
      'File mới = <code>666</code> trừ umask, thư mục mới = <code>777</code> trừ umask. Với <code>umask 0022</code> trên máy bạn, kết quả là <b>644</b> và <b>755</b>. Kernel không bao giờ tự đặt bit <code>x</code> cho file mới.',
      'Mã thoát <b>126</b> = thiếu bit <code>x</code>; <b>127</b> = không tìm thấy lệnh. Hai con số này chẩn đoán bệnh nhanh hơn mọi phỏng đoán.',
      '<code>bash script.sh</code> chạy được cả khi script không có <code>x</code> — nên bit <code>x</code> <b>không phải</b> cơ chế bảo mật.',
      'Bit setuid (<code>4000</code>, hiện là chữ <code>s</code>) cho chương trình chạy dưới quyền chủ sở hữu. <code>/usr/bin/passwd</code> và <code>sudo</code> đều là <b>4755 root</b> — không có nó thì bạn không đổi được mật khẩu. Máy bạn có đúng <b>9</b> file setuid trong <code>/usr/bin</code>.',
      'Sticky bit (<code>1000</code>, chữ <code>t</code>) làm <code>/tmp</code> thành <b>1777</b>: ai cũng ghi được nhưng chỉ xoá được file của mình.',
      'Quyền dùng phần cứng = <b>tư cách thành viên nhóm</b>. <code>/dev/sda</code> là <code>660 root:disk</code>, <code>/dev/kvm</code> là <code>660 root:kvm</code> — bạn không thuộc nhóm nào trong hai nhóm đó nên bị chặn.',
      'Trên máy tính, phân quyền bảo vệ <b>người dùng khỏi người dùng khác</b>. Trên thiết bị nhúng, nó bảo vệ <b>thiết bị khỏi chính phần mềm của nó</b> — cùng cơ chế, khác mục đích.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo', x:
      '<p>Bạn đã biết <i>ai</i> được phép làm gì. Bài 9 chuyển sang <i>cái gì đang chạy</i>: tiến ' +
      'trình, PID, cây tiến trình mọc lên từ PID 1, và cách một tiến trình bị dừng lại. Bạn sẽ ' +
      'đọc <code>ps</code> và <code>top</code>, đẩy một lệnh xuống chạy nền bằng <code>&amp;</code> ' +
      'rồi kéo nó lên bằng <code>fg</code>, và quan trọng nhất là hiểu <b>tín hiệu</b>: vì sao ' +
      '<code>Ctrl+C</code> lịch sự còn <code>kill -9</code> thì tàn nhẫn, và vì sao dùng ' +
      '<code>-9</code> quá sớm sẽ khiến thiết bị nhúng của bạn mất dữ liệu chưa kịp ghi xuống ' +
      'flash. Chúng ta sẽ đo bằng số: đếm xem trên WSL2 của bạn có bao nhiêu tiến trình, và cây ' +
      'của chúng mọc ra từ đâu.</p>' },

    { t: 'hr' }
  ],

  quiz: [
    { q: 'File có chế độ <code>-rwxr-xr--</code>. Số bát phân tương ứng là bao nhiêu?',
      opts: ['754', '755', '744', '764'],
      a: 0,
      why: 'Cộng từng nhóm ba: <code>rwx</code> = 4+2+1 = 7, <code>r-x</code> = 4+0+1 = 5, ' +
           '<code>r--</code> = 4+0+0 = 4. Vậy là <b>754</b>. Mẹo: cứ đọc từ trái sang phải và cộng ' +
           '4 cho <code>r</code>, 2 cho <code>w</code>, 1 cho <code>x</code> — ba số nguyên tố này ' +
           'được chọn chính vì mọi tổ hợp cho ra một tổng duy nhất.' },

    { q: 'Bạn gõ <code>./deploy.sh</code> và nhận <code>Permission denied</code>. <code>echo $?</code> cho <b>126</b>. Nguyên nhân nhiều khả năng nhất là gì?',
      opts: ['Không tìm thấy file deploy.sh',
             'File tồn tại nhưng thiếu bit thực thi',
             'Bạn không có quyền đọc file',
             'Cần chạy bằng sudo'],
      a: 1,
      why: 'Mã <b>126</b> có nghĩa rất hẹp: shell <b>đã tìm thấy</b> file nhưng kernel từ chối thực ' +
           'thi nó. Nếu không tìm thấy file thì mã sẽ là <b>127</b>. Cách sửa là ' +
           '<code>chmod +x deploy.sh</code>, hoặc chạy vòng qua bằng <code>bash deploy.sh</code> vì ' +
           'cách đó chỉ cần quyền <b>đọc</b>. Phân biệt 126 với 127 tiết kiệm cho bạn rất nhiều ' +
           'thời gian đoán mò.' },

    { q: 'Thư mục <code>project</code> có chế độ <code>311</code>. Bạn biết bên trong có file <code>notes.txt</code>. Điều gì xảy ra?',
      opts: ['Cả <code>ls project</code> và <code>cat project/notes.txt</code> đều thất bại',
             '<code>ls project</code> chạy được, <code>cat project/notes.txt</code> thất bại',
             '<code>ls project</code> thất bại, <code>cat project/notes.txt</code> chạy được',
             'Cả hai đều chạy được vì bạn là chủ sở hữu'],
      a: 2,
      why: '<code>311</code> cho chủ sở hữu <code>-wx</code>: có <code>x</code> nhưng <b>không</b> ' +
           'có <code>r</code>. Với thư mục, <code>r</code> là quyền <b>liệt kê tên</b> nên ' +
           '<code>ls</code> thất bại; <code>x</code> là quyền <b>đi qua</b> nên nếu bạn biết chính ' +
           'xác tên file thì vẫn mở được. Đây chính là mô hình bảo vệ <code>/home</code> trên máy ' +
           'chủ dùng chung — và cũng là lý do đừng bao giờ coi thư mục không đọc được là cách giấu ' +
           'bí mật.' },

    { q: 'Với <code>umask 077</code>, một file vừa tạo bằng <code>touch</code> sẽ có quyền gì?',
      opts: ['700', '600', '077', '644'],
      a: 1,
      why: 'File khởi đầu từ <code>666</code> chứ không phải <code>777</code>, vì kernel không bao ' +
           'giờ tự đặt bit thực thi cho file mới — một file văn bản tự nhiên chạy được là một lỗ ' +
           'hổng. Lấy <code>666</code> trừ đi mặt nạ <code>077</code> còn <b>600</b>. Đáp án ' +
           '<code>700</code> là quyền của <b>thư mục</b> mới trong cùng điều kiện, vì thư mục khởi ' +
           'đầu từ <code>777</code>.' },

    { q: 'Vì sao <code>/usr/bin/passwd</code> bắt buộc phải có bit setuid?',
      opts: ['Để mọi người dùng chạy được nó',
             'Để nó chạy nhanh hơn',
             'Vì nó phải ghi vào <code>/etc/shadow</code>, file mà chỉ root mới đọc ghi được',
             'Vì nó nằm trong <code>/usr/bin</code>'],
      a: 2,
      why: '<code>/etc/shadow</code> là <code>-rw-r----- root shadow</code> — người dùng thường ' +
           'thậm chí không <b>đọc</b> được, nói gì đến ghi. Bit setuid trên <code>passwd</code> ' +
           '(chế độ <b>4755</b>, chủ sở hữu <b>root</b>) khiến tiến trình chạy với UID hiệu lực ' +
           'bằng 0 trong khoảng thời gian ngắn đó. Quyền <code>755</code> đã đủ để mọi người ' +
           '<b>chạy</b> được nó rồi — setuid giải quyết vấn đề hoàn toàn khác, và chính vì thế mọi ' +
           'file setuid đều là bề mặt tấn công cần rà soát.' },

    { q: 'Bạn viết một script cài đặt và nó chạy <code>sudo echo "127.0.0.1 test" >> /etc/hosts</code>. Lệnh thất bại với <code>Permission denied</code> dù bạn ở trong nhóm sudo. Vì sao?',
      opts: ['<code>sudo</code> không hoạt động trong script',
             '<code>/etc/hosts</code> không cho ghi kể cả với root',
             'Chính shell của bạn mở file để chuyển hướng, và shell đó chạy với quyền thường',
             'Cần dùng <code>&gt;</code> thay vì <code>&gt;&gt;</code>'],
      a: 2,
      why: 'Shell xử lý chuyển hướng <b>trước khi</b> chạy lệnh, và nó mở <code>/etc/hosts</code> ' +
           'bằng quyền của chính nó — <code>sudo</code> chỉ nâng quyền cho <code>echo</code>, vốn ' +
           'chưa kịp chạy. Dấu hiệu nhận biết là tiền tố <code>bash:</code> trong thông báo lỗi: ' +
           'lỗi đến từ shell chứ không phải từ <code>echo</code>. Cách đúng là đẩy dữ liệu qua một ' +
           'chương trình <b>đang chạy dưới quyền root</b>: <code>echo "..." | sudo tee -a ' +
           '/etc/hosts</code>. Bài 10 sẽ dựng lại đầy đủ cơ chế này.' }
  ]
});

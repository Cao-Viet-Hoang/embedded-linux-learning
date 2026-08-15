/* ═══════════════════════════════════════════════════════════════════════════
   BT-08 — Bài tập cho Bài 8: "Người dùng, nhóm, quyền và sudo"
   ═══════════════════════════════════════════════════════════════════════════

   §13.4 — CHỌN TRỤC XOÁY. Bảy bước, ghi lại để phiên sau soi được lựa chọn
   thay vì phải suy lại từ đầu.

   BƯỚC 1–2. Kiểm kê rồi chấm điểm. PT = phụ thuộc về sau, GIA = giá phải trả
   khi hiểu sai, NGC = ngược trực giác. Thang 0/1/2.

   Khái niệm                                            | PT | GIA | NGC | Tổng
   -----------------------------------------------------|----|-----|-----|-----
   Kernel xét MỘT bộ ba, dừng ở lần khớp đầu tiên        |  2 |  2  |  2  |  6
   r/w/x của thư mục nói về bảng tên, không về file      |  2 |  2  |  2  |  6
   Shell mở file chuyển hướng, không phải lệnh sau sudo  |  2 |  2  |  2  |  6
   Quyền phần cứng = tư cách thành viên nhóm             |  2 |  2  |  1  |  5
   Xoá file phụ thuộc bit w của thư mục cha              |  1 |  2  |  2  |  5
   umask là phép TRỪ, file khởi đầu từ 666 chứ không 777 |  1 |  1  |  2  |  4
   Bit x không phải cơ chế bảo mật (bash script.sh)      |  1 |  1  |  2  |  4
   chmod 777 không phải cách sửa lỗi phân quyền          |  1 |  2  |  1  |  4
   Danh tính là con số, cái tên chỉ là tra cứu           |  2 |  1  |  1  |  4
   setuid / setgid / sticky                              |  1 |  1  |  1  |  3
   EPERM khác EACCES                                     |  1 |  1  |  1  |  3
   chmod dạng số tuyệt đối, dạng chữ tương đối           |  1 |  1  |  1  |  3
   Đảo ngược của nghề nhúng (bảo vệ thiết bị, không       |    |     |     |
     phải bảo vệ người dùng)                             |  1 |  1  |  1  |  3
   r=4, w=2, x=1                                         |  1 |  1  |  0  |  2
   /etc/passwd đọc được, /etc/shadow thì không           |  0 |  1  |  1  |  2

   BƯỚC 3. Ngưỡng: tổng ≥ 4 và ít nhất hai trục ≥ 1. Bốn khái niệm đạt 5–6.
   Trần cứng là 3, nên phải bỏ một.

   BƯỚC 4. Loại "shell mở file chuyển hướng" dù nó 6 điểm, vì hai lý do độc
   lập:
     (a) Chống trùng — bt-04 đã xoáy "shell cắt dòng lệnh theo khoảng trắng
         TRƯỚC khi lệnh nhìn thấy đối số" và bt-06 đã xoáy "shell mở rộng dấu
         sao, lệnh không bao giờ thấy nó". Xoáy lần thứ ba một biến thể của
         "shell xử lý trước khi lệnh chạy" chính là kiểu lạm dụng §13.3 cấm.
     (b) Câu 6 của quiz Bài 8 đã hỏi thẳng tình huống
         `sudo echo x >> /etc/hosts`. Bộ bài tập không phải quiz thứ hai.
   Nó vẫn xuất hiện, nhưng chỉ một lần, ở bảng chẩn đoán phần F.

   "Xoá file phụ thuộc thư mục cha" (5 điểm) không bị loại mà bị **nuốt vào**
   trục 2: cả hai đều là hệ quả của một mệnh đề duy nhất — thư mục là bảng tên,
   và ba bit của nó nói về bảng đó chứ không về file bên trong.

   Đối chiếu với §13.8 (trục đã tiêu): bt-01 MMU · bốn mảnh nối tiếp · Device
   Tree; bt-02 DRAM chết lúc reset · mỗi tầng biến mất · bootargs; bt-03 ảo hoá
   cùng kiến trúc · hai họ QEMU · /mnt/c; bt-04 $? · builtin không phải file ·
   shell cắt khoảng trắng; bt-05 /proc sinh lúc đọc · file /dev không chứa dữ
   liệu · thư mục rỗng là điểm gắn; bt-06 shell mở rộng * · tên không phải
   file · metadata là một hệ thống; bt-07 Ctrl+S đóng băng terminal · vim có
   chế độ · lệnh : mặc định một dòng. Không trục nào của bt-08 trùng.

   BƯỚC 5–6. Ba mệnh đề sai được và ngộ nhận đối lập nằm ở trường `x` và `mis`
   của mảng `truc` ngay dưới đây.

   BƯỚC 7. Lưới 3×1, kiểm bằng mắt trước khi để tools/check.js kiểm bằng máy:

     Trục 1 (một bộ ba)   A1 mệnh đề   → B1 số đo thật  → C4 tình huống mới
     Trục 2 (bảng tên)    A8 ghép nối  → B2 số đo thật  → C1 chẩn đoán
     Trục 3 (nhóm)        A2 mệnh đề   → B3 số đo thật  → C3 quyết định

   Ba mức, ba loại kích thích khác nhau, không câu nào đoán được từ câu kia:
   C4 hỏi một chế độ (046) chưa từng xuất hiện ở A1/B1; C1 đưa triệu chứng của
   một thiết bị chứ không phải một lệnh trong terminal; C3 bắt chọn giữa ba
   cách sửa và bảo vệ lựa chọn, điều mà A2/B3 không hề dạy cách làm.

   ───────────────────────────────────────────────────────────────────────────
   MỌI LỆNH VÀ MỌI KẾT QUẢ TRONG FILE NÀY ĐỀU ĐÃ CHẠY THẬT

   Máy: WSL2 · Ubuntu 24.04 · shinarus, uid=1000 · ngày 2026-08-14.
   Chạy trong ~/embedded/bt08, đã xoá sạch sau khi đo.

   Vài chi tiết đo được, đáng ghi lại vì chúng khác với điều người ta hay đoán:

   · `stat -c '%a'` in ra **77** chứ không phải **077** cho chế độ ----rwxrwx.
     `%a` bỏ số 0 dẫn đầu, chỉ giữ lại đúng những chữ số có nghĩa.
   · Máy này có **9** file setuid nhưng chỉ **4** file setgid trong /usr/bin:
     chage, crontab, expiry, ssh-agent.
   · `getcap -r /usr/bin` cho đúng một dòng: `/usr/bin/ping cap_net_raw=ep`.
     Đây là ví dụ sống của "capability thay cho setuid-root" mà Bài 8 chỉ kịp
     nhắc tên — dùng cho câu E6.
   · `chmod -R 644 proj` **tự nó thất bại giữa chừng**: sau khi gỡ bit x của
     `proj`, chính chmod không đi vào được `proj/src` nữa và báo
     `chmod: cannot access 'proj/src': Permission denied`. Không đoán ra điều
     này nếu không chạy thật.
   · Thông báo lỗi do **bash** phát ra (chuyển hướng bị từ chối, ./script thiếu
     bit x) có dạng `bash: line N: ...` khi chạy qua file script, nhưng dạng
     `bash: ...` khi gõ tay trong terminal. File này chỉ trích dẫn thông báo do
     **chương trình** phát ra (cat:, rm:, chmod:, ls:, stat:) kèm mã thoát —
     hai dạng đó giống hệt nhau ở cả hai môi trường.
   ═══════════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-08',
  minutes: 85,

  intro:
    '<p>Bài 8 là bài đầu tiên trong chặng này mà một câu trả lời sai <b>không</b> hiện ra ' +
    'thành thông báo lỗi. Đặt nhầm một bit quyền thì hoặc là chương trình chạy được nhưng ' +
    'để hở dữ liệu, hoặc là nó chết lúc 3 giờ sáng trên một thiết bị không có bàn phím. ' +
    'Vì thế bộ bài tập này ép bạn <b>tự tay đoán trước rồi đo lại</b> nhiều hơn hẳn các bộ ' +
    'trước.</p>' +
    '<p>Ba trục xoáy của bộ này đều là chỗ trực giác đánh lừa người mới: kernel ' +
    '<b>không</b> cộng dồn quyền, quyền của thư mục <b>không</b> nói gì về file bên trong, ' +
    'và quyền chạm vào phần cứng <b>không</b> đến từ <code>sudo</code>. Mỗi trục được hỏi ' +
    'đúng ba lần — một lần nhớ lại, một lần trước số đo thật, một lần trong tình huống ' +
    'chưa từng gặp.</p>' +
    '<p><b>Lượt 1</b> — làm ngay sau khi đọc xong Bài 8: phần <b>A</b> và <b>B</b>, khoảng ' +
    '23 phút. <b>Lượt 2</b> — quay lại sau 2–3 ngày: phần <b>C</b>, <b>D</b> và <b>E</b>, ' +
    'khoảng 60 phút. Khoảng nghỉ đó là thành phần có tác dụng, không phải thời gian chết. ' +
    'Phần <b>D</b> lần này lật lại Bài 6 (inode và liên kết cứng), Bài 5 (node thiết bị ' +
    'trong <code>/dev</code>) và Bài 4 (shell cắt dòng lệnh theo khoảng trắng).</p>',

  /* Chỉ trường `name` được hiển thị; `x` và `mis` là ghi chú cho người viết đề. */
  truc: [
    { id: 'mot-bo-ba',
      name: 'Kernel chỉ xét MỘT bộ ba quyền và dừng ở lần khớp đầu tiên',
      x: 'Kernel chọn bộ ba theo thứ tự chủ sở hữu → nhóm → người khác, dừng ngay ở lần ' +
         'khớp đầu tiên, và không bao giờ xét tiếp để nới thêm.',
      mis: 'Quyền cộng dồn: chủ sở hữu đương nhiên có ít nhất những gì nhóm và người khác ' +
           'có; nếu bộ ba đầu không cho thì kernel sẽ xét bộ ba sau.' },

    { id: 'bang-ten',
      name: 'Quyền của thư mục nói về bảng tên, không nói về file bên trong',
      x: 'Với thư mục: r = đọc danh sách tên, x = đi qua, w = thêm/xoá/đổi tên một dòng ' +
         'trong bảng. Vì thế xoá một file phụ thuộc bit w của thư mục cha, không phụ thuộc ' +
         'quyền của chính file đó.',
      mis: 'Quyền của thư mục là quyền chung áp cho mọi file bên trong; muốn xoá một file ' +
           'thì phải có quyền ghi lên chính file đó.' },

    { id: 'nhom-phan-cung',
      name: 'Quyền chạm vào phần cứng được cấp bằng tư cách thành viên nhóm',
      x: 'Mỗi node trong /dev thuộc một nhóm; ai ở trong nhóm đó thì mở được, ai không thì ' +
         'rơi xuống bộ ba "người khác" và bị chặn. Việc bạn có sudo hay không nằm ngoài ' +
         'phép kiểm tra này.',
      mis: 'Muốn ứng dụng mở được thiết bị thì chmod 666 node đó cho xong, hoặc cứ chạy nó ' +
           'bằng sudo/root.' }
  ],

  /* ══════════════════════ A · NHẬN BIẾT ══════════════════════ */
  A: [

    { id: 'a1', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 0,
      q: 'File <code>notes.txt</code> thuộc về <b>bạn</b>, nhóm của file cũng là nhóm chính ' +
         'của bạn, và chế độ của nó là <code>----rwxrwx</code>. Bạn gõ ' +
         '<code>cat notes.txt</code>. Chuyện gì xảy ra?',
      opts: [
        'Đọc được, vì bộ ba "nhóm" cho <code>rwx</code> mà bạn có ở trong nhóm đó',
        'Đọc được, vì bộ ba "người khác" cho <code>rwx</code>',
        '<code>Permission denied</code> — kernel dừng ở bộ ba của chủ sở hữu và bộ ba đó là <code>---</code>',
        '<code>Permission denied</code>, nhưng <code>sudo cat notes.txt</code> cũng sẽ hỏng vì file không có bit <code>r</code> nào cho root'
      ],
      a: 2,
      why: 'Kernel so UID của bạn với chủ sở hữu file. Khớp — nên nó xét <b>đúng ba ký tự ' +
           'đầu</b>, thấy <code>---</code>, và <b>dừng lại</b>. Nó không hạ xuống bộ ba ' +
           '"nhóm" để tìm thêm quyền, dù bạn thật sự ở trong nhóm đó. Đây là điểm ngược ' +
           'trực giác nhất của toàn bộ mô hình quyền Unix: khớp sớm hơn <b>không</b> có ' +
           'nghĩa là được nhiều hơn. Phương án cuối cũng sai vì root được cho qua ' +
           '<b>trước</b> khi chín bit được đọc tới.' },

    { id: 'a2', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 2,
      q: 'Trên một hệ thống Linux, quyền để một chương trình <b>mở được một thiết bị phần ' +
         'cứng</b> (cổng nối tiếp, GPIO, I2C) được cấp bằng cách nào là đúng chuẩn?',
      opts: [
        'Đặt <code>chmod 666</code> cho node trong <code>/dev</code> lúc khởi động',
        'Cho người dùng chạy chương trình vào <b>nhóm sở hữu node đó</b>, và để quy tắc udev gán nhóm cho node',
        'Thêm người dùng vào nhóm <code>sudo</code>',
        'Đặt bit setuid cho chương trình'
      ],
      a: 1,
      why: 'Node thiết bị gần như luôn có dạng <code>crw-rw---- root &lt;nhóm&gt;</code>: ' +
           'root và <b>một nhóm</b> mở được, phần còn lại của thế giới thì không. Cách cấp ' +
           'quyền đúng là đưa người dùng vào nhóm đó — <code>dialout</code> cho cổng nối ' +
           'tiếp, <code>kvm</code> cho máy ảo, <code>i2c</code>/<code>gpio</code> trên bo ' +
           'mạch. Quy tắc udev là thứ gán nhóm cho node mỗi lần thiết bị xuất hiện, nên ' +
           'nó bền qua lần cắm sau và qua lần khởi động sau; một lệnh <code>chmod 666</code> ' +
           'thì không, và nó còn mở thiết bị cho <b>mọi</b> tiến trình trên máy. Nhóm ' +
           '<code>sudo</code> hoàn toàn không liên quan: nó chỉ nói bạn được phép chạy lệnh ' +
           '<code>sudo</code>, chứ không có mặt trong phép kiểm tra quyền của node.' },

    { id: 'a3', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'File đang ở chế độ <code>744</code>. Bạn gõ <code>chmod u=rw,go=r file</code>. ' +
         'Chế độ mới là bao nhiêu?',
      opts: ['<code>744</code>', '<code>644</code>', '<code>764</code>', '<code>444</code>'],
      a: 1,
      why: 'Dấu <code>=</code> nghĩa là "đặt <b>đúng bằng</b>" — nó <b>xoá</b> mọi bit không ' +
           'được liệt kê. <code>u=rw</code> nên bit <code>x</code> của chủ sở hữu biến mất: ' +
           '<code>7</code> thành <code>6</code>. <code>go=r</code> giữ nguyên <code>4</code> ' +
           'cho nhóm và người khác. Kết quả <b>644</b>. Nếu bạn gõ <code>u+r</code> thay vì ' +
           '<code>u=rw</code> thì chế độ vẫn là <code>744</code>, vì <code>+</code> chỉ cộng ' +
           'thêm và không bao giờ gỡ gì. Đây là khác biệt sống còn giữa <code>=</code> và ' +
           '<code>+</code>, và là lý do tài liệu cài đặt luôn viết dạng số: dạng số tuyệt ' +
           'đối, cho cùng kết quả bất kể file đang ở trạng thái nào.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Hai thông báo dưới đây tương ứng hai mã lỗi khác nhau của kernel. Thông báo nào ' +
         'nói rằng <code>chmod</code> <b>không</b> cứu được bạn?',
      opts: [
        '<code>cat: f: Permission denied</code>',
        "<code>chown: changing ownership of 'f': Operation not permitted</code>",
        'Cả hai đều sửa được bằng <code>chmod</code>',
        'Cả hai đều không liên quan tới <code>chmod</code>'
      ],
      a: 1,
      why: '<code>Permission denied</code> là <code>EACCES</code>: <b>bit quyền</b> không ' +
           'cho. Mở đúng bit đó ra là xong — <code>chmod</code> giải quyết được. ' +
           '<code>Operation not permitted</code> là <code>EPERM</code>: thao tác này chỉ ' +
           'dành cho tiến trình có đặc quyền, bất kể chín bit trông thế nào. Cho đi quyền ' +
           'sở hữu một file là thao tác như vậy, nên <code>chmod 777</code> cũng vô ích; thứ ' +
           'bạn cần là <code>sudo</code>. Phân biệt hai thông báo này ngay từ dòng lỗi tiết ' +
           'kiệm cho bạn cả buổi đi sai hướng.' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Phát biểu: <i>"Gỡ bit <code>x</code> của một script là cách chặn người khác chạy ' +
         'nội dung của nó."</i>',
      a: 1,
      why: 'Sai. Bit <code>x</code> chỉ chặn <b>một cách gọi</b>: ' +
           '<code>./script.sh</code>, tức là "kernel ơi, thực thi file này" — và lúc đó bạn ' +
           'nhận mã thoát <b>126</b>. Nhưng <code>bash script.sh</code> thì hoàn toàn khác: ' +
           'kernel được yêu cầu thực thi <code>/bin/bash</code> (vốn có <code>x</code>), rồi ' +
           'bash chỉ <b>đọc</b> script như một file văn bản. Ai đọc được file thì luôn chạy ' +
           'được nội dung của nó. Muốn thật sự chặn thì phải gỡ quyền <code>r</code>.',
      rw: 'Viết lại phát biểu cho đúng, và nói rõ phải gỡ bit nào mới thật sự chặn được:',
      crit: [
        'Nói rõ bit <code>x</code> chỉ chặn cách gọi <code>./script.sh</code>',
        'Nhắc tới <code>bash script.sh</code> (hoặc <code>sh</code>/<code>python</code> …) vẫn chạy được',
        'Chỉ ra cái thật sự cần gỡ là quyền <b>r</b> (đọc)',
        'Nêu được lý do: người chạy là <code>/bin/bash</code>, nó chỉ cần đọc'
      ],
      sol: 'Bit <code>x</code> chặn việc <b>kernel</b> thực thi trực tiếp file ' +
           '(<code>./script.sh</code> → mã thoát 126), nhưng không chặn được ' +
           '<code>bash script.sh</code>, vì khi đó chương trình được thực thi là ' +
           '<code>/bin/bash</code> và nó chỉ cần quyền <b>đọc</b> script. Muốn thật sự ngăn ' +
           'người khác chạy nội dung script thì phải gỡ quyền <code>r</code> của họ.' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Phát biểu: <i>"Trên Linux, chủ sở hữu một file <b>không</b> được phép cho file đó ' +
         'cho người dùng khác; chỉ root mới <code>chown</code> được."</i>',
      a: 0,
      why: 'Đúng. Trên Linux, <code>chown</code> sang một người dùng khác là đặc quyền của ' +
           'root, và người dùng thường nhận <code>Operation not permitted</code> ' +
           '(<code>EPERM</code>) khi thử. Hai lý do: (1) hạn ngạch đĩa tính theo chủ sở ' +
           'hữu, nên nếu ai cũng cho đi được thì việc vượt hạn ngạch chỉ còn là đổ đầy đĩa ' +
           'rồi gán hết cho người khác; (2) kết hợp với bit setuid, "cho đi file" sẽ thành ' +
           '"tạo cửa hậu": chỉ cần soạn một chương trình, đặt setuid, rồi tặng nó cho root. ' +
           'Lưu ý <code>chgrp</code> thì được nới hơn — bạn đổi được nhóm của file mình ' +
           'sang một nhóm mà <b>bạn đang thuộc về</b>.',
      rw: 'Viết lại phát biểu, bổ sung điều luật này bảo vệ chuyện gì, và nói rõ chgrp khác ở đâu:',
      crit: [
        'Khẳng định đúng, và nêu thông báo <code>Operation not permitted</code> / <code>EPERM</code>',
        'Nêu được ít nhất một lý do (hạn ngạch đĩa <b>hoặc</b> cửa hậu setuid)',
        'Nói rõ <code>chgrp</code> sang nhóm mình đã thuộc thì được phép'
      ],
      sol: 'Đúng: chỉ root mới <code>chown</code> được sang người dùng khác; người dùng ' +
           'thường nhận <code>EPERM — Operation not permitted</code>. Điều luật này chặn ' +
           'hai chuyện: lách hạn ngạch đĩa (vốn tính theo chủ sở hữu) và tặng cho root một ' +
           'chương trình setuid do mình soạn. Ngược lại, <code>chgrp</code> sang một nhóm ' +
           'mà bạn đã là thành viên thì được phép, vì nó không cho bạn thêm quyền nào cả.' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: '<code>ls -l /usr/bin/passwd</code> cho chế độ <code>-rwsr-xr-x</code>. Viết chế độ ' +
         'đó dưới dạng <b>số bát phân bốn chữ số</b> (chữ số đặc biệt đứng trước, rồi tới ba ' +
         'chữ số quyền):',
      a: ['4755', '04755'],
      ph: 'bốn chữ số',
      why: 'Chữ <code>s</code> nằm ở đúng vị trí của bit <code>x</code> của chủ sở hữu, và ' +
           'nó nghĩa là "vẫn thực thi được, <b>và</b> chạy dưới UID của chủ sở hữu file". ' +
           'Vậy ba chữ số quyền vẫn là <code>rwx r-x r-x</code> = <b>755</b>, còn chữ số ' +
           'thứ tư là setuid = <b>4</b>. Ghép lại: <b>4755</b>. (Nếu chữ <code>s</code> nằm ' +
           'ở bộ ba giữa thì đó là setgid = <code>2000</code>; chữ <code>t</code> ở bộ ba ' +
           'cuối là sticky = <code>1000</code>, và đó là lý do <code>/tmp</code> là ' +
           '<code>1777</code>.) Đo lại bằng <code>stat -c \'%a %A %n\' /usr/bin/passwd</code> ' +
           'trên máy bạn — nó in ra đúng <code>4755 -rwsr-xr-x</code>.' },

    { id: 'a8', k: 'match', tag: 'Ghép nối', truc: 1,
      q: 'Thư mục <code>hop</code> chứa đúng một file tên <code>f.txt</code>, và bạn là chủ ' +
         'sở hữu của cả hai. Ghép mỗi tình huống với kết quả đúng của nó.',
      left: [
        'Thư mục <code>644</code> — gõ <code>ls hop</code>',
        'Thư mục <code>644</code> — gõ <code>cat hop/f.txt</code>',
        'Thư mục <code>311</code> — gõ <code>ls hop</code>',
        'Thư mục <code>311</code> — gõ <code>cat hop/f.txt</code> (biết đúng tên file)',
        'Thư mục <code>755</code>, file <code>444</code> — gõ <code>rm -f hop/f.txt</code>',
        'Thư mục <code>555</code>, file <code>666</code> — gõ <code>rm -f hop/f.txt</code>'
      ],
      right: [
        'Chạy được — bit <code>x</code> cho đi qua thư mục, bit <code>r</code> của file cho đọc',
        'Thất bại — thiếu bit <code>w</code> của <b>thư mục</b>, mà xoá là gỡ một dòng khỏi bảng tên',
        'Chạy được — bit <code>r</code> của thư mục cho đọc danh sách tên',
        'Thất bại — thiếu bit <code>x</code> nên không đi qua được thư mục để mở file',
        'Chạy được — có <code>w</code> trên thư mục là đủ; quyền của chính file không được hỏi tới',
        'Thất bại — thiếu bit <code>r</code> nên không đọc được danh sách tên'
      ],
      a: [2, 3, 5, 0, 4, 1],
      why: 'Sáu dòng này là toàn bộ mô hình, gói trong một bảng. Hai dòng đầu tách ' +
           '<code>r</code> khỏi <code>x</code>: thấy tên <b>không</b> có nghĩa là chạm được ' +
           'vào file. Hai dòng giữa là chiều ngược lại: đi qua được <b>không</b> có nghĩa là ' +
           'thấy được danh sách — đây chính là cách <code>/home</code> được bảo vệ trên máy ' +
           'chủ dùng chung, và cũng là lý do đừng bao giờ coi một thư mục không đọc được là ' +
           'chỗ giấu bí mật. Hai dòng cuối là điểm gây sốc nhất: một file chỉ đọc ' +
           '<code>444</code> vẫn bị xoá sạch, còn một file <code>666</code> ai cũng ghi được ' +
           'thì lại không xoá nổi. Vì <b>xoá không phải là sửa file</b> — xoá là gỡ một dòng ' +
           'khỏi bảng tên của thư mục cha, nên nó hỏi bit <code>w</code> của thư mục đó.' }
  ],

  /* ══════════════════════ B · THÔNG HIỂU ══════════════════════ */
  B: [

    { id: 'b1', k: 'free', tag: 'Đọc output', truc: 0, rows: 8,
      q: 'Dưới đây là số đo thật trên máy bạn. Nhìn kỹ ba điều: chủ sở hữu file là ' +
         '<code>shinarus</code>, nhóm của file cũng là <code>shinarus</code>, và ' +
         '<code>shinarus</code> chắc chắn có mặt trong nhóm đó. Vậy mà <code>cat</code> bị ' +
         'từ chối. <b>Giải thích cơ chế</b> đã sinh ra ba dòng kết quả này — và giải thích ' +
         'thêm vì sao lệnh <code>chmod</code> ở giữa lại thành công (<code>rc_chmod=0</code>) ' +
         'trong khi bạn không có lấy một bit quyền nào trên file.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code: 'id -nG' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'shinarus adm cdrom sudo dip plugdev users' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'echo "top secret" > t1.txt\n' +
          'chmod 077 t1.txt\n' +
          "stat -c '%a %A %U %G %n' t1.txt\n" +
          'cat t1.txt;        echo "rc_cat=$?"\n' +
          'chmod 600 t1.txt;  echo "rc_chmod=$?"\n' +
          'cat t1.txt;        echo "rc_cat2=$?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '77 ----rwxrwx shinarus shinarus t1.txt\n' +
          'cat: t1.txt: Permission denied\n' +
          'rc_cat=1\n' +
          'rc_chmod=0\n' +
          'top secret\n' +
          'rc_cat2=0' }
      ],
      crit: [
        'Nói kernel so UID của tiến trình với <b>chủ sở hữu</b> file trước tiên, và ở đây là khớp',
        'Nói rõ vì khớp nên nó xét <b>ba ký tự đầu</b> — <code>---</code> — rồi <b>dừng lại</b>',
        'Khẳng định kernel <b>không</b> xét tiếp bộ ba nhóm dù bạn ở trong nhóm đó',
        'Giải thích <code>chmod</code> chạy được vì quyền đổi chế độ đến từ <b>quyền sở hữu</b>, không nằm trong chín bit',
        'Có nhắc con số: <code>rc_cat=1</code> trước khi sửa, <code>rc_cat2=0</code> sau khi sửa'
      ],
      sol: '<p>Kernel không cộng dồn quyền. Nó chọn <b>đúng một</b> bộ ba, theo thứ tự: UID ' +
           'có bằng chủ sở hữu không → có thuộc nhóm của file không → còn lại. Ở đây UID ' +
           'của bạn bằng chủ sở hữu ngay từ bước đầu, nên kernel xét ba ký tự đầu, thấy ' +
           '<code>---</code>, trả về <code>EACCES</code> và <b>dừng</b>. Bộ ba ' +
           '<code>rwx</code> của nhóm và bộ ba <code>rwx</code> của người khác không bao giờ ' +
           'được đọc tới. Việc bạn có mặt trong nhóm <code>shinarus</code> hoàn toàn vô ích ' +
           '— khớp sớm hơn không có nghĩa là được nhiều hơn.</p>' +
           '<p>Lệnh <code>chmod</code> lại thành công vì nó <b>không</b> hỏi chín bit đó. ' +
           'Quyền đổi chế độ một file gắn với <b>quyền sở hữu</b>: bạn là chủ, nên bạn luôn ' +
           'đặt lại được chế độ, kể cả khi chế độ hiện tại là <code>000</code>. Nhờ vậy tình ' +
           'huống này không bao giờ là cái bẫy không lối ra — trừ khi file không phải của ' +
           'bạn.</p>' +
           '<p>Chi tiết nhỏ đáng nhớ: <code>stat -c \'%a\'</code> in ra <b>77</b> chứ không ' +
           'phải <code>077</code>. <code>%a</code> bỏ chữ số 0 dẫn đầu, nên đừng hoảng khi ' +
           'thấy một con số có vẻ thiếu chữ số.</p>' },

    { id: 'b2', k: 'free', tag: 'Giải thích vì sao', truc: 1, rows: 8,
      q: 'Hai thí nghiệm dưới đây chạy trên cùng một máy, cách nhau vài giây. Ở thí nghiệm ' +
         'thứ nhất, một file <b>chỉ đọc</b> <code>444</code> bị xoá sạch. Ở thí nghiệm thứ ' +
         'hai, một file <b>ai cũng ghi được</b> <code>666</code> lại không xoá nổi — dù bạn ' +
         'vẫn ghi thêm được nội dung vào nó (<code>rc_write=0</code>). ' +
         '<b>Vì sao?</b> Trả lời bằng cơ chế, đừng chỉ mô tả lại kết quả.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'mkdir -p box\n' +
          'echo data > box/keep.txt\n' +
          'chmod 444 box/keep.txt\n' +
          "stat -c '%a %A %n' box box/keep.txt\n" +
          'rm -f box/keep.txt;  echo "rc_rm=$?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '755 drwxr-xr-x box\n' +
          '444 -r--r--r-- box/keep.txt\n' +
          'rc_rm=0' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'echo data > box/keep2.txt\n' +
          'chmod 666 box/keep2.txt\n' +
          'chmod 555 box\n' +
          "stat -c '%a %A %n' box box/keep2.txt\n" +
          'echo appended >> box/keep2.txt;  echo "rc_write=$?"\n' +
          'rm -f box/keep2.txt;             echo "rc_rm2=$?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '555 dr-xr-xr-x box\n' +
          '666 -rw-rw-rw- box/keep2.txt\n' +
          'rc_write=0\n' +
          "rm: cannot remove 'box/keep2.txt': Permission denied\n" +
          'rc_rm2=1' }
      ],
      crit: [
        'Nói rõ thư mục là một <b>bảng ánh xạ tên → inode</b>',
        'Nói xoá = gỡ một dòng khỏi bảng đó (<code>unlink</code>), nên nó hỏi bit <code>w</code> của <b>thư mục</b>',
        'Chỉ ra quyền của chính file (444 hay 666) <b>không</b> tham gia quyết định xoá',
        'Giải thích <code>rc_write=0</code>: ghi vào file cần <code>w</code> của <b>file</b> và <code>x</code> của thư mục — cả hai đều có',
        'Rút ra: muốn bảo vệ dữ liệu thì phải khoá <b>thư mục cha</b>, không phải khoá file'
      ],
      sol: '<p>Thư mục không "chứa" file. Nó là một <b>bảng ánh xạ tên → inode</b>, đúng như ' +
           'Bài 6 đã dựng. Ba bit của thư mục nói về <b>bảng đó</b>: <code>r</code> = đọc ' +
           'được danh sách tên, <code>x</code> = đi qua được để tới inode, <code>w</code> = ' +
           'thêm / xoá / đổi tên một dòng.</p>' +
           '<p>Xoá một file là lời gọi <code>unlink()</code>: gỡ một dòng khỏi bảng. Đó là ' +
           'thao tác <b>sửa thư mục</b>, không phải sửa file — nên kernel hỏi bit ' +
           '<code>w</code> của thư mục và <b>không hề</b> nhìn vào chế độ của file. Thí ' +
           'nghiệm 1: thư mục <code>755</code> có <code>w</code> cho chủ sở hữu → xoá được ' +
           'file <code>444</code>. Thí nghiệm 2: thư mục <code>555</code> không có ' +
           '<code>w</code> → không xoá được, dù file là <code>666</code>.</p>' +
           '<p><code>rc_write=0</code> khép kín lập luận: <i>ghi vào</i> file thì lại đúng là ' +
           'thao tác sửa file, nên nó cần <code>w</code> của <b>file</b> (có: 666) và ' +
           '<code>x</code> của thư mục để đi tới nó (có: 555). Hai phép kiểm tra hoàn toàn ' +
           'khác nhau, hỏi hai đối tượng khác nhau.</p>' +
           '<p>Hệ quả bạn mang ra thực địa: trên rootfs của thiết bị, muốn một file cấu hình ' +
           'không bị thay thế thì <b>khoá thư mục cha</b>. Đặt file về <code>444</code> chỉ ' +
           'chống sửa tại chỗ, không chống bị xoá rồi ghi đè bằng bản mới.</p>' },

    { id: 'b3', k: 'free', tag: 'Đọc output', truc: 2, rows: 7,
      q: 'Ba dòng <code>/dev</code> và ba dòng <code>/etc/group</code> dưới đây đều đo trên ' +
         'máy bạn. Một chương trình chạy dưới tài khoản <code>shinarus</code> mở ' +
         '<code>/dev/ttyS0</code> và bị từ chối. Hãy <b>đọc số liệu</b> và trả lời: bộ ba ' +
         'quyền nào được áp cho nó và vì sao; việc <code>shinarus</code> có mặt trong nhóm ' +
         '<code>sudo</code> giúp được gì ở đây; và cần thay đổi đúng thứ gì để lần sau nó mở ' +
         'được — <b>bền qua lần khởi động sau</b>.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'ls -l /dev/ttyS0\nls -l /dev/kvm /dev/null' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'crw-rw---- 1 root dialout 4, 64 Aug 14 21:17 /dev/ttyS0\n' +
          'crw-rw---- 1 root kvm  10, 232 Aug 14 21:17 /dev/kvm\n' +
          'crw-rw-rw- 1 root root  1,   3 Aug 14 21:17 /dev/null' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'id -nG\ngrep -E "^(dialout|disk|kvm):" /etc/group' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'shinarus adm cdrom sudo dip plugdev users\n' +
          'disk:x:6:\n' +
          'dialout:x:20:\n' +
          'kvm:x:991:' }
      ],
      crit: [
        'Nói <code>shinarus</code> không phải root và không thuộc <code>dialout</code>, nên rơi xuống bộ ba <b>người khác</b> = <code>---</code>',
        'Chỉ ra ba dòng <code>/etc/group</code> đều <b>trống</b> ở trường thành viên',
        'Nói rõ nhóm <code>sudo</code> không tham gia phép kiểm tra quyền của node',
        'Nêu cách sửa bền: đưa người dùng vào nhóm <code>dialout</code> (và quy tắc udev gán nhóm cho node)',
        'Có nhắc nhóm chỉ được nạp lúc <b>đăng nhập</b>, nên phải đăng xuất/đăng nhập lại'
      ],
      sol: '<p><code>crw-rw---- root dialout</code> đọc ra là: root <code>rw</code>, nhóm ' +
           '<code>dialout</code> <code>rw</code>, <b>người khác không gì cả</b>. ' +
           '<code>shinarus</code> không phải root, và trường thành viên của ' +
           '<code>dialout:x:20:</code> hoàn toàn trống — nên kernel trượt qua hai bộ ba đầu ' +
           'và áp bộ ba cuối: <code>---</code>. Từ chối.</p>' +
           '<p>Nhóm <code>sudo</code> không cứu được gì, vì nó không hề xuất hiện trong phép ' +
           'kiểm tra này. <code>sudo:x:27:shinarus</code> chỉ nói một điều: bạn được phép ' +
           'chạy chương trình tên là <code>sudo</code>. Chạy <code>sudo minicom</code> thì ' +
           'mở được cổng — nhưng vì tiến trình khi đó là <b>root</b>, chứ không phải vì bạn ' +
           'đã "có quyền".</p>' +
           '<p>Cách sửa bền là <code>sudo usermod -aG dialout shinarus</code> rồi <b>đăng ' +
           'xuất và đăng nhập lại</b> — danh sách nhóm phụ được nạp vào tiến trình lúc đăng ' +
           'nhập, không cập nhật cho các shell đang mở. Trên bo mạch thật, thứ gán nhóm cho ' +
           'node mỗi lần thiết bị xuất hiện là <b>quy tắc udev</b>; một lệnh ' +
           '<code>chmod 666 /dev/ttyS0</code> gõ tay sẽ biến mất ở lần cắm sau, và trong lúc ' +
           'còn hiệu lực thì nó mở cổng cho mọi tiến trình trên máy.</p>' +
           '<p>Hai dòng còn lại là cùng một khuôn: <code>/dev/kvm</code> thuộc nhóm ' +
           '<code>kvm</code> (cũng trống — nên máy này không dùng được tăng tốc KVM), còn ' +
           '<code>/dev/null</code> là <code>666</code> vì nó vô hại. GPIO, I2C, SPI trên bo ' +
           'mạch nhúng đều theo đúng khuôn <code>root:&lt;nhóm&gt;</code> này.</p>' },

    { id: 'b4', k: 'free', tag: 'Giải thích vì sao', rows: 6,
      q: 'Lệnh dưới đây liệt kê <b>mọi</b> file ở tầng trên cùng của <code>/etc</code> mà tài ' +
         'khoản của bạn không đọc được. Chỉ có sáu. Đáng chú ý là <code>/etc/passwd</code> ' +
         '<b>không</b> nằm trong danh sách, dù nó là "sổ hộ tịch" của cả hệ thống. Giải thích ' +
         'vì sao <code>/etc/passwd</code> <b>bắt buộc</b> phải cho mọi người đọc, còn ' +
         '<code>/etc/shadow</code> thì bắt buộc không — và điều gì sẽ hỏng nếu ai đó đặt ' +
         '<code>chmod 600 /etc/passwd</code> "cho an toàn".',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'find /etc -maxdepth 1 -type f ! -readable 2>/dev/null | sort' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '/etc/.pwd.lock\n/etc/gshadow\n/etc/gshadow-\n/etc/shadow\n/etc/shadow-\n/etc/sudoers' }
      ],
      crit: [
        'Nói <code>/etc/passwd</code> chỉ chứa ánh xạ UID → tên, không chứa bí mật',
        'Nêu ai cần đọc nó: <code>ls -l</code>, <code>ps</code>, mọi chương trình muốn hiển thị <b>tên</b> thay vì số',
        'Nói <code>/etc/shadow</code> chứa mật khẩu đã băm, nên tách ra và để <code>640 root:shadow</code>',
        'Trả lời được hậu quả của <code>chmod 600 /etc/passwd</code>: <code>ls -l</code>/<code>ps</code> chỉ còn in ra số UID, và việc đăng nhập/khởi động dịch vụ có thể hỏng'
      ],
      sol: '<p>Kernel chỉ biết <b>số</b>. Mỗi lần <code>ls -l</code> muốn in ' +
           '<code>shinarus</code> thay vì <code>1000</code>, nó phải tra ' +
           '<code>/etc/passwd</code>. <code>ps</code>, <code>id</code>, mọi chương trình có ' +
           'giao diện đều làm đúng như vậy, và chúng chạy dưới quyền người dùng thường — nên ' +
           'file phải là <code>644</code>. Nó không chứa bí mật gì: tên, UID, GID, thư mục ' +
           'nhà, shell.</p>' +
           '<p>Ngày xưa mật khẩu băm nằm luôn trong file này, và vì ai cũng đọc được nên ' +
           'người ta tải về rồi bẻ khoá hàng loạt ngoại tuyến. Cách chữa là <b>tách đôi</b>: ' +
           'phần công khai ở lại <code>/etc/passwd</code>, phần băm chuyển sang ' +
           '<code>/etc/shadow</code> với chế độ <code>640 root:shadow</code>. Chữ ' +
           '<code>x</code> ở trường thứ hai của <code>/etc/passwd</code> chính là dấu vết ' +
           'của cuộc tách đó.</p>' +
           '<p><code>chmod 600 /etc/passwd</code> không làm hệ thống an toàn thêm một chút ' +
           'nào — chẳng có bí mật nào để giấu — nhưng làm hỏng mọi phép tra ngược: ' +
           '<code>ls -l</code> và <code>ps</code> bắt đầu in ra số UID trần, và nhiều dịch ' +
           'vụ từ chối khởi động vì không phân giải nổi tài khoản của chính chúng. Đây là ví ' +
           'dụ điển hình cho câu "siết quyền bừa cũng là một lỗi, y như nới quyền bừa".</p>' +
           '<p>Bốn cái tên còn lại trong danh sách cũng đáng biết: <code>gshadow</code> là ' +
           '<code>shadow</code> của nhóm, hai file kết thúc bằng dấu <code>-</code> là bản ' +
           'sao lưu tự động, và <code>/etc/sudoers</code> đóng kín vì nó nói ai được làm ' +
           'root.</p>' },

    { id: 'b5', k: 'free', tag: 'So sánh cặp', rows: 6,
      q: 'Hai lệnh dưới đây cùng nhằm một việc: "đặt lại quyền cho cả một cây thư mục". Cả ' +
         'hai đều đã chạy thật, kết quả ở ngay dưới. Khác biệt giữa chúng có nhiều, nhưng ' +
         'chỉ <b>một</b> khác biệt là khác biệt quan trọng. Chỉ ra nó, và giải thích vì sao ' +
         'lệnh thứ nhất còn <b>tự nó thất bại giữa chừng</b>.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'chmod -R 644 proj\n' +
          "stat -c '%a %A %n' proj proj/src\n" +
          'ls proj/src;  echo "rc_ls=$?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          "chmod: cannot access 'proj/src': Permission denied\n" +
          '644 drw-r--r-- proj\n' +
          "stat: cannot stat 'proj/src': Permission denied (os error 13)\n" +
          "ls: cannot open file 'proj/src': Permission denied\n" +
          'rc_ls=2' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "stat -c '%a %A %n' tree tree/a.sh tree/sub tree/sub/b.txt\n" +
          'chmod -R u=rwX,go=rX tree\n' +
          "stat -c '%a %A %n' tree tree/a.sh tree/sub tree/sub/b.txt" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '777 drwxrwxrwx tree\n' +
          '666 -rw-rw-rw- tree/a.sh\n' +
          '700 drwx------ tree/sub\n' +
          '600 -rw------- tree/sub/b.txt\n' +
          '755 drwxr-xr-x tree\n' +
          '644 -rw-r--r-- tree/a.sh\n' +
          '755 drwxr-xr-x tree/sub\n' +
          '644 -rw-r--r-- tree/sub/b.txt' }
      ],
      crit: [
        'Nói được khác biệt quan trọng: <code>X</code> <b>viết hoa</b> chỉ đặt <code>x</code> cho thư mục (và file vốn đã thực thi được), số <code>644</code> thì gỡ <code>x</code> của tất cả',
        'Nói không có <code>x</code> thì thư mục coi như mất — không <code>cd</code>, không mở được file bên trong',
        'Giải thích vì sao chính <code>chmod -R</code> thất bại: nó gỡ <code>x</code> của <code>proj</code> rồi mới định đi xuống <code>proj/src</code>',
        'Nhận ra kết quả của lệnh thứ hai đúng bằng "thư mục 755, file 644"'
      ],
      sol: '<p>Khác biệt quan trọng nằm ở đúng một ký tự: <b><code>X</code> viết hoa</b>. Nó ' +
           'nghĩa là "đặt bit <code>x</code> <i>chỉ khi</i> đây là thư mục, hoặc là file vốn ' +
           'đã có ít nhất một bit <code>x</code>". Nhờ vậy một lệnh duy nhất cho ra thư mục ' +
           '<code>755</code> và file <code>644</code> — đúng thứ bạn muốn — mà không biến ' +
           'mọi file văn bản thành file thực thi.</p>' +
           '<p><code>chmod -R 644</code> thì áp cùng một con số cho mọi thứ, và với thư mục ' +
           'thì <code>644</code> là án tử: không có <code>x</code> nghĩa là không đi qua ' +
           'được, nên mọi file bên trong trở nên không với tới nổi. Đây là một trong những ' +
           'lệnh phá hoại phổ biến nhất mà người mới tự gõ vào máy mình.</p>' +
           '<p>Chỗ trớ trêu là <code>chmod</code> <b>tự chặn chính nó</b>. Nó đổi ' +
           '<code>proj</code> trước, mất bit <code>x</code>, rồi mới định đi xuống ' +
           '<code>proj/src</code> — và lúc đó nó không đi qua được nữa: ' +
           '<code>chmod: cannot access \'proj/src\': Permission denied</code>. Kết quả là ' +
           'một cây <b>hỏng dở dang</b>: tầng trên đã đổi, tầng dưới còn nguyên, và bạn ' +
           'không nhìn được vào để biết. Lối ra là <code>chmod -R u+rwX proj</code> — mở lại ' +
           'bit <code>x</code> cho thư mục trước, rồi mới đặt lại quyền cho tử tế.</p>' },

    { id: 'b6', k: 'free', tag: 'Bắt lỗi phát biểu', rows: 7,
      q: 'Một đồng nghiệp viết trong nhật ký công việc:<br><br>' +
         '<i>"Script <code>start.sh</code> trên thiết bị cần quyền root để ghi vào ' +
         '<code>/sys</code>. Tôi đã <code>chown root:root start.sh</code> rồi ' +
         '<code>chmod 4777 start.sh</code> — bit setuid làm nó chạy dưới quyền root, còn ' +
         '<code>777</code> để chắc chắn ứng dụng nào cũng gọi được nó. Xong, đóng ' +
         'ticket."</i><br><br>' +
         'Đoạn này có <b>ít nhất ba</b> chỗ sai. Chỉ ra từng chỗ và nói cái sai đó dẫn tới ' +
         'hậu quả gì.',
      hint: 'Một trong ba chỗ sai khiến câu "bit setuid làm nó chạy dưới quyền root" đơn giản ' +
            'là không đúng với script. Hai chỗ còn lại: một là chuyện quyền hạn lúc gõ lệnh, ' +
            'một là chuyện an ninh của con số 777.',
      crit: [
        'Chỉ ra kernel Linux <b>bỏ qua</b> bit setuid trên script shell — nên nó không hề chạy dưới quyền root',
        'Chỉ ra <code>777</code> nghĩa là <b>ai cũng ghi đè được</b> nội dung script → chiếm quyền ở lần chạy sau',
        'Chỉ ra <code>chown root:root</code> đòi quyền root sẵn (<code>EPERM</code> nếu gõ bằng tài khoản thường)',
        'Nêu được ít nhất một cách làm đúng: cho init chạy script dưới quyền root, hoặc quy tắc udev + nhóm, hoặc capability'
      ],
      sol: '<p><b>Sai 1 — setuid không có tác dụng trên script.</b> Kernel Linux cố tình bỏ ' +
           'qua bit setuid khi thứ được nạp là một script có dòng <code>#!</code>, chính vì ' +
           'lý do an toàn: giữa lúc kernel đọc dòng <code>#!</code> và lúc trình thông dịch ' +
           'mở file, nội dung file có thể bị tráo. Nên câu "bit setuid làm nó chạy dưới quyền ' +
           'root" là sai — script vẫn chạy dưới quyền người gọi, và lỗi ghi ' +
           '<code>/sys</code> vẫn còn nguyên. Tệ hơn: đồng nghiệp <b>tưởng</b> đã xong.</p>' +
           '<p><b>Sai 2 — <code>777</code> biến file thành cửa hậu.</b> Ai cũng ghi được ' +
           'nghĩa là bất kỳ tiến trình nào bị chiếm quyền cũng sửa được nội dung ' +
           '<code>start.sh</code>. Nếu script này được init chạy dưới quyền root ở lần khởi ' +
           'động sau — mà đó chính là ý đồ — thì kẻ tấn công vừa có root trên thiết bị. Giả ' +
           'sử setuid <i>có</i> tác dụng đi nữa thì <code>4777</code> còn tệ hơn: một file ' +
           'setuid-root mà ai cũng ghi được là root ngay lập tức, không cần đợi khởi ' +
           'động.</p>' +
           '<p><b>Sai 3 — lệnh đầu tiên không chạy được bằng tài khoản thường.</b> ' +
           '<code>chown root:root</code> là cho đi quyền sở hữu; người dùng thường nhận ' +
           '<code>Operation not permitted</code>. Nếu nó chạy được thì nghĩa là cả đoạn này ' +
           'đã được gõ dưới quyền root — và như vậy chính câu chuyện "cần setuid để có ' +
           'root" đã tự mâu thuẫn.</p>' +
           '<p><b>Cách làm đúng</b>, theo thứ tự tăng dần công sức: để init (systemd hoặc ' +
           'script rc) chạy <code>start.sh</code> dưới quyền root và đặt nó ' +
           '<code>750 root:root</code>; hoặc đừng cần root nữa — viết một quy tắc udev gán ' +
           'nhóm cho đúng node trong <code>/sys</code>/<code>/dev</code> mà ứng dụng cần, rồi ' +
           'cho ứng dụng chạy bằng tài khoản riêng thuộc nhóm đó; hoặc cấp lẻ từng đặc quyền ' +
           'bằng <i>capability</i> thay vì cả gói root. Câu E6 cho bạn xem một ví dụ thật ' +
           'của cách thứ ba đang chạy trên máy này.</p>' }
  ],

  /* ══════════════════════ C · VẬN DỤNG ══════════════════════ */
  C: [

    { id: 'c1', k: 'free', tag: 'Chẩn đoán', truc: 1, rows: 8,
      q: 'Trên một thiết bị đang chạy ngoài hiện trường, dịch vụ cập nhật ' +
         '<code>updater</code> (chạy dưới tài khoản <code>updater</code>, thuộc nhóm ' +
         '<code>app</code>) phải thay file cấu hình <code>/data/etc/app.conf</code>. Nó làm ' +
         'đúng bài bản: ghi bản mới ra <code>app.conf.new</code> rồi đổi tên đè lên bản cũ. ' +
         'Cả hai bước đều hỏng với <code>Permission denied</code>. Đây là số liệu thu được ' +
         'từ thiết bị:',
      blocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '# stat -c \'%a %A %U %G %n\' /data/etc /data/etc/app.conf\n' +
          '755 drwxr-xr-x root root /data/etc\n' +
          '666 -rw-rw-rw- root app  /data/etc/app.conf\n' +
          '# id updater\n' +
          'uid=990(updater) gid=990(updater) groups=990(updater),970(app)' },
        { t: 'p', x:
          'Trả lời ba câu: (1) <b>bit nào</b> đang thiếu, và vì sao chế độ <code>666</code> ' +
          'của <code>app.conf</code> là một manh mối đánh lạc hướng; (2) lệnh sửa <b>tối ' +
          'thiểu</b> là gì; (3) một đồng nghiệp đề nghị "bỏ hẳn kiểu ghi-rồi-đổi-tên, cứ mở ' +
          '<code>app.conf</code> ra ghi đè tại chỗ cho xong vì file đã là <code>666</code>" ' +
          '— vì sao đó là ý tồi <b>trên một thiết bị</b>?' }
      ],
      crit: [
        'Chỉ ra thiếu bit <code>w</code> của <b>thư mục</b> <code>/data/etc</code> (nó là <code>755 root:root</code>)',
        'Nói rõ cả <b>tạo</b> <code>app.conf.new</code> lẫn <b>đổi tên</b> đều là sửa bảng tên của thư mục, không phải sửa file',
        'Nói chế độ <code>666</code> của <code>app.conf</code> không tham gia quyết định nào trong hai bước đó',
        'Nêu lệnh sửa: cấp <code>w</code> cho nhóm <code>app</code> trên thư mục — <code>chgrp app /data/etc</code> + <code>chmod 775</code> (hoặc <code>2775</code>)',
        'Trả lời được rủi ro của ghi đè tại chỗ: mất điện giữa chừng để lại file cấu hình hỏng dở, thiết bị không khởi động lại được'
      ],
      sol: '<p><b>(1)</b> Thứ thiếu là bit <code>w</code> của <b>thư mục</b> ' +
           '<code>/data/etc</code>, đang là <code>755 root:root</code>. Tài khoản ' +
           '<code>updater</code> không phải root và không thuộc nhóm <code>root</code>, nên ' +
           'nó rơi xuống bộ ba cuối: <code>r-x</code> — đọc và đi qua được, <b>không thêm ' +
           'bớt được dòng nào</b>. Tạo <code>app.conf.new</code> là thêm một dòng vào bảng ' +
           'tên; đổi tên đè lên <code>app.conf</code> là sửa hai dòng của bảng tên. Cả hai ' +
           'đều là thao tác trên <b>thư mục</b>. Chế độ <code>666</code> của ' +
           '<code>app.conf</code> chỉ nói ai được sửa <i>nội dung</i> file — một câu hỏi ' +
           'khác hẳn, không được đặt ra ở đây.</p>' +
           '<p><b>(2)</b> Sửa tối thiểu là mở bảng tên cho nhóm <code>app</code>:</p>' +
           '<p><code>chgrp app /data/etc &amp;&amp; chmod 775 /data/etc</code></p>' +
           '<p>Tốt hơn nữa là <code>chmod 2775</code> — bit setgid trên thư mục làm mọi file ' +
           'tạo ra bên trong <b>thừa kế nhóm</b> <code>app</code>, nên bản cấu hình mới ' +
           'không lặng lẽ đổi sang nhóm khác sau mỗi lần cập nhật. Trên máy bạn có thể kiểm ' +
           'chứng: một thư mục <code>2775</code> thuộc nhóm <code>users</code> cho ra file ' +
           'mới <code>644 shinarus users</code> và thư mục con <code>2755</code> — bit ' +
           'setgid tự truyền xuống.</p>' +
           '<p><b>(3)</b> Ghi đè tại chỗ đúng là chạy được sau khi vá quyền, nhưng nó phá vỡ ' +
           'tính <b>nguyên tử</b>. Có một khoảnh khắc file cũ đã bị cắt cụt còn file mới chưa ' +
           'ghi xong; mất điện đúng lúc đó — chuyện hoàn toàn bình thường với thiết bị ngoài ' +
           'hiện trường — thì thiết bị khởi động lại với một file cấu hình cụt và không ai ' +
           'ra hiện trường sửa hộ. Kiểu "ghi file mới rồi đổi tên đè lên" thì ' +
           '<code>rename()</code> là một thao tác nguyên tử ở tầng hệ thống file: hoặc bảng ' +
           'tên trỏ vào bản cũ, hoặc trỏ vào bản mới, không có trạng thái ở giữa. Đồng nghiệp ' +
           'của bạn đang đề nghị đổi một lỗi phân quyền dễ sửa lấy một lỗi hỏng dữ liệu ' +
           'không sửa được.</p>' },

    { id: 'c2', k: 'multi', tag: 'Chẩn đoán',
      q: 'Trên bo mạch, dịch vụ <code>sensord</code> khởi động lúc boot rồi tắt ngay lập ' +
         'tức. Nhật ký của init chỉ có đúng một dòng:<br><br>' +
         '<code>sensord.service: Main process exited, status=126</code><br><br>' +
         'Nguyên nhân nào <b>phù hợp</b> với con số 126? Chọn tất cả phương án đúng.',
      opts: [
        '<code>/usr/bin/sensord</code> không tồn tại — đường dẫn trong unit file gõ sai',
        'File có đó nhưng thiếu bit <code>x</code>, mất lúc đóng gói rootfs từ một thư mục nằm trên <code>/mnt/c</code>',
        'Phân vùng chứa <code>/usr/bin</code> được gắn kèm tuỳ chọn <code>noexec</code>',
        '<code>sensord</code> là script và dòng <code>#!</code> trỏ tới một trình thông dịch không có trên rootfs',
        'Tài khoản chạy dịch vụ không thuộc nhóm <code>i2c</code> nên không mở được <code>/dev/i2c-1</code>'
      ],
      a: [1, 2, 3],
      why: 'Mã <b>126</b> có nghĩa rất hẹp và rất hữu ích: <i>đã tìm thấy thứ cần chạy, ' +
           'nhưng không chạy được nó</i>. Ba nguyên nhân đúng đều đúng nghĩa đó — thiếu bit ' +
           '<code>x</code>, phân vùng <code>noexec</code>, hoặc trình thông dịch trong dòng ' +
           '<code>#!</code> không tồn tại (trường hợp này thoạt nghe giống "không tìm thấy", ' +
           'nhưng thứ không tìm thấy là <b>trình thông dịch</b>, còn script thì tìm thấy rồi, ' +
           'nên vẫn là 126; đo trên máy bạn cho đúng <code>rc=126</code> kèm thông báo ' +
           '<code>bad interpreter: No such file or directory</code>). Phương án đầu tiên cho ' +
           '<b>127</b>, không phải 126 — đó là mã "không tìm thấy lệnh". Phương án cuối cùng ' +
           'thì hoàn toàn lạc: nếu <code>sensord</code> chạy được rồi mới không mở nổi ' +
           '<code>/dev/i2c-1</code>, mã thoát sẽ là mã do <b>chính nó</b> chọn (thường là 1), ' +
           'kèm một dòng log của riêng nó. Bài học mang đi: 126 và 127 phân biệt "chưa chạy ' +
           'được" với "chạy rồi mới hỏng", và đó là hai hướng gỡ lỗi hoàn toàn khác nhau.' },

    { id: 'c3', k: 'free', tag: 'Tình huống mới', truc: 2, rows: 8,
      q: 'Bo mạch của bạn chạy một rootfs Buildroot tối giản. Ứng dụng <code>tempd</code> ' +
         'đọc cảm biến nhiệt qua <code>/dev/i2c-1</code>, và node đó là ' +
         '<code>crw-rw---- 1 root i2c 89, 1</code>. Ứng dụng chạy dưới tài khoản riêng ' +
         '<code>tempd</code>. Ba đồng nghiệp đề nghị ba cách:' +
         '<ul>' +
         '<li><b>A.</b> Thêm dòng <code>chmod 666 /dev/i2c-1</code> vào script khởi động.</li>' +
         '<li><b>B.</b> Cho <code>tempd</code> chạy bằng root cho xong.</li>' +
         '<li><b>C.</b> Viết quy tắc udev đặt <code>GROUP="i2c", MODE="0660"</code> cho ' +
         'node, và thêm tài khoản <code>tempd</code> vào nhóm <code>i2c</code>.</li>' +
         '</ul>' +
         'Chọn một, <b>bảo vệ lựa chọn của bạn</b>, nói rõ hai cách kia hỏng ở đâu — và nêu ' +
         'một hoàn cảnh có thật mà B vẫn là câu trả lời chấp nhận được.',
      crit: [
        'Chọn <b>C</b>',
        'Nói A mở thiết bị cho <b>mọi</b> tiến trình trên máy, và sẽ bị mất khi node được tạo lại (udev/thay thiết bị/khởi động lại)',
        'Nói B nghĩa là một lỗi trong <code>tempd</code> = toàn quyền thiết bị, kể cả ghi đè phân vùng khởi động',
        'Nói rõ udev là thứ gán nhóm cho node <b>mỗi lần thiết bị xuất hiện</b>, nên C mới là cách bền',
        'Nêu được hoàn cảnh B chấp nhận được: rootfs chỉ có root, thiết bị không nối mạng, bản mẫu — và gọi đúng tên nó là <b>nợ kỹ thuật</b>'
      ],
      sol: '<p><b>C.</b> Đây là khuôn mẫu chuẩn của Linux cho phần cứng: node thuộc ' +
           '<code>root:&lt;nhóm&gt;</code> với chế độ <code>0660</code>, và quyền dùng thiết ' +
           'bị chính là <b>tư cách thành viên nhóm đó</b>. Quy tắc udev chạy lại mỗi lần ' +
           'kernel tạo node, nên nhóm và chế độ đúng được tái lập ở mọi lần khởi động, mọi ' +
           'lần cắm lại, mọi lần thay bo mạch. Không có bước thủ công nào để quên.</p>' +
           '<p><b>A hỏng hai đường.</b> Thứ nhất, <code>666</code> cho <i>mọi</i> tiến trình ' +
           'trên thiết bị đọc và ghi bus I2C — mà trên bus đó thường còn có EEPROM hiệu ' +
           'chuẩn, chip quản lý nguồn, đồng hồ thời gian thực. Bạn vừa mở toàn bộ phần cứng ' +
           'để đổi lấy quyền đọc một cảm biến. Thứ hai, nó không bền: node bị xoá và tạo lại ' +
           'thì chế độ quay về mặc định, và script khởi động thì đã chạy xong từ lâu.</p>' +
           '<p><b>B hỏng ở chỗ khác.</b> Nó chạy được ngay, nên rất hấp dẫn trước hạn giao ' +
           'hàng. Cái giá là một lỗi phân tích dữ liệu trong <code>tempd</code> — vốn chỉ nên ' +
           'làm hỏng <code>tempd</code> — sẽ trao cho kẻ tấn công quyền ghi lên phân vùng ' +
           'khởi động. Đây đúng là "đảo ngược của nghề nhúng": trên thiết bị, phân quyền ' +
           'không bảo vệ người dùng khỏi nhau, nó bảo vệ <b>thiết bị khỏi chính phần mềm của ' +
           'nó</b>.</p>' +
           '<p><b>Khi nào B chấp nhận được:</b> bản mẫu chạy trên bàn, rootfs BusyBox chỉ có ' +
           'tài khoản root và không có <code>sudo</code> nào cả, thiết bị không nối mạng, ' +
           'vòng đời tính bằng tuần. Rất nhiều thiết bị thật xuất xưởng như vậy. Điều phân ' +
           'biệt kỹ sư có nghề là gọi đúng tên nó — <b>nợ kỹ thuật đã biết</b>, ghi vào ' +
           'ticket — chứ không phải tưởng đó là cách làm đúng. Chặng 08 và Chặng 12 sẽ quay ' +
           'lại đúng món nợ này khi bạn đã có một rootfs thật để bảo vệ.</p>' },

    { id: 'c4', k: 'free', tag: 'Tình huống mới', truc: 0, rows: 7,
      q: 'Daemon <code>sensor</code> chạy dưới tài khoản <code>sensor</code>, nhóm chính ' +
         'cũng là <code>sensor</code>. Nó phải <b>đọc và ghi</b> file hiệu chuẩn ' +
         '<code>/data/cal.bin</code>. Ai đó đã đặt file này thành:<br><br>' +
         '<code>---r--rw- 1 sensor sensor 4096 /data/cal.bin</code><br><br>' +
         'Trả lời ba câu: (1) daemon đọc được không, ghi được không, vì sao; (2) lệnh ' +
         '<code>chmod</code> <b>ngắn nhất</b> chữa được; (3) nếu người ta đổi cho daemon chạy ' +
         'dưới tài khoản <code>nobody</code> — <b>không</b> thuộc nhóm <code>sensor</code> — ' +
         'thì kết quả thay đổi thế nào?',
      crit: [
        'Trả lời (1): <b>không đọc được, không ghi được</b> — cả hai đều bị từ chối',
        'Giải thích: UID khớp chủ sở hữu nên kernel xét bộ ba đầu <code>---</code> rồi <b>dừng</b>, không xét tiếp <code>r--</code> của nhóm hay <code>rw-</code> của người khác',
        'Trả lời (2): <code>chmod u+rw /data/cal.bin</code> (kết quả là <code>646</code>)',
        'Trả lời (3): chạy dưới <code>nobody</code> thì rơi xuống bộ ba <b>người khác</b> = <code>rw-</code> → <b>đọc ghi được bình thường</b>',
        'Nêu được nghịch lý: chính chủ bị khoá ngoài trong khi người lạ vào thoải mái'
      ],
      sol: '<p><b>(1) Không đọc được và cũng không ghi được.</b> UID của tiến trình bằng chủ ' +
           'sở hữu file ngay ở bước kiểm tra đầu tiên, nên kernel xét đúng ba ký tự đầu — ' +
           '<code>---</code> — trả về <code>EACCES</code> và dừng. Bộ ba <code>r--</code> ' +
           'của nhóm <code>sensor</code> và bộ ba <code>rw-</code> của người khác không bao ' +
           'giờ được đọc tới, dù tài khoản <code>sensor</code> rõ ràng thuộc nhóm ' +
           '<code>sensor</code>. Đo thật trên máy với một file <code>046</code>: ' +
           '<code>cat</code> cho <code>rc=1</code>, ghi thêm cũng cho <code>rc=1</code>.</p>' +
           '<p><b>(2)</b> <code>chmod u+rw /data/cal.bin</code> — chế độ thành ' +
           '<code>646</code> và daemon chạy lại được ngay. Dùng dạng chữ chứ không dạng số ' +
           'vì bạn chỉ muốn đụng vào hai bit và không có lý do gì để đoán lại cả chín. (Nếu ' +
           'muốn dọn cho sạch thì <code>chmod 640</code>: chủ đọc ghi, nhóm đọc, người ngoài ' +
           'không gì cả — hợp lý hơn hẳn cho một file hiệu chuẩn.)</p>' +
           '<p><b>(3)</b> Kết quả <b>đảo ngược</b>: <code>nobody</code> không phải chủ sở ' +
           'hữu và không thuộc nhóm <code>sensor</code>, nên kernel trượt xuống bộ ba cuối ' +
           '— <code>rw-</code> — và cho đọc ghi thoải mái. Một tài khoản hoàn toàn xa lạ làm ' +
           'được đúng cái việc mà chính chủ bị cấm.</p>' +
           '<p>Nghịch lý này chính là bằng chứng rằng quyền Unix <b>không cộng dồn</b>. Nó ' +
           'cũng là lý do khi gỡ lỗi phân quyền, câu hỏi đầu tiên phải là "tiến trình này ' +
           'chạy dưới UID nào" (<code>ps -o user,pid,comm</code>) chứ không phải "file này ' +
           'có quyền gì".</p>' },

    { id: 'c5', k: 'free', tag: 'Tính toán / Chọn và biện minh', rows: 7,
      q: 'Bạn tiếp quản một rootfs của người khác. Script khởi tạo của init có dòng ' +
         '<code>umask 0</code> ở đầu, và mọi dịch vụ đều được sinh ra từ script đó. Dịch vụ ' +
         '<code>app</code> tạo file <code>/var/lib/app/state.json</code> và thư mục ' +
         '<code>/var/lib/app/cache</code> lúc chạy.<br><br>' +
         '<b>Tính</b> chế độ của hai thứ đó (viết ra hai con số bát phân), nói rõ vì sao đó ' +
         'là một lỗ hổng trên thiết bị, rồi <b>chọn</b> một giá trị <code>umask</code> thay ' +
         'thế và <b>biện minh</b> cho lựa chọn đó. Phần biện minh mới là phần được chấm.',
      crit: [
        'Tính đúng file: <b>666</b> (bằng 666 trừ mặt nạ 000)',
        'Tính đúng thư mục: <b>777</b> (bằng 777 trừ mặt nạ 000)',
        'Nói được rủi ro: mọi tiến trình trên thiết bị đều sửa được trạng thái / cache của dịch vụ',
        'Chọn một giá trị cụ thể và viết ra cặp số nó sinh ra — ví dụ <code>027</code> → 640/750, hoặc <code>077</code> → 600/700',
        'Nhắc được <code>umask</code> là thuộc tính của tiến trình và <b>truyền xuống mọi tiến trình con</b>, nên sửa ở script init là sửa cho tất cả'
      ],
      sol: '<p><b>Tính.</b> File mới = <code>666</code> trừ mặt nạ, thư mục mới = ' +
           '<code>777</code> trừ mặt nạ. Với <code>umask 0</code> thì không gỡ bit nào cả: ' +
           '<code>state.json</code> ra <b>666</b> (<code>-rw-rw-rw-</code>) và ' +
           '<code>cache/</code> ra <b>777</b> (<code>drwxrwxrwx</code>). Đây là số đo thật, ' +
           'không phải suy luận: chạy <code>( umask 0; touch f; mkdir d; stat -c \'%a %A %n\' ' +
           'f d )</code> trên máy bạn cho đúng hai dòng ' +
           '<code>666 -rw-rw-rw-</code> và <code>777 drwxrwxrwx</code>.</p>' +
           '<p><b>Vì sao là lỗ hổng.</b> Mọi tiến trình trên thiết bị — kể cả một tiến trình ' +
           'không có đặc quyền nào, kể cả một tiến trình vừa bị chiếm quyền qua lỗi phân ' +
           'tích gói tin — đều ghi đè được trạng thái của dịch vụ. Thư mục <code>777</code> ' +
           'còn tệ hơn: ai cũng thêm, xoá, đổi tên được các dòng trong bảng tên của nó, tức ' +
           'là thay được cả file bằng bản của mình. Và vì <code>umask</code> truyền xuống ' +
           '<b>mọi</b> tiến trình con của init, lỗi này không nằm ở một dịch vụ mà ở tất cả.</p>' +
           '<p><b>Chọn.</b> Không có một đáp án duy nhất, nhưng phải biện minh được:</p>' +
           '<ul>' +
           '<li><code>umask 022</code> → file <b>644</b>, thư mục <b>755</b>. Mặc định của ' +
           'máy để bàn. Chỉ chủ ghi được, ai cũng đọc được. Hợp lý cho file cấu hình dùng ' +
           'chung, <b>không</b> hợp lý cho dữ liệu trạng thái.</li>' +
           '<li><code>umask 027</code> → file <b>640</b>, thư mục <b>750</b>. Chủ ghi, nhóm ' +
           'đọc, người ngoài không thấy gì. Đây là lựa chọn mặc định tốt cho một dịch vụ ' +
           'chạy dưới tài khoản riêng có nhóm đi kèm — vẫn cho một tiến trình giám sát cùng ' +
           'nhóm đọc được log.</li>' +
           '<li><code>umask 077</code> → file <b>600</b>, thư mục <b>700</b>. Hoàn toàn ' +
           'riêng tư, không ai ngoài chính dịch vụ chạm được. Đây là mặt nạ của ' +
           '<code>~/.ssh</code>, và là lựa chọn đúng nếu <code>state.json</code> có chứa ' +
           'khoá, token hay số sê-ri thiết bị.</li>' +
           '</ul>' +
           '<p>Câu trả lời "kỹ sư" là <code>027</code> nếu có nhóm giám sát, ' +
           '<code>077</code> nếu dữ liệu là bí mật — và trong cả hai trường hợp, đặt nó ' +
           '<b>ở script init</b> chứ không ở từng dịch vụ, vì đó là chỗ duy nhất bảo đảm ' +
           'không dịch vụ nào bị bỏ sót.</p>' }
  ],

  /* ══════════════════════ D · ÔN XEN KẼ ══════════════════════ */
  D: [

    { id: 'd1', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 6.</b> <code>f.txt</code> và <code>g.txt</code> là hai <b>liên kết cứng</b> ' +
         'tới cùng một file, cả hai đang là <code>-rw-r--r--</code>. Bạn chạy ' +
         '<code>chmod 600 f.txt</code>. Ngay sau đó, <code>ls -l g.txt</code> in ra gì?',
      opts: [
        '<code>-rw-r--r--</code> — <code>chmod</code> chỉ đổi quyền của cái tên được nêu',
        '<code>-rw-------</code> — chín bit quyền nằm trong inode, mà hai cái tên cùng trỏ vào một inode',
        'Báo lỗi, vì không được đổi quyền của file đang có nhiều hơn một liên kết cứng',
        '<code>-rw-------</code>, nhưng chỉ sau khi <code>f.txt</code> bị xoá'
      ],
      a: 1,
      why: 'Bài 6 đã tách đôi hai thứ mà người mới hay gộp làm một: <b>cái tên</b> nằm ' +
           'trong bảng tên của thư mục, còn <b>file</b> là inode. Chín bit quyền, chủ sở ' +
           'hữu, nhóm, dấu thời gian — tất cả nằm trong inode. Hai liên kết cứng là hai ' +
           'dòng khác nhau trong bảng tên nhưng cùng chỉ vào một inode, nên đổi quyền qua ' +
           'tên nào cũng như nhau; không có "quyền của <code>f.txt</code>" tách khỏi "quyền ' +
           'của <code>g.txt</code>". Với liên kết <b>mềm</b> thì câu chuyện khác: bản thân ' +
           'symlink luôn hiện <code>lrwxrwxrwx</code> và <code>chmod</code> đi xuyên qua nó ' +
           'để đổi quyền của đích.' },

    { id: 'd2', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 4.</b> Bạn muốn đặt <code>note.txt</code> thành <code>644</code> bằng dạng ' +
         'chữ và gõ:<br><br><code>chmod u=rw, go=r note.txt</code><br><br>' +
         '(để ý dấu cách sau dấu phẩy). Điều gì xảy ra?',
      opts: [
        'Chạy đúng — shell bỏ qua khoảng trắng thừa quanh dấu phẩy',
        'Shell tách dòng thành 4 từ, nên <code>chmod</code> nhận chế độ <code>u=rw,</code> rồi coi <code>go=r</code> là <b>tên file</b>; lệnh hỏng và <code>note.txt</code> không đổi',
        'Shell báo lỗi cú pháp và <code>chmod</code> không hề được chạy',
        '<code>note.txt</code> thành <code>600</code>, vì chỉ mệnh đề đầu tiên được áp dụng'
      ],
      a: 1,
      why: 'Đây đúng là bài học trung tâm của Bài 4: <b>shell tách dòng theo khoảng trắng ' +
           '<i>trước khi</i> lệnh nhìn thấy bất cứ thứ gì</b>. <code>chmod</code> nhận được ' +
           'ba đối số — <code>u=rw,</code>, <code>go=r</code>, <code>note.txt</code> — và ' +
           'theo quy ước, đối số đầu là chế độ, phần còn lại là tên file. Đo thật trên máy ' +
           'cho ra hai dòng lỗi và mã thoát 1:<br>' +
           '<code>chmod: cannot access \'go=r\': No such file or directory</code><br>' +
           '<code>chmod: invalid mode ()</code><br>' +
           '(dòng thứ hai là vì dấu phẩy cuối để lại một mệnh đề rỗng). Sau lệnh đó ' +
           '<code>note.txt</code> vẫn nguyên <code>644</code> — lệnh hỏng nhưng <b>không</b> ' +
           'làm hỏng gì. Bỏ dấu cách đi, <code>chmod u=rw,go=r note.txt</code>, thì mã thoát ' +
           'là 0. Trong dạng chữ của <code>chmod</code>, dấu phẩy là ký tự nối các mệnh đề ' +
           '<b>bên trong một đối số</b>, không phải dấu ngắt câu.' },

    { id: 'd3', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 5.</b> Trên máy bạn, <code>ls -l /dev/ttyS0</code> in ra:<br><br>' +
         '<code>crw-rw---- 1 root dialout 4, 64 /dev/ttyS0</code><br><br>' +
         'Kết luận nào đúng?',
      opts: [
        'Đây là file thường nặng 4 KB; cặp <code>4, 64</code> là kích thước tính theo block',
        'Chữ <code>c</code> cho biết đây là thiết bị ký tự; cặp <code>4, 64</code> là major/minor trỏ tới một driver trong kernel, và bản thân node không chứa byte dữ liệu nào',
        '<code>4, 64</code> là UID và GID của người sở hữu thiết bị',
        'Cột kích thước trống nghĩa là node hỏng, phải tạo lại bằng <code>mknod</code>'
      ],
      a: 1,
      why: 'Bài 5 đã nói: một node trong <code>/dev</code> <b>không chứa dữ liệu</b>. Chỗ ' +
           'mà <code>ls</code> in kích thước cho file thường thì với node thiết bị nó in ' +
           'cặp <b>major, minor</b> — ở đây <code>4, 64</code> — và cặp số đó là địa chỉ ' +
           'chuyển tiếp: major chọn driver trong kernel, minor chọn thiết bị thứ mấy do ' +
           'driver đó quản lý. Mở file này là gọi vào driver, không phải đọc đĩa. Ghép với ' +
           'chính bài này: cột <code>root dialout</code> và chế độ <code>rw-rw----</code> ' +
           'nói rằng muốn nói chuyện với cổng nối tiếp — việc bạn sẽ làm suốt từ Chặng 06 ' +
           'trở đi khi cắm cáp USB-TTL vào bo mạch — tài khoản của bạn phải thuộc nhóm ' +
           '<code>dialout</code>. Đúng khuôn mẫu <code>root:&lt;nhóm&gt;</code> + tư cách ' +
           'thành viên nhóm.' }
  ],

  /* ══════════════════════ E · THỰC HÀNH ══════════════════════ */
  E: [

    { id: 'e1', k: 'free', tag: 'Dự đoán output', rows: 6,
      q: '<b>Viết dự đoán ra trước, rồi mới chạy.</b> Bắt đầu từ một file mới toanh tạo ' +
         'bằng <code>touch chain.txt</code> (chế độ <code>644</code>). Với mỗi lệnh dưới ' +
         'đây, viết ra số bát phân ba chữ số của <code>chain.txt</code> <b>sau</b> lệnh đó ' +
         '— năm con số, theo thứ tự. Rồi làm tiếp hai dòng cuối cho một <b>thư mục</b>.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'mkdir -p ~/embedded/bt08 && cd ~/embedded/bt08\n' +
          'touch chain.txt\n' +
          'chmod 700   chain.txt ; stat -c \'%a %A %n\' chain.txt\n' +
          'chmod g+rw  chain.txt ; stat -c \'%a %A %n\' chain.txt\n' +
          'chmod o=x   chain.txt ; stat -c \'%a %A %n\' chain.txt\n' +
          'chmod a-w   chain.txt ; stat -c \'%a %A %n\' chain.txt\n' +
          'chmod u=rwX chain.txt ; stat -c \'%a %A %n\' chain.txt' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'mkdir chaindir\n' +
          'chmod a-x chaindir ; stat -c \'%a %A %n\' chaindir\n' +
          'chmod u+X chaindir ; stat -c \'%a %A %n\' chaindir' },
        { t: 'p', x:
          'Câu hỏi chính không phải là năm con số. Là dòng cuối: vì sao <code>u=rwX</code> ' +
          'và <code>u+X</code> — cùng một chữ <code>X</code> — lại cho kết quả khác nhau ' +
          'giữa file và thư mục?' }
      ],
      crit: [
        'File: <code>700</code>, <code>760</code>, <code>761</code>, <code>541</code>, <code>741</code> — đúng cả năm',
        'Giải thích được <code>a-w</code> làm <code>761 → 541</code>: gỡ bit <code>w</code> ở <b>cả ba</b> bộ ba, chủ sở hữu cũng không được miễn',
        'Thư mục: <code>644</code> rồi <code>744</code>',
        'Nói đúng luật của <code>X</code> viết hoa: chỉ cấp <code>x</code> nếu đối tượng là <b>thư mục</b>, hoặc là file <b>đã có sẵn ít nhất một bit x</b>',
        'Áp dụng luật đó cho bước cuối của file: lúc đó <code>chain.txt</code> đang là <code>541</code>, chủ sở hữu đang có <code>r-x</code> → đã có <code>x</code> → <code>X</code> được cấp → <code>741</code>'
      ],
      solBlocks: [
        { t: 'p', x: 'Số đo thật trên máy — file trước:' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '644 chain.txt          <- touch\n' +
          '700 -rwx------ chain.txt\n' +
          '760 -rwxrw---- chain.txt\n' +
          '761 -rwxrw---x chain.txt\n' +
          '541 -r-xr----x chain.txt\n' +
          '741 -rwxr----x chain.txt' },
        { t: 'p', x:
          'Từng bước: <code>700</code> đặt thẳng. <code>g+rw</code> cộng thêm 6 vào bộ ba ' +
          'giữa → <code>760</code>. <code>o=x</code> <b>gán</b> bộ ba cuối bằng đúng ' +
          '<code>x</code> → <code>761</code>. <code>a-w</code> gỡ <code>w</code> ở cả ba ' +
          'bộ ba: <code>7→5</code>, <code>6→4</code>, <code>1→1</code> → <code>541</code>. ' +
          'Chủ sở hữu bị gỡ luôn — <code>a</code> nghĩa là <i>all</i>, không có ngoại lệ ' +
          'cho người đang gõ lệnh.' },
        { t: 'p', x: 'Thư mục:' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '755 chaindir           <- mkdir\n' +
          '644 drw-r--r-- chaindir\n' +
          '744 drwxr--r-- chaindir' },
        { t: 'cal', kind: 'why', title: 'Vì sao X viết hoa lại cho hai kết quả khác nhau', x:
          '<b>Chữ <code>X</code> viết hoa là công cụ quan trọng nhất trong bài này.</b> Nó ' +
          'nghĩa là: <i>cấp bit <code>x</code> nếu đây là thư mục, hoặc nếu file này vốn đã ' +
          'có ít nhất một bit <code>x</code> ở đâu đó</i>. Với <code>chaindir</code>, ' +
          '<code>u+X</code> luôn cấp vì thư mục cần <code>x</code> để đi qua. Với ' +
          '<code>chain.txt</code> ở bước cuối, chế độ đang là <code>541</code> — chủ sở hữu ' +
          'đang giữ <code>r-x</code>, tức là đã có <code>x</code> — nên <code>X</code> cấp ' +
          'và ta được <code>741</code>. Nếu file lúc đó là <code>440</code> (không bit ' +
          '<code>x</code> nào), <code>u=rwX</code> sẽ cho <code>640</code>, không phải ' +
          '<code>740</code>. Đây chính là lý do <code>chmod -R u=rwX,go=rX</code> sửa được ' +
          'cả cây thư mục mà không biến mọi file văn bản thành file thực thi — bạn sẽ dùng ' +
          'nó ngay ở E3.' }
      ] },

    { id: 'e2', k: 'free', tag: 'Dự đoán output', rows: 6,
      q: '<b>Viết dự đoán ra trước, rồi mới chạy.</b> Trong sáu chương trình sau, cái nào ' +
         'bạn nghĩ có bit <b>setuid</b> trên máy này: <code>passwd</code>, <code>su</code>, ' +
         '<code>mount</code>, <code>sudo</code>, <code>ls</code>, <code>cat</code>? Đoán ' +
         'thêm: có <b>bao nhiêu</b> file setuid trong <code>/usr/bin</code>, và bao nhiêu ' +
         'file <b>setgid</b>? Rồi chạy:',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'find /usr/bin -perm -4000 -type f | sort\n' +
          'find /usr/bin -perm -2000 -type f | sort\n' +
          'ls -l /usr/bin/sudo /usr/bin/sudo.ws' },
        { t: 'p', x:
          'Hai câu phải trả lời sau khi chạy: (1) vì sao <code>/usr/bin/sudo</code> ' +
          '<b>không</b> nằm trong danh sách setuid dù <code>sudo</code> rõ ràng chạy được ' +
          'bằng quyền root; (2) nhìn cột nhóm của bốn file setgid, đoán xem bit setgid ở đây ' +
          'dùng để làm gì.' }
      ],
      crit: [
        'Đoán đúng: <code>passwd</code>, <code>su</code>, <code>mount</code> có setuid; <code>ls</code> và <code>cat</code> thì không',
        'Đọc được số: <b>9</b> file setuid, <b>4</b> file setgid trong <code>/usr/bin</code>',
        'Trả lời (1): <code>/usr/bin/sudo</code> là một <b>liên kết mềm</b>, mà <code>find -type f</code> chỉ nhận file thường — binary setuid thật tên là <code>/usr/bin/sudo.ws</code>',
        'Trả lời (2): nhóm là <code>shadow</code>, <code>crontab</code>, <code>_ssh</code> — setgid cấp tư cách <b>nhóm</b> vừa đủ để chạm vào một tài nguyên, không cấp toàn quyền root',
        'Nêu được sự đối lập: setuid-root là "cho tất cả", setgid là "cho vừa đủ"'
      ],
      solBlocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '$ find /usr/bin -perm -4000 -type f | sort\n' +
          '/usr/bin/chfn\n' +
          '/usr/bin/chsh\n' +
          '/usr/bin/fusermount3\n' +
          '/usr/bin/gpasswd\n' +
          '/usr/bin/mount\n' +
          '/usr/bin/passwd\n' +
          '/usr/bin/su\n' +
          '/usr/bin/sudo.ws\n' +
          '/usr/bin/umount\n' +
          '\n' +
          '$ find /usr/bin -perm -2000 -type f | sort\n' +
          '/usr/bin/chage\n' +
          '/usr/bin/crontab\n' +
          '/usr/bin/expiry\n' +
          '/usr/bin/ssh-agent' },
        { t: 'p', x:
          'Chín file setuid, bốn file setgid — trên cả một thư mục có hàng nghìn chương ' +
          'trình. Con số nhỏ này là cố ý: mỗi file setuid-root là một cánh cửa vào quyền ' +
          'root, nên bản phân phối giữ danh sách đó ngắn hết mức. Toàn bộ chín cái đều làm ' +
          'đúng một việc mà người dùng thường <b>bắt buộc</b> phải cần đặc quyền: đổi mật ' +
          'khẩu, đổi shell, gắn/tháo thiết bị, hoá thân thành người khác.' },
        { t: 'p', x:
          '<b>(1)</b> <code>/usr/bin/sudo</code> vắng mặt vì nó là symlink:' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'lrwxrwxrwx 1 root root     22 /usr/bin/sudo -> /etc/alternatives/sudo\n' +
          '-rwsr-xr-x 1 root root 282080 /usr/bin/sudo.ws' },
        { t: 'p', x:
          '<code>find -type f</code> chỉ nhận file thường, mà symlink không phải file ' +
          'thường — nên nó bị loại trước cả khi bit <code>s</code> được xét. Binary thật, ' +
          '<code>sudo.ws</code>, có <code>-rwsr-xr-x</code> đúng như dự đoán. Bài học: ' +
          'không thấy trong kết quả <code>find</code> <b>không</b> có nghĩa là không tồn ' +
          'tại; nó có thể chỉ nghĩa là điều kiện lọc của bạn loại nó ra.' },
        { t: 'p', x:
          '<b>(2)</b> Bốn file setgid và nhóm của chúng:' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '-rwxr-sr-x 1 root shadow   85256 /usr/bin/chage\n' +
          '-rwxr-sr-x 1 root crontab  39744 /usr/bin/crontab\n' +
          '-rwxr-sr-x 1 root shadow   23168 /usr/bin/expiry\n' +
          '-rwxr-sr-x 1 root _ssh    313864 /usr/bin/ssh-agent' },
        { t: 'p', x:
          'Chú ý chữ <code>s</code> nằm ở <b>bộ ba giữa</b> chứ không phải bộ ba đầu, và ' +
          'chủ sở hữu vẫn là <code>root</code> nhưng bit setuid thì không bật. Chạy ' +
          '<code>chage</code>, bạn không thành root — bạn tạm thời thành thành viên nhóm ' +
          '<code>shadow</code>, vừa đủ để đọc <code>/etc/shadow</code> và không hơn một ' +
          'chút nào. <code>crontab</code> mượn nhóm <code>crontab</code> để ghi vào thư mục ' +
          'lịch chạy; <code>ssh-agent</code> mượn nhóm <code>_ssh</code>. Đây là nguyên tắc ' +
          '<b>đặc quyền tối thiểu</b> đúng nghĩa: setuid-root cho tất cả, setgid cho vừa ' +
          'đủ. Khi bạn tự viết dịch vụ cho thiết bị, câu hỏi luôn phải là "nhóm nào là đủ", ' +
          'chứ không phải "làm sao chạy được bằng root".' }
      ] },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh', rows: 5,
      q: 'Bạn giải nén một cây mã nguồn do người khác gửi và quyền bên trong loạn hết. ' +
         'Dựng lại đúng tình trạng đó rồi <b>viết một lệnh duy nhất</b> đưa mọi <b>thư ' +
         'mục</b> về <code>755</code> và mọi <b>file</b> về <code>644</code>. Không được ' +
         'liệt kê tên từng file, và không được biến file văn bản thành file thực thi.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'cd ~/embedded/bt08\n' +
          'mkdir -p tree/sub\n' +
          'echo \'echo a\' > tree/a.sh\n' +
          'echo b > tree/sub/b.txt\n' +
          'chmod 777 tree ; chmod 700 tree/sub ; chmod 666 tree/a.sh ; chmod 600 tree/sub/b.txt\n' +
          'stat -c \'%a %A %n\' tree tree/a.sh tree/sub tree/sub/b.txt' },
        { t: 'p', x:
          'Trước khi gõ, tự trả lời: vì sao <code>chmod -R 755 tree</code> là câu trả lời ' +
          'sai, và vì sao <code>chmod -R 644 tree</code> còn tệ hơn nữa?' }
      ],
      crit: [
        'Lệnh có dạng <code>chmod -R u=rwX,go=rX tree</code> (thứ tự mệnh đề có thể khác, nhưng phải dùng <code>X</code> viết hoa)',
        'Kiểm chứng lại bằng <code>stat</code> và thấy đúng <code>755 / 644 / 755 / 644</code>',
        'Giải thích <code>-R 755</code> sai: nó cấp bit <code>x</code> cho <b>mọi file</b>, kể cả <code>b.txt</code>',
        'Giải thích <code>-R 644</code> tệ hơn: thư mục mất bit <code>x</code> nên không đi vào được nữa',
        'Nói được điểm mấu chốt: chỉ <code>X</code> viết hoa mới phân biệt được thư mục với file trong <b>một</b> lần duyệt'
      ],
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code: 'chmod -R u=rwX,go=rX tree' },
        { t: 'p', x: 'Trước và sau, đo thật trên máy:' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '777 drwxrwxrwx tree              755 drwxr-xr-x tree\n' +
          '666 -rw-rw-rw- tree/a.sh    -->  644 -rw-r--r-- tree/a.sh\n' +
          '700 drwx------ tree/sub          755 drwxr-xr-x tree/sub\n' +
          '600 -rw------- tree/sub/b.txt    644 -rw-r--r-- tree/sub/b.txt' },
        { t: 'p', x:
          'Một lệnh, bốn đối tượng, hai kết quả khác nhau — và <code>chmod</code> tự phân ' +
          'biệt được vì <code>X</code> viết hoa hỏi "đây có phải thư mục không". ' +
          '<code>chmod -R 755 tree</code> cũng cho thư mục đúng, nhưng biến ' +
          '<code>b.txt</code> thành <code>-rwxr-xr-x</code>: một file dữ liệu mang cờ "có ' +
          'thể chạy được", đúng loại rác mà về sau khiến người ta gõ nhầm ' +
          '<code>./b.txt</code> và nhận một lỗi khó hiểu.' },
        { t: 'cal', kind: 'warn', x:
          '<code>chmod -R 644 tree</code> thì không chỉ sai, nó còn <b>tự chặn chính nó</b> ' +
          'giữa chừng — bạn đã gặp hiện tượng đó ở phần B. Đây là lý do quy tắc ' +
          '<code>u=rwX,go=rX</code> đáng thuộc lòng: nó là câu trả lời mặc định cho "quyền ' +
          'trong cây thư mục này loạn hết rồi", và bạn sẽ dùng nó rất nhiều khi bê rootfs ' +
          'qua lại giữa <code>/mnt/c</code> và WSL từ Chặng 04 trở đi.' }
      ] },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh', rows: 5,
      q: 'Viết <b>một lệnh</b> liệt kê mọi file nằm <b>trực tiếp</b> trong <code>/etc</code> ' +
         '(không đi vào thư mục con) mà tài khoản của bạn <b>không đọc được</b>. Không được ' +
         'dùng <code>sudo</code>, và không được duyệt bằng mắt. Chạy xong, trả lời: kết quả ' +
         'có bao nhiêu file, và vì sao <i>đúng những file đó</i> chứ không phải file khác?',
      hint: '<code>find</code> có một vị từ hỏi thẳng "tiến trình đang chạy lệnh này có đọc ' +
            'được không" — nó không nằm ở nhóm <code>-perm</code>. Và có một tuỳ chọn giới ' +
            'hạn độ sâu duyệt.',
      crit: [
        'Lệnh có <code>find /etc</code>, <code>-maxdepth 1</code>, <code>-type f</code> và <code>! -readable</code>',
        'Đếm đúng: <b>6</b> file',
        'Nhận ra <code>/etc/shadow</code> và <code>/etc/gshadow</code> (cùng bản sao lưu <code>-</code>) là nơi chứa băm mật khẩu',
        'Giải thích được vì sao <code>/etc/passwd</code> <b>không</b> có trong danh sách: nó phải cho mọi người đọc để ánh xạ UID sang tên',
        'Nói được <code>-perm</code> hỏi về <b>bit trên file</b>, còn <code>-readable</code> hỏi về <b>kết quả kiểm tra quyền của kernel cho chính tôi</b> — hai câu hỏi khác nhau'
      ],
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'find /etc -maxdepth 1 -type f ! -readable' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '/etc/.pwd.lock\n' +
          '/etc/gshadow\n' +
          '/etc/gshadow-\n' +
          '/etc/shadow\n' +
          '/etc/shadow-\n' +
          '/etc/sudoers' },
        { t: 'p', x:
          'Sáu file, và không có file nào ở đó một cách tình cờ. <code>shadow</code> và ' +
          '<code>gshadow</code> giữ băm mật khẩu của người dùng và của nhóm; hai file kết ' +
          'thúc bằng <code>-</code> là bản sao lưu của lần sửa trước, và một bản sao lưu ' +
          'của bí mật vẫn là bí mật. <code>sudoers</code> nói ai được làm gì bằng quyền ' +
          'root — đọc được nó là biết chính xác nên tấn công vào đâu. <code>.pwd.lock</code> ' +
          'là file khoá dùng khi sửa các file trên.' },
        { t: 'p', x:
          'Điều đáng chú ý hơn là thứ <b>không</b> có trong danh sách: ' +
          '<code>/etc/passwd</code>. Nó là <code>644</code>, ai cũng đọc được, và bắt buộc ' +
          'phải như vậy — <code>ls -l</code> cần nó để dịch UID 1000 thành ' +
          '<code>shinarus</code>. Việc tách đôi "bảng tên đọc được cho tất cả" và "bảng bí ' +
          'mật chỉ root đọc" chính là lý do <code>/etc/shadow</code> tồn tại.' },
        { t: 'cal', kind: 'info', title: 'Hỏi về file, hay hỏi về tôi?', x:
          '<code>! -readable</code> khác hẳn <code>-perm</code>. <code>-perm</code> so khớp ' +
          'chín bit ghi trên inode — một câu hỏi về <i>file</i>. <code>-readable</code> bảo ' +
          '<code>find</code> hỏi thẳng kernel "<b>tôi</b> mở được file này không" — một câu ' +
          'hỏi về <i>tôi</i>, và nó đi qua đúng cái luật một-bộ-ba mà cả bài này xoay quanh. ' +
          'Chạy cùng lệnh đó dưới <code>sudo</code> thì kết quả rỗng, vì root bỏ qua toàn bộ ' +
          'phép kiểm tra.' }
      ] },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi', rows: 6,
      q: 'Hai sự cố nhỏ, dựng lại được trong ba mươi giây. Với <b>mỗi</b> cái: nói lỗi ' +
         'nằm ở đâu, rồi viết lệnh chữa.',
      blocks: [
        { t: 'p', x: '<b>Sự cố 1</b> — dọn một thư mục tạm mà không xoá nổi:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'cd ~/embedded/bt08\n' +
          'mkdir -p locked/inner\n' +
          'echo x > locked/inner/f.txt\n' +
          'chmod 000 locked/inner\n' +
          'rm -rf locked ; echo "rc=$?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'rm: cannot remove \'locked/inner\': Permission denied\n' +
          'rc=1' },
        { t: 'p', x:
          '<b>Sự cố 2</b> — một script vừa viết xong không chịu chạy:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'echo \'echo hello\' > run.sh\n' +
          'chmod 644 run.sh\n' +
          './run.sh ; echo "rc=$?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'bash: ./run.sh: Permission denied\n' +
          'rc=126' }
      ],
      crit: [
        'Sự cố 1: chỉ ra <code>rm -rf</code> phải <b>đi vào</b> <code>locked/inner</code> để xoá nội dung, mà chế độ <code>000</code> lấy mất cả <code>r</code> lẫn <code>x</code>',
        'Sự cố 1: chữa bằng <code>chmod -R u+rwX locked</code> rồi <code>rm -rf locked</code>',
        'Nói được vì sao <code>-r</code> của <code>rm</code> không cứu được: <code>rm</code> vẫn là một tiến trình thường và vẫn phải xin phép kernel từng bước',
        'Sự cố 2: thiếu bit <code>x</code>; chữa bằng <code>chmod +x run.sh</code> (hoặc <code>chmod 755</code>)',
        'Đọc đúng mã <b>126</b> = "tìm thấy rồi nhưng không chạy được", và phân biệt với <b>127</b> = "không tìm thấy lệnh"'
      ],
      solBlocks: [
        { t: 'p', x:
          '<b>Sự cố 1.</b> Để xoá <code>locked/inner</code>, <code>rm</code> phải liệt kê ' +
          'những gì bên trong (cần <code>r</code>) và đi vào để xoá từng thứ (cần ' +
          '<code>x</code>). Chế độ <code>000</code> lấy đi cả hai, nên <code>rm</code> dừng ' +
          'lại đúng ở đó. Việc bạn là chủ sở hữu không giúp gì — kernel xét bộ ba của chủ ' +
          'sở hữu, thấy <code>---</code>, và dừng. Nhưng chính vì là chủ sở hữu, bạn có thể ' +
          '<code>chmod</code>:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'chmod -R u+rwX locked\n' +
          'rm -rf locked ; echo "rc=$?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code: 'rc=0' },
        { t: 'p', x:
          'Dùng <code>u+rwX</code> chứ không phải <code>777</code>: bạn chỉ cần <i>mình</i> ' +
          'vào được, và chỉ cần đủ lâu để xoá. Chữ <code>X</code> viết hoa lại một lần nữa ' +
          'giúp — nó cấp <code>x</code> cho thư mục mà không đụng tới file bên trong.' },
        { t: 'p', x:
          '<b>Sự cố 2.</b> Kernel tìm thấy <code>run.sh</code>, đọc được nó, nhưng từ chối ' +
          '<i>thi hành</i> vì không bộ ba nào có bit <code>x</code>. Đó chính xác là nghĩa ' +
          'của mã <b>126</b>.' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'chmod +x run.sh\n' +
          './run.sh ; echo "rc=$?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'hello\n' +
          'rc=0' },
        { t: 'cal', kind: 'tip', x:
          'Hai con số này đáng nhớ vì chúng chia đôi hướng gỡ lỗi. <b>126</b> = tìm thấy ' +
          'rồi, không chạy được → xem bit <code>x</code>, xem tuỳ chọn ' +
          '<code>noexec</code> lúc mount, xem dòng <code>#!</code>. <b>127</b> = không tìm ' +
          'thấy → xem đường dẫn, xem <code>PATH</code>. Thử ngay cho thấy sự khác biệt: ' +
          '<code>notacommand</code> cho <code>rc=127</code>, còn ' +
          '<code>./nosuchfile.sh</code> cũng cho <code>127</code>. Khi một dịch vụ trên bo ' +
          'mạch chết lúc boot, con số này thường là manh mối duy nhất bạn có.' }
      ] },

    { id: 'e6', k: 'free', tag: 'Thử thách', rows: 6,
      q: '<b>Câu này được phép chưa trả lời trọn vẹn.</b> Chạy <code>ls -l ' +
         '/usr/bin/ping</code>. Bạn sẽ thấy nó <b>không</b> có bit setuid — vậy mà ' +
         '<code>ping</code> cần mở <b>raw socket</b>, một việc mà kernel chỉ cho tiến trình ' +
         'đặc quyền làm. Hãy tìm ra <b>cơ chế thứ ba</b> đang đứng sau nó (gợi ý: có một ' +
         'lệnh tên là <code>getcap</code>), rồi trả lời: nếu bạn viết một web server cho ' +
         'thiết bị và nó cần nghe ở cổng 80, bạn sẽ cấp cho nó cái gì thay vì setuid-root?',
      hint: 'Từ khoá là <b>Linux capabilities</b>. Kernel đã cắt quyền lực của root thành ' +
            'khoảng bốn chục mảnh có tên riêng, và một chương trình có thể được cấp đúng ' +
            'một mảnh. <code>man 7 capabilities</code>.',
      crit: [
        'Chạy được <code>getcap -r /usr/bin</code> và thấy <code>/usr/bin/ping cap_net_raw=ep</code>',
        'Nói được: thay vì cấp <b>toàn bộ</b> quyền root qua setuid, kernel cấp đúng <b>một</b> năng lực cho binary đó',
        'Trả lời cổng 80 bằng <code>CAP_NET_BIND_SERVICE</code> (đặt qua <code>setcap</code>)',
        'Nêu được vì sao cách này an toàn hơn setuid-root: lỗi trong chương trình chỉ rò rỉ đúng một năng lực, không rò rỉ cả máy',
        'Ghi lại một câu hỏi còn bỏ ngỏ của riêng bạn để mang sang các chặng sau'
      ],
      solBlocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '$ ls -l /usr/bin/ping\n' +
          '-rwxr-xr-x+ 1 root root 159552 /usr/bin/ping\n' +
          '\n' +
          '$ getcap -r /usr/bin\n' +
          '/usr/bin/ping cap_net_raw=ep' },
        { t: 'p', x:
          'Không có chữ <code>s</code> nào — chỉ có <code>-rwxr-xr-x</code>, cộng thêm dấu ' +
          '<code>+</code> ở cuối cột quyền (dấu đó báo có metadata mở rộng gắn kèm, và ' +
          '<code>ls</code> không biết hiển thị nó). Thứ làm cho <code>ping</code> chạy được ' +
          'là <b>capability</b> <code>cap_net_raw</code> gắn thẳng lên file.' },
        { t: 'p', x:
          'Ý tưởng: quyền lực của root vốn là một khối liền. Kernel Linux đã cắt khối đó ' +
          'thành khoảng bốn chục mảnh có tên — <code>CAP_NET_RAW</code> (mở raw socket), ' +
          '<code>CAP_NET_BIND_SERVICE</code> (nghe ở cổng dưới 1024), ' +
          '<code>CAP_SYS_TIME</code> (đặt đồng hồ hệ thống), <code>CAP_SYS_ADMIN</code> ' +
          '(cái sọt rác to đùng chứa mọi thứ còn lại). Một binary có thể được cấp đúng một ' +
          'mảnh. <code>ping</code> ngày xưa là setuid-root — một lỗi tràn bộ đệm trong nó là ' +
          'một lỗi tràn bộ đệm <i>bằng quyền root</i>. Bây giờ nó chỉ có ' +
          '<code>cap_net_raw</code>, và một lỗi tương tự chỉ cho kẻ tấn công quyền tạo gói ' +
          'tin thô. Vẫn tệ, nhưng tệ ít hơn vài bậc.' },
        { t: 'p', x:
          '<b>Web server cổng 80:</b> ' +
          '<code>sudo setcap cap_net_bind_service=+ep /usr/local/bin/myserver</code> — sau ' +
          'đó nó nghe được ở cổng 80 trong khi vẫn chạy dưới một tài khoản không đặc quyền. ' +
          'Đây là câu trả lời "đúng chuẩn hiện đại"; cách cũ là chạy bằng root rồi tự hạ ' +
          'quyền sau khi <code>bind()</code>, và cách đó vẫn còn khắp nơi trong mã nguồn ' +
          'thật.' },
        { t: 'cal', kind: 'warn', title: 'Điều còn bỏ ngỏ, cố ý', x:
          'Capability sống trên file thông qua <i>extended ' +
          'attribute</i>, nên nó chỉ tồn tại nếu hệ thống file hỗ trợ và <b>bảo toàn</b> ' +
          'thuộc tính mở rộng. Chép binary qua <code>/mnt/c</code>, đóng gói bằng một công ' +
          'cụ tar không giữ xattr, hoặc dựng rootfs bằng cách sai — capability biến mất im ' +
          'lặng và chương trình hỏng trên bo mạch dù chạy tốt trên máy bạn. Đây là một ' +
          'trong những lỗi khó chịu nhất của nghề nhúng, và bạn sẽ gặp lại nó thật sự khi ' +
          'dựng rootfs ở Chặng 08. Ghi câu hỏi của bạn lại; đừng cố giải hết bây giờ.' }
      ] }
  ],

  /* ══════════════════════ F · BÍ Ở ĐÂU THÌ ĐỌC LẠI ĐÂU ══════════════════════ */
  diag: [

    ['A1, A5, B1, C4',
     'Bạn vẫn nghĩ quyền được <b>cộng dồn</b> từ ba bộ ba. Kernel chọn <b>đúng một</b> bộ ba ' +
     '— chủ sở hữu, hay nhóm, hay người khác — rồi dừng lại ở đó, kể cả khi bộ ba phía sau ' +
     'rộng rãi hơn.',
     '<a href="#/bai-08#truoc-het-ban-la-ai-trong-mat-kernel">Đọc lại Bài 8 — Trước hết: bạn là ai trong mắt kernel</a>'],

    ['A3, E1',
     'Chuyển qua lại giữa chín ký tự và ba chữ số bát phân còn phải nhẩm. Đây là kỹ năng ' +
     'phải thành phản xạ — mọi thứ còn lại trong bài đều dựa lên nó.',
     '<a href="#/bai-08#chin-ky-tu-va-con-so-tuong-duong">Đọc lại Bài 8 — Chín ký tự và con số tương đương</a>'],

    ['A8, B2, C1',
     'Bạn đang đọc quyền của thư mục như thể chúng nói về các file bên trong. Chúng nói về ' +
     '<b>bảng tên</b>: <code>r</code> = liệt kê được tên, <code>w</code> = thêm/xoá/đổi tên ' +
     'được, <code>x</code> = đi xuyên qua được. Xoá một file là sửa bảng tên của thư mục cha, ' +
     'không phải sửa file.',
     '<a href="#/bai-08#r-w-x-nghia-khac-nhau-voi-file-va-voi-thu-muc">Đọc lại Bài 8 — r, w, x nghĩa khác nhau với file và với thư mục</a>'],

    ['B5, E1, E3',
     'Dạng chữ của <code>chmod</code> chưa vững, đặc biệt là <code>X</code> viết hoa: nó chỉ ' +
     'cấp <code>x</code> cho thư mục hoặc cho file vốn đã có sẵn bit <code>x</code>. Đó là ' +
     'thứ duy nhất sửa được cả cây thư mục trong một lệnh mà không phá.',
     '<a href="#/bai-08#chmod-hai-cach-noi-cung-mot-dieu">Đọc lại Bài 8 — chmod: hai cách nói cùng một điều</a>'],

    ['C5',
     'Bạn tính sai chế độ của file/thư mục mới. Công thức là <code>666</code> trừ mặt nạ cho ' +
     'file, <code>777</code> trừ mặt nạ cho thư mục — và <code>umask</code> là thuộc tính của ' +
     'tiến trình, truyền xuống mọi tiến trình con.',
     '<a href="#/bai-08#umask-vi-sao-file-moi-luon-la-644">Đọc lại Bài 8 — umask: vì sao file mới luôn là 644</a>'],

    ['A7, B6, E2',
     'Ba bit đặc biệt còn lẫn lộn. Nhớ chỗ đứng của chúng: <code>s</code> ở bộ ba đầu là ' +
     'setuid, <code>s</code> ở bộ ba giữa là setgid, <code>t</code> ở cuối là sticky — và ' +
     'setuid <b>không</b> có tác dụng trên script.',
     '<a href="#/bai-08#ba-bit-dac-biet-setuid-setgid-sticky">Đọc lại Bài 8 — Ba bit đặc biệt: setuid, setgid, sticky</a>'],

    ['A2, B3, C3',
     'Bạn chưa nắm khuôn mẫu quan trọng nhất của Linux nhúng: node thiết bị thuộc ' +
     '<code>root:&lt;nhóm&gt;</code> chế độ <code>0660</code>, và quyền dùng phần cứng được ' +
     'cấp bằng <b>tư cách thành viên nhóm</b>, do quy tắc udev đặt lại mỗi lần thiết bị xuất ' +
     'hiện — chứ không phải bằng <code>chmod 666</code> hay bằng cách chạy root.',
     '<a href="#/bai-08#thuc-hanh-tu-tay-bi-tu-choi-roi-tu-tay-mo-khoa">Đọc lại Bài 8 — Thực hành: tự tay bị từ chối, rồi tự tay mở khoá</a>'],

    ['A4, A6, B4',
     'Ranh giới của root còn mờ: ai được <code>chown</code>, vì sao ' +
     '<code>/etc/passwd</code> ai cũng đọc được còn <code>/etc/shadow</code> thì không, và ' +
     'khác nhau giữa "không được phép làm việc này" và "không được phép chạm vào file này".',
     '<a href="#/bai-08#sudo-su-va-vi-sao-dung-dang-nhap-thang-bang-root">Đọc lại Bài 8 — sudo, su và vì sao đừng đăng nhập thẳng bằng root</a>'],

    ['C2, E5',
     'Mã thoát chưa đọc được. <b>126</b> = tìm thấy rồi nhưng không chạy được (thiếu ' +
     '<code>x</code>, mount <code>noexec</code>, sai dòng <code>#!</code>); <b>127</b> = ' +
     'không tìm thấy lệnh. Trên bo mạch, đây thường là manh mối duy nhất bạn có.',
     '<a href="#/bai-08#loi-thuong-gap">Đọc lại Bài 8 — Lỗi thường gặp</a>'],

    ['E4, E6',
     'Chưa quen dùng công cụ để <b>hỏi máy</b> thay vì đoán: <code>find ! -readable</code> ' +
     'hỏi kernel "tôi đọc được không", <code>getcap</code> hỏi "file này được cấp năng lực ' +
     'gì". Cả hai đều trả lời những câu mà <code>ls -l</code> không trả lời được.',
     '<a href="#/bai-08#thuc-hanh-tu-tay-bi-tu-choi-roi-tu-tay-mo-khoa">Đọc lại Bài 8 — Thực hành: tự tay bị từ chối, rồi tự tay mở khoá</a>'],

    ['D1',
     'Cái tên và cái file lại nhập làm một trong đầu bạn. Quyền nằm trong <b>inode</b>, nên ' +
     'hai liên kết cứng luôn có cùng chín bit.',
     '<a href="#/bai-06#lien-ket-cung-va-lien-ket-mem">Đọc lại Bài 6 — Liên kết cứng và liên kết mềm</a>'],

    ['D2',
     'Bạn quên rằng shell tách dòng theo khoảng trắng <b>trước khi</b> lệnh nhìn thấy đối số. ' +
     'Một dấu cách đặt sai chỗ biến chế độ thành tên file.',
     '<a href="#/bai-04#cau-truc-cua-mot-cau-lenh">Đọc lại Bài 4 — Cấu trúc của một câu lệnh</a>'],

    ['D3',
     'Node trong <code>/dev</code> vẫn bị đọc như file thường. Nó không chứa byte dữ liệu ' +
     'nào; chỗ in kích thước là cặp <b>major, minor</b> trỏ tới một driver trong kernel.',
     '<a href="#/bai-05#moi-thu-la-file-cau-nay-nghia-la-gi">Đọc lại Bài 5 — Mọi thứ là file — câu này nghĩa là gì</a>']
  ]

});

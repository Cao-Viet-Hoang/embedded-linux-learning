/* ═══════════════════════════════════════════════════════════════
   BÀI 7 — Soạn thảo trong terminal: nano và vim
   Chặng 01 · Linux căn bản
   ═══════════════════════════════════════════════════════════════ */

Lesson.register({
  id: 'bai-07',
  title: 'Soạn thảo trong terminal: nano và vim',
  minutes: 45,
  practice: 'Thực hành 30 phút',
  level: 'Người mới bắt đầu',

  intro:
    'Đến giờ bạn tạo file bằng <code>touch</code> và ghi nội dung bằng <code>echo &gt;</code>. ' +
    'Cách đó đủ cho một dòng, nhưng không sửa nổi một file cấu hình bốn mươi dòng. ' +
    'Bài này dạy hai trình soạn thảo chạy hoàn toàn trong terminal. ' +
    '<b>nano</b> bạn dùng được sau ba phút. <b>vim</b> mất công hơn — nhưng đây là điều bạn cần ' +
    'hiểu ngay: khi bạn cắm cáp UART vào một board nhúng hoặc đăng nhập SSH vào thiết bị ở xa, ' +
    'thứ duy nhất có sẵn để sửa file thường là <code>vi</code>. Không chuột, không menu, không ' +
    'mạng để cài thêm gì. Không biết thoát khỏi vim đồng nghĩa với việc kẹt cứng ở đó.',

  goals: [
    'Mở, sửa, lưu và thoát bằng <code>nano</code> chỉ với các phím ghi sẵn dưới màn hình',
    'Thoát khỏi <code>vim</code> trong mọi tình huống, kể cả khi không biết mình đang ở chế độ nào',
    'Giải thích được vì sao vim có chế độ và vì sao thiết kế đó lại nhanh hơn khi quen',
    'Dùng thành thạo mười lăm lệnh vim đủ để sửa file cấu hình trên thiết bị thật',
    'Nhận ra và xử lý file <code>.swp</code> khi phiên làm việc trước bị ngắt đột ngột',
    'Viết một <code>~/.vimrc</code> tối thiểu và kiểm chứng nó có tác dụng'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. VÌ SAO
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Vì sao phải soạn thảo trong terminal' },

    { t: 'p', x:
      'Câu hỏi hợp lý: máy bạn có VS Code, vì sao lại gõ phím trong một khung đen? ' +
      'Câu trả lời không phải "cho ngầu" — nó nằm ở chỗ bạn sẽ làm việc.' },

    { t: 'table',
      head: ['Tình huống', 'Có VS Code không', 'Có gì'],
      rows: [
        ['Sửa file trên máy bạn qua WSL', 'Có — cứ dùng thoải mái', 'Mọi thứ'],
        ['SSH vào một board đang chạy', '<b>Không</b> — chỉ có dòng lệnh', '<code>vi</code>, đôi khi cả <code>nano</code>'],
        ['Nối cáp UART vào board lúc khởi động', '<b>Không</b> — chưa có mạng', '<code>vi</code> của BusyBox'],
        ['Sửa cấu hình trong rootfs đang dựng dở', '<b>Không</b> — đang ở trong chroot', 'Bất cứ thứ gì bạn đã chép vào'],
        ['Máy chủ build của công ty', 'Thường không', '<code>vim</code>']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao vi có mặt ở khắp nơi', x:
      '<p><code>vi</code> ra đời năm 1976, và từ đó nó nằm trong <b>chuẩn POSIX</b>. Nghĩa là: hệ ' +
      'nào tự nhận là Unix thì bắt buộc phải có nó.</p>' +
      '<p>Với thiết bị nhúng còn một lý do thực tế hơn: BusyBox tích hợp sẵn một bản <code>vi</code> ' +
      'rút gọn, tốn thêm vài chục KB. <code>nano</code> thì phải cài riêng và tốn nhiều hơn. Khi ' +
      'flash chỉ có 8 hoặc 16 MB, người dựng hệ thống hầu như luôn chọn <code>vi</code>.</p>' +
      '<p>Bạn có thể cả đời thích <code>nano</code> hơn. Nhưng bạn <b>vẫn cần</b> biết đủ ' +
      '<code>vi</code> để sửa một dòng và thoát ra — vì sẽ có ngày không còn lựa chọn nào khác.</p>' },

    { t: 'p', x: 'Trên máy bạn, cả hai đều đã có sẵn. Kích thước của chúng nói lên nhiều điều:' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      '-rwxr-xr-x 1 root root 283K Jun 4 05:46 /usr/bin/nano\n' +
      '-rwxr-xr-x 1 root root 4.4M Jul 14 00:06 /usr/bin/vim.basic\n' +
      '-rwxr-xr-x 1 root root 1.9M Jul 14 00:06 /usr/bin/vim.tiny' },

    { t: 'cal', kind: 'info', title: 'Ba file, ba mức đầy đủ', x:
      '<p><code>vim.tiny</code> là bản rút gọn, <code>vim.basic</code> là bản thường dùng. Trên máy ' +
      'bạn, <code>/usr/bin/vi</code> là liên kết mềm dẫn qua hệ thống <i>alternatives</i> tới ' +
      '<code>vim.basic</code> — nghĩa là gõ <code>vi</code> hay <code>vim</code> đều ra cùng một ' +
      'chương trình.</p>' +
      '<p>Đây lại là liên kết mềm, đúng cơ chế bạn đã mổ xẻ ở Bài 6. Còn bản <code>vi</code> trong ' +
      'BusyBox mà bạn sẽ gặp ở Chặng 09 nhỏ hơn nhiều và thiếu khá nhiều tính năng — nhưng những ' +
      'lệnh trong bài này thì nó có đủ.</p>' },

    /* ══════════════════════════════════════════════
       2. NANO
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'nano: học trong ba phút' },

    { t: 'p', x:
      '<code>nano filename</code> là xong. Con trỏ ở ngay đầu file, gõ chữ là chữ hiện ra, ' +
      'phím mũi tên di chuyển, <kbd>Backspace</kbd> xoá. Không có chế độ nào cả. ' +
      'Hai dòng dưới cùng màn hình <b>luôn hiện danh sách phím</b> — bạn không cần nhớ gì.' },

    { t: 'fig',
      cap: 'Bố cục màn hình nano. Hai dòng cuối là danh sách phím tắt, luôn hiển thị — đó là lý do nano dễ với người mới.',
      svg:
        '<svg viewBox="0 0 720 230" width="720" role="img" aria-label="Sơ đồ bố cục màn hình của trình soạn thảo nano gồm thanh tiêu đề, vùng soạn thảo và hai dòng phím tắt">' +
        '<rect class="d-box-p" x="20" y="16" width="600" height="26" rx="4"/>' +
        '<text class="d-tm" x="32" y="34">GNU nano 8.7.1        config.conf                 Modified</text>' +
        '<text class="d-ts" x="628" y="34">tiêu đề</text>' +

        '<rect class="d-box" x="20" y="48" width="600" height="96" rx="4"/>' +
        '<text class="d-tm" x="32" y="70">CONFIG_UART=y</text>' +
        '<text class="d-tm" x="32" y="90">CONFIG_I2C=y</text>' +
        '<text class="d-tm" x="32" y="110">CONFIG_DEBUG=y_</text>' +
        '<text class="d-ts" x="628" y="98">vùng soạn thảo</text>' +

        '<rect class="d-box-a" x="20" y="150" width="600" height="24" rx="4"/>' +
        '<text class="d-tm" x="32" y="166">^G Help   ^O Write Out   ^W Where Is   ^K Cut</text>' +
        '<rect class="d-box-a" x="20" y="178" width="600" height="24" rx="4"/>' +
        '<text class="d-tm" x="32" y="194">^X Exit   ^R Read File   ^\\ Replace     ^U Paste</text>' +
        '<text class="d-ts" x="628" y="182">phím tắt</text>' +

        '<text class="d-ts" x="20" y="220">Dấu ^ nghĩa là phím Ctrl. ^X = Ctrl + X. Chữ M- nghĩa là phím Alt.</text>' +
        '</svg>' },

    { t: 'table',
      head: ['Phím', 'Việc', 'Ghi chú'],
      rows: [
        ['<kbd>Ctrl</kbd>+<kbd>O</kbd>', 'Lưu — nano gọi là <i>Write Out</i>',
         'Nó hỏi lại tên file; nhấn <kbd>Enter</kbd> để giữ tên cũ'],
        ['<kbd>Ctrl</kbd>+<kbd>X</kbd>', 'Thoát',
         'Nếu có thay đổi chưa lưu, nó hỏi <code>Y</code>/<code>N</code>/<kbd>Ctrl</kbd>+<kbd>C</kbd>'],
        ['<kbd>Ctrl</kbd>+<kbd>W</kbd>', 'Tìm — <i>Where Is</i>',
         '<kbd>Alt</kbd>+<kbd>W</kbd> để tới kết quả tiếp theo'],
        ['<kbd>Ctrl</kbd>+<kbd>K</kbd>', 'Cắt cả dòng', 'Nhấn nhiều lần để cắt nhiều dòng liền nhau'],
        ['<kbd>Ctrl</kbd>+<kbd>U</kbd>', 'Dán', 'Dán lại toàn bộ khối vừa cắt'],
        ['<kbd>Ctrl</kbd>+<kbd>\\</kbd>', 'Tìm và thay thế', 'Hỏi chuỗi cần tìm, rồi chuỗi thay thế'],
        ['<kbd>Alt</kbd>+<kbd>U</kbd>', 'Hoàn tác', 'Nhấn lại để lùi thêm'],
        ['<kbd>Ctrl</kbd>+<kbd>C</kbd>', 'Cho biết đang ở dòng, cột nào',
         '<b>Không phải</b> huỷ như trong shell — trong nano nó là "báo vị trí"']
      ]},

    { t: 'cal', kind: 'tip', title: 'Tuỳ chọn dòng lệnh đáng nhớ của nano', x:
      '<p><code>nano -l file</code> hiện số dòng bên trái — cực kỳ tiện khi trình biên dịch báo ' +
      '"lỗi ở dòng 143".</p>' +
      '<p><code>nano +143 file</code> mở file và nhảy thẳng tới dòng 143.</p>' +
      '<p><code>nano -ET4 file</code> biến phím Tab thành 4 dấu cách. Bắt buộc khi sửa file YAML ' +
      'hoặc Python; <b>tuyệt đối không dùng</b> khi sửa <code>Makefile</code>, vì Makefile yêu cầu ' +
      'ký tự Tab thật.</p>' },

    { t: 'cal', kind: 'warn', title: 'Ctrl+S làm treo terminal — và đó không phải lỗi của nano', x:
      '<p>Phản xạ "Ctrl+S để lưu" từ Windows sẽ khiến màn hình đứng im, gõ gì cũng không hiện. ' +
      'Nhiều người tưởng máy treo và tắt cửa sổ.</p>' +
      '<p>Thủ phạm là <b>terminal</b>, không phải trình soạn thảo. Đây là cấu hình thật trên máy bạn:</p>' },

    { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
      'intr = ^C\n' +
      'quit = ^\\\n' +
      'start = ^Q\n' +
      'stop = ^S\n' +
      'susp = ^Z' },

    { t: 'cal', kind: 'info', x:
      '<p><code>stop = ^S</code> nghĩa là <kbd>Ctrl</kbd>+<kbd>S</kbd> gửi tín hiệu <b>ngừng ' +
      'hiển thị</b>, và <code>start = ^Q</code> nghĩa là <kbd>Ctrl</kbd>+<kbd>Q</kbd> cho chạy ' +
      'tiếp. Cơ chế này tên là <i>flow control</i>, có từ thời máy in cơ khí cần bảo máy tính ' +
      '"chờ tôi in xong đã".</p>' +
      '<p><b>Bị treo thì nhấn <kbd>Ctrl</kbd>+<kbd>Q</kbd>.</b> Mọi ký tự bạn gõ trong lúc đó vẫn ' +
      'được nhớ và sẽ hiện ra ngay.</p>' +
      '<p>Điều này không chỉ đúng trong nano — nó đúng với mọi thứ chạy trong terminal, kể cả ' +
      'console nối tiếp của board nhúng ở Chặng 05.</p>' },

    /* ══════════════════════════════════════════════
       3. VIM: CHẾ ĐỘ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'vim: trước hết là hiểu chế độ' },

    { t: 'p', x:
      'Mọi bực bội với vim đều bắt nguồn từ một hiểu lầm: tưởng nó giống Notepad. Nó không giống. ' +
      'vim có <b>chế độ</b>, và cùng một phím làm việc khác nhau tuỳ chế độ. ' +
      'Người mới mở vim, gõ chữ, thấy con trỏ nhảy lung tung và file bị xoá — đó là vì họ đang ở ' +
      'chế độ mà mỗi chữ cái là một <b>mệnh lệnh</b>, không phải văn bản.' },

    { t: 'fig',
      cap: 'Bốn chế độ của vim. Esc luôn đưa bạn về Normal — đó là phím quan trọng nhất khi bạn lạc.',
      svg:
        '<svg viewBox="0 0 720 320" width="720" role="img" aria-label="Sơ đồ bốn chế độ của vim gồm Normal, Insert, Visual và Command-line, với phím chuyển đổi giữa chúng">' +
        '<rect class="d-box-p" x="250" y="20" width="220" height="62" rx="6"/>' +
        '<text class="d-t" x="360" y="44" text-anchor="middle">NORMAL — chế độ gốc</text>' +
        '<text class="d-ts" x="360" y="64" text-anchor="middle">mỗi phím là một mệnh lệnh</text>' +

        '<rect class="d-box-g" x="30" y="150" width="190" height="62" rx="6"/>' +
        '<text class="d-t" x="125" y="174" text-anchor="middle">INSERT</text>' +
        '<text class="d-ts" x="125" y="194" text-anchor="middle">gõ chữ ra chữ</text>' +

        '<rect class="d-box-a" x="265" y="150" width="190" height="62" rx="6"/>' +
        '<text class="d-t" x="360" y="174" text-anchor="middle">VISUAL</text>' +
        '<text class="d-ts" x="360" y="194" text-anchor="middle">bôi đen để chọn</text>' +

        '<rect class="d-box-w" x="500" y="150" width="190" height="62" rx="6"/>' +
        '<text class="d-t" x="595" y="174" text-anchor="middle">COMMAND-LINE</text>' +
        '<text class="d-ts" x="595" y="194" text-anchor="middle">gõ lệnh sau dấu :</text>' +

        '<line class="d-line" x1="290" y1="82" x2="150" y2="148"/>' +
        '<path class="d-arrow" d="M150 148 l1 -9 l7 4 z"/>' +
        '<text class="d-tm" x="176" y="112">i a o</text>' +
        '<line class="d-line" x1="100" y1="148" x2="270" y2="84"/>' +
        '<path class="d-arrow" d="M270 84 l-8 1 l2 8 z"/>' +
        '<text class="d-tm" x="80" y="126">Esc</text>' +

        '<line class="d-line" x1="360" y1="82" x2="360" y2="148"/>' +
        '<path class="d-arrow" d="M360 148 l-4 -8 h8 z"/>' +
        '<text class="d-tm" x="368" y="120">v V</text>' +

        '<line class="d-line" x1="432" y1="82" x2="570" y2="148"/>' +
        '<path class="d-arrow" d="M570 148 l-1 -9 l-7 4 z"/>' +
        '<text class="d-tm" x="500" y="112">: / ?</text>' +
        '<line class="d-line" x1="620" y1="148" x2="450" y2="84"/>' +
        '<path class="d-arrow" d="M450 84 l8 1 l-2 8 z"/>' +
        '<text class="d-tm" x="630" y="126">Enter</text>' +

        '<rect class="d-box-w" x="30" y="240" width="660" height="62" rx="6"/>' +
        '<text class="d-t" x="50" y="264">Lạc đường thì nhấn Esc hai lần. Bạn về Normal, luôn luôn.</text>' +
        '<text class="d-ts" x="50" y="286">Nhấn Esc khi đã ở Normal thì không có gì xảy ra — nên cứ nhấn thoải mái, không hại gì.</text>' +
        '</svg>' },

    { t: 'cal', kind: 'why', title: 'Vì sao thiết kế lạ đời này lại tồn tại được 50 năm', x:
      '<p>Trong Notepad, để xoá ba dòng bạn phải giữ Shift, nhấn mũi tên xuống ba lần, rồi Delete. ' +
      'Trong vim: <code>3dd</code>. Ba phím.</p>' +
      '<p>Bí mật nằm ở chỗ chế độ Normal biến bàn phím thành một <b>ngôn ngữ</b>: ' +
      '<i>số lần</i> + <i>hành động</i> + <i>phạm vi</i>. Học <code>d</code> là xoá và ' +
      '<code>w</code> là một từ, bạn tự suy ra được <code>d3w</code> xoá ba từ mà không cần ai dạy. ' +
      'Số lượng tổ hợp lớn hơn nhiều số phím bạn phải nhớ.</p>' +
      '<p>Cái giá là vài ngày lúng túng. Đổi lại, kỹ năng này chạy được trên <b>mọi</b> hệ Unix, ' +
      'qua SSH, qua cáp nối tiếp, trong chroot, trên board 8 MB flash — chỗ nào cũng dùng được.</p>' },

    /* ══════════════════════════════════════════════
       4. VIM: THOÁT
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thoát khỏi vim — học điều này trước mọi thứ khác' },

    { t: 'p', x:
      'Đây là câu hỏi được tìm kiếm nhiều nhất về vim, và có lý do chính đáng: nếu không thoát ' +
      'được, bạn không dám mở nó lần nào nữa. Quy trình an toàn gồm ba bước, làm theo đúng thứ tự.' },

    { t: 'list', ordered: true, items: [
      'Nhấn <kbd>Esc</kbd> <b>hai lần</b>. Bây giờ chắc chắn bạn đang ở chế độ Normal.',
      'Gõ dấu hai chấm <code>:</code> — con trỏ nhảy xuống dòng cuối màn hình.',
      'Gõ một trong bốn lệnh dưới đây rồi nhấn <kbd>Enter</kbd>.'
    ]},

    { t: 'table',
      head: ['Lệnh', 'Nghĩa', 'Dùng khi'],
      rows: [
        ['<code>:q</code>', 'Thoát', 'Chưa sửa gì cả'],
        ['<code>:wq</code>', 'Lưu rồi thoát', 'Đã sửa và muốn giữ'],
        ['<code>:x</code>', 'Giống <code>:wq</code> nhưng chỉ ghi đĩa khi thật sự có thay đổi',
         'Khi không muốn làm đổi thời gian sửa file vô ích'],
        ['<code>:q!</code>', 'Thoát, <b>vứt bỏ</b> mọi thay đổi',
         '<b>Phao cứu sinh.</b> Khi bạn đã lỡ tay làm loạn file và muốn quay về nguyên trạng']
      ]},

    { t: 'cal', kind: 'tip', title: 'Hai điều cần thuộc lòng ngay bây giờ', x:
      '<p><b>Dấu <code>!</code> nghĩa là "cứ làm, đừng hỏi".</b> Nó xuất hiện khắp nơi trong vim ' +
      'với đúng nghĩa đó.</p>' +
      '<p><b><code>:q!</code> không bao giờ làm hỏng file trên đĩa.</b> Nó chỉ bỏ những gì bạn vừa ' +
      'gõ trong bộ nhớ. Khi hoảng, cứ <kbd>Esc</kbd><kbd>Esc</kbd> rồi <code>:q!</code> — an toàn ' +
      'tuyệt đối.</p>' },

    { t: 'cal', kind: 'warn', title: 'E37: No write since last change', x:
      '<p>Bạn gõ <code>:q</code> nhưng vim từ chối và báo lỗi này. Nghĩa là file đã bị sửa và vim ' +
      'không muốn bạn mất công vô ích.</p>' +
      '<p>Quyết định: giữ thay đổi thì <code>:wq</code>, bỏ thì <code>:q!</code>. Không có lựa ' +
      'chọn thứ ba.</p>' },

    /* ══════════════════════════════════════════════
       5. VIM: 15 LỆNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Mười lăm lệnh vim đủ dùng ngoài thực địa' },

    { t: 'p', x:
      'vim có hàng nghìn lệnh. Bạn không cần chúng. Danh sách dưới đây đủ để sửa bất kỳ file cấu ' +
      'hình nào trên một thiết bị nhúng. <b>Tất cả đều gõ ở chế độ Normal.</b>' },

    { t: 'h3', x: 'Vào chế độ Insert — bốn cách, khác nhau ở chỗ con trỏ dừng' },

    { t: 'table',
      head: ['Phím', 'Nghĩa', 'Vị trí con trỏ sau khi nhấn'],
      rows: [
        ['<code>i</code>', '<i>insert</i>', '<b>Trước</b> ký tự đang đứng'],
        ['<code>a</code>', '<i>append</i>', '<b>Sau</b> ký tự đang đứng'],
        ['<code>A</code>', '<i>Append</i> cuối dòng', '<b>Cuối dòng</b> — dùng nhiều nhất khi thêm tham số vào một dòng cấu hình'],
        ['<code>o</code>', '<i>open</i> dòng mới', 'Đầu một dòng trống <b>ngay dưới</b> dòng hiện tại']
      ]},

    { t: 'h3', x: 'Di chuyển' },

    { t: 'table',
      head: ['Phím', 'Đi tới', 'Vì sao đáng học'],
      rows: [
        ['<code>h j k l</code>', 'trái · xuống · lên · phải',
         'Ngón tay không rời hàng phím giữa. Phím mũi tên vẫn dùng được, nhưng chậm hơn'],
        ['<code>w</code> / <code>b</code>', 'đầu từ sau · đầu từ trước', 'Nhảy theo từ, không theo ký tự'],
        ['<code>0</code> / <code>$</code>', 'đầu dòng · cuối dòng', 'Hai phím dùng nhiều nhất'],
        ['<code>gg</code> / <code>G</code>', 'đầu file · cuối file', 'File dài mấy cũng một phím'],
        ['<code>42G</code>', 'dòng 42', 'Trình biên dịch báo lỗi dòng nào thì nhảy thẳng tới đó'],
        ['<code>/chuỗi</code>', 'tìm xuôi', '<code>n</code> tới kết quả sau, <code>N</code> lùi lại']
      ]},

    { t: 'h3', x: 'Sửa và xoá' },

    { t: 'table',
      head: ['Phím', 'Việc', 'Ghi chú'],
      rows: [
        ['<code>x</code>', 'Xoá một ký tự', 'Như phím Delete'],
        ['<code>dd</code>', 'Xoá cả dòng', '<code>3dd</code> xoá ba dòng'],
        ['<code>yy</code>', 'Chép cả dòng', '<i>yank</i>. <code>3yy</code> chép ba dòng'],
        ['<code>p</code>', 'Dán xuống dưới', '<code>P</code> viết hoa thì dán lên trên'],
        ['<code>u</code>', 'Hoàn tác', 'Nhấn nhiều lần để lùi nhiều bước'],
        ['<kbd>Ctrl</kbd>+<kbd>r</kbd>', 'Làm lại', 'Ngược với <code>u</code>'],
        ['<code>.</code>', '<b>Lặp lại thao tác vừa rồi</b>',
         'Lệnh bị đánh giá thấp nhất trong vim. <code>dd</code> rồi <code>...</code> là xoá bốn dòng']
      ]},

    { t: 'cal', kind: 'tip', title: 'Ngữ pháp: số + hành động + phạm vi', x:
      '<p>vim ghép các mảnh lại theo quy tắc, nên bạn không phải nhớ từng tổ hợp:</p>' +
      '<p><code>d</code> (xoá) + <code>w</code> (một từ) = <code>dw</code> xoá một từ.<br>' +
      '<code>3</code> + <code>d</code> + <code>w</code> = <code>3dw</code> xoá ba từ.<br>' +
      '<code>d</code> + <code>$</code> = <code>d$</code> xoá từ đây tới cuối dòng.<br>' +
      '<code>y</code> + <code>G</code> = <code>yG</code> chép từ đây tới cuối file.</p>' +
      '<p>Học 6 hành động và 8 phạm vi là bạn có 48 lệnh mà chỉ nhớ 14 phím. Đó là toàn bộ ' +
      'sức mạnh của vim, gói gọn trong một câu.</p>' },

    { t: 'h3', x: 'Lệnh sau dấu hai chấm' },

    { t: 'table',
      head: ['Lệnh', 'Việc', 'Đây là thứ bạn sẽ dùng nhiều nhất khi làm việc thật'],
      rows: [
        ['<code>:w</code>', 'Lưu mà không thoát', 'Gõ thường xuyên, như Ctrl+S ở nơi khác'],
        ['<code>:set nu</code>', 'Bật số dòng', '<code>:set nonu</code> để tắt'],
        ['<code>:42</code>', 'Nhảy tới dòng 42', 'Nhanh hơn <code>42G</code> một chút khi đã gõ dấu hai chấm'],
        ['<code>:%s/cũ/mới/g</code>', 'Thay mọi lần xuất hiện trong cả file',
         '<code>%</code> = cả file · <code>s</code> = <i>substitute</i> · <code>g</code> = mọi lần trên mỗi dòng'],
        ['<code>:%s/cũ/mới/gc</code>', 'Như trên nhưng <b>hỏi từng chỗ</b>', 'Thêm <code>c</code> = <i>confirm</i>'],
        ['<code>:g/mẫu/d</code>', 'Xoá mọi dòng khớp mẫu',
         'Lệnh dọn file log hoặc file cấu hình cực nhanh'],
        ['<code>:e!</code>', 'Nạp lại file từ đĩa, vứt mọi thay đổi', 'Hoàn tác toàn bộ mà không cần thoát']
      ]},

    { t: 'cal', kind: 'info', title: 'Vì sao ba lệnh cuối bảng lại quan trọng với dân nhúng', x:
      '<p>File <code>.config</code> của kernel Linux có hơn <b>mười nghìn dòng</b> dạng ' +
      '<code>CONFIG_XXX=y</code>. Sửa tay từng dòng là bất khả thi.</p>' +
      '<p><code>:%s/=y/=m/g</code> đổi mọi tính năng từ "biên dịch thẳng vào kernel" sang "biên ' +
      'dịch thành module" trong một lệnh. <code>:g/^# /d</code> xoá sạch dòng chú thích để nhìn ' +
      'cho rõ.</p>' +
      '<p>Phần thực hành sẽ cho bạn chạy đúng những lệnh này và xem kết quả thật.</p>' },

    /* ══════════════════════════════════════════════
       6. FILE SWAP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'File .swp và màn hình E325 đáng sợ' },

    { t: 'p', x:
      'Ngay khi mở một file, vim tạo một file ẩn bên cạnh: <code>.filename.swp</code>. ' +
      'Nó ghi liên tục mọi thay đổi vào đó. Nếu phiên làm việc kết thúc bình thường, vim xoá file ' +
      'này. Nếu mất điện, rớt SSH hoặc board treo, file <code>.swp</code> <b>ở lại</b>.' },

    { t: 'terms', items: [
      ['File swap', '.swp', 'Bản nháp vim ghi song song với file thật. Nằm cùng thư mục, tên bắt ' +
       'đầu bằng dấu chấm nên <code>ls</code> thường không thấy — phải <code>ls -a</code>.'],
      ['E325', '', 'Mã lỗi vim hiện khi mở một file đã có <code>.swp</code>. Kèm theo là một màn ' +
       'hình dài liệt kê tiến trình nào đang giữ file và gợi ý hai khả năng.'],
      ['Recover', '', 'Nạp nội dung từ file swap thay vì từ đĩa, để lấy lại phần chưa kịp lưu. ' +
       'Chọn bằng phím <code>R</code>, hoặc <code>vim -r filename</code>.'],
      ['Delete it', '', 'Xoá file swap và mở file bình thường. Chọn khi bạn chắc chắn không có gì ' +
       'đáng cứu — phím <code>D</code>.']
    ]},

    { t: 'cal', kind: 'why', title: 'Vì sao bạn sẽ gặp lỗi này thường xuyên khi làm nhúng', x:
      '<p>Vì kết nối tới thiết bị nhúng hay đứt: rớt SSH, tuột cáp USB-UART, board tự khởi động ' +
      'lại vì watchdog, hoặc bạn tắt QEMU bằng <kbd>Ctrl</kbd>+<kbd>C</kbd>.</p>' +
      '<p>Mỗi lần như vậy, <code>.swp</code> nằm lại trên rootfs. Lần sau mở file, màn hình E325 ' +
      'hiện ra và người không biết sẽ hoảng. Bạn thì sẽ biết chính xác phải làm gì.</p>' },

    { t: 'list', ordered: true, items: [
      'Nhấn <kbd>Enter</kbd> để bỏ qua màn hình cảnh báo, hoặc <code>q</code> để thoát hẳn.',
      'Nếu tin rằng có phần chưa lưu đáng cứu: mở lại bằng <code>vim -r filename</code>, ' +
      'kiểm tra nội dung, rồi <code>:w</code> để ghi đè lên file thật.',
      'Nếu không cần: xoá file swap bằng <code>rm .filename.swp</code> rồi mở lại như bình thường.',
      'Muốn biết máy còn sót file swap nào: chạy <code>vim -r</code> không kèm tên file.'
    ]},

    /* ══════════════════════════════════════════════
       7. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: sửa một file cấu hình kernel bằng cả hai trình soạn thảo' },

    { t: 'p', x:
      'Bài này khác các bài trước ở một điểm: <b>hai bước giữa phải tự gõ tay</b>, vì trình soạn ' +
      'thảo vẽ cả màn hình chứ không in ra dòng, nên không thể chép kết quả vào đây. ' +
      'Bù lại, mỗi bước đều kết thúc bằng một lệnh <code>cat</code> để bạn tự kiểm chứng mình đã ' +
      'làm đúng chưa.' },

    { t: 'steps', items: [

      { title: 'Xác định bạn đang có những trình soạn thảo nào',
        blocks: [
          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/embedded/bai07 && cd ~/embedded/bai07\n' +
            'nano --version | head -1\n' +
            'vim --version | head -1\n' +
            'ls -l /usr/bin/vi\n' +
            'readlink -f /usr/bin/vi' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            ' GNU nano, version 8.7.1\n' +
            'VIM - Vi IMproved 9.1 (2024 Jan 02, compiled Jul 13 2026 17:06:53)\n' +
            'lrwxrwxrwx 1 root root 20 Apr 14 20:13 /usr/bin/vi -> /etc/alternatives/vi\n' +
            '/usr/bin/vim.basic' },

          { t: 'cal', kind: 'info', title: 'Hệ thống alternatives — hai lớp liên kết mềm', x:
            '<p><code>/usr/bin/vi</code> không trỏ thẳng vào chương trình mà trỏ vào ' +
            '<code>/etc/alternatives/vi</code>, và <b>file đó</b> mới trỏ tới ' +
            '<code>/usr/bin/vim.basic</code>. <code>readlink -f</code> đi hết chuỗi liên kết và ' +
            'cho bạn đích cuối cùng.</p>' +
            '<p>Debian và Ubuntu dùng cách này để nhiều chương trình cùng nhận một cái tên chung, ' +
            'và người quản trị chọn bản nào thắng. Chính cơ chế đó cũng quyết định ' +
            '<code>/usr/bin/editor</code> trỏ vào đâu — trên máy bạn là <code>/usr/bin/nano</code>.</p>' },

          { t: 'code', where: 'wsl', code: 'readlink -f /usr/bin/editor' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '/usr/bin/nano' },

          { t: 'cal', kind: 'tip', x:
            '<p><code>/usr/bin/editor</code> là trình soạn thảo mặc định mà các chương trình khác ' +
            'gọi khi cần bạn nhập văn bản. Muốn ép chúng dùng vim, đặt biến ' +
            '<code>export EDITOR=vim</code> — Bài 13 sẽ nói về biến môi trường và nơi khai báo ' +
            'chúng cho lâu dài.</p>' }
        ]},

      { title: 'Tạo file cấu hình để làm việc',
        blocks: [
          { t: 'code', where: 'wsl', code:
            'printf \'CONFIG_UART=y\\nCONFIG_SPI=n\\nCONFIG_I2C=y\\nCONFIG_DEBUG=y\\n\' > kernel.conf\n' +
            'cat kernel.conf' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'CONFIG_UART=y\n' +
            'CONFIG_SPI=n\n' +
            'CONFIG_I2C=y\n' +
            'CONFIG_DEBUG=y' },

          { t: 'cal', kind: 'info', x:
            '<p>Bốn dòng này mô phỏng đúng định dạng file <code>.config</code> của kernel Linux mà ' +
            'bạn sẽ gặp ở Chặng 07. <code>=y</code> nghĩa là biên dịch thẳng vào kernel, ' +
            '<code>=n</code> là bỏ, và <code>=m</code> là biên dịch thành module nạp sau.</p>' +
            '<p>File thật có hơn mười nghìn dòng như thế.</p>' }
        ]},

      { title: 'Sửa bằng nano — tự gõ tay',
        blocks: [
          { t: 'p', x:
            'Mở file với số dòng hiển thị bên trái. Đây là bước bạn <b>phải tự làm</b>, không chép ' +
            'kết quả được:' },
          { t: 'code', where: 'wsl', code: 'nano -l kernel.conf' },

          { t: 'p', x: 'Trong nano, làm đủ năm việc sau:' },
          { t: 'list', ordered: true, items: [
            'Dùng phím mũi tên xuống dòng <code>CONFIG_SPI=n</code>, đưa con trỏ tới cuối dòng, ' +
            'xoá chữ <code>n</code> và gõ <code>y</code>.',
            'Nhấn <kbd>Ctrl</kbd>+<kbd>W</kbd>, gõ <code>DEBUG</code>, nhấn <kbd>Enter</kbd> — ' +
            'con trỏ nhảy tới dòng đó.',
            'Nhấn <kbd>Ctrl</kbd>+<kbd>K</kbd> để cắt cả dòng <code>CONFIG_DEBUG=y</code>.',
            'Đưa con trỏ về đầu file, gõ thêm một dòng <code># board config</code> rồi ' +
            '<kbd>Enter</kbd>.',
            'Nhấn <kbd>Ctrl</kbd>+<kbd>O</kbd> rồi <kbd>Enter</kbd> để lưu, sau đó ' +
            '<kbd>Ctrl</kbd>+<kbd>X</kbd> để thoát.'
          ]},

          { t: 'p', x: 'Kiểm chứng bằng shell:' },
          { t: 'code', where: 'wsl', code: 'cat kernel.conf' },

          { t: 'cal', kind: 'tip', title: 'Bạn phải thấy đúng bốn dòng', x:
            '<p>Một dòng chú thích ở đầu, <code>CONFIG_UART=y</code>, <code>CONFIG_SPI=y</code>, ' +
            '<code>CONFIG_I2C=y</code>, và <b>không còn</b> dòng <code>CONFIG_DEBUG</code>.</p>' +
            '<p>Sai chỗ nào thì cứ mở lại và sửa — mục đích của bước này là làm quen tay, không ' +
            'phải làm đúng ngay lần đầu.</p>' },

          { t: 'cal', kind: 'warn', x:
            '<p>Nếu lỡ nhấn <kbd>Ctrl</kbd>+<kbd>S</kbd> theo phản xạ và màn hình đứng im: ' +
            'nhấn <kbd>Ctrl</kbd>+<kbd>Q</kbd>. Đừng tắt cửa sổ — bạn sẽ mất phần chưa lưu.</p>' }
        ]},

      { title: 'Sửa cùng file bằng vim — tự gõ tay',
        blocks: [
          { t: 'p', x: 'Dựng lại file về trạng thái ban đầu rồi mở bằng vim:' },
          { t: 'code', where: 'wsl', code:
            'printf \'CONFIG_UART=y\\nCONFIG_SPI=n\\nCONFIG_I2C=y\\nCONFIG_DEBUG=y\\n\' > kernel.conf\n' +
            'vim kernel.conf' },

          { t: 'p', x:
            'Trước khi làm gì khác, hãy <b>tập thoát</b>. Nhấn <kbd>Esc</kbd> hai lần, gõ ' +
            '<code>:q</code> rồi <kbd>Enter</kbd>. Bạn ra khỏi vim. Mở lại và tiếp tục:' },

          { t: 'list', ordered: true, items: [
            'Nhấn <code>:set nu</code> rồi <kbd>Enter</kbd> — số dòng hiện ra.',
            'Gõ <code>2G</code> để nhảy tới dòng 2, rồi <code>$</code> để tới cuối dòng.',
            'Nhấn <code>x</code> để xoá chữ <code>n</code>, rồi <code>a</code> để vào chế độ ' +
            'Insert và gõ <code>y</code>. Nhấn <kbd>Esc</kbd>.',
            'Gõ <code>/DEBUG</code> rồi <kbd>Enter</kbd> để tìm, sau đó <code>dd</code> để xoá ' +
            'cả dòng.',
            'Gõ <code>gg</code> về đầu file, nhấn <code>O</code> (chữ O viết hoa) để mở một dòng ' +
            'mới <b>phía trên</b>, gõ <code># board config</code>, nhấn <kbd>Esc</kbd>.',
            'Gõ <code>u</code> vài lần và xem vim lùi lại từng bước — rồi ' +
            '<kbd>Ctrl</kbd>+<kbd>r</kbd> để làm lại.',
            'Gõ <code>:wq</code> rồi <kbd>Enter</kbd>.'
          ]},

          { t: 'code', where: 'wsl', code: 'cat kernel.conf' },

          { t: 'cal', kind: 'info', title: 'So sánh số phím phải nhấn', x:
            '<p>Xoá một dòng trong nano: đưa con trỏ tới dòng đó rồi <kbd>Ctrl</kbd>+<kbd>K</kbd>.<br>' +
            'Xoá một dòng trong vim: <code>dd</code>.</p>' +
            '<p>Chênh lệch nhỏ. Nhưng xoá <b>ba mươi dòng</b>: nano cần nhấn ' +
            '<kbd>Ctrl</kbd>+<kbd>K</kbd> ba mươi lần, vim cần gõ <code>30dd</code>. ' +
            'Đó là lúc khác biệt lộ ra, và đó cũng là lý do người sửa file cấu hình hằng ngày ' +
            'gần như luôn chọn vim.</p>' }
        ]},

      { title: 'Chạy lệnh vim mà không cần vào vim',
        blocks: [
          { t: 'p', x:
            'Các lệnh sau dấu hai chấm có thể chạy từ shell bằng <code>vim -Es</code>. Nhờ vậy ' +
            'bạn <b>thấy được kết quả thật</b> của chúng ngay trong bài học này, thay vì phải tin ' +
            'lời mô tả.' },

          { t: 'code', where: 'wsl', code:
            'printf \'CONFIG_UART=y\\nCONFIG_SPI=n\\nCONFIG_I2C=y\\nCONFIG_DEBUG=y\\n\' > kernel.conf\n' +
            'vim -Es -c \'g/=n/d\' -c \'wq\' kernel.conf\n' +
            'cat kernel.conf' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'CONFIG_UART=y\n' +
            'CONFIG_I2C=y\n' +
            'CONFIG_DEBUG=y' },

          { t: 'cmdx', cmd: 'vim -Es -c \'g/=n/d\' -c \'wq\' kernel.conf',
            title: 'Mổ xẻ câu lệnh',
            rows: [
              ['-E', 'Chạy ở chế độ Ex cải tiến — không vẽ màn hình, chỉ nhận lệnh.', ''],
              ['-s', '<i>silent</i> — im lặng, không hỏi han gì.',
               'Ghép <code>-Es</code> lại là cách chạy vim trong script.'],
              ['-c \'g/=n/d\'', 'Chạy lệnh <code>:g/=n/d</code>.',
               '<code>g</code> = <i>global</i>: với <b>mọi</b> dòng khớp mẫu <code>=n</code>, thực hiện lệnh <code>d</code> (xoá).'],
              ['-c \'wq\'', 'Chạy tiếp <code>:wq</code> — lưu rồi thoát.',
               'Nhiều <code>-c</code> chạy theo đúng thứ tự bạn viết.']
            ]},

          { t: 'p', x: 'Chèn một dòng vào đầu file, rồi đổi hàng loạt:' },
          { t: 'code', where: 'wsl', code:
            'vim -Es -c \'1i|# kernel config\' -c \'wq\' kernel.conf\n' +
            'vim -Es -c \'%s/=y/=m/g\' -c \'wq\' kernel.conf\n' +
            'cat kernel.conf' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '# kernel config\n' +
            'CONFIG_UART=m\n' +
            'CONFIG_I2C=m\n' +
            'CONFIG_DEBUG=m' },

          { t: 'cal', kind: 'why', title: 'Ba dòng vừa đổi — mười nghìn dòng cũng vậy', x:
            '<p><code>:%s/=y/=m/g</code> mất đúng một lệnh dù file có 4 dòng hay 14.000 dòng. ' +
            'Ở Chặng 07 bạn sẽ dùng chính lệnh này trên file <code>.config</code> thật.</p>' +
            '<p><code>%</code> nghĩa là "mọi dòng trong file". Không có nó, lệnh chỉ tác động lên ' +
            'dòng con trỏ đang đứng. Đây là lỗi phổ biến nhất khi mới học <code>:s</code>.</p>' },

          { t: 'p', x:
            'Cùng việc đó, <code>sed</code> làm được từ shell mà không cần mở trình soạn thảo:' },
          { t: 'code', where: 'wsl', code:
            'sed -i \'s/=m/=y/g\' kernel.conf\n' +
            'cat kernel.conf' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '# kernel config\n' +
            'CONFIG_UART=y\n' +
            'CONFIG_I2C=y\n' +
            'CONFIG_DEBUG=y' },

          { t: 'cal', kind: 'tip', title: 'Cú pháp giống nhau không phải trùng hợp', x:
            '<p><code>s/cũ/mới/g</code> trong vim và trong <code>sed</code> là <b>một</b> cú pháp — ' +
            'cả hai đều thừa kế từ <code>ed</code>, trình soạn thảo dòng lệnh của Unix năm 1969. ' +
            'Chữ <code>ed</code> nằm ngay trong tên <code>sed</code> (<i>stream editor</i>).</p>' +
            '<p>Học một lần, dùng ở hai nơi. Bài 11 sẽ khai thác <code>sed</code> đến tận cùng.</p>' +
            '<p>Nguyên tắc chọn: sửa <b>một</b> file và cần nhìn kết quả thì dùng vim; sửa ' +
            '<b>hàng trăm</b> file trong một vòng lặp thì dùng <code>sed</code>.</p>' }
        ]},

      { title: 'Gây ra một file swap rồi tự xử lý',
        blocks: [
          { t: 'p', x:
            'Mở file bằng vim, gõ vài chữ, rồi <b>đóng thẳng cửa sổ terminal</b> hoặc nhấn ' +
            '<kbd>Ctrl</kbd>+<kbd>Z</kbd> rồi <code>kill -9 %1</code> — mô phỏng đúng cảnh rớt ' +
            'SSH. Sau đó xem thư mục:' },
          { t: 'code', where: 'wsl', code:
            'ls -a\n' +
            'ls -l .kernel.conf.swp' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '.\n' +
            '..\n' +
            '.kernel.conf.swp\n' +
            'kernel.conf\n' +
            '\n' +
            '-rw-r--r-- 1 shinarus shinarus 4096 Aug  1 16:18 .kernel.conf.swp' },

          { t: 'cal', kind: 'info', title: 'File swap tồn tại thật, 4096 byte', x:
            '<p>Tên bắt đầu bằng dấu chấm nên <code>ls</code> thường không thấy — phải ' +
            '<code>ls -a</code>, đúng quy ước "file ẩn" bạn đã học ở Bài 6.</p>' +
            '<p>Mở lại <code>vim kernel.conf</code> lúc này, bạn sẽ gặp màn hình cảnh báo bắt đầu ' +
            'bằng <code>E325: ATTENTION</code>. Nó liệt kê tiến trình nào từng giữ file và gợi ý ' +
            'hai hướng: phục hồi hoặc xoá. Nhấn <kbd>Enter</kbd> để bỏ qua, hoặc <code>q</code> ' +
            'để thoát ra và xử lý từ shell.</p>' },

          { t: 'p', x: 'Hỏi vim xem trên máy còn sót file swap nào không:' },
          { t: 'code', where: 'wsl', code: 'vim -r' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'Swap files found:\n' +
            '   In current directory:\n' +
            '1.    .kernel.conf.swp\n' +
            '          owned by: shinarus   dated: Sat Aug 01 16:18:38 2026\n' +
            '         file name: ~shinarus/embedded/bai07/kernel.conf\n' +
            '          modified: no\n' +
            '         user name: shinarus   host name: Shinarus\n' +
            '        process ID: 427\n' +
            '   In directory ~/tmp:\n' +
            '      -- none --\n' +
            '   In directory /var/tmp:\n' +
            '      -- none --' },

          { t: 'cal', kind: 'info', title: 'Dòng "modified" là dòng quyết định', x:
            '<p><code>modified: no</code> nghĩa là phiên trước <b>chưa kịp sửa gì</b> so với file ' +
            'trên đĩa — không có gì đáng cứu, cứ xoá file swap. Nếu nó ghi <code>modified: YES</code> ' +
            'thì có phần chưa lưu, và bạn nên chạy <code>vim -r kernel.conf</code>, kiểm tra nội ' +
            'dung, rồi <code>:w</code> để ghi đè lên file thật.</p>' +
            '<p><code>process ID</code> cho biết tiến trình vim nào đã tạo file này. Nếu tiến trình ' +
            'đó <b>vẫn còn sống</b> — bạn kiểm tra được bằng <code>ps</code> ở Bài 9 — thì nghĩa là ' +
            'bạn đang mở cùng file ở một cửa sổ khác, chứ không phải sự cố.</p>' },

          { t: 'p', x: 'Dọn file swap và làm sạch thư mục:' },
          { t: 'code', where: 'wsl', code: 'rm .kernel.conf.swp' }
        ]},

      { title: 'Viết ~/.vimrc và chứng minh nó có tác dụng',
        blocks: [
          { t: 'p', x:
            'Mặc định vim không hiện số dòng, không tô màu cú pháp, và phím Tab rộng 8 cột. ' +
            'File <code>~/.vimrc</code> sửa những điều đó, và nó được đọc mỗi lần vim khởi động.' },

          { t: 'code', where: 'file', name: '~/.vimrc', lang: 'ini', code:
            'set number\n' +
            'set expandtab\n' +
            'set tabstop=4\n' +
            'set shiftwidth=4\n' +
            'syntax on' },

          { t: 'code', where: 'wsl', code:
            'printf \'set number\\nset expandtab\\nset tabstop=4\\nset shiftwidth=4\\nsyntax on\\n\' > ~/.vimrc\n' +
            'cat ~/.vimrc' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'set number\n' +
            'set expandtab\n' +
            'set tabstop=4\n' +
            'set shiftwidth=4\n' +
            'syntax on' },

          { t: 'p', x:
            'Bây giờ hỏi thẳng vim xem giá trị <code>tabstop</code> là bao nhiêu, một lần bỏ qua ' +
            'file cấu hình và một lần dùng nó:' },
          { t: 'code', where: 'wsl', code:
            'vim -u NONE -Es -c \'set tabstop?\' -c \'qa!\' kernel.conf\n' +
            'vim -u ~/.vimrc -Es -c \'set tabstop?\' -c \'set expandtab?\' -c \'qa!\' kernel.conf' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            '  tabstop=8\n' +
            '  tabstop=4\n' +
            '  expandtab' },

          { t: 'cmdx', cmd: 'vim -u NONE -Es -c \'set tabstop?\'',
            title: 'Mổ xẻ câu lệnh',
            rows: [
              ['-u NONE', 'Bỏ qua <b>mọi</b> file cấu hình.',
               'Công cụ chẩn đoán số một: vim cư xử lạ thì chạy với <code>-u NONE</code>. Còn lạ nữa là lỗi của vim, hết lạ là lỗi trong <code>.vimrc</code>.'],
              ['-u ~/.vimrc', 'Chỉ đọc đúng file này.', ''],
              ['set tabstop?', 'Dấu hỏi ở cuối nghĩa là <b>hỏi giá trị</b> chứ không đặt giá trị.',
               'Không có dấu hỏi thì <code>set tabstop</code> là gán, và với tuỳ chọn số thì đó là lỗi cú pháp.'],
              ['qa!', '<i>quit all</i> — đóng mọi cửa sổ, vứt thay đổi.',
               'Trong script luôn dùng dạng có <code>!</code>, nếu không vim sẽ dừng lại chờ bạn trả lời.']
            ]},

          { t: 'cal', kind: 'why', title: 'expandtab: một dòng cấu hình cứu bạn nhiều giờ', x:
            '<p><code>expandtab</code> biến phím Tab thành các dấu cách. Đây là điều bạn muốn với ' +
            'mã C của kernel? <b>Không.</b> Kernel Linux yêu cầu Tab thật, rộng 8 cột.</p>' +
            '<p>Nhưng với Python, YAML và <code>Kconfig</code> thì bắt buộc. Và với ' +
            '<code>Makefile</code> thì dùng nó sẽ làm hỏng file — Makefile đòi ký tự Tab thật ở ' +
            'đầu mỗi dòng lệnh, thay bằng dấu cách là <code>make</code> báo ' +
            '<code>missing separator</code>.</p>' +
            '<p>Vì thế trong <code>.vimrc</code> thật của dân nhúng, người ta bật ' +
            '<code>expandtab</code> theo <b>loại file</b> chứ không bật toàn cục. Bây giờ chưa cần ' +
            'phức tạp thế — chỉ cần biết cái bẫy tồn tại.</p>' },

          { t: 'p', x: 'Dọn dẹp:' },
          { t: 'code', where: 'wsl', code:
            'cd ~\n' +
            'rm -f ~/.vimrc\n' +
            'rm -rf ~/embedded/bai07\n' +
            'ls ~/embedded' },
          { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
            'bai03\n' +
            'bai04\n' +
            'bai05\n' +
            'images' },

          { t: 'cal', kind: 'tip', title: 'Muốn học sâu hơn thì có sẵn ngay trên máy', x:
            '<p>Gõ <code>vimtutor</code>. Đó là một bài học tương tác 30 phút do chính nhóm phát ' +
            'triển vim viết, đã cài sẵn trên máy bạn. Nó cho bạn một file nháp để phá thoải mái.</p>' +
            '<p>Ba mươi phút đó là khoản đầu tư đáng giá nhất bạn có thể bỏ ra trong Chặng 01.</p>' }
        ]}
    ]},

    /* ══════════════════════════════════════════════
       8. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['Màn hình đứng im, gõ gì cũng không hiện',
         'Bạn nhấn <kbd>Ctrl</kbd>+<kbd>S</kbd> — terminal đã ngừng hiển thị',
         'Nhấn <kbd>Ctrl</kbd>+<kbd>Q</kbd>. Ký tự đã gõ vẫn còn nguyên'],
        ['<code>E37: No write since last change</code>',
         'Gõ <code>:q</code> nhưng file đã bị sửa',
         '<code>:wq</code> để giữ, <code>:q!</code> để bỏ'],
        ['<code>E325: ATTENTION … swap file already exists</code>',
         'Phiên vim trước bị ngắt đột ngột, file <code>.swp</code> còn lại',
         '<kbd>Enter</kbd> để bỏ qua; hoặc <code>vim -r file</code> để cứu; hoặc <code>rm .file.swp</code>'],
        ['<code>E212: Can\'t open file for writing</code>',
         'Không có quyền ghi vào file hoặc thư mục',
         '<code>ls -l</code> xem quyền. Cần root thì thoát ra và <code>sudo vim</code> — Bài 8'],
        ['Chữ gõ vào bị mất, con trỏ nhảy lung tung, file biến dạng',
         'Bạn đang ở chế độ Normal và mỗi chữ cái là một mệnh lệnh',
         '<kbd>Esc</kbd>, rồi <code>u</code> nhiều lần để hoàn tác. Hỏng nặng thì <code>:e!</code>'],
        ['<code>E488: Trailing characters</code>',
         'Gõ nhầm lệnh sau dấu hai chấm, ví dụ <code>:wq!!</code>',
         'Nhấn <kbd>Esc</kbd> rồi gõ lại cho đúng'],
        ['<code>make: *** missing separator</code> sau khi sửa Makefile',
         '<code>expandtab</code> đã biến Tab thành dấu cách',
         'Tắt bằng <code>:set noexpandtab</code>, rồi sửa lại dòng đó bằng Tab thật'],
        ['Không tìm thấy file <code>.swp</code> dù vim báo có',
         'Tên bắt đầu bằng dấu chấm nên bị <code>ls</code> giấu đi',
         '<code>ls -a</code>, hoặc chạy <code>vim -r</code> để vim tự liệt kê']
      ]},

    /* ══════════════════════════════════════════════
       9. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', items: [
      'Trên board nhúng và qua SSH thường <b>chỉ có <code>vi</code></b>. Biết thoát khỏi nó là ' +
      'kỹ năng bắt buộc, không phải sở thích.',
      '<b>nano</b>: không có chế độ, phím tắt luôn hiện ở hai dòng cuối. ' +
      '<kbd>Ctrl</kbd>+<kbd>O</kbd> lưu, <kbd>Ctrl</kbd>+<kbd>X</kbd> thoát.',
      '<b><kbd>Ctrl</kbd>+<kbd>S</kbd> treo terminal</b>, không phải treo máy. Gỡ bằng ' +
      '<kbd>Ctrl</kbd>+<kbd>Q</kbd>. Máy bạn có <code>stop = ^S</code>, <code>start = ^Q</code>.',
      'vim có bốn chế độ. <b><kbd>Esc</kbd> luôn đưa bạn về Normal</b> — nhấn hai lần cho chắc.',
      'Thoát: <code>:q</code> · <code>:wq</code> lưu rồi thoát · <b><code>:q!</code> vứt hết, ' +
      'phao cứu sinh</b>. Dấu <code>!</code> luôn nghĩa là "đừng hỏi".',
      'Ngữ pháp vim là <b>số + hành động + phạm vi</b>: <code>3dd</code>, <code>d$</code>, ' +
      '<code>yG</code>. Nhớ 14 phím dùng được 48 lệnh.',
      '<code>:%s/cũ/mới/g</code> và <code>:g/mẫu/d</code> là hai lệnh sẽ xử lý file ' +
      '<code>.config</code> mười nghìn dòng của kernel ở Chặng 07.',
      'Cú pháp <code>s/cũ/mới/g</code> giống hệt <code>sed</code> vì cả hai cùng thừa kế từ ' +
      '<code>ed</code>. Học một lần dùng hai nơi.',
      'File <code>.swp</code> là bản nháp vim ghi song song. Còn lại khi phiên bị ngắt đột ngột; ' +
      'xử lý bằng <code>vim -r</code> hoặc <code>rm</code>.',
      '<code>~/.vimrc</code> có tác dụng thật: <code>tabstop</code> đổi từ <b>8</b> sang <b>4</b> ' +
      'đúng như bạn đã kiểm chứng. Chạy <code>vim -u NONE</code> khi cần loại trừ lỗi cấu hình.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo', x:
      '<p>Ở bài này bạn đã gặp <code>E212: Can\'t open file for writing</code> và lời khuyên "cần ' +
      'root thì dùng sudo". <b>Bài 8 — Người dùng, nhóm, quyền và sudo</b> giải thích trọn vẹn ' +
      'điều đó: chín ký tự <code>rwxr-xr-x</code> nghĩa là gì, vì sao chúng lại viết được thành ' +
      'con số <code>755</code>, và <code>chmod +x</code> thật ra làm gì với inode.</p>' +
      '<p>Bài đó cũng trả lời một câu hỏi đặc thù của nghề nhúng: vì sao gần như mọi thiết bị ' +
      'nhúng đều chạy toàn bộ ứng dụng dưới quyền <b>root</b>, trong khi trên máy để bàn điều đó ' +
      'bị coi là sai lầm nghiêm trọng.</p>' },

    { t: 'hr' }
  ],

  /* ══════════════════════════════════════════════
     QUIZ
     ══════════════════════════════════════════════ */
  quiz: [
    {
      q: 'Bạn mở vim, gõ vài chữ, và nhận ra mình đã làm hỏng file. Bạn muốn thoát mà <b>không</b> lưu gì. Gõ gì?',
      opts: [
        '<kbd>Ctrl</kbd>+<kbd>C</kbd> rồi đóng cửa sổ',
        '<kbd>Esc</kbd> <kbd>Esc</kbd> rồi <code>:q!</code> rồi <kbd>Enter</kbd>',
        '<code>:wq</code>',
        '<kbd>Ctrl</kbd>+<kbd>X</kbd>'
      ],
      a: 1,
      why: '<kbd>Esc</kbd> đưa bạn chắc chắn về chế độ Normal — cần thiết vì có thể bạn đang ở ' +
           'Insert mà không biết. Dấu <code>!</code> nghĩa là "cứ làm, đừng hỏi", nên ' +
           '<code>:q!</code> vứt bỏ mọi thay đổi trong bộ nhớ. File trên đĩa <b>không hề bị đụng ' +
           'tới</b>, nên đây là thao tác an toàn tuyệt đối. <kbd>Ctrl</kbd>+<kbd>X</kbd> là phím ' +
           'của nano, không phải vim.'
    },
    {
      q: 'Bạn đang sửa file trong nano, lỡ nhấn <kbd>Ctrl</kbd>+<kbd>S</kbd> theo phản xạ, và màn hình đứng im. Chuyện gì đã xảy ra?',
      opts: [
        'nano bị treo, phải đóng cửa sổ terminal',
        'File quá lớn nên nano đang lưu',
        'Terminal đã ngừng hiển thị vì <code>stop = ^S</code>; nhấn <kbd>Ctrl</kbd>+<kbd>Q</kbd> để tiếp tục',
        'Bạn đã vô tình gửi tín hiệu kết thúc cho nano'
      ],
      a: 2,
      why: 'Thủ phạm không phải nano mà là <b>terminal</b>. Cấu hình thật trên máy bạn có ' +
           '<code>stop = ^S</code> và <code>start = ^Q</code> — cơ chế điều khiển luồng có từ thời ' +
           'máy in cơ khí. <kbd>Ctrl</kbd>+<kbd>Q</kbd> cho hiển thị chạy tiếp và mọi ký tự bạn gõ ' +
           'trong lúc đó vẫn còn nguyên. Đóng cửa sổ mới là hành động làm mất dữ liệu.'
    },
    {
      q: 'File <code>.config</code> của kernel có 14.000 dòng và bạn cần đổi mọi <code>=y</code> thành <code>=m</code>. Lệnh vim nào?',
      opts: [
        '<code>:s/=y/=m/</code>',
        '<code>:%s/=y/=m/g</code>',
        '<code>:g/=y/d</code>',
        'Không làm được, phải sửa tay'
      ],
      a: 1,
      why: '<code>%</code> nghĩa là "mọi dòng trong file" và <code>g</code> ở cuối nghĩa là "mọi ' +
           'lần xuất hiện trên mỗi dòng". Thiếu <code>%</code> thì lệnh chỉ tác động lên đúng dòng ' +
           'con trỏ đang đứng — đây là lỗi phổ biến nhất khi mới học <code>:s</code>. ' +
           '<code>:g/=y/d</code> lại là lệnh <b>xoá</b> mọi dòng chứa <code>=y</code>, hoàn toàn ' +
           'khác. Thêm <code>c</code> thành <code>/gc</code> nếu muốn vim hỏi từng chỗ.'
    },
    {
      q: 'Bạn SSH vào board, đang sửa file bằng vim thì mạng đứt. Kết nối lại, mở file thì gặp <code>E325: ATTENTION</code>. Nghĩa là gì?',
      opts: [
        'File đã bị hỏng và không mở được nữa',
        'Bạn không có quyền ghi vào file',
        'File <code>.swp</code> từ phiên trước còn lại; chọn phục hồi hoặc xoá nó',
        'Board đã hết dung lượng đĩa'
      ],
      a: 2,
      why: 'vim ghi mọi thay đổi vào một file nháp <code>.filename.swp</code> ngay khi bạn mở file, ' +
           'và chỉ xoá nó khi bạn thoát bình thường. Mạng đứt nên nó ở lại. File thật trên đĩa ' +
           '<b>vẫn nguyên vẹn</b>. Cứu phần chưa lưu bằng <code>vim -r filename</code> rồi ' +
           '<code>:w</code>; không cần thì <code>rm .filename.swp</code>. Nhớ <code>ls -a</code> ' +
           'mới thấy nó, vì tên bắt đầu bằng dấu chấm.'
    },
    {
      q: 'Vì sao lệnh <code>s/cũ/mới/g</code> giống hệt nhau trong vim và trong <code>sed</code>?',
      opts: [
        'Trùng hợp ngẫu nhiên',
        '<code>sed</code> gọi vim ở bên trong',
        'Cả hai cùng thừa kế cú pháp từ <code>ed</code>, trình soạn thảo dòng lệnh của Unix năm 1969',
        'POSIX bắt buộc mọi lệnh phải dùng dấu gạch chéo'
      ],
      a: 2,
      why: '<code>ed</code> là trình soạn thảo đầu tiên của Unix. <code>vi</code> là "ed nhìn thấy ' +
           'được" (<i>visual</i>), còn <code>sed</code> là "ed cho dòng dữ liệu chảy qua" ' +
           '(<i>stream editor</i>) — chữ <code>ed</code> nằm ngay trong tên. Vì thế học cú pháp một ' +
           'lần là dùng được ở cả hai. Nguyên tắc chọn: sửa một file và cần nhìn kết quả thì vim; ' +
           'sửa hàng loạt file trong vòng lặp thì <code>sed</code>.'
    },
    {
      q: 'Sau khi thêm <code>set expandtab</code> vào <code>~/.vimrc</code>, bạn sửa một <code>Makefile</code> và <code>make</code> báo <code>missing separator</code>. Vì sao?',
      opts: [
        '<code>.vimrc</code> bị lỗi cú pháp',
        '<code>expandtab</code> đã biến ký tự Tab thành dấu cách, mà Makefile bắt buộc phải có Tab thật',
        '<code>make</code> không đọc được file do vim mã hoá',
        'Thiếu <code>set number</code>'
      ],
      a: 1,
      why: '<code>expandtab</code> thay mỗi lần nhấn Tab bằng các dấu cách. Rất tốt cho Python, ' +
           'YAML và Kconfig, nhưng <code>make</code> nhận biết dòng lệnh bằng <b>ký tự Tab thật</b> ' +
           'ở đầu dòng, nên dấu cách làm nó không hiểu. Sửa bằng <code>:set noexpandtab</code> rồi ' +
           'gõ lại dòng đó. Đây là lý do dân nhúng bật <code>expandtab</code> theo loại file thay ' +
           'vì bật toàn cục. Chẩn đoán nghi ngờ <code>.vimrc</code> thì chạy ' +
           '<code>vim -u NONE</code> để loại trừ.'
    }
  ]
});

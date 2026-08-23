/* Bài 29 — QEMU: nguyên lý hoạt động
   Chặng 05 — QEMU và luồng khởi động */

Lesson.register({
  id: 'bai-29',
  title: 'QEMU: nguyên lý hoạt động',
  minutes: 60,
  practice: 'Thực hành 40 phút',
  level: 'Trung cấp',

  intro:
    '<p>Bốn chặng vừa qua bạn đã dùng QEMU như một hộp đen. Bài 3 nói nó có một bộ dịch tên ' +
    '<b>TCG</b> và dừng ở đó. Bài 27 nhờ <code>qemu-aarch64</code> chạy một daemon ARM64 trên máy ' +
    'x86 và đo được nó chậm hơn <b>1,46 lần</b>. Cả hai lần bạn đều tin lời giải thích mà không ' +
    'nhìn thấy bằng chứng.</p>' +
    '<p>Từ bài này trở đi QEMU không còn là công cụ phụ nữa — nó <b>là cái board của bạn</b>. ' +
    'U-Boot ở Chặng 06, nhân Linux ở Chặng 07, driver ở Chặng 10 đều sẽ chạy bên trong nó. Khi ' +
    'một thứ chạy sai, bạn phải phân biệt được: lỗi ở mã của mình, hay ở chỗ QEMU không mô phỏng ' +
    'phần cứng đó. Không hiểu bộ máy bên dưới thì mọi lần gỡ lỗi đều là đoán mò.</p>' +
    '<p>Bài này mở nắp capo. Bạn sẽ nhìn thấy tận mắt ba giai đoạn dịch: lệnh ARM64 gốc, mã ' +
    'trung gian TCG, rồi mã x86-64 do QEMU sinh ra — cả ba đều in ra được bằng một tham số dòng ' +
    'lệnh. Rồi bạn sẽ <i>tắt</i> từng cơ chế tăng tốc để đo xem nó đáng giá bao nhiêu: tắt nối ' +
    'khối làm chương trình chậm <b>4,2 lần</b>, ép mỗi lệnh một khối làm nó chậm <b>34,7 lần</b>.</p>' +
    '<p>Cuối bài bạn sẽ trả lời được câu hỏi phiền phức nhất của người mới: máy tôi <i>có</i> ' +
    '<code>/dev/kvm</code>, vậy tại sao QEMU ARM64 vẫn chậm?</p>',

  goals: [
    'Vẽ được đường đi của một lệnh guest qua ba giai đoạn: frontend → TCG IR → backend, và in ra được từng giai đoạn bằng <code>-d in_asm</code>, <code>-d op</code>, <code>-d out_asm</code>',
    'Định nghĩa chính xác <b>translation block</b> và nêu được các điều kiện làm một khối kết thúc',
    'Chứng minh bằng số đo rằng bộ đệm khối và nối khối là thứ giữ cho mô phỏng còn dùng được',
    'Phân biệt <code>qemu-user</code> và <code>qemu-system</code> ở mức cơ chế, không chỉ ở mức mô tả',
    'Giải thích được vì sao <code>/dev/kvm</code> tồn tại trên máy bạn nhưng không giúp gì cho guest ARM64',
    'Chọn đúng công cụ (TCG, KVM, board thật) cho từng loại công việc và nói rõ đánh đổi'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. VẤN ĐỀ QEMU PHẢI GIẢI
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Vấn đề mà QEMU phải giải' },

    { t: 'p', x:
      'CPU trong máy bạn là x86-64. Nó biết đọc mã máy x86-64 và không biết gì khác. Một nhị ' +
      'phân ARM64 với nó chỉ là một dãy byte vô nghĩa — đúng như Bài 3 đã cho bạn kiểm chứng ' +
      'bằng <code>Exec format error</code>, mã thoát <b>126</b>.' },

    { t: 'p', x:
      'Vậy làm sao chạy được mã ARM64 trên đó? Chỉ có ba lối, và chỉ một lối là dùng được:' },

    { t: 'table',
      head: ['Cách', 'Cơ chế', 'Tốc độ tương đối', 'Vì sao QEMU không (hoặc có) chọn'],
      rows: [
        ['<b>Thông dịch</b> (interpret)',
         'Vòng lặp: đọc 4 byte, giải mã, <code>switch</code> nhảy tới đoạn C mô phỏng lệnh đó, lặp lại',
         'Chậm <b>100–1000×</b>',
         'Đơn giản nhất, nhưng mỗi lần chạy lại một lệnh là một lần giải mã lại. Một vòng lặp 200 triệu lần phải giải mã 200 triệu lần'],
        ['<b>Dịch tĩnh</b> (AOT)',
         'Dịch trước toàn bộ nhị phân ARM64 thành nhị phân x86-64, rồi chạy thẳng',
         'Nhanh nhất về lý thuyết',
         '<b>Bất khả thi.</b> Không thể biết trước đâu là mã, đâu là dữ liệu; không xử lý được nhảy gián tiếp, mã tự sinh, mã nạp động'],
        ['<b>Dịch động</b> (JIT)',
         'Gặp một đoạn mã lần đầu thì dịch nó ra mã host, <b>lưu lại</b>, lần sau chạy thẳng bản đã dịch',
         'Chậm <b>2–5×</b> với mã thuần tính toán',
         '<b>Đây là TCG.</b> Chỉ dịch những gì thật sự chạy tới, và trả giá dịch đúng một lần']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao "chỉ dịch cái thật sự chạy tới" lại là ý tưởng quyết định?',
      x: '<p>Một chương trình điển hình chạy chưa tới 10 % lượng mã nó chứa. Phần còn lại là ' +
         'xử lý lỗi, nhánh hiếm, mã khởi tạo chạy một lần. Dịch tĩnh phải dịch <i>tất cả</i>; ' +
         'dịch động chỉ dịch phần nào chương trình thật sự bước vào.</p>' +
         '<p>Quan trọng hơn, nó lật ngược bài toán chi phí. Giá dịch phải trả <b>một lần cho ' +
         'mỗi đoạn mã</b>, còn lợi ích thu về <b>mỗi lần đoạn mã đó chạy lại</b>. Trong phần ' +
         'thực hành bạn sẽ đo một chương trình quay <b>200 triệu</b> vòng lặp mà QEMU chỉ dịch ' +
         '<b>1 175</b> khối lệnh — sau vài mili-giây đầu, chi phí dịch coi như bằng không và ' +
         'phần còn lại chạy bằng mã x86-64 thật.</p>' },

    /* ══════════════════════════════════════════════
       2. BA GIAI ĐOẠN CỦA TCG
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'TCG: ba giai đoạn, một tầng trung gian' },

    { t: 'p', x:
      '<b>TCG</b> — <i>Tiny Code Generator</i> — là bộ dịch động nằm trong QEMU. Điều đầu tiên ' +
      'cần biết về nó: nó <b>không</b> dịch thẳng từ ARM64 sang x86-64. Nó dịch qua một ngôn ngữ ' +
      'trung gian riêng.' },

    { t: 'fig', cap:
      'Tầng IR ở giữa là lý do QEMU hỗ trợ được nhiều kiến trúc đến vậy: thêm một guest chỉ tốn ' +
      'một frontend, thêm một host chỉ tốn một backend — không phải viết lại cho từng cặp.',
      svg:
      '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Sơ đồ ba giai đoạn dịch của TCG: frontend đọc lệnh guest, sinh mã trung gian TCG IR, backend sinh mã host">' +
      '<rect class="d-box-a" x="20" y="40" width="180" height="72" rx="8"/>' +
      '<text class="d-t"  x="110" y="66" text-anchor="middle">Mã guest</text>' +
      '<text class="d-tm" x="110" y="86" text-anchor="middle">ARM64 (AArch64)</text>' +
      '<text class="d-ts" x="110" y="103" text-anchor="middle">đọc từ file ELF</text>' +

      '<rect class="d-box-p" x="270" y="40" width="180" height="72" rx="8"/>' +
      '<text class="d-t"  x="360" y="66" text-anchor="middle">TCG IR</text>' +
      '<text class="d-tm" x="360" y="86" text-anchor="middle">mov_i64, add_i64…</text>' +
      '<text class="d-ts" x="360" y="103" text-anchor="middle">không thuộc kiến trúc nào</text>' +

      '<rect class="d-box-g" x="520" y="40" width="180" height="72" rx="8"/>' +
      '<text class="d-t"  x="610" y="66" text-anchor="middle">Mã host</text>' +
      '<text class="d-tm" x="610" y="86" text-anchor="middle">x86-64</text>' +
      '<text class="d-ts" x="610" y="103" text-anchor="middle">CPU thật chạy trực tiếp</text>' +

      '<line class="d-line" x1="200" y1="76" x2="262" y2="76"/>' +
      '<path class="d-arrow" d="M270 76 l-9 -4 v8 z"/>' +
      '<text class="d-ts" x="231" y="66" text-anchor="middle">frontend</text>' +
      '<text class="d-ts" x="231" y="94" text-anchor="middle">-d in_asm</text>' +

      '<line class="d-line" x1="450" y1="76" x2="512" y2="76"/>' +
      '<path class="d-arrow" d="M520 76 l-9 -4 v8 z"/>' +
      '<text class="d-ts" x="481" y="66" text-anchor="middle">backend</text>' +
      '<text class="d-ts" x="481" y="94" text-anchor="middle">-d out_asm</text>' +

      '<text class="d-ts" x="360" y="132" text-anchor="middle">-d op · -d op_opt</text>' +

      '<line class="d-line" x1="20" y1="160" x2="700" y2="160"/>' +

      '<text class="d-t" x="20" y="190">Vì sao tách làm hai nửa</text>' +
      '<rect class="d-box-w" x="20" y="204" width="320" height="70" rx="8"/>' +
      '<text class="d-t"  x="180" y="228" text-anchor="middle">Dịch thẳng từng cặp</text>' +
      '<text class="d-ts" x="180" y="248" text-anchor="middle">N guest × M host bộ dịch</text>' +
      '<text class="d-ts" x="180" y="264" text-anchor="middle">20 × 8 = 160 bộ phải viết và bảo trì</text>' +

      '<rect class="d-box-g" x="380" y="204" width="320" height="70" rx="8"/>' +
      '<text class="d-t"  x="540" y="228" text-anchor="middle">Qua tầng IR</text>' +
      '<text class="d-ts" x="540" y="248" text-anchor="middle">N frontend + M backend</text>' +
      '<text class="d-ts" x="540" y="264" text-anchor="middle">20 + 8 = 28 bộ phải viết và bảo trì</text>' +
      '</svg>' },

    { t: 'p', x:
      'Ba giai đoạn đó có tên riêng và — điểm mấu chốt của bài thực hành — <b>mỗi giai đoạn đều ' +
      'in ra được</b> bằng một tham số <code>-d</code>. Bạn không phải tin lời ai cả.' },

    { t: 'table',
      head: ['Giai đoạn', 'Việc nó làm', 'Xem bằng', 'Đầu ra trông như thế nào'],
      rows: [
        ['<b>Frontend</b> (guest)',
         'Đọc byte lệnh ARM64 từ bộ nhớ guest, giải mã, phát ra các thao tác TCG tương đương',
         '<code>-d in_asm</code>',
         'Địa chỉ guest + byte lệnh gốc của từng khối'],
        ['<b>Tối ưu IR</b>',
         'Loại bỏ thao tác thừa, gấp hằng số, xoá mã chết trong phạm vi một khối',
         '<code>-d op</code>, <code>-d op_opt</code>',
         '<code>mov_i64 x5,x0</code> — thao tác trên thanh ghi <i>ảo</i>'],
        ['<b>Backend</b> (host)',
         'Cấp phát thanh ghi thật, sinh mã máy x86-64, ghi vào vùng nhớ thực thi được',
         '<code>-d out_asm</code>',
         'Địa chỉ host + byte lệnh x86-64 đã sinh']
      ]},

    { t: 'cal', kind: 'info', title: 'Thanh ghi guest sống ở đâu?',
      x: '<p>ARM64 có 31 thanh ghi đa dụng; x86-64 chỉ có 16, và QEMU còn phải dành vài cái cho ' +
         'việc riêng. Không thể ánh xạ một–một.</p>' +
         '<p>Nên toàn bộ trạng thái CPU guest — 31 thanh ghi, PC, PSTATE, thanh ghi hệ thống — ' +
         'nằm trong một <b>cấu trúc C trong bộ nhớ</b> gọi là <code>CPUArchState</code>, và ' +
         'backend giữ con trỏ tới nó trong một thanh ghi host cố định (tên <code>env</code>). ' +
         'Vì thế trong bản dump <code>-d out_asm</code> bạn sẽ thấy rất nhiều lệnh ' +
         '<code>mov</code> ra vào bộ nhớ: đó là guest đang đọc/ghi thanh ghi của chính nó. ' +
         'TCG chỉ giữ giá trị trong thanh ghi host thật trong phạm vi một khối, rồi lại ghi ' +
         'ngược về cấu trúc trước khi khối kết thúc.</p>' +
         '<p>Đây cũng là một phần lý do mã host phình ra: bạn sẽ đo được tỉ lệ phình ' +
         '<b>3,48 lần</b> ở chế độ người dùng trong phần thực hành.</p>' },

    /* ══════════════════════════════════════════════
       3. TRANSLATION BLOCK
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Translation block: đơn vị công việc của QEMU' },

    { t: 'p', x:
      'QEMU không dịch từng lệnh một, cũng không dịch cả chương trình. Nó dịch theo ' +
      '<b>translation block</b> (viết tắt <b>TB</b>): một dãy lệnh guest liên tiếp, bắt đầu ở ' +
      'chỗ QEMU vừa nhảy tới, và kéo dài cho tới khi gặp một lý do buộc phải dừng.' },

    { t: 'p', x: 'Có bốn lý do làm một khối kết thúc:' },

    { t: 'list', ordered: true, items: [
      '<b>Gặp lệnh rẽ nhánh hoặc nhảy.</b> Sau lệnh này QEMU chưa biết chắc chạy tiếp ở đâu, nên phải quay về vòng điều phối để tra xem đích đến đã được dịch chưa.',
      '<b>Chạm biên trang nhớ.</b> Trang kế tiếp có thể chưa được ánh xạ, hoặc thuộc quyền khác. Dịch vượt qua biên trang là dịch thứ mình chưa chắc đọc được.',
      '<b>Gặp lệnh cần trợ giúp phức tạp.</b> Ví dụ lệnh gọi hệ thống, lệnh rào cản bộ nhớ, lệnh truy cập thanh ghi hệ thống — QEMU sinh lời gọi tới một <b>hàm trợ giúp</b> viết bằng C thay vì sinh mã trực tiếp.',
      '<b>Khối đã đủ dài.</b> Có ngưỡng trên để bộ đệm không bị một khối khổng lồ chiếm chỗ.'
    ]},

    { t: 'cal', kind: 'info', title: 'TB không phải basic block',
      x: '<p>Người học từ phía trình biên dịch hay nhầm chỗ này. <i>Basic block</i> của trình ' +
         'biên dịch chỉ có <b>một</b> lối vào ở đầu và <b>một</b> lối ra ở cuối.</p>' +
         '<p>TB của QEMU thì được cắt theo <b>đường chạy thực tế</b>. Cùng một đoạn mã có thể ' +
         'nằm trong nhiều TB khác nhau nếu chương trình nhảy vào giữa nó — bạn sẽ thấy đúng ' +
         'hiện tượng đó trong bản dump ở phần thực hành, khi hàm ' +
         '<code>__libc_start_main_impl</code> xuất hiện ba lần với ba địa chỉ bắt đầu khác nhau. ' +
         'Đó không phải lỗi: mỗi lần chương trình nhảy vào một điểm khác, QEMU dịch một khối ' +
         'mới bắt đầu từ đúng điểm đó.</p>' },

    { t: 'terms', items: [
      ['TCG', 'Tiny Code Generator',
       'Bộ dịch động của QEMU. Nhận lệnh guest, sinh mã host qua một tầng trung gian riêng'],
      ['TB', 'Translation Block',
       'Dãy lệnh guest liên tiếp được dịch và lưu đệm cùng nhau. Đơn vị làm việc nhỏ nhất của TCG'],
      ['IR', 'Intermediate Representation',
       'Ngôn ngữ trung gian, không thuộc kiến trúc nào. Nhờ nó mà thêm một guest không phải viết lại backend'],
      ['Frontend', '—',
       'Phần dịch từ tập lệnh guest sang IR. Mỗi kiến trúc guest có một frontend'],
      ['Backend', '—',
       'Phần dịch từ IR sang mã máy host. Mỗi kiến trúc host có một backend'],
      ['Block chaining', 'nối khối',
       'Vá thẳng đuôi khối A để nhảy vào khối B, bỏ qua vòng điều phối. Cơ chế tăng tốc quan trọng nhất'],
      ['Helper', 'hàm trợ giúp',
       'Hàm C trong QEMU được gọi từ mã đã dịch, dùng cho những lệnh quá phức tạp để sinh mã trực tiếp'],
      ['softmmu', '—',
       'Bộ mô phỏng MMU của guest, chỉ có ở system-mode. Dịch địa chỉ ảo guest → địa chỉ vật lý guest → bộ nhớ host'],
      ['MTTCG', 'Multi-Threaded TCG',
       'Cho phép mỗi CPU guest chạy trên một luồng host riêng, thay vì tất cả chen nhau trên một luồng']
    ]},

    /* ══════════════════════════════════════════════
       4. BA CƠ CHẾ GIỮ TỐC ĐỘ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Ba cơ chế giữ cho mô phỏng còn dùng được' },

    { t: 'p', x:
      'Dịch động thôi thì chưa đủ nhanh. Ba cơ chế dưới đây mới là thứ kéo QEMU từ "chậm 100 lần" ' +
      'xuống "chậm 2–3 lần". Điều hay là <b>bạn tắt được từng cái để đo</b>, và bạn sẽ làm đúng ' +
      'thế trong phần thực hành.' },

    { t: 'h3', x: '1. Bộ đệm khối đã dịch' },

    { t: 'p', x:
      'Mỗi khối sau khi dịch xong được ghi vào một vùng nhớ vừa ghi được vừa chạy được, rồi ' +
      'đăng ký vào một bảng băm khoá theo địa chỉ guest. Lần sau chương trình nhảy tới đúng địa ' +
      'chỉ ấy, QEMU tra bảng, thấy có, và chạy thẳng bản đã dịch. Đây là lý do một vòng lặp ' +
      '<b>200 triệu</b> bước chỉ tốn công dịch <b>một lần</b>.' },

    { t: 'h3', x: '2. Nối khối (block chaining)' },

    { t: 'p', x:
      'Tra bảng băm vẫn tốn thời gian, và phải quay về vòng điều phối của QEMU sau mỗi khối. ' +
      'Nên khi khối A vừa chạy xong và nhảy sang khối B <i>đã có sẵn trong bộ đệm</i>, QEMU ' +
      '<b>sửa thẳng mã máy ở đuôi khối A</b> thành một lệnh nhảy tới khối B. Từ lần thứ hai trở ' +
      'đi, A chạy hết là rơi thẳng vào B — không tra bảng, không quay về điều phối.' },

    { t: 'cal', kind: 'why', title: 'Vì sao nối khối là cơ chế đáng giá nhất',
      x: '<p>Một khối trung bình chỉ dài vài lệnh. Trong chương trình bare-metal bạn sẽ chạy ở ' +
         'Bài 30, QEMU báo kích thước khối trung bình là <b>7 byte</b> — chưa tới hai lệnh ' +
         'ARM64. Nếu sau mỗi khối tí hon đó phải quay về vòng điều phối và tra một bảng băm, ' +
         'chi phí điều phối sẽ lớn hơn chính công việc.</p>' +
         '<p>Đây không phải suy đoán. Trong phần thực hành bạn tắt nối khối bằng ' +
         '<code>-d nochain</code> và chương trình chậm đi <b>4,2 lần</b> — chỉ vì mất một lệnh ' +
         'nhảy vá sẵn.</p>' },

    { t: 'h3', x: '3. softmmu và TLB — chỉ ở system-mode' },

    { t: 'p', x:
      'Ở system-mode, mọi truy cập bộ nhớ của guest đều là địa chỉ <b>ảo</b> và phải đi qua bảng ' +
      'trang của guest trước. Mô phỏng đầy đủ việc đó cho từng lần đọc/ghi thì không thể chịu ' +
      'nổi, nên QEMU giữ một <b>TLB phần mềm</b>: một bảng nhỏ ánh xạ thẳng địa chỉ ảo guest sang ' +
      'con trỏ trong bộ nhớ host. Trúng TLB thì chỉ tốn vài lệnh; trượt TLB mới phải gọi hàm ' +
      'trợ giúp đi bộ qua bảng trang.' },

    { t: 'cal', kind: 'info', title: 'Đây là lý do system-mode chậm hơn user-mode',
      x: '<p><code>qemu-aarch64</code> không có bước này. Chương trình guest chạy trong không ' +
         'gian địa chỉ của chính tiến trình QEMU, nên một lần đọc bộ nhớ của guest là một lần ' +
         'đọc bộ nhớ thật — nhân Linux của <i>host</i> và MMU thật lo phần dịch địa chỉ.</p>' +
         '<p><code>qemu-system-aarch64</code> thì phải tự làm việc của MMU bằng phần mềm, cộng ' +
         'thêm mô phỏng ngắt, đồng hồ, và mọi thiết bị. Cùng một chương trình sẽ chậm hơn đáng ' +
         'kể khi chạy trong system-mode — đổi lại nó chạy được cả một hệ điều hành, thứ mà ' +
         'user-mode không bao giờ làm được.</p>' },

    { t: 'fig', cap:
      'Bộ đệm biến "dịch mỗi lần chạy" thành "dịch một lần"; nối khối xoá nốt chi phí điều phối ' +
      'giữa hai khối liền nhau. Tắt cơ chế thứ hai đã đủ làm chương trình chậm 4,2 lần.',
      svg:
      '<svg viewBox="0 0 720 330" width="720" role="img" aria-label="Sơ đồ vòng điều phối của QEMU: tra bộ đệm khối, dịch nếu chưa có, chạy, và đường tắt do nối khối tạo ra">' +
      '<rect class="d-box-p" x="30" y="30" width="150" height="52" rx="8"/>' +
      '<text class="d-t"  x="105" y="52" text-anchor="middle">Vòng điều phối</text>' +
      '<text class="d-ts" x="105" y="70" text-anchor="middle">PC guest = ?</text>' +

      '<rect class="d-box" x="240" y="30" width="170" height="52" rx="8"/>' +
      '<text class="d-t"  x="325" y="52" text-anchor="middle">Tra bảng băm TB</text>' +
      '<text class="d-ts" x="325" y="70" text-anchor="middle">đã dịch chưa?</text>' +

      '<rect class="d-box-w" x="470" y="30" width="220" height="52" rx="8"/>' +
      '<text class="d-t"  x="580" y="52" text-anchor="middle">Chưa: dịch khối mới</text>' +
      '<text class="d-ts" x="580" y="70" text-anchor="middle">frontend → IR → backend</text>' +

      '<line class="d-line" x1="180" y1="56" x2="232" y2="56"/>' +
      '<path class="d-arrow" d="M240 56 l-9 -4 v8 z"/>' +
      '<line class="d-line" x1="410" y1="56" x2="462" y2="56"/>' +
      '<path class="d-arrow" d="M470 56 l-9 -4 v8 z"/>' +

      '<line class="d-line" x1="580" y1="82" x2="580" y2="120"/>' +
      '<path class="d-arrow" d="M580 128 l-4 -9 h8 z"/>' +

      '<rect class="d-box-g" x="240" y="128" width="340" height="52" rx="8"/>' +
      '<text class="d-t"  x="410" y="150" text-anchor="middle">Chạy mã host của khối A</text>' +
      '<text class="d-ts" x="410" y="168" text-anchor="middle">CPU thật thực thi trực tiếp</text>' +

      '<line class="d-line" x1="325" y1="82" x2="325" y2="120"/>' +
      '<path class="d-arrow" d="M325 128 l-4 -9 h8 z"/>' +
      '<text class="d-ts" x="290" y="106" text-anchor="end">Rồi: chạy ngay</text>' +

      '<line class="d-line" x1="240" y1="154" x2="105" y2="154"/>' +
      '<line class="d-line" x1="105" y1="154" x2="105" y2="90"/>' +
      '<path class="d-arrow" d="M105 82 l-4 9 h8 z"/>' +
      '<text class="d-ts" x="150" y="146">quay về</text>' +

      '<rect class="d-box-g" x="240" y="228" width="340" height="52" rx="8"/>' +
      '<text class="d-t"  x="410" y="250" text-anchor="middle">Chạy mã host của khối B</text>' +
      '<text class="d-ts" x="410" y="268" text-anchor="middle">CPU thật thực thi trực tiếp</text>' +

      '<line class="d-line" x1="410" y1="180" x2="410" y2="220"/>' +
      '<path class="d-arrow" d="M410 228 l-4 -9 h8 z"/>' +
      '<text class="d-t"  x="424" y="206">nối khối: nhảy thẳng A → B</text>' +

      '<text class="d-ts" x="30" y="300">Không nối khối: sau mỗi khối phải quay lên vòng điều phối và tra lại bảng băm — đo được chậm 4,2 lần</text>' +
      '<text class="d-ts" x="30" y="318">Mỗi lệnh một khối (-one-insn-per-tb): mất luôn cả bộ đệm lẫn nối khối — đo được chậm 34,7 lần</text>' +
      '</svg>' },

    /* ══════════════════════════════════════════════
       5. USER-MODE vs SYSTEM-MODE
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Hai họ QEMU, nhìn từ bên trong' },

    { t: 'p', x:
      'Bài 3 phân biệt hai họ bằng mô tả: <code>qemu-aarch64</code> giả vờ là một <b>CPU</b>, ' +
      '<code>qemu-system-aarch64</code> giả vờ là cả một <b>cái máy</b>. Giờ bạn đã biết TCG ' +
      'hoạt động ra sao, có thể nói chính xác hơn: <b>cả hai dùng chung một bộ dịch TCG</b>, ' +
      'khác nhau ở phần bao quanh nó.' },

    { t: 'table',
      head: ['', '<code>qemu-aarch64</code> (user-mode)', '<code>qemu-system-aarch64</code> (system-mode)'],
      rows: [
        ['Bộ dịch TCG', 'Có — giống hệt nhau', 'Có — giống hệt nhau'],
        ['Đầu vào', 'Một file ELF của <b>Linux</b>, kiểu <code>EXEC</code> hoặc <code>DYN</code>',
         'Một ảnh nhân, một file ELF bare-metal, hoặc nội dung flash'],
        ['Bộ nhớ guest', 'Nằm ngay trong không gian địa chỉ của tiến trình QEMU. MMU <b>thật</b> của host làm việc dịch địa chỉ',
         '<b>softmmu</b>: QEMU tự mô phỏng bảng trang của guest, đệm bằng TLB phần mềm'],
        ['Lời gọi hệ thống', 'Chặn lại, đổi tham số cho khớp ABI rồi <b>gọi thẳng syscall của host</b>. Xem bằng <code>-d strace</code>',
         'Không chặn. Guest phải có nhân riêng để tự phục vụ syscall của chính nó'],
        ['Thiết bị', '<b>Không có.</b> Không UART, không đồng hồ, không ngắt',
         'Mô phỏng đầy đủ: UART, GIC, đồng hồ, virtio, PCIe — Bài 30 sẽ liệt kê từng cái'],
        ['Đặc quyền CPU', 'Chỉ EL0 (người dùng). Lệnh đặc quyền là lỗi',
         'EL0 → EL3 đầy đủ, có ngắt và chuyển mức đặc quyền thật'],
        ['Dùng để', 'Kiểm <b>tính đúng</b> của một chương trình đã cross-compile — như Bài 27',
         'Chạy bootloader, nhân, driver — tức toàn bộ phần còn lại của khoá này'],
        ['Chi phí', 'Đo được ở phần thực hành: chậm <b>2,35 lần</b> với mã thuần tính toán',
         'Cao hơn nhiều vì cộng thêm softmmu và mô phỏng thiết bị']
      ]},

    { t: 'cal', kind: 'warn', title: 'Chương trình chạy tốt dưới qemu-user không có nghĩa là nó chạy được trên board',
      x: '<p><code>qemu-aarch64</code> mượn nhân của host. Nghĩa là chương trình của bạn đang ' +
         'nói chuyện với nhân Linux <b>6.18 của WSL2</b>, không phải với nhân trên board. Nó ' +
         'thấy <code>/proc</code>, <code>/sys</code>, <code>/dev</code> của WSL, thấy các tính ' +
         'năng nhân mà board có thể không có.</p>' +
         '<p>Bạn đã gặp mặt trái của điều này ở Bài 27: <code>set_robust_list</code> và ' +
         '<code>rseq</code> trả về <code>errno=38 (Function not implemented)</code> vì QEMU ' +
         'không chuyển tiếp chúng. glibc lặng lẽ lùi về đường chậm hơn, chương trình vẫn chạy — ' +
         'nhưng đó là hành vi của <i>lớp mô phỏng</i>, không phải của board.</p>' +
         '<p>Quy tắc dùng được ngay: <b>user-mode để kiểm mã của bạn, system-mode để kiểm hệ ' +
         'thống của bạn.</b></p>' },

    /* ══════════════════════════════════════════════
       6. TCG vs KVM
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'TCG và KVM: vì sao /dev/kvm không cứu được bạn' },

    { t: 'p', x:
      'Đây là chỗ gây hiểu lầm nhiều nhất. Máy bạn <b>có</b> <code>/dev/kvm</code> — Bài 3 đã ' +
      'cho bạn kiểm chứng. Vậy tại sao QEMU ARM64 vẫn phải dịch từng khối?' },

    { t: 'p', x:
      'Vì KVM không phải một bộ tăng tốc chung chung. KVM là cửa vào <b>tính năng ảo hoá của ' +
      'chính CPU vật lý</b>: Intel VT-x hoặc AMD-V. Tính năng đó cho phép CPU chạy mã của guest ' +
      '<i>trực tiếp</i>, không qua bản dịch nào — nhưng chỉ khi mã ấy <b>là mã mà CPU đó vốn đã ' +
      'hiểu</b>.' },

    { t: 'table',
      head: ['Guest', 'Host', 'Dùng được KVM?', 'Vì sao'],
      rows: [
        ['x86-64', 'x86-64', '<b>Được</b>', 'CPU chạy thẳng mã guest. Chỉ bẫy lại khi guest chạm vào thiết bị hoặc lệnh đặc quyền'],
        ['ARM64', 'ARM64', '<b>Được</b>', 'Ví dụ QEMU trên máy Mac chip Apple Silicon, hoặc trên board ARM server'],
        ['<b>ARM64</b>', '<b>x86-64</b>', '<b>Không bao giờ</b>', 'CPU x86 không giải mã được lệnh ARM64. Không có tính năng phần cứng nào đổi được điều đó — <b>bắt buộc</b> phải dịch'],
        ['x86-64', 'ARM64', 'Không', 'Đối xứng với dòng trên']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao QEMU vẫn liệt kê /dev/kvm dù không dùng được',
      x: '<p><code>/dev/kvm</code> là thiết bị của <i>nhân host</i>, không thuộc về một kiến trúc ' +
         'guest nào. Nhân WSL2 tạo nó ra vì CPU của bạn hỗ trợ ảo hoá x86. Nó nằm đó, sẵn sàng, ' +
         'chờ một guest x86.</p>' +
         '<p>Nhưng <code>qemu-system-aarch64</code> khi khởi động sẽ hỏi: "trong <i>bản build ' +
         'này</i> có backend KVM cho ARM64 không?" Câu trả lời trên máy x86 luôn là không, và ' +
         'nó nói thẳng ra:</p>' },

    { t: 'code', where: 'wsl', code:
      'qemu-system-aarch64 -accel help' },

    { t: 'code', where: 'out', nocopy: true, code:
      'Accelerators supported in QEMU binary:\n' +
      'tcg' },

    { t: 'p', x:
      'Một dòng. Không có <code>kvm</code>, không có <code>hvf</code>, không có ' +
      '<code>whpx</code>. Đây là kết quả bạn nên coi là <b>cố định</b> cho toàn khoá học: mọi ' +
      'lần bạn chạy ARM64 trong QEMU trên máy này, TCG đang làm việc.' },

    { t: 'cal', kind: 'tip', title: 'Hệ quả thực tế cần chuẩn bị tinh thần',
      x: '<p>Boot một nhân Linux ARM64 đầy đủ trong QEMU trên máy bạn sẽ mất <b>vài chục giây</b>, ' +
         'không phải vài giây. Build nhân thì chạy trên WSL bằng trình biên dịch cross native — ' +
         'nhanh; chỉ phần <i>chạy</i> mới đi qua TCG.</p>' +
         '<p>Vì thế nguyên tắc làm việc của cả khoá là: <b>build ở host, chạy ở guest</b>. Không ' +
         'bao giờ biên dịch bên trong máy ảo ARM64 — sẽ chậm gấp bội mà chẳng được gì thêm.</p>' },

    /* ══════════════════════════════════════════════
       7. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: mổ bộ dịch của QEMU' },

    { t: 'p', x:
      'Sáu bước dưới đây biến mọi thứ vừa đọc thành thứ nhìn thấy được. Bạn sẽ in ra cả ba giai ' +
      'đoạn dịch, rồi tắt từng cơ chế tăng tốc để đo giá của nó. Tất cả đều chạy ở user-mode nên ' +
      'không bước nào mất quá vài chục giây.' },

    { t: 'steps', items: [

      /* ── BƯỚC 1 ── */
      { title: 'Dựng hai chương trình đo',
        blocks: [
          { t: 'p', x:
            'Bạn cần hai chương trình có tính chất trái ngược nhau. <code>tiny.c</code> chỉ in một ' +
            'dòng rồi thoát — nó cho thấy <b>chi phí khởi động</b>. <code>loop.c</code> quay 200 ' +
            'triệu vòng — nó cho thấy <b>chi phí chạy dài</b>, tức phần bộ đệm khối phát huy tác dụng.' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai29 && cd ~/bai29' },

          { t: 'code', where: 'file', name: 'tiny.c', code:
            '#include <stdio.h>\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    printf("hello from tiny\\n");\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'file', name: 'loop.c', code:
            '#include <stdio.h>\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    unsigned long sum = 0;\n' +
            '\n' +
            '    for (unsigned long i = 1; i <= 200000000UL; i++)\n' +
            '        sum += i % 7;\n' +
            '\n' +
            '    printf("sum=%lu\\n", sum);\n' +
            '    return 0;\n' +
            '}' },

          { t: 'p', x:
            'Dịch <code>loop.c</code> hai lần — một bản native để làm mốc, một bản ARM64 để đo ' +
            'mô phỏng — và <code>tiny.c</code> chỉ cần bản ARM64.' },

          { t: 'code', where: 'wsl', code:
            'gcc                   -O2         -o loop_x86    loop.c\n' +
            'aarch64-linux-gnu-gcc -O2 -static -o loop_arm64   loop.c\n' +
            'aarch64-linux-gnu-gcc -O2 -static -o tiny_arm64   tiny.c\n' +
            'ls -l loop_x86 loop_arm64 tiny_arm64' },

          { t: 'code', where: 'out', nocopy: true, code:
            '-rwxr-xr-x 1 shinarus shinarus 705248 Aug  8 10:30 loop_arm64\n' +
            '-rwxr-xr-x 1 shinarus shinarus  15960 Aug  8 10:30 loop_x86\n' +
            '-rwxr-xr-x 1 shinarus shinarus 705256 Aug  8 10:30 tiny_arm64',
            notes: ['Tên người dùng và ngày giờ sẽ khác trên máy bạn; ba kích thước byte thì phải giống hệt.'] },

          { t: 'cal', kind: 'why', title: 'Vì sao ép -static ở đây?',
            x: '<p>Không phải để tiết kiệm gì cả — bản tĩnh <b>to gấp 44 lần</b> bản động, đúng ' +
               'như Bài 27 đã đo. Lý do là để bài đo sạch:</p>' +
               '<ul>' +
               '<li>Không cần <code>-L /usr/aarch64-linux-gnu</code> hay ' +
               '<code>QEMU_LD_PREFIX</code>, nên không có biến môi trường nào ảnh hưởng kết quả.</li>' +
               '<li>Không có trình nạp động chạy trước <code>main()</code>, nên số khối bạn đếm ' +
               'được là của <i>chương trình</i>, không lẫn công việc phân giải ký hiệu.</li>' +
               '<li>Cùng một tập mã mỗi lần chạy, nên số đo lặp lại được.</li>' +
               '</ul>' },

          { t: 'cal', kind: 'info', title: '705 248 và 705 256 byte — chênh nhau đúng 8 byte',
            x: '<p><code>loop_arm64</code> nặng <b>705 248</b> byte, <code>tiny_arm64</code> nặng ' +
               '<b>705 256</b> byte — chênh nhau vỏn vẹn <b>8 byte</b>, dù <code>loop.c</code> có ' +
               'một vòng lặp 200 triệu bước còn <code>tiny.c</code> chỉ gọi <code>printf</code> ' +
               'một lần rồi thoát. Sự chênh lệch tí hon đó tự nó đã là bằng chứng: gần như toàn bộ ' +
               '705 KB kia là <b>glibc được liên kết tĩnh vào</b>, không phải mã của bạn — logic ' +
               'vòng lặp trong <code>loop.c</code> chỉ tốn thêm vài chục byte mã máy so với ' +
               '<code>tiny.c</code>. Bạn sẽ thấy đúng hệ quả này ở bước 2: phần lớn trong ' +
               '<b>1 096</b> khối lệnh của <code>tiny_arm64</code> hoá ra cũng là công việc của ' +
               'thư viện C khởi tạo, không phải của <code>main()</code>.</p>' }
        ]},

      /* ── BƯỚC 2 ── */
      { title: 'Giai đoạn 1 — nhìn thấy khối lệnh guest',
        blocks: [
          { t: 'p', x:
            'Tham số <code>-d</code> bật nhật ký gỡ lỗi của QEMU; <code>-D</code> chuyển nhật ký ' +
            'đó vào file thay vì trộn lẫn với đầu ra chương trình. Mục <code>in_asm</code> in ra ' +
            '<b>mỗi khối lệnh guest ngay khi nó được dịch lần đầu</b>.' },

          { t: 'code', where: 'wsl', code:
            'qemu-aarch64 -d in_asm -D tb.log ./tiny_arm64\n' +
            'grep -c \'^IN:\' tb.log\n' +
            'stat -c %s tb.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            'hello from tiny\n' +
            '1096\n' +
            '114597' },

          { t: 'cmdx', cmd: 'qemu-aarch64 -d in_asm -D tb.log ./tiny_arm64',
            title: 'Mổ dòng lệnh ghi nhật ký',
            rows: [
              ['<code>-d</code>', 'Bật các mục nhật ký gỡ lỗi. Xem toàn bộ danh sách bằng <code>qemu-aarch64 -d help</code>', 'Nhận nhiều mục cách nhau bởi dấu phẩy: <code>-d in_asm,op</code>'],
              ['<code>in_asm</code>', 'Mục "mã guest vào". In ra khối lệnh ARM64 <b>đúng lúc nó được dịch</b> — không phải mỗi lần nó chạy', 'Vì thế một vòng lặp chạy triệu lần vẫn chỉ xuất hiện một lần trong nhật ký'],
              ['<code>-D tb.log</code>', 'Ghi nhật ký vào file. Không có nó, mọi thứ đổ ra <b>stderr</b> và trộn với đầu ra chương trình', 'Luôn dùng <code>-D</code>. Nhật ký của QEMU rất dài'],
              ['<code>./tiny_arm64</code>', 'Chương trình guest và các tham số của nó', 'Mọi thứ sau tên chương trình thuộc về guest, không thuộc về QEMU']
            ]},

          { t: 'cal', kind: 'info', title: '1 096 khối cho một chương trình in đúng một dòng',
            x: '<p>Con số nghe có vẻ lớn, nhưng gần như toàn bộ là <b>thư viện C</b>: khởi tạo ' +
               'vùng nhớ, dựng ngăn xếp, đọc <code>auxv</code>, chuẩn bị luồng, dựng bộ đệm cho ' +
               '<code>stdout</code>. Phần <code>main()</code> của bạn chỉ chiếm vài khối.</p>' +
               '<p>Con số có thể chênh vài khối giữa các lần chạy vì môi trường và ngăn xếp khác ' +
               'nhau chút ít. Điều đáng nhớ là <b>bậc độ lớn</b>: khoảng một nghìn khối, chưa tới ' +
               '120 KB nhật ký.</p>' },

          { t: 'p', x:
            'Giờ nhìn vào khối đầu tiên. Đây là điểm mà nhân Linux trao quyền cho chương trình:' },

          { t: 'code', where: 'wsl', code:
            'head -n 9 tb.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            '----------------\n' +
            'IN: _start\n' +
            '0x004005c0:  \n' +
            'OBJD-T: 5f2403d51d0080d21e0080d2e50300aae10340f9e2230091e603009100000090\n' +
            'OBJD-T: 00d01791030080d2040080d25e010094\n' +
            '\n' +
            '----------------\n' +
            'IN: __libc_start_main_impl\n' +
            '0x00400b64:  ' },

          { t: 'cal', kind: 'warn', title: 'Vì sao là byte thô chứ không phải assembly?',
            x: '<p>Đây là chuyện thật gặp phải khi kiểm chứng bài này, không phải giả thiết. ' +
               '<code>OBJD-T</code> nghĩa là <i>objdump target</i>: bản QEMU của Ubuntu không ' +
               'được liên kết với thư viện giải mã lệnh, nên thay vì tự dịch ra assembly, nó in ' +
               'byte thô ra và để bạn nhờ <code>objdump</code> làm nốt.</p>' +
               '<p>Kiểm tra nhanh: <code>ldd /usr/bin/qemu-system-aarch64 | grep -ci capstone</code> ' +
               'trả về <b>0</b>. Không có gì hỏng cả — chỉ là phải thêm một bước, và bước đó ' +
               'chính là bài tập tiếp theo.</p>' },

          { t: 'p', x:
            'Byte thô thì bạn đã có công cụ đọc từ Bài 18. Trích các dòng <code>OBJD-T</code> của ' +
            'khối đầu, đổi từ hex sang nhị phân, rồi đưa cho <code>objdump</code>:' },

          { t: 'code', where: 'wsl', code:
            'awk \'/^IN: _start/{f=1;next} f&&/^OBJD-T:/{printf "%s", $2} f&&/^$/{exit}\' tb.log \\\n' +
            '  | xxd -r -p > first_tb.bin\n' +
            'stat -c %s first_tb.bin\n' +
            'aarch64-linux-gnu-objdump -D -b binary -m aarch64 first_tb.bin' },

          { t: 'code', where: 'out', nocopy: true, code:
            '48\n' +
            '\n' +
            'first_tb.bin:     file format binary\n' +
            '\n' +
            '\n' +
            'Disassembly of section .data:\n' +
            '\n' +
            '0000000000000000 <.data>:\n' +
            '   0:\td503245f \tbti\tc\n' +
            '   4:\td280001d \tmov\tx29, #0x0\n' +
            '   8:\td280001e \tmov\tx30, #0x0\n' +
            '   c:\taa0003e5 \tmov\tx5, x0\n' +
            '  10:\tf94003e1 \tldr\tx1, [sp]\n' +
            '  14:\t910023e2 \tadd\tx2, sp, #0x8\n' +
            '  18:\t910003e6 \tmov\tx6, sp\n' +
            '  1c:\t90000000 \tadrp\tx0, 0x0\n' +
            '  20:\t9117d000 \tadd\tx0, x0, #0x5f4\n' +
            '  24:\td2800003 \tmov\tx3, #0x0\n' +
            '  28:\td2800004 \tmov\tx4, #0x0\n' +
            '  2c:\t9400015e \tbl\t0x5a4' },

          { t: 'cmdx', cmd: 'awk \'/^IN: _start/{f=1;next} f&&/^OBJD-T:/{printf "%s", $2} f&&/^$/{exit}\' tb.log',
            title: 'Trích đúng một khối, không lấy nhầm khối kế bên',
            rows: [
              ['<code>/^IN: _start/{f=1;next}</code>', 'Gặp đầu khối <code>_start</code> thì bật cờ <code>f</code> và bỏ qua chính dòng đó', 'Đây là kỹ thuật "cờ phạm vi" của <code>awk</code> ở Bài 11'],
              ['<code>f&amp;&amp;/^OBJD-T:/{printf "%s", $2}</code>', 'Khi cờ đang bật, in cột thứ hai của mọi dòng <code>OBJD-T:</code> — tức phần hex — <b>không xuống dòng</b>', '<code>printf</code> thay vì <code>print</code> để nối tất cả thành một chuỗi hex liền'],
              ['<code>f&amp;&amp;/^$/{exit}</code>', 'Gặp dòng trống đầu tiên sau đó thì dừng hẳn', '<b>Đây là phần quan trọng.</b> Nhãn <code>IN: _start</code> xuất hiện <b>hai lần</b> trong nhật ký; không có <code>exit</code> bạn sẽ dán byte của hai khối vào nhau và đọc ra assembly sai'],
              ['<code>xxd -r -p</code>', 'Đảo hex thành byte thật. <code>-r</code> = revert, <code>-p</code> = plain hex, không có cột địa chỉ', 'Kết quả là một file nhị phân thuần, không có tiêu đề ELF'],
              ['<code>objdump -D -b binary -m aarch64</code>', '<code>-b binary</code> bảo objdump đây là byte trần; <code>-m aarch64</code> chỉ định tập lệnh vì file không tự khai báo được', 'Không có <code>-m</code>, objdump sẽ đoán theo kiến trúc mặc định và cho ra rác']
            ]},

          { t: 'cal', kind: 'info', title: '12 lệnh, 48 byte — hãy nhớ con số này',
            x: '<p>Khối kết thúc ở <code>bl 0x5a4</code>, tức lệnh gọi hàm. Đúng như lý thuyết: ' +
               '<b>gặp lệnh rẽ nhánh thì khối dừng</b>, vì sau đó QEMU chưa biết chắc chạy tiếp ' +
               'ở đâu.</p>' +
               '<p>Ghi nhớ <b>48 byte</b>. Ở bước 4 bạn sẽ so nó với kích thước mã x86-64 mà TCG ' +
               'sinh ra cho đúng khối này.</p>' }
        ]},

      /* ── BƯỚC 3 ── */
      { title: 'Giai đoạn 2 — nhìn thấy mã trung gian TCG',
        blocks: [
          { t: 'p', x:
            'Mục <code>op</code> in ra tầng giữa: các thao tác TCG mà frontend sinh ra, trước khi ' +
            'backend biến chúng thành mã x86-64.' },

          { t: 'code', where: 'wsl', code:
            'qemu-aarch64 -d op -D op.log ./tiny_arm64 > /dev/null\n' +
            'stat -c %s op.log\n' +
            'head -n 22 op.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            '1206222\n' +
            'OP:\n' +
            ' ld_i32 loc0,env,$0xfffffffffffffff0\n' +
            ' brcond_i32 loc0,$0x0,lt,$L0\n' +
            ' st8_i32 $0x0,env,$0xfffffffffffffff4\n' +
            '\n' +
            ' ---- 00000000004005c0 0000000000000000 0000000000000000\n' +
            '\n' +
            ' ---- 00000000004005c4 0000000000000000 0000000000000000\n' +
            ' mov_i64 x29,$0x0\n' +
            '\n' +
            ' ---- 00000000004005c8 0000000000000000 0000000000000000\n' +
            ' mov_i64 lr,$0x0\n' +
            '\n' +
            ' ---- 00000000004005cc 0000000000000000 0000000000000000\n' +
            ' mov_i64 x5,x0\n' +
            '\n' +
            ' ---- 00000000004005d0 0000000000000000 0000000000001e0c\n' +
            ' mov_i64 loc3,sp\n' +
            ' shl_i64 loc4,loc3,$0x8\n' +
            ' sar_i64 loc4,loc4,$0x8\n' +
            ' and_i64 loc4,loc4,loc3\n' +
            ' qemu_ld_i64 x1,loc4,noat+al+tlb+leq,0' },

          { t: 'cal', kind: 'info', title: 'op.log nặng gấp hơn 10 lần tb.log — vì sao',
            x: '<p><code>op.log</code> nặng <b>1 206 222</b> byte, so với <b>114 597</b> byte ' +
               'của <code>tb.log</code> ở bước 2 — hơn <b>10,5 lần</b>, dù cả hai ghi lại đúng ' +
               'cùng một lần chạy của cùng một chương trình. Lý do nằm ở chỗ mỗi mục nhật ký ghi ' +
               'một tầng khác nhau: <code>in_asm</code> in <i>một dòng byte thô</i> cho mỗi khối, ' +
               'còn <code>op</code> in ra <i>từng thao tác TCG</i> bên trong khối đó — và bảng ' +
               'dưới đây cho thấy một lệnh ARM64 có thể nở ra tới năm thao tác. Nhật ký càng gần ' +
               'phần cứng thật thì càng gọn; càng gần tầng trung gian thì càng dài, vì mỗi lệnh ' +
               'gốc bị viết lại tường minh thành nhiều bước nhỏ hơn.</p>' },

          { t: 'p', x:
            'Đối chiếu với bản assembly ở bước 2 thì mọi thứ khớp từng dòng một. Bảng dưới ghép ' +
            'ba cột lại; đây là chỗ ba giai đoạn dịch trở nên cụ thể.' },

          { t: 'table',
            head: ['Địa chỉ guest', 'Lệnh ARM64 gốc', 'Thao tác TCG sinh ra', 'Nhận xét'],
            rows: [
              ['<code>4005c0</code>', '<code>bti c</code>', '<i>không có</i>',
               'Lệnh chống chuyển hướng luồng lệnh. QEMU chưa mô phỏng nên bỏ qua — <b>một khác biệt thật giữa mô phỏng và phần cứng</b>'],
              ['<code>4005c4</code>', '<code>mov x29, #0x0</code>', '<code>mov_i64 x29,$0x0</code>',
               'Một đổi một. Tên <code>x29</code> ở đây là <i>ô nhớ</i> trong cấu trúc trạng thái CPU, không phải thanh ghi host'],
              ['<code>4005c8</code>', '<code>mov x30, #0x0</code>', '<code>mov_i64 lr,$0x0</code>',
               'TCG gọi <code>x30</code> bằng vai trò của nó: <code>lr</code>, thanh ghi liên kết'],
              ['<code>4005d0</code>', '<code>ldr x1, [sp]</code>', '<b>năm</b> thao tác, kết ở <code>qemu_ld_i64</code>',
               'Một lệnh nạp <b>nở ra năm thao tác</b>: bốn thao tác cắt bit thẻ địa chỉ, rồi mới tới lệnh đọc bộ nhớ']
            ]},

          { t: 'cal', kind: 'why', title: 'Vì sao một lệnh ldr lại nở ra năm thao tác?',
            x: '<p><code>shl_i64</code> rồi <code>sar_i64</code> — dịch trái 8 bit rồi dịch phải ' +
               '8 bit có dấu — là cách gọn nhất để <b>xoá 8 bit cao của địa chỉ</b>. ARM64 cho ' +
               'phép nhét "thẻ" vào 8 bit cao của con trỏ (đặc tính <i>top-byte-ignore</i>), nên ' +
               'phần cứng phải bỏ qua chúng khi truy cập bộ nhớ. QEMU không có phần cứng đó, nên ' +
               'phải viết ra bằng thao tác thường.</p>' +
               '<p>Đây là ví dụ mẫu mực cho câu "mô phỏng chậm hơn ở đâu": không phải mọi lệnh ' +
               'đều nở ra như nhau. Lệnh số học đơn giản gần như một đổi một; lệnh truy cập bộ ' +
               'nhớ, lệnh có ngữ nghĩa đặc biệt của kiến trúc thì đắt hơn hẳn. Hậu tố ' +
               '<code>tlb</code> trong <code>qemu_ld_i64</code> cho biết ở system-mode thao tác ' +
               'này còn phải qua TLB phần mềm nữa.</p>' },

          { t: 'cal', kind: 'tip', title: 'Muốn xem bản đã tối ưu thì dùng op_opt',
            x: '<p><code>-d op</code> in IR <b>thô</b>, ngay khi frontend sinh ra. ' +
               '<code>-d op_opt</code> in bản sau khi TCG chạy các bước tối ưu: gấp hằng số, xoá ' +
               'thao tác có kết quả không ai dùng, gộp thao tác trùng. So hai bản cạnh nhau là ' +
               'cách nhanh nhất để thấy tầng tối ưu làm được gì.</p>' }
        ]},

      /* ── BƯỚC 4 ── */
      { title: 'Giai đoạn 3 — nhìn thấy mã x86-64 do QEMU sinh ra',
        blocks: [
          { t: 'p', x:
            'Bước cuối của dây chuyền. Mục <code>out_asm</code> in mã máy <b>host</b> — thứ mà ' +
            'CPU thật trong máy bạn sẽ chạy.' },

          { t: 'code', where: 'wsl', code:
            'qemu-aarch64 -d out_asm -D out.log ./tiny_arm64 > /dev/null\n' +
            'head -n 6 out.log' },

          { t: 'code', where: 'out', nocopy: true, code:
            'PROLOGUE: [size=45]\n' +
            '0x7b0c10000000:  \n' +
            'OBJD-H: 55534154415541564157488bef4881c478fbffffffe633c04881c488040000c5\n' +
            'OBJD-H: f877415f415e415d415c5b5dc3\n' +
            '\n' +
            'OUT: [size=167]',
            notes: ['Địa chỉ <code>0x7b0c10000000</code> là nơi kernel Linux cấp bộ nhớ cho vùng JIT của QEMU lúc chạy, nên nó sẽ khác trên máy bạn — cỡ byte ở hai dòng <code>size=</code> mới là thứ ổn định.'] },

          { t: 'p', x:
            'Hai thông tin ở đây, cả hai đều đáng nhớ.' },

          { t: 'list', items: [
            '<b><code>PROLOGUE: [size=45]</code></b> — 45 byte mã x86-64 sinh <b>một lần duy nhất</b> lúc QEMU khởi động. Nó cất các thanh ghi của host, nạp con trỏ trạng thái CPU guest, rồi nhảy vào khối đầu tiên. Đây chính là cánh cửa giữa "QEMU đang chạy" và "guest đang chạy".',
            '<b><code>OUT: [size=167]</code></b> — 167 byte mã x86-64 sinh ra cho khối guest đầu tiên: đúng cái khối <b>48 byte</b> bạn đã giải mã ở bước 2.'
          ]},

          { t: 'cal', kind: 'info', title: 'Tỉ lệ phình: 167 ÷ 48 = 3,48 lần',
            x: '<p>Mỗi byte lệnh ARM64 nở thành khoảng ba byte rưỡi lệnh x86-64. Ba nguồn chính:</p>' +
               '<ul>' +
               '<li><b>Thanh ghi guest nằm trong bộ nhớ.</b> Một <code>mov x29, #0</code> gọn ' +
               'gàng của ARM64 trở thành một lệnh ghi 8 byte 0 vào cấu trúc trạng thái CPU.</li>' +
               '<li><b>Lệnh x86-64 dài hơn.</b> ARM64 mọi lệnh đúng 4 byte; lệnh x86-64 dài từ ' +
               '1 tới 15 byte, và những lệnh có tiền tố REX cùng địa chỉ hoá phức tạp thì thường ' +
               'ở nửa trên của khoảng đó.</li>' +
               '<li><b>Ngữ nghĩa phải viết tay.</b> Như năm thao tác cho một <code>ldr</code> ở ' +
               'bước 3.</li>' +
               '</ul>' +
               '<p>Ở Bài 30 bạn sẽ gặp lại con số này ở system-mode, nơi nó lên tới <b>21,6 lần</b> ' +
               '— và sẽ hiểu vì sao chênh lệch lớn đến vậy.</p>' },

          { t: 'cal', kind: 'tip', title: 'Ba tham số, ba giai đoạn — một cách nhớ',
            x: '<p><code>in_asm</code> = <b>vào</b> (guest). <code>op</code> = <b>giữa</b> (IR). ' +
               '<code>out_asm</code> = <b>ra</b> (host). Bật cả ba cùng lúc bằng ' +
               '<code>-d in_asm,op,out_asm</code> thì nhật ký in theo đúng thứ tự dịch, và bạn ' +
               'đọc được trọn vẹn hành trình của một khối trong một file.</p>' }
        ]},

      /* ── BƯỚC 5 ── */
      { title: 'Đo giá của bộ đệm khối và nối khối',
        blocks: [
          { t: 'p', x:
            'Tới phần thú vị nhất. Bạn sẽ chạy đúng một chương trình bốn lần, mỗi lần tháo bớt ' +
            'một cơ chế tăng tốc, và xem con số nói gì. Mốc là bản x86 native.' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai29\n' +
            'for i in 1 2 3; do { time ./loop_x86 > /dev/null ; } 2>&1 | grep real; done\n' +
            'echo ---\n' +
            'for i in 1 2 3; do { time qemu-aarch64 ./loop_arm64 > /dev/null ; } 2>&1 | grep real; done' },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t0m0.245s\n' +
            'real\t0m0.248s\n' +
            'real\t0m0.287s\n' +
            '---\n' +
            'real\t0m0.576s\n' +
            'real\t0m0.624s\n' +
            'real\t0m0.635s' },

          { t: 'cal', kind: 'info', title: 'Đọc sáu con số này trước khi tắt cơ chế nào',
            x: '<p>Ba lần đo dao động chút ít vì nhiễu của bộ lập lịch hệ điều hành: native đi từ ' +
               '<b>0,245 s</b> đến <b>0,287 s</b> (~17 %), qemu-aarch64 đi từ <b>0,576 s</b> đến ' +
               '<b>0,635 s</b> (~10 %). Đó là lý do đo ba lần chứ không phải một — một lần đo lẻ ' +
               'có thể rơi đúng vào một đỉnh nhiễu và làm bạn hiểu sai chi phí thật.</p>' +
               '<p>Lấy trung bình cộng: native <b>(0,245+0,248+0,287)/3 ≈ 0,260 s</b>, ' +
               'qemu-aarch64 <b>(0,576+0,624+0,635)/3 ≈ 0,612 s</b> — đúng hai con số ở dòng đầu ' +
               'bảng bên dưới. Tỉ lệ 0,612 ÷ 0,260 ≈ <b>2,35 lần</b>: với mã thuần tính toán như ' +
               '<code>loop.c</code>, đây là chi phí TCG khi mọi cơ chế tăng tốc còn nguyên vẹn. Ba ' +
               'bước tiếp theo tháo dần từng cơ chế để xem con số này phình lên bao nhiêu.</p>' },

          { t: 'p', x:
            'Giờ tắt <b>nối khối</b>. Bộ đệm khối vẫn còn — QEMU vẫn dịch mỗi khối đúng một lần — ' +
            'nhưng sau mỗi khối nó phải quay về vòng điều phối và tra bảng băm thay vì nhảy thẳng:' },

          { t: 'code', where: 'wsl', code:
            'for i in 1 2; do { time qemu-aarch64 -d nochain ./loop_arm64 > /dev/null 2>/dev/null ; } 2>&1 | grep real; done' },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t0m2.623s\n' +
            'real\t0m2.490s' },

          { t: 'cal', kind: 'info', title: 'Tắt một cơ chế, chậm ngay gấp hơn 4 lần',
            x: '<p>Trung bình hai lần đo: <b>(2,623+2,490)/2 ≈ 2,557 s</b> — đúng con số ở hàng ' +
               '<code>-d nochain</code> trong bảng bên dưới. So với mặc định vừa đo ở trên ' +
               '(0,612 s), tỉ lệ là 2,557 ÷ 0,612 ≈ <b>4,18 lần</b>: chỉ mất một lệnh nhảy vá sẵn ' +
               'ở cuối mỗi khối mà chương trình chậm hẳn đi hơn bốn lần. Bộ đệm khối vẫn nguyên — ' +
               'QEMU không dịch lại lệnh nào cả — toàn bộ chi phí tăng thêm nằm ở việc phải quay ' +
               'về vòng điều phối và tra bảng băm sau <i>mỗi</i> khối thay vì nhảy thẳng sang khối ' +
               'kế như trước.</p>' },

          { t: 'p', x:
            'Cuối cùng, tháo nốt: <code>-one-insn-per-tb</code> ép mỗi khối chỉ chứa <b>đúng một ' +
            'lệnh guest</b>. Bộ đệm vẫn hoạt động, nhưng mỗi lệnh đều phải qua vòng điều phối.' },

          { t: 'code', where: 'wsl', code:
            '{ time qemu-aarch64 -one-insn-per-tb ./loop_arm64 > /dev/null ; } 2>&1 | grep real' },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t0m21.199s' },

          { t: 'table',
            head: ['Cấu hình', 'Thời gian', 'So với native', 'So với TCG đầy đủ', 'Cơ chế còn lại'],
            rows: [
              ['<code>./loop_x86</code> (native)', '<b>0,260 s</b>', '1×', '—', 'Không mô phỏng gì'],
              ['<code>qemu-aarch64</code>', '<b>0,612 s</b>', '<b>2,35×</b>', '1×', 'Bộ đệm + nối khối + khối nhiều lệnh'],
              ['<code>-d nochain</code>', '<b>2,557 s</b>', '9,83×', '<b>4,18×</b>', 'Bộ đệm + khối nhiều lệnh'],
              ['<code>-one-insn-per-tb</code>', '<b>21,199 s</b>', '<b>81,5×</b>', '<b>34,6×</b>', 'Chỉ còn bộ đệm']
            ]},

          { t: 'cmdx', cmd: 'qemu-aarch64 -d nochain ./loop_arm64',
            title: 'Hai công tắc tháo rời cơ chế tăng tốc',
            rows: [
              ['<code>-d nochain</code>', 'Không vá đuôi khối để nhảy thẳng sang khối kế. Vốn sinh ra để nhật ký <code>exec</code> hiện được <b>toàn bộ</b> đường chạy', 'Nó là mục nhật ký chứ không phải tuỳ chọn riêng, nên viết sau <code>-d</code>'],
              ['<code>-one-insn-per-tb</code>', 'Ép ngưỡng độ dài khối xuống một lệnh. Dùng khi cần biết chính xác lệnh nào gây lỗi', 'Là tham số riêng, không nằm sau <code>-d</code>. Cũng đặt được qua biến <code>QEMU_ONE_INSN_PER_TB</code>'],
              ['<code>2>/dev/null</code>', 'Cần cho <code>-d nochain</code> vì không có <code>-D</code>, QEMU đổ nhật ký ra stderr và làm hỏng phép đo <code>time</code>', 'Nếu muốn giữ nhật ký thì thêm <code>-D</code> — nhưng ghi file cũng làm chậm phép đo']
            ]},

          { t: 'cal', kind: 'info', title: 'Đọc bảng này cho đúng',
            x: '<p><b>Nối khối một mình đáng giá 4,18 lần.</b> Chỉ vì bỏ một lệnh nhảy vá sẵn mà ' +
               'phải quay về vòng điều phối. Với chương trình này, chi phí điều phối lớn gấp ba ' +
               'lần công việc thật.</p>' +
               '<p><b>Khối nhiều lệnh đáng giá thêm 8,3 lần nữa</b> (21,199 ÷ 2,557). Khi mỗi ' +
               'khối chỉ có một lệnh, TCG mất hết cơ hội tối ưu trong phạm vi khối: không giữ ' +
               'được giá trị trong thanh ghi host qua hai lệnh liền nhau, phải ghi trạng thái CPU ' +
               'về bộ nhớ sau <i>mỗi</i> lệnh.</p>' +
               '<p><b>Và bộ đệm khối đáng giá phần còn lại.</b> Cấu hình chậm nhất vẫn còn bộ ' +
               'đệm, nên vẫn "chỉ" chậm 81,5 lần. Bỏ nốt bộ đệm là quay về thông dịch thuần — ' +
               'hàng trăm lần, đúng như bảng ở đầu bài.</p>' },

          { t: 'cal', kind: 'warn', title: 'Đừng dùng con số 2,35 lần để dự đoán tốc độ board',
            x: '<p><code>loop.c</code> là mã thuần tính toán trên thanh ghi — trường hợp ' +
               '<b>thuận lợi nhất</b> cho TCG. Chương trình chạm nhiều vào bộ nhớ, gọi nhiều ' +
               'syscall, hay chạy trong system-mode sẽ tệ hơn hẳn.</p>' +
               '<p>Và câu hỏi mà con số này <i>không</i> trả lời: một Cortex-A53 1,2 GHz thật ' +
               'trên board nhúng chạy nhanh cỡ nào. Bạn đang đo tốc độ của CPU x86 đời mới đang ' +
               'mô phỏng ARM64, không phải tốc độ của ARM64 thật. Dùng QEMU để kiểm <b>tính ' +
               'đúng</b>; muốn số liệu hiệu năng thì phải đo trên phần cứng.</p>' }
        ]},

      /* ── BƯỚC 6 ── */
      { title: 'Chứng minh bộ đệm thật sự được dùng lại',
        blocks: [
          { t: 'p', x:
            'Còn một điều chưa được chứng minh trực tiếp: mỗi khối đã dịch có thật sự chạy lại ' +
            'nhiều lần không? Mục <code>exec</code> in ra <b>mỗi lần một khối được thực thi</b> — ' +
            'khác hẳn <code>in_asm</code>, vốn chỉ in lúc dịch. Cần kèm <code>nochain</code>, vì ' +
            'khối đã nối thẳng vào nhau thì không quay về vòng điều phối nên không có gì để ghi.' },

          { t: 'code', where: 'wsl', code:
            'qemu-aarch64 -d exec,nochain -D exec.log ./tiny_arm64 > /dev/null\n' +
            'stat -c %s exec.log\n' +
            'grep -c \'^Trace\' exec.log\n' +
            'grep -oE \'/[0-9a-f]{16}/\' exec.log | sort -u | wc -l' },

          { t: 'code', where: 'out', nocopy: true, code:
            '3326813\n' +
            '33526\n' +
            '1102' },

          { t: 'p', x:
            'Ba con số này là toàn bộ luận điểm của bài, viết ra thành số:' },

          { t: 'table',
            head: ['Con số', 'Nghĩa', 'Rút ra được gì'],
            rows: [
              ['<b>1 102</b>', 'Số khối <i>khác nhau</i> được chạy — cũng là số lần TCG phải dịch',
               'Chi phí dịch chỉ phải trả 1 102 lần'],
              ['<b>33 526</b>', 'Tổng số lần một khối được thực thi',
               'Đây mới là khối lượng công việc thật'],
              ['<b>30,4</b>', '33 526 ÷ 1 102 — số lần trung bình mỗi khối được chạy lại',
               'Bộ đệm tiết kiệm được 96,7 % công dịch, <b>với một chương trình chỉ in một dòng</b>']
            ]},

          { t: 'cal', kind: 'why', title: 'Vì sao đây là kết luận quan trọng nhất của bài',
            x: '<p>30,4 lần đã là nhiều — mà <code>tiny_arm64</code> chỉ in một dòng rồi thoát. ' +
               'Với <code>loop_arm64</code>, QEMU dịch <b>1 175</b> khối rồi chạy chúng ' +
               '<b>200 triệu</b> vòng. Tỉ lệ tái sử dụng lúc đó lên tới hàng trăm nghìn lần một ' +
               'khối, và chi phí dịch tan biến hoàn toàn trong tổng thời gian.</p>' +
               '<p>Đó là câu trả lời cho "vì sao mô phỏng chậm nhưng vẫn đủ dùng": <b>chi phí ' +
               'dịch tỉ lệ với kích thước mã, còn lợi ích tỉ lệ với thời gian chạy.</b> Nhân ' +
               'Linux mà bạn sẽ boot ở Bài 32 có hàng triệu lệnh, nhưng nó chạy hàng tỉ lệnh — ' +
               'nên nó boot được trong vài chục giây thay vì vài giờ.</p>' +
               '<p>Con số <b>1 175</b> khối của <code>loop_arm64</code> ở trên là số đã đo sẵn, ' +
               'không lặp lại phép đo trực tiếp trong bài này; muốn tự kiểm chứng, chạy lại đúng ' +
               'ba lệnh ở đầu bước 6 nhưng đổi <code>tiny_arm64</code> thành <code>loop_arm64</code> ' +
               '(chờ lâu hơn và ra file log lớn hơn nhiều, vì vòng lặp chạy 200 triệu bước).</p>' },

          { t: 'p', x:
            'Nhật ký <code>exec</code> ngốn <b>3,3 MB</b> cho một chương trình in một dòng. Dọn ' +
            'sạch trước khi sang bài sau:' },

          { t: 'code', where: 'wsl', code:
            'rm -f ~/bai29/*.log ~/bai29/first_tb.bin\n' +
            'ls ~/bai29' },

          { t: 'code', where: 'out', nocopy: true, code:
            'loop.c  loop_arm64  loop_x86  tiny.c  tiny_arm64' },

          { t: 'cal', kind: 'danger', title: 'Đừng bao giờ bật -d exec trên một guest chạy lâu',
            x: '<p>3,3 MB cho một chương trình sống vài mili-giây. Một nhân Linux đang boot sẽ ' +
               'sinh <b>hàng chục gigabyte</b> trong vòng vài giây và làm đầy ổ đĩa. Nếu buộc ' +
               'phải dùng, hãy ghi vào <code>/tmp</code>, đặt hẹn giờ tắt, và theo dõi ' +
               '<code>df -h</code> ở một cửa sổ khác.</p>' +
               '<p>Với việc gỡ lỗi thật, gần như luôn có công cụ tốt hơn: <code>-d int</code> chỉ ' +
               'ghi ngắt và ngoại lệ, <code>-d guest_errors</code> chỉ ghi khi guest làm điều ' +
               'không hợp lệ, còn <code>-s -S</code> cho phép gắn GDB vào — Bài 31 sẽ dùng tới ' +
               'cả ba.</p>' }
        ]}
    ]},

    /* ══════════════════════════════════════════════
       8. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['Nhật ký in <code>OBJD-T:</code> kèm byte hex thay vì assembly',
         'Bản QEMU của Ubuntu không liên kết thư viện giải mã lệnh, nên nó xuất byte thô để bạn nhờ <code>objdump</code>',
         'Không phải lỗi. Trích hex rồi <code>xxd -r -p | aarch64-linux-gnu-objdump -D -b binary -m aarch64</code> như ở bước 2'],
        ['Assembly giải mã ra có thừa vài lệnh lạ ở cuối',
         'Nhãn <code>IN: _start</code> xuất hiện <b>hai lần</b> trong nhật ký; lệnh trích đã dán byte của hai khối vào nhau',
         'Dừng ở dòng trống đầu tiên: thêm <code>f&amp;&amp;/^$/{exit}</code> vào lệnh <code>awk</code>'],
        ['Phép đo <code>time</code> cho ra số vô lý khi bật <code>-d</code>',
         'Không có <code>-D</code>, nhật ký đổ ra stderr và bị trộn vào đường ống của <code>grep real</code>',
         'Thêm <code>2>/dev/null</code> khi chỉ cần đo, hoặc <code>-D file.log</code> khi cần giữ nhật ký. Đừng làm cả hai lúc đang đo — ghi file cũng tốn thời gian'],
        ['<code>qemu-system-aarch64</code> chạy mãi không in gì, không thoát',
         'Không có <code>-kernel</code> thì máy ảo vẫn khởi động và quay vòng ở vùng flash rỗng. Không có gì dừng nó lại',
         'Thoát bằng <kbd>Ctrl</kbd>+<kbd>A</kbd> rồi <kbd>X</kbd> khi dùng <code>-nographic</code>. Khi viết script, luôn bọc bằng <code>timeout 30 qemu-system-aarch64 …</code>'],
        ['<code>qemu-aarch64: command not found</code>',
         'Chưa cài gói <code>qemu-user</code> — Bài 27 mới là chỗ cài nó',
         '<code>sudo apt install -y qemu-user</code>'],
        ['<code>./loop_arm64: No such file or directory</code> dù file rõ ràng tồn tại',
         'Bản dựng động cần trình nạp <code>/lib/ld-linux-aarch64.so.1</code> mà máy build không có',
         'Trong bài này hãy dựng bằng <code>-static</code>. Cách khác: <code>-L /usr/aarch64-linux-gnu</code> hoặc <code>QEMU_LD_PREFIX</code>, như Bài 27'],
        ['Ổ đĩa đầy sau khi bật <code>-d exec</code>',
         '<code>exec</code> ghi một dòng cho <b>mỗi lần</b> khối được chạy — 3,3 MB cho một chương trình in một dòng',
         'Xoá nhật ký, và chỉ dùng <code>exec</code> với chương trình sống rất ngắn. Với guest chạy lâu, dùng <code>-d int</code> hoặc <code>-d guest_errors</code>'],
        ['Số khối đếm được khác con số trong bài vài đơn vị',
         'Biến môi trường, đường dẫn thư mục và nội dung ngăn xếp khởi đầu khác nhau giữa các máy',
         'Bình thường. Điều cần khớp là <b>bậc độ lớn</b> (khoảng một nghìn khối) và <b>tỉ lệ</b> giữa các phép đo, không phải từng con số tuyệt đối']
      ]},

    /* ══════════════════════════════════════════════
       9. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', items: [
      '<b>TCG</b> là bộ <b>dịch động</b>: chỉ dịch đoạn mã thật sự chạy tới, dịch một lần, lưu lại dùng lại. Không phải thông dịch, cũng không phải dịch tĩnh.',
      'Dịch qua <b>ba giai đoạn</b>: frontend (guest → IR), tối ưu IR, backend (IR → host). Tầng IR ở giữa biến bài toán <b>N×M</b> thành <b>N+M</b> — đó là lý do QEMU hỗ trợ nổi từng ấy kiến trúc.',
      'In ra được cả ba bằng <code>-d in_asm</code>, <code>-d op</code>, <code>-d out_asm</code>. Bản QEMU của Ubuntu xuất byte thô <code>OBJD-T</code>, giải mã bằng <code>objdump -D -b binary -m aarch64</code>.',
      'Đơn vị làm việc là <b>translation block</b>, kết thúc khi gặp lệnh rẽ nhánh, chạm biên trang, gặp lệnh cần hàm trợ giúp, hoặc đủ dài. Khối đầu của <code>tiny_arm64</code> dài <b>12 lệnh / 48 byte</b>, dừng đúng ở lệnh <code>bl</code>.',
      'Mã host phình <b>3,48 lần</b> so với mã guest (167 byte cho 48 byte) vì thanh ghi guest nằm trong bộ nhớ và ngữ nghĩa kiến trúc phải viết ra bằng tay.',
      'Ba cơ chế giữ tốc độ, đo được từng cái: TCG đầy đủ chậm <b>2,35 lần</b> so với native; tắt nối khối thành <b>9,83 lần</b>; ép một lệnh mỗi khối thành <b>81,5 lần</b>. Riêng <b>nối khối đáng giá 4,18 lần</b>.',
      'Bộ đệm hiệu quả vì mã được dùng lại: <code>tiny_arm64</code> chạy <b>33 526</b> lượt khối trên <b>1 102</b> khối khác nhau — trung bình <b>30,4 lần</b> mỗi khối. Chi phí dịch tỉ lệ với <i>kích thước mã</i>, lợi ích tỉ lệ với <i>thời gian chạy</i>.',
      '<code>qemu-user</code> và <code>qemu-system</code> dùng chung bộ dịch, khác nhau ở phần bao quanh: user-mode chuyển tiếp syscall sang nhân host và không có thiết bị nào; system-mode tự lo <b>softmmu</b>, ngắt và toàn bộ thiết bị.',
      '<b>KVM không cứu được bạn.</b> KVM chạy mã guest thẳng trên CPU thật, nên chỉ dùng được khi guest và host <b>cùng kiến trúc</b>. ARM64 trên x86 luôn phải dịch — <code>-accel help</code> trả về đúng một dòng: <code>tcg</code>.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: '<p>Bài 29 nói về <b>CPU</b> ảo. Bài 30 nói về <b>cái máy</b> quanh nó: machine ' +
         '<code>virt</code> của ARM64. Bạn sẽ bắt QEMU khai ra bản đồ bộ nhớ của chính nó bằng ' +
         '<code>-machine dumpdtb</code>, đọc được rằng UART nằm ở <code>0x09000000</code>, RAM ' +
         'bắt đầu ở <code>0x40000000</code>, và có <b>32</b> khe virtio luôn hiện diện dù bạn ' +
         'không cắm thiết bị nào.</p>' +
         '<p>Rồi bạn sẽ <b>dùng</b> bản đồ ấy: viết một chương trình ARM64 chỉ mười mấy lệnh, ' +
         'không thư viện, không hệ điều hành, ghi thẳng từng ký tự vào <code>0x09000000</code> — ' +
         'và nhìn nó in ra màn hình. Đó là chương trình bare-metal đầu tiên của bạn, và cũng là ' +
         'thứ chứng minh rằng bản đồ bộ nhớ không phải lý thuyết suông.</p>' }

  ],

  quiz: [
    {
      q: 'Vì sao TCG dịch qua một tầng trung gian thay vì dịch thẳng từ ARM64 sang x86-64?',
      opts: [
        'Vì dịch thẳng sẽ sinh ra mã chạy chậm hơn',
        'Vì tầng trung gian biến bài toán N guest × M host thành N frontend + M backend — thêm một kiến trúc không phải viết lại cho từng cặp',
        'Vì tầng trung gian cho phép chạy mã guest mà không cần dịch',
        'Vì chuẩn ELF yêu cầu như vậy'
      ],
      a: 1,
      why: 'Đây là bài toán tổ hợp thuần tuý. QEMU hỗ trợ khoảng hai mươi kiến trúc guest và gần chục kiến trúc host; dịch thẳng từng cặp sẽ là <b>160</b> bộ dịch phải viết và bảo trì, còn qua IR chỉ là <b>28</b>. Chất lượng mã sinh ra không phải lý do — nếu có thì tầng trung gian còn làm mã hơi kém đi một chút, và đó là cái giá QEMU sẵn sàng trả.'
    },
    {
      q: 'Bạn chạy <code>qemu-aarch64 -d in_asm -D tb.log ./prog</code> và đếm được 1 096 khối. Rồi chạy <code>-d exec,nochain</code> và đếm được 33 526 dòng <code>Trace</code>. Chênh lệch này nói lên điều gì?',
      opts: [
        'Nhật ký <code>exec</code> bị lặp do lỗi ghi file',
        'QEMU đã dịch lại mỗi khối khoảng 30 lần vì bộ đệm quá nhỏ',
        'Mỗi khối được <b>chạy lại</b> trung bình khoảng 30 lần, trong khi chỉ phải <b>dịch</b> một lần — đó chính là lợi ích của bộ đệm',
        'Chương trình có 33 526 lệnh ARM64'
      ],
      a: 2,
      why: 'Hai mục nhật ký đo hai việc khác nhau, và đó là toàn bộ ý nghĩa của phép so sánh. <code>in_asm</code> in <b>lúc dịch</b>, nên số dòng của nó là số khối khác nhau. <code>exec</code> in <b>mỗi lần chạy</b>, nên số dòng của nó là khối lượng công việc thật. Tỉ số 33 526 ÷ 1 102 ≈ <b>30,4</b> là số lần tái sử dụng trung bình. Nếu bộ đệm hỏng và QEMU phải dịch lại thật, số dòng <code>in_asm</code> mới là thứ tăng lên, chứ không phải <code>exec</code>.'
    },
    {
      q: 'Máy bạn có <code>/dev/kvm</code> với quyền đầy đủ, nhưng <code>qemu-system-aarch64 -accel help</code> chỉ liệt kê <code>tcg</code>. Kết luận đúng là gì?',
      opts: [
        'Cần chạy QEMU bằng <code>sudo</code> để thấy KVM',
        'Cần bật ảo hoá lồng nhau trong BIOS',
        'CPU x86 không giải mã được lệnh ARM64, nên KVM — vốn chạy mã guest thẳng trên CPU thật — không áp dụng được. Không cấu hình nào đổi được điều này',
        'Bản QEMU trong kho Ubuntu bị biên dịch thiếu KVM; build lại từ mã nguồn sẽ có'
      ],
      a: 2,
      why: 'KVM không phải bộ tăng tốc chung chung mà là cửa vào tính năng ảo hoá của <b>chính CPU vật lý</b>. Tính năng đó chỉ hoạt động khi mã guest là mã CPU đó vốn đã hiểu. <code>/dev/kvm</code> vẫn tồn tại vì nhân host tạo ra nó cho guest x86 — nó nằm đó chờ một guest khác. Không có quyền hạn, thiết lập BIOS hay bản build nào đổi được sự thật rằng CPU x86 không đọc được lệnh ARM64.'
    },
    {
      q: 'Bạn đo <code>loop_arm64</code>: bình thường 0,612 s, với <code>-d nochain</code> là 2,557 s. Cơ chế nào bị tắt và nó làm gì?',
      opts: [
        'Bộ đệm khối bị tắt, nên QEMU phải dịch lại mỗi khối mỗi lần chạy',
        '<b>Nối khối</b> bị tắt. Bộ đệm vẫn còn, nhưng sau mỗi khối QEMU phải quay về vòng điều phối và tra bảng băm thay vì nhảy thẳng vào khối kế',
        'Tối ưu IR bị tắt, nên mã host sinh ra kém hơn',
        'MTTCG bị tắt, nên chỉ còn một luồng chạy'
      ],
      a: 1,
      why: 'Bình thường QEMU <b>vá thẳng mã máy ở đuôi khối A</b> thành lệnh nhảy tới khối B khi B đã có trong bộ đệm; từ lần thứ hai trở đi A rơi thẳng vào B. <code>nochain</code> bỏ bước vá đó — nó sinh ra để nhật ký <code>exec</code> thấy được toàn bộ đường chạy, nhưng nhờ vậy nó cũng thành dụng cụ đo. Bộ đệm vẫn nguyên vẹn: nếu bộ đệm bị tắt thật, con số sẽ tệ hơn hàng chục lần chứ không phải 4,18.'
    },
    {
      q: 'Một chương trình cross-compile cho ARM64 chạy hoàn hảo dưới <code>qemu-aarch64</code> trên WSL, nhưng chép lên board thật thì gọi <code>ioctl</code> nào cũng trả <code>ENOTTY</code>. Chẩn đoán nào hợp lý nhất?',
      opts: [
        'TCG dịch sai lệnh ARM64 nên tham số truyền vào bị hỏng',
        'Cần dựng lại bằng <code>-static</code> để chương trình chạy được trên board',
        '<code>qemu-user</code> chuyển tiếp syscall sang nhân của <b>host</b>, nên chương trình đã nói chuyện với nhân WSL và thiết bị của WSL — không phải với nhân và thiết bị của board',
        'Board dùng thứ tự byte khác nên tham số <code>ioctl</code> bị đảo'
      ],
      a: 2,
      why: 'Đây là giới hạn cốt lõi của user-mode: nó mô phỏng <b>tập lệnh</b>, không mô phỏng <b>hệ thống</b>. Mọi syscall được chuyển tiếp sang nhân Linux của WSL, nên chương trình thấy <code>/dev</code> của WSL và các tính năng nhân của WSL. Board có nhân khác, driver khác, cây thiết bị khác. Quy tắc rút ra: <b>user-mode kiểm mã của bạn, system-mode kiểm hệ thống của bạn</b> — và chỉ system-mode mới có thiết bị mô phỏng để một <code>ioctl</code> có nghĩa.'
    },
    {
      q: 'Trong bản dump <code>-d op</code>, một lệnh <code>ldr x1, [sp]</code> duy nhất sinh ra <b>năm</b> thao tác TCG, còn <code>mov x29, #0x0</code> chỉ sinh ra một. Vì sao?',
      opts: [
        'Vì <code>ldr</code> là lệnh dài hơn nên cần nhiều thao tác hơn để giải mã',
        'Vì tầng tối ưu chưa chạy; sau <code>-d op_opt</code> cả hai đều còn một thao tác',
        'Vì ARM64 cho phép nhét thẻ vào 8 bit cao của con trỏ, nên QEMU phải viết ra bằng thao tác dịch bit trước khi truy cập bộ nhớ — ngữ nghĩa mà phần cứng làm miễn phí thì phần mềm phải làm bằng tay',
        'Vì mỗi lần truy cập bộ nhớ đều phải gọi một hàm trợ giúp viết bằng C'
      ],
      a: 2,
      why: 'Bốn thao tác đầu (<code>mov_i64</code>, <code>shl_i64</code>, <code>sar_i64</code>, <code>and_i64</code>) là cách gọn nhất để xoá 8 bit cao của địa chỉ — đặc tính <i>top-byte-ignore</i> mà CPU ARM64 thật xử lý bằng mạch, không tốn chu kỳ nào. Thao tác thứ năm mới là lệnh đọc thật. Đây là ví dụ điển hình cho câu "mô phỏng chậm hơn ở đâu": lệnh số học gần như một đổi một, còn lệnh mang ngữ nghĩa riêng của kiến trúc thì đắt hơn hẳn. Tối ưu IR không xoá được chúng vì chúng cần thiết cho tính đúng, và <code>qemu_ld_i64</code> là thao tác TCG chứ chưa phải lời gọi hàm C.'
    }
  ]
});

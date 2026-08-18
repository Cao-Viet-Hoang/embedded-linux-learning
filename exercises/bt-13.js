/* ═══════════════════════════════════════════════════════════════════════════
   BÀI TẬP 13 — Bash script
   Cặp với lessons/bai-13.js · Chặng 01 · Linux căn bản

   ───────────────────────────────────────────────────────────────────────────
   §13.4 · KIỂM TOÁN CHỌN TRỤC — làm trước khi viết câu nào

   Bước 1 · Kiểm kê (17 ứng viên rút từ goals, h2/h3, cal kind:'why', cmdx,
   terms, recap của bài 13):
     shebang & chọn trình thông dịch · dấu nháy quanh "$x" · mã trả về $? ·
     [ là một lệnh · if kiểm tra thành công chứ không kiểm tra đúng/sai ·
     bẫy [ "$x" > 10 ] · hàm và $1 "$@" "$*" · local · return so với exit ·
     set -e · set -u · pipefail · here-doc <<EOF so với <<'EOF' · trap EXIT ·
     mktemp -d · ./ so với bash so với source · case và vòng lặp

   Bước 2 · Chấm điểm (phụ thuộc về sau / giá của ngộ nhận / phản trực giác):

     ỨNG VIÊN                                    PT  GIÁ  PTG  TỔNG
     shebang: sh file BỎ QUA shebang              2    2    2     6   ← trục 0
     set -e ngoảnh mặt trong ngữ cảnh kiểm tra    2    2    2     6   ← trục 1
     hàm trả về TRẠNG THÁI, không phải giá trị    1    2    2     5   ← trục 2
     dấu nháy quanh "$x"                          2    2    1     5   ✗ bước 4
     mã trả về $? / 0 là thành công               2    2    1     5   ✗ bước 4
     [ là một lệnh, không phải cú pháp            1    1    2     4   ✗ bước 4
     pipefail                                     1    2    2     5   ✗ xếp sau
     here-doc <<EOF so với <<'EOF'                2    2    1     5   ✗ xếp sau
     set -u                                       1    2    1     4   ✗ xếp sau
     bẫy [ "$x" > 10 ]                            0    2    2     4   ✗ xếp sau
     trap EXIT + mktemp -d                        1    1    1     3   ✗ cắt
     local                                        1    1    1     3   ✗ cắt
     ./ so với bash so với source                 1    1    1     3   ✗ cắt
     return so với exit                           1    1    1     3   ✗ cắt
     hàm và "$@" so với "$*"                      1    1    1     3   ✗ cắt
     case và vòng lặp                             0    0    0     0   ✗ cắt
     if kiểm tra thành công/thất bại              1    1    1     3   ✗ cắt

   Bước 3 · Cắt: ngưỡng ≥ 4 tổng và ≥ 2 trục con ≥ 1. Ba ứng viên đầu bảng
   đều đạt và đều ≥ 5 → lấy đúng ba.

   Bước 4 · Loại (§13.4 bước 4 — một khái niệm chỉ được xoáy MỘT lần trong cả
   khoá học). Ba ứng viên điểm cao bị loại vì đã là trục của bt-04:
     · dấu nháy quanh "$x"  ⊂ bt-04 "shell tách từ theo khoảng trắng TRƯỚC khi
       lệnh nhìn thấy tham số" — cùng một cơ chế, chỉ khác vỏ. → về phần D và
       các câu bề rộng (a7, b6, e5).
     · mã trả về $?         ⊂ bt-04 "$? là câu trả lời duy nhất của máy cho
       câu hỏi 'chạy được không'". → phần D, a4.
     · [ là một lệnh        ⊂ bt-04 "lệnh dựng sẵn không phải là một file trên
       đĩa". → a3, d3.
   CHỖ SUÝT TRÙNG — ghi lại để lần sau khỏi phải suy lại: "dấu nháy" là ứng
   viên hiển nhiên nhất của bài 13 (chính bài viết "nơi 90 % lỗi script sinh
   ra") và nó vẫn KHÔNG được làm trục. Sức hút của nó là lý do §13.4 bước 4
   tồn tại.

   Bước 5 · Phát biểu mỗi trục thành một câu có thể sai:
     0 · Dòng shebang chỉ có hiệu lực khi kernel là bên khởi chạy file; gọi
         `sh file` thì shebang bị bỏ qua hoàn toàn và file chạy bằng dash.
     1 · set -e cố ý ngoảnh mặt khi lệnh thất bại nằm trong một ngữ cảnh đang
         được kiểm tra (if, while, vế trái &&/||, sau !, khâu không cuối của
         đường ống).
     2 · return của một hàm bash đặt MÃ TRẠNG THÁI chứ không trả về giá trị;
         muốn có giá trị thì hàm phải echo ra và người gọi phải bắt bằng $( ).

   Bước 6 · Ngộ nhận đối lập (lái distractor ở A, câu bắt lỗi ở B, kiểu hỏng ở C):
     0 · "sh và bash là một; shebang luôn quyết định."
     1 · "Có set -e thì script không thể chạy tiếp sau một lệnh lỗi."
     2 · "return 5 nghĩa là hàm trả về số 5, gán được vào biến."

   Bước 7 · Lưới 3 × 1 và kiểm tra:
     trục 0 → A1 (phát biểu)   B1 (transcript sh dbl.sh / sh arr.sh)  C1 (BusyBox trên bo mạch)
     trục 1 → A2 (phát biểu)   B2 (transcript bốn ngữ cảnh)           C2 (CI xanh, artefact rỗng)
     trục 2 → A5 (đúng/sai)    B3 (giải thích cơ chế)                 C3 (hàm kiểm tra dung lượng)
     · C1/C2/C3 đều KHÔNG trả lời được nếu không nắm trục — mỗi câu buộc phải
       quyết định trên một ràng buộc không có trong bài.
     · Ba mức dùng ba loại kích thích khác nhau: phát biểu / dữ liệu thật /
       tình huống có ràng buộc. Không mức nào lặp từ vựng của mức kia.

   ───────────────────────────────────────────────────────────────────────────
   §13.8 · ĐỐI CHIẾU TRỤC ĐÃ TIÊU — không trục nào dưới đây được lặp lại:
     bt-04 shell tách từ trước khi lệnh thấy tham số · $? · builtin ≠ file
     bt-09 kill là lời đề nghị · load average là số đếm · jobs là sổ của shell
     bt-10 đường ống chỉ mang fd 1 · không phải lệnh nào cũng đọc stdin ·
           giá thật của file tạm là byte ghi xuống đĩa
     bt-11 uniq chỉ so với dòng liền trước · sed -i thay inode · BRE đổi nghĩa
     bt-12 chỉ mục là bản chụp trên đĩa · bao đóng phụ thuộc là giá thật ·
           .deb là thứ phái sinh
   Ba trục của bt-13 nằm ngoài toàn bộ danh sách trên.

   ───────────────────────────────────────────────────────────────────────────
   MỌI LỆNH VÀ MỌI KẾT QUẢ TRONG FILE NÀY ĐỀU ĐÃ CHẠY THẬT trên WSL2 Ubuntu
   26.04 "resolute" của người dùng, ngày 18/08/2026. Bốn điều đo được nằm
   ngoài dự đoán và đã được điều tra trước khi dùng (§2 quy tắc 2):

   1 · `sh dbl.sh` in ra `dbl.sh: 3: [[: not found` rồi VẪN chạy tiếp và thoát
       với mã 0. Câu `if` hỏng không làm script hỏng — dash coi `[[` là một
       lệnh không tồn tại, câu `if` nhận mã khác 0 nên nhánh `then` bị bỏ, và
       script đi tiếp như không có gì. Đây là kiểu hỏng IM LẶNG, nên nó thành
       B1 chứ không phải một câu phụ.
   2 · `sh arr.sh` in `line 1 ran` TRƯỚC khi báo lỗi cú pháp ở dòng 3. dash
       phân tích và thực thi theo từng lệnh chứ không phân tích trọn file
       trước — khác hẳn thói quen từ ngôn ngữ biên dịch. Ghi vào B1.
   3 · Script mắc lỗi "dùng return làm giá trị" mà có `set -e` thì không in ra
       gì cả và thoát với mã BẰNG ĐÚNG số file .c: 3 file → mã 3, 4 file →
       mã 4. Lý do: `n=$(ham)` lấy mã thoát của thay thế lệnh làm mã của phép
       gán, `set -e` thấy khác 0 và giết script ngay tại dòng đó. Đo lại với
       4 file để xác nhận đúng là quan hệ nhân quả chứ không phải trùng hợp.
       Đây là lõi của e5.
   4 · Khuyết tật "quên local" KHÔNG hiện ra trong script gốc, vì hàm được gọi
       qua `$( )` — tức là trong một SUBSHELL, nên biến toàn cục của người gọi
       không hề bị chạm (`i` vẫn là 99). Gọi thẳng cùng hàm đó thì `i` bị đè
       thành 3 ngay. Đã đo cả ba biến thể trước khi viết e5.
   ═══════════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-13',
  minutes: 90,

  intro:
    '<p>Bài 13 khép lại Chặng 01. Từ đây bạn không còn <i>dùng</i> Linux nữa — bạn ' +
    '<b>lập trình</b> nó, và mọi thứ còn lại của khoá học đều đi qua script: build kernel, ' +
    'dựng rootfs, chạy QEMU, kiểm thử trên bo mạch. Vì vậy bộ bài tập này không hỏi bạn nhớ ' +
    'được bao nhiêu cú pháp. Nó hỏi một câu khác: <b>khi script chạy sai mà không báo lỗi, ' +
    'bạn có nhận ra không?</b></p>' +

    '<p>Ba trục xoáy của bộ này đều là kiểu hỏng im lặng, và cả ba đều có bằng chứng chạy ' +
    'thật kèm theo. Trục thứ nhất: <b>dòng shebang không phải lúc nào cũng có hiệu lực</b> — ' +
    'gõ <code>sh script.sh</code> là nó bị bỏ qua sạch, script chạy bằng <code>dash</code>, ' +
    'và bạn sẽ thấy một script như thế thoát với mã <b>0</b> trong khi câu <code>if</code> ' +
    'của nó chưa từng chạy. Trục thứ hai: <b><code>set -e</code> cố ý ngoảnh mặt</b> trong ' +
    'những ngữ cảnh mà lỗi <i>đang được hỏi tới</i> — biết chính xác chỗ nào nó nhìn và chỗ ' +
    'nào nó không nhìn là khác biệt giữa một script build đáng tin và một script chỉ <i>trông ' +
    'có vẻ</i> đáng tin. Trục thứ ba: <b>hàm bash trả về trạng thái, không trả về giá trị</b> ' +
    '— và bạn sẽ gặp một script mắc lỗi này thoát với mã bằng đúng số file nguồn của nó, ' +
    'không in một chữ nào.</p>' +

    '<p><b>Một lời cảnh báo thật, không phải tình huống giả định.</b> Phần B có một script ' +
    'chỉ khác script gốc đúng một chữ cái trong tên biến. Bạn sẽ thấy tận mắt dòng lệnh mà nó ' +
    'suýt thực hiện. Trong bộ bài tập này nó đã được <b>vô hiệu hoá</b> — thay ' +
    '<code>rm</code> bằng <code>echo</code> — nên chạy thử hoàn toàn an toàn. ' +
    '<b>Đừng bao giờ tự bỏ chữ <code>echo</code> đó ra để "xem thử".</b> Câu ' +
    '<b>E4</b> dạy bạn cách viết một hàm dọn dẹp mà lỗi ấy <i>không thể</i> xảy ra.</p>' +

    '<p>Chia làm hai lượt như mọi bộ trước. <b>Lượt 1</b> — ngay sau khi đọc xong bài: phần ' +
    '<b>A</b> và <b>B</b>, khoảng 25 phút. <b>Lượt 2</b> — sau 2–3 ngày, khi đã quên bớt: ' +
    'phần <b>C</b>, <b>D</b> và <b>E</b>, khoảng 65 phút. Khoảng cách giữa hai lượt là thành ' +
    'phần có tác dụng, không phải chỗ để rút ngắn.</p>',

  truc: [
    { id: 'shebang-chi-hieu-luc-khi-kernel-khoi-chay',
      name: 'Shebang chỉ có hiệu lực khi kernel là bên khởi chạy',
      x: 'Dòng <code>#!/bin/bash</code> được <b>kernel</b> đọc, và chỉ khi kernel là bên ' +
         'khởi chạy file — tức khi bạn gõ <code>./script.sh</code>. Gõ ' +
         '<code>sh script.sh</code> thì bạn đang khởi chạy <code>sh</code> và đưa file cho ' +
         'nó như một tham số; shebang lúc đó chỉ là một dòng chú thích, và file chạy bằng ' +
         '<code>dash</code>.',
      mis: 'sh và bash là một; đã có shebang thì script luôn chạy bằng bash.' },

    { id: 'set-e-ngoanh-mat-trong-ngu-canh-kiem-tra',
      name: 'set -e cố ý ngoảnh mặt trong ngữ cảnh đang được kiểm tra',
      x: '<code>set -e</code> <b>không</b> dừng script khi lệnh thất bại nằm ở nơi mà mã trả ' +
         'về của nó <i>đang được hỏi tới</i>: điều kiện của <code>if</code>/<code>while</code>, ' +
         'vế trái của <code>&amp;&amp;</code> hay <code>||</code>, sau <code>!</code>, và mọi ' +
         'khâu không phải khâu cuối của một đường ống. Đó là thiết kế có chủ đích, không phải ' +
         'lỗi.',
      mis: 'Có set -e thì script không thể chạy tiếp sau một lệnh lỗi.' },

    { id: 'ham-tra-ve-trang-thai-khong-tra-ve-gia-tri',
      name: 'Hàm bash trả về trạng thái, không trả về giá trị',
      x: '<code>return N</code> đặt <b>mã trạng thái</b> của hàm, đọc bằng <code>$?</code>, ' +
         'giới hạn 0–255 và bị lấy dư 256. Nó <b>không</b> trả về một giá trị: ' +
         '<code>n=$(ham)</code> bắt lấy <i>đầu ra</i> của hàm, nên với một hàm chỉ ' +
         '<code>return</code> thì <code>n</code> là chuỗi rỗng. Muốn trả giá trị thì hàm phải ' +
         '<code>echo</code> ra.',
      mis: 'return 5 nghĩa là hàm trả về số 5, gán được vào biến.' },
  ],

  /* ═══ A · Nhận biết — 4 trắc nghiệm + 2 đúng/sai + 1 điền khuyết + 1 ghép ══ */
  A: [
    { id: 'a1', k: 'mcq', truc: 0, tag: 'Trắc nghiệm nhanh',
      q: 'File <code>build.sh</code> có dòng đầu là <code>#!/bin/bash</code> và đã được ' +
         '<code>chmod +x</code>. Trong <b>bốn</b> cách gọi dưới đây, cách nào khiến dòng ' +
         'shebang <b>bị bỏ qua hoàn toàn</b>?',
      opts: [
        '<code>./build.sh</code>',
        '<code>sh build.sh</code>',
        '<code>bash ./build.sh</code>',
        '<code>exec ./build.sh</code>'
      ],
      a: 1,
      why: 'Shebang là thoả thuận giữa <b>kernel</b> và file. Nó chỉ có hiệu lực khi kernel ' +
           'là bên khởi chạy file — tức khi tên file <i>chính là</i> lệnh: ' +
           '<code>./build.sh</code> và <code>exec ./build.sh</code>. Với ' +
           '<code>sh build.sh</code> thì lệnh là <code>sh</code>, còn <code>build.sh</code> ' +
           'chỉ là một tham số; <code>sh</code> mở file ra đọc và coi dòng ' +
           '<code>#!/bin/bash</code> là một dòng bắt đầu bằng <code>#</code>, tức chú thích. ' +
           'Trên máy này <code>/bin/sh</code> trỏ tới <code>dash</code>, nên script chạy bằng ' +
           'dash bất kể shebang viết gì. <code>bash ./build.sh</code> cũng bỏ qua shebang, ' +
           'nhưng vô hại ở đây vì nó chạy đúng cái shell mà shebang yêu cầu.' },

    { id: 'a2', k: 'mcq', truc: 1, tag: 'Trắc nghiệm nhanh',
      q: 'Một script bắt đầu bằng <code>set -e</code>. Hàm <code>check()</code> luôn trả về ' +
         'mã <b>1</b>. Dòng nào dưới đây khiến script <b>dừng lại ngay</b>?',
      opts: [
        '<code>if check; then echo ok; fi</code>',
        '<code>check &amp;&amp; echo ok</code>',
        '<code>check | cat</code>',
        '<code>check</code>'
      ],
      a: 3,
      why: 'Chỉ lời gọi <b>trần</b> mới bị <code>set -e</code> bắt. Ba dòng còn lại đều đặt ' +
           '<code>check</code> vào một ngữ cảnh mà mã trả về của nó <i>đang được hỏi tới</i>: ' +
           'điều kiện của <code>if</code>, vế trái của <code>&amp;&amp;</code>, và khâu không ' +
           'phải khâu cuối của một đường ống. Ở những chỗ đó, thất bại là một <b>câu trả ' +
           'lời</b> chứ không phải một sự cố — nếu <code>set -e</code> giết script ở đó thì ' +
           'sẽ không viết được câu <code>if</code> nào. Đã chạy thật: ba dòng đầu in "survived", ' +
           'dòng thứ tư kết thúc script với mã 1.' },

    { id: 'a3', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Vì sao <code>[$x = 1]</code> báo <code>command not found</code> còn ' +
         '<code>[ $x = 1 ]</code> thì chạy?',
      opts: [
        'Vì bash yêu cầu khoảng trắng bên trong mọi dấu ngoặc',
        'Vì <code>[</code> là <b>tên một lệnh</b>, nên phải có khoảng trắng sau nó như sau mọi tên lệnh khác',
        'Vì không có khoảng trắng thì <code>$x</code> không được thay giá trị',
        'Vì <code>[</code> chỉ hợp lệ bên trong <code>if</code>'
      ],
      a: 1,
      why: '<code>[</code> không phải cú pháp — nó là một <b>lệnh</b>, đồng nghĩa với ' +
           '<code>test</code>. Trên máy này <code>type -a [</code> in ra ba dòng: ' +
           '<code>[ is a shell builtin</code>, <code>[ is /usr/bin/[</code>, ' +
           '<code>[ is /bin/[</code> — có hẳn một file trên đĩa. Đã là tên lệnh thì shell phải ' +
           'tách được nó ra khỏi tham số, và shell tách bằng khoảng trắng. Viết ' +
           '<code>[$x</code> thì tên lệnh trở thành <code>[3</code>, không tồn tại. Dấu ' +
           '<code>]</code> ở cuối cũng vậy: nó là <b>tham số cuối cùng</b> mà lệnh ' +
           '<code>[</code> bắt buộc phải nhận.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Một hàm kết thúc bằng <code>return 300</code>. Người gọi đọc <code>$?</code> ngay ' +
         'sau đó. Giá trị là bao nhiêu?',
      opts: ['300', '255', '44', '1'],
      a: 2,
      why: 'Mã trạng thái chỉ có <b>8 bit</b>: 0–255. Bash lấy dư 256, nên ' +
           '<code>300 − 256 = 44</code>. Đã chạy thật: <code>return 300</code> → ' +
           '<code>$?=44</code>, và <code>return -1</code> → <code>$?=255</code>. Đây là lý do ' +
           'thực dụng để <b>không bao giờ dùng <code>return</code> chở dữ liệu</b>: bất kỳ số ' +
           'nào ≥ 256 đều bị biến dạng âm thầm, và số 0 thì lại mang nghĩa "thành công" nên ' +
           'không phân biệt được với "đếm được 0 file".' },

    { id: 'a5', k: 'tf', truc: 2, tag: 'Đúng/Sai kèm sửa',
      q: 'Xét phát biểu sau:<br><br><i>"Hàm <code>dem() { return 7; }</code> trả về số 7. ' +
         'Muốn dùng số đó thì viết <code>n=$(dem)</code>, sau đó <code>$n</code> bằng 7."</i>',
      a: 1,
      rw: 'Viết lại phát biểu cho đúng, và nói rõ <code>$n</code> thật sự bằng gì.',
      why: '<b>Sai.</b> <code>return</code> đặt <b>mã trạng thái</b>, còn <code>$( )</code> ' +
           'bắt lấy <b>đầu ra chuẩn</b>. Hàm này không in gì ra cả, nên <code>n</code> là ' +
           '<b>chuỗi rỗng</b>. Số 7 nằm ở <code>$?</code>, và phải đọc ngay dòng liền sau lời ' +
           'gọi trần.',
      crit: [
        'Nói rõ <code>$n</code> là <b>chuỗi rỗng</b>, không phải 7 và cũng không phải 0',
        'Phân biệt đúng hai kênh: <code>return</code> → <code>$?</code> (trạng thái) · <code>echo</code> → <code>$( )</code> (đầu ra)',
        'Nêu cách sửa: hàm phải <code>echo 7</code> thì <code>n=$(dem)</code> mới nhận được giá trị',
        'Hoặc nêu cách còn lại: gọi trần <code>dem</code> rồi <code>n=$?</code> ở <b>dòng liền kề</b>',
        'Nêu được ít nhất một giới hạn của đường <code>return</code>: chỉ 0–255, bị lấy dư 256, và 0 đã mang nghĩa "thành công"'
      ],
      sol: '<p>Phát biểu <b>sai</b>. Bash có hai kênh hoàn toàn tách biệt để một hàm nói ' +
           'chuyện với người gọi, và câu trên trộn lẫn chúng.</p>' +
           '<p><b>Kênh trạng thái:</b> <code>return 7</code> → đọc bằng <code>$?</code>. Dùng ' +
           'để trả lời "được hay không được".<br>' +
           '<b>Kênh dữ liệu:</b> <code>echo 7</code> → bắt bằng <code>n=$(dem)</code>. Dùng ' +
           'để trả lời "bao nhiêu".</p>' +
           '<p>Hàm <code>dem() { return 7; }</code> không in gì ra, nên ' +
           '<code>n=$(dem)</code> gán cho <code>n</code> <b>chuỗi rỗng</b>. Đã chạy thật, với ' +
           'một hàm đếm file: <code>n=$(count_c)</code> cho <code>n=\'\'</code>, còn ' +
           '<code>$?</code> ngay sau lời gọi trần cho <code>3</code>.</p>' +
           '<p>Viết lại cho đúng: <i>"Hàm <code>dem() { return 7; }</code> đặt mã trạng thái ' +
           'bằng 7, đọc bằng <code>$?</code>. Muốn <code>n</code> nhận giá trị 7 thì hàm phải ' +
           'là <code>dem() { echo 7; }</code>."</i></p>' +
           '<p>Và một lý do nữa để không chở dữ liệu bằng <code>return</code>: nó chỉ có 8 ' +
           'bit (<code>return 300</code> → <code>44</code>), còn giá trị 0 thì đã bị chiếm ' +
           'nghĩa "thành công", nên "đếm được 0 file" và "chạy ổn" không phân biệt được.</p>' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Xét phát biểu sau:<br><br><i>"Chạy <code>source setup.sh</code> và chạy ' +
         '<code>./setup.sh</code> cho kết quả như nhau, chỉ khác là ' +
         '<code>source</code> không cần quyền thực thi."</i>',
      a: 1,
      rw: 'Viết lại cho đúng, và nêu <b>một</b> hệ quả quan sát được của khác biệt thật sự.',
      why: '<b>Sai.</b> Khác biệt cốt lõi không phải quyền thực thi mà là <b>tiến trình</b>: ' +
           '<code>./setup.sh</code> sinh một tiến trình con, mọi biến và mọi lần ' +
           '<code>cd</code> chết theo nó; <code>source</code> chạy <i>trong chính shell hiện ' +
           'tại</i>, nên biến và thư mục làm việc <b>ở lại</b>.',
      crit: [
        'Nêu đúng khác biệt cốt lõi: tiến trình con so với <b>chính shell hiện tại</b>',
        'Nêu một hệ quả quan sát được: biến đặt trong script <b>còn lại</b> sau <code>source</code>, <b>mất</b> sau <code>./</code>',
        'Hoặc hệ quả kia: <code>cd</code> bên trong script <b>đổi</b> thư mục của bạn sau <code>source</code>, không đổi sau <code>./</code>',
        'Nhận ra <code>$$</code> (PID) <b>không đổi</b> khi <code>source</code> — bằng chứng trực tiếp là không có tiến trình mới',
        'Nêu đúng nơi dùng <code>source</code>: nạp biến môi trường (ví dụ <code>source ~/x-tools/env.sh</code> ở Bài 28), chứ không phải để chạy một công việc'
      ],
      sol: '<p>Phát biểu <b>sai</b> — nó nêu đúng một chi tiết phụ (quyền thực thi) và bỏ ' +
           'qua toàn bộ khác biệt thật.</p>' +
           '<p>Đã chạy thật với một script đặt <code>ARCH=arm64</code> rồi <code>cd /tmp</code>:</p>',
      solBlocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '-- before: pid=304 ARCH=<unset> pwd=/tmp/bt13-scratch\n' +
          '-- ./ctx.sh\n' +
          '  inside : pid=439 ARCH=arm64 pwd=/tmp\n' +
          '   after : pid=304 ARCH=<unset> pwd=/tmp/bt13-scratch\n' +
          '-- bash ctx.sh\n' +
          '  inside : pid=441 ARCH=arm64 pwd=/tmp\n' +
          '   after : pid=304 ARCH=<unset> pwd=/tmp/bt13-scratch\n' +
          '-- source ctx.sh\n' +
          '  inside : pid=304 ARCH=arm64 pwd=/tmp\n' +
          '   after : pid=304 ARCH=arm64 pwd=/tmp' },
        { t: 'p', x: 'Cột <code>pid</code> là bằng chứng gọn nhất. Hai cách đầu sinh tiến ' +
          'trình mới (439, 441) và mọi thứ chúng làm chết theo tiến trình đó. ' +
          '<code>source</code> giữ nguyên pid <b>304</b> — không có tiến trình nào được sinh ' +
          'ra, các lệnh chạy thẳng trong shell của bạn, nên <code>ARCH</code> và thư mục làm ' +
          'việc <b>ở lại</b>.' },
        { t: 'p', x: 'Viết lại cho đúng: <i>"<code>./setup.sh</code> chạy script trong một ' +
          '<b>tiến trình con</b>, nên biến và <code>cd</code> của nó không ảnh hưởng shell ' +
          'của bạn. <code>source setup.sh</code> chạy các lệnh <b>trong chính shell hiện ' +
          'tại</b>, nên chúng ở lại. Vì thế <code>source</code> dùng để <b>nạp môi ' +
          'trường</b>, còn <code>./</code> dùng để <b>chạy một công việc</b>."</i>' },
        { t: 'cal', kind: 'tip', x: 'Đây chính là lý do Bài 28 bảo bạn ' +
          '<code>source ~/x-tools/env.sh</code> chứ không phải chạy nó bằng <code>./</code> ' +
          '— chạy bằng <code>./</code> thì <code>PATH</code> được sửa trong một tiến trình ' +
          'con rồi tiến trình đó chết ngay, và bạn không hiểu vì sao ' +
          '<code>aarch64-...-gcc</code> vẫn không tìm thấy.' }
      ] },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Biến <code>dir</code> chứa chuỗi <code>my build dir</code> (ba từ, hai khoảng ' +
         'trắng). Lệnh <code>mkdir -p $dir</code> tạo ra <b>mấy</b> thư mục?<br><br>' +
         'Điền một con số.',
      a: ['3', 'ba', '3 thư mục', 'ba thư mục'],
      ph: 'một con số',
      why: '<b>Ba.</b> Shell thay <code>$dir</code> thành <code>my build dir</code> rồi ' +
           '<b>tách từ theo khoảng trắng</b> trước khi <code>mkdir</code> được gọi. Cái mà ' +
           '<code>mkdir</code> nhìn thấy là ba tham số riêng biệt — nó tạo <code>my</code>, ' +
           '<code>build</code> và <code>dir</code>, không hề biết ba từ đó vốn là một tên. ' +
           'Đã chạy thật, <code>bash -x</code> hiện đúng chuyện đó: dòng ' +
           '<code>+ mkdir -p my build dir</code> so với <code>+ mkdir -p \'my build dir\'</code>. ' +
           'Không có thông báo lỗi nào, vì <code>mkdir</code> làm đúng việc nó được yêu cầu.' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi mã thoát với tình huống sinh ra nó. Cả sáu đều đã được đo trên máy bạn.',
      left: [
        '<code>126</code>',
        '<code>127</code>',
        '<code>2</code>',
        '<code>44</code>',
        '<code>130</code>',
        '<code>0</code>'
      ],
      right: [
        'Người dùng nhấn <kbd>Ctrl</kbd>+<kbd>C</kbd> (128 + 2)',
        'Chạy <code>sh dbl.sh</code>: dash báo <code>[[: not found</code> nhưng script vẫn đi hết tới cuối',
        'Gõ <code>./build.sh</code> khi file thiếu bit <code>x</code>, hoặc shebang trỏ tới một trình thông dịch không tồn tại',
        'Một hàm kết thúc bằng <code>return 300</code>',
        'Gõ <code>./nosuch.sh</code> khi file không tồn tại',
        'Chạy <code>sh arr.sh</code>: dash gặp cú pháp mảng của bash và bỏ cuộc'
      ],
      a: [2, 4, 5, 3, 0, 1],
      why: '<b>126 và 127 rất dễ lẫn, và khác biệt giữa chúng rất hữu dụng:</b> 127 là ' +
           '"<i>không tìm thấy</i>", 126 là "<i>tìm thấy rồi nhưng không chạy được</i>". Đã ' +
           'chạy thật cả ba nguyên nhân của 126/127: thiếu <code>+x</code> → ' +
           '<code>Permission denied</code>, mã <b>126</b>; file không tồn tại → ' +
           '<code>No such file or directory</code>, mã <b>127</b>; shebang trỏ ' +
           '<code>/bin/nosuchshell</code> → <code>bad interpreter</code>, mã <b>126</b> — ' +
           'lưu ý đúng chỗ này: thông báo nói "không tìm thấy" nhưng mã lại là 126, vì thứ ' +
           '<i>tìm thấy</i> là script còn thứ <i>thiếu</i> là trình thông dịch.<br><br>' +
           'Và hãy để ý cặp <b>0</b> với <b>2</b>: cùng là một script bash chạy bằng ' +
           '<code>sh</code>, nhưng <code>dbl.sh</code> thoát <b>0</b> (dash coi ' +
           '<code>[[</code> là một lệnh lạ, câu <code>if</code> chỉ đơn giản là sai, script đi ' +
           'tiếp) còn <code>arr.sh</code> thoát <b>2</b> (cú pháp mảng làm dash không phân ' +
           'tích nổi). Cái thoát 0 mới là cái nguy hiểm.' },
  ],

  /* ═══ B · Thông hiểu — 2 đọc output + 1 so sánh + 2 giải thích + 1 bắt lỗi ══ */
  B: [
    { id: 'b1', k: 'free', truc: 0, tag: 'Đọc output', rows: 11,
      q: 'Hai file dưới đây <b>đều</b> mở đầu bằng <code>#!/bin/bash</code> và đều đã ' +
         '<code>chmod +x</code>. Mỗi file được chạy hai lần: một lần bằng ' +
         '<code>./</code>, một lần bằng <code>sh</code>.<br><br>' +
         'Đọc bốn transcript và trả lời: <b>vì sao <code>dbl.sh</code> thoát với mã 0 còn ' +
         '<code>arr.sh</code> thoát với mã 2</b>, khi cả hai đều gặp cú pháp mà dash không ' +
         'hiểu? Và trong hai cái, <b>cái nào nguy hiểm hơn</b> trên một máy build chạy lúc 3 ' +
         'giờ sáng?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'cat dbl.sh\n' +
          'cat arr.sh' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '#!/bin/bash            #!/bin/bash\n' +
          'x=5                    echo "line 1 ran"\n' +
          'if [[ $x -gt 3 ]]; then    files=(a.c b.c c.c)\n' +
          '  echo "bigger"        echo "there are ${#files[@]} files"\n' +
          'fi\n' +
          'echo "reached the end"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '-- ./dbl.sh          (shebang obeyed)\n' +
          'bigger\n' +
          'reached the end\n' +
          '   rc=0\n' +
          '-- sh dbl.sh         (shebang IGNORED)\n' +
          'dbl.sh: 3: [[: not found\n' +
          'reached the end\n' +
          '   rc=0\n' +
          '\n' +
          '-- ./arr.sh\n' +
          'line 1 ran\n' +
          'there are 3 files\n' +
          '   rc=0\n' +
          '-- sh arr.sh\n' +
          'line 1 ran\n' +
          'arr.sh: 3: Syntax error: "(" unexpected\n' +
          '   rc=2' },
        { t: 'cal', kind: 'warn', x: 'Có một chi tiết trong transcript của ' +
          '<code>sh arr.sh</code> đi ngược trực giác của người quen ngôn ngữ biên dịch. Tìm ' +
          'ra nó cũng là một ý được chấm.' }
      ],
      hint: 'Với dash, <code>[[</code> không phải cú pháp lạ — nó là một <b>tên lệnh</b>. ' +
            'Chuyện gì xảy ra với câu <code>if</code> khi lệnh trong điều kiện của nó không ' +
            'tồn tại? Còn <code>files=(...)</code> thì dash không thể coi là tên lệnh được — ' +
            'nó là một câu <i>gán</i> sai cú pháp.',
      crit: [
        'Giải thích <code>dbl.sh</code>: dash coi <code>[[</code> là một <b>lệnh</b> không tồn tại → mã 127 → điều kiện <code>if</code> <b>sai</b> → nhánh <code>then</code> bị bỏ → script chạy tiếp bình thường',
        'Nêu rõ mã thoát của script là mã của <b>lệnh cuối cùng</b> — ở đây là <code>echo "reached the end"</code>, thành công, nên rc=<b>0</b>',
        'Giải thích <code>arr.sh</code>: <code>files=(a.c b.c c.c)</code> là <b>lỗi cú pháp</b>, dash không phân tích nổi nên bỏ cuộc với mã <b>2</b>',
        'Chi tiết phản trực giác: <code>line 1 ran</code> được in ra <b>trước</b> khi báo lỗi ở dòng 3 — dash <b>phân tích và thực thi từng lệnh một</b>, không đọc trọn file rồi mới chạy',
        'Kết luận đúng: <code>dbl.sh</code> nguy hiểm hơn — nó hỏng <b>im lặng</b>, trả về 0, và mọi bước sau trong CI coi như thành công',
        'Nêu được ý nghĩa vận hành: một script "chạy xong, mã 0" <b>không</b> chứng minh nó đã làm việc nó phải làm'
      ],
      sol: '<p><b>Hai kiểu hỏng hoàn toàn khác nhau, và cái êm hơn là cái tệ hơn.</b></p>' +
           '<p><b><code>dbl.sh</code> — hỏng ngữ nghĩa, im lặng.</b> dash không có ' +
           '<code>[[</code>. Nhưng nó cũng không coi đó là lỗi cú pháp: với dash, ' +
           '<code>[[</code> chỉ là một <i>từ đầu tiên</i>, tức một tên lệnh, và tên đó không ' +
           'tồn tại. Nó báo <code>[[: not found</code>, lệnh trả mã 127, câu ' +
           '<code>if</code> nhận mã khác 0 nên kết luận "điều kiện sai" và bỏ nhánh ' +
           '<code>then</code>. Script đi tiếp, in <code>reached the end</code>, và mã thoát ' +
           'của script là mã của lệnh cuối — <code>echo</code>, thành công. <b>rc=0.</b></p>' +
           '<p>Đọc kỹ hậu quả: câu <code>if</code> đó lẽ ra <b>đúng</b> (5 &gt; 3). Nhánh ' +
           '<code>then</code> đã bị bỏ qua vì lý do sai. Nếu nhánh đó là bước ký firmware, ' +
           'hay bước copy image ra thư mục phát hành, thì bạn có một bản build "thành công" ' +
           'thiếu mất một bước — và không có gì trong log nói cho bạn biết, ngoài một dòng ' +
           'lẻ trong hàng nghìn dòng.</p>' +
           '<p><b><code>arr.sh</code> — hỏng cú pháp, ồn ào.</b> ' +
           '<code>files=(a.c b.c c.c)</code> thì dash không thể diễn giải thành cái gì cả. ' +
           'Nó báo <code>Syntax error: "(" unexpected</code> và thoát với mã <b>2</b>. CI ' +
           'thấy mã khác 0 và dừng lại. Bạn mất năm phút, không mất một bản phát hành.</p>' +
           '<p><b>Chi tiết phản trực giác:</b> dòng <code>line 1 ran</code> được in ' +
           '<i>trước</i> thông báo lỗi ở dòng 3. Nếu bạn quen C hay Java thì điều này nghe ' +
           'sai — trình biên dịch phải phân tích cả file rồi mới chạy chứ. Nhưng shell ' +
           '<b>không phải trình biên dịch</b>: nó đọc, phân tích và thực thi <b>từng lệnh ' +
           'một</b>. Hệ quả rất thực dụng: <b>một lỗi cú pháp ở dòng 300 không ngăn được ' +
           'dòng 1 đến 299 chạy</b>, kể cả những dòng đã sửa đổi hệ thống. Đó là lý do ' +
           '<code>bash -n script.sh</code> tồn tại: nó phân tích mà không thực thi.</p>' +
           '<p><b>Bài học mang đi:</b> mã thoát 0 chỉ nói "lệnh cuối cùng thành công". Nó ' +
           '<b>không</b> nói "script đã làm đúng việc của nó". Khoảng cách giữa hai câu đó là ' +
           'nơi các sự cố sản xuất sinh ra.</p>' },

    { id: 'b2', k: 'free', truc: 1, tag: 'Đọc output', rows: 10,
      q: 'Script dưới đây bắt đầu bằng <code>set -e</code> và hàm <code>check</code> ' +
         '<b>luôn</b> trả về 1. Nó gọi <code>check</code> <b>bốn</b> lần.<br><br>' +
         'Đọc kết quả và trả lời: <b>ba lần đầu khác lần thứ tư ở điểm gì</b> — không phải ' +
         'khác về cú pháp, mà khác về <b>vai trò của mã trả về</b>? Rồi phát biểu quy tắc ' +
         'chung dưới dạng một câu có thể áp dụng cho một dòng bạn chưa từng thấy.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          '#!/bin/bash\n' +
          'set -e\n' +
          'check() { return 1; }\n' +
          'echo "1 bare call in an if:"\n' +
          'if check; then echo "   then"; else echo "   else -- script survived"; fi\n' +
          'echo "2 left of &&:"\n' +
          'check && echo "   never printed"\n' +
          'echo "   survived"\n' +
          'echo "3 non-final position in a pipeline:"\n' +
          'check | cat\n' +
          'echo "   survived"\n' +
          'echo "4 bare call, unchecked:"\n' +
          'check\n' +
          'echo "   NEVER PRINTED"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '1 bare call in an if:\n' +
          '   else -- script survived\n' +
          '2 left of &&:\n' +
          '   survived\n' +
          '3 non-final position in a pipeline:\n' +
          '   survived\n' +
          '4 bare call, unchecked:\n' +
          'rc=1' }
      ],
      hint: 'Ở ba lần đầu, có ai đó đang <b>chờ nghe</b> câu trả lời của <code>check</code> ' +
            'và sẽ làm gì đó với nó. Ở lần thứ tư thì không. Hỏi tiếp: nếu ' +
            '<code>set -e</code> giết script ở lần thứ nhất thì bạn còn viết được câu ' +
            '<code>if</code> nào nữa không?',
      crit: [
        'Nêu đúng điểm khác: ở ba lần đầu mã trả về <b>đang được hỏi tới</b> — nó là <b>dữ liệu đầu vào</b> cho một quyết định; ở lần thứ tư nó không được ai dùng, nên nó là một <b>sự cố</b>',
        'Liệt kê được ngữ cảnh của cả ba: điều kiện <code>if</code>/<code>while</code> · vế trái của <code>&amp;&amp;</code> hoặc <code>||</code> · khâu <b>không phải khâu cuối</b> của đường ống (thêm được <code>sau !</code> là tốt)',
        'Phát biểu quy tắc chung dùng được cho dòng lạ: <b><code>set -e</code> chỉ can thiệp khi mã trả về sẽ bị vứt đi</b>',
        'Nhận ra đây là <b>thiết kế có chủ đích</b>, không phải lỗi của bash: nếu không có ngoại lệ này thì không viết được <code>if lenh; then</code>',
        'Nêu hệ quả thực dụng đúng chiều: muốn <b>cố ý</b> cho một lệnh được phép hỏng thì viết <code>lenh || true</code>',
        'Nêu được hệ quả nguy hiểm: bọc một lệnh vào <code>if</code> hay vào một đường ống là <b>vô hiệu hoá <code>set -e</code></b> cho lệnh đó — thường là không cố ý'
      ],
      sol: '<p><b>Điểm khác không nằm ở cú pháp mà ở chỗ mã trả về đi đâu.</b></p>' +
           '<p>Ba lần đầu, mã trả về của <code>check</code> <b>có người nhận</b>: ' +
           '<code>if</code> dùng nó để chọn nhánh, <code>&amp;&amp;</code> dùng nó để quyết ' +
           'định có chạy vế phải không, đường ống dùng nó… thật ra là <i>không</i> dùng — và ' +
           'đó chính là lý do nó cũng được tha, vì mã của cả đường ống được lấy từ khâu ' +
           'cuối. Ở cả ba, thất bại là một <b>câu trả lời</b>. Lần thứ tư, không ai hỏi và ' +
           'không ai nhận: mã 1 rơi xuống đất. Đó là một <b>sự cố</b>, và <code>set -e</code> ' +
           'giết script.</p>' +
           '<p><b>Quy tắc dùng được cho một dòng bạn chưa từng thấy:</b> ' +
           '<i>«<code>set -e</code> chỉ can thiệp khi mã trả về sẽ bị vứt đi.»</i> Nhìn một ' +
           'dòng lạ, hãy hỏi "có ai đang đọc mã của lệnh này không". Có → ' +
           '<code>set -e</code> im lặng. Không → nó ra tay.</p>' +
           '<p>Đây là <b>thiết kế</b>, không phải khiếm khuyết. <code>if grep -q abc f; ' +
           'then</code> có mục đích là <i>hỏi</i> grep. Nếu <code>set -e</code> giết script ' +
           'ngay khi grep trả 1 thì không câu <code>if</code> nào viết được nữa.</p>' +
           '<p><b>Hai hệ quả, và cái thứ hai mới là cái cắn.</b><br>' +
           'Chiều có lợi: khi bạn <b>cố ý</b> muốn một lệnh được phép hỏng, viết ' +
           '<code>lenh || true</code>.<br>' +
           'Chiều nguy hiểm: bọc một lệnh vào <code>if</code>, hay nối nó vào ' +
           '<code>| tee build.log</code>, là bạn vừa <b>vô hiệu hoá <code>set -e</code></b> ' +
           'cho lệnh đó — thường là không hề cố ý. Một script build có ' +
           '<code>set -e</code> ở đầu và <code>make | tee build.log</code> ở giữa ' +
           '<i>trông</i> rất an toàn và <i>không</i> an toàn chút nào. Đó là lý do ' +
           '<code>pipefail</code> tồn tại, và bạn sẽ đo nó ở <b>E2</b>.</p>' },

    { id: 'b3', k: 'free', truc: 2, tag: 'Giải thích vì sao', rows: 9,
      q: 'Hàm <code>count_c</code> đếm số file <code>.c</code> rồi <code>return</code> con ' +
         'số đó. Người viết gọi nó bằng <code>n=$(count_c)</code>. Kết quả đo thật ở dưới.' +
         '<br><br>' +
         'Giải thích <b>cơ chế</b>: vì sao <code>n</code> rỗng, vì sao <code>$?</code> lại ' +
         'đúng bằng 3, và vì sao đây <b>không</b> phải là một lỗi mà bash có thể cảnh báo ' +
         'cho bạn.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          '#!/bin/bash\n' +
          'count_c() {\n' +
          '  local n\n' +
          '  n=$(ls src/*.c 2>/dev/null | wc -l)\n' +
          '  return "$n"\n' +
          '}\n' +
          'n=$(count_c)\n' +
          'echo "  n=\\$(count_c)  -> \'$n\'"\n' +
          'count_c\n' +
          'echo "  \\$? after call -> $?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'led.c\n' +
          'main.c\n' +
          'util.c\n' +
          '  n=$(count_c)  -> \'\'\n' +
          '  $? after call -> 3' }
      ],
      hint: 'Hỏi từng cái một: <code>$( )</code> bắt lấy <b>cái gì</b> của lệnh bên trong? ' +
            'Hàm này in ra <b>cái gì</b>? Và bash có cách nào biết được ý định của bạn là ' +
            '"lấy số" chứ không phải "lấy đầu ra" hay không?',
      crit: [
        '<code>$( )</code> bắt lấy <b>đầu ra chuẩn</b> của lệnh, không phải mã trạng thái',
        'Hàm này không <code>echo</code> gì ra cả (kết quả của <code>wc -l</code> đã bị hút vào biến <code>n</code> nội bộ), nên đầu ra chuẩn là <b>rỗng</b> → <code>n</code> rỗng',
        '<code>return "$n"</code> đặt <b>mã trạng thái</b> bằng 3, và <code>$?</code> ngay sau lời gọi <b>trần</b> đọc được nó',
        'Giải thích vì sao bash không cảnh báo được: cả hai đều là <b>cách dùng hợp lệ</b> — một hàm không in gì ra là bình thường, một hàm đặt mã trạng thái cũng là bình thường. Không có gì để bash phát hiện',
        'Nêu đúng cách sửa: đổi <code>return "$n"</code> thành <code>echo "$n"</code> (đo thật: <code>m=$(count_c_ok)</code> → <code>\'3\'</code>)',
        'Nêu ít nhất một lý do vì sao <code>return</code> vốn dĩ không hợp để chở số đếm: giới hạn 0–255 và lấy dư 256, hoặc 0 đã bị chiếm nghĩa "thành công" nên không phân biệt được với "đếm được 0 file"'
      ],
      sol: '<p><b>Hai kênh, và câu lệnh bắt nhầm kênh.</b></p>' +
           '<p><code>$( )</code> có tên đầy đủ là <i>thay thế lệnh</i>: nó chạy lệnh bên ' +
           'trong, thu <b>đầu ra chuẩn</b> của lệnh đó, và thay cả cụm bằng chuỗi thu được. ' +
           'Nó hoàn toàn không quan tâm tới mã trạng thái.</p>' +
           '<p>Hàm <code>count_c</code> thì lại không in gì ra: kết quả của ' +
           '<code>wc -l</code> đã bị <code>n=$( )</code> <i>bên trong hàm</i> hút vào một ' +
           'biến cục bộ. Đầu ra chuẩn của hàm là rỗng. Nên <code>n</code> ở ngoài nhận chuỗi ' +
           'rỗng — <b>không phải 0, mà là rỗng</b>, một khác biệt sẽ cắn bạn ở dòng ' +
           '<code>[ "$n" -gt 0 ]</code> ngay sau đó.</p>' +
           '<p>Còn số 3 thì có thật, nó nằm ở <code>$?</code>, và chỉ đọc được sau một lời ' +
           'gọi <b>trần</b>: <code>count_c</code> rồi <code>rc=$?</code> ở dòng liền kề.</p>' +
           '<p><b>Vì sao bash không thể cảnh báo bạn.</b> Đây mới là phần đáng nhớ. Một hàm ' +
           'không in gì ra là chuyện hoàn toàn bình thường. Một hàm đặt mã trạng thái cũng ' +
           'hoàn toàn bình thường. Gán một chuỗi rỗng cho biến cũng bình thường nốt. ' +
           '<b>Không có một bước nào sai</b> — chỉ có <i>ý định</i> của bạn là khác với thứ ' +
           'bạn viết, và ý định thì bash không đọc được. Đây là dạng lỗi mà không công cụ ' +
           'nào bắt hộ bạn; chỉ có hiểu cơ chế mới tránh được.</p>' +
           '<p><b>Sửa:</b> đổi <code>return "$n"</code> thành <code>echo "$n"</code>. Đo ' +
           'thật với đúng ba file: <code>m=$(count_c_ok)</code> → <code>\'3\'</code>.</p>' +
           '<p>Và kể cả khi <code>return</code> "chạy được", nó vẫn là kênh sai để chở số ' +
           'đếm: mã chỉ có 8 bit (<code>return 300</code> → <code>44</code>), còn giá trị 0 ' +
           'thì đã mang nghĩa "thành công" nên "đếm được 0 file" không phân biệt được với ' +
           '"chạy ổn". Kênh trạng thái để trả lời <i>được hay không được</i>; kênh dữ liệu ' +
           'để trả lời <i>bao nhiêu</i>.</p>' },

    { id: 'b4', k: 'free', tag: 'So sánh cặp', rows: 9,
      q: 'Hai script dưới đây <b>chỉ khác nhau một dòng</b>: cái thứ hai có thêm ' +
         '<code>set -u</code>. Cả hai đều mắc cùng một lỗi — tên biến bị gõ thiếu một chữ ' +
         'cái (<code>buld_dir</code> thay vì <code>build_dir</code>).<br><br>' +
         '<b>Trong hai khác biệt hiển nhiên</b> — "một cái báo lỗi, một cái không" và "một ' +
         'cái dừng, một cái chạy tiếp" — <b>cái nào mới là khác biệt quan trọng?</b> Biện ' +
         'minh bằng chính dòng mà script thứ nhất in ra.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          '#!/bin/bash\n' +
          'build_dir=/tmp/bt13-scratch/build\n' +
          'echo "about to clean: $buld_dir"\n' +
          'echo rm -rf "$buld_dir"/*\n' +
          'echo "still running, exit code of the line above: $?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'about to clean: \n' +
          'rm -rf /bin /boot /dev /etc /home /init /lib /lib64 /lost+found /media /mnt /opt /proc /root /run /sbin /snap /srv /sys /tmp /usr /var\n' +
          'still running, exit code of the line above: 0\n' +
          'rc=0' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          '#!/bin/bash\n' +
          'set -u\n' +
          'build_dir=/tmp/bt13-scratch/build\n' +
          'echo "about to clean: $buld_dir"\n' +
          'echo rm -rf "$buld_dir"/*\n' +
          'echo "this line is never reached"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'u_on.sh: line 4: buld_dir: unbound variable\n' +
          'rc=1' },
        { t: 'cal', kind: 'danger', x: '<b>Cả hai script trên đã được vô hiệu hoá</b>: chữ ' +
          '<code>echo</code> đứng trước <code>rm</code> biến câu lệnh thành một câu in ra ' +
          'màn hình. Chạy thử hoàn toàn an toàn. <b>Đừng bỏ chữ <code>echo</code> đó ra.</b> ' +
          'Dòng thứ hai của transcript là chính xác những gì đã bị xoá nếu bỏ.' }
      ],
      hint: 'Script thứ nhất <b>không hề gặp lỗi</b> — không có lệnh nào thất bại, mã trả về ' +
            'là 0, mọi thứ "chạy đúng". Hãy đọc kỹ dòng thứ hai của transcript và hỏi: ' +
            'chuyện gì đã biến một tên thư mục thành 22 đường dẫn?',
      crit: [
        'Chọn đúng: khác biệt quan trọng là <b>báo lỗi hay không</b>, không phải dừng hay chạy tiếp',
        'Nêu đúng cơ chế: biến chưa đặt được thay bằng <b>chuỗi rỗng</b>, nên <code>"$buld_dir"/*</code> trở thành <code>/*</code>, và shell <b>bung ký tự đại diện</b> thành toàn bộ 22 mục ở gốc',
        'Chỉ ra rằng script thứ nhất <b>thành công</b>: mã trả về <b>0</b>, không một thông báo nào — nó không hề "gặp lỗi", nó làm đúng thứ nó được viết',
        'Nêu vì sao dấu nháy kép không cứu được: <code>"$buld_dir"</code> ngăn được <i>tách từ</i>, nhưng không ngăn được biến rỗng, và <code>*</code> nằm <b>ngoài</b> dấu nháy',
        'Nêu đúng vai trò của <code>set -u</code>: nó biến một <b>giả định sai</b> thành một <b>lỗi thật</b> — dừng lại chỉ là hệ quả',
        'Nhận ra <code>set -u</code> bắt lỗi ngay ở <b>lần dùng đầu tiên</b> (dòng 4, câu <code>echo</code> vô hại), tức là <b>trước</b> dòng nguy hiểm',
        'Rút ra quy tắc chung: giá trị của một công tắc an toàn nằm ở chỗ nó <b>chuyển kiểu hỏng từ im lặng sang ồn ào</b>'
      ],
      sol: '<p><b>Khác biệt quan trọng là "báo lỗi hay không".</b> "Dừng hay chạy tiếp" chỉ ' +
           'là hệ quả, và nếu chỉ nhìn vào đó thì bạn sẽ rút ra bài học sai kiểu ' +
           '"<code>set -u</code> làm script dễ chết hơn".</p>' +
           '<p><b>Điều đáng sợ nhất trong transcript thứ nhất: script đó ' +
           '<i>thành công</i>.</b> Mã trả về 0. Không một dòng cảnh báo. Không lệnh nào thất ' +
           'bại. Nó làm <b>đúng</b> thứ nó được viết ra để làm — chỉ có điều thứ đó không ' +
           'phải thứ người viết muốn.</p>' +
           '<p><b>Cơ chế, từng bước:</b> bash mặc định coi biến chưa đặt là ' +
           '<b>chuỗi rỗng</b>. Nên <code>"$buld_dir"/*</code> trở thành <code>""/*</code>, ' +
           'tức <code>/*</code>. Rồi shell làm nốt việc của nó: <b>bung ký tự đại diện</b>. ' +
           'Kết quả là 22 đường dẫn ở gốc hệ thống, được đưa vào làm tham số. Dòng thứ hai ' +
           'của transcript là danh sách đó, in ra nguyên vẹn.</p>' +
           '<p><b>Và dấu nháy kép không cứu được bạn ở đây.</b> Bài học "luôn bọc ' +
           '<code>"$x"</code>" là đúng nhưng nó giải một vấn đề <i>khác</i>: nó chặn <b>tách ' +
           'từ</b>. Nó không làm gì được với một biến rỗng, và dấu <code>*</code> thì nằm ' +
           'hẳn <b>bên ngoài</b> cặp nháy. Đây là chỗ mà "tôi đã bọc nháy rồi" trở thành một ' +
           'cảm giác an toàn sai.</p>' +
           '<p><b>Việc của <code>set -u</code></b> không phải là làm script dừng. Nó là biến ' +
           'một <b>giả định sai</b> — "biến này chắc chắn đã được đặt" — thành một ' +
           '<b>lỗi thật, có tên, có số dòng</b>. Và để ý nó bắt ở đâu: ' +
           '<code>line 4</code>, tức câu <code>echo</code> vô hại, <b>lần dùng đầu tiên</b> ' +
           'của cái tên gõ sai. Script chết <i>trước khi</i> chạm tới dòng nguy hiểm.</p>' +
           '<p><b>Quy tắc mang đi:</b> giá trị của một công tắc an toàn không nằm ở chỗ nó ' +
           'ngăn được chuyện xấu — nó không ngăn được. Nó nằm ở chỗ nó ' +
           '<b>chuyển kiểu hỏng từ im lặng sang ồn ào</b>. Một script chết lúc 3 giờ sáng ' +
           'với một dòng lỗi rõ ràng là một script tốt hơn nhiều so với một script thành ' +
           'công mà làm sai.</p>' +
           '<p>Cách viết một hàm dọn dẹp mà lỗi này <i>không thể</i> xảy ra là nội dung của ' +
           '<b>E4</b>.</p>' },

    { id: 'b5', k: 'free', tag: 'Giải thích vì sao', rows: 8,
      q: '<code>bash -x</code> in ra <b>từng lệnh sau khi đã khai triển</b>, ngay trước khi ' +
         'thực hiện nó. Dưới đây là vết chạy của một script hai dòng, cùng với danh sách thư ' +
         'mục thực sự được tạo ra.<br><br>' +
         'Giải thích vì sao <b>cùng một biến</b>, dùng ở hai dòng liền nhau, lại cho hai kết ' +
         'quả khác nhau — và vì sao <code>mkdir</code> <b>không</b> báo lỗi ở dòng thứ nhất.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'cat q.sh\n' +
          'bash -x q.sh\n' +
          'ls -d -- */' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '#!/bin/bash\n' +
          'dir="my build dir"\n' +
          'mkdir -p $dir\n' +
          'mkdir -p "$dir"\n' +
          '\n' +
          '+ dir=\'my build dir\'\n' +
          '+ mkdir -p my build dir\n' +
          '+ mkdir -p \'my build dir\'\n' +
          '\n' +
          'build/\n' +
          'dir/\n' +
          'my build dir/\n' +
          'my/' },
        { t: 'cal', kind: 'info', x: '<code>bash -x</code> in dấu nháy đơn quanh những chỗ ' +
          'mà một tham số <b>thật sự</b> chứa khoảng trắng. Hai dòng <code>+ mkdir</code> ' +
          'khác nhau đúng ở chi tiết đó.' }
      ],
      hint: 'Đếm xem <code>mkdir</code> nhận được <b>mấy tham số</b> ở mỗi dòng. Và nhớ: ai ' +
            'là người tách chuỗi thành tham số — <code>mkdir</code> hay shell?',
      crit: [
        'Nêu đúng thứ tự: shell <b>thay</b> <code>$dir</code> thành <code>my build dir</code>, rồi <b>tách từ theo khoảng trắng</b>, <b>trước khi</b> <code>mkdir</code> được khởi chạy',
        'Đếm đúng: dòng 1 đưa <b>ba</b> tham số cho <code>mkdir</code>, dòng 2 đưa <b>một</b>',
        'Đọc đúng manh mối trong vết <code>-x</code>: dấu nháy đơn ở dòng thứ hai (<code>\'my build dir\'</code>) và không có ở dòng thứ nhất',
        'Giải thích vì sao không có lỗi: <code>mkdir</code> nhận ba tên hợp lệ và tạo đủ ba — nó <b>không thể</b> biết ba từ đó vốn là một tên',
        'Kết luận đúng về vai trò: <code>mkdir</code> <b>không bao giờ nhìn thấy</b> biến <code>dir</code>; nó chỉ nhận một danh sách chuỗi đã được shell xử lý xong',
        'Nêu được vì sao đây là loại lỗi khó thấy: kết quả là <b>bốn</b> thư mục thay vì một, không có thông báo nào, và script vẫn trả về 0'
      ],
      sol: '<p><b>Người tách chuỗi là shell, không phải <code>mkdir</code>.</b> Đây là ' +
           'toàn bộ câu trả lời, và <code>bash -x</code> cho bạn thấy nó bằng mắt.</p>' +
           '<p>Trước khi bất kỳ chương trình nào được khởi chạy, shell làm một chuỗi bước ' +
           'trên dòng lệnh: thay biến, rồi <b>tách từ</b> theo khoảng trắng, rồi bung ký tự ' +
           'đại diện. Chỉ sau đó nó mới gọi chương trình, và cái nó trao cho chương trình là ' +
           'một <b>mảng chuỗi đã hoàn thành</b>.</p>' +
           '<p>Dòng <code>mkdir -p $dir</code>: thay biến cho ra <code>my build dir</code>, ' +
           'tách từ cho ra <b>ba</b> chuỗi. <code>mkdir</code> nhận ba tên và tạo đủ ba thư ' +
           'mục. Dòng <code>mkdir -p "$dir"</code>: dấu nháy kép chặn bước tách từ, nên ' +
           '<code>mkdir</code> nhận <b>một</b> chuỗi.</p>' +
           '<p>Vết <code>-x</code> nói thẳng điều đó nếu bạn biết đọc: ' +
           '<code>+ mkdir -p my build dir</code> — ba từ trần; ' +
           '<code>+ mkdir -p \'my build dir\'</code> — một tham số, được bash đánh dấu bằng ' +
           'nháy đơn vì nó thật sự chứa khoảng trắng. Đó là quy ước hiển thị của ' +
           '<code>-x</code> và nó chính là manh mối.</p>' +
           '<p><b>Vì sao không có lỗi:</b> <code>mkdir</code> được yêu cầu tạo ba thư mục có ' +
           'tên hợp lệ, và nó tạo đủ ba. Nó <b>không thể</b> biết rằng ba từ ấy vốn là một ' +
           'cái tên — nó chưa từng nhìn thấy biến <code>dir</code>, chưa từng nhìn thấy ký ' +
           'tự <code>$</code>. Với nó, mọi thứ đều bình thường. Script trả về 0.</p>' +
           '<p>Kết quả cuối cùng là <b>bốn</b> thư mục: <code>my</code>, <code>build</code>, ' +
           '<code>dir</code> từ dòng thứ nhất, và <code>my build dir</code> từ dòng thứ hai. ' +
           'Trong một script build, ba thư mục thừa ấy sẽ nằm im ở đó cho tới khi có ai đó ' +
           'hỏi vì sao artefact rỗng.</p>' +
           '<p><b>Mẹo vận hành:</b> khi một script làm chuyện lạ mà không báo lỗi, ' +
           '<code>bash -x</code> là công cụ đầu tiên nên với tới. Nó không cần sửa script, ' +
           'không cần thêm <code>echo</code>, và nó cho bạn xem đúng cái mà chương trình ' +
           'thật sự nhận được.</p>' },

    { id: 'b6', k: 'free', tag: 'Bắt lỗi phát biểu', rows: 8,
      q: 'Một đồng nghiệp viết trong tài liệu nội bộ:<br><br>' +
         '<i>"Quy ước của nhóm: mọi script build đều mở đầu bằng ' +
         '<code>#!/bin/bash</code> và <code>set -euo pipefail</code>. Như vậy script được bảo ' +
         'đảm chạy bằng bash, và bảo đảm dừng ngay khi có bất cứ lệnh nào lỗi. Nhờ hai dòng ' +
         'này, nếu script kết thúc với mã 0 thì mọi bước bên trong nó đã thành công."</i>' +
         '<br><br>Câu này có <b>ba</b> chỗ sai. Chỉ ra từng chỗ và sửa lại.',
      hint: 'Ba chỗ sai nằm ở ba từ: "<b>bảo đảm</b>" (lần thứ nhất), "<b>bất cứ</b>", và ' +
            '"<b>mọi bước</b>". Mỗi từ ứng với một trục xoáy của bộ bài tập này.',
      crit: [
        'Sai 1 — "<b>bảo đảm chạy bằng bash</b>": shebang chỉ có hiệu lực khi kernel khởi chạy file. Ai gõ <code>sh build.sh</code> là nó chạy bằng <code>dash</code>, shebang thành chú thích',
        'Sửa 1: quy ước phải nói rõ <b>cách gọi</b> (<code>./build.sh</code>), hoặc script tự kiểm tra <code>[ -n "${BASH_VERSION:-}" ]</code> và từ chối chạy nếu không phải bash',
        'Sai 2 — "<b>dừng ngay khi có bất cứ lệnh nào lỗi</b>": <code>set -e</code> ngoảnh mặt trong ngữ cảnh đang được kiểm tra — <code>if</code>, vế trái <code>&amp;&amp;</code>/<code>||</code>, sau <code>!</code>, khâu không cuối của đường ống',
        'Sửa 2: nói đúng phạm vi — <code>set -e</code> chỉ can thiệp khi mã trả về <b>sẽ bị vứt đi</b>',
        'Sai 3 — "<b>mã 0 thì mọi bước đã thành công</b>": mã 0 chỉ nói lệnh cuối cùng thành công. Bằng chứng có sẵn: <code>sh dbl.sh</code> bỏ qua cả một nhánh <code>then</code> mà vẫn thoát 0',
        'Sửa 3: muốn bảo đảm thì phải <b>kiểm tra kết quả</b>, không kiểm tra mã thoát — ví dụ kiểm tra artefact tồn tại và khác rỗng ở cuối script',
        'Nhận ra <code>pipefail</code> <b>không</b> vá được lỗ hổng của <code>if</code>: nó chỉ sửa riêng trường hợp đường ống'
      ],
      sol: '<p><b>Ba chỗ sai, và cả ba đều là dạng "đúng một nửa" — nguy hiểm hơn sai hẳn, ' +
           'vì chúng tạo ra cảm giác đã được bảo vệ.</b></p>' +
           '<p><b>1. "Bảo đảm chạy bằng bash" — sai.</b> Shebang là thoả thuận giữa ' +
           '<b>kernel</b> và file, và nó chỉ có hiệu lực khi kernel là bên khởi chạy, tức khi ' +
           'tên file <i>là</i> lệnh. Bất kỳ ai gõ <code>sh build.sh</code> — một dòng trong ' +
           'Makefile, một bước CI, một đồng nghiệp gõ theo thói quen — là script chạy bằng ' +
           '<code>dash</code> và dòng shebang trở thành chú thích. Nếu muốn bảo đảm thật thì ' +
           'phải nói rõ cách gọi trong quy ước, hoặc để script tự kiểm tra:<br>' +
           '<code>[ -n "${BASH_VERSION:-}" ] || { echo "run me with bash" >&amp;2; exit 1; }</code></p>' +
           '<p><b>2. "Dừng ngay khi có bất cứ lệnh nào lỗi" — sai ở chữ "bất cứ".</b> ' +
           '<code>set -e</code> cố ý ngoảnh mặt khi lệnh thất bại nằm trong điều kiện của ' +
           '<code>if</code> hay <code>while</code>, ở vế trái <code>&amp;&amp;</code>/' +
           '<code>||</code>, sau <code>!</code>, hoặc ở một khâu không phải khâu cuối của ' +
           'đường ống. Phát biểu đúng: <b><code>set -e</code> chỉ can thiệp khi mã trả về sẽ ' +
           'bị vứt đi.</b> Và lưu ý <code>pipefail</code> chỉ vá riêng trường hợp đường ống — ' +
           'nó không làm gì được với một lệnh bị bọc trong <code>if</code>.</p>' +
           '<p><b>3. "Mã 0 thì mọi bước đã thành công" — sai, và đây là chỗ sai đắt ' +
           'nhất.</b> Mã thoát của một script là mã của <b>lệnh cuối cùng</b>. Bằng chứng đã ' +
           'có sẵn ở B1: <code>sh dbl.sh</code> bỏ qua trọn một nhánh <code>then</code> — ' +
           'nhánh lẽ ra <i>phải</i> chạy — rồi thoát với mã <b>0</b>. Muốn bảo đảm thì phải ' +
           '<b>kiểm tra kết quả chứ không kiểm tra mã thoát</b>: cuối script, xác nhận ' +
           'artefact tồn tại, khác rỗng, và đúng kiến trúc:<br>' +
           '<code>[ -s "$out/Image" ] || { echo "no artefact" >&amp;2; exit 1; }</code></p>' +
           '<p><b>Bản viết lại trung thực:</b> <i>"Mọi script build mở đầu bằng ' +
           '<code>#!/bin/bash</code> và <code>set -euo pipefail</code>, và <b>phải được gọi ' +
           'bằng <code>./</code></b>. Hai dòng đó chuyển phần lớn kiểu hỏng từ im lặng sang ' +
           'ồn ào, nhưng <b>không</b> phủ hết: lệnh nằm trong ngữ cảnh được kiểm tra vẫn ' +
           'được phép thất bại. Vì vậy mọi script phải kết thúc bằng một bước ' +
           '<b>kiểm tra artefact</b> — mã thoát 0 không phải là bằng chứng."</i></p>' },
  ],

  /* ═══ C · Vận dụng — 2 chẩn đoán + 2 tình huống mới + 1 chọn và biện minh ═══ */
  C: [
    { id: 'c1', k: 'free', truc: 0, tag: 'Chẩn đoán', rows: 10,
      q: 'Bạn có một script <code>flash.sh</code> chạy hoàn hảo suốt sáu tháng trên máy ' +
         'trạm Ubuntu của bạn. Hôm nay bạn chép nó vào rootfs của board và gọi nó từ một ' +
         'kịch bản khởi động của board. Nó <b>không</b> chạy đúng, nhưng board vẫn boot ' +
         'xong và không có gì báo lỗi rõ ràng.<br><br>' +
         'Board dùng <b>BusyBox</b> — <code>/bin/sh</code> trên đó là <code>ash</code>, và ' +
         '<b>không có <code>/bin/bash</code></b>. Script bắt đầu bằng ' +
         '<code>#!/bin/bash</code>.<br><br>' +
         'Liệt kê <b>ba</b> triệu chứng khác nhau mà bạn có thể gặp, ứng với ba cách kịch ' +
         'bản khởi động gọi script. Với mỗi cái: triệu chứng cụ thể là gì, mã thoát bao ' +
         'nhiêu, và <b>vì sao</b>.',
      blocks: [
        { t: 'cal', kind: 'info', x: 'Ba cách gọi thường gặp trong một kịch bản khởi động: ' +
          '<code>/etc/init.d/flash.sh</code> · <code>sh /etc/init.d/flash.sh</code> · ' +
          '<code>. /etc/init.d/flash.sh</code> (dấu chấm = <code>source</code>).' }
      ],
      hint: 'Với cách thứ nhất, ai là người đọc dòng shebang, và người đó có tìm thấy ' +
            '<code>/bin/bash</code> không? Với cách thứ hai, dòng shebang có được ai đọc ' +
            'không? Kết quả của hai cách này khác nhau <b>về bản chất</b>, không chỉ khác về ' +
            'thông báo.',
      crit: [
        'Cách 1 (<code>./flash.sh</code>): <b>kernel</b> đọc shebang, không tìm thấy <code>/bin/bash</code> → <code>bad interpreter: No such file or directory</code>, mã <b>126</b>, script <b>không chạy một dòng nào</b>',
        'Cách 2 (<code>sh flash.sh</code>): shebang bị <b>bỏ qua hoàn toàn</b> → ash chạy nó. Cú pháp riêng của bash (<code>[[ ]]</code>, mảng, <code>${var,,}</code>…) hỏng, và đây là kiểu hỏng <b>một phần</b>',
        'Nêu được hai kiểu hỏng khác nhau bên trong cách 2: <code>[[</code> → <code>not found</code> nhưng script <b>chạy tiếp và có thể thoát 0</b>; mảng <code>a=(…)</code> → lỗi cú pháp, thoát <b>2</b>',
        'Nêu được điểm nguy hiểm nhất: ash <b>thực thi từng lệnh một</b>, nên các dòng trước chỗ lỗi <b>đã chạy rồi</b> — có thể đã ghi vào flash, đã xoá thứ gì đó',
        'Cách 3 (<code>. flash.sh</code>): chạy trong <b>chính shell hiện tại</b> của kịch bản khởi động — shebang bị bỏ qua, và tệ hơn: một <code>exit</code> trong script sẽ <b>giết luôn kịch bản khởi động</b>',
        'Nêu ít nhất một cách sửa đúng: đổi shebang sang <code>#!/bin/sh</code> <b>và</b> viết lại theo cú pháp POSIX; hoặc cài bash lên rootfs; hoặc thêm chốt <code>[ -n "${BASH_VERSION:-}" ] || exit 1</code> ở đầu script',
        'Nhận ra vì sao bug này ẩn suốt sáu tháng: trên máy trạm <code>/bin/sh</code> cũng có thật, nhưng <b>cách gọi</b> luôn là <code>./</code> và bash luôn tồn tại — cả hai điều kiện đều đổi khi lên board'
      ],
      sol: '<p><b>Cùng một file, ba cách gọi, ba kiểu hỏng khác hẳn nhau về bản chất. Đây ' +
           'chính là lý do trục "shebang chỉ có hiệu lực khi kernel khởi chạy" đáng nhớ.</b></p>' +
           '<p><b>Cách 1 — <code>/etc/init.d/flash.sh</code>: hỏng sạch sẽ, và đây là kiểu ' +
           'hỏng <i>tốt nhất</i>.</b> Tên file là lệnh, nên <b>kernel</b> là bên khởi chạy. ' +
           'Nó đọc hai byte <code>#!</code>, lấy đường dẫn <code>/bin/bash</code>, đi tìm — ' +
           'không có. Nó từ chối, shell báo <code>bad interpreter: No such file or ' +
           'directory</code>, mã thoát <b>126</b>. <b>Không một dòng nào trong script được ' +
           'chạy.</b> Trạng thái board không đổi. Bạn mất mười phút đọc log rồi sửa.</p>' +
           '<p><b>Cách 2 — <code>sh /etc/init.d/flash.sh</code>: hỏng một phần, và đây là ' +
           'kiểu hỏng tệ nhất.</b> Bây giờ lệnh là <code>sh</code>, file chỉ là tham số. ' +
           'Kernel khởi chạy <code>sh</code> — tức <code>ash</code> — và ash mở file như văn ' +
           'bản. Dòng <code>#!/bin/bash</code> với nó chỉ là một <b>chú thích</b>. Nó chạy ' +
           'toàn bộ script bằng ash.</p>' +
           '<p>Và ở đây có hai kiểu hỏng con, đúng như bạn đã đo ở B1:</p>' +
           '<ul>' +
           '<li><code>[[ $x -gt 3 ]]</code> → ash coi <code>[[</code> là một <b>tên lệnh</b> ' +
           'không tồn tại → điều kiện thành sai → <b>nhánh <code>then</code> bị bỏ</b> → ' +
           'script chạy tiếp và <b>có thể thoát với mã 0</b>. Nếu nhánh đó là bước ghi ' +
           'firmware thì bạn có một board "flash thành công" mà chưa được flash.</li>' +
           '<li><code>files=(a.bin b.bin)</code> → lỗi cú pháp thật, ash thoát <b>2</b>.</li>' +
           '</ul>' +
           '<p><b>Và điểm chí mạng:</b> ash thực thi <b>từng lệnh một</b>, không đọc trọn ' +
           'file trước. Lỗi ở dòng 40 không ngăn dòng 1–39 chạy. Nếu dòng 12 là ' +
           '<code>rm -rf /var/lib/firmware/old</code> hay một lệnh <code>dd</code> vào ' +
           'phân vùng, thì việc đó <b>đã xảy ra</b> trước khi có bất kỳ thông báo nào.</p>' +
           '<p><b>Cách 3 — <code>. /etc/init.d/flash.sh</code>: hỏng lan sang người gọi.</b> ' +
           'Không có tiến trình mới nào cả; các lệnh được đọc và thực hiện <b>trong chính ' +
           'shell của kịch bản khởi động</b>. Shebang lại bị bỏ qua, nên vẫn dính mọi thứ ' +
           'của cách 2. Nhưng tệ hơn: một dòng <code>exit 1</code> trong script bây giờ giết ' +
           '<b>kịch bản khởi động</b>, không phải giết script — board có thể dừng khởi động ' +
           'giữa chừng. Mọi biến và mọi <code>cd</code> cũng ở lại và ảnh hưởng các bước sau.</p>' +
           '<p><b>Sửa — theo thứ tự ưu tiên:</b></p>' +
           '<ol>' +
           '<li><b>Viết lại theo POSIX</b> và đổi shebang thành <code>#!/bin/sh</code>. Kiểm ' +
           'tra bằng <code>dash -n flash.sh</code> ngay trên máy trạm — đây là cách duy nhất ' +
           'không phụ thuộc vào việc board có bash hay không, và là chuẩn mực cho script ' +
           'chạy trên thiết bị.</li>' +
           '<li>Cài <code>bash</code> vào rootfs. Đúng, nhưng tốn vài trăm KB flash và bạn ' +
           'sẽ phải bảo vệ lựa chọn đó.</li>' +
           '<li>Ít nhất, thêm một chốt ngay dòng đầu:<br>' +
           '<code>[ -n "${BASH_VERSION:-}" ] || { echo "flash.sh needs bash" >&amp;2; exit 1; }</code><br>' +
           'Nó không sửa được gì, nhưng biến kiểu hỏng im lặng thành ồn ào — đúng tinh thần ' +
           'B4.</li>' +
           '</ol>' +
           '<p><b>Vì sao bug ẩn được sáu tháng:</b> trên máy trạm cả hai điều kiện đều thuận ' +
           'lợi cùng lúc — bash luôn tồn tại, <i>và</i> bạn luôn gọi bằng <code>./</code>. ' +
           'Lên board thì cả hai cùng đổi. Đây là dạng lỗi mà "chạy tốt trên máy tôi" không ' +
           'phải là bằng chứng gì cả.</p>' },

    { id: 'c2', k: 'free', truc: 1, tag: 'Chẩn đoán', rows: 10,
      q: 'CI của nhóm báo <b>xanh</b> suốt hai tuần. Hôm nay có người tải artefact về flash ' +
         'lên board thì phát hiện file <code>Image</code> là của <b>hai tuần trước</b> — ' +
         'toàn bộ commit từ đó tới nay chưa từng được biên dịch, mà không job nào đỏ.<br><br>' +
         'Script build là dưới đây. Nó có <code>set -euo pipefail</code> ở dòng 2.<br><br>' +
         'Chỉ ra <b>chính xác dòng nào</b> nuốt thất bại, giải thích cơ chế, và viết lại ' +
         'dòng đó. Sau đó trả lời: <b>còn dòng nào khác trong script này cũng có cùng lỗ ' +
         'hổng không?</b>',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          ' 1  #!/bin/bash\n' +
          ' 2  set -euo pipefail\n' +
          ' 3\n' +
          ' 4  out=/srv/artefacts\n' +
          ' 5  mkdir -p "$out"\n' +
          ' 6\n' +
          ' 7  if make -j"$(nproc)" Image; then\n' +
          ' 8      echo "build step done"\n' +
          ' 9  fi\n' +
          '10\n' +
          '11  make modules 2>&1 | tee "$out/modules.log"\n' +
          '12\n' +
          '13  cp arch/arm64/boot/Image "$out/Image" || echo "warning: no new Image"\n' +
          '14\n' +
          '15  echo "build finished"' },
        { t: 'cal', kind: 'warn', x: 'Có <b>ba</b> dòng bị nuốt thất bại, không phải một. ' +
          'Cả ba nằm trong ba ngoại lệ khác nhau của <code>set -e</code>, và ' +
          '<code>pipefail</code> chỉ cứu được đúng một trong ba.' }
      ],
      hint: 'Đọc lại quy tắc từ B2: <code>set -e</code> chỉ can thiệp khi mã trả về ' +
            '<b>sẽ bị vứt đi</b>. Với mỗi dòng, hỏi "có ai đang đọc mã của lệnh này không". ' +
            'Rồi hỏi tiếp một câu khác hẳn: dòng 15 in ra cái gì, và mã thoát của script là ' +
            'mã của dòng nào?',
      crit: [
        '<b>Dòng 7</b> — <code>make</code> nằm trong điều kiện <code>if</code>, nên mã của nó <b>đang được hỏi</b>: <code>set -e</code> ngoảnh mặt. <code>make</code> hỏng → nhánh <code>then</code> bị bỏ → script đi tiếp như không có gì',
        'Viết lại dòng 7 đúng: bỏ <code>if</code> đi, để trần <code>make -j"$(nproc)" Image</code> (hoặc thêm <code>else echo …; exit 1; fi</code>)',
        '<b>Dòng 11</b> — <code>make modules</code> ở khâu <b>không cuối</b> của đường ống; mã của cả đường ống là mã của <code>tee</code>, gần như luôn 0. Đây là dòng duy nhất mà <code>pipefail</code> ở dòng 2 <b>có cứu</b>',
        '<b>Dòng 13</b> — <code>cp</code> ở <b>vế trái của <code>||</code></b>, nên nó được phép hỏng; <code>echo</code> chạy, trả 0, và dòng cảnh báo chìm trong log',
        'Viết lại dòng 13: <code>cp … "$out/Image"</code> để trần, hoặc <code>|| { echo "…" >&amp;2; exit 1; }</code>',
        'Nêu đúng vì sao CI xanh: mã thoát của script là mã của <b>lệnh cuối</b> — dòng 15 <code>echo</code>, luôn thành công → mã <b>0</b>',
        'Nêu giải pháp gốc rễ, không chỉ vá ba dòng: thêm bước <b>kiểm tra artefact</b> ở cuối, ví dụ <code>[ -s "$out/Image" ]</code> <b>và</b> kiểm tra nó mới hơn mã nguồn (<code>-nt</code>) — vì <code>Image</code> cũ vẫn tồn tại và vẫn khác rỗng'
      ],
      sol: '<p><b>Ba dòng, ba ngoại lệ khác nhau, và <code>pipefail</code> chỉ đỡ được ' +
           'một.</b></p>' +
           '<p><b>Dòng 7 — thủ phạm chính.</b> <code>if make …; then</code>: mã trả về của ' +
           '<code>make</code> <i>đang được hỏi tới</i>, nên <code>set -e</code> im lặng theo ' +
           'đúng thiết kế. Khi biên dịch hỏng, <code>make</code> trả 2, nhánh ' +
           '<code>then</code> bị bỏ, và không có nhánh <code>else</code>. Script đi tiếp như ' +
           'chưa có chuyện gì. Người viết dùng <code>if</code> vì <i>tưởng</i> nó là cách ' +
           'kiểm tra cẩn thận hơn — thực tế nó là cách <b>tắt</b> <code>set -e</code> cho ' +
           'đúng dòng quan trọng nhất trong file.<br>' +
           'Sửa: bỏ hẳn <code>if</code>, để <code>make -j"$(nproc)" Image</code> đứng trần. ' +
           'Có <code>set -e</code> rồi thì thất bại tự khắc dừng script.</p>' +
           '<p><b>Dòng 11 — cái mà <code>pipefail</code> cứu.</b> ' +
           '<code>make modules 2>&amp;1 | tee …</code>: mặc định mã của đường ống là mã của ' +
           'khâu <b>cuối</b>, tức <code>tee</code>, và <code>tee</code> ghi được file thì ' +
           'luôn trả 0. Đây đúng là trường hợp <code>pipefail</code> sinh ra để chữa, và ' +
           'dòng 2 <b>đã</b> bật nó — nên dòng 11 thực ra an toàn. Nêu được điều này mới là ' +
           'đọc kỹ: không phải cứ có <code>|</code> là hỏng.</p>' +
           '<p><b>Dòng 13 — nuốt lỗi một cách có chủ ý mà không ai nhớ.</b> ' +
           '<code>cp … || echo "warning: …"</code>: <code>cp</code> ở vế trái ' +
           '<code>||</code>, tức mã của nó đang được hỏi → được phép hỏng. ' +
           '<code>echo</code> chạy, trả 0, và một dòng chữ <i>warning</i> trôi mất giữa hàng ' +
           'nghìn dòng log CI. Đây là dòng đã biến "không có Image mới" thành một cảnh báo ' +
           'vô hình.<br>' +
           'Sửa: <code>cp arch/arm64/boot/Image "$out/Image"</code> để trần, hoặc nếu muốn ' +
           'giữ thông báo thì <code>|| { echo "no Image produced" >&amp;2; exit 1; }</code> ' +
           '— để ý cả <code>>&amp;2</code> lẫn <code>exit 1</code>.</p>' +
           '<p><b>Vì sao CI xanh:</b> mã thoát của script là mã của lệnh cuối cùng, và lệnh ' +
           'cuối cùng là <code>echo "build finished"</code>. Nó luôn thành công. CI đọc mã ' +
           '0 và tô xanh. Đúng như phát biểu bạn đã bác ở B6: <b>mã 0 không phải bằng ' +
           'chứng</b>.</p>' +
           '<p><b>Và đây mới là phần quan trọng: vá ba dòng vẫn chưa đủ.</b> Lần sau sẽ có ' +
           'một <code>if</code> khác, một <code>||</code> khác. Cách chữa gốc rễ là thêm một ' +
           'bước <b>kiểm tra kết quả</b> ở cuối script:</p>' +
           '<p><code>[ -s "$out/Image" ] || { echo "no artefact" >&amp;2; exit 1; }</code><br>' +
           '<code>[ "$out/Image" -nt Makefile ] || { echo "artefact is stale" >&amp;2; exit 1; }</code></p>' +
           '<p>Để ý vì sao cần <b>cả hai</b>: đúng sự cố này, file <code>Image</code> cũ vẫn ' +
           'tồn tại và vẫn khác rỗng, nên riêng <code>-s</code> vẫn xanh. Cái phát hiện được ' +
           'là phép so sánh thời gian. Nguyên tắc chung: ' +
           '<b>kiểm tra thứ script phải tạo ra, đừng kiểm tra việc script có chạy hết ' +
           'không.</b></p>' },

    { id: 'c3', k: 'free', truc: 2, tag: 'Tình huống mới', rows: 9,
      q: 'Bạn phải viết một hàm cho script phát hành: nó nhận đường dẫn một file image, và ' +
         'người gọi cần <b>hai</b> thông tin — kích thước file tính theo KiB, và ' +
         '<b>image có vừa phân vùng 32 MiB hay không</b>.<br><br>' +
         'Một người mới viết như sau và nói "hàm trả về cả hai, gọn quá":<br>' +
         '<code>check_size() { local kib=$(( $(stat -c %s "$1") / 1024 )); ' +
         '[ "$kib" -le 32768 ] &amp;&amp; return "$kib" || return 255; }</code><br><br>' +
         'Chỉ ra <b>hai</b> lý do độc lập khiến cách này sai về nguyên tắc (không phải sai ' +
         'cú pháp), rồi viết lại hàm cho đúng và nói rõ người gọi dùng nó thế nào.',
      hint: 'Lý do thứ nhất: kênh trạng thái rộng bao nhiêu bit? Một image 40 MiB thì ' +
            '<code>kib</code> bằng bao nhiêu? Lý do thứ hai: giá trị 0 trong kênh trạng thái ' +
            'đã <b>mang sẵn</b> một nghĩa rồi — nghĩa gì?',
      crit: [
        'Lý do 1 — <b>tràn</b>: mã trạng thái chỉ 8 bit, giá trị bị lấy dư 256. Nêu một ví dụ số cụ thể, ví dụ image 32 MiB → <code>kib=32768</code> → <code>return</code> cho ra <b>0</b>',
        'Nêu hệ quả của ví dụ đó: 0 nghĩa là "thành công", nên một image đúng bằng giới hạn báo về y hệt một image rỗng — hai tình huống trái ngược cho cùng một câu trả lời',
        'Lý do 2 — <b>xung đột nghĩa</b>: giá trị 0 trong kênh trạng thái đã được quy ước là "thành công/đúng", không thể đồng thời mang nghĩa "0 KiB"',
        'Nêu đúng nguyên tắc: kênh trạng thái trả lời <b>được hay không được</b>, kênh <code>stdout</code> trả lời <b>bao nhiêu</b> — một hàm cần trả cả hai thì dùng cả hai kênh',
        'Viết lại đúng: <code>echo "$kib"</code> cho con số, <code>return 0/1</code> cho phán quyết',
        'Nêu đúng cách gọi: <b>hai bước</b> — <code>kib=$(check_size "$f")</code> rồi <code>rc=$?</code> ở dòng <b>liền ngay sau</b>, vì <code>$?</code> bị lệnh kế tiếp ghi đè',
        'Bẫy <code>set -e</code>: với <code>kib=$(check_size "$f")</code> thì mã khác 0 của phép thay thế lệnh <b>giết script</b> (chính hiện tượng đã đo ở phần header của bộ này); phải bọc bằng <code>|| rc=$?</code> hoặc <code>if</code>',
        'Có xử lý lỗi thật của <code>stat</code> (file không tồn tại) bằng một mã riêng, không lẫn với phán quyết vừa/không vừa'
      ],
      sol: '<p><b>Hai lý do độc lập, và cả hai đều dẫn về một câu: kênh trạng thái không ' +
           'phải chỗ chở dữ liệu.</b></p>' +
           '<p><b>Lý do 1 — kênh chỉ rộng 8 bit.</b> <code>return</code> giữ lại đúng một ' +
           'byte; giá trị bị lấy dư 256. Bạn đã đo ở A4: <code>return 300</code> cho ' +
           '<code>$?=44</code>. Áp vào đây: một image đúng <b>32 MiB</b> có ' +
           '<code>kib=32768</code>, và 32768 mod 256 = <b>0</b>. Hàm báo về 0.</p>' +
           '<p>Đọc kỹ hậu quả đó: 0 nghĩa là "thành công". Một image <b>đúng bằng giới ' +
           'hạn</b> và một image <b>rỗng</b> cho cùng một câu trả lời. Còn image 40 MiB thì ' +
           '<code>kib=40960</code>, dư 256 ra <b>0</b> nữa — một image <b>không vừa</b> phân ' +
           'vùng báo về "thành công". Đây đúng là kiểu hỏng im lặng đắt nhất: nó không báo ' +
           'lỗi, nó báo <i>sai</i>.</p>' +
           '<p><b>Lý do 2 — giá trị 0 đã có chủ.</b> Kể cả nếu kênh rộng 64 bit, cách này ' +
           'vẫn sai. Trong quy ước Unix, 0 ở kênh trạng thái nghĩa là "được"; bạn không thể ' +
           'vừa dùng nó cho nghĩa đó vừa dùng nó cho "đo được 0 KiB". Hai nghĩa đè lên nhau ' +
           'trên cùng một giá trị.</p>' +
           '<p><b>Nguyên tắc:</b> kênh trạng thái trả lời <i>được hay không được</i>; ' +
           '<code>stdout</code> trả lời <i>bao nhiêu</i>. Hàm cần trả cả hai thì dùng cả ' +
           'hai — chúng vốn là hai kênh riêng, không phải một.</p>' +
           '<p><b>Viết lại:</b></p>' +
           '<p><code>check_size() {</code><br>' +
           '&nbsp;&nbsp;<code>local kib</code><br>' +
           '&nbsp;&nbsp;<code>kib=$(( $(stat -c %s "$1") / 1024 )) || return 2</code><br>' +
           '&nbsp;&nbsp;<code>echo "$kib"</code><br>' +
           '&nbsp;&nbsp;<code>[ "$kib" -le 32768 ]</code><br>' +
           '<code>}</code></p>' +
           '<p>Dòng cuối đáng chú ý: <code>[ … ]</code> tự nó đã đặt mã trạng thái, và mã ' +
           'của hàm chính là mã của lệnh cuối cùng — không cần <code>return</code> nào cả. ' +
           'Mã <b>2</b> được dành riêng cho "không đọc nổi file", để phân biệt với "đọc được ' +
           'nhưng không vừa".</p>' +
           '<p><b>Cách gọi — và đây là chỗ dễ sai nhất:</b></p>' +
           '<p><code>kib=$(check_size "$img") || rc=$?</code><br>' +
           '<code>rc=${rc:-0}</code><br>' +
           '<code>case "$rc" in</code><br>' +
           '&nbsp;&nbsp;<code>0) echo "$kib KiB, fits" ;;</code><br>' +
           '&nbsp;&nbsp;<code>1) echo "$kib KiB, TOO BIG for 32 MiB" >&amp;2; exit 1 ;;</code><br>' +
           '&nbsp;&nbsp;<code>2) echo "cannot stat $img" >&amp;2; exit 1 ;;</code><br>' +
           '<code>esac</code></p>' +
           '<p>Hai điểm phải nhớ. Thứ nhất, <code>$?</code> bị <b>lệnh kế tiếp ghi đè</b>, ' +
           'nên phải bắt ngay dòng liền kề — kể cả một câu <code>echo</code> chen vào cũng ' +
           'làm mất nó. Thứ hai, cái <code>|| rc=$?</code> không phải để cho đẹp: dưới ' +
           '<code>set -e</code>, một phép gán <code>kib=$( … )</code> mà lệnh bên trong trả ' +
           'mã khác 0 sẽ <b>giết script ngay tại dòng đó</b>. Đúng hiện tượng ấy đã được đo ' +
           'khi soạn bộ bài tập này, và bạn sẽ gặp lại nó ở <b>E5</b>.</p>' },

    { id: 'c4', k: 'free', tag: 'Tình huống mới', rows: 9,
      q: 'Script <code>deploy.sh</code> của bạn giải nén rootfs vào một thư mục tạm, sửa vài ' +
         'file cấu hình, đóng gói lại, rồi dọn thư mục tạm. Nó chạy tốt trên máy trạm.<br><br>' +
         'Giờ nó phải chạy như một job <b>cron</b> trên máy build dùng chung, ' +
         '<b>song song</b> nhiều nhánh Git cùng lúc, và có thể bị <b>giết bằng ' +
         '<kbd>Ctrl</kbd>+<kbd>C</kbd></b> hoặc bằng cơ chế hết giờ của CI.<br><br>' +
         'Dòng tạo thư mục tạm hiện tại là:<br>' +
         '<code>tmp=/tmp/deploy-work</code><br><code>mkdir -p "$tmp"</code><br><br>' +
         'Nêu <b>ba</b> vấn đề mà môi trường mới bộc lộ, và viết lại phần khởi tạo + dọn dẹp ' +
         'cho đúng.',
      hint: 'Vấn đề 1 và 2 đến từ chữ <b>song song</b> và chữ <b>bị giết</b>. Vấn đề 3 kín ' +
            'hơn: nếu thư mục đó đã tồn tại từ lần chạy trước và <b>chưa được dọn</b> thì ' +
            'chuyện gì xảy ra với nội dung của nó?',
      crit: [
        'Vấn đề 1 — <b>đụng độ</b>: tên cố định nên hai job chạy song song dùng chung một thư mục, ghi đè lên nhau; kết quả sai mà không ai báo lỗi',
        'Vấn đề 2 — <b>rác tích tụ</b>: bị <kbd>Ctrl</kbd>+<kbd>C</kbd> hay hết giờ thì dòng dọn dẹp ở cuối <b>không bao giờ chạy</b>; <code>/tmp</code> đầy dần',
        'Vấn đề 3 — <b>nhiễm bẩn</b>: <code>mkdir -p</code> thành công cả khi thư mục <b>đã có sẵn nội dung</b> cũ, nên lần chạy này thừa hưởng file của lần trước — bản build không tái lập được',
        'Sửa 1: dùng <code>tmp=$(mktemp -d)</code> — tên duy nhất, do hệ thống cấp, và tạo bằng quyền 700',
        'Sửa 2: dùng <code>trap</code> để dọn dẹp — và phải bắt <b>nhiều</b> tín hiệu, tối thiểu <code>EXIT INT TERM</code>, không chỉ <code>EXIT</code>',
        'Trong hàm dọn dẹp có <b>chốt an toàn</b>: kiểm tra tiền tố bằng <code>case</code> và dùng <code>"${tmp:?…}"</code>, để một biến rỗng không bao giờ biến <code>rm -rf</code> thành lệnh xoá gốc',
        'Nêu được vì sao <code>mktemp -d</code> an toàn hơn tự sinh tên bằng <code>$$</code> hay ngày giờ: nó <b>tạo</b> thư mục nguyên tử, không có khe hở giữa "kiểm tra tên chưa dùng" và "tạo"'
      ],
      sol: '<p><b>Ba giả định thầm lặng, cả ba đều đúng trên máy trạm và cả ba đều sai trên ' +
           'máy build dùng chung.</b></p>' +
           '<p><b>1. "Chỉ có một tôi đang chạy."</b> Tên <code>/tmp/deploy-work</code> là cố ' +
           'định. Hai job cho hai nhánh chạy cùng lúc sẽ giải nén chồng lên nhau. Kết quả ' +
           'không phải là một lỗi — nó là một <b>artefact lai</b>: file cấu hình của nhánh ' +
           'này, thư viện của nhánh kia. Không có thông báo nào, mã thoát 0.</p>' +
           '<p><b>2. "Script luôn chạy tới dòng cuối."</b> Dòng dọn dẹp nằm ở cuối file, nên ' +
           'nó chỉ chạy khi mọi thứ suôn sẻ. <kbd>Ctrl</kbd>+<kbd>C</kbd> gửi ' +
           '<code>SIGINT</code>, cơ chế hết giờ của CI gửi <code>SIGTERM</code> — cả hai đều ' +
           'kết thúc script trước dòng đó. Mỗi lần như vậy để lại một thư mục rác, và một ' +
           'rootfs giải nén không hề nhỏ.</p>' +
           '<p><b>3. "Thư mục tạm luôn sạch."</b> Đây là cái kín nhất. ' +
           '<code>mkdir -p</code> <i>thành công</i> khi thư mục đã tồn tại — đó là điểm mạnh ' +
           'của nó, và ở đây nó thành điểm yếu. Sau một lần bị giết ở vấn đề 2, lần chạy kế ' +
           'tiếp <b>thừa hưởng nguyên vẹn</b> nội dung cũ. Bản build không còn tái lập được, ' +
           'và triệu chứng thì lúc có lúc không.</p>' +
           '<p><b>Viết lại:</b></p>' +
           '<p><code>set -euo pipefail</code><br><br>' +
           '<code>tmp=$(mktemp -d)</code><br>' +
           '<code>cleanup() {</code><br>' +
           '&nbsp;&nbsp;<code>case "$tmp" in</code><br>' +
           '&nbsp;&nbsp;&nbsp;&nbsp;<code>/tmp/tmp.*) rm -rf "${tmp:?refusing to remove an empty path}" ;;</code><br>' +
           '&nbsp;&nbsp;&nbsp;&nbsp;<code>*) echo "refusing to remove: \'$tmp\'" >&amp;2; return 1 ;;</code><br>' +
           '&nbsp;&nbsp;<code>esac</code><br>' +
           '<code>}</code><br>' +
           '<code>trap cleanup EXIT INT TERM</code></p>' +
           '<p><b><code>mktemp -d</code></b> giải quyết vấn đề 1 và 3 cùng lúc: tên duy ' +
           'nhất, và thư mục <b>mới toanh</b> nên chắc chắn rỗng. Nó cũng an toàn hơn hẳn ' +
           'việc tự ghép tên kiểu <code>/tmp/deploy-$$</code> hay ' +
           '<code>/tmp/deploy-$(date +%s)</code>: <code>mktemp</code> <b>tạo</b> thư mục ' +
           'trong cùng một thao tác nguyên tử, không có khe hở giữa lúc bạn chọn tên và lúc ' +
           'bạn tạo. Nó cũng đặt quyền 700, nên người dùng khác trên máy dùng chung không ' +
           'nhòm vào được.</p>' +
           '<p><b><code>trap … EXIT INT TERM</code></b> giải quyết vấn đề 2. Chỉ bắt ' +
           '<code>EXIT</code> là chưa đủ trong nhiều shell; liệt kê cả ba là thói quen an ' +
           'toàn. Lưu ý <code>SIGKILL</code> (<code>kill -9</code>) thì <b>không</b> bắt ' +
           'được — không có <code>trap</code> nào chặn được nó, và đó là giới hạn thật sự ' +
           'của cách này.</p>' +
           '<p><b>Còn cái <code>case</code> và <code>${tmp:?}</code></b> là bảo hiểm cho ' +
           'chính bạn. Nếu ai đó sau này gõ nhầm tên biến trong hàm dọn dẹp, biến rỗng sẽ ' +
           'khiến <code>rm -rf "$tmp"</code> trở thành <code>rm -rf</code> với đường dẫn ' +
           'rỗng — hoặc tệ hơn, <code>rm -rf "$tmp"/*</code> trở thành ' +
           '<code>rm -rf /*</code>, đúng cơ chế bạn đã thấy ở B4. Chốt tiền tố khiến điều đó ' +
           '<b>không thể</b> xảy ra chứ không phải <i>không nên</i> xảy ra. Bạn sẽ gõ và đo ' +
           'chính cấu trúc này ở <b>E4</b>.</p>' },

    { id: 'c5', k: 'free', tag: 'Chọn và biện minh', rows: 8,
      q: 'Nhóm bạn có 6 script vận hành. Cần chốt một quy ước chung. Có ba phương án:' +
         '<ul>' +
         '<li><b>P1</b> — tất cả dùng <code>#!/bin/bash</code>, chấp nhận yêu cầu bash phải ' +
         'có mặt ở mọi nơi script chạy.</li>' +
         '<li><b>P2</b> — tất cả dùng <code>#!/bin/sh</code> và viết theo POSIX thuần, kiểm ' +
         'tra bằng <code>dash -n</code> trước khi commit.</li>' +
         '<li><b>P3</b> — chia đôi: script chạy trên <b>máy trạm/CI</b> dùng bash; script ' +
         'nào <b>đi vào rootfs của board</b> dùng POSIX.</li>' +
         '</ul>' +
         'Chọn một và biện minh. Phần được chấm là <b>lý lẽ</b>: nêu tiêu chí bạn dùng để ' +
         'quyết định, cái giá phải trả của lựa chọn, và <b>một cơ chế cụ thể</b> để quy ước ' +
         'không bị vi phạm âm thầm.',
      hint: 'Câu hỏi quyết định không phải "cú pháp nào đẹp hơn" mà là ' +
            '"<b>script này sẽ chạy ở đâu, và ở đó có gì</b>". Rootfs của board thường ' +
            'không có bash. Còn máy trạm thì không thiếu gì cả.',
      crit: [
        'Chọn rõ một phương án và nêu <b>tiêu chí</b> đã dùng để chọn — không chỉ nêu ưu/nhược điểm chung chung',
        'Tiêu chí đúng phải là <b>môi trường đích</b>: script sẽ chạy ở đâu và ở đó có sẵn shell nào',
        'Nêu đúng cái giá của P1: script không dùng được trên board BusyBox; muốn dùng thì phải cài bash, tốn vài trăm KB flash',
        'Nêu đúng cái giá của P2: mất mảng, <code>[[ ]]</code>, <code>local</code> theo chuẩn, <code>${var,,}</code>… nên script trên máy trạm dài hơn và dễ sai hơn một cách không cần thiết',
        'Nêu đúng cái giá của P3: <b>hai</b> quy ước cùng tồn tại nên phải có cách phân biệt rõ ràng, và có nguy cơ một script "đổi vai" mà không ai đổi shebang',
        'Có <b>cơ chế thi hành cụ thể</b>, không chỉ là lời hứa: ví dụ <code>dash -n</code> trong CI cho mọi file có shebang <code>#!/bin/sh</code>, hoặc tách thư mục <code>scripts/host/</code> và <code>scripts/target/</code>',
        'Nhận ra <code>dash -n</code> chỉ kiểm tra <b>cú pháp</b>, không bắt được lệnh hoặc tuỳ chọn không tồn tại trên board (ví dụ tuỳ chọn của BusyBox nghèo hơn) — nên vẫn cần chạy thử trên đích'
      ],
      sol: '<p><b>P3 là đáp án đúng trong hầu hết nhóm làm nhúng, nhưng chỉ khi nó đi kèm ' +
           'một cơ chế thi hành. Không có cơ chế thì P3 tệ hơn cả P1 lẫn P2.</b></p>' +
           '<p><b>Tiêu chí quyết định</b> không phải sở thích cú pháp mà là ' +
           '<b>môi trường đích</b>: script này sẽ chạy ở đâu, và ở đó có sẵn cái gì. Trả lời ' +
           'xong câu đó thì lựa chọn gần như tự hiện ra.</p>' +
           '<p><b>Vì sao không phải P1.</b> Rootfs nhúng dựng bằng BusyBox thường không có ' +
           'bash — <code>/bin/sh</code> là <code>ash</code>. Ép P1 nghĩa là phải cài bash ' +
           'vào image, tốn vài trăm KB flash cho một tính năng bạn dùng ở đúng vài dòng. ' +
           'Trên một thiết bị 8 MB NOR flash thì đó là một cái giá thật, phải giải trình ' +
           'được.</p>' +
           '<p><b>Vì sao không phải P2.</b> Ép POSIX lên script CI là tự trói tay không cần ' +
           'thiết. Mất mảng, mất <code>[[ ]]</code> (vốn an toàn hơn <code>[ ]</code> với ' +
           'biến rỗng), mất <code>${var,,}</code>, mất <code>local</code> được bảo đảm bởi ' +
           'chuẩn. Kết quả là script dài hơn, khó đọc hơn và <b>dễ sai hơn</b> — mà máy CI ' +
           'thì có bash sẵn từ đầu.</p>' +
           '<p><b>Cái giá của P3, phải nói thẳng:</b> hai quy ước cùng tồn tại trong một kho ' +
           'mã. Rủi ro không phải là người ta chọn nhầm ngay từ đầu, mà là ' +
           '<b>một script đổi vai</b> — hôm nay chỉ chạy trên CI, sáu tháng sau có người ' +
           'chép nó vào rootfs — và không ai nhớ đổi shebang. Chính là kịch bản C1.</p>' +
           '<p><b>Cơ chế thi hành</b> — đây mới là phần được chấm nặng nhất:</p>' +
           '<ul>' +
           '<li><b>Tách thư mục:</b> <code>scripts/host/</code> và ' +
           '<code>scripts/target/</code>. Vai trò nằm ngay trong đường dẫn, không phụ thuộc ' +
           'trí nhớ ai cả.</li>' +
           '<li><b>Chốt trong CI:</b> mọi file dưới <code>scripts/target/</code> phải qua ' +
           '<code>dash -n</code>, và bước đóng gói rootfs <b>từ chối</b> bất kỳ file nào có ' +
           'shebang <code>#!/bin/bash</code>.</li>' +
           '<li><b>Chốt trong chính script:</b> file host mở đầu bằng ' +
           '<code>[ -n "${BASH_VERSION:-}" ] || { echo "run with bash" >&amp;2; exit 1; }</code> ' +
           '— hỏng ồn ào thay vì hỏng im lặng.</li>' +
           '</ul>' +
           '<p><b>Và một giới hạn phải biết:</b> <code>dash -n</code> chỉ kiểm tra ' +
           '<b>cú pháp</b>. Nó không biết trên board có <code>stat</code> hay không, không ' +
           'biết <code>sed</code> của BusyBox thiếu tuỳ chọn nào. Một script qua ' +
           '<code>dash -n</code> vẫn có thể chết trên board vì một tuỳ chọn không tồn tại. ' +
           'Kiểm tra cú pháp là bước rẻ nhất, không phải bước cuối cùng — chạy thử trên đích ' +
           'vẫn là bắt buộc.</p>' +
           '<p><b>P1 hay P2 vẫn có thể bảo vệ được</b> nếu bạn nêu đúng bối cảnh: một nhóm ' +
           'chỉ làm board có bash sẵn thì P1 hợp lý; một nhóm mà mọi script sớm muộn đều ' +
           'chạm tới thiết bị thì P2 đơn giản hoá được việc quản lý. Cái không bảo vệ được ' +
           'là chọn mà không nêu tiêu chí, hoặc chọn P3 mà không có cơ chế.</p>' }
  ],

  /* ═══ D · Ôn xen kẽ — 3 câu về các bài trước mà bài 13 đứng lên trên ═════════ */
  D: [
    { id: 'd1', k: 'free', tag: 'Nhắc lại bài cũ · Bài 10', rows: 8,
      q: '<b>Ôn Bài 10 — chuyển hướng.</b> Script <code>noisy.sh</code> in một dòng ra ' +
         '<code>stdout</code> và một dòng ra <code>stderr</code>. Nó được chạy hai lần, chỉ ' +
         'khác nhau <b>thứ tự</b> hai thành phần chuyển hướng.<br><br>' +
         'Giải thích vì sao kết quả khác nhau, rồi trả lời câu quan trọng hơn: ' +
         '<b>trong hai cách, cách nào là cách bạn muốn cho một script build ghi log?</b>',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'cat noisy.sh\n' +
          'bash noisy.sh > a.txt 2>&1\n' +
          'echo "--- a.txt:"; cat a.txt\n' +
          'bash noisy.sh 2>&1 > b.txt\n' +
          'echo "--- b.txt:"; cat b.txt' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '#!/bin/bash\n' +
          'echo "this goes to stdout"\n' +
          'echo "this goes to stderr" >&2\n' +
          '\n' +
          '--- a.txt:\n' +
          'this goes to stdout\n' +
          'this goes to stderr\n' +
          '\n' +
          'this goes to stderr          <- hiện thẳng trên màn hình\n' +
          '--- b.txt:\n' +
          'this goes to stdout' }
      ],
      hint: 'Đọc từ trái sang phải như shell đọc, và coi <code>2>&amp;1</code> là ' +
            '"<b>sao chép chỗ mà fd 1 <i>đang</i> trỏ tới</b>", chứ không phải "gộp 2 vào 1 ' +
            'mãi mãi".',
      crit: [
        'Nêu đúng nghĩa của <code>2>&amp;1</code>: <b>sao chép đích hiện tại của fd 1 sang fd 2</b>, chụp một lần tại thời điểm đó — không phải một liên kết vĩnh viễn',
        'Giải thích lần 1: <code>> a.txt</code> trỏ fd 1 vào file <b>trước</b>, rồi <code>2>&amp;1</code> sao chép đích đó → cả hai vào file',
        'Giải thích lần 2: <code>2>&amp;1</code> chạy <b>trước</b>, lúc đó fd 1 còn trỏ ra terminal → fd 2 trỏ ra terminal; sau đó <code>> b.txt</code> chỉ đổi fd 1 → stderr <b>ở lại terminal</b>',
        'Trả lời đúng câu chọn: <code>> file 2>&amp;1</code> (thứ tự thứ nhất) là cách muốn dùng cho log build, vì cần <b>cả</b> cảnh báo lẫn lỗi trong một file',
        'Nêu được vì sao thứ tự thứ hai <b>không</b> phải lỗi vô nghĩa: nó có công dụng thật — lọc bỏ stdout ồn ào mà vẫn thấy lỗi trên màn hình',
        'Liên hệ về Bài 13: đây chính là lý do <code>make 2>&amp;1 | tee log</code> phải viết <code>2>&amp;1</code> <b>trước</b> dấu <code>|</code>'
      ],
      sol: '<p><b>Chìa khoá nằm ở chỗ <code>2>&amp;1</code> là một phép <i>chụp</i>, không ' +
           'phải một phép <i>nối</i>.</b> Nó nghĩa là "cho fd 2 trỏ tới <b>chỗ mà fd 1 đang ' +
           'trỏ tới ngay lúc này</b>". Sau đó fd 1 đi đâu thì kệ nó, fd 2 không đi theo.</p>' +
           '<p>Shell xử lý các thành phần chuyển hướng <b>từ trái sang phải</b>:</p>' +
           '<p><b>Lần 1 — <code>> a.txt 2>&amp;1</code>:</b> bước một, fd 1 → <code>a.txt</code>. ' +
           'Bước hai, fd 2 → <i>chỗ fd 1 đang trỏ</i> = <code>a.txt</code>. Cả hai vào file. ' +
           'Đúng như <code>cat a.txt</code> cho thấy: hai dòng.</p>' +
           '<p><b>Lần 2 — <code>2>&amp;1 > b.txt</code>:</b> bước một, fd 2 → <i>chỗ fd 1 ' +
           'đang trỏ</i>, mà lúc này fd 1 vẫn là <b>terminal</b> → fd 2 trỏ ra terminal. ' +
           'Bước hai, fd 1 → <code>b.txt</code>. Nhưng fd 2 đã chụp xong rồi, nó không đổi ' +
           'theo. Kết quả: stderr hiện trên màn hình, <code>b.txt</code> chỉ có stdout.</p>' +
           '<p><b>Cách nào cho log build:</b> <code>> build.log 2>&amp;1</code>. Lý do rất ' +
           'cụ thể — cảnh báo của trình biên dịch đi ra <b>stderr</b>. Nếu chỉ hứng stdout ' +
           'thì file log của bạn có đủ mọi dòng <code>CC drivers/…</code> và <b>không có</b> ' +
           'dòng nào giải thích vì sao build hỏng. Đó là kiểu log tệ nhất: dài và vô dụng.</p>' +
           '<p><b>Nhưng thứ tự thứ hai không phải lỗi</b> — nó là một công cụ thật. ' +
           '<code>./configure 2>&amp;1 > /dev/null</code> vứt hết đầu ra bình thường và giữ ' +
           'lại đúng phần lỗi trên màn hình. Biết cả hai chiều mới là nắm được cơ chế.</p>' +
           '<p><b>Liên hệ trực tiếp tới Bài 13:</b> đây chính là lý do trong một script build ' +
           'phải viết <code>make 2>&amp;1 | tee build.log</code> chứ không phải ' +
           '<code>make | tee build.log 2>&amp;1</code>. Ống <code>|</code> chỉ chở fd 1; ' +
           'nếu không kéo fd 2 vào <b>trước</b> khi tới dấu ống thì lỗi biên dịch đi thẳng ra ' +
           'terminal và không bao giờ vào log.</p>' },

    { id: 'd2', k: 'free', tag: 'Nhắc lại bài cũ · Bài 11', rows: 8,
      q: '<b>Ôn Bài 11 — <code>sed -i</code>.</b> Trong một thư mục có ' +
         '<code>real.conf</code> chứa dòng <code>arch=armhf</code>, và ' +
         '<code>link.conf</code> là một <b>liên kết mềm</b> trỏ tới nó.<br><br>' +
         'Người viết script chạy <code>sed -i \'s/armhf/arm64/\' link.conf</code> và tin ' +
         'rằng mình vừa sửa <code>real.conf</code>. Đọc số inode trước/sau và giải thích ' +
         '<b>chuyện gì thực sự đã xảy ra</b>.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'stat -c \'%n inode=%i %F\' real.conf link.conf\n' +
          'sed -i \'s/armhf/arm64/\' link.conf\n' +
          'stat -c \'%n inode=%i %F\' real.conf link.conf\n' +
          'cat real.conf' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'real.conf inode=25 regular file\n' +
          'link.conf inode=26 symbolic link\n' +
          '\n' +
          'real.conf inode=25 regular file\n' +
          'link.conf inode=27 regular file\n' +
          '\n' +
          'arch=armhf' }
      ],
      hint: '<code>sed</code> không bao giờ sửa một file tại chỗ. Hỏi: <code>-i</code> thực ' +
            'ra làm những bước nào, và bước cuối cùng của nó tác động lên <b>tên</b> hay lên ' +
            '<b>inode</b>?',
      crit: [
        'Nêu đúng cơ chế của <code>-i</code>: <code>sed</code> là một <b>bộ lọc</b>, nó ghi kết quả ra một file <b>mới</b>, rồi <code>rename</code> file mới đè lên đường dẫn cũ',
        'Đọc đúng bằng chứng: inode của <code>link.conf</code> đổi từ <b>26 → 27</b>, và kiểu file đổi từ <b>symbolic link → regular file</b>',
        'Kết luận đúng: liên kết mềm đã bị <b>thay thế</b> bằng một file thường; nó không còn trỏ tới đâu nữa',
        'Đọc đúng bằng chứng phía kia: inode của <code>real.conf</code> <b>không đổi</b> (25) và nội dung vẫn là <code>arch=armhf</code> — nó chưa từng bị sửa',
        'Nêu hệ quả rộng hơn: cùng cơ chế đó làm <b>đứt hard link</b> — sau <code>sed -i</code>, bản sao kia của hard link giữ nội dung cũ',
        'Nêu ít nhất một cách làm đúng: đi qua đường dẫn thật bằng <code>sed -i "$(readlink -f link.conf)"</code>, hoặc <code>sed --follow-symlinks -i</code> (GNU sed), hoặc ghi ra file tạm rồi <code>cat > real.conf</code>',
        'Liên hệ đúng về Bài 13: script sửa cấu hình rootfs rất hay gặp symlink, và lỗi này <b>không có thông báo</b> — <code>sed</code> trả về 0'
      ],
      sol: '<p><b><code>sed</code> chưa bao giờ sửa file tại chỗ, kể cả với ' +
           '<code>-i</code>.</b> Tên tuỳ chọn (<i>in-place</i>) gợi ý sai. Thực tế nó làm ba ' +
           'bước: đọc file gốc, ghi kết quả ra một <b>file tạm mới</b>, rồi ' +
           '<code>rename</code> file tạm đó đè lên <b>đường dẫn</b> cũ.</p>' +
           '<p>Bước thứ ba là bước gây chuyện. <code>rename</code> tác động lên ' +
           '<b>tên</b>, không phải lên inode. Nên cái bị thay thế là mục ' +
           '<code>link.conf</code> trong thư mục, chứ không phải nội dung mà nó trỏ tới.</p>' +
           '<p><b>Bằng chứng đọc thẳng từ số inode:</b></p>' +
           '<ul>' +
           '<li><code>link.conf</code>: <b>26 → 27</b>, và kiểu đổi từ ' +
           '<code>symbolic link</code> sang <code>regular file</code>. Nó không còn là liên ' +
           'kết nữa — nó là một file thường mới toanh, chứa nội dung đã sửa.</li>' +
           '<li><code>real.conf</code>: vẫn <b>25</b>, vẫn <code>arch=armhf</code>. Không ai ' +
           'chạm vào nó.</li>' +
           '</ul>' +
           '<p>Nói cách khác: liên kết mềm đã bị <b>xoá</b> và thay bằng một bản sao độc ' +
           'lập. Từ giờ hai file trôi dạt khỏi nhau, và người viết script vẫn tin rằng chúng ' +
           'là một.</p>' +
           '<p><b>Cùng cơ chế, hậu quả khác:</b> nếu <code>link.conf</code> là ' +
           '<b>hard link</b> thay vì symlink thì kết quả cũng hỏng theo kiểu tương tự — ' +
           'liên kết cứng bị <b>đứt</b>, đường dẫn kia giữ nguyên nội dung cũ. Bất cứ khi ' +
           'nào bạn thấy inode đổi, mọi tên khác đang trỏ vào inode cũ đã bị bỏ lại phía ' +
           'sau.</p>' +
           '<p><b>Ba cách làm đúng:</b></p>' +
           '<ul>' +
           '<li><code>sed -i \'s/armhf/arm64/\' "$(readlink -f link.conf)"</code> — giải ' +
           'đường dẫn ra file thật trước; rõ ràng và không phụ thuộc phiên bản sed.</li>' +
           '<li><code>sed --follow-symlinks -i …</code> — có ở GNU sed, nhưng ' +
           '<b>không</b> có ở sed của BusyBox trên board.</li>' +
           '<li><code>sed \'s/…/…/\' link.conf > tmp &amp;&amp; cat tmp > link.conf</code> ' +
           '— <code>cat ></code> ghi qua đường dẫn nên đi theo symlink; giữ nguyên inode.</li>' +
           '</ul>' +
           '<p><b>Vì sao đây là câu ôn đúng lúc:</b> script sửa cấu hình rootfs gặp symlink ' +
           'ở khắp nơi — <code>/etc/resolv.conf</code>, <code>/etc/localtime</code>, gần như ' +
           'mọi thứ trong một rootfs BusyBox. Và lỗi này <b>hoàn toàn im lặng</b>: ' +
           '<code>sed</code> trả về <b>0</b>, script có <code>set -e</code> vẫn chạy tiếp, ' +
           'CI vẫn xanh. Đúng kiểu hỏng mà cả bộ bài tập này đang nói tới.</p>' },

    { id: 'd3', k: 'free', tag: 'Nhắc lại bài cũ · Bài 4', rows: 7,
      q: '<b>Ôn Bài 4 — lệnh thật sự đến từ đâu.</b> Đọc kết quả <code>type -a</code> dưới ' +
         'đây.<br><br>' +
         'Trả lời hai câu: (1) khi bạn gõ <code>[ "$x" -gt 3 ]</code> trong một script bash, ' +
         '<b>cái nào</b> trong ba thứ đó thực sự chạy, và vì sao? (2) Vì sao ' +
         '<code>/usr/bin/[</code> vẫn phải tồn tại, dù hầu như không bao giờ được gọi tới?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'type -a [\n' +
          'ls -l /usr/bin/[\n' +
          'type -a echo' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '[ is a shell builtin\n' +
          '[ is /usr/bin/[\n' +
          '[ is /bin/[\n' +
          'lrwxrwxrwx 1 root root 28 Mar 30 23:50 /usr/bin/[ -> ../lib/cargo/bin/coreutils/[\n' +
          'echo is a shell builtin\n' +
          'echo is /usr/bin/echo\n' +
          '[ is a shell builtin' },
        { t: 'cal', kind: 'info', x: '<code>type -a</code> liệt kê <b>theo thứ tự ưu ' +
          'tiên</b>: dòng đầu tiên là thứ sẽ thực sự chạy.' }
      ],
      hint: 'Câu 2 khó hơn câu 1. Hỏi: có chương trình nào <b>khác shell</b> cần gọi ' +
            '<code>[</code> không? Nghĩ tới <code>find -exec</code>, tới ' +
            '<code>xargs</code>, và tới một shell tối giản không có builtin đó.',
      crit: [
        'Trả lời đúng câu 1: <b>builtin</b> chạy — shell tra builtin <b>trước</b> khi tra <code>PATH</code>',
        'Nêu được lý do vì sao builtin phải thắng: gọi một chương trình ngoài phải <b>fork + exec</b>, quá đắt cho một phép so sánh xảy ra hàng nghìn lần trong một vòng lặp',
        'Nhận ra <code>[</code> đúng là một <b>tên lệnh</b>, không phải cú pháp — dấu <code>]</code> chỉ là tham số cuối cùng bắt buộc; đó là lý do <b>phải có khoảng trắng</b> hai bên',
        'Trả lời đúng câu 2, ít nhất một lý do: <code>find … -exec [ … ] \\;</code> hay <code>xargs</code> khởi chạy một <b>chương trình</b>, không qua shell nào cả — lúc đó phải có file thật',
        'Hoặc lý do tương đương: chuẩn POSIX yêu cầu <code>[</code> tồn tại như một tiện ích trên đĩa; một shell không có builtin đó vẫn phải chạy được',
        'Đọc đúng chi tiết môi trường: <code>/usr/bin/[</code> ở đây là <b>liên kết mềm</b> tới <code>coreutils</code> (bản uutils viết bằng Rust) — một binary duy nhất phục vụ nhiều tên lệnh',
        'Liên hệ đúng về Bài 13: vì <code>[</code> là một lệnh nên <code>[$x = 1]</code> không chạy được (shell đi tìm lệnh tên <code>[3</code>), và vì <code>[[</code> là <b>từ khoá của bash</b> nên dash báo <code>[[: not found</code>'
      ],
      sol: '<p><b>Câu 1 — builtin chạy.</b> Trước khi tra <code>PATH</code>, bash tra danh ' +
           'sách builtin của chính nó. Có thì dùng luôn, không đi đâu cả. ' +
           '<code>type -a</code> liệt kê theo đúng thứ tự ưu tiên, nên dòng đầu tiên là câu ' +
           'trả lời.</p>' +
           '<p><b>Lý do là hiệu năng, và nó rất cụ thể.</b> Gọi một chương trình ngoài đòi ' +
           'hỏi <code>fork</code> rồi <code>exec</code> — tạo tiến trình mới, nạp binary, ' +
           'đợi nó chết, thu mã thoát. Một phép so sánh trong vòng lặp có thể xảy ra hàng ' +
           'nghìn lần; làm nó bằng tiến trình ngoài thì chậm hơn hàng trăm lần so với một ' +
           'phép so sánh nội bộ.</p>' +
           '<p><b>Và đây là chỗ nối thẳng vào Bài 13:</b> kết quả này khẳng định ' +
           '<code>[</code> đúng là một <b>tên lệnh</b>, không phải cú pháp của ngôn ngữ. Dấu ' +
           '<code>]</code> chỉ là tham số cuối cùng mà nó bắt buộc phải nhận. Từ đó suy ra ' +
           'ngay hai điều bạn đã gặp:</p>' +
           '<ul>' +
           '<li><code>[$x = 1]</code> hỏng vì sau khi thay biến, từ đầu tiên là ' +
           '<code>[3</code> — shell đi tìm một lệnh tên <code>[3</code>. Khoảng trắng quanh ' +
           '<code>[</code> và <code>]</code> là <b>bắt buộc</b>, không phải quy ước thẩm ' +
           'mỹ.</li>' +
           '<li><code>[[</code> thì <b>không</b> có trong danh sách này — nó là ' +
           '<b>từ khoá</b> của bash, không phải lệnh. Đó là lý do dash báo ' +
           '<code>[[: not found</code>: dash đi tìm nó như tìm một lệnh, và không có file ' +
           'nào tên <code>[[</code> cả.</li>' +
           '</ul>' +
           '<p><b>Câu 2 — vì sao file trên đĩa vẫn phải tồn tại.</b> Vì không phải ai gọi ' +
           '<code>[</code> cũng đi qua một shell. <code>find … -exec [ -s "{}" ] \\;</code> ' +
           'và <code>xargs</code> khởi chạy <b>chương trình</b> trực tiếp bằng ' +
           '<code>execve</code> — không có shell nào ở giữa để cung cấp builtin, nên phải có ' +
           'một file thật trong <code>PATH</code>. Thêm nữa, POSIX quy định ' +
           '<code>[</code> là một tiện ích trên đĩa: một shell tối giản không có builtin đó ' +
           'vẫn phải chạy được script.</p>' +
           '<p><b>Một chi tiết đáng để ý về máy này:</b> <code>/usr/bin/[</code> là một ' +
           '<b>liên kết mềm</b> tới <code>../lib/cargo/bin/coreutils/[</code>. Bản coreutils ' +
           'trên Ubuntu 26.04 là <b>uutils</b>, viết bằng Rust: một binary duy nhất phục vụ ' +
           'hàng chục tên lệnh, và tên lệnh được nhận ra qua <code>argv[0]</code>. Đây cũng ' +
           'đúng cách BusyBox làm việc trên board — cùng một ý tưởng, khác cách hiện thực.</p>' },
  ],

  /* ═══ E · Thực hành — 2 dự đoán + 2 gõ lệnh + 1 sửa lỗi + 1 thử thách ═══════ */
  E: [
    { id: 'e1', k: 'free', tag: 'Dự đoán output', rows: 8,
      q: '<b>Viết dự đoán trước, chạy sau.</b> Tạo file <code>who.sh</code> dưới đây, ' +
         '<code>chmod +x who.sh</code>, rồi chạy nó <b>ba</b> cách.<br><br>' +
         'Trước khi gõ, hãy viết ra <b>ba dòng đầu ra</b> bạn dự đoán cho từng cách. Chú ý ' +
         'cả <code>$0</code> — nó cũng khác nhau, và khác theo một kiểu bạn có thể suy ra ' +
         'được.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'mkdir -p ~/bt13 && cd ~/bt13\n' +
          'cat > who.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'echo "BASH_VERSION is \'${BASH_VERSION:-}\'"\n' +
          'echo "\\$0 is \'$0\'"\n' +
          'if [ -n "${BASH_VERSION:-}" ]; then\n' +
          '  echo "I am bash"\n' +
          'else\n' +
          '  echo "I am NOT bash"\n' +
          'fi\n' +
          'EOF\n' +
          'chmod +x who.sh' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          './who.sh\n' +
          'bash who.sh\n' +
          'sh who.sh' },
        { t: 'cal', kind: 'tip', x: '<code>${BASH_VERSION:-}</code> nghĩa là "giá trị của ' +
          '<code>BASH_VERSION</code>, hoặc chuỗi rỗng nếu nó chưa được đặt". Viết như vậy ' +
          'để câu lệnh vẫn chạy được cả dưới <code>set -u</code> — đúng thứ bạn cần khi ' +
          'muốn <i>kiểm tra</i> một biến có thể không tồn tại.' }
      ],
      hint: 'Ai đặt biến <code>BASH_VERSION</code>? Và với mỗi cách gọi, chương trình nào ' +
            'thực sự đang đọc file này? Với <code>$0</code>, hỏi thêm: shell nhận được ' +
            '<b>chuỗi nào</b> làm tên của thứ nó đang chạy.',
      crit: [
        'Dự đoán đúng <code>./who.sh</code> và <code>bash who.sh</code> đều là bash: <code>BASH_VERSION</code> có giá trị, in <code>I am bash</code>',
        'Dự đoán đúng <code>sh who.sh</code>: <code>BASH_VERSION</code> <b>rỗng</b>, in <code>I am NOT bash</code> — vì shebang bị bỏ qua, dash chạy nó',
        'Nêu đúng cơ chế: <code>BASH_VERSION</code> do <b>chính bash</b> đặt khi khởi động; dash không có biến đó',
        'Dự đoán đúng <code>$0</code>: <code>./who.sh</code> cho <code>\'./who.sh\'</code>, còn hai cách kia cho <code>\'who.sh\'</code>',
        'Giải thích được vì sao <code>$0</code> khác: nó là <b>đúng chuỗi</b> mà shell nhận làm tên script — cách 1 chuỗi đó là <code>./who.sh</code>, hai cách sau là tham số <code>who.sh</code>',
        'Nhận ra cả ba lần đều <b>rc=0</b> — script "chạy thành công" ở cả ba, kể cả lần chạy sai shell',
        'Rút ra được cách dùng thực tế: <code>[ -n "${BASH_VERSION:-}" ]</code> là chốt để một script từ chối chạy khi bị gọi sai'
      ],
      solBlocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '===== ./who.sh\n' +
          'BASH_VERSION is \'5.3.9(1)-release\'\n' +
          '$0 is \'./who.sh\'\n' +
          'I am bash\n' +
          '   rc=0\n' +
          '\n' +
          '===== bash who.sh\n' +
          'BASH_VERSION is \'5.3.9(1)-release\'\n' +
          '$0 is \'who.sh\'\n' +
          'I am bash\n' +
          '   rc=0\n' +
          '\n' +
          '===== sh who.sh\n' +
          'BASH_VERSION is \'\'\n' +
          '$0 is \'who.sh\'\n' +
          'I am NOT bash\n' +
          '   rc=0' },
        { t: 'p', x: '<b>Hai cách đầu giống hệt nhau về shell, khác nhau về đường đi.</b> ' +
          'Với <code>./who.sh</code>, kernel đọc shebang và khởi chạy <code>/bin/bash</code> ' +
          'với file làm tham số. Với <code>bash who.sh</code>, bạn tự làm việc đó. Kết quả ' +
          'giống nhau vì shebang đằng nào cũng chỉ tới bash.' },
        { t: 'p', x: '<b>Cách thứ ba là chỗ trục xoáy hiện ra.</b> Lệnh là ' +
          '<code>sh</code>, nên kernel khởi chạy dash. Dash mở file như văn bản, và dòng ' +
          '<code>#!/bin/bash</code> với nó chỉ là một chú thích. Không có bash nào tham gia, ' +
          'nên <code>BASH_VERSION</code> — biến do <b>chính bash</b> đặt lúc khởi động — ' +
          'không tồn tại.' },
        { t: 'p', x: '<b><code>$0</code> là manh mối phụ, và nó nói đúng cái vừa xảy ' +
          'ra.</b> Nó chứa <i>đúng chuỗi</i> mà shell nhận làm tên của thứ nó đang chạy. ' +
          'Cách 1: kernel truyền nguyên chuỗi bạn gõ, <code>./who.sh</code>. Cách 2 và 3: ' +
          'shell nhận <code>who.sh</code> như một tham số dòng lệnh. Trong một script thật, ' +
          'đây là lý do <code>$0</code> không đáng tin để tìm thư mục chứa script — ' +
          'nó phụ thuộc vào <b>cách người ta gọi</b>.' },
        { t: 'cal', kind: 'danger', x: '<b>Cả ba lần đều rc=0.</b> Lần thứ ba chạy sai ' +
          'shell hoàn toàn và vẫn báo "thành công". Nếu script này có một khối ' +
          '<code>[[ ]]</code> thì khối đó đã bị bỏ qua âm thầm, và mã thoát vẫn là 0. Đây là ' +
          'lý do một script quan trọng nên tự chốt ngay dòng đầu:<br>' +
          '<code>[ -n "${BASH_VERSION:-}" ] || { echo "run me with bash" >&amp;2; exit 1; }</code>' }
      ] },

    { id: 'e2', k: 'free', tag: 'Dự đoán output', rows: 9,
      q: '<b>Viết dự đoán trước, chạy sau.</b> Script <code>p.sh</code> dưới đây chạy bốn ' +
         'thí nghiệm về <b>mã thoát của một đường ống</b>. Với mỗi thí nghiệm, dự đoán ' +
         '<code>$?</code> và <code>PIPESTATUS</code>.<br><br>' +
         'Thí nghiệm 4 là thí nghiệm đáng giá nhất — nó khác ba cái trên đúng ' +
         '<b>một dòng trắng</b>. Hãy dự đoán nó thật cẩn thận.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'mkdir -p ~/bt13 && cd ~/bt13\n' +
          'cat > p.sh <<\'EOF\'\n' +
          '#!/bin/bash\n' +
          'echo "-- 1  plain pipeline, the first stage fails"\n' +
          'false | tee build.log >/dev/null\n' +
          'echo "   \\$? = $?      PIPESTATUS = (${PIPESTATUS[*]})"\n' +
          '\n' +
          'echo "-- 2  same pipeline, with pipefail on"\n' +
          'set -o pipefail\n' +
          'false | tee build.log >/dev/null\n' +
          'echo "   \\$? = $?      PIPESTATUS = (${PIPESTATUS[*]})"\n' +
          '\n' +
          'echo "-- 3  three stages, the middle one fails, pipefail on"\n' +
          'echo hello | false | cat >/dev/null\n' +
          'echo "   \\$? = $?      PIPESTATUS = (${PIPESTATUS[*]})"\n' +
          '\n' +
          'echo "-- 4  reading \\$? on its own line first"\n' +
          'false | tee build.log >/dev/null\n' +
          'rc=$?\n' +
          'echo "   PIPESTATUS read one line too late = (${PIPESTATUS[*]})"\n' +
          'EOF\n' +
          'bash p.sh' },
        { t: 'cal', kind: 'tip', x: '<code>PIPESTATUS</code> là một <b>mảng</b> chứa mã ' +
          'thoát của <b>từng</b> khâu trong đường ống vừa chạy, theo đúng thứ tự. Nó là biến ' +
          'riêng của bash — dash không có.' }
      ],
      hint: 'Với thí nghiệm 4, hỏi: <code>rc=$?</code> có phải là một <b>lệnh</b> không? Nếu ' +
            'có, thì sau khi nó chạy xong, <code>PIPESTATUS</code> đang mô tả đường ống nào?',
      crit: [
        'Thí nghiệm 1: <code>$? = 0</code> — mã của đường ống là mã của khâu <b>cuối</b> (<code>tee</code>), và <code>PIPESTATUS = (1 0)</code> cho thấy <code>false</code> đã thật sự hỏng',
        'Thí nghiệm 2: <code>pipefail</code> bật → <code>$? = 1</code>, <code>PIPESTATUS</code> vẫn <code>(1 0)</code> — <code>pipefail</code> đổi <b>cách tổng hợp</b>, không đổi dữ liệu',
        'Thí nghiệm 3: <code>$? = 1</code> và <code>PIPESTATUS = (0 1 0)</code> — <code>pipefail</code> lấy mã khác 0 dù nó nằm ở <b>giữa</b>',
        'Thí nghiệm 4: <code>PIPESTATUS = (0)</code> — vì <code>rc=$?</code> tự nó <b>là một lệnh</b> và đã ghi đè <code>PIPESTATUS</code> bằng kết quả của chính nó',
        'Rút ra quy tắc dùng được: muốn giữ cả hai thì phải khai triển chúng trong <b>cùng một lệnh</b>, hoặc chép mảng ra <b>ngay lập tức</b>: <code>st=("${PIPESTATUS[@]}")</code> ở dòng liền kề',
        'Liên hệ được về script build: <code>make 2>&amp;1 | tee build.log</code> mà không có <code>pipefail</code> thì mã thoát luôn là mã của <code>tee</code> — một bản build hỏng vẫn báo thành công',
        'Nêu được giới hạn: <code>pipefail</code> và <code>PIPESTATUS</code> là của <b>bash</b>; script POSIX chạy dưới dash không có cả hai'
      ],
      solBlocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '-- 1  plain pipeline, the first stage fails\n' +
          '   $? = 0      PIPESTATUS = (1 0)\n' +
          '-- 2  same pipeline, with pipefail on\n' +
          '   $? = 1      PIPESTATUS = (1 0)\n' +
          '-- 3  three stages, the middle one fails, pipefail on\n' +
          '   $? = 1      PIPESTATUS = (0 1 0)\n' +
          '-- 4  reading $? on its own line first\n' +
          '   PIPESTATUS read one line too late = (0)' },
        { t: 'p', x: '<b>1 và 2 là cùng một đường ống, cùng một thất bại, hai câu trả lời ' +
          'khác nhau.</b> <code>PIPESTATUS = (1 0)</code> ở cả hai lần: <code>false</code> ' +
          'trả 1, <code>tee</code> trả 0. Dữ liệu không đổi. Cái đổi là <b>cách tổng ' +
          'hợp</b>: mặc định lấy mã khâu cuối (0), với <code>pipefail</code> thì lấy mã khác ' +
          '0 ở bên phải nhất (1).' },
        { t: 'p', x: '<b>3 cho thấy <code>pipefail</code> nhìn cả đường ống</b>, không chỉ ' +
          'khâu đầu: <code>(0 1 0)</code>, thất bại nằm ở giữa, và <code>$?</code> vẫn ' +
          'thành 1.' },
        { t: 'p', x: '<b>4 là cái bẫy, và nó bẫy cả người viết bộ bài tập này.</b> ' +
          '<code>PIPESTATUS</code> mô tả <b>đường ống gần nhất vừa chạy</b> — và bash cập ' +
          'nhật nó sau <i>mỗi</i> lệnh, kể cả một phép gán. <code>rc=$?</code> là một lệnh: ' +
          'nó thành công, nên <code>PIPESTATUS</code> bị đặt lại thành <code>(0)</code>, mô ' +
          'tả chính phép gán đó. Đến dòng <code>echo</code> thì dữ liệu về đường ống đã mất ' +
          'sạch.' },
        { t: 'cal', kind: 'warn', x: 'Quy tắc: muốn cả <code>$?</code> lẫn ' +
          '<code>PIPESTATUS</code> thì khai triển cả hai trong <b>cùng một lệnh</b> (như ' +
          'dòng <code>echo</code> ở thí nghiệm 1–3), hoặc chép mảng ra ngay dòng liền kề: ' +
          '<code>st=("${PIPESTATUS[@]}")</code> <b>trước</b> mọi thứ khác. Cùng một lý do ' +
          'khiến <code>$?</code> phải đọc ngay dòng sau lời gọi hàm — chỉ là ở đây nó cắn ' +
          'sớm hơn một nhịp.' },
        { t: 'p', x: '<b>Vì sao điều này quan trọng với script build:</b> ' +
          '<code>make 2>&amp;1 | tee build.log</code> không có <code>pipefail</code> thì mã ' +
          'thoát luôn là mã của <code>tee</code>, gần như luôn 0. Đúng dòng 11 trong sự cố ' +
          'CI ở <b>C2</b>. Và lưu ý cả hai công cụ này — <code>pipefail</code> và ' +
          '<code>PIPESTATUS</code> — đều là <b>của bash</b>. Script POSIX chạy dưới dash ' +
          'không có, nên ở đó phải tách đường ống ra hoặc dùng file trung gian.' }
      ] },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh', rows: 8,
      q: 'Viết một script <code>check-tools.sh</code> kiểm tra xem sáu công cụ dưới đây có ' +
         'sẵn không, in ra đường dẫn của từng cái, đếm số cái thiếu, và <b>thoát với mã ' +
         'khác 0</b> nếu có bất cứ cái nào thiếu:<br>' +
         '<code>gcc</code> · <code>make</code> · <code>aarch64-linux-gnu-gcc</code> · ' +
         '<code>qemu-system-aarch64</code> · <code>dtc</code> · <code>mkimage</code>' +
         '<br><br>Yêu cầu bắt buộc:' +
         '<ul>' +
         '<li>Dùng <code>command -v</code>, <b>không</b> dùng <code>which</code>.</li>' +
         '<li>Có <code>set -euo pipefail</code> ở đầu — và script vẫn phải chạy hết cả sáu ' +
         'công cụ dù có cái thiếu.</li>' +
         '<li>Thông báo về công cụ thiếu đi ra <b>stderr</b>.</li>' +
         '</ul>' +
         'Hai yêu cầu đầu <b>xung đột với nhau</b> nếu viết ngây thơ. Giải quyết xung đột ' +
         'đó là phần chính của bài này.',
      hint: 'Với <code>set -e</code>, một <code>command -v</code> thất bại ở vị trí ' +
            '<b>trần</b> sẽ giết script ngay tại công cụ thiếu đầu tiên. Bạn cần đặt nó vào ' +
            'một ngữ cảnh mà mã trả về <b>đang được hỏi tới</b> — đúng quy tắc ở B2.',
      crit: [
        'Có <code>#!/bin/bash</code> và <code>set -euo pipefail</code>',
        'Dùng một vòng <code>for t in …; do … done</code> chứ không lặp tay sáu lần',
        'Giải quyết đúng xung đột với <code>set -e</code>: bọc <code>command -v</code> trong <code>if</code> (hoặc dùng <code>p=$(command -v "$t") || …</code>), để mã thất bại <b>được hỏi tới</b> thay vì bị vứt đi',
        'Thông báo thiếu đi ra stderr bằng <code>>&amp;2</code>',
        'Có biến đếm và <b>khai báo trước vòng lặp</b> (<code>missing=0</code>) — dưới <code>set -u</code>, cộng dồn vào biến chưa đặt sẽ chết',
        'Kết thúc bằng <code>exit</code> phụ thuộc số thiếu, ví dụ <code>[ "$missing" -eq 0 ]</code> ở dòng cuối hoặc <code>exit 1</code> khi <code>missing</code> khác 0',
        'Mọi lần dùng biến đều bọc nháy kép: <code>"$t"</code>, <code>"$missing"</code>',
        'Chạy được thật trên máy: kết quả là sáu dòng <code>ok</code> và <code>missing=0</code>, rc=0'
      ],
      solBlocks: [
        { t: 'p', x: '<b>Điểm khó duy nhất của bài này là xung đột giữa <code>set -e</code> ' +
          'và "phải chạy hết".</b> Nếu viết <code>command -v "$t"</code> đứng trần, thì công ' +
          'cụ thiếu đầu tiên sẽ giết script — bạn mất luôn thông tin về năm cái còn lại. ' +
          'Đúng cái bạn <i>không</i> muốn ở một script kiểm tra môi trường.' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          '#!/bin/bash\n' +
          'set -euo pipefail\n' +
          '\n' +
          'tools="gcc make aarch64-linux-gnu-gcc qemu-system-aarch64 dtc mkimage"\n' +
          'missing=0\n' +
          '\n' +
          'for t in $tools; do\n' +
          '  if p=$(command -v "$t"); then\n' +
          '    printf \'  %-8s%-25s%s\\n\' "ok" "$t" "$p"\n' +
          '  else\n' +
          '    printf \'  %-8s%-25s%s\\n\' "MISSING" "$t" "-" >&2\n' +
          '    missing=$((missing + 1))\n' +
          '  fi\n' +
          'done\n' +
          '\n' +
          'echo "missing=$missing"\n' +
          '[ "$missing" -eq 0 ]' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '  ok      gcc                      /usr/bin/gcc\n' +
          '  ok      make                     /usr/bin/make\n' +
          '  ok      aarch64-linux-gnu-gcc    /usr/bin/aarch64-linux-gnu-gcc\n' +
          '  ok      qemu-system-aarch64      /usr/bin/qemu-system-aarch64\n' +
          '  ok      dtc                      /usr/bin/dtc\n' +
          '  ok      mkimage                  /usr/bin/mkimage\n' +
          'missing=0\n' +
          'rc=0' },
        { t: 'p', x: '<b><code>if p=$(command -v "$t"); then</code></b> giải quyết xung đột: ' +
          'mã trả về của phép gán bây giờ <i>đang được hỏi tới</i>, nên <code>set -e</code> ' +
          'ngoảnh mặt đúng như bạn đã đo ở B2. Cùng một câu <code>if</code> mà ở C2 là ' +
          '<b>lỗi</b> thì ở đây là <b>giải pháp</b> — khác nhau ở chỗ bạn có ' +
          '<i>làm gì</i> với câu trả lời hay không. Ở C2 nhánh <code>else</code> không tồn ' +
          'tại; ở đây nó là phần việc chính.' },
        { t: 'p', x: '<b>Ba chi tiết nhỏ đáng để ý.</b> ' +
          '<code>missing=0</code> phải khai báo <b>trước</b> vòng lặp, vì dưới ' +
          '<code>set -u</code> thì <code>$((missing + 1))</code> trên một biến chưa đặt sẽ ' +
          'giết script. Dòng cuối <code>[ "$missing" -eq 0 ]</code> vừa là phép kiểm tra vừa ' +
          'là mã thoát của script — không cần <code>exit</code> nào cả, vì mã của script là ' +
          'mã của lệnh cuối. Và <code>>&amp;2</code> đưa dòng MISSING ra stderr, nên ' +
          '<code>./check-tools.sh > report.txt</code> vẫn để lỗi hiện trên màn hình.' },
        { t: 'cal', kind: 'why', x: '<b>Vì sao <code>command -v</code> chứ không phải ' +
          '<code>which</code>:</b> <code>command -v</code> là <b>builtin</b> của shell và ' +
          'nằm trong chuẩn POSIX, nên nó có ở mọi nơi, kể cả BusyBox trên board, và không ' +
          'tốn một <code>fork</code> nào. <code>which</code> là một chương trình ngoài, ' +
          'không có trong POSIX, và hành vi lẫn mã thoát khác nhau giữa các bản phân phối — ' +
          'có bản trả 0 ngay cả khi không tìm thấy. Với một script kiểm tra môi trường thì ' +
          'đó là khiếm khuyết chí mạng.' }
      ] },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh', rows: 9,
      q: 'Viết một script <code>work.sh</code> tạo một thư mục làm việc tạm, sinh một file ' +
         'trong đó, rồi <b>cố ý thất bại</b> ở giữa chừng — và vẫn phải dọn sạch thư mục ' +
         'tạm.<br><br>' +
         'Yêu cầu bắt buộc:' +
         '<ul>' +
         '<li>Thư mục tạm do <code>mktemp -d</code> tạo.</li>' +
         '<li>Dọn dẹp bằng <code>trap</code>, chạy được cả khi script chết giữa chừng.</li>' +
         '<li><b>Hàm dọn dẹp phải không thể xoá nhầm</b> ngay cả khi tên biến bị gõ sai: ' +
         'chốt tiền tố bằng <code>case</code>, và <code>"${tmp:?…}"</code> để biến rỗng làm ' +
         'lệnh <b>hỏng</b> thay vì làm nó bung ra.</li>' +
         '</ul>' +
         'Sau khi chạy, hãy <b>chứng minh</b> hai điều: thư mục tạm đã biến mất, và nếu gõ ' +
         'sai tên biến thì script <b>từ chối xoá</b> chứ không xoá bừa.',
      blocks: [
        { t: 'cal', kind: 'danger', x: '<b>Đọc kỹ trước khi gõ.</b> Đây là bài duy nhất ' +
          'trong bộ có một lệnh <code>rm -rf</code> thật. Nó an toàn <b>chỉ vì</b> ba lớp ' +
          'chốt cùng lúc: đối tượng do <code>mktemp -d</code> tạo ra <i>trong chính lần chạy ' +
          'này</i>; đường dẫn bị ghim vào tiền tố <code>/tmp/tmp.</code> bằng ' +
          '<code>case</code>; và <code>${tmp:?}</code> làm lệnh hỏng nếu biến rỗng. ' +
          '<b>Đừng bỏ bớt lớp nào, và đừng sửa đường dẫn thành thư mục của bạn để "thử ' +
          'xem".</b> Nếu chưa chắc chắn, chạy bản có <code>echo rm -rf</code> trước, xem nó ' +
          'in ra gì, rồi mới bỏ <code>echo</code>.' }
      ],
      hint: '<code>${tmp:?thông báo}</code> nghĩa là: nếu <code>tmp</code> rỗng hoặc chưa ' +
            'đặt thì <b>báo lỗi và huỷ lệnh</b>, thay vì lặng lẽ thay bằng chuỗi rỗng. Đó ' +
            'chính là cái đã thiếu trong sự cố ở B4.',
      crit: [
        'Dùng <code>tmp=$(mktemp -d)</code>, không tự đặt tên cố định',
        '<code>trap cleanup EXIT</code> đặt <b>ngay sau</b> khi tạo thư mục — đặt trước thì biến chưa có, đặt muộn thì có khe hở',
        'Hàm dọn dẹp có <code>case "$tmp" in /tmp/tmp.*)</code> để ghim tiền tố, và nhánh <code>*)</code> <b>từ chối</b> kèm thông báo ra stderr',
        'Lệnh xoá viết là <code>rm -rf "${tmp:?…}"</code> — có dấu nháy kép <b>và</b> có <code>:?</code>',
        'Có một lệnh thất bại thật (ví dụ <code>false</code>) ở giữa để chứng minh trap vẫn chạy; script thoát <b>rc=1</b>',
        'Chứng minh được thư mục đã biến mất — ví dụ <code>ls -d /tmp/tmp.*</code> sau khi chạy không còn liệt kê nó',
        'Chạy được biến thể gõ sai tên biến và thu được dòng <code>refusing to remove</code>, đồng thời <b>không</b> có gì bị xoá',
        'Nêu được giới hạn: <code>trap</code> <b>không</b> bắt được <code>SIGKILL</code> (<code>kill -9</code>), nên vẫn cần cơ chế dọn rác định kỳ cho <code>/tmp</code>'
      ],
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          '#!/bin/bash\n' +
          'set -euo pipefail\n' +
          '\n' +
          'tmp=$(mktemp -d)\n' +
          'cleanup() {\n' +
          '  case "$tmp" in\n' +
          '    /tmp/tmp.*) rm -rf "${tmp:?tmp is unset -- refusing to remove anything}" ;;\n' +
          '    *)          echo "refusing to remove: \'$tmp\'" >&2; return 1 ;;\n' +
          '  esac\n' +
          '}\n' +
          'trap cleanup EXIT\n' +
          '\n' +
          'echo "  work dir: $tmp"\n' +
          ': > "$tmp/object.o"\n' +
          'ls -A "$tmp" | sed \'s/^/    /\'\n' +
          'echo "  now failing on purpose"\n' +
          'false\n' +
          'echo "  NEVER PRINTED"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '  work dir: /tmp/tmp.jNz4byYmj5\n' +
          '    object.o\n' +
          '  now failing on purpose\n' +
          'rc=1\n' +
          '-- did the trap really clean up?\n' +
          '   (nothing listed -- it did)' },
        { t: 'p', x: '<b>Bằng chứng nằm ở ba chỗ.</b> Dòng <code>NEVER PRINTED</code> không ' +
          'xuất hiện — <code>set -e</code> đã giết script ở <code>false</code>. ' +
          '<code>rc=1</code> — mã thất bại được giữ nguyên, không bị hàm dọn dẹp nuốt mất. ' +
          'Và <code>ls -d /tmp/tmp.*</code> sau đó không liệt kê thư mục nào — ' +
          '<code>trap</code> đã chạy dù script chết bất thường.' },
        { t: 'p', x: '<b>Bây giờ là phần đáng giá nhất: gõ sai tên biến.</b> Thay ' +
          '<code>$tmp</code> trong hàm dọn dẹp bằng <code>$tmpp</code> — đúng loại lỗi đã ' +
          'gây ra sự cố ở B4 — rồi chạy lại:' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '  work dir: /tmp/tmp.Uo6eWJ6MGA\n' +
          '  refusing to remove: \'<unset>\'\n' +
          'rc=0\n' +
          '-- mktemp dirs left behind (the guard did its job, nothing was deleted):\n' +
          '1' },
        { t: 'p', x: '<b>Chốt đã làm đúng việc của nó.</b> Biến rỗng không khớp mẫu ' +
          '<code>/tmp/tmp.*</code>, nên nhánh <code>*)</code> chạy: in một dòng từ chối ra ' +
          'stderr và <b>không xoá gì</b>. Hậu quả duy nhất là một thư mục tạm bị bỏ lại — ' +
          'rác, phiền, và hoàn toàn vô hại. So sánh với B4, nơi cùng một lỗi gõ sai tên biến ' +
          'sinh ra <code>rm -rf /*</code>: khác biệt giữa "để lại rác" và "mất máy" nằm ở ' +
          'đúng ba dòng <code>case</code>.' },
        { t: 'cal', kind: 'why', x: '<b>Vì sao cả hai lớp chốt đều cần.</b> ' +
          '<code>case</code> chặn <i>mọi</i> đường dẫn không phải thư mục do ' +
          '<code>mktemp</code> tạo — kể cả <code>/</code>, kể cả <code>$HOME</code>. ' +
          '<code>${tmp:?}</code> chặn riêng trường hợp biến rỗng, và nó chặn ở tầng ' +
          '<i>khai triển</i>: lệnh không được thực hiện chút nào, thay vì được thực hiện với ' +
          'tham số rỗng. Một lớp chống lỗi logic, một lớp chống lỗi gõ phím.' },
        { t: 'cal', kind: 'warn', x: '<b>Giới hạn phải biết:</b> <code>trap</code> ' +
          'không bắt được <code>SIGKILL</code>. <code>kill -9</code>, OOM killer, hay máy ' +
          'mất điện đều để lại thư mục tạm. Trên máy build dùng chung, ' +
          '<code>trap</code> là biện pháp chính nhưng không phải biện pháp duy nhất — vẫn ' +
          'cần một cơ chế dọn <code>/tmp</code> định kỳ.' }
      ] },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi', rows: 12,
      q: 'Script <code>build.sh</code> dưới đây có <b>năm</b> khiếm khuyết. Chúng nằm chồng ' +
         'lên nhau: sửa cái thứ nhất mới lộ ra cái thứ hai, và cứ thế.<br><br>' +
         'Tìm cả năm, sửa <b>từng cái một</b>, và sau mỗi lần sửa hãy chạy lại rồi ghi lại ' +
         'mã thoát cùng đầu ra. Với mỗi khiếm khuyết, trả lời: <b>nó hỏng theo kiểu ồn ào ' +
         'hay im lặng?</b><br><br>' +
         'Chuẩn bị: <code>mkdir -p ~/bt13/src &amp;&amp; cd ~/bt13 &amp;&amp; ' +
         ': > src/main.c; : > src/util.c; : > src/led.c</code> — <b>ba</b> file ' +
         '<code>.c</code>, con số này sẽ có ý nghĩa.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          '#!/bin/bash\n' +
          'set -e\n' +
          '\n' +
          'ARCH = arm64\n' +
          'out_dir="$HOME/bt13/my builds"\n' +
          'mkdir -p $out_dir\n' +
          '\n' +
          'i=99\n' +
          'count_sources() {\n' +
          '  i=0\n' +
          '  for f in src/*.c; do i=$((i + 1)); done\n' +
          '  return $i\n' +
          '}\n' +
          '\n' +
          'n=$(count_sources)\n' +
          'if [ "$n" > 0 ]; then\n' +
          '  echo "found $n source files, building for $ARCH"\n' +
          'fi\n' +
          'echo "i is now $i"' },
        { t: 'cal', kind: 'tip', x: 'Sau mỗi lần chạy, gõ thêm <code>ls -A</code>. ' +
          'Hai trong năm khiếm khuyết chỉ để lộ mình qua <b>những file lạ xuất hiện trong ' +
          'thư mục</b>, chứ không qua một dòng thông báo nào.' }
      ],
      hint: 'Khiếm khuyết thứ hai làm script thoát với mã <b>3</b> và <b>không in gì cả</b> ' +
            '— một triệu chứng rất lạ. Số 3 đó có liên quan tới số file <code>.c</code>. Còn ' +
            'khiếm khuyết thứ tư thì tạo ra một file có tên chỉ gồm một chữ số.',
      crit: [
        '<b>Khiếm khuyết 1</b>: <code>ARCH = arm64</code> — có khoảng trắng quanh <code>=</code> nên bash đọc thành <b>lệnh</b> <code>ARCH</code>. Hỏng <b>ồn ào</b>: <code>command not found</code>, rc=<b>127</b>',
        '<b>Khiếm khuyết 2</b>: <code>return $i</code> dùng như trả về <b>giá trị</b>. Với <code>n=$(count_sources)</code>, phép thay thế lệnh mang mã 3, và <code>set -e</code> giết script ngay tại dòng gán — rc=<b>3</b>, <b>không in gì</b>. Hỏng im lặng một cách khó hiểu nhất',
        'Chứng minh được nguồn gốc số 3: thêm một file <code>.c</code> thứ tư thì mã thoát thành <b>4</b>',
        '<b>Khiếm khuyết 3</b>: <code>mkdir -p $out_dir</code> không bọc nháy, mà giá trị chứa khoảng trắng → tạo <b>hai</b> thư mục <code>my</code> và <code>builds</code>. Hỏng <b>im lặng</b>, rc=0',
        '<b>Khiếm khuyết 4</b>: <code>[ "$n" > 0 ]</code> — <code>&gt;</code> là <b>chuyển hướng</b>, không phải so sánh. Nó tạo một file tên <code>0</code>, và <code>[ "$n" ]</code> chỉ kiểm tra chuỗi khác rỗng nên nhánh <b>luôn</b> được chọn. Hỏng im lặng; sửa thành <code>-gt</code>',
        '<b>Khiếm khuyết 5</b>: thiếu <code>local i</code> nên hàm <b>phá</b> biến <code>i</code> của người gọi. Hỏng im lặng, và ở đây còn <b>vô hình</b>',
        'Giải thích được vì sao khiếm khuyết 5 vô hình trong script này: hàm được gọi qua <code>$( )</code>, tức chạy trong một <b>tiến trình con</b>, nên <code>i</code> của người gọi không bị đụng tới — gọi trực tiếp thì nó bị phá',
        'Bản sửa cuối cùng dùng <code>set -euo pipefail</code>, <code>ARCH=arm64</code>, <code>mkdir -p "$out_dir"</code>, <code>echo "$i"</code> thay cho <code>return</code>, <code>-gt</code>, và <code>local i</code>'
      ],
      solBlocks: [
        { t: 'p', x: '<b>Thang sửa lỗi từng bậc — đây là cách duy nhất để thấy chúng, vì ' +
          'mỗi khiếm khuyết che khiếm khuyết kế tiếp.</b>' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '----- v1.sh   (as written)\n' +
          'v1.sh: line 3: ARCH: command not found\n' +
          '      rc=127\n' +
          '      files here: src v1.sh\n' +
          '\n' +
          '----- v2.sh   (defect 1 fixed: ARCH=arm64)\n' +
          '      rc=3                      <- NOTHING printed\n' +
          '      files here: builds my src v1.sh v2.sh\n' +
          '\n' +
          '----- v3.sh   (defects 2+3 fixed: "$out_dir" quoted, echo instead of return)\n' +
          'found 3 source files, building for arm64\n' +
          'i is now 99\n' +
          '      rc=0\n' +
          '      files here: 0 builds my "my builds" src v1.sh v2.sh v3.sh\n' +
          '\n' +
          '----- v4.sh   (defect 4 fixed: -gt)\n' +
          'found 3 source files, building for arm64\n' +
          'i is now 99\n' +
          '      rc=0    (no new "0" file)\n' +
          '\n' +
          '----- v5.sh   (defect 5 fixed: local i)\n' +
          'found 3 source files, building for arm64\n' +
          'i is now 99\n' +
          '      rc=0' },
        { t: 'h4', x: 'Khiếm khuyết 1 — <code>ARCH = arm64</code>' },
        { t: 'p', x: 'Khoảng trắng quanh <code>=</code> biến câu gán thành một câu lệnh: ' +
          'bash đi tìm chương trình tên <code>ARCH</code> với hai tham số <code>=</code> và ' +
          '<code>arm64</code>. <code>command not found</code>, mã <b>127</b>, và ' +
          '<code>set -e</code> dừng script. Đây là khiếm khuyết <b>tử tế nhất</b> trong năm ' +
          'cái: ồn ào, có số dòng, sửa trong ba giây.' },
        { t: 'h4', x: 'Khiếm khuyết 2 — <code>return</code> dùng để chở giá trị' },
        { t: 'p', x: '<b>rc=3 và không một dòng đầu ra.</b> Đây là triệu chứng khó hiểu nhất ' +
          'trong bài. Cơ chế: <code>count_sources</code> không <code>echo</code> gì, nên ' +
          '<code>$( )</code> thu được chuỗi <b>rỗng</b>; đồng thời phép thay thế lệnh mang ' +
          'theo mã thoát <b>3</b> của hàm. Trong bash, mã thoát của một phép gán ' +
          '<code>n=$( … )</code> <b>chính là</b> mã của lệnh bên trong — nên với ' +
          '<code>set -e</code>, script chết ngay tại dòng đó, trước cả câu <code>if</code>. ' +
          'Không có gì được in ra.' },
        { t: 'p', x: '<b>Bằng chứng số 3 đến từ đâu:</b> thêm một file <code>.c</code> thứ ' +
          'tư rồi chạy lại — mã thoát thành <b>4</b>. Con số ấy chính là số file, đi lạc từ ' +
          'kênh dữ liệu sang kênh trạng thái. Đúng nội dung trục xoáy ở A5 và B3.' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '===== proof that the rc of v2 equals the number of .c files\n' +
          'now 4 .c files\n' +
          'v2.sh rc=4' },
        { t: 'h4', x: 'Khiếm khuyết 3 — <code>mkdir -p $out_dir</code> không bọc nháy' },
        { t: 'p', x: 'Giá trị là <code>my builds</code>, có khoảng trắng, nên shell tách ' +
          'thành <b>hai</b> tham số và <code>mkdir</code> tạo hai thư mục ' +
          '<code>my</code> và <code>builds</code>. Không lỗi, rc=0. Bạn chỉ thấy nó qua ' +
          '<code>ls -A</code>. Đúng cơ chế đã mổ ở B5.' },
        { t: 'h4', x: 'Khiếm khuyết 4 — <code>[ "$n" > 0 ]</code>' },
        { t: 'p', x: 'Trong <code>[ ]</code>, dấu <code>&gt;</code> <b>không</b> phải phép ' +
          'so sánh — shell đọc nó là <b>chuyển hướng đầu ra</b>. Kết quả là một file tên ' +
          '<code>0</code> được tạo ra (nhìn thấy trong <code>ls -A</code> ở bước v3), còn ' +
          '<code>[ ]</code> chỉ nhận đúng <b>một</b> tham số là <code>"$n"</code> — và ' +
          '<code>[ chuỗi ]</code> nghĩa là "chuỗi khác rỗng". Với <code>n=3</code> thì đúng; ' +
          'nhưng với <code>n=0</code> thì <b>cũng đúng</b>, vì <code>"0"</code> là một chuỗi ' +
          'khác rỗng. Nhánh <code>then</code> <b>luôn</b> được chọn. Sửa: dùng ' +
          '<code>-gt</code>.' },
        { t: 'h4', x: 'Khiếm khuyết 5 — thiếu <code>local i</code>' },
        { t: 'p', x: 'Hàm đặt <code>i=0</code> rồi đếm lên, dùng chung biến <code>i</code> ' +
          'với người gọi. Nhưng nhìn transcript v3/v4: <code>i is now 99</code> — ' +
          '<b>không</b> bị phá. Vì sao?' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '===== called through $( ) -- the function runs in a SUBSHELL\n' +
          '  n=3   i=99   <- caller\'s i untouched\n' +
          '\n' +
          '===== called directly -- same function, caller\'s i is destroyed\n' +
          '  i=3   <- clobbered\n' +
          '\n' +
          '===== with local, called directly\n' +
          '  i=99   <- safe\n' +
          '\n' +
          '===== a counter inside a loop\n' +
          '  outer i is now 3\n' +
          '  outer i is now 3\n' +
          '  outer i is now 3\n' +
          '  loop finished' },
        { t: 'p', x: '<b>Vì <code>$( )</code> chạy hàm trong một tiến trình con.</b> Mọi ' +
          'thay đổi biến ở đó chết theo tiến trình con và không quay về được người gọi. ' +
          'Khiếm khuyết vẫn nằm nguyên trong mã, chỉ là <b>vô hình</b> ở cách gọi này. Đổi ' +
          'sang gọi trực tiếp — đúng thứ người bảo trì tiếp theo sẽ làm khi sửa khiếm khuyết ' +
          '2 — thì <code>i</code> của người gọi bị phá ngay. Nếu <code>i</code> lại là biến ' +
          'đếm của một vòng <code>for</code> bao ngoài, bạn có một vòng lặp chạy sai hoặc ' +
          'chạy mãi.' },
        { t: 'cal', kind: 'danger', x: '<b>Đây là bài học đắt nhất của cả câu này:</b> một ' +
          'khiếm khuyết <i>không biểu hiện</i> vẫn là một khiếm khuyết. Nó đang chờ một thay ' +
          'đổi vô hại ở chỗ khác — một lời gọi đổi từ <code>$( )</code> sang gọi trực tiếp — ' +
          'để trở thành sự cố. "Chạy đúng" không đồng nghĩa với "đúng".' },
        { t: 'h4', x: 'Bản đã sửa' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          '#!/bin/bash\n' +
          'set -euo pipefail\n' +
          '\n' +
          'ARCH=arm64\n' +
          'out_dir="$HOME/bt13/my builds"\n' +
          'mkdir -p "$out_dir"\n' +
          '\n' +
          'i=99\n' +
          'count_sources() {\n' +
          '  local i=0\n' +
          '  for f in src/*.c; do\n' +
          '    [ -e "$f" ] || continue\n' +
          '    i=$((i + 1))\n' +
          '  done\n' +
          '  echo "$i"\n' +
          '}\n' +
          '\n' +
          'n=$(count_sources)\n' +
          'if [ "$n" -gt 0 ]; then\n' +
          '  echo "found $n source files, building for $ARCH"\n' +
          'fi\n' +
          'echo "i is now $i"' },
        { t: 'p', x: 'Dòng <code>[ -e "$f" ] || continue</code> là phần thêm không có trong ' +
          'đề: khi thư mục <code>src</code> <b>không</b> có file <code>.c</code> nào, bash ' +
          'để nguyên chuỗi <code>src/*.c</code> và vòng lặp vẫn chạy đúng một lần, đếm ' +
          'thành 1. Đây là một khiếm khuyết thứ sáu mà bài không hỏi tới — tìm ra được là ' +
          'điểm cộng.' },
        { t: 'p', x: '<b>Bốn trong năm khiếm khuyết hỏng im lặng.</b> Chỉ khiếm khuyết 1 tự ' +
          'báo mình. Đó là tỉ lệ thật của việc viết shell, và là lý do ' +
          '<code>set -euo pipefail</code>, dấu nháy kép, và <code>bash -x</code> không phải ' +
          'là thói quen cầu kỳ mà là điều kiện cần.' }
      ] },

    { id: 'e6', k: 'free', tag: 'Thử thách', rows: 10,
      q: '<b>Thử thách — được phép chưa xong.</b> Lấy bản <code>build.sh</code> đã sửa ở ' +
         'E5, viết lại thành <code>build-posix.sh</code> chạy được dưới ' +
         '<b>dash</b> (tức <code>/bin/sh</code>), để nó dùng được trên một rootfs BusyBox ' +
         'không có bash.<br><br>' +
         'Đổi shebang thành <code>#!/bin/sh</code>, rồi kiểm tra bằng ' +
         '<code>dash -n build-posix.sh</code> và chạy bằng cả <code>sh</code> lẫn ' +
         '<code>bash</code> — kết quả phải giống nhau.<br><br>' +
         'Ba câu để trả lời sau khi làm xong:' +
         '<ul>' +
         '<li>Bạn đã phải bỏ <b>những gì</b> của bash? Với mỗi cái, thay bằng gì?</li>' +
         '<li><code>dash -n</code> bắt được loại lỗi nào, và <b>không</b> bắt được loại ' +
         'nào?</li>' +
         '<li>Có nên đưa <b>mọi</b> script của nhóm về POSIX không? Bảo vệ câu trả lời.</li>' +
         '</ul>',
      blocks: [
        { t: 'cal', kind: 'info', x: 'Trên máy này <code>/bin/sh</code> là một liên kết mềm ' +
          'tới <code>dash</code>, nên <code>sh script.sh</code> và ' +
          '<code>dash script.sh</code> là một. Trên board BusyBox thì ' +
          '<code>/bin/sh</code> là <code>ash</code> — họ hàng gần của dash, nghèo hơn dash ' +
          'ở vài chỗ. Qua được dash là điều kiện cần, chưa phải điều kiện đủ.' }
      ],
      hint: 'Đi soát từng dòng và hỏi "cái này có trong POSIX không". Bốn nghi phạm thường ' +
            'gặp: <code>[[ ]]</code>, mảng, <code>local</code>, và ' +
            '<code>set -o pipefail</code>. Một trong bốn cái đó <b>thật ra vẫn chạy</b> dưới ' +
            'dash trên máy này — chạy thử để biết là cái nào.',
      crit: [
        'Shebang đổi thành <code>#!/bin/sh</code>',
        '<code>set -euo pipefail</code> phải bỏ <code>pipefail</code> → còn <code>set -eu</code>; nêu đúng lý do: <code>pipefail</code> <b>không</b> có trong POSIX',
        'Nếu bản gốc dùng <code>[[ ]]</code> thì đổi sang <code>[ ]</code>, và nêu được cái giá: <code>[ ]</code> cần bọc nháy cẩn thận hơn vì biến rỗng làm hỏng cú pháp',
        'Nếu bản gốc dùng mảng thì thay bằng chuỗi phân tách bằng khoảng trắng, hoặc bằng <code>set -- a b c</code> và <code>"$@"</code>',
        'Nhận ra và <b>đo được</b> rằng <code>local</code> vẫn hoạt động dưới dash trên máy này, dù không có trong POSIX — nên giữ được nhưng phải biết đó là chỗ dựa vào hành vi ngoài chuẩn',
        '<code>dash -n build-posix.sh</code> trả về 0, và <code>sh</code> lẫn <code>bash</code> cho <b>cùng</b> một đầu ra <code>found 3 source files, building for arm64</code>',
        'Trả lời đúng về giới hạn: <code>dash -n</code> chỉ kiểm tra <b>cú pháp</b> — nó không phát hiện lệnh không tồn tại, tuỳ chọn không được hỗ trợ, hay lỗi logic',
        'Câu thứ ba trả lời có lập luận, nhất quán với tiêu chí "môi trường đích" đã dùng ở C5 — không mâu thuẫn với chính mình'
      ],
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          '#!/bin/sh\n' +
          'set -eu\n' +
          '\n' +
          'ARCH=arm64\n' +
          'out_dir="$HOME/bt13/out"\n' +
          'mkdir -p "$out_dir"\n' +
          '\n' +
          'count_sources() {\n' +
          '  n=0\n' +
          '  for f in src/*.c; do\n' +
          '    [ -e "$f" ] || continue\n' +
          '    n=$((n + 1))\n' +
          '  done\n' +
          '  echo "$n"\n' +
          '}\n' +
          '\n' +
          'n=$(count_sources)\n' +
          'if [ "$n" -gt 0 ]; then\n' +
          '  echo "  found $n source files, building for $ARCH"\n' +
          'fi' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '-- syntax check with dash:\n' +
          '   dash -n: OK\n' +
          '-- run under sh:\n' +
          '  found 3 source files, building for arm64\n' +
          '   rc=0\n' +
          '-- run under bash, same file:\n' +
          '  found 3 source files, building for arm64\n' +
          '   rc=0' },
        { t: 'h4', x: 'Phải bỏ những gì' },
        { t: 'list', items: [
          '<b><code>set -o pipefail</code> → bỏ.</b> Không có trong POSIX và dash không hỗ ' +
          'trợ. Đây là mất mát <b>thật</b>: bạn không còn cách gọn nào để phát hiện thất bại ' +
          'ở khâu đầu đường ống. Bù lại bằng cách <b>tách đường ống ra</b> — ghi ra file ' +
          'trung gian rồi kiểm tra mã thoát từng lệnh.',
          '<b><code>[[ ]]</code> → <code>[ ]</code>.</b> Giá phải trả là kỷ luật nháy kép: ' +
          '<code>[[ $x = a ]]</code> vẫn chạy khi <code>x</code> rỗng, còn ' +
          '<code>[ $x = a ]</code> thì <b>lỗi cú pháp</b>. Phải viết ' +
          '<code>[ "$x" = a ]</code>, luôn luôn.',
          '<b>Mảng → chuỗi hoặc <code>"$@"</code>.</b> POSIX không có mảng. Với danh sách ' +
          'đơn giản thì một chuỗi phân tách bằng khoảng trắng là đủ; với thứ cần giữ nguyên ' +
          'khoảng trắng bên trong phần tử thì dùng <code>set -- a b c</code> rồi lặp trên ' +
          '<code>"$@"</code>.',
          '<b><code>local</code> → giữ được, nhưng phải biết mình đang dựa vào cái gì.</b> ' +
          '<code>local</code> <i>không</i> có trong POSIX, nhưng dash trên máy này hỗ trợ ' +
          'nó, và ash của BusyBox cũng vậy. Đo thật: một hàm dùng <code>local</code> chạy ' +
          'dưới dash cho kết quả đúng, rc=0. Đây là chỗ dựa vào hành vi ngoài chuẩn — chấp ' +
          'nhận được, nhưng phải ghi lại trong quy ước của nhóm để người sau không tưởng nó ' +
          'là POSIX.'
        ] },
        { t: 'h4', x: '<code>dash -n</code> bắt được gì, không bắt được gì' },
        { t: 'p', x: '<b>Bắt được:</b> lỗi <b>cú pháp</b> — mảng <code>a=(1 2)</code>, ' +
          '<code>function f() {}</code>, <code>&amp;>file</code>, ' +
          '<code>${var,,}</code>. Đây là những thứ dash không phân tích nổi, và nó báo ngay ' +
          'mà <b>không chạy một dòng nào</b> — điểm mấu chốt, vì như bạn đã thấy ở B1, dash ' +
          'chạy tới đâu phân tích tới đó, nên nếu <i>chạy</i> thật thì các dòng trước chỗ ' +
          'lỗi đã kịp thực hiện rồi.' },
        { t: 'p', x: '<b>Không bắt được — và đây là danh sách phải thuộc:</b>' },
        { t: 'list', items: [
          '<b><code>[[ ]]</code>.</b> Với dash đây là một <i>tên lệnh</i>, hoàn toàn hợp lệ ' +
          'về cú pháp. <code>dash -n</code> im lặng, rồi lúc chạy mới báo ' +
          '<code>[[: not found</code> — và script <b>vẫn đi tiếp</b>, có thể thoát 0.',
          '<b>Lệnh không tồn tại trên board.</b> <code>dash -n</code> không kiểm tra ' +
          '<code>PATH</code>. Script gọi <code>stat</code> hay <code>realpath</code> vẫn qua ' +
          'được, rồi chết trên rootfs không có chúng.',
          '<b>Tuỳ chọn không được hỗ trợ.</b> <code>sed -i</code>, ' +
          '<code>grep -P</code>, <code>find -printf</code> — BusyBox nghèo hơn GNU rất ' +
          'nhiều, và đây là nguồn lỗi phổ biến nhất khi đưa script lên thiết bị.',
          '<b>Mọi lỗi logic.</b> <code>[ "$n" > 0 ]</code> ở E5 là cú pháp hoàn toàn hợp lệ ' +
          'và hoàn toàn sai nghĩa.'
        ] },
        { t: 'cal', kind: 'warn', x: '<b>Kết luận về <code>dash -n</code>:</b> nó là bước ' +
          'rẻ nhất và nên nằm trong CI, nhưng nó chỉ trả lời "dash có <i>đọc</i> được file ' +
          'này không". Nó không trả lời "script này có chạy đúng trên board không". Chạy thử ' +
          'trên đích — hoặc ít nhất trong QEMU với đúng rootfs — vẫn là bắt buộc.' },
        { t: 'h4', x: 'Có nên đưa mọi script về POSIX không' },
        { t: 'p', x: '<b>Không</b> — và câu trả lời này phải nhất quán với tiêu chí bạn đã ' +
          'dùng ở C5: quyết định theo <b>môi trường đích</b>. Script đi vào rootfs thì POSIX ' +
          'là bắt buộc, vì ở đó có thể không có bash và vài trăm KB flash là tiền thật. ' +
          'Script chạy trên CI và máy trạm thì ép POSIX chỉ làm chúng dài hơn, khó đọc hơn ' +
          'và <b>dễ sai hơn</b> — mất <code>pipefail</code> ở một script build là mất đúng ' +
          'thứ đã gây ra sự cố C2.' },
        { t: 'p', x: 'Điều thực sự cần không phải là một cú pháp duy nhất, mà là ' +
          '<b>ranh giới rõ ràng và một cơ chế giữ ranh giới đó</b>: tách thư mục theo vai ' +
          'trò, chạy <code>dash -n</code> trong CI cho phía thiết bị, và để bước đóng gói ' +
          'rootfs <b>từ chối</b> mọi file có shebang <code>#!/bin/bash</code>. Quy ước không ' +
          'có cơ chế thi hành thì chỉ là một dòng chữ trong tài liệu mà không ai đọc.' },
        { t: 'p', x: '<b>Câu hỏi để ngỏ, và bài sau sẽ trả lời:</b> nếu script này phải ' +
          'chạy <b>rất sớm</b> trong quá trình khởi động — trước khi rootfs thật được gắn — ' +
          'thì nó chạy bằng shell nào, và nó có gì trong tay? Đó là câu chuyện của ' +
          '<code>initramfs</code> và tiến trình <code>init</code>, ở ' +
          '<b>Chặng 07</b> và <b>Chặng 08</b>.' }
      ] },
  ],

  /* ═══ F · Bí ở đâu thì đọc lại đâu ═════════════════════════════════════════ */
  diag: [
    ['A1, A6, B1, C1, E1',
     'Bạn còn tin rằng dòng <code>#!/bin/bash</code> <b>bảo đảm</b> script chạy bằng bash. ' +
     'Nó chỉ có hiệu lực khi <b>kernel</b> là bên khởi chạy file — tức khi tên file ' +
     '<i>là</i> lệnh. <code>sh script.sh</code> bỏ qua nó hoàn toàn.',
     '<a href="#/bai-13#tu-dong-lenh-toi-file-shebang-va-quyen-thuc-thi">Đọc lại Bài 13 — ' +
     'Từ dòng lệnh tới file: shebang và quyền thực thi</a>'],

    ['A2, B2, B6, C2, E2',
     'Bạn còn tin <code>set -e</code> dừng script khi <b>bất cứ</b> lệnh nào lỗi. Nó cố ý ' +
     'ngoảnh mặt khi mã trả về <b>đang được hỏi tới</b>: trong <code>if</code>, ở vế trái ' +
     '<code>&amp;&amp;</code>/<code>||</code>, sau <code>!</code>, và ở khâu không phải khâu ' +
     'cuối của đường ống.',
     '<a href="#/bai-13#set-euo-pipefail-ba-cong-tac-an-toan">Đọc lại Bài 13 — ' +
     'set -euo pipefail: ba công tắc an toàn</a>'],

    ['A5, B3, C3',
     'Bạn còn coi <code>return</code> là cách hàm <b>trả về giá trị</b>. Nó đặt ' +
     '<b>mã trạng thái</b>. Giá trị đi ra bằng <code>echo</code> và được người gọi hứng bằng ' +
     '<code>$( )</code> — hai kênh khác nhau, không thể dùng lẫn.',
     '<a href="#/bai-13#ham-va-tham-so">Đọc lại Bài 13 — Hàm và tham số</a>'],

    ['A4, A8',
     'Bạn chưa thuộc bảng mã thoát, hoặc chưa nắm rằng mã chỉ rộng <b>8 bit</b> nên bị lấy ' +
     'dư 256 (<code>return 300</code> → <code>44</code>). 126 và 127 là hai mã đáng nhớ ' +
     'nhất: không thực thi được, và không tìm thấy.',
     '<a href="#/bai-13#ma-tra-ve-ngon-ngu-ma-cac-chuong-trinh-dung-de-noi-chuyen">Đọc lại ' +
     'Bài 13 — Mã trả về: ngôn ngữ mà các chương trình dùng để nói chuyện</a>'],

    ['A3, A7, B5',
     'Bạn chưa thấy rằng shell <b>tách từ trước</b>, rồi mới khởi chạy chương trình — nên ' +
     '<code>mkdir -p $dir</code> với <code>dir="my build dir"</code> tạo ba thư mục, và ' +
     '<code>[</code> đúng là một <b>tên lệnh</b> nên bắt buộc phải có khoảng trắng hai bên.',
     '<a href="#/bai-13#bien-va-dau-nhay-noi-90-loi-script-sinh-ra">Đọc lại Bài 13 — ' +
     'Biến và dấu nháy — nơi 90 % lỗi script sinh ra</a>'],

    ['B4',
     'Bạn chưa thấy vì sao <code>set -u</code> đáng giá: biến chưa đặt mặc định bung ra ' +
     '<b>chuỗi rỗng</b>, và một tên gõ sai biến <code>rm -rf "$dir"/*</code> thành ' +
     '<code>rm -rf /*</code> — <b>không lỗi, mã thoát 0</b>. Dấu nháy kép không cứu được ' +
     'trường hợp này.',
     '<a href="#/bai-13#set-euo-pipefail-ba-cong-tac-an-toan">Đọc lại Bài 13 — ' +
     'set -euo pipefail: ba công tắc an toàn</a>'],

    ['C4, E4',
     'Bạn chưa viết được một hàm dọn dẹp <b>không thể xoá nhầm</b>. Ba thành phần bắt buộc: ' +
     '<code>mktemp -d</code> để có đường dẫn duy nhất, <code>trap … EXIT INT TERM</code> để ' +
     'nó chạy cả khi script chết, và chốt <code>case</code> + <code>${tmp:?}</code> để một ' +
     'biến rỗng làm lệnh <b>hỏng</b> thay vì bung ra.',
     '<a href="#/bai-13#here-doc-va-trap">Đọc lại Bài 13 — here-doc và trap</a>'],

    ['E3',
     'Bạn chưa quen dựng một vòng lặp kiểm tra sao cho nó <b>chạy hết</b> danh sách dù có ' +
     'phần tử hỏng. Mấu chốt là đặt phép kiểm tra vào một ngữ cảnh mà ' +
     '<code>set -e</code> tha — <code>if p=$(command -v "$t"); then … else … fi</code>.',
     '<a href="#/bai-13#re-nhanh-va-vong-lap">Đọc lại Bài 13 — Rẽ nhánh và vòng lặp</a>'],

    ['C5, E6',
     'Bạn chưa có tiêu chí để chọn giữa bash và POSIX. Tiêu chí là <b>môi trường đích</b>: ' +
     'rootfs BusyBox không có bash, máy trạm thì có đủ. Và một quy ước không kèm ' +
     '<b>cơ chế thi hành</b> (<code>dash -n</code> trong CI, tách thư mục theo vai trò) chỉ ' +
     'là một dòng chữ trong tài liệu.',
     '<a href="#/bai-13#tu-dong-lenh-toi-file-shebang-va-quyen-thuc-thi">Đọc lại Bài 13 — ' +
     'Từ dòng lệnh tới file: shebang và quyền thực thi</a>'],

    ['E5',
     'Bạn chưa gỡ được một script nhiều lỗi chồng nhau. Phương pháp: sửa <b>từng cái một</b> ' +
     'và chạy lại sau mỗi lần, vì lỗi trước che lỗi sau. Công cụ đầu tiên nên với tới là ' +
     '<code>bash -x</code>, và đừng quên <code>ls -A</code> — hai trong năm khiếm khuyết chỉ ' +
     'lộ mình qua file lạ xuất hiện trong thư mục.',
     '<a href="#/bai-13#thuc-hanh-tu-dong-lenh-toi-script-build-arm64">Đọc lại Bài 13 — ' +
     'Thực hành: từ dòng lệnh tới script build ARM64</a>'],

    ['D1',
     'Bạn chưa nắm rằng <code>2>&amp;1</code> là phép <b>chụp</b> đích hiện tại của fd 1, ' +
     'không phải phép nối vĩnh viễn — nên thứ tự viết quyết định kết quả. Đây cũng là lý do ' +
     '<code>make 2>&amp;1 | tee log</code> phải đặt <code>2>&amp;1</code> <b>trước</b> dấu ' +
     'ống.',
     '<a href="#/bai-10#chuyen-huong-noi-lai-dau-day">Đọc lại Bài 10 — ' +
     'Chuyển hướng: nối lại đầu dây</a>'],

    ['D2',
     'Bạn chưa nhớ rằng <code>sed</code> là một <b>bộ lọc</b> và <code>-i</code> không sửa ' +
     'tại chỗ: nó ghi file mới rồi <code>rename</code> đè lên <b>đường dẫn</b>. Inode đổi, ' +
     'nên symlink bị thay thế và hard link bị đứt — hoàn toàn im lặng, mã thoát 0.',
     '<a href="#/bai-11#sed-sua-van-ban-theo-luong">Đọc lại Bài 11 — ' +
     'sed: sửa văn bản theo luồng</a>'],

    ['D3',
     'Bạn chưa nắm thứ tự tra lệnh của shell: <b>builtin trước, <code>PATH</code> sau</b>. ' +
     'Đây là lý do <code>[</code> chạy bằng builtin dù <code>/usr/bin/[</code> có tồn tại, ' +
     'và là lý do <code>type -a</code> là công cụ đầu tiên khi một lệnh cư xử khác mong đợi.',
     '<a href="#/bai-04#mot-lenh-that-su-den-tu-dau">Đọc lại Bài 4 — ' +
     'Một lệnh thật sự đến từ đâu</a>']
  ]
});

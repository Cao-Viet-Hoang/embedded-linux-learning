/* ═══════════════════════════════════════════════════════════════════════════
   BT-11 — Bài tập cho Bài 11: "Tìm kiếm và xử lý văn bản"
   ═══════════════════════════════════════════════════════════════════════════

   §13.4 — CHỌN TRỤC XOÁY. Bảy bước, ghi lại để phiên sau soi được lựa chọn
   thay vì phải suy lại từ đầu.

   BƯỚC 1–2. Kiểm kê rồi chấm điểm. PT = phụ thuộc về sau, GIA = giá phải trả
   khi hiểu sai, NGC = ngược trực giác. Thang 0/1/2.

   Khái niệm                                            | PT | GIA | NGC | Tổng
   -----------------------------------------------------|----|-----|-----|-----
   uniq chỉ gộp các dòng giống nhau NẰM CẠNH NHAU        |  2 |  2  |  2  |  6
   sed KHÔNG sửa file — nó đọc, biến đổi, in ra stdout   |  2 |  2  |  2  |  6
   Trong BRE, + ? { } ( ) | là ký tự THƯỜNG              |  2 |  2  |  2  |  6
   sed -i THAY THẾ file (inode mới) → đứt symlink/hardlink|  2 |  2  |  2  |  6
   -o ưu tiên thấp hơn phép AND ngầm → phải có \( \)     |  2 |  2  |  1  |  5
   grep -c đếm DÒNG khớp, không đếm số LẦN xuất hiện     |  2 |  1  |  2  |  5
   sort mặc định so sánh theo CHUỖI, không theo số       |  2 |  1  |  2  |  5
   for (k in arr) của awk có thứ tự KHÔNG xác định       |  1 |  2  |  2  |  5
   -F tắt sạch nghĩa regex; dấu . vốn khớp mọi ký tự     |  2 |  2  |  1  |  5
   Tên file có khoảng trắng phá vỡ xargs                 |  2 |  2  |  1  |  5
   find -exec \; gọi một lần mỗi file, + thì gom lại     |  2 |  2  |  1  |  5
   find -size -1k làm tròn LÊN, nên -1k không ra gì      |  1 |  2  |  2  |  5
   grep -r KHÔNG theo symlink, -R thì có                 |  1 |  1  |  2  |  4
   awk luôn dùng ERE, kể cả khi grep cạnh nó dùng BRE    |  1 |  1  |  2  |  4
   $NF khác $9 ngay khi số cột thay đổi giữa các dòng    |  1 |  1  |  2  |  4
   grep -w: dấu _ được tính là ký tự từ                  |  1 |  1  |  2  |  4
   Lớp ký tự [a-z] không bao gồm chữ số                  |  1 |  2  |  1  |  4
   awk tách cột theo khoảng trắng gộp, cut theo MỘT ký tự|  2 |  1  |  1  |  4
   s/…/…/ mặc định chỉ thay lần đầu của MỖI DÒNG         |  1 |  1  |  1  |  3
   grep -q thoát sớm ngay khi gặp dòng khớp đầu tiên     |  1 |  1  |  1  |  3
   wc -l đếm ký tự xuống dòng, không đếm "dòng"          |  1 |  1  |  1  |  3
   Dấu phân cách của s có thể đổi: s|…|…|                |  1 |  0  |  1  |  2
   uniq -d và uniq -u là hai nửa bù nhau                 |  1 |  0  |  1  |  2
   find duyệt theo chiều sâu                             |  0 |  0  |  1  |  1

   BƯỚC 3. Ngưỡng: tổng ≥ 4 và ít nhất hai trục ≥ 1. Mười tám khái niệm đạt
   ngưỡng — nhiều nhất trong mười một bộ đã viết, vì Bài 11 dạy năm công cụ
   cùng lúc. Trần cứng vẫn là 3.

   BƯỚC 4. Loại. Bộ này bị cắt nặng, vì quiz của chính Bài 11 hỏi thẳng sáu
   khái niệm điểm cao:

     (a) §13.1 cấm biến bộ bài tập thành quiz thứ hai. Quiz Bài 11 đã hỏi
         head-on:
           · vì sao -size -1k không ra gì       (quiz câu 1) → LOẠI
           · \; so với + trên 2062 file          (quiz câu 2) → LOẠI
           · vì sao 'struct [a-z_]+' ra "struct v" (quiz câu 3) → LOẠI
           · lệnh nào hỏng với tên file có dấu cách (quiz câu 4) → LOẠI
           · lấy cột 2 của ls -l: awk hay cut     (quiz câu 5) → LOẠI
           · grep -q so với grep > /dev/null      (quiz câu 6) → LOẠI
         Sáu khái niệm này KHÔNG biến mất — mỗi cái được phép xuất hiện đúng
         một lần, và luôn ở một thao tác khác thao tác mà quiz đã đòi. Ở bộ
         này bốn cái được dùng lại như sau:
           · "lớp ký tự không có chữ số"  → không dùng lại; quiz đã vắt kiệt.
           · "\; so với +"                 → E4, ở đó nó chỉ là phương tiện để
             chạy sed trên cả cây, không phải câu hỏi.
           · "tên file có dấu cách"        → không dùng lại.
           · "grep -q"                     → C3, ở đó -q là THỦ PHẠM giấu lỗi
             chứ không phải mẹo tối ưu.
           · "awk so với cut"              → không dùng lại.
           · "-size làm tròn lên"          → không dùng lại.

     (b) "sed -i thay thế file, sinh inode mới" đạt 6 điểm và KHÔNG bị quiz
         đụng tới — nhưng nó không được làm trục thứ tư, mà được gộp làm nửa
         sau của trục 2. Hai mệnh đề này là một: sed là bộ lọc, và -i là miếng
         vá bên ngoài mô hình lọc, nên nó phải *thay* cả file chứ không sửa
         được tại chỗ. Tách đôi thì cả hai đều mất lý do tồn tại.

     (c) "-o ưu tiên thấp hơn AND ngầm" (5 điểm) là ứng viên trục mạnh nhất
         trong số bị loại. Nó rớt vì hai lý do: nó là cú pháp của một công cụ
         chứ không phải một nguyên lý mang được sang bài khác, và bằng chứng
         đẹp nhất của nó — một THƯ MỤC lọt vào kết quả — chỉ cần một lần nhìn
         là hiểu, không cần xoáy ba lần. Nó thành B4.

     (d) "sort theo chuỗi", "grep -c đếm dòng", "for-in không có thứ tự",
         "-F tắt regex", "grep -r bỏ qua symlink", "-w và dấu _", "$NF" đều
         dưới trần. Mỗi cái đúng một câu: A4, C5, A7, B5, A5, A6, B6.

   Ba cái còn lại đứng vững, và cả ba đều KHÔNG bị quiz đụng tới:

   BƯỚC 5–6. Ba mệnh đề sai được và ngộ nhận đối lập nằm ở trường `x` và `mis`
   của mảng `truc` ngay dưới đây.

   Đối chiếu §13.8 (trục đã tiêu): bt-01 MMU · bốn mảnh nối tiếp · Device Tree;
   bt-02 DRAM chết lúc reset · mỗi tầng biến mất · bootargs; bt-03 ảo hoá cùng
   kiến trúc · hai họ QEMU · /mnt/c; bt-04 $? · builtin không phải file · shell
   cắt khoảng trắng; bt-05 /proc sinh lúc đọc · file /dev không chứa dữ liệu ·
   thư mục rỗng là điểm gắn; bt-06 shell mở rộng * · tên không phải file ·
   metadata là một hệ thống; bt-07 Ctrl+S đóng băng terminal · vim có chế độ ·
   lệnh : mặc định một dòng; bt-08 một bộ ba · thư mục là bảng tên · quyền phần
   cứng là nhóm; bt-09 TERM rồi mới KILL · load là số đếm · bảng job của shell;
   bt-10 ống chỉ mang fd 1 · không phải ai cũng đọc stdin · giá thật là byte
   ghi đĩa. Không trục nào của bt-11 trùng.

   Chỗ suýt trùng, ghi lại để phiên sau khỏi phải nghĩ lại: trục 2 ("sed không
   sửa file") nghe gần với trục 1 của bt-10 ("shell cắt file trước khi lệnh
   chạy" — thứ đã bị chính bt-10 loại). Hai cái khác nhau hẳn: bt-10 nói về
   thứ *shell* làm với dấu >, còn đây nói về thứ *sed* làm với file của nó.
   Bằng chứng cũng khác hẳn: bên kia là file rỗng 0 byte, bên này là số inode
   không đổi. Chúng gặp nhau đúng một lần, ở D2, và ở đó cái cũ đóng vai nền
   cho cái mới: `sed 's/…/…/' f > f` huỷ f — đó chính là lý do -i phải tồn tại.

   BƯỚC 7. Lưới 3×1, kiểm bằng mắt trước khi để tools/check.js kiểm bằng máy:

     Trục 1 (uniq chỉ nhìn dòng liền trước) A1 mệnh đề → B1 hai bảng thật → C1 chọn công cụ
     Trục 2 (sed là bộ lọc, -i thay cả file) A2 mệnh đề → B2 số inode  → C2 chẩn đoán
     Trục 3 (BRE không có toán tử + ? | { }) A3 điền   → B3 bốn công cụ → C3 chẩn đoán

   Ba mức, ba loại kích thích khác nhau:
   · A hỏi bằng một phát biểu trần trụi, trả lời được bằng trí nhớ.
   · B đặt trước mặt học viên một bản ghi thật — hai bảng thống kê khác nhau
     từ cùng một file log, ba số inode trước và sau, một mẫu regex chạy qua
     bốn công cụ cho hai kết quả — và đòi giải thích cơ chế.
   · C đưa ràng buộc chưa từng có trong bài: một bo mạch 64 MB RAM phải thống
     kê 900 MB log, một file cấu hình hoá ra là symlink, một script CI báo
     "sạch" suốt ba tuần trên những bản dựng có PANIC.

   Không câu nào đoán được từ câu kia: C1 hỏi *chọn cái nào và vì sao*, kèm
   một bảng số đo RAM mà A1/B1 không hề có; C2 đưa symlink, thứ A2/B2 chưa
   nhắc tới; C3 đưa `-q` và một quy trình CI, thứ A3/B3 không dạy.

   ───────────────────────────────────────────────────────────────────────────
   MỌI LỆNH VÀ MỌI KẾT QUẢ TRONG FILE NÀY ĐỀU ĐÃ CHẠY THẬT

   Máy: WSL2 · Ubuntu 26.04 LTS "resolute" · coreutils là bản **uutils 0.8.0**
   (Rust), không phải GNU — nên `sort` và `uniq` ở đây là hàng Rust; nhưng
   `grep` là **GNU grep 3.12**, `sed` là **GNU sed 4.9**, `awk` là
   **GNU Awk 5.3.2** · bash 5.3.9 · shinarus, uid 1000 · 6 nhân
   (11th Gen Intel Core i7-1165G7 @ 2.80GHz) · ngày 2026-08-15.
   Chạy trong ~/embedded/bt11*, đã xoá sạch sau khi đo.

   BỐN CHỖ SỐ ĐO KHÁC ĐIỀU NGƯỜI TA HAY ĐOÁN — hoặc khác chính Bài 11:

   · CHỖ NÀY PHẢI ĐỌC KỸ. Bài 11 công bố `/usr/include` có **2062** file .h,
     và `find -exec grep -l ioctl` ra **281** file so với `grep -rl` ra **277**.
     Đo lại hôm nay: **2353** file .h, **283** so với **279**.
     Đã truy nguyên nhân, không phải sai số:
       – `find /usr/include -name '*.h' -newermt 2026-08-01` ra **0** file, tức
         là không file nào có mtime mới. Nhưng mtime của file trong gói .deb
         được giữ nguyên từ lúc dựng gói (2026-07-23, 2026-07-29), nên mtime
         không nói được gì về ngày cài.
       – `ls -lt --time=ctime /var/lib/dpkg/info/*.list` cho thấy systemd,
         udev, libnss-systemd… được giải nén lúc **11/08 08:15**. Đó là ngày
         291 file header mới đổ vào máy.
       – Phần KHÔNG đổi mới là phần đáng tin: khoảng cách vẫn đúng **4**, và
         `comm -23` chỉ ra vẫn đúng bốn cái tên cũ — ncurses.h, ncursesw/
         curses.h, ncursesw/ncurses.h, ncursesw/term.h — cả bốn đều là
         **symbolic link**. Cơ chế không đổi; chỉ mẫu số đổi.
     Kết luận cho bộ này: **không in con số tuyệt đối nào của /usr/include làm
     đáp án**. A5 dùng một cây thư mục ba file tự dựng, tái lập được 100 %.
     C5 có dùng /usr/include/linux nhưng nói thẳng với học viên rằng số của họ
     sẽ khác, và hỏi cái bất biến: quan hệ giữa ba con số, không phải giá trị.
     KHÔNG sửa Bài 11 — số của Bài 11 là số thật vào ngày đo nó.

   · CHỖ THỨ HAI, và nó đã lật ngược một câu tôi suýt viết sai. Định viết
     "uniq trả lời được ngay còn sort thì phải đợi hết dữ liệu". Đo thử với
     một nguồn phát mỗi 0,3 giây trong 3 giây thì `uniq -c` KHÔNG hề nhỏ giọt:
     cả 10 dòng ập ra cùng lúc trong 31 mili-giây. Truy tiếp:
       – `stdbuf -oL uniq -c` **cũng vậy** — vẫn ập ra một lần. `stdbuf` chỉ
         tác động được lên chương trình dùng stdio của glibc; `uniq` ở máy này
         là uutils viết bằng Rust, tự quản bộ đệm riêng, nên `stdbuf` là lệnh
         rỗng với nó.
       – `awk '{…; print}'` mặc định cũng ập ra một lần, nhưng thêm
         `fflush()` thì nhỏ giọt đúng nhịp 0,3 s. Cùng một chương trình, khác
         mỗi một lời gọi.
       – Phép thử sạch nhất là dòng vô tận: `yes | sort | head -1` sau 3 giây
         **không in gì**, rc=124. `yes | awk '{c[$0]++; print c[$0]; fflush()}'
         | head -1` in ngay số 1, rc=0.
     Vậy có hai nguyên nhân trễ hoàn toàn khác nhau: một là **bộ đệm** (sửa
     được, đôi khi), một là **thuật toán** (không sửa được — sort phải thấy
     dòng cuối mới biết dòng đầu là dòng nào). C4 hỏi đúng chỗ phân biệt ấy.

   · `for (k in c)` của gawk: với ba mức log INFO/WARN/ERROR, END in ra
     **WARN, ERROR, INFO** — không phải thứ tự xuất hiện trong file (INFO,
     WARN, ERROR), không phải a-b-c, không phải theo số đếm. Với 12 khoá thì
     ra `key10 key11 key12 key1 key2 … key9`. Bật
     `PROCINFO["sorted_in"] = "@ind_str_asc"` mới ra thứ tự chữ cái — chính
     việc phải bật là bằng chứng mặc định không sắp. Chạy ba lần liên tiếp thì
     thứ tự giống nhau, và đó mới là chỗ bẫy: nó *có vẻ* ổn định nên lỗi sống
     sót qua review. Dùng cho A7.

   · Số đo RAM (RSS, lấy bằng `/usr/bin/time -f '%M KB'`) trên 2 000 000 dòng
     / 14 MB, năm giá trị phân biệt, lặp ba lần: `uniq -c` 7920/8060/7744 KB ·
     `sort` 68976/69068/68808 KB · mảng awk 4620/4516/4376 KB. Sai số dưới 4 %,
     tức là lặp lại được — đủ tiêu chuẩn để in vào bài (bài học rút ra từ
     bt-10). Đường cong theo cỡ đầu vào và theo số khoá phân biệt nằm ở C1 và
     E6; chỗ đắt nhất là mảng awk nhảy từ 4464 KB lên **172 988 KB** khi số
     khoá phân biệt tăng từ 5 lên 500 000, trong khi `uniq -c` đứng yên ở
     7652 KB. Không công cụ nào thắng ở mọi tình huống, và đó là nội dung C1.
   ═══════════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-11',
  minutes: 90,

  intro:
    '<p>Bài 11 đưa cho bạn năm công cụ trong một bài. Cái bẫy của một bài như thế không phải ' +
    'là quên cú pháp — cú pháp tra lại được trong mười giây — mà là <b>gán nhầm mô hình tư ' +
    'duy</b> cho công cụ: tưởng <code>uniq</code> biết cả file, tưởng <code>sed</code> là ' +
    'một trình soạn thảo, tưởng regex ở đâu cũng như nhau. Ba ngộ nhận ấy đều <b>hỏng im ' +
    'lặng</b>: lệnh chạy trót lọt, mã thoát đẹp, không một dòng cảnh báo, và kết quả sai.</p>' +
    '<p>Ba trục của bộ này chính là ba ngộ nhận đó. <code>uniq</code> chỉ so mỗi dòng với ' +
    '<b>dòng liền ngay trước nó</b> — nó có một cửa sổ rộng đúng một dòng, và đó vừa là lý ' +
    'do bạn phải <code>sort</code> trước, vừa là lý do nó nuốt được file to hơn cả RAM. ' +
    '<code>sed</code> <b>không</b> chạm vào file của bạn: nó đọc, biến đổi, in ra màn hình, ' +
    'file gốc còn nguyên đến từng nano-giây của <code>mtime</code> — và <code>-i</code>, ' +
    'miếng vá cho chuyện đó, không sửa file mà <b>thay hẳn</b> file bằng một file khác. Còn ' +
    'trong regex mặc định của <code>grep</code> và <code>sed</code>, các dấu ' +
    '<code>+ ? { } ( ) |</code> <b>không phải toán tử</b> — chúng là ký tự thường, nên ' +
    '<code>grep \'gpio|i2c\'</code> đi tìm đúng chuỗi tám ký tự <code>gpio|i2c</code> và ' +
    'không tìm thấy gì.</p>' +
    '<p><b>Lượt 1</b> — làm ngay sau khi đọc xong Bài 11: phần <b>A</b> và <b>B</b>, khoảng ' +
    '25 phút. <b>Lượt 2</b> — quay lại sau 2–3 ngày: phần <b>C</b>, <b>D</b> và <b>E</b>, ' +
    'khoảng 65 phút. Khoảng nghỉ đó là thành phần có tác dụng, không phải thời gian chết. ' +
    'Phần <b>D</b> lần này lật lại Bài 6 (shell mở rộng dấu sao <i>trước khi</i> ' +
    '<code>find</code> nhìn thấy nó), Bài 10 (dấu <code>&gt;</code> cắt file về 0 trước khi ' +
    'lệnh chạy — đây chính là lý do <code>sed -i</code> phải tồn tại) và Bài 8 (một bit ' +
    'execute đi lạc trên file <code>.c</code>).</p>' +
    '<p>Mọi kết quả in trong bộ này đều chạy thật trên máy bạn, ngày 15/08/2026. Một lưu ý ' +
    'về máy này: <code>sort</code> và <code>uniq</code> là bản <b>uutils</b> viết bằng Rust, ' +
    'còn <code>grep</code>, <code>sed</code>, <code>awk</code> là bản GNU thật. Điều đó có ' +
    'hệ quả đo được, và bạn sẽ gặp nó ở <b>C4</b>.</p>',

  /* Chỉ trường `name` được hiển thị; `x` và `mis` là ghi chú cho người viết đề. */
  truc: [
    { id: 'uniq-chi-nhin-dong-lien-truoc',
      name: '<code>uniq</code> chỉ so mỗi dòng với <b>dòng liền ngay trước nó</b>. Nó không nhớ gì về phần còn lại của file — cửa sổ của nó rộng đúng một dòng, nên hai dòng giống nhau mà nằm cách xa nhau thì nó không hề biết',
      x: 'uniq đọc tuần tự, giữ trong bộ nhớ đúng một dòng: dòng vừa rồi. Gặp dòng mới thì ' +
         'so với nó, giống thì tăng bộ đếm, khác thì in ra rồi thay chỗ. Hệ quả 1: phải ' +
         '`sort` trước, không phải vì đó là quy ước mà vì sort là cách đưa các dòng giống ' +
         'nhau về cạnh nhau. Hệ quả 2 — chính là cái giá phải trả để có được hệ quả 1 — ' +
         'uniq chạy trong bộ nhớ hằng số, không phụ thuộc cỡ đầu vào: đo được 7 9xx KB dù ' +
         'đầu vào là 1,4 MB, 14 MB hay 56 MB, trong khi sort leo từ 14 MB lên 250 MB. Trên ' +
         'bo mạch nhúng đó là khác biệt giữa chạy được và bị OOM killer bắn.',
      mis: '"uniq loại bỏ các dòng trùng nhau trong file" — thiếu mất hai chữ *cạnh nhau*, ' +
           'và đó là toàn bộ vấn đề. Ngộ nhận này hỏng im lặng: bảng thống kê vẫn hiện ra, ' +
           'trông vẫn đúng định dạng, chỉ có các con số là sai.' },

    { id: 'sed-la-bo-loc-khong-sua-file',
      name: '<code>sed</code> <b>không sửa file</b>. Nó đọc từng dòng, biến đổi, in ra stdout — file gốc còn nguyên. Còn <code>-i</code> thì không sửa tại chỗ mà <b>thay hẳn</b> file bằng một file mới, nên <b>inode đổi</b>',
      x: 'sed là stream editor: vào stdin, ra stdout, không có khái niệm "mở file để ghi". ' +
         'Đo được: md5, inode và mtime của config.txt giống hệt nhau đến từng nano-giây ' +
         'trước và sau `sed s///`. Cờ -i được ghép thêm bên ngoài mô hình ấy: sed ghi ra ' +
         'file tạm rồi rename đè lên. Vì thế inode 34425 thành 34426; hard link bị tách ' +
         'làm hai file độc lập; symlink bị thay bằng file thường và file thật phía sau ' +
         'không đổi một byte. Và vì -i cần một *file* để thay, `seq 1 3 | sed -i s/1/X/` ' +
         'báo `sed: no input files`, rc=4.',
      mis: '"sed sửa file giống như một trình soạn thảo" — kéo theo hai hệ quả sai ngược ' +
           'chiều nhau: người mới chạy `sed s///` rồi tưởng đã sửa xong (thực ra chưa sửa ' +
           'gì), hoặc chạy `sed -i` trên một symlink rồi tưởng đã sửa file thật (thực ra ' +
           'vừa xoá mất symlink).' },

    { id: 'bre-khong-co-toan-tu',
      name: 'Trong <b>BRE</b> — thứ mà <code>grep</code> và <code>sed</code> dùng <b>mặc định</b> — các dấu <code>+ ? { } ( ) |</code> là <b>ký tự thường</b>, không phải toán tử. Cùng một mẫu, bốn công cụ cho hai kết quả khác nhau',
      x: 'grep và sed mặc định BRE; grep -E, sed -E và awk (luôn luôn) dùng ERE. Trong BRE ' +
         'muốn có toán tử thì phải viết \\+ \\? \\{ \\} \\( \\) \\|. Đo được: cùng mẫu o+ ' +
         'trên cùng file, `grep` ra 1 dòng, `grep -E` ra 2, `sed -n /o+/p` ra 1, `awk /o+/` ' +
         'ra 2. Ở quy mô thật thì hậu quả rõ hơn: ' +
         '`grep -rl --include=*.h \'__u8|__u16|__u32\' /usr/include` ra **0** file, thêm -E ' +
         'ra **607**. Không thông báo lỗi nào; chỉ có rc=1 và một danh sách rỗng.',
      mis: '"regex là regex, dấu + ở đâu cũng nghĩa là một-hoặc-nhiều-lần" — ngộ nhận này ' +
           'đặc biệt dai vì người học đến từ Python, JavaScript hay công cụ tìm kiếm của ' +
           'IDE, nơi ERE (hoặc PCRE) là mặc định. Ở grep thì mặc định ngược lại.' },
  ],

  /* ═══ A · Nhận biết — 4 mcq + 2 tf + 1 fill + 1 match ═══════════════════ */
  A: [
    { id: 'a1', k: 'mcq', truc: 0, tag: 'Trắc nghiệm nhanh',
      q: 'Phát biểu nào mô tả <b>đúng</b> cách <code>uniq</code> quyết định hai dòng có phải ' +
         'là trùng nhau hay không?',
      opts: [
        'Nó giữ một bảng băm mọi dòng đã gặp, nên phát hiện được dòng trùng ở bất kỳ đâu trong file.',
        'Nó so mỗi dòng với <b>đúng dòng liền ngay trước</b>. Hai dòng giống nhau mà không nằm cạnh nhau thì nó không hề biết.',
        'Nó tự sắp xếp đầu vào trước, rồi mới gộp — nên <code>sort</code> đứng trước chỉ là thói quen thừa.',
        'Nó so mỗi dòng với mọi dòng trong phạm vi 1024 dòng gần nhất; xa hơn thì bỏ qua.'
      ],
      a: 1,
      why: 'Cửa sổ của <code>uniq</code> rộng đúng <b>một dòng</b>. Đo thật: ' +
           '<code>printf \'a\\nb\\na\\n\' | uniq -c</code> cho <b>ba</b> dòng — ' +
           '<code>1 a</code>, <code>1 b</code>, <code>1 a</code> — chứ không phải hai. Chèn ' +
           '<code>| sort |</code> vào giữa thì mới ra <code>2 a</code>, <code>1 b</code>. Đó ' +
           'là lý do thật của cặp <code>sort | uniq</code>: <code>sort</code> không phải nghi ' +
           'thức, nó là bước <i>đưa các dòng giống nhau về cạnh nhau</i> để uniq nhìn thấy ' +
           'được. Đáp án 1 mô tả đúng cách <code>awk</code> làm bằng mảng, và cũng đúng cách ' +
           '<code>sort -u</code> làm — nhưng cả hai đều phải trả giá bằng RAM tỉ lệ với số ' +
           'giá trị phân biệt. Cái giá của uniq là bạn phải sort trước; phần thưởng là nó ' +
           'chạy trong bộ nhớ <b>hằng số</b>. Câu C1 sẽ bắt bạn chọn giữa hai cái giá ấy.' },

    { id: 'a2', k: 'tf', truc: 1, tag: 'Đúng/Sai kèm sửa',
      q: '<i>"Chạy <code>sed \'s/ttyS0/ttyAMA0/\' config.txt</code> là cách sửa file cấu ' +
         'hình: sau lệnh đó, <code>config.txt</code> đã mang giá trị mới. Cờ <code>-i</code> ' +
         'chỉ là cách viết tắt cho gọn."</i>',
      a: 1,
      rw: 'Viết lại cho đúng: sau lệnh đó thì <code>config.txt</code> ra sao, kết quả biến ' +
          'đổi đi đâu, và <code>-i</code> thật ra làm gì <i>khác</i>?',
      why: 'Sai ở cả hai vế. <b>Vế một:</b> <code>sed</code> là một <i>bộ lọc</i> — đọc ' +
           'stdin hoặc file, biến đổi, in ra <b>stdout</b>. File gốc không bị đụng tới. Đo ' +
           'thật trên config.txt: md5 <code>6b59f6d2…</code>, inode <b>34425</b>, mtime ' +
           '<code>16:48:04.675390674</code> — cả ba <b>giống hệt nhau</b> trước và sau khi ' +
           'chạy lệnh, không lệch một nano-giây. Thứ đổi chỉ hiện trên màn hình rồi biến ' +
           'mất. <b>Vế hai:</b> <code>-i</code> không phải viết tắt của gì cả, nó là một cơ ' +
           'chế khác hẳn — sed ghi kết quả ra file tạm rồi <code>rename</code> đè lên tên ' +
           'cũ. Bằng chứng: sau <code>sed -i</code>, inode nhảy từ <b>34425</b> sang ' +
           '<b>34426</b>. File cũ không được sửa; nó bị <b>thay</b>. Câu C2 cho thấy hệ quả ' +
           'của chi tiết đó khi cái tên bạn đưa cho sed hoá ra là một symlink.',
      crit: [
        'Nói rõ <code>config.txt</code> <b>không đổi</b> sau lệnh đó — không phải "đổi rồi nhưng chưa lưu"',
        'Nói kết quả biến đổi đi ra <b>stdout</b> (màn hình), và mất luôn nếu không hứng lại',
        'Nêu cách hứng lại cho đúng: <code>sed \'s/…/…/\' f &gt; f.new &amp;&amp; mv f.new f</code>, hoặc dùng <code>-i</code>',
        'Nói <code>-i</code> ghi ra file tạm rồi <b>thay thế</b> file cũ, chứ không sửa tại chỗ — và nêu bằng chứng inode đổi'
      ],
      sol: '<code>sed</code> là <b>stream editor</b>: nó đọc, biến đổi, in ra stdout, và ' +
           'không có khái niệm "mở file của mình ra để ghi". Sau <code>sed \'s/ttyS0/' +
           'ttyAMA0/\' config.txt</code>, file <code>config.txt</code> còn nguyên vẹn — ' +
           'cùng nội dung, cùng md5, cùng inode, cùng cả mtime tới từng nano-giây. Dòng ' +
           '<code>port = /dev/ttyAMA0</code> bạn nhìn thấy chỉ là thứ sed in ra màn hình. ' +
           'Muốn giữ lại thì phải hứng: <code>sed \'s/…/…/\' f &gt; f.new &amp;&amp; mv ' +
           'f.new f</code> (và <b>không bao giờ</b> <code>&gt; f</code> — xem D2). ' +
           'Cờ <code>-i</code> làm đúng việc hứng-rồi-đổi-tên ấy giùm bạn: sed ghi ra một ' +
           'file tạm rồi <code>rename()</code> đè lên tên cũ. Nghĩa là file cũ không được ' +
           'sửa mà bị <b>thay bằng một file khác</b> — inode 34425 thành 34426. Chi tiết ' +
           '"file khác" ấy vô hại trong 99 % trường hợp, và rất đắt trong 1 % còn lại: ' +
           'hard link, symlink, và file đang được một tiến trình khác mở.' },

    { id: 'a3', k: 'fill', truc: 2, tag: 'Điền khuyết',
      q: 'Mặc định <code>grep</code> và <code>sed</code> dùng <b>BRE</b>, và trong BRE thì ' +
         '<code>+</code>, <code>?</code>, <code>|</code>, <code>{</code>, <code>}</code>, ' +
         '<code>(</code>, <code>)</code> chỉ là <b>ký tự thường</b> — <code>grep ' +
         '\'gpio|i2c\'</code> đi tìm đúng chuỗi tám ký tự <code>gpio|i2c</code>. Muốn chúng ' +
         'mang nghĩa toán tử, hoặc thêm dấu <code>\\</code> phía trước từng dấu một, hoặc ' +
         'bật ERE bằng cờ <code>________</code>.',
      a: ['-E'],
      ph: 'một cờ, hai ký tự',
      why: 'Đo thật, file bốn dòng <code>gpio</code> / <code>i2c</code> / <code>uart</code> / ' +
           '<code>gpio|i2c</code>: <code>grep -n \'gpio|i2c\'</code> chỉ ra <b>dòng 4</b> — ' +
           'đúng cái dòng chứa ký tự sổ đứng — còn <code>grep -En</code> ra <b>dòng 1, 2 ' +
           'và 4</b>. Điều làm ngộ nhận này đắt là nó <b>không báo lỗi</b>: mẫu BRE viết ' +
           'kiểu ERE vẫn là mẫu hợp lệ, chỉ là nó tìm thứ khác. Ở quy mô thật: ' +
           '<code>grep -rl --include=\'*.h\' \'__u8|__u16|__u32\' /usr/include | wc -l</code> ' +
           'ra <b>0</b>, thêm <code>-E</code> ra <b>607</b>. Một script CI dựa trên dạng ' +
           'thứ nhất sẽ báo "không tìm thấy gì" mãi mãi. Cách thứ hai — ' +
           '<code>grep \'gpio\\|i2c\'</code> — cũng chạy đúng, nhưng đọc khó hơn nhiều; ' +
           'thói quen tốt là gõ <code>-E</code> ngay từ đầu mỗi khi mẫu có nhiều hơn một ' +
           'lựa chọn.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Bạn có một file chứa ba dòng: <code>10</code>, <code>9</code>, <code>100</code>. ' +
         'Chạy <code>sort</code> không kèm tuỳ chọn nào. Thứ tự in ra là gì?',
      opts: [
        '<code>9</code>, <code>10</code>, <code>100</code> — sort nhận ra đây là số.',
        '<code>10</code>, <code>100</code>, <code>9</code> — sort so sánh theo <b>chuỗi</b>, ký tự một.',
        '<code>10</code>, <code>9</code>, <code>100</code> — giữ nguyên thứ tự vì cả ba đều là số.',
        '<code>100</code>, <code>10</code>, <code>9</code> — sort xếp giảm dần với dữ liệu số.'
      ],
      a: 1,
      why: 'Đo thật: <code>printf \'10\\n9\\n100\\n\' | sort</code> ra <b>10, 100, 9</b>; ' +
           'thêm <code>-n</code> mới ra <b>9, 10, 100</b>. Mặc định <code>sort</code> so ' +
           'sánh <b>từng ký tự</b>, và ký tự <code>1</code> đứng trước <code>9</code> trong ' +
           'bảng mã, nên mọi số bắt đầu bằng 1 đều xếp trước số 9. Chỗ này quan trọng vì ' +
           'nó nằm ở cuối gần như mọi đường ống thống kê bạn sẽ viết: ' +
           '<code>… | uniq -c | sort -rn</code>. Quên chữ <code>n</code> thì bảng xếp hạng ' +
           'vẫn hiện ra, vẫn đúng định dạng, chỉ có thứ hạng là sai — và nó chỉ sai khi số ' +
           'đếm vượt qua 9, tức là đúng lúc dữ liệu bắt đầu nhiều lên. Với dữ liệu nhỏ lúc ' +
           'bạn thử nghiệm, <code>sort -r</code> và <code>sort -rn</code> cho kết quả giống ' +
           'hệt nhau; đó là kiểu lỗi ngủ yên tới lúc chạy thật.' },

    { id: 'a5', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Một cây thư mục có <code>real/dev.h</code> (file thật, chứa chữ <code>ioctl</code>) ' +
         'và <code>link/dev.h</code> — một <b>symlink</b> trỏ tới file ấy. Chạy ' +
         '<code>grep -rl ioctl .</code> rồi <code>grep -Rl ioctl .</code>. Kết quả?',
      opts: [
        'Cả hai đều ra hai đường dẫn — grep luôn đi theo symlink.',
        'Cả hai đều ra một đường dẫn — grep không bao giờ đi theo symlink.',
        '<code>-r</code> ra <b>một</b> (chỉ file thật), <code>-R</code> ra <b>hai</b> — chữ hoa mới đi theo symlink.',
        '<code>-r</code> ra <b>hai</b>, <code>-R</code> ra <b>một</b> — chữ thường mới đi theo symlink.'
      ],
      a: 2,
      why: 'Đo thật trên đúng cây thư mục đó: <code>grep -rl</code> ra ' +
           '<code>sym/real/dev.h</code>; <code>grep -Rl</code> ra <code>sym/link/dev.h</code> ' +
           '<b>và</b> <code>sym/real/dev.h</code>. Đây là lý do <code>grep -r</code> và ' +
           '<code>find … -exec grep</code> đếm ra hai con số khác nhau trên cùng một cây — ' +
           'điều Bài 11 đã chỉ ra trên <code>/usr/include</code>. <code>find -name \'*.h\'</code> ' +
           'liệt kê cả symlink (nó khớp theo <i>tên</i>), rồi grep mở từng cái, và mở một ' +
           'symlink thì được nội dung file đích — nên find luôn cho con số lớn hơn. Không ' +
           'con số nào sai; chúng trả lời hai câu hỏi khác nhau: "có bao nhiêu <i>file</i> ' +
           'chứa chuỗi này" so với "có bao nhiêu <i>đường dẫn</i> dẫn tới một nội dung chứa ' +
           'chuỗi này". Biết mình đang hỏi câu nào mới là việc của bạn.' },

    { id: 'a6', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'File <code>gpio.c</code> có 6 dòng chứa chuỗi <code>gpio</code>: một dòng ' +
         '<code>#include "gpio.h"</code>, hai dòng dùng <code>gpio_state</code>, một dòng ' +
         '<code>int gpio_init(void)</code>, một dòng <code>int my_gpio(void)</code>, và một ' +
         'dòng chú thích <code>/* plain gpio mentioned here */</code>. ' +
         '<code>grep -cw gpio gpio.c</code> ra mấy?',
      opts: ['6 — <code>-w</code> không đổi gì khi mẫu không có ký tự đặc biệt.',
             '4 — chỉ loại các dòng có <code>gpio</code> dính liền chữ khác ở <b>cả hai</b> phía.',
             '<b>2</b> — chỉ hai dòng có <code>gpio</code> đứng riêng; dấu <code>_</code> được tính là ký tự từ.',
             '0 — <code>-w</code> đòi cả dòng phải đúng bằng <code>gpio</code>.'],
      a: 2,
      why: 'Đo thật: <code>grep -c gpio</code> ra <b>6</b>, <code>grep -cw gpio</code> ra ' +
           '<b>2</b> — chỉ còn dòng <code>#include "gpio.h"</code> và dòng chú thích. ' +
           '<code>-w</code> đòi hai đầu của chỗ khớp phải <b>không</b> là ký tự từ, và ký tự ' +
           'từ gồm chữ cái, chữ số <b>và dấu gạch dưới</b>. Với người viết C thì đây đúng là ' +
           'chỗ đau: <code>gpio_state</code>, <code>gpio_init</code>, <code>my_gpio</code> ' +
           'đều bị loại, dù đó thường là chính những dòng bạn muốn tìm. Ngược lại, ' +
           '<code>"gpio.h"</code> <i>được</i> giữ vì dấu nháy kép và dấu chấm không phải ký ' +
           'tự từ. Quy tắc thực dụng: dùng <code>-w</code> khi bạn tìm một <b>từ khoá</b> ' +
           '(tên biến chính xác, tên hằng số); bỏ nó khi bạn tìm một <b>tiền tố</b> ' +
           '(mọi thứ thuộc hệ con gpio).' },

    { id: 'a7', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: '<i>"<code>awk \'{c[$3]++} END {for (k in c) print k, c[k]}\'</code> in ra các mức ' +
         'log theo đúng thứ tự chúng xuất hiện lần đầu trong file. Chạy thử vài lần thấy thứ ' +
         'tự luôn giống nhau, nên có thể tin được."</i>',
      a: 1,
      rw: 'Viết lại cho đúng: thứ tự của <code>for (k in arr)</code> được quyết định bởi ' +
          'cái gì, vì sao "chạy thử thấy ổn định" lại <b>không</b> chứng minh được gì, và ' +
          'phải làm sao nếu bạn cần một thứ tự xác định?',
      why: 'Sai, và sai theo kiểu nguy hiểm nhất: <b>quan sát đúng, kết luận sai</b>. Đo ' +
           'thật trên file log tám dòng, thứ tự xuất hiện lần đầu là INFO → WARN → ERROR, ' +
           'nhưng <code>END</code> in ra <b>WARN, ERROR, INFO</b>. Không phải thứ tự xuất ' +
           'hiện, không phải thứ tự chữ cái, không phải theo số đếm. Với 12 khoá thì ra ' +
           '<code>key10 key11 key12 key1 key2 … key9</code> — thứ tự duyệt bảng băm bên ' +
           'trong gawk. Chuẩn POSIX ghi rõ thứ tự này là <b>không xác định</b>. Chạy ba lần ' +
           'liên tiếp thì đúng là giống nhau — cùng dữ liệu, cùng hàm băm, cùng kết quả — ' +
           'và đó chính là cái bẫy: nó <i>trông</i> ổn định nên lỗi lọt qua review, rồi đổi ' +
           'sang máy khác, phiên bản awk khác, hoặc chỉ cần thêm một mức log mới là thứ tự ' +
           'nhảy loạn. Cách sửa: đừng bao giờ dựa vào nó — đẩy qua <code>| sort</code> ' +
           '(hoặc <code>sort -rn</code> nếu muốn xếp hạng), hoặc dùng riêng của gawk là ' +
           '<code>PROCINFO["sorted_in"] = "@ind_str_asc"</code>. Chính việc phải <i>bật</i> ' +
           'nó lên là bằng chứng mặc định không hề sắp xếp.',
      crit: [
        'Nói thứ tự <code>for (k in arr)</code> là <b>không xác định</b> theo chuẩn, do cách awk duyệt bảng băm bên trong',
        'Nói rõ nó <b>không</b> phải thứ tự xuất hiện, cũng không phải thứ tự chữ cái',
        'Giải thích vì sao "chạy vài lần thấy giống nhau" không chứng minh gì: cùng đầu vào cho cùng thứ tự băm, nhưng đổi dữ liệu / đổi phiên bản awk là đổi',
        'Nêu cách sửa: đẩy kết quả qua <code>sort</code>, hoặc đặt <code>PROCINFO["sorted_in"]</code>'
      ],
      sol: 'Thứ tự của <code>for (k in arr)</code> do cách awk duyệt <b>bảng băm</b> bên ' +
           'trong quyết định, và chuẩn POSIX tuyên bố nó không xác định. Trên máy này, ba ' +
           'mức log ra theo thứ tự <b>WARN, ERROR, INFO</b> — không khớp thứ tự xuất hiện ' +
           '(INFO, WARN, ERROR), cũng không khớp thứ tự chữ cái (ERROR, INFO, WARN). Với ' +
           '12 khoá <code>key1</code>…<code>key12</code> thì ra <code>key10 key11 key12 ' +
           'key1 key2 … key9</code>. Việc chạy lại vài lần thấy giống nhau là chuyện đương ' +
           'nhiên và <b>không</b> chứng minh gì: cùng một tập khoá thì cùng một cách băm, ' +
           'nên cùng một thứ tự. Đổi dữ liệu, đổi phiên bản awk, hoặc chỉ thêm một mức log ' +
           'mới là thứ tự đổi. Nếu bạn cần thứ tự xác định thì phải nói ra: đẩy qua ' +
           '<code>| sort</code> (hay <code>| sort -rn</code> để xếp hạng theo số đếm), hoặc ' +
           'với gawk thì đặt <code>PROCINFO["sorted_in"] = "@ind_str_asc"</code> trước vòng ' +
           'lặp — đặt xong thì 12 khoá kia ra đúng thứ tự chữ cái, và chính điều đó chứng ' +
           'minh mặc định không sắp xếp.' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Sáu câu hỏi rất giống nhau nhưng đòi sáu đường ống khác nhau. File ' +
         '<code>app.log</code> mỗi dòng có dạng <code>&lt;ngày&gt; &lt;giờ&gt; ' +
         '&lt;mức&gt; &lt;hệ con&gt; &lt;thông điệp&gt;</code>. Ghép mỗi câu hỏi với đúng ' +
         'câu lệnh trả lời nó.',
      left: [
        'Có bao nhiêu <b>dòng</b> chứa chữ <code>error</code>?',
        'Chữ <code>error</code> xuất hiện tất cả bao nhiêu <b>lần</b>?',
        'Những <b>file nào</b> dưới cây thư mục này có chứa chữ <code>error</code>?',
        'Mỗi <b>mức log</b> xuất hiện bao nhiêu lần, xếp từ nhiều xuống ít?',
        'Những dòng nào xuất hiện <b>đúng một lần</b> trong file?',
        'Những dòng nào <b>lặp lại</b> từ hai lần trở lên?'
      ],
      right: [
        '<code>sort app.log | uniq -d</code>',
        '<code>grep -c error app.log</code>',
        "<code>awk '{print $3}' app.log | sort | uniq -c | sort -rn</code>",
        '<code>sort app.log | uniq -u</code>',
        '<code>grep -rl error .</code>',
        '<code>grep -o error app.log | wc -l</code>'
      ],
      a: [1, 5, 4, 2, 3, 0],
      why: 'Ba cặp dễ lẫn nằm cạnh nhau ở đây. <b>Cặp thứ nhất</b> — ' +
           '<code>grep -c</code> đếm <b>số dòng có ít nhất một chỗ khớp</b>, không đếm số ' +
           'lần khớp. Đo thật trên file hai dòng <code>aaa</code> và <code>baa</code>: ' +
           '<code>grep -c a</code> ra <b>2</b>, còn <code>grep -o a | wc -l</code> ra ' +
           '<b>5</b>. Muốn đếm số <i>lần</i> thì <code>-o</code> in mỗi chỗ khớp thành một ' +
           'dòng riêng rồi mới đếm được. <b>Cặp thứ hai</b> — <code>-c</code> cho một con ' +
           'số, <code>-l</code> cho một danh sách tên file: hỏi "bao nhiêu" khác hỏi ' +
           '"ở đâu". <b>Cặp thứ ba</b> — <code>uniq -u</code> giữ những dòng ' +
           '<b>không</b> lặp, <code>uniq -d</code> giữ những dòng <b>có</b> lặp; chúng là ' +
           'hai nửa bù nhau, và <b>cả hai đều đòi sort trước</b> vì lý do ở A1. Đo thật ' +
           'trên cột mức log: <code>sort | uniq -d</code> ra <code>ERROR</code> và ' +
           '<code>INFO</code>, <code>sort | uniq -u</code> ra <code>WARN</code>; bỏ ' +
           '<code>sort</code> đi thì <code>uniq -d</code> chỉ còn <code>INFO</code> — sai, ' +
           'vì ba dòng ERROR nằm rải rác không cạnh nhau.' },
  ],

  /* ═══ B · Giải thích — 2 đọc output + 1 so sánh cặp + 2 vì sao + 1 bắt lỗi ═ */
  B: [
    { id: 'b1', k: 'free', truc: 0, tag: 'Đọc output', rows: 9,
      q: 'Cùng một file log tám dòng, cùng một mục tiêu — đếm xem mỗi mức log xuất hiện bao ' +
         'nhiêu lần — hai đường ống chỉ khác nhau ở <b>hai tầng được chèn thêm</b>, và cho ' +
         'ra hai bảng khác hẳn nhau. Hãy giải thích <b>vì sao bảng thứ nhất có bảy dòng</b> ' +
         'trong khi chỉ có ba mức log, rồi chỉ ra tầng nào chữa được lỗi ấy và tầng nào chỉ ' +
         'làm đẹp kết quả.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'cat device.log' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '2026-08-01 10:02:11 INFO  uart  init complete baud rate 115200\n' +
                '2026-08-01 10:02:12 INFO  gpio  registered 32 pins total 32\n' +
                '2026-08-01 10:02:13 WARN  i2c   could not find any device 0\n' +
                '2026-08-01 10:02:14 ERROR uart  timeout during read 250\n' +
                '2026-08-01 10:02:15 INFO  gpio  pin 17 set to high 1\n' +
                '2026-08-01 10:02:16 ERROR i2c   CRC check failed code 487\n' +
                '2026-08-01 10:02:17 INFO  uart  read 64 bytes ok 64\n' +
                '2026-08-01 10:02:18 ERROR uart  parity error on byte 12' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "awk '{print $3}' device.log | uniq -c" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '      2 INFO\n' +
                '      1 WARN\n' +
                '      1 ERROR\n' +
                '      1 INFO\n' +
                '      1 ERROR\n' +
                '      1 INFO\n' +
                '      1 ERROR' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "awk '{print $3}' device.log | sort | uniq -c | sort -rn" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '      4 INFO\n' +
                '      3 ERROR\n' +
                '      1 WARN' },
        { t: 'cal', kind: 'warn',
          x: 'Bảng thứ nhất <b>không</b> báo lỗi gì. Mã thoát là 0, định dạng đúng như bảng ' +
             'thứ hai, và nếu bạn chỉ liếc qua thì nó trông hoàn toàn hợp lý.' }
      ],
      hint: 'Viết ra cột <code>$3</code> của tám dòng theo đúng thứ tự trong file, rồi lấy ' +
            'bút gạch chân từng <i>cụm liền nhau</i>. Đếm số cụm.',
      crit: [
        'Viết được dãy cột <code>$3</code> theo thứ tự file: INFO, INFO, WARN, ERROR, INFO, ERROR, INFO, ERROR',
        'Chỉ ra <code>uniq</code> chỉ gộp các dòng <b>nằm cạnh nhau</b>, nên nó đếm được <b>7 cụm liền nhau</b> chứ không phải 3 giá trị phân biệt',
        'Giải thích dòng <code>2 INFO</code> đầu tiên: đúng hai dòng INFO nằm liền nhau ở đầu file',
        'Chỉ ra <code>sort</code> đứng trước <code>uniq</code> mới là tầng chữa được lỗi, và nói rõ vai trò của nó: <b>đưa các dòng giống nhau về cạnh nhau</b> để uniq nhìn thấy được',
        'Giải thích <code>sort -rn</code> ở cuối: xếp hạng theo <b>số</b> giảm dần; nếu quên chữ <code>n</code> thì sẽ xếp theo chuỗi',
        'Nhận ra kiểu lỗi này <b>không</b> phát ra tín hiệu nào — không cảnh báo, mã thoát 0, bảng vẫn đúng định dạng'
      ],
      sol: '<p><b>Dãy cột <code>$3</code> theo thứ tự file</b> là: INFO, INFO, WARN, ERROR, ' +
           'INFO, ERROR, INFO, ERROR. Bây giờ gạch chân từng cụm liền nhau: ' +
           '<code>[INFO INFO]</code>, <code>[WARN]</code>, <code>[ERROR]</code>, ' +
           '<code>[INFO]</code>, <code>[ERROR]</code>, <code>[INFO]</code>, ' +
           '<code>[ERROR]</code> — <b>bảy</b> cụm. Đó chính là bảy dòng của bảng thứ nhất, ' +
           'và dòng đầu là <code>2 INFO</code> vì đúng hai dòng INFO nằm sát nhau ở đầu ' +
           'file. Không có dòng nào bị mất, không có con số nào tính sai: uniq đã làm đúng ' +
           '<i>việc của nó</i>. Chỉ là việc của nó không phải việc bạn tưởng.</p>' +
           '<p><b><code>uniq</code> có một cửa sổ rộng đúng một dòng.</b> Nó giữ trong bộ ' +
           'nhớ đúng dòng vừa đọc; gặp dòng mới thì so với dòng ấy, giống thì tăng bộ đếm, ' +
           'khác thì in cụm cũ ra rồi bắt đầu cụm mới. Nó không có bảng, không có bộ nhớ, ' +
           'không biết gì về ba dòng ERROR nằm rải rác phía sau. Ba dòng ERROR ấy không bao ' +
           'giờ đứng cạnh nhau trong file, nên với uniq chúng là ba sự kiện độc lập.</p>' +
           '<p><b>Chữ tạo ra khác biệt là <code>sort</code>.</b> Nó không hề đếm gì cả — nó ' +
           'chỉ <i>xếp lại chỗ ngồi</i>, dồn bốn dòng INFO về cạnh nhau, ba dòng ERROR về ' +
           'cạnh nhau. Sau đó cửa sổ một dòng của uniq là đủ. Cặp <code>sort | uniq</code> ' +
           'mà bạn gõ theo phản xạ không phải một nghi thức: đó là hai nửa của một thuật ' +
           'toán, và nửa đầu tồn tại chỉ để nửa sau làm việc được.</p>' +
           '<p><b><code>sort -rn</code> ở cuối</b> xếp hạng theo <b>số</b> (<code>n</code>) ' +
           'giảm dần (<code>r</code>). Quên chữ <code>n</code> thì sort so sánh theo chuỗi ' +
           'và <code>10</code> sẽ xếp trước <code>9</code> — với dữ liệu tám dòng này thì ' +
           'không lộ ra, vì mọi số đếm đều một chữ số. Xem A4.</p>' +
           '<p><b>Điều đáng sợ nhất ở đây là sự im lặng.</b> Bảng bảy dòng không kèm cảnh ' +
           'báo nào, mã thoát 0, cột số thẳng hàng đẹp đẽ. Nếu file log có 200 mức lỗi thay ' +
           'vì ba, bảng sai sẽ có vài trăm dòng và bạn sẽ đọc nó như một báo cáo thật. Đây ' +
           'là lý do <code>uniq</code> mà thiếu <code>sort</code> đứng trước phải bị coi là ' +
           'một lỗi ngay từ lúc đọc mã, chứ không phải chờ tới lúc kết quả trông lạ.</p>' },

    { id: 'b2', k: 'free', truc: 1, tag: 'Giải thích vì sao', rows: 9,
      q: 'Tôi chạy <code>sed</code> trên <code>config.txt</code> rồi kiểm tra file bằng ba ' +
         'thước đo: md5, số inode, và mtime tới từng nano-giây. Sau đó chạy lại đúng lệnh ấy ' +
         'kèm <code>-i</code>. Cuối cùng thử trên một cặp <b>hard link</b>. Hãy giải thích ' +
         '<b>vì sao</b> ba con số ở lần đầu không đổi, <b>vì sao</b> inode đổi khi có ' +
         '<code>-i</code>, và <b>vì sao</b> cặp hard link lại tách làm hai.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'cat config.txt' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '# device configuration\n' +
                'port = /dev/ttyS0\n' +
                'baud = 9600\n' +
                'debug = 0\n' +
                '\n' +
                '# network section\n' +
                'ip = 192.168.1.10' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "md5sum config.txt\nstat -c 'inode=%i  size=%s  links=%h  mtime=%y' config.txt" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '6b59f6d22ac0d4188635f2fca8563212  config.txt\n' +
                'inode=34425  size=100  links=1  mtime=2026-08-15 16:48:04.675390674 +0700' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "sed 's/ttyS0/ttyAMA0/' config.txt" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '# device configuration\n' +
                'port = /dev/ttyAMA0\n' +
                'baud = 9600\n' +
                'debug = 0\n' +
                '\n' +
                '# network section\n' +
                'ip = 192.168.1.10' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "md5sum config.txt\nstat -c 'inode=%i  size=%s  links=%h  mtime=%y' config.txt" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '6b59f6d22ac0d4188635f2fca8563212  config.txt\n' +
                'inode=34425  size=100  links=1  mtime=2026-08-15 16:48:04.675390674 +0700' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "sed -i 's/ttyS0/ttyAMA0/' config.txt\nstat -c 'inode=%i  links=%h' config.txt" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'inode=34426  links=1' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "printf 'value = 1\\n' > shared.conf\nln shared.conf backup.conf\nstat -c '%i  links=%h  %n' shared.conf backup.conf" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '34425  links=2  shared.conf\n' +
                '34425  links=2  backup.conf' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "sed -i 's/1/2/' shared.conf\nstat -c '%i  links=%h  %n' shared.conf backup.conf\ncat shared.conf backup.conf" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '34427  links=1  shared.conf\n' +
                '34425  links=1  backup.conf\n' +
                'value = 2\n' +
                'value = 1' },
        { t: 'cal', kind: 'info',
          x: 'Nhắc lại Bài 6: <b>inode</b> là số hiệu của <i>bản thân file</i>; cái tên chỉ ' +
             'là một mục trong thư mục trỏ tới inode ấy. Hai tên trỏ chung một inode là một ' +
             '<b>hard link</b>, và cột <code>links</code> đếm số tên đang trỏ tới.' }
      ],
      hint: 'Đọc lại chữ đầu tiên trong tên đầy đủ của sed: <i>stream</i> editor. Một bộ lọc ' +
            'thì có cửa vào và cửa ra — nó có cửa nào để <i>ghi ngược</i> vào file của mình ' +
            'không?',
      crit: [
        'Nói <code>sed</code> là một <b>bộ lọc</b>: đọc vào, biến đổi, in ra <b>stdout</b>; nó không mở file của mình ở chế độ ghi',
        'Giải thích ba thước đo không đổi ở lần đầu vì <b>không có thao tác ghi nào</b> xảy ra — kể cả mtime, thứ sẽ đổi ngay nếu có ghi',
        'Giải thích <code>-i</code>: sed ghi ra một <b>file tạm</b> rồi <code>rename()</code> đè lên tên cũ — nên đó là <b>thay thế</b> file, không phải sửa file',
        'Suy ra từ đó vì sao inode đổi: file mới là một file khác, mang inode khác',
        'Giải thích cặp hard link: <code>rename</code> chỉ gắn cái tên <code>shared.conf</code> sang inode mới; <code>backup.conf</code> vẫn trỏ inode cũ, nên hai tên tách ra thành hai file độc lập',
        'Nhận ra <code>links</code> tụt từ 2 xuống 1 ở <b>cả hai</b> tên, và giải thích được vì sao'
      ],
      sol: '<p><b>Vì sao ba thước đo không đổi.</b> Tên đầy đủ của sed là <i>stream ' +
           'editor</i>, và chữ <i>stream</i> mới là chữ quan trọng. Nó đọc từ một luồng vào, ' +
           'biến đổi từng dòng, ghi ra một luồng ra — hết. Nó <b>không hề mở file của bạn ở ' +
           'chế độ ghi</b>, nên không có thao tác ghi nào để mà đổi bất cứ thứ gì. md5 giống ' +
           'nhau là hiển nhiên vì nội dung không đổi; inode giống nhau vì vẫn là đúng file ' +
           'đó; nhưng thước đo thuyết phục nhất là <b>mtime</b> — nó giống nhau tới từng ' +
           'nano-giây (<code>.675390674</code>), mà mtime thì đổi ngay lập tức nếu có dù chỉ ' +
           'một byte được ghi. Bảy dòng sed in ra — trong đó dòng hai đã thành ' +
           '<code>port = /dev/ttyAMA0</code> — là thứ nó gửi ra <b>màn hình</b>, không phải ' +
           'thứ nó ghi vào đâu cả. Không hứng lại thì chúng biến mất.</p>' +
           '<p><b>Vì sao <code>-i</code> làm đổi inode.</b> Vì <code>-i</code> không sửa ' +
           'file — nó <b>thay</b> file. Bên trong, sed mở một file tạm trong cùng thư mục, ' +
           'ghi toàn bộ kết quả vào đó, rồi gọi <code>rename()</code> để cái tên ' +
           '<code>config.txt</code> trỏ sang file tạm ấy; file cũ mất tên cuối cùng và bị ' +
           'thu hồi. Kết quả là cùng một cái tên nhưng là một <b>file khác</b>, mang inode ' +
           'khác: 34425 → 34426. Cách làm này có một ưu điểm lớn: nó <b>nguyên tử</b>. Mất ' +
           'điện giữa chừng thì bạn còn nguyên file cũ, chứ không còn một file bị sửa dở. ' +
           'Với thiết bị nhúng — nơi mất điện là chuyện thường ngày — đó không phải chi tiết ' +
           'nhỏ. Chữ <code>i</code> là viết tắt của <i>in-place</i>, nhưng đó là in-place ' +
           'nhìn từ phía <i>cái tên</i>, không phải nhìn từ phía <i>file</i>.</p>' +
           '<p><b>Vì sao cặp hard link tách ra.</b> Trước khi chạy, hai cái tên ' +
           '<code>shared.conf</code> và <code>backup.conf</code> là hai mục thư mục cùng ' +
           'trỏ tới inode 34425 — đó là ý nghĩa của <code>links=2</code>. Lệnh ' +
           '<code>sed -i</code> tạo file mới (inode 34427) rồi <code>rename</code> nó lên ' +
           '<b>chỉ một cái tên</b>: <code>shared.conf</code>. Thao tác ấy không hề động tới ' +
           '<code>backup.conf</code>, vốn vẫn trỏ inode 34425 như cũ. Bây giờ mỗi inode chỉ ' +
           'còn đúng một tên, nên <code>links</code> tụt xuống 1 ở cả hai. Hai file từng là ' +
           'một, giờ là hai, và nội dung đã khác nhau: <code>value = 2</code> so với ' +
           '<code>value = 1</code>. Nếu bạn từng dùng hard link để hai đường dẫn luôn giữ ' +
           'chung một cấu hình, thì <code>sed -i</code> vừa lặng lẽ phá vỡ điều đó. Câu C2 ' +
           'cho thấy phiên bản symlink của cùng cái bẫy này, và nó còn khó thấy hơn.</p>' },

    { id: 'b3', k: 'free', truc: 2, tag: 'Bắt lỗi phát biểu', rows: 8,
      q: 'Một đồng nghiệp viết trong tài liệu nội bộ: <i>"Biểu thức chính quy là một chuẩn ' +
         'chung. Mẫu <code>o+</code> nghĩa là <b>một hoặc nhiều chữ o</b> ở mọi công cụ ' +
         'Linux; <code>grep</code>, <code>sed</code>, <code>awk</code> chỉ khác nhau ở tên ' +
         'các tuỳ chọn, còn mẫu thì viết y như nhau, cứ copy qua lại thoải mái."</i> Chỉ ra ' +
         'chỗ sai, giải thích cơ chế, và viết lại cho đúng.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'cat -n pattern.txt' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '     1\too\n' +
                '     2\to+\n' +
                '     3\tabc' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "grep -n 'o+' pattern.txt" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '2:o+' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "grep -En 'o+' pattern.txt" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '1:oo\n2:o+' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "sed -n '/o+/p' pattern.txt" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'o+' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "awk '/o+/' pattern.txt" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'oo\no+' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "echo 'ooo-ooo' | sed 's/o+/X/'\necho 'ooo-ooo' | sed 's/o\\+/X/'\necho 'ooo-ooo' | sed -E 's/o+/X/'" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'ooo-ooo\n' +
                'X-ooo\n' +
                'X-ooo' },
        { t: 'cal', kind: 'warn',
          x: 'Bốn công cụ, một mẫu, <b>hai</b> kết quả. Và không công cụ nào in ra một lời ' +
             'cảnh báo nào.' }
      ],
      hint: 'Đếm xem có mấy công cụ ra 1 dòng và mấy công cụ ra 2 dòng, rồi tìm xem hai ' +
            'nhóm ấy có điểm gì chung.',
      crit: [
        'Chỉ ra chỗ sai: có <b>hai</b> phương ngữ regex — BRE và ERE — và chúng khác nhau ở <b>ý nghĩa của mẫu</b>, không phải ở tên tuỳ chọn',
        'Xếp đúng bốn công cụ: <code>grep</code> và <code>sed</code> mặc định <b>BRE</b>; <code>grep -E</code>, <code>sed -E</code> và <code>awk</code> (luôn luôn) dùng <b>ERE</b>',
        'Giải thích trong BRE thì <code>+ ? { } ( ) |</code> là <b>ký tự thường</b>, nên <code>o+</code> tìm đúng chuỗi hai ký tự <code>o+</code> — và vì thế nó khớp dòng 2 chứ không khớp dòng 1',
        'Nêu hai cách chữa: thêm dấu <code>\\</code> trước toán tử (<code>o\\+</code>), hoặc bật ERE bằng <code>-E</code>',
        'Nhấn mạnh điều làm ngộ nhận này đắt: mẫu viết sai phương ngữ vẫn là mẫu <b>hợp lệ</b>, nên không có thông báo lỗi — chỉ có kết quả sai',
        'Viết lại được phát biểu cho đúng'
      ],
      sol: '<p><b>Chỗ sai.</b> Không có "một chuẩn chung". Có ít nhất hai phương ngữ đang ' +
           'chạy song song trên mọi máy Linux: <b>BRE</b> (Basic Regular Expression) và ' +
           '<b>ERE</b> (Extended). Chúng không khác nhau ở tên tuỳ chọn — chúng khác nhau ở ' +
           '<b>ý nghĩa của chính cái mẫu</b>. Và cách chia thì trái trực giác: ' +
           '<code>grep</code> cùng <code>sed</code> mặc định BRE, trong khi ' +
           '<code>awk</code> <b>luôn luôn</b> dùng ERE và không có cách nào bảo nó dùng ' +
           'BRE. Nên câu "copy mẫu qua lại thoải mái" sai ngay giữa hai công cụ đứng cạnh ' +
           'nhau trong cùng một đường ống.</p>' +
           '<p><b>Cơ chế.</b> Trong BRE, các dấu <code>+ ? { } ( ) |</code> <b>không phải ' +
           'toán tử</b> — chúng là ký tự thường, khớp với chính nó. Vậy mẫu ' +
           '<code>o+</code> trong BRE có nghĩa là "chữ o, rồi dấu cộng": đúng hai ký tự. Đó ' +
           'là vì sao <code>grep \'o+\'</code> ra <b>dòng 2</b> (<code>o+</code>) mà không ' +
           'ra dòng 1 (<code>oo</code>) — nó tìm đúng cái nó được bảo tìm. Còn ' +
           '<code>grep -E</code> và <code>awk</code> đọc <code>+</code> là toán tử ' +
           '"một-hoặc-nhiều", nên ra cả dòng 1 lẫn dòng 2 (dòng 2 cũng có một chữ o). Bốn ' +
           'công cụ chia làm hai nhóm đúng theo phương ngữ, không theo tên công cụ.</p>' +
           '<p><b>Hai cách chữa.</b> Hoặc thoát từng toán tử — <code>sed \'s/o\\+/X/\'</code> ' +
           'cho <code>X-ooo</code> đúng như mong đợi — hoặc bật ERE: ' +
           '<code>sed -E \'s/o+/X/\'</code> cho kết quả y hệt. Còn ' +
           '<code>sed \'s/o+/X/\'</code> thì trả lại <code>ooo-ooo</code> nguyên vẹn: không ' +
           'tìm thấy <code>o+</code> nên không thay gì cả.</p>' +
           '<p><b>Vì sao ngộ nhận này đắt hơn vẻ ngoài của nó.</b> Một mẫu ERE viết nhầm ' +
           'chỗ dùng BRE vẫn là một mẫu <b>hợp lệ</b> — nó chỉ tìm thứ khác. Không thông ' +
           'báo lỗi, không cảnh báo, không gì cả; chỉ có kết quả rỗng và mã thoát 1, thứ mà ' +
           'mọi script đều đọc thành "không có gì khớp". Đây là lý do C3 tồn tại.</p>' +
           '<p><b>Viết lại cho đúng:</b> <i>"Có hai phương ngữ regex. <code>grep</code> và ' +
           '<code>sed</code> mặc định dùng BRE, trong đó <code>+ ? { } ( ) |</code> là ký ' +
           'tự thường và phải viết <code>\\+ \\? \\{ \\} \\( \\) \\|</code> mới thành toán ' +
           'tử. <code>grep -E</code>, <code>sed -E</code> và <code>awk</code> dùng ERE, ' +
           'trong đó chúng là toán tử sẵn. Trước khi copy một mẫu từ công cụ này sang công ' +
           'cụ khác, phải kiểm phương ngữ — và thói quen an toàn là luôn gõ <code>-E</code>."' +
           '</i></p>' },

    { id: 'b4', k: 'free', tag: 'Giải thích vì sao', rows: 8,
      q: 'Tôi muốn tìm mọi file <code>.c</code> và <code>.h</code> trong cây nguồn. Câu lệnh ' +
         'chạy không lỗi, nhưng kết quả có một dòng không nên có ở đó. Giải thích <b>vì ' +
         'sao</b> <code>tree/include.h</code> lọt vào, và vì sao thêm cặp ngoặc lại chữa ' +
         'được.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'find tree | sort' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'tree\n' +
                'tree/build\n' +
                'tree/build/main.o\n' +
                'tree/include.h\n' +
                'tree/src\n' +
                'tree/src/gpio.h\n' +
                'tree/src/main.c\n' +
                'tree/src/uart.c' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "find tree -type f -name '*.c' -o -name '*.h' | sort" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'tree/include.h\n' +
                'tree/src/gpio.h\n' +
                'tree/src/main.c\n' +
                'tree/src/uart.c' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "find tree -type f \\( -name '*.c' -o -name '*.h' \\) | sort\nstat -c '%F  %n' tree/include.h" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'tree/src/gpio.h\n' +
                'tree/src/main.c\n' +
                'tree/src/uart.c\n' +
                'directory  tree/include.h' },
        { t: 'cal', kind: 'info',
          x: 'Hai điều kiện viết cạnh nhau trong <code>find</code> ngầm hiểu là <b>VÀ</b>. ' +
             'Không có toán tử nào phải gõ ra — chính vì thế mà dễ quên nó tồn tại.' }
      ],
      hint: 'Viết lại biểu thức với dấu VÀ hiện ra rõ ràng, rồi hỏi: giữa VÀ và HOẶC, cái ' +
            'nào được nhóm trước?',
      crit: [
        'Nhận ra <code>tree/include.h</code> là một <b>thư mục</b> chứ không phải file, dù tên kết thúc bằng <code>.h</code>',
        'Chỉ ra hai điều kiện đứng cạnh nhau là phép <b>AND ngầm</b>: <code>-type f -name \'*.c\'</code> thật ra là <code>-type f <b>-a</b> -name \'*.c\'</code>',
        'Nói AND có độ ưu tiên <b>cao hơn</b> OR, nên biểu thức được đọc thành <code>(-type f AND -name \'*.c\') OR (-name \'*.h\')</code>',
        'Suy ra hệ quả: nhánh <code>-name \'*.h\'</code> đứng một mình, <b>không</b> chịu ràng buộc <code>-type f</code> — nên bất cứ thứ gì tên kết thúc bằng <code>.h</code> đều lọt, kể cả thư mục',
        'Giải thích cặp <code>\\( \\)</code> gom phép OR lại thành một khối, để <code>-type f</code> áp lên cả hai nhánh',
        'Giải thích vì sao phải viết <code>\\(</code> chứ không phải <code>(</code>: dấu ngoặc là ký tự đặc biệt của <b>shell</b>, phải thoát để nó tới được find'
      ],
      sol: '<p><b>Thủ phạm không phải find, mà là độ ưu tiên.</b> Trong ' +
           '<code>find</code>, hai điều kiện viết cạnh nhau ngầm nối bằng phép <b>VÀ</b>. ' +
           'Viết ra cho rõ, biểu thức của bạn là:</p>' +
           '<p><code>-type f <b>-a</b> -name \'*.c\' <b>-o</b> -name \'*.h\'</code></p>' +
           '<p>Và cũng như trong toán học hay trong C, phép VÀ được nhóm <b>trước</b> phép ' +
           'HOẶC. Nên find thật sự đọc câu lệnh của bạn thành:</p>' +
           '<p><code>( -type f VÀ -name \'*.c\' ) HOẶC ( -name \'*.h\' )</code></p>' +
           '<p>Nhánh thứ hai đứng <b>một mình</b>. Nó không hề chịu ràng buộc ' +
           '<code>-type f</code>. Cho nên bất cứ thứ gì có tên kết thúc bằng ' +
           '<code>.h</code> đều được nhận, và <code>stat</code> cho biết ' +
           '<code>tree/include.h</code> là một <b>directory</b> — một thư mục tên là ' +
           '<code>include.h</code>. Chuyện này không hiếm chút nào trong mã nguồn thật; ' +
           'nhân Linux, U-Boot và vô số thư viện đều có thư mục tên kiểu ấy.</p>' +
           '<p><b>Vì sao cặp ngoặc chữa được.</b> <code>\\( -name \'*.c\' -o -name ' +
           '\'*.h\' \\)</code> gom phép HOẶC lại thành một khối duy nhất, và bây giờ ' +
           '<code>-type f</code> nối VÀ với cả khối ấy — nghĩa là điều kiện "phải là file ' +
           'thường" áp lên <b>cả hai</b> nhánh. Kết quả rút xuống đúng ba file nguồn.</p>' +
           '<p><b>Vì sao phải gõ <code>\\(</code> chứ không phải <code>(</code>.</b> Dấu ' +
           'ngoặc đơn là ký tự đặc biệt của <b>shell</b> — nó mở một subshell. Không thoát ' +
           'thì bash nuốt mất, find không bao giờ nhìn thấy. Đây lại đúng cái nguyên tắc ' +
           'của Bài 6 và của D1 ngay dưới đây: shell luôn xử lý dòng lệnh <i>trước</i>, và ' +
           'thứ lệnh nhận được không phải thứ bạn gõ. Viết <code>\'(\'</code> hay ' +
           '<code>"("</code> cũng được, cùng tác dụng.</p>' +
           '<p><b>Bài học vận hành.</b> Lỗi này im lặng theo một kiểu đặc biệt khó chịu: ' +
           'kết quả <i>gần đúng</i>. Bốn dòng thay vì ba — nếu cây nguồn có 2000 file thì ' +
           'không ai phát hiện. Khi câu lệnh của bạn có <code>-o</code>, hãy coi cặp ' +
           '<code>\\( \\)</code> là bắt buộc, kể cả lúc nó có vẻ thừa.</p>' },

    { id: 'b5', k: 'free', tag: 'So sánh cặp', rows: 7,
      q: 'Ba câu lệnh đếm cùng một chuỗi phiên bản trong cùng một file, ra ba… à không, ra ' +
         '<b>hai</b> con số. Hãy nói rõ mỗi lệnh thật sự đang tìm gì, vì sao câu đầu ra ' +
         '<b>3</b>, và trong ba cách viết ấy thì cách nào bạn nên đưa vào script kiểm tra ' +
         'phiên bản kernel — kèm lý do.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'cat -n version.txt' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '     1\tLinux version 6.18.33\n' +
                '     2\tbuild id 6218933\n' +
                '     3\thash 6a18b33' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "grep -c '6.18.33' version.txt\ngrep -c '6\\.18\\.33' version.txt\ngrep -cF '6.18.33' version.txt" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '3\n' +
                '1\n' +
                '1' },
        { t: 'cal', kind: 'warn',
          x: 'Cả ba dòng của file đều dài đúng bằng nhau ở chỗ cần thiết. Đó không phải ' +
             'trùng hợp — chúng được dựng ra để cho thấy chính xác chuyện gì đang xảy ra.' }
      ],
      hint: 'Dấu chấm trong regex khớp với cái gì? Đếm số ký tự giữa <code>6</code> và ' +
            '<code>33</code> ở cả ba dòng.',
      crit: [
        'Nói dấu <code>.</code> trong regex khớp <b>một ký tự bất kỳ</b>, nên <code>6.18.33</code> khớp cả <code>6218933</code> và <code>6a18b33</code>',
        'Giải thích con số <b>3</b>: cả ba dòng đều có dạng "6, một ký tự bất kỳ, 18, một ký tự bất kỳ, 33"',
        'Giải thích <code>6\\.18\\.33</code>: dấu <code>\\</code> biến dấu chấm thành dấu chấm thật, nên chỉ dòng 1 khớp',
        'Giải thích <code>-F</code>: tắt <b>toàn bộ</b> nghĩa regex, coi mẫu là chuỗi ký tự trần — cùng kết quả nhưng khác cơ chế',
        'So sánh hai cách đúng: <code>\\.</code> phải nhớ thoát <b>từng</b> ký tự đặc biệt; <code>-F</code> tắt một lần cho tất cả, nên an toàn hơn khi mẫu đến từ biến',
        'Chọn được một cách cho script và biện minh — <code>-F</code> (kèm <code>-x</code> hoặc <code>-w</code> nếu cần chặt hơn) là lựa chọn hợp lý nhất'
      ],
      sol: '<p><b>Vì sao ra 3.</b> Dấu chấm trong regex không phải dấu chấm — nó là toán tử ' +
           '"một ký tự bất kỳ". Mẫu <code>6.18.33</code> vì thế có nghĩa: <i>số 6, rồi một ' +
           'ký tự nào cũng được, rồi 18, rồi một ký tự nào cũng được, rồi 33</i>. Soi lại ' +
           'ba dòng: <code>6<b>.</b>18<b>.</b>33</code> khớp, <code>6<b>2</b>18<b>9</b>33</code> ' +
           'khớp, <code>6<b>a</b>18<b>b</b>33</code> khớp. Cả ba. Một script kiểm tra phiên ' +
           'bản viết như vậy sẽ báo "đúng phiên bản" trên một chuỗi băm ngẫu nhiên.</p>' +
           '<p><b>Hai cách chữa, hai cơ chế khác nhau.</b> ' +
           '<code>grep -c \'6\\.18\\.33\'</code> vẫn ở trong thế giới regex nhưng ' +
           '<b>thoát</b> hai dấu chấm, bảo grep coi chúng là ký tự thật. ' +
           '<code>grep -cF \'6.18.33\'</code> thì đi hướng khác hẳn: <code>-F</code> ' +
           '(<i>fixed strings</i>) <b>tắt sạch</b> nghĩa regex, mẫu trở thành một chuỗi ký ' +
           'tự trần trụi. Cả hai đều ra <b>1</b> — kết quả giống nhau, đường đi khác ' +
           'nhau.</p>' +
           '<p><b>Khác biệt nào mới thật sự quan trọng.</b> Không phải kết quả — mà là ' +
           '<i>chỗ hỏng khi mẫu đổi</i>. Cách <code>\\.</code> buộc bạn phải nhớ thoát ' +
           '<b>từng</b> ký tự đặc biệt, mỗi lần, mãi mãi: hôm nay là dấu chấm, mai mẫu có ' +
           'thêm <code>+</code> hay <code>[</code> là lại quên. Còn nguy hơn: nếu mẫu đến ' +
           'từ một <b>biến</b> — tên file, chuỗi người dùng nhập, giá trị đọc từ ' +
           '<code>/proc/version</code> — thì bạn <i>không thể</i> thoát trước được, vì bạn ' +
           'chưa biết nó chứa gì. <code>-F</code> giải quyết một lần cho tất cả: mọi ký tự ' +
           'đều là chính nó, không ngoại lệ nào.</p>' +
           '<p><b>Chọn cho script:</b> dùng <code>grep -F</code>. Quy tắc chung đáng nhớ — ' +
           '<i>nếu bạn tìm một chuỗi cố định, hãy nói ra rằng nó cố định</i>. Regex chỉ nên ' +
           'bật lên khi bạn thật sự cần mô tả một <b>mẫu</b>. Nếu cần chặt hơn nữa thì ghép ' +
           'thêm <code>-x</code> (cả dòng phải khớp) hoặc <code>-w</code> (khớp trọn từ). ' +
           'Có một phần thưởng nhỏ đi kèm: không phải phân tích regex nên <code>-F</code> ' +
           'thường nhanh hơn — nhưng đó là lý do phụ, lý do chính là tính đúng đắn.</p>' },

    { id: 'b6', k: 'free', tag: 'Đọc output', rows: 8,
      q: 'Bốn lệnh awk chạy trên cùng file log tám dòng ở B1. Hãy giải thích <b>vì sao cột ' +
         'thứ tư của <code>$9</code> trống</b>, vì sao <code>$NF</code> và <code>$9</code> ' +
         'khác nhau, và <code>116046</code> là tổng của những số nào.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "awk '{print NF}' device.log" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '9\n9\n10\n8\n10\n9\n9\n9' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "awk '{print $9}' device.log" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '115200\n32\ndevice\n\nhigh\n487\n64\n12' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "awk '{print $NF}' device.log" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '115200\n32\n0\n250\n1\n487\n64\n12' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "awk '{s += $NF} END {print s, NR}' device.log" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '116046 8' },
        { t: 'cal', kind: 'info',
          x: '<code>NF</code> = số trường của <b>dòng hiện tại</b>. <code>NR</code> = số ' +
             'thứ tự dòng đang đọc, và ở <code>END</code> thì nó là tổng số dòng.' }
      ],
      hint: 'Đếm tay số từ của dòng 4 trong file log ở B1, rồi hỏi <code>$9</code> của một ' +
            'dòng chỉ có 8 từ thì là cái gì.',
      crit: [
        'Đọc được cột <code>NF</code>: các dòng <b>không</b> có cùng số trường — 9, 9, 10, 8, 10, 9, 9, 9',
        'Giải thích ô trống của <code>$9</code>: dòng 4 chỉ có <b>8</b> trường, nên <code>$9</code> là trường không tồn tại — awk trả về chuỗi rỗng, <b>không</b> báo lỗi',
        'Giải thích <code>$NF</code> luôn là trường <b>cuối cùng</b> của mỗi dòng, nên nó đúng ở cả tám dòng',
        'Đối chiếu được hai cột: ở dòng 3 <code>$9</code> ra <code>device</code> còn <code>$NF</code> ra <code>0</code>; ở dòng 5 <code>$9</code> ra <code>high</code> còn <code>$NF</code> ra <code>1</code>',
        'Tính được <code>116046</code> = 115200 + 32 + 0 + 250 + 1 + 487 + 64 + 12',
        'Rút ra quy tắc: đánh số cột cứng chỉ an toàn khi dữ liệu có số cột cố định; với văn bản tự do ở cuối dòng thì phải dùng <code>$NF</code>'
      ],
      sol: '<p><b>Điều đầu tiên phải nhìn thấy là cột <code>NF</code>.</b> Tám dòng cho ra ' +
           '9, 9, 10, 8, 10, 9, 9, 9 — file log này <b>không</b> có số cột cố định. Lý do ' +
           'rất đời thường: bốn cột đầu (ngày, giờ, mức, hệ con) thì đều đặn, nhưng phần ' +
           'còn lại là <i>câu tiếng Anh do lập trình viên viết</i>, và câu thì dài ngắn tuỳ ' +
           'hứng. Mọi file log thật đều như vậy.</p>' +
           '<p><b>Ô trống ở dòng 4.</b> Dòng đó là <code>… ERROR uart timeout during read ' +
           '250</code> — đếm đủ <b>8</b> từ. Bạn hỏi <code>$9</code>, tức là trường thứ ' +
           'chín của một dòng chỉ có tám trường. awk <b>không báo lỗi</b>, không cảnh báo, ' +
           'không dừng: nó trả về chuỗi rỗng, in ra một dòng trắng, và chạy tiếp. Đây là ' +
           'kiểu hỏng im lặng quen thuộc của cả bộ bài tập này — và nếu bạn đang cộng dồn ' +
           'thay vì in ra, chuỗi rỗng ấy sẽ được coi là <b>0</b> và biến mất không dấu ' +
           'vết.</p>' +
           '<p><b><code>$NF</code> khác gì.</b> <code>NF</code> là <i>số</i> trường của ' +
           'dòng hiện tại, nên <code>$NF</code> là "trường thứ NF", tức là trường ' +
           '<b>cuối cùng</b> — awk tính lại cho từng dòng một. Với dòng 9 trường thì ' +
           '<code>$NF</code> chính là <code>$9</code>, nên hai cột trùng nhau ở phần lớn ' +
           'các dòng. Chúng tách ra đúng ở ba chỗ dòng dài hoặc ngắn khác thường: dòng 3 ' +
           '(10 trường) cho <code>$9 = device</code> nhưng <code>$NF = 0</code>; dòng 4 ' +
           '(8 trường) cho <code>$9</code> rỗng nhưng <code>$NF = 250</code>; dòng 5 ' +
           '(10 trường) cho <code>$9 = high</code> nhưng <code>$NF = 1</code>.</p>' +
           '<p><b>Con số 116046</b> là tổng của cột <code>$NF</code>: ' +
           '115200 + 32 + 0 + 250 + 1 + 487 + 64 + 12 = <b>116046</b>. Và ' +
           '<code>NR</code> ở <code>END</code> cho <b>8</b> — tổng số dòng đã đọc. Lưu ý ' +
           'con số 116046 này không có ý nghĩa gì về mặt nghiệp vụ: nó cộng lẫn tốc độ ' +
           'baud, số chân GPIO và mã lỗi. Đó là chủ đích — nó cho thấy awk sẽ vui vẻ cộng ' +
           'bất cứ thứ gì bạn bảo nó cộng.</p>' +
           '<p><b>Quy tắc rút ra.</b> Đánh số cột cứng (<code>$3</code>, <code>$9</code>) ' +
           'chỉ an toàn ở phần <i>đầu</i> dòng, nơi cấu trúc cố định. Ngay khi có văn bản ' +
           'tự do, hãy đếm từ cuối lên bằng <code>$NF</code>, <code>$(NF-1)</code>. Và khi ' +
           'nghi ngờ, in <code>NF</code> ra trước — đó là câu lệnh chẩn đoán rẻ nhất trong ' +
           'awk.</p>' },
  ],

  /* ═══ C · Vận dụng — 2 chẩn đoán + 2 tình huống mới + 1 tính toán ═══════ */
  C: [
    { id: 'c1', k: 'free', truc: 0, tag: 'Tình huống mới', rows: 10,
      q: 'Bo mạch của bạn có <b>64 MB RAM</b>, đã dùng mất 38 MB cho hệ thống và ứng dụng — ' +
         'còn khoảng <b>26 MB</b> trống. Trên thẻ nhớ có một file <code>events.log</code> ' +
         '<b>900 MB</b>, mỗi dòng kết thúc bằng một mã lỗi, và bạn cần biết <b>năm mã lỗi ' +
         'xuất hiện nhiều nhất</b>. Bảng dưới là số RAM (RSS) đo thật của ba cách làm. ' +
         'Chọn cách bạn sẽ chạy trên bo mạch, và <b>biện minh bằng bảng số</b> — kèm điều ' +
         'kiện nào sẽ làm bạn đổi ý.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "# ba cách làm, cùng một câu hỏi\nuniq -c events.log\nsort events.log\nawk '{c[$0]++} END {for (k in c) print k, c[k]}' events.log" },
        { t: 'table',
          head: ['Số dòng đầu vào', 'Cỡ file', '<code>uniq -c</code>', '<code>sort</code>', 'mảng <code>awk</code>'],
          rows: [
            ['200 000', '1,4 MB', '7 904 KB', '14 440 KB', '4 440 KB'],
            ['2 000 000', '14 MB', '7 868 KB', '69 164 KB', '4 372 KB'],
            ['8 000 000', '56 MB', '<b>8 116 KB</b>', '<b>250 536 KB</b>', '<b>4 620 KB</b>']
          ] },
        { t: 'cal', kind: 'info',
          x: 'Bảng thứ hai: cùng 2 000 000 dòng, chỉ đổi <b>số giá trị phân biệt</b> của mã ' +
             'lỗi.' },
        { t: 'table',
          head: ['Số mã lỗi phân biệt', '<code>uniq -c</code>', '<code>sort</code>', 'mảng <code>awk</code>'],
          rows: [
            ['5', '8 156 KB', '64 896 KB', '4 464 KB'],
            ['500 000', '7 652 KB', '74 304 KB', '<b>172 988 KB</b>']
          ] },
        { t: 'cal', kind: 'warn',
          x: 'Trên bo mạch nhúng, vượt RAM không cho bạn một thông báo lỗi lịch sự. ' +
             '<b>OOM killer</b> bắn tiến trình, và cái nó bắn không nhất thiết là tiến ' +
             'trình có lỗi.' }
      ],
      hint: 'Đọc bảng thứ nhất theo <i>chiều dọc</i>: cột nào tăng theo cỡ đầu vào, cột nào ' +
            'đứng yên? Rồi đọc bảng thứ hai và hỏi: cái gì quyết định con số của từng cột?',
      crit: [
        'Đọc được quy luật của bảng 1: <code>uniq -c</code> gần như <b>không đổi</b> (7,9–8,1 MB) khi đầu vào tăng 40 lần; <code>sort</code> tăng gần <b>tuyến tính</b> theo cỡ file (14 → 69 → 250 MB)',
        'Giải thích vì sao <code>uniq</code> hằng số: nó chỉ giữ <b>một dòng</b> trong bộ nhớ; còn <code>sort</code> phải giữ <b>toàn bộ</b> dữ liệu mới sắp xếp được',
        'Đọc được bảng 2: RAM của mảng awk tỉ lệ với <b>số khoá phân biệt</b>, không phải cỡ file — 4,4 MB với 5 mã lỗi, 173 MB với 500 000',
        'Ngoại suy được cho 900 MB: <code>sort</code> sẽ đòi hàng GB, vượt xa 26 MB — loại',
        'Chọn <b>mảng awk</b> làm phương án chính, với lý do: số <b>mã lỗi</b> phân biệt trên một thiết bị là nhỏ (vài chục), nên RAM ≈ 4–5 MB bất kể log to bao nhiêu',
        'Nêu được điều kiện đổi ý: nếu khoá không phải mã lỗi mà là thứ gần như không lặp (timestamp, UUID, số dòng) thì mảng awk phình theo số dòng và phải đổi cách',
        'Nêu được phương án dự phòng nếu buộc phải dùng sort: <code>sort -S</code> giới hạn RAM và cho nó tràn ra đĩa — đổi RAM lấy I/O và tuổi thọ thẻ nhớ'
      ],
      sol: '<p><b>Đọc bảng thứ nhất theo chiều dọc.</b> Đầu vào tăng 40 lần (1,4 MB → ' +
           '56 MB) thì <code>uniq -c</code> đi từ 7 904 KB lên 8 116 KB — <b>gần như không ' +
           'nhúc nhích</b>, chênh 2,7 %, tức là nhiễu đo. Còn <code>sort</code> đi từ ' +
           '14 440 KB lên 250 536 KB, tăng 17 lần. Hai đường cong ấy là hai thuật toán khác ' +
           'nhau về bản chất, không phải hai cách cài đặt khác nhau. <code>uniq</code> giữ ' +
           'trong bộ nhớ <b>đúng một dòng</b> — dòng vừa đọc — nên bộ nhớ của nó là hằng số ' +
           'theo định nghĩa. <code>sort</code> thì không thể in dòng đầu tiên ra trước khi ' +
           'đọc xong dòng cuối cùng, vì dòng cuối cùng có thể chính là dòng phải in đầu; ' +
           'nên nó phải <b>giữ tất cả</b>.</p>' +
           '<p><b>Bảng thứ hai đo một thứ khác hẳn.</b> Cỡ file giữ nguyên, chỉ số ' +
           '<i>giá trị phân biệt</i> đổi từ 5 lên 500 000. <code>uniq -c</code> và ' +
           '<code>sort</code> gần như không quan tâm, nhưng mảng awk nhảy từ 4 464 KB lên ' +
           '<b>172 988 KB</b> — gấp 39 lần. Lý do hiển nhiên khi nói ra: mảng awk là một ' +
           'bảng băm, và nó phải chứa <b>một ô cho mỗi khoá phân biệt</b>. RAM của nó tỉ lệ ' +
           'với <i>số khoá</i>, hoàn toàn không liên quan tới số dòng.</p>' +
           '<p><b>Ngoại suy cho 900 MB.</b> <code>sort</code> ở 56 MB đã ngốn 250 MB; ở ' +
           '900 MB nó sẽ đòi cỡ 4 GB. Bạn có 26 MB. Loại ngay, không cần bàn thêm — và ' +
           'nhớ rằng loại <code>sort</code> đồng nghĩa với loại luôn cả ' +
           '<code>sort | uniq -c</code>, đường ống mà phản xạ đầu tiên của bạn sẽ gõ ra.</p>' +
           '<p><b>Phương án chọn: mảng <code>awk</code>.</b> Câu hỏi quyết định không phải ' +
           '"file to bao nhiêu" mà là "<b>có bao nhiêu mã lỗi phân biệt</b>". Trên một ' +
           'thiết bị nhúng, mã lỗi là một tập hữu hạn do chính firmware định nghĩa — vài ' +
           'chục, cùng lắm vài trăm. Với ngần ấy khoá thì mảng awk nằm ở mức 4–5 MB dù log ' +
           'có 900 MB hay 9 GB, vì awk đọc dòng nào là vứt dòng ấy, chỉ giữ lại bảng đếm. ' +
           'Và nó cho luôn câu trả lời trong <b>một lần đọc</b> — thêm ' +
           '<code>| sort -rn | head -5</code> ở cuối để xếp hạng, trên một bảng chỉ vài ' +
           'chục dòng thì <code>sort</code> ấy chẳng tốn gì.</p>' +
           '<p><b>Điều kiện đổi ý — đây mới là phần quan trọng của câu trả lời.</b> Lập ' +
           'luận trên đứng được <i>chỉ vì</i> khoá là mã lỗi. Nếu bạn đổi khoá thành thứ ' +
           'gần như không bao giờ lặp — dấu thời gian đầy đủ, UUID phiên, địa chỉ — thì số ' +
           'khoá phân biệt xấp xỉ số dòng, và mảng awk phình đúng theo cột 173 MB kia. Lúc ' +
           'ấy không cách nào trong ba cách chạy lọt 26 MB, và bạn phải đổi hẳn cách đặt ' +
           'vấn đề: cắt bớt khoá trước khi đếm (<code>cut -c1-10</code> để gom theo giờ), ' +
           'lọc trước rồi mới đếm, hoặc chấp nhận <code>sort -S 8M</code> — đo được ' +
           '18 440 KB thay vì 68 888 KB, vì nó tràn phần còn lại ra <b>đĩa</b>. Đó là đổi ' +
           'RAM lấy I/O, và trên thẻ nhớ flash thì I/O ghi chính là tuổi thọ sản phẩm ' +
           '(Bài 10 và bt-10 đã đo chuyện ấy).</p>' +
           '<p><b>Bài học chung:</b> không công cụ nào trong ba cái thắng ở mọi tình huống. ' +
           '<code>uniq</code> hằng số nhưng đòi sort trước; <code>sort</code> tổng quát ' +
           'nhưng tỉ lệ với dữ liệu; mảng awk rẻ nhất nhưng tỉ lệ với số khoá. Biết mình ' +
           'đang bị ràng buộc bởi <i>cái gì</i> mới là kỹ năng, chứ không phải thuộc lòng ' +
           'một đường ống.</p>' },

    { id: 'c2', k: 'free', truc: 1, tag: 'Chẩn đoán', rows: 9,
      q: 'Trên bo mạch, <code>/etc/network.conf</code> là một <b>symlink</b> trỏ tới ' +
         '<code>/data/network.conf</code> — cố ý như vậy, vì <code>/data</code> là phân ' +
         'vùng ghi được và tồn tại qua các lần nâng cấp firmware, còn <code>/etc</code> thì ' +
         'bị ghi đè mỗi lần nâng cấp. Script cập nhật chạy <code>sed -i</code> trên đường ' +
         'dẫn <code>/etc/network.conf</code>. Nó báo thành công, và ' +
         '<code>cat /etc/network.conf</code> cho thấy đúng giá trị mới. Nhưng sau lần nâng ' +
         'cấp firmware kế tiếp, cấu hình quay về giá trị <b>cũ</b>. Chẩn đoán.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'ls -l etc/uart.conf' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'lrwxrwxrwx 1 shinarus shinarus 17 Aug 15 16:48 etc/uart.conf -> ../real/uart.conf' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "sed -i 's/9600/115200/' etc/uart.conf\nls -l etc/uart.conf" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '-rw-r--r-- 1 shinarus shinarus 14 Aug 15 16:48 etc/uart.conf' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'cat real/uart.conf\ncat etc/uart.conf' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'baud = 9600\n' +
                'baud = 115200' },
        { t: 'cal', kind: 'warn',
          x: '<code>sed -i</code> thoát với mã <b>0</b>. Không một cảnh báo nào được in ra.' }
      ],
      hint: 'So sánh ký tự đầu tiên của hai dòng <code>ls -l</code>. Nó đã đổi từ gì sang ' +
            'gì?',
      crit: [
        'Chỉ ra bằng chứng quyết định: ký tự đầu dòng <code>ls -l</code> đổi từ <code>l</code> (symlink) sang <code>-</code> (file thường) — symlink <b>đã biến mất</b>',
        'Giải thích cơ chế: <code>sed -i</code> ghi ra file tạm rồi <code>rename()</code> đè lên <b>đường dẫn</b> <code>/etc/network.conf</code>, nên nó thay chính cái symlink chứ không đi xuyên qua symlink',
        'Chỉ ra file thật <code>/data/network.conf</code> <b>không hề đổi</b> — vẫn giữ giá trị cũ',
        'Giải thích vì sao <code>cat</code> ngay sau đó vẫn cho giá trị mới, và vì sao điều đó khiến lỗi không bị phát hiện: cái tên vẫn còn, chỉ là bây giờ nó là file thường mang nội dung mới',
        'Nối được với triệu chứng: nâng cấp firmware ghi đè <code>/etc</code>, xoá mất file thường ấy — và cũng xoá mất symlink; cấu hình rơi về bản trong <code>/data</code>, vốn chưa bao giờ được cập nhật',
        'Nêu cách chữa: chạy sed trên <b>đường dẫn thật</b> — <code>sed -i "$(readlink -f /etc/network.conf)"</code> — hoặc dùng dạng lọc rồi ghi lại đúng đích, hoặc kiểm tra bằng <code>test -L</code> trước khi sửa',
        'Nêu cách phát hiện sớm: so <code>stat -c %i</code> hoặc <code>ls -l</code> trước và sau khi chạy script cập nhật'
      ],
      sol: '<p><b>Bằng chứng nằm ở ký tự đầu tiên.</b> Trước khi chạy, dòng ' +
           '<code>ls -l</code> bắt đầu bằng <code><b>l</b>rwxrwxrwx</code> và có mũi tên ' +
           '<code>-&gt; ../real/uart.conf</code>: đó là một symlink. Sau khi chạy ' +
           '<code>sed -i</code>, dòng ấy bắt đầu bằng <code><b>-</b>rw-r--r--</code> và ' +
           'không còn mũi tên. <b>Symlink đã bị xoá</b> và thay bằng một file thường. Đây ' +
           'không phải tác dụng phụ kỳ lạ — nó là hệ quả trực tiếp và tất yếu của cơ chế ' +
           'mà B2 đã chỉ ra.</p>' +
           '<p><b>Cơ chế.</b> <code>sed -i</code> không sửa file; nó ghi kết quả ra một file ' +
           'tạm rồi <code>rename()</code> file tạm ấy lên <b>cái đường dẫn bạn đưa cho ' +
           'nó</b>. Đường dẫn bạn đưa là <code>/etc/network.conf</code>. Thao tác ' +
           '<code>rename</code> tác động lên <i>mục trong thư mục</i> mang tên ấy, chứ ' +
           'không đi xuyên qua symlink để tới đích. Kết quả: mục thư mục từng là symlink ' +
           'bây giờ trỏ thẳng tới file mới. Còn <code>/data/network.conf</code> — file mà ' +
           'symlink từng trỏ tới — <b>không bị chạm tới một byte</b>, và giữ nguyên giá trị ' +
           'cũ. Đo thật ở trên: <code>real/uart.conf</code> vẫn là ' +
           '<code>baud = 9600</code>.</p>' +
           '<p><b>Vì sao không ai phát hiện ra.</b> Vì mọi thứ đều <i>trông</i> đúng. ' +
           '<code>sed -i</code> thoát mã 0. Không cảnh báo. Và ' +
           '<code>cat /etc/network.conf</code> đọc ra <b>đúng giá trị mới</b> — dĩ nhiên, ' +
           'vì cái tên ấy giờ là một file thường chứa giá trị mới. Mọi kiểm tra sau khi ' +
           'chạy đều xanh. Thứ duy nhất đã hỏng là cái <i>liên kết</i>, và không có bài ' +
           'kiểm tra nào nhìn vào đó.</p>' +
           '<p><b>Vì sao đợi tới lần nâng cấp mới nổ.</b> Nâng cấp firmware ghi đè toàn bộ ' +
           '<code>/etc</code>. Nó xoá file thường mà sed để lại — và cùng với đó là mọi dấu ' +
           'vết của thay đổi — rồi đặt lại symlink từ ảnh gốc. Symlink mới lại trỏ về ' +
           '<code>/data/network.conf</code>, file chưa bao giờ được cập nhật. Cấu hình ' +
           '"quay về giá trị cũ" chỉ vì <b>nó chưa bao giờ rời khỏi giá trị cũ</b> ở nơi ' +
           'đáng ra phải rời. Toàn bộ mục đích của thiết kế symlink — giữ cấu hình sống sót ' +
           'qua nâng cấp — bị vô hiệu hoá ngay từ lần cập nhật đầu tiên.</p>' +
           '<p><b>Cách chữa.</b> Bám vào đường dẫn <i>thật</i>:</p>' +
           '<p><code>sed -i \'s/…/…/\' "$(readlink -f /etc/network.conf)"</code></p>' +
           '<p><code>readlink -f</code> giải hết mọi tầng symlink và trả về đường dẫn thật, ' +
           'nên <code>rename</code> rơi đúng chỗ. Hai cách khác cũng đúng: dùng sed ở dạng ' +
           'bộ lọc rồi tự ghi vào đích (<code>sed \'s/…/…/\' f &gt; tmp &amp;&amp; mv tmp ' +
           '"$(readlink -f f)"</code>), hoặc kiểm tra bằng <code>test -L</code> và từ chối ' +
           'chạy nếu gặp symlink. Còn cách <b>phát hiện</b> rẻ nhất — đáng thêm vào mọi ' +
           'script cập nhật cấu hình — là in <code>ls -l</code> hoặc ' +
           '<code>stat -c \'%F %i\'</code> trước và sau; loại file đổi từ <i>symbolic ' +
           'link</i> sang <i>regular file</i> là một tín hiệu không thể bỏ sót.</p>' +
           '<p>Cùng một cơ chế, ba nạn nhân khác nhau: hard link tách đôi (B2), symlink bị ' +
           'thay (câu này), và file đang được tiến trình khác mở — tiến trình ấy vẫn giữ ' +
           'inode cũ và sẽ không bao giờ thấy nội dung mới cho tới khi khởi động lại.</p>' },

    { id: 'c3', k: 'free', truc: 2, tag: 'Chẩn đoán', rows: 9,
      q: 'Một script CI kiểm tra log khởi động của bo mạch để chặn firmware hỏng. Nó chạy ' +
         '<b>ba tuần</b> và báo <code>boot log clean</code> mỗi lần. Hôm nay QA tìm thấy ' +
         'một bản dựng đã qua CI mà log khởi động có nguyên dòng ' +
         '<code>Kernel panic - not syncing</code>. Đây là dòng kiểm tra. Chẩn đoán, và ' +
         'nói rõ vì sao suốt ba tuần không ai thấy gì bất thường.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'if grep -q \'PANIC|Oops|BUG\' boot.log; then\n  echo "FAIL: boot log has errors"\n  exit 1\nfi\necho "boot log clean"' },
        { t: 'cal', kind: 'info',
          x: 'Để đo, tôi thay <code>boot.log</code> bằng một cây file thật và dùng cùng ' +
             'kiểu mẫu — một mẫu có dấu <code>|</code>, không có <code>-E</code>.' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "grep -rl --include='*.h' '__u8|__u16|__u32' /usr/include | wc -l\ngrep -rlE --include='*.h' '__u8|__u16|__u32' /usr/include | wc -l" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '0\n607' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "grep -rq --include='*.h' '__u8|__u16|__u32' /usr/include; echo \"rc=$?\"" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'rc=1' },
        { t: 'cal', kind: 'warn',
          x: 'Mã thoát <b>1</b> nghĩa là "không tìm thấy". Nó <i>không</i> có nghĩa là ' +
             '"mẫu của bạn sai". Với grep thì hai chuyện đó không phân biệt được.' }
      ],
      hint: 'Mẫu <code>PANIC|Oops|BUG</code> — trong phương ngữ mà grep dùng mặc định, ' +
            'chuỗi ấy mô tả cái gì? Viết ra bằng lời.',
      crit: [
        'Chỉ ra lỗi: mẫu dùng cú pháp <b>ERE</b> (<code>|</code> để chọn một trong nhiều) nhưng <code>grep</code> mặc định là <b>BRE</b>, nơi <code>|</code> chỉ là ký tự thường',
        'Dịch được mẫu ra lời: BRE hiểu <code>PANIC|Oops|BUG</code> là một chuỗi <b>15 ký tự liền nhau</b>, gồm cả hai dấu sổ đứng',
        'Kết luận: chuỗi ấy không bao giờ xuất hiện trong log thật, nên <code>grep -q</code> luôn trả về 1, và nhánh <code>if</code> không bao giờ chạy',
        'Nói rõ vì sao lỗi im lặng: mẫu <b>hợp lệ</b> nên không có thông báo lỗi; rc=1 là mã thoát bình thường mà mọi script đều đọc thành "sạch"',
        'Chỉ ra chỗ nguy hiểm riêng của <code>-q</code>: nó nuốt luôn phần output, nên không còn gì cho người vận hành nhìn thấy để mà nghi ngờ',
        'Nêu cách sửa: thêm <code>-E</code> (hoặc thoát thành <code>PANIC\\|Oops\\|BUG</code>), và cân nhắc <code>-i</code> vì log thật viết <code>Kernel panic</code> chữ thường',
        'Nêu cách phòng loại lỗi này về sau: kiểm tra ngược — cho script tự chạy trên một log <b>đã biết là hỏng</b> và bắt buộc nó phải FAIL'
      ],
      sol: '<p><b>Lỗi nằm ở một cờ bị thiếu.</b> Mẫu <code>PANIC|Oops|BUG</code> được viết ' +
           'theo cú pháp <b>ERE</b>, nơi <code>|</code> nghĩa là "hoặc". Nhưng ' +
           '<code>grep</code> không kèm <code>-E</code> thì dùng <b>BRE</b>, và trong BRE ' +
           'thì <code>|</code> là một <b>ký tự thường</b>. Dịch ra lời, grep đang đi tìm một ' +
           'chuỗi <b>15 ký tự liền nhau</b>: <code>P A N I C | O o p s | B U G</code>. ' +
           'Chuỗi đó không xuất hiện trong bất kỳ log khởi động nào từng tồn tại. Ba tuần, ' +
           'không lần nào khớp, và mỗi lần đều báo sạch.</p>' +
           '<p><b>Đo ở quy mô thật cho thấy khoảng cách.</b> Cùng một cây thư mục, cùng một ' +
           'mẫu: không có <code>-E</code> ra <b>0</b> file, có <code>-E</code> ra ' +
           '<b>607</b>. Không phải lệch vài phần trăm — mà là toàn bộ so với không có gì. ' +
           'Và <code>grep -rq</code> trả về <code>rc=1</code>, đúng cái mã thoát mà mọi ' +
           'script trên đời đọc thành "không tìm thấy, mọi thứ ổn".</p>' +
           '<p><b>Vì sao ba tuần không ai thấy gì.</b> Ba lớp im lặng chồng lên nhau. ' +
           '<b>Một</b>, mẫu viết sai phương ngữ vẫn là mẫu <b>hợp lệ</b> — grep không có ' +
           'cách nào biết bạn <i>định</i> viết ERE, nên không có cảnh báo nào để in ra. ' +
           '<b>Hai</b>, mã thoát 1 hoàn toàn bình thường và không phân biệt được với "log ' +
           'thật sự sạch"; grep dùng đúng một mã thoát cho cả hai tình huống. <b>Ba</b> — ' +
           'và đây là chỗ <code>-q</code> góp phần — cờ <code>-q</code> vứt luôn phần ' +
           'output, nên trên màn hình CI không còn gì để một người tinh mắt nhìn thấy mà ' +
           'nghi ngờ. Thêm vào đó là thứ tệ nhất: <b>bài kiểm tra chưa bao giờ được kiểm ' +
           'tra</b>. Suốt ba tuần nó chỉ chạy trên những bản dựng tốt, nên "luôn báo sạch" ' +
           'trông y hệt như "đang làm việc tốt".</p>' +
           '<p><b>Sửa.</b> Thêm <code>-E</code>:</p>' +
           '<p><code>if grep -Eqi \'PANIC|Oops|BUG\' boot.log; then</code></p>' +
           '<p>Tôi thêm luôn <code>-i</code>, và đó không phải làm màu: log thật viết ' +
           '<code>Kernel panic - not syncing</code> với chữ <code>panic</code> ' +
           '<b>viết thường</b>, nên ngay cả sau khi sửa <code>-E</code> thì mẫu ' +
           '<code>PANIC</code> viết hoa vẫn trượt. Hai lỗi độc lập trong cùng một dòng, và ' +
           'lỗi thứ hai chỉ lộ ra sau khi bạn sửa lỗi thứ nhất. Cách viết thứ hai — ' +
           '<code>grep -q \'PANIC\\|Oops\\|BUG\'</code> — cũng chạy đúng trong BRE, nhưng ' +
           'khó đọc hơn và dễ quên hơn.</p>' +
           '<p><b>Bài học vận hành, quan trọng hơn cả bản sửa.</b> Một bài kiểm tra chưa ' +
           'bao giờ <i>thất bại</i> thì chưa được chứng minh là có hoạt động. Mỗi bộ kiểm ' +
           'tra dạng "tìm chuỗi xấu" cần một phép thử ngược đi kèm: chạy nó trên một file ' +
           'log <b>cố ý hỏng</b> đặt sẵn trong kho mã, và bắt buộc nó phải trả về FAIL. ' +
           'Phép thử ấy tốn ba dòng, và nó sẽ bắt được lỗi này ngay ngày đầu tiên.</p>' },

    { id: 'c4', k: 'free', tag: 'Tình huống mới', rows: 10,
      q: 'Bo mạch đẩy log qua cổng serial <b>liên tục, không bao giờ kết thúc</b>. Bạn cần ' +
         'một bảng đếm <b>cập nhật liên tục</b> ngay trên terminal để theo dõi trong lúc ' +
         'chạy thử độ bền. Ba đường ống dưới đây, cái nào làm được? Giải thích cho từng cái ' +
         'một, và phân biệt rõ hai <b>nguyên nhân trễ khác nhau</b> mà số đo cho thấy.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "# nguồn phát: 1 dòng mỗi 0,3 giây, 10 dòng rồi dừng\n./slow.sh | sort | uniq -c\n./slow.sh | uniq -c\n./slow.sh | awk '{c[$0]++; print c[$0], $0}'" },
        { t: 'cal', kind: 'info',
          x: 'Cột <code>t=</code> là thời điểm dòng đó <b>tới nơi</b>, đo bằng ' +
             '<code>date +%S.%3N</code> ở cuối đường ống. Nguồn phát chạy đúng 3 giây.' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '--- 1) uniq -c, buffering mặc định\n' +
                '   arrive t=59.356996021  1 level1\n' +
                '   arrive t=59.360597470  1 level2\n' +
                '   arrive t=59.364019604  1 level0\n' +
                '   … (cả 10 dòng trong vòng 31 mili-giây)' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '--- 2) stdbuf -oL uniq -c\n' +
                '   arrive t=02.449703934  1 level1\n' +
                '   arrive t=02.455202255  1 level2\n' +
                '   … (vẫn cả 10 dòng trong 35 mili-giây)' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '--- 3) sort | uniq -c\n' +
                '   arrive t=05.547077299  3 level0\n' +
                '   arrive t=05.552251826  4 level1\n' +
                '   arrive t=05.556098017  3 level2' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: "--- 4) awk '{c[$0]++; print c[$0], $0}'  (mặc định)\n" +
                '   arrive t=11.679555705  1 level1\n' +
                '   … (cả 10 dòng trong 34 mili-giây)' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: "--- 5) awk '{c[$0]++; print c[$0], $0; fflush()}'\n" +
                '   arrive t=11.721089857  1 level1\n' +
                '   arrive t=12.244395260  1 level2\n' +
                '   arrive t=12.329108476  1 level0\n' +
                '   arrive t=12.635566630  2 level1\n' +
                '   arrive t=12.941256929  2 level2' },
        { t: 'cal', kind: 'info',
          x: 'Và phép thử dứt khoát nhất — cho ăn một dòng <b>vô tận</b> rồi đợi 3 giây:' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "timeout 3 bash -c 'yes level1 | sort | head -1'; echo \"rc=$?\"\ntimeout 3 bash -c 'yes level1 | awk \"{ c[\\$0]++; print c[\\$0]; fflush() }\" | head -1'; echo \"rc=$?\"" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'rc=124\n' +
                '1\n' +
                'rc=0' }
      ],
      hint: 'Hai trong ba đường ống trễ vì <i>cùng</i> một lý do, và một đường ống trễ vì ' +
            'một lý do hoàn toàn khác. Cái nào sửa được bằng một cờ, cái nào không?',
      crit: [
        'Nhận ra <b>hai nguyên nhân trễ khác nhau</b>: một là <b>bộ đệm đầu ra</b>, một là <b>thuật toán</b>',
        'Giải thích trễ do bộ đệm: chương trình ghi ra <b>pipe</b> (không phải terminal) thì gom đầy khối rồi mới đẩy đi — dữ liệu <i>đã</i> được xử lý xong, chỉ là chưa ra khỏi bộ đệm',
        'Giải thích trễ do thuật toán ở <code>sort</code>: nó <b>không thể</b> in dòng đầu ra trước khi đọc xong dòng cuối, vì dòng cuối có thể chính là dòng phải in đầu — với dòng vô tận thì nó không bao giờ in gì',
        'Đọc được phép thử <code>yes</code>: <code>sort</code> cho <code>rc=124</code> (timeout, không in gì) còn awk in ngay — đây là bằng chứng phân biệt hai nguyên nhân',
        'Nhận ra <code>stdbuf -oL</code> <b>không</b> chữa được <code>uniq</code> trên máy này, và giải thích được: <code>stdbuf</code> chỉ tác động lên chương trình dùng stdio của glibc, còn <code>uniq</code> ở đây là uutils viết bằng Rust, tự quản bộ đệm riêng',
        'Chỉ ra <code>fflush()</code> chữa được awk: cùng một chương trình, thêm một lời gọi, độ trễ từ 3 giây xuống gần 0',
        'Kết luận đúng: chọn <code>awk</code> có <code>fflush()</code> và <b>không</b> có khối <code>END</code>; hai cách kia đều không dùng được cho dòng vô tận'
      ],
      sol: '<p><b>Có hai nguyên nhân trễ, và chúng khác nhau về bản chất.</b> Đây là toàn bộ ' +
           'nội dung của câu hỏi này, vì trên màn hình chúng trông y hệt nhau: bạn gõ lệnh, ' +
           'chờ, không thấy gì.</p>' +
           '<p><b>Nguyên nhân thứ nhất: bộ đệm đầu ra.</b> Khi một chương trình ghi ra ' +
           '<b>terminal</b>, thư viện C của nó đẩy đi theo từng dòng. Khi nó ghi vào một ' +
           '<b>đường ống</b>, thư viện chuyển sang gom đầy một khối (thường 4 KB) rồi mới ' +
           'đẩy — vì như thế hiệu quả hơn nhiều. Cùng một chương trình, cùng một câu lệnh, ' +
           'chỉ khác chỗ đầu ra đi tới. Với 10 dòng ngắn thì không bao giờ đầy khối, nên ' +
           'tất cả nằm im trong bộ đệm cho tới lúc chương trình thoát và đẩy nốt. Đó chính ' +
           'là hình ảnh "cả 10 dòng ập ra trong 31 mili-giây" ở phép đo 1 và 4. Chú ý điểm ' +
           'quan trọng: dữ liệu <b>đã được xử lý xong từ lâu</b>. Chỉ là nó chưa ra khỏi ' +
           'bộ đệm.</p>' +
           '<p><b>Nguyên nhân thứ hai: thuật toán.</b> <code>sort</code> không thể in dòng ' +
           'đầu tiên trước khi đọc xong dòng <b>cuối cùng</b> — vì dòng cuối cùng hoàn toàn ' +
           'có thể là dòng phải xếp đầu. Đây không phải chuyện cài đặt hay tối ưu; nó là ' +
           'định nghĩa của việc sắp xếp. Không cờ nào chữa được. Phép đo 3 cho ba dòng kết ' +
           'quả, tất cả sau khi nguồn đã dừng, và <code>stdbuf -oL sort</code> cũng không ' +
           'đổi được gì.</p>' +
           '<p><b>Phép thử tách bạch hai nguyên nhân</b> là dòng vô tận. ' +
           '<code>yes | sort | head -1</code> đợi 3 giây rồi bị <code>timeout</code> giết, ' +
           '<code>rc=124</code>, <b>không in một ký tự nào</b> — với đầu vào không bao giờ ' +
           'hết, sort không bao giờ trả lời. Trong khi ' +
           '<code>yes | awk \'{c[$0]++; print c[$0]; fflush()}\' | head -1</code> in ngay ' +
           'số 1 và thoát sạch, <code>rc=0</code>. Nếu chỉ là chuyện bộ đệm thì cả hai đã ' +
           'phải im như nhau; sự khác biệt này chứng minh có một rào cản thuộc loại ' +
           'khác.</p>' +
           '<p><b>Chỗ bất ngờ: <code>stdbuf -oL</code> không cứu được <code>uniq</code>.</b> ' +
           'Đây là điều tôi đã đoán sai trước khi đo. <code>stdbuf</code> hoạt động bằng ' +
           'cách chèn một thư viện đổi chế độ đệm của <b>stdio trong glibc</b> — nên nó chỉ ' +
           'có tác dụng với chương trình dùng stdio của glibc. Máy này dùng ' +
           '<b>uutils coreutils</b>, tức là <code>uniq</code> và <code>sort</code> được ' +
           'viết bằng <b>Rust</b> và tự quản bộ đệm riêng, hoàn toàn không đi qua stdio. ' +
           'Với chúng, <code>stdbuf</code> là một lệnh rỗng — chạy không lỗi, không tác ' +
           'dụng. Trên một hệ dùng GNU coreutils thì phép đo 2 sẽ ra khác. Bài học: ' +
           '<code>stdbuf</code> là một mẹo <i>có điều kiện</i>, không phải một cái công ' +
           'tắc.</p>' +
           '<p><b>Còn <code>fflush()</code> thì cứu được awk</b>, vì nó không phải mẹo từ ' +
           'bên ngoài mà là lệnh <i>bên trong</i> chương trình: gawk tự đẩy bộ đệm của mình ' +
           'sau mỗi dòng. Kết quả đo là nhịp 0,3 giây đều đặn — 11,72 · 12,24 · 12,33 · ' +
           '12,64 · 12,94 — đúng nhịp của nguồn phát. Cùng một chương trình, khác mỗi một ' +
           'lời gọi hàm.</p>' +
           '<p><b>Kết luận cho tình huống của bạn:</b></p>' +
           '<p><code>cat /dev/ttyUSB0 | awk \'{c[$NF]++; print c[$NF], $NF; fflush()}\'</code></p>' +
           '<p>Ba điều kiện phải đồng thời đúng, và thiếu một là hỏng: <b>(1)</b> thuật ' +
           'toán phải trả lời được từng phần — mảng awk đếm dần, không cần thấy hết; ' +
           '<b>(2)</b> phải có <code>fflush()</code>, không thì kết quả kẹt trong bộ đệm; ' +
           '<b>(3)</b> <b>không</b> được đặt phần in vào khối <code>END</code>, vì ' +
           '<code>END</code> chỉ chạy khi đầu vào kết thúc — mà đầu vào của bạn thì không ' +
           'bao giờ kết thúc. Ba điều kiện ấy đúng ra là một câu hỏi duy nhất, hỏi cho mọi ' +
           'công cụ xử lý dòng dữ liệu: <i>nó có cần thấy hết dữ liệu mới trả lời được ' +
           'không?</i> <code>sort</code> thì có. <code>uniq</code> thì không, nhưng nó vẫn ' +
           'phải đợi hết một <i>cụm</i> — và với <code>yes</code> thì cụm ấy cũng vô tận, ' +
           'nên nó cũng câm luôn. Mảng awk thì không cần gì cả.</p>' },

    { id: 'c5', k: 'free', tag: 'Tính toán và biện minh', rows: 9,
      q: 'Trưởng nhóm hỏi: <i>"Trong thư mục header của nhân, chữ <code>ioctl</code> xuất ' +
         'hiện bao nhiêu lần?"</i> Bạn chạy ba lệnh và nhận về ba con số khác nhau. ' +
         '<b>(a)</b> Nói rõ mỗi con số trả lời câu hỏi nào. <b>(b)</b> Tính chênh lệch giữa ' +
         'số dòng và số lần, rồi chứng minh chênh lệch ấy có thật bằng một lệnh nữa. ' +
         '<b>(c)</b> Con số nào bạn sẽ đưa lại cho trưởng nhóm, và bạn sẽ hỏi lại điều gì ' +
         'trước khi đưa?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "grep -rl --include='*.h' 'ioctl' /usr/include/linux | wc -l\ngrep -rh --include='*.h' 'ioctl' /usr/include/linux | wc -l\ngrep -roh --include='*.h' 'ioctl' /usr/include/linux | wc -l" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '182\n1218\n1243' },
        { t: 'cal', kind: 'warn',
          x: 'Ba con số này <b>sẽ khác trên máy bạn</b>, và chúng đã khác so với chính ' +
             'Bài 11 — ngày 11/08 một đợt nâng cấp gói đã thêm 291 file header vào ' +
             '<code>/usr/include</code>. Thứ bạn phải giải thích là <b>quan hệ</b> giữa ba ' +
             'con số, không phải giá trị của chúng.' }
      ],
      hint: 'Ba con số xếp tăng dần: 182 &lt; 1218 &lt; 1243. Mỗi bước nhảy có một nguyên ' +
            'nhân riêng — gọi tên từng cái.',
      crit: [
        '<b>(a)</b> <code>-l</code> → <b>182</b> = số <b>file</b> có ít nhất một chỗ khớp (mỗi file đếm một lần dù khớp bao nhiêu)',
        '<b>(a)</b> <code>-h</code> → <b>1218</b> = số <b>dòng</b> có ít nhất một chỗ khớp (mỗi dòng đếm một lần dù khớp bao nhiêu)',
        '<b>(a)</b> <code>-oh</code> → <b>1243</b> = số <b>lần</b> xuất hiện; <code>-o</code> in mỗi chỗ khớp thành một dòng riêng',
        'Giải thích được vì sao ba con số phải xếp theo thứ tự <b>file ≤ dòng ≤ lần</b> — quan hệ này đúng trên mọi máy, kể cả khi giá trị đổi',
        '<b>(b)</b> Tính đúng chênh lệch: 1243 − 1218 = <b>25</b> lần khớp thừa ra so với số dòng',
        '<b>(b)</b> Chứng minh bằng lệnh đếm số dòng có <b>từ hai chỗ khớp trở lên</b>: <code>grep -rh … | grep -c \'ioctl.*ioctl\'</code> ra đúng <b>25</b>',
        '<b>(c)</b> Chọn con số kèm điều kiện, và nêu được câu hỏi làm rõ: trưởng nhóm cần "bao nhiêu chỗ trong mã phải sửa" (→ 1243), "bao nhiêu dòng phải xem" (→ 1218), hay "bao nhiêu file phải mở" (→ 182)?',
        'Nhận ra <code>-c</code> <b>không</b> phải lựa chọn thứ tư ở đây: <code>grep -rc</code> in ra một dòng cho <i>mỗi</i> file, phải cộng lại mới ra 1218'
      ],
      sol: '<p><b>(a) Ba con số, ba câu hỏi.</b></p>' +
           '<p><b>182</b> (<code>-l</code>) — số <b>file</b> có ít nhất một chỗ khớp. Cờ ' +
           '<code>-l</code> in tên file rồi <i>bỏ qua phần còn lại của file ấy</i>: một file ' +
           'có 40 chỗ khớp vẫn chỉ đóng góp một dòng.</p>' +
           '<p><b>1218</b> (<code>-h</code>) — số <b>dòng</b> có ít nhất một chỗ khớp. ' +
           'grep in nguyên dòng khớp (<code>-h</code> chỉ bỏ phần tiền tố tên file), và một ' +
           'dòng chứa <code>ioctl</code> ba lần vẫn được in <b>một</b> lần. Con số này ' +
           'giống hệt tổng của <code>grep -rc</code> cộng lại — đã kiểm.</p>' +
           '<p><b>1243</b> (<code>-oh</code>) — số <b>lần</b> xuất hiện. Cờ <code>-o</code> ' +
           'đổi hẳn đơn vị đầu ra: thay vì in dòng, nó in <i>từng chỗ khớp</i> thành một ' +
           'dòng riêng. Bây giờ <code>wc -l</code> mới thật sự đếm số lần.</p>' +
           '<p><b>Quan hệ giữa ba con số là thứ bất biến</b>, và nó luôn đúng theo chiều ' +
           'này: <b>số file ≤ số dòng ≤ số lần</b>. Mỗi bước nhảy có một nguyên nhân riêng — ' +
           'từ 182 lên 1218 là vì một file có nhiều dòng khớp; từ 1218 lên 1243 là vì một ' +
           'dòng có nhiều chỗ khớp. Giá trị cụ thể sẽ khác trên máy bạn (bản thân máy này ' +
           'đã trôi so với lúc viết Bài 11, do một đợt cài gói ngày 11/08 thêm 291 file ' +
           'header), nhưng <i>thứ tự</i> ba con số thì không bao giờ đảo.</p>' +
           '<p><b>(b) Chênh lệch: 1243 − 1218 = 25.</b> Nếu cách đọc trên đúng thì phải có ' +
           'đúng 25 lần khớp "thừa ra", và chúng phải nằm trên những dòng có từ hai chỗ ' +
           'khớp trở lên. Kiểm bằng một lệnh:</p>' +
           '<p><code>grep -rh --include=\'*.h\' \'ioctl\' /usr/include/linux | grep -c ' +
           '\'ioctl.*ioctl\'</code> → <b>25</b></p>' +
           '<p>Khớp chính xác. Và một dòng mẫu trong số đó: ' +
           '<code>/* The following ioctls are identical to the ioctls in videodev2.h */</code> ' +
           '— hai chữ <code>ioctls</code> trên cùng một dòng. Con số 25 nói rằng có 25 dòng ' +
           'kiểu như thế; nếu có dòng nào chứa <i>ba</i> lần thì phép kiểm này sẽ hơi lệch, ' +
           'nhưng ở đây nó khớp tuyệt đối nên mọi dòng "khớp nhiều" đều khớp đúng hai ' +
           'lần.</p>' +
           '<p><b>(c) Câu trả lời đúng là một câu hỏi ngược lại.</b> Không con số nào trong ' +
           'ba con số này sai; chúng trả lời ba câu hỏi khác nhau, và câu của trưởng nhóm ' +
           '(<i>"xuất hiện bao nhiêu lần"</i>) chỉ tình cờ nghe giống một trong ba. Nên hãy ' +
           'hỏi lại <b>anh ấy định dùng con số này để làm gì</b>:</p>' +
           '<ul>' +
           '<li>Ước lượng công sức sửa mã, kiểu tìm-và-thay → <b>1243</b>, số chỗ phải ' +
           'chạm tay vào.</li>' +
           '<li>Ước lượng công sức <i>đọc</i> để rà soát → <b>1218</b>, số dòng phải ' +
           'xem.</li>' +
           '<li>Chia việc cho nhiều người, hoặc lập danh sách file cần review → <b>182</b>, ' +
           'số file phải mở.</li>' +
           '</ul>' +
           '<p><b>Còn <code>-c</code> thì sao?</b> Nó <i>không</i> phải phương án thứ tư. ' +
           '<code>grep -rc</code> in ra <b>một dòng cho mỗi file</b> dạng ' +
           '<code>đường/dẫn:số</code> — kể cả những file có số 0 — nên bản thân nó chưa trả ' +
           'lời gì; phải cộng lại (<code>awk -F: \'{s += $2} END {print s}\'</code>) mới ra ' +
           '1218, tức là đúng bằng con số <code>-h | wc -l</code> đã cho. Và ngay cả khi ' +
           'cộng xong, <code>-c</code> vẫn đếm <b>dòng</b>, không đếm <b>lần</b> — đúng như ' +
           'A8 đã chỉ ra trên ví dụ hai dòng: <code>grep -c a</code> ra 2 còn ' +
           '<code>grep -o a | wc -l</code> ra 5.</p>' },
  ],

  /* ═══ D · Ôn xen kẽ — 3 câu về bài cũ ═══════════════════════════════════ */
  D: [
    { id: 'd1', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 6.</b> Đây là số đo thật trong một thư mục có ba file ' +
         '<code>.c</code>. Vì sao lệnh thứ nhất hỏng còn lệnh thứ hai chạy được?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'ls\nfind . -name *.c' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'gpio.c  main.c  uart.c\n' +
                "find: paths must precede expression: 'main.c'\n" +
                "find: possible unquoted pattern after predicate '-name'?" },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "find . -name '*.c'" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: './gpio.c\n./main.c\n./uart.c' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'echo find . -name *.c' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'find . -name gpio.c main.c uart.c' }
      ],
      opts: [
        '<code>find</code> chỉ hiểu dấu <code>*</code> khi nó nằm trong dấu nháy; ngoài nháy thì <code>find</code> coi nó là ký tự thường và báo lỗi cú pháp.',
        '<b>Shell bung <code>*.c</code> trước</b>, nên <code>find</code> không bao giờ thấy dấu sao — nó nhận ba tên file rời và hiểu <code>main.c</code>, <code>uart.c</code> là hai đường dẫn đặt sai chỗ. Dấu nháy chặn shell lại, để chính <code>find</code> nhận chuỗi <code>*.c</code>.',
        'Lệnh đầu thiếu <code>-type f</code>, nên <code>find</code> không biết phải so tên với file hay với thư mục.',
        'Thứ tự tham số của <code>find</code> bắt buộc phải là <code>find -name … .</code>; đường dẫn phải đứng sau biểu thức.'
      ],
      a: 1,
      why: 'Lệnh <code>echo</code> ở cuối là bằng chứng, và nó là mẹo chẩn đoán rẻ nhất khi ' +
           'nghi ngờ shell: <code>find . -name *.c</code> tới tay ' +
           '<code>find</code> dưới dạng <code>find . -name gpio.c main.c uart.c</code>. Dấu ' +
           'sao đã <b>biến mất từ trước khi <code>find</code> khởi động</b> — Bài 6 gọi đây ' +
           'là "ai thật sự mở rộng dấu sao", và câu trả lời luôn là shell. ' +
           '<code>find</code> đọc <code>-name gpio.c</code> là một vị từ hợp lệ, rồi gặp ' +
           '<code>main.c</code> ở chỗ nó không chờ đợi gì nữa nên kêu ' +
           '<i>paths must precede expression</i>. Dấu nháy đơn không phải nghi thức: nó là ' +
           'cách nói với shell "để nguyên chuỗi này, đừng đụng vào", để chính ' +
           '<code>find</code> nhận được mẫu và tự so trong lúc duyệt cây.<br><br>' +
           '<b>Chỗ nguy hiểm thật sự</b>: nếu thư mục có <i>đúng một</i> file ' +
           '<code>.c</code>, shell bung ra thành <code>-name main.c</code> — một lệnh hoàn ' +
           'toàn hợp lệ, thoát mã 0, không cảnh báo. Đã kiểm chứng. Lệnh chạy êm, nhưng nó ' +
           'chỉ tìm <code>main.c</code>. Script viết kiểu này sống sót qua mọi bài test ' +
           'trên thư mục nhỏ rồi hỏng lặng lẽ khi cây mã lớn lên. Cùng một mẫu lỗi với C3: ' +
           'thứ giết bạn không phải lệnh báo lỗi, mà lệnh không báo gì.' },

    { id: 'd2', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 10.</b> Một kỹ sư muốn đổi baud rate trong <code>cfg.txt</code> và gõ dòng ' +
         'dưới đây. Đây là số đo thật sau khi chạy.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "cat cfg.txt\nsed 's/9600/115200/' cfg.txt > cfg.txt\necho \"rc=$?\"\nwc -c cfg.txt" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'baud = 9600\n' +
                'rc=0\n' +
                '0 cfg.txt' },
        { t: 'cal', kind: 'warn',
          x: 'Không có một dòng cảnh báo nào. <code>sed</code> thoát với mã <b>0</b>.' }
      ],
      opts: [
        '<code>sed</code> tìm không thấy <code>9600</code> nên nó xoá sạch file — đây là hành vi mặc định khi mẫu không khớp.',
        '<b>Shell mở và cắt cụt <code>cfg.txt</code> về 0 byte <i>trước khi</i> <code>sed</code> chạy.</b> Khi <code>sed</code> mở file để đọc thì nó đã rỗng, nên <code>sed</code> đọc 0 dòng, in 0 dòng, và báo thành công.',
        '<code>sed</code> đọc và ghi cùng lúc nên hai bên giẫm lên nhau; kết quả tuỳ thuộc lệnh nào nhanh hơn.',
        'Lỗi ở chỗ thiếu <code>-i</code>; có <code>-i</code> thì <code>&gt;</code> sẽ hoạt động bình thường.'
      ],
      a: 1,
      why: 'Bài 10 dạy rằng shell dựng xong <b>toàn bộ</b> đường dẫn vào/ra <i>trước</i> khi ' +
           'nạp chương trình. Dựng đầu ra <code>&gt; cfg.txt</code> nghĩa là mở file với cờ ' +
           '<code>O_TRUNC</code> — cắt nó về 0 byte ngay lúc đó. Chỉ sau khi việc ấy xong ' +
           'thì <code>sed</code> mới được khởi động, và file nó mở ra để đọc là một file ' +
           'rỗng. Nó đọc 0 dòng, biến đổi 0 dòng, in 0 dòng, thoát mã 0. Mọi bước đều "đúng"; ' +
           'dữ liệu thì mất hẳn.<br><br>' +
           '<b>Điều đáng chú ý</b>: <code>grep</code> có phát hiện chuyện này và báo ' +
           '<i>input file is also the output</i>. <code>sed</code> thì <b>không</b> — đã ' +
           'kiểm chứng ở trên, im lặng tuyệt đối. Đừng trông cậy vào một lời cảnh báo mà ' +
           'chỉ vài công cụ mới có.<br><br>' +
           'Và đây chính là <b>lý do <code>-i</code> tồn tại</b>. Nó không phải đường tắt gõ ' +
           'cho nhanh; nó là cách duy nhất đúng để làm việc này, vì nó ghi ra file tạm rồi ' +
           'mới <code>rename()</code> — nên bản gốc còn nguyên cho tới khi bản mới hoàn ' +
           'chỉnh. Trục 2 của bộ này (B2, C2) mổ xẻ cái giá phải trả cho cơ chế ấy: inode ' +
           'đổi, hard link tách đôi, symlink bị thay. Hai chuyện tưởng đối lập mà thật ra là ' +
           'một: <code>&gt;</code> phá file vì nó chạm vào file thật quá sớm, còn ' +
           '<code>-i</code> an toàn vì nó không bao giờ chạm vào file thật — nó chỉ thay ' +
           'cái tên.<br><br>' +
           'Hai cách viết đúng, cả hai đều đã kiểm: ' +
           '<code>sed -i \'s/9600/115200/\' cfg.txt</code>, hoặc ' +
           '<code>sed \'s/9600/115200/\' cfg.txt &gt; tmp &amp;&amp; mv tmp cfg.txt</code>.' },

    { id: 'd3', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 8.</b> Sau một lần giải nén trên máy Windows rồi chép sang, cây mã nguồn ' +
         'trông như dưới đây. Lệnh <code>find</code> nào <b>tìm ra</b> file bất thường, và ' +
         'nó bất thường ở chỗ nào?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'ls -l proj' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '-rw-r--r-- 1 shinarus shinarus 20 Aug 15 17:02 gpio.c\n' +
                '-rw-r--r-- 1 shinarus shinarus 18 Aug 15 17:02 gpio.h\n' +
                '-rwxr-xr-x 1 shinarus shinarus 20 Aug 15 17:02 main.c\n' +
                '-rw-r--r-- 1 shinarus shinarus 20 Aug 15 17:02 uart.c' }
      ],
      opts: [
        '<code>find proj -type f -perm 644</code> — nó liệt kê ba file bình thường, và file thiếu trong danh sách chính là file lỗi.',
        '<code>find proj -type f -perm -u+x</code> → <code>proj/main.c</code>. File mã nguồn <code>main.c</code> mang <b>bit thực thi</b> (755 thay vì 644) — một file <code>.c</code> không bao giờ cần được chạy, nó chỉ để trình biên dịch đọc.',
        '<code>find proj -type f -size +19c</code> — <code>main.c</code> là file duy nhất có kích thước bất thường.',
        '<code>find proj -type x</code> — <code>-type x</code> lọc riêng các file có bit thực thi.'
      ],
      a: 1,
      why: 'Bài 8 dạy rằng <code>r w x</code> mang nghĩa khác nhau tuỳ loại đối tượng, và ' +
           'với một file mã nguồn thì bit <code>x</code> đơn giản là <b>vô nghĩa</b>: ' +
           '<code>main.c</code> không phải chương trình, nó là văn bản để ' +
           '<code>gcc</code> đọc. Bit <code>x</code> ở đây là rác — thường do đi qua một hệ ' +
           'file không có khái niệm quyền Unix (NTFS, FAT, hoặc một file zip tạo trên ' +
           'Windows) rồi được gán quyền mặc định lúc chép sang.<br><br>' +
           'Về cú pháp <code>find</code>: <code>-perm -u+x</code> có dấu trừ đứng trước, ' +
           'nghĩa là "<b>có ít nhất</b> bit này, các bit khác không quan tâm" — đúng thứ bạn ' +
           'cần khi đi săn một bit lạc. Còn <code>-perm 644</code> (không dấu) đòi ' +
           '<b>khớp chính xác cả chín bit</b>, nên nó trả lời một câu hỏi khác. Không có ' +
           '<code>-type x</code>: <code>-type</code> phân biệt <i>loại</i> đối tượng ' +
           '(<code>f</code> file thường, <code>d</code> thư mục, <code>l</code> symlink), ' +
           'không liên quan gì tới quyền.<br><br>' +
           '<b>Vì sao đáng quan tâm trong nghề nhúng</b>: cây mã này rồi sẽ được đóng vào ' +
           'rootfs. Quyền của file trong rootfs chính là quyền trên thiết bị xuất xưởng, và ' +
           'một bit <code>x</code> lạc trên file cấu hình hay file dữ liệu là thứ mà bản ' +
           'kiểm định bảo mật sẽ hỏi. Cách dọn — dùng lại đúng <code>-exec</code> của Bài 11 ' +
           'và đã kiểm chứng: ' +
           '<code>find proj -name \'*.c\' -exec chmod 644 {} +</code>.' },
  ],

  /* ═══ E · Thực hành — 2 dự đoán + 2 gõ lệnh + 1 sửa lỗi + 1 thử thách ═══ */
  E: [
    { id: 'e1', k: 'free', tag: 'Dự đoán output', rows: 9,
      q: 'Bảy dòng lệnh. <b>Trước khi chạy</b>, viết ra kết quả bạn dự đoán cho từng dòng — ' +
         'kể cả mã thoát ở dòng 5 và 6. Rồi chạy thật và đối chiếu. Chỗ nào đoán sai, ghi ' +
         'lại <i>vì sao</i> bạn đoán như thế; đó mới là phần có giá trị.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "1)  printf 'b\\na\\nb\\na\\n' | uniq | wc -l\n" +
                "2)  printf 'b\\na\\nb\\na\\n' | sort -u | wc -l\n" +
                "3)  printf '10\\n9\\n100\\n' | sort\n" +
                "4)  printf '10\\n9\\n100\\n' | sort -n\n" +
                "5)  grep -c 'uart|i2c' device.log ; echo \"rc=$?\"\n" +
                "6)  grep -cE 'uart|i2c' device.log ; echo \"rc=$?\"\n" +
                "7)  printf 'aaa\\nbaa\\n' > x.txt ; grep -c a x.txt ; grep -o a x.txt | wc -l" },
        { t: 'cal', kind: 'info',
          x: '<code>device.log</code> là file 8 dòng ở đầu bộ này. Bốn dòng đầu không cần ' +
             'file nào cả — chạy được ngay.' }
      ],
      hint: 'Dòng 1 và 2 khác nhau ở một chữ. Dòng 5 và 6 khác nhau ở một chữ. Dòng 7 hỏi ' +
            'hai câu hỏi khác nhau về cùng một file. Mỗi cặp là một trục của bộ này thu nhỏ ' +
            'lại thành một ký tự.',
      crit: [
        '1) <b>4</b> — <code>uniq</code> không bỏ gì cả, vì <code>b a b a</code> không có hai dòng giống nhau <i>đứng cạnh nhau</i>',
        '2) <b>2</b> — <code>sort -u</code> sắp trước rồi mới lọc, nên nó thấy được hai cặp trùng',
        '3) <code>10</code> / <code>100</code> / <code>9</code> — thứ tự <b>chuỗi</b>: so ký tự đầu, <code>1</code> đứng trước <code>9</code>',
        '4) <code>9</code> / <code>10</code> / <code>100</code> — <code>-n</code> mới so theo giá trị số',
        '5) <b>0</b> và <b>rc=1</b> — BRE coi <code>|</code> là ký tự thường, mẫu thành chuỗi 8 ký tự <code>uart|i2c</code>, không dòng nào chứa',
        '6) <b>6</b> và <b>rc=0</b> — <code>-E</code> bật ERE, <code>|</code> thành phép chọn',
        '7) <b>2</b> rồi <b>5</b> — <code>-c</code> đếm <i>dòng</i> khớp (cả hai dòng đều khớp), <code>-o</code> in <i>mỗi lần</i> khớp (3 + 2 = 5)'
      ],
      sol: '<p>Kết quả thật, chạy trên máy này:</p>',
      solBlocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '1)  4\n' +
                '2)  2\n' +
                '3)  10\n' +
                '    100\n' +
                '    9\n' +
                '4)  9\n' +
                '    10\n' +
                '    100\n' +
                '5)  0\n' +
                '    rc=1\n' +
                '6)  6\n' +
                '    rc=0\n' +
                '7)  2\n' +
                '    5' },
        { t: 'p',
          x: '<b>Cặp 1–2 là trục 1.</b> <code>uniq</code> không "loại bỏ trùng lặp"; nó chỉ ' +
             'so mỗi dòng với dòng <b>liền ngay trước</b>. Với <code>b a b a</code> thì ' +
             'không cặp nào cạnh nhau, nên nó không bỏ gì và <code>wc</code> đếm đủ 4. ' +
             '<code>sort -u</code> ra 2 không phải vì nó "thông minh hơn", mà vì nó ' +
             '<b>sắp trước</b> — và sắp xếp chính là thao tác biến "trùng ở đâu đó" thành ' +
             '"trùng ở cạnh nhau". Đó là toàn bộ lý do đường ống ' +
             '<code>sort | uniq -c</code> tồn tại.' },
        { t: 'p',
          x: '<b>Cặp 3–4</b> là cái bẫy tốn nhiều giờ nhất của người mới. ' +
             '<code>sort</code> mặc định so theo <b>chuỗi</b>, không theo số — nó nhìn ký ' +
             'tự đầu tiên, thấy <code>1</code> nhỏ hơn <code>9</code>, thế là xong. Với dữ ' +
             'liệu kích thước file, mã lỗi hay số byte thì đây là lỗi im lặng: kết quả ' +
             '<i>trông như</i> đã được sắp, chỉ là sai. Và đây chính là lý do mọi bảng xếp ' +
             'hạng trong bộ này đều kết bằng <code>sort -rn</code> chứ không phải ' +
             '<code>sort -r</code>.' },
        { t: 'p',
          x: '<b>Cặp 5–6 là trục 3</b>, và nó đúng bằng một chữ cái. Chú ý mã thoát: ' +
             '<code>rc=1</code> ở dòng 5 nghĩa là "không tìm thấy" — hoàn toàn không phân ' +
             'biệt được với "log sạch". Đây chính là cơ chế đã lừa script CI ba tuần ở C3.' },
        { t: 'p',
          x: '<b>Dòng 7</b> là hai câu hỏi khác nhau trên cùng một file: "bao nhiêu ' +
             '<i>dòng</i> có chữ a" (2) và "chữ a xuất hiện bao nhiêu <i>lần</i>" (5). ' +
             '<code>-o</code> đổi <b>đơn vị</b> đầu ra từ dòng sang lần khớp. C5 hỏi lại ' +
             'đúng chuyện này ở quy mô 1218 với 1243.' }
      ] },

    { id: 'e2', k: 'free', tag: 'Dự đoán output', rows: 9,
      q: 'Bảy dòng nữa, lần này là <code>sed</code> và <code>awk</code> trên ' +
         '<code>device.log</code>. Dự đoán trước rồi chạy. Dòng 7 chạy <b>bên trong một ' +
         'file script</b> (không phải gõ thẳng vào terminal) — và nó là cái bẫy đắt nhất ' +
         'trong bài này.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "1)  echo 'a-b-c-d' | sed 's/-/+/'\n" +
                "2)  echo 'a-b-c-d' | sed 's/-/+/g'\n" +
                "3)  awk '{print NF}' device.log\n" +
                "4)  awk '{print $9}' device.log\n" +
                "5)  awk '{print $NF}' device.log\n" +
                "6)  awk '{s += $NF} END {print s, NR}' device.log" },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '# 7) đặt hai dòng này vào một file .sh rồi chạy file đó\n' +
                'awk "{print $3}" log.txt\n' +
                'echo awk "{print $3}" log.txt' },
        { t: 'cal', kind: 'info',
          x: '<code>log.txt</code> ở dòng 7 chỉ có hai dòng đầu của ' +
             '<code>device.log</code>. Dấu nháy là <b>nháy kép</b>, không phải nháy đơn — ' +
             'đó là toàn bộ vấn đề.' }
      ],
      hint: 'Dòng 3 sẽ cho bạn biết vì sao dòng 4 và dòng 5 khác nhau. Còn dòng 7: hỏi ' +
            '<i>ai</i> đọc <code>$3</code> trước — bash hay awk?',
      crit: [
        '1) <code>a+b-c-d</code> — không có cờ <code>g</code>, <code>sed</code> thay <b>lần khớp đầu tiên trên mỗi dòng</b>, rồi đi tiếp',
        '2) <code>a+b+c+d</code> — cờ <code>g</code> thay mọi lần khớp trên dòng',
        '3) <code>9 9 10 8 10 9 9 9</code> — số cột <b>không đều</b>, vì awk cắt theo khoảng trắng và các dòng có số từ khác nhau',
        '4) <code>115200</code>, <code>32</code>, <code>device</code>, <b>một dòng trống</b>, <code>high</code>, <code>487</code>, <code>64</code>, <code>12</code> — cột 9 chỉ tình cờ là số ở vài dòng, và dòng 8 cột không tồn tại nên in ra rỗng',
        '5) <code>115200 32 0 250 1 487 64 12</code> — <code>$NF</code> là cột <b>cuối</b>, luôn đúng bất kể dòng dài ngắn',
        '6) <code>116046 8</code> — tổng cột cuối và số dòng',
        '7) In ra <b>nguyên hai dòng của file</b>, không phải cột 3. Vì bash bung <code>$3</code> <b>trước</b>, và trong script không có tham số vị trí nào nên <code>$3</code> rỗng: chương trình awk trở thành <code>{print }</code>, mà <code>print</code> không tham số nghĩa là in cả <code>$0</code>'
      ],
      sol: '<p>Kết quả thật:</p>',
      solBlocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '1)  a+b-c-d\n' +
                '2)  a+b+c+d\n' +
                '3)  9 9 10 8 10 9 9 9\n' +
                '4)  115200|32|device||high|487|64|12|      (dấu | là chỗ xuống dòng)\n' +
                '5)  115200 32 0 250 1 487 64 12\n' +
                '6)  116046 8' },
        { t: 'p',
          x: '<b>Dòng 3 là chìa khoá của dòng 4 và 5.</b> In <code>NF</code> ra cho thấy ' +
             'tám dòng log có <b>8, 9 hoặc 10 cột</b> — vì phần mô tả ở cuối mỗi dòng dài ' +
             'ngắn khác nhau. Khi ấy <code>$9</code> trỏ vào những thứ chẳng liên quan gì ' +
             'tới nhau: khi thì con số, khi thì chữ <code>device</code>, khi thì ' +
             '<b>không có gì</b> (dòng 8 cột). Còn <code>$NF</code> thì luôn là cột cuối, ' +
             'nên nó lấy đúng con số ở mọi dòng. Khi cần cột cuối, dùng <code>$NF</code> — ' +
             'đếm tay ra số 9 là một lỗi chờ sẵn. Và khi nghi ngờ, ' +
             '<code>awk \'{print NF}\'</code> là câu lệnh chẩn đoán rẻ nhất bạn có.' },
        { t: 'p',
          x: '<b>Dòng 7 — cái bẫy đắt nhất.</b> Đây là số đo thật, chạy từ một file script:' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '--- nháy đơn, cách đúng:\n' +
                'INFO\n' +
                'ERROR\n' +
                '--- nháy kép, chạy từ script không có tham số vị trí:\n' +
                '2026-08-01 10:02:11 INFO  uart  init complete baud rate 115200\n' +
                '2026-08-01 10:02:14 ERROR uart  timeout during read 250\n' +
                '--- bash thật sự đưa cho awk cái gì:\n' +
                'awk {print } log.txt' },
        { t: 'p',
          x: 'Dòng cuối là bằng chứng. Chương trình awk mà bash giao đi là ' +
             '<code>{print }</code> — dấu <code>$3</code> đã bị bash nuốt mất và thay bằng ' +
             'chuỗi rỗng, vì trong script không có tham số vị trí thứ ba. Mà ' +
             '<code>print</code> không tham số trong awk nghĩa là <b>in cả dòng</b>. Không ' +
             'lỗi, không cảnh báo, chỉ là câu trả lời sai.' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '--- và nếu script CÓ tham số vị trí (set -- one two three):\n' +
                '\n' +
                '\n' +
                '--- bash đưa cho awk:\n' +
                'awk {print three} log.txt' },
        { t: 'p',
          x: 'Tệ hơn nữa: khi script <i>có</i> tham số, chương trình awk thành ' +
             '<code>{print three}</code> — <code>three</code> là một <b>biến awk chưa gán</b>, ' +
             'nên nó in ra <b>dòng trống</b>. Ba kết quả hoàn toàn khác nhau từ cùng một ' +
             'dòng mã, tuỳ vào việc script được gọi với tham số gì.' },
        { t: 'cal', kind: 'warn',
          x: '<b>Quy tắc không có ngoại lệ: chương trình awk luôn nằm trong nháy đơn.</b> ' +
             'Nháy đơn nói với bash "để nguyên, đừng đụng vào", nên <code>$3</code> tới tay ' +
             'awk nguyên vẹn. Cần đưa giá trị từ shell vào awk thì dùng <code>-v</code>: ' +
             '<code>awk -v col=3 \'{print $col}\' log.txt</code> — không bao giờ nối chuỗi ' +
             'bằng nháy kép.' }
      ] },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh', rows: 8,
      q: 'Từ <code>device.log</code>, hãy dựng một đường ống trả lời câu hỏi: ' +
         '<b>phân hệ nào sinh ra nhiều dòng <code>ERROR</code> nhất?</b> Kết quả phải là một ' +
         'bảng xếp hạng, nhiều nhất ở trên. Dựng <b>từng tầng một</b> và xem output của mỗi ' +
         'tầng trước khi thêm tầng sau — đừng gõ cả đường ống rồi mới chạy.',
      blocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '2026-08-01 10:02:11 INFO  uart  init complete baud rate 115200\n' +
                '2026-08-01 10:02:12 INFO  gpio  registered 32 pins total 32\n' +
                '2026-08-01 10:02:13 WARN  i2c   could not find any device 0\n' +
                '2026-08-01 10:02:14 ERROR uart  timeout during read 250\n' +
                '2026-08-01 10:02:15 INFO  gpio  pin 17 set to high 1\n' +
                '2026-08-01 10:02:16 ERROR i2c   CRC check failed code 487\n' +
                '2026-08-01 10:02:17 INFO  uart  read 64 bytes ok 64\n' +
                '2026-08-01 10:02:18 ERROR uart  parity error on byte 12' },
        { t: 'cal', kind: 'info',
          x: 'Cột 3 là mức log, cột 4 là phân hệ. Sau khi ra kết quả, hãy thử ' +
             '<b>bỏ một tầng</b> đi và xem nó sai như thế nào.' }
      ],
      hint: 'Ba tầng: lọc lấy dòng ERROR → lấy riêng tên phân hệ → đếm và xếp hạng. Tầng ' +
            'thứ ba <b>không phải</b> là <code>uniq -c</code> đứng một mình.',
      crit: [
        'Dựng theo <b>từng tầng</b> và kiểm output mỗi tầng, không gõ một phát cả đường ống',
        'Tầng lọc đúng: <code>awk \'$3 == "ERROR"\'</code> hoặc <code>grep -w ERROR</code> — cả hai ra 3 dòng',
        'Tầng trích đúng: <code>{print $4}</code> → <code>uart</code>, <code>i2c</code>, <code>uart</code>',
        'Tầng đếm đúng: <code>sort | uniq -c | sort -rn</code> → <code>2 uart</code> / <code>1 i2c</code>',
        'Thử bỏ <code>sort</code> và <b>quan sát được kết quả sai</b>: <code>1 uart / 1 uart / 1 i2c</code>',
        'Giải thích được vì sao sai: hai dòng <code>uart</code> không nằm cạnh nhau trong file',
        'Biết cả cách một-lệnh bằng mảng awk và nói được khi nào nên dùng cách nào'
      ],
      sol: '<p>Dựng từng tầng. <b>Tầng 1</b> — lọc dòng ERROR:</p>',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'grep -w ERROR device.log' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '2026-08-01 10:02:14 ERROR uart  timeout during read 250\n' +
                '2026-08-01 10:02:16 ERROR i2c   CRC check failed code 487\n' +
                '2026-08-01 10:02:18 ERROR uart  parity error on byte 12' },
        { t: 'p',
          x: '<b>Tầng 2</b> — chỉ lấy tên phân hệ. Ở đây tôi chuyển hẳn sang ' +
             '<code>awk</code>, vì nó làm được cả lọc lẫn trích trong một lệnh, và điều kiện ' +
             '<code>$3 == "ERROR"</code> chặt hơn <code>grep</code> nhiều: nó buộc chữ ' +
             'ERROR phải nằm <b>đúng ở cột 3</b>, chứ không phải ở bất kỳ đâu trên dòng.' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'awk \'$3 == "ERROR" {print $4}\' device.log' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'uart\ni2c\nuart' },
        { t: 'p', x: '<b>Tầng 3</b> — đếm và xếp hạng. Đây là câu trả lời:' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'awk \'$3 == "ERROR" {print $4}\' device.log | sort | uniq -c | sort -rn' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '      2 uart\n      1 i2c' },
        { t: 'p',
          x: '<b>Bây giờ bỏ <code>sort</code> đi</b> — đây là phần quan trọng nhất của bài ' +
             'này, và bạn phải tự chạy nó một lần để nhớ được:' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'awk \'$3 == "ERROR" {print $4}\' device.log | uniq -c | sort -rn' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '      1 uart\n      1 uart\n      1 i2c' },
        { t: 'p',
          x: 'Ba dòng, mỗi dòng đếm 1, và <code>uart</code> xuất hiện <b>hai lần</b> trong ' +
             'một bảng đáng lẽ mỗi khoá chỉ có một dòng. Lý do: đầu vào của ' +
             '<code>uniq</code> là <code>uart</code>, <code>i2c</code>, <code>uart</code> — ' +
             'hai chữ <code>uart</code> bị chữ <code>i2c</code> chen vào giữa, nên chúng ' +
             '<b>không liền nhau</b> và <code>uniq</code> không gộp. Cái ' +
             '<code>sort</code> đứng trước không phải để "cho đẹp"; nó là điều kiện ' +
             '<i>bắt buộc</i> để <code>uniq -c</code> đếm đúng. Và chú ý cách nó hỏng: ' +
             'không có lỗi, không có cảnh báo, chỉ có một bảng trông hợp lý mà sai.' },
        { t: 'p',
          x: '<b>Cách một lệnh, không cần sort để đếm:</b>' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'awk \'$3 == "ERROR" {c[$4]++} END {for (k in c) printf "%7d %s\\n", c[k], k}\' device.log | sort -rn' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '      2 uart\n      1 i2c' },
        { t: 'cal', kind: 'info',
          x: 'Mảng awk không cần sắp trước vì nó tra theo <b>khoá</b>, không theo vị trí — ' +
             'đó cũng chính là lý do nó rẻ hơn nhiều về RAM ở C1. Nhưng vẫn cần ' +
             '<code>sort -rn</code> ở <b>cuối</b>: thứ tự mà <code>for (k in c)</code> duyệt ' +
             'qua các khoá là <b>không xác định</b> — đo thật trên máy này, nó in ' +
             '<code>WARN ERROR INFO</code>, không phải thứ tự xuất hiện (INFO trước) cũng ' +
             'không phải thứ tự chữ cái. Đúng như A7 đã nói: đừng bao giờ trông cậy vào thứ ' +
             'tự ấy.' }
      ] },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh', rows: 8,
      q: 'Dựng cây thư mục dưới đây, rồi đổi mọi <code>/dev/ttyS0</code> thành ' +
         '<code>/dev/ttyAMA0</code> trong <b>các file <code>.conf</code></b> — và chỉ trong ' +
         'chúng. Yêu cầu: <b>(1)</b> phải <i>xem trước</i> kết quả rồi mới sửa thật; ' +
         '<b>(2)</b> phải giữ bản sao lưu; <b>(3)</b> <code>README.txt</code> phải nguyên ' +
         'vẹn dù nó cũng có chữ <code>ttyS0</code>.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "mkdir -p board/etc/init.d board/opt\n" +
                "printf 'port = /dev/ttyS0\\nbaud = 9600\\n' > board/etc/uart.conf\n" +
                "printf 'console = /dev/ttyS0\\n'           > board/etc/init.d/rc.conf\n" +
                "printf 'log = /dev/ttyS0\\n'               > board/opt/app.conf\n" +
                "printf 'note: ttyS0 is mentioned here\\n'  > board/etc/README.txt\n" +
                "grep -rn 'ttyS0' board | sort" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'board/etc/README.txt:1:note: ttyS0 is mentioned here\n' +
                'board/etc/init.d/rc.conf:1:console = /dev/ttyS0\n' +
                'board/etc/uart.conf:1:port = /dev/ttyS0\n' +
                'board/opt/app.conf:1:log = /dev/ttyS0' }
      ],
      hint: 'Chuỗi cần thay có dấu <code>/</code> ở trong. Bạn không bắt buộc phải dùng ' +
            '<code>/</code> làm dấu phân cách của lệnh <code>s</code>.',
      crit: [
        'Chạy <b>thử trước</b> bằng <code>sed</code> <i>không</i> có <code>-i</code>, để nó in ra stdout — không sửa gì cả',
        'Đổi dấu phân cách sang <code>|</code> (hoặc <code>#</code>, <code>,</code>): <code>s|/dev/ttyS0|/dev/ttyAMA0|</code> — tránh phải thoát bốn dấu <code>/</code>',
        'Lọc đúng bằng <code>find board -name \'*.conf\'</code>, có <b>nháy đơn</b> quanh mẫu (D1)',
        'Dùng <code>-exec … {} +</code> chứ không phải <code>{} \\;</code> — gom hết file vào một lần gọi <code>sed</code>',
        'Sửa thật bằng <code>sed -i.bak</code> để vừa sửa tại chỗ vừa giữ bản sao lưu',
        'Kiểm sau khi chạy: 3 file <code>.conf</code> đã đổi, 3 file <code>.bak</code> được tạo, <code>README.txt</code> nguyên vẹn',
        'Nhận ra bản chạy thử in ra <b>cả dòng <code>baud = 9600</code> không đổi</b>, và giải thích được vì sao'
      ],
      sol: '<p><b>Bước 1 — chạy thử, không <code>-i</code>.</b> Đây là thói quen đáng giá ' +
           'nhất khi làm việc với <code>sed</code>: bỏ <code>-i</code> ra thì nó là một ' +
           '<b>bộ lọc</b> vô hại, in kết quả ra màn hình và không chạm vào file nào (đúng ' +
           'trục 2 của bộ này).</p>',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "find board -name '*.conf' -exec sed 's|/dev/ttyS0|/dev/ttyAMA0|' {} +" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'log = /dev/ttyAMA0\n' +
                'console = /dev/ttyAMA0\n' +
                'port = /dev/ttyAMA0\n' +
                'baud = 9600' },
        { t: 'p',
          x: 'Bốn dòng ra từ ba file — vì <code>uart.conf</code> có hai dòng, và ' +
             '<code>sed</code> in ra <b>mọi dòng nó đọc</b>, kể cả dòng không khớp. Đó là ' +
             'lý do <code>baud = 9600</code> xuất hiện: nó không bị sửa, nó chỉ đi qua. Nếu ' +
             'bạn tưởng sed chỉ in dòng đã sửa thì bản chạy thử này sẽ làm bạn hoảng — và ' +
             'đó chính là chỗ cần hiểu.' },
        { t: 'p',
          x: '<b>Về dấu phân cách:</b> lệnh <code>s</code> không bắt buộc dùng ' +
             '<code>/</code>. Ký tự ngay sau <code>s</code> là dấu phân cách, ' +
             'nên <code>s|…|…|</code> hoàn toàn hợp lệ. Cách còn lại là ' +
             '<code>s/\\/dev\\/ttyS0/\\/dev\\/ttyAMA0/</code> — cũng chạy, nhưng nhìn ' +
             'vào là biết ai sẽ gõ sai trước.' },
        { t: 'p', x: '<b>Bước 2 — sửa thật, có sao lưu.</b>' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "find board -name '*.conf' -exec sed -i.bak 's|/dev/ttyS0|/dev/ttyAMA0|' {} +\n" +
                'echo "rc=$?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'rc=0' },
        { t: 'p', x: '<b>Bước 3 — kiểm chứng cả ba yêu cầu.</b>' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "grep -rn 'ttyAMA0' board --include='*.conf' | sort\n" +
                "find board -name '*.bak' | sort\n" +
                'cat board/etc/README.txt' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'board/etc/init.d/rc.conf:1:console = /dev/ttyAMA0\n' +
                'board/etc/uart.conf:1:port = /dev/ttyAMA0\n' +
                'board/opt/app.conf:1:log = /dev/ttyAMA0\n' +
                'board/etc/init.d/rc.conf.bak\n' +
                'board/etc/uart.conf.bak\n' +
                'board/opt/app.conf.bak\n' +
                'note: ttyS0 is mentioned here' },
        { t: 'p',
          x: 'Ba file <code>.conf</code> đã đổi, ba bản <code>.bak</code> nằm cạnh, và ' +
             '<code>README.txt</code> vẫn giữ nguyên chữ <code>ttyS0</code> — đúng ba yêu ' +
             'cầu. Việc lọc do <code>find -name \'*.conf\'</code> đảm nhiệm, không phải do ' +
             '<code>sed</code>; <code>sed</code> chỉ sửa những gì được đưa cho nó.' },
        { t: 'cal', kind: 'warn',
          x: '<code>-i.bak</code> <b>không</b> phải phép màu: nó vẫn tạo file mới rồi ' +
             '<code>rename()</code>, nên inode vẫn đổi và mọi cạm bẫy ở B2 và C2 vẫn ' +
             'nguyên. Nếu một trong các file ấy là symlink, bạn vừa thay symlink bằng file ' +
             'thường. Trên cây thư mục thật của rootfs, thêm ' +
             '<code>-type f</code> vào <code>find</code> để symlink không lọt vào danh ' +
             'sách.' }
      ] },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi', rows: 10,
      q: 'Script dưới đây được viết để tóm tắt <code>device.log</code>. Nó chạy, ' +
         '<b>thoát với mã 0</b>, và output trông có vẻ hợp lý. Nó có <b>đúng ba lỗi</b>, ' +
         'trong đó một lỗi <b>phá dữ liệu</b>. Tìm cả ba, giải thích từng cái, sửa lại, và ' +
         'nói rõ lỗi nào nguy hiểm nhất.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '#!/bin/bash\n' +
                'echo "--- lines per log level, ranked:"\n' +
                "awk '{print $3}' device.log | uniq -c | sort -rn\n" +
                'echo "--- lines mentioning uart or i2c:"\n' +
                "grep -c 'uart|i2c' device.log\n" +
                'echo "--- strip the date column, in place:"\n' +
                "sed 's/^[0-9-]* //' device.log > device.log\n" +
                'wc -l device.log' },
        { t: 'p', x: 'Chạy thật, trên <code>device.log</code> 8 dòng:' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '--- lines per log level, ranked:\n' +
                '      2 INFO\n' +
                '      1 WARN\n' +
                '      1 INFO\n' +
                '      1 INFO\n' +
                '      1 ERROR\n' +
                '      1 ERROR\n' +
                '      1 ERROR\n' +
                '--- lines mentioning uart or i2c:\n' +
                '0\n' +
                '--- strip the date column, in place:\n' +
                '0 device.log\n' +
                'rc_script=0' },
        { t: 'cal', kind: 'warn',
          x: 'Sau khi chạy, <code>device.log</code> còn <b>0 byte</b>. Script vẫn thoát mã ' +
             '<b>0</b>.' }
      ],
      hint: 'Ba lỗi rơi đúng vào ba trục của bộ bài tập này. Bảng đầu tiên có <b>bảy</b> ' +
            'dòng cho một file chỉ có <b>ba</b> mức log — đó là manh mối thứ nhất.',
      crit: [
        '<b>Lỗi 1</b> (trục 1): thiếu <code>sort</code> trước <code>uniq -c</code>. Bằng chứng: bảng có 7 dòng cho 3 mức log, và <code>INFO</code> xuất hiện <b>ba lần</b>',
        '<b>Lỗi 2</b> (trục 3): <code>grep -c \'uart|i2c\'</code> dùng cú pháp ERE mà không có <code>-E</code>; BRE hiểu đó là chuỗi 8 ký tự, không dòng nào khớp → <b>0</b>',
        '<b>Lỗi 3</b> (trục 2, phá dữ liệu): <code>sed \'…\' device.log &gt; device.log</code> — shell cắt cụt file về 0 byte <b>trước khi</b> sed đọc',
        'Xác định đúng lỗi 3 là nguy hiểm nhất, với lý do: hai lỗi kia cho <b>câu trả lời sai</b>, lỗi 3 <b>xoá mất dữ liệu gốc</b> và không có cách nào lấy lại',
        'Chỉ ra vì sao cả ba đều im lặng: script thoát mã 0, không một cảnh báo nào — mỗi lệnh riêng lẻ đều "thành công"',
        'Sửa đúng cả ba: thêm <code>sort |</code>, thêm <code>-E</code>, đổi sang <code>sed -i.bak</code>',
        'Chạy bản sửa và đối chiếu: <code>4 INFO / 3 ERROR / 1 WARN</code>, <code>6</code>, <code>8 device.log</code>'
      ],
      sol: '<p><b>Lỗi 1 — thiếu <code>sort</code> (trục 1).</b> Manh mối nằm ngay trong ' +
           'output: bảng có <b>bảy</b> dòng, nhưng file chỉ có <b>ba</b> mức log, và ' +
           '<code>INFO</code> xuất hiện ba lần trong một bảng mà mỗi khoá đáng lẽ chỉ có ' +
           'một dòng. Nguyên nhân: <code>uniq -c</code> chỉ gộp các dòng ' +
           '<b>giống nhau và nằm cạnh nhau</b>. Trong file gốc, các dòng INFO bị WARN và ' +
           'ERROR chen vào giữa. Cái <code>sort -rn</code> ở cuối càng làm lỗi khó thấy: nó ' +
           'sắp xếp một bảng sai thành một bảng sai <i>trông có trật tự</i>.</p>' +
           '<p><b>Lỗi 2 — thiếu <code>-E</code> (trục 3).</b> ' +
           '<code>grep -c \'uart|i2c\'</code> ra <b>0</b>, trong khi mắt thường nhìn vào ' +
           'file thấy ngay cả <code>uart</code> lẫn <code>i2c</code>. Không có ' +
           '<code>-E</code> thì grep dùng BRE, nơi <code>|</code> là ký tự thường; nó đi ' +
           'tìm chuỗi 8 ký tự <code>uart|i2c</code> và tất nhiên không thấy. Số 0 là một ' +
           'câu trả lời hoàn toàn hợp lệ về mặt kỹ thuật cho một câu hỏi bạn không định ' +
           'hỏi — y hệt script CI ở C3.</p>' +
           '<p><b>Lỗi 3 — <code>&gt;</code> lên chính file đầu vào (trục 2).</b> Shell dựng ' +
           'đầu ra trước, mở <code>device.log</code> với <code>O_TRUNC</code> và cắt nó về ' +
           '0 byte. <code>sed</code> khởi động sau đó, mở một file rỗng, đọc 0 dòng, in 0 ' +
           'dòng, thoát mã 0. <code>wc -l</code> báo <code>0 device.log</code>. Toàn bộ dữ ' +
           'liệu đã mất, và không lệnh nào trong script kêu lấy một tiếng.</p>' +
           '<p><b>Lỗi nào nguy hiểm nhất? Lỗi 3, và không phải bàn cãi.</b> Lỗi 1 và 2 cho ' +
           'ra <i>câu trả lời sai</i> — tệ, nhưng chạy lại là có ngay câu trả lời đúng, vì ' +
           'dữ liệu vẫn còn đó. Lỗi 3 <i>xoá mất dữ liệu</i>: chạy lại cũng vô ích, và nếu ' +
           'script này chạy trong một job dọn log ban đêm trên thiết bị đang chạy thật thì ' +
           'log của cả đêm biến mất, kèm theo mọi bằng chứng về lỗi mà bạn đang muốn điều ' +
           'tra.</p>' +
           '<p><b>Điểm chung của cả ba</b> — và đây mới là bài học: <b>mã thoát 0</b>. ' +
           'Mỗi lệnh riêng lẻ đều làm đúng việc của nó, không lệnh nào lỗi, không cảnh báo ' +
           'nào được in. Bản sửa:</p>',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '#!/bin/bash\n' +
                'echo "--- lines per log level, ranked:"\n' +
                "awk '{print $3}' device.log | sort | uniq -c | sort -rn\n" +
                'echo "--- lines mentioning uart or i2c:"\n' +
                "grep -cE 'uart|i2c' device.log\n" +
                'echo "--- strip the date column, in place:"\n' +
                "sed -i.bak 's/^[0-9-]* //' device.log\n" +
                'wc -l device.log\n' +
                'head -2 device.log' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '      4 INFO\n' +
                '      3 ERROR\n' +
                '      1 WARN\n' +
                '--- lines mentioning uart or i2c:\n' +
                '6\n' +
                '--- strip the date column, in place:\n' +
                '8 device.log\n' +
                '10:02:11 INFO  uart  init complete baud rate 115200\n' +
                '10:02:12 INFO  gpio  registered 32 pins total 32' },
        { t: 'p',
          x: 'Ba dòng đúng thay vì bảy, số <code>6</code> thay vì <code>0</code>, và ' +
             '<code>8 device.log</code> thay vì <code>0</code> — cột ngày đã bị cắt và dữ ' +
             'liệu còn nguyên tám dòng. Ba lỗi, ba sửa, mỗi cái đúng một hai ký tự.' },
        { t: 'cal', kind: 'info',
          x: 'Thói quen đáng mang theo: mọi script xử lý log nên bắt đầu bằng ' +
             '<code>set -euo pipefail</code>. Nó không bắt được cả ba lỗi này (cả ba đều ' +
             '"thành công" theo nghĩa của shell), nhưng nó bắt được nhiều lỗi cùng họ — và ' +
             'với nhóm lỗi im lặng còn lại thì cách phòng duy nhất là <b>đối chiếu output ' +
             'với thứ bạn biết chắc</b>: file có 8 dòng thì bảng mức log không thể có 7 ' +
             'hàng.' }
      ] },

    { id: 'e6', k: 'free', tag: 'Thử thách', rows: 12,
      q: 'Tự tay dựng lại <b>đường cong bộ nhớ</b> mà C1 đã đưa cho bạn dưới dạng bảng có ' +
         'sẵn. Sinh dữ liệu tổng hợp, đo RSS của ba cách đếm ở ba cỡ đầu vào, rồi làm thêm ' +
         'phép đo thứ hai: giữ nguyên cỡ file, chỉ đổi <b>số khoá phân biệt</b>. Trả lời ' +
         'ba câu: <b>(a)</b> đường nào phẳng, đường nào dốc, và đại lượng nào điều khiển ' +
         'từng đường? <b>(b)</b> vì sao <code>uniq</code> phẳng mà <code>sort</code> thì ' +
         'không — nêu lý do <i>thuật toán</i>, không phải lý do cài đặt. <b>(c)</b> ' +
         '<code>sort -S 1M</code> làm gì với con số ấy, và cái giá phải trả trên thiết bị ' +
         'nhúng là gì?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '# gợi ý về công cụ đo — %M là RSS đỉnh, đơn vị KB\n' +
                "/usr/bin/time -f '%M KB' sort s.txt > /dev/null" },
        { t: 'cal', kind: 'info',
          x: 'Dùng <code>/usr/bin/time</code> với đường dẫn đầy đủ. Gõ ' +
             '<code>time</code> trơn sẽ gọi lệnh dựng sẵn của bash, và lệnh ấy ' +
             '<b>không</b> có cờ <code>-f</code>.' },
        { t: 'cal', kind: 'warn',
          x: 'Số của bạn <b>sẽ khác</b> số dưới đây. Thứ phải khớp là <b>hình dạng</b> ba ' +
             'đường cong, không phải giá trị.' }
      ],
      hint: 'Sinh dữ liệu bằng chính awk: ' +
            '<code>awk -v n=200000 \'BEGIN { for (i = 0; i &lt; n; i++) print "level" (i % 5) }\' &gt; s.txt</code>. ' +
            'Đổi số <code>5</code> thành số khoá bạn muốn cho phép đo thứ hai.',
      crit: [
        'Sinh được dữ liệu tổng hợp có <b>số dòng</b> và <b>số khoá phân biệt</b> điều khiển được độc lập với nhau',
        'Đo bằng <code>/usr/bin/time -f \'%M KB\'</code> và <b>vứt stdout vào <code>/dev/null</code></b> để không đo nhầm thời gian ghi màn hình',
        'Chạy mỗi phép đo <b>vài lần</b> và thấy con số lặp lại được (dao động vài phần trăm)',
        '<b>(a)</b> <code>uniq -c</code> phẳng theo cỡ file <i>và</i> phẳng theo số khoá; <code>sort</code> dốc theo <b>cỡ file</b>; mảng awk phẳng theo cỡ file nhưng dốc theo <b>số khoá</b>',
        '<b>(b)</b> Lý do thuật toán: <code>uniq</code> chỉ cần <b>một dòng</b> trong bộ nhớ; <code>sort</code> <b>không thể</b> in dòng đầu trước khi đọc xong dòng cuối, nên buộc phải giữ tất cả — không cờ nào chữa được',
        '<b>(c)</b> <code>sort -S 1M</code> hạ RSS xuống mạnh (đo được 18 440 KB so với 68 888 KB) vì nó <b>tràn ra đĩa</b>; giá phải trả là I/O ghi — trên thẻ nhớ flash thì đó là tuổi thọ sản phẩm',
        'Nối được kết luận với C1: chọn công cụ theo <i>đại lượng đang ràng buộc mình</i>, không theo thói quen'
      ],
      sol: '<p><b>Cách sinh dữ liệu và đo</b> — cả hai vòng lặp, viết ra thành một script rồi ' +
           'chạy:</p>',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '# vòng 1: đổi cỡ đầu vào, giữ nguyên 5 khoá\n' +
                'for n in 200000 2000000 8000000; do\n' +
                '  awk -v n="$n" \'BEGIN { for (i = 0; i < n; i++) print "level" (i % 5) }\' > s.txt\n' +
                '  echo "--- $n lines  ($(stat -c %s s.txt) bytes)"\n' +
                "  echo -n '  uniq -c : '; /usr/bin/time -f '%M KB' uniq -c s.txt > /dev/null\n" +
                "  echo -n '  sort    : '; /usr/bin/time -f '%M KB' sort s.txt > /dev/null\n" +
                "  echo -n '  awk     : '; /usr/bin/time -f '%M KB' awk '{c[$0]++} END {for (k in c) print k, c[k]}' s.txt > /dev/null\n" +
                'done' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '--- 200000 lines  (1400000 bytes)\n' +
                '  uniq -c : 7904 KB\n' +
                '  sort    : 14440 KB\n' +
                '  awk     : 4440 KB\n' +
                '--- 2000000 lines  (14000000 bytes)\n' +
                '  uniq -c : 7868 KB\n' +
                '  sort    : 69164 KB\n' +
                '  awk     : 4372 KB\n' +
                '--- 8000000 lines  (56000000 bytes)\n' +
                '  uniq -c : 8116 KB\n' +
                '  sort    : 250536 KB\n' +
                '  awk     : 4620 KB' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '# vòng 2: giữ nguyên 2 000 000 dòng, chỉ đổi số khoá phân biệt\n' +
                'for d in 5 500000; do\n' +
                '  awk -v d="$d" \'BEGIN { for (i = 0; i < 2000000; i++) print "key" (i % d) }\' > k.txt\n' +
                '  echo "--- 2000000 lines, $d distinct keys"\n' +
                "  echo -n '  uniq -c : '; /usr/bin/time -f '%M KB' uniq -c k.txt > /dev/null\n" +
                "  echo -n '  sort    : '; /usr/bin/time -f '%M KB' sort k.txt > /dev/null\n" +
                "  echo -n '  awk     : '; /usr/bin/time -f '%M KB' awk '{c[$0]++} END {for (k in c) print k, c[k]}' k.txt > /dev/null\n" +
                'done' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '--- 2000000 lines, 5 distinct keys\n' +
                '  uniq -c : 8156 KB\n' +
                '  sort    : 64896 KB\n' +
                '  awk     : 4464 KB\n' +
                '--- 2000000 lines, 500000 distinct keys\n' +
                '  uniq -c : 7652 KB\n' +
                '  sort    : 74304 KB\n' +
                '  awk     : 172988 KB' },
        { t: 'p',
          x: '<b>(a) Ba đường, ba đại lượng điều khiển.</b> ' +
             '<code>uniq -c</code> đi từ 7 904 lên 8 116 KB khi đầu vào tăng 40 lần, và ' +
             'không đổi khi số khoá tăng 100 000 lần — nó <b>hằng số</b>, không phụ thuộc ' +
             'gì cả. <code>sort</code> đi 14 440 → 69 164 → 250 536 KB, tức là tỉ lệ với ' +
             '<b>cỡ file</b>; đổi số khoá thì nó gần như không nhúc nhích (64 896 → ' +
             '74 304). Mảng awk là trường hợp thú vị nhất: phẳng theo cỡ file (4 440 → ' +
             '4 372 → 4 620) nhưng nhảy 39 lần khi số khoá tăng, lên ' +
             '<b>172 988 KB</b> — nó tỉ lệ với <b>số khoá phân biệt</b>. Ba công cụ, ba ' +
             'đại lượng ràng buộc khác nhau.' },
        { t: 'p',
          x: '<b>(b) Vì sao <code>uniq</code> phẳng còn <code>sort</code> thì không.</b> ' +
             'Đây là chuyện thuật toán, không phải chuyện tối ưu hoá. <code>uniq</code> chỉ ' +
             'cần trả lời "dòng này có giống dòng ngay trước không?", nên nó giữ trong bộ ' +
             'nhớ đúng <b>một dòng</b> — cái đã đọc trước đó. Bao nhiêu dữ liệu chảy qua ' +
             'cũng không đổi được con số ấy. <code>sort</code> thì phải trả lời "dòng nào ' +
             'nhỏ nhất?", và nó <b>không thể</b> biết điều đó cho tới khi đã nhìn thấy dòng ' +
             'cuối cùng — vì dòng cuối cùng hoàn toàn có thể chính là dòng nhỏ nhất. Nên nó ' +
             'buộc phải giữ tất cả. Không cờ nào, không phiên bản nào, không cách cài đặt ' +
             'nào chữa được điều đó; nó là hệ quả của <i>định nghĩa</i> phép sắp xếp. C4 ' +
             'chỉ ra hệ quả cực đoan của cùng một sự thật: với dòng dữ liệu vô tận, ' +
             '<code>sort</code> không bao giờ in ra một ký tự nào.' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: "/usr/bin/time -f '%M KB' sort -S 1M stream.txt > /dev/null\n" +
                "/usr/bin/time -f '%M KB' sort stream.txt > /dev/null" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '18440 KB\n68888 KB' },
        { t: 'p',
          x: '<b>(c) <code>sort -S 1M</code> hạ RSS từ 68 888 xuống 18 440 KB</b> — gần bốn ' +
             'lần. Nhưng nó <b>không</b> làm sort tốn ít tài nguyên hơn; nó chỉ chuyển chi ' +
             'phí sang chỗ khác. Khi bị cấm dùng RAM, <code>sort</code> chia dữ liệu thành ' +
             'từng khối, sắp từng khối, <b>ghi ra file tạm trên đĩa</b>, rồi trộn các file ' +
             'tạm lại. Cái giá là <b>I/O ghi</b> — và trên một thiết bị nhúng lưu trữ bằng ' +
             'eMMC hay thẻ nhớ, mỗi byte ghi là một phần tuổi thọ của chip flash. Một job ' +
             'thống kê chạy hằng đêm với <code>sort -S</code> trên vài trăm MB log là một ' +
             'cách âm thầm làm chết bộ nhớ của sản phẩm sau vài năm. Chưa kể ' +
             '<code>/tmp</code> trên nhiều rootfs nhúng là tmpfs — tức là nằm trong RAM — ' +
             'nên "tràn ra đĩa" có thể chẳng tràn đi đâu cả; phải trỏ ' +
             '<code>-T</code> vào một phân vùng ghi được thật.' },
        { t: 'cal', kind: 'info',
          x: '<b>Kết luận mang theo suốt nghề:</b> câu hỏi đúng không phải "công cụ nào ' +
             'nhanh nhất" mà là "<b>tôi đang bị ràng buộc bởi đại lượng nào</b>" — cỡ dữ ' +
             'liệu, số khoá, RAM, hay số byte ghi xuống flash. Trả lời được câu ấy thì việc ' +
             'chọn công cụ trở nên hiển nhiên; không trả lời được thì mọi lựa chọn đều là ' +
             'phỏng đoán.' }
      ] },
  ],

  /* ═══ F · Bảng chẩn đoán ═══════════════════════════════════════════════ */
  diag: [
    ['A1, B1, C1, E3, E5',
     'Bạn tin rằng <code>uniq</code> "loại bỏ dòng trùng lặp trong file". Nó chỉ so mỗi dòng ' +
     'với dòng <b>liền ngay trước</b> nó và không nhớ gì thêm — nên không có ' +
     '<code>sort</code> đứng trước, nó cho ra một bảng đếm sai mà <b>không báo lỗi</b>: bảy ' +
     'hàng cho ba mức log, <code>uart</code> xuất hiện hai lần trong một bảng đáng lẽ mỗi ' +
     'khoá một hàng.',
     '<a href="#/bai-11#sort-uniq-wc-cut-bien-ket-qua-tho-thanh-bang">Đọc lại Bài 11 — ' +
     '<i>sort, uniq, wc, cut: biến kết quả thô thành bảng</i></a>'],

    ['A2, B2, C2, E4',
     'Bạn tin rằng <code>sed</code> "sửa file" như một trình soạn thảo. Nó là một ' +
     '<b>bộ lọc</b>: đọc, biến đổi, in ra stdout, file gốc không đổi một byte. Còn ' +
     '<code>-i</code> không sửa tại chỗ mà <b>ghi file mới rồi đổi tên đè lên</b> — inode ' +
     'đổi, hard link tách đôi, symlink bị thay bằng file thường, tiến trình đang mở file vẫn ' +
     'thấy nội dung cũ.',
     '<a href="#/bai-11#sed-sua-van-ban-theo-luong">Đọc lại Bài 11 — <i>sed: sửa văn bản ' +
     'theo luồng</i></a>'],

    ['A3, B3, B5, C3, E1, E5',
     'Bạn tin rằng "regex là regex". Có <b>hai phương ngữ</b>, và mặc định của ' +
     '<code>grep</code> và <code>sed</code> là BRE, nơi <code>+ ? { } ( ) |</code> chỉ là ' +
     '<b>ký tự thường</b>. Mẫu sai phương ngữ vẫn <i>hợp lệ</i> nên không có cảnh báo nào; ' +
     'nó chỉ lặng lẽ trả lời một câu hỏi khác — 0 file thay vì 607, và một script CI báo ' +
     '"sạch" suốt ba tuần.',
     '<a href="#/bai-11#bieu-thuc-chinh-quy-ngon-ngu-mo-ta-mau">Đọc lại Bài 11 — <i>Biểu ' +
     'thức chính quy: ngôn ngữ mô tả mẫu</i></a>'],

    ['A4, A8, C5, E1',
     'Bạn chưa phân biệt được <b>bao nhiêu file</b>, <b>bao nhiêu dòng</b> và <b>bao nhiêu ' +
     'lần</b> — ba câu hỏi khác nhau cho ba con số khác nhau (182 · 1218 · 1243), và ' +
     '<code>-l</code> · <code>-c</code> · <code>-o</code> mới là thứ chọn giữa chúng. Cùng ' +
     'nhóm: <code>sort</code> mặc định so theo <b>chuỗi</b>, nên 10 đứng trước 9 cho tới khi ' +
     'bạn thêm <code>-n</code>.',
     '<a href="#/bai-11#sort-uniq-wc-cut-bien-ket-qua-tho-thanh-bang">Đọc lại Bài 11 — ' +
     '<i>sort, uniq, wc, cut: biến kết quả thô thành bảng</i></a>'],

    ['A7, B6, E2, E3',
     'Bạn đếm tay ra <code>$9</code> thay vì dùng <code>$NF</code> — nhưng số cột của các ' +
     'dòng log <b>không đều</b> (đo thật: 9 9 10 8 10 9 9 9), nên <code>$9</code> trỏ vào ' +
     'những thứ chẳng liên quan gì nhau. Cùng nhóm: thứ tự của <code>for (k in arr)</code> là ' +
     '<b>không xác định</b>, và chương trình awk phải nằm trong <b>nháy đơn</b> — nháy kép ' +
     'để bash nuốt mất <code>$3</code> trước khi awk kịp nhìn thấy.',
     '<a href="#/bai-11#awk-moi-dong-la-mot-hang-moi-khoang-trang-la-mot-cot">Đọc lại ' +
     'Bài 11 — <i>awk: mỗi dòng là một hàng, mỗi khoảng trắng là một cột</i></a>'],

    ['A5, A6',
     'Bạn coi các cờ của <code>grep</code> là những chi tiết vặt có thể tra sau. Hai cờ hay ' +
     'cắn nhất: <code>-r</code> <b>không</b> đi theo symlink còn <code>-R</code> thì có — ' +
     'đủ để hai lệnh "giống hệt nhau" ra hai danh sách file khác nhau; và <code>-w</code> ' +
     'coi <b>gạch dưới là ký tự từ</b>, nên nó bỏ qua <code>gpio_init</code> khi bạn tìm ' +
     '<code>gpio</code>.',
     '<a href="#/bai-11#grep-r-va-find-co-ket-qua-khac-nhau-hay-hieu-vi-sao">Đọc lại ' +
     'Bài 11 — <i>grep -r và find có kết quả khác nhau — hãy hiểu vì sao</i></a>'],

    ['B4, E4',
     'Bạn viết một biểu thức <code>find</code> có <code>-o</code> mà không đóng ngoặc. ' +
     '<code>-a</code> (ngầm định) <b>ưu tiên cao hơn</b> <code>-o</code>, nên ' +
     '<code>-type f -name \'*.c\' -o -name \'*.h\'</code> đọc thành ' +
     '<code>(-type f AND -name \'*.c\') OR -name \'*.h\'</code> — và một <b>thư mục</b> tên ' +
     '<code>include.h</code> lọt thẳng vào kết quả. Cùng nhóm: <code>-exec … {} +</code> gom ' +
     'file thành một lần gọi, <code>{} \\;</code> gọi lại mỗi file một lần.',
     '<a href="#/bai-11#find-duyet-cay-thu-muc-theo-dieu-kien">Đọc lại Bài 11 — <i>find: ' +
     'duyệt cây thư mục theo điều kiện</i></a>'],

    ['C4, E6',
     'Bạn chọn công cụ theo thói quen chứ không theo <b>đại lượng đang ràng buộc mình</b>. ' +
     'Số đo: <code>uniq -c</code> giữ RAM hằng số (7,9 → 8,1 MB khi đầu vào tăng 40 lần) vì ' +
     'nó chỉ nhớ một dòng; <code>sort</code> tỉ lệ với <b>cỡ file</b> (14 → 250 MB) vì nó ' +
     '<b>không thể</b> in dòng đầu trước khi đọc xong dòng cuối; mảng awk tỉ lệ với ' +
     '<b>số khoá</b> (4,4 MB với 5 khoá, 173 MB với 500 000).',
     '<a href="#/bai-11#sort-uniq-wc-cut-bien-ket-qua-tho-thanh-bang">Đọc lại Bài 11 — ' +
     '<i>sort, uniq, wc, cut: biến kết quả thô thành bảng</i></a>'],

    ['D1',
     'Bạn tưởng <code>find</code> tự hiểu dấu <code>*</code>. <b>Shell bung nó trước</b>, nên ' +
     '<code>find . -name *.c</code> tới tay find dưới dạng ' +
     '<code>find . -name gpio.c main.c uart.c</code>. Nguy hiểm nhất là khi thư mục chỉ có ' +
     '<b>một</b> file khớp: lệnh chạy êm, thoát mã 0, và chỉ tìm đúng một tên.',
     '<a href="#/bai-06#ky-tu-dai-dien-ai-that-su-mo-rong-dau-sao">Đọc lại Bài 6 — <i>Ký tự ' +
     'đại diện: ai thật sự mở rộng dấu sao</i></a>'],

    ['D2',
     'Bạn quên rằng <b>shell dựng xong đường dẫn vào/ra trước khi lệnh chạy</b>. ' +
     '<code>sed \'s/…/…/\' f &gt; f</code> cắt <code>f</code> về 0 byte <i>trước khi</i> sed ' +
     'kịp đọc — và khác với <code>grep</code>, <code>sed</code> <b>không</b> in một lời cảnh ' +
     'báo nào; nó thoát mã 0. Đó chính là lý do <code>-i</code> tồn tại.',
     '<a href="#/bai-10#thu-tu-viet-quyet-dinh-ket-qua">Đọc lại Bài 10 — <i>Thứ tự viết ' +
     'quyết định kết quả</i></a>'],

    ['D3',
     'Bạn chưa đọc được quyền như một dữ liệu tra cứu được. Một bit <code>x</code> lạc trên ' +
     'file <code>.c</code> là vô nghĩa và sẽ theo cây mã vào rootfs xuất xưởng; ' +
     '<code>-perm -u+x</code> (có dấu trừ = "có ít nhất bit này") tìm ra nó, còn ' +
     '<code>-perm 644</code> hỏi một câu khác hẳn.',
     '<a href="#/bai-08#chin-ky-tu-va-con-so-tuong-duong">Đọc lại Bài 8 — <i>Chín ký tự và ' +
     'con số tương đương</i></a>'],
  ],
});

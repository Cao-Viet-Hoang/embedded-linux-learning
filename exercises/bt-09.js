/* ═══════════════════════════════════════════════════════════════════════════
   BT-09 — Bài tập cho Bài 9: "Tiến trình, tín hiệu và điều khiển job"
   ═══════════════════════════════════════════════════════════════════════════

   §13.4 — CHỌN TRỤC XOÁY. Bảy bước, ghi lại để phiên sau soi được lựa chọn
   thay vì phải suy lại từ đầu.

   BƯỚC 1–2. Kiểm kê rồi chấm điểm. PT = phụ thuộc về sau, GIA = giá phải trả
   khi hiểu sai, NGC = ngược trực giác. Thang 0/1/2.

   Khái niệm                                            | PT | GIA | NGC | Tổng
   -----------------------------------------------------|----|-----|-----|-----
   kill là lời đề nghị, -9 là mệnh lệnh không kịp ghi    |  2 |  2  |  2  |  6
   Load average là SỐ ĐẾM, không phải phần trăm          |  2 |  2  |  2  |  6
   Bảng job là sổ sách của shell, không phải của kernel  |  2 |  1  |  2  |  5
   Shell xử lý & và %1 trước khi lệnh chạy               |  2 |  1  |  2  |  5
   D-state: kill -9 cũng không giết được                 |  2 |  2  |  2  |  6
   Zombie đã chết rồi, phải giết cha                     |  1 |  1  |  2  |  4
   Mã thoát 128+n, 137 là OOM killer                     |  2 |  2  |  1  |  5
   SIGKILL/SIGSTOP không bắt được                        |  2 |  1  |  2  |  5
   fork + exec: PID giữ nguyên qua exec                  |  2 |  1  |  2  |  5
   PID bị dùng lại, pidfile cũ giết nhầm tiến trình      |  1 |  2  |  2  |  5
   RSS đếm cả trang dùng chung, VSZ không phải RAM       |  2 |  2  |  1  |  5
   Đóng terminal → SIGHUP → job chết theo                |  1 |  2  |  2  |  5
   TIME của ps là thời gian CPU, không phải tuổi đời     |  1 |  1  |  2  |  4
   ps aux / ps -ef / ps -e: ba bộ cú pháp lịch sử        |  0 |  1  |  1  |  2
   Trạng thái S là ngủ, R mới là chạy                    |  1 |  1  |  1  |  3
   Cây tiến trình mọc từ PID 1                           |  2 |  1  |  0  |  3
   grep tự khớp chính nó trong `ps aux | grep`           |  0 |  1  |  1  |  2
   nice / ưu tiên lập lịch                               |  1 |  0  |  1  |  2
   Số tiến trình lúc mới khởi động khác lúc ổn định      |  0 |  0  |  1  |  1
   cgroup: systemd biết tiến trình nào của service nào   |  2 |  1  |  1  |  4

   BƯỚC 3. Ngưỡng: tổng ≥ 4 và ít nhất hai trục ≥ 1. Mười một khái niệm đạt
   ngưỡng. Trần cứng là 3, nên phần lớn phải rơi xuống mức "hỏi một lần".

   BƯỚC 4. Loại, và đây là bước làm nhiều việc nhất ở bộ này:

     (a) Quiz của chính Bài 9 đã hỏi thẳng — §13.1 cấm biến bộ bài tập thành
         quiz thứ hai. Loại nguyên khối sáu khái niệm điểm cao:
           · fork + exec, PID qua exec            (quiz câu 1)
           · D-state và vì sao kill -9 vô hiệu    (quiz câu 2)
           · mã 137 = OOM killer                  (quiz câu 3)
           · đóng terminal → SIGHUP               (quiz câu 4)
           · zombie PPID=1420, phải khởi động lại tiến trình cha (quiz câu 5)
           · SIGKILL/SIGSTOP không bắt được       (quiz câu 6)
         Sáu cái này vẫn xuất hiện, nhưng mỗi cái đúng một lần, và luôn ở một
         thao tác khác thao tác quiz đòi hỏi (đọc số đo, hoặc quyết định).

     (b) "Shell xử lý & và %1 trước khi lệnh chạy" — 5 điểm, vẫn loại. bt-04 đã
         xoáy "shell cắt dòng lệnh theo khoảng trắng TRƯỚC khi lệnh nhìn thấy
         đối số", bt-06 đã xoáy "shell mở rộng dấu sao, lệnh không bao giờ thấy
         nó". Đây là biến thể thứ ba của cùng một mệnh đề, và §13.3 gọi đúng
         tên kiểu lạm dụng đó. Nó không biến mất: nó bị **nuốt vào** trục 3
         dưới một dạng sắc hơn và mới hoàn toàn — không phải "shell xử lý
         trước" mà "shell là nơi *duy nhất* bảng job tồn tại".

     (c) "PID 1 chết → kernel panic" thuộc về Chặng 06 (init và boot), không
         phải bài này. Để dành.

     (d) "Số tiến trình lúc mới khởi động khác lúc ổn định" — 1 điểm, và §13.4
         bước 4 loại thẳng những gì là *sự thật về môi trường người dùng* chứ
         không phải nguyên lý. Nó không được làm trục. Nhưng nó là một câu
         `Giải thích vì sao` rất tốt (B4), vì lý do đằng sau — 28 tiến trình
         `(udev-worker)` sinh ra rồi thoát cùng lúc — mới là nguyên lý.

   Ba cái còn lại đứng vững: hai cái 6 điểm không bị quiz đụng tới, và bảng job
   5 điểm sau khi đã hút "shell xử lý trước" vào.

   Đối chiếu với §13.8 (trục đã tiêu): bt-01 MMU · bốn mảnh nối tiếp · Device
   Tree; bt-02 DRAM chết lúc reset · mỗi tầng biến mất · bootargs; bt-03 ảo hoá
   cùng kiến trúc · hai họ QEMU · /mnt/c; bt-04 $? · builtin không phải file ·
   shell cắt khoảng trắng; bt-05 /proc sinh lúc đọc · file /dev không chứa dữ
   liệu · thư mục rỗng là điểm gắn; bt-06 shell mở rộng * · tên không phải
   file · metadata là một hệ thống; bt-07 Ctrl+S đóng băng terminal · vim có
   chế độ · lệnh : mặc định một dòng; bt-08 một bộ ba · thư mục là bảng tên ·
   quyền phần cứng là nhóm. Không trục nào của bt-09 trùng.

   BƯỚC 5–6. Ba mệnh đề sai được và ngộ nhận đối lập nằm ở trường `x` và `mis`
   của mảng `truc` ngay dưới đây.

   BƯỚC 7. Lưới 3×1, kiểm bằng mắt trước khi để tools/check.js kiểm bằng máy:

     Trục 1 (TERM rồi mới KILL)  A3 mệnh đề  → B3 số đo thật → C3 tình huống
     Trục 2 (load là số đếm)     A1 mệnh đề  → B1 số đo thật → C1 chẩn đoán
     Trục 3 (bảng job của shell) A2 mệnh đề  → B2 số đo thật → C4 quyết định

   Ba mức, ba loại kích thích khác nhau:
   · A hỏi bằng một câu phát biểu, trả lời được bằng trí nhớ.
   · B đặt trước mặt học viên một bản ghi thật — đường cong load 6 lần đo, hai
     cột `jobs -l` và `ps` cạnh nhau, một chương trình từ chối SIGTERM — và
     đòi giải thích cơ chế.
   · C đưa ràng buộc chưa từng có trong bài: bo mạch một nhân ghi flash, một
     bản build 40 phút qua ssh, một trình ghi log mất dữ liệu khi reboot.

   Không câu nào đoán được từ câu kia: C1 đưa một máy **rỗi CPU** mà load vẫn
   cao — A1/B1 chỉ nói về máy đang bận; C3 hỏi *phải sửa gì trong script*, thứ
   mà A3/B3 không hề dạy cách làm; C4 bắt chọn giữa bốn công cụ và bảo vệ lựa
   chọn, còn A2/B2 chỉ mô tả hiện tượng.

   ───────────────────────────────────────────────────────────────────────────
   MỌI LỆNH VÀ MỌI KẾT QUẢ TRONG FILE NÀY ĐỀU ĐÃ CHẠY THẬT

   Máy: WSL2 · Ubuntu 24.04 · shinarus, uid=1000 · 6 nhân
   (11th Gen Intel Core i7-1165G7 @ 2.80GHz) · 4918 MiB RAM · ngày 2026-08-14.
   Chạy trong ~/embedded/bt09, đã xoá sạch sau khi đo.

   Vài chi tiết đo được, đáng ghi lại vì chúng khác với điều người ta hay đoán:

   · Bốn vòng lặp bận trên sáu nhân **không** đưa load lên 4.00 sau 60 giây mà
     chỉ lên 2.71. Đo tiếp: 30s→1.86, 60s→2.71, 90s→3.22, 120s→3.53, 150s→3.71,
     180s→3.83. Đây không phải sai số: load là trung bình trượt hàm mũ với hằng
     số thời gian 60 giây, L(t) = 4 − 3.53·e^(−t/60). Công thức khớp số đo tới
     0.01 ở **cả sáu** điểm. Chi tiết này là xương sống của câu B1.
   · Năm giây sau khi giết sạch bốn vòng lặp: load vẫn **3.52** trong khi
     `%Cpu(s)` là **100.0 id** và chỉ **1 running**. Cùng một màn hình `top`
     nói hai điều trái ngược nhau — đúng thứ cần cho B1.
   · `ps -e --no-headers | wc -l` cho **56** ngay khi vào WSL nhưng **27** ba
     mươi giây sau. Đã điều tra bằng cách chụp `ps -e -o comm` tám lần cách
     nhau 10 giây rồi `comm -23` từng cặp: biến mất cùng lúc là **28** tiến
     trình `(udev-worker)` cộng `snapd`, sau đó `systemd-timedat`. Trạng thái
     ổn định là 26–27. Con số 56 in trong Bài 9 là con số của một máy **vừa
     mới khởi động** — dùng cho B4, và §13.4 bước 4 cấm lấy nó làm trục.
   · Hai tiến trình `sleep` giống hệt nhau có `Rss: 7856 kB` và `Rss: 7780 kB`
     nhưng `Pss:` chỉ **2923 kB** và **2842 kB**, với `Shared_Clean: 6344 kB`.
     Cộng RSS lại là đếm thừa gần **2.7 lần**. Dùng cho C5.
   · `type -a kill` cho **ba** dòng: shell builtin, /usr/bin/kill, /bin/kill.
     `/bin/kill %1` báo `failed to parse argument: '%1'` và trả về 1, trong khi
     `kill %1` của bash trả về 0. Dùng cho D3.
   · `pkill -f backup` chạy từ file `stop-backup.sh` **tự giết chính nó**: dòng
     lệnh của nó cũng chứa chữ `backup`. Script chết với mã **143** và dòng
     `[stop] done` không bao giờ được in. Dùng cho E5.
   · `ps aux` sắp theo **PID tăng dần**, không theo %CPU: 1, 2, 6, 46, 78 với
     %CPU lần lượt 3.3, 0.0, 0.0, 0.9, 0.4.
   ═══════════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-09',
  minutes: 85,

  intro:
    '<p>Bài 9 là bài đầu tiên dạy bạn <b>can thiệp</b> vào một hệ thống đang chạy. Cho tới ' +
    'giờ, gõ sai một lệnh thì cùng lắm là nhận thông báo lỗi. Từ bài này trở đi, gõ sai một ' +
    'lệnh có thể làm mất dữ liệu của một tiến trình đang ghi dở, hoặc giết nhầm một tiến ' +
    'trình hoàn toàn khác vì số PID đã bị dùng lại. Bộ bài tập vì thế xoáy vào <b>hậu quả ' +
    'của thao tác</b>, không chỉ vào tên gọi của thao tác.</p>' +
    '<p>Ba trục xoáy đều nằm ở chỗ trực giác đánh lừa: <code>kill</code> mặc định ' +
    '<b>không</b> giết ai cả mà chỉ đề nghị; <code>load average</code> <b>không</b> phải ' +
    'phần trăm CPU và có thể cao chót vót trên một máy hoàn toàn rỗi; còn <code>jobs</code> ' +
    'và <code>%1</code> <b>không</b> phải thứ kernel biết. Mỗi trục được hỏi đúng ba lần — ' +
    'một lần nhớ lại, một lần trước số đo thật, một lần trong tình huống chưa từng gặp.</p>' +
    '<p><b>Lượt 1</b> — làm ngay sau khi đọc xong Bài 9: phần <b>A</b> và <b>B</b>, khoảng ' +
    '23 phút. <b>Lượt 2</b> — quay lại sau 2–3 ngày: phần <b>C</b>, <b>D</b> và <b>E</b>, ' +
    'khoảng 60 phút. Khoảng nghỉ đó là thành phần có tác dụng, không phải thời gian chết. ' +
    'Phần <b>D</b> lần này lật lại Bài 8 (ai được phép gửi tín hiệu cho ai), Bài 5 ' +
    '(<code>/proc</code> sinh ra lúc đọc) và Bài 4 (builtin không phải là file trên đĩa).</p>',

  /* Chỉ trường `name` được hiển thị; `x` và `mis` là ghi chú cho người viết đề. */
  truc: [
    { id: 'term-roi-moi-kill',
      name: '<code>kill</code> là lời đề nghị, <code>kill -9</code> là mệnh lệnh — và cái giá của mệnh lệnh là không còn một mili-giây nào để ghi nốt dữ liệu',
      x: 'kill không tham số gửi SIGTERM, tín hiệu mà chương trình được phép bắt, xử lý ' +
         'dở dang rồi thoát tử tế. SIGKILL do kernel thi hành, chương trình không chạy ' +
         'thêm một lệnh nào nữa: buffer chưa ghi xuống flash là mất, file tạm là còn lại, ' +
         'khoá là kẹt. Đúng trình tự là TERM → chờ → KILL, và systemd đặt tên cho khoảng ' +
         'chờ đó là TimeoutStopSec.',
      mis: '"kill là giết; kill -9 chỉ là giết mạnh hơn cho chắc, nên gõ luôn -9 cho nhanh."' },

    { id: 'load-la-so-dem',
      name: 'Load average là <b>số tiến trình đang chờ</b>, không phải phần trăm CPU — phải chia cho <code>nproc</code>, và nó trễ khoảng một phút so với thực tế',
      x: 'Load average đếm số tiến trình ở trạng thái R cộng D. Nó không có trần: trên máy ' +
         '6 nhân, load 4.0 là còn dư; trên bo mạch 1 nhân, load 4.0 là quá tải gấp bốn. Nó ' +
         'cộng cả tiến trình D (chờ I/O) nên có thể cao trong khi CPU rỗi 100%. Và nó là ' +
         'trung bình trượt hàm mũ hằng số 60 giây, nên nó luôn đuổi theo sau sự thật.',
      mis: '"load 4.0 nghĩa là CPU đang dùng 400%, máy sắp treo" — và ngược lại "CPU rỗi ' +
           'thì load phải xuống ngay lập tức."' },

    { id: 'job-la-so-sach-cua-shell',
      name: '<code>jobs</code> và <code>%1</code> là sổ sách của <b>shell</b>, không phải của kernel: bảng job không chia sẻ giữa hai terminal và biến mất cùng terminal',
      x: 'Kernel chỉ biết PID và tiến trình cha. Số job, dấu + và -, fg, bg, %1 đều do bash ' +
         'tự ghi trong bộ nhớ của chính nó. Terminal thứ hai gõ jobs sẽ không thấy gì; ' +
         'đóng terminal là bảng đó bốc hơi, còn tiến trình thì tuỳ SIGHUP quyết định. Vì ' +
         'thế kill %1 là builtin của bash, còn /bin/kill %1 thì không hiểu %1 là gì.',
      mis: '"thêm dấu & là tiến trình đã tách khỏi terminal rồi" và "kill %1 với kill PID ' +
           'là hai cách gõ của cùng một thứ."' },
  ],

  /* ═══ A · Nhận biết — 4 mcq + 2 tf + 1 fill + 1 match ═══════════════════ */
  A: [
    { id: 'a1', k: 'mcq', truc: 1, tag: 'Trắc nghiệm nhanh',
      q: 'Hai máy cùng báo <code>load average: 4.00</code>. Máy A là laptop 6 nhân, máy B ' +
         'là bo mạch nhúng 1 nhân. Kết luận nào đúng?',
      opts: [
        'Cả hai máy đều đang dùng 400% CPU, cả hai đều quá tải như nhau.',
        'Máy A còn dư sức (4 tiến trình chờ / 6 nhân); máy B đang quá tải khoảng 4 lần.',
        'Máy A quá tải vì 4.00 &gt; 1.00; máy B bình thường vì bo mạch nhúng vốn chậm.',
        'Không so sánh được, vì load average tính theo phần trăm nên phụ thuộc xung nhịp CPU.'
      ],
      a: 1,
      why: 'Load average là <b>số đếm</b>, không phải phần trăm: nó đếm số tiến trình đang ' +
           'chạy hoặc đang chờ được chạy. Con số đó chỉ có nghĩa khi đem chia cho số nhân. ' +
           '<code>nproc</code> cho biết mẫu số. 4.00 trên 6 nhân là hàng chờ ngắn hơn số ' +
           'quầy phục vụ; 4.00 trên 1 nhân là bốn người xếp hàng trước một quầy duy nhất.' },

    { id: 'a2', k: 'mcq', truc: 2, tag: 'Trắc nghiệm nhanh',
      q: 'Trong terminal thứ nhất bạn chạy <code>sleep 600 &amp;</code> rồi thấy ' +
         '<code>[1] 4312</code>. Bạn mở terminal thứ hai trên cùng máy đó và gõ ' +
         '<code>jobs</code>. Màn hình hiện gì?',
      opts: [
        'Vẫn <code>[1]+ Running sleep 600 &amp;</code>, vì job là của máy chứ không của terminal.',
        'Không hiện gì cả — bảng job là sổ sách riêng của từng shell, terminal thứ hai có bảng rỗng.',
        'Báo lỗi <code>jobs: no job control in this shell</code>, vì mỗi máy chỉ có một bảng job.',
        'Hiện job nhưng đánh số lại thành <code>[0]</code>, vì shell mới bắt đầu đếm từ 0.'
      ],
      a: 1,
      why: 'Kernel không có khái niệm "job". Nó chỉ biết PID 4312 và tiến trình cha của nó. ' +
           'Số <code>[1]</code>, dấu <code>+</code>/<code>-</code>, <code>fg</code>, ' +
           '<code>bg</code>, <code>%1</code> đều do <b>bash</b> ghi trong bộ nhớ của chính ' +
           'nó. Terminal thứ hai là một tiến trình bash khác, với cuốn sổ trắng tinh. Muốn ' +
           'chạm vào tiến trình đó từ terminal thứ hai, bạn phải dùng PID: ' +
           '<code>kill 4312</code>.' },

    { id: 'a3', k: 'mcq', truc: 0, tag: 'Trắc nghiệm nhanh',
      q: 'Bạn cần dừng một service đang ghi dữ liệu xuống thẻ nhớ. Trình tự nào là đúng?',
      opts: [
        'Gửi <code>SIGKILL</code> ngay, vì nó chắc chắn thành công và không mất thời gian chờ.',
        'Gửi <code>SIGTERM</code>, chờ vài giây cho chương trình tự dọn dẹp và thoát, chỉ gửi <code>SIGKILL</code> nếu hết thời gian chờ mà nó vẫn còn sống.',
        'Gửi <code>SIGSTOP</code> để đóng băng nó lại, rồi rút thẻ nhớ ra là an toàn.',
        'Gửi <code>SIGTERM</code> và <code>SIGKILL</code> liên tiếp trong cùng một lệnh cho nhanh gọn.'
      ],
      a: 1,
      why: '<code>SIGTERM</code> là <b>lời đề nghị</b>: chương trình bắt được nó, có cơ hội ' +
           'ghi nốt buffer xuống thẻ, đóng file, xoá file tạm rồi mới thoát. ' +
           '<code>SIGKILL</code> do kernel thi hành, chương trình không chạy thêm một lệnh ' +
           'nào — mọi thứ chưa kịp ghi là mất. Đáp án 4 sai vì gửi hai tín hiệu liền nhau ' +
           'thì SIGKILL đến trước khi chương trình kịp dọn, tức là y hệt đáp án 1. ' +
           'systemd tự động hoá đúng trình tự này và gọi khoảng chờ là ' +
           '<code>TimeoutStopSec</code>.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Bạn chạy <code>./server &amp;</code> rồi muốn lưu lại số PID của nó để dùng về ' +
         'sau. Biến nào giữ số đó?',
      opts: [
        '<code>$?</code>', '<code>$$</code>', '<code>$!</code>', '<code>$0</code>'
      ],
      a: 2,
      why: 'Bốn biến này rất dễ lẫn: <code>$?</code> là mã thoát của lệnh vừa xong (Bài 4), ' +
           '<code>$$</code> là PID của <b>chính shell</b> đang gõ, <code>$!</code> là PID ' +
           'của lệnh nền <b>vừa được cho chạy</b>, còn <code>$0</code> là tên chương trình. ' +
           'Chỉ <code>$!</code> mới là cái bạn cần — nhưng hãy đọc câu C2 trước khi vội ghi ' +
           'nó vào một file để dùng lại sau này.' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: '<i>"Tiến trình có <code>STAT</code> là <code>S</code> nghĩa là nó đang chạy trên ' +
         'CPU. Máy có 30 tiến trình <code>S</code> tức là 30 tiến trình đang tranh nhau ' +
         'CPU."</i>',
      a: 1,
      rw: 'Viết lại câu trên cho đúng, nói rõ <code>S</code> nghĩa là gì và chữ cái nào mới ' +
          'là "đang chạy".',
      why: 'Sai. <code>S</code> là <b>sleeping</b> — tiến trình đang <i>ngủ</i>, chờ một sự ' +
           'kiện (gói tin, phím bấm, hết giờ <code>sleep</code>) và <b>không</b> tiêu tốn ' +
           'CPU. <code>R</code> mới là runnable/running. Trên một máy rỗi, gần như toàn bộ ' +
           'tiến trình đều ở <code>S</code>: đó là trạng thái bình thường, không phải dấu ' +
           'hiệu bận.',
      crit: [
        'Nói <code>S</code> = sleeping / đang ngủ, đang chờ một sự kiện',
        'Nói rõ tiến trình ở <code>S</code> <b>không</b> dùng CPU',
        'Chỉ ra <code>R</code> mới là đang chạy hoặc sẵn sàng chạy',
        'Nhận xét rằng đa số tiến trình ở <code>S</code> là chuyện bình thường'
      ],
      sol: '<code>S</code> nghĩa là <b>sleeping</b>: tiến trình đang chờ một sự kiện nào đó ' +
           'và hoàn toàn không dùng CPU trong lúc chờ. Chữ cái chỉ trạng thái đang chạy ' +
           '(hoặc đang xếp hàng chờ tới lượt CPU) là <code>R</code>. Một máy rỗi bình ' +
           'thường có hàng chục tiến trình <code>S</code> và thường chỉ có một ' +
           '<code>R</code> — chính là lệnh <code>ps</code> bạn vừa gõ.' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: '<i>"Tiến trình zombie vẫn chiếm RAM và CPU, nên để nhiều zombie thì máy sẽ chậm ' +
         'dần rồi treo."</i>',
      a: 1,
      rw: 'Viết lại cho đúng: zombie thực sự còn giữ cái gì, và nhiều zombie thì hỏng ở đâu?',
      why: 'Sai ở phần "chiếm RAM và CPU". Zombie <b>đã chết</b>: mã lệnh, vùng nhớ, file ' +
           'đang mở đều đã được kernel thu hồi. Cái còn lại chỉ là một dòng trong bảng tiến ' +
           'trình giữ số PID và mã thoát, chờ tiến trình cha đọc bằng <code>wait()</code>. ' +
           'Nó tốn vài trăm byte, không tốn CPU. Nhưng nó <b>giữ một số PID</b>, và số PID ' +
           'là tài nguyên có hạn: rò rỉ zombie lâu ngày sẽ làm cạn bảng PID và từ đó máy ' +
           'không tạo được tiến trình mới.',
      crit: [
        'Nói zombie đã chết rồi, RAM và CPU đã được thu hồi',
        'Nêu cái còn lại: một dòng trong bảng tiến trình giữ PID và mã thoát',
        'Nói lý do nó chờ: tiến trình cha chưa gọi <code>wait()</code> để đọc mã thoát',
        'Chỉ ra tác hại thật là cạn số PID, không phải cạn RAM'
      ],
      sol: 'Zombie là tiến trình <b>đã kết thúc</b> — kernel đã thu hồi bộ nhớ, file mô tả ' +
           'và mọi tài nguyên khác, nên nó không tốn RAM đáng kể và không tốn một chu kỳ ' +
           'CPU nào. Thứ duy nhất còn lại là một mục trong bảng tiến trình, giữ số PID và ' +
           'mã thoát, để tiến trình cha còn đọc được bằng <code>wait()</code>. Tác hại thật ' +
           'khi zombie chất đống là <b>cạn số PID</b>: bảng PID có giới hạn, hết chỗ thì ' +
           'máy không tạo được tiến trình mới nữa.' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Bạn muốn hỏi kernel "tiến trình PID 1234 còn sống không?" mà <b>không</b> gửi cho ' +
         'nó bất kỳ tín hiệu nào — chỉ mượn cơ chế kiểm tra quyền và kiểm tra tồn tại của ' +
         '<code>kill</code>. Lệnh đó là <code>kill -____ 1234</code>, sau đó đọc ' +
         '<code>$?</code>: <code>0</code> là còn sống, <code>1</code> là không còn.',
      a: ['0'],
      ph: 'một ký tự',
      why: 'Tín hiệu số <b>0</b> là tín hiệu rỗng: kernel làm đủ mọi bước kiểm tra (PID này ' +
           'có tồn tại không, bạn có quyền gửi cho nó không) rồi <b>không gửi gì cả</b>. ' +
           'Đây là cách chuẩn để một script kiểm tra tiến trình còn sống hay không, và bạn ' +
           'sẽ gặp lại nó trong mọi init script viết bằng shell. Đo thật trên máy: khi tiến ' +
           'trình còn sống, <code>$?</code> = 0; sau khi nó chết, shell in ' +
           '<code>kill: (451) - No such process</code> và <code>$?</code> = 1.' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi thao tác với hậu quả của nó lên tiến trình đang chạy.',
      left: [
        '<kbd>Ctrl</kbd>+<kbd>C</kbd>',
        '<kbd>Ctrl</kbd>+<kbd>Z</kbd>',
        '<code>bg %1</code>',
        '<code>fg %1</code>',
        '<code>kill -9 PID</code>',
        '<code>kill -0 PID</code>'
      ],
      right: [
        'Đưa job đang bị đóng băng chạy tiếp <b>dưới nền</b>, terminal vẫn trả prompt về cho bạn',
        'Không gửi tín hiệu nào; chỉ để biết tiến trình còn tồn tại và bạn có quyền với nó',
        'Gửi <code>SIGINT</code> — chương trình được phép bắt và từ chối',
        'Kernel xoá tiến trình ngay lập tức, chương trình không chạy thêm lệnh nào',
        'Gửi <code>SIGTSTP</code> — tiến trình đóng băng ở trạng thái <code>T</code>, vẫn còn trong bộ nhớ',
        'Kéo job trở lại <b>tiền cảnh</b>, terminal thuộc về nó cho tới khi nó xong'
      ],
      a: [2, 4, 0, 5, 3, 1],
      why: 'Ba cột dễ lẫn nhất nằm cạnh nhau ở đây. <kbd>Ctrl</kbd>+<kbd>C</kbd> và ' +
           '<kbd>Ctrl</kbd>+<kbd>Z</kbd> đều là phím trên bàn phím nhưng gửi hai tín hiệu ' +
           'khác hẳn nhau — một cái đề nghị kết thúc, một cái đóng băng. <code>bg</code> và ' +
           '<code>fg</code> đều "chạy tiếp" nhưng khác nhau ở chỗ <b>ai giữ bàn phím</b>. ' +
           'Còn <code>-9</code> và <code>-0</code> nhìn giống nhau đến mức nguy hiểm: một ' +
           'cái là mệnh lệnh không thể chống lại, một cái không làm gì cả.' },
  ],

  /* ═══ B · Thông hiểu — 2 vì sao + 1 so sánh + 1 bắt lỗi + 2 đọc output ═══ */
  B: [
    { id: 'b1', k: 'free', truc: 1, tag: 'Đọc output', rows: 9,
      q: 'Trên máy 6 nhân, tôi cho chạy <b>bốn</b> vòng lặp bận (mỗi vòng chiếm trọn một ' +
         'nhân) rồi đọc <code>/proc/loadavg</code> sáu lần, cách nhau 30 giây. Sau đó tôi ' +
         'giết cả bốn và đọc lại sau 5 giây. Đây là số đo thật:',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'cat /proc/loadavg\nfor i in 1 2 3 4; do ( while :; do :; done ) & done\nfor t in 30 60 90 120 150 180; do sleep 30; printf \'t=%ss  %s\\n\' "$t" "$(cat /proc/loadavg)"; done' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '0.47 0.20 0.08 1/191 380\n' +
                't=30s   1.86 0.87 0.35 5/204 402\n' +
                't=60s   2.71 1.17 0.47 5/204 403\n' +
                't=90s   3.22 1.44 0.59 5/204 404\n' +
                't=120s  3.53 1.69 0.70 5/204 405\n' +
                't=150s  3.71 1.91 0.80 5/204 406\n' +
                't=180s  3.83 2.11 0.90 5/204 407' },
        { t: 'code', where: 'wsl', lang: 'bash', code: 'top -b -n 1 | head -3' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'top - 21:41:07 up 9 min,  0 users,  load average: 3.83, 2.11, 0.90\n' +
                'Tasks:  30 total,   5 running,  25 sleeping,   0 stopped,   0 zombie\n' +
                '%Cpu(s): 66.7 us,  0.0 sy,  0.0 ni, 33.3 id,  0.0 wa,  0.0 hi,  0.0 si' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'for p in $(jobs -p); do kill -9 "$p"; done\nsleep 5\ncat /proc/loadavg\ntop -b -n 1 | head -3' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '3.52 2.08 0.90 1/192 431\n' +
                'top - 21:41:14 up 9 min,  0 users,  load average: 3.52, 2.08, 0.90\n' +
                'Tasks:  30 total,   1 running,  29 sleeping,   0 stopped,   0 zombie\n' +
                '%Cpu(s):  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si' },
        { t: 'cal', kind: 'info',
          x: 'Cột <code>5/204</code> là "5 tiến trình đang chạy trên tổng số 204 luồng", và ' +
             '<code>%Cpu(s) 66.7 us</code> đúng bằng 4/6 — bốn nhân bận trên sáu nhân.' }
      ],
      hint: 'Hai câu hỏi tách rời nhau: (1) vì sao con số <i>bò lên</i> chứ không nhảy thẳng ' +
            'tới 4.00, và (2) vì sao sau khi giết hết, load vẫn 3.52 trong khi CPU rỗi 100%.',
      crit: [
        'Nói load average là <b>trung bình trượt</b> (chạy trung bình theo thời gian), không phải giá trị tức thời',
        'Nêu hằng số thời gian ~60 giây cho cột thứ nhất, nên nó cần vài phút mới tiệm cận giá trị thật',
        'Chỉ ra giá trị đích là <b>4.00</b> (bốn vòng lặp), và 3.83 ở t=180s là đang tiệm cận chứ chưa tới',
        'Giải thích lần đo cuối: load 3.52 nhưng <code>100.0 id</code> — vì load là <b>di sản của ba phút vừa qua</b>, không phải ảnh chụp lúc này',
        'Nói rõ để đọc "CPU đang bận bao nhiêu <b>lúc này</b>" thì phải nhìn <code>%Cpu(s)</code> hoặc cột <code>running</code>, không nhìn load'
      ],
      sol: '<p><b>Vì sao nó bò lên.</b> Load average không phải phép đo tức thời mà là ' +
           '<b>trung bình trượt hàm mũ</b>. Cột thứ nhất có hằng số thời gian 60 giây: mỗi ' +
           'lần cập nhật, nó chỉ dịch một phần nhỏ về phía giá trị thật. Giá trị thật ở đây ' +
           'là 4.00 (bốn tiến trình luôn sẵn sàng chạy). Khởi điểm là 0.47, nên đường cong ' +
           'là <code>L(t) = 4 − 3.53·e^(−t/60)</code>. Thay số: t=60 cho 2.70 (đo được ' +
           '2.71), t=120 cho 3.52 (đo được 3.53), t=180 cho 3.82 (đo được 3.83). Khớp tới ' +
           '0.01 ở cả sáu điểm — nó không "sai", nó <b>trễ</b> đúng như thiết kế.</p>' +
           '<p><b>Vì sao load 3.52 trên một CPU rỗi hoàn toàn.</b> Lần đọc cuối là 5 giây ' +
           'sau khi bốn vòng lặp chết. <code>%Cpu(s): 100.0 id</code> và ' +
           '<code>1 running</code> nói về <b>lúc này</b>; <code>load average: 3.52</code> ' +
           'nói về <b>một phút vừa qua</b>, mà một phút vừa qua thì máy vẫn đang gồng. Cùng ' +
           'một màn hình <code>top</code>, hai khung thời gian khác nhau, nên chúng mâu ' +
           'thuẫn nhau là chuyện bình thường.</p>' +
           '<p><b>Hệ quả thực dụng.</b> Load average trả lời "máy này có bị quá tải kéo ' +
           'dài không", chứ không trả lời "ngay bây giờ có bận không". Đứng trước một sự cố ' +
           'đang diễn ra, hãy đọc <code>%Cpu(s)</code>, cột <code>running</code>, và ba cột ' +
           'load cạnh nhau: 1 phút &gt; 5 phút &gt; 15 phút là tình hình đang xấu đi, còn ' +
           '1 phút &lt; 15 phút là cơn bão đã qua.</p>' },

    { id: 'b2', k: 'free', truc: 2, tag: 'Đọc output', rows: 8,
      q: 'Tôi cho chạy ba lệnh nền trong <b>một</b> terminal, rồi in bảng job của bash và ' +
         'bảng tiến trình của kernel cạnh nhau. Hãy nói rõ: thông tin nào chỉ bash biết, ' +
         'thông tin nào chỉ kernel biết, và cột nào là cây cầu duy nhất nối hai bảng.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'sleep 60 &\nsleep 30 &\nsleep 45 &\njobs\njobs -l\nps -o pid,ppid,stat,comm --no-headers' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '[1]   Running                 sleep 60 &\n' +
                '[2]-  Running                 sleep 30 &\n' +
                '[3]+  Running                 sleep 45 &\n' +
                '\n' +
                '[1]   436 Running                 sleep 60 &\n' +
                '[2]-  437 Running                 sleep 30 &\n' +
                '[3]+  438 Running                 sleep 45 &\n' +
                '\n' +
                '    318     317 Ss+  bash\n' +
                '    436     318 S    sleep\n' +
                '    437     318 S    sleep\n' +
                '    438     318 S    sleep\n' +
                '    439     318 R    ps' },
        { t: 'code', where: 'wsl', lang: 'bash', code: 'kill %2\njobs\njobs' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '[2]-  Terminated              sleep 30\n' +
                '\n' +
                '[1]-  Running                 sleep 60 &\n' +
                '[3]+  Running                 sleep 45 &' },
      ],
      hint: 'Chú ý bốn thứ: cột <code>[N]</code>, cột <code>PPID</code>, dấu <code>+</code> ' +
            'và <code>-</code>, và việc <code>jobs</code> chạy <b>hai lần liên tiếp</b> lại ' +
            'cho hai kết quả khác nhau.',
      crit: [
        'Nói số <code>[1] [2] [3]</code>, dấu <code>+</code>/<code>-</code> và chữ <code>Running</code>/<code>Terminated</code> là do <b>bash</b> tự ghi — kernel không có khái niệm này',
        'Nói <code>PID</code>, <code>PPID</code> và <code>STAT</code> là của <b>kernel</b>',
        'Chỉ ra <b>PID</b> là cây cầu duy nhất, và <code>jobs -l</code> chính là lệnh in nó ra',
        'Nêu <code>PPID = 318</code> của cả ba tiến trình = PID của bash: chúng là <b>con</b> của shell này, nên chỉ shell này ghi sổ chúng',
        'Giải thích vì sao <code>jobs</code> lần đầu in <code>[2]- Terminated</code> còn lần thứ hai thì không: bash báo cáo cái chết <b>một lần rồi xoá dòng đó khỏi sổ</b>',
        'Nêu hệ quả: từ terminal khác, <code>%2</code> vô nghĩa — phải dùng PID 437'
      ],
      sol: '<p><b>Chỉ bash biết:</b> số job <code>[1] [2] [3]</code>, dấu <code>+</code> ' +
           '(job mặc định, cái mà <code>fg</code> không tham số sẽ kéo về) và <code>-</code> ' +
           '(job kế tiếp), chuỗi lệnh gốc <code>sleep 60 &amp;</code>, và chữ ' +
           '<code>Running</code>/<code>Terminated</code>. Toàn bộ là biến trong bộ nhớ của ' +
           'tiến trình bash 318. Không có file nào, không có lời gọi hệ thống nào để đọc ' +
           'chúng.</p>' +
           '<p><b>Chỉ kernel biết:</b> <code>PID</code>, <code>PPID</code>, ' +
           '<code>STAT</code>. <code>ps</code> lấy chúng bằng cách đọc <code>/proc</code> ' +
           '(Bài 5), thứ mà bất kỳ tiến trình nào trên máy cũng đọc được.</p>' +
           '<p><b>Cây cầu là PID</b>, và <code>jobs -l</code> là lệnh in ra cả hai phía cùng ' +
           'lúc: <code>[2]- 437 Running</code>. Ba tiến trình đều có ' +
           '<code>PPID = 318</code>, đúng bằng PID của bash — chúng là con của shell này, và ' +
           'đó là lý do <b>chỉ</b> shell này ghi sổ chúng.</p>' +
           '<p><b>Hai lần <code>jobs</code>, hai kết quả.</b> Lần đầu, bash vừa nhận tin job ' +
           '2 đã chết nên báo <code>[2]- Terminated</code>. Báo xong nó <b>xoá dòng đó khỏi ' +
           'sổ</b>: một job đã chết và đã được báo cáo thì không còn việc gì để theo dõi. ' +
           'Lần thứ hai chỉ còn job 1 và 3 — và để ý dấu <code>-</code> đã nhảy sang job 1, ' +
           'vì bash phải chọn lại job "kế tiếp".</p>' +
           '<p><b>Hệ quả.</b> Mở terminal thứ hai và gõ <code>kill %2</code> sẽ nhận ' +
           '<code>bash: kill: %2: no such job</code>. Cuốn sổ nằm trong bash 318, không nằm ' +
           'trên máy. Từ chỗ khác, đường vào duy nhất là <code>kill 437</code>.</p>' },

    { id: 'b3', k: 'free', truc: 0, tag: 'Giải thích vì sao', rows: 8,
      q: 'Tôi viết một script bắt <code>SIGTERM</code> và <code>SIGINT</code> rồi cố tình ' +
         '<b>không</b> thoát, cho chạy nền, và bắn cả ba tín hiệu vào nó. Sau đó tôi đo mã ' +
         'thoát của một <code>sleep</code> bình thường dưới ba tín hiệu ấy. Hãy giải thích ' +
         'vì sao hai bản ghi này cùng nói một điều, và điều đó là gì.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'cat stubborn.sh' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '#!/bin/bash\n' +
                'trap \'echo "[stubborn] caught SIGTERM, staying"\' TERM\n' +
                'trap \'echo "[stubborn] caught SIGINT, staying"\'  INT\n' +
                'echo "[stubborn] started, PID=$$"\n' +
                'while true; do sleep 1; done' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: './stubborn.sh & B=$!\nkill -TERM $B; sleep 1; ps -o pid,stat,comm -p $B --no-headers\nkill -INT  $B; sleep 1; ps -o pid,stat,comm -p $B --no-headers\nkill -KILL $B; sleep 1; ps -o pid,stat,comm -p $B --no-headers; echo "rc=$?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '[stubborn] started, PID=455\n' +
                '[stubborn] caught SIGTERM, staying\n' +
                '    455 S    stubborn.sh\n' +
                '[stubborn] caught SIGINT, staying\n' +
                '    455 S    stubborn.sh\n' +
                'Killed\n' +
                'rc=1' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'sleep 30 & P=$!; kill -TERM $P; wait $P; echo "rc_term=$?"\nsleep 30 & P=$!; kill -KILL $P; wait $P; echo "rc_kill=$?"\nsleep 30 & P=$!; kill -INT  $P; wait $P; echo "rc_int=$?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'rc_term=143\n' +
                '449 Killed                  sleep 30\n' +
                'rc_kill=137\n' +
                'rc_int=130' },
      ],
      hint: 'Ba mã thoát 143, 137, 130 đều là <code>128 + n</code>. Tra <code>kill -l</code> ' +
            'xem <code>n</code> là tín hiệu nào, rồi hỏi: vì sao <code>stubborn.sh</code> ' +
            'sống qua được hai trong ba tín hiệu đó?',
      crit: [
        'Giải mã 143 = 128+15 (SIGTERM), 137 = 128+9 (SIGKILL), 130 = 128+2 (SIGINT)',
        'Nói <code>trap</code> đăng ký hàm xử lý, nên SIGTERM và SIGINT <b>đến tay chương trình</b> và chương trình quyết định làm gì',
        'Chỉ ra <code>ps</code> vẫn thấy PID 455 ở trạng thái <code>S</code> sau cả hai — bằng chứng nó còn sống nguyên vẹn',
        'Nói SIGKILL không đến tay chương trình mà do <b>kernel</b> thi hành, nên không trap được',
        'Rút ra: <code>kill</code> mặc định là một <b>lời đề nghị</b>, chỉ <code>-9</code> là mệnh lệnh',
        'Nêu cái giá: dưới SIGKILL chương trình không chạy thêm một lệnh nào — buffer chưa ghi là mất, file tạm và khoá còn nguyên'
      ],
      sol: '<p><b>Đọc ba mã thoát.</b> Khi một tiến trình chết vì tín hiệu số ' +
           '<code>n</code>, shell báo mã thoát <code>128 + n</code>. Vậy 143 = 128+15 = ' +
           'SIGTERM, 137 = 128+9 = SIGKILL, 130 = 128+2 = SIGINT. Một ' +
           '<code>sleep</code> bình thường chết dưới cả ba.</p>' +
           '<p><b>Đọc bản ghi <code>stubborn.sh</code>.</b> Cùng SIGTERM và SIGINT đó, ' +
           'nhưng script này đã <code>trap</code> chúng. Tín hiệu <b>vẫn đến nơi</b> — bằng ' +
           'chứng là dòng <code>caught SIGTERM, staying</code> được in ra. Khác biệt là ' +
           'kernel giao tín hiệu cho <i>chương trình</i> xử lý, và chương trình chọn ở lại. ' +
           '<code>ps</code> xác nhận: PID 455 vẫn <code>S</code> sau cả hai lần bắn.</p>' +
           '<p><b>Rồi SIGKILL.</b> Không có dòng <code>caught</code> nào, vì không có gì để ' +
           'bắt: SIGKILL không được giao cho chương trình, kernel tự tay gỡ tiến trình khỏi ' +
           'hệ thống. Shell in <code>Killed</code>, và <code>ps -p 455</code> trả về 1 vì ' +
           'không còn PID đó nữa.</p>' +
           '<p><b>Điều cả hai bản ghi cùng nói.</b> <code>kill</code> không tham số ' +
           '<b>không giết ai cả</b> — nó gửi một lời đề nghị mà chương trình có toàn quyền ' +
           'từ chối. Chỉ <code>kill -9</code> là mệnh lệnh. Và đó chính là lý do đừng gõ ' +
           '<code>-9</code> theo phản xạ: cái giá của mệnh lệnh là chương trình không có ' +
           'lấy một mili-giây nào để ghi nốt buffer xuống flash, đóng file, xoá file tạm hay ' +
           'nhả khoá. Với một trình ghi log trên thiết bị nhúng, khoảng thời gian bạn ' +
           '<i>không</i> cho nó chính là dữ liệu bạn mất.</p>' },

    { id: 'b4', k: 'free', tag: 'Giải thích vì sao', rows: 7,
      q: 'Bài 9 nói máy này có 56 tiến trình. Tôi kiểm chứng lại: đúng 56 thật, nhưng đọc ' +
         'lại sau 30 giây thì chỉ còn 27. Không có ai đăng nhập, không ai chạy gì. Tôi chụp ' +
         '<code>ps -e -o comm</code> tám lần cách nhau 10 giây rồi so từng cặp bằng ' +
         '<code>comm -23</code>. Kết quả ở dưới. Hãy giải thích hiện tượng, và nói xem con ' +
         'số nào mới là con số nên trích dẫn.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'for i in 1 2 3 4 5 6 7 8; do\n  ps -e -o comm --no-headers | sort > "/tmp/snap$i.txt"\n  printf \'i=%s uptime=%s count=%s\\n\' "$i" "$(cut -d\' \' -f1 /proc/uptime)" "$(wc -l < /tmp/snap$i.txt)"\n  sleep 10\ndone' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'i=1 uptime=8.15  count=57\n' +
                'i=2 uptime=18.30 count=27\n' +
                'i=3 uptime=28.42 count=27\n' +
                'i=4 uptime=38.55 count=26\n' +
                'i=5 uptime=48.68 count=26\n' +
                'i=6 uptime=58.80 count=27\n' +
                'i=7 uptime=68.93 count=27\n' +
                'i=8 uptime=79.05 count=26' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'comm -23 /tmp/snap1.txt /tmp/snap2.txt | sort | uniq -c | sort -rn | head -4' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '     28 (udev-worker)\n' +
                '      1 snapd' },
      ],
      hint: 'Đừng dừng ở "máy mới khởi động thì nhiều tiến trình hơn". Câu hỏi thật là: ' +
            '<b>28 tiến trình cùng tên</b> ấy đang làm gì, và vì sao chúng đi cùng lúc?',
      crit: [
        'Nhận ra 28 trong 30 tiến trình biến mất là <code>(udev-worker)</code>, cùng một tên',
        'Giải thích udev: lúc khởi động, kernel báo cáo <b>toàn bộ</b> thiết bị nó tìm thấy, và <code>systemd-udevd</code> sinh nhiều tiến trình con song song để xử lý cho nhanh',
        'Nói chúng là tiến trình <b>ngắn hạn</b>: xử lý xong sự kiện là thoát, chứ không phải bị lỗi hay bị giết',
        'Nêu <code>snapd</code> là dịch vụ khởi động chậm, chạy xong phần việc đầu rồi mới ổn định',
        'Kết luận: 56 là con số của một máy <b>vừa khởi động xong vài giây</b>; trạng thái ổn định là 26–27',
        'Rút ra nguyên tắc đo: một con số đếm tiến trình chỉ có nghĩa khi kèm theo thời điểm đo (<code>uptime</code>)'
      ],
      sol: '<p><b>Chuyện gì xảy ra.</b> Ngay sau khi kernel khởi động, nó phát hiện ra toàn ' +
           'bộ thiết bị của máy và bắn một loạt sự kiện "có thiết bị mới" lên user space. ' +
           '<code>systemd-udevd</code> nhận loạt sự kiện đó và, để xử lý cho nhanh, sinh ra ' +
           'nhiều tiến trình con <code>(udev-worker)</code> chạy song song — mỗi worker lo ' +
           'một sự kiện: nạp driver, tạo node trong <code>/dev</code> (Bài 5), đặt tên và ' +
           'quyền cho nó. Xử lý xong là worker <b>thoát</b>. Đó là công việc bùng lên rồi ' +
           'tắt, không phải sự cố.</p>' +
           '<p><b>Vì sao 30 tiến trình đi cùng lúc.</b> 28 trong số đó là udev worker kết ' +
           'thúc cùng đợt, cộng <code>snapd</code> vừa xong phần khởi tạo. Đọc ' +
           '<code>uptime</code>: lần đo đầu ở giây thứ 8, lần thứ hai ở giây thứ 18. Cả ' +
           'cuộc đời của 28 tiến trình đó gói gọn trong mười giây ấy.</p>' +
           '<p><b>Con số nào nên trích dẫn.</b> Cả hai, nhưng phải kèm thời điểm. ' +
           '<b>56–57</b> là ảnh chụp một máy vừa khởi động xong vài giây; <b>26–27</b> là ' +
           'trạng thái ổn định. Trích 56 mà không nói "lúc mới khởi động" thì người đọc sẽ ' +
           'đo lại và tưởng mình làm sai.</p>' +
           '<p><b>Bài học nghề.</b> Mọi con số đếm được trên một hệ thống đang chạy đều là ' +
           'hàm của thời điểm đo. Trên thiết bị nhúng bạn sẽ gặp đúng kiểu bẫy này khi đo ' +
           'RAM trống hay thời gian boot: đo ở giây thứ 5 và giây thứ 60 cho hai câu chuyện ' +
           'khác hẳn nhau, và cả hai đều đúng.</p>' },

    { id: 'b5', k: 'free', tag: 'So sánh cặp', rows: 7,
      q: 'Trong bảng dưới đây, <code>wsl-pro-service</code> có <code>VSZ</code> lớn gấp ' +
         '<b>40 lần</b> <code>unattended-upgr</code>, nhưng lại nằm <b>cuối</b> bảng khi sắp ' +
         'theo <code>RSS</code>. Hai cột này khác nhau ở đâu, và trên một bo mạch có 128 MB ' +
         'RAM thì <b>khác biệt nào mới là khác biệt đáng kể</b>?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'ps -e -o pid,vsz,rss,comm --sort=-rss --no-headers | head -6' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '    252  123460  32832 unattended-upgr\n' +
                '    141   44096  29764 networkd-dispat\n' +
                '     46   42236  16624 systemd-journal\n' +
                '      1   24140  15372 systemd\n' +
                '    153 1792300  14932 wsl-pro-service\n' +
                '     78   22416  14508 systemd-resolve' },
        { t: 'cal', kind: 'info',
          x: 'Cả hai cột đều tính bằng <b>KB</b>. <code>1792300 KB</code> ≈ 1.7 GiB, trong ' +
             'khi cả máy chỉ có 4918 MiB RAM.' }
      ],
      hint: 'Nếu <code>VSZ</code> là RAM thật thì riêng tiến trình 153 đã ăn hết một phần ba ' +
            'bộ nhớ máy. Nó không ăn. Vậy 1.7 GiB kia là cái gì?',
      crit: [
        '<code>VSZ</code> = kích thước <b>không gian địa chỉ ảo</b>: tổng mọi vùng đã được ánh xạ, kể cả vùng chưa hề chạm tới',
        '<code>RSS</code> = số trang <b>thật sự đang nằm trong RAM vật lý</b>',
        'Giải thích vì sao VSZ có thể khổng lồ: chương trình đặt chỗ trước (thường gặp ở runtime Go/Java), ánh xạ file, thư viện dùng chung — đặt chỗ không tốn RAM cho tới khi có ghi vào',
        'Nói rõ trên bo mạch 128 MB, cái ép bạn là <b>RSS</b> (và swap), không phải VSZ',
        'Nêu cảnh báo: RSS vẫn đếm cả trang dùng chung, nên cộng RSS của mọi tiến trình sẽ ra số lớn hơn RAM thật sự dùng'
      ],
      sol: '<p><b><code>VSZ</code> là bản đồ, <code>RSS</code> là lãnh thổ.</b> VSZ đếm mọi ' +
           'thứ đã được ánh xạ vào không gian địa chỉ ảo của tiến trình: mã lệnh, thư viện, ' +
           'heap, stack, và cả những vùng nó mới chỉ <i>đặt chỗ</i> chứ chưa hề ghi vào. ' +
           'Nhờ MMU (Bài 1), đặt chỗ không tốn một byte RAM vật lý nào — kernel chỉ ghi lại ' +
           '"vùng này về sau là của anh". RSS đếm phần đã thành hiện thực: số trang đang ' +
           'thực sự nằm trong RAM.</p>' +
           '<p><b>Vì sao 1.7 GiB.</b> <code>wsl-pro-service</code> viết bằng Go, và runtime ' +
           'Go đặt chỗ trước một vùng địa chỉ ảo rất lớn ngay lúc khởi động để quản lý heap. ' +
           'Bản đồ rộng 1.7 GiB, lãnh thổ thật vỏn vẹn 14.6 MiB.</p>' +
           '<p><b>Trên bo mạch 128 MB, khác biệt đáng kể là RSS.</b> Thứ làm cạn RAM và ' +
           'triệu tập OOM killer là số trang vật lý đang bị chiếm, tức RSS. VSZ lớn chỉ gây ' +
           'phiền khi không gian địa chỉ ảo bị hạn hẹp — chuyện có thật trên vi xử lý 32 ' +
           'bit, nơi mỗi tiến trình chỉ có 3 GiB để đặt chỗ, nhưng không phải nút thắt trên ' +
           'hệ 64 bit.</p>' +
           '<p><b>Một cái bẫy nữa, để dành cho câu C5.</b> RSS cũng chưa phải con số sạch: ' +
           'nó tính <b>trọn vẹn</b> các trang dùng chung. <code>libc</code> nằm trong RSS ' +
           'của mọi tiến trình trên máy, nhưng trong RAM chỉ có <b>một</b> bản.</p>' },

    { id: 'b6', k: 'free', tag: 'Bắt lỗi phát biểu', rows: 6,
      q: 'Một đồng nghiệp viết trong báo cáo sự cố: <i>"Cột <code>TIME</code> của ' +
         '<code>ps</code> là thời gian tiến trình đã sống. Tiến trình 415 có ' +
         '<code>TIME 00:00:40</code> còn tiến trình 414 chỉ có <code>00:00:00</code>, nên ' +
         '415 đã chạy được 40 giây còn 414 thì vừa mới khởi động."</i> Chỉ ra chỗ sai và ' +
         'viết lại cho đúng. Số đo thật ở dưới.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'sleep 90 & S=$!\n( while :; do :; done ) & B=$!\nsleep 40\nps -o pid,etime,time,stat,comm -p "$S" -p "$B" --no-headers' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '    414       00:40 00:00:00 S    sleep\n' +
                '    415       00:40 00:00:40 R    bash' },
      ],
      hint: 'Hai tiến trình được cho chạy trong <b>cùng một giây</b>. Cột nào chứng minh ' +
            'điều đó, và cột nào nói chuyện khác?',
      crit: [
        'Chỉ ra chỗ sai: <code>TIME</code> là thời gian <b>CPU</b> đã tiêu thụ, không phải tuổi đời',
        'Nêu cột đúng để đọc tuổi đời là <code>ETIME</code> (hoặc <code>START</code>)',
        'Dùng số đo bác lại: cả hai đều <code>ETIME 00:40</code> — chúng khởi động cùng lúc',
        'Giải thích 414 có TIME 0: <code>sleep</code> ngủ suốt, trạng thái <code>S</code>, không dùng CPU',
        'Giải thích 415 có TIME 40: vòng lặp bận chiếm CPU liên tục, trạng thái <code>R</code>',
        'Nói thêm: trên máy nhiều nhân, TIME có thể <b>lớn hơn</b> ETIME nếu tiến trình chạy nhiều luồng'
      ],
      sol: '<p><b>Chỗ sai.</b> <code>TIME</code> là <b>thời gian CPU tích luỹ</b> — tổng số ' +
           'giây tiến trình thực sự được chạy trên CPU — chứ không phải tuổi đời. Cột chỉ ' +
           'tuổi đời là <code>ETIME</code> (elapsed time), hoặc <code>START</code> nếu bạn ' +
           'muốn biết mốc bắt đầu.</p>' +
           '<p><b>Số đo bác lại ngay lập tức.</b> Cả 414 và 415 đều có ' +
           '<code>ETIME 00:40</code>: chúng được cho chạy trong cùng một giây, và cùng sống ' +
           '40 giây. Chênh lệch nằm ở chỗ khác. 414 là <code>sleep 90</code>, ngủ suốt bốn ' +
           'mươi giây đó — <code>STAT</code> là <code>S</code>, <code>TIME</code> là ' +
           '<code>00:00:00</code>. 415 là vòng lặp bận, chiếm CPU không nghỉ — ' +
           '<code>STAT</code> là <code>R</code>, <code>TIME</code> gần đúng bằng ' +
           '<code>ETIME</code>.</p>' +
           '<p><b>Viết lại.</b> "Cột <code>TIME</code> của <code>ps</code> là thời gian CPU ' +
           'mà tiến trình đã tiêu thụ. Tiến trình 414 và 415 cùng có ' +
           '<code>ETIME 00:40</code> nên khởi động cùng lúc và cùng sống 40 giây; nhưng 415 ' +
           'dùng hết 40 giây CPU còn 414 không dùng giây nào, vì nó ngủ suốt."</p>' +
           '<p><b>Một hệ quả hay quên.</b> Trên máy nhiều nhân, một tiến trình chạy 4 luồng ' +
           'trong 40 giây thực sẽ có <code>TIME</code> lên tới 160 giây, tức ' +
           '<b>lớn hơn</b> <code>ETIME</code>. Nếu <code>TIME</code> là tuổi đời thì con số ' +
           'ấy đã là vô lý.</p>' },
  ],

  /* ═══ C · Vận dụng — 2 chẩn đoán + 2 tình huống mới + 1 tính toán ═══════ */
  C: [
    { id: 'c1', k: 'free', truc: 1, tag: 'Chẩn đoán', rows: 8,
      q: 'Một bo mạch nhúng <b>1 nhân</b> ghi log xuống thẻ SD. Khách hàng báo "máy chậm ' +
         'kinh khủng, chắc CPU yếu quá". Bạn ssh vào và chạy <code>top</code>. Màn hình như ' +
         'dưới đây. Hãy nói: nút thắt nằm ở đâu, bằng chứng nào trong màn hình này chứng ' +
         'minh điều đó, và <b>vì sao</b> đề xuất "đổi sang CPU mạnh hơn" sẽ không cứu được gì.',
      blocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'top - 03:12:44 up 6 days,  2:41,  1 user,  load average: 8.14, 7.92, 7.55\n' +
                'Tasks:  61 total,   0 running,  53 sleeping,   0 stopped,   0 zombie\n' +
                '%Cpu(s):  0.7 us,  1.4 sy,  0.0 ni,  0.0 id, 97.6 wa,  0.3 hi,  0.0 si\n' +
                'MiB Mem :    242.1 total,     18.4 free,     71.2 used,    152.5 buff/cache\n' +
                '\n' +
                '  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n' +
                '  812 root      20   0    9184   3120    920 D   0.3   1.3   0:41.02 logrotate\n' +
                '  455 root      20   0   21440   6884   3012 D   0.3   2.8  12:07.55 datalogger\n' +
                '  901 root      20   0    8112   2960    884 D   0.0   1.2   0:00.31 rsync\n' +
                '    1 root      20   0   24140  10388   6244 S   0.0   4.3   0:52.10 systemd' },
        { t: 'cal', kind: 'info',
          x: 'Nhắc lại một cột của <code>top</code> mà Bài 9 mới chỉ kịp gọi tên: ' +
             '<code>wa</code> là <b>iowait</b> — phần trăm thời gian CPU <i>rỗi nhưng đang ' +
             'chờ</i> một thao tác đọc/ghi đĩa hoàn tất.' }
      ],
      hint: 'Ba con số trong màn hình này mâu thuẫn với chẩn đoán "CPU yếu": ' +
            '<code>0 running</code>, <code>0.0 id</code> và cột <code>S</code> của ba tiến ' +
            'trình đầu bảng.',
      crit: [
        'Nói nút thắt là <b>I/O</b> (thẻ SD), không phải CPU',
        'Dùng <code>97.6 wa</code> làm bằng chứng: CPU dành gần như toàn bộ thời gian chờ đĩa',
        'Dùng <code>0 running</code> và <code>%CPU</code> gần 0 của mọi tiến trình: không ai đang tính toán cả',
        'Chỉ ra ba tiến trình đầu bảng đều ở <code>STAT = D</code> — ngủ không ngắt được, đang chờ I/O',
        'Giải thích load 8.14 vẫn cao <b>vì load cộng cả tiến trình D</b>, chứ không chỉ tiến trình đang chạy',
        'Kết luận: đổi CPU không cứu được vì CPU đang <i>rỗi</i>; phải sửa ở phía lưu trữ hoặc phía lượng ghi'
      ],
      sol: '<p><b>Nút thắt là thẻ SD, không phải CPU.</b> Ba con số nói thẳng điều đó. ' +
           '<code>97.6 wa</code>: gần như toàn bộ thời gian, CPU không làm gì ngoài chờ ' +
           'đĩa. <code>0 running</code>: không có một tiến trình nào đang thực sự tính ' +
           'toán. Và cột <code>S</code> của ba tiến trình đầu bảng đều là <code>D</code> — ' +
           'ngủ không ngắt được, tức là đang mắc kẹt giữa chừng một lời gọi đọc/ghi.</p>' +
           '<p><b>Vì sao load vẫn 8.14.</b> Đây chính là chỗ trực giác đánh lừa. Load ' +
           'average <b>không</b> đếm mức bận của CPU; nó đếm số tiến trình ở trạng thái ' +
           '<code>R</code> <b>cộng</b> <code>D</code>. Ở đây phần lớn 8.14 đến từ những ' +
           'tiến trình đang xếp hàng chờ thẻ SD. Load cao và CPU rỗi 100% cùng lúc là hoàn ' +
           'toàn nhất quán — chỉ trái với cách đọc load như một phần trăm CPU.</p>' +
           '<p><b>Vì sao CPU mạnh hơn không cứu được gì.</b> Không thể tăng tốc một thứ đang ' +
           'đứng yên chờ. CPU hiện tại đã rỗi 97.6% thời gian; thay bằng con nhanh gấp đôi ' +
           'thì nó rỗi 98.8% thời gian, và thẻ SD vẫn đúng tốc độ cũ. Đây là dạng sai lầm ' +
           'đắt tiền nhất trong nghề nhúng: đổi linh kiện dựa trên một con số đọc sai.</p>' +
           '<p><b>Hướng sửa thật.</b> Nhìn về phía lưu trữ và về phía lượng ghi: thẻ SD ' +
           'loại rẻ ghi ngẫu nhiên rất chậm và chậm dần theo tuổi; ' +
           '<code>datalogger</code> có thể đang <code>fsync()</code> sau mỗi dòng log thay ' +
           'vì gom lại theo lô; <code>logrotate</code> và <code>rsync</code> đang chạy cùng ' +
           'lúc lúc 3 giờ sáng và giẫm chân nhau. Công cụ để đo tiếp là ' +
           '<code>iostat</code> và <code>iotop</code> — Chặng 09 sẽ quay lại chuyện này.</p>' },

    { id: 'c2', k: 'free', tag: 'Chẩn đoán', rows: 8,
      q: 'Một thiết bị chạy 24/7 có script khởi động như dưới đây, và một script dừng tương ' +
         'ứng. Mọi thứ chạy tốt hàng tháng trời. Rồi một đêm, sau khi ' +
         '<code>stop-logger.sh</code> chạy, <b>dịch vụ SSH của thiết bị chết</b> và không ai ' +
         'vào được nữa cho tới khi có người ra tận nơi cắm lại điện. Hãy giải thích chuỗi sự ' +
         'kiện dẫn tới đó, và nói rõ giả định sai nằm ở dòng nào.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '# start-logger.sh\n' +
                '/usr/bin/datalogger --daemon &\n' +
                'echo $! > /run/logger.pid\n' +
                '\n' +
                '# stop-logger.sh\n' +
                'kill -9 "$(cat /run/logger.pid)"\n' +
                'rm -f /run/logger.pid' },
        { t: 'cal', kind: 'info',
          x: 'Dữ kiện thu được từ log: <code>datalogger</code> đã tự thoát vì lỗi ổ đĩa ' +
             'lúc 02:14, còn <code>stop-logger.sh</code> chạy theo lịch lúc 03:00. Thiết bị ' +
             'này đặt <code>kernel.pid_max = 4096</code>.' }
      ],
      hint: 'Giữa 02:14 và 03:00, số PID ghi trong <code>/run/logger.pid</code> vẫn nằm đó. ' +
            'Kernel thì không biết file đó tồn tại.',
      crit: [
        'Nói <code>datalogger</code> đã chết từ 02:14, nên PID trong file trở thành <b>PID mồ côi</b> (stale pidfile)',
        'Nói số PID được kernel <b>dùng lại</b> sau khi tiến trình cũ chết — PID không phải định danh vĩnh viễn',
        'Chỉ ra <code>pid_max = 4096</code> làm vòng quay PID rất ngắn, nên trong 46 phút một tiến trình mới rất dễ nhận đúng số đó',
        'Kết luận: <code>kill -9</code> bắn trúng một tiến trình <b>hoàn toàn khác</b> — lần này là sshd',
        'Chỉ ra giả định sai: "số PID trong file vẫn là tiến trình của tôi"',
        'Đề xuất cách sửa: kiểm tra tiến trình có đúng là của mình không trước khi bắn (ví dụ đọc <code>/proc/PID/comm</code>), hoặc dùng <code>kill -0</code> để kiểm tra, hoặc bỏ hẳn pidfile và giao cho systemd/cgroup quản lý'
      ],
      sol: '<p><b>Chuỗi sự kiện.</b> 02:14 — <code>datalogger</code> tự thoát vì lỗi ổ đĩa. ' +
           'Kernel thu hồi PID của nó và trả số đó về kho. File ' +
           '<code>/run/logger.pid</code> vẫn nằm nguyên trên đĩa với con số cũ: nó chỉ là ' +
           'một file văn bản, không ai cập nhật nó cả. Trong 46 phút tiếp theo, máy tạo ' +
           'thêm tiến trình mới; với <code>pid_max = 4096</code>, bộ đếm PID quay vòng rất ' +
           'nhanh và đến lượt <code>sshd</code> nhận đúng con số ấy. 03:00 — ' +
           '<code>stop-logger.sh</code> đọc file, thấy con số, và bắn <code>SIGKILL</code> ' +
           'vào <code>sshd</code>.</p>' +
           '<p><b>Giả định sai nằm ở dòng <code>kill -9 "$(cat /run/logger.pid)"</code>.</b> ' +
           'Nó ngầm cho rằng số PID là một định danh vĩnh viễn của <i>chương trình của ' +
           'tôi</i>. Không phải: PID là một con số kernel <b>cho mượn</b>, thu về khi tiến ' +
           'trình chết và cho tiến trình khác mượn lại. Càng thiết bị nhỏ, ' +
           '<code>pid_max</code> càng thấp, vòng quay càng ngắn, cửa sổ nguy hiểm càng ' +
           'rộng.</p>' +
           '<p><b>Cái <code>-9</code> làm cho mọi thứ tệ hơn.</b> Nếu là ' +
           '<code>SIGTERM</code>, <code>sshd</code> ít nhất còn có cơ hội đóng phiên tử tế ' +
           'và ghi lại một dòng log nói ai đã giết nó. Với <code>SIGKILL</code>, không có ' +
           'gì cả — bạn ra tận nơi và không có manh mối nào trong log.</p>' +
           '<p><b>Sửa thế nào.</b> Ba mức, từ vá tạm đến làm đúng:</p>' +
           '<ul>' +
           '<li>Trước khi bắn, kiểm tra tiến trình đó có đúng là của mình không: đọc ' +
           '<code>/proc/$PID/comm</code> và so với tên chương trình mong đợi. Rẻ, và chặn ' +
           'gần hết trường hợp.</li>' +
           '<li>Dùng <code>SIGTERM</code>, chờ, rồi mới <code>SIGKILL</code> — và dùng ' +
           '<code>kill -0</code> để biết khi nào cần bước hai.</li>' +
           '<li>Bỏ hẳn pidfile. Giao cho <code>systemd</code>: nó theo dõi tiến trình bằng ' +
           '<b>cgroup</b> chứ không bằng một con số trong file, nên không có khe hở nào để ' +
           'PID bị dùng lại lọt qua. Đây là lý do thật khiến mọi bản phân phối nhúng hiện ' +
           'đại bỏ init script viết tay.</li>' +
           '</ul>' },

    { id: 'c3', k: 'free', truc: 0, tag: 'Tình huống mới', rows: 8,
      q: 'Thiết bị của bạn ghi số đo xuống flash và được tắt bằng cách <b>cắt điện</b> ' +
         'không báo trước. Trước khi cắt, một script chạy đoạn dưới đây. Kết quả: cứ vài ' +
         'chục lần tắt máy lại mất khoảng vài giây dữ liệu cuối, và thỉnh thoảng file ' +
         '<code>.tmp</code> còn sót lại làm lần khởi động sau bị lỗi. Bạn được phép sửa cả ' +
         'script lẫn chương trình <code>datalogger</code>. Hãy nói bạn sửa gì, ở đâu, và ' +
         '<b>vì sao thứ tự đó cứu được dữ liệu</b>.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '# shutdown-hook.sh, phiên bản đang chạy\n' +
                'pkill -9 datalogger\n' +
                'sync\n' +
                'poweroff' },
      ],
      hint: 'Câu hỏi không phải "dùng lệnh nào" mà "cho chương trình <b>bao nhiêu thời ' +
            'gian</b>, và nó dùng khoảng thời gian đó để làm gì".',
      crit: [
        'Thay <code>-9</code> bằng <code>SIGTERM</code> (mặc định) làm bước đầu tiên',
        'Thêm <b>khoảng chờ</b> giữa TERM và KILL, và kiểm tra tiến trình còn sống hay không trong lúc chờ (<code>kill -0</code> trong vòng lặp)',
        'Chỉ dùng <code>SIGKILL</code> làm phương án cuối, sau khi hết thời gian chờ',
        'Phía <code>datalogger</code>: cài <b>trình xử lý SIGTERM</b> để ghi nốt buffer, đổi tên file <code>.tmp</code> thành tên thật, rồi thoát',
        'Giải thích vì sao <code>-9</code> gây ra <b>cả hai</b> triệu chứng: không ghi nốt buffer (mất dữ liệu) và không dọn file tạm (kẹt <code>.tmp</code>)',
        'Nêu rằng nếu chuyển sang systemd thì đúng cơ chế này có sẵn: <code>ExecStop</code> + <code>TimeoutStopSec</code>, hết giờ mới <code>SIGKILL</code>'
      ],
      sol: '<p><b>Chẩn đoán.</b> <code>pkill -9</code> là mệnh lệnh: kernel gỡ ' +
           '<code>datalogger</code> khỏi hệ thống ngay lập tức, không cho nó chạy thêm một ' +
           'lệnh nào. Hai triệu chứng của khách hàng chính là hai việc mà chương trình ' +
           '<i>đáng lẽ</i> làm trong khoảnh khắc đó nhưng không được phép làm: (1) ghi nốt ' +
           'buffer trong bộ nhớ xuống flash → mất vài giây dữ liệu cuối; (2) đổi tên file ' +
           '<code>.tmp</code> thành tên chính thức và xoá rác → file <code>.tmp</code> còn ' +
           'sót. Lưu ý <code>sync</code> ở dòng sau <b>không</b> cứu được: nó đẩy cache của ' +
           'kernel xuống flash, nhưng dữ liệu còn nằm trong buffer <i>của chương trình</i> ' +
           'thì chưa bao giờ tới được kernel.</p>' +
           '<p><b>Sửa phía script — cho nó thời gian, nhưng có giới hạn.</b></p>',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '# shutdown-hook.sh, phiên bản đã sửa\n' +
                'PID="$(pgrep -x datalogger)"\n' +
                'if [ -n "$PID" ]; then\n' +
                '  kill -TERM "$PID"                 # a request, not an order\n' +
                '  for i in $(seq 1 10); do          # wait up to 5 seconds\n' +
                '    kill -0 "$PID" 2>/dev/null || break\n' +
                '    sleep 0.5\n' +
                '  done\n' +
                '  kill -0 "$PID" 2>/dev/null && kill -KILL "$PID"   # last resort only\n' +
                'fi\n' +
                'sync\n' +
                'poweroff' },
        { t: 'p',
          x: '<b>Sửa phía <code>datalogger</code> — dạy nó biết dọn dẹp.</b> Khoảng chờ ở ' +
             'trên chỉ có giá trị nếu chương trình <i>làm gì đó</i> trong khoảng đó. Nó cần ' +
             'một trình xử lý <code>SIGTERM</code> đặt cờ dừng, để vòng lặp chính thoát ra ' +
             'rồi lần lượt: ghi nốt buffer, gọi <code>fsync()</code>, đổi tên file ' +
             '<code>.tmp</code> thành tên chính thức, xoá rác, rồi thoát với mã 0.' },
        { t: 'cal', kind: 'why', title: 'Vì sao thứ tự đó cứu được dữ liệu',
          x: 'Dữ liệu phải đi qua <b>ba</b> lớp mới nằm yên trên flash: buffer của chương ' +
             'trình → cache của kernel → chip nhớ. <code>SIGKILL</code> chặn ở lớp đầu tiên ' +
             'nên hai lớp sau vô nghĩa, và <code>sync</code> ở dòng dưới không cứu được gì. ' +
             '<code>SIGTERM</code> cộng khoảng chờ mở lớp đầu; <code>fsync()</code> trong ' +
             'chương trình mở lớp thứ hai; <code>sync</code> ở cuối script chỉ là lưới an ' +
             'toàn. Còn việc đổi tên file <code>.tmp</code> giải quyết triệu chứng thứ hai: ' +
             'đổi tên là thao tác nguyên tử, nên lần khởi động sau chỉ nhìn thấy hoặc file ' +
             'cũ nguyên vẹn, hoặc file mới hoàn chỉnh, không bao giờ thấy file dở dang.' },
        { t: 'p',
          x: '<b>Và nếu chuyển sang systemd thì không phải viết gì cả.</b> Toàn bộ cơ chế ' +
             'trên là hành vi mặc định của một unit: systemd gửi <code>SIGTERM</code>, chờ ' +
             'đúng <code>TimeoutStopSec</code> (mặc định 90 giây, nhúng thường đặt xuống ' +
             '5–10 giây), rồi mới <code>SIGKILL</code>. Phần bạn vẫn phải tự làm là phía ' +
             'chương trình — không có hệ thống init nào biết cách ghi nốt buffer hộ bạn.' }
      ] },

    { id: 'c4', k: 'free', truc: 2, tag: 'Tình huống mới', rows: 8,
      q: 'Bạn ssh vào một máy build ở công ty và cần chạy một bản biên dịch kernel mất ' +
         'khoảng <b>40 phút</b>. Mạng nhà bạn hay rớt, và bạn cũng muốn đóng laptop đi ăn ' +
         'tối. Bạn gõ <code>make -j6 &amp;</code> rồi thấy <code>[1] 9271</code>. Hãy nói: ' +
         '(a) làm vậy có đủ an toàn không và vì sao; (b) chọn <b>một</b> trong bốn công cụ ' +
         'dưới đây và bảo vệ lựa chọn; (c) sau khi kết nối lại từ một máy khác, ' +
         '<code>jobs</code> sẽ hiện gì?',
      blocks: [
        { t: 'list', ordered: false, items: [
          '<code>nohup make -j6 &amp; </code>',
          '<code>make -j6 &amp;</code> rồi <code>disown %1</code>',
          '<code>tmux</code> (hoặc <code>screen</code>) rồi chạy <code>make -j6</code> bên trong',
          '<code>systemd-run --user --unit=build make -j6</code>'
        ] },
      ],
      hint: 'Phân biệt cho rõ ba thứ khác nhau: <b>tiến trình</b> có sống sót không, ' +
            '<b>bảng job</b> có còn không, và <b>output</b> đi đâu.',
      crit: [
        'Nói dấu <code>&amp;</code> một mình <b>không</b> đủ: tiến trình vẫn thuộc phiên của terminal, rớt mạng thì nhận <code>SIGHUP</code>',
        'Chỉ ra một vấn đề thứ hai mà <code>&amp;</code> không giải quyết: <b>output</b> vẫn đổ vào terminal, mất luôn khi phiên chết',
        'Chọn một công cụ và nêu lý do <b>hợp với ràng buộc</b> (build 40 phút, mạng chập chờn, muốn xem lại tiến độ)',
        'Nếu chọn <code>tmux</code>: nêu ưu điểm quyết định là <b>gắn lại được</b> và xem lại được output cuộn, thứ mà nohup/disown không cho',
        'Nếu chọn <code>nohup</code>/<code>disown</code>: nêu rõ output phải chuyển hướng ra file, và không xem tiến độ tương tác được',
        'Trả lời (c): <code>jobs</code> hiện <b>trống</b> — phiên ssh cũ đã chết cùng bảng job của nó; phiên mới là một bash khác, sổ trắng tinh',
        'Nói rõ tiến trình build vẫn còn (nếu đã chống SIGHUP), chỉ là <b>không còn là job của shell nào cả</b> — tìm bằng <code>pgrep</code>/<code>ps</code>, không tìm bằng <code>jobs</code>'
      ],
      sol: '<p><b>(a) <code>&amp;</code> một mình không đủ.</b> Dấu <code>&amp;</code> chỉ ' +
           'nói với bash "đừng chờ lệnh này, trả prompt lại cho tôi". Tiến trình 9271 vẫn là ' +
           'con của bash và vẫn thuộc phiên terminal đó. Mạng rớt → terminal biến mất → ' +
           'kernel gửi <code>SIGHUP</code> cho cả phiên → bản build chết ở phút thứ 12. Và ' +
           'ngay cả khi nó sống sót, toàn bộ output biên dịch vẫn đang chảy vào một terminal ' +
           'không còn tồn tại.</p>' +
           '<p><b>(b) Chọn <code>tmux</code>.</b> Cả bốn công cụ đều cứu tiến trình khỏi ' +
           'SIGHUP, nên tiêu chí phân định phải là thứ khác — và ở đây nó là: bạn sẽ quay ' +
           'lại, và bạn sẽ muốn <i>nhìn</i>. <code>tmux</code> giữ nguyên một terminal thật ' +
           'chạy trên máy build; gõ <code>tmux attach</code> từ máy khác là bạn ngồi lại ' +
           'đúng chỗ cũ, cuộn ngược xem lỗi biên dịch, gõ tiếp lệnh trong cùng thư mục. ' +
           '<code>nohup</code> và <code>disown</code> cứu được tiến trình nhưng bỏ rơi bạn: ' +
           'muốn xem gì phải <code>tail -f</code> một file log, và không gõ tiếp được gì ' +
           'vào phiên đó. <code>systemd-run</code> là lựa chọn <i>đúng</i> cho một dịch vụ ' +
           'chạy dài hạn có quản lý vòng đời, nhưng cho một lần build thủ công thì nó nặng ' +
           'nề mà không cho lại cái bạn cần nhất là màn hình tương tác.</p>' +
           '<p><b>(c) <code>jobs</code> hiện trống.</b> Đây là điểm dễ hiểu sai nhất. Bảng ' +
           'job nằm trong bộ nhớ của tiến trình bash cũ; bash cũ chết cùng phiên ssh cũ, và ' +
           'bảng job chết theo. Phiên ssh mới sinh ra một bash <b>khác</b>, với cuốn sổ ' +
           'trắng tinh. Bản build có thể vẫn đang chạy ngon lành, nhưng nó không còn là job ' +
           'của bất kỳ shell nào — kernel chưa bao giờ biết tới khái niệm job. Muốn tìm lại ' +
           'nó, dùng <code>pgrep -a make</code> hoặc <code>ps -ef | grep make</code>; muốn ' +
           'dừng nó, dùng PID chứ không dùng <code>%1</code>. Với <code>tmux</code> thì câu ' +
           'hỏi này biến mất: <code>tmux attach</code> đưa bạn về <i>đúng cái bash cũ</i>, ' +
           'vẫn còn sống trên máy build, vẫn giữ nguyên bảng job của nó.</p>' },

    { id: 'c5', k: 'free', tag: 'Tính toán / Chọn và biện minh', rows: 8,
      q: 'Bạn định bê nguyên bộ phần mềm đang chạy trên máy WSL này sang một bo mạch có ' +
         '<b>128 MB</b> RAM. Số đo thật ở dưới. Hãy: (1) tính tổng <code>RSS</code> và so ' +
         'với 128 MB; (2) giải thích vì sao con số đó <b>không</b> phải lượng RAM thật sự ' +
         'cần, và nó lệch về phía nào; (3) kết luận bo mạch có chạy nổi không, và nói rõ bạn ' +
         'sẽ đo lại bằng gì trước khi dám hứa với khách hàng.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'ps -e --no-headers | wc -l\nps -e -o rss= | paste -sd+ | bc\nfree -m | head -2' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '28\n' +
                '238932\n' +
                '               total        used        free      shared  buff/cache   available\n' +
                'Mem:            4918         512        3199           3        1346        4406' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'sleep 200 & A=$!\nsleep 200 & B=$!\nfor p in "$A" "$B"; do grep -E \'^(Rss|Pss|Shared_Clean|Private_Dirty):\' "/proc/$p/smaps_rollup"; done' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'Rss:                7856 kB\n' +
                'Pss:                2923 kB\n' +
                'Shared_Clean:       6344 kB\n' +
                'Private_Dirty:      1224 kB\n' +
                'Rss:                7780 kB\n' +
                'Pss:                2842 kB\n' +
                'Shared_Clean:       6336 kB\n' +
                'Private_Dirty:      1224 kB' },
        { t: 'cal', kind: 'info',
          x: '<code>Pss</code> (proportional set size) chia đều mỗi trang dùng chung cho ' +
             'số tiến trình đang dùng nó: một trang <code>libc</code> có 20 tiến trình dùng ' +
             'thì mỗi tiến trình chỉ được tính 1/20 trang.' }
      ],
      hint: 'Hai tiến trình <code>sleep</code> ở dưới <b>giống hệt nhau</b>, chạy cùng một ' +
            'file thực thi, cùng một <code>libc</code>. So <code>Rss</code> với ' +
            '<code>Pss</code> của chúng và bạn có ngay hệ số lệch.',
      crit: [
        'Tính đúng: 238 932 KB ≈ <b>233 MiB</b>, tức khoảng 1.8 lần dung lượng 128 MB',
        'Nói rõ <code>RSS</code> đếm <b>trọn vẹn</b> mọi trang dùng chung ở <b>từng</b> tiến trình, nên cộng RSS lại là <b>đếm thừa</b>',
        'Dùng số đo làm bằng chứng: hai <code>sleep</code> giống nhau có <code>Rss ≈ 7.8 MB</code> nhưng <code>Pss ≈ 2.9 MB</code>, phần lớn là <code>Shared_Clean 6.3 MB</code> — lệch khoảng 2.7 lần',
        'Nêu chiều lệch ngược lại: <code>free</code> báo <code>used = 512 MB</code> &gt; tổng RSS, vì bộ nhớ của <b>chính kernel</b> không nằm trong RSS của tiến trình nào',
        'Kết luận đúng mức: tổng RSS <b>không</b> phải căn cứ để hứa hay từ chối; nó chỉ nói "phải đo lại nghiêm túc"',
        'Nêu cách đo đúng: cộng <code>Pss</code> (<code>smaps_rollup</code>), và quan trọng hơn là <b>cắt bớt số tiến trình</b> — bo mạch 128 MB không cần <code>snapd</code>, <code>unattended-upgrades</code>, <code>networkd-dispatcher</code>',
        'Nói sẽ đo trên <b>chính bo mạch đó</b> với đúng bộ phần mềm sẽ giao, không suy từ máy dev'
      ],
      sol: '<p><b>(1) Phép tính.</b> 238 932 KB ÷ 1024 ≈ <b>233 MiB</b> trên 28 tiến trình, ' +
           'trung bình 8.3 MiB một tiến trình. So với 128 MB thì thừa gần gấp đôi. Nếu dừng ' +
           'ở đây, câu trả lời là "không chạy nổi".</p>' +
           '<p><b>(2) Nhưng con số đó sai ở cả hai chiều.</b></p>' +
           '<p><i>Lệch lên — RSS đếm thừa.</i> RSS tính <b>trọn vẹn</b> mọi trang mà tiến ' +
           'trình đang chạm tới, kể cả trang dùng chung với tiến trình khác. Hai lệnh ' +
           '<code>sleep</code> hoàn toàn giống nhau ở trên chứng minh điều đó bằng số: mỗi ' +
           'cái có <code>Rss</code> khoảng 7.8 MB, nhưng <code>Pss</code> — phần <i>công ' +
           'bằng</i> của nó — chỉ 2.9 MB, và <code>Shared_Clean 6.3 MB</code> là phần đang ' +
           'bị đếm hai lần. Cộng RSS của hai tiến trình này ra 15.6 MB, trong khi RAM thật ' +
           'chúng chiếm chỉ khoảng 9 MB. Hệ số đếm thừa ở đây là <b>2.7 lần</b>, và nguyên ' +
           'nhân là <code>libc</code>: nó nằm trong RSS của mọi tiến trình trên máy, nhưng ' +
           'trong RAM chỉ có một bản duy nhất.</p>' +
           '<p><i>Lệch xuống — RSS bỏ sót.</i> <code>free</code> báo ' +
           '<code>used = 512 MB</code>, lớn hơn tổng RSS 233 MB. Chênh lệch là bộ nhớ của ' +
           '<b>chính kernel</b>: slab, bảng trang, buffer mạng, cấu trúc dữ liệu ' +
           'filesystem. Không byte nào trong đó thuộc về RSS của bất kỳ tiến trình nào, ' +
           'nhưng tất cả đều ăn RAM thật, và trên bo mạch 128 MB thì phần này không hề nhỏ ' +
           'so với tổng.</p>' +
           '<p><b>(3) Kết luận và bước tiếp theo.</b> Tổng RSS không đủ tư cách để hứa hay ' +
           'để từ chối — nó chỉ đủ để nói "đừng bê nguyên xi sang". Trước khi hứa với khách ' +
           'hàng:</p>' +
           '<ul>' +
           '<li>Đo bằng <code>Pss</code> (cộng <code>Pss:</code> trong ' +
           '<code>/proc/*/smaps_rollup</code>), là ước lượng lành mạnh duy nhất cho "tiến ' +
           'trình này thực sự tốn bao nhiêu".</li>' +
           '<li>Quan trọng hơn phép đo: <b>cắt danh sách tiến trình</b>. Một bo mạch 128 MB ' +
           'không cần <code>snapd</code>, <code>unattended-upgrades</code>, ' +
           '<code>networkd-dispatcher</code> hay <code>wsl-pro-service</code> — chỉ riêng ' +
           'bốn cái đó đã là phần lớn bảng RSS. Rootfs nhúng dựng bằng Buildroot hay Yocto ' +
           '(Chặng 08, 09) thường chỉ có 15–25 tiến trình, và đó mới là điểm xuất phát để ' +
           'so sánh.</li>' +
           '<li>Rồi đo lại trên <b>chính bo mạch đó</b>, với đúng bộ phần mềm sẽ giao. Mọi ' +
           'con số suy diễn từ máy dev đều là phỏng đoán.</li>' +
           '</ul>' },
  ],

  /* ═══ D · Ôn xen kẽ — Bài 8, Bài 5, Bài 4 ══════════════════════════════ */
  D: [
    { id: 'd1', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 8.</b> Bạn đăng nhập với tài khoản <code>shinarus</code> (uid 1000). Trên ' +
         'máy đang có một tiến trình của <code>www-data</code>. Bạn gõ ' +
         '<code>kill 2841</code> và nhận:',
      blocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'bash: kill: (2841) - Operation not permitted' }
      ],
      opts: [
        'Tiến trình 2841 đã cài trình xử lý <code>SIGTERM</code> và từ chối tín hiệu.',
        'Gửi tín hiệu cũng là một thao tác có kiểm soát quyền: bạn không phải chủ của tiến trình đó và cũng không phải root, nên kernel từ chối ngay.',
        'PID 2841 không tồn tại, thông báo này là cách bash báo "không tìm thấy".',
        'Cần đổi sang <code>kill -9</code>, vì <code>SIGKILL</code> bỏ qua kiểm tra quyền.'
      ],
      a: 1,
      why: 'Bài 8 nói quyền không chỉ áp cho file. Gửi tín hiệu cũng là một thao tác đặc ' +
           'quyền: kernel chỉ cho phép nếu uid thật của bạn trùng uid của tiến trình đích, ' +
           'hoặc bạn là root. Đây là kiểm tra <b>trước</b> khi tín hiệu được gửi, nên đáp án ' +
           '4 sai — <code>-9</code> không vượt qua được nó, bạn vẫn nhận đúng thông báo ấy. ' +
           'Phân biệt với đáp án 3: PID không tồn tại thì thông báo là ' +
           '<code>No such process</code>, một câu hoàn toàn khác. Còn đáp án 1 mô tả một ' +
           'tình huống không sinh ra thông báo lỗi nào cả: <code>kill</code> trả về 0, tiến ' +
           'trình vẫn sống, và bạn phải tự đi kiểm tra bằng <code>ps</code>.' },

    { id: 'd2', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 5.</b> <code>ps</code> lấy danh sách tiến trình từ đâu, và điều đó nói lên ' +
         'điều gì về <code>/proc</code>?',
      opts: [
        'Từ một file cơ sở dữ liệu ở <code>/var/lib/ps/</code> mà kernel ghi lại mỗi khi có tiến trình mới.',
        'Từ một lời gọi hệ thống riêng tên <code>getprocesses()</code>; <code>/proc</code> chỉ là bản sao cho người đọc.',
        'Từ các thư mục <code>/proc/&lt;PID&gt;/</code>. Không file nào trong đó tồn tại trên đĩa — kernel sinh nội dung ra <b>ngay lúc bạn đọc</b>.',
        'Từ bộ nhớ dùng chung mà mỗi tiến trình tự đăng ký khi khởi động.'
      ],
      a: 2,
      why: 'Đây là ý cốt lõi của Bài 5 và nó quay lại đúng lúc: <code>/proc</code> không ' +
           'phải nơi lưu trữ mà là một <b>cửa sổ</b> nhìn vào cấu trúc dữ liệu sống của ' +
           'kernel. <code>ls -l /proc/1/</code> báo kích thước 0 cho mọi file, nhưng ' +
           '<code>cat /proc/1/comm</code> vẫn ra chữ. <code>ps</code> chỉ là một chương ' +
           'trình duyệt các thư mục số trong <code>/proc</code> rồi bày ra thành bảng — bạn ' +
           'hoàn toàn có thể tự viết lại nó bằng shell. Hệ quả thực tế: rootfs nhúng nào ' +
           'quên gắn <code>/proc</code> thì <code>ps</code>, <code>top</code> và ' +
           '<code>kill</code> đều hỏng, dù ba lệnh ấy vẫn nằm nguyên trong ' +
           '<code>/bin</code>.' },

    { id: 'd3', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 4.</b> Đây là số đo thật trên máy. Nó giải thích điều gì?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'type -a kill\ntype -a jobs\nsleep 60 &\n/bin/kill %1; echo "rc_ext=$?"\nkill %1;      echo "rc_builtin=$?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'kill is a shell builtin\n' +
                'kill is /usr/bin/kill\n' +
                'kill is /bin/kill\n' +
                'jobs is a shell builtin\n' +
                "/bin/kill: failed to parse argument: '%1'\n" +
                'rc_ext=1\n' +
                'rc_builtin=0' },
      ],
      opts: [
        '<code>/bin/kill</code> là một bản cũ bị lỗi; cài lại gói <code>procps</code> là nó hiểu được <code>%1</code>.',
        'Có <b>hai</b> lệnh <code>kill</code> khác nhau. Bản builtin nằm trong bash nên đọc được bảng job và hiểu <code>%1</code>; bản trên đĩa là một chương trình riêng, không thấy bảng job của shell nào cả.',
        '<code>%1</code> phải viết là <code>"%1"</code> trong dấu nháy thì <code>/bin/kill</code> mới nhận.',
        '<code>jobs</code> chỉ có bản builtin nên <code>%1</code> chỉ dùng được ở chế độ tương tác, không dùng được trong script.'
      ],
      a: 1,
      why: 'Bài 4 dạy rằng builtin <b>không phải</b> file trên đĩa: nó là mã nằm sẵn bên ' +
           'trong bash. Ở đây điều đó thành hệ quả sờ được. <code>%1</code> là một mục ' +
           'trong bảng job, mà bảng job lại là biến trong bộ nhớ của bash — chỉ mã chạy ' +
           '<i>bên trong</i> bash mới đọc được nó. <code>/bin/kill</code> là một tiến trình ' +
           'riêng biệt: nó nhận được chuỗi <code>"%1"</code>, cố đọc thành số, thất bại, và ' +
           'báo <code>failed to parse argument</code>. Đáp án 3 sai vì vấn đề không nằm ở ' +
           'dấu nháy — bash không hề mở rộng <code>%1</code> trước khi truyền đi. Đáp án 4 ' +
           'cũng sai: script chạy bằng bash vẫn dùng được <code>%1</code>, miễn là job đó ' +
           'do chính script ấy tạo ra.' },
  ],

  /* ═══ E · Thực hành — 2 dự đoán + 2 gõ lệnh + 1 sửa lỗi + 1 thử thách ══ */
  E: [
    { id: 'e1', k: 'free', tag: 'Dự đoán output', rows: 8,
      q: 'Đọc kịch bản dưới đây và <b>viết ra dự đoán trước khi chạy</b>. Cụ thể: (a) cột ' +
         '<code>STAT</code> ở ba lần <code>ps</code> lần lượt là gì; (b) số PID có thay đổi ' +
         'giữa ba lần không; (c) sau <code>bg %1</code>, lệnh <code>sleep</code> có tiếp tục ' +
         'đếm ngược trong lúc nó đang bị đóng băng không. Viết dự đoán vào ô, rồi chạy và ' +
         'ghi chỗ nào bạn đoán sai.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'sleep 120 &\nJ=$!\njobs -l\n\nkill -TSTP %1\nsleep 1\njobs -l\nps -o pid,ppid,stat,comm -p "$J" --no-headers\n\nbg %1\nsleep 1\njobs\nps -o pid,ppid,stat,comm -p "$J" --no-headers\n\nkill %1\nsleep 1\njobs' },
      ],
      hint: 'Ba chữ cái sẽ xuất hiện: một chữ cho "đang ngủ chờ hết giờ", một chữ cho "bị ' +
            'đóng băng", và chữ đầu quay lại ở lần thứ ba.',
      crit: [
        'Đoán đúng ba trạng thái: <code>S</code> → <code>T</code> → <code>S</code>',
        'Đoán đúng rằng <b>PID không đổi</b> qua cả ba lần — đóng băng và chạy tiếp không tạo tiến trình mới',
        'Nói <code>SIGTSTP</code> chỉ <b>tạm dừng</b>, tiến trình vẫn nằm nguyên trong bộ nhớ với đầy đủ trạng thái',
        'Trả lời (c): <b>không</b> — tiến trình bị dừng thì không chạy, nên đồng hồ đếm ngược của nó cũng dừng theo',
        'Nhận ra <code>jobs -l</code> in ra <code>Stopped</code> còn <code>jobs</code> sau <code>bg</code> in <code>Running</code>',
        'Ghi lại thành thật chỗ nào dự đoán lệch với thực tế'
      ],
      sol: '<p><b>Kết quả thật, đo trên máy này:</b></p>',
      solBlocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '[1]+  457 Running                 sleep 120 &\n' +
                '\n' +
                '[1]+  457 Stopped                 sleep 120\n' +
                '    457     311 T    sleep\n' +
                '\n' +
                '[1]+ sleep 120 &\n' +
                '[1]+  Running                 sleep 120 &\n' +
                '    457     311 S    sleep\n' +
                '\n' +
                '[1]+  Terminated              sleep 120' },
        { t: 'p',
          x: '<b>(a)</b> <code>S</code> → <code>T</code> → <code>S</code>. <code>T</code> ' +
             'là <i>stopped</i>: tiến trình bị kernel đóng băng, không được lập lịch chạy ' +
             'nữa, nhưng vẫn nằm nguyên trong bộ nhớ với đủ trạng thái của nó.' },
        { t: 'p',
          x: '<b>(b)</b> PID <b>457</b> ở cả ba lần. Đây là điểm quan trọng nhất của bài ' +
             'tập này: <code>bg</code> và <code>fg</code> không khởi động lại gì cả, chúng ' +
             'chỉ gửi <code>SIGCONT</code> và sắp xếp lại xem ai được giữ bàn phím. Cùng ' +
             'một tiến trình từ đầu đến cuối.' },
        { t: 'p',
          x: '<b>(c)</b> Không. <code>sleep 120</code> bị dừng lúc giây thứ 1 thì đồng hồ ' +
             'của nó cũng dừng ở đó; đóng băng ba mươi giây rồi <code>bg</code> thì nó còn ' +
             'phải ngủ tiếp 119 giây nữa. Tiến trình bị dừng <b>không chạy</b>, mà không ' +
             'chạy thì không đếm được gì. Đây là lý do <code>SIGSTOP</code> không phải cách ' +
             'an toàn để "tạm hoãn" một chương trình có ràng buộc thời gian thật: thế giới ' +
             'bên ngoài vẫn chạy, chỉ mình nó đứng lại.' },
        { t: 'cal', kind: 'tip',
          x: 'Nếu bạn gõ tay thay vì chạy script, hãy dùng <kbd>Ctrl</kbd>+<kbd>Z</kbd> ' +
             'thay cho <code>kill -TSTP %1</code> — đó chính xác là cùng một tín hiệu, chỉ ' +
             'khác đường gửi: một bên do bạn gõ, một bên do driver terminal dịch từ phím.' }
      ] },

    { id: 'e2', k: 'free', tag: 'Dự đoán output', rows: 7,
      q: 'Lệnh dưới đây đếm xem mỗi trạng thái tiến trình đang có bao nhiêu tiến trình. ' +
         '<b>Trước khi chạy</b>, hãy dự đoán: (a) trạng thái nào chiếm đa số; (b) sẽ có ' +
         '<b>chính xác</b> bao nhiêu tiến trình ở trạng thái <code>R</code>, và đó là tiến ' +
         'trình nào; (c) nếu thêm <code>| head -4</code> vào cuối, con số ở (b) có đổi ' +
         'không. Rồi chạy cả hai và đối chiếu.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'ps -e -o stat --no-headers | sort | uniq -c | sort -rn\nps -e -o stat --no-headers | sort | uniq -c | sort -rn | head -4' },
        { t: 'cal', kind: 'info',
          x: 'Nhắc lại các hậu tố mà Bài 9 đã giới thiệu: <code>s</code> = session leader, ' +
             '<code>l</code> = đa luồng, <code>+</code> = đang ở tiền cảnh, ' +
             '<code>&lt;</code> = độ ưu tiên cao. Vì thế <code>Ss</code>, <code>Ssl</code> ' +
             'và <code>S</code> bị đếm thành ba nhóm riêng.' }
      ],
      hint: 'Câu (b) là câu bẫy dễ chịu: trong toàn bộ máy, lúc lệnh này chạy, ai thực sự ' +
            'đang chiếm CPU? Còn <code>sort</code> và <code>uniq</code> đang làm gì?',
      crit: [
        'Đoán đúng đa số là <code>S</code> và các biến thể của nó (<code>Ss</code>, <code>Ssl</code>…)',
        'Đoán đúng có <b>đúng 1</b> tiến trình <code>R</code>, và đó là chính lệnh <code>ps</code> vừa gõ',
        'Giải thích vì sao <code>sort</code>/<code>uniq</code> <b>không</b> ở <code>R</code>: chúng đang chờ đọc từ ống, tức đang ngủ ở <code>S</code>',
        'Trả lời (c): số <code>R</code> <b>không đổi</b>, vẫn là 1 — thêm <code>head</code> chỉ thêm một tiến trình đang ngủ chờ đọc',
        'Nhận ra <code>head -4</code> cắt mất dòng <code>R</code> khỏi <i>màn hình</i> chứ không làm nó biến mất khỏi <i>hệ thống</i>',
        'Ghi lại chỗ dự đoán lệch thực tế'
      ],
      sol: '<p><b>Kết quả thật, đo trên máy này:</b></p>',
      solBlocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '     12 Ss\n' +
                '      9 S\n' +
                '      3 Ssl\n' +
                '      3 Ss+\n' +
                '      2 Sl+\n' +
                '      2 Sl\n' +
                '      1 S<s\n' +
                '      1 R\n' +
                '\n' +
                '     12 Ss\n' +
                '     10 S\n' +
                '      3 Ssl\n' +
                '      3 Ss+' },
        { t: 'p',
          x: '<b>(a)</b> Tuyệt đại đa số là <code>S</code> ở dạng này hay dạng khác: 12 + ' +
             '9 + 3 + 3 + 2 + 2 + 1 = 32 trên tổng 33. Một máy Linux khoẻ mạnh gần như lúc ' +
             'nào cũng trông như vậy — hầu hết tiến trình đang ngủ chờ việc, và đó là dấu ' +
             'hiệu tốt chứ không phải dấu hiệu xấu.' },
        { t: 'p',
          x: '<b>(b)</b> Đúng <b>một</b> tiến trình <code>R</code>, và đó chính là ' +
             '<code>ps</code>. Nó phải đang chạy thì mới chụp được ảnh, nên nó luôn tự chụp ' +
             'thấy mình đang chạy. <code>sort</code>, <code>uniq</code> và ' +
             '<code>sort</code> thứ hai đều đã được sinh ra cùng lúc với <code>ps</code>, ' +
             'nhưng chúng đang <b>chờ đọc</b> từ đầu ống — không có dữ liệu thì không có ' +
             'việc, nên chúng ngủ ở <code>S</code>. Chúng nằm trong nhóm 9 (hoặc 10) kia.' },
        { t: 'p',
          x: '<b>(c)</b> Không đổi: vẫn đúng một <code>R</code>. Thêm <code>head</code> chỉ ' +
             'thêm <b>một</b> tiến trình nữa đang ngủ chờ đọc — và đó chính là chênh lệch ' +
             '<code>9 S</code> so với <code>10 S</code> giữa hai lần chạy. Nhưng ' +
             '<code>head -4</code> cắt bảng còn bốn dòng đầu, nên dòng <code>1 R</code> ' +
             'biến mất khỏi <b>màn hình</b>. Nó không biến mất khỏi hệ thống. Đây là một ' +
             'thói quen đáng giữ suốt nghề: phân biệt "thứ này không có" với "thứ này không ' +
             'được in ra".' },
        { t: 'cal', kind: 'warn',
          x: 'Con số cụ thể trên máy bạn sẽ khác — số tiến trình phụ thuộc bản phân phối, ' +
             'dịch vụ đang bật và cả thời điểm đo (xem câu B4). Cái phải khớp là ' +
             '<b>cấu trúc</b> của câu trả lời: đa số <code>S</code>, đúng một ' +
             '<code>R</code>.' }
      ] },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh', rows: 5,
      q: 'Viết <b>một</b> dòng lệnh liệt kê 5 tiến trình ngốn RAM vật lý nhiều nhất, hiển ' +
         'thị đúng bốn cột theo thứ tự: PID, PPID, RSS, tên chương trình — không có dòng ' +
         'tiêu đề. Sau đó viết thêm một dòng nữa cộng RSS của <b>toàn bộ</b> tiến trình trên ' +
         'máy thành một con số duy nhất (đơn vị KB).',
      hint: '<code>ps</code> có tuỳ chọn <code>--sort</code>, và dấu trừ đứng trước tên cột ' +
            'nghĩa là giảm dần. Dạng <code>-o rss=</code> (có dấu bằng, không có gì sau) là ' +
            'cách nói "cột này, và bỏ tiêu đề".',
      crit: [
        'Dùng <code>ps -e</code> (hoặc <code>ps ax</code>) để lấy <b>mọi</b> tiến trình, không chỉ tiến trình của terminal này',
        'Dùng <code>-o pid,ppid,rss,comm</code> đúng thứ tự bốn cột',
        'Sắp giảm dần bằng <code>--sort=-rss</code>, không sắp bằng cách khác rồi mới cắt',
        'Bỏ tiêu đề bằng <code>--no-headers</code> (hoặc dấu <code>=</code> sau tên cột)',
        'Cắt 5 dòng bằng <code>head -5</code>',
        'Dòng thứ hai cộng được thành một số — ví dụ <code>ps -e -o rss= | paste -sd+ | bc</code> hoặc bằng <code>awk</code>'
      ],
      sol: '<p>Hai dòng lệnh, và kết quả thật trên máy này:</p>',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'ps -e -o pid,ppid,rss,comm --sort=-rss --no-headers | head -5\nps -e -o rss= | paste -sd+ | bc' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '    200       1 32832 unattended-upgr\n' +
                '    153       1 29796 networkd-dispat\n' +
                '     46       1 16732 systemd-journal\n' +
                '      1       0 15380 systemd\n' +
                '    160       1 15184 wsl-pro-service\n' +
                '263704' },
        { t: 'cmdx', title: 'Từng mảnh của dòng lệnh',
          rows: [
            ['<code>-e</code>', 'Mọi tiến trình trên máy. Thiếu nó, <code>ps</code> chỉ in tiến trình gắn với terminal hiện tại — trên máy này là 4–5 dòng thay vì 28.'],
            ['<code>-o pid,ppid,rss,comm</code>', 'Tự chọn cột và tự chọn thứ tự. Đây là dạng đáng dùng nhất trong script, vì bạn biết chắc cột nào ở đâu thay vì phải đếm cột của <code>ps aux</code>.'],
            ['<code>--sort=-rss</code>', 'Sắp theo RSS, dấu <code>-</code> nghĩa là giảm dần. Để <code>ps</code> sắp thay vì <code>sort</code> thì không phải lo cột nào là cột thứ mấy.'],
            ['<code>--no-headers</code>', 'Bỏ dòng tiêu đề. Nếu không bỏ, <code>head -5</code> sẽ ăn mất một dòng dữ liệu vào chỗ của tiêu đề.'],
            ['<code>-o rss=</code>', 'Dấu <code>=</code> ngay sau tên cột nghĩa là "in cột này, không in tiêu đề của nó" — dạng viết tắt tiện hơn khi chỉ lấy một cột.'],
            ['<code>paste -sd+</code>', 'Nối mọi dòng thành một dòng, ngăn bằng dấu <code>+</code>, tạo ra một biểu thức số học dạng <code>32832+29796+…</code>.'],
            ['<code>bc</code>', 'Máy tính dòng lệnh: nhận biểu thức, trả về kết quả. Có thể thay cả hai bước bằng <code>awk \'{s+=$1} END{print s}\'</code>.']
          ] },
        { t: 'cal', kind: 'tip',
          x: 'Nhớ lại câu C5: con số 263704 KB này <b>không</b> phải lượng RAM thật sự đang ' +
             'dùng. Nó đếm thừa mọi trang dùng chung và đếm thiếu toàn bộ bộ nhớ của chính ' +
             'kernel.' }
      ] },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh', rows: 5,
      q: 'Bạn cần dừng mọi tiến trình có chuỗi <code>datalogger</code> trong dòng lệnh, ' +
         'nhưng <b>không</b> muốn bắn mù. Viết hai dòng lệnh: dòng thứ nhất chỉ ' +
         '<b>liệt kê</b> PID kèm dòng lệnh đầy đủ của mọi tiến trình khớp (để bạn nhìn trước ' +
         'khi quyết định), dòng thứ hai mới gửi tín hiệu — và phải là ' +
         '<code>SIGTERM</code> chứ không phải <code>SIGKILL</code>. Nói thêm: vì sao cách ' +
         'này an toàn hơn <code>ps aux | grep datalogger</code>?',
      hint: 'Hai lệnh anh em cùng gói: một cái tìm, một cái bắn. Cả hai đều có tuỳ chọn ' +
            '<code>-f</code> nghĩa là "khớp trên <b>toàn bộ</b> dòng lệnh, không chỉ tên ' +
            'chương trình".',
      crit: [
        'Dòng 1 dùng <code>pgrep</code> với <code>-a</code> (hoặc <code>-l</code>) để in kèm dòng lệnh, không chỉ in số',
        'Dùng <code>-f</code> ở cả hai dòng, và giải thích được nó khớp trên toàn bộ dòng lệnh',
        'Dòng 2 dùng <code>pkill</code> <b>không kèm</b> <code>-9</code> — mặc định đã là SIGTERM',
        'Nêu ưu điểm 1 so với <code>ps | grep</code>: <code>pgrep</code> <b>không tự khớp chính nó</b>',
        'Nêu ưu điểm 2: <code>pgrep</code> trả mã thoát 1 khi không tìm thấy, nên script kiểm tra được',
        'Nêu nguyên tắc: luôn <code>pgrep</code> trước, đọc kỹ, rồi mới <code>pkill</code> — vì <code>-f</code> khớp rộng và rất dễ trúng nhầm'
      ],
      sol: '<p>Hai dòng lệnh, cùng bằng chứng cho câu hỏi phụ:</p>',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'pgrep -af datalogger      # look first\npkill -f datalogger       # then send SIGTERM' },
        { t: 'p',
          x: '<b>Vì sao an toàn hơn <code>ps aux | grep</code>.</b> Lý do thứ nhất nhìn ' +
             'thấy ngay bằng mắt. Đây là số đo thật với một <code>sleep 120</code> đang ' +
             'chạy:' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'ps aux | grep sleep\npgrep -a sleep' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'shinarus     563  0.0  0.1  16112  7624 pts/0    S+   21:58   0:00 sleep 120\n' +
                'shinarus     566  0.0  0.0   4128  2492 pts/0    S+   21:58   0:00 grep sleep\n' +
                '563 sleep 120' },
        { t: 'p',
          x: '<code>grep</code> tự tìm thấy <b>chính nó</b>: dòng lệnh của nó có chứa chữ ' +
             '<code>sleep</code>. Một script đếm số dòng để quyết định "dịch vụ còn chạy ' +
             'không" sẽ luôn đếm ra ít nhất 1 và luôn kết luận sai. <code>pgrep</code> loại ' +
             'trừ chính nó theo thiết kế và chỉ in đúng PID 563.' },
        { t: 'p',
          x: '<b>Lý do thứ hai:</b> <code>pgrep</code> trả mã thoát 0 khi tìm thấy và 1 khi ' +
             'không, nên script viết được <code>if pgrep -f datalogger; then …</code> — đo ' +
             'thật: có tiến trình thì <code>rc=0</code>, sau khi <code>pkill</code> thì ' +
             '<code>rc=1</code>.' },
        { t: 'cal', kind: 'warn', title: 'Vì sao phải nhìn trước khi bắn',
          x: '<code>-f</code> khớp trên toàn bộ dòng lệnh, nên nó khớp <i>rộng</i>: ' +
             '<code>pkill -f log</code> sẽ trúng <code>datalogger</code>, ' +
             '<code>logrotate</code>, <code>rsyslogd</code> và cả trình soạn thảo đang mở ' +
             'file <code>log.c</code>. Câu E5 ngay dưới đây là một trường hợp cụ thể của ' +
             'đúng cái bẫy này, và nạn nhân sẽ khiến bạn bất ngờ.' }
      ] },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi', rows: 7,
      q: 'Hai script dưới đây được viết để chạy và dừng một tiến trình nền. Chạy thật thì ' +
         '<code>backup.sh</code> đúng là bị dừng — nhưng dòng ' +
         '<code>[stop] done, every backup process is gone</code> <b>không bao giờ được ' +
         'in</b>, và <code>stop-backup.sh</code> kết thúc với mã thoát <b>143</b>. Hãy nói: ' +
         'chuyện gì đã xảy ra, mã 143 nghĩa là gì ở đây, và sửa thế nào.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '# backup.sh\n' +
                'echo "[backup] started, PID=$$"\n' +
                'while true; do sleep 1; done' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '# stop-backup.sh\n' +
                'echo "[stop] about to stop the backup job"\n' +
                'pkill -f backup\n' +
                'echo "[stop] done, every backup process is gone"' },
        { t: 'code', where: 'wsl', lang: 'bash',
          code: './backup.sh &\nsleep 1\npgrep -af backup\n./stop-backup.sh\necho "rc_stop=$?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: '[backup] started, PID=552\n' +
                '552 /bin/bash ./backup.sh\n' +
                '[stop] about to stop the backup job\n' +
                'Terminated                 ./stop-backup.sh\n' +
                'rc_stop=143' },
      ],
      hint: 'Chạy lại <code>pgrep -af backup</code> <b>trong lúc</b> ' +
            '<code>stop-backup.sh</code> đang chạy, rồi đọc kỹ dòng lệnh của chính nó.',
      crit: [
        'Nhận ra <code>stop-backup.sh</code> <b>tự giết chính mình</b>: dòng lệnh của nó cũng chứa chuỗi <code>backup</code>',
        'Nói <code>-f</code> khớp trên toàn bộ dòng lệnh, mà dòng lệnh đó là <code>/bin/bash ./stop-backup.sh</code>',
        'Giải mã 143 = 128 + 15 = chết vì <code>SIGTERM</code> — đúng tín hiệu mà <code>pkill</code> gửi mặc định',
        'Giải thích vì sao dòng <code>[stop] done</code> không được in: script chết ngay tại lệnh <code>pkill</code>, không còn dòng nào chạy nữa',
        'Đề xuất ít nhất một cách sửa: dùng mẫu khớp chính xác hơn (<code>pkill -x backup.sh</code>), hoặc loại trừ chính mình (<code>pkill -f backup.sh</code> + đổi tên script dừng), hoặc bỏ pattern mà dùng PID',
        'Nêu bài học chung: <code>pkill -f</code> khớp rộng, phải luôn <code>pgrep -af</code> kiểm tra trước'
      ],
      sol: '<p><b>Chuyện gì đã xảy ra.</b> <code>pkill -f backup</code> tìm mọi tiến trình ' +
           'có chuỗi <code>backup</code> ở bất kỳ đâu trong <b>toàn bộ dòng lệnh</b>. Lúc ' +
           'nó chạy, trên máy có <i>hai</i> tiến trình như vậy: ' +
           '<code>/bin/bash ./backup.sh</code> (đúng mục tiêu) và ' +
           '<code>/bin/bash ./stop-backup.sh</code> — <b>chính nó</b>. Nó bắn ' +
           '<code>SIGTERM</code> vào cả hai và chết ngay tại dòng đó.</p>' +
           '<p><b>Mã 143.</b> 143 = 128 + 15, và tín hiệu số 15 là <code>SIGTERM</code> — ' +
           'đúng tín hiệu mặc định của <code>pkill</code>. Mã thoát này là chữ ký của thủ ' +
           'phạm: nó nói rằng script không kết thúc bình thường mà bị một tín hiệu giết, và ' +
           'chỉ ra luôn tín hiệu nào. Dòng <code>[stop] done</code> không bao giờ được in vì ' +
           'sau <code>pkill</code> thì không còn tiến trình nào để chạy tiếp dòng ấy.</p>' +
           '<p><b>Điều làm lỗi này nguy hiểm:</b> nhìn từ ngoài, mọi thứ có vẻ đúng. ' +
           '<code>backup.sh</code> quả thật đã bị dừng. Nếu <code>stop-backup.sh</code> còn ' +
           'có việc phải làm sau đó — gỡ mount, tháo khoá, gửi thông báo, tắt máy — thì ' +
           'những việc ấy âm thầm không xảy ra, và không có thông báo lỗi nào cả.</p>' +
           '<p><b>Ba cách sửa, từ tốt nhất trở xuống:</b></p>',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: '# 1. match the program name exactly -- no -f at all\npkill -x backup.sh\n\n'
              + '# 2. keep -f but make the pattern unable to match this script\npkill -f \'^/bin/bash \\./backup\\.sh$\'\n\n'
              + '# 3. do not use a pattern: look first, then send by PID\nfor pid in $(pgrep -x backup.sh); do kill "$pid"; done' },
        { t: 'p',
          x: 'Cách 1 là cách nên dùng: <code>-x</code> đòi khớp <b>toàn bộ</b> tên chương ' +
             'trình, và tên đó là <code>backup.sh</code> chứ không phải ' +
             '<code>stop-backup.sh</code>. Cách 2 vẫn giữ <code>-f</code> nhưng neo mẫu ' +
             'bằng <code>^</code> và <code>$</code> để nó không thể khớp một dòng lệnh dài ' +
             'hơn. Cách 3 chậm hơn nhưng minh bạch nhất, và là dạng bạn sẽ muốn dùng khi ' +
             'phải làm thêm việc gì đó với từng PID.' },
        { t: 'cal', kind: 'danger', title: 'Cùng một cái bẫy, ở quy mô lớn hơn',
          x: 'Đây là phiên bản vô hại của một tai nạn kinh điển: một script dọn dẹp gõ ' +
             '<code>pkill -f java</code> trên máy chủ ứng dụng và giết luôn cả những dịch ' +
             'vụ không liên quan, vì <code>-f</code> khớp cả đường dẫn ' +
             '<code>/usr/lib/jvm/…/java</code> trong dòng lệnh của chúng. Quy tắc rút ra ' +
             'không phải "đừng dùng <code>-f</code>" mà là: <b>luôn chạy ' +
             '<code>pgrep -af</code> với đúng mẫu đó trước, và đọc từng dòng nó in ra.</b>' }
      ] },

    { id: 'e6', k: 'free', tag: 'Thử thách', rows: 7,
      q: 'Câu C2 kết thúc bằng một lời hứa: <code>systemd</code> theo dõi tiến trình của ' +
         'một service <b>không</b> bằng pidfile, nên nó miễn nhiễm với chuyện PID bị dùng ' +
         'lại. Vậy nó theo dõi bằng gì? Hãy tự đi tìm câu trả lời bằng ba lệnh dưới đây, rồi ' +
         'viết ra: (a) cơ chế đó tên là gì; (b) nó ghi cái gì và ghi ở đâu; (c) vì sao một ' +
         'tiến trình <b>không thể tự trốn ra</b> khỏi nó, kể cả khi nó tự tách thành daemon ' +
         'và đổi tiến trình cha. Câu này được phép chưa trả lời trọn vẹn — Chặng 07 sẽ quay ' +
         'lại.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash',
          code: 'cat /proc/self/cgroup\nsystemd-cgls --no-pager | head -12\ncat /sys/fs/cgroup/user.slice/cgroup.procs' },
        { t: 'cal', kind: 'tip',
          x: 'Gợi ý đọc: so kết quả của <code>cat /proc/self/cgroup</code> với vị trí của ' +
             'chính bạn trong cây mà <code>systemd-cgls</code> vẽ ra. Rồi thử ' +
             '<code>sleep 300 &amp;</code> và xem PID của nó xuất hiện ở file ' +
             '<code>cgroup.procs</code> nào.' }
      ],
      hint: 'Từ khoá là <b>cgroup</b> (control group). Câu (c) là câu hay nhất: hãy nghĩ ' +
            'xem tiến trình con thừa hưởng gì từ tiến trình cha, và ai là người quyết định ' +
            'điều đó — chương trình hay kernel?',
      crit: [
        '(a) Gọi đúng tên: <b>cgroup</b> (control group), phiên bản 2 với cây thống nhất dưới <code>/sys/fs/cgroup</code>',
        '(b) Nói mỗi cgroup là một thư mục, và file <code>cgroup.procs</code> trong đó liệt kê PID của mọi tiến trình thuộc nhóm',
        '(b) Nhận ra <code>/proc/self/cgroup</code> cho biết <b>chính bạn</b> đang ở nhóm nào',
        '(c) Nói tư cách thành viên cgroup được <b>thừa kế</b>: tiến trình con sinh ra luôn nằm trong cùng cgroup với cha',
        '(c) Nói rõ đây là quyết định của <b>kernel</b>, chương trình không tự chuyển nhóm cho mình được (trừ khi có quyền ghi vào cây cgroup)',
        '(c) Kết luận: đổi tiến trình cha (mồ côi, được PID 1 nhận nuôi) <b>không</b> làm nó rời cgroup — nên <code>systemctl stop</code> vẫn tóm được đủ, khác hẳn pidfile',
        'Ghi lại ít nhất một câu hỏi còn bỏ ngỏ để mang sang Chặng 07'
      ],
      sol: '<p><b>(a) Cơ chế đó là <code>cgroup</code></b> — control group, và trên hệ thống ' +
           'hiện đại là cgroup v2 với một cây thống nhất gắn ở ' +
           '<code>/sys/fs/cgroup</code>.</p>' +
           '<p><b>(b) Nó ghi gì, ở đâu.</b> Mỗi cgroup là một <i>thư mục</i> trong cây đó, ' +
           'và trong mỗi thư mục có file <code>cgroup.procs</code> liệt kê PID của mọi tiến ' +
           'trình đang thuộc nhóm. Đây lại đúng ý của Bài 5: một hệ thống file do kernel ' +
           'sinh ra, dùng để <i>điều khiển</i> chứ không phải để lưu trữ. Nhìn từ phía ' +
           'ngược lại, <code>/proc/self/cgroup</code> nói cho bạn biết mình đang ở nhóm ' +
           'nào — trên máy này, một shell đăng nhập trả về ' +
           '<code>0::/user.slice/user-1000.slice/session-c1.scope</code>. Và ' +
           '<code>systemd-cgls</code> chỉ là công cụ vẽ cây đó ra cho dễ nhìn:</p>',
      solBlocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true,
          code: 'CGroup /:\n' +
                '-.slice\n' +
                '├─user.slice\n' +
                '│ └─user-1000.slice\n' +
                '│   ├─user@1000.service …\n' +
                '│   │ └─init.scope\n' +
                '│   │   ├─358 /usr/lib/systemd/systemd --user\n' +
                '│   │   └─360 (sd-pam)\n' +
                '│   └─session-c1.scope\n' +
                '│     ├─316 login -- shinarus\n' +
                '│     └─388 -bash\n' +
                '├─init.scope' },
        { t: 'p',
          x: '<b>(c) Vì sao không trốn ra được.</b> Tư cách thành viên cgroup được ' +
             '<b>thừa kế</b>: khi một tiến trình <code>fork()</code>, kernel đặt tiến trình ' +
             'con vào <i>đúng</i> cgroup của cha. Đây là quyết định của kernel, không phải ' +
             'của chương trình — muốn chuyển nhóm thì phải ghi PID vào ' +
             '<code>cgroup.procs</code> của nhóm khác, và bạn phải có quyền ghi vào cây ' +
             'cgroup mới làm được.' },
        { t: 'cal', kind: 'why', title: 'Vì sao điều đó đánh bại được cả pidfile lẫn PID bị dùng lại',
          x: 'Thủ thuật cũ để một daemon "tách ra chạy độc lập" là fork hai lần rồi để tiến ' +
             'trình cha thoát; đứa con thành mồ côi và được PID 1 nhận nuôi. Sau bước đó, ' +
             'quan hệ cha–con <b>không còn</b> nói lên điều gì, nên mọi cách theo dõi dựa ' +
             'trên PPID hay pidfile đều mất dấu — đúng chỗ mà kịch bản ở câu C2 sụp đổ. ' +
             'Nhưng cgroup thì không đổi: dù cha là ai, tiến trình vẫn nằm nguyên trong ' +
             'nhóm nó được sinh ra. Vì thế <code>systemctl stop</code> có thể gửi tín hiệu ' +
             'cho <b>đúng và đủ</b> mọi tiến trình của service, kể cả những đứa cháu mà ' +
             'không ai buồn ghi PID lại. Đó là lý do thật khiến các bản phân phối nhúng bỏ ' +
             'init script viết tay để chuyển sang systemd.' },
        { t: 'p',
          x: '<b>Câu còn bỏ ngỏ, mang sang Chặng 07.</b> cgroup không chỉ để <i>đếm</i> ' +
             'tiến trình — cái tên "control group" nói rằng nó còn để <i>giới hạn</i>: ' +
             'nhóm này chỉ được dùng 20% CPU, nhóm kia tối đa 64 MB RAM, vượt thì OOM ' +
             'killer chỉ giết trong nhóm đó thay vì giết bừa cả máy. Trên thiết bị nhúng, ' +
             'đây là công cụ để một dịch vụ rò rỉ bộ nhớ không kéo sập cả sản phẩm. Cách ' +
             'đặt các giới hạn ấy là chuyện của Chặng 07.' }
      ] },
  ],

  /* ═══ F · Bí ở đâu thì đọc lại đâu ═════════════════════════════════════ */
  diag: [
    ['A1, B1, C1',
     'Bạn đang đọc <code>load average</code> như một phần trăm CPU. Nó là <b>số đếm</b> tiến trình đang chờ, phải chia cho <code>nproc</code>, và nó cộng cả tiến trình ở trạng thái <code>D</code>.',
     '<a href="#/bai-09#top-bang-dieu-khien-thoi-gian-thuc">Đọc lại Bài 9 — <i>top: bảng điều khiển thời gian thực</i></a>'],

    ['A2, B2, C4',
     'Bạn đang tưởng <code>jobs</code> và <code>%1</code> là thứ cả máy đều thấy. Chúng là sổ sách riêng của một tiến trình bash, không phải của kernel.',
     '<a href="#/bai-09#tien-canh-hau-canh-va-ai-dang-giu-ban-phim">Đọc lại Bài 9 — <i>Tiền cảnh, hậu cảnh và ai đang giữ bàn phím</i></a>'],

    ['A3, B3, C3',
     'Bạn chưa tách được <code>SIGTERM</code> khỏi <code>SIGKILL</code>. Một cái là lời đề nghị chương trình được phép xử lý; một cái là mệnh lệnh không cho nó chạy thêm lệnh nào.',
     '<a href="#/bai-09#tin-hieu-cach-duy-nhat-de-noi-chuyen-voi-tien-trinh-dang-cha">Đọc lại Bài 9 — <i>Tín hiệu: cách duy nhất để nói chuyện với tiến trình đang chạy</i></a>'],

    ['A4',
     'Bốn biến <code>$?</code>, <code>$$</code>, <code>$!</code>, <code>$0</code> đang lẫn vào nhau trong đầu bạn.',
     '<a href="#/bai-09#thuc-hanh-dieu-khien-tien-trinh-bang-tay">Đọc lại Bài 9 — <i>Thực hành: điều khiển tiến trình bằng tay</i></a>'],

    ['A5, E2',
     'Bạn đang đọc <code>S</code> thành "đang chạy". Cột <code>STAT</code> có bảng chữ cái riêng của nó, và hầu hết tiến trình trên một máy khoẻ mạnh đều đang ngủ.',
     '<a href="#/bai-09#cot-stat-tien-trinh-dang-lam-gi-luc-nay">Đọc lại Bài 9 — <i>Cột STAT: tiến trình đang làm gì lúc này</i></a>'],

    ['A6',
     'Bạn tưởng zombie còn tiêu tốn RAM và CPU. Nó đã chết rồi; thứ nó giữ là một số PID.',
     '<a href="#/bai-09#zombie-va-tre-mo-coi">Đọc lại Bài 9 — <i>Zombie và trẻ mồ côi</i></a>'],

    ['A7, C2',
     'Bạn chưa có thói quen kiểm tra tiến trình còn sống hay không trước khi bắn tín hiệu vào nó. <code>kill -0</code> tồn tại chính vì việc đó.',
     '<a href="#/bai-09#tin-hieu-cach-duy-nhat-de-noi-chuyen-voi-tien-trinh-dang-cha">Đọc lại Bài 9 — <i>Tín hiệu: cách duy nhất để nói chuyện với tiến trình đang chạy</i></a>'],

    ['A8, E1',
     'Bốn thao tác <kbd>Ctrl</kbd>+<kbd>C</kbd>, <kbd>Ctrl</kbd>+<kbd>Z</kbd>, <code>bg</code>, <code>fg</code> chưa tách bạch trong đầu bạn — nhất là chuyện chúng khác nhau ở <b>ai giữ bàn phím</b>.',
     '<a href="#/bai-09#tien-canh-hau-canh-va-ai-dang-giu-ban-phim">Đọc lại Bài 9 — <i>Tiền cảnh, hậu cảnh và ai đang giữ bàn phím</i></a>'],

    ['B4',
     'Bạn coi số tiến trình đếm được là một hằng số của máy. Nó là hàm của thời điểm đo.',
     '<a href="#/bai-09#cay-tien-trinh-moc-len-tu-pid-1">Đọc lại Bài 9 — <i>Cây tiến trình mọc lên từ PID 1</i></a>'],

    ['B5, C5, E3',
     'Bạn chưa tách được <code>VSZ</code>, <code>RSS</code> và lượng RAM thật sự bị chiếm. Ba con số này khác nhau, và trên bo mạch nhỏ thì sự khác nhau ấy quyết định sản phẩm chạy hay không.',
     '<a href="#/bai-09#ps-mot-lenh-ba-bo-cu-phap-lich-su">Đọc lại Bài 9 — <i>ps: một lệnh, ba bộ cú pháp lịch sử</i></a>'],

    ['B6',
     'Bạn đang đọc cột <code>TIME</code> thành tuổi đời của tiến trình. Cột đó là thời gian CPU; tuổi đời nằm ở <code>ETIME</code>.',
     '<a href="#/bai-09#ps-mot-lenh-ba-bo-cu-phap-lich-su">Đọc lại Bài 9 — <i>ps: một lệnh, ba bộ cú pháp lịch sử</i></a>'],

    ['D1',
     'Bạn quên rằng gửi tín hiệu cũng là thao tác có kiểm soát quyền, y như đọc và ghi file.',
     '<a href="#/bai-08#truoc-het-ban-la-ai-trong-mat-kernel">Đọc lại Bài 8 — <i>Trước hết: bạn là ai trong mắt kernel</i></a>'],

    ['D2',
     '<code>/proc</code> không phải nơi lưu trữ. Nó là cửa sổ nhìn vào kernel, sinh nội dung ngay lúc bạn đọc — và <code>ps</code> chỉ là một chương trình duyệt nó.',
     '<a href="#/bai-05#moi-thu-la-file-cau-nay-nghia-la-gi">Đọc lại Bài 5 — <i>"Mọi thứ là file" — câu này nghĩa là gì</i></a>'],

    ['D3, E4, E5',
     'Bạn chưa nắm ranh giới giữa builtin và chương trình trên đĩa. Ranh giới ấy quyết định lệnh nào đọc được bảng job, và vì sao <code>pkill -f</code> lại khớp rộng đến mức nguy hiểm.',
     '<a href="#/bai-04#cau-truc-cua-mot-cau-lenh">Đọc lại Bài 4 — <i>Cấu trúc của một câu lệnh</i></a>'],

    ['E6',
     'Câu này được phép còn bỏ ngỏ. Nếu bạn muốn nền tảng trước khi đọc tiếp về cgroup, hãy xem lại cây tiến trình và chuyện PID 1 nhận nuôi trẻ mồ côi.',
     '<a href="#/bai-09#zombie-va-tre-mo-coi">Đọc lại Bài 9 — <i>Zombie và trẻ mồ côi</i></a>'],
  ],
});

/* ══════════════════════════════════════════════════════════════════════════
   Bài tập 22 — Luồng và đồng bộ với pthread
   ══════════════════════════════════════════════════════════════════════════

   ── §13.4 BƯỚC 1–2: KIỂM KÊ VÀ CHẤM ĐIỂM ─────────────────────────────────
   Nguồn: 7 goals, 13 h2 + 4 h3, các khối cal kind why|danger|warn|tip,
   terms, recap (15 ý) và bảng lỗi thường gặp (13 dòng) của lessons/bai-22.js.

   D = phụ thuộc về sau · C = giá của hiểu sai · K = phản trực giác  (0/1/2)

   #   Ứng viên                                              D  C  K   Σ
   ──────────────────────────────────────────────────────────────────────
   1   counter++ là đọc–cộng–ghi; mức tối ưu đổi CẢ KIỂU
       sai, và -O2 in ra ĐÚNG số mà vẫn sai                   2  2  2   6  <= TRỤC 0
   2   Sự đúng đắn có giá đo được: 1x / ~3x / ~12x, nên
       đòn bẩy là SỐ LẦN vào vùng tới hạn, không phải
       chọn khoá "nhanh hơn"                                  2  2  2   6  <= TRỤC 1
   3   Deadlock là một CHU TRÌNH chờ; thứ tự khoá toàn cục
       làm chu trình không hình thành được. Tiến trình
       deadlock trông khoẻ mạnh: 0 % CPU, State S             2  2  2   6  <= TRỤC 2
   4   Luồng chia sẻ mọi thứ trừ ngăn xếp + thanh ghi, nên
       một luồng SIGSEGV giết cả tiến trình                   2  2  1   5
   5   pthread_cond_wait phải nằm trong while, không phải
       if — thức giả (spurious wakeup) là hợp lệ              1  2  2   5
   6   Vòng lặp bận và cond_wait cho cùng kết quả nhưng
       99 % CPU so với 0 % CPU                                1  2  1   4
   7   -pthread không phải -lpthread: phần quan trọng là
       -D_REENTRANT ở giai đoạn TIỀN XỬ LÝ                    1  2  1   4
   8   Ngăn xếp 8 MB mỗi luồng là bộ nhớ ẢO — VmSize 803 MB
       nhưng VmRSS chỉ 2,7 MB                                 1  1  2   4
   9   Hàm pthread_* TRẢ VỀ mã lỗi, không đặt errno           1  2  1   4
   10  atomic chỉ đúng cho MỘT ô nhớ; nhiều biến phải
       nhất quán với nhau thì bắt buộc mutex                  1  1  1   3
   11  Tạo luồng rẻ hơn fork ~2,4–2,8 lần                     1  0  1   2
   12  ps -L / TID / NLWP / /proc/PID/task                    1  0  1   2
   13  volatile không làm cho thao tác trở thành nguyên tử    1  2  1   4

   ── BƯỚC 3: CẮT ──────────────────────────────────────────────────────────
   Ba ứng viên đạt Σ = 6, và chỉ ba ứng viên đó được điểm 2 ở cả ba axis.
   Lấy #1, #2, #3.

   ── BƯỚC 4: LOẠI ─────────────────────────────────────────────────────────
   #13 ĐÃ LÀ TRỤC CỦA bt-14 ("volatile vô hình ở -O0"). Theo §13.4 bước 4
       một khái niệm chỉ được xoáy MỘT lần trong cả khoá, nên ở đây nó chỉ
       được một câu ở phần D và một dòng trong bảng chẩn đoán.
   #4  Rất mạnh, nhưng cùng họ với "fork cho hai bản sao" đã xoáy ở bt-20 —
       giữ lại làm câu đơn (A3, B6, C4), không làm trục.
   #5  Chỉ được một câu A5 và một câu C5; nó là hệ quả kỹ thuật của trục 1
       (giá của đồng bộ), không đứng riêng thành trục.
   #11 #12 Tra cứu được trong mười giây (§13.3 cấm làm trục) -> tối đa một
       câu ở phần A hoặc một dòng số liệu trong phần B.

   ── BƯỚC 5: BA CÂU CÓ THỂ SAI ────────────────────────────────────────────
   T0  counter++ là ba việc (đọc, cộng, ghi), nên hai luồng cùng chạy nó sẽ
       mất phép cộng. Số bị mất phụ thuộc MỨC TỐI ƯU, và mức nguy hiểm nhất
       là -O2: nó in ra đúng 2 000 000 trong khi mã máy vẫn không hề khoá.
   T1  Sự đúng đắn có giá đo được và chênh nhau một bậc: không khoá 1x,
       atomic ~3x, mutex ~12x. Vì thế đòn bẩy thiết kế là giảm SỐ LẦN vào
       vùng tới hạn, không phải đi tìm một loại khoá rẻ hơn.
   T2  Deadlock không phải chuyện xui: nó là một chu trình trong đồ thị chờ.
       Áp một thứ tự khoá toàn cục thì chu trình KHÔNG THỂ hình thành. Và
       tiến trình đang deadlock trông hoàn toàn khoẻ mạnh từ bên ngoài.

   ── BƯỚC 6: HIỂU LẦM ĐỐI ỨNG ─────────────────────────────────────────────
   M0  "Chạy ở -O2 ba lần đều ra đúng 2 000 000, vậy code không có race."
   M1  "Mutex chậm gấp 12 lần nên phải thay hết bằng atomic."
   M2  "Deadlock hiếm lắm, cứ đặt timeout rồi thử lại là xong."

   ── BƯỚC 7: LƯỚI 3 × 1 ───────────────────────────────────────────────────
          A (nhớ lại)              B (giải thích số liệu)      C (quyết định)
   T0     a1 counter++ mấy thao    b1 bắt lỗi phát biểu        c1 viết tiêu
          tác, mức nào nguy hiểm   "-O2 ra đúng 3/3 lần"       chí nghiệm thu
          nhất (phát biểu)         (số liệu thật + mã máy)     cho firmware
   T1     a4 đúng/sai: mutex       b2 đọc bảng correctness     c2 bộ đếm xung
          chậm 12x nên luôn        + timing 11/31/136 ms       20 kHz trên lõi
          thay bằng atomic         (số liệu thật)              đơn 400 MHz
   T2     a7 điền: cách rẻ nhất    b3 đọc ps -L WCHAN          c3 gateway treo
          để chu trình chờ không   futex_do_wait + exit 124    lúc 3 giờ sáng,
          hình thành được          (số liệu thật)              0 % CPU

   Kiểm tra: C1/C2/C3 đều KHÔNG trả lời được nếu chưa nắm trục; ba mức dùng
   ba loại kích thích khác nhau (phát biểu / số liệu đo / tình huống có ràng
   buộc mới); không câu nào lộ đáp án cho câu sau — b2 nói về ba con số đo
   được còn c2 hỏi một ngân sách thời gian trên phần cứng khác hẳn.

   ── XUẤT XỨ SỐ LIỆU ──────────────────────────────────────────────────────
   Mọi bản ghi terminal trong file này là output THẬT đã được kiểm chứng khi
   soạn Bài 22, trên WSL2 Ubuntu 26.04, gcc 15.2.0, glibc 2.43, 6 nhân, từ
   các chương trình trong ~/bt22 của phần Thực hành Bài 22.
   Bốn điểm cần ghi chú:
     · race_o0 KHÔNG tất định — bốn lần chạy cho 41,5 % / 20,5 % / 39,5 % /
       29,7 %. Chính sự dao động đó là nội dung câu B1 và E2.
     · -O1 thì NGƯỢC LẠI: mất đúng 1 000 000 = 50,0 % ở cả 10/10 lần chạy.
       Tính tất định ấy là bằng chứng mạnh nhất rằng "chạy thử vài lần"
       không nói lên điều gì về race.
     · Số đo thời gian dao động theo tải máy: race_o0 10–14 ms, atomic
       29–35 ms, mutex 133–143 ms. Tỷ lệ 1x / ~3x / ~12x mới là thứ ổn định,
       không phải giá trị tuyệt đối.
     · Lần chạy ĐẦU TIÊN của phép đo tạo luồng luôn cao bất thường (727 µs
       so với 80–103 µs) vì trang nhớ chưa được nạp. Phải chạy nóng một lần
       rồi mới lấy số — câu E6 bắt người học tự gặp lại điều đó.
   ══════════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-22',
  minutes: 85,

  intro:
    '<p>Bài 22 là bài đầu tiên trong cả khoá mà <b>chương trình của bạn có thể sai mà vẫn ' +
    'in ra đúng</b>. Bộ bài tập này xoáy vào ba điều người học thường tưởng đã hiểu sau khi ' +
    'đọc xong: <b>(1)</b> vì sao <code>-O2</code> in ra đúng 2 000 000 mà chương trình vẫn ' +
    'hỏng; <b>(2)</b> đồng bộ có giá bao nhiêu, và đòn bẩy để giảm giá đó nằm ở đâu — gần ' +
    'như chắc chắn không phải chỗ bạn nghĩ; <b>(3)</b> vì sao deadlock không phải chuyện ' +
    'xui, và vì sao một tiến trình đang deadlock trông <i>khoẻ mạnh</i>.</p>' +
    '<p><b>Chia làm hai lượt, và khoảng nghỉ giữa hai lượt là một thành phần của bài tập, ' +
    'không phải sự trì hoãn.</b></p>' +
    '<ul>' +
    '<li><b>Lượt 1</b> — ngay sau khi đọc xong Bài 22: phần <b>A</b> và <b>B</b> (~23 phút).</li>' +
    '<li><b>Lượt 2</b> — sau 2–3 ngày: phần <b>C</b>, <b>D</b> và <b>E</b> (~60 phút). Nhớ lại ' +
    'sau khi đã quên một phần thì bền hơn nhớ lại lúc còn nóng.</li>' +
    '</ul>' +
    '<p>Phần <b>E</b> cần các chương trình trong <code>~/bt22</code> mà bạn đã viết ở phần ' +
    'Thực hành Bài 22. Nếu đã xoá, hãy gõ lại — gõ lại chính là bài tập.</p>',

  truc: [
    { id: 'optlevel', name: 'counter++ là ba việc, và -O2 giấu hậu quả đi',
      x: 'Một phép <code>counter++</code> là đọc, cộng, rồi ghi. Hai luồng cùng chạy nó thì ' +
         'mất phép cộng — nhưng <b>mất bao nhiêu và mất kiểu gì thì do mức tối ưu quyết ' +
         'định</b>. Nguy hiểm nhất là <code>-O2</code>: nó gộp cả vòng lặp thành một lệnh và ' +
         'in ra đúng con số mong đợi, trong khi mã máy vẫn không hề khoá gì cả.',
      mis: 'Chạy thử ở -O2 ba lần đều ra đúng số, vậy là không có race.' },

    { id: 'costlock', name: 'Đúng thì có giá, và giá nằm ở số lần vào vùng tới hạn',
      x: 'Không khoá 1×, <code>atomic_fetch_add</code> ~3×, <code>pthread_mutex</code> ~12×. ' +
         'Ba con số đó nói rằng đòn bẩy thiết kế không phải là đi tìm loại khoá rẻ hơn, mà ' +
         'là <b>giảm số lần bước vào vùng tới hạn</b> — gộp một triệu phép cộng thành một ' +
         'lần khoá thì mutex rẻ gần bằng không khoá.',
      mis: 'Mutex chậm gấp 12 lần nên phải thay hết bằng atomic.' },

    { id: 'cycle', name: 'Deadlock là một chu trình, không phải xui xẻo',
      x: 'Hai luồng lấy hai khoá theo hai thứ tự ngược nhau tạo ra một <b>chu trình</b> ' +
         'trong đồ thị chờ. Áp một thứ tự khoá toàn cục thì chu trình không thể hình thành ' +
         'được nữa — đây là cách sửa <i>cấu trúc</i>, không phải làm cho lỗi hiếm đi. Và ' +
         'tiến trình đang deadlock trông khoẻ mạnh: 0 % CPU, <code>State: S</code>, không ' +
         'một dòng log lỗi.',
      mis: 'Deadlock hiếm lắm, cứ đặt timeout rồi thử lại là xong.' }
  ],

  A: [
    { id: 'a1', k: 'mcq', tag: 'Trắc nghiệm nhanh', truc: 0,
      q: 'Cùng một file <code>race.c</code> (hai luồng, mỗi luồng <code>counter++</code> một ' +
         'triệu lần) được biên dịch ở ba mức tối ưu. Mức nào cho kết quả <b>nguy hiểm ' +
         'nhất</b> đối với một người đang đi tìm lỗi?',
      opts: [
        '<code>-O0</code> — mỗi lần chạy mất một số phép cộng khác nhau',
        '<code>-O1</code> — lần nào cũng mất đúng 1 000 000 phép cộng',
        '<code>-O2</code> — lần nào cũng in ra đúng 2 000 000',
        'Cả ba nguy hiểm như nhau vì cả ba đều từ cùng một mã nguồn'
      ],
      a: 2,
      why: '<code>-O2</code> nguy hiểm nhất <b>chính vì nó in ra đúng</b>. Ở mức này trình ' +
           'biên dịch xoá sổ cả vòng lặp và thay bằng một lệnh duy nhất ' +
           '<code>addq $0xf4240,counter</code> — cộng thẳng một triệu trong một nhịp. Cửa sổ ' +
           'để hai luồng va nhau hẹp lại còn gần bằng không, nên kết quả <i>trông</i> đúng. ' +
           'Nhưng mã máy vẫn <b>không hề khoá</b>: đổi CPU, đổi trình biên dịch, thêm luồng ' +
           'thứ ba, hoặc chỉ cần một ngắt rơi đúng chỗ là nó sai lại. <code>-O0</code> và ' +
           '<code>-O1</code> tuy sai nhưng chúng <i>tố cáo</i> lỗi ra; <code>-O2</code> giấu ' +
           'lỗi đi rồi gửi thẳng nó ra hiện trường.' },

    { id: 'a2', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Trên máy học (glibc 2.43), lệnh liên kết <b>thiếu</b> <code>-pthread</code> vẫn ' +
         'thành công. Vậy vì sao vẫn phải viết <code>-pthread</code>?',
      opts: [
        'Không cần nữa — từ glibc 2.34 nó đã thành thừa, giữ lại chỉ vì thói quen',
        'Vì <code>-pthread</code> còn bật <code>-D_REENTRANT</code> ở giai đoạn tiền xử lý, và vì máy đích có thể chạy glibc cũ hoặc musl',
        'Vì không có nó thì <code>pthread_create</code> trả về mã lỗi <code>EAGAIN</code> lúc chạy',
        'Vì trình liên kết cần nó để đặt <code>libpthread.so.0</code> vào mục <code>NEEDED</code>'
      ],
      a: 1,
      why: '<p><code>gcc -pthread -###</code> cho thấy cờ này nở ra thành <b>hai</b> thứ: ' +
           '<code>-D_REENTRANT</code> và <code>-lpthread</code>. Phần liên kết đúng là đã ' +
           'thừa — từ glibc 2.34 <code>pthread_create</code> nằm ngay trong ' +
           '<code>libc.so.6</code> (hai phiên bản ký hiệu ở cùng một địa chỉ ' +
           '<code>0xa42d0</code>), còn <code>libpthread.so.0</code> chỉ còn là cái vỏ rỗng ' +
           '<b>14 408 byte</b>. Nhưng phần <b>tiền xử lý</b> thì không thừa: ' +
           '<code>-D_REENTRANT</code> bật các phiên bản an toàn-đa-luồng của một số macro ' +
           'trong header — chuyện xảy ra ở giai đoạn 1 của Bài 15, không phải giai đoạn 4.</p>' +
           '<p>Và lý do thực dụng hơn: <b>máy bạn không phải máy đích</b>. Trên một rootfs ' +
           'nhúng chạy glibc 2.28 hoặc musl, thiếu <code>-pthread</code> là ' +
           '<code>undefined reference to &#39;pthread_create&#39;</code> ngay lập tức — bạn ' +
           'sẽ gặp đúng tình huống này khi biên dịch chéo.</p>' },

    { id: 'a3', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Một tiến trình có luồng chính và một luồng phụ. Luồng phụ dereference con trỏ ' +
         '<code>NULL</code>. Chuyện gì xảy ra?',
      opts: [
        'Chỉ luồng phụ chết; luồng chính nhận mã lỗi qua <code>pthread_join</code> rồi chạy tiếp',
        'Cả tiến trình chết với <code>Segmentation fault</code>, mã thoát 139',
        'Luồng phụ nằm lại ở trạng thái <code>Z</code> cho tới khi luồng chính <code>join</code>',
        'Nhân tự khởi động lại luồng phụ tối đa ba lần rồi mới giết tiến trình'
      ],
      a: 1,
      why: '<p>Đo thật trong bài, hai chương trình đặt cạnh nhau:</p>' +
           '<pre><code>$ ./thread_crash\n' +
           'main still alive, second 0\n' +
           'main still alive, second 1\n' +
           'Segmentation fault\n' +
           'exit code = 139\n' +
           '\n' +
           '$ ./child_crash\n' +
           'parent still alive, second 0\n' +
           'parent still alive, second 1\n' +
           'parent still alive, second 2\n' +
           'child died from signal 11, parent CONTINUES RUNNING NORMALLY\n' +
           'exit code parent = 0</code></pre>' +
           '<p><code>thread_crash</code> in được <b>2</b> dòng trên 5 rồi chết cả cụm. ' +
           '<code>child_crash</code> in đủ <b>3</b> dòng và thoát 0. Cùng một lỗi ' +
           '<code>SIGSEGV</code>, hai kết cục trái ngược — vì tín hiệu chết người được gửi ' +
           'tới <b>tiến trình</b>, và luồng không phải là một tiến trình. Đây là lý do thật ' +
           'sự để tách một plugin của bên thứ ba ra thành <i>tiến trình</i> riêng chứ không ' +
           'phải luồng riêng.</p>' },

    { id: 'a4', k: 'tf', tag: 'Đúng/Sai kèm sửa', truc: 1,
      q: 'Xét phát biểu: <i>"Đo được mutex chậm gấp khoảng 12 lần so với không khoá, còn ' +
         '<code>atomic_fetch_add</code> chỉ chậm khoảng 3 lần. Vậy quy tắc thiết kế là: chỗ ' +
         'nào đang dùng mutex thì thay bằng biến nguyên tử."</i>',
      a: 1,
      rw: 'Viết lại phát biểu cho đúng, và nói rõ <b>đòn bẩy thật sự</b> để giảm chi phí ' +
          'đồng bộ nằm ở đâu.',
      crit: [
        'Nêu được giới hạn của biến nguyên tử: nó chỉ bảo vệ <b>một ô nhớ</b>, nên không thay được mutex khi vùng tới hạn phải giữ nhiều biến nhất quán',
        'Chỉ ra đòn bẩy thật: <b>số lần bước vào vùng tới hạn</b>, không phải loại khoá',
        'Nêu cách sửa cụ thể: cộng vào biến cục bộ rồi khoá <b>một lần</b> lúc cuối — vẫn dùng đúng con mutex cũ',
        'Không kết luận rằng mutex "chậm": 12× là tỷ lệ giữa chi phí đồng bộ và một phép cộng, không phải thuộc tính của mutex'
      ],
      why: '<p>Hai chỗ hỏng.</p>' +
           '<p><b>Thứ nhất, không phải lúc nào cũng thay được.</b> ' +
           '<code>atomic_fetch_add</code> chỉ bảo vệ <b>một ô nhớ</b>. Nếu vùng tới hạn phải ' +
           'giữ <i>hai</i> biến nhất quán với nhau — vừa đẩy phần tử vào bộ đệm vừa tăng ' +
           'biến đếm chẳng hạn — thì không lệnh nguyên tử nào làm được, và mutex là bắt ' +
           'buộc. Nguyên tử là công cụ cho bộ đếm và cờ, không phải bản thay thế tổng quát.</p>' +
           '<p><b>Thứ hai, và quan trọng hơn: chọn sai đòn bẩy.</b> Con số 12× đó đo trong ' +
           'điều kiện tệ nhất có thể — khoá và mở khoá <b>hai triệu lần</b> để bảo vệ đúng ' +
           'một phép cộng. Chi phí không nằm ở <i>loại</i> khoá mà nằm ở <b>số lần bước vào ' +
           'vùng tới hạn</b>. Cho mỗi luồng cộng vào một biến cục bộ rồi chỉ khoá <b>một lần ' +
           'duy nhất</b> lúc cuối để cộng gộp, chi phí đồng bộ tụt xuống gần bằng không — ' +
           'với chính con mutex đó, không đổi gì hết. Câu E4 bắt bạn tự đo điều này.</p>' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Xét phát biểu: <i>"<code>pthread_cond_wait</code> chỉ trả về khi có luồng khác gọi ' +
         '<code>pthread_cond_signal</code>, nên viết <code>if (count == 0) ' +
         'pthread_cond_wait(...)</code> là đủ."</i>',
      a: 1,
      rw: 'Viết lại cho đúng, và cho biết phải thay <code>if</code> bằng gì.',
      crit: [
        'Nói đúng <code>if</code> phải đổi thành <code>while</code>',
        'Nêu lý do thứ nhất: <b>thức giả</b> — POSIX cho phép <code>pthread_cond_wait</code> trả về khi chưa ai báo hiệu',
        'Nêu lý do thứ hai (độc lập với lý do một): giữa lúc tỉnh dậy và lúc giành lại mutex, luồng khác có thể đã lấy mất phần tử',
        'Đọc đúng hợp đồng của <code>pthread_cond_wait</code>: nhả khoá, ngủ, giành lại khoá — nó không hứa gì về <i>lý do</i> bạn tỉnh'
      ],
      why: '<p><code>pthread_cond_wait</code> <b>được phép</b> trả về khi chưa ai báo hiệu ' +
           'gì cả — hiện tượng gọi là <i>thức giả</i> (spurious wakeup). Chuẩn POSIX cho ' +
           'phép điều đó để hiện thực cài đặt được hiệu quả hơn, và trên nhân Linux nó xảy ' +
           'ra thật khi một tín hiệu chen vào lúc luồng đang ngủ trong <code>futex</code>.</p>' +
           '<p>Nhưng kể cả khi không có thức giả thì <code>if</code> vẫn hỏng: giữa lúc luồng ' +
           'được đánh thức và lúc nó giành lại được mutex, một luồng thứ ba có thể đã lấy ' +
           'mất phần tử. Luồng bạn tỉnh dậy, tin rằng điều kiện đã đúng, và đọc vào bộ đệm ' +
           'rỗng.</p>' +
           '<p><b>Cách viết duy nhất đúng</b> — điều kiện phải được kiểm tra <i>lại</i> sau ' +
           'mỗi lần tỉnh:</p>' +
           '<pre><code>pthread_mutex_lock(&amp;lock);\n' +
           'while (count == 0)                 /* while, not if */\n' +
           '    pthread_cond_wait(&amp;not_empty, &amp;lock);\n' +
           'item = buffer[--count];\n' +
           'pthread_mutex_unlock(&amp;lock);</code></pre>' +
           '<p>Hãy đọc <code>pthread_cond_wait</code> đúng như nó là: "nhả khoá, ngủ, và khi ' +
           'tỉnh dậy thì giành lại khoá". Nó không hứa gì về <i>lý do</i> bạn tỉnh.</p>' },

    { id: 'a6', k: 'num', tag: 'Trắc nghiệm nhanh', unit: 'byte', tol: 0,
      q: 'Trên máy học, mỗi luồng tạo bằng <code>pthread_create</code> nhận ngăn xếp mặc ' +
         'định bao nhiêu <b>byte</b>?',
      a: 8388608,
      ph: 'ví dụ: 65536',
      why: '<p><b>8 388 608 byte = 8 MB</b>, đúng bằng <code>ulimit -s</code> của luồng ' +
           'chính. Con số này chỉ đáng nhớ vì hệ quả của nó:</p>' +
           '<pre><code>default stack per thread = 8388608 byte = 8192 KB = 8 MB\n' +
           'after resizing           = 65536 byte = 64 KB\n' +
           'PTHREAD_STACK_MIN        = 16384 byte\n' +
           'VmSize:   822368 kB\n' +
           'VmRSS:      2772 kB\n' +
           'Threads:  101</code></pre>' +
           '<p>Một trăm luồng chiếm <b>822 368 kB ≈ 803 MB</b> bộ nhớ <i>ảo</i> — gấp mười ' +
           'hai lần RAM của một thiết bị 64 MB. Nhưng <code>VmRSS</code> chỉ <b>2 772 kB ≈ ' +
           '2,7 MB</b>: nhân mới chỉ <i>hứa</i> chứ chưa cấp trang nào cho tới khi luồng ' +
           'thật sự chạm tới. Trên hệ 64-bit lời hứa đó gần như luôn giữ được; trên hệ ' +
           '<b>32-bit</b> thì không — không gian địa chỉ chỉ có 4 GB, và vài trăm luồng là ' +
           'hết sạch dù RAM còn nguyên. Đó là lý do trên thiết bị nhúng người ta đặt ' +
           '<code>pthread_attr_setstacksize</code> xuống 64 KB.</p>' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết', truc: 2,
      q: 'Deadlock ở Bài 22 xảy ra vì hai luồng lấy hai khoá theo hai <b>____</b> ngược ' +
         'nhau, tạo thành một chu trình chờ. Cách phòng rẻ nhất và chắc chắn nhất là bắt ' +
         '<i>mọi</i> luồng trong chương trình lấy khoá theo cùng một <b>____</b> đã quy ước ' +
         'trước. Cả hai chỗ trống là cùng một từ — điền một lần.',
      a: ['thứ tự', 'thu tu', 'thứ tự khoá', 'thu tu khoa', 'trình tự', 'trinh tu',
          'thứ tự toàn cục', 'thu tu toan cuc'],
      ph: 'ví dụ: một từ hai âm tiết',
      why: '<p>Cùng một từ cho cả hai chỗ trống: <b>thứ tự</b>.</p>' +
           '<p>Đây không phải mẹo vặt mà là cách sửa <b>cấu trúc</b>. Deadlock cần đủ bốn ' +
           'điều kiện đồng thời (loại trừ lẫn nhau · giữ và chờ · không cướp được · chờ ' +
           'vòng tròn), và trong phần mềm ứng dụng thì <b>chờ vòng tròn</b> là điều kiện duy ' +
           'nhất bạn phá được rẻ tiền: đánh số các khoá và bắt mọi luồng lấy theo thứ tự ' +
           'tăng dần. Khi đó chu trình <i>không thể</i> hình thành — không phải "hiếm hơn", ' +
           'mà là không thể, với mọi lịch chạy, mọi số nhân, mọi mức tải.</p>' +
           '<p>So với các cách "chữa" thường gặp: đặt timeout rồi thử lại chỉ biến một lỗi ' +
           'treo thành một lỗi chậm không tái hiện được; đảo thứ tự đánh thức chỉ làm xác ' +
           'suất nhỏ đi. Cả hai đều để nguyên cái chu trình nằm đó.</p>' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi hiện tượng quan sát được với nguyên nhân đúng của nó.',
      left: [
        'In ra <code>2000000</code> ở <code>-O2</code> nhưng <code>1000000</code> ở <code>-O1</code>',
        'Tiến trình dùng 0 % CPU, mọi luồng đều ở <code>futex_do_wait</code>',
        'Một luồng dùng 100 % CPU, kết quả cuối cùng vẫn đúng',
        '<code>pthread_create</code> trả về <b>11</b> nhưng <code>errno</code> vẫn là 0',
        '<code>ps</code> hiện một dòng, <code>ps -L</code> hiện bốn dòng cùng PID',
        'Consumer đọc phải bộ đệm rỗng dù đã <code>pthread_cond_wait</code>'
      ],
      right: [
        'Vòng lặp bận thay cho <code>pthread_cond_wait</code> — đúng nhưng đốt điện vô ích',
        'Điều kiện được kiểm bằng <code>if</code> thay vì <code>while</code>',
        'Bốn luồng trong cùng một tiến trình; <code>-L</code> mới tách chúng ra',
        'Trình tối ưu gộp cả vòng lặp thành một lệnh, cửa sổ va chạm hẹp lại gần bằng không',
        'Hàm <code>pthread_*</code> trả thẳng mã lỗi (<code>EAGAIN</code>) chứ không đặt <code>errno</code>',
        'Deadlock — mọi luồng đang ngủ chờ một khoá không bao giờ được nhả'
      ],
      a: [3, 5, 0, 4, 2, 1],
      why: '<p>Ba cặp hay bị lẫn.</p>' +
           '<p><b>0 % CPU so với 100 % CPU.</b> Hai triệu chứng trông đều "bất thường" nhưng ' +
           'chỉ ra hai lỗi trái ngược nhau. Treo mà <b>0 %</b> là đang <i>chờ</i> — deadlock ' +
           'hoặc chờ I/O. Treo mà <b>100 %</b> là đang <i>quay</i> — vòng lặp bận hoặc vòng ' +
           'lặp vô hạn. Câu hỏi đầu tiên khi một daemon đứng hình luôn là con số này, và ' +
           '<code>top -H -p &lt;pid&gt;</code> cho nó theo từng luồng.</p>' +
           '<p><b>Mã lỗi trả về so với <code>errno</code>.</b> Đây là ngoại lệ lớn nhất của ' +
           'thư viện C: <code>open</code>/<code>read</code>/<code>write</code> trả ' +
           '<code>-1</code> rồi đặt <code>errno</code> (Bài 19), còn ' +
           '<code>pthread_create</code> trả thẳng <b>11</b> = <code>EAGAIN</code> và không ' +
           'đụng tới <code>errno</code>. Gọi <code>perror("pthread_create")</code> sau khi ' +
           'nó lỗi sẽ in ra <code>Success</code>.</p>' +
           '<p><b><code>ps</code> so với <code>ps -L</code>.</b> Không có <code>-L</code>, ' +
           'bốn luồng gộp thành một dòng và bạn không nhìn thấy chúng tồn tại. Có ' +
           '<code>-L</code>, cột <code>PID</code> giống nhau ở cả bốn dòng còn ' +
           '<code>TID</code> khác nhau — đó chính là hình ảnh "một tiến trình, nhiều luồng".</p>' }
  ],

  B: [
    { id: 'b1', k: 'free', tag: 'Bắt lỗi phát biểu', rows: 6, truc: 0,
      q: 'Một đồng nghiệp gửi bạn tin nhắn dưới đây để đóng một ticket race condition. ' +
         '<b>Mọi số liệu anh ấy đưa ra đều đúng và đều đo thật.</b> Hãy chỉ ra chỗ ' +
         '<b>suy luận</b> hỏng, và nói xem kết luận đúng phải là gì.',
      blocks: [
        { t: 'cal', kind: 'info', title: 'Tin nhắn của đồng nghiệp', x:
          '"Tôi đã kiểm tra cái bug bộ đếm rồi. Build production của mình dùng ' +
          '<code>-O2</code>, và tôi chạy 3 lần: lần nào cũng ra đúng <code>2000000</code>, ' +
          'sai số 0,0 %. Tôi cũng đọc thử mã máy cho chắc, nó gọn hết mức có thể — đúng ' +
          '<b>một lệnh</b> cho cả vòng lặp. Cái báo cáo lỗi kia chắc là build debug ' +
          '<code>-O0</code> nên mới có chuyện. Tôi đóng ticket nhé."' },
        { t: 'code', where: 'out', nocopy: true, name: 'ba lần chạy bản -O2',
          code: 'expected 2000000, actual 2000000, lost 0 increments (0.0%)\n' +
                'expected 2000000, actual 2000000, lost 0 increments (0.0%)\n' +
                'expected 2000000, actual 2000000, lost 0 increments (0.0%)' },
        { t: 'code', where: 'out', nocopy: true, name: 'objdump -d bản -O2',
          code: '0000000000001270 <increment>:\n' +
                '    1270:\tendbr64\n' +
                '    1274:\taddq   $0xf4240,0x2d99(%rip)        # 4018 <counter>\n' +
                '    127f:\txor    %eax,%eax\n' +
                '    1281:\tret' }
      ],
      hint: 'Đọc kỹ lệnh <code>addq</code> đó. Nó cộng bao nhiêu, và nó có tiền tố gì ở ' +
            'phía trước không? So với dòng mã máy của bản nguyên tử.',
      crit: [
        'Chỉ đúng lỗi suy luận: ba lần chạy đúng chứng minh <b>xác suất va chạm nhỏ</b>, không chứng minh <b>không có race</b>',
        'Đọc được ý nghĩa của <code>addq $0xf4240</code>: trình tối ưu đã gộp cả một triệu vòng lặp thành <b>một</b> phép cộng, nên chỉ còn <b>một</b> cửa sổ va chạm thay vì một triệu',
        'Nhận ra rằng lệnh đó <b>không có tiền tố <code>lock</code></b>, nên nó vẫn là đọc–sửa–ghi không nguyên tử ở mức phần cứng',
        'Bác được lập luận "chắc là do build debug": <code>-O1</code> mất đúng <b>1 000 000</b> ở <b>10/10</b> lần chạy, nên lỗi không phải đặc sản của <code>-O0</code>',
        'Nêu đúng điều gì làm kết quả sai trở lại: đổi CPU, đổi phiên bản trình biên dịch, thêm luồng thứ ba, hoặc chỉ cần mã đổi đủ để <code>counter++</code> không gộp được nữa',
        'Kết luận đúng: tiêu chí đúng/sai của một race <b>không phải kết quả in ra</b> mà là mã máy có bảo đảm nguyên tử hay không'
      ],
      sol: '<p><b>Số liệu đúng, suy luận sai — và bằng chứng nằm ngay trong đoạn mã máy anh ' +
           'ấy tự dán vào.</b></p>' +
           '<p><b>Lệnh đó cộng một triệu, không phải cộng một.</b> ' +
           '<code>$0xf4240</code> là <code>1000000</code> ở hệ mười sáu. Trình tối ưu đã ' +
           'nhìn ra vòng lặp chỉ cộng 1 một triệu lần và thay cả vòng lặp bằng <i>một</i> ' +
           'phép cộng. Số cửa sổ va chạm vì thế tụt từ 1 000 000 xuống <b>1</b>. Xác suất ' +
           'hai luồng va nhau trong đúng một nhịp đó là rất nhỏ — đó là toàn bộ lý do ba lần ' +
           'chạy đều đẹp.</p>' +
           '<p><b>Nhưng nó vẫn không nguyên tử.</b> So hai dòng:</p>',
      solBlocks: [
        { t: 'code', where: 'out', nocopy: true, name: '-O2 (sai, chỉ là may)',
          code: '    1274:\taddq   $0xf4240,0x2d99(%rip)        # 4018 <counter>' },
        { t: 'code', where: 'out', nocopy: true, name: 'atomic_fetch_add (đúng)',
          code: '    11be:\tlock addq $0x1,0x2e51(%rip)        # 4018 <counter>' },
        { t: 'p', x:
          'Khác nhau đúng một chữ: <b><code>lock</code></b>. Không có tiền tố đó, ' +
          '<code>addq</code> trên toán hạng bộ nhớ vẫn là đọc–sửa–ghi ở mức vi kiến trúc, và ' +
          'một lõi khác <i>được phép</i> chen vào giữa. Bảo đảm mà bạn cần là bảo đảm phần ' +
          'cứng, và ở đây nó vắng mặt.' },
        { t: 'cal', kind: 'danger', title: 'Và lập luận "chắc do build debug" cũng sai', x:
          '<p>Nếu lỗi chỉ có ở <code>-O0</code> thì còn nghe được. Nhưng <code>-O1</code> — ' +
          'một mức tối ưu thật, hay dùng cho build nhúng vì nó nhỏ — mất <b>đúng 1 000 000</b> ' +
          'phép cộng ở <b>10/10</b> lần chạy:</p>' +
          '<pre><code>--- -O1, 5 runs ---\n' +
          'expected 2000000, actual 1000000, lost 1000000 increments (50.0%)\n' +
          'expected 2000000, actual 1000000, lost 1000000 increments (50.0%)\n' +
          'expected 2000000, actual 1000000, lost 1000000 increments (50.0%)\n' +
          'expected 2000000, actual 1000000, lost 1000000 increments (50.0%)\n' +
          'expected 2000000, actual 1000000, lost 1000000 increments (50.0%)</code></pre>' +
          '<p>Cùng một mã nguồn cho <b>ba kiểu sai khác nhau</b> tuỳ mức tối ưu: ' +
          '<code>-O0</code> mất một số ngẫu nhiên mỗi lần, <code>-O1</code> mất chính xác ' +
          'một nửa mọi lần, <code>-O2</code> không mất gì. Một chương trình mà tính đúng đắn ' +
          'phụ thuộc vào cờ <code>-O</code> thì <b>chưa đúng</b>, dù cờ hiện tại đang cho ' +
          'kết quả đẹp.</p>' },
        { t: 'p', x:
          '<b>Kết luận đúng:</b> đừng đóng ticket. Tiêu chí không phải là con số in ra mà là ' +
          '<i>mã máy có bảo đảm nguyên tử hay không</i> — và câu đó chỉ trả lời được bằng ' +
          '<code>objdump</code>, hoặc bằng cách viết đúng ngay từ đầu với ' +
          '<code>atomic_fetch_add</code> hay một mutex.' }
      ] },

    { id: 'b2', k: 'free', tag: 'Đọc output', rows: 6, truc: 1,
      q: 'Đây là bản ghi thật của bước cuối phần Thực hành Bài 22: ba phiên bản cùng một bài ' +
         'toán (hai luồng, mỗi luồng cộng một triệu lần), đo trong cùng một lần chạy. Hãy ' +
         'đọc <b>cả hai khối</b> rồi trả lời: nếu phải giảm chi phí đồng bộ của chương trình ' +
         'này, bạn sẽ đụng vào cái gì, và vì sao <i>không</i> phải là đổi loại khoá?',
      blocks: [
        { t: 'code', where: 'out', nocopy: true,
          code: '--- correctness ---\n' +
                'race_o0   expected 2000000, actual 1406709, lost 593291 increments (29.7%)\n' +
                'atomic    expected 2000000, actual 2000000\n' +
                'mutex     expected 2000000, actual 2000000\n' +
                '--- timing ---\n' +
                'race_o0: 11 ms\n' +
                'atomic: 31 ms\n' +
                'mutex: 136 ms' }
      ],
      hint: 'Hai triệu phép cộng, và mutex tốn thêm 125 ms. Chia ra: một lần khoá + mở khoá ' +
            'tốn bao nhiêu? Rồi hỏi tiếp: có nhất thiết phải khoá đủ hai triệu lần không?',
      crit: [
        'Đọc đúng ba tỷ lệ: không khoá <b>1×</b> (11 ms), <code>atomic_fetch_add</code> <b>~3×</b> (31 ms), <code>pthread_mutex</code> <b>~12×</b> (136 ms)',
        'Nói rõ con số tuyệt đối không ổn định (10–14 / 29–35 / 133–143 ms) nhưng <b>tỷ lệ</b> thì ổn định — đó mới là thứ đáng nhớ',
        'Quy được chi phí về <b>một đơn vị</b>: 125 ms dư chia cho 2 000 000 lần khoá ≈ <b>60 ns</b> cho mỗi cặp lock/unlock',
        'Chỉ ra đòn bẩy đúng là <b>số lần vào vùng tới hạn</b>, không phải loại khoá: cộng vào biến cục bộ rồi khoá <b>một lần</b> lúc cuối',
        'Ước lượng được kết quả của cách sửa đó: chi phí đồng bộ còn 2 lần khoá thay vì 2 000 000, tức là gần như biến mất',
        'Nêu được vì sao <code>atomic</code> không phải câu trả lời tổng quát: nó chỉ bảo vệ <b>một</b> ô nhớ'
      ],
      sol: '<p><b>Đọc phần correctness trước.</b> <code>race_o0</code> lần này mất ' +
           '<b>593 291</b> phép cộng (29,7 %) — con số thứ tư, khác cả ba con số đã thấy ở ' +
           'các bước trước (41,5 % / 20,5 % / 39,5 %). Đó là chữ ký của một race: ' +
           '<i>không lần nào giống lần nào</i>. Hai bản còn lại ra đúng 2 000 000, và chúng ' +
           'đúng vì được bảo đảm, không phải vì may.</p>' +
           '<p><b>Rồi mới đọc phần timing.</b> Ba tỷ lệ cần thuộc:</p>' +
           '<table><thead><tr><th>Cách</th><th>Đo được</th><th>So với không khoá</th>' +
           '<th>Dùng khi nào</th></tr></thead><tbody>' +
           '<tr><td>Không bảo vệ</td><td>10–14 ms</td><td><b>1×</b></td>' +
           '<td>Không bao giờ, nếu có nhiều hơn một luồng ghi</td></tr>' +
           '<tr><td><code>atomic_fetch_add</code></td><td>29–35 ms</td><td>~<b>3×</b></td>' +
           '<td>Bộ đếm, cờ, một biến đơn</td></tr>' +
           '<tr><td><code>pthread_mutex</code></td><td>133–143 ms</td><td>~<b>12×</b></td>' +
           '<td>Nhiều biến phải nhất quán, hoặc vùng tới hạn dài hơn một phép toán</td></tr>' +
           '</tbody></table>' +
           '<p><b>Bây giờ chia con số ra.</b> Mutex tốn thêm khoảng 125 ms cho ' +
           '<b>2 000 000</b> cặp <code>lock</code>/<code>unlock</code> — tức khoảng ' +
           '<b>60 ns</b> mỗi cặp. Đó là một con số hoàn toàn bình thường; mutex không hề ' +
           'chậm. Cái chậm là <b>bạn gọi nó hai triệu lần để bảo vệ đúng một phép cộng</b> — ' +
           'tỷ lệ chi phí trên công việc hữu ích tệ nhất có thể dựng ra.</p>' +
           '<p><b>Vì thế đòn bẩy không phải loại khoá, mà là số lần khoá.</b> Viết lại thân ' +
           'luồng như sau và chi phí đồng bộ gần như biến mất, vẫn dùng đúng con mutex cũ:</p>' +
           '<pre><code>long local = 0;\n' +
           'for (int i = 0; i &lt; 1000000; i++)\n' +
           '    local++;                       /* no lock at all */\n' +
           '\n' +
           'pthread_mutex_lock(&amp;lock);        /* exactly once per thread */\n' +
           'counter += local;\n' +
           'pthread_mutex_unlock(&amp;lock);</code></pre>' +
           '<p>Số lần vào vùng tới hạn: từ 2 000 000 xuống <b>2</b>. Câu E4 bắt bạn đo lại ' +
           'con số này trên máy mình.</p>' +
           '<p><b>Và vì sao không chỉ đơn giản đổi sang atomic:</b> ở bài toán này thì được, ' +
           'vì chỉ có một biến. Nhưng nếu vùng tới hạn phải giữ hai biến nhất quán với nhau ' +
           'thì không lệnh nguyên tử nào làm nổi, còn thủ thuật gộp ở trên thì vẫn dùng ' +
           'được. Nó là đòn bẩy tổng quát hơn.</p>' },

    { id: 'b3', k: 'free', tag: 'Đọc output', rows: 6, truc: 2,
      q: 'Một chương trình chạy mãi không xong. Bạn chạy nó dưới <code>timeout 5</code> và ' +
         'chụp trạng thái các luồng trong lúc nó còn sống. Đây là bản ghi thật. Kết luận gì, ' +
         'và bạn suy ra <b>từ chi tiết nào</b>?',
      blocks: [
        { t: 'code', where: 'out', nocopy: true, name: 'timeout 5 ./deadlock; echo "exit code = $?"',
          code: 'pid=1911\n' +
                '  [thread1] holding A, requesting B\n' +
                '  [thread2] holding B, requesting A\n' +
                'exit code = 124' },
        { t: 'code', where: 'out', nocopy: true, name: 'ps -L -o pid,tid,stat,wchan:20,comm  +  /proc/PID/status',
          code: '    PID     TID STAT WCHAN                COMMAND\n' +
                '   2008    2008 Sl+  futex_do_wait        deadlock\n' +
                '   2008    2010 Sl+  futex_do_wait        deadlock\n' +
                '   2008    2011 Sl+  futex_do_wait        deadlock\n' +
                'State:\tS (sleeping)\n' +
                'Threads:\t3' }
      ],
      hint: 'Đếm số luồng, rồi hỏi luồng thứ ba đang chờ ai. Và chú ý một chi tiết ' +
            '<i>vắng mặt</i>: dòng <code>holding both A and B</code> không hề được in.',
      crit: [
        'Kết luận đúng: <b>deadlock</b>, không phải treo vì I/O hay vòng lặp vô hạn',
        'Dẫn ra được bằng chứng thứ nhất: <b>mọi</b> luồng đều ở <code>futex_do_wait</code> — không luồng nào chạy, nên không luồng nào có thể nhả khoá',
        'Dẫn ra bằng chứng thứ hai: hai dòng <code>holding …, requesting …</code> in ra theo <b>hai thứ tự ngược nhau</b> ⇒ chu trình chờ',
        'Dẫn ra bằng chứng thứ ba: dòng <code>holding both A and B</code> <b>không</b> xuất hiện, tức không luồng nào qua được bước xin khoá thứ hai',
        'Giải thích <code>Threads: 3</code>: hai luồng làm việc cộng luồng chính đang kẹt trong <code>pthread_join</code>',
        'Giải thích <b>124</b> là mã của <code>timeout</code> — chương trình <b>bị giết</b>, nó không tự thoát',
        'Nêu đúng trạng thái <code>S</code> nghĩa là 0 % CPU, và nói được vì sao hình ảnh đó trái với trực giác "treo thì phải thấy CPU cao"'
      ],
      sol: '<p><b>Deadlock, và ba bằng chứng độc lập cùng chỉ về đó.</b></p>' +
           '<p><b>Một — mọi luồng đều ngủ.</b> Cả ba dòng đều là <code>futex_do_wait</code> ' +
           'với trạng thái <code>Sl+</code>, và <code>/proc</code> xác nhận ' +
           '<code>State: S (sleeping)</code>. <code>futex</code> là cơ chế nhân dùng để cho ' +
           'một luồng ngủ khi nó không lấy được mutex. Nếu <i>tất cả</i> đang ngủ chờ khoá ' +
           'thì không ai còn chạy để mà nhả khoá ra — vòng chờ đã khép kín.</p>' +
           '<p><b>Hai — hai dòng log dựng lại đúng cái chu trình.</b> ' +
           '<code>thread1</code> giữ A xin B; <code>thread2</code> giữ B xin A. Vẽ ra là một ' +
           'vòng tròn hai đỉnh. Đây là điều kiện "chờ vòng tròn", và nó chỉ hình thành được ' +
           'vì hai luồng lấy khoá theo <b>hai thứ tự ngược nhau</b>.</p>' +
           '<p><b>Ba — cái không được in ra.</b> Dòng <code>holding both A and B</code> vắng ' +
           'mặt hoàn toàn. Cả hai luồng dừng lại đúng ở bước xin khoá thứ hai và không tiến ' +
           'thêm được nửa bước. Trong gỡ lỗi, một dòng log <i>đáng lẽ phải có mà không có</i> ' +
           'thường nói nhiều hơn những dòng đã in.</p>' +
           '<p><b><code>Threads: 3</code>, không phải 2.</b> Luồng chính cũng nằm trong danh ' +
           'sách — nó đang kẹt trong <code>pthread_join</code>, cũng là một ' +
           '<code>futex_do_wait</code>. Đừng đọc nhầm thành "có luồng thứ ba lạ".</p>' +
           '<p><b>124 là mã của <code>timeout</code></b> (đã gặp ở Bài 21), nghĩa là "hết ' +
           'giờ, tôi phải giết nó". Chương trình không tự thoát; nếu không có ' +
           '<code>timeout</code> nó sẽ nằm đó đến khi máy tắt.</p>',
      solBlocks: [
        { t: 'cal', kind: 'danger', title: 'Hình mẫu cần thuộc — và vì sao nó phản trực giác', x:
          '<p><b>Tiến trình không tiến triển + 0 % CPU + mọi luồng ở ' +
          '<code>futex_do_wait</code> = deadlock</b>, gần như chắc chắn.</p>' +
          '<p>Phản trực giác ở chỗ: từ ngoài nhìn vào, tiến trình này trông <i>khoẻ mạnh</i>. ' +
          'Nó vẫn tồn tại, không chiếm CPU, không ăn RAM thêm, không in một dòng lỗi nào. ' +
          'Mọi bảng theo dõi đo mức tiêu thụ tài nguyên đều báo màu xanh. Nếu ngược lại bạn ' +
          'thấy <b>100 % CPU</b> thì đó là chuyện khác hẳn — vòng lặp bận hoặc vòng lặp vô ' +
          'hạn, và cách tìm cũng khác.</p>' +
          '<p>Trên thiết bị không có màn hình, đây là lý do một watchdog phải đo ' +
          '<i>tiến độ công việc</i> (đếm số gói đã xử lý chẳng hạn) chứ không phải đo ' +
          '"tiến trình còn sống hay không". Tiến trình deadlock vẫn còn sống.</p>' } ] },

    { id: 'b4', k: 'free', tag: 'Đọc output', rows: 5,
      q: 'Hai chương trình cùng chờ một điều kiện được bật sau đúng 2 giây rồi mới chạy ' +
         'tiếp. Một dùng vòng lặp bận <code>while (!ready) { }</code>, một dùng ' +
         '<code>pthread_cond_wait</code>. Đây là số đo thật. Giải thích khoảng cách, và nói ' +
         'nó có nghĩa gì trên một thiết bị chạy pin.',
      blocks: [
        { t: 'code', where: 'out', nocopy: true,
          code: '  real 2.00 s | CPU 1.99 s | CPU_pct 99%\n' +
                '  real 2.00 s | CPU 0.00 s | CPU_pct 0%' }
      ],
      hint: 'Cột <code>real</code> giống hệt nhau. Toàn bộ câu chuyện nằm ở cột thứ hai — ' +
            'và câu hỏi thật là "trong hai giây đó, nhân có tháo luồng ra khỏi hàng đợi chạy ' +
            'hay không".',
      crit: [
        'Nói rõ hai chương trình <b>hoàn thành cùng lúc</b> (2,00 s) — hiệu năng cảm nhận được là như nhau, nên số liệu duy nhất phân biệt chúng là CPU',
        'Giải thích vòng lặp bận: luồng ở trạng thái <b>R</b>, quay vòng vô nghĩa hàng tỷ lần, giữ một lõi ở 100 %',
        'Giải thích <code>pthread_cond_wait</code>: nhân đưa luồng vào trạng thái <b>S</b> và <b>tháo hẳn</b> nó khỏi hàng đợi chạy, nên nó không tiêu thụ một chu kỳ nào',
        'Nêu hệ quả trên thiết bị pin: lõi quay 100 % thì CPU không bao giờ vào được trạng thái tiết kiệm điện ⇒ tốn pin và <b>nóng</b>',
        'Nêu hệ quả trên hệ một lõi: vòng lặp bận <b>cướp</b> CPU của chính luồng đang phải bật cờ, nên có thể làm mọi thứ chậm hẳn đi chứ không chỉ tốn điện',
        'Không kết luận nhầm rằng vòng lặp bận "nhanh hơn" — cả hai đều 2,00 s'
      ],
      sol: '<p><b>Cùng kết quả, cùng thời gian, một bên đốt 1,99 giây CPU còn một bên đốt ' +
           '0,00.</b></p>' +
           '<p>Vòng lặp bận không hề nhanh hơn. Nó chỉ <i>bận</i>: luồng nằm ở trạng thái ' +
           '<code>R</code> suốt hai giây, đọc đi đọc lại một biến vài tỷ lần để chờ nó đổi. ' +
           'Nhân không có cách nào biết luồng đó đang chờ, nên vẫn xếp lịch cho nó chạy đủ ' +
           'phần của mình.</p>' +
           '<p><code>pthread_cond_wait</code> nói thẳng với nhân: "tôi đang chờ, đừng xếp ' +
           'lịch cho tôi nữa". Luồng chuyển sang <code>S</code> và bị <b>tháo hẳn khỏi hàng ' +
           'đợi chạy</b>. Không một chu kỳ nào được tiêu. Khi ai đó gọi ' +
           '<code>pthread_cond_signal</code>, nhân mới đặt nó trở lại.</p>' +
           '<p><b>Trên thiết bị nhúng, khoảng cách này quan trọng gấp bội, vì hai lý do ' +
           'khác nhau:</b></p>' +
           '<ul>' +
           '<li><b>Điện và nhiệt.</b> Một lõi bận 100 % thì CPU không bao giờ hạ được xuống ' +
           'trạng thái ngủ. Trên thiết bị chạy pin, một vòng lặp bận duy nhất có thể là toàn ' +
           'bộ khác biệt giữa "chạy được một tuần" và "chạy được một ngày" — và nó còn làm ' +
           'thiết bị nóng lên, thứ mà vỏ nhựa kín không xử lý được.</li>' +
           '<li><b>Trên hệ một lõi thì tệ hơn nữa.</b> Luồng bận không chỉ tốn điện, nó ' +
           '<i>cướp</i> CPU của chính luồng đang phải bật cờ. Điều kiện vì thế được bật ' +
           'muộn hơn. Vòng lặp bận có thể làm chậm đúng cái việc nó đang chờ.</li>' +
           '</ul>' +
           '<p><b>Cách phát hiện trên thiết bị thật:</b> <code>top -H -p &lt;pid&gt;</code> ' +
           'hiện mức CPU của <i>từng luồng</i> thay vì gộp lại. Một luồng đứng yên ở 100 % ' +
           'trong khi chương trình không làm gì là chữ ký của vòng lặp bận.</p>' },

    { id: 'b5', k: 'multi', tag: 'Đọc output',
      q: 'Một chương trình tạo <b>100</b> luồng, mỗi luồng chỉ ngủ. Đây là số liệu thật đọc ' +
         'từ <code>/proc/self/status</code>. <b>Chọn tất cả</b> các kết luận đúng.',
      blocks: [
        { t: 'code', where: 'out', nocopy: true,
          code: 'default stack per thread = 8388608 byte = 8192 KB = 8 MB\n' +
                'VmSize:   822368 kB\n' +
                'VmRSS:      2772 kB\n' +
                'Threads:  101' }
      ],
      opts: [
        'Chương trình này cần ít nhất 803 MB RAM vật lý mới chạy được.',
        '<code>Threads: 101</code> gồm 100 luồng vừa tạo cộng luồng chính.',
        'Khoảng cách giữa <code>VmSize</code> và <code>VmRSS</code> là vì ngăn xếp mới chỉ được <i>hứa</i>, nhân chưa cấp trang cho tới khi luồng chạm tới.',
        'Trên một hệ 32-bit, cùng chương trình này có thể chết vì hết <b>không gian địa chỉ</b> dù RAM vẫn còn.',
        'Đặt <code>pthread_attr_setstacksize</code> xuống 64 KB sẽ làm <code>VmRSS</code> giảm mạnh.',
        'Con số 8 MB là do <code>pthread</code> quy định cứng, không liên quan tới <code>ulimit</code>.'
      ],
      a: [1, 2, 3],
      why: '<p><b>Sai — phát biểu 1:</b> 803 MB là bộ nhớ <b>ảo</b>. RAM thật đang dùng là ' +
           '<code>VmRSS</code> = <b>2 772 kB ≈ 2,7 MB</b>. Nhân cấp trang theo kiểu lười: nó ' +
           'đánh dấu vùng địa chỉ là "của anh" rồi mới cấp trang vật lý khi anh thật sự chạm ' +
           'vào. Một luồng chỉ ngủ thì chạm vào vài trang ngăn xếp, không phải 8 MB.</p>' +
           '<p><b>Sai — phát biểu 5:</b> giảm kích thước ngăn xếp làm <code>VmSize</code> ' +
           'tụt mạnh (từ 803 MB xuống khoảng 8 MB), nhưng <code>VmRSS</code> gần như không ' +
           'đổi — nó vốn đã chỉ đếm những trang đã chạm tới. Đây đúng là chỗ hay bị hiểu ' +
           'ngược: thu nhỏ ngăn xếp là để cứu <b>không gian địa chỉ</b>, không phải để cứu ' +
           'RAM.</p>' +
           '<p><b>Sai — phát biểu 6:</b> 8 MB chính là <code>ulimit -s</code> của luồng ' +
           'chính; <code>pthread</code> lấy đúng giá trị đó làm mặc định. Đổi ' +
           '<code>ulimit -s</code> trước khi chạy thì mặc định của luồng cũng đổi theo.</p>' +
           '<p><b>Đúng — phát biểu 4</b> là lý do thực dụng nhất để bận tâm tới con số này. ' +
           'Nhiều SoC nhúng vẫn là ARM 32-bit, và ở đó không gian địa chỉ người dùng chỉ có ' +
           'khoảng 3 GB. Với ngăn xếp mặc định 8 MB, vài trăm luồng là hết sạch — ' +
           '<code>pthread_create</code> trả về <code>EAGAIN</code> (11) trong khi ' +
           '<code>free</code> vẫn báo còn thừa RAM. Một lỗi rất khó hiểu nếu không biết ' +
           'trước.</p>' },

    { id: 'b6', k: 'free', tag: 'Giải thích vì sao', rows: 5,
      q: 'Bài 22 nói luồng chia sẻ <b>gần như mọi thứ</b> với nhau. Hãy liệt kê chính xác ' +
         'cái gì được chia sẻ và cái gì <i>không</i>, rồi dùng danh sách đó để giải thích ' +
         'hai output dưới đây — cùng một lỗi <code>SIGSEGV</code>, hai kết cục trái ngược.',
      blocks: [
        { t: 'code', where: 'out', nocopy: true,
          code: '$ ./thread_crash\n' +
                'main still alive, second 0\n' +
                'main still alive, second 1\n' +
                'Segmentation fault\n' +
                'exit code = 139\n' +
                '\n' +
                '$ ./child_crash\n' +
                'parent still alive, second 0\n' +
                'parent still alive, second 1\n' +
                'parent still alive, second 2\n' +
                'child died from signal 11, parent CONTINUES RUNNING NORMALLY\n' +
                'exit code parent = 0' }
      ],
      hint: 'Cả hai chương trình định in 5 dòng. Đếm xem mỗi bên in được mấy dòng, rồi hỏi ' +
            'tín hiệu <code>SIGSEGV</code> được gửi tới <i>cái gì</i>.',
      crit: [
        'Liệt kê đúng cái <b>chia sẻ</b>: không gian địa chỉ (biến toàn cục, heap, mã, dữ liệu tĩnh), bảng file descriptor, thư mục hiện hành, bố trí tín hiệu, PID',
        'Liệt kê đúng cái <b>riêng</b>: ngăn xếp, thanh ghi (gồm con trỏ lệnh), TID, <code>errno</code>, mặt nạ tín hiệu',
        'Đọc đúng bằng chứng: <code>thread_crash</code> in <b>2</b> trên 5 dòng rồi chết cả cụm; <code>child_crash</code> in đủ <b>3</b> dòng và cha thoát 0',
        'Giải thích đúng nguyên nhân: tín hiệu chết người được gửi tới <b>tiến trình</b>, và luồng không phải một tiến trình — không có ranh giới nào để cô lập lỗi',
        'Nối được với MMU: hai tiến trình có <b>hai bảng trang khác nhau</b>, còn hai luồng dùng <b>chung một bảng trang</b>',
        'Rút ra hệ quả thiết kế: phần mã không tin cậy được (plugin, bộ giải mã của bên thứ ba) phải chạy trong <b>tiến trình riêng</b>, chấp nhận trả giá IPC'
      ],
      sol: '<p><b>Bảng chia sẻ.</b> Cái quyết định mọi thứ nằm ở dòng đầu tiên:</p>' +
           '<table><thead><tr><th>Chia sẻ giữa các luồng</th><th>Riêng của mỗi luồng</th>' +
           '</tr></thead><tbody>' +
           '<tr><td>Không gian địa chỉ: biến toàn cục, heap, mã, dữ liệu tĩnh</td>' +
           '<td>Ngăn xếp (biến cục bộ)</td></tr>' +
           '<tr><td>Bảng file descriptor</td><td>Thanh ghi, kể cả con trỏ lệnh</td></tr>' +
           '<tr><td>Thư mục hiện hành, mặt nạ umask</td><td>TID</td></tr>' +
           '<tr><td>Bố trí tín hiệu (handler)</td><td>Mặt nạ tín hiệu, <code>errno</code></td></tr>' +
           '<tr><td>PID</td><td>Mức ưu tiên lịch chạy</td></tr>' +
           '</tbody></table>' +
           '<p><b>Vì sao <code>thread_crash</code> chết cả cụm.</b> Luồng phụ chạm vào địa ' +
           'chỉ không hợp lệ, MMU báo lỗi, nhân gửi <code>SIGSEGV</code>. Nhưng tín hiệu ' +
           'chết người được gửi tới <b>tiến trình</b>, không phải tới luồng — mà cả cụm chỉ ' +
           'là <i>một</i> tiến trình. Luồng chính mới in được 2 trong 5 dòng thì bị kéo theo, ' +
           'mã thoát <b>139 = 128 + 11</b> (Bài 21).</p>' +
           '<p><b>Vì sao <code>child_crash</code> sống.</b> <code>fork</code> tạo ra một ' +
           'tiến trình riêng với <b>bảng trang riêng</b>. Con chết, cha nhận ' +
           '<code>SIGCHLD</code>, <code>waitpid</code> báo "chết vì tín hiệu 11", rồi cha in ' +
           'nốt đủ 3 dòng và thoát 0. Ranh giới MMU giữa hai tiến trình chính là thứ đã cô ' +
           'lập lỗi — đúng cái ranh giới của Bài 1.</p>' +
           '<p><b>Hệ quả thiết kế, và nó đi ngược với "luồng rẻ hơn nên dùng luồng".</b> ' +
           'Luồng rẻ hơn thật (tạo nhanh hơn 2,4–2,8 lần, trao đổi dữ liệu chỉ là gán biến). ' +
           'Nhưng bạn trả giá bằng việc mất hoàn toàn khả năng cô lập lỗi. Với mã bạn tự ' +
           'viết và tin được thì đổi chác đó hợp lý. Với một plugin của bên thứ ba, một bộ ' +
           'giải mã ảnh, hay bất cứ thứ gì có thể sập, thì <b>tiến trình riêng</b> là lựa ' +
           'chọn đúng — và cái giá của nó là phải nói chuyện qua IPC, đúng chủ đề của Bài ' +
           '23.</p>' }
  ],

  C: [
    { id: 'c1', k: 'free', tag: 'Tình huống mới', rows: 7, truc: 0,
      q: 'Bạn là người duyệt mã cho firmware một bộ đo điện. Nhóm gửi lên một bản vá cho ' +
         'lỗi "số đếm xung thỉnh thoảng thiếu", kèm bằng chứng dưới đây. Hãy viết ' +
         '<b>tiêu chí nghiệm thu</b> cho ticket này: <i>bằng chứng nào</i> bạn bắt buộc phải ' +
         'thấy trước khi duyệt, và <i>bằng chứng nào</i> bạn từ chối tính là bằng chứng. ' +
         'Giải thích từng cái.',
      blocks: [
        { t: 'cal', kind: 'info', title: 'Bằng chứng nhóm gửi kèm', x:
          '<ul>' +
          '<li>Chạy bản vá <b>500 lần</b> trên bàn thử, không lần nào sai số.</li>' +
          '<li>Chạy liên tục <b>72 giờ</b> trên thiết bị mẫu, số đếm khớp máy chuẩn.</li>' +
          '<li>Build phát hành dùng <code>-O2</code>, giống hệt cấu hình đã kiểm thử.</li>' +
          '<li>Bản vá đổi <code>int count</code> thành <code>volatile int count</code>.</li>' +
          '</ul>' }
      ],
      hint: 'Ba mục đầu đều là bằng chứng thống kê. Mục thứ tư là thay đổi thật duy nhất — ' +
            'và <code>volatile</code> giải quyết vấn đề gì (Bài 14)?',
      crit: [
        'Từ chối cả ba mục đầu làm bằng chứng đúng đắn, và nói rõ vì sao: chúng đo <b>xác suất</b>, mà race là bài toán <b>khả năng</b> — 500 lần đúng không loại trừ lần thứ 501',
        'Chỉ ra mục 3 (<code>-O2</code>) còn <b>làm yếu</b> lập luận chứ không mạnh thêm: mức tối ưu cao có thể gộp phép cộng lại và giấu lỗi đi',
        'Bác được bản vá: <code>volatile</code> chỉ cấm trình biên dịch <b>bỏ qua/ghi nhớ</b> ô nhớ, nó <b>không</b> làm đọc–sửa–ghi trở thành nguyên tử (Bài 14)',
        'Đòi bằng chứng loại thứ nhất — <b>mã máy</b>: <code>objdump -d</code> phải cho thấy tiền tố <code>lock</code>, hoặc thấy lời gọi mutex bao quanh',
        'Đòi bằng chứng loại thứ hai — <b>công cụ</b>: chạy dưới <code>valgrind --tool=helgrind</code> hoặc build với <code>-fsanitize=thread</code> và không còn cảnh báo',
        'Đòi bằng chứng loại thứ ba — <b>lập luận</b>: chỉ ra ai ghi vào <code>count</code>, ai đọc, và cơ chế đồng bộ nào phủ hết mọi cặp đó',
        'Nêu điều kiện đối ngẫu: kiểm thử ở <b>nhiều mức <code>-O</code></b> và trên máy nhiều lõi, vì một lỗi chỉ xuất hiện ở <code>-O0</code>/<code>-O1</code> vẫn là lỗi'
      ],
      sol: '<p><b>Tiêu chí nghiệm thu: từ chối mọi bằng chứng dạng "chạy thấy đúng", đòi ' +
           'bằng chứng dạng "không thể sai".</b></p>' +
           '<p><b>Vì sao ba mục đầu không tính.</b> 500 lần đúng và 72 giờ đúng đều là ' +
           'phát biểu về <i>xác suất</i>. Race condition không phải bài toán xác suất mà là ' +
           'bài toán <i>khả năng</i>: câu hỏi là "có tồn tại một trật tự thực thi cho ra kết ' +
           'quả sai không", và kiểm thử không bao giờ trả lời được câu đó. Cửa sổ va chạm có ' +
           'thể chỉ mở ra khi tải cao, khi có ngắt lúc không may, hay khi lô chip sau chạy ' +
           'nhanh hơn một chút.</p>' +
           '<p><b>Mục 3 còn phản tác dụng.</b> "Chúng tôi kiểm thử ở <code>-O2</code>" nghe ' +
           'như một điểm cộng, thực ra là điểm trừ: chính <code>-O2</code> là mức có thể gộp ' +
           'cả vòng lặp thành một phép cộng và làm số cửa sổ va chạm tụt xuống 1. Bản ' +
           '<code>-O1</code> của cùng mã nguồn mất đúng 50 % ở 10/10 lần chạy. Kiểm thử ở ' +
           'đúng cái mức tối ưu giỏi giấu lỗi nhất thì không chứng minh được gì.</p>' +
           '<p><b>Và bản vá không sửa lỗi.</b> <code>volatile</code> (Bài 14) bảo trình biên ' +
           'dịch "đừng ghi nhớ ô nhớ này trong thanh ghi, mỗi lần đều đọc lại từ bộ nhớ". Nó ' +
           'giải quyết bài toán <i>khả kiến</i>. Nó không nói gì về <i>nguyên tử</i>: ' +
           '<code>count++</code> vẫn là ba việc — nạp, cộng, cất — và một lõi khác vẫn chen ' +
           'được vào giữa. Đây là nhầm lẫn phổ biến nhất trong toàn bộ chủ đề này.</p>' +
           '<p><b>Ba loại bằng chứng tôi nhận:</b></p>' +
           '<ol>' +
           '<li><b>Mã máy.</b> <code>objdump -d</code> quanh chỗ cập nhật, và phải thấy ' +
           'tiền tố <code>lock</code> (nếu dùng <code>_Atomic</code>) hoặc thấy cặp ' +
           '<code>pthread_mutex_lock</code>/<code>unlock</code> ôm trọn vùng tới hạn. Đây là ' +
           'bằng chứng khó cãi nhất vì nó nói về cái sẽ chạy thật.</li>' +
           '<li><b>Công cụ phát hiện.</b> <code>valgrind --tool=helgrind</code>, hoặc build ' +
           'lại với <code>-fsanitize=thread</code> rồi chạy bộ kiểm thử. Hai công cụ này ' +
           'theo dõi <i>quan hệ xảy-ra-trước</i> chứ không so kết quả, nên chúng bắt được ' +
           'race ngay cả trong lần chạy tình cờ cho kết quả đúng.</li>' +
           '<li><b>Lập luận viết ra giấy.</b> Liệt kê mọi luồng ghi vào <code>count</code>, ' +
           'mọi luồng đọc nó, và chỉ ra cơ chế đồng bộ phủ hết từng cặp. Nếu không viết nổi ' +
           'ba dòng đó thì không ai hiểu mã này đủ để bảo nó đúng.</li>' +
           '</ol>' +
           '<p><b>Điều kiện kèm theo:</b> chạy bộ kiểm thử ở cả <code>-O0</code>, ' +
           '<code>-O1</code> và <code>-O2</code>. Một lỗi chỉ hiện ở <code>-O0</code> vẫn là ' +
           'lỗi thật — nó có nghĩa tính đúng đắn của firmware đang phụ thuộc vào một cờ dòng ' +
           'lệnh, và cờ đó có thể đổi ở bản build sau mà không ai để ý.</p>' },

    { id: 'c2', k: 'free', tag: 'Tình huống mới', rows: 7, truc: 1,
      q: 'Thiết bị: SoC <b>một lõi 400 MHz</b>, Linux. Một luồng đọc xung từ cảm biến lưu ' +
         'lượng ở <b>20 000 xung/giây</b> và tăng bộ đếm; một luồng khác mỗi giây đọc bộ ' +
         'đếm ra rồi gửi lên mạng. Bản hiện tại khoá mutex cho <b>mỗi</b> xung và hệ thống ' +
         'đang bỏ sót xung. Đề xuất cách sửa, <b>ước lượng bằng số</b>, và nói rõ ước lượng ' +
         'của bạn dựa trên giả định nào.',
      hint: '60 ns cho một cặp lock/unlock là số đo trên máy x86 nhiều lõi của bạn. Trên lõi ' +
            'ARM 400 MHz nó không giữ nguyên — nhưng bạn vẫn dùng được nó để so <b>tỷ lệ</b> ' +
            'giữa hai thiết kế.',
      crit: [
        'Tính ra tải hiện tại: 20 000 khoá/giây × ~60 ns ≈ <b>1,2 ms/giây</b> ≈ <b>0,12 %</b> CPU — và nhận ra con số đó <b>quá nhỏ</b> để giải thích việc bỏ sót xung',
        'Vì thế <b>không</b> vội kết luận mutex là thủ phạm; nêu giả thuyết khác: lõi đơn nên luồng đọc xung bị hoãn lịch chạy, hoặc ngắt tới trong lúc giữ khoá',
        'Điều chỉnh con số 60 ns cho phần cứng khác: lõi 400 MHz chậm hơn nhiều lần, và ước lượng lại ở mức vài trăm ns tới ~1 µs cho mỗi cặp',
        'Nêu được rủi ro thật của lõi đơn: nếu luồng gửi mạng đang <b>giữ</b> khoá mà bị hoãn lịch, luồng đọc xung <b>chờ</b> và xung rơi mất — đây mới là cơ chế mất xung',
        'Đề xuất sửa đúng: bỏ khoá khỏi đường nóng — dùng <code>atomic_fetch_add</code>, hoặc gộp vào biến cục bộ, hoặc đọc bộ đếm bằng một phép đọc nguyên tử duy nhất',
        'Chỉ ra rằng cách sửa này giảm <b>số lần vào vùng tới hạn</b> từ 20 000/s xuống 1/s — cùng một đòn bẩy của câu B2',
        'Nói rõ giả định và cách kiểm chứng: đo trên chính thiết bị đó (<code>clock_gettime</code> quanh vòng lặp, hoặc <code>top -H</code>) chứ không tin số đo từ máy phát triển'
      ],
      sol: '<p><b>Trước hết: làm phép tính, vì nó bác bỏ nghi phạm hiển nhiên.</b></p>' +
           '<p>20 000 khoá mỗi giây, mỗi cặp <code>lock</code>/<code>unlock</code> ≈ 60 ns ' +
           '(số đo được ở B2) ⇒ <b>1,2 ms mỗi giây</b>, tức <b>0,12 % CPU</b>. Kể cả khi lõi ' +
           'ARM 400 MHz chậm hơn x86 mười lần và mỗi cặp tốn 600 ns, ta vẫn chỉ ở ' +
           '<b>12 ms/giây = 1,2 %</b>. Không có cách nào 1,2 % CPU làm mất xung.</p>' +
           '<p><b>Vậy mutex chậm không phải nguyên nhân — nhưng mutex vẫn là nguyên nhân, ' +
           'theo một đường khác.</b> Chuyện xảy ra trên lõi đơn là thế này: luồng gửi mạng ' +
           'lấy khoá để đọc bộ đếm; ngay lúc đó bộ lập lịch chuyển nó ra, hoặc nó chạm vào ' +
           'một lời gọi hệ thống chậm. Khoá <i>vẫn đang bị giữ</i>. Xung tiếp theo tới, luồng ' +
           'đọc xung gọi <code>pthread_mutex_lock</code>, không lấy được, và ngủ trong ' +
           '<code>futex_do_wait</code>. Trên máy nhiều lõi luồng kia chạy song song và nhả ' +
           'khoá sau vài chục nano giây; trên <b>một</b> lõi thì nó chỉ nhả được khoá khi ' +
           'nào tới lượt nó chạy lại — có thể là hàng mili giây sau. Ở 20 000 xung/giây, mỗi ' +
           'xung cách nhau <b>50 µs</b>. Một lần bị hoãn 5 ms là mất <b>100 xung</b>.</p>' +
           '<p><b>Cách sửa, theo thứ tự ưu tiên:</b></p>' +
           '<ol>' +
           '<li><b>Bỏ hẳn mutex khỏi đường nóng.</b> Bộ đếm là <i>một</i> biến, đúng ca dùng ' +
           'của <code>_Atomic</code>: <code>atomic_fetch_add(&amp;count, 1)</code> ở luồng ' +
           'đọc xung, <code>atomic_load(&amp;count)</code> ở luồng gửi. Không có khoá thì ' +
           'không có chuyện giữ khoá rồi bị hoãn lịch — rủi ro biến mất chứ không phải nhỏ ' +
           'đi. Chi phí ≈ 3× thay vì 12×, nhưng con số đó không quan trọng bằng việc đường ' +
           'nóng không còn chỗ nào ngủ được.</li>' +
           '<li><b>Nếu buộc phải giữ mutex</b> (ví dụ sau này cần cả bộ đếm lẫn dấu thời gian ' +
           'nhất quán với nhau): gộp lại. Luồng đọc xung cộng vào biến <i>cục bộ</i> không ' +
           'khoá, mỗi 100 ms mới khoá một lần để dồn vào biến chung. Số lần vào vùng tới hạn ' +
           'tụt từ 20 000/s xuống <b>10/s</b> — đúng đòn bẩy của câu B2, và nó có tác dụng ' +
           'kể cả khi loại khoá không đổi.</li>' +
           '<li><b>Đối chiếu lại giả định.</b> Nếu sau khi sửa vẫn mất xung thì nguyên nhân ' +
           'không nằm ở đồng bộ: có thể là độ trễ ngắt, có thể luồng đọc xung không được đặt ' +
           'ưu tiên thời gian thực, có thể 20 kHz là quá nhanh cho vòng lặp không gian người ' +
           'dùng trên 400 MHz và việc đếm phải chuyển xuống driver hoặc bộ đếm phần cứng.</li>' +
           '</ol>' +
           '<p><b>Giả định đã dùng, và cách kiểm chứng.</b> Con số 60 ns đo trên máy x86 ' +
           'nhiều lõi của bạn, <i>không</i> chuyển thẳng sang ARM 400 MHz được — tôi chỉ dùng ' +
           'nó để so tỷ lệ giữa hai thiết kế, không dùng để dự đoán giá trị tuyệt đối. Muốn ' +
           'con số thật thì phải đo trên chính thiết bị: <code>clock_gettime</code> bao quanh ' +
           'một triệu lần khoá, rồi <code>top -H -p &lt;pid&gt;</code> để xem từng luồng ăn ' +
           'bao nhiêu CPU. Ước lượng dùng để chọn hướng, số đo dùng để chốt.</p>' },

    { id: 'c3', k: 'free', tag: 'Tình huống mới', rows: 7, truc: 2,
      q: 'Một cổng thu thập dữ liệu (gateway) chạy tốt cả tháng rồi <b>đứng hình lúc 3 giờ ' +
         'sáng</b>, khoảng hai tuần một lần. Khi đứng: tiến trình vẫn còn trong ' +
         '<code>ps</code>, CPU <b>0 %</b>, không có dòng log nào mới, cổng mạng vẫn mở nhưng ' +
         'không trả lời. Khởi động lại là hết. Hãy mô tả quy trình chẩn đoán của bạn ' +
         '<b>theo thứ tự</b>, và nói mỗi bước sẽ loại trừ được giả thuyết nào.',
      hint: 'Bạn không được phép khởi động lại nó lần này. Lệnh đầu tiên bạn gõ là gì, và nó ' +
            'trả lời câu hỏi nào?',
      crit: [
        'Nguyên tắc đầu tiên: <b>không khởi động lại</b> — khởi động lại xoá sạch bằng chứng của một lỗi hai tuần mới gặp một lần',
        'Bước 1: <code>ps -L -o pid,tid,stat,wchan:20,comm -p &lt;pid&gt;</code> — chụp trạng thái mọi luồng và chúng đang chờ ở đâu trong nhân',
        'Đọc được kết luận từ bước 1: mọi luồng ở <code>futex_do_wait</code> ⇒ deadlock; có luồng ở <code>R</code> ⇒ vòng lặp bận, hướng khác hẳn; có luồng ở I/O (<code>sock_recv…</code>, <code>pipe_read</code>) ⇒ kẹt chờ bên ngoài, không phải deadlock',
        'Bước 2: <code>cat /proc/&lt;pid&gt;/status</code> xác nhận <code>State: S</code> và <code>Threads: N</code>; so N với số luồng thiết kế xem có luồng nào đã chết mất',
        'Bước 3: lấy vết ngăn xếp của <b>từng</b> luồng — <code>gdb -p &lt;pid&gt;</code> rồi <code>thread apply all bt</code>, hoặc <code>cat /proc/&lt;pid&gt;/task/*/stack</code> — để biết mỗi luồng kẹt ở <b>dòng mã nào</b>',
        'Bước 4: từ các vết đó dựng <b>đồ thị chờ</b>: luồng nào giữ khoá nào, xin khoá nào; deadlock được xác nhận khi tìm ra <b>chu trình</b>',
        'Nêu vì sao là 3 giờ sáng: đó là lúc có việc định kỳ (xoay log, đồng bộ giờ, dọn dữ liệu) chạy chèn vào — nó tạo ra <b>trật tự lấy khoá</b> hiếm gặp, chứ giờ giấc không phải nguyên nhân',
        'Cách sửa lâu dài: áp <b>quy tắc thứ tự khoá</b> toàn cục và ghi nó vào tài liệu; thêm watchdog đo <b>tiến độ công việc</b> chứ không đo "tiến trình còn sống"',
        'Nêu <code>pthread_mutex_timedlock</code> là công cụ <b>phát hiện</b> hợp lệ nhưng <b>không</b> phải cách sửa — nó chỉ đổi deadlock thành livelock hoặc thành lỗi lúc chạy'
      ],
      sol: '<p><b>Quy tắc số không: đừng khởi động lại.</b> Lỗi này hai tuần mới xuất hiện ' +
           'một lần. Tiến trình đang treo <i>là</i> toàn bộ bằng chứng bạn có, và khởi động ' +
           'lại sẽ xoá nó. Mọi bước dưới đây đều chỉ quan sát, không đụng vào tiến trình.</p>' +
           '<p><b>Bước 1 — trạng thái từng luồng.</b> Đây là lệnh đầu tiên, vì nó rẽ nhánh ' +
           'toàn bộ cuộc điều tra:</p>' +
           '<pre><code>ps -L -o pid,tid,stat,wchan:20,comm -p &lt;pid&gt;</code></pre>' +
           '<table><thead><tr><th>Thấy gì</th><th>Nghĩa là</th><th>Đi tiếp theo hướng</th>' +
           '</tr></thead><tbody>' +
           '<tr><td>Mọi luồng <code>S</code> + <code>futex_do_wait</code></td>' +
           '<td>Deadlock, gần như chắc chắn</td><td>Bước 3 và 4</td></tr>' +
           '<tr><td>Có luồng <code>R</code></td><td>Vòng lặp bận hoặc vòng lặp vô hạn</td>' +
           '<td>Hướng khác hẳn — <code>perf top</code>, không phải khoá</td></tr>' +
           '<tr><td>Luồng ở <code>sock_recvmsg</code>, <code>pipe_read</code></td>' +
           '<td>Chờ bên ngoài, không phải deadlock</td>' +
           '<td>Xem đầu bên kia: máy chủ, tiến trình con</td></tr>' +
           '<tr><td>Luồng ở <code>D</code></td><td>Kẹt I/O đĩa không ngắt được</td>' +
           '<td>Xem <code>dmesg</code>, phần cứng lưu trữ</td></tr>' +
           '</tbody></table>' +
           '<p><b>Bước 2 — xác nhận và đếm.</b> <code>cat /proc/&lt;pid&gt;/status</code> ' +
           'cho <code>State</code> và <code>Threads</code>. So số luồng với thiết kế: nếu ' +
           'thiếu, có luồng đã chết trong lúc <b>đang giữ khoá</b> — một kiểu deadlock khác, ' +
           'và cách sửa cũng khác.</p>' +
           '<p><b>Bước 3 — mỗi luồng kẹt ở dòng nào.</b> Bước 1 nói "đang chờ futex" nhưng ' +
           'không nói chờ <i>khoá nào</i>. Gắn vào tiến trình đang sống:</p>' +
           '<pre><code>gdb -p &lt;pid&gt;\n' +
           '(gdb) thread apply all bt</code></pre>' +
           '<p>Nếu không có <code>gdb</code> trên thiết bị: ' +
           '<code>cat /proc/&lt;pid&gt;/task/*/stack</code> cho phần vết trong nhân, ' +
           'ít thông tin hơn nhưng thường đủ để phân biệt các luồng.</p>' +
           '<p><b>Bước 4 — dựng đồ thị chờ.</b> Từ các vết ngăn xếp, ghi ra: luồng nào đang ' +
           '<i>giữ</i> khoá nào, đang <i>xin</i> khoá nào. Deadlock được xác nhận khi vẽ ra ' +
           'một <b>chu trình</b>. Với hai luồng thì chu trình hiện ra ngay; với sáu luồng và ' +
           'bốn khoá thì phải vẽ thật ra giấy, và thường sẽ lòi ra một cạnh mà không ai trong ' +
           'nhóm biết là có.</p>',
      solBlocks: [
        { t: 'cal', kind: 'info', title: 'Vì sao lại là 3 giờ sáng, và vì sao đó là manh mối chứ không phải nguyên nhân', x:
          '<p>Giờ giấc không gây ra deadlock. Cái gây ra là <b>một trật tự lấy khoá hiếm ' +
          'gặp</b>, và 3 giờ sáng là lúc trật tự hiếm đó dễ xuất hiện nhất: xoay log, đồng bộ ' +
          'giờ NTP, dọn dữ liệu cũ, sao lưu định kỳ — những việc chạy theo lịch, ngày thường ' +
          'không chen vào luồng công việc chính.</p>' +
          '<p>Nói cách khác chu trình chờ <b>lúc nào cũng nằm sẵn trong mã</b>. Nó chỉ cần ' +
          'đúng một lần hai luồng lấy khoá đúng thứ tự xấu, cùng lúc. Xác suất mỗi lần rất ' +
          'nhỏ, nhân với hàng triệu lần chạy trong hai tuần thì thành một lần. Vì thế câu ' +
          '"đã chạy ổn cả tháng" không phải bằng chứng của tính đúng đắn — hệt như câu ' +
          '"chạy 500 lần không sai" ở C1.</p>' },
        { t: 'cal', kind: 'warn', title: 'Sửa thế nào, và một cái bẫy', x:
          '<p><b>Cách sửa đúng: quy tắc thứ tự khoá.</b> Chọn một thứ tự toàn cục cho mọi ' +
          'khoá trong chương trình — đánh số, hoặc xếp theo địa chỉ — và bắt mọi đoạn mã lấy ' +
          'khoá theo đúng thứ tự đó. Chu trình chờ khi ấy <i>không dựng lên được</i>, vì ' +
          'muốn có chu trình thì phải có ít nhất một luồng đi ngược. Ghi quy tắc này vào tài ' +
          'liệu ngay cạnh phần khai báo khoá, nếu không người sau sẽ phá nó.</p>' +
          '<p><b>Thêm watchdog đo đúng thứ.</b> Đếm số bản ghi đã xử lý và kiểm tra con số ' +
          'đó có tăng không. Một watchdog chỉ hỏi "tiến trình còn sống không" sẽ báo xanh ' +
          'suốt cả đêm — tiến trình deadlock vẫn còn sống, vẫn 0 % CPU, vẫn mở cổng.</p>' +
          '<p><b>Cái bẫy: <code>pthread_mutex_timedlock</code>.</b> Nó rất tốt để ' +
          '<i>phát hiện</i> — hết 5 giây không lấy được khoá thì ghi log kèm vết ngăn xếp. ' +
          'Nhưng nó <b>không sửa</b> gì cả: hết giờ rồi thì bạn làm gì? Thử lại thì hai luồng ' +
          'có thể mãi mãi nhường nhau (livelock). Bỏ qua thì dữ liệu hỏng. Thoát thì mất dịch ' +
          'vụ. Chu trình vẫn nằm nguyên trong mã. Dùng nó như cái chuông báo, đừng dùng nó ' +
          'như cái khoá.</p>' } ] },

    { id: 'c4', k: 'free', tag: 'Tình huống mới', rows: 6,
      q: 'Thiết bị: <b>64 MB RAM</b>, ARM 32-bit, một lõi. Sản phẩm cần chạy đồng thời ' +
         '<b>8</b> bộ giải mã ảnh của một hãng thứ ba (chỉ có thư viện nhị phân, không có mã ' +
         'nguồn, tài liệu ghi "không bảo đảm an toàn luồng"). Hai đề xuất: (a) 8 luồng trong ' +
         'một tiến trình; (b) 8 tiến trình con nói chuyện với tiến trình chính. Chọn một và ' +
         'bảo vệ lựa chọn bằng số liệu cụ thể.',
      hint: 'Đọc kỹ hai chữ trong đề bài: "không bảo đảm an toàn luồng" và "không có mã ' +
            'nguồn". Rồi mới tính tới RAM.',
      crit: [
        'Chọn <b>(b) tiến trình</b>, và nêu lý do quyết định trước mọi lý do khác: thư viện <b>không an toàn luồng</b> nên phương án (a) sai về mặt đúng đắn, không phải sai về mặt hiệu năng',
        'Giải thích "không an toàn luồng" nghĩa là gì: thư viện có thể dùng trạng thái toàn cục/tĩnh, và 8 luồng sẽ giẫm lên nhau — không có mã nguồn thì không sửa được, cũng không kiểm chứng được',
        'Nêu lý do thứ hai — cô lập lỗi: bộ giải mã ảnh xử lý dữ liệu vào từ bên ngoài, dễ sập; một <code>SIGSEGV</code> ở phương án (a) giết cả 8 (chứng cứ ở B6)',
        'Xử lý đúng phản biện về RAM: nhờ copy-on-write, 8 tiến trình con <code>fork</code> ra dùng chung trang mã và trang chưa ghi, nên chi phí thực tế nhỏ hơn nhiều so với 8 bản sao',
        'Nêu ràng buộc 32-bit: ngăn xếp 8 MB × nhiều luồng ăn không gian địa chỉ, nhưng ở đây chỉ 8 luồng nên đây <b>không</b> phải yếu tố quyết định — không thổi phồng luận cứ',
        'Nêu cái giá phải trả của (b) và chấp nhận nó: dữ liệu ảnh phải đi qua IPC, chi phí tạo tiến trình cao hơn ~2,4–2,8 lần, quản lý vòng đời phức tạp hơn',
        'Nêu cách giảm giá đó: bộ nhớ chia sẻ cho khung ảnh (Bài 23) để không phải sao chép, dựng sẵn nhóm tiến trình lúc khởi động thay vì <code>fork</code> mỗi lần',
        'Thêm được lợi ích không hiển nhiên: mỗi bộ giải mã một tiến trình thì đặt được giới hạn tài nguyên riêng (<code>setrlimit</code>) và giết/khởi động lại được từng cái một'
      ],
      sol: '<p><b>Chọn (b), và lý do quyết định không phải RAM.</b></p>' +
           '<p><b>Lý do một: thư viện không an toàn luồng.</b> Câu này trong tài liệu thường ' +
           'có nghĩa thư viện giữ trạng thái ở biến toàn cục hoặc biến tĩnh — một bộ đệm giải ' +
           'mã dùng chung, một biến lỗi cuối cùng, một bảng tra được khởi tạo lười. Tám luồng ' +
           'gọi vào cùng lúc sẽ giẫm lên nhau ở những chỗ bạn <i>không nhìn thấy được</i>. ' +
           'Không có mã nguồn thì không sửa được, cũng không kiểm chứng được, và không ' +
           '<code>helgrind</code> nào soi hộ được phần bên trong một thư viện nhị phân. ' +
           'Phương án (a) sai ở tính đúng đắn — mọi lập luận hiệu năng phía sau đều thừa. ' +
           'Cách duy nhất dùng được thư viện này trong một tiến trình là bọc mọi lời gọi bằng ' +
           '<i>một</i> mutex toàn cục, tức là chạy tuần tự, tức là 8 luồng không nhanh hơn ' +
           '1.</p>' +
           '<p><b>Lý do hai: cô lập lỗi.</b> Bộ giải mã ảnh ăn dữ liệu từ bên ngoài — đúng ' +
           'loại mã dễ sập nhất khi gặp tệp hỏng hoặc tệp cố tình dựng để phá. Câu B6 đã đo: ' +
           'luồng sập thì cả tiến trình chết với mã 139, còn tiến trình con sập thì cha vẫn ' +
           'chạy tiếp bình thường. Ở phương án (a), một ảnh hỏng giết cả 8 kênh. Ở phương án ' +
           '(b), nó giết một kênh và tiến trình chính khởi động lại kênh đó.</p>' +
           '<p><b>Phản biện "64 MB thì không đủ cho 8 tiến trình" — không đúng.</b> Tiến ' +
           'trình con sinh ra bằng <code>fork</code> dùng chung trang mã, thư viện và mọi ' +
           'trang chưa bị ghi với tiến trình cha, nhờ copy-on-write. Chỉ những trang thật sự ' +
           'bị ghi mới được nhân sao ra. Chi phí thật là bộ đệm ảnh của mỗi tiến trình, mà ' +
           'bộ đệm đó thì phương án (a) cũng phải trả y hệt.</p>' +
           '<p><b>Còn ràng buộc 32-bit thì có, nhưng đừng thổi phồng.</b> Ngăn xếp mặc định ' +
           '8 MB × 8 luồng = 64 MB không gian địa chỉ ảo — đáng để chỉnh bằng ' +
           '<code>pthread_attr_setstacksize</code>, nhưng với chỉ 8 luồng thì nó chưa phải ' +
           'vấn đề. Con số này chỉ thành vấn đề ở hàng trăm luồng. Một luận cứ đúng bị dùng ' +
           'sai chỗ vẫn làm hỏng cả lập luận.</p>' +
           '<p><b>Cái giá của (b), nói thẳng ra:</b> dữ liệu ảnh phải đi qua IPC thay vì chỉ ' +
           'là một con trỏ; tạo tiến trình đắt hơn tạo luồng khoảng 2,4–2,8 lần; quản lý vòng ' +
           'đời (<code>waitpid</code>, tiến trình mồ côi, khởi động lại) phức tạp hơn.</p>' +
           '<p><b>Giảm giá đó thế nào:</b> dùng <b>bộ nhớ chia sẻ</b> cho khung ảnh (Bài 23) ' +
           'thì không phải sao chép byte nào — chỉ truyền một cái tên vùng nhớ qua pipe; và ' +
           'dựng sẵn 8 tiến trình lúc khởi động thay vì <code>fork</code> cho mỗi ảnh, để chi ' +
           'phí tạo tiến trình trả một lần rồi thôi.</p>' +
           '<p><b>Và một món quà kèm theo:</b> mỗi bộ giải mã một tiến trình thì đặt được ' +
           '<code>setrlimit</code> riêng cho từng cái (giới hạn RAM, giới hạn CPU), giết ' +
           'riêng được cái nào treo, và <code>top</code> chỉ thẳng ra kênh nào đang ăn tài ' +
           'nguyên. Với luồng thì cả 8 chung một PID, một hạn mức, một số liệu.</p>' },

    { id: 'c5', k: 'free', tag: 'Duyệt mã', rows: 6,
      q: 'Duyệt đoạn producer/consumer dưới đây. Nó chạy đúng trên máy phát triển của tác ' +
         'giả. Tìm <b>tất cả</b> lỗi, xếp theo mức nghiêm trọng, và với mỗi lỗi hãy nói ' +
         '<i>triệu chứng</i> mà nó gây ra ngoài hiện trường.',
      blocks: [
        { t: 'code', where: 'wsl', nocopy: true, name: 'consumer.c (trích)',
          code: '/* shared */\n' +
                'int queue[QSIZE];\n' +
                'int count = 0;\n' +
                'pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;\n' +
                'pthread_cond_t not_empty = PTHREAD_COND_INITIALIZER;\n' +
                '\n' +
                'void *consumer(void *arg) {\n' +
                '    while (1) {\n' +
                '        pthread_mutex_lock(&lock);\n' +
                '        if (count == 0)\n' +
                '            pthread_cond_wait(&not_empty, &lock);\n' +
                '        int item = queue[--count];\n' +
                '        pthread_mutex_unlock(&lock);\n' +
                '        handle(item);\n' +
                '    }\n' +
                '    return NULL;\n' +
                '}\n' +
                '\n' +
                'void *producer(void *arg) {\n' +
                '    while (1) {\n' +
                '        int item = read_sensor();\n' +
                '        pthread_mutex_lock(&lock);\n' +
                '        queue[count++] = item;\n' +
                '        pthread_mutex_unlock(&lock);\n' +
                '        pthread_cond_signal(&not_empty);\n' +
                '    }\n' +
                '    return NULL;\n' +
                '}' }
      ],
      hint: 'Có ba lỗi. Một nằm ở một từ khoá duy nhất; một nằm ở chỗ <i>thiếu</i> một phép ' +
            'kiểm tra; một chỉ hiện ra khi có <b>hai</b> consumer.',
      crit: [
        'Lỗi 1 (nặng nhất): <code>if (count == 0)</code> phải là <code>while (count == 0)</code>',
        'Giải thích được <b>hai</b> lý do phải dùng <code>while</code>: (i) đánh thức giả — POSIX cho phép <code>pthread_cond_wait</code> trả về khi không ai báo; (ii) với nhiều consumer, một consumer khác có thể đã lấy mất phần tử trong lúc mình chờ lấy lại khoá',
        'Nêu triệu chứng của lỗi 1: <code>count</code> thành âm, <code>queue[-1]</code> ghi ra ngoài mảng ⇒ hỏng bộ nhớ hoặc <code>SIGSEGV</code>, xuất hiện hiếm và không lặp lại được',
        'Lỗi 2: producer <b>không kiểm tra hàng đầy</b> — <code>queue[count++]</code> tràn khi <code>count</code> chạm <code>QSIZE</code>; cần thêm biến điều kiện <code>not_full</code>',
        'Lỗi 3: <code>pthread_cond_signal</code> gọi <b>sau</b> khi mở khoá — hợp lệ nhưng để lọt cửa sổ khiến báo hiệu bị bỏ lỡ và gây trễ; nêu rõ đây là lỗi nhẹ hơn hai lỗi trên',
        'Chỉ ra vì sao "chạy đúng trên máy tác giả": một producer + một consumer, hàng chưa bao giờ đầy, đánh thức giả hiếm — cả ba lỗi đều là lỗi <b>hiếm</b>, không phải lỗi <b>không có</b>',
        'Viết lại được thân consumer đúng: <code>while (count == 0) pthread_cond_wait(...)</code>'
      ],
      sol: '<p><b>Ba lỗi, xếp theo mức nghiêm trọng.</b></p>' +
           '<p><b>Lỗi 1 — <code>if</code> phải là <code>while</code>. Nặng nhất.</b> Hai lý ' +
           'do độc lập, và chỉ cần một là đủ:</p>' +
           '<ul>' +
           '<li><b>Đánh thức giả.</b> POSIX cho phép <code>pthread_cond_wait</code> trả về ' +
           'mà <i>không</i> có ai gọi <code>signal</code>. Đây không phải lỗi cài đặt, đó là ' +
           'điều đặc tả cho phép, và trên Linux nó xảy ra thật khi có tín hiệu tới. Với ' +
           '<code>if</code>, luồng đi thẳng xuống dòng dưới trong khi <code>count</code> vẫn ' +
           'bằng 0.</li>' +
           '<li><b>Kẻ chen ngang.</b> Khi <code>pthread_cond_wait</code> trở về, nó phải ' +
           '<i>lấy lại khoá</i>, và trong khoảnh khắc đó một consumer khác có thể đã lấy mất ' +
           'phần tử duy nhất. Điều kiện đúng lúc được báo hiệu, sai lúc chạy tiếp. Lỗi này ' +
           'xuất hiện ngay cả khi không hề có đánh thức giả.</li>' +
           '</ul>' +
           '<p><b>Triệu chứng:</b> <code>count</code> tụt xuống <b>−1</b>, ' +
           '<code>queue[--count]</code> đọc <code>queue[-1]</code> — ghi/đọc ngoài mảng. Có ' +
           'thể là giá trị rác, có thể là hỏng biến bên cạnh, có thể là ' +
           '<code>SIGSEGV</code>. Và vì nó cần đúng một trật tự hiếm, nó sẽ nổ ngoài hiện ' +
           'trường sau nhiều tuần, không bao giờ lặp lại được trên bàn thử. Cách viết đúng:</p>' +
           '<pre><code>while (count == 0)\n' +
           '    pthread_cond_wait(&amp;not_empty, &amp;lock);</code></pre>' +
           '<p><b>Lỗi 2 — không kiểm tra hàng đầy.</b> <code>queue[count++] = item;</code> ' +
           'không hỏi <code>count</code> đã chạm <code>QSIZE</code> chưa. Nếu cảm biến sinh ' +
           'dữ liệu nhanh hơn <code>handle()</code> xử lý — chỉ cần một lần ' +
           '<code>handle()</code> chậm bất thường — producer ghi tràn ra ngoài mảng. Cần một ' +
           'biến điều kiện thứ hai:</p>' +
           '<pre><code>while (count == QSIZE)\n' +
           '    pthread_cond_wait(&amp;not_full, &amp;lock);</code></pre>' +
           '<p>và consumer phải <code>pthread_cond_signal(&amp;not_full)</code> sau khi lấy ' +
           'ra. Đối xứng với lỗi 1, và cũng dùng <code>while</code>.</p>' +
           '<p><b>Lỗi 3 — báo hiệu sau khi mở khoá. Nhẹ nhất.</b> Gọi ' +
           '<code>pthread_cond_signal</code> ngoài vùng khoá là <i>hợp lệ</i> theo POSIX và ' +
           'đôi khi còn nhanh hơn. Nhưng nó mở ra một cửa sổ: giữa ' +
           '<code>unlock</code> và <code>signal</code>, consumer có thể vừa kiểm tra thấy ' +
           '<code>count == 0</code> và chuẩn bị ngủ. Với <code>while</code> ở lỗi 1 thì hệ ' +
           'thống vẫn <i>đúng</i> — consumer sẽ được đánh thức ở lần báo hiệu sau — nhưng dữ ' +
           'liệu bị trễ một nhịp không lý do. Trên hệ thống có ràng buộc thời gian, một nhịp ' +
           'trễ ngẫu nhiên là thứ rất khó truy. Gọi <code>signal</code> khi còn giữ khoá thì ' +
           'không có cửa sổ đó.</p>' +
           '<p><b>Và vì sao nó "chạy đúng trên máy tác giả".</b> Tác giả thử với một producer ' +
           'và một consumer, hàng chưa bao giờ đầy, không có tín hiệu nào tới nên không có ' +
           'đánh thức giả, và không có consumer thứ hai để chen ngang. Cả ba lỗi đều <i>hiếm</i> ' +
           'chứ không phải <i>không có</i> — đúng cái kết luận của B1 và C1: chạy thấy đúng ' +
           'không phải bằng chứng của đúng.</p>' }
  ],

  D: [
    { id: 'd1', k: 'mcq', tag: 'Nhắc lại Bài 14',
      q: 'Bài 14 đã đo: bỏ <code>volatile</code> đi thì ở <code>-O0</code> chương trình vẫn ' +
         'chạy đúng, nhưng ở <code>-O2</code> nó treo vĩnh viễn. Trong ngữ cảnh Bài 22, phát ' +
         'biểu nào <b>đúng</b> về quan hệ giữa <code>volatile</code> và ' +
         '<code>_Atomic</code>?',
      opts: [
        '<code>volatile</code> là phiên bản cũ của <code>_Atomic</code>; trình biên dịch hiện đại coi hai từ khoá này như nhau.',
        '<code>volatile</code> bảo đảm <b>khả kiến</b> (mỗi lần đều đọc lại từ bộ nhớ), <code>_Atomic</code> bảo đảm <b>nguyên tử</b> (phép đọc–sửa–ghi không bị chen ngang) — hai bài toán khác nhau.',
        '<code>_Atomic</code> bao hàm <code>volatile</code>, nên biến chia sẻ giữa các luồng phải khai báo cả hai mới đúng.',
        '<code>volatile</code> đủ cho biến chia sẻ giữa các luồng miễn là chỉ có một luồng ghi vào nó.'
      ],
      a: 1,
      why: '<p>Đây là cặp khái niệm bị nhầm nhiều nhất trong toàn bộ lập trình đa luồng, và ' +
           'nhầm nó là lý do bản vá ở câu C1 bị từ chối.</p>' +
           '<p><b><code>volatile</code> nói về trình biên dịch.</b> Nó cấm trình biên dịch ' +
           'ghi nhớ giá trị trong thanh ghi và cấm nó tối ưu bỏ những lần đọc trông có vẻ ' +
           'thừa. Bài 14 đo được đúng điều đó: ở <code>-O2</code>, không có ' +
           '<code>volatile</code> thì trình biên dịch nạp cờ vào thanh ghi <b>một lần</b> ' +
           'rồi lặp mãi trên bản sao đó, nên chương trình treo dù cờ ngoài bộ nhớ đã đổi.</p>' +
           '<p><b><code>_Atomic</code> nói về phần cứng.</b> Nó bắt trình biên dịch phát ra ' +
           'lệnh có bảo đảm nguyên tử — trên x86 là tiền tố <code>lock</code>, trên ARM là ' +
           'cặp load-exclusive/store-exclusive — để phép đọc–sửa–ghi không thể bị một lõi ' +
           'khác chen vào giữa. Đó là bài toán của Bài 22.</p>' +
           '<p><b>Vì sao đáp án 4 sai</b>, dù nghe hợp lý nhất: kể cả một luồng ghi, ' +
           '<code>volatile</code> không cho bạn bảo đảm nào về <i>thứ tự</i> giữa nó và các ' +
           'thao tác bộ nhớ khác. Với một cờ boolean đơn giản thì thường không sao; với hai ' +
           'biến phải nhất quán với nhau thì hỏng. <code>_Atomic</code> mang theo cả bảo đảm ' +
           'thứ tự, <code>volatile</code> thì không.</p>' +
           '<p><b>Còn đáp án 3 gần đúng nhưng thừa:</b> <code>_Atomic</code> đã bao hàm ' +
           'phần khả kiến rồi, không cần viết thêm <code>volatile</code>. Viết cả hai không ' +
           'sai, chỉ là dấu hiệu người viết chưa chắc mình đang cần gì.</p>' },

    { id: 'd2', k: 'mcq', tag: 'Nhắc lại Bài 21',
      q: 'Bài 21 dạy rằng trong trình xử lý tín hiệu chỉ được gọi hàm ' +
         '<b>async-signal-safe</b>. Một chương trình đa luồng cài trình xử lý ' +
         '<code>SIGTERM</code> để "dọn dẹp cho gọn". Trình xử lý đó gọi ' +
         '<code>pthread_mutex_lock</code> rồi ghi trạng thái ra tệp. Vấn đề nghiêm trọng ' +
         'nhất là gì?',
      opts: [
        'Không có vấn đề: <code>pthread_mutex_lock</code> nằm trong thư viện pthread nên nó an toàn với tín hiệu.',
        'Tín hiệu có thể tới đúng lúc luồng đó <b>đang giữ</b> chính con mutex ấy, và trình xử lý sẽ tự khoá lại chính mình — deadlock, ngay lập tức và chắc chắn.',
        'Trình xử lý sẽ chạy trên một luồng riêng do nhân tạo ra, nên nó không thấy được mutex.',
        'Vấn đề chỉ là hiệu năng: khoá mutex trong trình xử lý làm việc dọn dẹp chậm đi khoảng 12 lần.'
      ],
      a: 1,
      why: '<p><code>pthread_mutex_lock</code> <b>không</b> nằm trong danh sách ' +
           'async-signal-safe, và lý do chính là kịch bản này.</p>' +
           '<p>Trình xử lý tín hiệu không chạy trên luồng riêng — nó <b>chen vào</b> một ' +
           'luồng đang có sẵn, ngay giữa chừng, tại một điểm bạn không chọn được. Nếu luồng ' +
           'đó tình cờ đang giữ con mutex mà trình xử lý sắp khoá, thì trình xử lý sẽ chờ ' +
           'một con mutex mà <i>chính nó</i> đang giữ. Không ai nhả ra được, vì luồng duy ' +
           'nhất có thể nhả đang bị treo bên trong trình xử lý. Deadlock — và lần này không ' +
           'phải xác suất nhỏ như C3, mà là chắc chắn mỗi khi tín hiệu rơi đúng cửa sổ đó.</p>' +
           '<p>Ghi tệp bằng <code>fprintf</code> còn thêm một tầng nữa: <code>stdio</code> ' +
           'có khoá nội bộ riêng, và lỗi lặp lại y hệt.</p>' +
           '<p><b>Cách làm đúng — hình mẫu của Bài 21, giữ nguyên giá trị ở đây:</b> trình ' +
           'xử lý chỉ đặt một cờ <code>volatile sig_atomic_t stop = 1;</code> rồi trả về ' +
           'ngay. Vòng lặp chính thấy cờ, thoát ra, và làm việc dọn dẹp ở <i>ngữ cảnh bình ' +
           'thường</i>, nơi khoá mutex là hợp lệ. Cách tốt hơn nữa cho chương trình đa luồng: ' +
           'chặn tín hiệu ở mọi luồng bằng <code>pthread_sigmask</code> rồi dành riêng một ' +
           'luồng gọi <code>sigwait</code> — luồng đó nhận tín hiệu như nhận dữ liệu bình ' +
           'thường, không có ai bị chen ngang cả.</p>' },

    { id: 'd3', k: 'tf', tag: 'Nhắc lại Bài 20',
      q: 'Trong một chương trình đã có 4 luồng, nếu một luồng gọi <code>fork()</code> thì ' +
         'tiến trình con sinh ra cũng có đủ 4 luồng.',
      a: 1,
      rw: 'Viết lại cho đúng, và nói thêm chuyện gì xảy ra với các mutex mà tiến trình con ' +
          'thừa hưởng.',
      crit: [
        'Nói đúng: tiến trình con chỉ có <b>một</b> luồng — chính luồng đã gọi <code>fork()</code>',
        'Nêu được hậu quả về mutex: trạng thái khoá được sao y, nên khoá do luồng khác đang giữ sẽ <b>khoá vĩnh viễn</b> trong con',
        'Rút ra quy tắc: sau <code>fork()</code> trong chương trình đa luồng, con chỉ được gọi hàm async-signal-safe cho tới khi <code>exec</code>'
      ],
      why: '<p><b>Sai.</b> <code>fork()</code> chỉ sao chép <b>luồng gọi nó</b>. Ba luồng ' +
           'kia biến mất trong tiến trình con — không phải bị dừng, mà là chưa từng tồn tại ' +
           'ở đó.</p>' +
           '<p><b>Và hậu quả tệ hơn nhiều so với "thiếu ba luồng".</b> Không gian địa chỉ ' +
           'được sao y nguyên, nên mọi mutex cũng được sao y nguyên — <i>kể cả trạng thái ' +
           'của chúng</i>. Nếu một trong ba luồng kia đang giữ khoá đúng lúc ' +
           '<code>fork()</code> chạy, thì trong tiến trình con con mutex đó ở trạng thái ' +
           '<b>đã khoá vĩnh viễn</b>: nó bị khoá bởi một luồng không tồn tại, nên không bao ' +
           'giờ có ai nhả nó ra. Tiến trình con sẽ treo ở lần khoá tiếp theo.</p>' +
           '<p>Đây là lý do quy tắc kinh điển: sau <code>fork()</code> trong chương trình đa ' +
           'luồng, tiến trình con chỉ được gọi các hàm <b>async-signal-safe</b> cho tới khi ' +
           'nó gọi <code>exec</code>. Nói cách khác cặp <code>fork</code>+<code>exec</code> ' +
           'của Bài 20 vẫn an toàn — cái nguy hiểm là <code>fork()</code> rồi chạy tiếp mã ' +
           'phức tạp trong con.</p>' +
           '<p>Nhắc lại Bài 20 cho đủ: <code>fork()</code> trả về <b>hai lần</b> — 0 trong ' +
           'con, PID của con trong cha. Ở đây "hai lần" nghĩa là hai luồng khác nhau ở hai ' +
           'tiến trình khác nhau cùng chạy tiếp từ đúng một dòng lệnh.</p>' }
  ],

  E: [
    { id: 'e1', k: 'free', tag: 'Dự đoán output', rows: 4,
      q: 'Tạo thư mục làm việc và gõ lại chương trình race quen thuộc. <b>Trước khi biên ' +
         'dịch</b>, hãy viết ra dự đoán của bạn cho <b>năm</b> lần chạy bản <code>-O1</code>: ' +
         'con số in ra sẽ như thế nào giữa các lần? Rồi mới chạy và so.',
      blocks: [
        { t: 'code', where: 'wsl',
          code: 'mkdir -p ~/bt22 && cd ~/bt22' },
        { t: 'code', where: 'wsl', name: '~/bt22/race.c',
          code: 'cat > race.c << \'EOF\'\n' +
                '#include <stdio.h>\n' +
                '#include <pthread.h>\n' +
                '\n' +
                '#define N 1000000\n' +
                'long counter = 0;\n' +
                '\n' +
                'void *increment(void *arg)\n' +
                '{\n' +
                '    (void)arg;\n' +
                '    for (int i = 0; i < N; i++)\n' +
                '        counter++;\n' +
                '    return NULL;\n' +
                '}\n' +
                '\n' +
                'int main(void)\n' +
                '{\n' +
                '    pthread_t t1, t2;\n' +
                '\n' +
                '    pthread_create(&t1, NULL, increment, NULL);\n' +
                '    pthread_create(&t2, NULL, increment, NULL);\n' +
                '    pthread_join(t1, NULL);\n' +
                '    pthread_join(t2, NULL);\n' +
                '\n' +
                '    printf("expected %d, actual %ld, lost %ld increments (%.1f%%)\\n",\n' +
                '           2 * N, counter, 2L * N - counter,\n' +
                '           100.0 * (2L * N - counter) / (2.0 * N));\n' +
                '    return 0;\n' +
                '}\n' +
                'EOF' },
        { t: 'code', where: 'wsl',
          code: 'gcc -O1 -pthread -o race_o1 race.c\nfor i in 1 2 3 4 5; do ./race_o1; done' }
      ],
      hint: 'Đừng dự đoán "một số ngẫu nhiên nào đó". Hãy dự đoán cụ thể: các lần chạy ' +
            '<i>giống nhau</i> hay <i>khác nhau</i>?',
      crit: [
        'Đã viết dự đoán ra <b>trước</b> khi chạy, không sửa lại sau',
        'So sánh trung thực dự đoán với thực tế và nói rõ mình đúng hay sai ở điểm nào',
        'Quan sát đúng: năm dòng <b>giống hệt nhau</b>, mất đúng <b>1 000 000</b> (50,0 %)',
        'Giải thích được vì sao ổn định: <code>-O1</code> giữ <code>counter</code> trong <b>thanh ghi</b> suốt cả vòng lặp rồi mới ghi ra một lần, nên luồng sau đè lên kết quả luồng trước — kết quả cuối cùng luôn là <code>N</code>',
        'Nối được với A1/B1: <code>-O0</code> mất số ngẫu nhiên, <code>-O1</code> mất đúng một nửa, <code>-O2</code> không mất gì — cùng một mã nguồn'
      ],
      sol: '<p><b>Dự đoán hay gặp nhất là "mỗi lần một số khác nhau" — và nó sai.</b></p>' +
           '<p>Năm dòng ra <b>giống hệt nhau</b>: mất đúng <code>1000000</code>, tức 50,0 %. ' +
           'Bản <code>-O0</code> mới là bản cho số ngẫu nhiên mỗi lần.</p>' +
           '<p><b>Vì sao lại đúng một nửa, và vì sao lại ổn định.</b> Ở <code>-O1</code> ' +
           'trình tối ưu nhận ra vòng lặp chỉ đụng vào <code>counter</code>, nên nó nạp biến ' +
           'vào một thanh ghi, cộng một triệu lần <i>trong thanh ghi</i>, rồi ghi trả về bộ ' +
           'nhớ đúng <b>một lần</b> lúc kết thúc. Hai luồng cùng làm vậy: cả hai đều nạp ' +
           'thấy 0, cả hai đều ghi trả 1 000 000, và cái ghi sau đè lên cái ghi trước. Kết ' +
           'quả cuối cùng vì thế luôn là 1 000 000 — không phụ thuộc vào lịch chạy, nên ' +
           'không dao động.</p>' +
           '<p><b>Ba mức tối ưu, ba kiểu sai khác nhau, một mã nguồn:</b></p>' +
           '<table><thead><tr><th>Mức</th><th>Kết quả</th><th>Vì sao</th></tr></thead><tbody>' +
           '<tr><td><code>-O0</code></td><td>Mất một số <b>ngẫu nhiên</b>, khác mỗi lần</td>' +
           '<td>Mỗi vòng lặp là một lần đọc–sửa–ghi thật ⇒ một triệu cửa sổ va chạm</td></tr>' +
           '<tr><td><code>-O1</code></td><td>Mất đúng <b>50 %</b>, mọi lần như nhau</td>' +
           '<td>Cộng trong thanh ghi, ghi trả một lần ⇒ một luồng đè hẳn luồng kia</td></tr>' +
           '<tr><td><code>-O2</code></td><td>Thường <b>đúng</b></td>' +
           '<td>Gộp thành một lệnh <code>addq $0xf4240</code> ⇒ chỉ còn một cửa sổ, hiếm khi va</td></tr>' +
           '</tbody></table>' +
           '<p>Nếu máy bạn cho kết quả khác (phiên bản gcc khác có thể tối ưu khác đi), điều ' +
           'đó <i>củng cố</i> kết luận chứ không bác bỏ: hành vi của một chương trình có race ' +
           'phụ thuộc vào trình biên dịch, và đó chính là lý do không được coi nó là đúng.</p>' },

    { id: 'e2', k: 'free', tag: 'Gõ lệnh', rows: 6,
      q: 'Viết cả ba phiên bản (không bảo vệ, <code>_Atomic</code>, <code>pthread_mutex</code>) ' +
         'rồi đo <b>trên máy bạn</b>. Ghi lại ba con số mili-giây và <b>ba tỷ lệ</b>. Tỷ lệ ' +
         'của bạn có giống 1× / 3× / 12× không?',
      blocks: [
        { t: 'code', where: 'wsl', name: '~/bt22/atomic.c',
          code: 'cat > atomic.c << \'EOF\'\n' +
                '#include <stdio.h>\n' +
                '#include <pthread.h>\n' +
                '#include <stdatomic.h>\n' +
                '\n' +
                '#define N 1000000\n' +
                '_Atomic long counter = 0;\n' +
                '\n' +
                'void *increment(void *arg)\n' +
                '{\n' +
                '    (void)arg;\n' +
                '    for (int i = 0; i < N; i++)\n' +
                '        atomic_fetch_add(&counter, 1);\n' +
                '    return NULL;\n' +
                '}\n' +
                'EOF' },
        { t: 'code', where: 'wsl', name: '~/bt22/mutex.c — chỉ khác phần thân luồng',
          code: 'cat > mutex_body.txt << \'EOF\'\n' +
                'long counter = 0;\n' +
                'pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;\n' +
                '\n' +
                'void *increment(void *arg)\n' +
                '{\n' +
                '    (void)arg;\n' +
                '    for (int i = 0; i < N; i++) {\n' +
                '        pthread_mutex_lock(&lock);\n' +
                '        counter++;\n' +
                '        pthread_mutex_unlock(&lock);\n' +
                '    }\n' +
                '    return NULL;\n' +
                '}\n' +
                'EOF' },
        { t: 'code', where: 'wsl', name: 'đo bằng đồng hồ đơn điệu, in ra mili-giây',
          code: 'cat > timing.h << \'EOF\'\n' +
                '#include <time.h>\n' +
                '\n' +
                'static double now_ms(void)\n' +
                '{\n' +
                '    struct timespec ts;\n' +
                '    clock_gettime(CLOCK_MONOTONIC, &ts);\n' +
                '    return ts.tv_sec * 1000.0 + ts.tv_nsec / 1000000.0;\n' +
                '}\n' +
                'EOF' },
        { t: 'code', where: 'wsl',
          code: 'gcc -O2 -pthread -o t_atomic atomic_main.c\n' +
                'gcc -O2 -pthread -o t_mutex  mutex_main.c\n' +
                'gcc -O0 -pthread -o t_race   race.c\n' +
                'for p in t_race t_atomic t_mutex; do echo -n "$p: "; ./$p; done' }
      ],
      hint: 'Chạy mỗi bản <b>ba lần</b> trước khi tin con số. Và đừng so số tuyệt đối với số ' +
            'trong bài — hãy so <i>tỷ lệ</i>.',
      crit: [
        'Cả ba chương trình biên dịch và chạy được; bản <code>atomic</code> và <code>mutex</code> ra đúng <b>2000000</b>',
        'Ghi lại ba con số thời gian, mỗi bản đo ít nhất <b>ba lần</b>',
        'Tính ra ba tỷ lệ bằng cách chia cho thời gian bản không khoá',
        'Nhận xét đúng: số tuyệt đối dao động (khoảng 10–14 / 29–35 / 133–143 ms trên máy tham chiếu) nhưng <b>tỷ lệ</b> thì ổn định',
        'Nếu tỷ lệ của bạn lệch nhiều, nêu được lý do khả dĩ: số lõi khác, WSL2 với tải nền khác, hoặc bản <code>-O2</code> đã gộp mất vòng lặp',
        'Xác nhận bằng <code>objdump -d t_atomic | grep -A2 "&lt;increment&gt;:"</code> rằng bản nguyên tử có tiền tố <code>lock</code>'
      ],
      sol: '<p><b>Con số tham chiếu trên máy WSL2 của bài:</b> race ≈ 11 ms, atomic ≈ 31 ms, ' +
           'mutex ≈ 136 ms — tức <b>1× / ~3× / ~12×</b>.</p>' +
           '<p><b>Số của bạn gần như chắc chắn sẽ khác.</b> Đó không phải lỗi. Thời gian ' +
           'tuyệt đối phụ thuộc tần số CPU, số lõi, tải nền, và cả việc WSL2 đang chia CPU ' +
           'với Windows. Trên chính máy tham chiếu, chạy lại nhiều lần cho 10–14 / 29–35 / ' +
           '133–143 ms. Cái ổn định qua mọi lần chạy là <b>tỷ lệ</b>, và đó là thứ đáng ' +
           'nhớ.</p>' +
           '<p><b>Nếu tỷ lệ của bạn lệch nhiều, kiểm tra theo thứ tự này:</b></p>' +
           '<ol>' +
           '<li><b>Máy một lõi?</b> Trên một lõi, atomic gần như không tốn thêm gì (không có ' +
           'lõi nào khác để tranh chấp bộ nhớ đệm) nên tỷ lệ tụt xuống gần 1×. Kiểm tra bằng ' +
           '<code>nproc</code>.</li>' +
           '<li><b>Bản race có bị tối ưu mất không?</b> Nếu bạn lỡ biên dịch nó ở ' +
           '<code>-O2</code> thì nó chỉ còn một lệnh cộng và sẽ nhanh một cách phi lý, làm ' +
           'mẫu số sai bét. Bản đối chứng phải là <code>-O0</code>.</li>' +
           '<li><b>Tải nền.</b> Đóng bớt cửa sổ rồi đo lại; lấy giá trị <i>nhỏ nhất</i> trong ' +
           'ba lần chứ không lấy trung bình — giá trị nhỏ nhất là lần ít bị nhiễu nhất.</li>' +
           '</ol>' +
           '<p><b>Việc phải làm cuối cùng: xác nhận bằng mã máy</b>, đừng chỉ tin thời ' +
           'gian.</p>',
      solBlocks: [
        { t: 'code', where: 'wsl',
          code: 'objdump -d t_atomic | grep -A3 "<increment>:"' },
        { t: 'p', x:
          'Phải nhìn thấy tiền tố <b><code>lock</code></b> đứng trước lệnh cộng. Nếu không ' +
          'thấy, bạn chưa thật sự đo bản nguyên tử — và đó chính là bài học của B1: thời ' +
          'gian và kết quả đều nói dối được, mã máy thì không.' } ] },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh', rows: 5,
      q: 'Tự tạo ra một deadlock, rồi <b>chẩn đoán nó từ bên ngoài</b> đúng theo quy trình ' +
         'câu C3 — không đọc mã nguồn, chỉ dùng <code>ps</code> và <code>/proc</code>. Chép ' +
         'lại đúng dòng <code>WCHAN</code> bạn thấy.',
      blocks: [
        { t: 'code', where: 'wsl', name: '~/bt22/deadlock.c',
          code: 'cat > deadlock.c << \'EOF\'\n' +
                '#include <stdio.h>\n' +
                '#include <unistd.h>\n' +
                '#include <pthread.h>\n' +
                '\n' +
                'pthread_mutex_t lock_a = PTHREAD_MUTEX_INITIALIZER;\n' +
                'pthread_mutex_t lock_b = PTHREAD_MUTEX_INITIALIZER;\n' +
                '\n' +
                'void *thread1(void *arg)\n' +
                '{\n' +
                '    (void)arg;\n' +
                '    pthread_mutex_lock(&lock_a);\n' +
                '    printf("  [thread1] holding A, requesting B\\n");\n' +
                '    fflush(stdout);\n' +
                '    sleep(1);                       /* widen the window on purpose */\n' +
                '    pthread_mutex_lock(&lock_b);\n' +
                '    printf("  [thread1] holding both A and B\\n");\n' +
                '    pthread_mutex_unlock(&lock_b);\n' +
                '    pthread_mutex_unlock(&lock_a);\n' +
                '    return NULL;\n' +
                '}\n' +
                '\n' +
                'void *thread2(void *arg)\n' +
                '{\n' +
                '    (void)arg;\n' +
                '    pthread_mutex_lock(&lock_b);    /* opposite order -> the cycle */\n' +
                '    printf("  [thread2] holding B, requesting A\\n");\n' +
                '    fflush(stdout);\n' +
                '    sleep(1);\n' +
                '    pthread_mutex_lock(&lock_a);\n' +
                '    printf("  [thread2] holding both B and A\\n");\n' +
                '    pthread_mutex_unlock(&lock_a);\n' +
                '    pthread_mutex_unlock(&lock_b);\n' +
                '    return NULL;\n' +
                '}\n' +
                '\n' +
                'int main(void)\n' +
                '{\n' +
                '    pthread_t t1, t2;\n' +
                '\n' +
                '    printf("pid=%d\\n", getpid());\n' +
                '    fflush(stdout);\n' +
                '    pthread_create(&t1, NULL, thread1, NULL);\n' +
                '    pthread_create(&t2, NULL, thread2, NULL);\n' +
                '    pthread_join(t1, NULL);\n' +
                '    pthread_join(t2, NULL);\n' +
                '    printf("finished\\n");\n' +
                '    return 0;\n' +
                '}\n' +
                'EOF' },
        { t: 'code', where: 'wsl', name: 'chạy nền, chẩn đoán, rồi dọn',
          code: 'gcc -O2 -pthread -o deadlock deadlock.c\n' +
                './deadlock &\n' +
                'sleep 3\n' +
                'PID=$(pgrep -x deadlock)\n' +
                'ps -L -o pid,tid,stat,wchan:20,comm -p $PID\n' +
                'grep -E "^(State|Threads):" /proc/$PID/status\n' +
                'kill -9 $PID' },
        { t: 'code', where: 'wsl', name: 'và cách chạy có kiểm soát thời gian',
          code: 'timeout 5 ./deadlock; echo "exit code = $?"' }
      ],
      hint: 'Ba câu hỏi phải trả lời bằng output, không bằng trí nhớ: (1) có mấy luồng, ' +
            '(2) tất cả đang ở <code>WCHAN</code> nào, (3) dòng ' +
            '<code>holding both</code> có được in ra không.',
      crit: [
        'Chương trình thật sự treo — không tự in <code>finished</code>',
        'Chép lại được bảng <code>ps -L</code>: mọi luồng ở <code>Sl+</code> và <code>futex_do_wait</code>',
        'Đọc đúng <code>Threads: 3</code> và giải thích luồng thứ ba là luồng chính đang kẹt trong <code>pthread_join</code>',
        'Chỉ ra dòng <code>holding both …</code> <b>không</b> xuất hiện, và nói được vì sao đó là bằng chứng',
        'Chạy dưới <code>timeout 5</code> và ghi nhận mã thoát <b>124</b>',
        'Xác nhận CPU bằng <code>top</code> hoặc <code>ps -o %cpu</code>: gần <b>0 %</b>, không phải 100 %',
        'Đã dọn tiến trình treo bằng <code>kill -9</code>'
      ],
      sol: '<p><b>Kết quả mong đợi</b> khớp với dữ liệu bạn đã đọc ở câu B3: hai dòng ' +
           '<code>holding …, requesting …</code>, rồi im lặng vĩnh viễn; ' +
           '<code>ps -L</code> cho ba dòng <code>Sl+ futex_do_wait</code>; ' +
           '<code>Threads: 3</code>; <code>timeout</code> trả <b>124</b>.</p>' +
           '<p><b>Vì sao phải có <code>sleep(1)</code> trong mã.</b> Không có nó, chương ' +
           'trình vẫn có lỗi y hệt nhưng thường <i>chạy xong bình thường</i>: luồng thứ nhất ' +
           'kịp lấy cả hai khoá và nhả ra trước khi luồng thứ hai kịp khởi động. Câu ' +
           '<code>sleep</code> chỉ nới rộng cửa sổ để lỗi hiện ra <b>mỗi lần</b> thay vì ' +
           'hiếm khi. Chương trình ngoài đời không có <code>sleep</code> đó, và đó chính là ' +
           'lý do deadlock ở C3 hai tuần mới xuất hiện một lần.</p>' +
           '<p><b>Chi tiết dễ bị bỏ qua — <code>fflush(stdout)</code>.</b> Nếu bỏ nó đi, hai ' +
           'dòng thông báo có thể nằm lại trong bộ đệm <code>stdio</code> và không bao giờ ' +
           'được in, vì chương trình chết bằng <code>kill -9</code> chứ không thoát bình ' +
           'thường. Bạn sẽ thấy một tiến trình treo <i>hoàn toàn câm</i>. Trên thiết bị thật ' +
           'thì đây là tình huống mặc định — log của bạn cũng đang nằm trong bộ đệm.</p>' +
           '<p><b>Bước cuối, quan trọng nhất:</b> xác nhận CPU gần 0 %:</p>' +
           '<pre><code>ps -o pid,%cpu,stat,comm -p $PID</code></pre>' +
           '<p>Hãy nhìn kỹ con số đó. Một tiến trình hỏng hoàn toàn, không tiến triển được ' +
           'nửa bước, nhưng mọi chỉ số tài nguyên đều đẹp. Đó là hình ảnh bạn cần nhận ra ' +
           'ngay lập tức khi gặp lại lúc 3 giờ sáng.</p>' },

    { id: 'e4', k: 'free', tag: 'Thử thách', rows: 6,
      q: 'Câu B2 khẳng định đòn bẩy không nằm ở loại khoá mà ở <b>số lần vào vùng tới hạn</b>. ' +
         'Hãy chứng minh điều đó bằng số đo của chính bạn: giữ nguyên <code>pthread_mutex</code> ' +
         '— không đổi sang atomic — mà làm cho nó nhanh gần bằng bản không khoá.',
      blocks: [
        { t: 'code', where: 'wsl', name: 'ý tưởng: cộng vào biến cục bộ, khoá đúng một lần mỗi luồng',
          code: 'void *increment(void *arg)\n' +
                '{\n' +
                '    (void)arg;\n' +
                '    long local = 0;\n' +
                '\n' +
                '    for (int i = 0; i < N; i++)\n' +
                '        local++;                    /* no lock on the hot path */\n' +
                '\n' +
                '    pthread_mutex_lock(&lock);      /* exactly once per thread */\n' +
                '    counter += local;\n' +
                '    pthread_mutex_unlock(&lock);\n' +
                '    return NULL;\n' +
                '}' }
      ],
      hint: 'Biên dịch bản này ở <code>-O0</code> để trình tối ưu không gộp mất vòng lặp — ' +
            'bạn cần so công bằng với bản mutex cũ. Và kiểm tra kết quả vẫn là 2000000.',
      crit: [
        'Chương trình vẫn in đúng <b>2000000</b> — gộp lại không được phép làm mất tính đúng đắn',
        'Đo được thời gian và so với bản khoá-mỗi-vòng: nhanh hơn hàng chục lần, xấp xỉ bản không khoá',
        'Nói rõ số lần vào vùng tới hạn giảm từ <b>2 000 000</b> xuống <b>2</b>',
        'Nhận ra bản này <b>vẫn dùng đúng con mutex cũ</b> — nên đã bác được kết luận "mutex chậm thì phải thay bằng atomic"',
        'Nêu điều kiện để thủ thuật này dùng được: phép toán phải có tính <b>kết hợp</b> (cộng, max, đếm) và kết quả trung gian không cần ai khác nhìn thấy',
        'Nêu ca <b>không</b> dùng được: khi luồng khác phải thấy giá trị mới ngay lập tức, hoặc khi vùng tới hạn phải giữ nhiều biến nhất quán ở từng bước',
        'Nêu cái giá: giá trị chung <b>trễ</b> — trong lúc luồng đang cộng dồn cục bộ, <code>counter</code> chưa phản ánh công việc đã làm'
      ],
      sol: '<p><b>Kết quả mong đợi: gần bằng bản không khoá, mà vẫn đúng.</b> Trên máy tham ' +
           'chiếu bản khoá-mỗi-vòng mất khoảng 136 ms; bản gộp này xuống dưới 20 ms — tức là ' +
           'gần như toàn bộ 125 ms kia biến mất, chỉ bằng cách <i>gọi mutex ít đi</i>.</p>' +
           '<p><b>Phép tính giải thích tất cả.</b> Một cặp <code>lock</code>/<code>unlock</code> ' +
           'tốn khoảng 60 ns. Nhân với 2 000 000 lần ⇒ 120 ms. Nhân với <b>2</b> lần ⇒ ' +
           '120 <i>nano</i>giây. Con số biến mất khỏi phép đo, và mutex thì không hề được ' +
           'sửa một dòng nào.</p>' +
           '<p><b>Đây là điều cần rút ra, và nó ngược với phản xạ đầu tiên của hầu hết ' +
           'mọi người:</b> khi thấy "mutex chậm gấp 12 lần", phản xạ là đi tìm một loại khoá ' +
           'nhanh hơn. Nhưng 12× đó không phải thuộc tính của mutex — nó là thuộc tính của ' +
           '<i>tỷ lệ giữa chi phí đồng bộ và công việc hữu ích</i>. Vùng tới hạn ở đây chỉ có ' +
           'một phép cộng, nên chi phí đồng bộ chiếm hết. Làm vùng tới hạn "to" hơn bằng cách ' +
           'gộp việc lại, và tỷ lệ đảo ngược.</p>' +
           '<p><b>Khi nào dùng được thủ thuật này:</b></p>' +
           '<ul>' +
           '<li>Phép toán có tính <b>kết hợp</b>: cộng, đếm, lấy max, gom danh sách. Cộng ' +
           'từng cái một hay cộng dồn rồi cộng một lần đều ra cùng kết quả.</li>' +
           '<li>Không ai cần thấy <b>giá trị trung gian</b>. Đây mới là ràng buộc thật.</li>' +
           '</ul>' +
           '<p><b>Cái giá — và phải nói ra khi thiết kế:</b> giá trị chung bị <b>trễ</b>. ' +
           'Trong lúc một luồng đang cộng dồn vào <code>local</code>, biến ' +
           '<code>counter</code> chưa biết gì về công việc đó. Với một bộ đếm thống kê báo ' +
           'cáo mỗi giây thì hoàn toàn chấp nhận được. Với một bộ đếm điều khiển việc dừng ' +
           'khẩn cấp thì không. Ở câu C2 tôi đề xuất gộp theo chu kỳ 100 ms — chính là chọn ' +
           'một điểm cân bằng giữa chi phí khoá và độ trễ, chứ không phải chọn cực đoan nào ' +
           'trong hai đầu.</p>' },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi', rows: 5,
      q: 'Chương trình dưới đây chờ một cờ được bật sau 2 giây bằng <b>vòng lặp bận</b>. ' +
         'Hãy đo CPU của nó, rồi viết lại bằng <code>pthread_cond_wait</code> và đo lại. ' +
         'Giải thích vì sao <code>real</code> không đổi mà <code>CPU</code> đổi hẳn.',
      blocks: [
        { t: 'code', where: 'wsl', name: '~/bt22/busy_wait.c — bản sai',
          code: 'cat > busy_wait.c << \'EOF\'\n' +
                '#include <stdio.h>\n' +
                '#include <unistd.h>\n' +
                '#include <pthread.h>\n' +
                '\n' +
                'volatile int ready = 0;\n' +
                '\n' +
                'void *waker(void *arg)\n' +
                '{\n' +
                '    (void)arg;\n' +
                '    sleep(2);\n' +
                '    ready = 1;\n' +
                '    return NULL;\n' +
                '}\n' +
                '\n' +
                'int main(void)\n' +
                '{\n' +
                '    pthread_t t;\n' +
                '\n' +
                '    pthread_create(&t, NULL, waker, NULL);\n' +
                '    while (!ready)\n' +
                '        ;                           /* burns a whole core */\n' +
                '    pthread_join(t, NULL);\n' +
                '    printf("done\\n");\n' +
                '    return 0;\n' +
                '}\n' +
                'EOF' },
        { t: 'code', where: 'wsl', name: 'đo cả hai bản',
          code: 'gcc -O2 -pthread -o busy_wait busy_wait.c\n' +
                'gcc -O2 -pthread -o cond_wait cond_wait.c\n' +
                'for p in busy_wait cond_wait; do echo "--- $p ---"; /usr/bin/time -f \\\n' +
                '  "  real %e s | CPU %U+%S s | CPU_pct %P" ./$p; done' }
      ],
      hint: 'Bản đúng cần thêm một <code>pthread_mutex_t</code> và một ' +
            '<code>pthread_cond_t</code>. Và nhớ dùng <code>while</code>, không phải ' +
            '<code>if</code> — lý do ở câu C5.',
      crit: [
        'Viết được <code>cond_wait.c</code> chạy đúng: cùng in <code>done</code> sau khoảng 2 giây',
        'Bản đúng dùng <code>while (!ready) pthread_cond_wait(&amp;cv, &amp;lock);</code> chứ không dùng <code>if</code>',
        'Luồng <code>waker</code> khoá mutex, đặt cờ, rồi <code>pthread_cond_signal</code>',
        'Đo được: cả hai bản <code>real</code> ≈ <b>2,00 s</b>',
        'Đo được: <code>busy_wait</code> tốn ≈ <b>2 s CPU, 99 %</b>; <code>cond_wait</code> tốn ≈ <b>0,00 s CPU, 0 %</b>',
        'Giải thích đúng: trạng thái <b>R</b> (luôn sẵn sàng chạy) so với trạng thái <b>S</b> (bị tháo khỏi hàng đợi chạy)',
        'Nêu hệ quả nhúng: điện, nhiệt, và trên hệ một lõi thì vòng lặp bận còn làm chậm chính luồng nó đang chờ'
      ],
      sol: '<p><b>Bản đúng:</b></p>' +
           '<pre><code>#include &lt;stdio.h&gt;\n' +
           '#include &lt;unistd.h&gt;\n' +
           '#include &lt;pthread.h&gt;\n' +
           '\n' +
           'int ready = 0;\n' +
           'pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;\n' +
           'pthread_cond_t  cv   = PTHREAD_COND_INITIALIZER;\n' +
           '\n' +
           'void *waker(void *arg)\n' +
           '{\n' +
           '    (void)arg;\n' +
           '    sleep(2);\n' +
           '    pthread_mutex_lock(&amp;lock);\n' +
           '    ready = 1;\n' +
           '    pthread_cond_signal(&amp;cv);      /* signal while holding the lock */\n' +
           '    pthread_mutex_unlock(&amp;lock);\n' +
           '    return NULL;\n' +
           '}\n' +
           '\n' +
           'int main(void)\n' +
           '{\n' +
           '    pthread_t t;\n' +
           '\n' +
           '    pthread_create(&amp;t, NULL, waker, NULL);\n' +
           '    pthread_mutex_lock(&amp;lock);\n' +
           '    while (!ready)                  /* while, never if */\n' +
           '        pthread_cond_wait(&amp;cv, &amp;lock);\n' +
           '    pthread_mutex_unlock(&amp;lock);\n' +
           '    pthread_join(t, NULL);\n' +
           '    printf("done\\n");\n' +
           '    return 0;\n' +
           '}</code></pre>' +
           '<p><b>Ba chi tiết trong đoạn trên đều là bắt buộc, không phải phong cách:</b></p>' +
           '<ul>' +
           '<li><code>ready</code> <b>không</b> còn <code>volatile</code>. Nó không cần nữa: ' +
           'mọi lần đọc/ghi đều nằm trong vùng khoá, và mutex đã mang theo bảo đảm khả kiến. ' +
           'Đây là minh hoạ sống cho câu D1 — <code>volatile</code> là công cụ cho trường hợp ' +
           '<i>không</i> có đồng bộ.</li>' +
           '<li><code>pthread_cond_wait</code> phải được gọi khi <b>đang giữ khoá</b>. Bản ' +
           'thân nó nhả khoá ra lúc ngủ và lấy lại khoá trước khi trở về — đó là lý do nó cần ' +
           'tham số mutex.</li>' +
           '<li><code>while</code>, không phải <code>if</code>: đánh thức giả và kẻ chen ' +
           'ngang, đúng hai lý do ở C5.</li>' +
           '</ul>' +
           '<p><b>Số đo mong đợi</b> — khớp với dữ liệu bạn đã đọc ở B4: ' +
           '<code>busy_wait</code> ra <code>real 2.00 s | CPU 1.99 s | CPU_pct 99%</code>, ' +
           '<code>cond_wait</code> ra <code>real 2.00 s | CPU 0.00 s | CPU_pct 0%</code>.</p>' +
           '<p><b><code>real</code> không đổi vì bài toán không đổi:</b> cả hai đều phải chờ ' +
           'đủ 2 giây. Vòng lặp bận không rút ngắn được thời gian chờ, nó chỉ chọn cách chờ ' +
           'tốn kém nhất có thể. Trong 2 giây đó, bản bận nằm ở trạng thái <b>R</b> và được ' +
           'xếp lịch chạy liên tục; bản đúng nằm ở <b>S</b> và bị nhân tháo hẳn khỏi hàng đợi ' +
           'chạy.</p>' +
           '<p><b>Trên thiết bị chạy pin, 1,99 giây CPU đó là điện và là nhiệt.</b> Và trên ' +
           'SoC một lõi thì tệ hơn: vòng lặp bận cướp CPU của chính luồng <code>waker</code>, ' +
           'nên cờ được bật <i>muộn hơn</i>. Cách chờ tốn kém nhất cũng là cách chờ chậm ' +
           'nhất.</p>' },

    { id: 'e6', k: 'free', tag: 'Thử thách', rows: 8,
      q: 'Đo cái giá bộ nhớ của luồng: tạo <b>100</b> luồng, đọc <code>VmSize</code> và ' +
         '<code>VmRSS</code>, rồi đặt ngăn xếp xuống <b>64 KB</b> và đo lại. Con số nào đổi, ' +
         'con số nào <i>không</i> đổi, và vì sao? Ngoài ra, hãy chạy chương trình ' +
         '<b>hai lần liên tiếp</b> và so thời gian tạo luồng của lần đầu với lần sau.',
      blocks: [
        { t: 'code', where: 'wsl', name: '~/bt22/many_threads.c',
          code: 'cat > many_threads.c << \'EOF\'\n' +
                '#include <stdio.h>\n' +
                '#include <unistd.h>\n' +
                '#include <pthread.h>\n' +
                '#include <limits.h>\n' +
                '\n' +
                '#define NTHREADS 100\n' +
                '\n' +
                'static void *sleeper(void *arg)\n' +
                '{\n' +
                '    (void)arg;\n' +
                '    sleep(3);\n' +
                '    return NULL;\n' +
                '}\n' +
                '\n' +
                'static void show_status(void)\n' +
                '{\n' +
                '    char line[256];\n' +
                '    FILE *f = fopen("/proc/self/status", "r");\n' +
                '\n' +
                '    while (fgets(line, sizeof line, f))\n' +
                '        if (!strncmp(line, "VmSize", 6) ||\n' +
                '            !strncmp(line, "VmRSS", 5)  ||\n' +
                '            !strncmp(line, "Threads", 7))\n' +
                '            fputs(line, stdout);\n' +
                '    fclose(f);\n' +
                '}\n' +
                'EOF' },
        { t: 'code', where: 'wsl', name: 'phần main: dùng attr để đổi kích thước ngăn xếp',
          code: 'cat > stack_attr.txt << \'EOF\'\n' +
                'pthread_attr_t attr;\n' +
                '\n' +
                'pthread_attr_init(&attr);\n' +
                'pthread_attr_setstacksize(&attr, 64 * 1024);   /* 64 KB instead of 8 MB */\n' +
                '\n' +
                'for (int i = 0; i < NTHREADS; i++)\n' +
                '    pthread_create(&tid[i], &attr, sleeper, NULL);\n' +
                '\n' +
                'pthread_attr_destroy(&attr);\n' +
                'EOF' },
        { t: 'code', where: 'wsl', name: 'ngăn xếp mặc định lấy từ đâu',
          code: 'ulimit -s' },
        { t: 'code', where: 'wsl', name: 'chạy hai lần liên tiếp',
          code: './many_threads; echo "--- second run ---"; ./many_threads' }
      ],
      hint: 'Trước khi chạy lần hai, hãy dự đoán: thời gian tạo luồng của lần hai sẽ ' +
            '<i>giống</i>, <i>nhanh hơn</i>, hay <i>chậm hơn</i> lần đầu? Ghi dự đoán ra ' +
            'giấy trước.',
      crit: [
        'Bản 8 MB: <code>VmSize</code> khoảng <b>800 MB</b>, <code>VmRSS</code> chỉ khoảng <b>2,7 MB</b>, <code>Threads: 101</code>',
        'Bản 64 KB: <code>VmSize</code> tụt xuống khoảng <b>8 MB</b>, còn <code>VmRSS</code> <b>gần như không đổi</b>',
        'Giải thích đúng: <code>VmSize</code> là bộ nhớ <b>ảo</b> đã hứa, <code>VmRSS</code> là trang <b>vật lý</b> đã thật sự chạm tới — nhân cấp trang theo kiểu lười',
        'Kết luận đúng: thu nhỏ ngăn xếp cứu <b>không gian địa chỉ</b>, không cứu RAM',
        'Nối được với ràng buộc thật: trên ARM 32-bit, không gian địa chỉ người dùng ~3 GB nên vài trăm luồng × 8 MB là hết, <code>pthread_create</code> trả <code>EAGAIN</code>',
        'Xác nhận <code>ulimit -s</code> ra <b>8192</b> (kB) và nối nó với con số 8 MB mặc định',
        'Đã ghi dự đoán về lần chạy thứ hai <b>trước</b> khi chạy, rồi so với thực tế',
        'Quan sát được lần chạy đầu <b>chậm hơn</b> rõ rệt so với lần sau, và giải thích được: lần đầu nhân phải cấp trang thật cho ngăn xếp mới, lần sau bộ nhớ đệm trang đã ấm'
      ],
      sol: '<p><b>Phần một — bảng kết quả.</b></p>' +
           '<table><thead><tr><th></th><th>Ngăn xếp 8 MB</th><th>Ngăn xếp 64 KB</th>' +
           '<th>Đọc thế nào</th></tr></thead><tbody>' +
           '<tr><td><code>VmSize</code></td><td>≈ 822 368 kB (~803 MB)</td><td>≈ 8 MB</td>' +
           '<td>Đổi <b>100 lần</b> — đây là bộ nhớ <i>ảo</i>, tức lời hứa</td></tr>' +
           '<tr><td><code>VmRSS</code></td><td>≈ 2 772 kB</td><td>≈ 2 700 kB</td>' +
           '<td><b>Gần như không đổi</b> — đây mới là RAM thật</td></tr>' +
           '<tr><td><code>Threads</code></td><td>101</td><td>101</td>' +
           '<td>100 luồng + luồng chính</td></tr>' +
           '</tbody></table>' +
           '<p><b>Vì sao <code>VmRSS</code> không đổi.</b> Nhân cấp trang theo kiểu lười: khi ' +
           '<code>pthread_create</code> xin 8 MB ngăn xếp, nhân chỉ ghi vào bảng ánh xạ ' +
           '"vùng địa chỉ này là của anh" và <i>không</i> cấp một trang vật lý nào. Trang chỉ ' +
           'được cấp khi luồng thật sự chạm tới. Một luồng chỉ gọi <code>sleep</code> thì ' +
           'chạm vào một hai trang. 100 luồng × vài trang ≈ vài trăm kB — đúng bằng chênh ' +
           'lệch nhỏ bạn thấy.</p>' +
           '<p><b>Vậy thu nhỏ ngăn xếp để làm gì?</b> Không phải để tiết kiệm RAM. Nó tiết ' +
           'kiệm <b>không gian địa chỉ</b>. Trên hệ 64-bit, không gian địa chỉ nhiều đến mức ' +
           'gần như vô hạn nên chuyện này không quan trọng. Trên <b>ARM 32-bit</b> — vẫn rất ' +
           'phổ biến trong nhúng — không gian người dùng chỉ khoảng 3 GB, và ' +
           '3 GB ÷ 8 MB ≈ <b>380 luồng</b> là chạm trần. Khi chạm trần, ' +
           '<code>pthread_create</code> trả về <code>EAGAIN</code> (11) trong khi ' +
           '<code>free</code> vẫn báo còn thừa RAM — một thông báo lỗi không ăn nhập gì với ' +
           'nguyên nhân, và cực khó đoán nếu chưa từng thấy.</p>' +
           '<p><code>ulimit -s</code> ra <b>8192</b> (kB) — chính là 8 MB. ' +
           '<code>pthread</code> lấy đúng giá trị này làm mặc định, nên đổi ' +
           '<code>ulimit -s</code> trước khi chạy cũng đổi được mặc định của luồng.</p>',
      solBlocks: [
        { t: 'cal', kind: 'warn', title: 'Phần hai — lần chạy đầu tiên luôn chậm hơn, và đây là cái bẫy đo lường lớn nhất của cả bài', x:
          '<p>Nếu bạn dự đoán "hai lần như nhau" thì bạn vừa gặp đúng cái bẫy mà bài này ' +
          'muốn bạn gặp. Lần chạy <b>đầu tiên</b> tạo luồng chậm hơn hẳn lần sau — có thể ' +
          'gấp nhiều lần.</p>' +
          '<p><b>Vì sao.</b> Lần đầu, nhân phải thật sự dựng ánh xạ mới và cấp trang vật lý ' +
          'cho từng ngăn xếp; các cấu trúc dữ liệu của nhân cho vùng nhớ chưa nằm trong bộ ' +
          'nhớ đệm; bộ cấp phát của thư viện C cũng chưa ấm. Lần thứ hai, phần lớn công việc ' +
          'đó đã được đệm sẵn.</p>' +
          '<p><b>Hệ quả cho mọi phép đo trong bài này, kể cả E2 và E4:</b> đừng bao giờ tin ' +
          'lần chạy đầu tiên. Chạy ít nhất ba lần, bỏ lần đầu, rồi lấy giá trị nhỏ nhất trong ' +
          'các lần còn lại. Nếu bạn so "luồng nhanh hơn tiến trình bao nhiêu lần" mà lấy lần ' +
          'chạy đầu của bên này với lần chạy thứ năm của bên kia, con số bạn công bố sẽ sai — ' +
          'và sai theo hướng bạn <i>muốn</i> nó sai, thứ khó phát hiện nhất.</p>' } ] }
  ],

  diag: [
    ['A1, B1, C1, E1',
     'Bạn còn tin rằng <b>chạy thấy đúng là đúng</b>. <code>counter++</code> là ba việc — ' +
     'nạp, cộng, cất — và mức tối ưu quyết định lỗi hiện ra thế nào chứ không quyết định lỗi ' +
     'có hay không. Chừng nào chưa đọc mã máy, bạn chưa có bằng chứng nào cả.',
     '<a href="#/bai-22#vi-sao-counter-khong-phai-mot-thao-tac">Đọc lại Bài 22 — Vì sao counter++ không phải một thao tác</a> · ' +
     '<a href="#/bai-22#bay-chet-nguoi-cung-ma-nguon-ba-muc-toi-uu-ba-kieu-sai-khac-">Bẫy chết người: cùng mã nguồn, ba mức tối ưu, ba kiểu sai khác nhau</a>'],

    ['A4, B2, E2, E4',
     'Bạn còn đọc con số 12× như một bản án dành cho mutex. Nó không phải thuộc tính của ' +
     'mutex mà là <b>tỷ lệ giữa chi phí đồng bộ và công việc hữu ích</b> — và đòn bẩy nằm ở ' +
     '<i>số lần vào vùng tới hạn</i>, không phải ở loại khoá.',
     '<a href="#/bai-22#cach-sua-thu-nhat-pthread-mutex">Đọc lại Bài 22 — Cách sửa thứ nhất: pthread_mutex</a> · ' +
     '<a href="#/bai-22#cach-sua-thu-hai-bien-nguyen-tu-cua-c11">Cách sửa thứ hai: biến nguyên tử của C11</a>'],

    ['C2',
     'Bạn chưa quen <b>làm phép tính trước khi kết luận</b>: nhân số lần khoá với chi phí mỗi ' +
     'lần rồi so với ngân sách một giây. Ở tình huống 20 kHz, phép tính đó bác bỏ nghi phạm ' +
     'hiển nhiên và chỉ ra nguyên nhân thật.',
     '<a href="#/bai-22#cach-sua-thu-nhat-pthread-mutex">Đọc lại Bài 22 — Cách sửa thứ nhất: pthread_mutex</a> · ' +
     '<a href="#/bai-22#con-so-1-gia-tao-ra">Con số 1 — giá tạo ra</a>'],

    ['A7, B3, C3, E3',
     'Bạn còn coi deadlock là chuyện <b>xui xẻo</b>. Nó là một <b>chu trình chờ</b> nằm sẵn ' +
     'trong mã, sinh ra từ việc lấy khoá theo hai thứ tự ngược nhau — và vì thế nó phòng được ' +
     'bằng một quy tắc, không phải bằng may mắn.',
     '<a href="#/bai-22#deadlock-khi-khoa-quay-lai-can-ban">Đọc lại Bài 22 — Deadlock: khi khoá quay lại cắn bạn</a> · ' +
     '<a href="#/bai-22#cach-phong-quy-tac-thu-tu-khoa">Cách phòng: quy tắc thứ tự khoá</a>'],

    ['B3, C3, E3',
     'Bạn chưa đọc được trạng thái luồng từ bên ngoài. <code>ps -L</code> với cột ' +
     '<code>wchan</code> là công cụ chẩn đoán quan trọng nhất khi thiết bị không có ' +
     '<code>gdb</code>: mọi luồng ở <code>futex_do_wait</code> + 0 % CPU là chữ ký của ' +
     'deadlock.',
     '<a href="#/bai-22#nhin-thay-luong-tu-ben-ngoai-ps-l-va-proc">Đọc lại Bài 22 — Nhìn thấy luồng từ bên ngoài: ps -L và /proc</a> · ' +
     '<a href="#/bai-05#proc-va-sys-hai-thu-muc-khong-nam-tren-dia">Bài 5 — /proc và /sys: hai thư mục không nằm trên đĩa</a>'],

    ['A5, B4, C5, E5',
     'Bạn chưa nắm biến điều kiện: vì sao phải là <code>while</code> chứ không phải ' +
     '<code>if</code> (đánh thức giả <i>và</i> kẻ chen ngang), và vì sao vòng lặp bận tốn ' +
     'trọn một lõi mà không nhanh hơn một phần nghìn giây nào.',
     '<a href="#/bai-22#bien-dieu-kien-cho-ma-khong-dot-cpu">Đọc lại Bài 22 — Biến điều kiện: chờ mà không đốt CPU</a>'],

    ['A3, B6, C4',
     'Bạn chưa thấy rõ ranh giới: luồng chia sẻ <b>gần như mọi thứ</b>, nên một ' +
     '<code>SIGSEGV</code> giết cả cụm. Cô lập lỗi là thứ bạn <i>trả tiền để mua</i> khi chọn ' +
     'tiến trình, và có những lúc phải mua.',
     '<a href="#/bai-22#luong-hay-tien-trinh-quyet-dinh-the-nao-tren-thiet-bi-64-mb-">Đọc lại Bài 22 — Luồng hay tiến trình: quyết định thế nào trên thiết bị 64 MB RAM</a> · ' +
     '<a href="#/bai-22#con-so-3-gia-cua-mot-loi">Con số 3 — giá của một lỗi</a>'],

    ['A6, B5, E6',
     'Bạn còn lẫn <code>VmSize</code> với <code>VmRSS</code>. Ngăn xếp 8 MB mỗi luồng là bộ ' +
     'nhớ <b>ảo</b> đã hứa, không phải RAM đã tiêu — nên thu nhỏ nó cứu <b>không gian địa ' +
     'chỉ</b> chứ không cứu RAM. Trên ARM 32-bit đó mới là ràng buộc thật.',
     '<a href="#/bai-22#con-so-2-gia-bo-nho">Đọc lại Bài 22 — Con số 2: giá bộ nhớ</a> · ' +
     '<a href="#/bai-22#luong-la-gi-cung-mot-ngoi-nha-nhieu-nguoi-o">Luồng là gì — cùng một ngôi nhà, nhiều người ở</a>'],

    ['A2',
     'Bạn chưa rõ <code>-pthread</code> làm gì. Nó không chỉ là <code>-lpthread</code>: nó ' +
     'còn bật <code>-D_REENTRANT</code>, và bỏ nó đi thì chương trình vẫn liên kết được nhưng ' +
     'sai ở những chỗ bạn không nhìn thấy.',
     '<a href="#/bai-22#co-pthread-vi-sao-van-phai-viet-du-chuong-trinh-co-ve-chay-d">Đọc lại Bài 22 — Cờ -pthread: vì sao vẫn phải viết dù chương trình có vẻ chạy được</a>'],

    ['A8',
     'Bạn chưa nối được <b>triệu chứng</b> với <b>nguyên nhân</b>. Đây là bảng tra quan trọng ' +
     'nhất của cả bài: kết quả sai ngẫu nhiên, treo ở 0 % CPU, treo ở 100 % CPU và ' +
     '<code>EAGAIN</code> là bốn bệnh khác nhau với bốn cách chữa khác nhau.',
     '<a href="#/bai-22#loi-thuong-gap">Đọc lại Bài 22 — Lỗi thường gặp</a> · ' +
     '<a href="#/bai-22#thuc-hanh-tao-loi-mo-loi-sua-loi-do-gia-cua-cach-sua">Thực hành: tạo lỗi, mổ lỗi, sửa lỗi, đo giá của cách sửa</a>'],

    ['D1',
     'Bạn còn lẫn <code>volatile</code> với <code>_Atomic</code>: một cái nói về <b>khả ' +
     'kiến</b> (trình biên dịch), một cái nói về <b>nguyên tử</b> (phần cứng). Nhầm cặp này ' +
     'là lý do bản vá ở câu C1 bị từ chối.',
     '<a href="#/bai-14#volatile-tu-khoa-cuu-ban-khoi-chinh-trinh-bien-dich">Đọc lại Bài 14 — volatile: từ khoá cứu bạn khỏi chính trình biên dịch</a> · ' +
     '<a href="#/bai-22#cach-sua-thu-hai-bien-nguyen-tu-cua-c11">Bài 22 — Cách sửa thứ hai: biến nguyên tử của C11</a>'],

    ['D2',
     'Bạn chưa nhớ vì sao handler chỉ được gọi hàm async-signal-safe. Khoá mutex trong ' +
     'handler là ca kinh điển: tín hiệu chen vào đúng luồng đang giữ khoá và chương trình tự ' +
     'khoá chính mình.',
     '<a href="#/bai-21#quy-tac-vang-trong-handler-duoc-lam-gi-va-khong-duoc-lam-gi">Đọc lại Bài 21 — Quy tắc vàng: trong handler được làm gì và không được làm gì</a>'],

    ['D3',
     'Bạn chưa nắm <code>fork()</code> trong chương trình đa luồng: con chỉ có <b>một</b> ' +
     'luồng, nhưng lại thừa hưởng nguyên trạng thái mọi mutex — kể cả những cái đang bị khoá ' +
     'bởi luồng không còn tồn tại.',
     '<a href="#/bai-20#fork-ham-duy-nhat-tra-ve-hai-lan">Đọc lại Bài 20 — fork(): hàm duy nhất trả về hai lần</a> · ' +
     '<a href="#/bai-20#sau-fork-cha-va-con-khong-dung-chung-mot-bien-nao">Sau fork, cha và con không dùng chung một biến nào</a>']
  ]
});

/* ═══════════════════════════════════════════════════════════════════════════
   BÀI TẬP 14 — C cho embedded
   Cặp với lessons/bai-14.js · Chặng 02 · C và công cụ build

   ───────────────────────────────────────────────────────────────────────────
   §13.4 · KIỂM TOÁN CHỌN TRỤC — làm trước khi viết câu nào

   Bước 1 · Kiểm kê (17 ứng viên rút từ goals, h2/h3, cal kind:'why', cmdx,
   terms, recap của bài 14):
     vì sao nhúng dùng C · int/long không cố định (LP64 so với ILP32) ·
     uint32_t và <stdint.h> · _Static_assert · thứ tự byte little/big-endian ·
     con trỏ là số CÓ KIỂU (p+1 nhảy theo sizeof) · mảng suy biến thành con
     trỏ · truyền theo giá trị so với truyền con trỏ · byte đệm và căn lề ·
     thứ tự trường đổi thì sizeof đổi · __attribute__((packed)) và cái giá của
     nó · union một vùng nhớ nhiều cách nhìn · bitfield · macro thao tác bit ·
     volatile · static ba nghĩa · nm và bảng ký hiệu

   Bước 2 · Chấm điểm (phụ thuộc về sau / giá của ngộ nhận / phản trực giác):

     ỨNG VIÊN                                    PT  GIÁ  PTG  TỔNG
     int/long không có độ rộng cố định            2    2    2     6   ← trục 0
     byte đệm: sizeof ≠ tổng, thứ tự đổi cỡ đổi   2    2    2     6   ← trục 1
     volatile: chỉ lộ ra ở -O2                    2    2    2     6   ← trục 2
     thứ tự byte little/big-endian                2    2    1     5   ✗ xếp sau
     mảng suy biến thành con trỏ                  1    2    2     5   ✗ xếp sau
     packed: nhỏ hơn nhưng truy cập lệch          1    2    1     4   ✗ nhập trục 1
     con trỏ là số có kiểu (p+1)                  1    2    1     4   ✗ xếp sau
     union / bitfield                             1    1    1     3   ✗ cắt
     static ba nghĩa + nm                         1    1    1     3   ✗ cắt (†)
     truyền theo giá trị so với con trỏ           1    1    1     3   ✗ cắt
     macro thao tác bit                           2    1    0     3   ✗ cắt (‡)
     _Static_assert                               1    0    1     2   ✗ cắt
     uint32_t / <stdint.h>                        1    1    0     2   ✗ nhập trục 0
     vì sao nhúng dùng C                          0    0    0     0   ✗ cắt

     (†) static/nm chồng lấn phần liên kết của bài 15 — để bài 15 sở hữu, ở
         đây chỉ lấy một câu bề rộng (a8) và không xoáy.
     (‡) tên macro và số bit là thứ tra được trong mười giây → §13.3 cấm làm
         trục. Chỉ được đúng một câu mức A (a7).

   Bước 3 · Cắt: ngưỡng ≥ 4 tổng và ≥ 2 trục con ≥ 1. Ba ứng viên đầu bảng
   đều đạt 6 → lấy đúng ba. Hai ứng viên 5 điểm (thứ tự byte, mảng suy biến)
   bị xếp sau và được bù bằng câu bề rộng, ghi rõ ở bước 4.

   Bước 4 · Loại và điều phối:
     · Không ứng viên nào của bài 14 trùng trục đã tiêu của bt-01…bt-13 —
       cả khoá học đến giờ chưa có bộ nào chạm tới ngôn ngữ C.
     · "thứ tự byte" (5 điểm) được hai câu bề rộng, a3 và c4, chứ không phải
       ba câu xoáy. Lý do: nó phản trực giác vừa phải nhưng cực kỳ đắt khi sai
       trên đường truyền, nên đáng có một câu chẩn đoán — nhưng nó KHÔNG có
       tầng "giải thích cơ chế" nào sâu hơn "byte thấp nằm trước", nên làm
       trục sẽ phải bịa ra tầng thứ ba. Ghi lại để lần sau khỏi suy lại.
     · "mảng suy biến" (5 điểm) được a6 và e5 khuyết-tật-1.
     · "packed" được gộp vào trục 1 (cùng một cơ chế: bố cục bộ nhớ), xuất
       hiện ở b6, c5 và e5.

   Bước 5 · Phát biểu mỗi trục thành một câu có thể sai:
     0 · int và long KHÔNG có độ rộng cố định — ABI của kiến trúc đích quyết
         định; cùng một file .c cho sizeof(long)=8 trên x86-64/arm64 và 4 trên
         armhf, trong khi uint32_t không bao giờ đổi.
     1 · Trình biên dịch chèn byte đệm để mỗi trường nằm ở địa chỉ chia hết
         cho cỡ của nó; vì vậy sizeof(struct) ≠ tổng cỡ các trường, và chỉ đổi
         THỨ TỰ KHAI BÁO đã đủ đổi kích thước struct.
     2 · volatile không nói gì về tốc độ — nó cấm trình biên dịch giả định giá
         trị trong bộ nhớ không tự đổi; thiếu nó, chương trình vẫn đúng ở -O0
         và treo ở -O2, mà trình biên dịch không hề sai.

   Bước 6 · Ngộ nhận đối lập (lái distractor ở A, câu bắt lỗi ở B, kiểu hỏng ở C):
     0 · "int luôn 4 byte, long luôn 8 byte — chuẩn C quy định thế."
     1 · "sizeof của struct bằng tổng sizeof các trường; thứ tự khai báo chỉ
          là chuyện thẩm mỹ."
     2 · "volatile là để tối ưu/đồng bộ; thiếu nó thì cùng lắm chậm hơn."

   Bước 7 · Lưới 3 × 1 và kiểm tra:
     trục 0 → A1 (phát biểu)  B1 (transcript ba trình biên dịch)  C1 (chẩn đoán bo mạch armhf)
     trục 1 → A2 (phát biểu)  B2 (transcript ba bố cục struct)    C2 (tình huống mới: gói tin qua UART)
     trục 2 → A5 (đúng/sai)   B3 (hai bản assembly -O2)           C3 (tình huống mới: cờ ngắt)
     · C1/C2/C3 đều KHÔNG trả lời được nếu không nắm trục — mỗi câu buộc phải
       quyết định trên một ràng buộc không có trong bài.
     · Ba mức dùng ba loại kích thích khác nhau: phát biểu / dữ liệu thật /
       tình huống có ràng buộc. Không mức nào lặp từ vựng của mức kia.

   ───────────────────────────────────────────────────────────────────────────
   §13.8 · ĐỐI CHIẾU TRỤC ĐÃ TIÊU — không trục nào dưới đây được lặp lại:
     bt-01 MMU · bốn mảnh chạy tuần tự · Device Tree khai báo phần cứng
     bt-02 DRAM chưa dùng được lúc reset · mỗi tầng bàn giao rồi biến mất · bootargs
     bt-03 ảo hoá cần cùng kiến trúc · hai họ QEMU · /mnt/c là ranh giới chậm
     bt-04 shell tách từ trước khi lệnh thấy tham số · $? · builtin ≠ file
     bt-05 /proc sinh lúc đọc · file trong /dev không chứa dữ liệu · thư mục rỗng là điểm gắn
     bt-06 shell bung dấu * · tên không phải là file, inode mới là · metadata là một hệ thống
     bt-07 Ctrl+S đóng băng terminal · vim có chế độ · lệnh : mặc định một dòng
     bt-08 kernel xét MỘT bộ ba · rwx của thư mục là bảng tên · quyền chạm phần cứng đến từ nhóm
     bt-09 kill là lời đề nghị · load average là số đếm · jobs là sổ của shell
     bt-10 đường ống chỉ mang fd 1 · không phải lệnh nào cũng đọc stdin · giá thật của file tạm
     bt-11 uniq chỉ so với dòng liền trước · sed -i thay inode · BRE đổi nghĩa
     bt-12 chỉ mục là bản chụp trên đĩa · bao đóng phụ thuộc · .deb là thứ phái sinh
     bt-13 shebang chỉ có hiệu lực khi kernel khởi chạy · set -e ngoảnh mặt · hàm trả về trạng thái
   Ba trục của bt-14 nằm ngoài toàn bộ danh sách trên.

   ───────────────────────────────────────────────────────────────────────────
   MỌI LỆNH VÀ MỌI KẾT QUẢ TRONG FILE NÀY ĐỀU ĐÃ CHẠY THẬT trên WSL2 Ubuntu
   26.04 "resolute" của người dùng, ngày 19/08/2026, gcc 15.2.0 (Ubuntu
   15.2.0-16ubuntu1) cùng arm-linux-gnueabihf-gcc và aarch64-linux-gnu-gcc
   cùng phiên bản. Bốn điều đo được nằm ngoài dự đoán và đã được điều tra
   trước khi dùng (§2 quy tắc 2):

   1 · packed KHÔNG nhỏ hơn bản sắp lại thứ tự: struct 4 trường của E1 cho
       a=12, b=8 (sắp lại), packed=8. Tức là trong ví dụ này packed mua được
       ĐÚNG 0 byte so với cách miễn phí, mà vẫn phải trả giá truy cập lệch.
       Đã đo lại với 1000 bản ghi để chắc: 12000 / 8000 / 8000 byte. Đây là
       lõi của C5 — nếu không đo thì rất dễ viết một câu dạy sai.
   2 · `gcc -Wall -Wextra` CÓ bắt được khuyết tật "sizeof của tham số mảng":
       cảnh báo -Wsizeof-array-argument, kèm cả -Wsizeof-pointer-memaccess cho
       dòng memset. Nghĩa là khuyết tật này KHÔNG im lặng nếu bật cảnh báo —
       nên E5 phải hỏi "cảnh báo nào đã báo trước", không được dạy rằng trình
       biên dịch chịu thua.
   3 · Cùng `-Wall -Wextra`, `int mask = 1 << 31;` KHÔNG có cảnh báo nào, và
       chạy ra -2147483648. Đối lập với điểm 2: cùng một bộ cảnh báo, một
       khuyết tật bị bắt, một khuyết tật đi lọt. Đo thêm phép dịch phải để
       thấy hậu quả thật: a >> 4 = -134217728 còn b >> 4 = 134217728.
   4 · `-Wpadded` chỉ kêu ở struct có đệm (2 cảnh báo cho sensor_a: "padding
       struct to align 'value'" và "…'seq'") và IM LẶNG hoàn toàn ở bản đã sắp
       lại. Đây là công cụ E4 — nó biến trục 1 từ chuyện phải nhẩm tay thành
       chuyện hỏi thẳng trình biên dịch.

   CẢNH BÁO CHO PHIÊN SAU — cái bẫy trong chính kịch bản dò: viết
   `$cc -c -o /dev/null abi.c 2>&1 | head -n 12; echo "exit=$?"` thì `$?` là
   mã của `head`, KHÔNG phải của gcc. Kịch bản dò đầu tiên in "exit=0" ngay
   dưới hai dòng lỗi của arm-linux-gnueabihf-gcc. Không dòng "exit=" nào từ
   kịch bản đó được đưa vào bộ bài tập này.
   ═══════════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-14',
  minutes: 90,

  intro:
    '<p>Bài 14 là bài đầu tiên của Chặng 02, và nó đổi vai trò của bạn: từ người <i>dùng</i> ' +
    'Linux thành người <b>viết</b> phần mềm chạy trên nó. C không khó vì cú pháp — cú pháp C ' +
    'nhỏ hơn hầu hết ngôn ngữ bạn từng gặp. C khó vì nó <b>không giấu gì cả</b>: kích thước ' +
    'kiểu, bố cục bộ nhớ, thứ tự byte, quyền tối ưu của trình biên dịch — tất cả đều lộ ra và ' +
    'tất cả đều có thể cắn bạn.</p>' +
    '<p>Vì vậy bộ bài tập này không hỏi bạn nhớ cú pháp. Nó hỏi ba câu mà một kỹ sư nhúng ' +
    'phải trả lời đúng <b>trước khi</b> nạp firmware lên bo mạch: <b>kiểu này rộng bao ' +
    'nhiêu byte trên đích?</b> · <b>struct này thực sự nằm thế nào trong bộ nhớ?</b> · ' +
    '<b>trình biên dịch được phép bỏ qua lần đọc nào?</b> Cả ba đều hỏng <i>im lặng</i> — ' +
    'không thông báo lỗi, không mã thoát khác 0, chỉ có một thiết bị cư xử lạ.</p>' +
    '<p><b>Chia làm hai lượt, và khoảng cách giữa hai lượt là một thành phần của bài, ' +
    'không phải sự trì hoãn:</b></p>' +
    '<ul>' +
    '<li><b>Lượt 1 — ngay sau khi đọc xong bài 14</b> (~25 phút): phần <b>A</b> và <b>B</b>. ' +
    'Củng cố lúc kiến thức còn nóng.</li>' +
    '<li><b>Lượt 2 — sau 2–3 ngày</b> (~65 phút): phần <b>C</b>, <b>D</b> và <b>E</b>. ' +
    'Nhớ lại sau khi đã quên một phần mạnh hơn nhớ lại ngay rất nhiều.</li>' +
    '</ul>' +
    '<p>Phần <b>E</b> cần một terminal WSL. Mọi con số trong bộ này đều đã được đo thật trên ' +
    'chính máy bạn — nếu bạn chạy lại và ra số khác, con số của bạn mới là đúng, và chênh ' +
    'lệch đó đáng để tìm hiểu.</p>',

  truc: [
    { id: 'width',
      name: 'int và long không có độ rộng cố định — ABI của đích quyết định',
      x: 'Chuẩn C chỉ quy định độ rộng tối thiểu. sizeof(long) là 8 trên x86-64 và arm64 ' +
         '(LP64) nhưng 4 trên armhf (ILP32); sizeof(uint32_t) là 4 ở mọi nơi.',
      mis: 'int luôn 4 byte, long luôn 8 byte — chuẩn C quy định thế.' },

    { id: 'padding',
      name: 'Trình biên dịch chèn byte đệm, nên thứ tự trường đổi thì kích thước struct đổi',
      x: 'Mỗi trường phải nằm ở địa chỉ chia hết cho cỡ của nó, nên sizeof(struct) ≠ tổng ' +
         'cỡ các trường, và chỉ sắp lại thứ tự khai báo đã đủ để struct nhỏ đi.',
      mis: 'sizeof của struct bằng tổng sizeof các trường; thứ tự khai báo chỉ là thẩm mỹ.' },

    { id: 'volatile',
      name: 'volatile cấm trình biên dịch giả định bộ nhớ không tự đổi — thiếu nó chỉ lộ ở -O2',
      x: 'Không có volatile, trình biên dịch được phép đọc một lần rồi giữ trong thanh ghi. ' +
         'Code đúng ở -O0 và treo ở -O2, và trình biên dịch không hề làm sai.',
      mis: 'volatile là để tối ưu hoặc để đồng bộ; thiếu nó thì cùng lắm chương trình chậm hơn.' },
  ],

  /* ═══ A · Nhận biết — 4 trắc nghiệm + 2 đúng/sai + 1 điền khuyết + 1 ghép nối ═══ */
  A: [
    { id: 'a1', k: 'mcq', truc: 0, tag: 'Trắc nghiệm nhanh',
      q: 'Một file <code>.c</code> khai báo <code>long timeout;</code> và được biên dịch ' +
         'bằng ba trình biên dịch khác nhau — <code>gcc</code> (x86-64), ' +
         '<code>aarch64-linux-gnu-gcc</code> và <code>arm-linux-gnueabihf-gcc</code> — ' +
         'từ <b>đúng một</b> mã nguồn. Phát biểu nào đúng?',
      opts: [
        '<code>sizeof(long)</code> luôn là 8, vì chuẩn C quy định <code>long</code> rộng 64 bit.',
        '<code>sizeof(long)</code> do <b>ABI của kiến trúc đích</b> quyết định: 8 với hai trình đầu, <b>4</b> với <code>arm-linux-gnueabihf-gcc</code>.',
        '<code>sizeof(long)</code> phụ thuộc phiên bản gcc; ba trình này cùng 15.2.0 nên chắc chắn ra cùng một số.',
        '<code>sizeof(long)</code> luôn bằng <code>sizeof(int)</code>, vì cả hai đều là kiểu số nguyên mặc định của C.'
      ],
      a: 1,
      why: '<b>ABI của đích quyết định, không phải chuẩn C và không phải phiên bản trình ' +
           'biên dịch.</b> Chuẩn C chỉ đặt <b>sàn</b>: <code>long</code> ≥ 32 bit, ' +
           '<code>int</code> ≥ 16 bit. Phần còn lại do mô hình dữ liệu của nền tảng chọn — ' +
           'x86-64 và arm64 dùng <b>LP64</b> (<code>long</code> và con trỏ 64 bit), armhf ' +
           'dùng <b>ILP32</b> (<code>int</code>, <code>long</code>, con trỏ đều 32 bit). ' +
           'Ba trình biên dịch trong câu hỏi <i>cùng một phiên bản 15.2.0</i>, và vẫn ra hai ' +
           'kết quả khác nhau — đó chính là điều loại phương án 3.<br>' +
           'Bài 14 đã chứng minh việc này bằng <code>_Static_assert(sizeof(long) == 8)</code>: ' +
           'nó biên dịch trót lọt với <code>gcc</code> và <code>aarch64-linux-gnu-gcc</code>, ' +
           'và <b>không biên dịch nổi</b> với <code>arm-linux-gnueabihf-gcc</code>. ' +
           'Cách chữa cũng nằm ngay đó: dùng <code>uint32_t</code> khi bạn cần đúng 32 bit, ' +
           'vì <code>uint32_t</code> không bao giờ đổi.' },

    { id: 'a2', k: 'mcq', truc: 1, tag: 'Trắc nghiệm nhanh',
      q: 'Cho <code>struct sensor_a { uint8_t id; uint32_t value; uint8_t flag; uint16_t seq; };</code>. ' +
         'Cộng cỡ từng trường: 1 + 4 + 1 + 2 = <b>8 byte</b>. Trên x86-64, ' +
         '<code>sizeof(struct sensor_a)</code> bằng bao nhiêu, và vì sao?',
      opts: [
        '8 — trình biên dịch xếp các trường sát nhau đúng theo thứ tự khai báo.',
        '<b>12</b> — trình biên dịch chèn <b>byte đệm</b> để mỗi trường bắt đầu ở địa chỉ chia hết cho cỡ của chính nó.',
        '16 — mọi struct trên máy 64 bit đều được làm tròn lên bội số của 8 byte.',
        '8 hoặc 12 tuỳ mức tối ưu: <code>-O0</code> cho 12, còn <code>-O2</code> bỏ byte đệm đi để tiết kiệm.'
      ],
      a: 1,
      why: '<b>12 byte — thừa ra 4 byte không chứa gì cả.</b> Lý do là <b>căn lề</b>: ' +
           '<code>value</code> rộng 4 byte nên phải bắt đầu ở địa chỉ chia hết cho 4, mà ' +
           '<code>id</code> mới chiếm 1 byte → trình biên dịch chèn 3 byte đệm. Rồi ' +
           '<code>seq</code> rộng 2 byte nên phải bắt đầu ở địa chỉ chẵn, mà ' +
           '<code>flag</code> để lại vị trí lẻ → chèn thêm 1 byte. Kết quả đo thật: ' +
           '<code>size=12 align=4 | id=0 value=4 flag=8 seq=10</code>.<br>' +
           'Phương án 4 sai theo một kiểu đáng nhớ: bố cục struct là một phần của <b>ABI</b>, ' +
           'nó phải giống nhau ở mọi mức tối ưu, nếu không thì hai file <code>.o</code> biên ' +
           'dịch với <code>-O0</code> và <code>-O2</code> sẽ không nói chuyện được với nhau. ' +
           'Trình biên dịch <b>không</b> được phép đổi bố cục để tối ưu.<br>' +
           'Điều đáng giá nhất: chỉ cần sắp lại thứ tự khai báo thành ' +
           '<code>{ value; seq; id; flag; }</code> là struct còn <b>8 byte</b> — bằng đúng ' +
           'tổng các trường, không mất byte nào, không cần chỉ thị đặc biệt nào.' },

    { id: 'a3', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Chạy hai dòng này trên máy x86-64 của bạn:<br>' +
         '<code>uint32_t v = 0x0A0B0C0D;</code><br>' +
         '<code>uint8_t *p = (uint8_t *)&amp;v;</code><br><br>' +
         '<code>p[0]</code> mang giá trị nào?',
      opts: [
        '<code>0x0A</code> — byte đầu tiên trong bộ nhớ là byte có ý nghĩa lớn nhất, giống cách ta viết số.',
        '<code>0x0D</code> — máy này là <b>little-endian</b>: byte có ý nghĩa <b>nhỏ nhất</b> nằm ở địa chỉ thấp nhất.',
        '<code>0x0C</code> — thứ tự byte bị đảo theo từng nửa 16 bit chứ không đảo cả 32 bit.',
        'Không xác định được — thứ tự byte do trình biên dịch chọn khi tối ưu.'
      ],
      a: 1,
      why: '<b><code>0x0D</code>.</b> Đo thật trên máy bạn: <code>byte 0 = 0D</code>, ' +
           '<code>byte 1 = 0C</code>, <code>byte 2 = 0B</code>, <code>byte 3 = 0A</code>. ' +
           'x86-64, arm64 và armhf ở chế độ mặc định đều là <b>little-endian</b>.<br>' +
           'Chỗ dễ nhầm nhất: <b>giá trị</b> vẫn là <code>0x0A0B0C0D</code>. Endianness ' +
           'không đổi giá trị của biến — nó chỉ quyết định thứ tự các byte khi bạn nhìn vùng ' +
           'nhớ đó <b>qua con trỏ byte</b>, ghi ra file, hoặc đẩy lên đường truyền. Chừng nào ' +
           'bạn còn dùng <code>v</code> như một số thì bạn không bao giờ thấy nó.<br>' +
           'Phương án 4 sai vì thứ tự byte là thuộc tính của <b>phần cứng</b>; trình biên dịch ' +
           'chỉ tuân theo. Nó cũng cho bạn biết điều này qua ' +
           '<code>__BYTE_ORDER__</code> — hằng số kiểm tra được ngay lúc biên dịch.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Hai con trỏ cùng trỏ vào địa chỉ <code>0x1000</code>:<br>' +
         '<code>uint8_t  *p8  = (uint8_t  *)0x1000;</code><br>' +
         '<code>uint32_t *p32 = (uint32_t *)0x1000;</code><br><br>' +
         '<code>p8 + 1</code> và <code>p32 + 1</code> bằng bao nhiêu?',
      opts: [
        'Cả hai đều <code>0x1001</code> — phép cộng con trỏ luôn cộng theo byte.',
        '<code>p8 + 1</code> = <code>0x1001</code>, <code>p32 + 1</code> = <code>0x1004</code> — bước nhảy bằng <code>sizeof</code> của kiểu được trỏ tới.',
        'Cả hai đều <code>0x1004</code> — kiến trúc 32 bit nên mọi truy cập đều nhảy 4 byte.',
        '<code>p8 + 1</code> = <code>0x1004</code>, <code>p32 + 1</code> = <code>0x1001</code>.'
      ],
      a: 1,
      why: '<b>Con trỏ là một số, nhưng là một số <i>có kiểu</i>, và kiểu quyết định bước ' +
           'nhảy.</b> <code>p + 1</code> trong C không nghĩa là "địa chỉ + 1", nó nghĩa là ' +
           '"<b>phần tử kế tiếp</b>" — tức địa chỉ cộng thêm ' +
           '<code>sizeof(*p)</code>. Bài 14 đo được đúng thế: <code>p8+1 = 0x1001</code>, ' +
           '<code>p32+1 = 0x1004</code>.<br>' +
           'Đây là lý do <code>arr[i]</code> hoạt động: nó chính là ' +
           '<code>*(arr + i)</code>, và phép cộng đã tự nhân với cỡ phần tử giúp bạn. ' +
           'Cũng là lý do một lỗi ép kiểu con trỏ rất hay đi lệch <b>gấp 4 lần</b> khoảng bạn ' +
           'định: ép <code>uint8_t *</code> thành <code>uint32_t *</code> rồi cộng như cũ thì ' +
           'mỗi bước đi xa gấp bốn.' },

    { id: 'a5', k: 'tf', truc: 2, tag: 'Đúng/Sai kèm sửa',
      q: 'Xét phát biểu sau:<br><br>' +
         '<i>"Nếu chương trình chạy đúng khi biên dịch với <code>-O0</code> thì việc quên ' +
         '<code>volatile</code> cùng lắm chỉ làm nó chậm hơn khi bật <code>-O2</code>, chứ ' +
         'không thể làm nó sai — trình biên dịch không được phép đổi ý nghĩa chương ' +
         'trình."</i>',
      a: 1,
      rw: 'Viết lại phát biểu cho đúng, và nói rõ vì sao trình biên dịch <b>không sai</b> ' +
          'khi làm chương trình treo.',
      why: '<b>Sai, và sai ở chỗ nguy hiểm nhất.</b> Thiếu <code>volatile</code>, trình biên ' +
           'dịch được phép đọc một biến <b>một lần</b> rồi giữ trong thanh ghi, vì theo mô ' +
           'hình của C thì không có gì trong chương trình sửa biến đó. Ở <code>-O0</code> nó ' +
           'chưa dùng quyền ấy nên bạn không thấy gì; ở <code>-O2</code> nó dùng, và vòng lặp ' +
           'chờ cờ trở thành vòng lặp vô tận. Bài 14 đo được cả hai bản assembly: bản không ' +
           '<code>volatile</code> kết thúc bằng <code>.L3: jmp .L3</code> — nhảy về chính nó, ' +
           'không đọc lại bộ nhớ lần nào nữa.<br>' +
           '<b>Trình biên dịch không sai.</b> Nó tuân thủ đúng chuẩn: nếu không ai trong ' +
           'chương trình ghi vào biến đó, giá trị không thể đổi. Cái sai là <b>giả định của ' +
           'bạn</b> — bạn biết có một tay khác (phần cứng, trình xử lý ngắt, luồng khác) sẽ ' +
           'ghi vào đó, nhưng bạn chưa nói cho trình biên dịch biết. <code>volatile</code> ' +
           'chính là câu nói đó.',
      crit: [
        'Nói đúng bản chất: <code>volatile</code> <b>cấm trình biên dịch giả định</b> giá trị trong bộ nhớ chỉ đổi khi chương trình ghi vào — nó bắt <b>đọc lại từ bộ nhớ mỗi lần</b>',
        'Nêu đúng hậu quả cụ thể: thiếu nó, ở <code>-O2</code> vòng lặp chờ cờ thành vòng lặp vô tận (<code>jmp</code> về chính nó), tức chương trình <b>treo</b>, không phải chậm',
        'Nói rõ trình biên dịch <b>không sai</b>: chuẩn C cho phép nó suy luận như vậy khi không có gì trong chương trình sửa biến',
        'Chỉ ra chỗ hỏng thật nằm ở <b>giả định của lập trình viên</b>: có một tay bên ngoài (phần cứng / ngắt / luồng khác) sẽ ghi vào, mà chưa khai báo',
        'Nêu được vì sao đây là kiểu hỏng đắt: nó <b>không hiện ở bản debug</b>, chỉ hiện ở bản phát hành đã bật tối ưu'
      ],
      sol: '<p><b>Phát biểu viết lại:</b> <i>"Quên <code>volatile</code> không làm chương ' +
           'trình chậm — nó làm chương trình <b>sai</b>, và sai theo kiểu chỉ lộ ra khi bật ' +
           'tối ưu. Trình biên dịch được phép đọc biến một lần rồi giữ trong thanh ghi, vì ' +
           'không có gì trong mã nguồn ghi vào biến đó; ở <code>-O0</code> nó chưa dùng quyền ' +
           'ấy, ở <code>-O2</code> nó dùng, và vòng lặp chờ cờ không bao giờ kết thúc. Trình ' +
           'biên dịch không vi phạm gì cả — người viết mới là người chưa khai báo rằng có một ' +
           'tay bên ngoài sẽ sửa biến."</i></p>' +
           '<p><b>Vì sao đây là loại lỗi tệ nhất trong nhúng.</b> Bạn gỡ lỗi ở ' +
           '<code>-O0</code>, mọi thứ chạy ngon, bạn build bản phát hành với <code>-O2</code> ' +
           'cho vừa flash, nạp lên bo mạch, và thiết bị đứng im. Không có thông báo lỗi, ' +
           'không có mã thoát, không có gì để tìm kiếm trên mạng. Khoảng cách giữa hai bản ' +
           'build chính là manh mối duy nhất.</p>' +
           '<p><b>Ba chỗ bắt buộc phải có <code>volatile</code>:</b> con trỏ tới thanh ghi ' +
           'phần cứng (<code>*(volatile uint32_t *)0x40021000</code>), biến toàn cục do trình ' +
           'xử lý ngắt ghi vào, và biến dùng chung giữa hai luồng khi không có khoá.</p>' +
           '<p><b>Và một chỗ <code>volatile</code> KHÔNG giải quyết được:</b> nó không tạo ra ' +
           'tính nguyên tử và không đồng bộ hoá gì cả. <code>volatile int c; c++;</code> vẫn ' +
           'là ba thao tác đọc–cộng–ghi và vẫn có thể mất số đếm. <code>volatile</code> trả ' +
           'lời câu "đọc lại hay không", không trả lời câu "có ai chen vào giữa không".</p>' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: 'Xét phát biểu sau:<br><br>' +
         '<i>"Trong C, tên một mảng và một con trỏ là hoàn toàn như nhau — ' +
         '<code>arr</code> chính là địa chỉ phần tử đầu — nên dùng cái nào cũng vậy, kể cả ' +
         'khi lấy <code>sizeof</code>."</i>',
      a: 1,
      rw: 'Viết lại cho đúng, và nêu <b>một</b> tình huống cụ thể trong đó nhầm lẫn này gây ' +
          'hỏng dữ liệu.',
      why: '<b>Sai — nửa đầu đúng, nửa sau hỏng.</b> Đúng là trong hầu hết biểu thức, tên ' +
           'mảng <b>suy biến</b> (decay) thành con trỏ tới phần tử đầu. Nhưng ' +
           '<code>sizeof</code> là một trong vài ngoại lệ: nó nhìn thấy <b>kiểu thật</b>. ' +
           'Bài 14 đo được <code>sizeof(arr) = 20</code> nhưng ' +
           '<code>sizeof(&amp;arr[0]) = 8</code>.<br>' +
           'Chỗ chết người: khi mảng được <b>truyền vào hàm</b>, nó suy biến ngay ở biên hàm, ' +
           'và bên trong hàm thì <code>sizeof</code> chỉ còn thấy con trỏ. Đo thật trên máy ' +
           'bạn: <code>outside: sizeof(raw) = 20</code>, nhưng ' +
           '<code>inside dump: sizeof(buf) = 8</code> — dù tham số được viết là ' +
           '<code>uint8_t buf[]</code>. Một <code>memset(buf, 0, sizeof(buf))</code> trong ' +
           'hàm đó xoá <b>8 byte</b> thay vì 20.<br>' +
           'Tin tốt: <code>gcc -Wall -Wextra</code> bắt được đúng trường hợp này ' +
           '(<code>-Wsizeof-array-argument</code>). Tin xấu: chỉ khi bạn bật cảnh báo.',
      crit: [
        'Phân biệt được hai vế: trong <b>hầu hết biểu thức</b> tên mảng suy biến thành con trỏ, nhưng <code>sizeof</code> nhìn thấy <b>kiểu thật</b>',
        'Nêu đúng con số đo được: <code>sizeof(arr) = 20</code> so với <code>sizeof(&amp;arr[0]) = 8</code> (8 là cỡ con trỏ trên LP64)',
        'Nêu đúng ranh giới nguy hiểm: sự suy biến xảy ra khi <b>truyền vào hàm</b>; bên trong hàm, <code>uint8_t buf[]</code> thực chất là <code>uint8_t *buf</code>',
        'Đưa ra tình huống hỏng dữ liệu cụ thể, ví dụ <code>memset(buf, 0, sizeof(buf))</code> chỉ xoá 8 byte trong 20, hoặc một vòng lặp <code>sizeof(buf)/sizeof(buf[0])</code> chạy sai số vòng',
        'Nêu cách chữa: <b>truyền độ dài kèm theo</b> như một tham số riêng — đó là lý do mọi API C nghiêm túc đều có dạng <code>f(buf, len)</code>',
        'Nhắc tới việc <code>-Wall -Wextra</code> có bắt được trường hợp này (<code>-Wsizeof-array-argument</code>)'
      ],
      sol: '<p><b>Phát biểu viết lại:</b> <i>"Trong hầu hết biểu thức, tên mảng ' +
           '<b>suy biến</b> thành con trỏ tới phần tử đầu, nên dùng thay cho nhau được. ' +
           'Nhưng mảng <b>không phải</b> con trỏ: <code>sizeof</code> nhìn thấy kiểu thật và ' +
           'trả về cỡ toàn mảng. Khi mảng được truyền vào hàm thì nó suy biến ngay tại biên, ' +
           'nên trong hàm <code>sizeof</code> chỉ còn cho cỡ con trỏ."</i></p>' +
           '<p><b>Số đo trên chính máy bạn:</b></p>' +
           '<ul>' +
           '<li><code>sizeof(arr) = 20</code> — mảng 20 phần tử <code>uint8_t</code>.</li>' +
           '<li><code>sizeof(&amp;arr[0]) = 8</code> — một con trỏ trên LP64.</li>' +
           '<li>Trong hàm nhận <code>uint8_t buf[]</code>: <code>sizeof(buf) = 8</code>.</li>' +
           '</ul>' +
           '<p><b>Tình huống hỏng dữ liệu.</b> Một hàm nhận bộ đệm nhận về và tự "dọn" nó:</p>' +
           '<p><code>void dump(uint8_t buf[], int n) { memset(buf, 0, sizeof(buf)); }</code></p>' +
           '<p>Người viết tin rằng mình xoá cả bộ đệm. Thực tế xoá <b>8 byte</b>. 12 byte còn ' +
           'lại giữ nguyên dữ liệu của gói tin trước — và ở gói tin sau, phần đuôi cũ đó bị ' +
           'đọc như dữ liệu mới. Không có lỗi, không có sập, chỉ có những giá trị vô lý xuất ' +
           'hiện thưa thớt. Trong một thiết bị đo, đó là những điểm dữ liệu sai mà không ai ' +
           'giải thích được.</p>' +
           '<p><b>Cách chữa, và vì sao API C trông như vậy:</b> truyền độ dài đi kèm — ' +
           '<code>void dump(uint8_t *buf, size_t n)</code> rồi ' +
           '<code>memset(buf, 0, n)</code>. Đây chính là lý do <code>memcpy</code>, ' +
           '<code>read</code>, <code>write</code> và gần như mọi hàm C nhận bộ đệm đều có ' +
           'tham số độ dài: <b>thông tin đó đã mất ở biên hàm và không cách nào lấy lại.</b></p>' +
           '<p><b>Một an ủi nhỏ:</b> <code>gcc -Wall -Wextra</code> báo đúng chỗ này — ' +
           '<code>warning: \'sizeof\' on array function parameter \'buf\' will return size ' +
           'of \'uint8_t *\'</code>. Đây là một trong những lý do cụ thể nhất để không bao ' +
           'giờ biên dịch mà thiếu <code>-Wall -Wextra</code>.</p>' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Một thanh ghi cấu hình đang giữ giá trị <code>0x00000008</code>. Chương trình chạy ' +
         'đúng một dòng:<br><br>' +
         '<code>reg |= (1u &lt;&lt; 12);</code><br><br>' +
         'Sau dòng đó, <code>reg</code> mang giá trị hex nào? (viết dạng ' +
         '<code>0x…</code>)',
      a: ['0x00001008', '0x1008', '00001008', '1008', '4104'],
      ph: 'một giá trị hex, ví dụ 0x000000FF',
      why: '<b><code>0x00001008</code>.</b> <code>1u &lt;&lt; 12</code> là một số chỉ có ' +
           '<b>một</b> bit bật, ở vị trí 12 — tức <code>0x00001000</code>. Toán tử ' +
           '<code>|=</code> <b>chỉ bật</b> những bit có trong vế phải và không đụng tới bit ' +
           'nào khác, nên bit 3 đang bật (giá trị <code>0x8</code>) vẫn ở nguyên đó. ' +
           'Kết quả: <code>0x1000 | 0x0008 = 0x1008</code>.<br>' +
           'Đây là toàn bộ lý do bốn macro của bài 14 tồn tại: ' +
           '<code>|=</code> để <b>bật</b>, <code>&amp;= ~</code> để <b>tắt</b>, ' +
           '<code>^=</code> để <b>lật</b>, và <code>&amp;</code> để <b>hỏi</b>. Viết ' +
           '<code>reg = 0x1000;</code> thay cho <code>reg |= 0x1000;</code> là lỗi kinh điển ' +
           'khi lập trình thanh ghi: nó bật đúng bit bạn muốn và <b>xoá sạch</b> mọi cấu hình ' +
           'đã đặt trước đó.<br>' +
           'Để ý cả chữ <code>u</code> trong <code>1u</code>: với vị trí bit 31 thì ' +
           '<code>1 &lt;&lt; 31</code> trên <code>int</code> là hành vi có dấu và cho ra số ' +
           '<b>âm</b>, còn <code>1u &lt;&lt; 31</code> thì không.' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Bài 14 chạy <code>nm counter.o</code> và nhận về sáu chữ cái. Ghép mỗi chữ cái với ' +
         'đúng nghĩa của nó. Chú ý cặp <b>chữ hoa / chữ thường</b>: chúng chỉ khác nhau ' +
         'đúng một điều.',
      left: [
        '<code>T</code>', '<code>t</code>', '<code>B</code>',
        '<code>b</code>', '<code>d</code>', '<code>U</code>'
      ],
      right: [
        'Biến <code>static</code> <b>có</b> khởi tạo khác 0 — nằm ở <code>.data</code>, chỉ file này thấy',
        'Ký hiệu <b>chưa</b> được định nghĩa trong file này — bộ liên kết phải đi tìm nó ở nơi khác',
        'Hàm toàn cục, file khác gọi được — nằm ở <code>.text</code>',
        'Biến <code>static</code> chưa khởi tạo — nằm ở <code>.bss</code>, chỉ file này thấy',
        'Hàm <code>static</code> — vẫn ở <code>.text</code>, nhưng file khác không gọi được',
        'Biến toàn cục chưa khởi tạo, file khác dùng được — nằm ở <code>.bss</code>'
      ],
      a: [2, 4, 5, 3, 0, 1],
      why: '<b>Quy tắc gọn nhất: chữ HOA = cả thế giới thấy, chữ thường = chỉ file này ' +
           'thấy.</b> Đó là toàn bộ khác biệt giữa <code>T</code>/<code>t</code> và ' +
           '<code>B</code>/<code>b</code>, và nó do đúng một từ khoá quyết định: ' +
           '<code>static</code>.<br>' +
           'Chữ cái nào ứng với vùng nào: <code>T</code> = <code>.text</code> (mã máy), ' +
           '<code>D</code>/<code>d</code> = <code>.data</code> (dữ liệu có giá trị khởi tạo ' +
           'khác 0, nằm thật trong file), <code>B</code>/<code>b</code> = <code>.bss</code> ' +
           '(dữ liệu khởi tạo bằng 0 — <b>không</b> chiếm byte nào trong file, chỉ chiếm RAM ' +
           'lúc chạy).<br>' +
           '<code>U</code> là chữ cái quan trọng nhất cho bài sau: nó nghĩa là "tôi dùng cái ' +
           'này nhưng tôi không có nó". <code>U printf</code> trong một file <code>.o</code> ' +
           'là hoàn toàn bình thường — đó là việc của <b>giai đoạn liên kết</b> giải quyết, ' +
           'và đó chính là nội dung của bài 15.' },
  ],

  /* ═══ B · Thông hiểu — 2 đọc output + 2 giải thích + 1 so sánh + 1 bắt lỗi ═══ */
  B: [
    { id: 'b1', k: 'free', truc: 0, tag: 'Đọc output', rows: 9,
      q: '<b>Đây là output thật trên máy bạn.</b> Cùng <b>một</b> file <code>abi.c</code> ' +
         'được đưa qua ba trình biên dịch cùng phiên bản 15.2.0.<br><br>' +
         'Đọc output và trả lời ba câu: <b>(1)</b> nó chứng minh điều gì về ' +
         '<code>long</code>? <b>(2)</b> vì sao chỉ có <b>hai</b> lỗi chứ không phải ba, ' +
         'trong khi file có ba câu <code>_Static_assert</code>? <b>(3)</b> vì sao đây là một ' +
         'phép kiểm tra rẻ hơn hẳn việc nạp firmware lên bo mạch rồi <code>printf</code>?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'cat > abi.c <<\'EOF\'\n' +
          '#include <stdint.h>\n' +
          '_Static_assert(sizeof(long)  == 8, "long is not 64-bit here");\n' +
          '_Static_assert(sizeof(void*) == 8, "pointer is not 64-bit here");\n' +
          '_Static_assert(sizeof(uint32_t) == 4, "uint32_t is not 32-bit here");\n' +
          'int main(void) { return 0; }\n' +
          'EOF\n' +
          'for cc in gcc aarch64-linux-gnu-gcc arm-linux-gnueabihf-gcc; do\n' +
          '  echo "--- $cc"\n' +
          '  $cc -c -o /dev/null abi.c\n' +
          'done' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '--- gcc\n' +
          '--- aarch64-linux-gnu-gcc\n' +
          '--- arm-linux-gnueabihf-gcc\n' +
          'abi.c:2:1: error: static assertion failed: "long is not 64-bit here"\n' +
          '    2 | _Static_assert(sizeof(long)  == 8, "long is not 64-bit here");\n' +
          '      | ^~~~~~~~~~~~~~\n' +
          'abi.c:3:1: error: static assertion failed: "pointer is not 64-bit here"\n' +
          '    3 | _Static_assert(sizeof(void*) == 8, "pointer is not 64-bit here");\n' +
          '      | ^~~~~~~~~~~~~~' }
      ],
      hint: 'Hai trình đầu không in gì cả — trong Unix, không in gì nghĩa là gì? Và với ' +
            'trình thứ ba, hãy đếm: file có ba câu khẳng định, output có mấy câu lỗi, ' +
            '<b>câu nào vắng mặt</b> và vắng vì lý do gì?',
      crit: [
        'Đọc đúng hai dòng đầu: <code>gcc</code> và <code>aarch64-linux-gnu-gcc</code> <b>không in gì</b>, tức cả ba khẳng định đều đúng — <code>sizeof(long) == 8</code> trên cả hai',
        'Đọc đúng dòng thứ ba: <code>arm-linux-gnueabihf-gcc</code> <b>không biên dịch nổi</b> file này; <code>sizeof(long)</code> và <code>sizeof(void*)</code> đều <b>không</b> bằng 8 (chúng là 4 — armhf là ILP32)',
        'Kết luận đúng về nguyên nhân: khác biệt đến từ <b>ABI của kiến trúc đích</b>, không phải từ phiên bản trình biên dịch — ba trình này cùng 15.2.0',
        'Trả lời đúng câu (2): khẳng định thứ ba <b>không</b> hỏng vì <code>sizeof(uint32_t)</code> là 4 ở <b>mọi</b> ABI; đó chính là lý do <code>&lt;stdint.h&gt;</code> tồn tại',
        'Trả lời đúng câu (3): <code>_Static_assert</code> hỏng ngay <b>lúc biên dịch</b> — không cần bo mạch, không cần nạp firmware, không cần chạy',
        'Nêu được hệ quả thực tế: nếu không có khẳng định này thì file vẫn biên dịch <b>trót lọt</b> cho armhf và chỉ sai lúc chạy — im lặng',
        'Rút ra quy tắc dùng được: khi cần đúng N bit thì viết <code>uintN_t</code>; <code>long</code> chỉ dùng khi bạn thật sự muốn "kiểu tự nhiên của máy"'
      ],
      sol: '<p><b>Câu (1) — nó chứng minh <code>long</code> không có độ rộng cố định, và ' +
           'chứng minh bằng cách mạnh nhất: bằng một lỗi biên dịch.</b> Hai trình đầu im ' +
           'lặng, mà trong Unix im lặng nghĩa là thành công — cả ba khẳng định đều đúng, nên ' +
           'trên x86-64 và arm64 thì <code>sizeof(long)</code> và <code>sizeof(void*)</code> ' +
           'đều là 8. Trình thứ ba báo lỗi ở đúng hai dòng đó: trên armhf cả hai đều là ' +
           '<b>4</b>.</p>' +
           '<p>Cần nhấn mạnh một chi tiết dễ bỏ qua: <b>ba trình biên dịch này cùng phiên ' +
           'bản 15.2.0</b>. Nên nguyên nhân không thể là "gcc đời khác nhau". Nó là ' +
           '<b>ABI</b> — x86-64 và arm64 dùng mô hình LP64, armhf dùng ILP32.</p>' +
           '<p><b>Câu (2) — vì sao hai lỗi chứ không phải ba.</b> Khẳng định thứ ba là ' +
           '<code>sizeof(uint32_t) == 4</code>, và nó đúng ở <b>mọi</b> ABI. ' +
           '<code>uint32_t</code> được định nghĩa là "chính xác 32 bit"; nếu một nền tảng ' +
           'không có kiểu như vậy thì nó <i>không định nghĩa</i> <code>uint32_t</code> chứ ' +
           'không định nghĩa sai. Sự vắng mặt của lỗi thứ ba chính là <b>bằng chứng dương</b> ' +
           'cho lời khuyên trung tâm của bài 14.</p>' +
           '<p><b>Câu (3) — vì sao phép kiểm tra này rẻ.</b> Nó chạy ở ' +
           '<b>giai đoạn biên dịch</b>. Không cần bo mạch, không cần nạp, không cần cáp ' +
           'serial, không cần ai ngồi nhìn màn hình. Nó cũng không thể bị bỏ sót: file ' +
           '<b>không</b> biên dịch được, nên không có gì để nạp lên nữa. So với cách kia — ' +
           'build, nạp, cắm cáp, <code>printf("%zu", sizeof(long))</code>, đọc bằng mắt — thì ' +
           'chênh lệch là hàng chục phút mỗi lần, nhân với mọi lần build.</p>' +
           '<p><b>Và đây là điều đáng sợ nếu bỏ khẳng định đi:</b> file vẫn biên dịch trót ' +
           'lọt cho armhf. Không cảnh báo, không lỗi. Một <code>struct</code> có trường ' +
           '<code>long</code> sẽ nhỏ đi 4 byte, mọi offset phía sau lệch đi, và bạn phát hiện ' +
           'ra khi thiết bị đọc sai cảm biến — chứ không phải khi biên dịch.</p>' +
           '<p><b>Quy tắc mang đi:</b> cần đúng N bit thì viết <code>uintN_t</code>. Dùng ' +
           '<code>long</code> chỉ khi bạn thật sự muốn "số nguyên tự nhiên của máy này" — ' +
           'và lúc đó hãy nhớ rằng "máy này" có thể là một máy bạn chưa từng thấy.</p>' },

    { id: 'b2', k: 'free', truc: 1, tag: 'Đọc output', rows: 10,
      q: '<b>Đây là output thật trên máy bạn.</b> Hai <code>struct</code> có ' +
         '<b>đúng cùng bốn trường</b>, chỉ khác thứ tự khai báo.<br><br>' +
         'Vẽ ra <b>bản đồ 12 byte</b> của <code>sensor_a</code> (byte nào là dữ liệu, byte ' +
         'nào là đệm), rồi giải thích vì sao <code>sensor_b</code> chỉ tốn 8 byte. Cuối ' +
         'cùng, đọc hai cảnh báo <code>-Wpadded</code>: vì sao nó chỉ kêu về ' +
         '<code>value</code> và <code>seq</code>, mà không kêu về <code>id</code> hay ' +
         '<code>flag</code>?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'cat > lay.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '#include <stdint.h>\n' +
          '#include <stddef.h>\n' +
          'struct sensor_a { uint8_t id; uint32_t value; uint8_t flag; uint16_t seq; };\n' +
          'struct sensor_b { uint32_t value; uint16_t seq; uint8_t id; uint8_t flag; };\n' +
          'int main(void) {\n' +
          '    printf("sensor_a: size=%zu align=%zu | id=%zu value=%zu flag=%zu seq=%zu\\n",\n' +
          '           sizeof(struct sensor_a), _Alignof(struct sensor_a),\n' +
          '           offsetof(struct sensor_a, id),   offsetof(struct sensor_a, value),\n' +
          '           offsetof(struct sensor_a, flag), offsetof(struct sensor_a, seq));\n' +
          '    printf("sensor_b: size=%zu align=%zu | value=%zu seq=%zu id=%zu flag=%zu\\n",\n' +
          '           sizeof(struct sensor_b), _Alignof(struct sensor_b),\n' +
          '           offsetof(struct sensor_b, value), offsetof(struct sensor_b, seq),\n' +
          '           offsetof(struct sensor_b, id),    offsetof(struct sensor_b, flag));\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'gcc -Wall -Wextra -o lay lay.c && ./lay\n' +
          'gcc -Wall -Wextra -Wpadded -c -o /dev/null lay.c' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'sensor_a: size=12 align=4 | id=0 value=4 flag=8 seq=10\n' +
          'sensor_b: size=8 align=4 | value=0 seq=4 id=6 flag=7\n' +
          '\n' +
          'lay.c:5:40: warning: padding struct to align \u2018value\u2019 [-Wpadded]\n' +
          '    5 | struct sensor_a { uint8_t id; uint32_t value; uint8_t flag; uint16_t seq; };\n' +
          '      |                                        ^~~~~\n' +
          'lay.c:5:70: warning: padding struct to align \u2018seq\u2019 [-Wpadded]\n' +
          '    5 | struct sensor_a { uint8_t id; uint32_t value; uint8_t flag; uint16_t seq; };\n' +
          '      |                                                                      ^~~' }
      ],
      hint: 'Quy tắc chỉ có một dòng: <b>mỗi trường phải bắt đầu ở địa chỉ chia hết cho cỡ ' +
            'của chính nó</b>. Đi từ offset 0, đặt từng trường theo thứ tự khai báo, và mỗi ' +
            'khi offset hiện tại không chia hết thì đẩy lên. Với câu hỏi cuối: ' +
            '<code>id</code> và <code>flag</code> rộng mấy byte, và số nào cũng chia hết cho ' +
            '1 phải không?',
      crit: [
        'Bản đồ <code>sensor_a</code> đúng: <code>id</code> ở byte 0 · <b>đệm 3 byte</b> ở 1–3 · <code>value</code> ở 4–7 · <code>flag</code> ở 8 · <b>đệm 1 byte</b> ở 9 · <code>seq</code> ở 10–11',
        'Nêu đúng quy tắc sinh ra byte đệm: mỗi trường bắt đầu ở địa chỉ <b>chia hết cho cỡ của nó</b> (4 với <code>uint32_t</code>, 2 với <code>uint16_t</code>)',
        'Nêu đúng tổng: 4 byte trong 12 là đệm — <b>33 % vùng nhớ không chứa gì</b>, trong khi tổng các trường chỉ 8 byte',
        'Giải thích đúng <code>sensor_b</code>: xếp trường <b>lớn trước, nhỏ sau</b> nên không trường nào phải đợi căn lề; 4+2+1+1 = 8, khít, không đệm',
        'Nêu đúng <code>align=4</code> ở cả hai: căn lề của struct bằng căn lề <b>lớn nhất</b> trong các trường, ở đây là <code>uint32_t</code>',
        'Trả lời đúng câu <code>-Wpadded</code>: nó chỉ kêu khi phải chèn đệm <b>trước</b> một trường; <code>id</code> và <code>flag</code> rộng 1 byte nên <b>mọi</b> địa chỉ đều hợp lệ, không bao giờ cần đệm trước chúng',
        'Rút ra được quy tắc dùng được: sắp trường theo cỡ <b>giảm dần</b> là cách thu nhỏ struct <b>miễn phí</b> — không chỉ thị đặc biệt, không đổi cách truy cập'
      ],
      solBlocks: [
        { t: 'p', x: '<b>Bản đồ 12 byte của <code>sensor_a</code></b> — dựng thẳng từ ba số ' +
          'offset mà chương trình in ra (0, 4, 8, 10):' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'offset : 0    1  2  3    4  5  6  7    8    9    10 11\n' +
          'field  : id   .  .  .    value          flag  .    seq\n' +
          '         ^^   ^^^^^^^    ^^^^^^^^^^^    ^^^^  ^^   ^^^^^\n' +
          '         1B   3B PAD     4B             1B    1B   2B\n' +
          '                PAD                           PAD\n' +
          '\n' +
          'sensor_b:\n' +
          'offset : 0  1  2  3    4  5    6     7\n' +
          'field  : value         seq     id    flag      (khong co byte dem nao)' },
        { t: 'p', x: '<b>Quy tắc duy nhất sinh ra tất cả:</b> mỗi trường phải bắt đầu ở địa ' +
          'chỉ <b>chia hết cho cỡ của chính nó</b>. <code>value</code> rộng 4 byte nên không ' +
          'thể nằm ở offset 1 — phải đẩy lên 4, và ba byte 1–3 bị bỏ trống. ' +
          '<code>seq</code> rộng 2 byte nên không thể nằm ở offset 9 — phải đẩy lên 10, bỏ ' +
          'trống byte 9. Tổng cộng <b>4 byte trong 12 không chứa gì cả</b>: một phần ba ' +
          'struct.' },
        { t: 'p', x: '<b><code>sensor_b</code> khít 8 byte, và không tốn gì để đạt được.</b> ' +
          'Xếp trường lớn trước: <code>value</code> (4) ở 0–3, <code>seq</code> (2) ở 4–5 — ' +
          'offset 4 chia hết cho 2, hợp lệ ngay. Rồi hai trường 1 byte ở 6 và 7. Không trường ' +
          'nào phải đợi. 4+2+1+1 = 8, đúng bằng tổng các trường.' },
        { t: 'p', x: '<b>Vì sao <code>align=4</code> ở cả hai:</b> căn lề của một struct bằng ' +
          'căn lề <b>lớn nhất</b> trong các trường của nó — ở đây là <code>uint32_t</code>, ' +
          'tức 4. Đó cũng là lý do <code>sizeof</code> của struct luôn là bội số của căn lề ' +
          'ấy: một mảng struct thì phần tử thứ hai cũng phải căn lề đúng.' },
        { t: 'p', x: '<b>Vì sao <code>-Wpadded</code> chỉ kêu hai lần.</b> Nó báo mỗi lần ' +
          'phải chèn đệm <b>trước</b> một trường. <code>id</code> và <code>flag</code> rộng ' +
          '1 byte, mà mọi số nguyên đều chia hết cho 1 — nên không bao giờ cần đệm trước ' +
          'chúng. Chỉ <code>value</code> (cần bội số của 4) và <code>seq</code> (cần bội số ' +
          'của 2) mới có thể bị đẩy. Với <code>sensor_b</code>, ' +
          '<code>-Wpadded</code> <b>im lặng hoàn toàn</b> — đó là cách rẻ nhất để hỏi trình ' +
          'biên dịch "struct của tôi đã khít chưa".' },
        { t: 'cal', kind: 'tip', x: '<b>Quy tắc mang đi:</b> sắp các trường theo cỡ ' +
          '<b>giảm dần</b>. Nó không tốn gì — không chỉ thị đặc biệt, không đổi cách truy cập, ' +
          'không ảnh hưởng tốc độ — và trong ví dụ này nó cắt struct từ 12 xuống 8 byte. Với ' +
          'một bảng 1000 bản ghi, đó là <b>4000 byte</b>, đúng con số bài 14 đo được.' }
      ] },

    { id: 'b3', k: 'free', truc: 2, tag: 'Giải thích vì sao', rows: 9,
      q: '<b>Đây là assembly thật do <code>gcc -O2</code> sinh ra</b> cho hai hàm giống hệt ' +
         'nhau về mã C, chỉ khác đúng một từ khoá <code>volatile</code> ở tham số.<br><br>' +
         'Chỉ ra <b>đúng dòng lệnh máy</b> khiến bản thứ nhất treo, và giải thích vì sao ' +
         'trình biên dịch <b>được phép</b> sinh ra nó. Sau đó nói rõ bản thứ hai khác ở chỗ ' +
         'nào — không phải khác ở lệnh nào, mà khác ở <b>vị trí</b> của lệnh nào.',
      blocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '/* ban 1 — int *flag  (khong co volatile), gcc -O2 */\n' +
          '        movl    (%rdi), %eax\n' +
          '        testl   %eax, %eax\n' +
          '        jne     .L2\n' +
          '.L3:\n' +
          '        jmp     .L3\n' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '/* ban 2 — volatile int *flag, gcc -O2 */\n' +
          '.L7:\n' +
          '        movl    (%rdi), %edx\n' +
          '        addl    $1, %eax\n' +
          '        testl   %edx, %edx\n' +
          '        je      .L7\n' },
        { t: 'cal', kind: 'tip', x: 'Chỉ cần bốn lệnh để đọc được đoạn này: ' +
          '<code>movl (%rdi), %eax</code> = "đọc bộ nhớ tại địa chỉ trong <code>rdi</code> ' +
          'vào thanh ghi <code>eax</code>"; <code>testl %eax, %eax</code> = "so ' +
          '<code>eax</code> với 0"; <code>jne</code>/<code>je</code> = "nhảy nếu khác 0 / ' +
          'nếu bằng 0"; <code>jmp</code> = "nhảy vô điều kiện". Nhãn ' +
          '<code>.L3:</code> là một vị trí trong mã.' }
      ],
      hint: 'Đừng đọc từng lệnh — hãy hỏi <b>lệnh <code>movl</code> nằm trong vòng lặp hay ' +
            'nằm ngoài vòng lặp</b>. Nhìn xem nhãn được nhảy về (<code>.L3</code> ở bản 1, ' +
            '<code>.L7</code> ở bản 2) đứng <b>trước</b> hay <b>sau</b> lệnh đọc bộ nhớ.',
      crit: [
        'Chỉ đúng dòng gây treo: <code>.L3: jmp .L3</code> — một vòng lặp nhảy về chính nó, <b>không có lệnh nào đọc bộ nhớ bên trong</b>',
        'Nêu đúng nguyên nhân: ở bản 1, <code>movl (%rdi), %eax</code> nằm <b>ngoài</b> vòng lặp — bộ nhớ chỉ được đọc <b>một lần duy nhất</b> trước khi vào vòng',
        'Nêu đúng suy luận của trình biên dịch: trong mã C không có gì ghi vào <code>*flag</code>, nên giá trị không thể đổi, nên đọc lại là thừa — chuẩn C cho phép suy luận này',
        'Kết luận đúng về trách nhiệm: trình biên dịch <b>không sai</b>; cái sai là lập trình viên chưa khai báo rằng có một tay bên ngoài (phần cứng / ngắt) sẽ ghi vào',
        'Đọc đúng bản 2: nhãn <code>.L7</code> đứng <b>trước</b> <code>movl</code>, nên lệnh đọc bộ nhớ nằm <b>trong</b> vòng lặp và được thực hiện lại mỗi vòng',
        'Nói đúng điểm cốt lõi: <code>volatile</code> không thêm lệnh mới và không làm chương trình chậm về nguyên tắc — nó <b>di chuyển</b> lệnh đọc vào trong vòng lặp, tức cấm bỏ bớt lần đọc',
        'Nêu được vì sao khuyết tật này chỉ lộ ở <code>-O2</code>: ở <code>-O0</code> trình biên dịch không dùng quyền tối ưu đó, nên bản debug chạy đúng'
      ],
      sol: '<p><b>Dòng gây treo là <code>.L3: jmp .L3</code>.</b> Đọc thẳng nghĩa: "nhãn ' +
           'L3; nhảy về L3". Một vòng lặp không có thân, không có điều kiện thoát, và — điểm ' +
           'quan trọng nhất — <b>không có lệnh nào đọc bộ nhớ bên trong nó</b>.</p>' +
           '<p><b>Vì sao nó thành ra như vậy.</b> Nhìn lên trên: <code>movl (%rdi), %eax</code> ' +
           'nằm <b>ngoài</b> vòng. Trình biên dịch đọc <code>*flag</code> đúng một lần, thấy ' +
           'nó bằng 0, và lập luận: "trong toàn bộ chương trình này không có dòng nào ghi ' +
           'vào <code>*flag</code>; vậy nó sẽ mãi bằng 0; vậy vòng ' +
           '<code>while (*flag == 0)</code> là vòng vô tận; vậy tôi viết thẳng ra một vòng vô ' +
           'tận, khỏi phải đọc bộ nhớ mỗi lần cho tốn thời gian."</p>' +
           '<p><b>Và lập luận đó hoàn toàn hợp lệ.</b> Chuẩn C mô tả một cỗ máy trừu tượng ' +
           'trong đó bộ nhớ chỉ đổi khi chương trình ghi vào. Trình biên dịch tuân thủ đúng ' +
           'mô hình ấy. Cái nằm ngoài mô hình là <b>sự thật của bạn</b>: có một trình xử lý ' +
           'ngắt, hoặc một khối phần cứng, sẽ ghi vào ô nhớ đó. Bạn biết điều ấy, trình biên ' +
           'dịch thì không — cho đến khi bạn nói ra bằng <code>volatile</code>.</p>' +
           '<p><b>Bản 2 khác ở vị trí, không ở lệnh.</b> Vẫn là <code>movl</code>, ' +
           '<code>testl</code>, một lệnh nhảy. Nhưng nhãn <code>.L7</code> đứng ' +
           '<b>trước</b> <code>movl (%rdi), %edx</code>, nên lệnh đọc bộ nhớ nằm ' +
           '<b>trong</b> vòng lặp. Mỗi vòng: đọc lại từ bộ nhớ, so với 0, nếu bằng 0 thì quay ' +
           'lại. Khi phần cứng ghi giá trị khác 0 vào đó, vòng lặp thoát.</p>' +
           '<p>Nói cách khác: <code>volatile</code> không thêm gì, không cấm tối ưu nói ' +
           'chung, và không phải một cái phanh. Nó chỉ rút đúng một lệnh — lệnh đọc bộ nhớ — ' +
           'trở lại vào trong vòng lặp. <b>Nó cấm trình biên dịch bỏ bớt lần đọc.</b></p>' +
           '<p><b>Vì sao đây là kiểu lỗi đắt nhất trong nhúng.</b> Ở <code>-O0</code> trình ' +
           'biên dịch không dùng quyền ấy, nên bản debug chạy hoàn hảo. Bạn bật ' +
           '<code>-O2</code> để bản phát hành vừa flash, nạp lên bo mạch, và thiết bị treo. ' +
           'Không thông báo lỗi, không mã thoát, không dòng log nào. Manh mối duy nhất là ' +
           '"bản debug chạy được, bản release thì không" — và nếu bạn không biết ' +
           '<code>volatile</code> thì manh mối đó dẫn bạn đi sai đường hàng ngày trời.</p>' },

    { id: 'b4', k: 'free', tag: 'Giải thích vì sao', rows: 8,
      q: 'Bài 14 dựng một <code>union</code> thanh ghi với ba cách nhìn vào cùng bốn byte: ' +
         'số nguyên <code>raw</code>, mảng <code>byte[4]</code>, và ba bitfield ' +
         '<code>enable : 1</code>, <code>mode : 3</code>, <code>speed : 4</code>. Với ' +
         '<code>raw = 0xA5</code> nó in ra:<br><br>' +
         '<code>raw = 0x000000A5</code> · <code>byte[] = A5 00 00 00</code> · ' +
         '<code>enable=1 mode=2 speed=10</code><br><br>' +
         'Giải thích <b>bằng phép tính bit cụ thể</b> vì sao ra đúng ba con số 1, 2, 10. ' +
         'Rồi trả lời: vì sao <code>byte[]</code> lại là <code>A5 00 00 00</code> chứ không ' +
         'phải <code>00 00 00 A5</code>? Và cuối cùng — vì sao kernel Linux ' +
         '<b>tránh</b> dùng bitfield cho thanh ghi phần cứng?',
      hint: 'Viết <code>0xA5</code> ra 8 bit rồi cắt từ <b>bit 0</b> đi lên theo đúng thứ ' +
            'tự khai báo: 1 bit, rồi 3 bit, rồi 4 bit. Với câu thứ hai, nhớ lại A3. Với câu ' +
            'thứ ba, hỏi: chuẩn C có quy định bitfield xếp từ bit nào không?',
      crit: [
        'Viết đúng <code>0xA5</code> ra nhị phân: <code>1010 0101</code>',
        'Tính đúng <code>enable</code> = bit 0 = <b>1</b>',
        'Tính đúng <code>mode</code> = bit 1–3 = <code>(0xA5 >> 1) &amp; 0x7</code> = <code>0b010</code> = <b>2</b>',
        'Tính đúng <code>speed</code> = bit 4–7 = <code>(0xA5 >> 4) &amp; 0xF</code> = <code>0xA</code> = <b>10</b>',
        'Giải thích đúng <code>byte[] = A5 00 00 00</code>: máy <b>little-endian</b>, byte có ý nghĩa nhỏ nhất nằm ở địa chỉ thấp nhất, mà <code>byte[0]</code> chính là địa chỉ thấp nhất của union',
        'Nêu đúng nghĩa của union: cả ba trường bắt đầu ở <b>offset 0</b> và đè lên nhau; ghi vào một trường là ghi vào cùng vùng nhớ mà hai trường kia đang nhìn',
        'Trả lời đúng câu cuối: chuẩn C <b>không quy định</b> bitfield xếp từ bit thấp lên hay bit cao xuống, nên cùng một khai báo có thể cho bố cục khác nhau giữa các trình biên dịch / kiến trúc',
        'Nêu đúng cái kernel dùng thay thế: <b>macro dịch bit</b> (<code>(1u &lt;&lt; n)</code>, <code>(v >> pos) &amp; mask</code>) — rõ ràng, di động, không phụ thuộc trình biên dịch'
      ],
      sol: '<p><b>Phép tính, cắt từ bit 0 đi lên đúng thứ tự khai báo:</b></p>' +
           '<p><code>0xA5 = 1010 0101</code></p>' +
           '<ul>' +
           '<li><code>enable</code> chiếm 1 bit, bắt đầu ở bit 0 → bit 0 = <b>1</b>.</li>' +
           '<li><code>mode</code> chiếm 3 bit tiếp theo, bit 1–3 → ' +
           '<code>(0xA5 >> 1) &amp; 0x7</code> = <code>0x52 &amp; 0x7</code> = ' +
           '<code>0b010</code> = <b>2</b>.</li>' +
           '<li><code>speed</code> chiếm 4 bit tiếp theo, bit 4–7 → ' +
           '<code>(0xA5 >> 4) &amp; 0xF</code> = <code>0xA</code> = <b>10</b>.</li>' +
           '</ul>' +
           '<p>Kiểm tra ngược lại cho chắc: đặt <code>speed = 0xF</code> tức bit 4–7 thành ' +
           '<code>1111</code>, giữ nguyên bốn bit thấp <code>0101</code> → ' +
           '<code>1111 0101</code> = <code>0xF5</code>. Đúng bằng số bài 14 đo được: ' +
           '<code>raw = 0x000000F5</code>. Ba cách nhìn thật sự nhìn vào <b>một</b> vùng ' +
           'nhớ — sửa qua cách này thì cách kia thấy ngay.</p>' +
           '<p><b>Vì sao <code>byte[] = A5 00 00 00</code>.</b> Đây là câu hỏi về ' +
           'endianness, không phải về union. Cả ba trường của union bắt đầu ở ' +
           '<b>offset 0</b>, nên <code>byte[0]</code> chính là byte ở địa chỉ thấp nhất. ' +
           'Máy này little-endian, tức byte có ý nghĩa <b>nhỏ nhất</b> nằm ở địa chỉ thấp ' +
           'nhất — mà byte nhỏ nhất của <code>0x000000A5</code> là <code>A5</code>. Trên một ' +
           'máy big-endian, đúng chương trình đó in ra <code>00 00 00 A5</code>.</p>' +
           '<p><b>Vì sao kernel tránh bitfield cho thanh ghi.</b> Vì chuẩn C ' +
           '<b>không quy định</b> bitfield được xếp từ bit thấp lên hay từ bit cao xuống — ' +
           'đó là lựa chọn của từng hiện thực. GCC trên máy little-endian xếp từ bit 0 lên, ' +
           'nên bạn thấy <code>enable</code> ở bit 0. Đổi trình biên dịch, hoặc build cho một ' +
           'kiến trúc big-endian, và cùng khai báo ấy có thể đặt <code>enable</code> ở ' +
           'bit 31.</p>' +
           '<p>Với một struct <i>nội bộ</i> của chương trình thì không sao — cả hai đầu đều ' +
           'do bạn biên dịch. Với một <b>thanh ghi phần cứng</b> thì thảm hoạ: bố cục đã được ' +
           'quyết định bởi con chip, và mã của bạn phải khớp với nó chứ không ngược lại. Nên ' +
           'kernel dùng macro dịch bit — <code>(1u &lt;&lt; 12)</code>, ' +
           '<code>(v >> pos) &amp; mask</code> — nơi vị trí bit được viết ra bằng chữ, không ' +
           'do trình biên dịch tự chọn.</p>' +
           '<p><b>Bài học chung, và nó vượt ra ngoài bitfield:</b> tiện lợi và di động là ' +
           'hai thứ phải cân nhắc, không phải hai thứ luôn đi cùng nhau.</p>' },

    { id: 'b5', k: 'free', tag: 'So sánh cặp', rows: 8,
      q: 'Bài 14 chạy hai hàm hoán đổi và đo được:<br><br>' +
         '<code>after swap_wrong: x=1 y=2</code> — không có gì đổi<br>' +
         '<code>after swap_right: x=2 y=1</code> — đã đổi<br><br>' +
         'Hai hàm giống nhau từng dòng, chỉ khác kiểu tham số: ' +
         '<code>void swap_wrong(int a, int b)</code> so với ' +
         '<code>void swap_right(int *a, int *b)</code>.<br><br>' +
         'Trong tất cả các khác biệt giữa hai hàm này, <b>khác biệt nào là khác biệt duy ' +
         'nhất có ý nghĩa</b>? Nói rõ nó là gì, rồi trả lời câu tiếp: nếu C luôn truyền theo ' +
         'giá trị, thì <code>swap_right</code> "truyền theo tham chiếu" bằng cách nào?',
      hint: 'Hỏi một câu duy nhất: khi hàm chạy xong và biến cục bộ của nó biến mất, ' +
            '<b>thứ gì còn lại đã bị sửa</b>? Và với câu thứ hai: bản thân con trỏ có được ' +
            'sao chép không?',
      crit: [
        'Nêu đúng khác biệt cốt lõi: <code>swap_wrong</code> chỉ đổi chỗ <b>bản sao</b> nằm trong khung ngăn xếp của chính nó; các bản sao đó biến mất khi hàm trả về',
        'Nêu đúng cơ chế của <code>swap_right</code>: nó nhận <b>địa chỉ</b>, và <code>*a = …</code> ghi vào ô nhớ của người gọi — thứ vẫn tồn tại sau khi hàm kết thúc',
        'Nói rõ điểm hay bị hiểu sai: C <b>luôn</b> truyền theo giá trị, <b>không có ngoại lệ</b> — kể cả với con trỏ',
        'Giải thích được cách C "truyền theo tham chiếu": nó sao chép <b>con trỏ</b> (một con số), và bản sao của một địa chỉ vẫn trỏ tới đúng ô nhớ ấy',
        'Kết luận đúng: cái quan trọng không phải "sao chép hay không sao chép" mà là <b>sao chép cái gì</b> — sao chép giá trị thì mất, sao chép địa chỉ thì vẫn với tới được bản gốc',
        'Nêu ít nhất một hệ quả thực tế: mảng suy biến thành con trỏ nên hàm <b>luôn</b> sửa được mảng của người gọi; hoặc: <code>swap_wrong</code> không có cảnh báo nào và mã thoát vẫn là 0'
      ],
      sol: '<p><b>Khác biệt có ý nghĩa: hàm sửa vào cái gì — bản sao của mình, hay ô nhớ của ' +
           'người gọi.</b> Mọi khác biệt khác (dấu <code>*</code>, dấu <code>&amp;</code> ở ' +
           'chỗ gọi, kiểu tham số) chỉ là hệ quả của khác biệt này.</p>' +
           '<p><code>swap_wrong</code> nhận hai <b>bản sao</b>. Nó đổi chỗ hai bản sao ấy rất ' +
           'thành công. Rồi hàm trả về, khung ngăn xếp của nó bị bỏ đi, và cùng với nó là ' +
           'toàn bộ công sức. <code>x</code> và <code>y</code> của người gọi chưa hề bị chạm ' +
           'tới. Đây là kiểu hỏng im lặng: không cảnh báo, không lỗi, mã thoát 0, chỉ có dữ ' +
           'liệu không đổi.</p>' +
           '<p><code>swap_right</code> nhận hai <b>địa chỉ</b>. <code>*a = …</code> nghĩa là ' +
           '"ghi vào ô nhớ nằm tại địa chỉ này", và ô nhớ đó là <code>x</code> của người gọi ' +
           '— nó vẫn tồn tại sau khi hàm kết thúc.</p>' +
           '<p><b>Câu thứ hai, và đây là chỗ hay bị dạy sai:</b> C ' +
           '<b>luôn</b> truyền theo giá trị. Không có ngoại lệ nào, kể cả với con trỏ. ' +
           '<code>swap_right</code> cũng nhận bản sao — nó nhận <b>bản sao của một địa ' +
           'chỉ</b>.</p>' +
           '<p>Và đó chính là mấu chốt: bản sao của con số <code>1</code> thì vô dụng khi bạn ' +
           'muốn sửa biến chứa số 1. Bản sao của địa chỉ <code>0x7ffd…c4</code> thì ' +
           '<b>vẫn trỏ tới đúng ô nhớ đó</b>. Cái quan trọng không phải "có sao chép hay ' +
           'không", mà là <b>sao chép cái gì</b>.</p>' +
           '<p>Bạn có thể kiểm tra ngay: bên trong <code>swap_right</code>, thử gán ' +
           '<code>a = b;</code> (không có dấu <code>*</code>). Bản sao con trỏ đổi, người gọi ' +
           'không thấy gì — đúng như <code>swap_wrong</code>. Chỉ có <code>*a</code> mới với ' +
           'ra ngoài được.</p>' +
           '<p><b>Hệ quả thực tế đáng nhớ nhất:</b> mảng suy biến thành con trỏ khi truyền ' +
           'vào hàm, nên một hàm nhận mảng <b>luôn luôn</b> sửa được mảng của người gọi — dù ' +
           'bạn không viết dấu <code>&amp;</code> nào. Đây là lý do các API C nghiêm túc dùng ' +
           '<code>const</code> ở tham số con trỏ khi hàm chỉ đọc: đó là cách duy nhất để nói ' +
           '"tôi sẽ không sửa dữ liệu của bạn".</p>' },

    { id: 'b6', k: 'free', tag: 'Bắt lỗi phát biểu', rows: 9,
      q: 'Một đồng nghiệp viết trong tài liệu quy ước code của nhóm:<br><br>' +
         '<i>"Từ nay mọi <code>struct</code> trong firmware đều phải khai báo ' +
         '<code>__attribute__((packed))</code>. Lý do: packed luôn cho struct <b>nhỏ ' +
         'nhất có thể</b>, nên tiết kiệm RAM; và vì nó bỏ hết byte đệm nên struct sẽ ' +
         '<b>khớp chính xác</b> với định dạng gói tin khi ta gửi thẳng nó qua UART sang máy ' +
         'tính."</i><br><br>' +
         'Phát biểu này có <b>ba</b> lỗi độc lập. Chỉ ra cả ba, và viết lại quy ước cho ' +
         'đúng.',
      hint: 'Lỗi thứ nhất nằm ở chữ "luôn" — có cách nào khác cũng cho struct nhỏ mà không ' +
            'phải trả giá gì không? Lỗi thứ hai: packed bỏ byte đệm đi, vậy trường 4 byte ' +
            'nằm ở địa chỉ lẻ thì CPU đọc thế nào? Lỗi thứ ba: khi gửi sang máy tính, thứ ' +
            'gì nữa có thể khác ngoài byte đệm?',
      crit: [
        'Lỗi 1 — chữ "<b>luôn</b>" sai: <b>sắp lại thứ tự trường</b> thường cho kết quả bằng đúng packed mà <b>không mất gì</b>; bạn đã đo được đúng thế ở B2 (12 → 8 byte, chỉ bằng cách đổi thứ tự)',
        'Lỗi 2 — <b>giá của truy cập lệch</b>: bỏ byte đệm nghĩa là một trường 4 byte có thể nằm ở địa chỉ không chia hết cho 4; trên nhiều lõi ARM điều đó khiến truy cập chậm đi nhiều lần, hoặc sinh <b>lỗi phần cứng</b>',
        'Nêu được hệ quả nguy hiểm của lỗi 2: lấy <b>con trỏ tới một trường</b> trong struct packed là hành vi không an toàn — con trỏ đó không còn bảo đảm căn lề',
        'Lỗi 3 — packed <b>không</b> giải quyết được vấn đề trao đổi dữ liệu: nó không nói gì về <b>thứ tự byte</b>, và cũng không cố định <b>độ rộng kiểu</b> (một trường <code>long</code> vẫn là 8 byte bên này và 4 byte bên kia)',
        'Nêu đúng cách làm cho dữ liệu trên đường truyền: <b>tuần tự hoá tường minh</b> từng byte, dùng <code>uintN_t</code> và thống nhất endianness — không gửi thẳng một struct qua dây',
        'Viết lại quy ước có phân biệt <b>hai loại struct</b>: struct nội bộ thì <b>sắp lại thứ tự</b>, còn struct mô tả định dạng bên ngoài (gói tin, header file ảnh, bảng phân vùng) thì mới cân nhắc packed',
        'Nêu được cách <b>thi hành</b> quy ước chứ không chỉ viết ra: <code>-Wpadded</code> hoặc một <code>_Static_assert(sizeof(struct …) == N)</code> ngay cạnh khai báo'
      ],
      sol: '<p><b>Lỗi 1 — "luôn cho struct nhỏ nhất" là sai, và bạn có số đo để bác nó.</b> ' +
           'Ở B2 bạn đã thấy cùng bốn trường, chỉ đổi thứ tự khai báo, struct đi từ ' +
           '12 xuống <b>8</b> byte. Đó đã là kích thước tổng các trường — packed không thể ' +
           'nhỏ hơn được nữa. Nói cách khác: trong rất nhiều trường hợp, packed mua được ' +
           '<b>đúng 0 byte</b> so với cách sắp lại, mà vẫn phải trả đủ giá.</p>' +
           '<p><b>Lỗi 2 — giá của packed là truy cập lệch, và nó không hiện ra ở x86.</b> ' +
           'Bỏ byte đệm nghĩa là một trường <code>uint32_t</code> có thể bắt đầu ở offset 1. ' +
           'x86-64 đọc được địa chỉ lệch (chỉ chậm hơn chút), nên bạn thử trên máy trạm thấy ' +
           'ổn. Nhiều lõi ARM thì không: hoặc trình biên dịch phải sinh ra một chuỗi lệnh đọc ' +
           'từng byte rồi ghép lại — chậm gấp nhiều lần — hoặc phần cứng sinh ' +
           '<i>alignment fault</i>.</p>' +
           '<p>Hệ quả nguy hiểm nhất, và ít người biết: <b>lấy con trỏ tới một trường</b> ' +
           'trong struct packed là không an toàn. Con trỏ đó có kiểu ' +
           '<code>uint32_t *</code>, tức là nó <i>hứa</i> rằng địa chỉ chia hết cho 4 — lời ' +
           'hứa mà packed vừa phá vỡ. Truyền con trỏ đó cho một hàm khác và bạn có một quả ' +
           'bom hẹn giờ.</p>' +
           '<p><b>Lỗi 3 — packed không giải quyết được bài toán trao đổi dữ liệu.</b> Nó bỏ ' +
           'byte đệm, đúng. Nhưng nó <b>không</b> nói gì về hai thứ còn lại:</p>' +
           '<ul>' +
           '<li><b>Thứ tự byte.</b> Bo mạch và máy tính có thể khác endianness; packed không ' +
           'chạm tới chuyện đó (A3).</li>' +
           '<li><b>Độ rộng kiểu.</b> Một trường <code>long</code> vẫn là 8 byte trên máy ' +
           'tính và 4 byte trên bo mạch armhf — chính xác điều bạn đã chứng minh ở B1. ' +
           'packed không cứu được gì cả.</li>' +
           '</ul>' +
           '<p><b>Quy ước viết lại:</b></p>' +
           '<ul>' +
           '<li><b>Struct nội bộ</b> (chỉ sống trong RAM của firmware): ' +
           '<b>không</b> packed. Sắp trường theo cỡ giảm dần, và bật ' +
           '<code>-Wpadded</code> khi muốn kiểm tra.</li>' +
           '<li><b>Struct mô tả định dạng bên ngoài</b> (header của một image, bảng phân ' +
           'vùng, khung tin): được phép packed, nhưng bắt buộc dùng <code>uintN_t</code>, ' +
           'quy định rõ endianness, và <b>không</b> lấy con trỏ tới trường bên trong.</li>' +
           '<li><b>Dữ liệu đi qua dây</b>: tuần tự hoá tường minh từng byte. Chậm hơn vài ' +
           'dòng code, đổi lại bạn kiểm soát được cả ba thứ: đệm, thứ tự byte, độ rộng.</li>' +
           '</ul>' +
           '<p><b>Và phần mà quy ước gốc thiếu hẳn: cơ chế thi hành.</b> Một dòng chữ trong ' +
           'tài liệu không ai đọc. Đặt ngay cạnh mỗi struct định dạng một câu ' +
           '<code>_Static_assert(sizeof(struct frame) == 6, "frame layout changed");</code> ' +
           '— từ đó, ai sửa struct mà quên cập nhật phía bên kia sẽ <b>không biên dịch ' +
           'được</b>. Đó mới là quy ước.</p>' },
  ],

  /* ═══ C · Vận dụng — 2 chẩn đoán + 2 tình huống mới + 1 chọn và biện minh ═══ */
  C: [
    { id: 'c1', k: 'free', truc: 0, tag: 'Chẩn đoán', rows: 10,
      q: 'Một công cụ trên máy tính (x86-64) ghi 100 bản ghi nhật ký vào file, rồi file ' +
         'được nạp vào flash của một bo mạch <b>armhf</b>. Firmware trên bo mạch đọc file ' +
         'đó bằng <b>đúng cùng một khai báo struct</b> — cùng một header, chép nguyên ' +
         'văn:<br><br>' +
         '<code>struct log_rec { uint32_t id; long timestamp; uint16_t code; };</code>' +
         '<br><br>' +
         'Ba triệu chứng, và triệu chứng thứ ba là manh mối tốt nhất:<br>' +
         '<b>(1)</b> Trường <code>id</code> của bản ghi <b>đầu tiên</b> đọc ra đúng.<br>' +
         '<b>(2)</b> <code>timestamp</code> của bản ghi đầu tiên là một số vô nghĩa.<br>' +
         '<b>(3)</b> Firmware báo tìm thấy <b>200</b> bản ghi trong file, không phải 100.' +
         '<br><br>' +
         'Chạy phép đo trên chính máy bạn (khối bên dưới), rồi: tính bố cục của struct ở ' +
         '<b>cả hai phía</b>, giải thích <b>từng</b> triệu chứng bằng những con số đó, và đề ' +
         'xuất cách sửa cùng cách làm cho lỗi này <b>không thể tái diễn</b>.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'cat > rec.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '#include <stdint.h>\n' +
          '#include <stddef.h>\n' +
          'struct log_rec { uint32_t id; long timestamp; uint16_t code; };\n' +
          'int main(void) {\n' +
          '    printf("host: size=%zu align=%zu | id=%zu timestamp=%zu code=%zu\\n",\n' +
          '           sizeof(struct log_rec), _Alignof(struct log_rec),\n' +
          '           offsetof(struct log_rec, id),\n' +
          '           offsetof(struct log_rec, timestamp),\n' +
          '           offsetof(struct log_rec, code));\n' +
          '    printf("100 records = %zu bytes\\n", 100 * sizeof(struct log_rec));\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'gcc -Wall -Wextra -o rec rec.c && ./rec' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'host: size=24 align=8 | id=0 timestamp=8 code=16\n' +
          '100 records = 2400 bytes' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'cat > rec_probe.c <<\'EOF\'\n' +
          '#include <stdint.h>\n' +
          '#include <stddef.h>\n' +
          'struct log_rec { uint32_t id; long timestamp; uint16_t code; };\n' +
          '_Static_assert(sizeof(struct log_rec) == 12, "not 12");\n' +
          '_Static_assert(_Alignof(struct log_rec) == 4, "align not 4");\n' +
          '_Static_assert(offsetof(struct log_rec, timestamp) == 4, "timestamp not at 4");\n' +
          '_Static_assert(offsetof(struct log_rec, code) == 8, "code not at 8");\n' +
          'EOF\n' +
          'arm-linux-gnueabihf-gcc -c -o /dev/null rec_probe.c\n' +
          'aarch64-linux-gnu-gcc  -c -o /dev/null rec_probe.c 2>&1 | grep -c error' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '4' },
        { t: 'cal', kind: 'tip', x: '<code>arm-linux-gnueabihf-gcc</code> ' +
          '<b>không in gì</b> — cả bốn khẳng định đều đúng trên armhf. ' +
          '<code>aarch64-linux-gnu-gcc</code> in ra <code>4</code>, tức <b>cả bốn</b> đều ' +
          'sai trên arm64. Bạn vừa đo được bố cục của bo mạch mà không cần bo mạch.' }
      ],
      hint: 'Chỉ có một trường trong struct này thay đổi độ rộng giữa hai bên. Tìm nó, rồi ' +
            'dựng lại bố cục hai phía từ offset 0 theo quy tắc căn lề. Với triệu chứng (3): ' +
            'firmware đếm số bản ghi bằng cách nào? Hầu như luôn là <b>cỡ file chia cho ' +
            '<code>sizeof(struct)</code></b>.',
      crit: [
        'Xác định đúng thủ phạm: trường <code>long timestamp</code> — 8 byte trên x86-64 (LP64), <b>4 byte</b> trên armhf (ILP32). Mọi trường khác dùng <code>uintN_t</code> nên không đổi',
        'Dựng đúng bố cục phía máy tính: <code>id</code> ở 0, <b>đệm 4 byte</b> ở 4–7, <code>timestamp</code> ở 8–15, <code>code</code> ở 16–17, đệm tới 24 — <b>size=24, align=8</b>',
        'Dựng đúng bố cục phía bo mạch: <code>id</code> ở 0, <code>timestamp</code> ở <b>4</b>, <code>code</code> ở <b>8</b>, đệm tới 12 — <b>size=12, align=4</b>; không cần đệm sau <code>id</code> vì <code>long</code> chỉ cần căn lề 4',
        'Giải thích triệu chứng (1): <code>id</code> nằm ở offset 0 ở <b>cả hai</b> bố cục, nên bản ghi đầu tiên đọc đúng — đây chính là thứ làm lỗi khó thấy',
        'Giải thích triệu chứng (2): bo mạch đọc <code>timestamp</code> tại offset <b>4</b>, mà ở đó máy tính để <b>byte đệm</b> — nên nó đọc phải rác',
        'Giải thích triệu chứng (3): số bản ghi = cỡ file / <code>sizeof</code> = <code>2400 / 12</code> = <b>200</b>; máy tính ghi 2400 byte, bo mạch chia cho 12',
        'Đề xuất sửa đúng: thay <code>long</code> bằng <code>uint64_t</code> (hoặc <code>int64_t</code>) — <b>một</b> thay đổi, và nó cố định độ rộng ở cả hai phía',
        'Đề xuất cách chống tái diễn: đặt <code>_Static_assert(sizeof(struct log_rec) == N)</code> ngay cạnh khai báo, và biên dịch header đó bằng <b>cả hai</b> trình biên dịch trong CI',
        'Nêu được rằng sửa độ rộng vẫn <b>chưa đủ</b> nếu hai bên khác endianness — đó là bài toán thứ hai, cần tuần tự hoá tường minh'
      ],
      sol: '<p><b>Thủ phạm là đúng một từ: <code>long</code>.</b> Ba trường của struct, hai ' +
           'trường dùng <code>uint32_t</code> và <code>uint16_t</code> — chúng không bao giờ ' +
           'đổi. Trường ở giữa dùng <code>long</code>, và <code>long</code> là 8 byte trên ' +
           'LP64, 4 byte trên ILP32. Cả bài toán nằm ở đó.</p>' +
           '<p><b>Bố cục hai phía, dựng từ quy tắc căn lề:</b></p>' +
           '<p><i>Máy tính (x86-64, LP64) — đo được <code>size=24 align=8</code>:</i></p>' +
           '<p><code>0–3</code> <code>id</code> · <code>4–7</code> <b>đệm</b> · ' +
           '<code>8–15</code> <code>timestamp</code> · <code>16–17</code> <code>code</code> · ' +
           '<code>18–23</code> <b>đệm đuôi</b></p>' +
           '<p>Vì sao có 4 byte đệm ngay sau <code>id</code>: <code>timestamp</code> rộng ' +
           '8 byte nên phải bắt đầu ở bội số của 8. Vì sao có đệm đuôi: căn lề của struct là ' +
           '8, nên kích thước phải là bội số của 8.</p>' +
           '<p><i>Bo mạch (armhf, ILP32) — bốn khẳng định đều đúng, nên ' +
           '<code>size=12 align=4</code>:</i></p>' +
           '<p><code>0–3</code> <code>id</code> · <code>4–7</code> <code>timestamp</code> · ' +
           '<code>8–9</code> <code>code</code> · <code>10–11</code> <b>đệm đuôi</b></p>' +
           '<p>Ở đây <code>timestamp</code> chỉ rộng 4 byte nên offset 4 đã hợp lệ — ' +
           '<b>không có byte đệm nào ở giữa</b>. Đó là toàn bộ khác biệt.</p>' +
           '<p><b>Ba triệu chứng, giải thích bằng chính các con số đó:</b></p>' +
           '<ul>' +
           '<li><b>(1) <code>id</code> đúng.</b> Nó ở offset 0 trong <b>cả hai</b> bố cục. ' +
           'Đây chính là thứ khiến lỗi khó phát hiện: cái đầu tiên bạn kiểm tra lại là cái ' +
           'duy nhất luôn đúng.</li>' +
           '<li><b>(2) <code>timestamp</code> vô nghĩa.</b> Bo mạch đọc 4 byte tại offset 4. ' +
           'Máy tính để ở đó <b>byte đệm</b> — nội dung không xác định. Bo mạch đọc rác và ' +
           'không có cách nào biết đó là rác.</li>' +
           '<li><b>(3) 200 bản ghi.</b> Firmware đếm bằng ' +
           '<code>st_size / sizeof(struct log_rec)</code>. Máy tính ghi ' +
           '<code>100 × 24 = 2400</code> byte; bo mạch chia cho <b>12</b> và ra <b>200</b>. ' +
           'Triệu chứng này là manh mối tốt nhất vì tỉ số <b>đúng bằng 2</b> — tức tỉ số hai ' +
           'kích thước struct, và nó chỉ thẳng vào bố cục chứ không vào nội dung.</li>' +
           '</ul>' +
           '<p><b>Cách sửa — một dòng:</b></p>' +
           '<p><code>struct log_rec { uint32_t id; int64_t timestamp; uint16_t code; };</code></p>' +
           '<p><code>int64_t</code> là 8 byte ở <b>mọi</b> ABI, nên hai phía khớp nhau. (Nếu ' +
           'muốn tiết kiệm thì <code>uint32_t timestamp</code> cũng khớp — nhưng nó tràn năm ' +
           '2106, một quyết định phải cân nhắc chứ không phải mặc định.)</p>' +
           '<p><b>Cách làm cho lỗi này không thể tái diễn — quan trọng hơn cách sửa:</b></p>' +
           '<ul>' +
           '<li>Đặt ngay dưới khai báo: ' +
           '<code>_Static_assert(sizeof(struct log_rec) == 16, "log_rec layout changed");</code> ' +
           'và một khẳng định <code>offsetof</code> cho từng trường.</li>' +
           '<li>Trong CI, biên dịch header đó bằng <b>cả hai</b> trình biên dịch. Bạn vừa làm ' +
           'đúng việc này ở khối lệnh phía trên, và nó tốn chưa tới một giây.</li>' +
           '</ul>' +
           '<p><b>Và một điều chưa xong:</b> sửa độ rộng mới giải quyết được một nửa. Nếu ' +
           'một ngày bo mạch đổi sang big-endian, cùng file đó lại đọc sai — lần này thì ' +
           '<code>id</code> cũng sai. Muốn thật sự an toàn thì đừng ghi struct thẳng ra ' +
           'file: <b>tuần tự hoá từng byte</b> theo một thứ tự bạn tự quy định.</p>' },

    { id: 'c2', k: 'free', truc: 1, tag: 'Tình huống mới', rows: 9,
      q: 'Bạn viết firmware cho một bo mạch <b>không có DRAM</b>: toàn bộ bộ nhớ là ' +
         '<b>64 KiB SRAM</b> trên chip. Yêu cầu: ghi nhật ký cảm biến vào RAM và giữ được ' +
         '<b>càng nhiều bản ghi càng tốt</b> trước khi gửi về. Mỗi bản ghi cần đúng bốn dữ ' +
         'liệu:<br><br>' +
         '<code>uint32_t ts</code> (mốc thời gian) · <code>uint16_t val</code> (giá trị đo) ' +
         '· <code>uint8_t id</code> (số hiệu cảm biến) · <code>uint8_t flags</code>' +
         '<br><br>' +
         'Người trước bạn khai báo theo thứ tự "dễ đọc": ' +
         '<code>{ ts; id; val; flags; }</code>.<br><br>' +
         '<b>(a)</b> Tính <code>sizeof</code> của cách khai báo đó và vẽ bản đồ byte. ' +
         '<b>(b)</b> Sắp lại cho tối ưu, tính lại. <b>(c)</b> Với đúng 64 KiB, mỗi cách giữ ' +
         'được bao nhiêu bản ghi? <b>(d)</b> Trả lời câu quan trọng nhất: thay đổi này có ' +
         'làm chương trình chạy chậm đi, hay khó đọc hơn, hay tốn thêm gì không?',
      hint: 'Đừng đoán — dựng bản đồ byte từ offset 0 như bạn đã làm ở B2. Với (d), hãy hỏi: ' +
            'sau khi sắp lại, mã truy cập <code>r.val</code> có phải viết khác đi không? ' +
            'Trường có còn nằm ở địa chỉ căn lề đúng không?',
      crit: [
        'Tính đúng bố cục "dễ đọc": <code>ts</code> 0–3 · <code>id</code> 4 · <b>đệm</b> 5 · <code>val</code> 6–7 · <code>flags</code> 8 · <b>đệm đuôi</b> 9–11 → <b>sizeof = 12</b>',
        'Tính đúng bố cục sắp lại <code>{ ts; val; id; flags; }</code>: 0–3 · 4–5 · 6 · 7 → <b>sizeof = 8</b>, không byte đệm nào',
        'Tính đúng số bản ghi: <code>65536 / 12</code> = <b>5461</b> và <code>65536 / 8</code> = <b>8192</b>',
        'Nêu đúng mức lợi: thêm <b>2731</b> bản ghi, tức <b>+50 %</b> dung lượng nhật ký',
        'Trả lời đúng (d): <b>không mất gì cả</b> — cùng bốn trường, cùng cách truy cập <code>r.val</code>, mọi trường vẫn căn lề đúng nên tốc độ truy cập không đổi',
        'Nêu được vì sao đây là "bữa trưa miễn phí" hiếm hoi: nó khác hẳn packed, vốn đổi kích thước lấy truy cập lệch',
        'Nêu cách kiểm chứng chứ không tin lời: <code>gcc -Wpadded</code> phải <b>im lặng</b> với bố cục mới, và một <code>_Static_assert(sizeof(struct rec) == 8)</code> để giữ nó về sau',
        'Có nhắc tới việc thứ tự "dễ đọc" vẫn giữ được nếu cần: dùng <b>chú thích</b> hoặc <b>khởi tạo có tên trường</b> (<code>.ts = …, .id = …</code>) — thứ tự khai báo không bắt buộc phải là thứ tự bạn đọc trong mã'
      ],
      solBlocks: [
        { t: 'p', x: '<b>(a) Bố cục "dễ đọc" — 12 byte, trong đó 4 byte không chứa gì:</b>' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'struct { uint32_t ts; uint8_t id; uint16_t val; uint8_t flags; };\n' +
          '\n' +
          'offset : 0  1  2  3    4     5      6  7     8      9  10 11\n' +
          'field  : ts             id    PAD    val     flags   PAD\n' +
          'size   : 4B             1B    1B     2B      1B      3B\n' +
          '\n' +
          'sizeof = 12   align = 4   (4 bytes of padding = 33 %)' },
        { t: 'p', x: 'Hai chỗ sinh đệm: <code>val</code> rộng 2 byte nên không được nằm ở ' +
          'offset 5 (số lẻ) — đẩy lên 6. Và kích thước struct phải là bội số của căn lề (4) ' +
          '— nên 9 được làm tròn lên 12.' },
        { t: 'p', x: '<b>(b) Sắp lại theo cỡ giảm dần — 8 byte, khít tuyệt đối:</b>' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'struct { uint32_t ts; uint16_t val; uint8_t id; uint8_t flags; };\n' +
          '\n' +
          'offset : 0  1  2  3    4  5     6     7\n' +
          'field  : ts             val     id    flags\n' +
          'size   : 4B             2B      1B    1B\n' +
          '\n' +
          'sizeof = 8   align = 4   (no padding at all)' },
        { t: 'p', x: '<b>(c) Số bản ghi trong 64 KiB = 65536 byte</b> — đo thật trên máy ' +
          'bạn:' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'naive=12 tidy=8\n' +
          'in 65536 bytes: naive=5461 records, tidy=8192 records, gain=2731' },
        { t: 'p', x: '<b>5461 so với 8192 — thêm 2731 bản ghi, tức nhiều hơn 50 %.</b> Nếu ' +
          'cảm biến lấy mẫu mỗi giây, đó là chênh lệch giữa 91 phút và 136 phút nhật ký ' +
          'trước khi phải gửi về. Trên một thiết bị chạy pin gửi dữ liệu qua sóng, số lần ' +
          'gửi chính là tuổi thọ pin.' },
        { t: 'cal', kind: 'tip', x: '<b>(d) Và đây là phần đáng giá nhất của câu này: bạn ' +
          'không mất gì cả.</b> Vẫn bốn trường ấy, vẫn viết <code>r.val</code> y như cũ, mọi ' +
          'trường vẫn nằm ở địa chỉ căn lề đúng nên tốc độ truy cập không đổi, không cần chỉ ' +
          'thị đặc biệt nào, không có rủi ro nào. Đây là một trong rất ít lần trong kỹ thuật ' +
          'mà bạn được thứ gì đó miễn phí — hãy phân biệt rõ nó với ' +
          '<code>packed</code>, thứ <i>đổi</i> kích thước lấy truy cập lệch.' },
        { t: 'p', x: '<b>Cách giữ kết quả này về sau:</b> chạy ' +
          '<code>gcc -Wpadded</code> — nó phải <b>im lặng</b> hoàn toàn với bố cục mới. Rồi ' +
          'đặt <code>_Static_assert(sizeof(struct rec) == 8, "rec grew");</code> ngay dưới ' +
          'khai báo, để lần sau ai thêm một trường mà làm struct phình ra sẽ biết ngay lúc ' +
          'biên dịch chứ không phải lúc hết RAM.' },
        { t: 'p', x: '<b>Nếu bạn tiếc thứ tự "dễ đọc":</b> thứ tự <i>khai báo</i> không bắt ' +
          'buộc phải là thứ tự bạn <i>đọc</i> trong mã. Dùng khởi tạo có tên trường — ' +
          '<code>struct rec r = { .ts = now, .id = 3, .val = adc, .flags = 0 };</code> — bạn ' +
          'viết theo thứ tự nào cũng được, còn bộ nhớ thì vẫn xếp tối ưu.' }
      ] },

    { id: 'c3', k: 'free', truc: 2, tag: 'Tình huống mới', rows: 10,
      q: 'Bo mạch của bạn không chạy hệ điều hành — chỉ có một vòng lặp chính và một trình ' +
         'xử lý ngắt (ISR) cho nút bấm. Firmware phải build bằng <code>-Os</code> để vừa ' +
         'flash. Bốn biến toàn cục:<br><br>' +
         '<code>int button_pressed;</code> — ISR đặt bằng 1, vòng lặp chính chờ<br>' +
         '<code>int press_count;</code> — ISR tăng lên, vòng lặp chính đọc rồi in ra<br>' +
         '<code>int loop_iterations;</code> — chỉ vòng lặp chính tăng, chỉ vòng lặp chính đọc<br>' +
         '<code>uint32_t *const STATUS = (uint32_t *)0x40021000;</code> — thanh ghi trạng ' +
         'thái của chip, phần cứng tự cập nhật<br><br>' +
         '<b>(a)</b> Biến nào <b>bắt buộc</b> phải có <code>volatile</code>, biến nào ' +
         '<b>không</b>, và vì sao? (viết lại khai báo cho đúng)<br>' +
         '<b>(b)</b> Với <code>press_count</code>, có một lỗi mà <code>volatile</code> ' +
         '<b>không</b> sửa được. Nêu tên nó, mô tả nó xảy ra thế nào, và nói cách xử lý.<br>' +
         '<b>(c)</b> Nếu bạn không chắc mình đã đặt đủ <code>volatile</code>, làm cách nào ' +
         '<b>kiểm chứng</b> mà không cần nạp firmware lên bo mạch?',
      hint: 'Với mỗi biến, hỏi đúng một câu: <b>có ai ngoài luồng thực thi này ghi vào nó ' +
            'không?</b> Với (b): <code>count++</code> thực ra là mấy thao tác máy? Với (c): ' +
            'bạn đã có sẵn công cụ ở B3 — nó tên là gì?',
      crit: [
        'Nêu đúng tiêu chí duy nhất: cần <code>volatile</code> khi giá trị có thể bị <b>một tay ngoài luồng thực thi hiện tại</b> (phần cứng, ISR, luồng khác) sửa',
        '<code>button_pressed</code> — <b>cần</b>: ISR ghi, vòng lặp chính đọc trong một vòng chờ; đây đúng là ca bị tối ưu thành vòng vô tận',
        '<code>press_count</code> — <b>cần</b>: ISR ghi, vòng lặp chính đọc',
        '<code>loop_iterations</code> — <b>không cần</b>: chỉ một luồng chạm vào nó; thêm <code>volatile</code> ở đây chỉ <b>cản tối ưu vô ích</b>',
        '<code>STATUS</code> — <b>cần</b>, và viết đúng vị trí từ khoá: <code>volatile uint32_t *const STATUS</code> (dữ liệu được trỏ tới là volatile, không phải con trỏ)',
        '(b) Gọi đúng tên lỗi: <b>race condition</b> / mất số đếm do <code>count++</code> không nguyên tử — nó là ba thao tác <b>đọc – cộng – ghi</b>, và ngắt có thể chen vào giữa',
        '(b) Nói rõ <code>volatile</code> chỉ bảo đảm <b>đọc lại từ bộ nhớ</b>, không bảo đảm <b>tính nguyên tử</b> — hai vấn đề khác nhau',
        '(b) Đưa ra ít nhất một cách xử lý: tắt ngắt quanh đoạn đọc–sửa (critical section), hoặc dùng kiểu nguyên tử của nền tảng, hoặc thiết kế lại để <b>chỉ một bên ghi</b>',
        '(c) Nêu đúng cách kiểm chứng không cần bo mạch: <b>đọc assembly</b> bằng <code>gcc -Os -S</code> và xem lệnh đọc bộ nhớ có nằm <b>trong</b> vòng lặp không — đúng phương pháp của B3'
      ],
      sol: '<p><b>(a) Tiêu chí chỉ có một câu: có ai ngoài luồng thực thi này ghi vào nó ' +
           'không?</b></p>' +
           '<ul>' +
           '<li><code>volatile int button_pressed;</code> — <b>cần</b>. ISR ghi, vòng lặp ' +
           'chính đọc trong một vòng chờ. Đây chính xác là ca bạn đã thấy ở B3: không có ' +
           '<code>volatile</code>, <code>-Os</code> sinh ra một vòng nhảy về chính nó và ' +
           'thiết bị đứng im mãi mãi.</li>' +
           '<li><code>volatile int press_count;</code> — <b>cần</b>. ISR ghi, vòng lặp chính ' +
           'đọc. Nếu thiếu, vòng lặp chính có thể in mãi một con số cũ mà nó đã nạp vào thanh ' +
           'ghi từ lâu.</li>' +
           '<li><code>int loop_iterations;</code> — <b>không cần</b>, và đây là nửa quan ' +
           'trọng ít người nói tới. Chỉ vòng lặp chính chạm vào nó. Thêm ' +
           '<code>volatile</code> ở đây buộc trình biên dịch ghi xuống bộ nhớ mỗi lần tăng — ' +
           'trên vòng lặp nóng, đó là mất mát thật, đổi lấy đúng 0 lợi ích. ' +
           '<b><code>volatile</code> không phải thứ rắc cho an toàn.</b></li>' +
           '<li><code>volatile uint32_t *const STATUS = (volatile uint32_t *)0x40021000;</code> ' +
           '— <b>cần</b>, và vị trí từ khoá là chỗ dễ sai. Bạn muốn nói ' +
           '"<i>dữ liệu</i> tại địa chỉ này tự đổi", nên <code>volatile</code> phải đứng ' +
           'trước kiểu được trỏ tới. Viết <code>uint32_t *volatile STATUS</code> thì bạn ' +
           'đang nói "<i>con trỏ</i> tự đổi" — hoàn toàn khác và hoàn toàn vô dụng ở ' +
           'đây.</li>' +
           '</ul>' +
           '<p><b>(b) Lỗi mà <code>volatile</code> không sửa được: race condition — mất số ' +
           'đếm.</b></p>' +
           '<p><code>press_count++</code> nhìn như một thao tác, nhưng máy làm <b>ba</b>: ' +
           'đọc từ bộ nhớ vào thanh ghi, cộng 1, ghi trở lại bộ nhớ. Ngắt có thể xảy ra ở ' +
           'giữa. Kịch bản cụ thể:</p>' +
           '<p>Vòng lặp chính đọc <code>press_count</code> = 5 → ngắt xảy ra → ISR đọc 5, ' +
           'cộng thành 6, ghi 6 → quay lại vòng lặp chính, nó vẫn giữ số <b>5</b> trong thanh ' +
           'ghi, cộng 1, ghi <b>6</b>. Hai lần tăng, kết quả tăng một. Một lần bấm nút biến ' +
           'mất.</p>' +
           '<p><code>volatile</code> bảo đảm mỗi lần <b>đọc</b> đều đi tới bộ nhớ thật. Nó ' +
           '<b>không</b> bảo đảm rằng đọc–cộng–ghi diễn ra liền mạch. Hai câu hỏi khác nhau: ' +
           '"giá trị có mới không" và "có ai chen vào giữa không".</p>' +
           '<p><b>Ba cách xử lý, theo thứ tự đáng ưu tiên:</b></p>' +
           '<ul>' +
           '<li><b>Thiết kế lại để chỉ một bên ghi.</b> Cho ISR là bên duy nhất tăng, còn ' +
           'vòng lặp chính chỉ <i>đọc</i> và ghi nhớ giá trị nó đã xử lý tới. Không có ' +
           'đọc–sửa–ghi ở hai phía thì không có cuộc đua. Rẻ nhất và bền nhất.</li>' +
           '<li><b>Đoạn găng:</b> tắt ngắt, đọc–sửa–ghi, bật lại. Đúng nhưng phải nhớ rằng ' +
           'trong lúc đó thiết bị mù với mọi ngắt khác — giữ đoạn đó thật ngắn.</li>' +
           '<li><b>Kiểu nguyên tử của nền tảng</b> (<code>&lt;stdatomic.h&gt;</code> hoặc ' +
           'hàm nội tại của trình biên dịch). Sạch sẽ, nhưng không phải bo mạch nhỏ nào cũng ' +
           'có.</li>' +
           '</ul>' +
           '<p><b>(c) Kiểm chứng không cần bo mạch: đọc assembly.</b> Đúng công cụ bạn dùng ' +
           'ở B3 — <code>gcc -Os -S firmware.c -o firmware.s</code>, rồi tìm vòng lặp chờ và ' +
           'hỏi một câu: <b>lệnh đọc bộ nhớ nằm trong hay ngoài vòng lặp?</b> Nếu nhãn được ' +
           'nhảy về đứng <i>sau</i> lệnh đọc, bạn đã mất lần đọc lại và ' +
           '<code>volatile</code> đang thiếu.</p>' +
           '<p>Đây là một thói quen đáng tập ngay từ bây giờ: với mã nhúng, ' +
           '<b>đọc assembly không phải việc của chuyên gia</b>, nó là cách rẻ nhất để kiểm ' +
           'tra một giả định. Bạn chỉ cần nhận ra bốn thứ — lệnh đọc bộ nhớ, lệnh so sánh, ' +
           'lệnh nhảy, và vị trí của nhãn.</p>' },

    { id: 'c4', k: 'free', tag: 'Chẩn đoán', rows: 9,
      q: 'Firmware trên bo mạch gửi một giá trị đo lên máy tính qua UART. Mã gửi:<br><br>' +
         '<code>uint32_t v = 1000;</code><br>' +
         '<code>uint8_t tx[4];</code><br>' +
         '<code>memcpy(tx, &amp;v, sizeof v);</code><br>' +
         '<code>uart_send(tx, 4);</code><br><br>' +
         'Công cụ trên máy tính (viết bằng Python, dùng ' +
         '<code>struct.unpack(\'&gt;I\', data)</code>) in ra ' +
         '<b>3892510720</b>.<br><br>' +
         'Cả hai bên đều chạy trên máy little-endian. Không ai sai cú pháp. ' +
         '<b>(a)</b> Chuyện gì đã xảy ra — chứng minh bằng bốn byte cụ thể trên đường ' +
         'truyền. <b>(b)</b> Có <b>ba</b> cách sửa; nêu cả ba và chọn một, nói rõ vì sao. ' +
         '<b>(c)</b> Vì sao lỗi này thường lọt qua giai đoạn thử nghiệm?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'cat > eo.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '#include <stdint.h>\n' +
          '#include <string.h>\n' +
          'int main(void) {\n' +
          '    uint32_t v = 1000, be = 0;\n' +
          '    uint8_t tx[4];\n' +
          '    int i;\n' +
          '    memcpy(tx, &v, sizeof v);\n' +
          '    printf("on the wire: %02X %02X %02X %02X\\n", tx[0], tx[1], tx[2], tx[3]);\n' +
          '    for (i = 0; i < 4; i++) be = (be << 8) | tx[i];\n' +
          '    printf("parsed as big-endian    : %u (0x%08X)\\n", be, be);\n' +
          '    printf("parsed as little-endian : %u (0x%08X)\\n", v, v);\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'gcc -Wall -Wextra -o eo eo.c && ./eo' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'on the wire: E8 03 00 00\n' +
          'parsed as big-endian    : 3892510720 (0xE8030000)\n' +
          'parsed as little-endian : 1000 (0x000003E8)' }
      ],
      hint: 'Ký tự <code>&gt;</code> trong <code>struct.unpack(\'&gt;I\')</code> có nghĩa ' +
            'gì? Và <code>memcpy</code> chép bốn byte theo thứ tự nào — thứ tự bạn viết số, ' +
            'hay thứ tự chúng nằm trong bộ nhớ?',
      crit: [
        'Đọc đúng bốn byte trên đường truyền: <code>E8 03 00 00</code> — vì <code>memcpy</code> chép <b>y nguyên bố cục bộ nhớ</b>, và máy little-endian để byte nhỏ nhất (<code>0xE8</code>) ở địa chỉ thấp nhất',
        'Nêu đúng lỗi: <code>\'&gt;I\'</code> trong Python nghĩa là <b>big-endian</b>, nên công cụ ghép <code>E8 03 00 00</code> thành <code>0xE8030000</code> = <b>3892510720</b>',
        'Nói rõ <b>không ai sai cú pháp</b>: cả hai bên chạy đúng như được viết; hỏng nằm ở chỗ hai bên <b>chưa thống nhất giao ước</b> về thứ tự byte',
        'Cách sửa 1: đổi Python sang <code>\'&lt;I\'</code> — nhanh nhất, nhưng nó chỉ chép quy ước theo endianness <b>tình cờ</b> của bo mạch hiện tại',
        'Cách sửa 2: bên C tuần tự hoá <b>tường minh</b> — <code>tx[0] = v >> 24; tx[1] = v >> 16; tx[2] = v >> 8; tx[3] = v;</code> — rồi giữ <code>\'&gt;I\'</code>',
        'Cách sửa 3: dùng hàm chuyển đổi có sẵn — <code>htonl()</code> / <code>htobe32()</code> — trước khi <code>memcpy</code>',
        'Chọn một và biện minh được: cách 2 hoặc 3 tốt hơn cách 1 vì chúng <b>quy định giao thức</b> thay vì phụ thuộc vào endianness của phần cứng — bo mạch đổi thì mã vẫn đúng',
        '(c) Nêu đúng vì sao lọt qua thử nghiệm: giai đoạn đầu thường thử bo mạch ↔ bo mạch hoặc máy ↔ máy (<b>cùng</b> endianness, mọi thứ khớp), và giá trị thử nhỏ thường được đọc kèm cả byte 0 nên nhìn "gần đúng"',
        'Nêu được cách phát hiện sớm: gửi một <b>số ma thuật</b> đã biết (ví dụ <code>0x01020304</code>) làm byte mở đầu khung — đọc sai thứ tự là lộ ra ngay'
      ],
      sol: '<p><b>(a) Bốn byte trên dây là <code>E8 03 00 00</code>, và đó là toàn bộ câu ' +
           'chuyện.</b></p>' +
           '<p><code>1000</code> = <code>0x000003E8</code>. Trong bộ nhớ của một máy ' +
           'little-endian, bốn byte đó nằm theo thứ tự <code>E8 03 00 00</code> — byte có ý ' +
           'nghĩa nhỏ nhất ở địa chỉ thấp nhất (đúng điều bạn xác nhận ở A3). ' +
           '<code>memcpy</code> không "chuyển đổi" gì cả: nó chép <b>y nguyên bố cục bộ ' +
           'nhớ</b>. Nên UART đẩy đi đúng <code>E8 03 00 00</code>.</p>' +
           '<p>Phía Python, ký tự <code>&gt;</code> nghĩa là <b>big-endian</b>: ghép byte đầu ' +
           'tiên làm byte có ý nghĩa lớn nhất. <code>E8</code> thành byte cao → ' +
           '<code>0xE8030000</code> → <b>3892510720</b>. Số đó không phải rác ngẫu nhiên — ' +
           'nó là <b>đúng dữ liệu của bạn, đọc ngược thứ tự</b>.</p>' +
           '<p><b>Điểm cốt lõi: không ai sai cú pháp.</b> Firmware chạy đúng như viết, công ' +
           'cụ Python chạy đúng như viết. Cái thiếu là một <b>giao ước</b> giữa hai bên về ' +
           'thứ tự byte — và vì không ai viết nó ra, mỗi bên tự giả định một kiểu.</p>' +
           '<p><b>(b) Ba cách sửa:</b></p>' +
           '<ul>' +
           '<li><b>Đổi Python sang <code>\'&lt;I\'</code>.</b> Một ký tự, xong ngay. Nhưng ' +
           'nó biến endianness <i>tình cờ</i> của bo mạch hiện tại thành giao thức của bạn. ' +
           'Đổi sang một SoC big-endian, hoặc chỉ cần một người khác đọc dữ liệu này bằng ' +
           'công cụ khác, là hỏng lại.</li>' +
           '<li><b>Tuần tự hoá tường minh bên C:</b><br>' +
           '<code>tx[0] = (uint8_t)(v >> 24); tx[1] = (uint8_t)(v >> 16);</code><br>' +
           '<code>tx[2] = (uint8_t)(v >> 8);  tx[3] = (uint8_t)v;</code><br>' +
           'Mã này cho ra <code>00 00 03 E8</code> trên <b>mọi</b> kiến trúc, vì phép dịch ' +
           'bit làm việc trên <i>giá trị</i> chứ không trên bố cục bộ nhớ. Giữ nguyên ' +
           '<code>\'&gt;I\'</code> phía Python.</li>' +
           '<li><b>Dùng hàm chuyển đổi có sẵn:</b> <code>uint32_t n = htonl(v);</code> ' +
           '(hoặc <code>htobe32</code>) rồi mới <code>memcpy</code>. Ngắn gọn, và tên hàm nói ' +
           'thẳng ý định.</li>' +
           '</ul>' +
           '<p><b>Chọn cách 2 hoặc 3</b>, không chọn cách 1. Lý do không phải là "chuẩn hơn" ' +
           'mà rất cụ thể: cách 2 và 3 <b>quy định</b> thứ tự byte của giao thức, còn cách 1 ' +
           '<b>phụ thuộc</b> vào thứ tự byte của phần cứng. Cái thứ nhất là một quyết định ' +
           'bạn kiểm soát; cái thứ hai là một sự trùng hợp mà bạn không kiểm soát. ' +
           '(Giữa 2 và 3: dùng <code>htonl</code> nếu bạn ở trên Linux có sẵn header; dùng ' +
           'phép dịch bit nếu mã phải chạy trên vi điều khiển trần.)</p>' +
           '<p><b>(c) Vì sao lỗi này hay lọt qua thử nghiệm:</b></p>' +
           '<ul>' +
           '<li><b>Thử nghiệm ban đầu thường cùng endianness.</b> Bạn viết cả hai đầu, chạy ' +
           'thử trên máy tính với máy tính, mọi thứ khớp. Lỗi chỉ xuất hiện khi hai đầu ' +
           '<i>khác</i> quy ước — mà thường là lúc đã lắp vào sản phẩm.</li>' +
           '<li><b>Giá trị nhỏ nhìn "gần đúng".</b> Với <code>v = 1</code>, dây mang ' +
           '<code>01 00 00 00</code> và bên kia đọc ra 16777216. Sai rành rành. Nhưng nhiều ' +
           'trường thử nghiệm là 0 — và <code>00 00 00 00</code> đọc kiểu nào cũng ra 0. Một ' +
           'khung tin toàn số 0 thử "thành công" hoàn hảo.</li>' +
           '</ul>' +
           '<p><b>Cách phát hiện sớm, rẻ và rất hiệu quả:</b> đặt một <b>số ma thuật</b> đã ' +
           'biết ở đầu mỗi khung — ví dụ <code>0x01020304</code>. Bên nhận kiểm tra nó trước ' +
           'khi đọc gì khác. Đọc sai thứ tự byte thì con số đó thành ' +
           '<code>0x04030201</code> và lộ ra ngay ở gói tin đầu tiên, chứ không phải ở tháng ' +
           'thứ ba.</p>' },

    { id: 'c5', k: 'free', tag: 'Chọn và biện minh', rows: 10,
      q: 'Bạn phải chốt bố cục cho <b>một</b> struct dùng ở <b>hai</b> chỗ: nó vừa là bản ' +
         'ghi lưu trong RAM của firmware, vừa là <b>khung tin</b> gửi qua UART lên máy ' +
         'tính. Bốn trường: <code>uint8_t id</code>, <code>uint32_t value</code>, ' +
         '<code>uint8_t flag</code>, <code>uint16_t seq</code>.<br><br>' +
         'Ba phương án trên bàn, và số đo thật của cả ba đã có ở khối bên dưới:<br>' +
         '<b>(A)</b> giữ nguyên thứ tự, không packed · <b>(B)</b> sắp lại thứ tự, không ' +
         'packed · <b>(C)</b> giữ nguyên thứ tự + <code>__attribute__((packed))</code>' +
         '<br><br>' +
         'Đọc số đo, <b>chọn một phương án</b> và biện minh. Phần được chấm là biện minh, ' +
         'không phải lựa chọn — nhưng biện minh phải trả lời được ' +
         '<b>con số nào khiến bạn loại (C)</b>, và phải nói rõ phương án bạn chọn ' +
         '<b>vẫn còn thiếu gì</b> cho phần "gửi qua UART".',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'cat > pk.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '#include <stdint.h>\n' +
          'struct sensor_a { uint8_t id; uint32_t value; uint8_t flag; uint16_t seq; };\n' +
          'struct sensor_b { uint32_t value; uint16_t seq; uint8_t id; uint8_t flag; };\n' +
          'struct sensor_p { uint8_t id; uint32_t value; uint8_t flag; uint16_t seq; }\n' +
          '    __attribute__((packed));\n' +
          'int main(void) {\n' +
          '    printf("a=%zu b=%zu packed=%zu\\n",\n' +
          '           sizeof(struct sensor_a), sizeof(struct sensor_b),\n' +
          '           sizeof(struct sensor_p));\n' +
          '    printf("for 1000 records: a=%zu b=%zu packed=%zu bytes\\n",\n' +
          '           1000 * sizeof(struct sensor_a), 1000 * sizeof(struct sensor_b),\n' +
          '           1000 * sizeof(struct sensor_p));\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'gcc -Wall -Wextra -o pk pk.c && ./pk' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'a=12 b=8 packed=8\n' +
          'for 1000 records: a=12000 b=8000 packed=8000 bytes' }
      ],
      hint: 'So <b>b</b> với <b>packed</b> trong dòng đầu tiên. Nếu hai con số bằng nhau thì ' +
            'phương án (C) <i>mua</i> được bao nhiêu byte so với (B)? Và nó phải <i>trả</i> ' +
            'giá gì mà (B) không phải trả?',
      crit: [
        'Đọc đúng con số quyết định: <code>b = 8</code> và <code>packed = 8</code> — <b>bằng nhau</b>. Ở 1000 bản ghi cũng vậy: 8000 so với 8000',
        'Rút ra đúng kết luận: (C) mua được <b>0 byte</b> so với (B), tức nó không có lợi ích nào để bù cho cái giá của nó',
        'Nêu đúng cái giá của (C): truy cập lệch — trường <code>value</code> có thể không nằm ở địa chỉ chia hết cho 4, gây chậm nhiều lần hoặc <i>alignment fault</i> trên một số lõi ARM; và con trỏ tới trường bên trong không còn an toàn',
        'Loại (A) đúng lý do: 12 byte cho 8 byte dữ liệu, tức <b>50 % phí tổn</b>, mà không đổi lại gì — 12000 so với 8000 byte ở 1000 bản ghi',
        'Chọn <b>(B)</b> và nói được vì sao nó là lựa chọn "không mất gì": nhỏ bằng packed, vẫn căn lề đúng, không cần chỉ thị đặc biệt, cách viết mã không đổi',
        'Nêu đúng cái (B) <b>vẫn thiếu</b> cho phần UART: nó không quy định <b>thứ tự byte</b>, và bố cục struct vẫn là một chi tiết của trình biên dịch chứ không phải một giao thức',
        'Đề xuất tách hai vai trò: dùng struct (B) cho <b>bộ nhớ</b>, và một hàm <b>tuần tự hoá tường minh</b> 8 byte cho <b>đường truyền</b> — hai thứ khác nhau, đừng bắt một struct làm cả hai',
        'Có <b>cơ chế giữ</b> quyết định: <code>_Static_assert(sizeof(struct sensor_b) == 8)</code> cạnh khai báo, và <code>-Wpadded</code> phải im lặng',
        'Nêu được trường hợp packed <b>thật sự</b> đúng: khi bố cục đã bị bên ngoài quy định sẵn (header của một image, bảng phân vùng, khung tin của giao thức có sẵn) và bạn <b>không có quyền</b> sắp lại'
      ],
      sol: '<p><b>Con số quyết định nằm ngay ở dòng đầu: <code>b = 8</code> và ' +
           '<code>packed = 8</code>.</b> Chúng bằng nhau. Nghĩa là ' +
           '<code>__attribute__((packed))</code> trong tình huống này mua được <b>đúng 0 ' +
           'byte</b> so với việc chỉ sắp lại thứ tự khai báo — và ở 1000 bản ghi vẫn là 8000 ' +
           'so với 8000.</p>' +
           '<p>Đây là chỗ trực giác hay sai. "Packed thì nhỏ nhất" nghe rất hợp lý, nhưng ' +
           'packed chỉ bỏ được <b>byte đệm</b>; nếu bạn đã sắp trường sao cho không sinh đệm ' +
           'thì nó không còn gì để bỏ. Cận dưới của cả hai cách đều là <b>tổng cỡ các ' +
           'trường</b> = 4+2+1+1 = 8.</p>' +
           '<p><b>Vì thế (C) bị loại, và bị loại một cách dứt khoát:</b> lợi ích bằng 0, ' +
           'trong khi giá phải trả là thật:</p>' +
           '<ul>' +
           '<li><code>value</code> (4 byte) có thể nằm ở offset 1 — không chia hết cho 4. ' +
           'x86-64 đọc được, chỉ chậm hơn chút; nhiều lõi ARM thì phải ghép từng byte (chậm ' +
           'gấp nhiều lần) hoặc sinh <i>alignment fault</i>.</li>' +
           '<li>Lấy con trỏ tới một trường trong struct packed là hành vi không an toàn: con ' +
           'trỏ kiểu <code>uint32_t *</code> <i>hứa</i> địa chỉ chia hết cho 4, mà packed vừa ' +
           'phá vỡ lời hứa ấy.</li>' +
           '</ul>' +
           '<p><b>(A) cũng bị loại, nhưng vì lý do ngược lại:</b> 12 byte để chứa 8 byte dữ ' +
           'liệu — 50 % phí tổn, đổi lại đúng con số 0 về lợi ích. Ở 1000 bản ghi đó là ' +
           '12000 so với 8000 byte. Trên một bo mạch có 64 KiB SRAM, 4 KB đó là tiền ' +
           'thật.</p>' +
           '<p><b>Chọn (B).</b> Nó nhỏ bằng packed, vẫn căn lề đúng nên truy cập nhanh và an ' +
           'toàn trên mọi kiến trúc, không cần chỉ thị đặc biệt nào, và cách viết mã không ' +
           'đổi một chữ. Đây là lựa chọn không phải đánh đổi gì — hiếm, và chính vì hiếm nên ' +
           'đáng nhận ra.</p>' +
           '<p><b>Nhưng (B) vẫn chưa đủ cho vế "gửi qua UART", và đây là phần quan trọng ' +
           'nhất của câu trả lời.</b> (B) không quy định:</p>' +
           '<ul>' +
           '<li><b>Thứ tự byte.</b> Gửi thẳng struct đi thì <code>value</code> ra dây theo ' +
           'endianness của bo mạch — đúng cái bẫy của C4.</li>' +
           '<li><b>Tính bền của bố cục.</b> Bố cục struct là chuyện giữa bạn và trình biên ' +
           'dịch, không phải một giao thức. Đổi trình biên dịch, đổi ABI, hoặc chỉ cần ai đó ' +
           'thêm một trường, là khung tin đổi mà không ai được báo.</li>' +
           '</ul>' +
           '<p><b>Cách làm đúng là tách hai vai trò ra:</b></p>' +
           '<ul>' +
           '<li><b>Trong RAM:</b> dùng struct (B). Tối ưu cho máy.</li>' +
           '<li><b>Trên dây:</b> một hàm <code>encode(const struct rec *r, uint8_t out[8])</code> ' +
           'ghi từng byte theo thứ tự bạn tự quy định, và một hàm ' +
           '<code>decode()</code> đối xứng. Tám dòng code, và từ đó khung tin là một thứ ' +
           'bạn <b>định nghĩa</b> chứ không phải một thứ bạn <b>quan sát được</b>.</li>' +
           '</ul>' +
           '<p><b>Và cơ chế để quyết định này không tự trôi đi:</b> ' +
           '<code>_Static_assert(sizeof(struct sensor_b) == 8, "record grew");</code> ngay ' +
           'dưới khai báo, cộng với <code>-Wpadded</code> im lặng trong build CI. Không có ' +
           'hai thứ đó thì sáu tháng nữa sẽ có người thêm một trường ' +
           '<code>uint32_t</code> vào giữa, struct lên 16 byte, và không ai biết cho tới lúc ' +
           'hết RAM.</p>' +
           '<p><b>Khi nào packed mới thật sự đúng:</b> khi bố cục <b>đã bị bên ngoài quy ' +
           'định sẵn</b> và bạn không có quyền sắp lại — header của một image kernel, bảng ' +
           'phân vùng MBR, khung tin của một giao thức đã có chuẩn. Lúc đó packed không phải ' +
           'để tiết kiệm, mà để <b>khớp</b>. Đó là một lý do hoàn toàn khác, và là lý do duy ' +
           'nhất đúng.</p>' },
  ],

  /* ═══ D · Ôn xen kẽ — 3 câu về các bài đã học mà bài 14 đứng lên trên ═══ */
  D: [
    { id: 'd1', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: 'Bạn muốn đếm nhanh xem trình biên dịch cảnh báo bao nhiêu chỗ, nên gõ lệnh dưới ' +
         'đây. Cảnh báo <b>hiện ra đầy đủ trên màn hình</b>, nhưng <code>grep -c</code> lại ' +
         'in ra <b>0</b>. Vì sao? <i>(ôn <b>Bài 10</b>)</i>',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'gcc -Wall -Wextra -Wpadded -c -o /dev/null warn.c | grep -c \'warning\'' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'warn.c:2:40: warning: padding struct to align ‘value’ [-Wpadded]\n' +
          '    2 | struct sensor_a { uint8_t id; uint32_t value; uint8_t flag; uint16_t seq; };\n' +
          '      |                                        ^~~~~\n' +
          'warn.c:2:70: warning: padding struct to align ‘seq’ [-Wpadded]\n' +
          '    2 | struct sensor_a { uint8_t id; uint32_t value; uint8_t flag; uint16_t seq; };\n' +
          '      |                                                                      ^~~\n' +
          '0' },
      ],
      opts: [
        '<code>grep -c</code> đếm số <i>lần xuất hiện</i>, mà chữ <code>warning</code> chỉ ' +
        'xuất hiện trong ngoặc vuông nên không khớp',
        'Trình biên dịch gửi cảnh báo ra <b>stderr (fd 2)</b>, còn dấu <code>|</code> chỉ ' +
        'nối <b>stdout (fd 1)</b> — <code>grep</code> không nhận được dòng nào cả',
        '<code>gcc -c</code> không thật sự biên dịch nên cảnh báo chỉ là giả lập, không ' +
        'phải dữ liệu',
        '<code>-o /dev/null</code> vứt bỏ toàn bộ đầu ra của <code>gcc</code>, kể cả cảnh báo'
      ],
      a: 1,
      why: 'Đây là cái bẫy đã gặp ở <b>Bài 10</b>, nay quay lại trong bối cảnh trình biên ' +
           'dịch. Dấu <code>|</code> nối <b>duy nhất</b> fd 1 sang lệnh sau. Cảnh báo và lỗi ' +
           'của <code>gcc</code> đi ra fd 2, và fd 2 <b>đi thẳng ra màn hình</b>, vòng qua ' +
           'ống dẫn — đó là lý do bạn <i>nhìn thấy</i> chúng mà <code>grep</code> thì ' +
           '<i>không</i>. Sửa bằng cách gộp fd 2 vào fd 1 <b>trước</b> khi đưa vào ống: ' +
           '<code>gcc … 2&gt;&amp;1 | grep -c \'warning\'</code> — chạy lại sẽ ra <b>2</b>. ' +
           '<code>-o /dev/null</code> chỉ vứt <i>file kết quả</i>, không liên quan tới dòng ' +
           'thông báo. Vì sao điều này quan trọng ngay từ bài này trở đi: mọi kịch bản build ' +
           'kiểu <code>make | grep error</code> đều <b>im lặng báo thành công</b> trên một ' +
           'bản build đã chết.' },

    { id: 'd2', k: 'free', tag: 'Nhắc lại bài cũ', rows: 7,
      q: 'Bạn biên dịch một chương trình và đặt tên nó là <code>test</code>. Chạy bằng ' +
         '<code>./test</code> thì đúng như mong đợi. Nhưng gõ <b>trần</b> ' +
         '<code>test</code> thì <b>không có gì in ra</b>, và <code>$?</code> bằng ' +
         '<b>1</b>.<br><br>' +
         'Giải thích chuyện gì đang chạy khi bạn gõ trần <code>test</code>, dùng đúng công ' +
         'cụ của <b>Bài 4</b> để chứng minh, rồi rút ra một quy tắc đặt tên cho các chương ' +
         'trình thử nghiệm của bạn từ nay về sau. <i>(ôn <b>Bài 4</b>)</i>',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'gcc -o test t.c\n' +
          'test  ; echo "bare  \'test\'  -> exit=$?"\n' +
          './test ; echo "\'./test\'      -> exit=$?"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'bare  \'test\'  -> exit=1\n' +
          'this is my program\n' +
          '\'./test\'      -> exit=0' },
      ],
      hint: 'Có một lệnh trả lời chính xác câu "cái tên này thật ra là cái gì", và một biến ' +
            'thể của nó liệt kê <b>tất cả</b> những thứ mang cùng tên đó.',
      crit: [
        'Nêu đúng nguyên nhân: <code>test</code> là một <b>lệnh nội trú của shell</b> (shell builtin), và builtin được ưu tiên <b>trước</b> mọi file trong <code>PATH</code>',
        'Nêu đúng lệnh chứng minh: <code>type test</code> → <code>test is a shell builtin</code>; và <code>type -a test</code> liệt kê cả ba: builtin, <code>/usr/bin/test</code>, <code>/bin/test</code>',
        'Giải thích <code>exit=1</code>: builtin <code>test</code> không đối số nghĩa là "kiểm tra một biểu thức rỗng" → <b>sai</b> → trả về 1; nó không hề in gì vì đó không phải việc của nó',
        'Giải thích vì sao <code>./test</code> lại chạy đúng chương trình: <code>./</code> là một <b>đường dẫn</b>, không phải một cái tên để tra cứu, nên shell bỏ qua toàn bộ bước builtin/PATH',
        'Nêu được rằng thư mục hiện tại <b>không</b> nằm trong <code>PATH</code> — nên kể cả không có builtin, gõ trần <code>test</code> cũng không chạy file của bạn',
        'Rút ra quy tắc dùng được: trước khi đặt tên một chương trình, chạy <code>type -a &lt;tên&gt;</code>; tránh các tên đã có nghĩa (<code>test</code>, <code>time</code>, <code>echo</code>, <code>[</code>) và đặt tên riêng như <code>t1</code>, <code>sensor_test</code>'
      ],
      sol: '<p><b>Bạn không chạy chương trình của mình — bạn chạy một lệnh nội trú của ' +
           'shell.</b></p>' +
           '<p><code>test</code> là một <b>builtin</b>: một lệnh nằm sẵn trong bản thân ' +
           '<code>bash</code>, không phải một file trên đĩa. Và thứ tự tra cứu của shell đặt ' +
           'builtin <b>trước</b> mọi thứ trong <code>PATH</code>. Công cụ chứng minh là ' +
           '<code>type</code>, đúng công cụ của Bài 4:</p>' +
           '<p><code>type test</code> → <code>test is a shell builtin</code></p>' +
           '<p><code>type -a test</code> → ba dòng: <code>test is a shell builtin</code>, ' +
           '<code>test is /usr/bin/test</code>, <code>test is /bin/test</code>. Ba thứ khác ' +
           'nhau mang cùng một cái tên, và bạn vừa thêm cái thứ tư.</p>' +
           '<p><b>Vì sao <code>exit=1</code> mà không in gì:</b> builtin <code>test</code> ' +
           'dùng để kiểm tra biểu thức (<code>test -f file</code>, ' +
           '<code>test "$a" = "$b"</code>). Gọi nó không đối số nghĩa là kiểm tra một biểu ' +
           'thức rỗng → kết quả <b>sai</b> → trả về 1. Nó chạy hoàn toàn thành công, làm ' +
           'đúng việc của nó, và việc của nó không bao gồm in gì cả. Đây là ca xấu nhất của ' +
           'loại lỗi này: <b>không có thông báo lỗi nào để mà tìm</b>.</p>' +
           '<p><b>Vì sao <code>./test</code> lại đúng:</b> vì <code>./test</code> không phải ' +
           'một <i>cái tên</i>, nó là một <i>đường dẫn</i>. Thấy có dấu <code>/</code>, shell ' +
           'bỏ qua toàn bộ bước tra builtin và tra <code>PATH</code>, mở thẳng file đó ra ' +
           'chạy. Cũng nhắc lại vì sao dấu <code>./</code> là bắt buộc: thư mục hiện tại ' +
           '<b>không</b> nằm trong <code>PATH</code>, nên ngay cả khi không vướng builtin thì ' +
           'gõ trần một cái tên cũng không tìm ra file trong thư mục bạn đang đứng.</p>' +
           '<p><b>Quy tắc rút ra, và nó rẻ đến mức không có lý do gì để bỏ qua:</b> trước ' +
           'khi đặt tên cho một chương trình, gõ <code>type -a &lt;tên&gt;</code>. Nếu nó in ' +
           'ra bất cứ thứ gì, hãy đổi tên. Những cái tên hay bị vấp nhất là ' +
           '<code>test</code>, <code>time</code>, <code>echo</code>, <code>[</code>, ' +
           '<code>printf</code> — toàn những tên mà người mới đặt cho chương trình thử ' +
           'nghiệm đầu tiên của mình.</p>' },

    { id: 'd3', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: 'Bài này dùng <code>arm-linux-gnueabihf-gcc</code> để đo bố cục của một kiến trúc ' +
         'khác. Hai lệnh dưới đây hỏi cùng một câu — "gói nào đã cài file này" — nhưng cho ' +
         'ra <b>hai tên gói khác nhau</b>. Cách đọc nào đúng? <i>(ôn <b>Bài 12</b>)</i>',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'which arm-linux-gnueabihf-gcc\n' +
          'dpkg -S "$(which arm-linux-gnueabihf-gcc)"\n' +
          'dpkg -S "$(readlink -f "$(which arm-linux-gnueabihf-gcc)")"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '/usr/bin/arm-linux-gnueabihf-gcc\n' +
          'gcc-arm-linux-gnueabihf: /usr/bin/arm-linux-gnueabihf-gcc\n' +
          'gcc-15-arm-linux-gnueabihf: /usr/bin/arm-linux-gnueabihf-gcc-15' },
      ],
      opts: [
        'Một trong hai gói đã cài đè lên gói kia; hệ thống đang ở trạng thái hỏng và cần ' +
        '<code>apt-get install --reinstall</code>',
        '<code>dpkg -S</code> chỉ tra được tên gói theo <b>chuỗi khớp</b>, nên tên nào dài ' +
        'hơn thì nó chọn — kết quả thứ hai chính xác hơn',
        '<code>/usr/bin/arm-linux-gnueabihf-gcc</code> là một liên kết do gói ' +
        '<b>không ghi số phiên bản</b> cài, nó trỏ tới binary thật ' +
        '<code>…-gcc-15</code> do gói <b>có số phiên bản</b> cài — hai gói, hai file, hai ' +
        'vai trò',
        'Hai gói này là hai bản dựng song song của cùng một trình biên dịch; gõ tên nào ' +
        'cũng chạy đúng một file'
      ],
      a: 2,
      why: 'Đây là mô hình đặt tên chuẩn của Debian/Ubuntu, gặp lại ở <b>mọi</b> bộ công cụ ' +
           'sau này (kernel headers, python, llvm). Gói ' +
           '<code>gcc-15-arm-linux-gnueabihf</code> chứa <b>binary thật</b>, có số phiên bản ' +
           'trong tên file, nên nhiều phiên bản cài song song được. Gói ' +
           '<code>gcc-arm-linux-gnueabihf</code> gần như <b>rỗng</b>: nó chỉ cài cái tên ' +
           'không phiên bản trỏ sang bản hiện hành — người ta gọi là gói ' +
           '<i>metapackage</i> / <i>alias</i>. Nhờ vậy bạn viết ' +
           '<code>arm-linux-gnueabihf-gcc</code> trong Makefile mà không phải sửa lại khi ' +
           'nâng lên GCC 16. Hai lệnh cho hai tên vì <code>dpkg -S</code> tra ' +
           '<b>đúng đường dẫn bạn đưa</b>: đường dẫn đầu là cái tên, đường dẫn sau — sau khi ' +
           '<code>readlink -f</code> đi hết chuỗi liên kết — là binary. Không có gì hỏng ' +
           'cả.' },
  ],

  /* ═══ E · Thực hành — 2 dự đoán + 2 gõ lệnh + 1 sửa lỗi + 1 thử thách ═══ */
  E: [
    { id: 'e1', k: 'free', tag: 'Dự đoán output', rows: 8,
      q: '<b>Viết dự đoán trước, chạy sau — thứ tự này là toàn bộ giá trị của câu ' +
         'này.</b><br><br>' +
         'Chương trình dưới đây in bố cục của hai struct chứa <b>cùng bốn trường</b>, chỉ ' +
         'khác thứ tự khai báo. Trước khi biên dịch, hãy viết ra dự đoán của bạn cho ' +
         '<b>cả sáu con số</b> mỗi dòng: <code>size</code>, <code>align</code>, và offset ' +
         'của bốn trường — cho <b>cả hai</b> struct. Rồi chạy và đối chiếu.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'mkdir -p ~/bt14 && cd ~/bt14\n' +
          'cat > lay.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '#include <stdint.h>\n' +
          '#include <stddef.h>\n' +
          '\n' +
          'struct sensor_a { uint8_t id; uint32_t value; uint8_t flag; uint16_t seq; };\n' +
          'struct sensor_b { uint32_t value; uint16_t seq; uint8_t id; uint8_t flag; };\n' +
          '\n' +
          'int main(void) {\n' +
          '    printf("sensor_a: size=%zu align=%zu | id=%zu value=%zu flag=%zu seq=%zu\\n",\n' +
          '           sizeof(struct sensor_a), _Alignof(struct sensor_a),\n' +
          '           offsetof(struct sensor_a, id), offsetof(struct sensor_a, value),\n' +
          '           offsetof(struct sensor_a, flag), offsetof(struct sensor_a, seq));\n' +
          '    printf("sensor_b: size=%zu align=%zu | value=%zu seq=%zu id=%zu flag=%zu\\n",\n' +
          '           sizeof(struct sensor_b), _Alignof(struct sensor_b),\n' +
          '           offsetof(struct sensor_b, value), offsetof(struct sensor_b, seq),\n' +
          '           offsetof(struct sensor_b, id), offsetof(struct sensor_b, flag));\n' +
          '    printf("sum of fields = %zu bytes\\n",\n' +
          '           sizeof(uint8_t) + sizeof(uint32_t) + sizeof(uint8_t) + sizeof(uint16_t));\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'gcc -Wall -Wextra -o lay lay.c && ./lay' },
      ],
      hint: 'Dựng từ offset 0 và áp đúng hai quy tắc: (1) một trường rộng <i>n</i> byte phải ' +
            'bắt đầu ở offset chia hết cho <i>n</i>; (2) kích thước struct phải chia hết cho ' +
            'căn lề lớn nhất trong nó.',
      crit: [
        'Đã <b>viết dự đoán ra trước</b> khi chạy — nếu bỏ bước này thì câu hỏi không còn tác dụng gì',
        '<code>sensor_a</code> đúng: <b>size=12 align=4</b>, <code>id=0 value=4 flag=8 seq=10</code>',
        '<code>sensor_b</code> đúng: <b>size=8 align=4</b>, <code>value=0 seq=4 id=6 flag=7</code>',
        'Nhận ra <code>sum of fields = 8</code> — tổng dữ liệu thật chỉ có 8 byte, nên <code>sensor_a</code> đang lãng phí <b>4 byte, tức 33 %</b>',
        'Chỉ ra đúng <b>vị trí</b> hai chỗ đệm trong <code>sensor_a</code>: 3 byte ở offset 1–3 (đẩy <code>value</code> lên bội số của 4) và 1 byte ở offset 9 (đẩy <code>seq</code> lên số chẵn)',
        'Nếu dự đoán sai, viết ra <b>quy tắc nào mình đã áp thiếu</b> — chứ không chỉ chép lại con số đúng'
      ],
      solBlocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'sensor_a: size=12 align=4 | id=0 value=4 flag=8 seq=10\n' +
          'sensor_b: size=8 align=4 | value=0 seq=4 id=6 flag=7\n' +
          'sum of fields = 8 bytes' },
        { t: 'p', x: '<b><code>sensor_a</code> — 12 byte cho 8 byte dữ liệu:</b>' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'offset : 0     1  2  3    4  5  6  7    8      9     10 11\n' +
          'field  : id    <-- PAD -->  value        flag   PAD   seq\n' +
          'size   : 1B    3 bytes      4B           1B     1B    2B' },
        { t: 'p', x: 'Ba byte đệm ở 1–3 để <code>value</code> (4 byte) bắt đầu ở offset chia ' +
          'hết cho 4. Một byte đệm ở 9 để <code>seq</code> (2 byte) bắt đầu ở offset chẵn. ' +
          'Kích thước 12 đã chia hết cho 4 nên <b>không</b> cần đệm đuôi.' },
        { t: 'p', x: '<b><code>sensor_b</code> — 8 byte, khít tuyệt đối:</b>' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'offset : 0  1  2  3    4  5     6     7\n' +
          'field  : value          seq     id    flag\n' +
          'size   : 4B             2B      1B    1B     (no padding at all)' },
        { t: 'cal', kind: 'why', x: 'Hai struct này chứa <b>y hệt</b> bốn trường, cùng kiểu, ' +
          'cùng ý nghĩa. Cái duy nhất bạn đổi là <b>thứ tự dòng khai báo</b> — một thay đổi ' +
          'không tốn gì, không đổi cách viết mã, không đổi tốc độ truy cập — và nó cắt bộ ' +
          'nhớ đi <b>một phần ba</b>. Đây là lý do <code>sizeof</code> phải được <i>đo</i> ' +
          'chứ không được <i>đoán</i>: nếu bạn đoán "1 + 4 + 1 + 2 = 8" thì bạn đã đúng về ' +
          'dữ liệu và sai 50 % về bộ nhớ thật.' }
      ] },

    { id: 'e2', k: 'free', tag: 'Dự đoán output', rows: 8,
      q: '<b>Lại viết dự đoán trước.</b> Chương trình dưới đây lấy một số 32 bit có giá trị ' +
         '<code>0x0A0B0C0D</code> — bốn byte rất dễ nhận mặt — rồi nhìn nó qua ba lăng ' +
         'kính: từng byte một, từng nửa 16 bit, và sau một phép xoay bit.<br><br>' +
         'Dự đoán cả <b>bảy</b> dòng đầu ra, kèm một câu giải thích cho dòng ' +
         '<code>after rotate</code>.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'cd ~/bt14\n' +
          'cat > bytes.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '#include <stdint.h>\n' +
          '\n' +
          'int main(void) {\n' +
          '    uint32_t v = 0x0A0B0C0D;\n' +
          '    uint8_t  *p = (uint8_t *)&v;\n' +
          '    uint16_t *h = (uint16_t *)&v;\n' +
          '    int i;\n' +
          '\n' +
          '    for (i = 0; i < 4; i++)\n' +
          '        printf("byte %d = %02X\\n", i, p[i]);\n' +
          '    printf("half 0 = %04X   half 1 = %04X\\n", h[0], h[1]);\n' +
          '\n' +
          '    v = (v >> 8) | (v << 24);\n' +
          '    printf("after rotate = %08X\\n", v);\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'gcc -Wall -Wextra -o bytes bytes.c && ./bytes' },
      ],
      hint: 'Hai câu hỏi hoàn toàn khác nhau, đừng trộn: <b>byte nằm ở đâu trong bộ nhớ</b> ' +
            '(do endianness quyết định) và <b>bit nào có trọng số bao nhiêu trong giá trị</b> ' +
            '(do toán học quyết định, giống nhau trên mọi máy). <code>p[i]</code> hỏi câu ' +
            'thứ nhất, <code>&gt;&gt;</code> và <code>&lt;&lt;</code> hỏi câu thứ hai.',
      crit: [
        'Đã viết dự đoán ra trước khi chạy',
        'Bốn byte đúng và <b>đúng thứ tự</b>: <code>byte 0 = 0D</code>, <code>byte 1 = 0C</code>, <code>byte 2 = 0B</code>, <code>byte 3 = 0A</code> — byte nhỏ nhất ở địa chỉ thấp nhất vì máy là little-endian',
        'Hai nửa đúng: <code>half 0 = 0C0D</code>, <code>half 1 = 0A0B</code> — mỗi nửa <i>bên trong</i> vẫn đọc theo giá trị, còn thứ tự <i>giữa</i> hai nửa mới bị đảo',
        '<code>after rotate = 0D0A0B0C</code>',
        'Giải thích đúng phép xoay: <code>v >> 8</code> cho <code>0x000A0B0C</code>, <code>v &lt;&lt; 24</code> cho <code>0x0D000000</code>, <code>|</code> ghép lại — <b>toán trên giá trị, không phải trên bố cục bộ nhớ</b>',
        'Nêu được điểm cốt lõi: kết quả xoay bit <b>giống nhau trên mọi kiến trúc</b>, còn kết quả <code>p[i]</code> thì <b>không</b> — đó là ranh giới giữa hai câu hỏi'
      ],
      solBlocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'byte 0 = 0D\n' +
          'byte 1 = 0C\n' +
          'byte 2 = 0B\n' +
          'byte 3 = 0A\n' +
          'half 0 = 0C0D   half 1 = 0A0B\n' +
          'after rotate = 0D0A0B0C' },
        { t: 'p', x: '<b>Bốn byte đầu tiên: bố cục bộ nhớ.</b> ' +
          '<code>0x0A0B0C0D</code> có byte trọng số nhỏ nhất là <code>0D</code>, và trên máy ' +
          'little-endian nó nằm ở <b>địa chỉ thấp nhất</b>. Nên đọc từ địa chỉ thấp lên cao ' +
          'bạn thấy <code>0D 0C 0B 0A</code> — <i>ngược</i> với cách bạn viết con số ra ' +
          'giấy. Đây là câu trả lời cho "byte nằm ở đâu", và nó phụ thuộc kiến trúc.' },
        { t: 'p', x: '<b>Hai nửa 16 bit</b> cho thấy quy tắc áp dụng đệ quy: ' +
          '<code>half 0</code> nằm ở địa chỉ thấp và nó là <b>nửa thấp</b> của giá trị ' +
          '(<code>0C0D</code>); <code>half 1</code> là nửa cao (<code>0A0B</code>). Bên ' +
          '<i>trong</i> mỗi nửa, <code>printf("%04X")</code> lại in theo giá trị nên nhìn ' +
          '"thuận" — chính sự nửa xuôi nửa ngược này làm little-endian khó hình dung lúc đầu.' },
        { t: 'p', x: '<b>Phép xoay: toán học thuần tuý.</b> ' +
          '<code>v >> 8</code> = <code>0x000A0B0C</code> (đẩy giá trị xuống 8 bit, ' +
          '<code>0D</code> rơi ra). <code>v &lt;&lt; 24</code> = <code>0x0D000000</code> ' +
          '(chỉ byte thấp nhất còn sống sót, lên vị trí cao nhất). <code>|</code> ghép hai ' +
          'kết quả: <code>0x0D0A0B0C</code>.' },
        { t: 'cal', kind: 'why', x: '<b>Đây là ranh giới cần nhớ suốt phần còn lại của khoá ' +
          'học:</b> phép dịch bit làm việc trên <b>giá trị</b> — <code>v >> 8</code> luôn ' +
          'nghĩa là "chia cho 256", trên mọi kiến trúc, không bao giờ khác. Ép kiểu con trỏ ' +
          'rồi đọc từng byte làm việc trên <b>bố cục bộ nhớ</b> — và cái đó thì khác nhau ' +
          'giữa các kiến trúc. Chính vì vậy cách tuần tự hoá đúng cho dữ liệu gửi ra ngoài ' +
          'là dùng phép dịch bit, chứ không phải <code>memcpy</code> nguyên khối (C4).' }
      ] },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh', rows: 8,
      q: 'Bạn đã <i>đọc</i> kỹ thuật này hai lần trong bộ bài tập (B1 và C1). Bây giờ ' +
         '<b>gõ nó ra từ đầu, không nhìn lại</b>.<br><br>' +
         'Nhiệm vụ: chứng minh rằng <code>arm-linux-gnueabihf</code> là ABI ' +
         '<b>ILP32</b> (<code>long</code> và con trỏ đều 4 byte) trong khi máy của bạn là ' +
         '<b>LP64</b> (đều 8 byte) — <b>không chạy một dòng lệnh nào trên bo mạch</b>, và ' +
         'không được dùng <code>printf</code>.<br><br>' +
         'Viết file <code>abi.c</code> và ba dòng lệnh cần gõ. Nêu rõ ' +
         '<b>tín hiệu nào là "đúng"</b> và tín hiệu nào là "sai" trong cách kiểm tra này.',
      hint: 'Có một cấu trúc của C cho phép <b>khẳng định một điều lúc biên dịch</b> và làm ' +
            'hỏng bản build nếu điều đó không đúng. Nó bắt đầu bằng <code>_Static</code>. ' +
            'Và bạn chỉ cần <code>-c -o /dev/null</code>: mục tiêu là <i>biên dịch được hay ' +
            'không</i>, không phải file kết quả.',
      crit: [
        'Dùng đúng <code>_Static_assert(điều_kiện, "thông báo");</code> ở <b>phạm vi file</b> — không cần hàm <code>main</code>, không cần chạy gì',
        'Có ít nhất hai khẳng định đúng chỗ: <code>sizeof(long) == 8</code> và <code>sizeof(void*) == 8</code>',
        'Gõ đúng ba lệnh, mỗi lệnh một trình biên dịch, dạng <code>&lt;cc&gt; -c -o /dev/null abi.c</code>',
        'Nêu đúng cách đọc tín hiệu: <b>im lặng = khẳng định đúng</b>, <b>báo lỗi = khẳng định sai</b> — tức "không có output" chính là kết quả dương tính, ngược với trực giác thông thường',
        'Kết quả đúng: <code>gcc</code> im lặng, <code>aarch64-linux-gnu-gcc</code> im lặng (arm64 cũng là LP64), <code>arm-linux-gnueabihf-gcc</code> báo <b>đúng hai</b> lỗi',
        'Nhận ra rằng khẳng định về <code>uint32_t</code> <b>không bao giờ</b> hỏng ở đâu cả — đó chính là điều làm <code>uint32_t</code> đáng dùng thay cho <code>long</code>',
        'Nêu được ứng dụng thật: đặt các khẳng định này cạnh khai báo struct dùng chung, rồi biên dịch header bằng <b>mọi</b> toolchain trong CI — sai ABI bị chặn ở giây thứ nhất, không phải ở tuần thứ mười'
      ],
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'cd ~/bt14\n' +
          'cat > abi.c <<\'EOF\'\n' +
          '#include <stdint.h>\n' +
          '_Static_assert(sizeof(long)  == 8, "long is not 64-bit here");\n' +
          '_Static_assert(sizeof(void*) == 8, "pointer is not 64-bit here");\n' +
          '_Static_assert(sizeof(uint32_t) == 4, "uint32_t is not 32-bit here");\n' +
          'EOF\n' +
          'gcc                    -c -o /dev/null abi.c\n' +
          'aarch64-linux-gnu-gcc  -c -o /dev/null abi.c\n' +
          'arm-linux-gnueabihf-gcc -c -o /dev/null abi.c' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'abi.c:2:1: error: static assertion failed: "long is not 64-bit here"\n' +
          '    2 | _Static_assert(sizeof(long)  == 8, "long is not 64-bit here");\n' +
          '      | ^~~~~~~~~~~~~~\n' +
          'abi.c:3:1: error: static assertion failed: "pointer is not 64-bit here"\n' +
          '    3 | _Static_assert(sizeof(void*) == 8, "pointer is not 64-bit here");\n' +
          '      | ^~~~~~~~~~~~~~' },
        { t: 'p', x: '<b>Hai lệnh đầu không in gì.</b> Đó không phải là chúng bị bỏ qua — ' +
          'đó là kết quả: cả ba khẳng định đều đúng trên x86-64 và trên arm64, vì cả hai đều ' +
          'là LP64. Chỉ lệnh thứ ba nói chuyện, và nó nói đúng hai câu.' },
        { t: 'cal', kind: 'tip', x: '<b>Cách đọc tín hiệu ở đây ngược với thói quen:</b> ' +
          '"không có output" là <i>dương tính</i>, "có output" là <i>âm tính</i>. Hãy quen ' +
          'với nó — hầu hết các công cụ kiểm tra lúc biên dịch (<code>_Static_assert</code>, ' +
          '<code>-Wpadded</code>, <code>-Werror</code>) đều hoạt động theo kiểu này. Muốn ' +
          'chắc mình không đọc nhầm sự im lặng, kiểm tra <code>$?</code>: 0 là qua, khác 0 ' +
          'là hỏng.' },
        { t: 'p', x: '<b>Và hãy chú ý cái <i>không</i> hỏng:</b> khẳng định ' +
          '<code>sizeof(uint32_t) == 4</code> đúng ở cả ba trình biên dịch, và sẽ đúng ở mọi ' +
          'trình biên dịch bạn gặp. Đó chính xác là lý do tồn tại của ' +
          '<code>&lt;stdint.h&gt;</code>: <code>long</code> là một lời hứa mơ hồ, ' +
          '<code>uint32_t</code> là một hợp đồng.' },
        { t: 'p', x: '<b>Dùng nó thật:</b> đặt <code>_Static_assert</code> ngay dưới mọi ' +
          'struct đi qua ranh giới (file, mạng, bộ nhớ chia sẻ với bo mạch khác), khẳng định ' +
          '<code>sizeof</code> và <code>offsetof</code> của từng trường. Rồi cho CI biên ' +
          'dịch header đó bằng tất cả các toolchain của dự án. Bài tập bạn vừa làm mất chưa ' +
          'tới một giây máy — và nó bắt được đúng loại lỗi đã ngốn của người khác cả tuần.' }
      ] },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh', rows: 7,
      q: 'Bạn không muốn phải tự tính byte đệm mỗi lần sửa một struct. Hãy bắt ' +
         '<b>trình biên dịch</b> tự tố cáo nó.<br><br>' +
         '<b>(a)</b> Tìm và gõ đúng cờ cảnh báo làm việc này, áp lên file ' +
         '<code>lay.c</code> ở E1. <b>(b)</b> Đọc kết quả: nó báo mấy chỗ, ở struct nào? ' +
         '<b>(c)</b> Trả lời câu quan trọng: vì sao struct còn lại <b>không</b> bị báo gì ' +
         'cả? <b>(d)</b> Vì sao cờ này <i>không</i> nằm trong <code>-Wall -Wextra</code>, và ' +
         'khi nào thì bạn nên bật nó?',
      hint: 'Tên cờ ghép từ <code>-W</code> và đúng cái từ tiếng Anh chỉ "byte đệm". Dùng ' +
            '<code>-c -o /dev/null</code> vì bạn chỉ cần cảnh báo, không cần file .o. Nhớ ' +
            'bài học ở D1 nếu bạn định nối kết quả vào <code>grep</code>.',
      crit: [
        'Gõ đúng cờ: <code>-Wpadded</code>, ví dụ <code>gcc -Wall -Wextra -Wpadded -c -o /dev/null lay.c</code>',
        'Đọc đúng kết quả: <b>hai</b> cảnh báo, cả hai đều ở <code>sensor_a</code> — một cho <code>value</code>, một cho <code>seq</code>',
        'Nêu đúng lý do <code>sensor_b</code> im lặng: nó <b>không có byte đệm nào</b>, không phải vì cờ bỏ sót nó',
        'Nhận ra cảnh báo trỏ vào <b>trường bị đẩy đi</b> (<code>value</code>, <code>seq</code>), chứ không trỏ vào trường gây ra việc đẩy — cần đọc ngược lại một bước để biết nên chuyển trường nào',
        '(d) Nêu đúng vì sao nó không nằm trong <code>-Wall -Wextra</code>: byte đệm là <b>bình thường và hầu như luôn vô hại</b>; bật mặc định thì mọi struct trên đời đều kêu, và cảnh báo bị kêu quá nhiều là cảnh báo bị bỏ qua',
        '(d) Nêu đúng lúc nên bật: cho các struct <b>nhạy về bộ nhớ</b> hoặc <b>đi qua ranh giới</b> — thường là bật cho một file riêng chứa các struct đó, không bật cho cả dự án',
        'Có nhắc rằng cảnh báo đi ra <b>stderr</b>, nên muốn đếm hay lọc thì phải <code>2&gt;&amp;1</code> trước (D1)'
      ],
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'cd ~/bt14\n' +
          'gcc -Wall -Wextra -Wpadded -c -o /dev/null lay.c' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'lay.c:5:40: warning: padding struct to align ‘value’ [-Wpadded]\n' +
          '    5 | struct sensor_a { uint8_t id; uint32_t value; uint8_t flag; uint16_t seq; };\n' +
          '      |                                        ^~~~~\n' +
          'lay.c:5:70: warning: padding struct to align ‘seq’ [-Wpadded]\n' +
          '    5 | struct sensor_a { uint8_t id; uint32_t value; uint8_t flag; uint16_t seq; };\n' +
          '      |                                                                      ^~~' },
        { t: 'p', x: '<b>(b)</b> Đúng hai cảnh báo, cả hai ở dòng 5 — tức ' +
          '<code>sensor_a</code>. Chúng khớp chính xác với hai chỗ đệm bạn đã tự vẽ ở E1: ' +
          'một trước <code>value</code>, một trước <code>seq</code>.' },
        { t: 'p', x: '<b>(c) <code>sensor_b</code> im lặng vì nó thật sự không có byte đệm ' +
          'nào.</b> Đây là điểm phải khẳng định rõ với bản thân: sự im lặng ở đây là một ' +
          '<i>kết quả</i>, không phải một chỗ công cụ bỏ sót. Cùng một lệnh, cùng một file, ' +
          'một struct kêu và một struct không — đó là bằng chứng cờ đang hoạt động.' },
        { t: 'cal', kind: 'tip', x: '<b>Một chi tiết dễ hiểu ngược:</b> cảnh báo trỏ mũi tên ' +
          'vào <code>value</code> và <code>seq</code> — tức các trường <b>bị đẩy đi</b>, ' +
          'không phải trường <b>gây ra</b> việc đẩy. Muốn sửa, bạn phải đọc ngược lại một ' +
          'bước: cái gì đứng <i>trước</i> nó và làm nó lệch? Ở đây là <code>id</code> ' +
          '(1 byte) đứng trước <code>value</code> (4 byte).' },
        { t: 'p', x: '<b>(d) Vì sao <code>-Wpadded</code> không nằm trong ' +
          '<code>-Wall -Wextra</code>:</b> vì byte đệm là chuyện <b>bình thường</b> và trong ' +
          '99 % chương trình là hoàn toàn vô hại. Nếu bật mặc định, gần như mọi struct trong ' +
          'mọi thư viện hệ thống sẽ kêu, và bạn sẽ học được thói quen tệ nhất trong nghề: ' +
          '<i>lướt qua cảnh báo</i>. Một cảnh báo chỉ có giá trị khi nó hiếm.' },
        { t: 'p', x: '<b>Khi nào nên bật:</b> khi struct đó <i>đắt</i> — nó nhân lên hàng ' +
          'nghìn lần trong RAM có hạn, hoặc nó đi qua một ranh giới (file, mạng, bộ nhớ chia ' +
          'sẻ). Cách làm thực tế: gom các struct đó vào một file riêng và chỉ bật ' +
          '<code>-Wpadded</code> cho file ấy, thay vì bật cho cả dự án. Và vì cảnh báo đi ra ' +
          '<b>stderr</b>, nếu muốn đếm hay lọc thì nhớ <code>2&gt;&amp;1</code> trước khi ' +
          'nối ống — đúng cái bẫy ở D1.' }
      ] },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi', rows: 12,
      q: 'File dưới đây biên dịch được, chạy được, <b>không sập</b> — và có ' +
         '<b>bốn</b> lỗi, trong đó chỉ có một lỗi được trình biên dịch nhắc tới.<br><br>' +
         'Hãy chạy nó, đọc cả cảnh báo lẫn output, rồi với <b>từng</b> lỗi: chỉ ra dòng, nói ' +
         'nó gây hại gì <b>trên thực tế</b>, và viết cách sửa. Cuối cùng trả lời một câu: ' +
         '<b>ba lỗi còn lại vì sao trình biên dịch không nói gì?</b>',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'cd ~/bt14\n' +
          'cat > buggy.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '#include <stdint.h>\n' +
          '#include <string.h>\n' +
          '\n' +
          'struct packet { uint8_t type; uint32_t len; uint8_t crc; };\n' +
          '\n' +
          'static void dump(uint8_t buf[], int n)\n' +
          '{\n' +
          '    printf("inside dump: sizeof(buf) = %zu, n = %d\\n", sizeof(buf), n);\n' +
          '    memset(buf, 0, sizeof(buf));\n' +
          '}\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    uint8_t raw[20];\n' +
          '    struct packet p = { 1, 260, 0xAB };\n' +
          '    int mask = 1 << 31;\n' +
          '    uint8_t wire[6] = { 1, 4, 1, 0, 0, 0xAB };\n' +
          '\n' +
          '    printf("outside: sizeof(raw) = %zu\\n", sizeof(raw));\n' +
          '    dump(raw, 20);\n' +
          '\n' +
          '    printf("sizeof(struct packet) = %zu, we will send %zu bytes\\n",\n' +
          '           sizeof(p), sizeof(p));\n' +
          '    printf("mask = %d (0x%08X)\\n", mask, (unsigned)mask);\n' +
          '\n' +
          '    printf("len read back from wire = %u\\n", *(uint32_t *)(wire + 1));\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'gcc -Wall -Wextra -o buggy buggy.c\n' +
          './buggy' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'outside: sizeof(raw) = 20\n' +
          'inside dump: sizeof(buf) = 8, n = 20\n' +
          'sizeof(struct packet) = 12, we will send 12 bytes\n' +
          'mask = -2147483648 (0x80000000)\n' +
          'len read back from wire = 260' },
      ],
      hint: 'Bốn dòng output đầu tiên, mỗi dòng chứa đúng một lỗi. So dòng 1 với dòng 2. ' +
            'Dòng 3: đếm tổng cỡ các trường rồi so với con số in ra. Dòng 4: dấu của kết ' +
            'quả. Dòng 5: nó <i>ra đúng</i> — và đó chính là vấn đề.',
      crit: [
        '<b>Lỗi 1</b> (dòng 9 và 10): mảng làm tham số hàm <b>suy biến thành con trỏ</b>, nên <code>sizeof(buf)</code> = <b>8</b> (cỡ con trỏ) chứ không phải 20. Bằng chứng ngay trong output: 20 ở ngoài, 8 ở trong',
        '<b>Lỗi 1 gây hại gì:</b> <code>memset(buf, 0, sizeof(buf))</code> chỉ xoá <b>8 trên 20 byte</b> — bộ đệm coi như đã sạch nhưng 12 byte cũ vẫn còn; sửa bằng cách <b>truyền độ dài</b> và dùng <code>memset(buf, 0, n)</code>',
        '<b>Lỗi 2</b> (dòng 5 + dòng 23): gửi <code>sizeof(struct packet)</code> = <b>12</b> byte trong khi dữ liệu thật chỉ có <b>6</b> byte — 6 byte đệm <b>không xác định</b> bị đẩy lên đường truyền; sửa bằng cách <b>tuần tự hoá tường minh</b> từng trường',
        '<b>Lỗi 3</b> (dòng 17): <code>1 &lt;&lt; 31</code> trên <code>int</code> đẩy bit vào <b>bit dấu</b> → giá trị <b>-2147483648</b>, và dịch phải sau đó sẽ nhân bản bit dấu; sửa thành <code>1u &lt;&lt; 31</code> với biến <code>uint32_t</code>',
        '<b>Lỗi 4</b> (dòng 26): <code>*(uint32_t *)(wire + 1)</code> đọc 4 byte tại địa chỉ <b>lệch</b> (offset 1) và diễn giải theo <b>endianness của máy</b> — hai vấn đề trong một dòng',
        '<b>Lỗi 4 gây hại gì:</b> nó <b>in ra đúng 260</b> trên x86-64, nên bài kiểm thử qua; trên nhiều lõi ARM cùng dòng đó chậm nhiều lần hoặc sinh <i>alignment fault</i>, và trên máy big-endian nó ra số khác — sửa bằng cách ghép tay từng byte',
        'Đọc đúng cảnh báo trình biên dịch có in: <code>-Wsizeof-array-argument</code> ở dòng 9 và 10, cộng <code>-Wsizeof-pointer-memaccess</code> ở dòng 10 — <b>chỉ lỗi 1</b>',
        'Trả lời đúng câu cuối: ba lỗi kia là <b>C hợp lệ</b>. Trình biên dịch không biết bạn định gửi struct ra ngoài, không biết bạn không muốn số âm, không biết <code>wire</code> là dữ liệu từ mạng — nó chỉ thấy các phép toán hợp pháp',
        'Rút ra đúng bài học: <code>-Wall -Wextra</code> là <b>sàn</b>, không phải trần; ba lớp lỗi này chỉ chặn được bằng <b>quy ước thiết kế</b> (tuần tự hoá tường minh, luôn dùng kiểu không dấu cho thao tác bit, không bao giờ ép kiểu con trỏ lên dữ liệu thô)'
      ],
      solBlocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'buggy.c: In function ‘dump’:\n' +
          'buggy.c:9:62: warning: ‘sizeof’ on array function parameter ‘buf’ will return size of ‘uint8_t *’ {aka ‘unsigned char *’} [-Wsizeof-array-argument]\n' +
          '    9 |     printf("inside dump: sizeof(buf) = %zu, n = %d\\n", sizeof(buf), n);\n' +
          '      |                                                              ^\n' +
          'buggy.c:7:26: note: declared here\n' +
          '    7 | static void dump(uint8_t buf[], int n)\n' +
          '      |                  ~~~~~~~~^~~~~\n' +
          'buggy.c:10:26: warning: ‘sizeof’ on array function parameter ‘buf’ will return size of ‘uint8_t *’ {aka ‘unsigned char *’} [-Wsizeof-array-argument]\n' +
          '   10 |     memset(buf, 0, sizeof(buf));\n' +
          '      |                          ^\n' +
          'buggy.c:10:26: warning: argument to ‘sizeof’ in ‘memset’ call is the same expression as the destination; did you mean to provide an explicit length? [-Wsizeof-pointer-memaccess]\n' +
          '   10 |     memset(buf, 0, sizeof(buf));\n' +
          '      |                          ^' },
        { t: 'p', x: '<b>Lỗi 1 — mảng suy biến thành con trỏ (dòng 9, 10).</b> Bằng chứng ' +
          'nằm ngay trong hai dòng output đầu: <code>sizeof(raw) = 20</code> ở ngoài, ' +
          '<code>sizeof(buf) = 8</code> ở trong. Cú pháp <code>uint8_t buf[]</code> trong ' +
          'danh sách tham số là <b>lời nói dối của C</b>: nó thật sự có nghĩa ' +
          '<code>uint8_t *buf</code>. Mảng không bao giờ được truyền vào hàm; chỉ địa chỉ ' +
          'phần tử đầu được truyền. Nên <code>sizeof</code> trả về cỡ con trỏ = 8.' },
        { t: 'p', x: 'Hậu quả thật nằm ở dòng 10: <code>memset(buf, 0, sizeof(buf))</code> ' +
          'xoá <b>8 trên 20 byte</b>. Bộ đệm được coi là đã sạch, nhưng 12 byte cuối vẫn giữ ' +
          'nguyên nội dung cũ — và nếu đó là bộ đệm gửi đi, bạn vừa rò rỉ 12 byte dữ liệu cũ ' +
          'ra ngoài. <b>Sửa:</b> đã có sẵn tham số <code>n</code>, hãy dùng nó — ' +
          '<code>memset(buf, 0, n);</code>. Nguyên tắc chung: <b>hàm nhận mảng thì phải ' +
          'nhận kèm độ dài</b>, luôn luôn, không có ngoại lệ.' },
        { t: 'p', x: '<b>Lỗi 2 — gửi struct thô ra ngoài (dòng 5 và 23).</b> Bốn trường ' +
          'thật chỉ chiếm <code>1 + 4 + 1 = 6</code> byte, nhưng ' +
          '<code>sizeof(struct packet)</code> = <b>12</b>. Sáu byte chênh lệch là byte đệm, ' +
          'và <b>nội dung của chúng không xác định</b> — chúng là bất cứ thứ gì còn sót trên ' +
          'ngăn xếp. Bạn vừa đẩy 6 byte rác ra đường truyền, và số byte đó còn thay đổi theo ' +
          'trình biên dịch. <b>Sửa:</b> viết hàm ' +
          '<code>encode(const struct packet *p, uint8_t out[6])</code> ghi từng trường theo ' +
          'thứ tự bạn quy định. Struct dùng cho bộ nhớ; đường truyền dùng byte.' },
        { t: 'p', x: '<b>Lỗi 3 — <code>1 &lt;&lt; 31</code> trên kiểu có dấu (dòng 17).</b> ' +
          '<code>int</code> có 32 bit, bit cao nhất là <b>bit dấu</b>. Dịch số 1 sang trái 31 ' +
          'lần đặt nó đúng vào đó, nên <code>mask</code> in ra ' +
          '<b>-2147483648</b>. Bit pattern <code>0x80000000</code> đúng như bạn muốn, nhưng ' +
          '<i>giá trị</i> thì âm — và mọi so sánh, mọi phép chia, mọi lần dịch phải sau đó ' +
          'sẽ hành xử khác (dịch phải số âm nhân bản bit dấu: ' +
          '<code>-2147483648 >> 4</code> = <code>-134217728</code>, không phải ' +
          '<code>134217728</code>). <b>Sửa:</b> ' +
          '<code>uint32_t mask = 1u &lt;&lt; 31;</code> — chữ <code>u</code> và kiểu không ' +
          'dấu, cả hai. Quy tắc: <b>thao tác bit thì luôn dùng kiểu không dấu</b>.' },
        { t: 'p', x: '<b>Lỗi 4 — ép kiểu con trỏ lên dữ liệu thô (dòng 26).</b> ' +
          '<code>*(uint32_t *)(wire + 1)</code> phạm hai lỗi cùng lúc: nó đọc 4 byte tại ' +
          'offset <b>1</b> (địa chỉ lệch, trong khi <code>uint32_t *</code> hứa hẹn địa chỉ ' +
          'chia hết cho 4), và nó diễn giải bốn byte đó theo <b>endianness của máy đang ' +
          'chạy</b>, chứ không theo quy ước của giao thức.' },
        { t: 'cal', kind: 'warn', x: '<b>Và đây là lỗi nguy hiểm nhất trong bốn lỗi, vì nó ' +
          'in ra <i>đúng</i>.</b> <code>len read back from wire = 260</code> — con số mong ' +
          'đợi. Bài kiểm thử qua, code review qua, sản phẩm xuất xưởng. Rồi trên bo mạch ARM ' +
          'thật, cùng dòng đó chậm gấp nhiều lần vì CPU phải ghép byte, hoặc sinh thẳng ' +
          '<i>alignment fault</i>; và trên một SoC big-endian nó trả về một số hoàn toàn ' +
          'khác. <b>Một dòng chạy đúng trên máy bạn không phải là một dòng đúng.</b> ' +
          '<b>Sửa:</b> ghép tay — ' +
          '<code>uint32_t len = wire[1] | (wire[2] &lt;&lt; 8) | (wire[3] &lt;&lt; 16) | ((uint32_t)wire[4] &lt;&lt; 24);</code> ' +
          '— không lệch, không phụ thuộc kiến trúc.' },
        { t: 'p', x: '<b>Vì sao trình biên dịch chỉ nói về lỗi 1:</b> vì ba lỗi kia là ' +
          '<b>C hoàn toàn hợp lệ</b>. <code>gcc</code> không biết bạn định gửi struct ra khỏi ' +
          'máy, không biết bạn không muốn một giá trị âm, không biết <code>wire</code> chứa ' +
          'dữ liệu đến từ bên ngoài. Nó chỉ thấy các phép toán hợp pháp trên các kiểu hợp ' +
          'lệ. Lỗi 1 được nhắc chỉ vì <code>sizeof</code> trên tham số mảng gần như ' +
          '<i>không bao giờ</i> là ý định thật của ai cả — GCC nhận ra khuôn mẫu đó, chứ ' +
          'không suy luận được ý định của bạn.' },
        { t: 'cal', kind: 'why', x: '<b>Bài học của cả câu này:</b> ' +
          '<code>-Wall -Wextra</code> là <b>sàn</b> chứ không phải trần. Ba lớp lỗi còn lại ' +
          'chỉ chặn được bằng <b>quy ước thiết kế</b> mà bạn tự đặt và tuân thủ: (1) mảng ' +
          'luôn đi kèm độ dài; (2) dữ liệu ra khỏi máy luôn được tuần tự hoá tường minh; ' +
          '(3) thao tác bit luôn trên kiểu không dấu; (4) không bao giờ ép kiểu con trỏ lên ' +
          'một mảng byte thô. Bốn dòng đó đáng dán lên tường.' }
      ] },

    { id: 'e6', k: 'free', tag: 'Thử thách', rows: 8,
      q: '<b>Câu này được phép chưa trả lời trọn vẹn — Bài 15 sẽ trả lời nốt.</b><br><br>' +
         '<code>sizeof(struct packet)</code> bằng 12. Câu hỏi: <b>ai tính ra con số 12, và ' +
         'tính vào lúc nào?</b> Có ba ứng viên — bộ tiền xử lý (giai đoạn văn bản), trình ' +
         'biên dịch (giai đoạn sinh assembly), hay chính chương trình lúc chạy?<br><br>' +
         'Đừng đoán: <b>hãy đi tìm bằng chứng</b>. Bạn có thể bảo <code>gcc</code> dừng lại ' +
         'sau từng giai đoạn và đọc thứ nó sinh ra. Tìm cho ra <b>giai đoạn cuối cùng</b> mà ' +
         'chữ <code>sizeof</code> vẫn còn tồn tại, và <b>giai đoạn đầu tiên</b> mà con số ' +
         '12 xuất hiện. Rồi rút ra hệ quả: điều này nói gì về việc chuyển mã sang một kiến ' +
         'trúc khác?',
      hint: 'Hai cờ đáng thử: một cờ dừng sau bước xử lý văn bản, một cờ dừng sau bước sinh ' +
            'assembly. Cả hai đều là chữ hoa. Rồi dùng <code>grep</code> (Bài 11) trên hai ' +
            'file kết quả — tìm chữ <code>sizeof</code> ở file thứ nhất và tìm số ' +
            '<code>12</code> ở file thứ hai.',
      crit: [
        'Tìm ra và dùng đúng <code>gcc -E</code> (dừng sau tiền xử lý) và <code>gcc -S</code> (dừng sau sinh assembly)',
        'Chứng minh được rằng sau <code>-E</code>, chữ <code>sizeof</code> <b>vẫn còn nguyên</b> trong file <code>.i</code> — tiền xử lý <b>không</b> tính nó',
        'Chứng minh được rằng trong file <code>.s</code>, <code>sizeof</code> đã <b>biến mất</b> và con số <code>12</code> xuất hiện dưới dạng hằng số (<code>movl $12, %esi</code>)',
        'Kết luận đúng: <b>trình biên dịch</b> tính, và tính ở <b>giai đoạn 2</b> — không phải tiền xử lý, cũng không phải lúc chạy',
        'Nêu được vì sao tiền xử lý <b>không thể</b> tính: nó chỉ thao tác trên văn bản, nó không biết gì về kiểu, về căn lề, về kiến trúc đích',
        'Nhận ra quy mô của bước tiền xử lý: <code>sz.c</code> có <b>10</b> dòng, <code>sz.i</code> có <b>922</b> dòng',
        'Rút ra đúng hệ quả về chuyển kiến trúc: vì con số bị <b>đóng băng lúc biên dịch</b> theo ABI của đích, đổi trình biên dịch chéo là đổi con số — nên phải <b>biên dịch lại</b>, và mọi giá trị <code>sizeof</code> đã ghi ra file/đường truyền trước đó không còn đúng',
        'Ghi lại ít nhất một câu hỏi <b>chưa trả lời được</b> để mang sang Bài 15 (ví dụ: 922 dòng đó từ đâu ra? bước thứ 4 sau assembly là gì?)'
      ],
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'cd ~/bt14\n' +
          'cat > sz.c <<\'EOF\'\n' +
          '#include <stdio.h>\n' +
          '#include <stdint.h>\n' +
          '\n' +
          'struct packet { uint8_t type; uint32_t len; uint8_t crc; };\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    printf("%zu\\n", sizeof(struct packet));\n' +
          '    return 0;\n' +
          '}\n' +
          'EOF\n' +
          'gcc -E sz.c -o sz.i        # stop after stage 1\n' +
          'gcc -S sz.c -o sz.s        # stop after stage 2\n' +
          'wc -l < sz.c ; wc -l < sz.i\n' +
          'grep -n \'sizeof\' sz.i\n' +
          'grep -n \'\\$12\' sz.s' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '10\n' +
          '922\n' +
          '322:  char _unused2[12 * sizeof (int) - 5 * sizeof (void *)];\n' +
          '920:    printf("%zu\\n", sizeof(struct packet));\n' +
          '19:\tmovl\t$12, %esi' },
        { t: 'p', x: '<b>Bằng chứng thứ nhất: sau giai đoạn 1, <code>sizeof</code> vẫn còn ' +
          'nguyên.</b> Dòng 920 của <code>sz.i</code> chính là dòng bạn viết, chép lại ' +
          '<i>từng chữ</i>. Bộ tiền xử lý đã kéo về hàng trăm dòng header, nhưng nó ' +
          '<b>không hề động tới <code>sizeof</code></b>.' },
        { t: 'p', x: 'Vì sao nó không thể: bộ tiền xử lý chỉ biết <b>văn bản</b> — cắt, dán, ' +
          'thay thế. Nó không biết <code>uint8_t</code> rộng mấy byte, không biết quy tắc ' +
          'căn lề, không biết đang biên dịch cho kiến trúc nào. Muốn tính ra 12 thì phải ' +
          'biết cả ba, và cả ba đều là kiến thức của <b>trình biên dịch</b>. (Dòng 322 là ' +
          'quà tặng kèm: một struct trong header hệ thống cũng dùng <code>sizeof</code> để ' +
          'tự tính phần đệm của nó — cùng một kỹ thuật, viết bởi người làm thư viện chuẩn.)' },
        { t: 'p', x: '<b>Bằng chứng thứ hai: sau giai đoạn 2, <code>sizeof</code> đã biến ' +
          'mất.</b> Dòng 19 của <code>sz.s</code> là ' +
          '<code>movl $12, %esi</code> — nạp <b>hằng số 12</b> vào thanh ghi làm đối số cho ' +
          '<code>printf</code>. Không còn phép tính nào, không còn cái tên ' +
          '<code>sizeof</code> nào. Con số đã bị <b>đóng băng vào mã máy</b>.' },
        { t: 'cal', kind: 'why', x: '<b>Kết luận: trình biên dịch tính, ở giai đoạn 2.</b> ' +
          'Không phải tiền xử lý (nó không đủ hiểu biết), không phải lúc chạy (chương trình ' +
          'không tốn một chu kỳ CPU nào cho việc này). <code>sizeof</code> là một ' +
          '<b>toán tử lúc biên dịch</b>, và đó là lý do bạn có thể đặt nó vào ' +
          '<code>_Static_assert</code> ở E3 — muốn khẳng định một điều <i>lúc biên dịch</i> ' +
          'thì điều đó phải <i>biết được lúc biên dịch</i>.' },
        { t: 'p', x: '<b>Hệ quả về chuyển kiến trúc — đây là phần đáng giá nhất:</b> nếu ' +
          'con số bị đóng băng lúc biên dịch theo ABI của <i>đích</i>, thì đổi trình biên ' +
          'dịch chéo là đổi con số. Cùng file <code>sz.c</code>, ' +
          '<code>arm-linux-gnueabihf-gcc -S</code> sẽ sinh ra một hằng số khác cho những ' +
          'struct có <code>long</code> hoặc con trỏ. Ba điều rút ra: (1) không bao giờ ' +
          'dùng lại file <code>.o</code> giữa hai kiến trúc — phải biên dịch lại; ' +
          '(2) mọi kích thước bạn đã <i>ghi ra</i> file hay đường truyền đều là số của ' +
          'kiến trúc cũ; (3) <code>_Static_assert</code> là cách rẻ nhất để bắt cả hai điều ' +
          'trên.' },
        { t: 'cal', kind: 'tip', x: '<b>Mang gì sang Bài 15:</b> bạn vừa dùng ' +
          '<code>-E</code> và <code>-S</code> mà chưa biết còn mấy giai đoạn nữa, và bạn vừa ' +
          'thấy 10 dòng nở thành <b>922</b> dòng mà chưa biết chúng từ đâu ra. Hãy ghi hai ' +
          'câu hỏi đó lại — Bài 15 <i>Quá trình biên dịch</i> mở đúng vào chỗ này: bốn giai ' +
          'đoạn, cách dừng lại sau từng giai đoạn, và vì sao một chương trình 10 dòng lại ' +
          'cần tới gần một nghìn dòng khai báo.' }
      ] },
  ],

  /* ═══ F · Bí ở đâu thì đọc lại đâu ═══ */
  diag: [
    ['A1, B1, C1, E3',
     'Bạn còn coi <code>int</code> và <code>long</code> là "32 bit và 64 bit". Chúng ' +
     '<b>không có độ rộng cố định</b> — độ rộng do ABI của kiến trúc đích quyết định, và ' +
     'đó là nguồn gốc của cả lớp lỗi struct lệch giữa hai máy.',
     '<a href="#/bai-14#kieu-du-lieu-bo-int-di-dung-uint32-t">Đọc lại Bài 14 · Kiểu dữ liệu: bỏ int đi, dùng uint32_t</a>'],

    ['A2, B2, C2, E1',
     'Bạn còn tính <code>sizeof(struct)</code> bằng cách cộng cỡ các trường. Trình biên ' +
     'dịch chèn <b>byte đệm</b> để mọi trường nằm ở địa chỉ căn lề đúng, nên tổng ' +
     '≠ <code>sizeof</code>, và <b>đổi thứ tự khai báo là đổi kích thước</b>.',
     '<a href="#/bai-14#struct-can-le-va-byte-dem">Đọc lại Bài 14 · struct, căn lề và byte đệm</a>'],

    ['C5, B6, E4',
     'Bạn còn nghĩ <code>__attribute__((packed))</code> là cách đúng để struct nhỏ lại. ' +
     'Trong ví dụ của bộ bài tập này nó nhỏ <b>bằng đúng</b> cách sắp lại thứ tự (8 = 8) ' +
     'nhưng phải trả giá bằng truy cập lệch. Đọc lại phần đo <code>-Wpadded</code> và ' +
     'phần bàn về packed.',
     '<a href="#/bai-14#struct-can-le-va-byte-dem">Đọc lại Bài 14 · struct, căn lề và byte đệm</a>'],

    ['A5, B3, C3',
     'Bạn chưa nắm <code>volatile</code>. Điểm mấu chốt: nó <b>chỉ lộ ra khi bật tối ' +
     'ưu</b> — <code>-O0</code> chạy đúng, <code>-O2</code>/<code>-Os</code> treo — và nó ' +
     'bảo đảm <i>đọc lại</i> chứ <b>không</b> bảo đảm <i>nguyên tử</i>.',
     '<a href="#/bai-14#volatile-tu-khoa-cuu-ban-khoi-chinh-trinh-bien-dich">Đọc lại Bài 14 · volatile: từ khoá cứu bạn khỏi chính trình biên dịch</a>'],

    ['A3, C4, E2',
     'Bạn còn lẫn giữa <b>thứ tự byte trong bộ nhớ</b> (endianness, khác nhau giữa các ' +
     'kiến trúc) và <b>trọng số bit trong giá trị</b> (toán học, giống nhau ở mọi nơi). ' +
     'Đây là ranh giới quyết định cách tuần tự hoá dữ liệu gửi ra ngoài.',
     '<a href="#/bai-14#thu-tu-byte-little-endian-va-big-endian">Đọc lại Bài 14 · Thứ tự byte: little-endian và big-endian</a>'],

    ['A4, A6, B5, E5',
     'Bạn chưa phân biệt <b>mảng</b> với <b>con trỏ</b>, hoặc chưa quen số học con trỏ. ' +
     'Hai điểm phải thuộc: <code>p + 1</code> nhảy <code>sizeof(*p)</code> byte, và mảng ' +
     'truyền vào hàm <b>suy biến thành con trỏ</b> nên <code>sizeof</code> bên trong hàm ' +
     'trả về cỡ con trỏ.',
     '<a href="#/bai-14#con-tro-chi-la-mot-so-nhung-la-mot-so-co-kieu">Đọc lại Bài 14 · Con trỏ: chỉ là một số, nhưng là một số có kiểu</a>'],

    ['A7, E5 (lỗi 3)',
     'Bạn chưa vững thao tác bit trên thanh ghi: đặt bit bằng <code>|=</code>, xoá bằng ' +
     '<code>&amp;= ~</code>, và <b>luôn dùng kiểu không dấu</b> — <code>1 &lt;&lt; 31</code> ' +
     'trên <code>int</code> rơi vào bit dấu và cho ra số âm.',
     '<a href="#/bai-14#thao-tac-bit-ngon-ngu-cua-thanh-ghi">Đọc lại Bài 14 · Thao tác bit: ngôn ngữ của thanh ghi</a>'],

    ['B4',
     'Bạn chưa đọc được bitfield và union. Ôn lại cách một byte <code>0xA5</code> tách ' +
     'thành các trường bit, và vì sao union cho bạn nhìn cùng một vùng nhớ theo nhiều kiểu.',
     '<a href="#/bai-14#union-va-bitfield-mot-vung-nho-nhieu-cach-nhin">Đọc lại Bài 14 · union và bitfield: một vùng nhớ, nhiều cách nhìn</a>'],

    ['A8',
     'Bạn chưa nắm ba nghĩa của <code>static</code>, hoặc chưa đọc được bảng ký hiệu. Ôn ' +
     'lại bảng chữ cái của <code>nm</code>: chữ hoa = toàn cục, chữ thường = cục bộ file; ' +
     '<code>T</code>/<code>t</code> mã, <code>B</code>/<code>b</code> biến chưa khởi tạo, ' +
     '<code>D</code>/<code>d</code> đã khởi tạo, <code>U</code> chưa định nghĩa.',
     '<a href="#/bai-14#static-mot-tu-khoa-ba-nghia-hoan-toan-khac-nhau">Đọc lại Bài 14 · static: một từ khoá, ba nghĩa hoàn toàn khác nhau</a>'],

    ['E1, E3, E4',
     'Bạn đọc được lý thuyết nhưng chưa tự bắt máy nói ra số thật. Làm lại phần thực hành ' +
     'của bài: <code>offsetof</code>, <code>_Alignof</code>, <code>-Wpadded</code>, ' +
     '<code>_Static_assert</code> — bốn công cụ này thay thế hoàn toàn việc đoán.',
     '<a href="#/bai-14#thuc-hanh-bat-trinh-bien-dich-noi-ra-su-that">Đọc lại Bài 14 · Thực hành: bắt trình biên dịch nói ra sự thật</a>'],

    ['E5',
     'Bốn lỗi trong file <code>buggy.c</code> đều nằm trong bảng lỗi thường gặp của bài. ' +
     'Nếu bạn chỉ tìm ra lỗi mà trình biên dịch đã chỉ, hãy đọc lại bảng đó rồi rà file ' +
     'một lần nữa.',
     '<a href="#/bai-14#loi-thuong-gap">Đọc lại Bài 14 · Lỗi thường gặp</a>'],

    ['D1',
     'Bạn quên rằng dấu <code>|</code> chỉ nối <b>stdout (fd 1)</b>; cảnh báo và lỗi đi ra ' +
     'stderr và <b>vòng qua ống dẫn</b>. Đây là lý do <code>make | grep error</code> báo ' +
     'sạch trên một bản build đã chết.',
     '<a href="#/bai-10#duong-ong-noi-stdout-cua-lenh-nay-vao-stdin-cua-lenh-kia">Đọc lại Bài 10 · Đường ống: nối stdout của lệnh này vào stdin của lệnh kia</a>'],

    ['D2',
     'Bạn quên thứ tự tra cứu của shell: <b>builtin trước, PATH sau</b>, và thư mục hiện ' +
     'tại không nằm trong <code>PATH</code>. Ôn lại <code>type</code> và ' +
     '<code>type -a</code> — hai lệnh trả lời câu "cái tên này thật ra là cái gì".',
     '<a href="#/bai-04#mot-lenh-that-su-den-tu-dau">Đọc lại Bài 4 · Một lệnh thật sự đến từ đâu</a>'],

    ['D3',
     'Bạn chưa quen mô hình đặt tên gói của Debian/Ubuntu: gói <b>có số phiên bản</b> chứa ' +
     'binary thật, gói <b>không số phiên bản</b> chỉ trỏ sang bản hiện hành. Ôn lại ' +
     '<code>dpkg -S</code> và quan hệ dpkg ↔ apt.',
     '<a href="#/bai-12#hai-tang-dpkg-lam-apt-nghi">Đọc lại Bài 12 · Hai tầng: dpkg làm, apt nghĩ</a>'],

    ['E6',
     'Câu thử thách này cố ý bỏ ngỏ. Nếu bạn muốn câu trả lời đầy đủ về bốn giai đoạn của ' +
     '<code>gcc</code> và về việc 10 dòng nở thành 922 dòng, đó chính là nội dung của bài ' +
     'kế tiếp.',
     '<a href="#/bai-15#mot-lenh-gcc-that-ra-la-bon-chuong-trinh">Đọc tiếp Bài 15 · Một lệnh gcc thật ra là bốn chương trình</a>'],
  ],
});

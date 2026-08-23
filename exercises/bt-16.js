/* ═══════════════════════════════════════════════════════════════════════════
   BÀI TẬP 16 — Make và Makefile
   Cặp với lessons/bai-16.js · Chặng 02 · C và công cụ build

   ───────────────────────────────────────────────────────────────────────────
   §13.4 · KIỂM TOÁN CHỌN TRỤC — làm trước khi viết câu nào

   Bước 1 · Kiểm kê (17 ứng viên rút từ goals, h2/h3, cal kind:'why', cmdx,
   terms, recap của bài 16):
     một quy tắc gồm ba phần (target/prerequisite/recipe) · TAB bắt buộc, không
     phải dấu cách · make chỉ so mtime, không đọc nội dung · phụ thuộc chưa
     khai báo thì make không bao giờ biết tới · build tăng dần khác build song
     song, hai kỹ thuật nhân với nhau chứ không thay thế · make vọng lại lệnh
     nó chạy (echo), @ tắt tiếng · biến $@ $< $^ $? $* · pattern rule %.o: %.c ·
     := tính ngay khác = tính lúc dùng · .PHONY vì make coi mọi mục tiêu là
     tên file · 163 quy tắc ngầm, CC=cc CFLAGS rỗng · cái bẫy phụ thuộc header
     của pattern rule · -MMD -MP sinh file .d tự động · obj-y/obj-m/obj-n ghép
     tên biến từ giá trị cấu hình · $(Q) và V=1 để bật/tắt tiếng · $(MAKE) -C
     đệ quy và jobserver · make -n xem trước không chạy

   Bước 2 · Chấm điểm (phụ thuộc về sau / giá của ngộ nhận / phản trực giác):

     ỨNG VIÊN                                        PT  GIÁ  PTG  TỔNG
     make chỉ so mtime; phụ thuộc chưa khai báo       2    2    2     6   ← trục 0
       thì không bao giờ được biết tới
     .PHONY vì make coi MỌI mục tiêu là tên file      1    2    2     5   ← trục 1
     obj-$(CONFIG_X) ghép tên biến từ giá trị cấu     2    1    2     5   ← trục 2
       hình — một dòng, ba hành vi, không cần if
     163 quy tắc ngầm, CC=cc CFLAGS rỗng              1    1    1     3   ✗ cắt
     build tăng dần khác build song song, nhân        1    1    2     4   ✗ xếp sau (†)
       với nhau chứ không thay thế
     := tính ngay khác = tính lúc dùng                1    1    1     3   ✗ cắt
     biến tự động $@ $< $^ $? $*                      1    1    0     2   ✗ cắt (‡)
     TAB bắt buộc, không phải dấu cách                0    1    1     2   ✗ cắt (‡)
     $(MAKE) -C đệ quy và jobserver                   1    0    1     2   ✗ cắt
     make -n xem trước không chạy                     0    1    0     1   ✗ cắt
     pattern rule %.o: %.c                             1    0    0     1   ✗ cắt
     một quy tắc gồm ba phần                           1    0    0     1   ✗ cắt

     (†) đạt ngưỡng 4 nhưng bị xếp sau hai ứng viên đạt 5 — chỉ lấy đúng ba.
         Dùng làm bề rộng ở B4 (so sánh cặp) và C5 (tính toán + biện minh).
     (‡) tên biến/cờ tra được trong mười giây → §13.3 cấm làm trục. Mỗi thứ
         chỉ lấy đúng một câu mức A (a4 cho biến tự động, a5/a6 test khái
         niệm liên quan chứ không test tên cờ).

   Bước 3 · Cắt: ngưỡng ≥ 4 tổng và ≥ 2 trục con ≥ 1. Ba ứng viên đầu đạt
   6/5/5, đều có cả ba trục con ≥ 1 → lấy đúng ba.

   Bước 4 · Loại và điều phối:
     · Không ứng viên nào trùng trục đã tiêu của bt-01…bt-15 (§13.8 ở dưới),
       và không trùng hai trục "toolchain" mà bt-15 đã tiêu (tiền xử lý,
       khai báo/định nghĩa, thông báo lỗi tố cáo giai đoạn).
     · obj-$(CONFIG_X) không trùng với nội dung lesson 38 ("bốn cách tra cây
       kernel", trong đó có tra theo CONFIG_ symbol) — lesson 38 dùng nó để
       TÌM code, còn trục 2 ở đây dạy CƠ CHẾ ba hành vi từ một dòng. Khác câu
       hỏi, không xoáy lại cùng một điều.
     · "Build tăng dần khác song song" bị xếp sau vì ba tầng câu hỏi của nó
       đều rơi vào cùng phép tính "nhân hai tỉ lệ đo được" — không có tầng
       "diễn giải dữ liệu thật" tách biệt khỏi tầng "áp dụng vào tình huống
       mới", nên làm trục sẽ phải bịa ra một tầng. Dùng làm bề rộng thay vì.

   Bước 5 · Phát biểu mỗi trục thành một câu có thể sai:
     0 · make CHỈ so sánh thời gian sửa file (mtime) của các điều kiện tiên
         quyết ĐÃ được khai báo trong quy tắc — nó không đọc nội dung, và nó
         tuyệt đối không biết tới một phụ thuộc chưa được khai báo, dù file
         .c có #include header đó hay không.
     1 · .PHONY cần thiết vì make coi MỌI mục tiêu là một tên file. Thiếu nó,
         một mục tiêu-động từ (clean, install…) trùng tên với một file có
         thật trên đĩa sẽ lặng lẽ không chạy công thức — mà vẫn thoát mã 0.
     2 · obj-$(CONFIG_X) += x.o cho ra ba hành vi khác nhau (obj-y/obj-m/
         obj-n) từ đúng MỘT dòng, vì tên biến đích được ghép từ giá trị của
         CONFIG_X ngay lúc make đọc file — không cần viết một khối ifeq nào.

   Bước 6 · Ngộ nhận đối lập (lái distractor ở A, câu bắt lỗi ở B, kiểu hỏng
   ở C):
     0 · "Tôi #include ops.h trong ops.c, vậy dĩ nhiên make biết ops.o phụ
         thuộc ops.h — không cần liệt kê gì thêm trong Makefile."
     1 · "make đủ khôn để tự phân biệt được mục tiêu nào là một hành động
         (clean, install…) và mục tiêu nào là một file thật, không cần tôi
         khai báo gì đặc biệt."
     2 · "obj-$(CONFIG_X) chỉ là viết tắt cho lười; về bản chất vẫn cần một
         khối ifeq riêng để bật/tắt mỗi tính năng, viết obj-$(...) chỉ đỡ gõ
         chữ ifeq/endif."

   Bước 7 · Lưới 3 × 1 và kiểm tra:
     trục 0 → A1 (tình huống mới hoàn toàn khác lesson — script Python, .csv)
              B (transcript thật: thêm extra.c không sửa OBJS, make vẫn báo
                 up to date)  C1 (tình huống mới: file common.mk chứa cờ
                 chung, không phải prerequisite của .o nào)
     trục 1 → A2 (phát biểu, tình huống "install" khác "clean" của lesson)
              B (transcript thật: file install có sẵn, .PHONY thiếu, make
                 install im lặng không copy gì)  C2 (tình huống mới: CI chạy
                 make test, thư mục build có sẵn file tên test)
     trục 2 → A3 (phát biểu về obj-m)  B (transcript thật: obj-y/obj-m/obj-n
                 với ba giá trị y/m/n cùng lúc, chỉ obj-y được biên dịch)
              C3 (chẩn đoán: undefined reference thật, vì mã gọi thẳng một
                 hàm nằm trong file đã bị xếp vào obj-n)
     · Mỗi trục dùng ba stimulus khác kiểu: phát biểu/tình huống mới (A) ·
       transcript thật đo trên máy (B) · tình huống có ràng buộc mới, không
       trả lời được nếu không nắm trục (C).
     · Không mức nào lặp từ vựng của mức kia — A dùng ví dụ script/file
       Python và cp, B dùng đúng project ba-file của lesson (mở rộng thêm
       extra.c/install/obj-y), C dùng include-fragment, CI và driver ARM.

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
     bt-14 int/long không có độ rộng cố định · byte đệm và thứ tự trường · volatile
     bt-15 tiền xử lý chỉ thay văn bản · khai báo đủ cho gđ2, định nghĩa cần gđ4 ·
           mỗi thông báo lỗi tố cáo giai đoạn của nó
   Ba trục của bt-16 nằm ngoài toàn bộ danh sách trên.

   ───────────────────────────────────────────────────────────────────────────
   MỌI LỆNH VÀ MỌI KẾT QUẢ TRONG FILE NÀY ĐỀU ĐÃ CHẠY THẬT trên WSL2 Ubuntu
   26.04 "resolute" của người dùng, ngày 23/08/2026, gcc 15.2.0
   (Ubuntu 15.2.0-16ubuntu1), máy 6 lõi (nproc = 6). Không có gì bất ngờ so
   với dự đoán trong lần đo này; các transcript trong B và E là dữ liệu MỚI
   (không sao chép từ lessons/bai-16.js) dựng riêng cho bộ bài tập này, để
   người học không thể trả lời chỉ bằng cách nhớ lại đúng dòng trong bài học.
   ═══════════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-16',
  minutes: 85,

  intro:
    '<p>Bài 16 dạy đúng một luật, và toàn bộ sức mạnh lẫn cạm bẫy của ' +
    '<code>make</code> đều bắt nguồn từ luật đó: <b>nó chỉ so sánh thời gian ' +
    'sửa file của những thứ bạn đã khai báo là phụ thuộc.</b> Bộ bài tập này ' +
    'không hỏi lại những gì lesson đã trình diễn — nó đặt bạn vào tình huống ' +
    '<b>mới</b>: một script Python, một file cờ chung <code>include</code>, ' +
    'một CI chạy <code>make test</code>, một dòng <code>obj-$(CONFIG_X)</code> ' +
    'gây <code>undefined reference</code> thật. Nếu bạn hiểu luật, bạn giải ' +
    'được cả bốn; nếu bạn chỉ nhớ ví dụ trong bài, bạn sẽ bị bốn tình huống ' +
    'này chặn lại.</p>' +
    '<p><b>Chia làm hai lượt:</b></p>' +
    '<ul>' +
    '<li><b>Lượt 1 — ngay sau khi đọc xong bài 16</b> (~25 phút): phần ' +
    '<b>A</b> và <b>B</b>.</li>' +
    '<li><b>Lượt 2 — sau 2–3 ngày</b> (~60 phút): phần <b>C</b>, <b>D</b> và ' +
    '<b>E</b>.</li>' +
    '</ul>' +
    '<p>Phần <b>E</b> cần một terminal WSL. Mọi transcript trong B và E là số ' +
    'đo thật, mới, dựng riêng cho bộ này — nếu máy bạn ra kết quả khác, hãy ' +
    'tìm hiểu vì sao trước khi kết luận bộ bài tập sai.</p>',

  truc: [
    { id: 'mtime',
      name: 'make chỉ so mtime của phụ thuộc ĐÃ khai báo — không đọc nội dung, không biết tới phụ thuộc chưa khai báo',
      x: 'make không đọc file .c, không băm nội dung, không biết #include nào tồn tại. Nó chỉ ' +
         'nhìn vào danh sách điều kiện tiên quyết mà CHÍNH BẠN viết trong Makefile, rồi so hai ' +
         'con dấu thời gian. Một phụ thuộc thật (header, file cờ chung, script sinh mã) mà ' +
         'không được liệt kê thì với make, nó không tồn tại.',
      mis: 'Tôi #include ops.h trong ops.c, vậy dĩ nhiên make biết ops.o phụ thuộc ops.h — không cần liệt kê gì thêm trong Makefile.' },

    { id: 'phony',
      name: '.PHONY cần thiết vì make coi MỌI mục tiêu là một tên file',
      x: 'make không có khái niệm "hành động". clean, install, test chỉ là những cái tên, và ' +
         'make áp dụng đúng một luật cho mọi cái tên: nếu file đó đã tồn tại và không có tiên ' +
         'quyết nào mới hơn, không làm gì. Một file trùng tên trên đĩa biến mục tiêu-hành động ' +
         'thành mục tiêu-đã-xong, và make thoát với mã 0 dù chưa làm gì cả.',
      mis: 'make đủ khôn để tự phân biệt được mục tiêu nào là một hành động và mục tiêu nào là một file thật, không cần tôi khai báo gì đặc biệt.' },

    { id: 'objy',
      name: 'obj-$(CONFIG_X) += x.o cho ba hành vi từ một dòng, vì tên biến đích được ghép từ giá trị cấu hình',
      x: 'Khi make đọc dòng obj-$(CONFIG_X) += x.o, nó thay $(CONFIG_X) bằng giá trị hiện tại ' +
         '(y, m, hoặc n) TRƯỚC KHI quyết định biến nào được nối thêm. Kết quả là ba dòng: ' +
         'obj-y += x.o, obj-m += x.o, hoặc obj-n += x.o. Chỉ obj-y được quy tắc app: $(obj-y) ' +
         'dùng tới — obj-n là một biến hợp lệ mà không ai đọc, nên nội dung của nó bị lãng quên ' +
         'một cách hoàn toàn im lặng.',
      mis: 'obj-$(CONFIG_X) chỉ là viết tắt cho lười; về bản chất vẫn cần một khối ifeq riêng để bật/tắt mỗi tính năng.' },
  ],

  /* ═══ A · Nhận biết — 4 trắc nghiệm + 2 đúng/sai + 1 điền khuyết + 1 ghép nối ═══ */
  A: [
    { id: 'a1', k: 'mcq', truc: 0, tag: 'Trắc nghiệm nhanh',
      q: 'Makefile của bạn có quy tắc:<br><br>' +
         '<code>report.txt: data.csv</code><br>' +
         '<code>&nbsp;&nbsp;&nbsp;&nbsp;python3 gen.py &gt; report.txt</code><br><br>' +
         'Bạn sửa <b>logic tính toán</b> trong <code>gen.py</code> (không đụng ' +
         '<code>data.csv</code>), rồi chạy <code>make</code>. Điều gì xảy ra?',
      opts: [
        'make chạy lại vì nó phát hiện nội dung <code>gen.py</code> đã đổi',
        'make không làm gì — <code>report.txt</code> không cũ hơn tiên quyết duy nhất của nó là <code>data.csv</code>, còn <code>gen.py</code> không được khai báo là tiên quyết',
        'make báo lỗi <code>missing separator</code> vì thiếu quy tắc cho <code>gen.py</code>',
        'make luôn chạy lại mọi quy tắc có gọi một chương trình bên ngoài như <code>python3</code>'
      ],
      a: 1,
      why: '<b>Không làm gì.</b> Quy tắc chỉ khai một tiên quyết: <code>data.csv</code>. ' +
           '<code>gen.py</code> — thứ thực sự quyết định nội dung <code>report.txt</code> — ' +
           'không nằm trong danh sách đó, nên với make nó <b>không tồn tại</b>. make không đọc ' +
           'script, không biết logic bên trong đổi hay chưa; nó chỉ so mtime của những gì bạn ' +
           'đã liệt kê. Muốn đúng, quy tắc phải là ' +
           '<code>report.txt: data.csv gen.py</code>. Đây chính là lỗi "sửa mã, chạy make, kết ' +
           'quả vẫn cũ" mà bài học gọi là lỗi tốn thời gian nhất — chỉ khác chất liệu (script ' +
           'thay cho header).' },

    { id: 'a2', k: 'mcq', truc: 1, tag: 'Trắc nghiệm nhanh',
      q: 'Thư mục dự án của bạn, do một lần chạy thử nghiệm trước, có sẵn một file tên ' +
         '<code>install</code> (0 byte, để lại từ một script cũ). Makefile có mục tiêu ' +
         '<code>install:</code> chạy <code>cp app /usr/local/bin/app</code>, <b>không khai ' +
         'báo <code>.PHONY</code></b>. Bạn chạy <code>make install</code>. Điều gì đúng?',
      opts: [
        'make báo lỗi vì <code>install</code> không phải mục tiêu hợp lệ',
        'make chạy <code>cp</code> bình thường vì <code>install</code> là một hành động rõ ràng',
        'make in <code>\'install\' is up to date.</code>, <b>không</b> chạy <code>cp</code>, và thoát mã 0',
        'make xoá file <code>install</code> cũ trước khi chạy công thức'
      ],
      a: 2,
      why: '<b><code>\'install\' is up to date.</code>, thoát mã 0, không copy gì cả.</b> Với ' +
           'make, <code>install</code> chỉ là một tên file. File đó đã tồn tại (0 byte, để lại ' +
           'từ trước) và không có tiên quyết nào, nên theo đúng luật, không cần làm gì. ' +
           '<code>cp</code> không hề chạy — và không một dòng cảnh báo nào xuất hiện. Đây là ' +
           'chính xác cơ chế khiến một bản "deploy" hay "install" trong CI có thể báo thành ' +
           'công mà không hề triển khai gì.' },

    { id: 'a3', k: 'mcq', truc: 2, tag: 'Trắc nghiệm nhanh',
      q: 'Makefile kiểu kernel có dòng <code>obj-$(CONFIG_USB_GADGET) += gadget.o</code>. Khi ' +
         'đọc file, <code>CONFIG_USB_GADGET</code> đang có giá trị <code>m</code>. ' +
         '<code>gadget.o</code> được nối vào biến nào?',
      opts: [
        '<code>obj-y</code>, vì mọi tính năng bật đều vào <code>obj-y</code>',
        '<code>obj-m</code> — đúng bằng cách ghép tên biến từ giá trị <code>m</code>',
        'Một biến tên đúng là <code>obj-$(CONFIG_USB_GADGET)</code>, giữ nguyên literal',
        '<code>obj-n</code>, vì <code>m</code> nghĩa là "không dịch thẳng vào kernel"'
      ],
      a: 1,
      why: '<b><code>obj-m</code>.</b> make thay <code>$(CONFIG_USB_GADGET)</code> bằng giá trị ' +
           'hiện tại của biến đó — ở đây là chữ <code>m</code> — <b>trước khi</b> quyết định tên ' +
           'biến đích, nên dòng thực chạy tương đương ' +
           '<code>obj-m += gadget.o</code>. Không quy tắc nào trong Makefile chính build trực ' +
           'tiếp từ <code>obj-m</code> để ra file thực thi thẳng (kernel dùng nó cho mục tiêu ' +
           'modules riêng); nhưng nó khác hẳn <code>obj-n</code>, nơi nội dung bị lãng quên vô ' +
           'điều kiện.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Quy tắc <code>app: a.o b.o c.o</code> có công thức ' +
         '<code>$(CC) -o $@ $?</code>. Chương trình chỉ có <code>a.o</code> mới hơn ' +
         '<code>app</code> (do bạn vừa sửa <code>a.c</code>); <code>b.o</code>, ' +
         '<code>c.o</code> vẫn cũ. Lệnh thực tế mà make sinh ra là gì?',
      opts: [
        '<code>gcc -o app a.o b.o c.o</code> — như <code>$^</code>',
        '<code>gcc -o app a.o</code> — <code>$?</code> chỉ liệt kê tiên quyết <b>mới hơn</b> mục tiêu',
        '<code>gcc -o app a.o</code> — vì <code>$?</code> giống <code>$&lt;</code>, chỉ lấy tiên quyết đầu',
        'Lỗi cú pháp, vì <code>$?</code> không dùng được ở dòng liên kết'
      ],
      a: 1,
      why: '<b><code>gcc -o app a.o</code>.</b> <code>$?</code> là danh sách các tiên quyết ' +
           '<b>mới hơn mục tiêu</b> — ở đây chỉ có <code>a.o</code>. Dùng nó ở dòng liên kết là ' +
           'một lỗi thật: file thực thi sẽ thiếu ký hiệu của <code>b.o</code> và <code>c.o</code> ' +
           'và bạn nhận <code>undefined reference</code>, dù cả hai file <code>.o</code> đó vẫn ' +
           'còn tồn tại trên đĩa. Dòng liên kết luôn cần <code>$^</code> — toàn bộ tiên quyết, ' +
           'bỏ trùng — bất kể file nào vừa đổi.' },

    { id: 'a5', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: '<p>Xét phát biểu sau:</p>' +
         '<blockquote><i>"Biến gán bằng <code>=</code> được tính giá trị ngay tại dòng gán, ' +
         'giống hệt <code>:=</code> — khác biệt duy nhất là <code>:=</code> gõ nhiều ký tự ' +
         'hơn."</i></blockquote>',
      a: 1,
      rw: 'Viết lại phát biểu cho đúng — nói rõ MỖI toán tử tính giá trị lúc nào.',
      why: '<b>Sai.</b> <code>=</code> (gán trễ) tính lại giá trị <b>mỗi lần biến được dùng</b>, ' +
           'nên nó luôn thấy giá trị <i>hiện tại</i>, kể cả khi biến bên trong bị gán lại ở một ' +
           'dòng phía dưới. <code>:=</code> (gán ngay) tính giá trị đúng một lần, tại chính dòng ' +
           'gán, và không đổi nữa dù các biến khác đổi sau đó.',
      crit: [
        'Nói rõ <code>=</code> tính giá trị <b>mỗi lần dùng</b> (lúc công thức chạy), không phải lúc gán',
        'Nói rõ <code>:=</code> tính giá trị <b>ngay tại dòng gán</b>, một lần duy nhất',
        'Chỉ ra hệ quả: với <code>=</code>, thứ tự các dòng gán lại phía SAU vẫn ảnh hưởng tới giá trị cuối cùng; với <code>:=</code> thì không'
      ],
      sol: '<b>Sai.</b> Viết lại đúng: <i>"<code>:=</code> tính giá trị của vế phải ngay tại ' +
           'dòng gán, một lần duy nhất. <code>=</code> không tính gì lúc gán — nó chỉ ghi lại ' +
           'công thức, và tính lại mỗi khi biến được dùng trong một công thức, nên nó luôn lấy ' +
           'giá trị mới nhất của các biến bên trong, kể cả những biến bị gán lại ở dòng phía ' +
           'dưới."</i> Hệ quả thực dụng: với <code>=</code>, di chuyển một dòng gán xuống dưới ' +
           'có thể đổi kết quả của mọi công thức dùng biến đó, dù bạn không sửa gì trong chính ' +
           'công thức — một nguồn lỗi khó dò vì Makefile "trông" không đổi ở chỗ nào quan trọng.' },

    { id: 'a6', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: '<p>Xét phát biểu sau:</p>' +
         '<blockquote><i>"Nếu Makefile của bạn không định nghĩa quy tắc nào cho ' +
         '<code>%.o: %.c</code>, chạy <code>make foo.o</code> khi có ' +
         '<code>foo.c</code> sẽ báo lỗi <code>No rule to make target</code>."</i></blockquote>',
      a: 1,
      rw: 'Viết lại cho đúng — nói rõ điều gì thực sự xảy ra và vì sao kết quả build có thể ' +
          'khác với khi bạn tự viết pattern rule.',
      why: '<b>Sai.</b> make có <b>163 quy tắc ngầm</b> dựng sẵn, trong đó có đúng một quy tắc ' +
           'cho <code>%.o: %.c</code> — nó dùng <code>CC = cc</code> và <code>CFLAGS</code> ' +
           '<b>rỗng</b>. Lệnh sẽ chạy thành công, sinh ra <code>foo.o</code>, nhưng ' +
           '<b>không có</b> <code>-Wall</code>, không có bất kỳ cờ tối ưu hay cảnh báo nào bạn ' +
           'đã quen đặt trong Makefile của chính mình.',
      crit: [
        'Nói rõ make KHÔNG báo lỗi — nó dùng một quy tắc ngầm dựng sẵn cho <code>%.o: %.c</code>',
        'Nêu được quy tắc ngầm dùng <code>CC = cc</code> và <code>CFLAGS</code> rỗng',
        'Chỉ ra hệ quả thực dụng: file <code>.o</code> vẫn được tạo, nhưng không có cờ cảnh báo/tối ưu mà bạn tưởng đang dùng'
      ],
      sol: '<b>Sai.</b> Viết lại đúng: <i>"make sẽ dùng một quy tắc <b>ngầm</b> đã có sẵn cho ' +
           '<code>%.o: %.c</code>, biên dịch <code>foo.c</code> bằng <code>cc</code> với ' +
           '<code>CFLAGS</code> rỗng — không báo lỗi, nhưng cũng không có <code>-Wall</code> hay ' +
           'bất kỳ cờ nào bạn tưởng Makefile của mình đang dùng."</i> Đây là lý do quy tắc ngầm ' +
           'thường gây bối rối hơn là tiện lợi trong dự án thật: một quy tắc bạn <i>quên</i> ' +
           'viết không lộ ra bằng lỗi, mà lộ ra bằng một file <code>.o</code> "đã build" nhưng ' +
           'thiếu mọi cờ mong đợi. Kernel Linux tắt hẳn quy tắc ngầm bằng <code>MAKEFLAGS += -r</code> ' +
           'chính vì lý do này.' },

    { id: 'a7', k: 'fill', tag: 'Điền khuyết',
      q: 'Một dự án có <b>12</b> file <code>.c</code>, tất cả cùng ' +
         '<code>#include "config.h"</code>. Makefile dùng <code>-MMD -MP</code> nên mọi phụ ' +
         'thuộc header đã được khai báo đúng và đầy đủ. Đã build xong một lần. Bạn ' +
         '<code>touch config.h</code> rồi chạy <code>make</code>. Bao nhiêu file ' +
         '<code>.o</code> sẽ được biên dịch lại?',
      a: ['12', 'mười hai', '12 file', '12 file .o'],
      ph: 'một con số',
      why: '<b>12.</b> Vì phụ thuộc header đã được khai báo đúng (nhờ <code>-MMD -MP</code> sinh ' +
           'ra file <code>.d</code> cho từng file), <code>config.h</code> là tiên quyết thật của ' +
           'cả 12 quy tắc <code>*.o</code>. <code>touch</code> chỉ đổi mtime, không đổi nội dung ' +
           '— nhưng make không quan tâm nội dung, nó chỉ thấy <code>config.h</code> giờ mới hơn ' +
           'cả 12 file <code>.o</code>, nên biên dịch lại toàn bộ. Nếu Makefile chỉ dùng pattern ' +
           'rule <code>%.o: %.c</code> trần (không <code>-MMD -MP</code>), câu trả lời đúng vẫn ' +
           'là 12 — nhưng vì một lý do khác hoàn toàn tệ hơn: make sẽ <b>không build lại file ' +
           'nào cả</b>, vì <code>config.h</code> chưa từng được khai là tiên quyết. Đây chính là ' +
           'cái bẫy phụ thuộc header của lesson, chỉ đổi từ 3 file thành 12.' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Ghép mỗi dòng lệnh với đúng hành vi của nó. Chú ý: hai dòng đầu tưởng giống nhau nhưng ' +
         'khác nhau ở một chi tiết quan trọng.',
      left: [
        '<code>make -n</code>', '<code>make -B</code>', '<code>make -j6</code>',
        '<code>make -C sub</code>', '<code>make V=1</code>', '<code>make CFLAGS=-Os</code>'
      ],
      right: [
        'Ghi đè giá trị biến <code>CFLAGS</code> từ dòng lệnh, ưu tiên cao hơn giá trị đặt trong Makefile',
        'Chuyển vào thư mục <code>sub</code> trước khi đọc Makefile và chạy mục tiêu ở đó',
        'In ra các lệnh <b>sẽ</b> chạy nhưng không thực thi gì cả — dùng để xem trước một Makefile lạ',
        'Buộc build lại <b>mọi</b> mục tiêu, coi như không gì up to date — bỏ qua hoàn toàn lợi ích của build tăng dần',
        'Chạy tối đa 6 công thức đồng thời, dùng jobserver để chia hạn ngạch cho các <code>make</code> con',
        'Bật lại việc vọng lệnh thật ở những Makefile dùng công tắc <code>$(Q)</code> để mặc định im lặng'
      ],
      a: [2, 3, 4, 1, 5, 0],
      why: '<b><code>-n</code> chỉ xem trước, <code>-B</code> thật sự buộc build lại toàn bộ.</b> ' +
           'Cả hai đều "làm như mọi thứ đã lỗi thời", nhưng <code>-n</code> không đụng gì tới ' +
           'đĩa còn <code>-B</code> chạy hết mọi công thức — vứt bỏ đúng thứ mà cả bài học vừa ' +
           'dạy: build tăng dần. <code>-j6</code> và <code>-C sub</code> là hai cờ bạn sẽ gõ ' +
           'hằng ngày. <code>V=1</code> chỉ có tác dụng nếu chính Makefile đã cài công tắc ' +
           '<code>$(Q)</code> — gõ <code>V=1</code> vào một Makefile không hỗ trợ nó không gây ' +
           'lỗi, chỉ đơn giản không làm gì khác.' },
  ],

  /* ═══ B · Thông hiểu — 2 giải thích + 1 so sánh cặp + 1 bắt lỗi + 2 đọc output ═══ */
  B: [
    { id: 'b1', k: 'free', truc: 0, tag: 'Đọc output',
      q: 'Dữ liệu thật, đo riêng cho bộ bài tập này (không phải transcript trong bài học). Dự ' +
         'án ba file <code>main.c</code>/<code>ops.c</code>/<code>ops.h</code> đã build xong ' +
         'với Makefile pattern-rule. Sau đó thêm một file <b>mới</b> <code>extra.c</code> chứa ' +
         'một hàm — nhưng <b>không</b> thêm nó vào <code>OBJS</code> và không có gì gọi tới nó.',
      blocks: [
        { t: 'code', env: 'wsl', label: 'build lần 1', code:
          'gcc -Wall -Wextra -O2 -c main.c -o main.o\n' +
          'gcc -Wall -Wextra -O2 -c ops.c -o ops.o\n' +
          'gcc -Wall -Wextra -O2 -o program main.o ops.o' },
        { t: 'code', env: 'wsl', label: 'thêm extra.c, rồi make lần nữa', code:
          'make: \'program\' is up to date.' },
        { t: 'code', env: 'wsl', label: 'ls *.o sau lần make thứ hai', code:
          'main.o\nops.o' } ],
      rows: 6,
      crit: [
        'Nói rõ <code>extra.c</code> không được biên dịch — không có <code>extra.o</code> nào xuất hiện',
        'Giải thích đây <b>không phải lỗi của make</b>: nó không tự quét thư mục tìm file <code>.c</code> mới',
        'Nói rằng <code>make</code> chỉ biết những gì Makefile khai báo — <code>OBJS</code> không có <code>extra.o</code> nên không có quy tắc nào đòi tới <code>extra.c</code>',
        'Nêu được cách sửa: thêm <code>extra.o</code> vào <code>OBJS</code> (và/hoặc dùng <code>$(wildcard *.c)</code> để tự động hoá, kèm rủi ro của cách đó)'
      ],
      sol: '<b>Vì sao không có gì xảy ra:</b> <code>make</code> không "thấy" file mới — nó chỉ ' +
           'đọc Makefile, dựng đồ thị phụ thuộc từ các quy tắc <b>đã viết</b>, rồi so mtime trên ' +
           'đồ thị đó. <code>extra.c</code> không nằm trong <code>OBJS</code>, nên không quy tắc ' +
           'nào của <code>program</code> đòi tới <code>extra.o</code>, nên không dòng lệnh nào ' +
           'được sinh ra cho nó. <code>program</code> vẫn "up to date" một cách hoàn toàn hợp ' +
           'lý theo đúng luật — chỉ là cái đồ thị đó thiếu một cạnh mà bạn tưởng đã có.<br>' +
           'Cách sửa trực tiếp: thêm <code>extra.o</code> vào <code>OBJS</code>. Cách sửa tự ' +
           'động: <code>OBJS = $(patsubst %.c,%.o,$(wildcard *.c))</code> — nhưng lesson đã cảnh ' +
           'báo <code>wildcard</code> nguy hiểm đúng theo hướng ngược lại: file mới sẽ tự vào ' +
           'build mà không ai để ý, có thể kéo theo một file <code>.c</code> nháp không nên có ' +
           'trong sản phẩm cuối.' },

    { id: 'b2', k: 'free', truc: 1, tag: 'Đọc output',
      q: 'Dữ liệu thật, mới đo cho bộ này. Makefile có mục tiêu <code>install:</code> chạy ' +
         '<code>cp app /usr/local/bin/app</code>, <b>không có <code>.PHONY</code></b>. Thư mục ' +
         'đã có sẵn một file 0-byte tên <code>install</code> từ trước.',
      blocks: [
        { t: 'code', env: 'wsl', label: 'make install', code:
          'make: \'install\' is up to date.' },
        { t: 'code', env: 'wsl', label: 'echo $? ngay sau lệnh trên', code: '0' } ],
      rows: 6,
      crit: [
        'Nói rõ dòng <code>cp app /usr/local/bin/app</code> KHÔNG hề xuất hiện — công thức chưa từng chạy',
        'Giải thích: <code>install</code> tồn tại như một FILE (0 byte, cũ), không có tiên quyết nào, nên theo luật make không cần làm gì',
        'Nêu được vì sao đây nguy hiểm hơn lỗi ồn ào: mã thoát là 0, một script CI/deploy sẽ coi là thành công',
        'Nêu cách sửa: thêm <code>.PHONY: install</code> (và mọi mục tiêu-động từ khác trong file)'
      ],
      sol: '<code>make</code> không phân biệt được "install là một hành động" với "install là ' +
           'một file". Nó chỉ thấy: file <code>install</code> đã tồn tại, không có tiên quyết ' +
           'nào cả (mục tiêu <code>install:</code> không khai tiên quyết), vậy chẳng có gì để so ' +
           'sánh — kết luận "đã xong". <code>cp</code> không hề được gọi, không một dòng nào ' +
           'chứng minh nó đã chạy, và mã thoát vẫn là <b>0</b> — "thành công" theo quy ước mà ' +
           'Bài 4 đã dạy.<br>' +
           'Đây chính xác là kiểu lỗi mà một pipeline CI/CD không phát hiện được: bước "deploy" ' +
           'báo xanh, nhưng máy đích không hề nhận file mới. Sửa bằng cách khai ' +
           '<code>.PHONY: install</code> (thường gộp với các mục tiêu khác: ' +
           '<code>.PHONY: all clean install test</code>).' },

    { id: 'b3', k: 'free', truc: 2, tag: 'Đọc output',
      q: 'Dữ liệu thật, mới đo cho bộ này. Makefile kiểu Kbuild có ba tính năng với ba giá trị ' +
         'cấu hình <b>khác nhau</b>: <code>CONFIG_GPIO = y</code>, <code>CONFIG_UART = m</code>, ' +
         '<code>CONFIG_EXTRA_FEATURE = n</code>. Không có mã nào gọi tới <code>uart_init</code> ' +
         'hay <code>extra_feature_register</code>.',
      blocks: [
        { t: 'code', env: 'wsl', label: 'make show (một mục tiêu .PHONY chỉ để in ba biến)', code:
          'obj-y = gpio.o mainkb.o\n' +
          'obj-m = uart.o\n' +
          'obj-n = extra_feature.o' },
        { t: 'code', env: 'wsl', label: 'make (build thật, không V=1)', code:
          '  CC      gpio.o\n' +
          '  CC      mainkb.o\n' +
          '  LD      app' },
        { t: 'code', env: 'wsl', label: './app', code: 'gpio=1' } ],
      rows: 7,
      crit: [
        'Nói rõ chỉ hai file được biên dịch (<code>gpio.o</code>, <code>mainkb.o</code>) — đúng bằng nội dung của <code>obj-y</code>',
        'Giải thích <code>uart.o</code> (obj-m) và <code>extra_feature.o</code> (obj-n) KHÔNG bị lỗi gì cả — chúng chỉ đơn giản không nằm trong danh sách mà quy tắc <code>app: $(obj-y)</code> dùng',
        'Nêu được: tên biến đích (<code>obj-y</code>/<code>obj-m</code>/<code>obj-n</code>) được quyết định bằng cách ghép chuỗi <code>obj-</code> với GIÁ TRỊ của biến CONFIG, ngay lúc make đọc dòng đó',
        'Nói rằng không có khối <code>ifeq</code>/<code>endif</code> nào trong Makefile — ba hành vi ra từ đúng một khuôn dòng lặp lại ba lần'
      ],
      sol: 'make đọc <code>obj-$(CONFIG_GPIO) += gpio.o</code> và thay <code>$(CONFIG_GPIO)</code> ' +
           'bằng <code>y</code> ngay tại chỗ, cho ra <code>obj-y += gpio.o</code>. Tương tự, dòng ' +
           'của <code>uart.o</code> trở thành <code>obj-m += uart.o</code>, và dòng của ' +
           '<code>extra_feature.o</code> trở thành <code>obj-n += extra_feature.o</code>. Ba ' +
           'dòng nguồn giống hệt nhau về hình dạng, ba kết quả khác nhau — không một chữ ' +
           '<code>if</code> nào được viết.<br>' +
           'Chỉ <code>obj-y</code> được quy tắc <code>app: $(obj-y)</code> tham chiếu tới, nên chỉ ' +
           'hai file trong đó được biên dịch và liên kết. <code>uart.o</code> và ' +
           '<code>extra_feature.o</code> không hề lỗi — chúng chỉ đơn giản <b>không được ai gọi ' +
           'tới</b>, giống hệt cách một biến không được tham chiếu thì nội dung của nó không ảnh ' +
           'hưởng tới bất cứ thứ gì. Đây là cách kernel Linux bật/tắt hàng nghìn driver từ một ' +
           'file cấu hình duy nhất mà không cần sửa logic Makefile.' },

    { id: 'b4', k: 'free', tag: 'So sánh cặp',
      q: 'Bài học đo được hai con số tăng tốc trên cùng dự án 60 file: sửa một file rồi build ' +
         'lại nhanh hơn <b>8,2 lần</b> (build tăng dần); build đầy đủ với <code>-j6</code> nhanh ' +
         'hơn <b>2,8 lần</b> (build song song). Cả hai đều là "make chạy nhanh hơn" — nhưng gộp ' +
         'chúng lại có cho ra 8,2 × 2,8 ≈ 23 lần không? Nói rõ vì sao có hoặc vì sao không, dựa ' +
         'trên NGUYÊN NHÂN gây ra mỗi con số, không chỉ dựa vào phép nhân.',
      rows: 5,
      crit: [
        'Nói rõ đây là hai cơ chế khác nhau: build tăng dần làm ÍT VIỆC HƠN, build song song làm CÙNG LƯỢNG VIỆC nhưng trên nhiều lõi',
        'Chỉ ra: khi chỉ sửa một file, chỉ có MỘT file cần biên dịch — không có gì để chia cho nhiều lõi, nên <code>-j6</code> không giúp thêm gì trong trường hợp đó',
        'Kết luận đúng: hai con số không nhân với nhau một cách tự do — 8,2× chỉ áp dụng cho build tăng dần (một file), 2,8× chỉ áp dụng cho build ĐẦY ĐỦ (60 file); chúng là hai kịch bản khác nhau, không phải hai lớp cải tiến chồng lên đúng một kịch bản'
      ],
      sol: '<b>Không nhân theo kiểu 8,2 × 2,8.</b> Hai con số đo hai <b>kịch bản khác nhau</b>, ' +
           'không phải hai lớp tối ưu chồng lên nhau trong cùng một lần build. 8,2× là kết quả ' +
           'của việc chỉ <b>một</b> file cần làm lại — với đúng một file để biên dịch, không có ' +
           'gì để chia việc cho 6 lõi, nên chạy <code>make -j6</code> sau khi sửa một file mất ' +
           'thời gian gần bằng <code>make</code> thường (khoảng 0,187 s), không nhanh hơn đáng ' +
           'kể. 2,8× chỉ xuất hiện khi có <b>nhiều việc để chia</b> — build đầy đủ 60 file. Nếu ' +
           'bạn thực sự cần build lại toàn bộ (ví dụ sau <code>make clean</code>), <b>khi đó</b> ' +
           'cả hai mới cộng dồn theo nghĩa: bạn tận dụng được build song song CHO lần build đầy ' +
           'đủ đó — nhưng đó vẫn không phải là "8,2 lần rồi nhân tiếp 2,8 lần" trên cùng một hành ' +
           'động, mà là hai con số trả lời hai câu hỏi khác nhau: "sửa một file thì nhanh hơn ' +
           'bao nhiêu?" và "build lại từ đầu thì song song giúp được bao nhiêu?".' },

    { id: 'b5', k: 'free', tag: 'Bắt lỗi phát biểu',
      q: 'Một đồng nghiệp mới viết trong tài liệu nội bộ: <i>"Makefile của mình không cần định ' +
         'nghĩa quy tắc <code>%.o: %.c</code> vì make đã có 163 quy tắc ngầm lo sẵn việc đó — ' +
         'vậy nên bọn mình bỏ hẳn phần <code>CFLAGS</code> trong Makefile cho gọn, đỡ phải đồng ' +
         'bộ giữa nhiều target."</i> Câu này có một chỗ đúng và một chỗ sai nguy hiểm. Chỉ ra ' +
         'từng phần.',
      rows: 5,
      crit: [
        'Xác nhận phần đúng: quy tắc ngầm <code>%.o: %.c</code> thật sự tồn tại và sẽ chạy nếu không viết quy tắc riêng',
        'Chỉ ra phần sai: quy tắc ngầm dùng <code>CFLAGS</code> RỖNG — bỏ phần <code>CFLAGS</code> nghĩa là build KHÔNG có <code>-Wall</code>, không tối ưu, không cờ nào cả, không phải "gọn" mà là "mất kiểm soát"',
        'Nêu được hậu quả cụ thể: lỗi/cảnh báo mà <code>-Wall -Wextra</code> lẽ ra bắt được (ví dụ các bẫy macro ở Bài 15) sẽ trôi qua trong im lặng'
      ],
      sol: '<b>Đúng một nửa.</b> Phần đúng: quy tắc ngầm cho <code>%.o: %.c</code> có thật, và ' +
           'nếu không viết gì, make sẽ dùng nó. Phần sai và nguy hiểm: quy tắc ngầm đó chạy với ' +
           '<code>CC = cc</code> và <code>CFLAGS</code> <b>rỗng</b>. "Bỏ <code>CFLAGS</code> cho ' +
           'gọn" không có nghĩa là dự án vẫn được build với cờ mặc định hợp lý — nó có nghĩa là ' +
           '<b>không cờ cảnh báo nào chạy</b>. Toàn bộ lớp lỗi mà <code>-Wall -Wextra</code> bắt ' +
           'được (ví dụ bẫy macro và <code>-Wsequence-point</code> ở Bài 15) sẽ trôi qua mà không ' +
           'một dấu hiệu nào. "Gọn" ở đây đổi bằng "mù" — Makefile ngắn hơn nhưng công cụ kiểm ' +
           'tra lỗi đã bị tắt.' },

    { id: 'b6', k: 'free', tag: 'Đọc output',
      q: 'Một file <code>Makefile2</code> (chưa từng chạy) có hai quy tắc, được xem qua ' +
         '<code>cat -A</code> — công cụ soi ký tự vô hình mà bạn đã dùng ở Bài 13:',
      blocks: [
        { t: 'code', env: 'wsl', label: 'cat -A Makefile2', code:
          'report.o: report.c$\n' +
          '^Igcc -c report.c -o report.o$\n' +
          '$\n' +
          'stats.o: stats.c$\n' +
          '    gcc -c stats.c -o stats.o$' } ],
      rows: 5,
      crit: [
        'Chỉ ra quy tắc <code>report.o</code> đúng: dòng công thức mở đầu bằng <code>^I</code> (TAB thật)',
        'Chỉ ra quy tắc <code>stats.o</code> SAI: dòng công thức mở đầu bằng bốn khoảng trắng thường, không phải <code>^I</code>',
        'Dự đoán đúng hậu quả: chạy <code>make stats.o</code> sẽ dừng với <code>missing separator</code> ngay tại dòng đó — <code>report.o</code> không liên quan gì tới lỗi này'
      ],
      sol: 'Dòng thứ hai (<code>^Igcc -c report.c…</code>) bắt đầu bằng <code>^I</code> — ' +
           'đúng, đó là ký tự TAB thật. Dòng cuối (<code>    gcc -c stats.c…</code>) bắt đầu ' +
           'bằng bốn dấu cách hiện ra trần trụi, không có <code>^I</code> — sai. Chạy ' +
           '<code>make -f Makefile2 report.o</code> sẽ thành công; chạy ' +
           '<code>make -f Makefile2 stats.o</code> sẽ dừng với ' +
           '<code>Makefile2:5: *** missing separator.  Stop.</code> Đây đúng là cách chẩn đoán ' +
           'thực dụng: đừng đoán bằng mắt trên trình soạn thảo, đưa qua <code>cat -A</code> và ' +
           'tìm đúng dòng thiếu <code>^I</code>.' },
  ],

  /* ═══ C · Vận dụng — 2 chẩn đoán + 2 tình huống mới + 1 tính toán/biện minh ═══ */
  C: [
    { id: 'c1', k: 'free', truc: 0, tag: 'Chẩn đoán',
      q: 'Một dự án tách các cờ biên dịch chung ra một file riêng để nhiều Makefile con cùng ' +
         'dùng: <code>include common.mk</code> ở đầu Makefile chính, và <code>common.mk</code> ' +
         'chứa <code>CFLAGS = -O2 -DNDEBUG</code>. Không có quy tắc <code>.o</code> nào khai ' +
         '<code>common.mk</code> là tiên quyết. Đồng nghiệp đổi <code>-O2</code> thành ' +
         '<code>-O0 -g</code> trong <code>common.mk</code> để bật gỡ lỗi, chạy <code>make</code>, ' +
         'nhưng <code>objdump</code> vẫn cho thấy binary được tối ưu ở mức cũ. Chẩn đoán, và đề ' +
         'xuất cách chữa <b>không</b> cần build lại toàn bộ dự án mỗi lần đổi cờ.',
      rows: 6,
      crit: [
        'Nhận diện đúng cơ chế: <code>common.mk</code> chưa từng được khai là tiên quyết của bất kỳ file <code>.o</code> nào, nên đổi nó không kích hoạt build lại gì cả — giống hệt cái bẫy phụ thuộc header, chỉ khác chất liệu là file cờ chung chứ không phải header',
        'Từ chối cách chữa "luôn make clean && make" như giải pháp chính thức — chỉ nêu nó như một cách kiểm chứng tạm, không phải quy trình hằng ngày',
        'Đề xuất cách chữa đúng: thêm <code>common.mk</code> vào danh sách tiên quyết của mọi file <code>.o</code> (ví dụ qua pattern rule <code>%.o: %.c common.mk</code>), để make coi nó là một phụ thuộc thật'
      ],
      sol: '<b>Cùng một bệnh, khác chất liệu:</b> <code>common.mk</code> ảnh hưởng tới NỘI DUNG ' +
           'của việc build (nó đổi <code>CFLAGS</code>), nhưng nó không phải là một <b>tiên ' +
           'quyết đã khai báo</b> của bất kỳ quy tắc <code>.o</code> nào. Với make, thay đổi ở ' +
           'đó "không tồn tại" — đúng luật của trục 0: chỉ so mtime của những gì được liệt kê. ' +
           '<code>make clean && make</code> "chữa" được triệu chứng (vì nó build lại tất cả vô ' +
           'điều kiện) nhưng vứt bỏ toàn bộ lợi ích của build tăng dần cho mọi lần đổi nhỏ khác.<br>' +
           'Cách chữa đúng gốc: khai <code>common.mk</code> là tiên quyết thật, ví dụ ' +
           '<code>%.o: %.c common.mk</code> (hoặc gộp vào biến <code>DEPS</code> nếu đang dùng ' +
           '<code>-MMD -MP</code>, vì trình biên dịch không tự biết file <code>.mk</code> tồn ' +
           'tại — bạn phải khai tay). Sau đó, đổi <code>common.mk</code> sẽ khiến make coi MỌI ' +
           'file <code>.o</code> là lỗi thời, và chỉ build lại đúng những gì cần — đúng tinh ' +
           'thần build tăng dần, chỉ mở rộng phạm vi "tiên quyết" ra khỏi các file <code>.c</code>/<code>.h</code>.' },

    { id: 'c2', k: 'free', truc: 1, tag: 'Tình huống mới',
      q: 'Một pipeline CI chạy <code>make test</code> sau mỗi lần build, mục tiêu ' +
         '<code>test:</code> thực thi bộ unit test và không có <code>.PHONY</code>. Một hôm, ' +
         'bước build trước đó (do một Makefile khác trong cùng thư mục output) tạo ra một file ' +
         'nhị phân tên đúng <code>test</code>. Từ hôm đó, CI luôn báo xanh (thành công) dù bộ ' +
         'unit test <b>không hề chạy</b> — không ai sửa code liên quan tới test. Chẩn đoán, và ' +
         'đề xuất MỘT quy tắc kỷ luật (không phải một lần sửa tay) để lớp lỗi này không tái diễn ' +
         'trong toàn bộ dự án.',
      rows: 6,
      crit: [
        'Nhận diện đúng nguyên nhân: file nhị phân tên <code>test</code> đã tồn tại, không có tiên quyết nào mới hơn nó, nên make coi mục tiêu <code>test</code> đã xong — công thức chạy unit test chưa từng được gọi',
        'Chỉ ra vì sao CI không phát hiện: mã thoát của <code>make test</code> vẫn là 0, đúng như một lần chạy test thành công thật',
        'Đề xuất quy tắc kỷ luật cấp dự án, không phải sửa một chỗ: khai <code>.PHONY</code> cho MỌI mục tiêu-động từ ngay khi tạo nó — có thể gộp thành một dòng <code>.PHONY: all clean install test …</code> được rà soát trong code review, không chỉ vá riêng target <code>test</code>'
      ],
      sol: 'File nhị phân <code>test</code> — vốn không liên quan gì tới mục tiêu ' +
           '<code>test:</code> chạy unit test — vô tình trùng tên. make chỉ thấy: mục tiêu ' +
           '<code>test</code> tồn tại như một file, không tiên quyết nào khai báo, nên "đã xong". ' +
           'Công thức chạy bộ test <b>chưa từng được gọi</b>, nhưng <code>make test</code> vẫn ' +
           'thoát mã 0 — với CI, mã 0 là toàn bộ định nghĩa của "thành công", nên nó báo xanh một ' +
           'cách hoàn toàn "đúng luật" mà vẫn sai hoàn toàn về mặt thực tế.<br>' +
           'Vá đúng một target không đủ — ngày mai một target khác (<code>lint</code>, ' +
           '<code>docs</code>, <code>deploy</code>) có thể trùng tên với một file output khác. ' +
           'Quy tắc kỷ luật cần ở mức dự án: <b>mọi mục tiêu-động từ phải được thêm vào ' +
           '<code>.PHONY</code> tại thời điểm nó được viết</b>, và điều này nên nằm trong checklist ' +
           'review Makefile — không chờ tới khi một file trùng tên xuất hiện mới vá.' },

    { id: 'c3', k: 'free', truc: 2, tag: 'Chẩn đoán',
      q: 'Dữ liệu thật, mới đo cho bộ này. Makefile kiểu Kbuild có ' +
         '<code>CONFIG_GPIO = y</code> và <code>CONFIG_UART = n</code>. Nhưng khác với B3, lần ' +
         'này <code>mainkb.c</code> có dòng <code>int uart_init(void);</code> và <b>gọi thẳng</b> ' +
         '<code>uart_init()</code> vô điều kiện trong <code>main()</code>, không kiểm tra gì cả.',
      blocks: [
        { t: 'code', env: 'wsl', label: 'make -f MakefileKB', code:
          '  CC      gpio.o\n' +
          '  CC      mainkb.o\n' +
          '  LD      app\n' +
          '/usr/bin/x86_64-linux-gnu-ld.bfd: mainkb.o: in function `main\':\n' +
          'mainkb.c:(.text+0xe): undefined reference to `uart_init\'\n' +
          'collect2: error: ld returned 1 exit status\n' +
          'make: *** [MakefileKB:18: app] Error 1' } ],
      rows: 6,
      crit: [
        'Xác định đúng nguyên nhân: <code>CONFIG_UART = n</code> khiến <code>uart.o</code> bị ghi vào <code>obj-n</code> (bị bỏ qua), nhưng <code>mainkb.c</code> vẫn gọi <code>uart_init()</code> một cách vô điều kiện',
        'Nói rõ đây KHÔNG phải lỗi của obj-y/obj-n — cơ chế make đã làm đúng; lỗi nằm ở mã C không tôn trọng cấu hình',
        'Đề xuất cách chữa đúng tinh thần Kbuild: bọc lời gọi bằng <code>#ifdef CONFIG_UART</code>/<code>#endif</code> trong mã C (không chỉ dựa vào Makefile để loại file), y hệt cách kernel thật làm với mọi driver tuỳ chọn'
      ],
      sol: '<code>CONFIG_UART = n</code> làm dòng <code>obj-$(CONFIG_UART) += uart.o</code> trở ' +
           'thành <code>obj-n += uart.o</code> — đúng như thiết kế, <code>uart.o</code> không ' +
           'được biên dịch và không nằm trong <code>$(obj-y)</code> mà quy tắc liên kết dùng. ' +
           'Nhưng <code>mainkb.c</code> vẫn khai báo và <b>gọi thẳng</b> <code>uart_init()</code> ' +
           'mà không có bất kỳ điều kiện nào — nên tới giai đoạn liên kết (Bài 15), ' +
           'trình liên kết đi tìm định nghĩa của <code>uart_init</code>, không thấy nó ở đâu cả ' +
           '(vì <code>uart.o</code> chưa bao giờ được build), và báo ' +
           '<code>undefined reference</code>.<br>' +
           'Đây không phải lỗi của obj-y/obj-n — make đã làm đúng chính xác điều nó được yêu cầu. ' +
           'Lỗi nằm ở việc mã C và cấu hình build không đồng bộ: loại một file khỏi build (ở ' +
           'Makefile) không tự động loại các lời gọi tới nó (trong mã C). Kernel Linux giải quyết ' +
           'bằng cách bọc mọi lời gọi tuỳ chọn trong <code>#ifdef CONFIG_UART</code> ... ' +
           '<code>#endif</code> — khi <code>CONFIG_UART</code> không được định nghĩa, tiền xử lý ' +
           '(Bài 15) xoá hẳn lời gọi đó trước khi trình biên dịch nhìn thấy nó, nên không còn gì ' +
           'để liên kết thất bại.' },

    { id: 'c4', k: 'free', tag: 'Tình huống mới',
      q: 'Bạn được giao cross-compile một dự án cho ARM: toolchain thật là ' +
         '<code>aarch64-linux-gnu-gcc</code>. Makefile có một file <code>.c</code> ' +
         '<b>không nằm trong danh sách <code>OBJS</code></b> (bị bỏ quên khi thêm module mới), ' +
         'nhưng bạn gõ thẳng <code>make helper.o</code> để build riêng nó — không qua mục tiêu ' +
         'chính. Makefile có đặt <code>CC = aarch64-linux-gnu-gcc</code> ở đầu file. File ' +
         '<code>.o</code> sinh ra build có đúng kiến trúc ARM không? Biện minh bằng cơ chế, ' +
         'không chỉ đoán.',
      rows: 5,
      crit: [
        'Nhận ra đây KHÔNG liên quan tới quy tắc ngầm — vì Makefile CÓ định nghĩa pattern rule của riêng nó (%.o: %.c dùng $(CC)), nên quy tắc đó được dùng, không phải quy tắc ngầm với cc mặc định',
        'Vì <code>CC</code> được gán trong CHÍNH Makefile này (không phải biến môi trường bị ghi đè), lệnh build helper.o vẫn dùng đúng $(CC) = aarch64-linux-gnu-gcc',
        'Kết luận đúng: file .o vẫn build đúng kiến trúc ARM — vấn đề duy nhất là nó không được LIÊN KẾT vào chương trình chính vì thiếu trong OBJS, không phải vấn đề kiến trúc'
      ],
      sol: 'Không nhầm lẫn: quy tắc ngầm chỉ được dùng khi Makefile <b>không có</b> pattern rule ' +
           'riêng cho <code>%.o: %.c</code>. Ở đây Makefile CÓ định nghĩa nó, dùng biến ' +
           '<code>$(CC)</code>, và <code>CC</code> đã được gán <code>aarch64-linux-gnu-gcc</code> ' +
           'ngay trong file — không phải một biến môi trường có thể bị ghi đè ngoài ý muốn. Gõ ' +
           '<code>make helper.o</code> trực tiếp vẫn đi qua đúng quy tắc đó, dùng đúng toolchain ' +
           'ARM. File <code>.o</code> sinh ra hoàn toàn đúng kiến trúc.<br>' +
           'Cái thiếu duy nhất là <code>helper.o</code> không nằm trong <code>OBJS</code>, nên nó ' +
           'không được liên kết vào chương trình chính khi bạn gõ <code>make</code> (mục tiêu ' +
           'mặc định) — đúng trục 0: một phụ thuộc chưa khai báo thì make không biết tới, dù bạn ' +
           'build lẻ file đó thành công tuyệt đối. Bài học ở đây: "build được lẻ một file" và ' +
           '"file đó có mặt trong sản phẩm cuối" là hai câu hỏi khác nhau.' },

    { id: 'c5', k: 'free', tag: 'Tính toán / Chọn và biện minh',
      q: 'Dự án của bạn có 200 file <code>.c</code>, build đầy đủ một tiến trình mất <b>40 s</b>. ' +
         'Máy CI có 8 lõi. Dựa trên tỉ lệ tăng tốc <b>2,8× trên 6 lõi</b> đã đo được trong bài ' +
         'học (không phải 6× lý thuyết), <b>ước lượng</b> thời gian <code>make -j8</code> sẽ mất, ' +
         'và <b>biện minh</b> cho việc con số đó không tỉ lệ thuận với số lõi.',
      rows: 5,
      crit: [
        'Đưa ra một ước lượng có cơ sở (không cần chính xác tuyệt đối) — ví dụ ngoại suy quanh 12–16 s, KHÔNG phải 5 s (40/8) vì đó là ngoại suy tuyến tính sai',
        'Không dùng phép chia đơn giản 40/8 = 5s làm câu trả lời cuối — phải chỉ rõ đó là ngoại suy sai vì giả định "song song hoá hoàn hảo"',
        'Nêu đúng nguyên nhân giới hạn tốc độ: bước liên kết cuối cùng chạy trên MỘT tiến trình duy nhất, và nhiều tiến trình gcc cùng đọc header từ đĩa gây tranh chấp — cả hai đều không cải thiện khi tăng số lõi'
      ],
      sol: '<b>Không có một số chính xác duy nhất</b> — đây là ước lượng có lý luận, không phải ' +
           'phép tính đóng. Sai lầm phổ biến nhất là chia tuyến tính: 40 s ÷ 8 = 5 s. Số đo thật ' +
           'của bài học cho thấy điều đó KHÔNG xảy ra: trên 6 lõi, tốc độ chỉ tăng 2,8×, không ' +
           'phải 6×. Áp dụng tỉ lệ "hiệu suất giảm dần" tương tự cho 8 lõi, một ước lượng hợp lý ' +
           'rơi vào khoảng <b>12–16 s</b> (tức nhanh hơn khoảng 2,5–3,3×), chứ không phải 5 s.<br>' +
           'Lý do gốc, không đổi khi thêm lõi: <b>bước liên kết cuối cùng luôn là một tiến trình ' +
           'duy nhất</b> — không ai song song hoá được nó, nên nó đặt một sàn cứng cho tổng thời ' +
           'gian. Thêm nữa, nhiều tiến trình <code>gcc</code> cùng đọc header từ đĩa/cache tạo ra ' +
           'tranh chấp I/O, và tranh chấp đó càng rõ khi số tiến trình càng tăng. Cả hai hiệu ứng ' +
           'này không biến mất khi có nhiều lõi hơn — chúng là lý do đường tăng tốc luôn cong xuống ' +
           'dưới đường lý thuyết "N lõi = N lần nhanh hơn", bất kể N là 6 hay 8.' },
  ],

  /* ═══ D · Ôn xen kẽ — 3 câu về các bài trước mà Bài 16 dựa vào ═══ */
  D: [
    { id: 'd1', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: 'Ở <b>Bài 6</b>, lệnh nào cho bạn xem thời gian sửa đổi cuối cùng (mtime) của một ' +
         'file mà <b>không</b> làm thay đổi giá trị đó — chính con số mà toàn bộ luật của ' +
         '<code>make</code> trong bài này dựa vào?',
      opts: [
        '<code>touch file</code>',
        '<code>stat file</code> (hoặc <code>ls -l file</code>)',
        '<code>cat file</code>',
        '<code>chmod 644 file</code>'
      ],
      a: 1,
      why: '<code>stat</code> và <code>ls -l</code> đều <b>đọc</b> mtime mà không đổi nó. ' +
           '<code>touch</code> — dùng liên tục trong bài 16 để mô phỏng "vừa sửa file" — lại ' +
           'chính là lệnh <b>thay đổi</b> mtime mà không đổi nội dung, đúng bằng chứng cho luật ' +
           '"make chỉ so thời gian sửa file, không đọc nội dung".' },

    { id: 'd2', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: 'Ở <b>Bài 4</b>, mã thoát (exit code) <b>0</b> theo quy ước có nghĩa gì — và vì sao ' +
         'điều đó khiến lỗi thiếu <code>.PHONY</code> nguy hiểm hơn hẳn lỗi ' +
         '<code>missing separator</code>?',
      opts: [
        '0 nghĩa là "không có gì thay đổi" — không liên quan tới thành công/thất bại',
        '0 nghĩa là "lệnh đã hoàn thành công việc của nó" theo quy ước; mọi công cụ tự động (CI, script) coi 0 là thành công, kể cả khi công thức make chưa từng chạy',
        '0 nghĩa là "lệnh chạy nhưng có cảnh báo"',
        '0 chỉ có ý nghĩa với lệnh <code>test</code>, không áp dụng cho <code>make</code>'
      ],
      a: 1,
      why: 'Mã thoát 0 là lời hứa "tôi đã làm xong việc" theo đúng quy ước Bài 4 đã dạy. ' +
           '<code>missing separator</code> dừng make với mã <b>2</b> — ồn ào, dễ thấy, sửa ngay. ' +
           'Thiếu <code>.PHONY</code> khi có file trùng tên lại cho ra mã <b>0</b> — mọi công cụ ' +
           'tự động tin tưởng con số đó sẽ coi là thành công, dù công thức chưa từng chạy. Đây là ' +
           'lý do lesson gọi lớp lỗi này là "im lặng" và nguy hiểm hơn lớp lỗi "ồn ào".' },

    { id: 'd3', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: 'Ở <b>Bài 15</b>, thông báo <code>undefined reference to \'X\'</code> chứng tỏ điều gì ' +
         'về quá trình build — và vì sao Bài 16 nhắc lại đúng thông báo này khi dòng liên kết ' +
         'của Makefile dùng sai biến tự động?',
      opts: [
        'File .c có lỗi cú pháp, cần mở ra sửa ngay',
        'Ba giai đoạn đầu (tiền xử lý, biên dịch, hợp dịch) đã xong sạch; chỉ giai đoạn liên kết (thứ 4) không tìm thấy định nghĩa của X ở bất cứ file .o nào được đưa vào lệnh liên kết',
        'Trình biên dịch không hỗ trợ hàm X trên kiến trúc hiện tại',
        'Header khai báo X bị thiếu #include'
      ],
      a: 1,
      why: 'Ba giai đoạn đầu chắc chắn đã thành công — <code>undefined reference</code> là ' +
           'thông báo riêng của trình liên kết (giai đoạn 4). Ở Bài 16, dùng <code>$&lt;</code> ' +
           '(chỉ tiên quyết đầu tiên) thay <code>$^</code> (toàn bộ tiên quyết) ở dòng liên kết ' +
           'khiến một số file <code>.o</code> — dù đã build đúng, đang nằm trên đĩa — không được ' +
           'đưa vào lệnh <code>gcc -o … </code>. Kết quả là đúng lỗi <code>undefined reference</code> ' +
           'của Bài 15, nhưng nguyên nhân lần này nằm ở Makefile, không nằm ở mã nguồn.' },
  ],

  /* ═══ E · Thực hành — 2 dự đoán + 2 gõ lệnh + 1 sửa lỗi + 1 thử thách ═══ */
  E: [
    { id: 'e1', k: 'free', tag: 'Dự đoán output',
      q: 'Dự án ba file (<code>main.c</code>/<code>ops.c</code>/<code>ops.h</code>) đã build ' +
         'xong với Makefile pattern-rule (<code>OBJS = main.o ops.o</code>). Bạn thêm một file ' +
         '<b>mới</b> <code>extra.c</code> (một hàm không được gọi bởi ai) nhưng <b>không</b> ' +
         'thêm nó vào <code>OBJS</code>. <b>Dự đoán trước</b>: chạy <code>make</code> có biên ' +
         'dịch <code>extra.c</code> không? Sau đó tự tay tái tạo và kiểm tra bằng ' +
         '<code>ls *.o</code>.',
      rows: 5,
      crit: [
        'Dự đoán đúng: KHÔNG có <code>extra.o</code> nào xuất hiện, <code>make</code> báo up to date',
        'Giải thích được lý do trước khi xem đáp án: <code>extra.c</code> không nằm trong <code>OBJS</code>, không quy tắc nào đòi nó',
        'Tự tay tái tạo bằng terminal và xác nhận bằng <code>ls *.o</code> khớp với dự đoán'
      ],
      sol: '<b>Không biên dịch.</b> Đây đúng là kịch bản đã đo ở B1: <code>make</code> báo ' +
           '<code>\'program\' is up to date.</code>, và <code>ls *.o</code> chỉ liệt kê ' +
           '<code>main.o ops.o</code> — không có <code>extra.o</code>. make không quét thư mục ' +
           'tìm file <code>.c</code> mới; nó chỉ theo đúng danh sách <code>OBJS</code> bạn viết.' },

    { id: 'e2', k: 'free', tag: 'Dự đoán output',
      q: 'Một thư mục <b>hoàn toàn mới</b>, chưa từng build, có <code>main.c</code>, ' +
         '<code>ops.c</code>, <code>ops.h</code> và Makefile dùng <code>-MMD -MP</code> cùng ' +
         '<code>-include $(DEPS)</code> (chưa có file <code>.d</code> nào tồn tại). <b>Dự đoán ' +
         'trước</b>: chạy <code>make -n</code> có báo lỗi vì thiếu file <code>.d</code> không? ' +
         'Sau đó tự tay tái tạo và kiểm tra.',
      rows: 5,
      crit: [
        'Dự đoán đúng: KHÔNG lỗi — make -n in ra đủ ba lệnh gcc, không nhắc gì tới .d bị thiếu',
        'Giải thích được dấu gạch đầu trong <code>-include</code> (khác <code>include</code> trần) cho phép make im lặng bỏ qua file chưa tồn tại',
        'Tự tay tái tạo và xác nhận output <code>make -n</code> khớp với output <code>make</code> thật'
      ],
      sol: '<b>Không lỗi.</b> <code>make -n</code> in ra đúng ba lệnh <code>gcc … -MMD -MP -c …</code> ' +
           'rồi lệnh liên kết — giống hệt khi chạy <code>make</code> thật. Dấu gạch đầu của ' +
           '<code>-include</code> (khác <code>include</code> trần) nói với make: "nạp các file ' +
           'này nếu có, không sao nếu chưa có". Lần build đầu tiên chưa có file <code>.d</code> ' +
           'nào — điều đó tự nó không phải lỗi, chỉ có nghĩa là chưa có phụ thuộc header nào ' +
           'được biết tới CHO ĐẾN SAU lần build này, khi các file <code>.d</code> vừa được sinh ' +
           'ra sẽ được dùng cho lần <code>make</code> tiếp theo.' },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh',
      q: 'Viết đúng MỘT lệnh <code>make</code> để in ra toàn bộ các lệnh <b>sẽ</b> chạy cho ' +
         'mục tiêu mặc định, mà <b>không thực thi</b> một lệnh nào trong số đó.',
      rows: 3,
      crit: [
        'Lệnh có <code>make</code> và cờ tương đương "chỉ in, không chạy": <code>-n</code>, hoặc dạng dài <code>--dry-run</code>/<code>--just-print</code>/<code>--recon</code>',
        'Không kèm theo tên mục tiêu cụ thể nào khác (đề bài yêu cầu mục tiêu MẶC ĐỊNH)'
      ],
      sol: '<code>make -n</code> (tương đương <code>make --dry-run</code>, ' +
           '<code>make --just-print</code>, hoặc <code>make --recon</code>). Đây là thói quen an ' +
           'toàn khi mở một Makefile lạ tải từ Internet — xem trước toàn bộ kịch bản trước khi ' +
           'cho phép một lệnh nào thực thi.' },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh',
      q: 'Viết đúng MỘT lệnh <code>make</code> để build với số tiến trình song song <b>bằng ' +
         'đúng số CPU của máy hiện tại</b> (không hard-code một con số cụ thể), và ghi toàn bộ ' +
         'output (cả lỗi) ra file <code>build.log</code>.',
      rows: 3,
      crit: [
        'Dùng <code>-j</code> kèm <code>$(nproc)</code> (không phải một số cứng như <code>-j6</code>) để tự thích nghi với máy hiện tại',
        'Chuyển hướng cả stdout và stderr vào <code>build.log</code> — ví dụ <code>&gt; build.log 2&gt;&amp;1</code>'
      ],
      sol: '<code>make -j$(nproc) &gt; build.log 2&gt;&amp;1</code>. Dùng <code>$(nproc)</code> ' +
           'thay vì một số cứng nghĩa là cùng lệnh này chạy đúng trên máy 6 lõi hôm nay và một ' +
           'máy CI 32 lõi ngày mai, không cần sửa gì. <code>2&gt;&amp;1</code> đảm bảo cả lỗi từ ' +
           '<code>gcc</code>/<code>ld</code> cũng vào cùng file log, đúng kỹ thuật gộp luồng bạn ' +
           'đã học ở Bài 10.' },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi',
      q: 'Makefile sau build một chương trình một file. Chạy <code>make</code> không báo lỗi ' +
         'cú pháp Makefile nào, nhưng thất bại theo cách khó hiểu. Tìm và sửa lỗi.',
      blocks: [
        { t: 'code', env: 'file', label: 'Makefile', code:
          'CC = gcc\n' +
          'OBJS = main.o\n' +
          'app: $(OBJ)\n' +
          '\t$(CC) -o $@ $^\n' +
          '%.o: %.c\n' +
          '\t$(CC) -c $< -o $@' },
        { t: 'code', env: 'wsl', label: 'make (transcript thật)', code:
          'gcc -o app \n' +
          'gcc: fatal error: no input files\n' +
          'compilation terminated.\n' +
          'make: *** [Makefile:4: app] Error 1' } ],
      rows: 5,
      crit: [
        'Xác định đúng lỗi: dòng <code>app: $(OBJ)</code> gõ nhầm <code>OBJ</code> — biến thật được định nghĩa là <code>OBJS</code>',
        'Giải thích vì sao make KHÔNG báo "biến chưa định nghĩa": biến make chưa gán mặc định giá trị RỖNG một cách im lặng, không phải lỗi',
        'Giải thích được vì sao lệnh liên kết trở thành <code>gcc -o app</code> (không tham số nguồn) — $^ mở rộng từ danh sách tiên quyết rỗng',
        'Đưa ra bản sửa đúng: đổi <code>$(OBJ)</code> thành <code>$(OBJS)</code>'
      ],
      sol: '<b>Lỗi:</b> dòng <code>app: $(OBJ)</code> tham chiếu biến <code>OBJ</code>, nhưng ' +
           'biến được định nghĩa ở trên là <code>OBJS</code> (có chữ S). make <b>không</b> báo ' +
           'lỗi "biến chưa định nghĩa" — một biến make chưa gán chỉ đơn giản mở rộng thành chuỗi ' +
           '<b>rỗng</b>, một cách hoàn toàn im lặng. Vậy quy tắc thực chất trở thành ' +
           '<code>app:</code> — không tiên quyết nào. Vì mục tiêu <code>app</code> chưa tồn tại, ' +
           'make vẫn chạy công thức: <code>$(CC) -o $@ $^</code> mở rộng thành ' +
           '<code>gcc -o app</code> — không một file nguồn nào, vì <code>$^</code> cũng rỗng. ' +
           '<code>gcc</code> nhận đúng lỗi <code>fatal error: no input files</code>.<br>' +
           '<b>Sửa:</b> đổi <code>app: $(OBJ)</code> thành <code>app: $(OBJS)</code>. Đây là một ' +
           'bài học riêng, khác cái bẫy phụ thuộc header: một <b>biến gõ sai tên</b> trong make ' +
           'không dừng lại bằng lỗi rõ ràng như trong hầu hết ngôn ngữ lập trình — nó âm thầm trở ' +
           'thành rỗng, và hậu quả chỉ lộ ra ở một bước rất xa chỗ gõ sai.' },

    { id: 'e6', k: 'free', tag: 'Thử thách',
      q: 'Chương trình <code>program</code> của bạn ở bài này gọi <code>printf</code>, nhưng ' +
         'bạn chưa từng biên dịch <code>printf</code> — không file <code>.c</code> nào trong ' +
         'thư mục chứa định nghĩa của nó. Dùng <code>nm program | grep \' U printf\'</code> và ' +
         '<code>ldd program</code> để điều tra: <code>printf</code> đến từ đâu, và vì sao ' +
         '<code>make</code> không cần biết gì về nó để build thành công? Rồi đi xa hơn — build ' +
         'lại đúng <code>main.c</code> này bằng <code>gcc -static</code> và so kích thước. ' +
         '<b>Câu hỏi thứ hai — vì sao chênh lệch đó lớn đến vậy, và vì sao thiết bị nhúng vẫn ' +
         'thường CHỌN bản nặng hơn — chưa cần trả lời trọn vẹn ở đây.</b> Đó chính là câu hỏi mà ' +
         '<b>Bài 17 — Thư viện tĩnh và động</b> dành nguyên một bài để trả lời, bằng số đo thật ' +
         'trên đúng máy của bạn.',
      rows: 5,
      crit: [
        'Dùng đúng công cụ và trích ra được: <code>printf@GLIBC_2.2.5</code> là ký hiệu <b>U</b> (chưa định nghĩa) ở cả file .o và file thực thi',
        'Nêu được <code>ldd</code> chỉ ra ai giải quyết ký hiệu đó lúc chạy: <code>libc.so.6</code>',
        'Giải thích được vì sao make không cần biết gì về printf: trình liên kết (giai đoạn 4 của Bài 15) chỉ cần chứng minh KÝ HIỆU có nơi cung cấp — với thư viện động, "nơi cung cấp" chỉ là một cái TÊN được ghi lại, không phải mã đã có sẵn trong thư mục dự án',
        'So được hai kích thước đo thật (16 048 B động so với 816 944 B tĩnh — chênh khoảng 51 lần) và ghi nhận đây là câu hỏi Bài 17 sẽ mổ xẻ, không cố tự giải thích cạn kẽ nguyên nhân'
      ],
      solBlocks: [
        { t: 'code', where: 'wsl', label: 'nm program | grep \' U printf\'', code:
          '                 U printf@GLIBC_2.2.5' },
        { t: 'code', where: 'wsl', label: 'ldd program', code:
          '\tlinux-vdso.so.1 (0x00007faa80d39000)\n' +
          '\tlibc.so.6 => /usr/lib/x86_64-linux-gnu/libc.so.6 (0x00007faa80a00000)\n' +
          '\t/lib64/ld-linux-x86-64.so.2 (0x00007faa80d3b000)' },
        { t: 'code', where: 'wsl', label: 'stat -c \'%s %n\' program program_static', code:
          '16048 program\n816944 program_static' },
        { t: 'p', x:
          '<code>printf</code> mang chữ <b>U</b> — chưa định nghĩa — ở cả file <code>.o</code> ' +
          'và file thực thi cuối cùng, đúng khái niệm Bài 15. Với thư viện <b>động</b>, trình ' +
          'liên kết chấp nhận một ký hiệu U miễn nó tin rằng <b>một cái tên</b> (ở đây là ' +
          '<code>libc.so.6</code>, thấy rõ trong <code>ldd</code>) sẽ cung cấp nó lúc chạy — nó ' +
          'không cần có mã thật trong tay lúc build. Đó là vì sao thư mục ' +
          '<code>~/bai16</code> không hề chứa mã nguồn của <code>printf</code> mà make vẫn build ' +
          'thành công: make chỉ lo file <code>.o</code>/<code>.c</code> của <i>bạn</i>; việc ' +
          '<code>printf</code> tồn tại ở đâu là chuyện của trình liên kết và, sau đó, của trình ' +
          'thông dịch động lúc chương trình khởi động.' },
        { t: 'p', x:
          '16 048 byte so với 816 944 byte — khoảng <b>51 lần</b> — là con số thật, và câu hỏi ' +
          '"vì sao chênh đến vậy, và vì sao thiết bị nhúng nhiều khi vẫn chọn bản nặng hơn" ' +
          '<b>chưa được trả lời ở đây</b>. Bài 17 sẽ mở khối 800 KB đó ra, cho bạn tự build cả ' +
          '<code>.a</code> và <code>.so</code>, và trả lời bằng số đo trên hệ thống thật — không ' +
          'chỉ một chương trình, mà cả một hệ nhiều chương trình dùng chung thư viện.' }
      ]
    },
  ],

  /* ═══ F · Bí ở đâu thì đọc lại đâu ═══ */
  diag: [
    ['A1, B1, C1, E1',
     'Bạn còn tin rằng một phụ thuộc "hiển nhiên đúng" (một script sinh mã, một file cờ ' +
     'chung, một <code>#include</code>) tự động được <code>make</code> biết tới. Nó chỉ biết ' +
     'những gì <b>bạn liệt kê</b> trong danh sách tiên quyết — không hơn, không kém.',
     '<a href="#/bai-16#make-quyet-dinh-bang-dong-ho-khong-bang-noi-dung">Đọc lại Bài 16 · make quyết định bằng đồng hồ, không bằng nội dung</a>'],

    ['A2, B2, C2',
     'Bạn còn nghĩ <code>make</code> phân biệt được mục tiêu nào là "hành động" và mục tiêu ' +
     'nào là "file". Nó không phân biệt — một file trùng tên là đủ để một mục tiêu-động từ im ' +
     'lặng không làm gì, mà vẫn thoát mã 0.',
     '<a href="#/bai-16#phony-khi-muc-tieu-khong-phai-la-mot-file">Đọc lại Bài 16 · .PHONY — khi mục tiêu không phải là một file</a>'],

    ['A3, B3, C3',
     'Bạn chưa nắm cơ chế <code>obj-$(CONFIG_X)</code>: tên biến đích được ghép từ GIÁ TRỊ của ' +
     'biến cấu hình ngay lúc make đọc dòng đó, cho ra ba hành vi từ một dòng — không cần ' +
     '<code>ifeq</code>.',
     '<a href="#/bai-16#doc-makefile-kieu-kernel">Đọc lại Bài 16 · Đọc Makefile kiểu kernel</a>'],

    ['A4',
     'Bạn nhầm <code>$?</code> (chỉ những tiên quyết MỚI HƠN mục tiêu) với <code>$&lt;</code> ' +
     '(tiên quyết đầu tiên) hoặc <code>$^</code> (toàn bộ). Đọc lại bảng biến tự động và mẹo ' +
     'nhớ <code>$@</code>/<code>$&lt;</code>.',
     '<a href="#/bai-16#rut-makefile-15-dong-xuong-ma-manh-hon">Đọc lại Bài 16 · Rút Makefile 15 dòng xuống, mà mạnh hơn</a>'],

    ['A5, B4',
     'Bạn chưa phân biệt <code>=</code> (tính lại mỗi lần dùng) với <code>:=</code> (tính một ' +
     'lần, ngay tại dòng gán). Đây là nguồn của rất nhiều Makefile "trông đúng" mà chạy sai.',
     '<a href="#/bai-16#rut-makefile-15-dong-xuong-ma-manh-hon">Đọc lại Bài 16 · Rút Makefile 15 dòng xuống, mà mạnh hơn</a>'],

    ['A6, B5, C4',
     'Bạn chưa biết quy tắc ngầm dùng <code>CC = cc</code> và <code>CFLAGS</code> RỖNG — thiếu ' +
     'một pattern rule không gây lỗi, nó chỉ lặng lẽ build không cờ cảnh báo nào.',
     '<a href="#/bai-16#make-da-biet-san-163-quy-tac-truoc-khi-ban-viet-dong-nao">Đọc lại Bài 16 · make đã biết sẵn 163 quy tắc trước khi bạn viết dòng nào</a>'],

    ['A7, E2',
     'Bạn chưa vững cơ chế <code>-MMD -MP</code>: nó khiến trình biên dịch tự khai báo phụ ' +
     'thuộc header vào file <code>.d</code>, và <code>-include</code> (có gạch đầu) chấp nhận ' +
     'im lặng nếu file đó chưa tồn tại.',
     '<a href="#/bai-16#cai-bay-lon-nhat-phu-thuoc-header">Đọc lại Bài 16 · Cái bẫy lớn nhất: phụ thuộc header</a>'],

    ['A8',
     'Bạn chưa thuộc các cờ dùng hằng ngày của <code>make</code> — đặc biệt khác biệt giữa ' +
     '<code>-n</code> (chỉ xem trước) và <code>-B</code> (buộc build lại tất cả).',
     '<a href="#/bai-16#make-quyet-dinh-bang-dong-ho-khong-bang-noi-dung">Đọc lại Bài 16 · make quyết định bằng đồng hồ, không bằng nội dung</a>'],

    ['B6, E5',
     'Bạn chưa quen soi Makefile bằng <code>cat -A</code> để phân biệt TAB thật (<code>^I</code>) ' +
     'với khoảng trắng thường — nguồn của lỗi <code>missing separator</code>.',
     '<a href="#/bai-16#mot-quy-tac-gom-dung-ba-phan">Đọc lại Bài 16 · Một quy tắc gồm đúng ba phần</a>'],

    ['C5',
     'Bạn ngoại suy tuyến tính từ tỉ lệ tăng tốc song song (nghĩ N lõi = N lần nhanh hơn). Số ' +
     'đo thật là 2,8× trên 6 lõi, không phải 6× — vì bước liên kết cuối không song song được và ' +
     'các tiến trình tranh nhau đĩa.',
     '<a href="#/bai-16#van-de-ma-make-sinh-ra-de-giai">Đọc lại Bài 16 · Vấn đề mà make sinh ra để giải</a>'],

    ['D1',
     'Bạn quên lệnh nào đọc mtime mà không đổi nó. <code>stat</code>/<code>ls -l</code> đọc; ' +
     '<code>touch</code> lại chính là lệnh THAY ĐỔI mtime mà không đổi nội dung — đúng bằng ' +
     'chứng cho luật của <code>make</code>.',
     '<a href="#/bai-06#doc-cho-het-mot-dong-ls-l">Đọc lại Bài 6 · Đọc cho hết một dòng ls -l</a>'],

    ['D2',
     'Bạn quên quy ước mã thoát 0 = "đã làm xong việc". Đây là lý do lỗi thiếu ' +
     '<code>.PHONY</code> nguy hiểm hơn <code>missing separator</code>: một script CI tin ' +
     'tưởng mã 0 một cách vô điều kiện.',
     '<a href="#/bai-04#ma-thoat-cach-may-tra-loi-co-duoc-khong">Đọc lại Bài 4 · Mã thoát — cách máy trả lời "có được không"</a>'],

    ['D3',
     'Bạn quên rằng <code>undefined reference</code> chứng tỏ ba giai đoạn đầu đã xong sạch, ' +
     'chỉ giai đoạn liên kết (thứ 4) không tìm thấy định nghĩa. Đây là lý do cùng thông báo có ' +
     'thể xuất phát từ lỗi Makefile ($&lt; thay $^) chứ không phải lỗi mã nguồn.',
     '<a href="#/bai-15#giai-doan-4-lien-ket-khai-bao-dinh-nghia-va-ky-hieu">Đọc lại Bài 15 · Giai đoạn 4 — Liên kết: khai báo, định nghĩa và ký hiệu</a>'],

    ['E6',
     'Câu thử thách này cố ý bỏ ngỏ. Nếu bạn muốn câu trả lời đầy đủ cho việc vì sao liên kết ' +
     'tĩnh nặng hơn động khoảng 51 lần, và vì sao thiết bị nhúng đôi khi vẫn chọn bản nặng hơn, ' +
     'đó chính là nội dung của bài kế tiếp.',
     '<a href="#/bai-17#ba-cach-mot-ham-den-duoc-chuong-trinh-cua-ban">Đọc tiếp Bài 17 · Ba cách một hàm đến được chương trình của bạn</a>'],
  ],
});


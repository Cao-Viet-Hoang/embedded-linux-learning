/* ═══════════════════════════════════════════════════════════════════════════
   bt-12 — Bài tập cho Bài 12 "Quản lý gói: apt, dpkg và kho phần mềm"

   KIỂM ĐỊNH CHỌN TRỤC theo CLAUDE.md §13.4. Bảy bước, làm trước khi viết
   bất kỳ câu nào. Ghi lại ở đây để một phiên sau audit được thay vì phải
   suy lại từ đầu.

   ───────────────────────────────────────────────────────────────────────────
   BƯỚC 1. Kiểm kê. Mọi khái niệm Bài 12 thực sự dạy, lấy từ `goals`, mọi
   `h2`, mọi `cal kind:'why'`, mọi tiêu đề `cmdx`, `terms` và `recap`:

     1  hai tầng: dpkg đặt file, apt lập kế hoạch
     2  một file .deb là kho `ar` gồm ba thành viên
     3  sổ cái /var/lib/dpkg — máy này đang có gì
     4  chỉ mục /var/lib/apt/lists — kho có gì, và `apt update` làm mới nó
     5  chuỗi tin cậy InRelease → Packages → .deb, và vì sao http:// vẫn an toàn
     6  Depends / Recommends / Suggests / Provides
     7  bao đóng phụ thuộc và kích thước thật của một gói
     8  Installed-Size (KB, trên đích) khác Size/Download-Size (byte, trên dây)
     9  trạng thái gói: ii, iU, rc
    10  dpkg -S (file → gói) và dpkg -L (gói → file)
    11  apt-mark manual/auto, và vì sao autoremove biết gói nào bỏ được
    12  apt-cache policy: bản nào đang cài, bản nào là ứng viên
    13  gói mã nguồn: .dsc + orig.tar.gz + debian.tar.xz
    14  deb-src và `apt-get source`
    15  dpkg-deb -x mở gói mà KHÔNG ghi vào sổ cái
    16  apt install ./file.deb (dấu ./ là bắt buộc)
    17  /var/cache/apt — nơi các .deb đã tải nằm lại

   ───────────────────────────────────────────────────────────────────────────
   BƯỚC 2. Chấm điểm 0/1/2 trên ba trục.
     PT  = phụ thuộc xuôi dòng (bài sau có sập không nếu thiếu)
     GIA = giá của ngộ nhận (0 = không mất gì, 2 = sai im lặng hoặc mất giờ)
     NGC = ngược trực giác (0 = đoán đúng, 2 = đoán sai hẳn)

     Khái niệm                                          PT  GIA  NGC  Tổng
     ──────────────────────────────────────────────────────────────────────
     #4  chỉ mục là bản chụp nằm trên đĩa máy bạn        2    2    2     6
     #7  bao đóng phụ thuộc là cái giá thật              2    2    2     6
     #13 .deb là thứ phái sinh: orig gốc + debian/       2    1    2     5
     #5  chuỗi tin cậy http://                           1    2    2     5
     #3  sổ cái /var/lib/dpkg                            2    2    1     5
     #1  hai tầng dpkg/apt                               2    1    1     4
     #8  Installed-Size khác Download-Size               1    1    2     4
     #11 apt-mark manual/auto                            1    1    1     3
     #6  Depends/Recommends/Suggests/Provides            1    1    1     3
     #9  trạng thái ii/iU/rc                             1    1    1     3
     #2  .deb là kho ar ba thành viên                    1    0    1     2
     #10 dpkg -S / dpkg -L                               1    1    0     2
     #17 /var/cache/apt                                  0    1    1     2
     #12 apt-cache policy                                1    0    0     1
     #14 deb-src / apt-get source                        1    0    1     2
     #15 dpkg-deb -x không ghi sổ                        1    2    2     5
     #16 apt install ./file.deb                          1    1    2     4

   BƯỚC 3. Ngưỡng: tổng ≥ 4 và ít nhất hai trục ≥ 1. Qua ngưỡng: #4, #7,
   #13, #5, #3, #1, #8, #15, #16. Chín ứng viên cho ba chỗ — bước 4 mới là
   chỗ cắt thật.

   ───────────────────────────────────────────────────────────────────────────
   BƯỚC 4. Loại.

   Bộ `quiz` cuối Bài 12 gồm sáu câu, và nó hỏi THẲNG vào những khái niệm sau.
   Theo §13.1, bài tập không được là bộ quiz thứ hai; một khái niệm quiz đã
   hỏi thẳng thì không được lên làm trục, vì trục ăn chín câu.

     #16 apt install ./congcu.deb .................... quiz câu 1  → LOẠI
     #1  hai tầng (rc 127, libfoo.so.2, apt-get check)  quiz câu 2  → LOẠI
     #8  Installed-Size 125 kB vs Download 53,5 kB ... quiz câu 3  → LOẠI
     #5  vì sao http:// vẫn an toàn ................. quiz câu 4  → LOẠI
     #9  iU nghĩa là gì ............................. quiz câu 5  → LOẠI
     #15 dpkg-deb -x không ghi sổ ................... quiz câu 6  → LOẠI

   Bốn trong số đó vẫn được dùng lại ĐÚNG MỘT LẦN, ở một thao tác trí óc
   khác hẳn câu quiz — đúng tiền lệ bt-11 đã lập:
     · #1  hai tầng    → A8 (ghép câu hỏi với công cụ trả lời), không phải
                         "dpkg khác apt thế nào"
     · #3  sổ cái      → B4 (vì sao `dpkg -S /bin/sh` không tìm thấy gì trong
                         khi `dpkg -S /usr/bin/sh` ra `dash`) và D3 (quyền).
                         Quiz hỏi "mở gói tay có ghi sổ không"; ở đây hỏi
                         "sổ cái lưu cái gì, chính xác đến mức nào"
     · #8  hai đơn vị  → nằm bên trong trục 2 chứ không đứng riêng
     · #15 mở gói tay  → không xuất hiện lại. Đã đủ ở quiz.

   Còn lại #4, #7, #13 — và cả ba đều đạt 5 hoặc 6 điểm. Đúng ba trục,
   không phải độn cho đủ.

   ───────────────────────────────────────────────────────────────────────────
   BƯỚC 5 + 6. Ba câu khẳng định có thể sai, kèm ngộ nhận đối lập.

   TRỤC 1 (#4) — apt lập kế hoạch bằng một BẢN CHỤP CHỈ MỤC nằm trên đĩa máy
   bạn; `apt install` không hỏi máy chủ xem kho có gì, chỉ `apt update` mới
   chạm mạng để làm mới bản chụp ấy.
     Ngộ nhận: "apt tra cứu gói trên Internet lúc cài."

   TRỤC 2 (#7) — cái giá của một gói là BAO ĐÓNG PHỤ THUỘC của nó so với thứ
   hệ thống đích đã có, không phải `Installed-Size` của chính nó.
     Ngộ nhận: "gói ghi 25 KB thì cài vào tốn 25 KB."

   TRỤC 3 (#13) — một gói nhị phân là thứ PHÁI SINH: mã nguồn gốc của tác giả
   không sửa một byte, cộng một thư mục `debian/` chứa quy tắc dựng và bộ vá.
     Ngộ nhận: "bản phân phối giữ một nhánh mã nguồn riêng của họ; muốn sửa
     một dòng cho bo mạch của mình thì phải fork dự án gốc."

   ───────────────────────────────────────────────────────────────────────────
   Đối chiếu §13.8 — trục đã tiêu của bt-01…bt-11, để không lặp:
   MMU · bốn mảnh chạy tuần tự · Device Tree khai báo phần cứng (bt-01);
   DRAM chưa dùng được lúc reset · mỗi tầng bàn giao rồi biến mất · bootargs
   (bt-02); ảo hoá cần cùng kiến trúc · hai họ QEMU · /mnt/c là ranh giới hệ
   thống file (bt-03); $? · builtin không phải file · shell tách từ trước
   (bt-04); /proc sinh lúc đọc · file trong /dev không chứa dữ liệu · thư mục
   rỗng là điểm gắn (bt-05); shell mở rộng dấu sao · tên không phải file,
   inode mới là · metadata là một hệ thống (bt-06); Ctrl+S đóng băng terminal ·
   vim có chế độ · lệnh : mặc định một dòng (bt-07); kernel xét đúng một bộ
   ba · rwx của thư mục nói về bảng tên · quyền chạm phần cứng đến từ nhóm
   (bt-08); kill là lời đề nghị · load average là số đếm · jobs là sổ của
   shell (bt-09); ống chỉ mang fd 1 · không phải lệnh nào cũng đọc stdin ·
   giá của file tạm là byte ghi xuống đĩa (bt-10); uniq chỉ nhìn dòng liền
   trước · sed là bộ lọc, -i thay hẳn file · BRE không có toán tử (bt-11).
   Không trục nào của bt-12 trùng.

   Chỗ suýt trùng — ghi lại để phiên sau khỏi giật mình:
   trục 2 ở đây (bao đóng phụ thuộc) đứng rất gần "giá thật của file tạm là
   byte ghi xuống đĩa" (bt-10) và "thư mục rỗng trong rootfs là điểm gắn"
   (bt-05): cả ba đều quy về đĩa. Khác nhau ở thao tác: bt-10 đo BYTE GHI của
   một lệnh, bt-05 đọc CẤU TRÚC một cây thư mục, còn ở đây là CỘNG MỘT ĐỒ THỊ
   phụ thuộc rồi trừ đi phần đích đã có. Ba việc khác nhau, giữ được.
   Cũng vậy, A4 (`dpkg -S` tra file → gói) đứng gần "builtin không phải file
   trên đĩa" (bt-04) nhưng hỏi ngược chiều: bt-04 hỏi lệnh này có phải file
   không, ở đây hỏi file này thuộc gói nào.

   ───────────────────────────────────────────────────────────────────────────
   BƯỚC 7. Lưới 3×1 — mỗi trục đúng một lần ở A, một lần ở B, một lần ở C,
   và ba loại kích thích phải khác nhau về BẢN CHẤT (§13.3).

     Trục 1  A1 phát biểu, chọn nguồn dữ liệu  →  B1 ba dấu thời gian thật
             (mtime / ctime / Date của máy chủ)  →  C1 máy CI không có mạng,
             bản chụp ba tháng tuổi trên USB
     Trục 2  A2 đúng/sai + viết lại  →  B2 bảng 19 gói đo thật, 25 KB → 254 MB
             →  C2 chẩn đoán ổ đầy với bốn con số thật trong tay
     Trục 3  A3 điền khuyết (tên thư mục)  →  B3 bắt lỗi phát biểu, kèm sha256
             tự tính lại và số mục `debian/` trong orig  →  C3 chẩn đoán hành
             vi lạ không có trong mã nguồn gốc

   Kiểm tra bước 7:
   · C1 có trả lời được mà không hiểu trục 1 không? Không — muốn biết cái gì
     hỏng khi mất mạng thì phải biết cái gì vốn KHÔNG cần mạng.
   · Ba câu của mỗi trục có dùng chung từ vựng không? Không: A1 nói "nguồn dữ
     liệu", B1 nói "dấu thời gian", C1 nói "bản chụp trên USB".
   · Câu trước có lộ câu sau không? A2 nói 25 KB nhưng không nói bao đóng;
     B2 mới đưa ra con số 254 MB. Giữ nguyên thứ tự.

   ───────────────────────────────────────────────────────────────────────────
   MỌI LỆNH VÀ MỌI KẾT QUẢ TRONG FILE NÀY ĐỀU ĐÃ CHẠY THẬT
   trên máy của người học, ngày 17–18/08/2026:
   WSL2 · Ubuntu 26.04 "resolute" · apt 3.x · 6 nhân i7-1165G7 · user
   shinarus (uid 1000) · KHÔNG có sudo dùng được.

   Những chỗ số đo phản lại dự đoán ban đầu — ghi lại vì chúng thành đề bài:

   · Định viết "mtime của file Packages là lúc bạn chạy apt update lần cuối".
     SAI. Đo thật: universe Packages có mtime = 2026-04-24 00:07:30 nhưng
     ctime = 2026-07-31 21:37:32, và InRelease của chính bản phát hành ấy ghi
     `Date: Thu, 23 Apr 2026 17:07:15 UTC`. mtime là NGÀY MÁY CHỦ XUẤT BẢN bản
     chụp bạn đang giữ (apt đặt lại theo Last-Modified), ctime mới là lúc apt
     ghi nó xuống đĩa máy bạn. Phát hiện này trở thành B1 — nó là kích thích
     tốt hơn hẳn cái tôi định viết.

   · apt 3.x KHÔNG còn in "After this operation… will be used" và "Need to
     get…" trong `apt-get -s install`. Không đọc được cỡ bao đóng từ đó nữa.
     Phải cộng `Installed-Size` từ `apt-cache show` từng gói, và lấy số byte
     tải bằng `apt-get --print-uris -y install` (bỏ `-s`, chạy được không cần
     root).

   · Cộng tay thì hai gói ra rỗng. Điều tra theo hard rule 2: `libc6-riscv64-
     cross` và `libc6-dev-riscv64-cross` KHÔNG HỀ CÓ trường `Installed-Size:`
     (gói do dpkg-cross sinh ra, `Architecture: all`). Giữ nguyên làm điểm
     dạy — một phép cộng ngây thơ đếm thiếu mà không báo gì — chứ không lấp đi.
     Đây là E5.

   · Không có sudo trên máy này, nên không bật được `deb-src` trong
     /etc/apt/sources.list.d. Lấy được gói mã nguồn bằng một thư mục trạng
     thái apt riêng của người dùng, không cần root:
       apt-get -o Dir::Etc::sourcelist=… -o Dir::Etc::sourceparts=/dev/null
               -o Dir::State::lists=… -o Dir::Cache=…
               -o APT::Get::List-Cleanup=0  update
     Tải chỉ mục Sources 13,4 MB trong 5 s rồi `apt-get source tree` chạy trót
     lọt. Toàn bộ bằng chứng của trục 3 lấy từ đây; công thức đầy đủ nằm ở E6.

   · Số gói trong chỉ mục KHÁC số trong Bài 12 (bài viết trước, chỉ mục cùng
     bản chụp nhưng bài đếm ở phạm vi khác): ở đây main = 6 487 bản ghi,
     universe = 66 741. Dùng số đo ngày 17/08 cho toàn bộ bt-12, không trộn.
   ═══════════════════════════════════════════════════════════════════════════ */

Exercise.register({
  id: 'bt-12',
  minutes: 90,

  intro:
    '<p>Bài 12 dễ bị đọc thành một danh sách lệnh: <code>apt install</code> để cài, ' +
    '<code>apt update</code> để cập nhật, <code>dpkg -l</code> để xem. Học thuộc danh sách ' +
    'ấy thì dùng được máy của mình, nhưng sẽ vỡ trận ở đúng ba chỗ mà nghề nhúng bắt gặp ' +
    'hằng tuần: máy build <b>không có mạng</b>, bo mạch <b>không có 254 MB để tiêu</b>, và ' +
    'một gói <b>chạy khác với mã nguồn gốc</b> mà không ai giải thích được vì sao.</p>' +
    '<p>Ba trục của bộ này chính là ba chỗ đó. Thứ nhất: <code>apt</code> lập kế hoạch bằng ' +
    'một <b>bản chụp chỉ mục nằm trên đĩa máy bạn</b> — nó không hỏi máy chủ xem kho có gì, ' +
    'và <code>apt update</code> là việc <i>duy nhất</i> chạm mạng để làm mới bản chụp ấy. ' +
    'Thứ hai: cái giá của một gói là <b>bao đóng phụ thuộc</b> của nó so với thứ hệ thống ' +
    'đích đã có, chứ không phải con số <code>Installed-Size</code> của chính nó — đo thật ' +
    'trên máy bạn, một gói ghi <b>25 KB</b> kéo theo <b>254 MB</b>. Thứ ba: một file ' +
    '<code>.deb</code> là thứ <b>phái sinh</b> — mã nguồn gốc của tác giả không sửa một ' +
    'byte, cộng một thư mục <code>debian/</code> chứa quy tắc dựng và bộ vá; nên muốn đổi ' +
    'một dòng cho bo mạch của mình, bạn <i>không</i> phải fork dự án gốc.</p>' +
    '<p><b>Lượt 1</b> — làm ngay sau khi đọc xong Bài 12: phần <b>A</b> và <b>B</b>, khoảng ' +
    '25 phút. <b>Lượt 2</b> — quay lại sau 2–3 ngày: phần <b>C</b>, <b>D</b> và <b>E</b>, ' +
    'khoảng 65 phút. Khoảng nghỉ đó là thành phần có tác dụng, không phải thời gian chết. ' +
    'Phần <b>D</b> lần này lật lại Bài 5 (vì sao sổ cái nằm ở <code>/var</code> chứ không ' +
    'phải <code>/usr</code>), Bài 11 (<code>awk</code> đọc file chỉ mục theo <b>đoạn</b> chứ ' +
    'không theo dòng) và Bài 8 (bạn ở trong nhóm <code>sudo</code> nhưng vẫn không ghi được ' +
    'vào sổ cái — và vì sao thế lại đúng).</p>' +
    '<p>Mọi kết quả in trong bộ này đều chạy thật trên máy bạn, ngày 17–18/08/2026. Hai lưu ' +
    'ý ' +
    'về máy này, cả hai đều thành đề bài: <code>apt</code> ở đây là <b>bản 3.x</b>, không ' +
    'còn in dòng <i>"After this operation…"</i> quen thuộc, nên cỡ bao đóng phải tự cộng — ' +
    'xem <b>B2</b>. Và máy này <b>không dùng được <code>sudo</code></b>, nên toàn bộ bằng ' +
    'chứng về gói mã nguồn lấy bằng một thư mục trạng thái <code>apt</code> riêng, không ' +
    'cần root — công thức đầy đủ ở <b>E6</b>.</p>',

  /* Chỉ trường `name` được hiển thị; `x` và `mis` là ghi chú cho người viết đề. */
  truc: [
    { id: 'chi-muc-la-ban-chup-tren-dia',
      name: '<code>apt</code> lập kế hoạch bằng một <b>bản chụp chỉ mục nằm trên đĩa máy bạn</b>. <code>apt install</code> không hỏi máy chủ xem kho có những gì — chỉ <code>apt update</code> mới chạm mạng, và nó chỉ làm đúng một việc: thay bản chụp ấy bằng bản mới',
      x: 'Toàn bộ tri thức của apt về kho nằm trong mấy file văn bản ở /var/lib/apt/lists. ' +
         'Đo được: main 7 581 722 byte / 6 487 bản ghi, universe 76 792 699 byte / 66 741 ' +
         'bản ghi, cả thư mục 145 MB. Lập kế hoạch cho `apt-get -s install cmake` mất ' +
         '0,895 s và không mở một socket nào; `apt-cache show tree` mất 0,020 s. Hệ quả ' +
         'quan trọng nhất: cái apt biết là cái kho ĐÃ CÓ LÚC BẢN CHỤP ĐƯỢC LẤY, không phải ' +
         'lúc này. Bằng chứng đắt nhất là ba dấu thời gian không khớp nhau: mtime của ' +
         'universe Packages = 2026-04-24 00:07:30 (ngày máy chủ xuất bản), ctime = ' +
         '2026-07-31 21:37:32 (lúc apt ghi xuống đĩa), hôm nay = 2026-08-17.',
      mis: '"apt tra cứu gói trên Internet lúc cài." Ngộ nhận này chỉ lộ ra khi mạng biến ' +
           'mất, và lúc đó nó lộ ra theo chiều ngược với mong đợi: `apt install` vẫn lập ' +
           'được kế hoạch (nó chỉ đọc đĩa), rồi mới chết ở bước tải. Còn trên máy CI thì nó ' +
           'lộ ra dưới dạng 404 — kế hoạch dựa trên một bản chụp cũ trỏ tới file .deb mà kho ' +
           'đã xoá từ lâu.' },

    { id: 'bao-dong-phu-thuoc-la-gia-that',
      name: 'Cái giá của một gói là <b>bao đóng phụ thuộc</b> của nó trên hệ thống đích, không phải <code>Installed-Size</code> của chính nó. Một gói ghi <b>25 KB</b> kéo theo <b>254 MB</b> — và con số đúng còn phụ thuộc đích <i>đã có sẵn</i> những gì',
      x: 'gcc-riscv64-linux-gnu có Installed-Size: 25 và Size: 1216 byte. Nhưng nó Depends ' +
         'cpp-riscv64-linux-gnu và gcc-15-riscv64-linux-gnu, và bao đóng đo được là 19 gói, ' +
         'cộng lại 260 922 KB = 254 MB, tải về 63 704 270 byte = 60 MB. Tỉ lệ 25 KB → ' +
         '260 922 KB là hơn mười nghìn lần. Điểm thứ hai, tinh hơn: con số 254 MB ấy đúng ' +
         'với MỘT máy đích cụ thể. Cài lên máy đã có sẵn libc6 thì rẻ hơn; cài vào một ' +
         'rootfs trống thì đắt hơn. "Kích thước của gói" không phải thuộc tính của gói, nó ' +
         'là một phép trừ giữa gói và đích.',
      mis: '"Gói ghi 25 KB thì cài vào tốn 25 KB." Cùng họ với ngộ nhận anh em của nó — ' +
           '"Download-Size là cái tôi cần lo" — trong khi trên bo mạch thì Download-Size là ' +
           'số đi qua dây còn Installed-Size mới là số nằm lại trên flash, và hai con số ấy ' +
           'chênh nhau vài lần vì .deb nén còn nội dung thì không.' },

    { id: 'deb-la-thu-phai-sinh',
      name: 'Một gói nhị phân là thứ <b>phái sinh</b>, không phải một nhánh mã nguồn riêng: <code>orig.tar.gz</code> của tác giả <b>không sửa một byte</b>, cộng một thư mục <code>debian/</code> chứa quy tắc dựng và bộ vá. Muốn sửa một dòng cho bo mạch của mình, bạn thêm một patch — không fork dự án',
      x: '`apt-get source tree` tải về đúng ba file: tree_2.3.1.orig.tar.gz (70 339 byte), ' +
         'tree_2.3.1-1.debian.tar.xz (9 568 byte), tree_2.3.1-1.dsc (1 869 byte). Đo được: ' +
         'sha256 tự tính lại của orig là 47ca786e… — TRÙNG KHÍT dòng trong .dsc, tức là ' +
         'không ai đụng vào nó; và `tar tzf orig | grep -c debian/` ra ĐÚNG 0, tức là thư ' +
         'mục debian/ không nằm trong mã nguồn gốc mà được ghép vào từ bên ngoài. ' +
         'debian/patches/series chỉ có một dòng, `manpage`, và patch ấy dài 17 dòng. Format ' +
         'là "3.0 (quilt)". Toàn bộ khác biệt giữa tree của tác giả và tree của Ubuntu gói ' +
         'gọn trong 17 dòng đọc được.',
      mis: '"Bản phân phối giữ một nhánh mã nguồn riêng; muốn sửa một dòng cho bo mạch của ' +
           'mình thì phải fork dự án gốc rồi tự dựng lại từ đầu." Hệ quả thực tế của ngộ ' +
           'nhận này là người ta đi tải tarball trên GitHub, `./configure && make install` ' +
           'vào /usr/local, và thế là có hai bản chương trình trên máy, bản của apt vẫn nằm ' +
           'đó, sổ cái không biết gì về bản kia.' },
  ],

  /* ═══ A · Nhận biết — 4 mcq + 2 tf + 1 fill + 1 match ═══════════════════ */
  A: [
    { id: 'a1', k: 'mcq', truc: 0, tag: 'Trắc nghiệm nhanh',
      q: 'Bạn gõ <code>sudo apt install cmake</code>. Trước khi tải về bất cứ byte nào, ' +
         '<code>apt</code> phải quyết định sẽ cài những gói nào và bản nào. Nó lấy thông tin ' +
         'đó <b>ở đâu</b>?',
      opts: [
        'Nó hỏi <code>archive.ubuntu.com</code> ngay lúc đó, nên máy phải có mạng thì mới lập được kế hoạch.',
        'Nó đọc mấy file văn bản trong <code>/var/lib/apt/lists</code> — <b>bản chụp chỉ mục đã tải sẵn</b> từ lần <code>apt update</code> gần nhất. Không có gói tin nào rời khỏi máy ở bước này.',
        'Nó đọc <code>/var/lib/dpkg/status</code>, vì đó là nơi ghi mọi gói đang có và mọi gói có thể cài.',
        'Nó dò trong <code>/var/cache/apt/archives</code>, nơi giữ các file <code>.deb</code> đã tải về trước đây.'
      ],
      a: 1,
      why: 'Đo thật trên máy bạn: <code>time apt-get -s install cmake</code> mất ' +
           '<b>0,895 s</b> và không mở một kết nối nào — toàn bộ thời gian đó là đọc và phân ' +
           'tích văn bản. Có gì để đọc? <code>/var/lib/apt/lists</code> nặng <b>145 MB</b>, ' +
           'trong đó riêng file chỉ mục của <code>universe</code> là ' +
           '<b>76 792 699 byte</b> với <b>66 741</b> bản ghi, và của <code>main</code> là ' +
           '<b>7 581 722 byte</b> với <b>6 487</b> bản ghi. Đáp án 3 lẫn hai cuốn sổ khác ' +
           'nhau, và đây là chỗ đáng nhớ nhất của Bài 12: ' +
           '<code>/var/lib/dpkg/status</code> ghi <b>máy bạn đang có gì</b> (855 gói, ' +
           '867 956 byte), còn <code>/var/lib/apt/lists</code> ghi <b>kho có gì</b> ' +
           '(77 220 tên gói apt biết mặt). Hai câu hỏi khác nhau, hai file khác nhau, và ' +
           '<code>apt</code> cần cả hai để lập kế hoạch. Đáp án 4 nhầm cái kho tạm ' +
           '(<b>193 MB</b> file <code>.deb</code> đã tải) với chỉ mục.' },

    { id: 'a2', k: 'tf', truc: 1, tag: 'Đúng/Sai kèm sửa',
      q: '<i>"Tôi tra <code>apt-cache show gcc-riscv64-linux-gnu</code> và thấy ' +
         '<code>Installed-Size: 25</code>. Vậy cài gói này vào rootfs sẽ tốn thêm khoảng ' +
         '25 KB. Với bo mạch 64 MB flash của tôi thì thoải mái."</i>',
      a: 1,
      rw: 'Viết lại cho đúng: con số <code>25</code> ấy nói về cái gì, con số bạn thật sự ' +
          'cần là con số nào, và vì sao con số đó <i>không</i> phải một thuộc tính của gói?',
      why: 'Con số <code>25</code> là thật và không hề nói dối: nó là kích thước của riêng ' +
           'gói <code>gcc-riscv64-linux-gnu</code>, mà gói ấy gần như rỗng — ' +
           '<code>Size: 1216</code> byte, nó chỉ là một cái vỏ trỏ sang chỗ khác. Chỗ khác ' +
           'ấy nằm ở dòng <code>Depends:</code>. Đo thật trên máy bạn: bao đóng là ' +
           '<b>19 gói</b>, cộng lại <b>260 922 KB = 254 MB</b>, và phải tải về ' +
           '<b>63 704 270 byte = 60 MB</b>. Trên bo mạch 64 MB flash thì 254 MB không phải ' +
           '"thoải mái", nó là <b>không vừa</b> — sai hệ số hơn mười nghìn lần. Vế thứ hai ' +
           'tinh hơn và là thứ phân biệt người biết việc: con số 254 MB ấy đúng với <i>một ' +
           'đích cụ thể</i>. Cài lên máy đã có sẵn <code>libc6</code> thì rẻ hơn, cài vào ' +
           'rootfs trống thì đắt hơn. "Kích thước của gói" không phải thuộc tính của gói — ' +
           'nó là một <b>phép trừ giữa gói và đích</b>. B2 cho bạn xem cả bảng 19 dòng.',
      crit: [
        'Nói rõ <code>Installed-Size: 25</code> là kích thước của <b>riêng gói đó</b>, và nó không sai — gói ấy thật sự gần như rỗng (<code>Size: 1216</code> byte)',
        'Nêu con số cần dùng là <b>bao đóng phụ thuộc</b>: mọi gói mà <code>Depends</code> kéo theo, cộng lại',
        'Đưa được một con số cụ thể hoặc một cách lấy nó — <code>apt-get -s install</code> để xem danh sách, rồi cộng <code>Installed-Size</code> của từng gói',
        'Nói rõ con số ấy <b>phụ thuộc hệ thống đích</b>: đích đã có gói nào thì gói đó không tính vào nữa, nên cùng một gói có hai giá trên hai máy',
        'Phân biệt đúng hai đơn vị: <code>Installed-Size</code> tính bằng <b>KB nằm trên đích</b>, <code>Size</code>/Download-Size tính bằng <b>byte đi qua dây</b> — 254 MB so với 60 MB'
      ],
      sol: '<p><b>Con số 25 không nói dối, nó chỉ trả lời một câu hỏi khác.</b> ' +
           '<code>Installed-Size: 25</code> là kích thước của riêng gói ' +
           '<code>gcc-riscv64-linux-gnu</code>. Gói đó thật sự gần như rỗng — ' +
           '<code>Size: 1216</code> byte trên dây — vì nó chỉ là một cái vỏ đặt tên cho ' +
           'người dùng gõ cho dễ. Toàn bộ nội dung thật nằm sau dòng ' +
           '<code>Depends: cpp-riscv64-linux-gnu, gcc-15-riscv64-linux-gnu</code>.</p>' +
           '<p><b>Con số bạn cần là bao đóng.</b> Đo thật: <code>apt-get -s install ' +
           'gcc-riscv64-linux-gnu</code> liệt kê <b>19 gói</b> sẽ được cài mới. Cộng ' +
           '<code>Installed-Size</code> của chúng lại được <b>260 922 KB ≈ 254 MB</b>; số ' +
           'byte thật sự phải tải là <b>63 704 270 ≈ 60 MB</b>. Hai gói nặng nhất trong bao ' +
           'đóng là <code>gcc-15-riscv64-linux-gnu</code> (130 412 KB) và ' +
           '<code>cpp-15-riscv64-linux-gnu</code> (63 675 KB) — tức là gói bạn <i>gõ tên</i> ' +
           'không phải gói bạn <i>trả tiền</i>.</p>' +
           '<p><b>Và con số 254 MB ấy vẫn chưa phải câu trả lời cuối.</b> Nó đúng với máy ' +
           'này, hôm nay. Trên một đích đã cài sẵn <code>libc6-riscv64-cross</code> thì ' +
           'gói đó không tính vào nữa. Trên một rootfs trống thì lại phải cộng thêm những ' +
           'thứ máy bạn đang có mà bạn quên mất là mình có. Nói cho gọn: <b>kích thước ' +
           'không phải thuộc tính của gói, nó là hiệu giữa gói và đích</b>. Đó là lý do câu ' +
           'hỏi đúng trong nghề nhúng không bao giờ là "gói này nặng bao nhiêu" mà là "gói ' +
           'này thêm bao nhiêu vào <i>image của tôi</i>".</p>' +
           '<p>Chi tiết cuối, dễ bị bỏ qua: hai đơn vị. <code>Installed-Size</code> tính ' +
           'bằng <b>KB nằm lại trên flash</b>, <code>Size</code> tính bằng <b>byte đi qua ' +
           'dây</b>. 254 MB so với 60 MB — chênh hơn bốn lần, vì <code>.deb</code> là file ' +
           'nén còn nội dung sau khi bung thì không. Ai lên kế hoạch dung lượng flash bằng ' +
           'con số Download-Size sẽ thiếu chỗ đúng vào lúc dây chuyền đã chạy.</p>' },

    { id: 'a3', k: 'fill', truc: 2, tag: 'Điền khuyết',
      q: '<code>apt-get source tree</code> tải về ba file. Một trong ba là mã nguồn gốc của ' +
         'tác giả, <b>không ai được sửa một byte</b> — sha256 của nó phải khớp đúng dòng ghi ' +
         'trong file <code>.dsc</code>. Mọi thứ riêng của bản phân phối — quy tắc dựng, ' +
         'changelog, và toàn bộ bộ vá — nằm gọn trong <b>một thư mục duy nhất</b> tên là ' +
         '<code>________</code>.',
      a: ['debian', 'debian/'],
      ph: 'tên một thư mục',
      why: 'Đo thật trên máy bạn: <code>tar tzf tree_2.3.1.orig.tar.gz | grep -c ' +
           "'^[^/]*/debian/'</code> ra <b>0</b>. Thư mục <code>debian/</code> " +
           '<i>không nằm trong</i> mã nguồn gốc; nó được ghép vào từ file thứ hai, ' +
           '<code>tree_2.3.1-1.debian.tar.xz</code>. Và nó nhỏ đến mức đáng ngạc nhiên: ' +
           '<b>9 568 byte</b> so với <b>70 339 byte</b> của mã nguồn gốc. Bên trong có ' +
           '<code>changelog</code>, <code>control</code>, <code>copyright</code>, ' +
           '<code>rules</code>, <code>patches/</code> và vài file nữa. Còn ' +
           '<code>debian/patches/series</code> — danh sách patch được áp — chỉ có ' +
           '<b>đúng một dòng</b>: <code>manpage</code>. Patch ấy dài <b>17 dòng</b>. Toàn bộ ' +
           'khác biệt giữa <code>tree</code> của tác giả và <code>tree</code> bạn đang chạy ' +
           'gói gọn trong 17 dòng bạn đọc được trong nửa phút. Đó là lý do câu trả lời cho ' +
           '"tôi cần sửa một dòng cho bo mạch của tôi" không bao giờ là "fork dự án" — xem ' +
           'B3 và C3.' },

    { id: 'a4', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Bạn có đường dẫn <code>/usr/bin/tree</code> và muốn biết <b>gói nào</b> đã đặt file ' +
         'đó lên máy. Lệnh nào trả lời đúng câu hỏi này?',
      opts: [
        '<code>dpkg -L tree</code>',
        '<code>dpkg -S /usr/bin/tree</code>',
        '<code>apt search tree</code>',
        '<code>which tree</code>'
      ],
      a: 1,
      why: '<code>dpkg -S</code> và <code>dpkg -L</code> là hai <b>chiều ngược nhau</b> của ' +
           'cùng một bảng, và đó là lý do người mới hay gõ nhầm. <code>-S</code> = ' +
           '<i>search</i>: cho một <b>đường dẫn</b>, trả về <b>gói</b>. Đo thật: ' +
           '<code>dpkg -S /usr/bin/tree</code> → <code>tree: /usr/bin/tree</code>. ' +
           '<code>-L</code> = <i>list</i>: cho một <b>gói</b>, trả về <b>danh sách file</b> ' +
           'nó đã đặt. Cả hai đọc cùng một chỗ: các file <code>.list</code> trong ' +
           '<code>/var/lib/dpkg/info</code>, cộng lại <b>62 884 đường dẫn</b> trên máy này. ' +
           '<code>which</code> chỉ nói cho bạn file nằm ở đâu trong <code>PATH</code>, không ' +
           'biết gì về gói; <code>apt search</code> tìm trong <i>chỉ mục kho</i>, tức là ' +
           'cuốn sổ kia. Một kết quả đáng nhớ trên chính máy bạn: ' +
           '<code>dpkg -S /usr/bin/ls</code> ra <b><code>coreutils-from-uutils</code></b> — ' +
           'tên gói không giống tên lệnh, và đó là chuyện bình thường. B6 khai thác chỗ này.' },

    { id: 'a5', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Trên máy bạn có <b>855</b> gói đã cài, trong đó <b>69</b> ở nhóm <i>manual</i> và ' +
         '<b>786</b> ở nhóm <i>auto</i>. Hai nhóm này khác nhau ở điểm gì, và <b>ai</b> quyết ' +
         'định một gói thuộc nhóm nào?',
      opts: [
        '<i>manual</i> là gói cài bằng <code>dpkg -i</code> thủ công, <i>auto</i> là gói cài bằng <code>apt</code>.',
        '<i>manual</i> là gói <b>bạn tự gõ tên ra để cài</b>, <i>auto</i> là gói bị kéo theo vì gói khác cần nó. <code>apt</code> ghi lại điều này lúc cài, và <code>apt autoremove</code> dựa vào đúng cột ấy để biết gói nào gỡ được.',
        '<i>manual</i> là gói phải cập nhật bằng tay, <i>auto</i> là gói được cập nhật tự động khi có bản mới.',
        '<i>manual</i> là gói có trang <code>man</code>, <i>auto</i> là gói không có.'
      ],
      a: 1,
      why: 'Đây là một cột dữ liệu nhỏ nhưng nó là lý do <code>apt autoremove</code> tồn tại ' +
           'được. Không có nó, apt sẽ không bao giờ dám gỡ gì: nó không phân biệt được ' +
           '<code>libgomp1</code> nằm đây vì bạn muốn thế hay vì trình biên dịch cần nó. ' +
           'Tỉ lệ trên máy bạn nói rất rõ: <b>69 gói bạn thật sự yêu cầu</b>, ' +
           '<b>786 gói đi theo</b> — hơn <b>11 gói kéo theo cho mỗi gói bạn gõ tên</b>. Đó ' +
           'chính là trục 2 nhìn từ một góc khác, và cũng là lý do gỡ một gói hiếm khi giải ' +
           'phóng được nhiều đĩa: bạn gỡ cái vỏ, còn 11 cái ruột vẫn nằm đó cho tới khi ' +
           '<code>autoremove</code> dọn. Trên máy build của dây chuyền sản xuất, chạy ' +
           '<code>apt-mark showmanual</code> là cách rẻ nhất để biết <i>ai đó đã cố ý cài ' +
           'gì</i> — 69 dòng đọc được, thay vì 855 dòng không đọc nổi.' },

    { id: 'a6', k: 'mcq', tag: 'Trắc nghiệm nhanh',
      q: 'Bóc một file <code>.deb</code> ra thì bên trong có gì?',
      opts: [
        'Một file nén <code>.tar.gz</code> duy nhất chứa toàn bộ cây thư mục sẽ được chép vào <code>/</code>.',
        'Một kho <code>ar</code> gồm <b>ba thành viên</b>: <code>debian-binary</code> (số phiên bản định dạng, 4 byte), <code>control.tar.*</code> (siêu dữ liệu và script) và <code>data.tar.*</code> (những file sẽ được đặt lên máy).',
        'Một cơ sở dữ liệu SQLite mà chỉ <code>dpkg</code> đọc được.',
        'Mã máy đã biên dịch sẵn kèm một trình cài đặt tự chạy.'
      ],
      a: 1,
      why: 'Không có gì bí ẩn ở đây, và biết được điều đó là nửa bài học: một ' +
           '<code>.deb</code> chỉ là <b>một kho <code>ar</code> ba thành viên</b>, mở được ' +
           'bằng công cụ thường. Số đo trên gói <code>tree</code> ở Bài 12: ' +
           '<code>debian-binary</code> <b>4 byte</b> (nội dung là chuỗi <code>2.0</code>), ' +
           '<code>control.tar.zst</code> <b>737 byte</b>, <code>data.tar.zst</code> ' +
           '<b>52 619 byte</b>. Cộng lại xấp xỉ <code>Size: 53550</code> ghi trong chỉ mục. ' +
           'Tách bạch ấy giải thích luôn cách <code>dpkg</code> làm việc: nó đọc ' +
           '<code>control</code> <i>trước</i> để biết gói này tên gì, cần gì, chạy script ' +
           'nào; rồi mới bung <code>data</code> vào <code>/</code>; rồi ghi vào sổ cái. ' +
           'Ba bước, ba thành viên. Cũng vì thế mà <code>dpkg-deb -x</code> — chỉ bung ' +
           '<code>data</code> — <b>không</b> để lại dấu vết nào trong sổ cái.' },

    { id: 'a7', k: 'tf', tag: 'Đúng/Sai kèm sửa',
      q: '<i>"Trên máy này <code>/var/cache/apt</code> chiếm <b>193 MB</b>. Đó là chỗ nội ' +
         'dung của các gói đã cài được lưu, nên chạy <code>apt clean</code> để lấy lại chỗ ' +
         'sẽ làm hỏng những gói đang dùng."</i>',
      a: 1,
      rw: 'Viết lại cho đúng: 193 MB ấy thật ra là gì, xoá đi thì mất gì, và trên một máy ' +
          'build CI thì nên xử lý nó thế nào?',
      why: 'Sai ở mệnh đề thứ hai, và sai theo kiểu tốn tiền: ' +
           '<code>/var/cache/apt/archives</code> giữ các file <code>.deb</code> <b>đã tải ' +
           'về</b>, tức là <i>bản sao nén của gói</i>, chứ không phải nội dung đang chạy. ' +
           'Nội dung đang chạy đã được bung vào <code>/usr</code>, <code>/lib</code>… từ lúc ' +
           'cài và không liên quan gì tới cache nữa. Xoá cache thì cái duy nhất mất đi là ' +
           'khả năng cài lại <b>mà không cần tải lại</b>. Đây là hệ quả trực tiếp của trục 1 ' +
           'và của A6: <code>.deb</code> là một cái hộp vận chuyển; cài xong thì hộp không ' +
           'còn giá trị gì ngoài việc khỏi phải tải lại. Trong Dockerfile, ' +
           '<code>rm -rf /var/lib/apt/lists/*</code> ở cuối lớp <code>apt-get install</code> ' +
           'là thói quen chuẩn đúng vì lý do này — và nó cũng giải thích luôn vì sao lớp ' +
           'sau đó <b>không</b> cài thêm được gì nếu không <code>apt update</code> lại: bạn ' +
           'vừa vứt mất bản chụp chỉ mục. Xem C1.',
      crit: [
        'Nói rõ 193 MB là các file <code>.deb</code> <b>đã tải về</b>, không phải nội dung đang chạy',
        'Nói rõ nội dung của gói đã được bung vào <code>/usr</code>, <code>/lib</code>… từ lúc cài và <b>không</b> phụ thuộc cache',
        'Kết luận đúng: <code>apt clean</code> an toàn, thứ duy nhất mất là phải tải lại nếu cài lại',
        'Phân biệt được <code>/var/cache/apt</code> (193 MB, .deb đã tải) với <code>/var/lib/apt/lists</code> (145 MB, chỉ mục) và <code>/var/lib/dpkg</code> (30 MB, sổ cái) — ba thư mục, ba vai trò',
        'Nêu ứng dụng: trong Docker/CI thì dọn cache ở <b>cùng một lớp</b> với lệnh cài, và nhớ rằng dọn <code>lists</code> thì lớp sau phải <code>apt update</code> lại'
      ],
      sol: '<p><b>193 MB đó là hộp, không phải hàng.</b> ' +
           '<code>/var/cache/apt/archives</code> chứa các file <code>.deb</code> mà apt đã ' +
           'tải về trong quá khứ. Một <code>.deb</code>, như A6 vừa mổ, là một kho ' +
           '<code>ar</code> ba thành viên — hàng thật nằm trong <code>data.tar.*</code> và ' +
           'nó đã được bung vào <code>/usr</code>, <code>/lib</code>, <code>/etc</code>… từ ' +
           'lúc <code>dpkg</code> chạy. Sau bước đó, file <code>.deb</code> không còn liên ' +
           'quan gì tới chương trình đang chạy nữa.</p>' +
           '<p><b>Nên <code>apt clean</code> hoàn toàn an toàn.</b> Cái giá duy nhất: lần ' +
           'sau cài lại đúng gói ấy thì phải tải lại từ mạng. Trên máy để bàn đó là phiền; ' +
           'trên máy CI dựng lại image mỗi đêm thì đó là 193 MB nhân số máy, mỗi ngày.</p>' +
           '<p><b>Ba thư mục, đừng lẫn.</b> Trên máy bạn, đo thật: ' +
           '<code>/var/lib/dpkg</code> <b>30 MB</b> — sổ cái, <i>máy này đang có gì</i>; ' +
           '<code>/var/lib/apt/lists</code> <b>145 MB</b> — chỉ mục, <i>kho có gì</i>; ' +
           '<code>/var/cache/apt</code> <b>193 MB</b> — hộp rỗng, <i>thứ đã tải về</i>. Xoá ' +
           'được cái thứ ba bất cứ lúc nào. Xoá cái thứ hai thì mất khả năng lập kế hoạch ' +
           'cho tới khi <code>apt update</code> lại. Xoá cái thứ nhất thì hỏng máy.</p>' +
           '<p><b>Trong Dockerfile</b> thói quen chuẩn là ' +
           '<code>apt-get install -y … &amp;&amp; rm -rf /var/lib/apt/lists/*</code> ' +
           '<i>trong cùng một lệnh <code>RUN</code></i> — cùng lớp thì mới thật sự nhỏ đi, ' +
           'vì xoá ở lớp sau chỉ che chứ không gỡ byte khỏi image. Và hệ quả bắt buộc: lớp ' +
           'nào cài thêm gói thì lớp ấy phải <code>apt-get update</code> lại, vì bạn vừa ' +
           'vứt mất bản chụp chỉ mục. Đó chính là cái bẫy ở C1.</p>' },

    { id: 'a8', k: 'match', tag: 'Ghép nối',
      q: 'Sáu câu hỏi rất giống nhau về mặt chữ nghĩa nhưng đòi sáu công cụ khác nhau, vì ' +
         'chúng tra vào <b>ba cuốn sổ khác nhau</b>: sổ cái của <code>dpkg</code>, chỉ mục ' +
         'kho của <code>apt</code>, và cột manual/auto. Ghép mỗi câu hỏi với đúng lệnh trả ' +
         'lời nó.',
      left: [
        'File <code>/usr/bin/tree</code> do <b>gói nào</b> đặt lên máy?',
        'Gói <code>tree</code> đã đặt lên máy <b>những file nào</b>?',
        'Máy đang có gói nào ở <b>trạng thái bất thường</b> — cài dở, gỡ dở?',
        'Gói nào là do <b>tôi tự gõ tên ra</b> để cài, chứ không phải bị kéo theo?',
        'Kho có <b>những phiên bản nào</b> của gói này, và tôi đang chạy bản nào?',
        'Cài gói này thì sẽ <b>kéo theo</b> những gói nào — mà chưa cài gì cả?'
      ],
      right: [
        '<code>apt-cache policy tree</code>',
        '<code>dpkg -S /usr/bin/tree</code>',
        '<code>apt-get -s install tree</code>',
        "<code>dpkg -l | grep -v '^ii'</code>",
        '<code>dpkg -L tree</code>',
        '<code>apt-mark showmanual</code>'
      ],
      a: [1, 4, 3, 5, 0, 2],
      why: 'Ba cặp dễ lẫn nằm cạnh nhau ở đây, và mỗi cặp là một ranh giới đáng nhớ. ' +
           '<b>Cặp thứ nhất</b> — <code>dpkg -S</code> đi từ <b>file</b> tới <b>gói</b>, ' +
           '<code>dpkg -L</code> đi ngược lại từ <b>gói</b> tới <b>file</b>; hai chiều của ' +
           'cùng một bảng 62 884 dòng. <b>Cặp thứ hai</b> — <code>apt-cache policy</code> ' +
           'đọc <i>chỉ mục kho</i> để nói bản nào có sẵn, còn ' +
           '<code>dpkg -l | grep -v \'^ii\'</code> đọc <i>sổ cái</i> để nói máy bạn đang ở ' +
           'trạng thái nào; hai chữ đầu của <code>dpkg -l</code> là ' +
           '<i>mong muốn</i> + <i>thực tế</i>, nên <code>ii</code> là bình thường còn ' +
           '<code>iU</code> hay <code>rc</code> là chuyện cần xem. <b>Cặp thứ ba</b> — ' +
           '<code>apt-get -s install</code> (<code>-s</code> = <i>simulate</i>) chỉ ' +
           '<b>lập kế hoạch</b> và không đụng vào máy, đây là lệnh bạn dùng để trả lời trục ' +
           '2 trước khi tiêu một byte flash nào; còn <code>apt-mark showmanual</code> hỏi ' +
           'một câu hoàn toàn khác — <i>ai đó đã cố ý cài gì</i>. Trên máy bạn nó ra ' +
           '<b>69</b> dòng, so với 855 gói đang có.' },
  ],

  /* ═══ B · Giải thích — 2 đọc output + 1 so sánh cặp + 2 vì sao + 1 bắt lỗi ═ */
  B: [
    { id: 'b1', k: 'free', truc: 0, tag: 'Đọc output', rows: 10,
      q: 'Ba dòng dưới đây nói về <b>cùng một file chỉ mục</b> trên máy bạn. Chúng cho ba ' +
         'mốc thời gian <b>khác nhau</b>, và hôm nay là <b>18/08/2026</b>. Giải thích mỗi ' +
         'mốc là mốc gì, vì sao chúng không trùng nhau, và điều đó nói gì về thứ ' +
         '<code>apt install</code> đang tin tưởng.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "stat -c 'mtime=%y' /var/lib/apt/lists/archive.ubuntu.com_ubuntu_dists_resolute_universe_binary-amd64_Packages\n" +
          "stat -c 'ctime=%z' /var/lib/apt/lists/archive.ubuntu.com_ubuntu_dists_resolute_universe_binary-amd64_Packages\n" +
          "grep -m2 -E '^(Date|Valid-Until):' /var/lib/apt/lists/archive.ubuntu.com_ubuntu_dists_resolute_InRelease" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'mtime=2026-04-24 00:07:30.000000000 +0700\n' +
          'ctime=2026-07-31 21:37:32.945888852 +0700\n' +
          'Date: Thu, 23 Apr 2026 17:07:15 UTC' },
        { t: 'p', x: 'Lưu ý cả cái <i>không</i> có: <code>grep</code> được phép in tối đa ' +
                    'hai dòng và nó chỉ in một. Đó cũng là dữ liệu.' }
      ],
      hint: 'Ba mốc, ba tác nhân khác nhau đặt ra. Hỏi từng mốc: <i>ai</i> ghi con số này, ' +
            'và <i>vào lúc nào</i>? Một trong ba không do máy bạn đặt.',
      crit: [
        '<b>mtime = 24/04</b> là ngày <b>máy chủ xuất bản</b> bản chụp này — <code>apt</code> đặt lại mtime theo header <code>Last-Modified</code> của máy chủ, nên nó <i>không</i> phải lúc bạn chạy <code>apt update</code>',
        '<b>ctime = 31/07</b> là lúc file được <b>ghi xuống đĩa máy bạn</b>, tức là lần <code>apt update</code> gần nhất',
        'Dòng <code>Date:</code> trong <code>InRelease</code> (23/04, giờ UTC) <b>khớp</b> với mtime — đây là bằng chứng xác nhận mtime đến từ máy chủ chứ không phải từ máy bạn',
        'Hôm nay 18/08: bản chụp đã <b>18 ngày</b> kể từ lần tải, và nó mô tả trạng thái kho của gần <b>bốn tháng</b> trước',
        'Kết luận đúng: <code>apt install</code> lập kế hoạch trên <b>bản chụp này</b>, không hỏi máy chủ — nó chỉ biết cái kho <i>đã</i> có, không phải cái kho <i>đang</i> có',
        '<code>grep</code> chỉ in một dòng trong khi được phép in hai ⇒ file <code>InRelease</code> này <b>không có</b> trường <code>Valid-Until</code>, nên chẳng có gì tự động cảnh báo bạn rằng bản chụp đã cũ'
      ],
      sol: '<p><b>Ba mốc, ba tác nhân.</b> <code>mtime</code> là "nội dung sửa lần cuối lúc ' +
           'nào" và bình thường nó do máy bạn đặt. Nhưng <code>apt</code> cố tình ' +
           '<i>không</i> để nó bình thường: khi tải xong một file chỉ mục, apt đặt lại mtime ' +
           'theo header <code>Last-Modified</code> mà máy chủ gửi kèm. Vì thế ' +
           '<code>mtime = 2026-04-24 00:07:30</code> là <b>ngày máy chủ xuất bản bản chụp ' +
           'ấy</b>. Bằng chứng nằm ngay ở dòng thứ ba: <code>InRelease</code> của chính bản ' +
           'phát hành này ghi <code>Date: Thu, 23 Apr 2026 17:07:15 UTC</code> — cùng một ' +
           'thời điểm, chỉ khác múi giờ (UTC+7 nên 17:07 UTC là 00:07 hôm sau). Hai con số ' +
           'khớp nhau không phải trùng hợp.</p>' +
           '<p><code>ctime</code> thì máy bạn <b>không thể</b> giả được — nó là lúc inode ' +
           'thay đổi lần cuối, và kernel đặt nó, không chương trình nào ghi đè được. ' +
           '<code>ctime = 2026-07-31 21:37:32</code> chính là <b>lần <code>apt update</code> ' +
           'gần nhất</b> của bạn. Đây là mẹo thực dụng đáng nhớ: muốn biết một máy lạ đã ' +
           'không cập nhật chỉ mục bao lâu rồi, đừng nhìn <code>ls -l</code> (nó in mtime, ' +
           'tức ngày của máy chủ) — nhìn <code>stat -c %z</code>.</p>' +
           '<p><b>Cộng lại thì bức tranh khá bất an.</b> Hôm nay là 18/08. Bạn tải bản chụp ' +
           'này 18 ngày trước, và bản chụp ấy mô tả cái kho như nó có mặt ngày 23/04 — gần ' +
           'bốn tháng trước. Mọi thứ <code>apt</code> "biết" về kho đều đến từ đó. Khi bạn ' +
           'gõ <code>apt install</code>, nó <b>không hỏi máy chủ</b> xem kho hiện có gì; nó ' +
           'đọc file này, lập xong kế hoạch, rồi mới đi tải đúng những URL mà file này ghi. ' +
           'Đó là lý do một lỗi <b>404 lúc tải</b> là chuyện hoàn toàn bình thường và không ' +
           'hề mâu thuẫn: kho đã xoá phiên bản cũ từ lâu, chỉ có bản chụp của bạn là chưa ' +
           'biết.</p>' +
           '<p><b>Và cái không có mặt cũng là dữ liệu.</b> Lệnh <code>grep</code> ở trên bắt ' +
           'cả <code>Date:</code> lẫn <code>Valid-Until:</code> và được phép in hai dòng — ' +
           'nó chỉ in một. Bản phát hành này <b>không đặt <code>Valid-Until</code></b>, nên ' +
           'không có cơ chế nào tự nói với bạn rằng chỉ mục đã hết hạn. Trách nhiệm biết ' +
           '"bản chụp của tôi cũ chưa" là của bạn, không của công cụ. Trên máy build của dây ' +
           'chuyền sản xuất, đó chính là lý do bước đầu tiên luôn phải là ' +
           '<code>apt-get update</code> — hoặc, tốt hơn, là <b>đóng băng</b> bản chụp ấy lại ' +
           'và ghi rõ ngày, để hai lần dựng cách nhau ba tháng vẫn ra cùng một image.</p>' },

    { id: 'b2', k: 'free', truc: 1, tag: 'Đọc output', rows: 12,
      q: 'Gói <code>gcc-riscv64-linux-gnu</code> ghi <code>Installed-Size: 25</code>. Dưới ' +
         'đây là kế hoạch thật của <code>apt</code> khi cài nó, kèm ' +
         '<code>Installed-Size</code> của <b>từng</b> gói trong bao đóng. Đọc bảng và trả ' +
         'lời: cài gói này tốn bao nhiêu, tiền đi đâu, và <b>phép cộng ở cuối sai ở chỗ ' +
         'nào</b>?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          '# 1. the plan: which packages get installed?\n' +
          "apt-get -s install gcc-riscv64-linux-gnu | sed -n '/NEW packages/,/^[0-9]* upgraded/p'\n" +
          '\n' +
          '# 2. Installed-Size of every package in the closure\n' +
          "for p in $(apt-get -s install gcc-riscv64-linux-gnu 2>/dev/null | awk '/^Inst /{print $2}'); do\n" +
          "  s=$(apt-cache show \"$p\" 2>/dev/null | awk -F': ' '/^Installed-Size: /{print $2; exit}')\n" +
          "  printf '%10s  %s\\n' \"${s:-no-field}\" \"$p\"\n" +
          'done' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'The following NEW packages will be installed:\n' +
          '  binutils-riscv64-linux-gnu cpp-15-riscv64-linux-gnu cpp-riscv64-linux-gnu\n' +
          '  gcc-15-riscv64-linux-gnu gcc-15-riscv64-linux-gnu-base gcc-riscv64-linux-gnu\n' +
          '  libasan8-riscv64-cross libatomic1-riscv64-cross libc6-dev-riscv64-cross\n' +
          '  libc6-riscv64-cross libgcc-15-dev-riscv64-cross libgcc-s1-riscv64-cross\n' +
          '  libgomp1-riscv64-cross libitm1-riscv64-cross liblsan0-riscv64-cross\n' +
          '  libstdc++6-riscv64-cross libtsan2-riscv64-cross libubsan1-riscv64-cross\n' +
          '  linux-libc-dev-riscv64-cross\n' +
          '0 upgraded, 19 newly installed, 0 to remove and 11 not upgraded.\n' +
          '\n' +
          '     13437  binutils-riscv64-linux-gnu\n' +
          '       106  gcc-15-riscv64-linux-gnu-base\n' +
          '     63675  cpp-15-riscv64-linux-gnu\n' +
          '        21  cpp-riscv64-linux-gnu\n' +
          '  no-field  libc6-riscv64-cross\n' +
          '       153  libgcc-s1-riscv64-cross\n' +
          '       402  libgomp1-riscv64-cross\n' +
          '       154  libitm1-riscv64-cross\n' +
          '        45  libatomic1-riscv64-cross\n' +
          '      2756  libasan8-riscv64-cross\n' +
          '      1004  liblsan0-riscv64-cross\n' +
          '      2352  libtsan2-riscv64-cross\n' +
          '      3709  libstdc++6-riscv64-cross\n' +
          '       894  libubsan1-riscv64-cross\n' +
          '     34207  libgcc-15-dev-riscv64-cross\n' +
          '    130412  gcc-15-riscv64-linux-gnu\n' +
          '        25  gcc-riscv64-linux-gnu\n' +
          '      7570  linux-libc-dev-riscv64-cross\n' +
          '  no-field  libc6-dev-riscv64-cross' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          '# 3. add them up, and count the bytes actually downloaded\n' +
          "apt-get -s install gcc-riscv64-linux-gnu 2>/dev/null | awk '/^Inst /{print $2}' \\\n" +
          " | while read -r p; do apt-cache show \"$p\" 2>/dev/null | awk -F': ' '/^Installed-Size: /{print $2; exit}'; done \\\n" +
          " | awk '{s+=$1; n++} END{print \"summed \"n\" values, total = \"s\" KB = \"int(s/1024)\" MB\"}'\n" +
          '\n' +
          "apt-get --print-uris -y install gcc-riscv64-linux-gnu 2>/dev/null | grep \"^'\" \\\n" +
          " | awk '{s+=$3; n++} END{print n\" files, \"s\" bytes = \"int(s/1048576)\" MB\"}'" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'summed 17 values, total = 260922 KB = 254 MB\n' +
          '19 files, 63704270 bytes = 60 MB' },
        { t: 'cal', kind: 'warn', x: 'Dòng cuối cùng của lệnh cộng nói <b>"summed 17 ' +
          'values"</b>, nhưng kế hoạch có <b>19</b> gói. Đừng bỏ qua chi tiết đó — nó là ' +
          'một phần ba câu trả lời.' }
      ],
      hint: 'Ba câu hỏi tách rời: (1) tổng là bao nhiêu và so với 25 KB thì gấp mấy lần; ' +
            '(2) hai gói nào chiếm phần lớn; (3) vì sao <code>awk</code> chỉ cộng được 17 ' +
            'trong 19 số, và sai số đi về hướng nào — thừa hay thiếu?',
      crit: [
        'Nhận ra kế hoạch có <b>19 gói</b>, không phải một — <code>0 upgraded, 19 newly installed</code>',
        'Tổng cộng được là <b>260 922 KB ≈ 254 MB</b>, so với <code>Installed-Size: 25</code> của gói được gõ tên — chênh hơn <b>mười nghìn lần</b>',
        'Chỉ ra hai gói nuốt phần lớn: <code>gcc-15-riscv64-linux-gnu</code> (130 412 KB) và <code>cpp-15-riscv64-linux-gnu</code> (63 675 KB) — cộng lại hơn <b>3/4</b> tổng số',
        'Giải thích được chỗ sai: <code>libc6-riscv64-cross</code> và <code>libc6-dev-riscv64-cross</code> <b>không có trường <code>Installed-Size</code></b>, <code>awk</code> bỏ qua <b>im lặng</b>, nên chỉ cộng 17/19',
        'Suy ra hướng của sai số: 254 MB là <b>chặn dưới</b>, con số thật lớn hơn — hai gói bị bỏ qua tải về 1 356 848 + 4 107 336 byte, không phải gói nhỏ',
        'Phân biệt đúng hai con số: <b>60 MB</b> đi qua dây (Download-Size) so với <b>254 MB</b> nằm lại trên đĩa (Installed-Size) — chênh hơn bốn lần vì <code>.deb</code> là file nén',
        'Nêu được rằng con số phụ thuộc <b>đích</b>: dòng <code>11 not upgraded</code> và mọi gói máy này đã có đều không tính vào — trên rootfs trống thì đắt hơn'
      ],
      sol: '<p><b>Câu hỏi thứ nhất: bao nhiêu.</b> Kế hoạch nói thẳng — ' +
           '<code>19 newly installed</code>. Cộng <code>Installed-Size</code> lại được ' +
           '<b>260 922 KB ≈ 254 MB</b> nằm trên đĩa, và <b>63 704 270 byte ≈ 60 MB</b> phải ' +
           'tải về. Gói bạn gõ tên ghi <code>25</code>. Tỉ lệ giữa cái bạn đọc và cái bạn ' +
           'trả là hơn <b>mười nghìn lần</b>.</p>' +
           '<p><b>Câu hỏi thứ hai: tiền đi đâu.</b> <code>gcc-15-riscv64-linux-gnu</code> ' +
           '130 412 KB và <code>cpp-15-riscv64-linux-gnu</code> 63 675 KB — hai gói này ' +
           'chiếm hơn ba phần tư. Còn <code>gcc-riscv64-linux-gnu</code>, cái tên bạn gõ, ' +
           'đóng góp đúng <b>25 KB</b>. Nó là một cái vỏ: một tên dễ nhớ, một dòng ' +
           '<code>Depends</code>, và không có gì khác. Đây là hình dạng bình thường của một ' +
           'toolchain đóng gói sẵn, không phải chuyện bất thường — nhưng nó có nghĩa là ' +
           '<b>đọc <code>Installed-Size</code> của gói mình gõ tên là đọc nhầm số</b>.</p>' +
           '<p><b>Câu hỏi thứ ba, và là chỗ đáng giá nhất: phép cộng sai ở đâu.</b> Nó nói ' +
           '<code>summed 17 values</code> trong khi có 19 gói. Điều tra ra: ' +
           '<code>libc6-riscv64-cross</code> và <code>libc6-dev-riscv64-cross</code> ' +
           '<b>hoàn toàn không có dòng <code>Installed-Size:</code></b> trong bản ghi chỉ ' +
           'mục — chúng là gói do <code>dpkg-cross</code> sinh ra, <code>Architecture: ' +
           'all</code>, và trường ấy vắng mặt. Đoạn <code>awk</code> không báo lỗi, không ' +
           'in cảnh báo, chỉ lặng lẽ cộng 17 số.</p>' +
           '<p>Hướng của sai số quan trọng hơn độ lớn của nó: <b>254 MB là chặn dưới</b>. Và ' +
           'hai gói bị bỏ qua không hề nhỏ — riêng phần tải về của chúng là 1 356 848 và ' +
           '4 107 336 byte. Đây là dạng lỗi tệ nhất trong nghề: một con số <i>trông như</i> ' +
           'câu trả lời, không kèm cảnh báo nào, và lệch về phía <b>lạc quan</b>. Bạn lên kế ' +
           'hoạch flash theo nó, rồi hết chỗ lúc dây chuyền đã chạy. Bài học chung: khi một ' +
           'script cộng dữ liệu từ nhiều nguồn, hãy in <i>số phần tử đã cộng</i> bên cạnh ' +
           'tổng — chính dòng <code>summed 17 values</code> là thứ cứu bạn ở đây.</p>' +
           '<p><b>Hai đơn vị, đừng trộn.</b> 60 MB là số byte đi qua dây; 254 MB là số byte ' +
           'nằm lại trên flash. Chênh hơn bốn lần vì <code>.deb</code> nén còn nội dung sau ' +
           'khi bung thì không. Trên bo mạch, con số phải lo là con số thứ hai.</p>' +
           '<p><b>Và con số 254 MB ấy vẫn chỉ đúng với máy này.</b> Dòng ' +
           '<code>11 not upgraded</code> nhắc rằng apt đang tính toán <i>tương đối với ' +
           'trạng thái hiện tại</i>. Máy bạn đã có sẵn <code>libc6</code>, có sẵn ' +
           '<code>binutils</code> phần chung, nên chúng không tính vào. Dựng cùng gói ấy vào ' +
           'một rootfs trống thì con số khác. Nói cho gọn: <b>kích thước là một phép trừ ' +
           'giữa gói và đích</b>, không phải một thuộc tính đọc được từ bảng.</p>' },

    { id: 'b3', k: 'free', truc: 2, tag: 'Bắt lỗi phát biểu', rows: 12,
      q: 'Một đồng nghiệp viết trong biên bản họp:<br><br>' +
         '<i>"Chương trình <code>tree</code> trên máy chúng ta là bản của Ubuntu, không phải ' +
         'bản gốc — Ubuntu duy trì một nhánh mã nguồn riêng của họ. Muốn thêm một tuỳ chọn ' +
         'cho bo mạch của mình thì chúng ta phải fork nhánh đó, hoặc đơn giản hơn là tải ' +
         'tarball trên trang tác giả rồi <code>./configure &amp;&amp; make install</code>."</i>' +
         '<br><br>Phát biểu này sai. Dùng bằng chứng dưới đây chỉ ra <b>sai ở đâu</b>, và ' +
         'nói quy trình đúng là gì.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          '# apt-get source tree  ->  it fetched exactly three files\n' +
          'ls -l --time-style=long-iso tree_2.3.1-1.dsc tree_2.3.1.orig.tar.gz tree_2.3.1-1.debian.tar.xz\n' +
          '\n' +
          '# what the .dsc claims the checksums are\n' +
          "sed -n '/^Checksums-Sha256:/,/^Files:/p' tree_2.3.1-1.dsc\n" +
          '\n' +
          '# recompute one of them by hand\n' +
          'sha256sum tree_2.3.1.orig.tar.gz' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '-rw-r--r-- 1 shinarus shinarus  9568 2026-02-04 08:10 tree_2.3.1-1.debian.tar.xz\n' +
          '-rw-r--r-- 1 shinarus shinarus  1869 2026-02-04 08:10 tree_2.3.1-1.dsc\n' +
          '-rw-r--r-- 1 shinarus shinarus 70339 2026-02-04 08:10 tree_2.3.1.orig.tar.gz\n' +
          '\n' +
          'Checksums-Sha256:\n' +
          ' 47ca786ed4ea4aa277cabd42b1a54635aca41b29e425e9229bd1317831f25665 70339 tree_2.3.1.orig.tar.gz\n' +
          ' eec0d36eadcabfe8447a7a9eba53ea1c6343102dbd087109b7918c0cd14ced9b 9568 tree_2.3.1-1.debian.tar.xz\n' +
          'Files:\n' +
          '\n' +
          '47ca786ed4ea4aa277cabd42b1a54635aca41b29e425e9229bd1317831f25665  tree_2.3.1.orig.tar.gz' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "# is there a debian/ directory inside the upstream tarball?\n" +
          "tar tzf tree_2.3.1.orig.tar.gz | grep -c '^[^/]*/debian/'\n" +
          'tar tzf tree_2.3.1.orig.tar.gz | head -8\n' +
          '\n' +
          '# so what exactly does the distribution add?\n' +
          'ls tree-2.3.1/debian/\n' +
          'cat tree-2.3.1/debian/source/format\n' +
          'cat tree-2.3.1/debian/patches/series\n' +
          'wc -l tree-2.3.1/debian/patches/*' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '0\n' +
          'tree-2.3.1/CHANGES\n' +
          'tree-2.3.1/INSTALL\n' +
          'tree-2.3.1/LICENSE\n' +
          'tree-2.3.1/Makefile\n' +
          'tree-2.3.1/README\n' +
          'tree-2.3.1/TODO\n' +
          'tree-2.3.1/color.c\n' +
          'tree-2.3.1/file.c\n' +
          '\n' +
          'changelog\ncontrol\ncopyright\ndocs\npatches\nrules\nsalsa-ci.yml\nsource\ntests\nwatch\n' +
          '3.0 (quilt)\n' +
          'manpage\n' +
          ' 17 tree-2.3.1/debian/patches/manpage\n' +
          '  1 tree-2.3.1/debian/patches/series\n' +
          ' 18 total' },
        { t: 'cal', kind: 'info', x: 'Hai con số đáng dừng lại: <code>grep -c</code> ra ' +
          '<b>0</b>, và <code>wc -l</code> ra <b>17</b>. Mỗi con số bác bỏ một nửa phát ' +
          'biểu trên.' }
      ],
      hint: 'So dòng <code>sha256sum</code> tự tính với dòng trong <code>.dsc</code>. Nếu ' +
            'Ubuntu có "nhánh riêng" thì hai dòng đó phải khác nhau. Rồi hỏi: nếu mã nguồn ' +
            'gốc không đổi, thì phần riêng của bản phân phối nằm ở đâu, và <b>to bằng bao ' +
            'nhiêu</b>?',
      crit: [
        'Chỉ ra sha256 tự tính (<code>47ca786e…</code>) <b>trùng khít</b> dòng trong <code>.dsc</code> ⇒ <code>orig.tar.gz</code> là tarball của tác giả, <b>không ai sửa một byte</b> — không có "nhánh riêng"',
        '<code>tar tzf … | grep -c</code> ra <b>0</b> ⇒ thư mục <code>debian/</code> <b>không nằm trong</b> mã nguồn gốc; nó được ghép vào từ file thứ hai (<code>debian.tar.xz</code>, 9 568 byte)',
        'Toàn bộ khác biệt thật sự là <b>một patch</b>: <code>series</code> chỉ có một dòng <code>manpage</code>, và patch ấy dài <b>17 dòng</b>',
        'Nêu quy trình đúng: <code>apt-get source</code> → thêm file patch vào <code>debian/patches/</code> và một dòng vào <code>series</code> → <code>dpkg-buildpackage</code>. Không fork, không đụng vào <code>orig.tar.gz</code>',
        'Bác bỏ được vế <code>./configure &amp;&amp; make install</code>: nó cài vào <code>/usr/local</code>, <b>sổ cái không biết gì</b>, máy có hai bản chương trình, và <code>apt</code> không gỡ hay nâng cấp được bản kia',
        'Nhận ra <code>3.0 (quilt)</code> là <b>định dạng</b> quy định cách làm ấy — orig bất khả xâm phạm + một chồng patch có thứ tự — chứ không phải mẹo riêng của gói <code>tree</code>'
      ],
      sol: '<p><b>Vế thứ nhất sai: không có "nhánh riêng" nào cả.</b> Bằng chứng mạnh nhất ' +
           'là hai dòng bạn có thể tự đối chiếu bằng mắt. File <code>.dsc</code> khai báo ' +
           '<code>47ca786ed4ea…</code> cho <code>tree_2.3.1.orig.tar.gz</code>, và ' +
           '<code>sha256sum</code> chạy trên máy bạn ra <b>đúng chuỗi ấy</b>. Nếu Ubuntu có ' +
           'sửa dù một dấu cách trong mã nguồn, băm sẽ khác hoàn toàn. Cái mà ' +
           '<code>apt-get source</code> tải về là <b>tarball của chính tác giả</b>, nguyên ' +
           'vẹn.</p>' +
           '<p><b>Vậy phần riêng của bản phân phối nằm ở đâu?</b> Ở file thứ hai. Ba file, ' +
           'ba vai trò rành mạch: <code>orig.tar.gz</code> (70 339 byte) là mã nguồn gốc; ' +
           '<code>debian.tar.xz</code> (9 568 byte) là <i>mọi thứ</i> Ubuntu thêm vào; ' +
           '<code>.dsc</code> (1 869 byte) là tờ khai buộc hai file kia lại và ký tên. Và ' +
           '<code>tar tzf orig | grep -c debian/</code> ra <b>0</b> — thư mục ' +
           '<code>debian/</code> <i>không hề tồn tại</i> trong mã nguồn gốc. Nó được ghép ' +
           'vào lúc bung ra, từ bên ngoài.</p>' +
           '<p><b>Và phần riêng ấy nhỏ đến mức đọc hết trong nửa phút.</b> Bên trong ' +
           '<code>debian/</code> có <code>rules</code> (cách dựng), <code>control</code> ' +
           '(tên gói, Depends), <code>changelog</code>, <code>copyright</code>, và ' +
           '<code>patches/</code>. File <code>patches/series</code> — danh sách patch được ' +
           'áp, theo đúng thứ tự — có <b>đúng một dòng</b>: <code>manpage</code>. Patch ấy ' +
           'dài <b>17 dòng</b>. Toàn bộ khác biệt giữa <code>tree</code> của tác giả và ' +
           '<code>tree</code> bạn đang chạy là 17 dòng bạn đọc được ngay.</p>' +
           '<p><b>Nên quy trình đúng không phải fork.</b> Nó là: <code>apt-get source ' +
           'tree</code>, viết thay đổi của bạn thành một file patch, đặt vào ' +
           '<code>debian/patches/</code>, thêm một dòng tên nó vào <code>series</code>, thêm ' +
           'một mục vào <code>debian/changelog</code> với hậu tố phiên bản riêng của bạn, ' +
           'rồi <code>dpkg-buildpackage</code>. Bạn được một file <code>.deb</code> cài bằng ' +
           '<code>apt</code>, gỡ bằng <code>apt</code>, nằm trong sổ cái như mọi gói khác — ' +
           'và thay đổi của bạn tồn tại dưới dạng <b>một file 17 dòng đọc được</b>, không ' +
           'phải một nhánh Git phải rebase mỗi lần tác giả ra bản mới. Dòng ' +
           '<code>3.0 (quilt)</code> trong <code>debian/source/format</code> chính là thứ ' +
           'biến cách làm này thành quy tắc bắt buộc của định dạng, không phải thói quen của ' +
           'riêng gói này.</p>' +
           '<p><b>Vế "đơn giản hơn" thì tệ hơn hẳn.</b> ' +
           '<code>./configure &amp;&amp; make install</code> đặt file vào ' +
           '<code>/usr/local</code>, và <code>dpkg</code> <b>không biết gì về chúng</b>. Máy ' +
           'bạn lập tức có hai bản <code>tree</code>: bản của apt trong ' +
           '<code>/usr/bin</code> vẫn nằm đó, còn bản của bạn ở ' +
           '<code>/usr/local/bin</code> — và cái nào chạy phụ thuộc thứ tự trong ' +
           '<code>PATH</code>. <code>apt upgrade</code> sẽ nâng cấp bản nó biết và không ' +
           'chạm vào bản kia. Gỡ ra thì không có lệnh nào làm được, vì không có sổ ghi file ' +
           'nào đã bị đặt xuống. Trên máy cá nhân đó là phiền; trên một image sản xuất phải ' +
           'tái lập được và phải vá bảo mật được, đó là <b>nợ kỹ thuật không trả nổi</b>.</p>' },

    { id: 'b4', k: 'free', tag: 'Giải thích vì sao', rows: 9,
      q: 'Trên máy bạn, <code>/bin/sh</code> và <code>/usr/bin/sh</code> dẫn tới ' +
         '<b>đúng cùng một chương trình</b>. Nhưng hỏi <code>dpkg</code> "gói nào đặt file ' +
         'này" thì một đường dẫn trả lời được, một đường dẫn thì không. Giải thích vì sao — ' +
         'và từ đó, nói chính xác <b>sổ cái lưu cái gì</b>.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'dpkg -S /bin/sh\n' +
          'dpkg -S /usr/bin/sh\n' +
          'dpkg -S /usr/bin/ls\n' +
          'ls -l /usr/bin/ls' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'dpkg-query: no path found matching pattern /bin/sh\n' +
          'dash: /usr/bin/sh\n' +
          'coreutils-from-uutils: /usr/bin/ls\n' +
          'lrwxrwxrwx 1 root root 29 Mar 30 23:50 /usr/bin/ls -> ../lib/cargo/bin/coreutils/ls' },
        { t: 'p', x: 'Gợi ý về quy mô: cộng tất cả các file <code>.list</code> trong ' +
                    '<code>/var/lib/dpkg/info</code> lại được <b>62 884</b> dòng.' }
      ],
      hint: 'Câu hỏi thật sự là: <code>dpkg -S</code> tra <i>cái gì</i> để trả lời? Nó có ' +
            'nhìn vào hệ thống file lúc đó không, hay nó tra một cái bảng? Và nếu là bảng ' +
            'thì bảng ấy chứa <i>chuỗi ký tự</i> hay chứa <i>file</i>?',
      crit: [
        'Nói rõ <code>dpkg -S</code> <b>không nhìn hệ thống file</b> — nó tra <b>văn bản</b> trong các file <code>.list</code> ở <code>/var/lib/dpkg/info</code> (62 884 dòng)',
        'Sổ cái lưu <b>chuỗi đường dẫn</b> đúng như gói đã khai lúc cài, <b>không lưu inode</b> — nên nó không biết hai chuỗi khác nhau có thể trỏ cùng một chỗ',
        '<code>/bin</code> là <b>symlink</b> sang <code>usr/bin</code> (usr-merge). Gói <code>dash</code> khai file của nó ở <code>/usr/bin/sh</code>, nên chuỗi <code>/bin/sh</code> không có trong bảng ⇒ <code>no path found</code>',
        'Cách chữa đúng: chuẩn hoá đường dẫn trước — <code>dpkg -S "$(realpath /bin/sh)"</code> — thay vì kết luận "file này không thuộc gói nào"',
        'Giải thích được vì sao <code>/usr/bin/ls</code> tra <b>được</b> dù nó cũng là symlink: chính <b>symlink đó</b> là thứ gói đặt xuống và khai vào sổ, còn đích của nó nằm chỗ khác',
        'Rút ra: <b>tên gói không phải tên lệnh</b> — <code>ls</code> đến từ <code>coreutils-from-uutils</code>; đoán tên gói từ tên lệnh là cách hỏng bền vững'
      ],
      sol: '<p><b>Cốt lõi: <code>dpkg -S</code> là một phép tra văn bản, không phải một câu ' +
           'hỏi về hệ thống file.</b> Khi cài, mỗi gói ghi danh sách đường dẫn nó đặt xuống ' +
           'vào một file <code>/var/lib/dpkg/info/&lt;gói&gt;.list</code>. Cộng lại trên máy ' +
           'bạn là <b>62 884 dòng</b>. <code>dpkg -S</code> chỉ đi khớp chuỗi bạn đưa với ' +
           'các dòng đó. Nó không <code>stat</code> file, không đi theo symlink, không biết ' +
           'inode là gì.</p>' +
           '<p><b>Nên chuyện xảy ra là chuyện về chuỗi ký tự.</b> Ubuntu đã <i>usr-merge</i> ' +
           'từ lâu: <code>/bin</code> nay là một symlink trỏ sang <code>usr/bin</code>. Gói ' +
           '<code>dash</code> khai file của nó ở <code>/usr/bin/sh</code>, và <b>chỉ</b> ' +
           'chuỗi đó nằm trong bảng. Bạn hỏi <code>/bin/sh</code> — kernel thì mở được, vì ' +
           'nó đi qua symlink; <code>dpkg</code> thì không tìm thấy dòng nào khớp và trả lời ' +
           'thẳng thắn <code>no path found matching pattern</code>. Câu trả lời ấy ' +
           '<b>đúng</b> theo nghĩa của nó ("không có chuỗi này trong sổ") nhưng rất dễ bị ' +
           'đọc thành nghĩa khác ("file này không thuộc gói nào"), và đó là chỗ mất giờ. ' +
           'Cách chữa là một chữ: <code>dpkg -S "$(realpath /bin/sh)"</code>.</p>' +
           '<p><b>Vế thứ hai làm rõ hẳn ranh giới.</b> <code>/usr/bin/ls</code> ' +
           '<i>cũng</i> là symlink — <code>ls -l</code> cho thấy nó trỏ tới ' +
           '<code>../lib/cargo/bin/coreutils/ls</code> — vậy mà <code>dpkg -S</code> trả lời ' +
           'ngon lành. Vì sao? Vì <b>chính cái symlink ấy là thứ gói đặt xuống</b> và khai ' +
           'vào sổ. Sổ cái không quan tâm đích trỏ đi đâu; nó chỉ ghi "tôi đã tạo đường dẫn ' +
           'này". Symlink do <i>gói</i> tạo thì tra được; symlink do <i>bố cục hệ thống</i> ' +
           'tạo (như <code>/bin</code>) thì không.</p>' +
           '<p><b>Và một bài học phụ, nhưng dùng hằng tuần:</b> lệnh <code>ls</code> trên ' +
           'máy này đến từ gói <code>coreutils-from-uutils</code> — bản viết lại bằng Rust, ' +
           'không phải <code>coreutils</code> của GNU. Tên gói không suy ra được từ tên ' +
           'lệnh. Đó chính là lý do <code>dpkg -S</code> tồn tại: nghề này thường bắt đầu từ ' +
           'một <i>đường dẫn</i> trong log lỗi, không phải từ một cái tên gói.</p>' },

    { id: 'b5', k: 'free', tag: 'So sánh cặp', rows: 10,
      q: 'Bản ghi của gói <code>git</code> có cả ba trường <code>Depends</code>, ' +
         '<code>Recommends</code> và <code>Suggests</code>. Chúng khác nhau ở nhiều điểm, ' +
         'nhưng với người dựng rootfs nhúng thì chỉ có <b>một</b> khác biệt thật sự quan ' +
         'trọng. Đó là khác biệt nào, và vì sao nó là cái quan trọng nhất?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          "apt-cache show git | sed -n '/^Package: git$/,/^$/p' | grep -E '^(Package|Version|Installed-Size|Depends|Recommends|Suggests):'" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'Package: git\n' +
          'Installed-Size: 25264\n' +
          'Version: 1:2.53.0-1ubuntu1\n' +
          'Recommends: ca-certificates, patch, less, ssh-client\n' +
          'Suggests: gettext-base, git-doc, git-email, git-gui, gitk, gitweb, git-cvs, git-svn\n' +
          'Depends: libc6 (>= 2.42), libcurl3t64-gnutls (>= 8.3.0), libexpat1 (>= 2.0.1), libpcre2-8-0 (>= 10.34), zlib1g (>= 1:1.2.2), perl, liberror-perl, git-man (>> 1:2.53.0), git-man (<< 1:2.53.0-.)' },
        { t: 'p', x: 'Câu hỏi định hướng: trong ba trường ấy, trường nào ' +
                    '<b>vào image của bạn mà bạn không hề yêu cầu</b>?' }
      ],
      hint: 'Đừng dừng ở "bắt buộc / khuyên dùng / gợi ý" — đó mới là định nghĩa. Hỏi tiếp: ' +
            '<i>ai</i> ép mỗi trường, và <i>lúc nào</i>. <code>dpkg</code> và ' +
            '<code>apt</code> không đối xử giống nhau với cả ba.',
      crit: [
        '<code>Depends</code> là <b>ràng buộc cứng</b>: <code>dpkg</code> từ chối cấu hình gói nếu thiếu — vi phạm nó thì <b>gói không cài được</b>',
        '<code>Recommends</code> <b>không</b> là ràng buộc kỹ thuật, nhưng <code>apt</code> <b>cài nó theo mặc định</b> — đây là một quyết định chính sách, không phải một yêu cầu của gói',
        '<code>Suggests</code> chỉ được liệt kê, <code>apt</code> không cài',
        'Khác biệt <b>quan trọng nhất</b>: <code>Recommends</code> là chỗ image phình lên <b>mà không ai yêu cầu</b> — ở đây là <code>ca-certificates, patch, less, ssh-client</code> và toàn bộ bao đóng của chúng',
        'Nêu công tắc: <code>--no-install-recommends</code>, và nêu đúng cái giá của nó — <b>hỏng chức năng chứ không hỏng cài đặt</b> (thiếu <code>ca-certificates</code> thì <code>git clone https://…</code> chết vì chứng chỉ, chứ <code>git</code> vẫn cài xong bình thường)',
        'Nhận ra <code>dpkg</code> chỉ ép <code>Depends</code>; <code>Recommends</code>/<code>Suggests</code> là chuyện của <b>tầng lập kế hoạch</b> (<code>apt</code>), khớp với mô hình hai tầng của Bài 12'
      ],
      sol: '<p><b>Định nghĩa thì ai cũng thuộc:</b> <code>Depends</code> bắt buộc, ' +
           '<code>Recommends</code> khuyên dùng, <code>Suggests</code> gợi ý. Nhưng định ' +
           'nghĩa không nói cho bạn biết cái nào <i>làm hỏng ngày làm việc của bạn</i>.</p>' +
           '<p><b>Khác biệt thật sự nằm ở chỗ: ai ép, và lúc nào.</b> ' +
           '<code>Depends</code> do <code>dpkg</code> ép, ở tầng dưới cùng — thiếu thì gói ' +
           'không sang được trạng thái đã cấu hình, và bạn thấy lỗi ngay. ' +
           '<code>Recommends</code> <b>không ai ép cả</b>: về mặt kỹ thuật gói chạy được nếu ' +
           'thiếu. Nhưng <code>apt</code> — tầng lập kế hoạch — <b>mặc định cài chúng</b>. ' +
           'Còn <code>Suggests</code> thì chỉ nằm đó cho bạn đọc.</p>' +
           '<p>Nên câu trả lời là: <b><code>Recommends</code> là thứ duy nhất vào image của ' +
           'bạn mà bạn không hề yêu cầu và cũng không hề cần.</b> Cài ' +
           '<code>git</code> ở đây kéo thêm <code>ca-certificates</code>, ' +
           '<code>patch</code>, <code>less</code>, <code>ssh-client</code> — cùng toàn bộ ' +
           'bao đóng của <i>chúng</i>. Trên máy để bàn thì tiện. Trên một rootfs 64 MB thì ' +
           'đó là vài chục MB không ai ký duyệt. Đây chính là trục 2 nhìn từ một góc khác: ' +
           'bao đóng phụ thuộc không chỉ lớn, nó còn <b>lớn theo một chính sách mặc định mà ' +
           'bạn phải biết mới tắt được</b>.</p>' +
           '<p><b>Công tắc là <code>--no-install-recommends</code></b>, và giá của nó phải ' +
           'nói cho rõ vì nó là loại lỗi khó chịu nhất: bạn <b>không</b> mất khả năng cài, ' +
           'bạn mất <b>chức năng</b>. Bỏ <code>ca-certificates</code> thì <code>git</code> ' +
           'vẫn cài xong, vẫn chạy, vẫn <code>git clone</code> qua SSH bình thường — rồi ' +
           'chết ở <code>https://</code> với một lỗi xác thực chứng chỉ mà không có gì gợi ' +
           'nhớ tới cái cờ bạn đã bật ba tháng trước. Bài học: bật ' +
           '<code>--no-install-recommends</code> là đúng cho image nhúng, nhưng nó biến ' +
           '<b>danh sách <code>Recommends</code> thành việc của bạn</b> — phải đọc nó và ' +
           'quyết định từng dòng, không phải tắt rồi quên.</p>' +
           '<p>Chi tiết cuối, dễ trôi qua: dòng <code>Depends</code> của <code>git</code> có ' +
           '<code>perl</code>. Cái đó thì <i>không</i> tắt được — nó là ràng buộc cứng. Nếu ' +
           'image của bạn không muốn có Perl, thì câu trả lời không phải là một cái cờ, mà ' +
           'là <b>không dùng gói <code>git</code> của bản phân phối</b>.</p>' },

    { id: 'b6', k: 'free', tag: 'Giải thích vì sao', rows: 9,
      q: 'Đo trên chính máy bạn, ba thư mục phục vụ việc <i>quản lý</i> gói chiếm chỗ như ' +
         'dưới đây — và đây là chỗ của <b>bộ máy quản lý</b>, chưa tính một byte nào của ' +
         'ứng dụng bạn muốn chạy. Dựa vào ba con số này, giải thích vì sao rootfs nhúng ' +
         'thường <b>không có <code>apt</code> trên đích</b>. Nêu <b>hai</b> lý do khác nhau ' +
         'về bản chất, không phải hai cách nói của một lý do.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'du -sh /var/lib/apt/lists /var/lib/dpkg /var/cache/apt' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '145M    /var/lib/apt/lists\n' +
          '30M     /var/lib/dpkg\n' +
          '193M    /var/cache/apt' },
        { t: 'p', x: 'Bo mạch nhúng phổ thông có <b>64 MB đến 512 MB</b> flash cho toàn bộ ' +
                    'rootfs.' }
      ],
      hint: 'Lý do thứ nhất là số học và bạn thấy nó ngay. Lý do thứ hai <b>không phải</b> ' +
            'về dung lượng — nghĩ về hai bo mạch giống hệt nhau, cùng một lệnh ' +
            '<code>apt install</code>, chạy cách nhau ba tháng.',
      crit: [
        'Cộng đúng: <b>145 + 30 + 193 = 368 MB</b> chỉ để quản lý gói, chưa có ứng dụng nào',
        'Đối chiếu với 64–512 MB flash ⇒ trên phần lớn bo mạch, con số này <b>một mình đã không vừa</b>',
        'Tách được phần bỏ được khỏi phần không: <code>/var/cache/apt</code> (193 MB) xoá tuỳ ý; <code>/var/lib/apt/lists</code> (145 MB) xoá được nhưng mất khả năng lập kế hoạch; <code>/var/lib/dpkg</code> (30 MB) là sổ cái — xoá là hỏng máy',
        '<b>Lý do thứ hai, khác bản chất:</b> cài trên đích là <b>không tái lập được</b> — hai bo mạch chạy cùng lệnh ở hai thời điểm nhận hai bản chụp chỉ mục khác nhau, nên ra hai rootfs khác nhau',
        'Nêu hệ quả đúng: dựng image <b>ở ngoài</b>, cố định phiên bản, đích chỉ nhận một cây thư mục đã chốt (Buildroot / Yocto / debootstrap + đóng băng chỉ mục)',
        'Nếu vẫn phải có <code>apt</code> trên đích thì nói được cái giá: dọn cache và <code>lists</code> để lấy lại chỗ, đổi lại mỗi lần cài thêm đều phải <code>apt update</code> và phải có mạng'
      ],
      sol: '<p><b>Lý do thứ nhất là số học, và nó tàn nhẫn.</b> ' +
           '<code>145 + 30 + 193 = 368 MB</code>. Đó là chi phí của <i>bộ máy</i> quản lý ' +
           'gói: chỉ mục kho, sổ cái, và kho <code>.deb</code> đã tải. Chưa có ' +
           '<code>busybox</code>, chưa có kernel, chưa có ứng dụng của bạn. Bo mạch nhúng ' +
           'phổ thông có 64–512 MB flash cho <i>toàn bộ</i> rootfs. Trên nửa dưới của khoảng ' +
           'đó, chỉ riêng bộ máy đã không vừa.</p>' +
           '<p>Có thể mặc cả được một phần: <code>/var/cache/apt</code> (193 MB) xoá bất cứ ' +
           'lúc nào, không mất gì ngoài việc phải tải lại. <code>/var/lib/apt/lists</code> ' +
           '(145 MB) cũng xoá được — nhưng xoá xong thì <code>apt install</code> không lập ' +
           'nổi kế hoạch cho tới khi <code>apt update</code> lại, mà muốn thế thì bo mạch ' +
           'phải có mạng. Chỉ <code>/var/lib/dpkg</code> (30 MB) là không mặc cả được: đó là ' +
           'sổ cái, xoá đi là máy không còn biết mình đang có gì. Mặc cả hết cỡ vẫn còn ' +
           '30 MB và một hệ thống đã mất khả năng cài thêm.</p>' +
           '<p><b>Lý do thứ hai không dính gì tới dung lượng, và nó mới là lý do thật ' +
           'sự.</b> Giả sử flash của bạn thừa chỗ. Bạn vẫn không muốn ' +
           '<code>apt install</code> chạy trên đích, vì <b>kết quả của nó không tái lập ' +
           'được</b>. Như B1 đã cho thấy, apt lập kế hoạch từ bản chụp chỉ mục mà bo mạch ấy ' +
           'tình cờ đang giữ. Hai bo mạch <i>giống hệt nhau</i>, cùng một dòng lệnh, chạy ' +
           'cách nhau ba tháng, sẽ nhận hai bản chụp khác nhau và ra hai rootfs khác nhau. ' +
           'Sang tháng thứ tư, một trong hai lỗi và bạn không có cách nào dựng lại đúng cái ' +
           'đã xuất xưởng để mà điều tra. Với một sản phẩm phải bảo hành nhiều năm, đó không ' +
           'phải bất tiện — đó là <b>không truy vết được</b>.</p>' +
           '<p><b>Nên cách làm chuẩn là đảo ngược chỗ đặt việc:</b> dựng image ở ngoài, trên ' +
           'máy build, với phiên bản được ghim chặt; đích chỉ nhận về một cây thư mục đã ' +
           'chốt và không tự thay đổi nữa. Đó chính xác là bài toán mà Buildroot và Yocto ' +
           'sinh ra để giải, và là lý do phần còn lại của lộ trình đi theo hướng cross-build ' +
           'chứ không phải "cài apt lên bo mạch". Nếu dự án vẫn buộc phải có ' +
           '<code>apt</code> trên đích — bo mạch cỡ lớn, cần vá bảo mật tại chỗ — thì bạn ' +
           'vẫn làm được, nhưng phải trả cả hai giá một cách có ý thức: 368 MB, và một image ' +
           'mà bạn không tái tạo được từ đầu.</p>' },
  ],

  /* ═══ C · Vận dụng — 2 chẩn đoán + 2 tình huống mới + 1 tính toán ═══════ */
  C: [
    { id: 'c1', k: 'free', truc: 0, tag: 'Chẩn đoán', rows: 12,
      q: 'Nhóm bạn dựng image bằng <code>Dockerfile</code> dưới đây trên máy CI. Ba quan ' +
         'sát, theo đúng thứ tự thời gian:<br><br>' +
         '<b>①</b> Tháng 4, lần dựng đầu tiên: <b>xanh</b>.<br>' +
         '<b>②</b> Tháng 8, <i>cùng commit, cùng Dockerfile, không ai sửa gì</i>: <b>đỏ</b>. ' +
         'Bước <code>apt-get install</code> chọn xong gói rồi mới chết, ở khâu tải, với lỗi ' +
         '<b>404</b> trên vài URL.<br>' +
         '<b>③</b> Cùng lúc đó, một đồng nghiệp chạy đúng lệnh ấy trên máy của họ: ' +
         '<b>xanh</b>.<br><br>' +
         'Nêu <b>nguyên nhân</b> giải thích được cả ba quan sát cùng lúc — chú ý là nó phải ' +
         'giải thích được cả ③, không chỉ ②. Sau đó nêu <b>hai cách sửa</b> khác nhau về bản ' +
         'chất, và nói mỗi cách đánh đổi cái gì.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'dockerfile', code:
          'FROM ubuntu:24.04\n' +
          '\n' +
          'RUN apt-get update \\\n' +
          ' && apt-get install -y --no-install-recommends build-essential \\\n' +
          ' && rm -rf /var/lib/apt/lists/*\n' +
          '\n' +
          '# ... twenty lines of other setup ...\n' +
          '\n' +
          'RUN apt-get install -y --no-install-recommends cmake ninja-build' },
        { t: 'cal', kind: 'info', x: 'Có <b>hai</b> khiếm khuyết trong file này, không phải ' +
          'một. Cái thứ hai không gây ra sự cố lần này nhưng sẽ gây ra một sự cố khác, và ' +
          'nó cũng nằm trong tầm trả lời của bạn.' }
      ],
      hint: 'Quan sát ③ là chìa khoá: nếu nguyên nhân là "kho đã đổi" thì máy đồng nghiệp ' +
            'cũng phải đỏ. Vậy khác biệt giữa hai máy nằm ở đâu? Nhớ lại B1: cái gì trên ' +
            'máy CI được nhớ lại giữa các lần dựng, và nó ghi trạng thái của thời điểm nào?',
      crit: [
        'Xác định đúng nguyên nhân: <b>lớp <code>RUN apt-get update</code> được lấy từ cache của Docker</b>, nên máy CI đang dùng lại <b>bản chụp chỉ mục của tháng 4</b>, trong khi kho thật đã thay bằng phiên bản mới',
        'Giải thích rõ vì sao lỗi rơi vào <b>khâu tải chứ không phải khâu chọn gói</b>: apt lập kế hoạch xong từ bản chụp cũ (thành công), rồi mới đi lấy đúng những URL bản chụp ấy ghi — mà kho đã xoá chúng ⇒ <b>404</b>',
        'Giải thích được quan sát ③: máy đồng nghiệp không có lớp cache ấy, nên nó <code>apt-get update</code> thật và nhận bản chụp mới ⇒ URL còn sống ⇒ xanh',
        'Chỉ ra khiếm khuyết thứ hai: lệnh <code>RUN</code> cuối cài thêm gói <b>sau khi</b> <code>lists</code> đã bị xoá ở lớp trên, nên nó không còn chỉ mục để lập kế hoạch',
        'Cách sửa 1 — <b>luôn làm mới</b>: gộp <code>apt-get update</code> vào <b>cùng một lệnh <code>RUN</code></b> với mọi lần cài. Đánh đổi: lần dựng nào cũng cần mạng, và <b>hai lần dựng cách nhau vẫn ra hai image khác nhau</b>',
        'Cách sửa 2 — <b>ghim chặt</b>: chốt phiên bản (<code>gói=phiên_bản</code>) hoặc trỏ vào một bản chụp kho đóng băng / kho gương nội bộ. Đánh đổi: image tái lập được nhưng bạn <b>tự gánh việc vá bảo mật</b>, phải chủ động dời mốc ghim',
        'Nói được sự khác nhau về bản chất của hai cách: cách 1 chọn <b>luôn mới</b> và bỏ tính tái lập; cách 2 chọn <b>tái lập được</b> và bỏ tính luôn mới. Không có cách nào cho cả hai'
      ],
      sol: '<p><b>Cả ba quan sát chỉ về một chỗ: cái bản chụp chỉ mục.</b> Docker cache ' +
           'từng lớp <code>RUN</code>. Lớp <code>apt-get update &amp;&amp; apt-get install ' +
           'build-essential</code> không đổi một ký tự nào giữa tháng 4 và tháng 8, nên ' +
           'Docker <b>không chạy lại nó</b> — nó dùng lại kết quả cũ. Nghĩa là: máy CI của ' +
           'bạn tháng 8 vẫn đang mang bản chụp chỉ mục <b>của tháng 4</b>.</p>' +
           '<p><b>Và đây là chỗ hình dạng của lỗi tố cáo nguyên nhân.</b> Bước chọn gói ' +
           '<i>thành công</i>; chỉ khâu tải mới chết. Vì sao? Vì như B1 đã chỉ ra, ' +
           '<code>apt install</code> không hỏi máy chủ xem kho có gì — nó đọc bản chụp trên ' +
           'đĩa, giải xong bài toán phụ thuộc, rồi mới lấy đúng danh sách URL mà bản chụp ấy ' +
           'ghi và đi tải. Kho thật thì đã thay <code>cmake 3.28.3-1</code> bằng bản mới và ' +
           '<b>xoá file cũ</b>. Bản chụp tháng 4 trỏ vào một địa chỉ không còn tồn tại ⇒ ' +
           '404. Nếu nguyên nhân là "gói bị gỡ khỏi kho", lỗi đã phải là ' +
           '<i>không tìm thấy gói</i> ở bước chọn. Lỗi rơi vào <b>khâu tải</b> nói rõ: kế ' +
           'hoạch đúng theo một thực tại đã hết hạn.</p>' +
           '<p><b>Quan sát ③ là thứ loại bỏ mọi giả thuyết khác.</b> Nếu nguyên nhân nằm ở ' +
           'kho (kho hỏng, mạng chặn, gói bị rút), máy đồng nghiệp cũng phải đỏ. Nó xanh, ' +
           'nên nguyên nhân phải là thứ <b>chỉ máy CI mới có</b> — và thứ đó là lớp cache. ' +
           'Đồng nghiệp không có nó, nên họ chạy <code>apt-get update</code> thật, nhận bản ' +
           'chụp tháng 8, và mọi URL trong kế hoạch của họ đều còn sống. Hai máy chạy cùng ' +
           'một dòng lệnh, ra hai kết quả, vì chúng đang đọc <b>hai bản chụp khác nhau</b>. ' +
           'Đó là toàn bộ nội dung của trục 1 gói trong một sự cố.</p>' +
           '<p><b>Khiếm khuyết thứ hai</b> chưa cắn bạn lần này nhưng sẽ cắn: lệnh ' +
           '<code>RUN</code> cuối cùng cài <code>cmake ninja-build</code> ở một lớp <i>sau</i> ' +
           'khi lớp trên đã <code>rm -rf /var/lib/apt/lists/*</code>. Xoá <code>lists</code> ' +
           'là thói quen đúng để image nhỏ đi (A7), nhưng nó xoá mất chính cái bản chụp mà ' +
           'apt cần để lập kế hoạch. Lớp cuối ấy không có chỉ mục nào để đọc. Quy tắc: ' +
           '<b>mỗi lệnh <code>RUN</code> nào cài gói thì phải tự <code>apt-get update</code> ' +
           'trong chính nó, và tự dọn trong chính nó</b>.</p>' +
           '<p><b>Hai cách sửa, và chúng đối lập nhau — chọn một.</b></p>' +
           '<p><i>Cách 1 — luôn làm mới.</i> Gộp <code>apt-get update</code> vào cùng lệnh ' +
           '<code>RUN</code> với mỗi lần cài, và thêm một mốc phá cache khi cần. Bạn luôn ' +
           'lấy bản chụp mới nhất nên không bao giờ gặp 404. Cái mất: mỗi lần dựng đều cần ' +
           'mạng, và <b>hai lần dựng cách nhau ba tháng vẫn cho hai image khác nhau</b> — ' +
           'chính vấn đề tái lập ở B6.</p>' +
           '<p><i>Cách 2 — ghim chặt.</i> Chốt phiên bản bằng ' +
           '<code>apt-get install cmake=3.28.3-1</code>, hoặc trỏ ' +
           '<code>sources.list</code> vào một kho gương nội bộ đã đóng băng ở một ngày cụ ' +
           'thể. Hai lần dựng cách nhau hai năm ra cùng một image, và đó là điều kiện cần ' +
           'để điều tra được một lỗi trên thiết bị đã xuất xưởng. Cái mất: kho gương ấy ' +
           '<b>không tự nhận bản vá bảo mật</b>. Việc dời mốc ghim trở thành một công việc ' +
           'có lịch, có người chịu trách nhiệm.</p>' +
           '<p>Khác biệt về bản chất: cách 1 chọn <b>luôn mới</b> và trả bằng tính tái lập; ' +
           'cách 2 chọn <b>tái lập được</b> và trả bằng công sức theo dõi bảo mật. Không có ' +
           'phương án thứ ba cho cả hai. Sản phẩm nhúng phải bảo hành nhiều năm thì gần như ' +
           'luôn chọn cách 2.</p>' },

    { id: 'c2', k: 'free', truc: 1, tag: 'Chẩn đoán', rows: 12,
      q: 'Một đồng nghiệp dựng rootfs cho bo mạch. Cách ước lượng của họ: lấy danh sách gói ' +
         'cần cài, tra <code>Installed-Size</code> của <b>từng gói trong danh sách</b>, cộng ' +
         'lại được <b>180 MB</b>, rồi cho phân vùng rootfs <b>256 MB</b> — dư 40 %, yên tâm.' +
         '<br><br>Image dựng ra <b>tràn phân vùng</b>. Không phải sát nút: nó vượt xa.' +
         '<br><br>Triệu chứng chỉ có một, nhưng nguyên nhân thì có nhiều và chúng ' +
         '<b>cộng dồn</b>. Liệt kê mọi nguyên nhân bạn nghĩ ra, <b>xếp theo mức đóng góp</b> ' +
         'từ lớn tới nhỏ, và với mỗi cái nói <b>một cách kiểm chứng cụ thể</b> trên máy.',
      hint: 'Bốn trong số các nguyên nhân đã có bằng chứng đo được ngay trong bộ bài tập ' +
            'này — xem lại B2 và B5. Một nguyên nhân nữa thì không nằm ở phép cộng mà nằm ở ' +
            '<b>đích</b>: máy build của họ đã sẵn có những gì mà bo mạch thì không?',
      crit: [
        '<b>Nguyên nhân lớn nhất — không cộng bao đóng.</b> Họ cộng gói mình gõ tên, không cộng gói bị kéo theo. Kiểm chứng: <code>apt-get -s install &lt;danh sách&gt;</code> rồi đếm dòng <code>Inst</code> — B2 cho thấy 1 gói ra 19',
        '<b><code>Recommends</code> bật mặc định.</b> Không có <code>--no-install-recommends</code> thì apt kéo thêm cả nhánh không ai yêu cầu (B5). Kiểm chứng: chạy kế hoạch hai lần, có và không có cờ đó, so số gói',
        '<b>Cộng thiếu im lặng.</b> Có gói <b>không có trường <code>Installed-Size</code></b> (B2: <code>libc6-riscv64-cross</code>, <code>libc6-dev-riscv64-cross</code>), script cộng bỏ qua mà không báo. Kiểm chứng: in <b>số phần tử đã cộng</b> cạnh tổng và so với số gói trong kế hoạch',
        '<b>Nhầm hai đơn vị.</b> Nếu con số họ tra là <code>Size</code> chứ không phải <code>Installed-Size</code> thì họ đang đo <b>byte nén trên dây</b>, lệch khoảng <b>bốn lần</b> (B2: 60 MB so với 254 MB). Kiểm chứng: xem lại đúng tên trường trong <code>apt-cache show</code>',
        '<b>Đích trống, máy build thì không.</b> Kế hoạch chạy trên máy build bỏ qua mọi gói máy đó đã có; bo mạch không có chúng. Kiểm chứng: lập kế hoạch trong <code>chroot</code>/container <b>rỗng</b> của đúng kiến trúc đích, không phải trên máy build',
        '<b>Những thứ không phải gói.</b> Sổ cái <code>/var/lib/dpkg</code> (30 MB trên máy này), chỉ mục, cache, log, khối dự phòng và metadata của hệ thống file. Kiểm chứng: <code>du -sh</code> trên image đã dựng, so với tổng <code>Installed-Size</code>',
        'Kết luận đúng về phương pháp: cộng <code>Installed-Size</code> là <b>chặn dưới</b>, không phải ước lượng. Cách đúng là <b>dựng thử rồi đo</b> — <code>du -sh</code> trên cây rootfs thật'
      ],
      sol: '<p><b>Sai lầm gốc không phải một con số sai, mà là một phương pháp sai.</b> Cộng ' +
           '<code>Installed-Size</code> của danh sách gói mình gõ tên cho ra một ' +
           '<b>chặn dưới</b>, và mọi sai số đều đi về <b>một hướng</b>: thiếu. Đó là lý do ' +
           'nó không tràn sát nút mà tràn xa.</p>' +
           '<p><b>1. Không cộng bao đóng — thủ phạm chính.</b> B2 đo thật: một gói ghi ' +
           '<code>Installed-Size: 25</code> kéo theo 19 gói và 254 MB. Nếu danh sách của họ ' +
           'có bất kỳ gói meta nào (toolchain, <code>build-essential</code>, một môi trường ' +
           'chạy), riêng cái này đã đủ làm 180 MB thành nhiều lần thế. Kiểm chứng trong một ' +
           'phút: <code>apt-get -s install …</code> rồi đếm dòng <code>Inst</code>.</p>' +
           '<p><b>2. <code>Recommends</code> bật mặc định.</b> B5 cho thấy ' +
           '<code>git</code> kéo thêm <code>ca-certificates, patch, less, ssh-client</code> ' +
           'cùng bao đóng của chúng, mà không dòng nào trong danh sách của họ yêu cầu. Nếu ' +
           'script dựng không có <code>--no-install-recommends</code>, đây là nguồn phình ' +
           'lớn thứ hai.</p>' +
           '<p><b>3. Phép cộng đếm thiếu mà không báo.</b> B2 gặp đúng chuyện này: hai gói ' +
           'trong 19 <i>không có</i> trường <code>Installed-Size</code>, và ' +
           '<code>awk</code> lặng lẽ bỏ qua. Nếu script của họ cũng thế, con số 180 MB đã ' +
           'thiếu ngay từ lúc in ra. Cách phòng: <b>luôn in số phần tử đã cộng bên cạnh ' +
           'tổng</b> — chính dòng <code>summed 17 values</code> là thứ tố cáo lỗi này.</p>' +
           '<p><b>4. Có thể họ đọc nhầm trường.</b> <code>Size</code> là byte nén đi qua ' +
           'dây; <code>Installed-Size</code> là KB nằm trên đĩa. Trên bao đóng ở B2 hai con ' +
           'số là 60 MB và 254 MB — lệch hơn bốn lần. Nếu 180 MB kia là ' +
           '<code>Size</code>, thì con số thật đã vào khoảng 700 MB.</p>' +
           '<p><b>5. Đích không giống máy build — và cái này nhiều người không nghĩ ra.</b> ' +
           'Kế hoạch chạy trên máy build được tính <i>tương đối với những gì máy build đã ' +
           'có</i>: <code>libc6</code>, <code>zlib1g</code>, hàng chục thư viện nền. Dòng ' +
           '<code>11 not upgraded</code> ở B2 là dấu vết của đúng chuyện đó. Bo mạch trống ' +
           'thì phải mang tất cả những thứ ấy theo. Cách kiểm chứng duy nhất đáng tin: lập ' +
           'kế hoạch <b>bên trong một chroot hoặc container rỗng của đúng kiến trúc ' +
           'đích</b>.</p>' +
           '<p><b>6. Và những thứ không phải gói.</b> Sổ cái ' +
           '<code>/var/lib/dpkg</code> chiếm 30 MB trên máy này. Cộng thêm chỉ mục nếu bạn ' +
           'giữ, cache nếu bạn quên dọn, log, và phần hao của chính hệ thống file. Không cái ' +
           'nào xuất hiện trong bất kỳ trường <code>Installed-Size</code> nào.</p>' +
           '<p><b>Kết luận về phương pháp, và đây mới là thứ đáng mang đi:</b> phép cộng ' +
           '<code>Installed-Size</code> trả lời câu hỏi "ít nhất là bao nhiêu", không trả ' +
           'lời "bao nhiêu". Với dung lượng flash — thứ không mở rộng được sau khi hàn — ' +
           'cách đúng là <b>dựng thử rồi <code>du -sh</code> trên cây rootfs thật</b>, và ' +
           'chừa biên độ cho lần thêm gói tiếp theo.</p>' },

    { id: 'c3', k: 'free', truc: 2, tag: 'Tình huống mới', rows: 12,
      q: 'Bo mạch của bạn dùng <code>tree</code>, nhưng hành vi mặc định của nó không hợp: ' +
         'bạn cần đổi một hằng số trong mã nguồn và bỏ một tuỳ chọn dựng. Bạn cần một file ' +
         '<code>.deb</code> cho <code>arm64</code>, cài và gỡ được bằng ' +
         '<code>apt</code> như mọi gói khác, và <b>ba năm nữa vẫn dựng lại được đúng nó</b> ' +
         'khi có người báo lỗi.<br><br>' +
         'Mô tả quy trình từ đầu tới cuối. Nói rõ <b>file nào bạn được sửa</b>, <b>file nào ' +
         'tuyệt đối không được đụng vào</b> và vì sao, và <b>bạn bàn giao cái gì</b> cho kho ' +
         'mã nguồn của nhóm để ba năm sau dựng lại được.',
      hint: 'B3 đã cho bạn cả ba file và cả cấu trúc <code>debian/</code>. Câu hỏi thật sự: ' +
            'trong ba file đó, cái nào có băm bị <code>.dsc</code> ràng buộc? Và nếu thay ' +
            'đổi của bạn <i>không</i> được nằm trong đó, thì nó nằm ở đâu?',
      crit: [
        'Bắt đầu bằng <code>apt-get source tree</code> (cần <code>deb-src</code> trong <code>sources.list</code>) để lấy đúng ba file: <code>.dsc</code>, <code>orig.tar.gz</code>, <code>debian.tar.xz</code>',
        '<b>Không được đụng vào <code>orig.tar.gz</code></b> — sha256 của nó bị <code>.dsc</code> ràng buộc (B3: <code>47ca786e…</code>); sửa nó là phá chuỗi tin cậy và đánh mất khả năng đối chiếu với bản gốc của tác giả',
        'Thay đổi của bạn thành <b>một file patch trong <code>debian/patches/</code></b> cộng <b>một dòng tên nó trong <code>debian/patches/series</code></b> — đúng cơ chế mà <code>3.0 (quilt)</code> quy định',
        'Thêm một mục vào <code>debian/changelog</code> với <b>hậu tố phiên bản riêng</b> (ví dụ <code>2.3.1-1~mycompany1</code>) để phân biệt với gói của bản phân phối và để <code>apt</code> so sánh phiên bản đúng',
        'Dựng cho <code>arm64</code> bằng cross-build (<code>dpkg-buildpackage -a arm64</code> / <code>sbuild</code> / <code>pbuilder</code>), <b>không</b> biên dịch trên bo mạch',
        'Bàn giao cho kho mã nguồn: <b>thư mục <code>debian/</code></b> (patch + series + changelog + rules), <b>không</b> commit <code>orig.tar.gz</code> — nó lấy lại được từ kho, và băm trong <code>.dsc</code> chứng minh là đúng bản',
        'Nói rõ vì sao <b>không</b> chọn <code>./configure &amp;&amp; make install</code>: sổ cái không ghi gì, không gỡ được, không nâng cấp được, và ba năm sau không ai dựng lại được đúng cái đã xuất xưởng'
      ],
      sol: '<p><b>Quy trình, sáu bước.</b></p>' +
           '<p><b>1. Lấy gói mã nguồn.</b> Bật <code>deb-src</code> rồi ' +
           '<code>apt-get source tree</code>. Bạn nhận đúng ba file như B3: ' +
           '<code>tree_2.3.1.orig.tar.gz</code> (70 339 byte, mã nguồn của tác giả), ' +
           '<code>tree_2.3.1-1.debian.tar.xz</code> (9 568 byte, phần của bản phân phối), ' +
           '<code>tree_2.3.1-1.dsc</code> (1 869 byte, tờ khai và băm). Lệnh này cũng tự ' +
           'bung ra thư mục <code>tree-2.3.1/</code> đã áp sẵn patch.</p>' +
           '<p><b>2. Xác định ranh giới, và đây là điểm cốt lõi.</b> ' +
           '<code>orig.tar.gz</code> là <b>bất khả xâm phạm</b>. File <code>.dsc</code> ghi ' +
           'sha256 của nó (<code>47ca786e…</code>) và mọi công cụ sau này sẽ đối chiếu. Sửa ' +
           'một byte trong đó là bạn vừa tạo ra một thứ không còn liên hệ kiểm chứng được ' +
           'với bản gốc của tác giả — đúng cái "fork" mà B3 bác bỏ. Bạn được sửa ' +
           '<b>duy nhất</b> những gì nằm trong <code>debian/</code>.</p>' +
           '<p><b>3. Viết thay đổi thành patch.</b> Hằng số cần đổi nằm trong file ' +
           '<code>.c</code> của tác giả, nên bạn không sửa trực tiếp — bạn tạo ' +
           '<code>debian/patches/board-constant.patch</code> và thêm dòng ' +
           '<code>board-constant</code> vào <code>debian/patches/series</code>. Nhớ B3: ' +
           'series hiện chỉ có một dòng <code>manpage</code> và patch ấy dài 17 dòng — bạn ' +
           'đang làm đúng việc mà người bảo trì gói đã làm, theo đúng cách họ làm. Còn tuỳ ' +
           'chọn dựng cần bỏ thì sửa trong <code>debian/rules</code>, không cần patch.</p>' +
           '<p><b>4. Đánh dấu phiên bản là của bạn.</b> Thêm một mục ' +
           '<code>debian/changelog</code> với hậu tố riêng, ví dụ ' +
           '<code>2.3.1-1~mycompany1</code>. Việc này không phải thủ tục: nó là cách ' +
           '<code>apt</code> biết gói của bạn khác gói kho, và là cách người thứ hai nhìn ' +
           '<code>dpkg -l</code> ba năm sau hiểu ngay đây là bản có sửa.</p>' +
           '<p><b>5. Dựng cho <code>arm64</code>.</b> ' +
           '<code>dpkg-buildpackage -a arm64</code> (hoặc <code>sbuild</code>/' +
           '<code>pbuilder</code> cho môi trường sạch, tái lập được). Dựng trên máy build, ' +
           'không trên bo mạch — vừa nhanh hơn nhiều lần, vừa vì lý do ở B6: bo mạch không ' +
           'nên mang trình biên dịch.</p>' +
           '<p><b>6. Bàn giao cái gì.</b> Vào kho mã nguồn của nhóm: <b>thư mục ' +
           '<code>debian/</code></b> — patch, <code>series</code>, ' +
           '<code>changelog</code>, <code>rules</code>. <b>Không</b> commit ' +
           '<code>orig.tar.gz</code>: nó tải lại được từ kho, và băm trong ' +
           '<code>.dsc</code> chứng minh bạn lấy đúng bản. Kết quả là ba năm sau, thứ nhóm ' +
           'bạn phải đọc để hiểu "chúng ta đã sửa gì" là <b>một file patch vài chục ' +
           'dòng</b>, chứ không phải một nhánh Git đã trôi xa bản gốc và không ai dám ' +
           'rebase.</p>' +
           '<p><b>Vì sao không <code>./configure &amp;&amp; make install</code>?</b> Nó phá ' +
           'cả ba yêu cầu của đề: <code>apt</code> không gỡ được (sổ cái không ghi file ' +
           'nào), không nâng cấp được, và không có gì ghi lại rằng bạn đã sửa gì — ba năm ' +
           'sau bạn không dựng lại nổi đúng thứ đã xuất xưởng. Nó nhanh hơn <i>hôm nay</i> ' +
           'và đắt hơn nhiều trong toàn bộ vòng đời sản phẩm.</p>' },

    { id: 'c4', k: 'free', tag: 'Tình huống mới', rows: 10,
      q: 'Nhà cung cấp SoC gửi cho nhóm bạn một dòng để dán vào ' +
         '<code>/etc/apt/sources.list.d/</code>:<br><br>' +
         '<code>deb http://packages.vendor.example/bsp jammy main</code><br><br>' +
         'Thêm vào rồi <code>apt update</code> thì apt <b>từ chối</b> kho đó vì không xác ' +
         'minh được chữ ký — nó không có khoá công khai của nhà cung cấp. Một người trong ' +
         'nhóm đề nghị sửa thành <code>deb [trusted=yes] http://…</code> vì "chạy ngay, khỏi ' +
         'lằng nhằng".<br><br>' +
         'Nói <b>chính xác</b> điều gì bị tắt đi khi thêm <code>[trusted=yes]</code>, vì sao ' +
         'nó nguy hiểm <b>hơn hẳn</b> việc dùng <code>http://</code> thay vì ' +
         '<code>https://</code>, và cách đúng là gì.',
      hint: 'Bài 12 nói kho <code>http://</code> vẫn an toàn nhờ một chuỗi: chữ ký trên ' +
            '<code>InRelease</code> → băm của <code>Packages</code> → băm của từng ' +
            '<code>.deb</code>. Hỏi: <code>[trusted=yes]</code> cắt chuỗi đó ở <b>mắt xích ' +
            'nào</b>, và mắt xích đó đang bảo vệ những mắt xích nào phía sau?',
      crit: [
        'Nói rõ <code>[trusted=yes]</code> tắt việc <b>kiểm chữ ký trên <code>InRelease</code></b> — tức là cắt <b>mắt xích đầu tiên</b> của chuỗi tin cậy',
        'Nêu đúng hệ quả dây chuyền: <code>InRelease</code> không còn đáng tin ⇒ băm của <code>Packages</code> trong nó không đáng tin ⇒ băm của từng <code>.deb</code> không đáng tin. <b>Cả chuỗi sụp, không chỉ một bước</b>',
        'So sánh đúng với <code>http://</code>: <code>http://</code> chỉ mất tính <b>riêng tư</b> và mất chống sửa ở tầng vận chuyển, nhưng chữ ký vẫn phát hiện được nội dung bị đổi. Còn <code>[trusted=yes]</code> vứt bỏ chính cái phát hiện đó',
        'Nêu mức độ hậu quả cụ thể: gói <code>.deb</code> chạy script cài với quyền <b>root</b>, nên một gói giả trên đường truyền là <b>chiếm máy</b>, không phải "cài nhầm phiên bản"',
        'Cách đúng: xin <b>khoá công khai</b> của nhà cung cấp, đặt vào <code>/usr/share/keyrings/</code>, và trỏ tới nó bằng <code>[signed-by=/usr/share/keyrings/vendor.gpg]</code>',
        'Nêu vì sao <code>signed-by</code> tốt hơn cách cũ (thêm khoá vào vòng khoá dùng chung): khoá của nhà cung cấp chỉ có hiệu lực cho <b>đúng kho đó</b>, không ký thay được cho <code>archive.ubuntu.com</code>',
        'Nêu bước kiểm tra trước khi tin: đối chiếu vân tay khoá qua một kênh <b>khác</b> với kênh đã gửi nó (điện thoại, tài liệu có ký, cổng hỗ trợ) — tải khoá qua chính đường link chưa tin thì không chứng minh được gì'
      ],
      sol: '<p><b>Trước hết, cái gì bị tắt.</b> <code>[trusted=yes]</code> bảo apt: ' +
           '"kho này khỏi kiểm chữ ký, cứ coi là thật". Nó không tắt việc tải, không tắt ' +
           'việc tính băm — nó tắt <b>mắt xích đầu tiên</b>, cái xác nhận rằng file ' +
           '<code>InRelease</code> đúng là do nhà cung cấp phát hành.</p>' +
           '<p><b>Và đó là mắt xích giữ tất cả những mắt xích còn lại.</b> Chuỗi tin cậy của ' +
           'apt chỉ có một điểm neo: chữ ký trên <code>InRelease</code>. Từ đó, ' +
           '<code>InRelease</code> chứa băm của <code>Packages</code>, và ' +
           '<code>Packages</code> chứa băm của từng file <code>.deb</code>. Apt vẫn kiểm ' +
           'băm đầy đủ ở hai bước sau — nhưng nó đang kiểm với <b>những con số mà kẻ tấn ' +
           'công vừa cung cấp</b>. Một chuỗi kiểm tra không có điểm neo thì không kiểm tra ' +
           'gì cả. Nó vẫn chạy, vẫn không báo lỗi, và đó chính là điều nguy hiểm.</p>' +
           '<p><b>Vì sao tệ hơn hẳn <code>http://</code>.</b> Đây là chỗ hay bị lẫn. Kho ' +
           'chính của Ubuntu chạy trên <code>http://</code> và vẫn an toàn, vì chữ ký không ' +
           'nằm ở tầng vận chuyển mà nằm <i>trên nội dung</i>: ai đó sửa gói giữa đường thì ' +
           'băm lệch, và chữ ký cho biết băm nào mới đúng. Dùng <code>http://</code> bạn mất ' +
           'tính riêng tư (người xem đường truyền biết bạn cài gì) nhưng <b>không mất khả ' +
           'năng phát hiện</b>. <code>[trusted=yes]</code> thì vứt bỏ đúng cái khả năng phát ' +
           'hiện ấy. Nói cách khác: <code>http://</code> là gửi bưu thiếp có đóng dấu niêm ' +
           'phong; <code>[trusted=yes]</code> là chấp nhận mọi bưu thiếp không cần dấu.</p>' +
           '<p><b>Mức hậu quả không phải "cài nhầm phiên bản".</b> Một file ' +
           '<code>.deb</code> chứa script <code>preinst</code>/<code>postinst</code> và ' +
           'chúng chạy với quyền <b>root</b>. Chấp nhận một gói không xác minh được là chấp ' +
           'nhận cho một người lạ chạy lệnh root trên máy build của bạn — và máy build là ' +
           'thứ ký và xuất xưởng image cho toàn bộ thiết bị. Đây là dạng tấn công chuỗi cung ' +
           'ứng cổ điển nhất.</p>' +
           '<p><b>Cách đúng.</b> Xin nhà cung cấp file khoá công khai, đặt nó ở ' +
           '<code>/usr/share/keyrings/vendor.gpg</code>, rồi viết:</p>' +
           '<p><code>deb [signed-by=/usr/share/keyrings/vendor.gpg] ' +
           'http://packages.vendor.example/bsp jammy main</code></p>' +
           '<p>Điểm quan trọng của <code>signed-by</code> — và là lý do cách cũ ' +
           '(<code>apt-key add</code> vào vòng khoá dùng chung) đã bị bỏ: khoá của nhà cung ' +
           'cấp chỉ có hiệu lực cho <b>đúng dòng kho đó</b>. Ném nó vào vòng khoá chung thì ' +
           'nhà cung cấp ấy tự nhiên có quyền ký thay cho <code>archive.ubuntu.com</code>, ' +
           'và một khoá của họ bị lộ sẽ mở đường vào <i>mọi</i> gói trên máy bạn.</p>' +
           '<p><b>Một bước nữa, và người ta hay quên:</b> phải đối chiếu vân tay của khoá ' +
           'qua một <b>kênh khác</b> với kênh đã gửi nó — gọi điện, tài liệu có chữ ký, cổng ' +
           'hỗ trợ có tài khoản. Tải khoá bằng chính đường link chưa tin được thì bạn chỉ ' +
           'đang xác nhận rằng kẻ tấn công nhất quán với chính mình.</p>' },

    { id: 'c5', k: 'free', tag: 'Tính toán / Chọn và biện minh', rows: 11,
      q: 'Máy build CI của nhóm <b>hết đĩa</b>. Nó chạy toàn bộ bài thực hành QEMU và ' +
         'cross-compile của lộ trình này. Bạn cần lấy lại <b>ít nhất 400 MB ngay</b>, không ' +
         'được làm hỏng công việc đang chạy. Bốn phương án dưới đây, kèm số đo thật của máy.' +
         '<br><br><b>Tính</b> phương án nào cho bao nhiêu, <b>chọn</b> một tổ hợp, và ' +
         '<b>biện minh</b> — phần biện minh mới là phần được chấm, không phải lựa chọn.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'du -sh /var/lib/apt/lists /var/lib/dpkg /var/cache/apt\n' +
          "dpkg-query -W -f='${Installed-Size}\\t${Package}\\n' | sort -rn | head -10\n" +
          "dpkg-query -W -f='${Installed-Size}\\n' | awk '{s+=$1} END{print \"TOTAL \"s\" KB = \"int(s/1024)\" MB over \"NR\" packages\"}'\n" +
          "echo \"manual: $(apt-mark showmanual | wc -l)   auto: $(apt-mark showauto | wc -l)\"" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '145M    /var/lib/apt/lists\n' +
          '30M     /var/lib/dpkg\n' +
          '193M    /var/cache/apt\n' +
          '\n' +
          '329780\tqemu-efi-aarch64\n' +
          '174287\tqemu-system-misc\n' +
          '142924\tsnapd\n' +
          '135358\tlibllvm21\n' +
          '133128\tqemu-user\n' +
          '109906\tmesa-vulkan-drivers\n' +
          '85952\tgcc-15-aarch64-linux-gnu\n' +
          '75729\tgcc-15-x86-64-linux-gnu\n' +
          '73290\tgcc-15-arm-linux-gnueabihf\n' +
          '68807\tqemu-system-arm\n' +
          '\n' +
          'TOTAL 2801571 KB = 2735 MB over 855 packages\n' +
          'manual: 69   auto: 786' },
        { t: 'p', x: '<b>Bốn phương án:</b> (1) <code>apt clean</code>. ' +
          '(2) <code>rm -rf /var/lib/apt/lists/*</code>. (3) <code>apt autoremove</code>. ' +
          '(4) Gỡ vài gói trong danh sách mười gói lớn nhất.' }
      ],
      hint: 'Ba trong bốn phương án cho ra một con số bạn tính được ngay từ bảng. Phương án ' +
            'thứ ba thì <b>không</b> — và việc bạn nói được vì sao nó không tính trước được ' +
            'là một phần của câu trả lời.',
      crit: [
        '<b>PA1 = 193 MB</b>, và nêu đúng rủi ro: <b>không có rủi ro nào</b> — chỉ là các <code>.deb</code> đã tải, phải tải lại nếu cài lại',
        '<b>PA2 = 145 MB</b>, rủi ro: mất bản chụp chỉ mục ⇒ mọi lần cài sau đều phải <code>apt-get update</code> và phải có mạng. Với CI thì đây là <b>thay đổi hành vi</b>, phải sửa script',
        '<b>PA1 + PA2 = 338 MB</b> — <b>vẫn chưa đủ 400 MB</b>. Nhận ra điều này là chốt của bài: hai phương án an toàn nhất cộng lại không giải quyết được',
        '<b>PA3 không tính trước được</b> con số: nó chỉ gỡ gói <i>auto</i> mà <b>không gói manual nào còn cần</b>. Con số 786 gói auto <b>không phải</b> số sẽ bị gỡ. Phải chạy thử để biết — <code>apt-get -s autoremove</code>',
        '<b>PA4</b>: mười gói lớn nhất cộng lại <b>1 329 161 KB ≈ 1 298 MB</b>, gần <b>một nửa</b> toàn bộ 2 735 MB trên 855 gói — nhưng gỡ chúng là <b>phá chính công việc của CI</b>',
        'Chỉ ra cụ thể vì sao PA4 nguy hiểm ở đây: <code>qemu-*</code> và <code>gcc-15-*-linux-gnu</code> chính là thứ chạy các bài QEMU và cross-compile. <code>snapd</code> và <code>mesa-vulkan-drivers</code> (252 830 KB ≈ 247 MB) thì gần như chắc chắn <b>không</b> cần trên máy CI không màn hình',
        'Chốt một tổ hợp và biện minh theo đúng thứ tự rủi ro: <b>PA1 trước</b> (an toàn tuyệt đối), rồi <code>apt-get -s autoremove</code> để <b>đo</b> PA3, rồi gỡ đúng những gói ngoài phạm vi công việc (<code>snapd</code>, <code>mesa-vulkan-drivers</code>), và chỉ dùng PA2 nếu vẫn thiếu — kèm sửa script CI cho thêm <code>apt-get update</code>'
      ],
      sol: '<p><b>Số học trước.</b></p>' +
           '<p><b>PA1 — <code>apt clean</code>: 193 MB.</b> Đây là các file ' +
           '<code>.deb</code> đã tải về. Như A7 đã chỉ ra, nội dung của chúng đã nằm trong ' +
           '<code>/usr</code> từ lúc cài; cái hộp không còn giá trị gì ngoài việc khỏi tải ' +
           'lại. <b>Rủi ro bằng không.</b> Luôn làm cái này đầu tiên.</p>' +
           '<p><b>PA2 — xoá <code>lists</code>: 145 MB.</b> Cũng lấy lại được, nhưng nó ' +
           '<b>đổi hành vi</b> của máy: bản chụp chỉ mục biến mất, nên mọi ' +
           '<code>apt install</code> sau đó sẽ thất bại cho tới khi có ' +
           '<code>apt-get update</code>, mà việc đó cần mạng. Nếu script CI không có sẵn ' +
           'bước <code>update</code>, bạn vừa tạo ra sự cố ngày mai để chữa sự cố hôm ' +
           'nay.</p>' +
           '<p><b>Và đây là chốt của bài toán: 193 + 145 = 338 MB. Chưa đủ 400.</b> Hai ' +
           'phương án an toàn nhất, cộng cả lại, vẫn không giải quyết được yêu cầu. Nên bắt ' +
           'buộc phải động tới gói — và câu hỏi trở thành <i>gói nào</i>.</p>' +
           '<p><b>PA3 — <code>apt autoremove</code>: không tính trước được, và đó là câu trả ' +
           'lời đúng.</b> Cám dỗ ở đây là nhìn con số 786 gói <i>auto</i> rồi nghĩ "gỡ được ' +
           'nhiều lắm". Sai. <code>autoremove</code> chỉ gỡ những gói <i>auto</i> mà ' +
           '<b>không còn gói manual nào phụ thuộc vào</b> — tức là phần rơi rụng sau khi bạn ' +
           'đã gỡ thứ gì đó. Phần lớn trong 786 gói ấy đang được 69 gói manual giữ lại. Con ' +
           'số thật chỉ biết bằng cách <b>hỏi</b>: <code>apt-get -s autoremove</code> — ' +
           '<code>-s</code> mô phỏng, không đụng vào máy, đúng công cụ ở A8.</p>' +
           '<p><b>PA4 — gỡ gói lớn: 1 329 161 KB ≈ 1 298 MB cho mười gói.</b> Con số này ' +
           'đáng dừng lại: mười gói trong 855 chiếm gần <b>một nửa</b> tổng 2 735 MB. Phân ' +
           'bố kích thước gói luôn lệch nặng như thế, và đó là lý do "gỡ bớt cho nhẹ" chỉ có ' +
           'nghĩa khi bạn nhắm vào đuôi trên.</p>' +
           '<p>Nhưng phải đọc <i>danh sách</i>, không phải chỉ con số. ' +
           '<code>qemu-efi-aarch64</code>, <code>qemu-system-misc</code>, ' +
           '<code>qemu-user</code>, <code>qemu-system-arm</code>, và ba gói ' +
           '<code>gcc-15-*-linux-gnu</code> — đó <b>chính là</b> công việc mà máy CI này tồn ' +
           'tại để làm. Gỡ chúng là giải phóng đĩa bằng cách phá dây chuyền. Còn hai cái tên ' +
           'thì lạc chỗ hẳn: <code>snapd</code> (142 924 KB) và ' +
           '<code>mesa-vulkan-drivers</code> (109 906 KB) — driver đồ hoạ 3D trên một máy ' +
           'build không màn hình. Cộng lại <b>252 830 KB ≈ 247 MB</b>.</p>' +
           '<p><b>Tổ hợp được chọn, theo thứ tự rủi ro tăng dần:</b></p>' +
           '<p>① <code>apt clean</code> → <b>193 MB</b>, không rủi ro. ' +
           '② <code>apt-get -s autoremove</code> để <i>đo</i> trước khi làm; nếu con số ' +
           'đáng kể thì thực thi. ③ Gỡ <code>snapd</code> và ' +
           '<code>mesa-vulkan-drivers</code> → <b>≈ 247 MB</b>, sau khi xác nhận không job ' +
           'nào cần chúng. Chỉ riêng ① + ③ đã là <b>≈ 440 MB</b>, vượt yêu cầu, và ' +
           '<b>không đụng</b> vào chỉ mục lẫn công cụ của dây chuyền. ④ Để dành PA2 làm ' +
           'phương án cuối, và nếu buộc phải dùng thì <b>sửa script CI thêm bước ' +
           '<code>apt-get update</code> trong cùng lệnh</b> — đúng bài học của C1.</p>' +
           '<p><b>Nguyên tắc biện minh, và đây là thứ được chấm:</b> xếp phương án theo ' +
           '<i>cái mất nếu sai</i>, không theo <i>cái được nếu đúng</i>. 193 MB mất-không-gì ' +
           'đáng giá hơn 1 298 MB mất-cả-dây-chuyền. Và với những phương án không tính trước ' +
           'được, <b>mô phỏng trước</b> (<code>-s</code>) rồi mới quyết — trên máy sản xuất, ' +
           'một lệnh gỡ chạy nhầm đắt hơn nhiều lần cái đĩa nó giải phóng.</p>' },
  ],

  /* ═══ D · Ôn xen kẽ — 3 câu về bài cũ ══════════════════════════════════ */
  D: [
    { id: 'd1', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 5.</b> Sổ cái của <code>dpkg</code> nằm ở ' +
         '<code>/var/lib/dpkg</code> — không phải <code>/usr/lib/dpkg</code>, dù nó phục vụ ' +
         'phần mềm đã cài và <code>/usr</code> mới là nơi phần mềm nằm. Theo FHS, vì sao chỗ ' +
         'đặt này là <b>bắt buộc</b> phải như thế?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'du -sh /var/lib/dpkg' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '30M     /var/lib/dpkg' }
      ],
      opts: [
        'Vì <code>/usr</code> hay đầy hơn <code>/var</code>, nên dữ liệu lớn được đẩy sang <code>/var</code> cho cân.',
        'Vì <code>/usr</code> chứa dữ liệu <b>tĩnh</b> — cùng một nội dung cho mọi máy cài cùng các gói, và thường được gắn <b>chỉ đọc</b>. Sổ cái thì <b>biến đổi</b> và <b>riêng của từng máy</b>, nên nó thuộc <code>/var</code>.',
        'Vì <code>dpkg</code> chạy trước khi <code>/usr</code> được gắn trong quá trình khởi động.',
        'Vì <code>/var</code> nằm trong RAM nên đọc sổ cái nhanh hơn.'
      ],
      a: 1,
      why: 'Bài 5 mô tả <code>/var</code> là "dữ liệu biến đổi" và ghi rõ nó "thường phải ' +
           'cho ghi được trong khi phần còn lại chỉ đọc". Sổ cái là ví dụ giáo khoa của loại ' +
           'dữ liệu đó: nó ghi <i>máy này</i> đang có gì, và nó đổi mỗi lần bạn cài hay gỡ ' +
           'một gói. Hai máy cài y hệt nhau vẫn có hai sổ cái khác nhau (khác thời điểm, ' +
           'khác cột manual/auto). Ngược lại, nội dung của gói trong <code>/usr</code> thì ' +
           'giống hệt nhau trên mọi máy cài cùng phiên bản — đó chính là định nghĩa của ' +
           '"tĩnh". Đáp án 4 nhầm <code>/var</code> với <code>/run</code> (Bài 5: ' +
           '<code>/run</code> mới luôn nằm trong RAM). ' +
           '<b>Vì sao điều này quan trọng với bạn:</b> nhiều thiết bị nhúng gắn rootfs ' +
           '<b>chỉ đọc</b> để chống hỏng khi mất điện đột ngột, rồi cho riêng ' +
           '<code>/var</code> ghi được — thường là một phân vùng riêng, hoặc overlay trên ' +
           'RAM. Ranh giới tĩnh/biến đổi ấy quyết định phân vùng nào ghi được, và 30 MB sổ ' +
           'cái này nằm ở phía ghi được. Bài 68 quay lại đúng chỗ đó.' },

    { id: 'd2', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 11.</b> File chỉ mục <code>Packages</code> không phải văn bản theo dòng: ' +
         'mỗi gói là một <b>đoạn</b> nhiều dòng, các đoạn cách nhau bằng một dòng trống. ' +
         'Hai lệnh dưới đây đếm số gói và cho <b>cùng một kết quả</b>. Lệnh thứ hai làm việc ' +
         'đó bằng cách nào?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'M=/var/lib/apt/lists/archive.ubuntu.com_ubuntu_dists_resolute_main_binary-amd64_Packages\n' +
          "grep -c '^Package: ' \"$M\"\n" +
          "awk 'BEGIN{RS=\"\"} END{print NR}' \"$M\"" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '6487\n' +
          '6487' }
      ],
      opts: [
        '<code>RS=""</code> bảo <code>awk</code> bỏ qua mọi dòng trống, rồi <code>NR</code> đếm số dòng còn lại.',
        '<code>RS=""</code> bật <b>chế độ đoạn</b>: dấu tách bản ghi không còn là ký tự xuống dòng mà là <b>một dòng trống</b>. Nên <code>NR</code> đếm số <b>đoạn</b>, tức là số gói.',
        '<code>RS=""</code> làm <code>awk</code> đọc cả file thành một bản ghi duy nhất, và <code>NR</code> luôn bằng 1.',
        '<code>RS=""</code> đổi dấu tách <b>trường</b> thành dòng trống, còn bản ghi vẫn là từng dòng.'
      ],
      a: 1,
      why: 'Bài 11 dạy mô hình của <code>awk</code>: <b>bản ghi</b> (record, đếm bằng ' +
           '<code>NR</code>) và <b>trường</b> (field, tách bằng <code>FS</code>). Mặc định ' +
           'một bản ghi là một dòng, và đó là lý do người ta hay nghĩ awk chỉ xử lý được ' +
           'văn bản theo dòng. <code>RS=""</code> là một trường hợp đặc biệt được định nghĩa ' +
           'sẵn: nó chuyển sang <i>paragraph mode</i> — bản ghi là một khối văn bản, phân ' +
           'cách bằng một hoặc nhiều dòng trống. Đáp án 4 lẫn <code>RS</code> với ' +
           '<code>FS</code>; trong chế độ đoạn thì <code>FS</code> mặc định cũng thay đổi ' +
           'theo (mỗi <b>dòng</b> trong đoạn trở thành một trường), và đó chính là thứ khiến ' +
           'nó dùng được để đọc file định dạng Debian. ' +
           '<b>Điểm đáng nhớ:</b> hai lệnh trên cho cùng <b>6487</b>, nhưng chúng không ' +
           'tương đương. <code>grep -c</code> đếm <i>dòng bắt đầu bằng <code>Package:</code></i>; ' +
           '<code>awk</code> đếm <i>đoạn</i>. Chúng khớp nhau vì file này đúng định dạng. ' +
           'Khi bạn cần lấy <b>nhiều trường trong cùng một gói</b> — như câu C5 lấy cả ' +
           '<code>Package</code> lẫn <code>Installed-Size</code> — thì chỉ chế độ đoạn mới ' +
           'làm được, vì <code>grep</code> không có khái niệm "cùng một bản ghi".' },

    { id: 'd3', k: 'mcq', tag: 'Nhắc lại bài cũ',
      q: '<b>Bài 8.</b> Bạn <b>ở trong nhóm <code>sudo</code></b> — dòng ' +
         '<code>id</code> chứng minh điều đó. Vậy mà ghi thẳng vào ' +
         '<code>/var/lib/dpkg/status</code> vẫn bị từ chối. Kernel đã quyết định thế nào?',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'id\n' +
          'ls -l /var/lib/dpkg/status\n' +
          'ls -ld /var/lib/dpkg' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'uid=1000(shinarus) gid=1000(shinarus) groups=1000(shinarus),4(adm),24(cdrom),27(sudo),30(dip),46(plugdev),100(users)\n' +
          '-rw-r--r-- 1 root root 867956 Aug 16 11:37 /var/lib/dpkg/status\n' +
          'drwxr-xr-x 7 root root 4096 Aug 16 11:37 /var/lib/dpkg' },
      ],
      opts: [
        'Kernel thấy bạn ở nhóm <code>sudo</code> nên cho quyền, nhưng <code>dpkg</code> tự khoá file lại để tránh hỏng sổ cái.',
        'Kernel xét <b>đúng một bộ ba</b>: bạn không phải chủ (<code>root</code>), không thuộc nhóm chủ (<code>root</code>), nên nó dừng ở bộ ba <i>other</i> = <code>r--</code> — <b>không có <code>w</code></b>. Nhóm <code>sudo</code> hoàn toàn không tham gia phép xét này.',
        'Vì file <code>status</code> không có bit <code>x</code> nên không mở ghi được.',
        'Vì nhóm <code>sudo</code> chỉ có hiệu lực sau khi đăng xuất và đăng nhập lại.'
      ],
      a: 1,
      why: 'Đây là trục của Bài 8, và nó đáng được nhắc lại đúng vào lúc này: kernel chọn ' +
           '<b>một</b> bộ ba rồi <b>dừng</b>. Chủ? Không — chủ là <code>root</code>, bạn là ' +
           'uid 1000. Thuộc nhóm chủ? Không — nhóm chủ là <code>root</code>, và ' +
           '<code>root</code> không có trong danh sách <code>groups</code> của bạn. Vậy ' +
           'áp bộ ba <i>other</i>: <code>r--</code>. Không có <code>w</code> ⇒ từ chối. ' +
           'Việc bạn ở trong nhóm <code>sudo</code> (gid 27) <b>không xuất hiện ở bất kỳ ' +
           'bước nào</b> của phép xét ấy. ' +
           '<b>Nhóm <code>sudo</code> làm một việc hoàn toàn khác:</b> nó là điều kiện để ' +
           'chương trình <code>sudo</code> đồng ý <i>khởi chạy một tiến trình mới với ' +
           'uid 0</i>. Tiến trình <b>mới</b> ấy mới là cái ghi được, vì lúc đó kernel xét ' +
           'lại từ đầu và thấy uid 0. Phân biệt này không phải chuyện chữ nghĩa: nó giải ' +
           'thích vì sao <code>sudo echo x &gt; /file/của/root</code> vẫn hỏng (shell của ' +
           '<b>bạn</b> mở file, không phải <code>sudo</code>), và vì sao ' +
           '<code>dpkg -S</code>, <code>apt-cache show</code> hay ' +
           '<code>apt-get -s install</code> chạy tốt không cần quyền gì — chúng chỉ ' +
           '<b>đọc</b>, mà bộ ba <i>other</i> có <code>r</code>.' },
  ],

  /* ═══ E · Thực hành — 2 dự đoán + 2 gõ lệnh + 1 sửa lỗi + 1 thử thách ══ */
  E: [
    { id: 'e1', k: 'free', tag: 'Dự đoán output', rows: 9,
      q: '<b>Viết dự đoán trước, chạy sau.</b> Lệnh dưới đây in ra một bảng nhỏ có hai con ' +
         'số và một dấu <code>***</code>. Trước khi gõ, hãy viết ra: bảng đó gồm những dòng ' +
         'gì, <b>hai con số kia nghĩa là gì</b>, dấu <code>***</code> đánh dấu cái gì, và vì ' +
         'sao <code>/var/lib/dpkg/status</code> lại xuất hiện trong một bảng nói về ' +
         '<i>kho</i>. Rồi chạy và so.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code: 'apt-cache policy tree' }
      ],
      hint: 'Lệnh này trả lời hai câu hỏi cùng lúc: "máy đang chạy bản nào" và "kho đang ' +
            'chào bản nào". Hai câu ấy đọc từ <b>hai cuốn sổ khác nhau</b> (A1) — nên bảng ' +
            'phải liệt kê cả hai nguồn.',
      crit: [
        'Dự đoán có dòng <code>Installed:</code> và dòng <code>Candidate:</code>, và ở đây <b>hai bản trùng nhau</b> (<code>2.3.1-1</code>) vì máy đang chạy đúng bản kho chào',
        'Giải thích được <code>Version table</code> liệt kê <b>mọi nguồn</b> có thể cung cấp phiên bản đó, mỗi nguồn kèm một <b>độ ưu tiên</b>',
        'Hai con số là <b>độ ưu tiên</b> (pin priority), không phải kích thước hay số thứ tự: <b>500</b> cho kho thường, <b>100</b> cho gói đã cài',
        'Giải thích được vì sao <code>/var/lib/dpkg/status</code> có mặt: <b>bản đã cài cũng là một "nguồn"</b> của phiên bản ấy — nó đang ở trên máy bạn. Ưu tiên 100 thấp hơn 500 nên apt sẵn sàng thay nó bằng bản kho khi có bản mới hơn',
        '<code>***</code> đánh dấu <b>phiên bản đang được cài</b>',
        'Nêu ứng dụng thật: đây là lệnh để trả lời "vì sao apt cứ chọn bản này mà không chọn bản kia" — và là chỗ mà việc <b>ghim phiên bản</b> (C1, cách sửa 2) thể hiện ra thành con số'
      ],
      sol: '<p>Kết quả thật trên máy bạn:</p>',
      solBlocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'tree:\n' +
          '  Installed: 2.3.1-1\n' +
          '  Candidate: 2.3.1-1\n' +
          '  Version table:\n' +
          ' *** 2.3.1-1 500\n' +
          '        500 http://archive.ubuntu.com/ubuntu resolute/universe amd64 Packages\n' +
          '        100 /var/lib/dpkg/status' },
        { t: 'p', x: '<b>Đọc từ trên xuống.</b> <code>Installed</code> = bản máy bạn đang ' +
          'chạy, đọc từ <b>sổ cái</b>. <code>Candidate</code> = bản <code>apt</code> sẽ cài ' +
          'nếu bạn gõ <code>apt install tree</code> hôm nay, đọc từ <b>chỉ mục kho</b>. Hai ' +
          'cuốn sổ khác nhau ở A1, in cạnh nhau trong một bảng.' },
        { t: 'p', x: '<b>Hai con số là độ ưu tiên</b>, không phải kích thước. ' +
          '<code>500</code> là mức mặc định của một kho bình thường. ' +
          '<code>100</code> là mức của "phiên bản đang cài". Chi tiết đáng nhớ: ' +
          '<code>/var/lib/dpkg/status</code> được liệt kê <b>ngang hàng</b> với một URL kho ' +
          '— vì với apt, "gói này đã có trên máy" cũng là <i>một nguồn cung cấp phiên ' +
          'bản</i>. Nó chỉ được ưu tiên 100, thấp hơn 500, nên khi kho có bản mới hơn thì ' +
          'apt thay. Nếu ngược lại — nguồn đã cài được ghim cao hơn — thì apt sẽ giữ nguyên, ' +
          'và đó chính là cơ chế của <code>apt-mark hold</code> và của việc ghim phiên bản ' +
          'ở C1.' },
        { t: 'cal', kind: 'info', x: 'Dấu <code>***</code> chỉ đơn giản đánh dấu dòng ứng ' +
          'với bản đang cài. Khi một gói có nhiều phiên bản từ nhiều kho, bảng này dài ra và ' +
          '<code>***</code> là thứ đầu tiên mắt bạn cần tìm.' }
      ] },

    { id: 'e2', k: 'free', tag: 'Dự đoán output', rows: 8,
      q: '<b>Viết dự đoán trước, chạy sau.</b> Hai lệnh dưới đây đều <b>không tải gì</b> và ' +
         'đều <b>không cần quyền root</b>. Dự đoán: cái nào chậm hơn, <b>chênh khoảng bao ' +
         'nhiêu lần</b>, và <b>vì sao</b> — cái chậm hơn đang làm thêm việc gì mà cái kia ' +
         'không làm? Ghi cả con số bạn đoán rồi mới chạy.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'time apt-cache show tree >/dev/null\n' +
          'time apt-get -s install cmake >/dev/null 2>&1' },
        { t: 'cal', kind: 'info', x: 'Chạy mỗi lệnh vài lần. Một trong hai có thời gian ' +
          '<b>dao động rõ rệt</b> giữa các lần — đó cũng là dữ liệu, và bạn nên đoán trước ' +
          'là cái nào.' }
      ],
      hint: '<code>apt-cache show</code> chỉ cần <b>tìm một đoạn</b> trong file chỉ mục và ' +
            'in ra. Còn <code>apt-get -s install</code> phải làm gì trước khi biết nó sẽ ' +
            'cài những gói nào? Nhớ B2: kết quả của nó là một <i>danh sách</i>, không phải ' +
            'một bản ghi.',
      crit: [
        'Đoán đúng chiều: <code>apt-get -s install</code> chậm hơn <b>khoảng 20–50 lần</b> (đo được: ~0,04–0,06 s so với ~0,9–2,2 s)',
        'Giải thích đúng việc phụ trội: <code>apt-cache show</code> chỉ <b>tra một bản ghi</b>; <code>apt-get -s install</code> phải <b>nạp và giải toàn bộ đồ thị phụ thuộc</b> rồi chọn một tổ hợp phiên bản thoả mãn mọi ràng buộc',
        'Nêu quy mô bài toán: chỉ mục có <b>6 487 + 66 741</b> bản ghi và <b>145 MB</b> — bài toán giải phụ thuộc chạy trên tập đó, không phải trên một gói',
        'Nhận ra <code>apt-get -s install</code> là cái dao động: thời gian phụ thuộc cache của hệ điều hành và trạng thái máy, chứ không phải một phép tra cố định',
        'Kết luận đúng và quan trọng nhất: <b>cả hai đều không chạm mạng</b> — gần một giây đó là <b>tính toán trên dữ liệu đĩa</b>, đúng nội dung trục 1',
        'Rút ra ứng dụng: vì <code>-s</code> rẻ và an toàn (không đụng máy, không cần root), nó nên là <b>bước mặc định trước mọi lần cài</b> trên máy build'
      ],
      sol: '<p>Đo thật trên máy bạn, mỗi lệnh chạy riêng để thời gian không bị trộn:</p>',
      solBlocks: [
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '# time apt-cache show tree >/dev/null\n' +
          'real\t0m0.044s\n' +
          'user\t0m0.019s\n' +
          'sys\t0m0.024s\n' +
          '\n' +
          '# time apt-get -s install cmake >/dev/null 2>&1\n' +
          'real\t0m2.153s\n' +
          'user\t0m1.816s\n' +
          'sys\t0m0.333s' },
        { t: 'p', x: '<b>Chênh khoảng 50 lần</b> ở lần chạy này. Nhưng con số thứ hai ' +
          '<b>không ổn định</b>: ba lần đo trong cùng một buổi cho <code>0,895 s</code>, ' +
          '<code>1,391 s</code> và <code>2,153 s</code>. Lệnh thứ nhất thì lần nào cũng ' +
          'quanh <code>0,04–0,06 s</code>. Nếu bạn đoán "cái chậm hơn cũng là cái dao động ' +
          'hơn" thì bạn đã đoán đúng, và lý do nằm ngay ở phần giải thích dưới đây.' },
        { t: 'p', x: '<b>Vì sao chênh nhiều đến thế.</b> <code>apt-cache show tree</code> ' +
          'làm một việc: tìm bản ghi tên <code>tree</code> trong chỉ mục và in ra. Đó là một ' +
          'phép tra. <code>apt-get -s install cmake</code> phải <b>nạp toàn bộ đồ thị phụ ' +
          'thuộc</b> — 6 487 bản ghi của <code>main</code> cộng 66 741 của ' +
          '<code>universe</code>, trên 145 MB văn bản — rồi <b>giải</b> một bài toán ràng ' +
          'buộc: chọn một tổ hợp phiên bản sao cho mọi <code>Depends</code> đều thoả, không ' +
          '<code>Conflicts</code> nào bị vi phạm, và đối chiếu với 855 gói máy đang có. Đó ' +
          'là tính toán thật, và khối lượng của nó phụ thuộc bao nhiêu phần chỉ mục còn nằm ' +
          'trong cache của hệ điều hành — nên nó dao động.' },
        { t: 'cal', kind: 'tip', x: '<b>Kết luận đáng mang đi:</b> gần hai giây ấy trôi qua ' +
          'mà <b>không một gói tin nào rời khỏi máy</b>. Toàn bộ "sự thông minh" của ' +
          '<code>apt</code> chạy trên dữ liệu nằm sẵn trên đĩa — đúng trục 1. Và vì ' +
          '<code>-s</code> không đụng vào máy, không cần root, chỉ tốn hai giây, nó nên là ' +
          'phản xạ mặc định trước mọi lần cài trên máy build: <b>xem kế hoạch trước, rồi mới ' +
          'quyết</b>.' }
      ] },

    { id: 'e3', k: 'free', tag: 'Gõ lệnh', rows: 9,
      q: '<b>Viết lệnh.</b> Câu hỏi: <i>"Trong kho <code>main</code>, năm gói nào có ' +
         '<code>Installed-Size</code> lớn nhất?"</i> — hỏi về <b>kho</b>, không phải về máy ' +
         'bạn, nên phải đọc file chỉ mục chứ không phải sổ cái.<br><br>' +
         'Cái khó: <code>Package:</code> và <code>Installed-Size:</code> nằm trên ' +
         '<b>hai dòng khác nhau</b> của cùng một bản ghi, nên <code>grep</code> không ghép ' +
         'chúng lại được. Viết một lệnh in ra năm dòng, mỗi dòng gồm kích thước và tên gói.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'M=/var/lib/apt/lists/archive.ubuntu.com_ubuntu_dists_resolute_main_binary-amd64_Packages' }
      ],
      hint: 'D2 vừa nhắc lại đúng công cụ cho việc này. Trong chế độ đó, một bản ghi là một ' +
            '<b>đoạn</b>, và mỗi <b>dòng</b> trong đoạn là một trường — nên bạn duyệt được ' +
            'các trường của cùng một gói trong cùng một lượt.',
      crit: [
        'Dùng <code>awk</code> ở <b>chế độ đoạn</b>: <code>BEGIN{RS=""; FS="\\n"}</code> — đây là điểm mấu chốt, không có nó thì không ghép được hai dòng của cùng một gói',
        'Duyệt các trường trong đoạn để bắt <b>cả hai</b> giá trị, ví dụ bằng vòng <code>for (i=1; i&lt;=NF; i++)</code> và hai lần khớp tiền tố',
        'In ra rồi mới <code>sort -rn</code> — <b>sắp xếp theo số</b> (<code>-n</code>), không phải theo chữ; thiếu <code>-n</code> thì <code>9</code> đứng trên <code>602719</code>',
        '<code>head -5</code> để cắt lấy năm dòng',
        'Đọc đúng file: chỉ mục <code>…_main_binary-amd64_Packages</code>, <b>không</b> phải <code>/var/lib/dpkg/status</code>',
        'Đối chiếu kết quả và nhận ra ý nghĩa: bốn trong năm gói đầu bảng là <b>tài liệu và ký hiệu gỡ lỗi</b> (<code>-doc</code>, <code>-dbg</code>) — không phải chương trình'
      ],
      sol: '<p>Một cách viết, và kết quả thật trên máy bạn:</p>',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'M=/var/lib/apt/lists/archive.ubuntu.com_ubuntu_dists_resolute_main_binary-amd64_Packages\n' +
          '\n' +
          "awk 'BEGIN{RS=\"\";FS=\"\\n\"}\n" +
          '     {p=""; s=0;\n' +
          '      for (i=1; i<=NF; i++) {\n' +
          '        if ($i ~ /^Package: /)        { p = substr($i, 10) }\n' +
          '        if ($i ~ /^Installed-Size: /) { s = substr($i, 17) + 0 }\n' +
          '      }\n' +
          '      if (p != "") printf "%8d %s\\n", s, p\n' +
          "     }' \"$M\" | sort -rn | head -5" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '  602719 libreoffice-dev-doc\n' +
          '  386526 openjdk-25-dbg\n' +
          '  384704 pacemaker-doc\n' +
          '  341860 dotnet-sdk-10.0\n' +
          '  329780 qemu-efi-aarch64' },
        { t: 'p', x: '<b>Vì sao <code>RS=""</code> là cả bài toán.</b> Ở chế độ mặc định, ' +
          '<code>awk</code> xử lý từng dòng và không có cách nào biết dòng ' +
          '<code>Installed-Size:</code> này thuộc về dòng <code>Package:</code> nào. Đặt ' +
          '<code>RS=""</code> thì một bản ghi trở thành cả đoạn, <code>FS="\\n"</code> làm ' +
          'mỗi dòng thành một trường, và vòng <code>for</code> duyệt được toàn bộ một gói ' +
          'trong một lượt. Đây đúng là loại việc mà <code>grep</code> không làm được — nó ' +
          'không có khái niệm "cùng một bản ghi".' },
        { t: 'p', x: '<b>Và kết quả nói một điều đáng nhớ.</b> Bốn trong năm gói to nhất mà ' +
          '<code>main</code> chào bán là <b>tài liệu và ký hiệu gỡ lỗi</b>: ' +
          '<code>libreoffice-dev-doc</code>, <code>openjdk-25-dbg</code>, ' +
          '<code>pacemaker-doc</code>. Không cái nào là chương trình. Với người dựng rootfs, ' +
          'đó là gợi ý trực tiếp: khi cắt image, chỗ dễ cắt nhất và ít rủi ro nhất là các ' +
          'gói <code>-doc</code>, <code>-dbg</code> và trang <code>man</code> — chúng to, và ' +
          'thiết bị không đọc chúng.' },
        { t: 'cal', kind: 'warn', x: 'Thiếu <code>-n</code> trong <code>sort</code> là lỗi ' +
          'kinh điển: sắp theo <b>chữ</b> thì <code>9</code> đứng trên <code>602719</code>, ' +
          'và bảng ra trông vẫn hợp lý nên bạn không nhận ra. Bài 11 đã cảnh báo đúng chỗ ' +
          'này.' }
      ] },

    { id: 'e4', k: 'free', tag: 'Gõ lệnh', rows: 8,
      q: '<b>Viết lệnh.</b> Trong log của một sự cố, bạn có đường dẫn <code>/bin/sh</code> ' +
         'và cần biết <b>gói nào</b> sở hữu nó. Gõ thẳng <code>dpkg -S /bin/sh</code> thì ' +
         'không ra (B4 đã cho biết vì sao).<br><br>' +
         'Viết một lệnh <b>một dòng</b> trả lời được câu hỏi đó cho <i>bất kỳ</i> đường dẫn ' +
         'nào, kể cả khi nó đi qua thư mục liên kết. Sau đó chạy và <b>đọc kỹ kết quả</b>: ' +
         'nó khác cái bạn chờ đợi ở một điểm — điểm đó là gì?',
      hint: 'Sổ cái tra theo <b>chuỗi</b>, nên việc của bạn là đưa cho nó chuỗi mà gói đã ' +
            'khai. Có một lệnh chuyên đi giải hết mọi liên kết trên đường dẫn.',
      crit: [
        'Chuẩn hoá đường dẫn trước rồi mới tra: <code>dpkg -S "$(realpath /bin/sh)"</code> (hoặc <code>readlink -f</code>)',
        'Nhớ đặt dấu nháy kép quanh <code>$(…)</code> — đường dẫn có thể chứa khoảng trắng (Bài 4)',
        'Chạy được và ghi lại kết quả: <code>realpath /bin/sh</code> ra <code>/usr/bin/dash</code>, và <code>dpkg -S</code> ra <code>dash: /usr/bin/dash</code>',
        '<b>Điểm khác biệt:</b> <code>realpath</code> giải <b>toàn bộ</b> chuỗi liên kết, nên nó không dừng ở <code>/usr/bin/sh</code> mà đi tiếp tới <code>/usr/bin/dash</code> — đích thật sự',
        'Giải thích được vì sao vẫn ra đúng gói: <code>dash</code> khai <b>cả hai</b> đường dẫn vào sổ cái, nên tra chuỗi nào cũng trúng',
        'Nêu được giới hạn: cách này trả lời "gói nào sở hữu <b>file thật</b>", có thể <b>không</b> phải câu bạn hỏi nếu bạn cần biết ai tạo ra chính cái tên <code>/bin/sh</code>'
      ],
      sol: '<p>Lệnh và kết quả thật:</p>',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'dpkg -S /bin/sh\n' +
          'realpath /bin/sh\n' +
          'dpkg -S "$(realpath /bin/sh)"' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'dpkg-query: no path found matching pattern /bin/sh\n' +
          '/usr/bin/dash\n' +
          'dash: /usr/bin/dash' },
        { t: 'p', x: '<b>Điểm khác biệt đáng chú ý.</b> Bạn có thể đã chờ ' +
          '<code>realpath</code> trả về <code>/usr/bin/sh</code> — chỉ gỡ cái liên kết ' +
          '<code>/bin → usr/bin</code> ra. Nó không dừng ở đó: <code>realpath</code> giải ' +
          '<b>mọi</b> liên kết trên đường đi, và <code>/usr/bin/sh</code> lại là một liên ' +
          'kết nữa trỏ tới <code>/usr/bin/dash</code>. Nên bạn nhận về <b>đích cuối ' +
          'cùng</b>.' },
        { t: 'p', x: 'May cho bạn, câu trả lời vẫn đúng: gói <code>dash</code> khai ' +
          '<i>cả</i> <code>/usr/bin/sh</code> lẫn <code>/usr/bin/dash</code> vào sổ cái ' +
          '(B4 cho thấy <code>dpkg -S /usr/bin/sh</code> cũng ra <code>dash</code>), nên tra ' +
          'chuỗi nào cũng trúng. Nhưng hãy để ý là bạn vừa được <b>may</b> chứ không phải ' +
          'được <b>đảm bảo</b>.' },
        { t: 'cal', kind: 'warn', x: '<b>Giới hạn phải biết.</b> Cách này trả lời "gói nào ' +
          'sở hữu <i>file thật</i>". Nếu câu bạn cần là "ai tạo ra chính cái tên ' +
          '<code>/bin/sh</code>" thì nó trả lời sai — cái tên đó do bố cục usr-merge của hệ ' +
          'thống tạo, không do gói nào khai. Khi điều tra sự cố, hãy chạy <b>cả hai</b>: bản ' +
          'thô để biết sổ cái có chuỗi đó không, và bản chuẩn hoá để biết file thật thuộc ' +
          'về ai.' }
      ] },

    { id: 'e5', k: 'free', tag: 'Sửa lỗi', rows: 11,
      q: 'Script dưới đây ước lượng dung lượng một gói sẽ chiếm trên rootfs. Nó <b>chạy ' +
         'trót lọt</b>, không báo lỗi, không có dòng cảnh báo nào, và in ra một con số trông ' +
         'rất thuyết phục. Con số đó <b>sai</b>, và sai về một phía cố định.<br><br>' +
         'Tìm khiếm khuyết, nói <b>hướng</b> của sai số (thừa hay thiếu) và vì sao hướng đó ' +
         'là hướng nguy hiểm, rồi <b>viết lại</b> script cho trung thực. Yêu cầu: bản sửa ' +
         'phải làm cho lỗi này <b>không thể xảy ra âm thầm</b> lần nữa.',
      blocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          '#!/bin/bash\n' +
          '# estimate how much disk a package will take on the target\n' +
          'PKG=gcc-riscv64-linux-gnu\n' +
          '\n' +
          "apt-get -s install \"$PKG\" 2>/dev/null | awk '/^Inst /{print $2}' \\\n" +
          ' | while read -r p; do\n' +
          "     apt-cache show \"$p\" 2>/dev/null | awk -F': ' '/^Installed-Size: /{print $2; exit}'\n" +
          '   done \\\n' +
          " | awk '{s+=$1} END{print \"total = \" s \" KB = \" int(s/1024) \" MB\"}'" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'total = 260922 KB = 254 MB' },
        { t: 'cal', kind: 'info', x: 'Gợi ý về nơi nhìn: kế hoạch của <code>apt</code> cho ' +
          'gói này có <b>19</b> gói (B2). Hãy hỏi script xem nó đã cộng <b>bao nhiêu</b> ' +
          'số.' }
      ],
      hint: 'Vòng lặp giữa in ra một dòng cho <i>mỗi gói tìm được <code>Installed-Size</code></i>. ' +
            'Chuyện gì xảy ra với một gói <b>không có</b> trường đó? <code>awk</code> in ra ' +
            'gì, và <code>awk</code> ở cuối cộng gì?',
      crit: [
        'Chỉ ra khiếm khuyết: gói <b>không có trường <code>Installed-Size</code></b> khiến <code>awk</code> giữa in ra <b>chuỗi rỗng</b>, và <code>awk</code> cuối cộng nó thành <b>0</b> — <b>không báo gì cả</b>',
        'Xác định đúng hai gói: <code>libc6-riscv64-cross</code> và <code>libc6-dev-riscv64-cross</code> — chỉ cộng được <b>17 trong 19</b>',
        'Nói đúng hướng sai số: con số bị <b>thiếu</b>, tức là 254 MB là <b>chặn dưới</b>',
        'Nói đúng vì sao hướng đó nguy hiểm: sai số <b>lạc quan</b> — bạn chọn phân vùng theo nó rồi tràn <i>sau</i> khi đã hàn flash, thay vì thấy vấn đề ngay lúc lên kế hoạch',
        'Bản sửa <b>đếm</b> số gói trong kế hoạch và số gói cộng được, rồi <b>so hai con số</b>',
        'Bản sửa <b>in ra danh sách gói bị bỏ qua</b>, không chỉ in số lượng — để người đọc điều tra được',
        'Bản sửa ghi rõ con số là <b>chặn dưới</b> khi có gói bị bỏ qua (và lý tưởng thì trả về mã thoát khác 0 để dây chuyền CI dừng lại)'
      ],
      sol: '<p><b>Khiếm khuyết nằm ở chỗ nối giữa hai lệnh.</b> Vòng ' +
           '<code>while read</code> chạy <code>apt-cache show</code> cho từng gói và in ra ' +
           'một dòng — <i>nếu</i> tìm thấy <code>Installed-Size:</code>. Với hai gói không ' +
           'có trường ấy, <code>awk</code> giữa không in gì cả. Rồi ' +
           '<code>awk</code> cuối cộng những dòng nó nhận được và không có cách nào biết ' +
           'rằng lẽ ra phải có 19 dòng. Không lỗi, không cảnh báo, không mã thoát khác 0 — ' +
           'chỉ một con số nhỏ hơn sự thật.</p>' +
           '<p><b>Hướng của sai số mới là điều đáng sợ.</b> Nó luôn <i>thiếu</i>, không bao ' +
           'giờ thừa. Sai số thừa thì bạn chừa dư chỗ và không ai chết. Sai số thiếu thì bạn ' +
           'chọn phân vùng 256 MB cho một thứ cần hơn thế, và bạn phát hiện ra điều đó ' +
           '<b>sau khi flash đã hàn lên bo mạch</b> — đúng kịch bản ở C2.</p>' +
           '<p><b>Bản sửa, và nguyên tắc đằng sau nó.</b> Không phải "thêm kiểm tra cho ' +
           'chắc" — mà là: <b>một phép tổng hợp dữ liệu phải luôn báo cáo mẫu số của ' +
           'nó</b>. In tổng mà không in số phần tử đã cộng là mời gọi đúng loại lỗi này.</p>',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          '#!/bin/bash\n' +
          'set -euo pipefail\n' +
          '# estimate how much disk a package will take on the target -- honestly\n' +
          'PKG=gcc-riscv64-linux-gnu\n' +
          '\n' +
          'plan=$(apt-get -s install "$PKG" 2>/dev/null | awk \'/^Inst /{print $2}\')\n' +
          '\n' +
          'total=0; have=0; miss=0; misslist=""\n' +
          'for p in $plan; do\n' +
          '  s=$(apt-cache show "$p" 2>/dev/null | awk -F\': \' \'/^Installed-Size: /{print $2; exit}\')\n' +
          '  if [ -n "$s" ]; then\n' +
          '    total=$((total + s)); have=$((have + 1))\n' +
          '  else\n' +
          '    miss=$((miss + 1)); misslist="$misslist $p"\n' +
          '  fi\n' +
          'done\n' +
          '\n' +
          'echo "packages in plan:    $((have + miss))"\n' +
          'echo "with Installed-Size: $have"\n' +
          'echo "without:             $miss"\n' +
          'echo "known total:         $total KB = $((total / 1024)) MB   <-- LOWER BOUND"\n' +
          'if [ "$miss" -gt 0 ]; then\n' +
          '  echo "uncounted:          $misslist"\n' +
          '  exit 1\n' +
          'fi' },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          'packages in plan:    19\n' +
          'with Installed-Size: 17\n' +
          'without:             2\n' +
          'known total:         260922 KB = 254 MB   <-- LOWER BOUND\n' +
          'uncounted:           libc6-riscv64-cross libc6-dev-riscv64-cross' },
        { t: 'p', x: 'Cùng một con số <code>260922</code>, nhưng bây giờ nó đi kèm ' +
          '<b>19 / 17 / 2</b> và một danh sách tên. Người đọc không thể hiểu nhầm nó thành ' +
          'câu trả lời cuối cùng nữa. Thêm <code>exit 1</code> thì dây chuyền CI ' +
          '<b>dừng lại</b> thay vì lặng lẽ đi tiếp với một con số sai — trên máy build, im ' +
          'lặng là chế độ hỏng tệ nhất.' },
        { t: 'cal', kind: 'tip', x: 'Ba dòng <code>set -euo pipefail</code> ở đầu là chủ đề ' +
          'của <b>Bài 13</b>. Với script gốc chúng <i>không</i> cứu được bạn — không lệnh ' +
          'nào thất bại cả, dữ liệu chỉ đơn giản là thiếu. Đó là bài học phụ đáng giá: ' +
          '<b>công tắc an toàn của shell không bắt được lỗi ngữ nghĩa</b>, chỉ bắt được lỗi ' +
          'thực thi.' }
      ] },

    { id: 'e6', k: 'free', tag: 'Thử thách', rows: 10,
      q: '<b>Được phép không giải xong.</b> Trên máy này bạn <b>không dùng được ' +
         '<code>sudo</code></b>, nên không sửa được ' +
         '<code>/etc/apt/sources.list.d/</code> để bật <code>deb-src</code>. Nhưng bạn vẫn ' +
         'muốn lấy gói mã nguồn của <code>tree</code> để tự kiểm chứng mọi con số ở B3.' +
         '<br><br>' +
         '<b>Thử thách:</b> lấy được ba file mã nguồn ấy <b>mà không cần quyền root</b>, ' +
         'không ghi một byte nào ra ngoài thư mục nhà của bạn.<br><br>' +
         'Viết ra hướng bạn định đi và <b>lý do bạn tin nó khả thi</b>, kể cả khi bạn chưa ' +
         'chạy được. Câu hỏi dẫn đường: mọi đường dẫn mà <code>apt</code> dùng — nơi đọc ' +
         '<code>sources.list</code>, nơi lưu chỉ mục, nơi lưu cache — có <b>bắt buộc</b> ' +
         'phải là đường dẫn hệ thống không?',
      hint: '<code>apt</code> đọc <b>mọi</b> đường dẫn của nó từ một cây cấu hình, và mọi ' +
            'mục trong cây đó đều đặt lại được ngay trên dòng lệnh bằng <code>-o</code>. ' +
            'Thử <code>apt-config dump | grep -i \'^Dir\'</code> và xem có bao nhiêu thứ ' +
            'bạn đang tưởng là cố định.',
      crit: [
        'Nhận ra mọi đường dẫn của <code>apt</code> đều là <b>tuỳ chọn cấu hình</b> đặt lại được bằng <code>-o</code>, không phải hằng số biên dịch sẵn',
        'Nêu đúng bốn nhóm phải đổi: nơi đọc danh sách kho (<code>Dir::Etc::sourcelist</code>), nơi lưu chỉ mục (<code>Dir::State::lists</code>), nơi lưu cache (<code>Dir::Cache</code>), và <b>vô hiệu hoá</b> thư mục kho hệ thống (<code>Dir::Etc::sourceparts=/dev/null</code>) để nó không đọc lẫn cấu hình thật',
        'Tự viết một file <code>sources.list</code> riêng chỉ chứa <b>một dòng <code>deb-src</code></b> — không cần và không nên chép cả cấu hình hệ thống',
        'Hiểu vì sao không cần root: bạn chỉ đọc chỉ mục công khai và ghi vào thư mục nhà của mình; <b>không</b> ghi vào sổ cái, <b>không</b> cài gì (đúng ranh giới ở D3)',
        'Chạy <code>apt-get … update</code> trước — không có bước này thì không có chỉ mục <code>Sources</code>, và <code>apt-get source</code> không biết tải gì (trục 1)',
        'Kiểm chứng kết quả bằng <b>bằng chứng</b>, không bằng cảm giác: đối chiếu <code>sha256sum</code> của <code>orig.tar.gz</code> với dòng trong <code>.dsc</code>',
        'Nếu chưa chạy được: nêu được <b>trở ngại cụ thể</b> bạn gặp và <b>cách bạn định kiểm chứng</b> giả thuyết của mình — đó mới là phần được chấm ở một câu thử thách'
      ],
      sol: '<p><b>Ý tưởng cốt lõi:</b> gần như mọi thứ trong <code>apt</code> mà ta quen coi ' +
           'là "đường dẫn hệ thống" thật ra chỉ là một <b>mục cấu hình có giá trị mặc ' +
           'định</b>. <code>apt-config dump | grep -i \'^Dir\'</code> liệt kê chúng ra, và ' +
           'mỗi mục đều ghi đè được bằng <code>-o Tên::Mục=giá_trị</code> ngay trên dòng ' +
           'lệnh. Dựng một "thế giới apt" riêng nằm gọn trong thư mục nhà là chuyện làm được ' +
           'trong mười dòng.</p>' +
           '<p>Và không cần root vì bạn không làm cái việc cần root: bạn <b>không cài gì</b>, ' +
           '<b>không chạm sổ cái</b>. Bạn chỉ tải mấy file công khai về nhà mình. Đúng ranh ' +
           'giới mà D3 vừa vẽ lại: đọc thì bộ ba <i>other</i> cho phép, ghi vào ' +
           '<code>/var/lib/dpkg</code> thì không — và ở đây bạn không ghi vào đó.</p>',
      solBlocks: [
        { t: 'code', where: 'wsl', lang: 'bash', code:
          '#!/bin/bash\n' +
          '# fetch a source package with no root at all: give apt a private set of paths\n' +
          'set -euo pipefail\n' +
          'BASE=$HOME/bt12src\n' +
          'mkdir -p "$BASE"/etc "$BASE"/lists/partial "$BASE"/cache/archives/partial "$BASE"/prefs\n' +
          '\n' +
          '# one line is enough -- we only need deb-src\n' +
          "printf 'deb-src [signed-by=/usr/share/keyrings/ubuntu-archive-keyring.gpg]" +
          " http://archive.ubuntu.com/ubuntu resolute universe\\n' > \"$BASE\"/etc/sources.list\n" +
          '\n' +
          'O="-o Dir::Etc::sourcelist=$BASE/etc/sources.list\n' +
          '   -o Dir::Etc::sourceparts=/dev/null\n' +
          '   -o Dir::Etc::preferencesparts=$BASE/prefs\n' +
          '   -o Dir::State::lists=$BASE/lists\n' +
          '   -o Dir::Cache=$BASE/cache\n' +
          '   -o APT::Get::List-Cleanup=0"\n' +
          '\n' +
          'cd "$BASE"\n' +
          'apt-get $O update          # fetches only the Sources index\n' +
          'apt-get $O source tree     # downloads .dsc + orig.tar.gz + debian.tar.xz' },
        { t: 'p', x: 'Chạy thật trên máy bạn, bước <code>update</code> tải chỉ mục ' +
          '<code>Sources</code> của <code>universe</code> — <b>13,4 MB</b> — rồi ' +
          '<code>apt-get source</code> lấy về đúng ba file. Kiểm chứng bằng bằng chứng, ' +
          'không bằng cảm giác:' },
        { t: 'code', where: 'wsl', lang: 'bash', code:
          'ls -l --time-style=long-iso tree_2.3.1-1.dsc tree_2.3.1.orig.tar.gz tree_2.3.1-1.debian.tar.xz\n' +
          'sha256sum tree_2.3.1.orig.tar.gz\n' +
          "sed -n '/^Checksums-Sha256:/,/^Files:/p' tree_2.3.1-1.dsc" },
        { t: 'code', where: 'out', lang: 'text', nocopy: true, code:
          '-rw-r--r-- 1 shinarus shinarus  9568 2026-02-04 08:10 tree_2.3.1-1.debian.tar.xz\n' +
          '-rw-r--r-- 1 shinarus shinarus  1869 2026-02-04 08:10 tree_2.3.1-1.dsc\n' +
          '-rw-r--r-- 1 shinarus shinarus 70339 2026-02-04 08:10 tree_2.3.1.orig.tar.gz\n' +
          '\n' +
          '47ca786ed4ea4aa277cabd42b1a54635aca41b29e425e9229bd1317831f25665  tree_2.3.1.orig.tar.gz\n' +
          '\n' +
          'Checksums-Sha256:\n' +
          ' 47ca786ed4ea4aa277cabd42b1a54635aca41b29e425e9229bd1317831f25665 70339 tree_2.3.1.orig.tar.gz\n' +
          ' eec0d36eadcabfe8447a7a9eba53ea1c6343102dbd087109b7918c0cd14ced9b 9568 tree_2.3.1-1.debian.tar.xz' },
        { t: 'p', x: '<b>Hai chỗ dễ vấp, ghi lại để bạn khỏi mất giờ.</b> Thứ nhất, phải có ' +
          '<code>Dir::Etc::sourceparts=/dev/null</code> — nếu không, apt vẫn đọc thêm cả ' +
          '<code>/etc/apt/sources.list.d/</code> thật và bạn nhận về một mớ lẫn lộn. Thứ ' +
          'hai, <code>apt-get update</code> ở đây <b>không thể bỏ qua</b>: thư mục ' +
          '<code>lists</code> riêng của bạn lúc đầu rỗng, mà <code>apt-get source</code> ' +
          'thì đọc chỉ mục để biết tải gì — đúng trục 1, chỉ là lần này bạn tự tay dựng lấy ' +
          'bản chụp.' },
        { t: 'cal', kind: 'tip', x: '<b>Kỹ thuật này không phải mẹo vặt.</b> Cùng một cách ' +
          'ghi đè <code>Dir::*</code> chính là thứ các công cụ dựng rootfs dùng để lập kế ' +
          'hoạch gói <i>cho một hệ thống đích</i> mà không đụng vào máy build — đúng cái ' +
          'C2 kết luận là cách kiểm chứng đáng tin duy nhất. Bạn vừa dùng nó ở quy mô nhỏ ' +
          'nhất.' }
      ] },
  ],

  /* ═══ F · Bảng chẩn đoán ═══════════════════════════════════════════════ */
  diag: [
    ['A1, B1, C1, E2',
     'Bạn tin rằng <code>apt install</code> hỏi máy chủ xem kho có những gói nào. Thật ra nó chỉ đọc một <b>bản chụp chỉ mục nằm trên đĩa</b>, và <code>apt update</code> là việc duy nhất chạm mạng.',
     '<a href="#/bai-12#kho-phan-mem-chi-muc-va-chuoi-tin-cay">Đọc lại Bài 12 — <i>Kho phần mềm, chỉ mục và chuỗi tin cậy</i></a>'],

    ['A2, B2, C2, E5',
     'Bạn đọc <code>Installed-Size</code> của gói mình gõ tên và tưởng đó là cái giá. Cái giá là <b>bao đóng phụ thuộc</b>, và nó phụ thuộc hệ thống đích — 25 KB hoá ra 254 MB.',
     '<a href="#/bai-12#phu-thuoc-suc-manh-va-cung-la-noi-dau">Đọc lại Bài 12 — <i>Phụ thuộc: sức mạnh, và cũng là nỗi đau</i></a>'],

    ['A3, B3, C3',
     'Bạn nghĩ bản phân phối giữ một nhánh mã nguồn riêng, nên muốn sửa một dòng thì phải fork. Thật ra <code>.deb</code> là thứ <b>phái sinh</b>: mã nguồn gốc nguyên vẹn + một thư mục <code>debian/</code>.',
     '<a href="#/bai-12#mot-file-deb-that-ra-la-gi">Đọc lại Bài 12 — <i>Một file .deb thật ra là gì</i></a>'],

    ['A4, A8, B4, E4',
     'Bạn lẫn giữa hai cuốn sổ, hoặc lẫn chiều của <code>dpkg -S</code> và <code>dpkg -L</code>. Sổ cái nói <i>máy này đang có gì</i>; chỉ mục nói <i>kho có gì</i> — và sổ cái tra theo <b>chuỗi đường dẫn</b>, không theo inode.',
     '<a href="#/bai-12#hai-tang-dpkg-lam-apt-nghi">Đọc lại Bài 12 — <i>Hai tầng: dpkg làm, apt nghĩ</i></a>'],

    ['A5, A6, A7, C5',
     'Bạn chưa nắm phần cơ khí: <code>.deb</code> là kho <code>ar</code> ba thành viên, cột manual/auto là cơ sở của <code>autoremove</code>, và ba thư mục <code>lists</code> / <code>dpkg</code> / <code>cache</code> có ba vai trò khác nhau.',
     '<a href="#/bai-12#thuc-hanh-mo-nap-he-thong-quan-ly-goi">Đọc lại Bài 12 — <i>Thực hành: mở nắp hệ thống quản lý gói</i></a>'],

    ['B5, C4',
     'Bạn coi <code>Recommends</code> ngang với <code>Depends</code>, hoặc coi <code>[trusted=yes]</code> là một phiền toái bỏ qua được. Một cái làm image phình, cái kia cắt đứt <b>mắt xích đầu tiên</b> của chuỗi tin cậy.',
     '<a href="#/bai-12#kho-phan-mem-chi-muc-va-chuoi-tin-cay">Đọc lại Bài 12 — <i>Kho phần mềm, chỉ mục và chuỗi tin cậy</i></a>'],

    ['B6, D1',
     'Bạn chưa thấy vì sao chỗ đặt dữ liệu lại quan trọng: <code>/usr</code> là tĩnh và chia sẻ được, <code>/var</code> là biến đổi và riêng của từng máy — ranh giới ấy quyết định phân vùng nào phải ghi được trên thiết bị nhúng.',
     '<a href="#/bai-05#mot-cay-duy-nhat-khong-co-o-dia">Đọc lại Bài 5 — <i>Một cây duy nhất, không có ổ đĩa</i></a>'],

    ['D2, E3',
     'Bạn chưa dùng được <code>awk</code> ở chế độ đoạn (<code>RS=""</code>), nên không ghép được hai trường nằm trên hai dòng của cùng một bản ghi — thứ mà <code>grep</code> không làm được.',
     '<a href="#/bai-11#awk-moi-dong-la-mot-hang-moi-khoang-trang-la-mot-cot">Đọc lại Bài 11 — <i>awk: mỗi dòng là một hàng, mỗi khoảng trắng là một cột</i></a>'],

    ['D3',
     'Bạn tưởng ở trong nhóm <code>sudo</code> là có quyền ghi. Kernel xét <b>đúng một bộ ba</b> rồi dừng, và nhóm <code>sudo</code> không tham gia phép xét đó — nó chỉ cho phép <b>khởi chạy</b> một tiến trình uid 0.',
     '<a href="#/bai-08#r-w-x-nghia-khac-nhau-voi-file-va-voi-thu-muc">Đọc lại Bài 8 — <i>r, w, x nghĩa khác nhau với file và với thư mục</i></a>'],
  ],
});

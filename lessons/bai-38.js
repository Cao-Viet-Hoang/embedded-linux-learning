/* Bài 38 — Source kernel và cách định hướng
   Chặng 07 — Linux Kernel
   Lấy source từ kernel.org (tarball + chữ ký GPG, hoặc git), ý nghĩa của từng thư mục
   gốc, và bốn cách hỏi một cây mã 30 triệu dòng: từ tên ký hiệu, từ chuỗi compatible,
   từ ký hiệu CONFIG, và từ MAINTAINERS/Documentation. */

Lesson.register({
  id: 'bai-38',
  title: 'Source kernel và cách định hướng',
  minutes: 55,
  practice: 'Thực hành 35 phút',
  level: 'Trung cấp',

  intro:
    '<b>Bài 37</b> kết thúc bằng bảy cái tên lấy từ <code>/proc/kallsyms</code> — ' +
    '<code>entry_SYSCALL_64</code>, <code>ksys_write</code>, <code>vfs_write</code>, ' +
    '<code>ext4_file_write_iter</code>… — nhưng đó mới chỉ là <b>tên</b>. Bài này biến chúng thành ' +
    '<b>file và số dòng cụ thể</b> mà bạn mở ra đọc được. Để làm việc đó bạn cần source kernel trên ' +
    'máy, và ngay lập tức bạn gặp vấn đề thật của mọi kỹ sư embedded: cây source có ' +
    '<b>91 120 file</b> và <b>hơn 36 triệu dòng</b> mã. Không ai đọc hết nó — kể cả Linus. ' +
    'Kỹ năng phải học không phải là <i>đọc</i> kernel, mà là <b>định hướng</b> trong kernel: cho một ' +
    'triệu chứng, một tên hàm, một dòng log, hay một chuỗi trong device tree, tìm ra đúng file trong ' +
    'vài giây. Bài này dạy bốn con đường làm được điều đó, và <b>đo</b> cái giá của việc chọn sai đường.',

  goals: [
    'Tải source kernel từ kernel.org và <b>kiểm chữ ký GPG</b> đúng cách — kể cả hiểu vì sao phải giải nén trước khi kiểm',
    'Phân biệt <b>tarball</b> và <b>git clone</b>, biết khi nào chọn cái nào, và chứng minh được hai bản là giống hệt nhau',
    'Đọc bản đồ thư mục gốc: <code>arch/ drivers/ kernel/ mm/ fs/ include/ Documentation/</code> — mỗi thư mục trả lời câu hỏi gì',
    'Lần được từ một <b>tên ký hiệu</b> ra <code>file:dòng</code>, và giải thích vì sao <code>__arm64_sys_write</code> tìm mãi không thấy',
    'Đi ngược từ một chuỗi <code>compatible</code> trong device tree hoặc một ký hiệu <code>CONFIG_</code> tới đúng file driver',
    'Chọn được câu lệnh tìm kiếm rẻ nhất, sau khi đo chênh lệch <b>hơn 200 lần</b> giữa tìm bừa và tìm có định hướng'
  ],

  blocks: [

    /* ══════════════════════════════════════════════════════════════════
       1. Cây source không phải để đọc
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Cây source không phải để đọc — nó để tra' },

    { t: 'p', x:
      'Phản xạ đầu tiên của gần như mọi người mới là sai: giải nén source ra, mở trình soạn thảo, và ' +
      'bắt đầu đọc từ đâu đó. Hãy nhìn con số trước khi làm việc đó.' },

    { t: 'table',
      head: ['Thứ bạn đọc', 'Số dòng', 'Đọc hết mất bao lâu, với 200 dòng/phút'],
      rows: [
        ['Một chương trình C nhỏ như ở <b>Bài 14</b>', 'khoảng 10', 'vài giây'],
        ['Driver UART <code>amba-pl011.c</code> — cả driver của board bạn dùng ở <b>Chặng 05</b>', '3 146', 'một buổi'],
        ['Toàn bộ <code>fs/ext4/</code> (51 file)', '66 620', 'gần một tuần'],
        ['<b>Toàn bộ kernel 6.18.45</b>, chỉ tính <code>.c .h .S</code>', '<b>36 277 772</b>',
         '<b>3 023 giờ</b> — hơn <b>một năm</b> làm việc 8 tiếng/ngày, chỉ để <i>đọc lướt</i>, chưa hiểu']
      ]},

    { t: 'cal', kind: 'why', title: 'Đây là con số quan trọng nhất của cả Chặng 07', x:
      '<p>Nó không phải để doạ bạn, mà để <b>đổi chiến lược</b>. Khi một cây mã lớn tới mức không thể ' +
      'đọc hết, mọi kỹ năng có ích đều là kỹ năng <b>thu hẹp</b>:</p>' +
      '<ul>' +
      '<li>Không hỏi “kernel làm việc này thế nào?” — hỏi “<b>hàm tên gì</b> làm việc này?”</li>' +
      '<li>Không tìm trong cả cây — tìm trong <b>một thư mục</b> mà bạn có lý do để tin.</li>' +
      '<li>Không đọc một file 3 000 dòng — nhảy thẳng tới <b>số dòng</b> mà công cụ chỉ ra.</li>' +
      '</ul>' +
      '<p>Ở phần thực hành bạn sẽ đo được: cùng một câu hỏi, cho ra <b>đúng cùng một kết quả</b>, ' +
      'tìm bừa cả cây mất <b>1,381 giây</b> còn tìm đúng thư mục mất <b>0,006 giây</b> — nhanh hơn ' +
      '<b>230 lần</b>. Và đó là khi bộ nhớ đệm đã nóng; lần chạy đầu tiên của kiểu tìm bừa mất tới ' +
      '<b>36,7 giây</b>. Chênh lệch đó không đến từ công cụ tốt hơn — nó đến từ việc <b>biết trước ' +
      'phải nhìn vào đâu</b>. Đó là toàn bộ nội dung bài này.</p>' },

    { t: 'p', x:
      'Tin tốt: cây source Linux được tổ chức <b>rất kỷ luật</b>. Sau ba mươi năm và hàng chục nghìn ' +
      'người đóng góp, vị trí của một file gần như luôn suy ra được từ chức năng của nó. Bạn không cần ' +
      'nhớ 91 nghìn đường dẫn — bạn cần nhớ khoảng <b>mười lăm</b> quy tắc, và phần còn lại là công cụ ' +
      'tìm kiếm.' },

    { t: 'fig',
      cap: 'Bốn cửa vào cây source. Bạn hầu như không bao giờ bắt đầu từ thư mục gốc — bạn bắt đầu từ ' +
           'một manh mối cụ thể và đi ngược về file.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Bốn con đường đi từ một manh mối tới đúng file trong cây source kernel">' +
        '<rect class="d-box-a" x="10" y="14" width="160" height="46" rx="6"/>' +
        '<text class="d-t" x="24" y="34">Manh mối bạn có</text>' +
        '<text class="d-ts" x="24" y="50">một trong bốn loại</text>' +

        '<rect class="d-box" x="200" y="6" width="250" height="40" rx="6"/>' +
        '<text class="d-t" x="212" y="22">1 · Tên ký hiệu</text>' +
        '<text class="d-tm" x="212" y="38">vfs_write, ext4_file_write_iter</text>' +

        '<rect class="d-box" x="200" y="56" width="250" height="40" rx="6"/>' +
        '<text class="d-t" x="212" y="72">2 · Chuỗi compatible</text>' +
        '<text class="d-tm" x="212" y="88">"arm,pl011"</text>' +

        '<rect class="d-box" x="200" y="106" width="250" height="40" rx="6"/>' +
        '<text class="d-t" x="212" y="122">3 · Ký hiệu CONFIG</text>' +
        '<text class="d-tm" x="212" y="138">CONFIG_SERIAL_AMBA_PL011</text>' +

        '<rect class="d-box" x="200" y="156" width="250" height="40" rx="6"/>' +
        '<text class="d-t" x="212" y="172">4 · Tên phân hệ</text>' +
        '<text class="d-tm" x="212" y="188">"ext4", "usb gadget"</text>' +

        '<line class="d-line" x1="170" y1="37" x2="200" y2="26"/>' +
        '<line class="d-line" x1="170" y1="37" x2="200" y2="76"/>' +
        '<line class="d-line" x1="170" y1="37" x2="200" y2="126"/>' +
        '<line class="d-line" x1="170" y1="37" x2="200" y2="176"/>' +

        '<line class="d-line" x1="450" y1="26" x2="530" y2="100"/>' +
        '<line class="d-line" x1="450" y1="76" x2="530" y2="100"/>' +
        '<line class="d-line" x1="450" y1="126" x2="530" y2="100"/>' +
        '<line class="d-line" x1="450" y1="176" x2="530" y2="100"/>' +
        '<path class="d-arrow" d="M 536 102 l -13 -3 l 3 -8 z"/>' +

        '<rect class="d-box-g" x="540" y="78" width="170" height="46" rx="6"/>' +
        '<text class="d-t" x="554" y="98">file : số dòng</text>' +
        '<text class="d-tm" x="554" y="114">fs/read_write.c:746</text>' +

        '<rect class="d-box-w" x="200" y="206" width="250" height="34" rx="6"/>' +
        '<text class="d-t" x="212" y="227">0 · Mở editor và đọc từ đầu</text>' +
        '<text class="d-ts" x="470" y="227">≈ 280 năm — đừng</text>' +
        '</svg>' },

    /* ══════════════════════════════════════════════════════════════════
       2. Lấy source: tarball hay git
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Lấy source: tarball hay git' },

    { t: 'p', x:
      'Nguồn chính thức duy nhất là <b>kernel.org</b>. Mọi bản kernel “của hãng” — Raspberry Pi, ' +
      'ST, NXP, Rockchip — đều là kernel.org <b>cộng thêm patch</b>, và bạn sẽ gặp lại đúng loại cây ' +
      'đó khi chuyển sang board thật ở <b>Bài 70</b>. Bài này dùng bản gốc để học cấu trúc chuẩn trước.' },

    { t: 'p', x: 'Có hai cách lấy, và chúng không tương đương:' },

    { t: 'table',
      head: ['', '<code>tar.xz</code> từ kernel.org', '<code>git clone --depth 1</code>'],
      rows: [
        ['Tải về', '<b>147 MB</b> (154 592 412 byte)', 'khoảng 250 MB truyền qua mạng'],
        ['Sau khi bung ra đĩa', '<b>1,7 GB</b>', '<b>2,0 GB</b> (kèm <code>.git</code>)'],
        ['Thời gian, đo ở phần thực hành', 'giải nén <b>11,8 giây</b>', 'clone <b>95,1 giây</b>'],
        ['Có lịch sử commit không?', 'Không — chỉ có ảnh chụp một phiên bản',
         'Chỉ <b>1 commit</b>. <code>--depth 1</code> cắt hết lịch sử'],
        ['Kiểm được tính toàn vẹn bằng', '<b>chữ ký GPG</b> của người bảo trì', 'HTTPS + hash của chính git'],
        ['<code>git grep</code>, <code>git blame</code>', 'Không (chưa phải kho git)', '<code>git grep</code> có; <code>git blame</code> vô dụng vì chỉ 1 commit'],
        ['Dùng khi', 'Bạn cần <b>đúng một phiên bản</b> để build hoặc để đọc',
         'Bạn cần <code>git grep</code>, cần đổi nhánh, hoặc sắp <b>tự vá</b>']
      ]},

    { t: 'cal', kind: 'tip', title: 'Bài này dùng cả hai — có lý do', x:
      'Bạn sẽ tải tarball để học <b>chữ ký GPG</b> (git clone không dạy được điều đó), rồi clone thêm ' +
      'một bản để có <code>git grep</code>. Cuối phần thực hành bạn sẽ <b>chứng minh</b> hai cây giống ' +
      'nhau đến từng byte bằng <code>diff -rq</code> — một bài tập nhỏ nhưng dập tắt vĩnh viễn nghi ngờ ' +
      '“hai nguồn khác nhau thì liệu có khác nội dung không”. Nếu ổ đĩa của bạn eo hẹp, hãy chỉ làm ' +
      'phần tarball; các bước dùng git đều được đánh dấu rõ là <b>tuỳ chọn</b>.' },

    { t: 'h3', x: 'Đọc số hiệu phiên bản' },

    { t: 'p', x:
      'Kernel đánh số <code>&lt;major&gt;.&lt;minor&gt;.&lt;patch&gt;</code>, ví dụ ' +
      '<code>6.18.45</code>. Điều quan trọng với một kỹ sư embedded không phải là con số, mà là ' +
      '<b>nhánh</b> mà con số đó thuộc về:' },

    { t: 'table',
      head: ['Nhánh', 'Ví dụ', 'Ai bảo trì', 'Dùng cho'],
      rows: [
        ['<b>mainline</b>', '<code>6.19-rc3</code>', 'Linus Torvalds',
         'Thử tính năng mới. <b>Không</b> dùng cho sản phẩm'],
        ['<b>stable</b>', '<code>6.18.45</code>', 'Greg Kroah-Hartman',
         'Bản vá lỗi của một minor. Chỉ sống vài tháng'],
        ['<b>longterm (LTS)</b>', '<code>6.12.x</code>, <code>6.6.x</code>', 'Greg Kroah-Hartman + nhóm stable',
         '<b>Sản phẩm thật.</b> Được vá bảo mật nhiều năm'],
        ['<b>vendor</b>', '<code>rpi-6.12.y</code>', 'Hãng làm SoC/board',
         'Board cụ thể. Là LTS + hàng nghìn patch riêng']
      ]},

    { t: 'cal', kind: 'info', title: 'Vì sao bài này chọn 6.18.45', x:
      '<p>Vì <b>chính máy bạn đang chạy nhánh đó</b>. Ở <b>Bài 37</b> lệnh <code>uname -r</code> trả ' +
      'về <code>6.18.33.2-microsoft-standard-WSL2</code> — cùng dòng <code>6.18</code>. Nghĩa là bảy ' +
      'cái tên bạn tra được trong <code>/proc/kallsyms</code> hôm đó sẽ nằm gần như <b>đúng vị trí</b> ' +
      'trong cây source bạn sắp tải. Học một cấu trúc trong khi vẫn kiểm chứng được nó trên nhân thật ' +
      'đang chạy là cơ hội không phải lúc nào cũng có.</p>' +
      '<p>Với <b>sản phẩm</b> thì lựa chọn khác hẳn: bạn chọn <b>LTS</b>, và bạn chọn đúng cái LTS mà ' +
      'hãng SoC của bạn hỗ trợ — chứ không phải cái mới nhất. <b>Bài 40</b> sẽ quay lại điểm này khi ' +
      'bạn build kernel cho board ảo.</p>' },

    { t: 'h3', x: 'Vì sao phải kiểm chữ ký' },

    { t: 'p', x:
      'Kernel là mã chạy ở <b>chế độ đặc quyền cao nhất</b> của máy. Một dòng bị sửa trong source có ' +
      'thể mở toang toàn bộ hệ thống, và không một bài kiểm tra chức năng nào phát hiện ra. Vì vậy ' +
      'kernel.org không chỉ công bố file — nó công bố <b>chữ ký số</b> của người bảo trì trên file đó.' },

    { t: 'cal', kind: 'why', title: 'Chữ ký này ký lên bản .tar, không phải bản .tar.xz', x:
      '<p>Đây là chi tiết khiến hầu hết người mới làm sai ngay lần đầu, nên hãy nhớ nó ngay bây giờ. ' +
      'Với mỗi bản phát hành, kernel.org đưa ra hai file:</p>' +
      '<ul>' +
      '<li><code>linux-6.18.45.tar.xz</code> — source đã nén</li>' +
      '<li><code>linux-6.18.45.tar.sign</code> — chữ ký, <b>991 byte</b>, ký lên bản ' +
      '<code>.tar</code> <b>chưa nén</b></li>' +
      '</ul>' +
      '<p>Lý do rất thực dụng: thuật toán nén có thể thay đổi (đã từng là <code>gzip</code>, rồi ' +
      '<code>bzip2</code>, nay là <code>xz</code>), và nén lại cùng một nội dung bằng phiên bản ' +
      '<code>xz</code> khác cho ra <b>byte khác</b>. Ký lên nội dung <code>.tar</code> — thứ không đổi — ' +
      'thì chữ ký sống lâu hơn công cụ nén.</p>' +
      '<p>Hệ quả thực hành: bạn phải <b>giải nén ra luồng</b> rồi đưa luồng đó cho <code>gpg</code>, ' +
      'bằng dấu <code>-</code> ở cuối lệnh. Đưa thẳng file <code>.xz</code> cho <code>gpg</code> sẽ ra ' +
      '<code>BAD signature</code> — và bạn sẽ thấy đúng thông báo đó ở phần thực hành, vì bài này bắt ' +
      'bạn làm sai một lần <b>có chủ ý</b> để nhớ.</p>' },

    { t: 'cal', kind: 'info', title: 'Bạn đã gặp ý tưởng này ở Bài 36', x:
      'Ở <b>Bài 36</b> bạn ký một ảnh FIT rồi để U-Boot từ chối ảnh không có chữ ký hợp lệ. Đây là ' +
      '<b>cùng một cơ chế</b>, chỉ khác điểm đặt: ở Bài 36 chữ ký bảo vệ <i>ảnh đã build</i> khỏi bị ' +
      'tráo trên board; ở đây chữ ký bảo vệ <i>source</i> khỏi bị tráo trên đường tải về. Một chuỗi ' +
      'tin cậy hoàn chỉnh phải có cả hai đầu — ký một ảnh được build từ source đã bị sửa thì chữ ký chỉ ' +
      'chứng nhận cho kẻ tấn công.' },

    /* ══════════════════════════════════════════════════════════════════
       3. Bản đồ thư mục gốc
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Bản đồ: hai mươi tư thư mục ở gốc' },

    { t: 'p', x:
      'Thư mục gốc của cây source có <b>24 thư mục con</b>. Đừng học thuộc cả hai mươi tư — hãy học ' +
      'cách <b>đặt câu hỏi</b> cho từng cái. Bảng dưới xếp theo kích thước thật đo trên máy bạn ' +
      '(<code>du -sh -- */ | sort -h</code>, bạn sẽ chạy ở phần thực hành), vì kích thước tự nó đã kể ' +
      'một câu chuyện.' },

    { t: 'table',
      head: ['Thư mục', 'Cỡ', 'Nó trả lời câu hỏi gì', 'Bạn vào đây khi'],
      rows: [
        ['<code>drivers/</code>', '<b>1,1 GB</b>',
         '“Nói chuyện với <b>con chip này</b> ra sao?”',
         'Thiết bị không hoạt động. <b>Đây là nơi bạn sẽ sống</b> với tư cách kỹ sư embedded'],
        ['<code>arch/</code>', '161 MB',
         '“Trên <b>kiến trúc CPU này</b> thì làm thế nào?”',
         'Việc bạn quan tâm khác nhau giữa ARM64 và x86: khởi động, ngắt, MMU, syscall entry'],
        ['<code>tools/</code>', '94 MB',
         '“Chương trình <b>user space</b> đi kèm nhân”',
         'Cần <code>perf</code>, <code>bpftool</code>, hoặc bộ selftest'],
        ['<code>Documentation/</code>', '80 MB',
         '“Tài liệu chính thức, <b>đúng phiên bản này</b>”',
         'Trước khi tìm trên Google. Tài liệu trên mạng thường lệch phiên bản'],
        ['<code>include/</code>', '60 MB',
         '“Kiểu dữ liệu và API <b>dùng chung</b>”',
         'Cần định nghĩa của một <code>struct</code>, hoặc của một macro như <code>SYSCALL_DEFINE3</code>'],
        ['<code>sound/</code>', '54 MB', '“Âm thanh (ALSA)”', 'Hiếm, trừ khi bạn làm thiết bị đa phương tiện'],
        ['<code>fs/</code>', '49 MB',
         '“<b>File</b> nghĩa là gì, và nằm ở đâu?”',
         'VFS, ext4, tmpfs, procfs. <code>vfs_write</code> của <b>Bài 37</b> ở đây'],
        ['<code>net/</code>', '38 MB', '“Gói tin đi thế nào?”', 'TCP/IP, netfilter, socket'],
        ['<code>kernel/</code>', '16 MB',
         '“<b>Lõi</b>: tiến trình, lập lịch, tín hiệu, thời gian”',
         'Những thứ không thuộc phần cứng nào và không thuộc phân hệ nào'],
        ['<code>lib/</code>', '11 MB', '“Hàm tiện ích trong nhân”', 'Cần <code>strlen</code>, CRC, cấu trúc dữ liệu — nhân <b>không</b> có libc'],
        ['<code>mm/</code>', '6,1 MB', '“Quản lý bộ nhớ”', 'Page allocator, OOM killer, mmap. Nhỏ mà khó nhất cây'],
        ['<code>scripts/</code>', '4,9 MB', '“Công cụ để <b>build</b> chính nhân”', 'Kconfig, <code>get_maintainer.pl</code>, <code>checkpatch.pl</code>'],
        ['<code>block/</code>', '2,2 MB', '“Thiết bị khối và bộ lập lịch I/O”', 'Hiệu năng eMMC/SD card'],
        ['<code>init/</code>', '<b>228 KB</b>',
         '“Nhân <b>bắt đầu</b> từ đâu?”',
         '<code>start_kernel()</code> — dòng mã C đầu tiên của nhân — nằm ở <code>init/main.c</code>'],
        ['<code>virt/ ipc/ certs/ usr/ crypto/ security/ rust/ samples/ io_uring/ LICENSES/</code>',
         'nhỏ', 'Từng phân hệ hẹp', 'Khi bạn đã biết chính xác mình cần gì']
      ]},

    { t: 'cal', kind: 'info', title: 'Đọc bảng trên theo kích thước, bạn sẽ thấy ba sự thật', x:
      '<ul>' +
      '<li><b><code>drivers/</code> chiếm 1,1 GB — hơn 60 % cả cây.</b> Linux lớn không phải vì thuật ' +
      'toán phức tạp, mà vì nó nói chuyện được với <b>hàng chục nghìn</b> con chip khác nhau. Và bạn ' +
      'sẽ không bao giờ dùng quá vài chục cái trong số đó.</li>' +
      '<li><b><code>init/</code> chỉ có 228 KB.</b> Toàn bộ trình tự khởi động của nhân — thứ mà bạn đã ' +
      'nhìn tuôn ra màn hình suốt <b>Chặng 05</b> và <b>Chặng 06</b> — nằm gọn trong một thư mục nhỏ ' +
      'hơn cả một bức ảnh chụp bằng điện thoại.</li>' +
      '<li><b><code>mm/</code> chỉ 6,1 MB nhưng là phần khó nhất.</b> Kích thước không tỉ lệ với độ ' +
      'khó. <code>drivers/</code> to vì <i>lặp lại</i>; <code>mm/</code> nhỏ vì <i>cô đặc</i>.</li>' +
      '</ul>' },

    { t: 'p', x:
      'Ngoài thư mục, ở gốc còn <b>bốn file</b> đáng nhớ tên: <code>Makefile</code> (dòng 2–4 của nó ' +
      'chính là số phiên bản, bạn sẽ đọc ở phần thực hành), <code>Kconfig</code> (gốc của toàn bộ cây ' +
      'cấu hình), <code>MAINTAINERS</code> (danh bạ: ai chịu trách nhiệm phần nào) và ' +
      '<code>COPYING</code> (GPL-2.0).' },

    { t: 'fig',
      cap: 'Cây source theo tỉ lệ kích thước thật. drivers/ và arch/ — hai thư mục phụ thuộc phần cứng — ' +
           'chiếm gần ba phần tư cây; toàn bộ phần "Linux là gì" chỉ là dải hẹp bên phải.',
      svg:
        '<svg viewBox="0 0 720 200" width="720" role="img" aria-label="Biểu đồ tỉ lệ kích thước các thư mục gốc của cây source kernel, drivers chiếm phần lớn nhất">' +
        '<text class="d-t" x="10" y="18">Tỉ lệ kích thước 24 thư mục gốc — tổng 1,7 GB</text>' +

        '<rect class="d-box-w" x="10" y="30" width="430" height="54" rx="4"/>' +
        '<text class="d-t" x="24" y="52">drivers/</text>' +
        '<text class="d-ts" x="24" y="70">1,1 GB — phụ thuộc phần cứng</text>' +

        '<rect class="d-box-a" x="444" y="30" width="64" height="54" rx="4"/>' +
        '<text class="d-t" x="452" y="52">arch/</text>' +
        '<text class="d-ts" x="452" y="70">161 M</text>' +

        '<rect class="d-box" x="512" y="30" width="38" height="54" rx="4"/>' +
        '<text class="d-ts" x="517" y="60">tools</text>' +

        '<rect class="d-box" x="554" y="30" width="32" height="54" rx="4"/>' +
        '<text class="d-ts" x="558" y="60">Doc.</text>' +

        '<rect class="d-box" x="590" y="30" width="24" height="54" rx="4"/>' +
        '<text class="d-ts" x="592" y="60">incl</text>' +

        '<rect class="d-box" x="618" y="30" width="22" height="54" rx="4"/>' +
        '<text class="d-ts" x="620" y="60">snd</text>' +

        '<rect class="d-box-p" x="644" y="30" width="20" height="54" rx="4"/>' +
        '<text class="d-ts" x="646" y="60">fs</text>' +

        '<rect class="d-box" x="668" y="30" width="16" height="54" rx="4"/>' +
        '<text class="d-ts" x="669" y="60">net</text>' +

        '<rect class="d-box-p" x="688" y="30" width="8" height="54" rx="4"/>' +
        '<rect class="d-box" x="700" y="30" width="10" height="54" rx="4"/>' +

        '<line class="d-line" x1="10" y1="98" x2="508" y2="98"/>' +
        '<text class="d-ts" x="10" y="114">phụ thuộc phần cứng — 74 % cây, bạn chỉ đọc phần liên quan tới board của mình</text>' +

        '<line class="d-line" x1="644" y1="98" x2="710" y2="98"/>' +
        '<text class="d-ts" x="470" y="132">fs/ · kernel/ · mm/ · init/ — “Linux là gì” — chưa tới 5 %</text>' +
        '<path class="d-arrow" d="M 672 122 l -4 -12 l 9 3 z"/>' +

        '<rect class="d-box-g" x="10" y="146" width="700" height="44" rx="6"/>' +
        '<text class="d-t" x="24" y="166">Hệ quả cho bạn</text>' +
        '<text class="d-ts" x="24" y="182">Thu hẹp phạm vi tìm kiếm về đúng một thư mục là cách rẻ nhất để nhanh hơn — rẻ hơn mọi công cụ.</text>' +
        '</svg>' },

    /* ══════════════════════════════════════════════════════════════════
       4. Bốn cách hỏi cây source
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Bốn cách hỏi cây source' },

    { t: 'p', x:
      'Trong thực tế bạn không bao giờ ngồi trước một cây source trống rỗng. Bạn luôn có <b>một manh ' +
      'mối</b> — một dòng trong log lỗi, một tên hàm trong call trace, một chuỗi trong device tree, một ' +
      'tuỳ chọn cấu hình mà đồng nghiệp bảo bật lên. Mỗi loại manh mối có một con đường riêng, và bốn ' +
      'con đường dưới đây phủ gần hết công việc hằng ngày.' },

    { t: 'h3', x: 'Cách 1 — từ tên ký hiệu' },

    { t: 'p', x:
      'Đây là cách bạn dùng nhiều nhất, và là cách nối thẳng với <b>Bài 37</b>: bạn đã có bảy cái tên ' +
      'từ <code>/proc/kallsyms</code>, giờ tìm chúng trong source. Công cụ là <code>grep</code>, nhưng ' +
      'mẹo nằm ở <b>mẫu tìm</b>: neo vào đầu dòng bằng <code>^</code>.' },

    { t: 'code', where: 'wsl', name: 'Tìm định nghĩa, không tìm lời gọi',
      code:
        '# Wrong: returns dozens of lines, mostly places that CALL the function\n' +
        'grep -rn "vfs_write" fs/\n' +
        '\n' +
        '# Right: the return type sits at the start of the line, so "^" filters to the DEFINITION\n' +
        'grep -rn "^ssize_t vfs_write" fs/' },

    { t: 'cal', kind: 'why', title: 'Vì sao dấu ^ lại tìm ra được định nghĩa', x:
      '<p>Quy ước trình bày mã của kernel (<code>Documentation/process/coding-style.rst</code>) yêu cầu ' +
      'khi <b>định nghĩa</b> một hàm thì kiểu trả về và tên hàm nằm <b>ngay đầu dòng</b>, không thụt lề:</p>' +
      '<p><code>ssize_t vfs_write(struct file *file, ...)</code></p>' +
      '<p>Còn khi <b>gọi</b> hàm đó, dòng luôn nằm trong thân một hàm khác nên <b>bắt đầu bằng dấu tab</b>. ' +
      'Vì vậy <code>^</code> — nghĩa là “khớp từ đầu dòng” — tách được định nghĩa khỏi lời gọi mà không ' +
      'cần công cụ đánh chỉ mục nào cả. Một quy ước trình bày biến thành một công cụ tìm kiếm. Đây là lý ' +
      'do thật sự vì sao kernel khắt khe với coding style đến thế.</p>' },

    { t: 'h3', x: 'Cách 2 — từ một chuỗi <code>compatible</code>' },

    { t: 'p', x:
      'Đây là cách <b>đặc trưng nhất của embedded</b>, và bạn sẽ dùng nó suốt <b>Chặng 08</b>. Ở ' +
      '<b>Chặng 05</b> bạn đã cho QEMU giả lập board <code>virt</code> với một UART PL011. Device tree ' +
      'mô tả UART đó bằng một chuỗi:' },

    { t: 'code', where: 'wsl', name: 'Một nút UART thật, trong cây source bạn vừa tải',
      code: "sed -n '897,903p' arch/arm64/boot/dts/arm/juno-base.dtsi" },

    { t: 'code', where: 'out', nocopy: true,
      code:
        'soc_uart0: serial@7ff80000 {\n' +
        '\tcompatible = "arm,pl011", "arm,primecell";\n' +
        '\treg = <0x0 0x7ff80000 0x0 0x1000>;\n' +
        '\tinterrupts = <GIC_SPI 83 IRQ_TYPE_LEVEL_HIGH>;\n' +
        '\tclocks = <&soc_uartclk>, <&soc_refclk100mhz>;\n' +
        '\tclock-names = "uartclk", "apb_pclk";\n' +
        '};',
      notes: ['Đây là board Juno của ARM, không phải board <code>virt</code> của bạn — nhưng ' +
             '<b>cùng con UART PL011</b>. Đó chính là điểm hay: một driver, hàng chục board, nối với ' +
             'nhau bằng đúng chuỗi <code>"arm,pl011"</code>.'] },

    { t: 'p', x:
      'Chuỗi <code>"arm,pl011"</code> là <b>khoá tra cứu</b>: nhân sẽ đi tìm driver nào tự khai báo là ' +
      'lái được thiết bị mang chuỗi đó. Nghĩa là bạn cũng tra được đúng như vậy, chỉ bằng ' +
      '<code>grep</code> — và ở phần thực hành bạn sẽ ra <b>đúng một file</b>.' },

    { t: 'cal', kind: 'tip', title: 'Chuỗi compatible là cây cầu duy nhất giữa phần cứng và phần mềm', x:
      'Hãy nhớ điều này thật kỹ, vì nó là <b>nguyên lý</b> chứ không phải chi tiết tra được: device tree ' +
      'mô tả phần cứng <b>không</b> chứa mã, và driver <b>không</b> biết trước board nào có nó. Thứ duy ' +
      'nhất nối hai bên là một <b>chuỗi ký tự trùng nhau</b>. Nếu chuỗi trong device tree gõ sai một ký ' +
      'tự, kernel sẽ khởi động bình thường và thiết bị đơn giản là <b>không tồn tại</b> — không lỗi, ' +
      'không cảnh báo. Đây là nguyên nhân số một của kiểu bug “board im lặng” mà bạn sẽ gặp ở ' +
      '<b>Chặng 08</b>, và <code>grep</code> chuỗi đó trong <code>drivers/</code> là bước chẩn đoán đầu tiên.' },

    { t: 'h3', x: 'Cách 3 — từ một ký hiệu <code>CONFIG_</code>' },

    { t: 'p', x:
      'Mỗi tính năng của kernel có một ký hiệu cấu hình dạng <code>CONFIG_TÊN</code>. Ký hiệu đó xuất ' +
      'hiện ở <b>đúng ba chỗ</b>, và ba chỗ này tạo thành một chuỗi tra cứu rất mạnh:' },

    { t: 'table',
      head: ['File', 'Vai trò', 'Ví dụ với <code>CONFIG_SERIAL_AMBA_PL011</code>'],
      rows: [
        ['<code>Kconfig</code>', 'Khai báo: tên hiển thị, phụ thuộc, mô tả',
         '<code>drivers/tty/serial/Kconfig</code> — “ARM AMBA PL011 serial port support”'],
        ['<code>Makefile</code>', '<b>Nối ký hiệu với file mã</b>',
         '<code>obj-$(CONFIG_SERIAL_AMBA_PL011) += amba-pl011.o</code>'],
        ['<code>.config</code>', 'Lựa chọn thật của <b>bản build của bạn</b>',
         '<code>=y</code> (dựng thẳng vào nhân), <code>=m</code> (module), hoặc không có dòng nào (tắt)']
      ]},

    { t: 'cal', kind: 'why', title: 'Dòng Makefile là mắt xích quan trọng nhất trong cả cây', x:
      '<p>Cú pháp <code>obj-$(CONFIG_X) += y.o</code> trông tầm thường nhưng nó chính là <b>cơ chế</b> ' +
      'biến một tuỳ chọn thành mã máy. Make thay <code>$(CONFIG_SERIAL_AMBA_PL011)</code> bằng giá trị ' +
      'trong <code>.config</code>, nên dòng trên nở thành một trong ba khả năng:</p>' +
      '<ul>' +
      '<li><code>obj-y += amba-pl011.o</code> → biên dịch và <b>nhúng thẳng</b> vào file nhân</li>' +
      '<li><code>obj-m += amba-pl011.o</code> → biên dịch thành <b>module</b> <code>.ko</code> rời</li>' +
      '<li><code>obj- += amba-pl011.o</code> → một biến rác không ai đọc, nên file <b>không được biên ' +
      'dịch</b> chút nào</li>' +
      '</ul>' +
      '<p>Ba đầu ra hoàn toàn khác nhau, cùng một dòng Makefile, khác nhau vì một chữ. Vì thế khi bạn ' +
      'phải trả lời câu hỏi “file này có nằm trong bản build của tôi không?”, đừng đoán — hãy ' +
      '<code>grep</code> tên file <code>.o</code> trong <code>Makefile</code> cùng thư mục để tìm ra ký ' +
      'hiệu <code>CONFIG_</code> gác cửa nó, rồi tra ký hiệu đó trong <code>.config</code>. ' +
      '<b>Bài 39</b> sẽ dạy cách đọc và sửa <code>.config</code>, còn <b>Bài 41</b> dùng đúng thao tác ' +
      'này để cắt kernel cho nhỏ lại.</p>' },

    { t: 'h3', x: 'Cách 4 — từ tên phân hệ: <code>MAINTAINERS</code> và <code>Documentation/</code>' },

    { t: 'p', x:
      'Khi manh mối của bạn chỉ là một <b>khái niệm</b> — “ext4”, “usb gadget”, “i2c” — thì không có ' +
      'tên hàm nào để <code>grep</code>. Lúc đó dùng file <code>MAINTAINERS</code>: nó vừa là danh bạ ' +
      'người phụ trách, vừa là <b>bản đồ phân hệ → đường dẫn</b> chính thức, với <b>9 184</b> mục ' +
      '<code>F:</code> (file pattern).' },

    { t: 'table',
      head: ['Ký tự đầu dòng', 'Nghĩa', 'Vì sao bạn quan tâm'],
      rows: [
        ['<code>M:</code>', 'Maintainer', 'Người bạn gửi patch tới nếu muốn sửa phân hệ này'],
        ['<code>L:</code>', 'Mailing list', 'Nơi hỏi trước khi hỏi ở chỗ khác'],
        ['<code>S:</code>', 'Status', '<code>Maintained</code>, <code>Odd Fixes</code>, <code>Orphan</code>, <code>Obsolete</code> — <b>đọc dòng này trước khi cắm đầu vào một driver</b>'],
        ['<code>F:</code>', 'File pattern', '<b>Đây là thứ bạn cần:</b> danh sách đường dẫn thuộc phân hệ'],
        ['<code>T:</code>', 'Tree', 'Kho git riêng của phân hệ — nơi có mã mới nhất']
      ]},

    { t: 'cal', kind: 'tip', title: 'Đọc dòng S: là mẹo tiết kiệm hàng tuần công sức', x:
      'Nếu một driver có <code>S: Orphan</code> hoặc <code>S: Obsolete</code>, mọi câu hỏi bạn gửi đi ' +
      'sẽ rơi vào im lặng, và mọi bug bạn gặp là bug của riêng bạn. Biết điều đó <b>trước</b> khi chọn ' +
      'con chip cho sản phẩm là khác biệt giữa một dự án suôn sẻ và sáu tháng khổ sở. Đây là một trong ' +
      'số ít lý do để mở <code>MAINTAINERS</code> ngay cả khi bạn chưa định viết dòng mã nào.' },

    { t: 'p', x:
      '<code>Documentation/</code> là nửa còn lại của cách 4. Nó lớn <b>80 MB</b> và có ba nhánh bạn sẽ ' +
      'quay lại nhiều lần:' },

    { t: 'table',
      head: ['Đường dẫn', 'Chứa gì', 'Bạn cần khi'],
      rows: [
        ['<code>Documentation/devicetree/bindings/</code>', '<b>6 009 file</b> mô tả từng chuỗi <code>compatible</code>',
         'Viết hoặc sửa device tree — <b>Chặng 08</b>'],
        ['<code>Documentation/admin-guide/kernel-parameters.txt</code>', '<b>8 418 dòng</b>: mọi tham số dòng lệnh kernel',
         'Bạn đã gõ <code>console=ttyAMA0</code> ở <b>Chặng 05</b> mà chưa tra nó ở đâu ra'],
        ['<code>Documentation/filesystems/vfs.rst</code>', '<b>1 551 dòng</b> giải thích VFS và <code>file_operations</code>',
         'Đọc lại <b>Bài 37</b> bằng tài liệu chính thức']
      ]},

    { t: 'cal', kind: 'info', title: 'Ba công cụ mà bài này cố tình KHÔNG dạy', x:
      '<p>Có những công cụ đánh chỉ mục chuyên dụng cho cây kernel — <code>cscope</code>, ' +
      '<code>ctags</code>, <code>ripgrep</code> — và cây source thậm chí có sẵn đích ' +
      '<code>make cscope</code>. Bài này không dùng chúng, vì hai lý do:</p>' +
      '<ul>' +
      '<li><b>Chúng không có sẵn.</b> Máy bạn hiện không cài cái nào, và trên một máy build của công ty ' +
      'hay một container CI bạn cũng thường không có quyền cài. <code>grep</code> và <code>git</code> ' +
      'thì <b>luôn</b> có.</li>' +
      '<li><b>Chúng che mất bài học.</b> Bài học của <b>Chặng 07</b> là <i>thu hẹp phạm vi</i>. Một chỉ ' +
      'mục làm mọi tìm kiếm nhanh lên, kể cả tìm kiếm ngu ngốc — nên nó dạy bạn khỏi phải suy nghĩ, và ' +
      'khi chỉ mục cũ đi (nó luôn cũ đi) bạn không biết vì sao kết quả sai.</li>' +
      '</ul>' +
      '<p>Khi đã quen định hướng bằng tay, hãy cài chúng — chúng thật sự tốt. Nhưng hãy cài <b>sau</b>.</p>' },

    /* ══════════════════════════════════════════════════════════════════
       5. Cái giá của một lần tìm
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Cái giá của một lần tìm' },

    { t: 'p', x:
      'Phần này là lý do bài học đứng vững, chứ không phải một lời khuyên chung chung. Cùng một câu hỏi ' +
      '— “<code>ext4_file_write_iter</code> định nghĩa ở đâu?” — hỏi theo bốn cách, <b>cho ra đúng cùng ' +
      'một kết quả</b>, nhưng giá khác nhau tới hơn hai trăm lần. Đây là số đo thật trên máy bạn, lần ' +
      'chạy thứ ba (bộ nhớ đệm đã nóng):' },

    { t: 'table',
      head: ['Câu lệnh', 'Quét bao nhiêu', 'Thời gian', 'So với dòng cuối'],
      rows: [
        ['<code>grep -rn PAT .</code>', 'cả 91 120 file, kể cả ảnh nhị phân', '<b>1,381 s</b>', '≈ 230×'],
        ['<code>grep -rn --include=\'*.c\' PAT .</code>', '35 993 file <code>.c</code>', '0,837 s', '≈ 140×'],
        ['<code>grep -rn --include=\'*.c\' PAT fs/</code>', 'phần <code>.c</code> của <code>fs/</code>', '0,043 s', '≈ 7×'],
        ['<code>grep -rn PAT fs/ext4/</code>', '51 file', '<b>0,006 s</b>', '<b>1×</b>']
      ]},

    { t: 'cal', kind: 'warn', title: 'Lần chạy ĐẦU TIÊN chậm hơn nhiều — và đó không phải lỗi của grep', x:
      '<p>Trong cùng loạt đo trên, câu lệnh dòng đầu mất <b>36,748 s</b> ở lần chạy thứ nhất, ' +
      '<b>4,091 s</b> ở lần thứ hai, rồi mới xuống <b>1,381 s</b>. Cùng câu lệnh, cùng dữ liệu, chênh ' +
      'nhau <b>26 lần</b>.</p>' +
      '<p>Nguyên nhân là <b>page cache</b> (bộ nhớ đệm trang) — chính là cơ chế bạn đã gặp ở ' +
      '<b>Bài 37</b> khi nói về phân hệ quản lý bộ nhớ. Lần đầu, mỗi file phải đọc thật từ đĩa ảo. ' +
      'Sau đó nhân giữ nội dung trong RAM, nên lần sau <code>grep</code> gần như chỉ tốn CPU. Cây source ' +
      'nặng 1,7 GB còn WSL2 trên máy này chỉ có khoảng <b>4,8 GB</b> RAM, nên nếu bạn quét xen kẽ hai ' +
      'cây source lớn thì <b>lần nào cũng là lần đầu</b>.</p>' +
      '<p>Hệ quả khi bạn tự đo lại: <b>luôn chạy ba lần và lấy con số cuối</b>. Một phép đo đơn lẻ trên ' +
      'cây source lớn gần như chắc chắn đang đo tốc độ đĩa chứ không phải tốc độ công cụ. Đây cũng là ' +
      'lý do bảng trên ghi rõ “lần chạy thứ ba”.</p>' },

    { t: 'p', x:
      'Nếu bạn có bản clone git, còn thêm một lựa chọn nữa là <code>git grep</code>. Nó chỉ tìm trong ' +
      'các file mà git <b>theo dõi</b>, nên tự động bỏ qua <code>.git/</code>, file build và mọi thứ ' +
      'trong <code>.gitignore</code>. Số đo trên máy bạn, cũng lần chạy thứ ba:' },

    { t: 'table',
      head: ['Trong cây git (2,0 GB, có <code>.git</code> 282 MB)', 'Thời gian', 'Ghi chú'],
      rows: [
        ['<code>git grep -n PAT</code>', '<b>1,062 s</b>', 'Chạy nhiều luồng; lần đầu tốn tới 12,988 s'],
        ['<code>grep -rn --exclude-dir=.git PAT .</code>', '1,476 s', 'Ổn định hơn giữa các lần chạy'],
        ['<code>grep -rn PAT .</code> (quên loại <code>.git</code>)', '17,644 s', '<b>Quét cả kho nén — vô ích hoàn toàn</b>']
      ]},

    { t: 'cal', kind: 'info', title: 'Kết luận đúng không phải “dùng git grep”', x:
      '<p><code>git grep</code> nhanh hơn <code>grep</code> ở đây khoảng <b>1,4 lần</b>. Việc thu hẹp ' +
      'phạm vi từ cả cây xuống <code>fs/ext4/</code> nhanh hơn <b>230 lần</b>. Hai con số đó không cùng ' +
      'hạng.</p>' +
      '<p>Nói cách khác: đổi công cụ cho bạn vài phần trăm; <b>đổi câu hỏi</b> cho bạn hai bậc độ lớn. ' +
      'Hãy dùng <code>git grep</code> khi có sẵn — nó tiện, nhất là vì tự bỏ qua <code>.git/</code> — ' +
      'nhưng đừng bao giờ để nó thay thế việc suy nghĩ xem <b>nên nhìn vào thư mục nào</b>.</p>' },

    /* ══════════════════════════════════════════════════════════════════
       6. Thực hành
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Thực hành: tải, kiểm chữ ký, và định hướng' },

    { t: 'p', x:
      'Sáu bước dưới đây làm trọn một vòng: từ chỗ chưa có gì trên máy, tới chỗ trả lời được câu hỏi ' +
      '“hàm này ở đâu” trong <b>sáu phần nghìn giây</b>. Cần khoảng <b>2 GB</b> trống trên ổ đĩa cho ' +
      'năm bước đầu, và thêm <b>2 GB</b> nữa nếu bạn làm cả phần git tuỳ chọn ở bước 6.' },

    { t: 'steps', items: [

      /* ── Bước 1 ─────────────────────────────────────────────── */
      { title: 'Tải source và kiểm chữ ký GPG',
        blocks: [

          { t: 'p', x:
            'Mọi thứ của bài này nằm trong một thư mục duy nhất để dễ xoá sau. Tải <b>hai</b> file: bản ' +
            'nén và chữ ký của nó.' },

          { t: 'code', where: 'wsl',
            code:
              'mkdir -p ~/bai38 && cd ~/bai38\n' +
              'curl -O https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.18.45.tar.sign\n' +
              'curl -O https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.18.45.tar.xz\n' +
              'ls -l' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'total 150976\n' +
              '-rw-r--r-- 1 shinarus shinarus       991 Aug 20 20:54 linux-6.18.45.tar.sign\n' +
              '-rw-r--r-- 1 shinarus shinarus 154592412 Aug 20 20:54 linux-6.18.45.tar.xz',
            notes: ['Trong lúc tải, <code>curl</code> vẽ một thanh tiến độ tự ghi đè lên chính nó nên ' +
                   'không chép lại được ở đây; trên máy này 147,4 MB tải xong trong <b>5 giây</b> ' +
                   '(26,2 MB/s). <b>Tên người dùng và ngày giờ sẽ khác trên máy bạn</b>; hai con số phải ' +
                   'giống hệt là <b>991</b> và <b>154 592 412</b> byte.'] },

          { t: 'p', x:
            'Bây giờ lấy khoá công khai của những người ký. Lệnh này hỏi thẳng máy chủ khoá của ' +
            'kernel.org qua WKD (Web Key Directory), nên bạn không phải tin một trang web trung gian nào:' },

          { t: 'code', where: 'wsl',
            code: 'gpg --locate-keys torvalds@kernel.org gregkh@kernel.org' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'pub   rsa4096 2011-09-23 [SC]\n' +
              '      647F28654894E3BD457199BE38DBBDC86092693E\n' +
              'uid           [ unknown] Greg Kroah-Hartman <gregkh@kernel.org>\n' +
              'sub   rsa4096 2011-09-23 [E]\n' +
              '\n' +
              'pub   rsa2048 2011-09-20 [SC]\n' +
              '      ABAF11C65A2970B130ABE3C479BE3E4300411886\n' +
              'uid           [ unknown] Linus Torvalds <torvalds@kernel.org>\n' +
              'sub   rsa2048 2011-09-20 [E]',
            notes: ['Hai dấu vân tay này <b>phải giống hệt</b> trên máy bạn — chúng là hằng số kể từ ' +
                   'năm 2011. Nếu khác, hãy dừng lại: hoặc mạng của bạn đang bị can thiệp, hoặc bạn gõ ' +
                   'nhầm địa chỉ email.'] },

          { t: 'p', x:
            'Trước khi làm đúng, hãy <b>làm sai một lần có chủ ý</b> — đây là cái bẫy mà gần như ai cũng ' +
            'sập, và gặp nó một lần ở đây thì sau này bạn nhận ra ngay:' },

          { t: 'code', where: 'wsl', name: 'Cách SAI — đưa thẳng file .xz cho gpg',
            code: 'gpg --verify linux-6.18.45.tar.sign linux-6.18.45.tar.xz' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'gpg: Signature made Wed Aug 19 23:20:06 2026 +07\n' +
              'gpg:                using RSA key 647F28654894E3BD457199BE38DBBDC86092693E\n' +
              'gpg: BAD signature from "Greg Kroah-Hartman <gregkh@kernel.org>" [unknown]' },

          { t: 'cal', kind: 'warn', title: '“BAD signature” ở đây KHÔNG có nghĩa là file hỏng', x:
            'Nó có nghĩa là bạn đưa <b>nhầm dữ liệu</b> cho <code>gpg</code>. Chữ ký được tính trên nội ' +
            'dung file <code>.tar</code>, còn bạn vừa đưa file <code>.tar.xz</code> — hai chuỗi byte hoàn ' +
            'toàn khác nhau, nên tất nhiên không khớp. Đây là chỗ nguy hiểm về mặt tâm lý: người mới ' +
            'thấy “BAD signature” thường kết luận “chắc mạng lỗi, tải lại” và lặp lại mãi. Hãy nhớ ' +
            '<b>luôn hỏi “gpg đang so cái gì với cái gì”</b> trước khi đổ lỗi cho file.' },

          { t: 'p', x: 'Cách đúng: giải nén ra <b>luồng</b> và đẩy luồng đó vào <code>gpg</code>.' },

          { t: 'code', where: 'wsl', name: 'Cách ĐÚNG',
            code: 'xz -cd linux-6.18.45.tar.xz | gpg --verify linux-6.18.45.tar.sign -' },

          { t: 'cmdx', cmd: 'xz -cd linux-6.18.45.tar.xz | gpg --verify linux-6.18.45.tar.sign -',
            title: 'Dấu gạch ngang cuối lệnh là toàn bộ mấu chốt',
            rows: [
              ['<code>xz -d</code>', 'Giải nén (<i>decompress</i>).'],
              ['<code>-c</code>', 'Ghi ra <b>luồng ra chuẩn</b> thay vì tạo file. Nhờ nó bạn không cần 1,7 GB đĩa trống cho một file <code>.tar</code> trung gian mà xoá ngay sau đó.'],
              ['<code>|</code>', 'Nối luồng sang <code>gpg</code> — đúng cơ chế bạn học ở <b>Bài 10</b>.'],
              ['<code>gpg --verify</code>', 'Kiểm <b>chữ ký tách rời</b>: chữ ký nằm ở một file, dữ liệu nằm ở chỗ khác.'],
              ['<code>linux-6.18.45.tar.sign</code>', 'File chữ ký — tham số thứ nhất.'],
              ['<code>-</code>', '<b>Tham số thứ hai</b>: “dữ liệu cần kiểm đang ở luồng vào chuẩn”. Bỏ dấu này thì <code>gpg</code> tự đi tìm file <code>linux-6.18.45.tar</code> (không có) và báo lỗi.']
            ]},

          { t: 'code', where: 'out', nocopy: true,
            code:
              'gpg: Signature made Wed Aug 19 23:20:06 2026 +07\n' +
              'gpg:                using RSA key 647F28654894E3BD457199BE38DBBDC86092693E\n' +
              'gpg: Good signature from "Greg Kroah-Hartman <gregkh@kernel.org>" [unknown]\n' +
              'gpg: WARNING: This key is not certified with a trusted signature!\n' +
              'gpg:          There is no indication that the signature belongs to the owner.\n' +
              'Primary key fingerprint: 647F 2865 4894 E3BD 4571  99BE 38DB BDC8 6092 693E',
            notes: ['Dòng cần tìm là <b><code>Good signature</code></b>. Dòng “Signature made” là thời ' +
                   'điểm Greg ký bản phát hành, không phải giờ máy bạn.'] },

          { t: 'cal', kind: 'why', title: 'Vì sao vẫn có WARNING dù chữ ký tốt — và vì sao đừng “sửa” nó', x:
            '<p>Hai dòng cảnh báo trả lời một câu hỏi <b>khác</b> với câu hỏi bạn vừa hỏi. GPG tách bạch ' +
            'hai việc:</p>' +
            '<ul>' +
            '<li><b>Chữ ký có khớp với dữ liệu và với khoá này không?</b> → <code>Good signature</code>. ' +
            'Đây là câu trả lời <b>toán học</b>, chắc chắn.</li>' +
            '<li><b>Khoá này có thật sự là của Greg Kroah-Hartman không?</b> → GPG không biết, vì bạn ' +
            'chưa <i>tự tay</i> xác nhận. Đó là ý nghĩa của <code>[unknown]</code> và của WARNING.</li>' +
            '</ul>' +
            '<p>Bạn <b>không nên</b> chạy <code>gpg --lsign-key</code> để làm cảnh báo biến mất chỉ vì ' +
            'nó khó chịu — làm vậy là tự nói dối rằng mình đã xác minh. Cách xác minh thật là so dấu vân ' +
            'tay <code>647F 2865 …</code> với nguồn độc lập (trang kernel.org/signature.html, hoặc một ' +
            'bản in bạn có từ trước). Trong khoá học này, dấu vân tay khớp với những gì lệnh ' +
            '<code>--locate-keys</code> lấy trực tiếp từ kernel.org qua HTTPS là đủ.</p>' +
            '<p>Ghi nhớ nguyên tắc, vì nó lặp lại ở mọi hệ thống chữ ký kể cả secure boot của ' +
            '<b>Bài 36</b>: <b>chữ ký chỉ chuyển niềm tin, nó không tạo ra niềm tin.</b> Cuối cùng vẫn ' +
            'phải có một khoá mà bạn tin vì lý do ngoài mật mã học.</p>' }
        ]},

      /* ── Bước 2 ─────────────────────────────────────────────── */
      { title: 'Giải nén và lập bản đồ cây source',
        blocks: [

          { t: 'p', x:
            'Giải nén và <b>đo</b> luôn, vì con số này đáng nhớ: 147 MB nén nở ra thành 1,7 GB.' },

          { t: 'code', where: 'wsl',
            code: 'time tar -xf linux-6.18.45.tar.xz' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '\n' +
              'real\t0m11.806s\n' +
              'user\t0m12.674s\n' +
              'sys\t0m12.566s',
            notes: ['Thời gian sẽ khác trên máy bạn. Nhưng hãy để ý điều <b>không</b> phụ thuộc máy: ' +
                   '<code>user + sys = 25,2 s</code> lớn hơn <code>real = 11,8 s</code>. Ở <b>Bài 37</b> ' +
                   'bạn đã học cách đọc ba con số này; ở đây chúng nói rằng công việc chạy trên ' +
                   '<b>nhiều lõi cùng lúc</b> — <code>xz</code> giải nén song song.'] },

          { t: 'code', where: 'wsl', name: 'Vào cây và đo tổng dung lượng',
            code:
              'cd linux-6.18.45\n' +
              'du -sh .' },

          { t: 'code', where: 'out', nocopy: true, code: '1.7G\t.' },

          { t: 'p', x:
            'Bây giờ là lệnh quan trọng nhất của cả bước — <b>bản đồ theo kích thước</b>. Hãy đọc kỹ kết ' +
            'quả này thay vì lướt qua; nó là thứ bạn sẽ hình dung lại mỗi lần cần tìm gì đó:' },

          { t: 'code', where: 'wsl',
            code: 'du -sh -- */ | sort -h' },

          { t: 'cmdx', cmd: 'du -sh -- */ | sort -h', title: 'Ba chi tiết nhỏ mà ai cũng gõ sai lần đầu',
            rows: [
              ['<code>du -s</code>', 'Chỉ in <b>tổng</b> của mỗi tham số, không liệt kê từng file bên trong (<i>summarize</i>).'],
              ['<code>-h</code>', 'Đơn vị người đọc được: <code>K</code>, <code>M</code>, <code>G</code>.'],
              ['<code>--</code>', 'Chấm dứt danh sách tuỳ chọn. Không có nó, một thư mục tên bắt đầu bằng dấu gạch ngang sẽ bị hiểu nhầm là tuỳ chọn.'],
              ['<code>*/</code>', 'Dấu <code>/</code> ở cuối khiến shell chỉ khớp <b>thư mục</b>, bỏ qua file như <code>Makefile</code> hay <code>COPYING</code>.'],
              ['<code>sort -h</code>', 'Sắp xếp <b>hiểu được</b> đơn vị: <code>832K</code> đứng trước <code>1.9M</code>. <code>sort -n</code> thường sẽ xếp sai vì nó chỉ đọc phần số.']
            ]},

          { t: 'code', where: 'out', nocopy: true,
            code:
              '80K\tcerts/\n' +
              '84K\tusr/\n' +
              '228K\tinit/\n' +
              '280K\tipc/\n' +
              '300K\tLICENSES/\n' +
              '336K\tvirt/\n' +
              '832K\tio_uring/\n' +
              '1.9M\tsamples/\n' +
              '2.2M\tblock/\n' +
              '2.5M\trust/\n' +
              '3.9M\tcrypto/\n' +
              '3.9M\tsecurity/\n' +
              '4.9M\tscripts/\n' +
              '6.1M\tmm/\n' +
              '11M\tlib/\n' +
              '16M\tkernel/\n' +
              '38M\tnet/\n' +
              '49M\tfs/\n' +
              '54M\tsound/\n' +
              '60M\tinclude/\n' +
              '80M\tDocumentation/\n' +
              '94M\ttools/\n' +
              '161M\tarch/\n' +
              '1.1G\tdrivers/' },

          { t: 'p', x: 'Vài phép đếm để con số “36 triệu dòng” thôi trừu tượng:' },

          { t: 'code', where: 'wsl',
            code:
              'find . -type f | wc -l\n' +
              "find . -name '*.c' | wc -l\n" +
              "find . -name '*.h' | wc -l\n" +
              "find . -name '*.c' -o -name '*.h' -o -name '*.S' | xargs cat | wc -l" },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '91120\n' +
              '35993\n' +
              '26155\n' +
              '36277772',
            notes: ['Lệnh cuối mất khoảng một phút vì nó thật sự đọc hết 62 nghìn file. ' +
                   '<b>36 277 772 dòng</b> — và đó mới chỉ là mã C, header và assembly, chưa tính ' +
                   'device tree, Kconfig, Makefile hay tài liệu.'] },

          { t: 'p', x:
            'Cuối cùng, cây source tự khai số phiên bản của chính nó — ngay <b>bốn dòng đầu</b> của ' +
            '<code>Makefile</code> gốc. Đây là cách chắc chắn nhất để biết mình đang ở phiên bản nào, ' +
            'kể cả khi thư mục đã bị đổi tên:' },

          { t: 'code', where: 'wsl', code: 'head -n 5 Makefile' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '# SPDX-License-Identifier: GPL-2.0\n' +
              'VERSION = 6\n' +
              'PATCHLEVEL = 18\n' +
              'SUBLEVEL = 45\n' +
              'EXTRAVERSION =' },

          { t: 'cal', kind: 'tip', title: 'Bốn dòng này là thứ sinh ra chuỗi uname -r', x:
            'Ở <b>Bài 37</b> lệnh <code>uname -r</code> in ra ' +
            '<code>6.18.33.2-microsoft-standard-WSL2</code>. Phần <code>6.18.33</code> đến từ đúng ba ' +
            'biến trên, còn <code>-microsoft-standard-WSL2</code> đến từ <code>EXTRAVERSION</code> và ' +
            'cấu hình — Microsoft đặt vào để bạn biết đây là nhân họ build. Khi bạn tự build kernel ở ' +
            '<b>Bài 40</b>, bạn sẽ tự chọn hậu tố đó, và nó sẽ hiện ra trong <code>uname -r</code> của ' +
            'chính bạn.' }
        ]},

      /* ── Bước 3 ─────────────────────────────────────────────── */
      { title: 'Bảy cái tên của Bài 37 trở thành file và số dòng',
        blocks: [

          { t: 'p', x:
            'Đây là lúc trả nợ lời hứa cuối <b>Bài 37</b>. Bảy ký hiệu bạn đếm được trong ' +
            '<code>/proc/kallsyms</code> hôm đó giờ có địa chỉ thật trong source. Để ý rằng mỗi lệnh ' +
            'dưới đây <b>neo bằng <code>^</code></b> và <b>chỉ tìm trong một thư mục</b> — đúng hai ' +
            'nguyên tắc của phần lý thuyết:' },

          { t: 'code', where: 'wsl',
            code:
              "grep -rn '^SYSCALL_DEFINE3(write' fs/\n" +
              "grep -rn '^ssize_t ksys_write' fs/\n" +
              "grep -rn '^ssize_t vfs_write' fs/\n" +
              "grep -rn 'SYM_CODE_START(entry_SYSCALL_64)' arch/x86/\n" +
              "grep -rn '^static void noinstr el0_svc' arch/arm64/\n" +
              "grep -rn '^static void invoke_syscall' arch/arm64/\n" +
              "grep -rn '^ext4_file_write_iter' fs/ext4/" },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'fs/read_write.c:746:SYSCALL_DEFINE3(write, unsigned int, fd, const char __user *, buf,\n' +
              'fs/read_write.c:1168:SYSCALL_DEFINE3(writev, unsigned long, fd, const struct iovec __user *, vec,\n' +
              'fs/read_write.c:727:ssize_t ksys_write(unsigned int fd, const char __user *buf, size_t count)\n' +
              'fs/read_write.c:666:ssize_t vfs_write(struct file *file, const char __user *buf, size_t count, loff_t *pos)\n' +
              'arch/x86/entry/entry_64.S:87:SYM_CODE_START(entry_SYSCALL_64)\n' +
              'arch/arm64/kernel/entry-common.c:743:static void noinstr el0_svc(struct pt_regs *regs)\n' +
              'arch/arm64/kernel/entry-common.c:895:static void noinstr el0_svc_compat(struct pt_regs *regs)\n' +
              'arch/arm64/kernel/syscall.c:38:static void invoke_syscall(struct pt_regs *regs, unsigned int scno,',
            notes: ['<b>Số dòng sẽ khác nếu bạn dùng phiên bản kernel khác</b> — chúng đúng cho ' +
                   '6.18.45. Dòng cuối (<code>fs/ext4/file.c:694</code>) bị cắt khỏi ảnh chụp này vì ' +
                   'nó xuất hiện ở bước 6; bạn sẽ thấy nó trên máy mình.'] },

          { t: 'p', x:
            'Bảy lệnh, <b>tám</b> dòng kết quả. Hai dòng “thừa” không phải nhiễu — chúng đáng giá:' },

          { t: 'table',
            head: ['Dòng thừa', 'Nó là gì', 'Bài học'],
            rows: [
              ['<code>SYSCALL_DEFINE3(writev, …)</code> ở dòng 1168',
               'Syscall <code>writev</code> — ghi nhiều vùng đệm trong một lần gọi',
               'Mẫu tìm của bạn khớp cả tiền tố. Đây là <b>ưu điểm</b>: bạn vừa phát hiện một hàm họ hàng mà bạn chưa biết là có'],
              ['<code>el0_svc_compat</code> ở dòng 895',
               'Đường vào dành cho chương trình <b>32-bit</b> chạy trên nhân ARM64',
               'Mọi kiến trúc 64-bit đều có một đường “compat” song song. Khi đọc mã trong <code>arch/</code>, luôn kiểm xem mình đang nhìn nhánh 64-bit hay nhánh compat']
            ]},

          { t: 'p', x:
            'Giờ mở thẳng tới số dòng và đọc. Đây là <b>toàn bộ</b> syscall <code>write</code> — năm dòng:' },

          { t: 'code', where: 'wsl',
            code: "sed -n '744,750p' fs/read_write.c" },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '}\n' +
              '\n' +
              'SYSCALL_DEFINE3(write, unsigned int, fd, const char __user *, buf,\n' +
              '\t\tsize_t, count)\n' +
              '{\n' +
              '\treturn ksys_write(fd, buf, count);\n' +
              '}' },

          { t: 'cal', kind: 'info', title: 'Bạn vừa đọc lớp 3 gọi xuống lớp 4 — bằng mã thật', x:
            '<p>Bảng năm lớp ở <b>Bài 37</b> nói “lớp bọc ABI gọi lớp trung lập”. Đây chính là dòng đó, ' +
            'không phải sơ đồ: <code>return ksys_write(fd, buf, count);</code>.</p>' +
            '<p>Chú ý <code>const char __user *buf</code>. Chú thích <code>__user</code> không phải bình ' +
            'luận cho vui — nó là <b>lời cảnh báo mà máy đọc được</b>, đánh dấu “con trỏ này đến từ user ' +
            'space, tuyệt đối không được truy cập thẳng”. Có một công cụ tên <code>sparse</code> quét cả ' +
            'cây để bắt các chỗ vi phạm. Một quy ước đặt tên nữa biến thành một công cụ kiểm tra — cùng ' +
            'tinh thần với dấu <code>^</code> bạn vừa dùng.</p>' },

          { t: 'p', x:
            'Và đây là thứ đáng giá nhất của cả bước: <b>bảng <code>file_operations</code> của ext4</b> — ' +
            'chính là cái “bảng phương thức ảo viết tay bằng C” mà <b>Bài 37</b> mô tả nhưng chưa cho bạn ' +
            'nhìn thấy:' },

          { t: 'code', where: 'wsl',
            code: "sed -n '963,968p' fs/ext4/file.c" },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'const struct file_operations ext4_file_operations = {\n' +
              '\t.llseek\t\t= ext4_llseek,\n' +
              '\t.read_iter\t= ext4_file_read_iter,\n' +
              '\t.write_iter\t= ext4_file_write_iter,\n' +
              '\t.iopoll\t\t= iocb_bio_iopoll,\n' +
              '\t.unlocked_ioctl = ext4_ioctl,' },

          { t: 'cal', kind: 'why', title: 'Sáu dòng này là toàn bộ bí mật của VFS', x:
            '<p>Ở <b>Bài 37</b> bạn học rằng <code>vfs_write</code> không hề chứa dòng nào gọi ' +
            '<code>ext4_file_write_iter</code>; nó chỉ viết <code>file-&gt;f_op-&gt;write_iter(...)</code>. ' +
            'Bạn vừa nhìn thấy <b>vế còn lại</b>: dòng ' +
            '<code>.write_iter = ext4_file_write_iter,</code> là nơi ext4 <b>tự điền tên mình vào ô ' +
            'trống</b> đó.</p>' +
            '<p>Hãy dừng lại một nhịp ở đây, vì đây là mẫu thiết kế lặp đi lặp lại ở <b>mọi</b> phân hệ ' +
            'của nhân — driver ký tự, driver mạng, driver block đều đăng ký bằng đúng kiểu bảng như vậy. ' +
            'Ở <b>Chặng 10</b> khi bạn viết driver đầu tiên, việc bạn làm sẽ là: khai một ' +
            '<code>struct file_operations</code>, điền vài ô, và đưa nó cho nhân. Bạn vừa đọc trước bản ' +
            'mẫu.</p>' +
            '<p>Muốn tự kiểm chứng “cùng một dòng mã, ba đích đến”? Tìm bảng tương ứng của procfs bằng ' +
            '<code>grep -rn \'file_operations proc_reg_file_ops\' fs/proc/</code> — nó ở ' +
            '<code>fs/proc/inode.c:555</code>. Cùng một kiểu <code>struct</code>, tên hàm khác hẳn. Đó ' +
            'là lý do <code>cat /proc/uptime</code> và <code>cat file.txt</code> chạy chung một đoạn mã ' +
            'ở lớp 4 mà xuống lớp 5 lại rẽ hai đường.</p>' }
        ]},

      /* ── Bước 4 ─────────────────────────────────────────────── */
      { title: 'Cái bẫy: tìm mãi không thấy __arm64_sys_write',
        blocks: [

          { t: 'p', x:
            'Bảng đối chiếu x86-64 / ARM64 ở <b>Bài 37</b> có một dòng ghi lớp bọc ARM64 tên là ' +
            '<code>__arm64_sys_write</code>. Hãy tìm nó — <b>lần này tìm cả cây</b>, không thu hẹp gì cả, ' +
            'để chắc chắn không bỏ sót chỗ nào:' },

          { t: 'code', where: 'wsl',
            code:
              "grep -rn '__arm64_sys_write' .\n" +
              'echo "exit code: $?"' },

          { t: 'code', where: 'out', nocopy: true,
            code: 'exit code: 1',
            notes: ['Không một dòng kết quả nào. Mã thoát <b>1</b> là cách <code>grep</code> nói “tìm ' +
                   'xong, không có gì” — khác hẳn mã <b>2</b> nghĩa là “có lỗi”.'] },

          { t: 'cal', kind: 'warn', title: 'Đây là lỗi nhận thức tốn thời gian nhất khi đọc kernel', x:
            'Bạn có một cái tên <b>chắc chắn tồn tại</b> — nó nằm trong bảng ký hiệu của nhân đang chạy, ' +
            'nó xuất hiện trong mọi call trace của ARM64 — nhưng nó <b>không có trong source</b>. Nếu ' +
            'chưa biết vì sao, bạn sẽ nghi ngờ mọi thứ trừ nguyên nhân thật: tải nhầm phiên bản, giải nén ' +
            'thiếu, gõ sai. Nguyên nhân thật là: <b>cái tên đó không được ai viết ra — nó được ' +
            '<i>sinh ra</i></b>.' },

          { t: 'p', x:
            'Bằng chứng nằm ở chỗ tìm phần <b>chung</b> của cái tên thay vì cả cái tên. Chuỗi ' +
            '<code>__arm64_sys</code> đứng riêng thì có, còn phần <code>_write</code> được nối vào lúc ' +
            'biên dịch:' },

          { t: 'code', where: 'wsl',
            code: "grep -rn '__arm64_sys##name' arch/arm64/" },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'arch/arm64/include/asm/syscall_wrapper.h:50:\tasmlinkage long __arm64_sys##name(const struct pt_regs *regs);\t\t\\\n' +
              'arch/arm64/include/asm/syscall_wrapper.h:51:\tALLOW_ERROR_INJECTION(__arm64_sys##name, ERRNO);\t\t\t\\\n' +
              'arch/arm64/include/asm/syscall_wrapper.h:54:\tasmlinkage long __arm64_sys##name(const struct pt_regs *regs)\t\t\\' },

          { t: 'cal', kind: 'why', title: '<code>##</code> là toán tử nối tên của bộ tiền xử lý C', x:
            '<p>Trong một macro, <code>a##b</code> bảo bộ tiền xử lý: “dán <code>a</code> và ' +
            '<code>b</code> lại thành <b>một định danh duy nhất</b>”. Với ' +
            '<code>name = _write</code> thì <code>__arm64_sys##name</code> trở thành ' +
            '<code>__arm64_sys_write</code>.</p>' +
            '<p>Nghĩa là cái tên chỉ <b>tồn tại sau khi biên dịch</b>. Trong file <code>.c</code> nó ' +
            'không có mặt ở dạng chữ nào để <code>grep</code> bắt được; trong file <code>.o</code>, ' +
            'trong <code>/proc/kallsyms</code> và trong mọi call trace thì nó có.</p>' +
            '<p><b>Quy tắc rút ra, dùng được cả đời:</b> nếu một ký hiệu có mặt trong ' +
            '<code>/proc/kallsyms</code> hoặc trong log lỗi nhưng <code>grep</code> cả cây không ra, ' +
            'thì gần như chắc chắn nó do macro sinh. Hãy <b>bỏ dần tiền tố hoặc hậu tố</b> rồi tìm lại — ' +
            'chính xác như bạn vừa làm.</p>' },

          { t: 'p', x:
            'Xem cỗ máy sinh tên đó ở dạng đầy đủ. Chú ý nó khai <b>bốn</b> hàm chứ không phải một:' },

          { t: 'code', where: 'wsl',
            code: "sed -n '48,58p' arch/arm64/include/asm/syscall_wrapper.h" },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '\n' +
              '#define __SYSCALL_DEFINEx(x, name, ...)\t\t\t\t\t\\\n' +
              '\tasmlinkage long __arm64_sys##name(const struct pt_regs *regs);\t\t\\\n' +
              '\tALLOW_ERROR_INJECTION(__arm64_sys##name, ERRNO);\t\t\t\\\n' +
              '\tstatic long __se_sys##name(__MAP(x,__SC_LONG,__VA_ARGS__));\t\t\\\n' +
              '\tstatic inline long __do_sys##name(__MAP(x,__SC_DECL,__VA_ARGS__));\t\\\n' +
              '\tasmlinkage long __arm64_sys##name(const struct pt_regs *regs)\t\t\\\n' +
              '\t{\t\t\t\t\t\t\t\t\t\\\n' +
              '\t\treturn __se_sys##name(SC_ARM64_REGS_TO_ARGS(x,__VA_ARGS__));\t\\\n' +
              '\t}\t\t\t\t\t\t\t\t\t\\\n' +
              '\tstatic long __se_sys##name(__MAP(x,__SC_LONG,__VA_ARGS__))\t\t\\' },

          { t: 'table',
            head: ['Tên được sinh ra', 'Vai trò'],
            rows: [
              ['<code>__arm64_sys_write</code>', 'Điểm vào thật, nhận <b>một</b> tham số duy nhất: con trỏ tới khối thanh ghi <code>pt_regs</code>'],
              ['<code>__se_sys_write</code>', '<i>sign extend</i> — mở rộng dấu các tham số 32-bit thành 64-bit cho an toàn'],
              ['<code>__do_sys_write</code>', 'Nơi chứa <b>thân hàm bạn thật sự viết</b> — ba dòng bạn đọc ở bước 3'],
              ['<code>SC_ARM64_REGS_TO_ARGS</code>', 'Macro rút <code>fd</code>, <code>buf</code>, <code>count</code> ra khỏi <code>pt_regs</code>']
            ]},

          { t: 'p', x:
            'Toàn bộ chuỗi biến đổi chỉ có hai chặng, và bạn tra được cả hai bằng một lệnh:' },

          { t: 'code', where: 'wsl',
            code: "grep -n 'define SYSCALL_DEFINE3\\|define SYSCALL_DEFINEx' include/linux/syscalls.h" },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '227:#define SYSCALL_DEFINE3(name, ...) SYSCALL_DEFINEx(3, _##name, __VA_ARGS__)\n' +
              '234:#define SYSCALL_DEFINEx(x, sname, ...)\t\t\t\t\\' },

          { t: 'cal', kind: 'why', title: 'Dòng 227 trả lời câu hỏi bỏ ngỏ ở bước trước: vì sao name lại là _write', x:
            '<p>Ở bước trước bạn đã thấy khẳng định “với <code>name = _write</code> thì ' +
            '<code>__arm64_sys##name</code> trở thành <code>__arm64_sys_write</code>” mà chưa rõ vì sao ' +
            '<code>name</code> lại có dấu <code>_</code> ở đầu. Dòng <b>227</b> chính là câu trả lời: ' +
            '<code>SYSCALL_DEFINE3(write, …)</code> không định nghĩa gì trực tiếp, nó chỉ gọi tiếp ' +
            '<code>SYSCALL_DEFINEx(3, _##name, …)</code> — tự thêm một dấu gạch dưới vào trước tên gốc. ' +
            'Với tên gốc là <code>write</code>, tham số <code>sname</code> mà <code>SYSCALL_DEFINEx</code> ' +
            'ở dòng <b>234</b> nhận được đã là <code>_write</code>, và chính <code>sname</code> đó được ' +
            'truyền tiếp làm <code>name</code> cho macro sinh ký hiệu bạn đọc ở ' +
            '<code>syscall_wrapper.h</code>. Hai dòng ngắn này khép kín toàn bộ chuỗi: ' +
            '<code>write</code> → <code>_write</code> → <code>__arm64_sys_write</code>.</p>' },

          { t: 'fig',
            cap: 'Vì sao grep không tìm thấy __arm64_sys_write: cái tên chỉ xuất hiện sau chặng tiền xử ' +
                 'lý, tức là sau khi grep đã hết việc.',
            svg:
              '<svg viewBox="0 0 720 210" width="720" role="img" aria-label="Sơ đồ ba chặng biến đổi từ SYSCALL_DEFINE3 trong source thành ký hiệu __arm64_sys_write trong file đối tượng">' +
              '<rect class="d-box" x="10" y="20" width="200" height="60" rx="6"/>' +
              '<text class="d-t" x="24" y="40">Source — grep nhìn thấy</text>' +
              '<text class="d-tm" x="24" y="58">fs/read_write.c:746</text>' +
              '<text class="d-tm" x="24" y="73">SYSCALL_DEFINE3(write, …)</text>' +

              '<line class="d-line" x1="212" y1="50" x2="258" y2="50"/>' +
              '<path class="d-arrow" d="M 264 50 l -10 -5 l 0 10 z"/>' +
              '<text class="d-ts" x="214" y="42">cpp</text>' +

              '<rect class="d-box-a" x="266" y="20" width="200" height="60" rx="6"/>' +
              '<text class="d-t" x="280" y="40">Sau tiền xử lý</text>' +
              '<text class="d-tm" x="280" y="58">__SYSCALL_DEFINEx dán</text>' +
              '<text class="d-tm" x="280" y="73">__arm64_sys ## _write</text>' +

              '<line class="d-line" x1="468" y1="50" x2="514" y2="50"/>' +
              '<path class="d-arrow" d="M 520 50 l -10 -5 l 0 10 z"/>' +
              '<text class="d-ts" x="470" y="42">gcc</text>' +

              '<rect class="d-box-g" x="522" y="20" width="190" height="60" rx="6"/>' +
              '<text class="d-t" x="536" y="40">Ký hiệu trong .o</text>' +
              '<text class="d-tm" x="536" y="58">__arm64_sys_write</text>' +
              '<text class="d-ts" x="536" y="73">rồi vào /proc/kallsyms</text>' +

              '<rect class="d-box-w" x="10" y="106" width="702" height="40" rx="6"/>' +
              '<text class="d-t" x="24" y="126">grep chỉ đọc được ô bên trái. Bài 37 đọc được ô bên phải.</text>' +
              '<text class="d-ts" x="24" y="140">Hai bài nhìn cùng một hàm ở hai chặng khác nhau của cùng một quy trình — nên hai cái tên khác nhau.</text>' +

              '<rect class="d-box" x="10" y="160" width="702" height="40" rx="6"/>' +
              '<text class="d-t" x="24" y="180">Cách thoát: bỏ bớt phần bị dán</text>' +
              '<text class="d-tm" x="300" y="180">grep -rn \'__arm64_sys##name\' arch/arm64/</text>' +
              '<text class="d-ts" x="24" y="194">Cùng thủ thuật này còn dùng được cho SYSCALL_DEFINE, EXPORT_SYMBOL, module_param và mọi macro sinh tên khác.</text>' +
              '</svg>' }
        ]},

      /* ── Bước 5 ─────────────────────────────────────────────── */
      { title: 'Ba cách hỏi còn lại: compatible, CONFIG, MAINTAINERS',
        blocks: [

          { t: 'p', x:
            'Cách 1 đã xong ở hai bước trước. Ba cách còn lại, mỗi cách một lệnh — và hãy để ý ' +
            '<b>chúng nối vào nhau thành một chuỗi</b> quanh cùng một thiết bị: con UART PL011 mà QEMU ' +
            'giả lập cho bạn suốt <b>Chặng 05</b>.' },

          { t: 'code', where: 'wsl', name: 'Cách 2 — từ chuỗi compatible tới file driver',
            code: 'grep -rln \'"arm,pl011"\' drivers/' },

          { t: 'cmdx', cmd: 'grep -rln \'"arm,pl011"\' drivers/', title: 'Vì sao là <code>-l</code> chứ không phải <code>-n</code>',
            rows: [
              ['<code>-r</code>', 'Đệ quy xuống mọi thư mục con.'],
              ['<code>-l</code>', 'Chỉ in <b>tên file</b>, không in dòng khớp. Ở bước này bạn cần biết <i>file nào</i>, chưa cần biết dòng nào.'],
              ['<code>\'"arm,pl011"\'</code>', 'Dấu nháy kép <b>nằm trong</b> mẫu tìm, nên chỉ khớp chuỗi ký tự thật trong mã C — loại bỏ mọi câu văn nhắc tới pl011 trong bình luận.'],
              ['<code>drivers/</code>', 'Thu hẹp ngay từ đầu. Chuỗi <code>compatible</code> chỉ được driver khai báo, không nằm ở <code>fs/</code> hay <code>mm/</code>.']
            ]},

          { t: 'code', where: 'out', nocopy: true,
            code: 'drivers/tty/serial/amba-pl011.c' },

          { t: 'cal', kind: 'info', title: 'Đúng một file — và đó là điều bình thường, không phải may mắn', x:
            'Một chuỗi <code>compatible</code> gần như luôn dẫn tới <b>đúng một</b> driver, vì đó là ' +
            'định nghĩa của nó: chuỗi là <b>khoá</b>, driver là <b>giá trị</b>. Ở <b>Chặng 08</b> bạn sẽ ' +
            'đi ngược chiều — thêm một dòng <code>compatible</code> vào device tree và xem nhân tự tìm ' +
            'ra driver. Nếu một chuỗi cho ra <b>không</b> file nào, thì nhân này không có driver cho ' +
            'thiết bị đó, và đó thường là câu trả lời cho “vì sao board của tôi im lặng”.' },

          { t: 'p', x:
            'Chuỗi đó còn có tài liệu riêng, ở dạng <b>binding</b> — một trong 6 009 file mô tả từng ' +
            'thiết bị mà device tree có thể khai báo:' },

          { t: 'code', where: 'wsl',
            code: 'ls Documentation/devicetree/bindings/serial/pl011.yaml' },

          { t: 'code', where: 'out', nocopy: true,
            code: 'Documentation/devicetree/bindings/serial/pl011.yaml' },

          { t: 'p', x:
            'Giờ cách 3: file <code>amba-pl011.c</code> có thật sự nằm trong bản build hay không, và ' +
            'tuỳ chọn nào quyết định điều đó?' },

          { t: 'code', where: 'wsl', name: 'Cách 3 — từ file mã ngược về ký hiệu CONFIG',
            code: "grep -rn 'amba-pl011' drivers/tty/serial/Makefile" },

          { t: 'code', where: 'out', nocopy: true,
            code: '30:obj-$(CONFIG_SERIAL_AMBA_PL011)\t\t+= amba-pl011.o' },

          { t: 'code', where: 'wsl', name: 'Và ký hiệu đó được khai báo ở đâu',
            code: "grep -n -A 4 'config SERIAL_AMBA_PL011' drivers/tty/serial/Kconfig" },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '48:config SERIAL_AMBA_PL011\n' +
              '49-\ttristate "ARM AMBA PL011 serial port support"\n' +
              '50-\tdepends on ARM_AMBA\n' +
              '51-\tselect SERIAL_CORE\n' +
              '52-\thelp\n' +
              '--\n' +
              '59:config SERIAL_AMBA_PL011_CONSOLE\n' +
              '60-\tbool "Support for console on AMBA serial port"\n' +
              '61-\tdepends on SERIAL_AMBA_PL011=y\n' +
              '62-\tselect SERIAL_CORE_CONSOLE\n' +
              '63-\tselect SERIAL_EARLYCON',
            notes: ['Dấu <code>--</code> là cách <code>grep</code> ngăn cách hai vùng khớp rời nhau. ' +
                   'Mẫu tìm của bạn khớp <b>hai</b> mục, và mục thứ hai giải thích một điều bạn đã dùng ' +
                   'mà chưa biết tên.'] },

          { t: 'cal', kind: 'why', title: 'Bốn dòng này giải thích chuỗi console=ttyAMA0 của Chặng 05', x:
            '<p>Đọc mục thứ hai theo đúng thứ tự các dòng:</p>' +
            '<ul>' +
            '<li><code>bool "Support for console on AMBA serial port"</code> — <b>đây</b> là thứ biến ' +
            'một cổng nối tiếp bình thường thành <b>console của nhân</b>. Không có nó, cổng vẫn chạy ' +
            'nhưng log khởi động không đi ra đó, và màn hình QEMU của bạn sẽ trống trơn.</li>' +
            '<li><code>depends on SERIAL_AMBA_PL011=y</code> — chú ý <code>=y</code>, không phải ' +
            '<code>=m</code>. Console phải được <b>dựng thẳng vào nhân</b>, vì nó cần hoạt động ' +
            '<i>trước</i> khi hệ thống file gốc được gắn — mà module thì nằm trên hệ thống file gốc. ' +
            'Một phụ thuộc kỹ thuật gói gọn trong hai ký tự.</li>' +
            '<li><code>select SERIAL_EARLYCON</code> — bật cơ chế console <b>siêu sớm</b>, chạy được ' +
            'ngay cả trước khi phân hệ driver khởi tạo xong. Đây là công cụ số một để gỡ lỗi một board ' +
            'chết im lặng, và <b>Bài 41</b> sẽ dùng nó.</li>' +
            '</ul>' +
            '<p>Bạn vừa đi trọn một vòng: từ một chuỗi trong device tree → file driver → dòng Makefile → ' +
            'ký hiệu CONFIG → và ra lời giải thích cho một tham số bạn đã gõ từ <b>Chặng 05</b> mà chưa ' +
            'hiểu. Đó chính xác là cảm giác của việc “định hướng được trong kernel”.</p>' },

          { t: 'p', x:
            'Cách 4 cuối cùng: ai chịu trách nhiệm ext4, và phân hệ đó gồm những đường dẫn nào?' },

          { t: 'code', where: 'wsl', name: 'Cách 4 — tra MAINTAINERS',
            code: "grep -n -A 11 '^EXT4 FILE SYSTEM$' MAINTAINERS" },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '9377:EXT4 FILE SYSTEM\n' +
              '9378-M:\t"Theodore Ts\'o" <tytso@mit.edu>\n' +
              '9379-M:\tAndreas Dilger <adilger.kernel@dilger.ca>\n' +
              '9380-L:\tlinux-ext4@vger.kernel.org\n' +
              '9381-S:\tMaintained\n' +
              '9382-W:\thttp://ext4.wiki.kernel.org\n' +
              '9383-Q:\thttp://patchwork.ozlabs.org/project/linux-ext4/list/\n' +
              '9384-T:\tgit git://git.kernel.org/pub/scm/linux/kernel/git/tytso/ext4.git\n' +
              '9385-F:\tDocumentation/filesystems/ext4/\n' +
              '9386-F:\tfs/ext4/\n' +
              '9387-F:\tinclude/trace/events/ext4.h\n' +
              '9388-F:\tinclude/uapi/linux/ext4.h' },

          { t: 'cal', kind: 'info', title: 'Đúng dòng S: mà phần lý thuyết bảo bạn đọc trước tiên', x:
            '<p>Dòng <b>9381</b> ghi <code>S:\tMaintained</code> — đây chính là dòng bạn được dặn kiểm ' +
            'tra trước khi cắm đầu vào một driver. Với ext4, tin tốt: có <b>hai</b> maintainer đang hoạt ' +
            'động (<code>tytso@mit.edu</code>, <code>adilger.kernel@dilger.ca</code>), không phải ' +
            '<code>Orphan</code> hay <code>Obsolete</code>.</p>' +
            '<p>Bốn dòng <code>F:</code> chính là câu trả lời cho nửa sau câu hỏi “phân hệ đó gồm những ' +
            'đường dẫn nào”: <code>fs/ext4/</code> — nơi bạn đã đọc mã ở bước 3 — cộng thêm ba đường dẫn ' +
            'khác mà riêng <code>grep -rn</code> trong <code>fs/ext4/</code> sẽ không bao giờ cho bạn ' +
            'thấy, vì chúng nằm ngoài thư mục đó: tài liệu ở ' +
            '<code>Documentation/filesystems/ext4/</code>, và hai header dùng chung ở ' +
            '<code>include/</code>. Đây là điểm khác biệt giữa “biết file nào” (cách 1–3) và “biết cả ' +
            'phân hệ” (cách 4).</p>' },

          { t: 'p', x:
            'Đi chiều ngược lại — có một file, muốn biết nó thuộc phân hệ nào — thì đã có sẵn script ' +
            'trong <code>scripts/</code>:' },

          { t: 'code', where: 'wsl',
            code: './scripts/get_maintainer.pl --nogit --nogit-fallback -f fs/ext4/file.c' },

          { t: 'cmdx', cmd: './scripts/get_maintainer.pl --nogit --nogit-fallback -f fs/ext4/file.c',
            title: 'Vì sao thêm hai tuỳ chọn <code>--nogit</code>',
            rows: [
              ['<code>-f</code>', '<i>file</i> — tham số là một đường dẫn có thật, chứ không phải một file patch (đó mới là cách dùng mặc định của script).'],
              ['<code>--nogit</code>', 'Đừng đào lịch sử commit để đoán thêm “ai hay sửa file này”. Trên kho git đầy đủ, việc đó chậm và cho ra danh sách dài hơn nhiều.'],
              ['<code>--nogit-fallback</code>', 'Và cũng đừng dùng git để đoán bù khi <code>MAINTAINERS</code> không có mục nào khớp. ' +
               '<b>Lưu ý:</b> trên cây giải nén từ tarball (không có <code>.git</code>) script vẫn chạy đúng dù bạn quên hai tuỳ chọn này — nó tự bỏ qua phần git. Ghi rõ chúng ra là để kết quả <b>giống nhau</b> dù bạn đang đứng ở cây nào.']
            ]},

          { t: 'code', where: 'out', nocopy: true,
            code:
              '"Theodore Ts\'o" <tytso@mit.edu> (maintainer:EXT4 FILE SYSTEM)\n' +
              'Andreas Dilger <adilger.kernel@dilger.ca> (maintainer:EXT4 FILE SYSTEM)\n' +
              'linux-ext4@vger.kernel.org (open list:EXT4 FILE SYSTEM)\n' +
              'linux-kernel@vger.kernel.org (open list)' },

          { t: 'cal', kind: 'tip', title: 'Đây là lệnh bạn sẽ chạy trước mỗi lần gửi patch', x:
            'Quy trình gửi một bản vá lên kernel bắt đầu bằng đúng lệnh này (không có ' +
            '<code>--nogit</code>) để biết gửi cho ai và cc vào danh sách nào. Gửi sai địa chỉ là cách ' +
            'nhanh nhất để patch của bạn bị bỏ quên. Bạn không cần nhớ cú pháp — chỉ cần nhớ rằng ' +
            '<b>script này tồn tại</b>, phần còn lại có <code>--help</code>.' }
        ]},

      /* ── Bước 6 ─────────────────────────────────────────────── */
      { title: 'Đo cái giá của một lần tìm — và bản git tuỳ chọn',
        blocks: [

          { t: 'p', x:
            'Bước cuối chứng minh luận điểm chính của bài bằng số. Chạy mỗi lệnh <b>ba lần</b> trước khi ' +
            'đo, để bộ nhớ đệm nóng lên và bạn đo tốc độ công cụ chứ không phải tốc độ ổ đĩa:' },

          { t: 'code', where: 'wsl', name: 'Hỏi kiểu tìm bừa — quét cả 91 120 file',
            code:
              'for i in 1 2 3; do grep -rn ext4_file_write_iter . >/dev/null; done\n' +
              'time grep -rn ext4_file_write_iter . >/dev/null' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '\n' +
              'real\t0m1.362s\n' +
              'user\t0m0.929s\n' +
              'sys\t0m0.433s' },

          { t: 'code', where: 'wsl', name: 'Hỏi có định hướng — quét 51 file',
            code:
              'for i in 1 2 3; do grep -rn ext4_file_write_iter fs/ext4/ >/dev/null; done\n' +
              'time grep -rn ext4_file_write_iter fs/ext4/ >/dev/null' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '\n' +
              'real\t0m0.003s\n' +
              'user\t0m0.003s\n' +
              'sys\t0m0.000s' },

          { t: 'p', x: 'Và điều quan trọng nhất — <b>hai lệnh cho ra kết quả giống hệt nhau</b>:' },

          { t: 'code', where: 'wsl',
            code: 'grep -rn ext4_file_write_iter fs/ext4/' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'fs/ext4/file.c:694:ext4_file_write_iter(struct kiocb *iocb, struct iov_iter *from)\n' +
              'fs/ext4/file.c:966:\t.write_iter\t= ext4_file_write_iter,' },

          { t: 'cal', kind: 'info', title: '454 lần nhanh hơn, cho đúng cùng hai dòng kết quả', x:
            '<p><code>1,362 s ÷ 0,003 s ≈ 454</code>. Quét thêm 91 069 file đổi lại được <b>không thêm ' +
            'thông tin nào</b>.</p>' +
            '<p>Đừng lo nếu con số của bạn không phải 454. Ở mức vài phần nghìn giây, đồng hồ của ' +
            '<code>time</code> đã chạm ngưỡng phân giải của nó — loạt đo trước đó trên cùng máy này cho ' +
            '<code>0,006 s</code>, tức tỉ lệ 230 lần. <b>Bậc độ lớn mới là thứ đáng nhớ: hai bậc.</b> ' +
            'Đây cũng là bài học chung về đo đạc mà bạn sẽ cần suốt <b>Chặng 12</b>: một phép đo ở sát ' +
            'ngưỡng phân giải thì đọc theo <i>bậc</i>, đừng đọc theo <i>chữ số</i>.</p>' },

          { t: 'hr' },

          { t: 'p', x:
            '<b>Phần còn lại của bước này là tuỳ chọn</b> — nó cần thêm khoảng 2 GB đĩa và 95 giây. Bỏ ' +
            'qua cũng không ảnh hưởng gì tới các bài sau. Làm nếu bạn muốn có <code>git grep</code> và ' +
            'muốn tự tay chứng minh hai nguồn source là một.' },

          { t: 'code', where: 'wsl', name: 'Tuỳ chọn — clone nông đúng một phiên bản',
            code:
              'cd ~/bai38\n' +
              'git clone --depth 1 -b v6.18.45 \\\n' +
              '  https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git linux' },

          { t: 'cmdx', cmd: 'git clone --depth 1 -b v6.18.45 …/stable/linux.git linux',
            title: 'Hai tuỳ chọn biến một cú clone 40 phút thành 95 giây',
            rows: [
              ['<code>--depth 1</code>', 'Chỉ lấy <b>một</b> commit, bỏ toàn bộ lịch sử. Kho đầy đủ của Linux có hơn một triệu commit và nặng vài GB.'],
              ['<code>-b v6.18.45</code>', 'Lấy đúng <b>thẻ</b> (tag) này thay vì đầu nhánh. Kết quả là cây source y hệt bản tarball.'],
              ['<code>stable/linux.git</code>', 'Kho <b>stable</b> của Greg Kroah-Hartman — nơi có các thẻ <code>6.18.x</code>. Kho của Linus chỉ có <code>6.18</code>, không có <code>6.18.45</code>.'],
              ['<code>linux</code>', 'Tham số cuối là tên thư mục đích, đặt cho khỏi trùng với <code>linux-6.18.45/</code>.']
            ]},

          { t: 'code', where: 'out', nocopy: true,
            code:
              "Cloning into 'linux'...\n" +
              'warning: refs/tags/v6.18.45 aeffedef5dc074cbdf84b1f0c957beb3f62dce0d is not a commit!\n' +
              "Note: switching to 'bf3be28f6721e24961992ebb9e61c0cf21a56806'.\n" +
              '\n' +
              "You are in 'detached HEAD' state. You can look around, make experimental\n" +
              'changes and commit them, and you can discard any commits you make in this\n' +
              'state without impacting any branches by switching back to a branch.\n' +
              '\n' +
              'Updating files: 100% (91205/91205), done.',
            notes: ['Đã lược bớt phần hướng dẫn dài về <code>git switch</code> và các dòng phần trăm ' +
                   'trung gian. <b>Cả hai thông báo trên đều không phải lỗi</b> — xem bảng “Lỗi thường ' +
                   'gặp” ngay dưới. Trên máy này cả lệnh mất <b>95,1 giây</b>.'] },

          { t: 'code', where: 'wsl', name: 'Cái mà clone nông cho và không cho',
            code:
              'cd linux\n' +
              'git log --oneline\n' +
              'git describe --tags\n' +
              'du -sh .git' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              'bf3be28f6 Linux 6.18.45\n' +
              'v6.18.45\n' +
              '282M\t.git',
            notes: ['<b>Đúng một</b> commit. <code>git log</code>, <code>git blame</code>, ' +
                   '<code>git bisect</code> vì thế đều vô dụng ở đây — đổi lại bạn tiết kiệm hàng GB và ' +
                   'hàng chục phút. Cái bạn thật sự nhận được là <code>git grep</code>.'] },

          { t: 'code', where: 'wsl', name: 'git grep, cũng đo ở lần chạy thứ tư',
            code:
              'for i in 1 2 3; do git grep -n ext4_file_write_iter >/dev/null; done\n' +
              'time git grep -n ext4_file_write_iter >/dev/null' },

          { t: 'code', where: 'out', nocopy: true,
            code:
              '\n' +
              'real\t0m1.094s\n' +
              'user\t0m0.482s\n' +
              'sys\t0m2.344s',
            notes: ['Để ý <code>sys</code> (2,344 s) lớn hơn <code>real</code> (1,094 s): ' +
                   '<code>git grep</code> chạy nhiều luồng song song. Nó nhanh hơn ' +
                   '<code>grep</code> quét cả cây khoảng <b>1,3 lần</b> — trong khi thu hẹp về ' +
                   '<code>fs/ext4/</code> nhanh hơn <b>hàng trăm lần</b>. Công cụ không cứu được câu hỏi ' +
                   'đặt sai.'] },

          { t: 'p', x:
            'Và phần thưởng cuối cùng: <b>chứng minh</b> hai cây source là một, thay vì tin lời người ' +
            'khác. <code>diff -rq</code> so từng file của hai thư mục:' },

          { t: 'code', where: 'wsl',
            code:
              'cd ~/bai38\n' +
              'time diff -rq --no-dereference linux-6.18.45 linux -x .git' },

          { t: 'cmdx', cmd: 'diff -rq --no-dereference linux-6.18.45 linux -x .git',
            title: 'Ba tuỳ chọn, mỗi cái tránh một bẫy',
            rows: [
              ['<code>-r</code>', 'Đệ quy — so cả cây, không chỉ các file ở tầng trên cùng.'],
              ['<code>-q</code>', '<i>quiet</i> — chỉ báo <b>file nào khác nhau</b>, không in nội dung khác nhau. Không có nó, output có thể lên tới hàng triệu dòng.'],
              ['<code>--no-dereference</code>', 'So <b>bản thân liên kết tượng trưng</b> chứ không đi theo nó. Cây kernel có <b>85</b> liên kết như vậy; thiếu tuỳ chọn này, <code>diff</code> có thể báo khác nhau chỉ vì đích của liên kết được đọc theo đường dẫn khác.'],
              ['<code>-x .git</code>', 'Loại trừ thư mục <code>.git</code> — nó chỉ có ở một bên, và nó không phải source.']
            ]},

          { t: 'code', where: 'out', nocopy: true,
            code:
              '\n' +
              'real\t0m21.518s\n' +
              'user\t0m0.497s\n' +
              'sys\t0m20.896s',
            notes: ['<b>Không một dòng nào</b> trước phần thời gian — nghĩa là không có một file nào ' +
                   'khác biệt. Lần chạy đầu tiên khi bộ nhớ đệm còn lạnh mất <b>1 phút 8,9 giây</b>; ' +
                   'con số 21,5 s ở trên là lần chạy sau. Chú ý <code>sys</code> gần bằng toàn bộ ' +
                   '<code>real</code>: công việc ở đây gần như hoàn toàn là đọc file, chứ không phải tính toán.'] },

          { t: 'cal', kind: 'info', title: 'Bạn vừa tự kiểm chứng một điều thường chỉ được nghe kể', x:
            '<p>Tarball tải từ CDN của kernel.org và cây git clone từ máy chủ git của kernel.org là ' +
            '<b>hai đường mạng khác nhau, hai định dạng khác nhau, hai công cụ khác nhau</b> — và cho ra ' +
            'kết quả giống nhau đến từng byte trên 91 120 file. Cộng với chữ ký GPG ở bước 1, bạn có ' +
            'quyền tin cây source trên máy mình.</p>' +
            '<p>Còn một chi tiết nhỏ đáng để ý, vì nó sẽ làm bạn bối rối nếu gặp lần đầu: ' +
            '<code>find . -type f</code> đếm được <b>91 120</b> file, còn <code>git ls-files</code> ' +
            'đếm <b>91 205</b>. Chênh đúng <b>85</b> — chính là 85 liên kết tượng trưng, thứ mà ' +
            '<code>-type f</code> không tính còn git thì có theo dõi. Hai con số khác nhau, không con ' +
            'số nào sai; chúng chỉ đang trả lời hai câu hỏi khác nhau. Muốn tự kiểm: ' +
            '<code>find . -type l | wc -l</code>.</p>' }
        ]}

    ]},

    /* ══════════════════════════════════════════════════════════════════
       7. Lỗi thường gặp
       ══════════════════════════════════════════════════════════════════ */

    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Bốn dòng đầu bảng này <b>không phải lỗi</b> — chúng là thông báo bình thường mà người mới hay ' +
      'hiểu nhầm thành lỗi, rồi mất hàng giờ để “sửa” một thứ vốn đang chạy đúng.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>gpg: WARNING: This key is not certified with a trusted signature!</code>',
         '<b>Không phải lỗi.</b> Chữ ký hợp lệ; chỉ là bạn chưa tự xác nhận rằng khoá này đúng là của Greg Kroah-Hartman',
         'Đọc dòng <code>Good signature</code> ngay trên nó — đó mới là kết luận. Đối chiếu vân tay <code>647F 2865 4894 E3BD …</code> với kernel.org. <b>Đừng</b> chạy <code>gpg --lsign-key</code> chỉ để tắt cảnh báo'],

        ['<code>warning: refs/tags/v6.18.45 … is not a commit!</code>',
         '<b>Không phải lỗi.</b> <code>v6.18.45</code> là <i>annotated tag</i> — một đối tượng git riêng trỏ tới commit, chứ không phải chính commit. Với <code>--depth 1</code> git nhắc điều đó',
         'Bỏ qua. Kiểm bằng <code>git describe --tags</code> — phải ra <code>v6.18.45</code>'],

        ['<code>You are in \'detached HEAD\' state.</code>',
         '<b>Không phải lỗi.</b> Bạn clone theo một thẻ nên HEAD không gắn với nhánh nào',
         'Bỏ qua nếu chỉ đọc source. Chỉ cần quan tâm khi định commit — lúc đó <code>git switch -c ten-nhanh</code>'],

        ['<code>grep</code> không in gì, <code>echo $?</code> cho <b>1</b>',
         '<b>Không phải lỗi.</b> Mã thoát 1 nghĩa là “tìm xong, không khớp”. Mã <b>2</b> mới là lỗi thật',
         'Nếu ký hiệu chắc chắn tồn tại (thấy trong <code>/proc/kallsyms</code> hoặc trong call trace) thì rất có thể nó do macro sinh: bỏ bớt tiền tố/hậu tố rồi tìm lại — bước 4'],

        ['<code>gpg: BAD signature from "Greg Kroah-Hartman &lt;gregkh@kernel.org&gt;"</code>',
         'Bạn đưa file <code>.tar.xz</code> cho <code>gpg</code>. Chữ ký được tính trên bản <code>.tar</code> <b>chưa nén</b>',
         '<code>xz -cd linux-6.18.45.tar.xz | gpg --verify linux-6.18.45.tar.sign -</code>'],

        ['<code>gpg: no signed data</code> · <code>gpg: can\'t hash datafile: No data</code>',
         'Đúng lệnh nhưng <b>quên dấu <code>-</code></b> ở cuối, nên <code>gpg</code> không biết dữ liệu nằm ở luồng vào chuẩn',
         'Thêm dấu <code>-</code> vào cuối lệnh'],

        ['<code>gpg: Can\'t check signature: No public key</code>',
         'Chưa có khoá công khai của người ký trong keyring',
         '<code>gpg --locate-keys torvalds@kernel.org gregkh@kernel.org</code> rồi kiểm lại'],

        ['<code>tar: linux-6.18.45.tar.xz: Cannot open: No such file or directory</code>',
         'Bạn đang đứng ở thư mục khác',
         '<code>cd ~/bai38</code> rồi chạy lại. Kiểm bằng <code>pwd</code> và <code>ls</code>'],

        ['<code>grep: nosuchdir/: No such file or directory</code>',
         'Gõ sai tên thư mục, hoặc quên <code>cd linux-6.18.45</code>',
         'Sửa đường dẫn. Lưu ý <code>grep</code> vẫn có thể trả mã thoát <b>0</b> nếu một tham số khác vẫn khớp — nên phải <b>đọc thông báo</b>, đừng chỉ nhìn mã thoát'],

        ['Máy như treo hàng chục giây ở lần <code>grep</code> đầu tiên',
         'Bộ nhớ đệm trang còn lạnh: lần đầu phải đọc thật 1,7 GB từ đĩa. Đo được <b>36,7 s</b> ở lần một so với <b>1,4 s</b> ở lần ba',
         'Bình thường. Chạy ba lần rồi mới đo — và tốt hơn nữa là thu hẹp phạm vi để không phải đọc 1,7 GB'],

        ['<code>No space left on device</code> khi giải nén',
         'Cây source cần <b>1,7 GB</b>, bản clone thêm <b>2,0 GB</b> nữa',
         '<code>df -h ~</code> để xem còn bao nhiêu. Bỏ phần git tuỳ chọn nếu chật; xoá bằng <code>rm -rf ~/bai38/linux</code>']
      ]},

    /* ══════════════════════════════════════════════════════════════════
       8. Tóm tắt
       ══════════════════════════════════════════════════════════════════ */

    { t: 'recap', title: 'Tóm tắt Bài 38', items: [
      'Cây kernel 6.18.45 có <b>91 120 file</b>, <b>1,7 GB</b>, <b>36 277 772 dòng</b> mã C/H/S. Đọc hết mất hơn <b>3 000 giờ</b> — nên thứ phải học là <b>định hướng</b>, không phải đọc.',
      'kernel.org cho hai đường: <b>tarball</b> (147 MB, kiểm được bằng chữ ký GPG) và <b>git clone --depth 1</b> (95 s, cho <code>git grep</code>). Bạn đã chứng minh hai cây <b>giống nhau đến từng byte</b> bằng <code>diff -rq</code>.',
      'Chữ ký ký lên bản <code>.tar</code> <b>chưa nén</b>, nên phải <code>xz -cd … | gpg --verify ….tar.sign -</code>. Dấu <code>-</code> cuối lệnh là mấu chốt; <code>Good signature</code> là dòng cần tìm, còn WARNING “not certified” trả lời một câu hỏi khác và không được tắt bằng cách nói dối.',
      '<b>Bản đồ theo kích thước:</b> <code>drivers/</code> 1,1 GB (65 % cả cây) · <code>arch/</code> 161 M · <code>fs/</code> 49 M · <code>kernel/</code> 16 M · <code>mm/</code> 6,1 M · <code>init/</code> chỉ <b>228 KB</b>. To không có nghĩa là quan trọng, nhỏ không có nghĩa là dễ.',
      '<b>Bốn cách hỏi cây source:</b> từ <b>tên ký hiệu</b> (neo bằng <code>^</code>, vì coding style bắt kiểu trả về đứng đầu dòng) · từ <b>chuỗi <code>compatible</code></b> (khoá duy nhất nối device tree với driver) · từ <b>ký hiệu <code>CONFIG_</code></b> (Kconfig khai báo, <code>obj-$(CONFIG_X) += y.o</code> nối với file mã) · từ <b>tên phân hệ</b> (<code>MAINTAINERS</code> với 9 184 dòng <code>F:</code>, và <code>scripts/get_maintainer.pl</code>).',
      'Bảy cái tên của <b>Bài 37</b> giờ có địa chỉ: <code>fs/read_write.c:746 · 727 · 666</code>, <code>arch/x86/entry/entry_64.S:87</code>, <code>arch/arm64/kernel/entry-common.c:743</code>, <code>arch/arm64/kernel/syscall.c:38</code>, <code>fs/ext4/file.c:694</code>. Bảng <code>ext4_file_operations</code> ở <code>fs/ext4/file.c:963</code> chính là “bảng phương thức ảo” mà Bài 37 mô tả.',
      '<code>__arm64_sys_write</code> <b>không có trong source</b>: nó do macro <code>__SYSCALL_DEFINEx</code> dán ra bằng toán tử <code>##</code>. Quy tắc: ký hiệu có trong <code>/proc/kallsyms</code> mà <code>grep</code> cả cây không ra ⇒ <b>tên do macro sinh</b>, hãy tìm phần chung.',
      'Cùng một câu hỏi, cùng <b>hai dòng kết quả</b>: quét cả cây <b>1,362 s</b>, quét <code>fs/ext4/</code> <b>0,003 s</b> — cách nhau <b>hai bậc độ lớn</b>. Đổi công cụ (<code>git grep</code>) chỉ được <b>1,3 lần</b>. <b>Thu hẹp câu hỏi thắng đổi công cụ.</b>'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo', x:
      'Bạn đã có cây source và biết cách hỏi nó. Hai lần trong bài này bạn đã đụng phải cùng một bức ' +
      'tường: <code>obj-$(CONFIG_SERIAL_AMBA_PL011)</code> quyết định file <code>amba-pl011.c</code> có ' +
      'được biên dịch hay không, và <code>depends on SERIAL_AMBA_PL011=y</code> quyết định console có ' +
      'sống trước khi rootfs được gắn hay không — nhưng bạn <b>chưa hề có</b> file <code>.config</code> ' +
      'nào để tra. <b>Bài 39</b> lấp đúng chỗ trống đó: cơ chế Kconfig, <code>defconfig</code> → ' +
      '<code>.config</code> → <code>olddefconfig</code> → <code>savedefconfig</code>, giao diện ' +
      '<code>menuconfig</code>, và khác biệt thật sự giữa ba lựa chọn <code>y</code> / <code>m</code> / ' +
      '<code>n</code> mà bạn vừa gặp trên lý thuyết. Giữ nguyên thư mục ' +
      '<code>~/bai38/linux-6.18.45</code> — bài sau chạy thẳng trong đó.' },

  ],

  /* ══════════════════════════════════════════════════════════════════
     Quiz
     ══════════════════════════════════════════════════════════════════ */

  quiz: [
    { q: 'Vì sao phải chạy <code>xz -cd linux-6.18.45.tar.xz | gpg --verify linux-6.18.45.tar.sign -</code> thay vì đưa thẳng file <code>.tar.xz</code> cho <code>gpg</code>?',
      opts: [
        '<code>gpg</code> không đọc được file nén, nó chỉ làm việc với văn bản thuần',
        'Chữ ký được tính trên nội dung file <code>.tar</code> chưa nén, nên phải giải nén ra luồng rồi mới kiểm',
        'Đường ống giúp kiểm nhanh hơn vì không phải ghi file tạm ra đĩa',
        'Vì file <code>.tar.xz</code> tải từ CDN nên không đáng tin bằng bản giải nén'
      ],
      a: 1,
      why: 'Chữ ký ký lên bản <code>.tar</code> <b>chưa nén</b>. Lý do là thuật toán nén thay đổi theo ' +
           'thời gian (gzip → bzip2 → xz), và nén lại cùng nội dung bằng phiên bản khác cho ra byte ' +
           'khác — ký lên thứ không đổi thì chữ ký sống lâu hơn công cụ nén. Đưa nhầm file <code>.xz</code> ' +
           'sẽ ra <code>BAD signature</code>, và đó <b>không</b> có nghĩa là file hỏng. Việc tiết kiệm ' +
           '1,7 GB đĩa nhờ đường ống là lợi ích phụ, không phải lý do.' },

    { q: 'Bạn thấy <code>__arm64_sys_write</code> trong một call trace của kernel panic, nhưng <code>grep -rn \'__arm64_sys_write\' .</code> trên cả cây source không ra dòng nào và <code>$?</code> bằng 1. Nguyên nhân đúng nhất là gì?',
      opts: [
        'Cây source giải nén bị thiếu file — nên tải lại và kiểm chữ ký',
        'Bạn tải nhầm phiên bản kernel; hàm này chỉ có ở phiên bản khác',
        'Tên đó do macro sinh ra bằng toán tử nối <code>##</code>, nên nó chỉ tồn tại sau khi biên dịch',
        '<code>grep</code> mặc định bỏ qua file <code>.h</code>, mà hàm này được khai trong header'
      ],
      a: 2,
      why: '<code>__SYSCALL_DEFINEx</code> trong <code>arch/arm64/include/asm/syscall_wrapper.h</code> ' +
           'viết <code>__arm64_sys##name</code>. Bộ tiền xử lý dán <code>__arm64_sys</code> với ' +
           '<code>_write</code> thành một định danh duy nhất, nên chuỗi ký tự đầy đủ <b>không hề có mặt</b> ' +
           'trong bất kỳ file nguồn nào — nó xuất hiện lần đầu ở file <code>.o</code>, rồi mới vào bảng ký ' +
           'hiệu. Quy tắc chung: ký hiệu có trong <code>/proc/kallsyms</code> mà grep cả cây không ra thì ' +
           'gần như chắc chắn là tên do macro sinh — hãy bỏ bớt tiền tố hoặc hậu tố và tìm phần chung. ' +
           '<code>$? = 1</code> chỉ nghĩa là “không khớp”, không phải lỗi.' },

    { q: 'Trong <code>drivers/tty/serial/Makefile</code> có dòng <code>obj-$(CONFIG_SERIAL_AMBA_PL011) += amba-pl011.o</code>. Nếu <code>.config</code> <b>không có</b> dòng nào cho ký hiệu đó thì điều gì xảy ra?',
      opts: [
        'Build dừng lại với lỗi “undefined variable”',
        'File được biên dịch mặc định thành module <code>.ko</code>',
        'Biến thành chuỗi rỗng nên dòng trở thành <code>obj- += amba-pl011.o</code>, và file không được biên dịch',
        'File vẫn được biên dịch nhưng bị loại ở bước liên kết'
      ],
      a: 2,
      why: 'Make thay một biến chưa đặt bằng <b>chuỗi rỗng</b> và không báo lỗi. Dòng trở thành ' +
           '<code>obj- += amba-pl011.o</code> — một biến tên <code>obj-</code> mà hệ thống build không ' +
           'bao giờ đọc, nên file đơn giản là bị bỏ qua. Ba trường hợp <code>y</code>, <code>m</code> và ' +
           '“không có” cho ba kết quả hoàn toàn khác nhau mà không có cảnh báo nào. Vì thế khi hỏi ' +
           '“file này có nằm trong bản build của tôi không”, phải tra <code>.config</code> chứ đừng đoán.' },

    { q: 'Vì sao <code>grep -rn \'^ssize_t vfs_write\' fs/</code> tìm ra định nghĩa hàm, còn <code>grep -rn \'vfs_write\' fs/</code> thì ra rất nhiều dòng nhiễu?',
      opts: [
        'Dấu <code>^</code> bảo grep chỉ tìm trong file <code>.c</code>, bỏ qua header và tài liệu',
        'Coding style của kernel bắt định nghĩa hàm bắt đầu ngay đầu dòng, còn lời gọi luôn nằm trong thân hàm khác nên bị thụt lề',
        'Dấu <code>^</code> làm grep chỉ lấy kết quả khớp đầu tiên trong mỗi file',
        'Vì <code>ssize_t</code> là từ khoá nên grep ưu tiên các dòng khai báo kiểu'
      ],
      a: 1,
      why: 'Đây là ví dụ đẹp về việc một <b>quy ước trình bày</b> biến thành một <b>công cụ tìm kiếm</b>. ' +
           '<code>Documentation/process/coding-style.rst</code> bắt kiểu trả về và tên hàm nằm ngay đầu ' +
           'dòng khi <i>định nghĩa</i>; mọi <i>lời gọi</i> đều nằm trong thân một hàm khác nên bắt đầu ' +
           'bằng tab. Dấu <code>^</code> — “khớp từ đầu dòng” — tách được hai loại đó mà không cần công cụ ' +
           'đánh chỉ mục nào. Đó cũng là một lý do rất thực dụng khiến kernel khắt khe với coding style.' },

    { q: 'Bạn đo cùng một lệnh <code>grep</code> trên cây source ba lần liên tiếp và được 36,7 s → 4,1 s → 1,4 s. Kết luận nào đúng?',
      opts: [
        'Máy đang bị quá tải; nên đóng bớt ứng dụng rồi đo lại từ đầu',
        'Bộ nhớ đệm trang (page cache) giữ dần nội dung file trong RAM, nên phải chạy vài lần rồi mới lấy con số ổn định',
        '<code>grep</code> tự xây chỉ mục sau lần chạy đầu nên các lần sau nhanh hơn',
        'Số đo đầu tiên mới đúng, vì nó phản ánh tình huống thực tế của người dùng'
      ],
      a: 1,
      why: 'Lần đầu, mỗi file phải đọc thật từ đĩa; sau đó nhân giữ nội dung trong page cache nên grep ' +
           'gần như chỉ còn tốn CPU. <code>grep</code> <b>không</b> có chỉ mục nào — nó đọc lại toàn bộ ' +
           'mỗi lần. Vì cây source nặng 1,7 GB còn WSL2 trên máy này chỉ có khoảng 4,8 GB RAM, quét xen ' +
           'kẽ hai cây lớn sẽ khiến <i>lần nào cũng là lần đầu</i>. Quy tắc: chạy ba lần, lấy con số cuối, ' +
           'và ghi rõ điều kiện đo — nếu không bạn đang đo tốc độ đĩa chứ không phải tốc độ công cụ.' },

    { q: 'Trên cây tarball <code>find . -type f | wc -l</code> cho <b>91 120</b>, còn <code>git ls-files | wc -l</code> trên bản clone cho <b>91 205</b> — dù <code>diff -rq</code> khẳng định hai cây giống hệt nhau. Vì sao?',
      opts: [
        'Bản clone git có thêm 85 file cấu hình mà tarball loại bỏ khi đóng gói',
        'Cây source có 85 liên kết tượng trưng; <code>-type f</code> không đếm chúng còn git thì có theo dõi',
        '<code>diff -rq</code> bỏ sót vì tuỳ chọn <code>-x .git</code> loại luôn 85 file khác',
        'Git đếm cả các file bị <code>.gitignore</code> loại trừ, còn <code>find</code> thì không'
      ],
      a: 1,
      why: 'Hai lệnh trả lời <b>hai câu hỏi khác nhau</b>, và không lệnh nào sai. <code>-type f</code> ' +
           'nghĩa là “file thường”, cố tình loại liên kết tượng trưng; git thì theo dõi liên kết tượng ' +
           'trưng như một đối tượng bình thường. Chênh lệch đúng bằng <code>find . -type l | wc -l</code> ' +
           '= 85. Bài học chung khi đối chiếu hai con số: trước khi kết luận “có gì đó sai”, hãy kiểm xem ' +
           'hai công cụ có đang định nghĩa cùng một thứ hay không.' }
  ]
});

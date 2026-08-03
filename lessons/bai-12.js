/* ═══════════════════════════════════════════════════════════════
   BÀI 12 — Quản lý gói
   Chặng 01 · Linux căn bản
   ═══════════════════════════════════════════════════════════════ */

Lesson.register({
  id: 'bai-12',
  title: 'Quản lý gói',
  minutes: 50,
  practice: 'Thực hành 30 phút',
  level: 'Người mới bắt đầu',

  intro:
    'Máy này đang có <b>776 gói phần mềm</b> đã cài, chiếm <b>2 524,9 MB</b>. Bạn chưa từng ' +
    'tự tay đặt một file nào trong số đó vào đúng chỗ của nó — <code>apt</code> làm hết. ' +
    'Nhưng nếu bạn không biết nó làm gì thì ngày <code>apt</code> gãy, bạn sẽ bó tay; mà nó ' +
    'sẽ gãy, thường vào lúc bận nhất. Bài này mở nắp hệ thống quản lý gói ra xem bên trong: ' +
    'một file <code>.deb</code> thật sự chứa gì, sổ sách nằm ở đâu, vì sao phải có khoá GPG, ' +
    'và làm gì khi cây phụ thuộc gãy. Bạn sẽ tự tay tháo tung một gói, tự tay làm gãy nó, rồi ' +
    'tự tay sửa. Với người làm nhúng, đây còn là bước chuẩn bị cho Chặng 11: Buildroot và ' +
    'Yocto chính là "apt" mà bạn tự dựng cho thiết bị của mình.',

  goals: [
    'Phân biệt vai trò của <code>dpkg</code> và <code>apt</code>, và biết khi nào phải dùng cái nào',
    'Tháo một file <code>.deb</code> thành các thành phần và đọc được file <code>control</code>',
    'Tra ngược từ một file bất kỳ trên đĩa về gói đã cài nó, và ngược lại',
    'Giải thích chuỗi tin cậy từ khoá GPG tới từng file được cài',
    'Tự tay tạo ra một tình huống phụ thuộc gãy rồi sửa nó bằng <code>apt --fix-broken</code>',
    'Lấy mã nguồn của một gói bằng <code>apt-get source</code> và đọc thư mục <code>debian/</code>'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. HAI TẦNG
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Hai tầng: dpkg làm, apt nghĩ' },

    { t: 'p', x:
      'Rất nhiều người dùng Ubuntu nhiều năm mà vẫn tưởng <code>apt</code> và <code>dpkg</code> ' +
      'là hai cách gõ khác nhau của cùng một thứ. Không phải. Chúng là <b>hai tầng chồng lên ' +
      'nhau</b>, và hiểu ranh giới giữa chúng là chìa khoá để gỡ mọi sự cố về gói.' },

    { t: 'table',
      head: ['', '<code>dpkg</code>', '<code>apt</code>'],
      rows: [
        ['Làm gì', 'Cài / gỡ <b>một</b> file <code>.deb</code> đã có sẵn trên đĩa', 'Tìm gói ở đâu, cần thêm gói nào, tải về, rồi <b>gọi <code>dpkg</code></b>'],
        ['Có biết Internet không', '<b>Không.</b> Nó chưa từng nghe tới kho phần mềm', 'Có. Toàn bộ việc của nó là làm việc với kho'],
        ['Có giải phụ thuộc không', '<b>Không.</b> Chỉ <b>kiểm tra</b> rồi báo lỗi nếu thiếu', 'Có. Đây chính là lý do nó tồn tại'],
        ['Ghi sổ ở đâu', '<code>/var/lib/dpkg/</code> — sổ gốc của cả hệ thống', 'Không có sổ riêng. Nó đọc sổ của dpkg'],
        ['Khi nào bạn dùng trực tiếp', 'Khi có sẵn file <code>.deb</code>, hoặc khi cần tra cứu sổ sách', 'Gần như mọi lúc còn lại']
      ]},

    { t: 'fig',
      cap: 'apt là tầng lập kế hoạch, dpkg là tầng thi hành. Mọi thay đổi trên đĩa đều đi qua dpkg — kể cả khi bạn gõ apt.',
      svg:
        '<svg viewBox="0 0 720 290" width="720" role="img" aria-label="Sơ đồ hai tầng: apt lập kế hoạch và tải gói, dpkg cài đặt và ghi sổ">' +
        '<rect class="d-box-a" x="20" y="18" width="200" height="46" rx="6"/>' +
        '<text class="d-t" x="120" y="40" text-anchor="middle">KHO PHẦN MỀM</text>' +
        '<text class="d-ts" x="120" y="56" text-anchor="middle">archive.ubuntu.com</text>' +

        '<rect class="d-box-p" x="20" y="96" width="200" height="78" rx="6"/>' +
        '<text class="d-t" x="120" y="118" text-anchor="middle">apt</text>' +
        '<text class="d-ts" x="120" y="136" text-anchor="middle">tra chỉ mục · giải phụ thuộc</text>' +
        '<text class="d-ts" x="120" y="152" text-anchor="middle">kiểm chữ ký · tải về</text>' +
        '<text class="d-ts" x="120" y="168" text-anchor="middle">rồi gọi dpkg</text>' +
        '<line class="d-line" x1="120" y1="64" x2="120" y2="90"/>' +
        '<path class="d-arrow" d="M120 90 l-4 -8 h8 z"/>' +
        '<text class="d-ts" x="128" y="82">tải .deb</text>' +

        '<rect class="d-box-p" x="20" y="206" width="200" height="66" rx="6"/>' +
        '<text class="d-t" x="120" y="228" text-anchor="middle">dpkg</text>' +
        '<text class="d-ts" x="120" y="246" text-anchor="middle">bung file ra đĩa</text>' +
        '<text class="d-ts" x="120" y="262" text-anchor="middle">chạy script · ghi sổ</text>' +
        '<line class="d-line" x1="120" y1="174" x2="120" y2="200"/>' +
        '<path class="d-arrow" d="M120 200 l-4 -8 h8 z"/>' +

        '<rect class="d-box" x="270" y="96" width="200" height="78" rx="6"/>' +
        '<text class="d-t" x="370" y="120" text-anchor="middle">/var/lib/apt/lists/</text>' +
        '<text class="d-ts" x="370" y="140" text-anchor="middle">chỉ mục tải về bằng</text>' +
        '<text class="d-ts" x="370" y="156" text-anchor="middle">apt update</text>' +
        '<line class="d-line" x1="220" y1="135" x2="264" y2="135"/>' +
        '<path class="d-arrow" d="M264 135 l-8 -4 v8 z"/>' +

        '<rect class="d-box" x="270" y="206" width="200" height="66" rx="6"/>' +
        '<text class="d-t" x="370" y="230" text-anchor="middle">/var/lib/dpkg/</text>' +
        '<text class="d-ts" x="370" y="250" text-anchor="middle">status · info/ · 3228 file</text>' +
        '<line class="d-line" x1="220" y1="239" x2="264" y2="239"/>' +
        '<path class="d-arrow" d="M264 239 l-8 -4 v8 z"/>' +

        '<rect class="d-box-g" x="520" y="206" width="180" height="66" rx="6"/>' +
        '<text class="d-t" x="610" y="230" text-anchor="middle">HỆ THỐNG FILE</text>' +
        '<text class="d-ts" x="610" y="250" text-anchor="middle">/usr/bin · /etc · /lib</text>' +
        '<line class="d-line" x1="470" y1="239" x2="514" y2="239"/>' +
        '<path class="d-arrow" d="M514 239 l-8 -4 v8 z"/>' +

        '<rect class="d-box-w" x="520" y="96" width="180" height="78" rx="6"/>' +
        '<text class="d-t" x="610" y="118" text-anchor="middle">KHOÁ GPG</text>' +
        '<text class="d-ts" x="610" y="138" text-anchor="middle">/usr/share/keyrings</text>' +
        '<text class="d-ts" x="610" y="156" text-anchor="middle">gốc của chuỗi tin cậy</text>' +
        '<line class="d-line" x1="514" y1="135" x2="476" y2="135"/>' +
        '<path class="d-arrow" d="M476 135 l8 -4 v8 z"/>' +
        '</svg>' },

    { t: 'cal', kind: 'why', title: 'Vì sao tách làm hai tầng thay vì một chương trình duy nhất', x:
      '<p>Đây không phải di sản lịch sử, đó là <b>một quyết định kiến trúc</b> mà bạn sẽ gặp ' +
      'lại suốt chặng đường phía trước.</p>' +
      '<p><code>dpkg</code> nhỏ, không cần mạng, không cần thư viện phức tạp — nên nó chạy được ' +
      'trong mọi hoàn cảnh, kể cả khi hệ thống đang hỏng. Phần "thông minh" nằm hết ở tầng ' +
      'trên, nơi có thể thay thế được: ngoài <code>apt</code> còn có <code>aptitude</code>, ' +
      '<code>synaptic</code>, các cửa hàng ứng dụng đồ hoạ — tất cả đều gọi xuống cùng một ' +
      '<code>dpkg</code>.</p>' +
      '<p>Đúng triết lý Unix của Bài 10: <b>công cụ nhỏ làm một việc, ghép lại thành công cụ ' +
      'lớn</b>. Bạn sẽ thấy lại đúng mô hình này ở Chặng 11, khi Buildroot đóng vai "apt" còn ' +
      'các file <code>.mk</code> đóng vai "dpkg".</p>' },

    { t: 'cal', kind: 'info', title: 'Trên thiết bị nhúng thật, thường không có tầng nào cả', x:
      '<p>Một router hay một máy đo công nghiệp chạy Linux thường <b>không có apt, không có ' +
      'dpkg</b>. Toàn bộ hệ thống file được dựng sẵn ở nhà máy, nén lại thành một ảnh chỉ đọc ' +
      'và nạp nguyên khối vào flash.</p>' +
      '<p>Lý do: quản lý gói cần thêm hàng chục megabyte, cần sổ sách ghi được, và cần một cây ' +
      'phụ thuộc có thể gãy ngay trên thiết bị của khách hàng — ba thứ mà thiết bị nhúng đều ' +
      'không muốn.</p>' +
      '<p>Nhưng công việc <b>chọn gói nào, ghép ra sao, phụ thuộc thế nào</b> vẫn phải có người ' +
      'làm. Nó chuyển sang máy build và mang tên <b>Buildroot</b> hoặc <b>Yocto</b>. Học ' +
      '<code>apt</code> hôm nay chính là học trước mô hình tư duy đó.</p>' },

    /* ══════════════════════════════════════════════
       2. GIẢI PHẪU MỘT GÓI
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Một file .deb thật ra là gì' },

    { t: 'p', x:
      'Câu trả lời làm nhiều người ngạc nhiên: một file <code>.deb</code> chỉ là một ' +
      '<b>kho lưu trữ <code>ar</code></b> — định dạng cổ xưa dùng cho thư viện tĩnh ' +
      '<code>.a</code> mà bạn sẽ gặp lại ở Bài 17 — chứa đúng <b>ba</b> thành phần.' },

    { t: 'fig',
      cap: 'Ba thành phần của một gói .deb. data là thứ được đổ ra đĩa, control là thứ dpkg đọc để biết cách đối xử với nó.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Cấu trúc một file deb gồm debian-binary, control.tar.zst và data.tar.zst">' +
        '<rect class="d-box-p" x="20" y="18" width="680" height="34" rx="4"/>' +
        '<text class="d-tm" x="34" y="40">tree_2.3.1-1_amd64.deb   =   kho ar   =   3 thanh phan</text>' +

        '<rect class="d-box" x="20" y="76" width="200" height="120" rx="6"/>' +
        '<text class="d-tm" x="120" y="98" text-anchor="middle">debian-binary</text>' +
        '<text class="d-ts" x="120" y="120" text-anchor="middle">4 byte</text>' +
        '<text class="d-tm" x="120" y="140" text-anchor="middle">"2.0"</text>' +
        '<text class="d-ts" x="120" y="164" text-anchor="middle">phiên bản định dạng</text>' +
        '<text class="d-ts" x="120" y="182" text-anchor="middle">gói, chỉ vậy thôi</text>' +

        '<rect class="d-box-a" x="240" y="76" width="200" height="120" rx="6"/>' +
        '<text class="d-tm" x="340" y="98" text-anchor="middle">control.tar.zst</text>' +
        '<text class="d-ts" x="340" y="120" text-anchor="middle">737 byte</text>' +
        '<text class="d-ts" x="340" y="142" text-anchor="middle">control: tên, phiên bản,</text>' +
        '<text class="d-ts" x="340" y="158" text-anchor="middle">phụ thuộc, mô tả</text>' +
        '<text class="d-ts" x="340" y="176" text-anchor="middle">md5sums · script cài/gỡ</text>' +

        '<rect class="d-box-g" x="460" y="76" width="240" height="120" rx="6"/>' +
        '<text class="d-tm" x="580" y="98" text-anchor="middle">data.tar.zst</text>' +
        '<text class="d-ts" x="580" y="120" text-anchor="middle">52 619 byte</text>' +
        '<text class="d-ts" x="580" y="142" text-anchor="middle">chính là cây thư mục sẽ được</text>' +
        '<text class="d-ts" x="580" y="158" text-anchor="middle">đổ thẳng vào /</text>' +
        '<text class="d-tm" x="580" y="178" text-anchor="middle">./usr/bin/tree  ./usr/share/man/...</text>' +

        '<rect class="d-box-w" x="20" y="212" width="680" height="30" rx="4"/>' +
        '<text class="d-t" x="34" y="232">Cài một gói = bung data.tar ra / + ghi nội dung control vào sổ /var/lib/dpkg/. Không có phép màu nào khác.</text>' +
        '</svg>' },

    { t: 'terms', items: [
      ['control', '', 'File văn bản khai báo tên gói, phiên bản, kiến trúc, phụ thuộc và mô tả. <b>Đây là toàn bộ những gì dpkg biết về gói</b> trước khi cài'],
      ['Depends', '', 'Gói bắt buộc phải có <b>trước</b> khi gói này chạy được. Thiếu là gãy'],
      ['Pre-Depends', '', 'Mạnh hơn: phải cài <b>và cấu hình xong</b> trước cả khi bung file gói này ra'],
      ['Recommends', '', 'Nên có, apt cài kèm theo mặc định nhưng gỡ đi vẫn chạy'],
      ['Suggests', '', 'Có thì tốt, apt <b>không</b> tự cài'],
      ['Provides', '', 'Gói này đóng vai một tên ảo, ví dụ nhiều gói cùng <code>Provides: awk</code>'],
      ['Conflicts', '', 'Không thể cùng tồn tại với gói kia'],
      ['Installed-Size', '', 'Dung lượng sau khi bung ra, tính bằng <b>KB</b>. Khác hẳn Download-Size là dung lượng file nén'],
      ['md5sums', '', 'Mã băm của từng file được cài. Nhờ nó <code>debsums</code> phát hiện được file bị sửa trộm']
    ]},

    { t: 'cal', kind: 'tip', title: 'Nội dung một gói chạy được ngay, không cần cài', x:
      '<p>Ở phần thực hành bạn sẽ bung một gói ra thư mục riêng rồi chạy thẳng ' +
      '<code>./thao/data/usr/bin/tree</code> — nó hoạt động hoàn hảo mà hệ thống hoàn toàn ' +
      'không biết gói đó tồn tại.</p>' +
      '<p>Điều này không phải mẹo vặt, nó là <b>bản chất của một root filesystem</b>. Ở Chặng ' +
      '09 bạn sẽ dựng rootfs cho ARM64 đúng bằng cách này: chép các file nhị phân vào đúng vị ' +
      'trí trong một cây thư mục, rồi bảo kernel coi cây đó là <code>/</code>. "Cài đặt" chẳng ' +
      'qua là chép file vào đúng chỗ và ghi lại đã chép những gì.</p>' },

    /* ══════════════════════════════════════════════
       3. KHO VÀ CHUỖI TIN CẬY
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Kho phần mềm, chỉ mục và chuỗi tin cậy' },

    { t: 'p', x:
      '<code>apt</code> không dò tìm gì trên Internet. Nó chỉ biết những kho được khai báo ' +
      'trong <code>/etc/apt/sources.list.d/</code>. Ubuntu 26.04 dùng định dạng mới ' +
      '<b>deb822</b> — mỗi kho là một khối gồm các dòng <code>Khoá: giá trị</code>, dễ đọc hơn ' +
      'hẳn dòng <code>deb http://... </code> một hàng của các bản cũ.' },

    { t: 'cmdx', cmd: '/etc/apt/sources.list.d/ubuntu.sources', title: 'Đọc một khối khai báo kho',
      rows: [
        ['<code>Types: deb</code>', 'Lấy gói <b>đã biên dịch</b> từ kho này', 'Thêm <code>deb-src</code> để lấy được cả <b>mã nguồn</b>'],
        ['<code>URIs:</code>', 'Địa chỉ máy chủ', '<code>archive.ubuntu.com</code> cho gói thường, <code>security.ubuntu.com</code> cho vá bảo mật'],
        ['<code>Suites:</code>', 'Bản phát hành và các nhánh của nó', 'Trên máy này: <code>resolute</code> — tên mã của Ubuntu 26.04'],
        ['<code>Components:</code>', 'Bốn khu vực của kho', '<b>main</b> Canonical hỗ trợ · <b>universe</b> cộng đồng · <b>restricted</b> driver độc quyền · <b>multiverse</b> giấy phép hạn chế'],
        ['<code>Signed-By:</code>', 'File khoá công khai dùng để kiểm chữ ký của kho này', '<b>Dòng quan trọng nhất về mặt bảo mật.</b> Không có nó, apt từ chối kho']
      ]},

    { t: 'fig',
      cap: 'Chuỗi tin cậy: một chữ ký duy nhất bảo chứng cho mã băm của chỉ mục, chỉ mục bảo chứng mã băm của từng gói. Sửa một byte ở bất kỳ đâu, cả chuỗi gãy.',
      svg:
        '<svg viewBox="0 0 720 240" width="720" role="img" aria-label="Chuỗi tin cậy từ khoá GPG qua InRelease tới Packages rồi tới file deb">' +
        '<rect class="d-box-w" x="20" y="26" width="150" height="66" rx="6"/>' +
        '<text class="d-t" x="95" y="48" text-anchor="middle">KHOÁ GPG</text>' +
        '<text class="d-ts" x="95" y="66" text-anchor="middle">cài sẵn cùng Ubuntu</text>' +
        '<text class="d-ts" x="95" y="82" text-anchor="middle">gốc của mọi tin cậy</text>' +

        '<rect class="d-box-p" x="200" y="26" width="150" height="66" rx="6"/>' +
        '<text class="d-tm" x="275" y="48" text-anchor="middle">InRelease</text>' +
        '<text class="d-ts" x="275" y="66" text-anchor="middle">có chữ ký PGP</text>' +
        '<text class="d-ts" x="275" y="82" text-anchor="middle">chứa SHA256 của chỉ mục</text>' +
        '<line class="d-line" x1="170" y1="59" x2="194" y2="59"/>' +
        '<path class="d-arrow" d="M194 59 l-8 -4 v8 z"/>' +

        '<rect class="d-box-p" x="380" y="26" width="150" height="66" rx="6"/>' +
        '<text class="d-tm" x="455" y="48" text-anchor="middle">Packages</text>' +
        '<text class="d-ts" x="455" y="66" text-anchor="middle">danh mục mọi gói</text>' +
        '<text class="d-ts" x="455" y="82" text-anchor="middle">chứa SHA256 từng .deb</text>' +
        '<line class="d-line" x1="350" y1="59" x2="374" y2="59"/>' +
        '<path class="d-arrow" d="M374 59 l-8 -4 v8 z"/>' +

        '<rect class="d-box-g" x="560" y="26" width="140" height="66" rx="6"/>' +
        '<text class="d-tm" x="630" y="48" text-anchor="middle">tree.deb</text>' +
        '<text class="d-ts" x="630" y="66" text-anchor="middle">tải về, băm lại,</text>' +
        '<text class="d-ts" x="630" y="82" text-anchor="middle">đối chiếu</text>' +
        '<line class="d-line" x1="530" y1="59" x2="554" y2="59"/>' +
        '<path class="d-arrow" d="M554 59 l-8 -4 v8 z"/>' +

        '<rect class="d-box-a" x="20" y="120" width="680" height="46" rx="4"/>' +
        '<text class="d-t" x="34" y="141">Chi mot chu ky duy nhat tren InRelease, nhung no bao chung cho ca chuoi phia sau.</text>' +
        '<text class="d-t" x="34" y="158">Vi the ke chan duong khong the doi noi dung mot goi ma apt khong phat hien.</text>' +

        '<rect class="d-box-w" x="20" y="182" width="680" height="46" rx="4"/>' +
        '<text class="d-t" x="34" y="203">Day cung la co che cua secure boot o Bai 68: bootloader kiem chu ky kernel,</text>' +
        '<text class="d-t" x="34" y="220">kernel kiem chu ky rootfs. Cung mot y tuong, khac tang.</text>' +
        '</svg>' },

    { t: 'cal', kind: 'warn', title: 'apt-key đã chết — đừng học theo hướng dẫn cũ trên mạng', x:
      '<p>Hàng nghìn bài hướng dẫn trên mạng vẫn viết <code>curl … | sudo apt-key add -</code>. ' +
      'Lệnh <code>apt-key</code> đã bị <b>loại bỏ hoàn toàn</b> và trên Ubuntu 26.04 nó không ' +
      'còn tồn tại.</p>' +
      '<p>Lý do rất chính đáng: <code>apt-key</code> ném khoá vào một kho chung, nghĩa là khoá ' +
      'của một hãng phần mềm bất kỳ cũng đủ tư cách ký cho <b>mọi</b> gói, kể cả gói lõi hệ ' +
      'thống. Một nhà cung cấp bị xâm nhập là cả máy bị xâm nhập.</p>' +
      '<p>Cách đúng hiện nay: đặt khoá thành một file riêng trong ' +
      '<code>/etc/apt/keyrings/</code> rồi trỏ tới nó bằng dòng <code>Signed-By:</code> của ' +
      'đúng kho đó. Khoá chỉ có quyền với kho của nó.</p>' },

    { t: 'cal', kind: 'why', title: 'Vì sao apt update là việc riêng, không gộp vào apt install', x:
      '<p><code>apt update</code> <b>không cài gì cả</b>. Nó chỉ tải lại các file chỉ mục về ' +
      '<code>/var/lib/apt/lists/</code> — tức là cập nhật <i>danh mục hàng</i>, không phải ' +
      '<i>hàng</i>.</p>' +
      '<p>Vì thế mới có lỗi kinh điển <code>Unable to locate package</code>: gói có thật, ' +
      'nhưng danh mục trên máy bạn quá cũ nên không biết nó tồn tại. Chữa bằng một lệnh ' +
      '<code>apt update</code>.</p>' +
      '<p>Tách riêng vì tải chỉ mục tốn băng thông và thời gian, mà bạn thì thường cài nhiều ' +
      'gói liền nhau. Quy tắc thực dụng: <b><code>apt update</code> trước khi cài lần đầu ' +
      'trong ngày</b>, hoặc mỗi khi gặp lỗi không tìm thấy gói.</p>' },

    /* ══════════════════════════════════════════════
       4. PHỤ THUỘC
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Phụ thuộc: sức mạnh, và cũng là nỗi đau' },

    { t: 'p', x:
      'Gói <code>gpiod</code> khai báo <code>Depends: libgpiod3 (&gt;= 2.1)</code>. Một dòng ' +
      'văn bản, nhưng nó là toàn bộ khác biệt giữa "cài xong chạy được" và "cài xong hỏng".' },

    { t: 'table',
      head: ['Tình huống', 'dpkg làm gì', 'apt làm gì'],
      rows: [
        ['Cài gói thiếu phụ thuộc', 'Bung file ra, rồi <b>từ chối cấu hình</b>, báo lỗi, để gói ở trạng thái <code>iU</code>', 'Tự tìm và cài phụ thuộc trước, theo đúng thứ tự'],
        ['Gỡ gói mà gói khác đang cần', 'Từ chối, trừ khi ép bằng <code>--force-depends</code>', 'Liệt kê mọi gói sẽ bị gỡ theo và hỏi lại'],
        ['Hai gói xung đột', 'Báo <code>conflicting packages</code>', 'Tìm phương án khác, hoặc báo không giải được'],
        ['Gói không còn ai cần', 'Không biết, không quan tâm', '<code>apt autoremove</code> dọn đi']
      ]},

    { t: 'cal', kind: 'info', title: 'Hai chữ cái đầu dòng của dpkg -l nói lên tất cả', x:
      '<p>Cột trạng thái có <b>ba</b> ký tự. Chữ thứ nhất là <i>mong muốn</i>, chữ thứ hai là ' +
      '<i>thực trạng</i>:</p>' +
      '<p><code>ii</code> — muốn cài (<b>i</b>nstall) và <b>đã cài xong</b> (<b>i</b>nstalled). ' +
      'Đây là trạng thái bình thường của 776 gói trên máy này.<br>' +
      '<code>iU</code> — muốn cài nhưng mới bung file ra, <b>chưa cấu hình được</b> ' +
      '(<b>U</b>npacked). Đúng trạng thái bạn sẽ tự tay tạo ra ở bước 6.<br>' +
      '<code>rc</code> — đã gỡ (<b>r</b>emoved) nhưng file cấu hình còn lại ' +
      '(<b>c</b>onfig-files). Muốn xoá sạch phải dùng <code>purge</code>.</p>' +
      '<p><b>Chữ hoa luôn là dấu hiệu xấu.</b> Sau mỗi lần cài đặt trục trặc, ' +
      '<code>dpkg -l | grep -v \'^ii\'</code> là câu lệnh đầu tiên nên gõ.</p>' },

    { t: 'cal', kind: 'danger', title: 'Hai lệnh không bao giờ được gõ trên máy đang dùng', x:
      '<p><code>sudo dpkg --force-all -i goi.deb</code> — ép cài bất chấp phụ thuộc và xung ' +
      'đột. Nó luôn "thành công", và để lại một hệ thống mà apt không còn gỡ được nữa.</p>' +
      '<p><code>sudo apt remove libc6</code> — ở phần thực hành bạn sẽ chạy phiên bản ' +
      '<b>mô phỏng</b> của lệnh này và thấy apt trả lời rằng <code>dpkg</code> cũng sẽ bị gỡ ' +
      'theo. Gỡ <code>libc6</code> là gỡ thư viện C mà <b>mọi</b> chương trình trên máy đang ' +
      'dùng, kể cả chính công cụ bạn định dùng để sửa chữa.</p>' +
      '<p>Thói quen tự vệ: <b>luôn đọc kỹ danh sách apt liệt kê trước khi gõ Y</b>. Khi thấy ' +
      'một lệnh cài phần mềm nhỏ mà lại đòi gỡ hàng trăm gói, đó là lúc dừng lại chứ không ' +
      'phải lúc bấm Enter.</p>' },

    /* ══════════════════════════════════════════════
       5. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: mở nắp hệ thống quản lý gói' },

    { t: 'p', x:
      'Bảy bước. Bạn sẽ đọc sổ sách của hệ thống, tháo tung một gói bằng tay, kiểm tra chuỗi ' +
      'chữ ký, rồi <b>cố tình làm gãy một phụ thuộc</b> và sửa nó. Bước 6 là bước quan trọng ' +
      'nhất: nó tạo ra đúng loại sự cố mà bạn sẽ gặp thật, trong một hoàn cảnh an toàn và có ' +
      'thể lùi lại được.' },

    { t: 'cal', kind: 'warn', title: 'Đọc trước khi gõ', x:
      '<p>Mọi lệnh trong bài đều chạy trong <b>WSL</b>. Các lệnh có <code>sudo</code> sẽ hỏi ' +
      'mật khẩu người dùng Ubuntu của bạn — gõ mật khẩu thì màn hình <b>không hiện gì cả</b>, ' +
      'đó là bình thường, không phải bàn phím hỏng.</p>' +
      '<p>Số liệu trong bài đo trên máy viết tài liệu này (Ubuntu 26.04 <i>resolute</i>, 773 ' +
      'gói trước khi bắt đầu). <b>Số của bạn sẽ khác</b> — điều cần khớp là <i>hình dạng</i> ' +
      'của kết quả, không phải từng con số.</p>' },

    { t: 'steps', items: [

      /* ─────────── BƯỚC 1 ─────────── */
      { title: 'Bước 1 — Mở sổ đăng ký của hệ thống', blocks: [
        { t: 'p', x:
          'Trước khi cài thêm bất cứ thứ gì, hãy xem hệ thống đang ghi chép những gì. Toàn bộ ' +
          'sự thật về "máy này có gì" nằm trong một thư mục duy nhất: ' +
          '<code>/var/lib/dpkg/</code>.' },

        { t: 'code', where: 'wsl', code:
          'dpkg -l | grep -c \'^ii\'\n' +
          'ls /var/lib/dpkg/' },

        { t: 'code', where: 'out', nocopy: true, code:
          '773\n' +
          'alternatives\n' +
          'arch-native\n' +
          'available\n' +
          'cmethopt\n' +
          'diversions\n' +
          'info\n' +
          'lock\n' +
          'lock-frontend\n' +
          'parts\n' +
          'statoverride\n' +
          'status\n' +
          'status-old\n' +
          'triggers\n' +
          'updates' },

        { t: 'p', x:
          '<b>773 gói.</b> Ghi con số này lại — cuối bài bạn sẽ kiểm tra lại nó. Hai mục quan ' +
          'trọng nhất trong thư mục trên là <code>status</code> (một file văn bản khổng lồ, mỗi ' +
          'gói một khối) và <code>info/</code> (danh sách file và script của từng gói).' },

        { t: 'cmdx', cmd: 'dpkg -l | grep -c \'^ii\'', title: 'Đếm gói đã cài hoàn chỉnh',
          rows: [
            ['<code>dpkg -l</code>', 'In bảng mọi gói mà dpkg <b>từng biết tới</b>', 'Kể cả gói đã gỡ nhưng còn file cấu hình'],
            ['<code>grep -c</code>', 'Đếm số dòng khớp thay vì in ra', 'Kỹ thuật của Bài 11'],
            ['<code>\'^ii\'</code>', 'Chỉ những dòng bắt đầu bằng <code>ii</code>', '<b>Đã cài và đã cấu hình xong.</b> Lọc như vậy để không đếm nhầm gói ở trạng thái dở dang']
          ]},

        { t: 'p', x:
          'Giờ đến một câu hỏi tưởng dễ: <b>lệnh <code>ls</code> mà bạn gõ hàng trăm lần từ Bài ' +
          '5 tới giờ đến từ gói nào?</b> <code>dpkg -S</code> tra ngược từ một đường dẫn về gói ' +
          'sở hữu nó.' },

        { t: 'code', where: 'wsl', code:
          'which ls\n' +
          'readlink -f "$(which ls)"\n' +
          'dpkg -S /usr/bin/ls\n' +
          'dpkg -s coreutils-from-uutils | head -8' },

        { t: 'code', where: 'out', nocopy: true, code:
          '/usr/bin/ls\n' +
          '/usr/lib/cargo/bin/coreutils/ls\n' +
          'coreutils-from-uutils: /usr/bin/ls\n' +
          'Package: coreutils-from-uutils\n' +
          'Protected: yes\n' +
          'Status: install ok installed\n' +
          'Priority: required\n' +
          'Section: utils\n' +
          'Installed-Size: 237\n' +
          'Maintainer: Ubuntu Developers <ubuntu-devel-discuss@lists.ubuntu.com>\n' +
          'Architecture: all' },

        { t: 'cal', kind: 'info', title: 'Bạn vừa phát hiện một thay đổi lớn của Ubuntu 26.04', x:
          '<p>Suốt ba mươi năm, <code>ls</code> đến từ gói <b>coreutils</b> của dự án GNU, viết ' +
          'bằng C. Trên máy này nó đến từ <code>coreutils-from-uutils</code> — bản viết lại ' +
          'bằng <b>Rust</b> của dự án uutils, và <code>readlink -f</code> để lộ ra điều đó: ' +
          'đường dẫn thật nằm trong <code>/usr/lib/cargo/bin/</code>, <code>cargo</code> là ' +
          'công cụ build của Rust.</p>' +
          '<p><code>Protected: yes</code> nghĩa là apt sẽ chống lại nếu bạn định gỡ nó — cũng ' +
          'dễ hiểu, gỡ <code>ls</code> thì hệ thống gần như tê liệt.</p>' +
          '<p>Bài học rút ra không phải về Rust, mà về <b>phương pháp</b>: khi một lệnh cư xử ' +
          'khác tài liệu bạn đọc, hãy hỏi hệ thống xem lệnh đó thật ra đến từ đâu thay vì đoán. ' +
          '<code>which</code> → <code>readlink -f</code> → <code>dpkg -S</code> là ba bước ' +
          'điều tra bạn sẽ dùng lại rất nhiều.</p>' },

        { t: 'cmdx', cmd: 'Bốn cách hỏi dpkg', title: 'Bốn lệnh tra cứu cần thuộc lòng',
          rows: [
            ['<code>dpkg -l <i>goi</i></code>', 'Gói này đã cài chưa, phiên bản nào', 'Không có tham số thì liệt kê tất cả'],
            ['<code>dpkg -s <i>goi</i></code>', 'In nguyên khối thông tin trong sổ', '<b>s</b> = status. Đọc được cả phụ thuộc và mô tả'],
            ['<code>dpkg -L <i>goi</i></code>', 'Gói này đã đặt <b>những file nào</b> lên đĩa', '<b>L</b> = list. Chữ hoa'],
            ['<code>dpkg -S <i>/duong/dan</i></code>', 'File này <b>thuộc gói nào</b>', '<b>S</b> = search. Ngược chiều với <code>-L</code>']
          ]},

        { t: 'cal', kind: 'why', title: 'Vì sao phải nhớ cặp -L và -S', x:
          '<p>Đây là hai câu hỏi bạn sẽ đặt ra liên tục trong nghề, theo hai chiều ngược nhau:</p>' +
          '<p><b>Chiều xuôi (<code>-L</code>):</b> "tôi vừa cài gói cross toolchain, nó bỏ ' +
          '<code>aarch64-linux-gnu-gcc</code> vào đâu?"<br>' +
          '<b>Chiều ngược (<code>-S</code>):</b> "báo lỗi nhắc tới file ' +
          '<code>/usr/lib/x86_64-linux-gnu/libgpiod.so.3</code>, tôi phải cài gói nào để có ' +
          'nó?"</p>' +
          '<p>Chiều ngược là chiều cứu bạn nhiều thời gian nhất. Ở bước 6 bạn sẽ gặp đúng một ' +
          'lỗi thiếu thư viện và sẽ hiểu vì sao.</p>' }
      ]},

      /* ─────────── BƯỚC 2 ─────────── */
      { title: 'Bước 2 — Hỏi kỹ trước khi cài', blocks: [
        { t: 'p', x:
          'Người mới cài gói bằng cách gõ <code>apt install</code> rồi hy vọng. Người có nghề ' +
          '<b>hỏi trước</b>: gói này là gì, phiên bản nào, đến từ kho nào, kéo theo những gì. ' +
          'Bắt đầu bằng việc làm mới danh mục.' },

        { t: 'code', where: 'wsl', code:
          'sudo apt update\n' +
          'du -sh /var/lib/apt/lists/' },

        { t: 'code', where: 'out', nocopy: true, code:
          'Hit:1 http://archive.ubuntu.com/ubuntu resolute InRelease\n' +
          'Hit:2 http://security.ubuntu.com/ubuntu resolute-security InRelease\n' +
          'Hit:3 http://archive.ubuntu.com/ubuntu resolute-updates InRelease\n' +
          'Hit:4 http://archive.ubuntu.com/ubuntu resolute-backports InRelease\n' +
          'Reading package lists...\n' +
          'Building dependency tree...\n' +
          'Reading state information...\n' +
          '2 packages can be upgraded. Run \'apt list --upgradable\' to see them.\n' +
          '143M\t/var/lib/apt/lists/' },

        { t: 'cal', kind: 'info', title: 'Hit, Get và 143 MB', x:
          '<p><code>Hit</code> nghĩa là "chỉ mục trên máy vẫn còn mới, không tải lại". ' +
          '<code>Get</code> nghĩa là có bản mới và apt đang tải về. Lần chạy đầu tiên bạn sẽ ' +
          'thấy toàn <code>Get</code> và mất kha khá thời gian.</p>' +
          '<p><b>143 MB</b> là dung lượng của <i>danh mục</i>, không phải phần mềm. Đó là cái ' +
          'giá để <code>apt</code> có thể trả lời tức thì mọi câu hỏi về hàng chục nghìn gói mà ' +
          'không cần chạm vào mạng. Đây cũng là lý do thiết bị nhúng không mang theo apt: 143 ' +
          'MB chỉ để đọc danh mục là quá xa xỉ với một flash 64 MB.</p>' },

        { t: 'p', x:
          'Gói <code>tree</code> đã được hứa hẹn từ <b>Bài 6</b>. Trước khi cài, hãy hỏi cho ' +
          'rõ nó là gì.' },

        { t: 'code', where: 'wsl', code: 'apt show tree' },

        { t: 'code', where: 'out', nocopy: true, code:
          'Package: tree\n' +
          'Version: 2.3.1-1\n' +
          'Priority: optional\n' +
          'Section: universe/utils\n' +
          'Origin: Ubuntu\n' +
          'Maintainer: Ubuntu Developers <ubuntu-devel-discuss@lists.ubuntu.com>\n' +
          'Original-Maintainer: Florian Ernst <florian@debian.org>\n' +
          'Bugs: https://bugs.launchpad.net/ubuntu/+filebug\n' +
          'Installed-Size: 125 kB\n' +
          'Depends: libc6 (>= 2.38)\n' +
          'Homepage: http://oldmanprogrammer.net/source.php?dir=projects/tree\n' +
          'Download-Size: 53.5 kB\n' +
          'APT-Sources: http://archive.ubuntu.com/ubuntu resolute/universe amd64 Packages\n' +
          'Description: displays an indented directory tree, in color\n' +
          ' Tree is a recursive directory listing command that produces a depth indented\n' +
          ' listing of files, which is colorized ala dircolors if the LS_COLORS environment\n' +
          ' variable is set and output is to tty.' },

        { t: 'cmdx', cmd: 'apt show tree', title: 'Bốn dòng đáng chú ý nhất',
          rows: [
            ['<code>Section: universe/utils</code>', 'Gói này nằm ở khu <b>universe</b> — cộng đồng bảo trì', 'Không được Canonical hỗ trợ bảo mật như <b>main</b>'],
            ['<code>Depends: libc6 (&gt;= 2.38)</code>', 'Chỉ cần <b>một</b> phụ thuộc, mà libc6 thì máy nào cũng có', 'Nghĩa là cài gói này gần như chắc chắn không rắc rối'],
            ['<code>Download-Size: 53,5 kB</code>', 'Dung lượng file <code>.deb</code> nén', 'Cái sẽ đi qua đường mạng'],
            ['<code>Installed-Size: 125 kB</code>', 'Dung lượng sau khi bung ra đĩa', '<b>Luôn lớn hơn</b> Download-Size. Nhầm hai số này là nhầm khi tính dung lượng rootfs']
          ]},

        { t: 'p', x:
          'Ba câu hỏi tiếp theo: phiên bản nào sẽ được cài, gói này cần gì, và ai đang cần nó. ' +
          'Ta lấy <code>gpiod</code> làm ví dụ — đây chính là bộ công cụ điều khiển chân GPIO ' +
          'mà bạn sẽ dùng thật ở <b>Chặng 10</b>.' },

        { t: 'code', where: 'wsl', code:
          'apt policy tree\n' +
          'apt depends gpiod\n' +
          'apt rdepends libgpiod3 | head -8' },

        { t: 'code', where: 'out', nocopy: true, code:
          'tree:\n' +
          '  Installed: (none)\n' +
          '  Candidate: 2.3.1-1\n' +
          '  Version table:\n' +
          '     2.3.1-1 500\n' +
          '        500 http://archive.ubuntu.com/ubuntu resolute/universe amd64 Packages\n' +
          '\n' +
          'gpiod\n' +
          '  Depends: libc6 (>= 2.38)\n' +
          '  Depends: libgpiod3 (>= 2.1)\n' +
          '\n' +
          'libgpiod3\n' +
          'Reverse Depends:\n' +
          '  Depends: libgpiod-dev (= 2.2.1-3build1)\n' +
          '  Depends: swupdate (>= 2.1)\n' +
          '  Depends: svxlink-server (>= 2.1)\n' +
          '  Depends: python3-libgpiod (= 2.2.1-3build1)\n' +
          '  Depends: openfpgaloader (>= 2.1)\n' +
          '  Depends: gpiod (>= 2.1)' },

        { t: 'cmdx', cmd: 'Ba lệnh hỏi apt', title: 'Hỏi gì, và câu trả lời dùng để làm gì',
          rows: [
            ['<code>apt policy <i>goi</i></code>', '<b>Đã cài bản nào</b> và <b>sẽ cài bản nào</b>', 'Số <code>500</code> là độ ưu tiên. Khi một gói có ở nhiều kho, apt chọn số cao nhất'],
            ['<code>apt depends <i>goi</i></code>', 'Gói này cần những gì để chạy', 'Đọc <b>xuôi</b> cây phụ thuộc'],
            ['<code>apt rdepends <i>goi</i></code>', 'Những ai đang cần gói này', 'Đọc <b>ngược</b>. Dùng trước khi gỡ bất cứ thư viện nào']
          ]},

        { t: 'cal', kind: 'tip', title: 'apt rdepends là lệnh cứu bạn khỏi phá hỏng máy', x:
          '<p>Trước khi gỡ bất kỳ gói nào có tên bắt đầu bằng <code>lib</code>, hãy chạy ' +
          '<code>apt rdepends</code> lên nó. Ở trên, <code>libgpiod3</code> đang được ' +
          '<b>mười hai</b> gói khác cần tới — gỡ nó đi là kéo sập cả mười hai.</p>' +
          '<p><code>Installed: (none)</code> ở dòng đầu xác nhận <code>tree</code> chưa có trên ' +
          'máy. Nếu máy bạn hiện ra một phiên bản, nghĩa là nó đã được cài sẵn — không sao, các ' +
          'bước sau vẫn chạy đúng.</p>' }
      ]},

      /* ─────────── BƯỚC 3 ─────────── */
      { title: 'Bước 3 — Cài tree, rồi xem nó đã thay đổi những gì', blocks: [
        { t: 'p', x:
          'Ở <b>Bài 6</b> bạn đã dùng <code>ls -R</code> để nhìn cây thư mục và tài liệu có hứa ' +
          'rằng sẽ có công cụ tốt hơn. Đây là lúc giữ lời hứa đó.' },

        { t: 'code', where: 'wsl', code: 'sudo apt install tree' },

        { t: 'code', where: 'out', nocopy: true, code:
          'Reading package lists...\n' +
          'Building dependency tree...\n' +
          'Reading state information...\n' +
          'Solving dependencies...\n' +
          'Installing:\n' +
          '  tree\n' +
          '\n' +
          'Summary:\n' +
          '  Upgrading: 0, Installing: 1, Removing: 0, Not Upgrading: 2\n' +
          '  Download size: 53.5 kB\n' +
          '  Space needed: 125 kB / 1022 GB available\n' +
          '\n' +
          'Get:1 http://archive.ubuntu.com/ubuntu resolute/universe amd64 tree amd64 2.3.1-1 [53.5 kB]\n' +
          'Fetched 53.5 kB in 1s (51.5 kB/s)\n' +
          'Selecting previously unselected package tree.\n' +
          '(Reading database ... 50289 files and directories currently installed.)\n' +
          'Preparing to unpack .../tree_2.3.1-1_amd64.deb ...\n' +
          'Unpacking tree (2.3.1-1) ...\n' +
          'Setting up tree (2.3.1-1) ...\n' +
          'Processing triggers for man-db (2.13.1-1build1) ...' },

        { t: 'cal', kind: 'why', title: 'Đọc bốn động từ trong phần cuối — chúng là toàn bộ vòng đời cài đặt', x:
          '<p><b>Get / Fetched</b> — apt tải file <code>.deb</code> về ' +
          '<code>/var/cache/apt/archives/</code>. Đây là phần việc duy nhất cần mạng.</p>' +
          '<p><b>Unpacking</b> — <code>dpkg</code> bung <code>data.tar.zst</code> ra hệ thống ' +
          'file. Sau bước này file đã nằm trên đĩa nhưng gói <b>chưa</b> hoạt động chính thức.</p>' +
          '<p><b>Setting up</b> — chạy script <code>postinst</code>, sinh file cấu hình, khởi ' +
          'động dịch vụ. Đây là bước biến trạng thái <code>iU</code> thành <code>ii</code>. ' +
          '<b>Chính bước này sẽ thất bại ở bước 6.</b></p>' +
          '<p><b>Processing triggers</b> — các gói khác được đánh thức để cập nhật chỉ mục ' +
          'chung. Ở đây <code>man-db</code> vừa đưa trang <code>man tree</code> vào cơ sở dữ ' +
          'liệu tra cứu của nó, nên ngay lập tức <code>man tree</code> chạy được.</p>' },

        { t: 'p', x:
          'Bây giờ hỏi lại sổ sách: gói vừa cài đã để lại chính xác những file nào?' },

        { t: 'code', where: 'wsl', code:
          'dpkg -l tree\n' +
          'dpkg -L tree\n' +
          'dpkg -L tree | wc -l' },

        { t: 'code', where: 'out', nocopy: true, code:
          '||/ Name    Version   Architecture Description\n' +
          '+++-=======-=========-============-=============================================\n' +
          'ii  tree    2.3.1-1   amd64        displays an indented directory tree, in color\n' +
          '/.\n' +
          '/usr\n' +
          '/usr/bin\n' +
          '/usr/bin/tree\n' +
          '/usr/share\n' +
          '/usr/share/doc\n' +
          '/usr/share/doc/tree\n' +
          '/usr/share/doc/tree/README.gz\n' +
          '/usr/share/doc/tree/TODO\n' +
          '/usr/share/doc/tree/changelog.Debian.gz\n' +
          '/usr/share/doc/tree/copyright\n' +
          '/usr/share/man\n' +
          '/usr/share/man/man1\n' +
          '/usr/share/man/man1/tree.1.gz\n' +
          '14' },

        { t: 'p', x:
          '<b>Mười bốn dòng — chỉ một file thực thi duy nhất</b>, phần còn lại là thư mục, tài ' +
          'liệu và trang man. Đúng bố cục FHS mà bạn đã học ở <b>Bài 5</b>: chương trình vào ' +
          '<code>/usr/bin</code>, tài liệu vào <code>/usr/share/doc</code>, trang man vào ' +
          '<code>/usr/share/man</code>. Không một file nào rơi ra ngoài. Giờ đọc khối tương ứng ' +
          'trong sổ:' },

        { t: 'code', where: 'wsl', code:
          'awk \'/^Package: tree$/,/^$/\' /var/lib/dpkg/status' },

        { t: 'code', where: 'out', nocopy: true, code:
          'Package: tree\n' +
          'Status: install ok installed\n' +
          'Priority: optional\n' +
          'Section: utils\n' +
          'Installed-Size: 122\n' +
          'Maintainer: Ubuntu Developers <ubuntu-devel-discuss@lists.ubuntu.com>\n' +
          'Architecture: amd64\n' +
          'Version: 2.3.1-1\n' +
          'Depends: libc6 (>= 2.38)\n' +
          'Description: displays an indented directory tree, in color\n' +
          ' Tree is a recursive directory listing command that produces a depth indented\n' +
          ' listing of files, which is colorized ala dircolors if the LS_COLORS environment\n' +
          ' variable is set and output is to tty.' },

        { t: 'cal', kind: 'info', title: 'Bạn vừa dùng lại đúng kỹ thuật của Bài 11', x:
          '<p><code>awk \'/mẫu bắt đầu/,/mẫu kết thúc/\'</code> in mọi dòng nằm giữa hai mẫu — ' +
          'ở đây là từ dòng <code>Package: tree</code> cho tới dòng trống đầu tiên. Vì file ' +
          '<code>status</code> là các khối ngăn nhau bằng dòng trống, một biểu thức là đủ để ' +
          'cắt đúng khối cần xem.</p>' +
          '<p>Chú ý <code>$</code> trong <code>/^Package: tree$/</code>: thiếu nó thì mẫu sẽ ' +
          'khớp cả những gói tên bắt đầu bằng "tree" khác. Đây là <b>neo cuối dòng</b> của Bài ' +
          '11, và đây là lý do bài đó phải học trước bài này.</p>' },

        { t: 'p', x: 'Cuối cùng, dùng thử công cụ vừa cài:' },

        { t: 'code', where: 'wsl', code:
          'which tree\n' +
          'dpkg -S "$(which tree)"\n' +
          'tree --version' },

        { t: 'code', where: 'out', nocopy: true, code:
          '/usr/bin/tree\n' +
          'tree: /usr/bin/tree\n' +
          'tree v2.3.1 © 1996 - 2026 by Steve Baker, Thomas Moore, Francesc Rocher, Florian Sesser, Kyosuke Tokoro' },

        { t: 'cal', kind: 'tip', title: 'Vòng tròn đã khép', x:
          '<p>Bạn vừa đi trọn một vòng: hỏi kho → cài → tra sổ → tra ngược từ file về gói. ' +
          '<code>dpkg -S "$(which tree)"</code> trả lời <code>tree: /usr/bin/tree</code>, tức ' +
          'là file thực thi này thuộc gói <code>tree</code> — khớp với những gì ' +
          '<code>dpkg -L</code> vừa nói. Sổ sách và thực tế trên đĩa nhất quán.</p>' +
          '<p>Từ giờ dùng <code>tree -L 2</code> thay cho <code>ls -R</code> mỗi khi cần nhìn ' +
          'cấu trúc thư mục. Nó sẽ rất hữu ích từ Chặng 04 trở đi, khi bạn phải đọc cây mã ' +
          'nguồn kernel.</p>' }
      ]},

      /* ─────────── BƯỚC 4 ─────────── */
      { title: 'Bước 4 — Tháo tung một file .deb bằng tay', blocks: [
        { t: 'p', x:
          'Cài đặt là một hộp đen chừng nào bạn chưa mở nó ra. Bước này tải một gói về ' +
          '<b>mà không cài</b>, tháo rời từng thành phần, rồi chạy chương trình bên trong ' +
          'trong khi hệ thống hoàn toàn không biết gói đó tồn tại.' },

        { t: 'code', where: 'wsl', code:
          'mkdir -p ~/embedded/bai12 && cd ~/embedded/bai12\n' +
          'apt-get download tree\n' +
          'ls -l\n' +
          'file tree_*.deb' },

        { t: 'code', where: 'out', nocopy: true, code:
          'Get:1 http://archive.ubuntu.com/ubuntu resolute/universe amd64 tree amd64 2.3.1-1 [53.5 kB]\n' +
          'Fetched 53.5 kB in 1s (50.1 kB/s)\n' +
          'total 56\n' +
          '-rw-r--r-- 1 shinarus shinarus 53550 Feb  4 08:14 tree_2.3.1-1_amd64.deb\n' +
          'tree_2.3.1-1_amd64.deb: Debian binary package (format 2.0), with control.tar.zst, data compression zst' },

        { t: 'cal', kind: 'info', title: 'apt-get download khác apt install ở đúng một chỗ', x:
          '<p>Nó tải file <code>.deb</code> về <b>thư mục hiện tại</b> rồi dừng. Không cài, ' +
          'không cần <code>sudo</code>, không đụng vào sổ sách.</p>' +
          '<p>Trong nghề, lệnh này dùng để mang một gói sang máy không có mạng, hoặc để soi một ' +
          'gói đáng ngờ trước khi cho nó lên hệ thống thật. Bạn cũng sẽ dùng nó ở Chặng 09 để ' +
          'lấy các file nhị phân bỏ vào rootfs tự dựng.</p>' },

        { t: 'p', x:
          '<code>file</code> đã nói cho ta biết đây là "Debian binary package (format 2.0)". ' +
          'Nhưng bên trong nó là một kho <code>ar</code> hoàn toàn bình thường — hãy mở ra xem.' },

        { t: 'code', where: 'wsl', code: 'ar tv tree_*.deb' },

        { t: 'code', where: 'out', nocopy: true, code:
          'rw-r--r-- 0/0      4 Feb  4 00:59 2026 debian-binary\n' +
          'rw-r--r-- 0/0    737 Feb  4 00:59 2026 control.tar.zst\n' +
          'rw-r--r-- 0/0  52619 Feb  4 00:59 2026 data.tar.zst' },

        { t: 'cmdx', cmd: 'ar tv tree_2.3.1-1_amd64.deb', title: 'Ba thành phần, không hơn',
          rows: [
            ['<code>ar</code>', 'Công cụ kho lưu trữ cổ của Unix', 'Cùng công cụ tạo thư viện tĩnh <code>.a</code> — Bài 17 sẽ dùng lại nó'],
            ['<code>t</code>', 'Liệt kê nội dung, không giải nén', '<b>t</b>able of contents'],
            ['<code>v</code>', 'Chi tiết: quyền, kích thước, thời gian', '<b>v</b>erbose'],
            ['<code>debian-binary</code> · 4 byte', 'Chỉ chứa chuỗi <code>2.0</code>', 'Phiên bản định dạng gói'],
            ['<code>control.tar.zst</code> · 737 B', 'Siêu dữ liệu: control, md5sums, script', 'Thứ dpkg đọc để biết cách đối xử với gói'],
            ['<code>data.tar.zst</code> · 52 619 B', 'Cây thư mục sẽ đổ vào <code>/</code>', '<b>99 % dung lượng gói nằm ở đây</b>']
          ]},

        { t: 'p', x:
          'Thử tách ra bằng công cụ thông thường trước — <code>ar x</code> rồi <code>tar</code>. ' +
          'Kết quả sẽ là một thất bại, và thất bại đó đáng giá.' },

        { t: 'code', where: 'wsl', code:
          'mkdir -p thao && cd thao\n' +
          'ar x ../tree_*.deb\n' +
          'ls\n' +
          'tar -xf control.tar.zst' },

        { t: 'code', where: 'out', nocopy: true, code:
          'control.tar.zst  data.tar.zst  debian-binary\n' +
          'tar (child): zstd: Cannot exec: No such file or directory\n' +
          'tar (child): Error is not recoverable: exiting now\n' +
          'tar: Child returned status 2\n' +
          'tar: Error is not recoverable: exiting now' },

        { t: 'cal', kind: 'why', title: 'Vì sao lỗi này lại là một bài học tốt', x:
          '<p><code>tar</code> nhận ra đuôi <code>.zst</code> và cố gọi chương trình ngoài ' +
          '<code>zstd</code> để giải nén — nhưng máy này <b>không cài</b> <code>zstd</code>. ' +
          'Đây là mô hình quen thuộc: <code>tar</code> không tự biết nén, nó ' +
          '<b>uỷ thác cho chương trình khác</b>, đúng triết lý Unix của Bài 10.</p>' +
          '<p>Nhưng chú ý điều nghịch lý: <code>dpkg</code> vẫn cài được gói <code>.zst</code> ' +
          'ngon lành mà không cần <code>zstd</code> ngoài, vì nó <b>nhúng sẵn</b> mã giải nén ' +
          'bên trong. Một quyết định thiết kế có chủ đích: công cụ cài đặt của hệ thống không ' +
          'được phép phụ thuộc vào một gói mà chính nó phải cài.</p>' +
          '<p>Bạn có thể <code>sudo apt install zstd</code> để lệnh <code>tar</code> trên chạy ' +
          'được, nhưng không cần — cách đúng nằm ngay dưới đây.</p>' },

        { t: 'code', where: 'wsl', code:
          'cd ~/embedded/bai12\n' +
          'dpkg-deb -I tree_*.deb\n' +
          'dpkg-deb -c tree_*.deb | head -4' },

        { t: 'code', where: 'out', nocopy: true, code:
          ' new Debian package, version 2.0.\n' +
          ' size 53550 bytes: control archive=737 bytes.\n' +
          '     580 bytes,    14 lines      control\n' +
          '     367 bytes,     6 lines      md5sums\n' +
          ' Package: tree\n' +
          ' Version: 2.3.1-1\n' +
          ' Architecture: amd64\n' +
          ' Maintainer: Ubuntu Developers <ubuntu-devel-discuss@lists.ubuntu.com>\n' +
          ' Installed-Size: 122\n' +
          ' Depends: libc6 (>= 2.38)\n' +
          ' Section: utils\n' +
          ' Priority: optional\n' +
          ' Description: displays an indented directory tree, in color\n' +
          'drwxr-xr-x root/root         0 2026-02-04 00:59 ./\n' +
          'drwxr-xr-x root/root         0 2026-02-04 00:59 ./usr/\n' +
          'drwxr-xr-x root/root         0 2026-02-04 00:59 ./usr/bin/\n' +
          '-rwxr-xr-x root/root     97792 2026-02-04 00:59 ./usr/bin/tree' },

        { t: 'cmdx', cmd: 'dpkg-deb', title: 'Bốn thao tác trên một file .deb chưa cài',
          rows: [
            ['<code>dpkg-deb -I <i>goi</i>.deb</code>', 'In file <code>control</code> — gói này là gì', '<b>I</b> = info'],
            ['<code>dpkg-deb -c <i>goi</i>.deb</code>', 'Liệt kê mọi file gói sẽ cài', '<b>c</b> = contents. Xem <b>trước</b> khi cài'],
            ['<code>dpkg-deb -x <i>goi</i>.deb <i>thumuc</i></code>', 'Bung phần <b>data</b> ra thư mục chỉ định', '<b>x</b> = extract'],
            ['<code>dpkg-deb -e <i>goi</i>.deb <i>thumuc</i></code>', 'Bung phần <b>control</b> ra', '<b>e</b> = control extract. Nhớ cặp <code>-x</code>/<code>-e</code>']
          ]},

        { t: 'p', x:
          'Chú ý mọi đường dẫn trong danh sách đều bắt đầu bằng <code>./</code> — chúng là ' +
          '<b>đường dẫn tương đối</b>. Cài gói chính là bung cái cây này ra tại vị trí ' +
          '<code>/</code>. Bây giờ hãy bung nó ra <b>một chỗ khác</b> và chứng minh điều đó.' },

        { t: 'code', where: 'wsl', code:
          'dpkg-deb -x tree_*.deb thu\n' +
          'dpkg-deb -e tree_*.deb thu/DEBIAN\n' +
          'ls thu/DEBIAN\n' +
          './thu/usr/bin/tree --version\n' +
          './thu/usr/bin/tree -L 2 thu/usr' },

        { t: 'code', where: 'out', nocopy: true, code:
          'control  md5sums\n' +
          'tree v2.3.1 © 1996 - 2026 by Steve Baker, Thomas Moore, Francesc Rocher, Florian Sesser, Kyosuke Tokoro\n' +
          'thu/usr\n' +
          '├── bin\n' +
          '│   └── tree\n' +
          '└── share\n' +
          '    ├── doc\n' +
          '    └── man\n' +
          '\n' +
          '5 directories, 1 file' },

        { t: 'cal', kind: 'why', title: 'Điều bạn vừa chứng minh là nền tảng của cả Chặng 09', x:
          '<p>Chương trình <code>tree</code> nằm trong <code>~/embedded/bai12/thu/</code> vừa ' +
          'chạy hoàn hảo. Nó <b>không</b> có trong sổ <code>/var/lib/dpkg/status</code>, ' +
          '<code>dpkg -S</code> không tìm thấy nó, <code>apt</code> không biết nó tồn tại. ' +
          'Nhưng nó chạy.</p>' +
          '<p>Kết luận: <b>"cài đặt" không phải phép màu, nó là chép file vào đúng chỗ và ghi ' +
          'lại đã chép gì.</b> Phần "chép file" làm chương trình chạy được; phần "ghi lại" chỉ ' +
          'phục vụ việc quản lý sau này — nâng cấp, gỡ bỏ, kiểm tra xung đột.</p>' +
          '<p>Ở <b>Chặng 09</b> bạn sẽ dựng root filesystem cho ARM64 đúng theo cách này: ghép ' +
          'các file nhị phân vào một cây thư mục rồi bảo kernel coi cây đó là <code>/</code>. ' +
          'Không có <code>dpkg</code>, không có sổ sách — và vẫn boot được.</p>' },

        { t: 'code', where: 'wsl', code: 'head -4 thu/DEBIAN/md5sums' },

        { t: 'code', where: 'out', nocopy: true, code:
          'd9efbe029f78aba7dd0730aa4db6c046  usr/bin/tree\n' +
          '99acf44fc5497510b6e4b9e344e3eae9  usr/share/doc/tree/README.gz\n' +
          '5308564e4990e963e91b0b6b21358941  usr/share/doc/tree/TODO\n' +
          'e63eaa102a0a9600176331b39bf4a3ac  usr/share/doc/tree/changelog.Debian.gz' },

        { t: 'cal', kind: 'tip', title: 'md5sums là công cụ pháp y của bạn', x:
          '<p>Mã băm của <b>từng file</b> được lưu lại lúc cài. Nhờ đó gói ' +
          '<code>debsums</code> có thể quét cả hệ thống và chỉ ra file nào đã bị sửa so với ' +
          'bản gốc từ kho — cách nhanh nhất phát hiện một file nhị phân bị thay trộm, hoặc đơn ' +
          'giản là nhớ ra mình đã tự tay sửa file cấu hình nào.</p>' +
          '<p>Cùng ý tưởng với chuỗi tin cậy ở bước tiếp theo, chỉ khác điểm neo: ở đây so với ' +
          'bản đã cài, ở đó so với bản đã được ký.</p>' }
      ]},

      /* ─────────── BƯỚC 5 ─────────── */
      { title: 'Bước 5 — Lần theo chuỗi tin cậy', blocks: [
        { t: 'p', x:
          'Mỗi lần cài một gói, bạn đang cho phép một máy chủ ở nửa kia trái đất ghi file vào ' +
          '<code>/usr/bin</code> của mình với quyền root. Bước này chỉ ra <b>cơ chế nào</b> ' +
          'khiến việc đó vẫn an toàn. Bắt đầu từ khai báo kho.' },

        { t: 'code', where: 'wsl', code:
          'ls /etc/apt/sources.list.d/\n' +
          'grep -vE \'^#|^$\' /etc/apt/sources.list.d/ubuntu.sources' },

        { t: 'code', where: 'out', nocopy: true, code:
          'ubuntu.sources\n' +
          'Types: deb\n' +
          'URIs: http://archive.ubuntu.com/ubuntu/\n' +
          'Suites: resolute resolute-updates resolute-backports\n' +
          'Components: main universe restricted multiverse\n' +
          'Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n' +
          'Types: deb\n' +
          'URIs: http://security.ubuntu.com/ubuntu/\n' +
          'Suites: resolute-security\n' +
          'Components: main universe restricted multiverse\n' +
          'Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg' },

        { t: 'cal', kind: 'info', title: 'Hai khối, hai máy chủ, một khoá', x:
          '<p>Khối trên là kho chính; khối dưới <b>chỉ</b> phục vụ bản vá bảo mật và nằm trên ' +
          'một máy chủ riêng. Tách ra để khi <code>archive.ubuntu.com</code> quá tải hay bị ' +
          'chặn, vá bảo mật vẫn về được.</p>' +
          '<p>Cả hai dùng chung một file khoá ở dòng <code>Signed-By:</code> — vì cùng do ' +
          'Canonical ký. Một kho của bên thứ ba sẽ có file khoá riêng, và khoá đó ' +
          '<b>chỉ có hiệu lực với kho của nó</b>.</p>' +
          '<p>Lưu ý <code>Suites: resolute</code>: đây là tên mã của Ubuntu 26.04. Mỗi bản ' +
          'Ubuntu có một tên mã riêng, và chép nhầm tên mã của bản khác vào file này là cách ' +
          'nhanh nhất để phá hỏng một hệ thống.</p>' },

        { t: 'p', x: 'Bây giờ tới điểm neo của toàn bộ chuỗi: file khoá công khai.' },

        { t: 'code', where: 'wsl', code:
          'gpg --no-default-keyring \\\n' +
          '    --keyring /usr/share/keyrings/ubuntu-archive-keyring.gpg \\\n' +
          '    --list-keys | head -10' },

        { t: 'code', where: 'out', nocopy: true, code:
          '/usr/share/keyrings/ubuntu-archive-keyring.gpg\n' +
          '----------------------------------------------\n' +
          'pub   rsa4096 2012-05-11 [SC]\n' +
          '      790BC7277767219C42C86F933B4FE6ACC0B21F32\n' +
          'uid           [ unknown] Ubuntu Archive Automatic Signing Key (2012) <ftpmaster@ubuntu.com>\n' +
          '\n' +
          'pub   rsa4096 2012-05-11 [SC]\n' +
          '      843938DF228D22F7B3742BC0D94AA3F0EFE21092\n' +
          'uid           [ unknown] Ubuntu CD Image Automatic Signing Key (2012) <cdimage@ubuntu.com>' },

        { t: 'cmdx', cmd: 'gpg --no-default-keyring --keyring … --list-keys', title: 'Vì sao lệnh dài như vậy',
          rows: [
            ['<code>--no-default-keyring</code>', 'Bỏ qua chùm khoá cá nhân của bạn', 'Không có nó, gpg sẽ trộn khoá riêng của bạn vào kết quả'],
            ['<code>--keyring <i>file</i></code>', 'Chỉ đọc đúng file khoá này', 'File mà dòng <code>Signed-By:</code> trỏ tới'],
            ['<code>--list-keys</code>', 'Liệt kê khoá công khai bên trong', ''],
            ['<code>790BC727…C0B21F32</code>', '<b>Vân tay</b> của khoá — 40 ký tự hex', 'Đây mới là danh tính thật của khoá. Tên và email chỉ là nhãn, ai cũng ghi được'],
            ['<code>rsa4096</code> · <code>2012</code>', 'Thuật toán, độ dài, năm tạo', 'Khoá này đã ký cho mọi gói Ubuntu suốt hơn một thập kỷ']
          ]},

        { t: 'p', x:
          'Khoá đó dùng để kiểm chữ ký của file <code>InRelease</code> — file mà ' +
          '<code>apt update</code> tải về đầu tiên. Hãy xem hai đầu của nó.' },

        { t: 'code', where: 'wsl', code:
          'cd /var/lib/apt/lists\n' +
          'head -8 archive.ubuntu.com_ubuntu_dists_resolute_InRelease\n' +
          'echo \'--- cuoi file ---\'\n' +
          'tail -3 archive.ubuntu.com_ubuntu_dists_resolute_InRelease' },

        { t: 'code', where: 'out', nocopy: true, code:
          '-----BEGIN PGP SIGNED MESSAGE-----\n' +
          'Hash: SHA512\n' +
          '\n' +
          'Origin: Ubuntu\n' +
          'Label: Ubuntu\n' +
          'Suite: resolute\n' +
          'Version: 26.04\n' +
          'Codename: resolute\n' +
          '--- cuoi file ---\n' +
          '43BaDciqYoThL5ZQV+ADjemG3v2zl5gzeDVsMn6YOyrbQ4aTcxw=\n' +
          '=JYDG\n' +
          '-----END PGP SIGNATURE-----' },

        { t: 'cal', kind: 'why', title: 'Vì sao tên file là InRelease chứ không phải Release', x:
          '<p>Chữ <b>In</b> là <i>inline</i>: chữ ký nằm <b>ngay trong</b> file, kẹp phần nội ' +
          'dung giữa <code>BEGIN PGP SIGNED MESSAGE</code> và <code>BEGIN PGP SIGNATURE</code>. ' +
          'Cách cũ tách làm hai file <code>Release</code> + <code>Release.gpg</code>, và mở ra ' +
          'một khe hở: kẻ tấn công có thể phát tán một file nội dung mới kèm chữ ký cũ.</p>' +
          '<p>Gộp lại thành một file thì nội dung và chữ ký không thể tách rời nhau nữa. Đây là ' +
          'kiểu sửa lỗi bảo mật bằng <b>thiết kế</b> chứ không bằng kiểm tra thêm — và bạn sẽ ' +
          'thấy lại đúng tư duy này ở Bài 68 khi làm secure boot.</p>' },

        { t: 'p', x:
          'Mắt xích cuối: phần nội dung được ký ấy chứa mã băm của từng file chỉ mục.' },

        { t: 'code', where: 'wsl', code:
          'grep -A 3 \'^SHA256:\' archive.ubuntu.com_ubuntu_dists_resolute_InRelease\n' +
          'cd ~' },

        { t: 'code', where: 'out', nocopy: true, code:
          'SHA256:\n' +
          ' 0515066c36dc59a1427f7d4c11d4477d8cac8969ac9fd1a7226b07454e9219fa        924878869 Contents-amd64\n' +
          ' c8403f683c61f7a39219a32de5ba8363ac78183e8629f268ba704e064a394ca0         56915356 Contents-amd64.gz\n' +
          ' aec3ce2a7c49a6893491d80495b78b5c3306c3c10bc7d4c1f98985f43d17ac95        924446993 Contents-amd64v3' },

        { t: 'cal', kind: 'why', title: 'Toàn bộ chuỗi tin cậy, trong bốn câu', x:
          '<p><b>Một.</b> Khoá GPG đến cùng bản cài Ubuntu, được coi là đáng tin từ đầu.<br>' +
          '<b>Hai.</b> Khoá đó xác nhận chữ ký của <code>InRelease</code> — nên nội dung ' +
          '<code>InRelease</code> đáng tin.<br>' +
          '<b>Ba.</b> <code>InRelease</code> chứa SHA256 của từng file chỉ mục — nên chỉ mục ' +
          'đáng tin.<br>' +
          '<b>Bốn.</b> Chỉ mục chứa SHA256 của từng file <code>.deb</code> — nên gói tải về, ' +
          'sau khi băm lại và đối chiếu, cũng đáng tin.</p>' +
          '<p>Kết quả: kho phần mềm chạy trên <code>http://</code> chứ không phải ' +
          '<code>https://</code> mà vẫn an toàn trước việc bị sửa nội dung. Đổi một byte ở bất ' +
          'kỳ mắt xích nào cũng làm mã băm lệch, và apt dừng lại. Mã hoá đường truyền giải ' +
          'quyết chuyện <i>ai nghe lén</i>; chữ ký giải quyết chuyện <i>nội dung có bị đổi ' +
          'không</i> — bài toán quan trọng hơn hẳn ở đây.</p>' },

        { t: 'cal', kind: 'danger', title: 'Mỗi kho thêm vào là một người nữa được ghi vào /usr/bin của bạn', x:
          '<p>Khi bạn thêm một kho bên thứ ba, bạn trao cho chủ kho đó quyền cài file bất kỳ ' +
          'với quyền root, mãi mãi, cho tới khi bạn gỡ kho ra. Không có cơ chế nào giới hạn ' +
          '"kho này chỉ được cài phần mềm của kho này".</p>' +
          '<p>Ba câu hỏi bắt buộc trước khi thêm bất kỳ kho nào: <b>ai vận hành nó, khoá lấy ' +
          'từ đâu, và tôi có thật sự cần không?</b> Nếu hướng dẫn bảo bạn ' +
          '<code>curl … | sudo bash</code>, hãy đọc kỹ nội dung script trước khi chạy.</p>' },

        { t: 'cal', kind: 'tip', title: 'Bạn có thể tự kiểm tra chữ ký của bất cứ thứ gì', x:
          '<p>Chính cơ chế này bảo vệ mã nguồn kernel bạn sẽ tải về ở <b>Chặng 07</b>: ' +
          '<code>kernel.org</code> phát hành kèm file <code>.sign</code>, và bạn xác minh bằng ' +
          '<code>gpg --verify linux-6.x.tar.sign linux-6.x.tar</code>.</p>' +
          '<p>Nhiều kỹ sư bỏ qua bước này. Đừng — nhất là khi mã nguồn ấy sẽ chạy với quyền cao ' +
          'nhất trên một thiết bị gửi tới tay khách hàng.</p>' }
      ]},

      /* ─────────── BƯỚC 6 ─────────── */
      { title: 'Bước 6 — Cố tình làm gãy phụ thuộc, rồi sửa', blocks: [
        { t: 'p', x:
          'Đây là bước quan trọng nhất của bài. Bạn sẽ <b>chủ động tạo ra</b> đúng loại sự cố ' +
          'mà mọi kỹ sư Linux đều gặp, để lần gặp thật bạn nhận ra nó ngay. Vật thí nghiệm là ' +
          '<code>gpiod</code> — bộ công cụ GPIO bạn sẽ dùng thật ở Chặng 10 — cùng thư viện ' +
          'của nó, <code>libgpiod3</code>.' },

        { t: 'p', x:
          'Trước hết hỏi apt xem <b>nếu</b> cài đúng cách thì chuyện gì xảy ra. Cờ ' +
          '<code>-s</code> là <i>simulate</i>: tính toán đầy đủ nhưng không đụng vào máy.' },

        { t: 'code', where: 'wsl', code: 'apt install -s gpiod' },

        { t: 'code', where: 'out', nocopy: true, code:
          'Installing:\n' +
          '  gpiod\n' +
          '\n' +
          'Installing dependencies:\n' +
          '  libgpiod3\n' +
          '\n' +
          'Summary:\n' +
          '  Upgrading: 0, Installing: 2, Removing: 0, Not Upgrading: 2\n' +
          'Inst libgpiod3 (2.2.1-3build1 Ubuntu:26.04/resolute [amd64])\n' +
          'Inst gpiod (2.2.1-3build1 Ubuntu:26.04/resolute [amd64])\n' +
          'Conf libgpiod3 (2.2.1-3build1 Ubuntu:26.04/resolute [amd64])\n' +
          'Conf gpiod (2.2.1-3build1 Ubuntu:26.04/resolute [amd64])' },

        { t: 'cal', kind: 'tip', title: 'apt install -s là thói quen của người cẩn thận', x:
          '<p>Đọc kỹ thứ tự bốn dòng cuối: <code>Inst libgpiod3</code> → <code>Inst gpiod</code> ' +
          '→ <code>Conf libgpiod3</code> → <code>Conf gpiod</code>. Apt <b>bung cả hai gói ' +
          'trước, cấu hình sau</b>, và trong cả hai giai đoạn thư viện luôn đi trước công cụ ' +
          'dùng nó. Thứ tự này chính là thứ <code>dpkg</code> không tự nghĩ ra được.</p>' +
          '<p>Trước mọi lệnh <code>apt install</code> hay <code>apt remove</code> lên một máy ' +
          'quan trọng, hãy chạy bản <code>-s</code> trước và đọc danh sách. Mất năm giây, tránh ' +
          'được cả buổi chiều.</p>' },

        { t: 'p', x:
          'Giờ làm ngược lại một cách cố ý: tải cả hai gói về nhưng chỉ cài ' +
          '<code>gpiod</code> bằng <code>dpkg</code> — công cụ <b>không</b> biết giải phụ thuộc.' },

        { t: 'code', where: 'wsl', code:
          'mkdir -p ~/embedded/bai12 && cd ~/embedded/bai12\n' +
          'apt-get download gpiod libgpiod3\n' +
          'sudo dpkg -i gpiod_*.deb\n' +
          'echo "ma tra ve = $?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'Get:1 http://archive.ubuntu.com/ubuntu resolute/universe amd64 gpiod amd64 2.2.1-3build1 [47.0 kB]\n' +
          'Get:2 http://archive.ubuntu.com/ubuntu resolute/universe amd64 libgpiod3 amd64 2.2.1-3build1 [71.5 kB]\n' +
          'Fetched 118 kB in 1s (81.5 kB/s)\n' +
          'Selecting previously unselected package gpiod.\n' +
          '(Reading database ... 50296 files and directories currently installed.)\n' +
          'Preparing to unpack gpiod_2.2.1-3build1_amd64.deb ...\n' +
          'Unpacking gpiod (2.2.1-3build1) ...\n' +
          'dpkg: dependency problems prevent configuration of gpiod:\n' +
          ' gpiod depends on libgpiod3 (>= 2.1); however:\n' +
          '  Package libgpiod3 is not installed.\n' +
          '\n' +
          'dpkg: error processing package gpiod (--install):\n' +
          ' dependency problems - leaving unconfigured\n' +
          'Errors were encountered while processing:\n' +
          ' gpiod\n' +
          'ma tra ve = 1' },

        { t: 'cal', kind: 'why', title: 'Đọc kỹ: dpkg đã bung file ra rồi mới báo lỗi', x:
          '<p>Dòng <code>Unpacking gpiod</code> chạy <b>thành công</b>. Chỉ tới bước cấu hình ' +
          'nó mới dừng: <code>leaving unconfigured</code>.</p>' +
          '<p>Nghĩa là các file của <code>gpiod</code> <b>đã nằm trên đĩa</b>, sổ sách đã ghi ' +
          'nhận, nhưng gói bị treo ở trạng thái nửa vời. Hệ thống bây giờ đang ở tình trạng ' +
          '<b>không nhất quán</b> — và đó chính xác là điều bạn muốn quan sát.</p>' +
          '<p><code>dpkg</code> làm đúng phận sự: nó <b>phát hiện</b> phụ thuộc thiếu và từ ' +
          'chối hoàn tất. Nó chỉ không biết <i>tự đi tìm</i> thứ còn thiếu. Đó là việc của ' +
          'apt.</p>' },

        { t: 'p', x: 'Xem trạng thái gói, rồi thử chạy chương trình vừa "cài".' },

        { t: 'code', where: 'wsl', code:
          'dpkg -l gpiod | tail -1\n' +
          'gpiodetect\n' +
          'echo "ma tra ve = $?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'iU  gpiod  2.2.1-3build1  amd64  Tools for interacting with Linux GPIO character device - binary\n' +
          'gpiodetect: error while loading shared libraries: libgpiod.so.3: cannot open shared object file: No such file or directory\n' +
          'ma tra ve = 127' },

        { t: 'cmdx', cmd: 'Ba manh mối trong hai dòng trên', title: 'Học cách đọc triệu chứng',
          rows: [
            ['<code>iU</code>', '<b>i</b>nstall mong muốn, nhưng mới <b>U</b>npacked', 'Chữ <b>hoa</b> — luôn là dấu hiệu xấu'],
            ['<code>error while loading shared libraries</code>', 'Chương trình chạy được, nhưng <b>trình nạp động</b> không tìm thấy thư viện', 'Bài 17 sẽ mổ xẻ cơ chế này'],
            ['<code>libgpiod.so.3</code>', 'Tên file thư viện còn thiếu', '<b>Đây là manh mối để tra ngược</b>'],
            ['<code>127</code>', 'Mã trả về: "không chạy được lệnh"', 'Khác hẳn mã <code>1</code> nghĩa là "chạy rồi nhưng thất bại". Bài 13 sẽ dùng mã này']
          ]},

        { t: 'cal', kind: 'tip', title: 'Gặp lỗi này ngoài đời, đây là cách tra', x:
          '<p>Bạn có tên file <code>libgpiod.so.3</code>. Câu hỏi "gói nào chứa nó?" trả lời ' +
          'bằng <code>apt-file search libgpiod.so.3</code> (tra trong <b>mọi</b> gói của kho, ' +
          'kể cả gói chưa cài — cần <code>sudo apt install apt-file</code> trước), hoặc bằng ' +
          '<code>dpkg -S</code> nếu gói đã cài rồi.</p>' +
          '<p>Ở đây có đường tắt nhanh hơn: số <b>3</b> trong <code>libgpiod.so.3</code> chính ' +
          'là số trong tên gói <code>libgpiod3</code>. Quy ước đặt tên của Debian gắn số ' +
          '<b>ABI</b> của thư viện vào tên gói, để hai phiên bản không tương thích có thể cùng ' +
          'tồn tại trên một máy. Bạn sẽ hiểu tường tận ABI ở <b>Bài 17</b>.</p>' },

        { t: 'p', x:
          'Bây giờ hỏi apt xem nó nghĩ gì về tình trạng hiện tại của hệ thống.' },

        { t: 'code', where: 'wsl', code:
          'sudo apt-get check\n' +
          'echo "ma tra ve = $?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'Reading package lists...\n' +
          'Building dependency tree...\n' +
          'Reading state information...\n' +
          'You might want to run \'apt --fix-broken install\' to correct these.\n' +
          'The following packages have unmet dependencies:\n' +
          ' gpiod : Depends: libgpiod3 (>= 2.1) but it is not installed\n' +
          'E: Unmet dependencies. Try \'apt --fix-broken install\' with no packages (or specify a solution).\n' +
          'ma tra ve = 100' },

        { t: 'cal', kind: 'info', title: 'apt-get check là lệnh chẩn đoán nên gõ đầu tiên', x:
          '<p>Nó không cài, không gỡ, không tải gì — chỉ đọc sổ và trả lời một câu duy nhất: ' +
          '<b>cây phụ thuộc hiện có nhất quán không?</b></p>' +
          '<p>Mã trả về <b>100</b> là "có vấn đề", <b>0</b> là sạch. Vì có mã trả về rõ ràng, ' +
          'bạn có thể đưa nó vào script kiểm tra hệ thống — kỹ thuật của <b>Bài 13</b>.</p>' +
          '<p>Chú ý apt còn <i>gợi ý sẵn cách sửa</i> ngay trong thông báo lỗi. Thói quen tốt ' +
          'nhất khi gặp lỗi Linux: <b>đọc hết thông báo trước khi tìm trên mạng</b>. Rất nhiều ' +
          'lần câu trả lời nằm ngay ở dòng cuối.</p>' },

        { t: 'p', x: 'Làm đúng như nó bảo.' },

        { t: 'code', where: 'wsl', code: 'sudo apt-get --fix-broken install' },

        { t: 'code', where: 'out', nocopy: true, code:
          'Reading package lists...\n' +
          'Building dependency tree...\n' +
          'Reading state information...\n' +
          'Correcting dependencies... Done\n' +
          'Solving dependencies...\n' +
          'The following additional packages will be installed:\n' +
          '  libgpiod3\n' +
          'The following NEW packages will be installed:\n' +
          '  libgpiod3\n' +
          '0 upgraded, 1 newly installed, 0 to remove and 2 not upgraded.\n' +
          '1 not fully installed or removed.\n' +
          'Need to get 0 B/71.5 kB of archives.\n' +
          'After this operation, 291 kB of additional disk space will be used.\n' +
          'Selecting previously unselected package libgpiod3:amd64.\n' +
          'Preparing to unpack .../libgpiod3_2.2.1-3build1_amd64.deb ...\n' +
          'Unpacking libgpiod3:amd64 (2.2.1-3build1) ...\n' +
          'Setting up libgpiod3:amd64 (2.2.1-3build1) ...\n' +
          'Setting up gpiod (2.2.1-3build1) ...\n' +
          'Processing triggers for libc-bin (2.43-2ubuntu2.3) ...' },

        { t: 'cal', kind: 'why', title: 'Ba chi tiết đáng để ý trong kết quả sửa lỗi', x:
          '<p><b><code>Need to get 0 B/71.5 kB</code></b> — apt <i>không tải lại</i> ' +
          '<code>libgpiod3</code> vì bạn đã <code>apt-get download</code> nó về và nó vẫn còn ' +
          'trong cache. Bộ nhớ đệm đã tiết kiệm đúng 71,5 kB đường truyền.</p>' +
          '<p><b><code>1 not fully installed or removed</code></b> — apt tự nhận ra gói ' +
          '<code>gpiod</code> đang dở dang, không cần bạn khai báo.</p>' +
          '<p><b>Hai dòng <code>Setting up</code> liền nhau</b> — apt cấu hình ' +
          '<code>libgpiod3</code> trước, rồi <b>quay lại hoàn tất <code>gpiod</code></b> mà ' +
          '<code>dpkg</code> đã bỏ dở. Đây chính là "phần thông minh" ở tầng trên: nó không cài ' +
          'lại từ đầu, nó <i>vá</i> đúng chỗ hỏng.</p>' },

        { t: 'p', x: 'Kiểm chứng lần cuối rằng mọi thứ đã sạch.' },

        { t: 'code', where: 'wsl', code:
          'dpkg -l gpiod libgpiod3 | tail -2\n' +
          'gpiodetect\n' +
          'echo "ma tra ve = $?"\n' +
          'sudo apt-get check && echo \'he thong sach\'' },

        { t: 'code', where: 'out', nocopy: true, code:
          'ii  gpiod            2.2.1-3build1  amd64  Tools for interacting with Linux GPIO character device - binary\n' +
          'ii  libgpiod3:amd64  2.2.1-3build1  amd64  C library for interacting with Linux GPIO device - shared libraries\n' +
          'ma tra ve = 0\n' +
          'Reading package lists...\n' +
          'Building dependency tree...\n' +
          'Reading state information...\n' +
          'he thong sach' },

        { t: 'cal', kind: 'info', title: 'gpiodetect không in gì cả — và đó là kết quả đúng', x:
          '<p><code>iU</code> đã thành <code>ii</code>, mã trả về từ <b>127</b> xuống <b>0</b>: ' +
          'chương trình chạy được rồi. Nó không in dòng nào vì <b>WSL2 không có chip GPIO ' +
          'nào</b> — như bạn đã biết từ Bài 3, đây là máy ảo, không có chân cắm.</p>' +
          '<p>"Chạy thành công và không tìm thấy gì" khác hẳn "không chạy được". Phân biệt được ' +
          'hai tình huống này qua <b>mã trả về</b> chứ không qua màn hình trống là một kỹ năng ' +
          'nền tảng — <b>Bài 13</b> sẽ xây toàn bộ phần xử lý lỗi của script lên nó.</p>' +
          '<p>Bạn sẽ chạy lại đúng lệnh <code>gpiodetect</code> này ở <b>Chặng 10</b>, lúc đó ' +
          'trên một hệ thống ARM64 có GPIO mô phỏng, và nó sẽ liệt kê ra chip thật.</p>' },

        { t: 'cal', kind: 'tip', title: 'Bốn lệnh cấp cứu, theo đúng thứ tự này', x:
          '<p><b>1.</b> <code>sudo apt-get check</code> — hỏi xem có gãy không.<br>' +
          '<b>2.</b> <code>dpkg -l | grep -v \'^ii\'</code> — gói nào đang dở dang (bỏ qua vài ' +
          'dòng tiêu đề của bảng).<br>' +
          '<b>3.</b> <code>sudo apt-get --fix-broken install</code> — bảo apt tự vá.<br>' +
          '<b>4.</b> <code>sudo dpkg --configure -a</code> — hoàn tất cấu hình mọi gói còn treo ' +
          'ở trạng thái <code>iU</code>.</p>' +
          '<p>Bốn lệnh này sửa được đại đa số sự cố gói trên Debian và Ubuntu. Chép vào sổ tay ' +
          'của bạn — sẽ có ngày cần tới, thường là vào lúc không mong đợi nhất.</p>' }
      ]},

      /* ─────────── BƯỚC 7 ─────────── */
      { title: 'Bước 7 — Mã nguồn, dung lượng, và dọn dẹp', blocks: [
        { t: 'p', x:
          'Cho tới giờ bạn mới làm việc với gói <b>đã biên dịch</b>. Nhưng Ubuntu cũng phát ' +
          'hành <b>mã nguồn</b> của từng gói, kèm theo mọi bản vá mà nhà bảo trì đã áp lên. ' +
          'Với người làm nhúng, đây là kho báu: bạn thường phải sửa một gói rồi biên dịch lại ' +
          'cho kiến trúc khác.' },

        { t: 'code', where: 'wsl', code:
          'cd ~/embedded/bai12\n' +
          'apt-get source tree' },

        { t: 'code', where: 'out', nocopy: true, code:
          'Reading package lists...\n' +
          'E: You must put some \'deb-src\' URIs in your sources.list' },

        { t: 'cal', kind: 'why', title: 'Vì sao Ubuntu tắt sẵn deb-src', x:
          '<p>Chỉ mục mã nguồn là <b>một bộ dữ liệu riêng</b>, phải tải thêm và cập nhật thêm ' +
          'mỗi lần <code>apt update</code>. Đại đa số người dùng không bao giờ cần tới nó, nên ' +
          'Ubuntu để mặc định tắt cho nhẹ.</p>' +
          '<p>Bạn thì cần. Từ Chặng 04 trở đi bạn sẽ đọc và sửa mã nguồn của người khác liên ' +
          'tục — kernel, U-Boot, thư viện. Bật nó lên là bước chuẩn bị chính đáng.</p>' },

        { t: 'p', x:
          'Bật bằng cách thêm <code>deb-src</code> vào dòng <code>Types:</code>. Cách an toàn ' +
          'nhất là sao lưu trước, sửa, rồi cập nhật chỉ mục.' },

        { t: 'code', where: 'wsl', code:
          'sudo cp /etc/apt/sources.list.d/ubuntu.sources ~/ubuntu.sources.goc\n' +
          'sudo sed -i \'s/^Types: deb$/Types: deb deb-src/\' /etc/apt/sources.list.d/ubuntu.sources\n' +
          'grep \'^Types:\' /etc/apt/sources.list.d/ubuntu.sources\n' +
          'sudo apt update' },

        { t: 'code', where: 'out', nocopy: true, code:
          'Types: deb deb-src\n' +
          'Types: deb deb-src\n' +
          'Get:7 http://archive.ubuntu.com/ubuntu resolute/main Sources [1002 kB]\n' +
          'Get:8 http://security.ubuntu.com/ubuntu resolute-security/main Sources [140 kB]\n' +
          'Get:9 http://security.ubuntu.com/ubuntu resolute-security/universe Sources [45.8 kB]\n' +
          'Get:10 http://archive.ubuntu.com/ubuntu resolute/multiverse Sources [215 kB]' },

        { t: 'cmdx', cmd: 'sudo sed -i \'s/^Types: deb$/Types: deb deb-src/\' …', title: 'Chính xác vì sao mẫu tìm kiếm phải viết như vậy',
          rows: [
            ['<code>sed -i</code>', 'Sửa thẳng vào file', 'Kỹ thuật của Bài 11. Vì thế mới phải <code>cp</code> sao lưu trước'],
            ['<code>^Types: deb$</code>', 'Neo <b>cả hai đầu</b>', '<b>Đây là chi tiết sống còn.</b> Không có <code>$</code> thì chạy lệnh hai lần sẽ ra <code>Types: deb deb-src deb-src</code>'],
            ['<code>sudo</code>', 'File thuộc về root', 'Không có sudo thì <code>Permission denied</code>'],
            ['<code>apt update</code> sau đó', 'Tải chỉ mục mã nguồn về', 'Các dòng <code>Sources</code> mới xuất hiện chính là bằng chứng nó có tác dụng']
          ]},

        { t: 'code', where: 'wsl', code:
          'apt-get source tree\n' +
          'ls -l tree*' },

        { t: 'code', where: 'out', nocopy: true, code:
          'dpkg-source: info: extracting tree in tree-2.3.1\n' +
          'dpkg-source: info: unpacking tree_2.3.1.orig.tar.gz\n' +
          'dpkg-source: info: unpacking tree_2.3.1-1.debian.tar.xz\n' +
          'dpkg-source: info: using patch list from debian/patches/series\n' +
          'dpkg-source: info: applying manpage\n' +
          'Fetched 81.8 kB in 1s (63.7 kB/s)\n' +
          '-rw-r--r-- 1 shinarus shinarus  9568 Feb  4 08:10 tree_2.3.1-1.debian.tar.xz\n' +
          '-rw-r--r-- 1 shinarus shinarus  1869 Feb  4 08:10 tree_2.3.1-1.dsc\n' +
          '-rw-r--r-- 1 shinarus shinarus 70339 Feb  4 08:10 tree_2.3.1.orig.tar.gz' },

        { t: 'cmdx', cmd: 'Ba file làm nên một gói nguồn Debian', title: 'Mô hình mà bạn sẽ gặp lại suốt phần còn lại của khoá học',
          rows: [
            ['<code>*.orig.tar.gz</code> · 70 339 B', 'Mã nguồn <b>nguyên bản</b> của tác giả', 'Không ai được sửa một byte nào trong đây'],
            ['<code>*.debian.tar.xz</code> · 9 568 B', 'Toàn bộ <b>thay đổi</b> của nhà đóng gói', 'Chỉ 9,5 kB — chứa thư mục <code>debian/</code> và các bản vá'],
            ['<code>*.dsc</code> · 1 869 B', 'File mô tả, có chữ ký, chứa mã băm của hai file kia', '<b>d</b>ebian <b>s</b>ource <b>c</b>ontrol'],
            ['<code>applying manpage</code>', 'Một bản vá vừa được áp lên mã gốc', 'Debian bổ sung trang man mà tác giả không viết']
          ]},

        { t: 'cal', kind: 'why', title: 'Vì sao tách "mã gốc" khỏi "thay đổi" — mô hình này quyết định cả Chặng 11', x:
          '<p>Mã gốc giữ nguyên vẹn, mọi thay đổi nằm riêng dưới dạng bản vá. Nhờ đó ai cũng ' +
          'kiểm chứng được <b>chính xác</b> Debian đã sửa gì so với bản của tác giả — chỉ cần ' +
          'đọc 9,5 kB thay vì so sánh 70 kB mã nguồn.</p>' +
          '<p>Khi tác giả ra bản mới, nhà bảo trì thay <code>orig.tar.gz</code> và áp lại bộ vá ' +
          'cũ. Bản vá nào không còn áp được nghĩa là chỗ đó đã đổi — một cơ chế cảnh báo tự ' +
          'động.</p>' +
          '<p><b>Buildroot và Yocto ở Chặng 11 dùng đúng mô hình này</b>: tải mã nguồn gốc, áp ' +
          'bộ vá riêng của bạn, rồi biên dịch. Hiểu nó hôm nay là hiểu trước một nửa Chặng ' +
          '11.</p>' },

        { t: 'p', x:
          'Thư mục <code>debian/</code> mới là thứ biến mã nguồn thành gói. Hãy mở ra xem.' },

        { t: 'code', where: 'wsl', code:
          'ls tree-2.3.1/debian/\n' +
          'head -14 tree-2.3.1/debian/control' },

        { t: 'code', where: 'out', nocopy: true, code:
          'changelog  control  copyright  docs  patches  rules  salsa-ci.yml  source  tests  watch\n' +
          'Source: tree\n' +
          'Section: utils\n' +
          'Maintainer: Florian Ernst <florian@debian.org>\n' +
          'Build-Depends: debhelper-compat (= 13)\n' +
          'Standards-Version: 4.7.3\n' +
          'Homepage: http://oldmanprogrammer.net/source.php?dir=projects/tree\n' +
          'Vcs-Git: https://salsa.debian.org/debian/tree-packaging.git\n' +
          'Vcs-Browser: https://salsa.debian.org/debian/tree-packaging\n' +
          '\n' +
          'Package: tree\n' +
          'Architecture: any\n' +
          'Depends: ${shlibs:Depends}, ${misc:Depends}\n' +
          'Description: displays an indented directory tree, in color\n' +
          ' Tree is a recursive directory listing command that produces a depth indented' },

        { t: 'terms', items: [
          ['debian/control', '', 'Khai báo gói nguồn <b>và</b> các gói nhị phân sinh ra từ nó. Một gói nguồn có thể đẻ ra nhiều gói nhị phân'],
          ['debian/rules', '', 'Một <b>Makefile</b> thật sự, dòng đầu là <code>#!/usr/bin/make -f</code>. Nó điều khiển toàn bộ quá trình build'],
          ['debian/changelog', '', 'Lịch sử phiên bản. Dòng đầu tiên quyết định <b>số phiên bản của gói</b>'],
          ['debian/patches/', '', 'Các bản vá, áp theo thứ tự trong file <code>series</code>'],
          ['Build-Depends', '', 'Gói cần để <b>biên dịch</b>. Khác hẳn <code>Depends</code> là gói cần để <b>chạy</b>'],
          ['${shlibs:Depends}', '', 'Biến — công cụ đóng gói tự dò thư viện mà file nhị phân dùng rồi điền vào. <b>Không ai gõ tay danh sách phụ thuộc thư viện</b>']
        ]},

        { t: 'cal', kind: 'info', title: 'Hai chi tiết dễ bỏ qua nhưng rất đáng nhớ', x:
          '<p><b><code>Architecture: any</code></b> nghĩa là gói này biên dịch được cho ' +
          '<i>mọi</i> kiến trúc — amd64, arm64, riscv64. Chính dòng này cho phép Ubuntu tự động ' +
          'dựng bản ARM64 của <code>tree</code> mà không ai phải sửa gì. Đối lập với ' +
          '<code>Architecture: all</code> của các gói thuần dữ liệu hoặc script.</p>' +
          '<p><b><code>Build-Depends: debhelper-compat (= 13)</code></b> — muốn tự biên dịch ' +
          'lại gói này, chạy <code>sudo apt build-dep tree</code> và apt sẽ cài đúng bộ công cụ ' +
          'build cần thiết. Một lệnh, thay cho việc dò tìm thủ công.</p>' },

        { t: 'p', x:
          'Trước khi dọn dẹp, hãy đo xem hệ thống đang tiêu tốn bao nhiêu — và bao nhiêu trong ' +
          'đó là do bộ công cụ nhúng bạn đã cài từ <b>Bài 2</b>.' },

        { t: 'code', where: 'wsl', code:
          'dpkg -l | grep -c \'^ii\'\n' +
          'dpkg-query -W -f=\'${Installed-Size}\\n\' |\n' +
          '  awk \'{t += $1} END {printf "%.1f MB trong %d goi\\n", t/1024, NR}\'\n' +
          'dpkg-query -W -f=\'${Installed-Size}\\t${Package}\\n\' |\n' +
          '  grep aarch64 | sort -rn |\n' +
          '  awk \'{t += $1; printf "%8.1f MB  %s\\n", $1/1024, $2}\n' +
          '       END {printf "%8.1f MB  TONG %d goi\\n", t/1024, NR}\'' },

        { t: 'code', where: 'out', nocopy: true, code:
          '776\n' +
          '2524.9 MB trong 776 goi\n' +
          '   322.1 MB  qemu-efi-aarch64\n' +
          '    83.9 MB  gcc-15-aarch64-linux-gnu\n' +
          '    40.5 MB  cpp-15-aarch64-linux-gnu\n' +
          '    13.1 MB  binutils-aarch64-linux-gnu\n' +
          '     0.1 MB  gcc-15-aarch64-linux-gnu-base\n' +
          '     0.0 MB  gcc-aarch64-linux-gnu\n' +
          '     0.0 MB  cpp-aarch64-linux-gnu\n' +
          '   459.7 MB  TONG 7 goi' },

        { t: 'cal', kind: 'info', title: 'Ba con số đáng suy nghĩ', x:
          '<p><b>773 → 776.</b> Đúng ba gói đã được thêm trong bài này: <code>tree</code>, ' +
          '<code>gpiod</code>, <code>libgpiod3</code>. Sổ sách khớp với những gì bạn đã làm.</p>' +
          '<p><b>459,7 MB / 2 524,9 MB — hơn 18 %</b> hệ thống của bạn chỉ để phục vụ việc biên ' +
          'dịch cho ARM64. Đây là cái giá của phát triển nhúng trên máy x86, và nó chỉ tăng lên ' +
          'từ Chặng 04 trở đi.</p>' +
          '<p><b><code>gcc-aarch64-linux-gnu</code> chiếm 0,0 MB.</b> Nó là <i>gói rỗng</i> — ' +
          'chỉ tồn tại để trỏ sang <code>gcc-15-aarch64-linux-gnu</code>, nơi chứa 83,9 MB ' +
          'thật. Nhờ vậy bạn gõ được cái tên ngắn không kèm số phiên bản, còn phía dưới Ubuntu ' +
          'vẫn tự do nâng từ gcc-15 lên gcc-16. Bạn đã kiểm chứng cơ chế này ở Bài 2 khi ' +
          '<code>aarch64-linux-gnu-gcc --version</code> in ra <b>15.2.0</b>.</p>' },

        { t: 'p', x:
          'Cuối cùng, hai lệnh nữa rồi trả máy về trạng thái ban đầu. Trước hết là câu hỏi ' +
          '"gói nào do tôi chọn, gói nào bị kéo theo?" — cơ sở để dọn rác về sau.' },

        { t: 'code', where: 'wsl', code:
          'apt-mark showmanual | wc -l\n' +
          'apt-mark showauto | wc -l\n' +
          'apt-get -s remove libc6 | tail -4' },

        { t: 'code', where: 'out', nocopy: true, code:
          '45\n' +
          '731\n' +
          'E: Unable to satisfy dependencies. Reached two conflicting assignments:\n' +
          '   1. dpkg:amd64 is selected for install\n' +
          '   2. dpkg:amd64 PreDepends libc6 (>= 2.38)\n' +
          '      but none of the choices are installable:\n' +
          '      - libc6:amd64 is selected for removal' },

        { t: 'cal', kind: 'danger', title: '45 gói bạn chọn đã kéo theo 731 gói khác', x:
          '<p>Tỉ lệ <b>1 : 16</b>. Mỗi lần bạn gõ <code>apt install</code> một cái tên, trung ' +
          'bình mười sáu gói khác lặng lẽ đi theo. Chỉ những gói ' +
          '<code>showmanual</code> mới được apt coi là "bạn thật sự muốn"; phần còn lại là ' +
          '<code>showauto</code> và sẽ bị <code>apt autoremove</code> dọn đi khi không còn ai ' +
          'cần.</p>' +
          '<p>Còn phần dưới là lý do <b>không bao giờ</b> được gỡ <code>libc6</code>: apt thậm ' +
          'chí không tính nổi một phương án, vì <code>dpkg</code> — chính công cụ dùng để gỡ — ' +
          '<code>PreDepends</code> vào <code>libc6</code>. Con rắn tự cắn đuôi mình.</p>' +
          '<p>Chú ý cờ <code>-s</code>: lệnh trên <b>chỉ mô phỏng</b>. Đừng bao giờ chạy nó mà ' +
          'thiếu <code>-s</code>.</p>' },

        { t: 'code', where: 'wsl', code:
          'sudo cp ~/ubuntu.sources.goc /etc/apt/sources.list.d/ubuntu.sources\n' +
          'sudo apt update > /dev/null\n' +
          'sudo apt-get check && echo \'he thong sach\'\n' +
          'cd ~ && rm -rf ~/embedded/bai12 ~/ubuntu.sources.goc' },

        { t: 'code', where: 'out', nocopy: true, code:
          'Reading package lists...\n' +
          'Building dependency tree...\n' +
          'Reading state information...\n' +
          'he thong sach' },

        { t: 'cal', kind: 'tip', title: 'Vì sao phải trả deb-src về như cũ', x:
          '<p>Không bắt buộc — để bật cũng chẳng hỏng gì, chỉ khiến mỗi lần <code>apt ' +
          'update</code> tải thêm vài megabyte chỉ mục mã nguồn. Bật lại bất cứ lúc nào bạn ' +
          'cần.</p>' +
          '<p>Điều <b>bắt buộc</b> là thói quen: <b>sửa file hệ thống thì sao lưu trước, và trả ' +
          'về được</b>. Ở Chặng 06 bạn sẽ sửa cấu hình bootloader U-Boot, nơi một lỗi đánh máy ' +
          'đủ để ' +
          'thiết bị không boot nữa. Tập phản xạ đó từ bây giờ, trên một file vô hại.</p>' +
          '<p>Ba gói <code>tree</code>, <code>gpiod</code> và <code>libgpiod3</code> thì ' +
          '<b>giữ lại</b> — cả ba đều sẽ được dùng trong các chặng sau.</p>' }
      ]}
    ]},

    /* ══════════════════════════════════════════════
       6. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Mọi dòng dưới đây đều là thông báo thật, phần lớn gặp trong chính lúc kiểm chứng bài ' +
      'này. Đọc trước một lượt, rồi quay lại tra khi cần.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>E: Unable to locate package <i>ten</i></code>',
         'Danh mục trên máy quá cũ, hoặc gói nằm ở khu chưa bật, hoặc gõ sai tên',
         '<code>sudo apt update</code> trước. Vẫn không thấy thì <code>apt search <i>tu-khoa</i></code>'],

        ['<code>E: Could not open lock file … Permission denied</code>',
         'Lệnh thay đổi hệ thống mà quên <code>sudo</code>',
         'Thêm <code>sudo</code>. Các lệnh <b>tra cứu</b> (<code>apt show</code>, <code>apt policy</code>, <code>dpkg -l</code>) thì không cần'],

        ['<code>E: Could not get lock /var/lib/dpkg/lock-frontend</code>',
         'Một tiến trình apt/dpkg khác đang chạy — thường là bản cập nhật tự động',
         '<b>Đợi vài phút</b>. Tuyệt đối không xoá file lock khi tiến trình kia còn sống, sẽ hỏng sổ'],

        ['<code>dependency problems - leaving unconfigured</code>',
         '<code>dpkg -i</code> cài một gói thiếu phụ thuộc — đúng tình huống bước 6',
         '<code>sudo apt-get --fix-broken install</code>'],

        ['<code>error while loading shared libraries: lib<i>X</i>.so.<i>N</i></code>',
         'Thiếu thư viện chia sẻ lúc chạy, không phải lúc cài',
         'Cài gói <code>lib<i>X</i><i>N</i></code>. Không rõ tên thì <code>apt-file search lib<i>X</i>.so.<i>N</i></code>'],

        ['<code>E: Unmet dependencies</code> · mã trả về <code>100</code>',
         'Cây phụ thuộc đang gãy, apt từ chối làm gì thêm cho tới khi sửa',
         '<code>sudo apt-get --fix-broken install</code>, rồi <code>sudo dpkg --configure -a</code>'],

        ['<code>tar (child): zstd: Cannot exec</code>',
         'Dùng <code>tar</code> mở <code>control.tar.zst</code> nhưng máy chưa có <code>zstd</code>',
         'Dùng <code>dpkg-deb -x</code> / <code>-e</code> — có sẵn mã giải nén bên trong. Hoặc <code>sudo apt install zstd</code>'],

        ['<code>E: You must put some \'deb-src\' URIs in your sources.list</code>',
         'Chạy <code>apt-get source</code> khi chỉ mục mã nguồn chưa bật',
         'Thêm <code>deb-src</code> vào dòng <code>Types:</code> rồi <code>sudo apt update</code>'],

        ['<code>W: Download is performed unsandboxed as root …</code>',
         'Chạy <code>apt-get download</code> bằng <code>sudo</code> vào thư mục mà người dùng <code>_apt</code> không đọc được',
         'Bỏ <code>sudo</code> đi — <code>apt-get download</code> <b>không cần</b> quyền root'],

        ['<code>WARNING: apt does not have a stable CLI interface</code>',
         'Gọi <code>apt</code> từ script hoặc khi đầu ra không phải màn hình',
         'Trong script dùng <code>apt-get</code> / <code>apt-cache</code>. Cú pháp của chúng được cam kết giữ nguyên'],

        ['<code>N: Ignoring file … in directory … invalid filename extension</code>',
         'File trong <code>sources.list.d/</code> đặt sai đuôi',
         'Đuôi phải là <code>.sources</code> (định dạng deb822) hoặc <code>.list</code> (định dạng cũ)'],

        ['<code>NO_PUBKEY <i>16 ký tự hex</i></code>',
         'Kho khai báo rồi nhưng khoá công khai chưa có, hoặc <code>Signed-By:</code> trỏ sai file',
         'Tải khoá của kho về <code>/etc/apt/keyrings/</code> và trỏ <code>Signed-By:</code> vào đó. <b>Không</b> dùng <code>apt-key</code>'],

        ['<code>Release file … is not valid yet</code>',
         'Đồng hồ máy sai — thường gặp sau khi WSL ngủ đông lâu',
         'Đồng bộ lại giờ, rồi <code>sudo apt update</code>'],

        ['<code>The following packages have been kept back</code>',
         'Bản mới cần cài thêm hoặc gỡ bớt gói khác, <code>apt upgrade</code> không được phép làm việc đó',
         '<code>sudo apt full-upgrade</code>, nhưng <b>đọc kỹ danh sách sẽ bị gỡ</b> trước khi đồng ý'],

        ['Gõ mật khẩu <code>sudo</code> mà màn hình không hiện gì',
         'Không phải lỗi. Linux cố tình không hiển thị, kể cả dấu sao',
         'Cứ gõ rồi Enter. Đây là hành vi bình thường của <code>sudo</code>'],

        ['<code>apt list --upgradable</code> báo có gói cần nâng nhưng nâng xong vẫn còn',
         'Gói đó bị giữ lại bằng <code>apt-mark hold</code>',
         '<code>apt-mark showhold</code> để xem, <code>sudo apt-mark unhold <i>goi</i></code> để bỏ giữ']
      ]},

    /* ══════════════════════════════════════════════
       7. TÓM TẮT
       ══════════════════════════════════════════════ */
    { t: 'recap', title: 'Tóm tắt Bài 12', items: [
      '<b>dpkg</b> cài một file <code>.deb</code> và ghi sổ; <b>apt</b> tìm gói, giải phụ thuộc, tải về rồi <b>gọi dpkg</b>. Mọi thay đổi trên đĩa đều đi qua dpkg.',
      'Một file <code>.deb</code> là kho <b>ar</b> gồm đúng ba phần: <code>debian-binary</code> (4 byte), <code>control.tar.zst</code> (737 B) và <code>data.tar.zst</code> (52 619 B — <b>99 % dung lượng</b>).',
      'Sổ gốc của hệ thống nằm ở <code>/var/lib/dpkg/</code>: file <code>status</code> chứa từng khối thông tin gói, thư mục <code>info/</code> chứa danh sách file và script của từng gói.',
      'Bốn lệnh tra cứu: <code>dpkg -l</code> đã cài chưa · <code>dpkg -s</code> thông tin đầy đủ · <code>dpkg -L</code> gói này có file nào · <code>dpkg -S</code> file này thuộc gói nào.',
      'Cặp <code>-L</code> / <code>-S</code> đi <b>hai chiều ngược nhau</b>, và chiều ngược (<code>-S</code>) là chiều tiết kiệm thời gian nhất khi gỡ lỗi.',
      'Trên Ubuntu 26.04, <code>ls</code> đến từ <code>coreutils-from-uutils</code> viết bằng <b>Rust</b>, không còn là <code>coreutils</code> của GNU. Khi nghi ngờ: <code>which</code> → <code>readlink -f</code> → <code>dpkg -S</code>.',
      '<code>apt update</code> chỉ tải <b>danh mục</b> (143 MB trên máy này), không cài gì. Lỗi <code>Unable to locate package</code> hầu hết là do danh mục cũ.',
      'Hỏi trước khi cài: <code>apt show</code> gói là gì · <code>apt policy</code> bản nào sẽ cài · <code>apt depends</code> cần gì · <code>apt rdepends</code> ai đang cần nó · <code>apt install -s</code> mô phỏng.',
      '<b>Download-Size</b> (53,5 kB) là dung lượng nén qua mạng; <b>Installed-Size</b> (125 kB) là dung lượng trên đĩa. Nhầm hai số này là tính sai dung lượng rootfs.',
      'Chuỗi tin cậy bốn mắt xích: khoá GPG → chữ ký trong <code>InRelease</code> → SHA256 của chỉ mục → SHA256 của từng <code>.deb</code>. Nhờ nó kho chạy <code>http://</code> vẫn an toàn.',
      '<code>apt-key</code> đã bị loại bỏ. Cách đúng là đặt khoá riêng vào <code>/etc/apt/keyrings/</code> và trỏ bằng <code>Signed-By:</code>, để khoá chỉ có quyền với kho của nó.',
      'Trạng thái gói: <code>ii</code> bình thường · <code>iU</code> đã bung nhưng chưa cấu hình · <code>rc</code> đã gỡ còn file cấu hình. <b>Chữ hoa luôn là dấu hiệu xấu.</b>',
      'Bốn lệnh cấp cứu theo thứ tự: <code>apt-get check</code> → <code>dpkg -l | grep -v \'^ii\'</code> → <code>apt-get --fix-broken install</code> → <code>dpkg --configure -a</code>.',
      'Mã trả về nói nhiều hơn màn hình: <b>0</b> thành công · <b>100</b> apt gặp vấn đề · <b>127</b> không chạy được lệnh (thường là thiếu thư viện chia sẻ).',
      'Bung gói ra thư mục riêng bằng <code>dpkg-deb -x</code> rồi chạy thẳng file bên trong: chương trình hoạt động dù hệ thống không hề biết. <b>Cài đặt = chép file đúng chỗ + ghi lại đã chép gì.</b>',
      'Gói nguồn gồm ba file: <code>orig.tar.gz</code> (mã gốc, bất khả xâm phạm) · <code>debian.tar.xz</code> (mọi thay đổi của nhà đóng gói) · <code>.dsc</code> (mô tả có chữ ký). Buildroot và Yocto dùng lại đúng mô hình này.',
      'Máy này: <b>776 gói · 2 524,9 MB</b>, trong đó <b>459,7 MB (hơn 18 %)</b> chỉ để biên dịch cho ARM64. <b>45 gói</b> do bạn chọn đã kéo theo <b>731 gói</b> khác — tỉ lệ 1 : 16.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo', x:
      '<p><b>Bài 13 — Bash script</b> đóng lại Chặng 01 bằng cách gói tất cả những gì bạn đã ' +
      'học thành một chương trình chạy được. Bạn sẽ biết vì sao <code>rm -rf $thumuc</code> ' +
      'thiếu dấu nháy có thể xoá nhầm cả cây thư mục còn <code>rm -rf "$thumuc"</code> thì ' +
      'không, vì sao dòng <code>set -euo pipefail</code> nên có ở đầu mọi script nghiêm túc, ' +
      'và <code>trap</code> dọn dẹp giúp bạn thế nào khi script bị ngắt giữa chừng.</p>' +
      '<p>Sản phẩm cuối bài là một script tự động hoá build thật sự: nó kiểm tra công cụ cần ' +
      'thiết bằng đúng những lệnh của bài này, biên dịch chương trình cho ARM64 như ở Bài 3, ' +
      'so sánh kích thước file nhị phân và tự dọn thư mục tạm dù thành công hay thất bại. Đó ' +
      'cũng là bộ khung mà bạn sẽ dùng lại cho các script khởi động ở <b>Chặng 09</b>.</p>' }
  ],

  quiz: [
    {
      q: 'Bạn có sẵn file <code>congcu.deb</code> trên đĩa và cần cài nó cùng mọi phụ thuộc. Lệnh nào đúng?',
      opts: [
        'sudo dpkg -i congcu.deb',
        'sudo apt install ./congcu.deb',
        'sudo apt install congcu.deb',
        'sudo dpkg-deb -x congcu.deb /'
      ],
      a: 1,
      why: 'Với đường dẫn bắt đầu bằng <code>./</code>, apt hiểu đây là file trên đĩa: nó đọc phần <code>control</code>, tự tìm và cài phụ thuộc từ kho, rồi mới gọi dpkg. Phương án A cài được nhưng <b>không giải phụ thuộc</b> — đúng cách bạn đã cố tình làm gãy hệ thống ở bước 6. Phương án C thiếu <code>./</code> nên apt đi tìm một gói <i>tên là</i> "congcu.deb" trong kho và không thấy. Phương án D chỉ bung file ra mà không ghi sổ, không chạy script cấu hình.'
    },
    {
      q: 'Chạy một chương trình vừa cài, bạn nhận được <code>error while loading shared libraries: libfoo.so.2</code> và mã trả về 127. Bước chẩn đoán hợp lý nhất là gì?',
      opts: [
        'Cài lại chương trình bằng <code>apt reinstall</code>',
        'Chạy <code>sudo apt-get check</code> để xem cây phụ thuộc có gãy không',
        'Xoá <code>/var/lib/dpkg/lock</code> rồi thử lại',
        'Chạy <code>sudo apt update && sudo apt upgrade</code>'
      ],
      a: 1,
      why: 'Triệu chứng "thiếu thư viện chia sẻ lúc chạy" gần như luôn đi kèm một phụ thuộc chưa được thoả mãn — đúng cảnh bạn đã dựng lại ở bước 6, khi <code>gpiodetect</code> báo thiếu <code>libgpiod.so.3</code>. <code>apt-get check</code> không sửa gì, chỉ đọc sổ và trả lời trong một giây, nên là bước đầu tiên hợp lý; nó còn gợi ý sẵn <code>--fix-broken install</code>. Cài lại chương trình không thêm được thư viện còn thiếu. Xoá file lock khi không có tiến trình nào giữ nó là việc vô ích và nguy hiểm. Nâng cấp toàn hệ thống là dùng búa tạ đập một cái đinh.'
    },
    {
      q: '<code>apt show</code> một gói cho thấy <code>Download-Size: 53,5 kB</code> và <code>Installed-Size: 125 kB</code>. Bạn đang tính dung lượng cho một rootfs nhúng. Con số nào phải dùng, và vì sao?',
      opts: [
        '53,5 kB — vì đó là dung lượng thật của file gói',
        '125 kB — vì rootfs chứa các file <b>đã bung ra</b>, còn 53,5 kB chỉ là kích thước sau khi nén để truyền qua mạng',
        'Tổng 178,5 kB — vì cần chỗ cho cả file nén lẫn file bung ra',
        'Không con số nào, phải tự chạy <code>du -sh</code> sau khi cài'
      ],
      a: 1,
      why: '<code>Installed-Size</code> là dung lượng các file chiếm trên hệ thống file sau khi bung — đúng thứ rootfs phải chứa. <code>Download-Size</code> chỉ liên quan tới băng thông và biến mất ngay sau khi cài. Phương án C đúng cho <i>không gian đĩa tạm thời lúc cài</i> trên máy có cache, nhưng rootfs xuất xưởng không giữ lại file nén. Phương án D cho số chính xác nhất nhưng phải cài xong mới biết — trong khi việc lập kế hoạch dung lượng cần con số <b>trước</b> đó.'
    },
    {
      q: 'Vì sao kho phần mềm Ubuntu chạy trên <code>http://</code> mà vẫn an toàn trước việc gói bị sửa nội dung trên đường truyền?',
      opts: [
        'Vì apt tự chuyển sang https khi tải file .deb',
        'Vì mỗi file .deb được ký riêng bằng khoá GPG của nhà bảo trì',
        'Vì file <code>InRelease</code> có chữ ký GPG, nó chứa SHA256 của chỉ mục, và chỉ mục chứa SHA256 của từng file .deb — một chữ ký bảo chứng cho cả chuỗi',
        'Vì archive.ubuntu.com chỉ chấp nhận kết nối từ máy đã đăng ký'
      ],
      a: 2,
      why: 'Đây là chuỗi tin cậy bốn mắt xích bạn đã tự tay lần theo ở bước 5: khoá GPG có sẵn trên máy xác nhận chữ ký trong <code>InRelease</code>; <code>InRelease</code> chứa SHA256 của các file chỉ mục; chỉ mục chứa SHA256 của từng gói. Sửa một byte ở bất kỳ đâu cũng làm mã băm lệch và apt dừng lại. Mã hoá đường truyền giải quyết bài toán <i>ai nghe lén được</i>, còn ở đây bài toán cần giải là <i>nội dung có bị đổi không</i> — chữ ký giải quyết đúng việc đó, và làm được cả khi file đã đi qua nhiều máy chủ gương.'
    },
    {
      q: '<code>dpkg -l | grep -v \'^ii\'</code> hiện ra một gói ở trạng thái <code>iU</code>. Điều đó nghĩa là gì?',
      opts: [
        'Gói đã bị gỡ nhưng file cấu hình vẫn còn trên đĩa',
        'File của gói đã được bung ra đĩa nhưng bước cấu hình chưa hoàn tất — hệ thống đang ở trạng thái không nhất quán',
        'Gói được đánh dấu giữ lại, apt sẽ không nâng cấp nó',
        'Gói cài từ một kho không được ký nên dpkg không tin tưởng'
      ],
      a: 1,
      why: 'Ký tự thứ nhất là <i>mong muốn</i> — <code>i</code> nghĩa là muốn cài; ký tự thứ hai là <i>thực trạng</i> — <code>U</code> viết hoa nghĩa là mới <b>U</b>npacked, chưa cấu hình xong. Nguyên tắc chung: <b>chữ hoa ở cột trạng thái luôn là dấu hiệu xấu</b>. Phương án A mô tả <code>rc</code>. Phương án C mô tả gói bị <code>apt-mark hold</code>, xem bằng <code>apt-mark showhold</code>. Cách sửa <code>iU</code> là <code>sudo apt-get --fix-broken install</code>, hoặc <code>sudo dpkg --configure -a</code> nếu phụ thuộc đã đủ.'
    },
    {
      q: 'Bạn bung một gói bằng <code>dpkg-deb -x tree.deb ~/thu</code> rồi chạy <code>~/thu/usr/bin/tree</code> và nó hoạt động bình thường. Kết luận nào đúng?',
      opts: [
        'Gói đã được cài, chỉ khác là ở thư mục người dùng',
        '<code>dpkg-deb -x</code> chỉ chép file ra đĩa mà không ghi sổ, nên chương trình chạy được nhưng hệ thống hoàn toàn không biết gói tồn tại',
        'Chương trình chạy được là do nó đã có sẵn trong <code>/usr/bin</code> từ trước',
        'Cách này chỉ dùng được với gói không có phụ thuộc nào'
      ],
      a: 1,
      why: 'Đây là điểm mấu chốt của bước 4: <code>dpkg-deb -x</code> làm đúng <b>một</b> việc là bung <code>data.tar</code> ra thư mục chỉ định. Không ghi vào <code>/var/lib/dpkg/status</code>, không chạy script <code>postinst</code>, nên <code>dpkg -l</code> và <code>dpkg -S</code> đều không thấy gói. Chương trình vẫn chạy vì <b>chạy được chỉ cần file nằm đúng chỗ</b> — sổ sách phục vụ việc quản lý về sau chứ không phải việc thực thi. Phương án D sai: cách này dùng được với mọi gói, miễn là các thư viện nó cần đã có sẵn trên máy — chính là điều bạn kiểm chứng ở bước 6 khi thiếu thư viện thì chương trình dừng ngay. Đây cũng là nguyên lý bạn sẽ dùng để dựng rootfs ở Chặng 09.'
    }
  ]
});

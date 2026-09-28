/* Bài 45 — Thực hành Device Tree với QEMU virt
   Chặng 08 — Device Tree
   Bài cuối của Chặng 08. Ba bài trước chỉ ĐỌC cây; bài này SỬA nó rồi nạp lại: dumpdtb → dtc
   dịch ngược → thêm label, /chosen/bootargs, hai node không có driver (một okay, một disabled)
   và một node gpio-leds có driver sẵn → dtc → -dtb → kiểm chứng ba tầng (/proc/device-tree,
   /sys/bus/platform/devices, liên kết driver). Cố tình cho học viên boot bằng chính virt.dtb
   1 MiB và gặp sự im lặng (QEMU 4.2.1 đệm blob lên (size+10000)*2 > MAX_FDT_SIZE 2 MiB).
   Gỡ sợi chỉ /chosen/bootargs mà Bài 41, 42, 43 để lại.
   Mọi số liệu đo 2026-09-28 trên máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4, QEMU 4.2.1,
   dtc 1.5.0), cây ~/bai38/linux-6.18.45 dựng lại cùng ngày. Không viết driver (Bài 50, 54),
   không đào sâu deferred probe (Bài 54). */

Lesson.register({
  id: 'bai-45',
  title: 'Thực hành Device Tree với QEMU virt',
  minutes: 50,
  practice: 'Thực hành 40 phút',
  level: 'Trung cấp',

  intro:
    'Ba bài vừa qua, bạn chỉ <i>đọc</i> Device Tree: Bài 42 hỏi vì sao nó tồn tại, Bài 43 dạy ' +
    'cú pháp, Bài 44 lần theo cách kernel biến một node thành lời gọi <code>probe()</code>. ' +
    'Nhưng trong nghề, người ta hiếm khi đọc cây chỉ để đọc. Tình huống thật trông thế này: ' +
    'phòng phần cứng gắn thêm một con chip lên bo mạch, đưa bạn sơ đồ mạch, và hỏi \"bao giờ ' +
    'Linux thấy nó?\". Bạn thêm một node, build, nạp — và <b>không có gì xảy ra</b>. Không lỗi, ' +
    'không cảnh báo, không gì cả.<br><br>' +
    'Bài này cho bạn làm trọn vòng đó trên máy ảo, và quan trọng hơn, cho bạn một <b>quy trình ' +
    'ba tầng</b> để biết chính xác \"không có gì xảy ra\" nằm ở đâu: cây có tới được kernel ' +
    'không, node có thành thiết bị không, thiết bị có driver nhận không. Bạn sẽ lấy cây của ' +
    'QEMU ra, thêm bốn thứ của riêng mình — trong đó có một đèn LED mà kernel sẽ tự nhấp nháy ' +
    '— và nạp lại. Dọc đường, bạn sẽ gặp một lần boot <b>im lặng tuyệt đối</b> dù cây không ' +
    'sai một ký tự nào, và tự tìm ra thủ phạm là một con số trong mã nguồn kernel.<br><br>' +
    'Bài này cũng gỡ nốt sợi chỉ mà Bài 41 để lại: dòng lệnh kernel không chỉ đến từ ' +
    '<code>-append</code>. Nó có thể nằm <b>ngay trong cây</b>, và bạn sẽ tự viết nó vào đó.',

  goals: [
    'Lấy được cây mà QEMU dựng ra, dịch ngược thành <code>.dts</code>, sửa, dịch lại và boot ' +
      'bằng <code>-dtb</code> — và giải thích được vì sao phải dịch lại chứ không dùng thẳng ' +
      'file vừa lấy ra.',
    'Viết được <code>/chosen/bootargs</code> vào cây và chứng minh bằng <code>/proc/cmdline</code> ' +
      'rằng kernel đọc dòng lệnh từ đó; biết <code>-append</code> thắng nó ra sao.',
    'Thêm được một node tham chiếu tới node khác bằng label và phandle, dù cây dịch ngược chỉ ' +
      'còn phandle dạng số.',
    'Kiểm chứng một node qua <b>ba tầng</b> — <code>/proc/device-tree</code>, ' +
      '<code>/sys/bus/platform/devices</code>, liên kết <code>driver</code> — và từ triệu chứng ' +
      'chỉ ra được tầng nào đang hỏng.',
    'Điều khiển được một đèn LED sinh ra hoàn toàn từ cây, qua <code>/sys/class/leds</code>, ' +
      'và đọc trạng thái chân GPIO của nó trong <code>debugfs</code>.',
    'Nhận ra được hai lỗi mà <code>dtc</code> không bắt: blob quá lớn khiến kernel im lặng, ' +
      'và hai node tranh nhau một chân GPIO.'
  ],

  blocks: [

    /* ============================================================
       1. VÒNG ĐỜI CỦA MỘT CÂY TRÊN QEMU
       ============================================================ */
    { t: 'h2', x: 'Ai dựng cây, ai sửa cây, ai đọc cây' },

    { t: 'p', x:
      'Trên một bo mạch thật, cây do người viết BSP soạn bằng tay, dịch bằng <code>dtc</code> ' +
      'và ghi vào thẻ nhớ cạnh <code>Image</code>. Bootloader nạp nó vào RAM, <b>sửa thêm vài ' +
      'chỗ</b> — ví dụ điền dung lượng RAM thật, địa chỉ initramfs — rồi trao địa chỉ cho kernel ' +
      'qua thanh ghi <code>x0</code>, đúng như Bài 33 đã bắt quả tang bằng GDB.' },

    { t: 'p', x:
      'Máy <code>virt</code> của QEMU đi đường tắt: không có file cây nào cả. QEMU <b>tự dựng ' +
      'cây trong bộ nhớ</b> mỗi lần chạy, theo đúng những gì dòng lệnh yêu cầu — bao nhiêu CPU, ' +
      'bao nhiêu RAM, có initramfs không. Bài 43 đã dùng <code>-machine dumpdtb=</code> để xin ' +
      'một bản sao của cây đó. Bài này đi tiếp nửa vòng còn lại: sửa bản sao, rồi dùng tuỳ chọn ' +
      '<code>-dtb</code> để bảo QEMU \"<i>đừng tự dựng nữa, dùng cây của tôi</i>\".' },

    { t: 'fig',
      cap: 'Vòng sửa cây trên QEMU có năm khâu. Khâu ở giữa — QEMU vá cây trước khi trao ' +
           'cho kernel — là thứ dễ bị quên nhất: <code>-dtb</code> không có nghĩa là kernel ' +
           'nhận nguyên văn file của bạn. QEMU lúc đó đóng vai bootloader và vẫn ghi đè ' +
           '<code>/memory</code> cùng vài thuộc tính trong <code>/chosen</code>.',
      svg:
        '<svg viewBox="0 0 720 262" width="720" role="img" aria-label="Sơ đồ vòng sửa Device Tree: QEMU dựng cây, dumpdtb ra virt.dtb, dtc dịch ngược thành virt.dts, sửa thành board.dts, dtc dịch thành board.dtb, QEMU nạp bằng -dtb, vá /memory và /chosen, rồi trao cho kernel">' +
        '<rect class="d-box" x="14" y="20" width="150" height="58" rx="6"/>' +
        '<text class="d-t" x="26" y="42">QEMU tự dựng cây</text>' +
        '<text class="d-ts" x="26" y="62">theo -smp, -m, -initrd</text>' +
        '<rect class="d-box" x="200" y="20" width="150" height="58" rx="6"/>' +
        '<text class="d-tm" x="212" y="42">virt.dtb</text>' +
        '<text class="d-ts" x="212" y="62">bản sao nhị phân, 1 MiB</text>' +
        '<rect class="d-box-a" x="386" y="20" width="150" height="58" rx="6"/>' +
        '<text class="d-tm" x="398" y="42">virt.dts → board.dts</text>' +
        '<text class="d-ts" x="398" y="62">văn bản, bạn sửa ở đây</text>' +
        '<rect class="d-box" x="572" y="20" width="134" height="58" rx="6"/>' +
        '<text class="d-tm" x="584" y="42">board.dtb</text>' +
        '<text class="d-ts" x="584" y="62">dịch lại, vài KB</text>' +
        '<line class="d-line" x1="164" y1="49" x2="192" y2="49"/>' +
        '<path class="d-arrow" d="M 200 49 l -10 -5 l 0 10 z"/>' +
        '<line class="d-line" x1="350" y1="49" x2="378" y2="49"/>' +
        '<path class="d-arrow" d="M 386 49 l -10 -5 l 0 10 z"/>' +
        '<line class="d-line" x1="536" y1="49" x2="564" y2="49"/>' +
        '<path class="d-arrow" d="M 572 49 l -10 -5 l 0 10 z"/>' +
        '<text class="d-tm" x="166" y="100">dumpdtb=</text>' +
        '<text class="d-tm" x="352" y="100">dtc -I dtb</text>' +
        '<text class="d-tm" x="538" y="100">dtc -I dts</text>' +
        '<line class="d-line" x1="639" y1="78" x2="639" y2="150"/>' +
        '<line class="d-line" x1="639" y1="150" x2="544" y2="150"/>' +
        '<path class="d-arrow" d="M 536 150 l 10 -5 l 0 10 z"/>' +
        '<text class="d-tm" x="560" y="140">-dtb</text>' +
        '<rect class="d-box-w" x="296" y="122" width="240" height="58" rx="6"/>' +
        '<text class="d-t" x="308" y="144">QEMU vá cây (vai bootloader)</text>' +
        '<text class="d-ts" x="308" y="164">ghi đè /memory, /chosen, rồi đặt vào RAM</text>' +
        '<line class="d-line" x1="296" y1="151" x2="244" y2="151"/>' +
        '<path class="d-arrow" d="M 236 151 l 10 -5 l 0 10 z"/>' +
        '<rect class="d-box-p" x="56" y="122" width="180" height="58" rx="6"/>' +
        '<text class="d-t" x="68" y="144">Kernel đọc cây</text>' +
        '<text class="d-ts" x="68" y="164">qua x0, như Bài 33</text>' +
        '<text class="d-ts" x="14" y="210">Bước 1 của phần Thực hành đi ba mũi tên trên cùng. Bước 2 thử bỏ qua mũi tên thứ ba — và thấy</text>' +
        '<text class="d-ts" x="14" y="228">vì sao không được. Bước 6 bắt QEMU tại trận khi nó vá /memory và /chosen.</text>' +
        '<text class="d-ts" x="14" y="250">Hai mũi tên dtc là cùng một chương trình chạy theo hai chiều, như Bài 43 đã dạy.</text>' +
        '</svg>' },

    { t: 'cal', kind: 'why', title: 'Vì sao lấy cây của QEMU làm gốc, thay vì viết cây từ đầu',
      x: 'Cây của máy <code>virt</code> có <b>383</b> dòng khi dịch ngược, mô tả bộ ngắt GIC, ' +
         'đồng hồ, UART, PCIe, 32 khe virtio… Viết lại từ đầu, bạn chỉ cần sai một địa chỉ là ' +
         'kernel không boot. Trên bo mạch thật cũng vậy: không ai viết cây từ con số không. Người ' +
         'ta lấy file <code>.dtsi</code> của hãng chip, lấy file <code>.dts</code> của bo mạch ' +
         'mẫu gần giống nhất, rồi <b>sửa phần khác biệt</b>. Bài này làm đúng động tác đó, với cây ' +
         'của QEMU đóng vai \"bo mạch mẫu\".' },

    { t: 'terms',
      items: [
        ['<code>-machine dumpdtb=FILE</code>', '—', 'Tuỳ chọn của QEMU: dựng cây như bình thường, ghi nó ra <code>FILE</code> rồi <b>thoát ngay</b>, không chạy máy ảo. Bài 36 đã dạy: phải dùng <i>đúng</i> dòng lệnh sẽ boot, vì cây phụ thuộc vào cả dòng lệnh.'],
        ['<code>-dtb FILE</code>', '—', 'Tuỳ chọn của QEMU: không tự dựng cây nữa, nạp <code>FILE</code> vào RAM và trao cho kernel. Chỉ có tác dụng khi dùng cùng <code>-kernel</code>.'],
        ['<code>/chosen</code>', '—', 'Node đặc biệt không mô tả phần cứng nào, mà chứa thông tin bootloader muốn gửi kernel: dòng lệnh (<code>bootargs</code>), console (<code>stdout-path</code>, Bài 42), vị trí initramfs.'],
        ['Label', '—', 'Tên đặt trước node trong <code>.dts</code>, ví dụ <code>gpio0:</code>. Chỉ tồn tại lúc dịch; <code>dtc</code> đổi mọi <code>&amp;gpio0</code> thành số phandle của node đó (Bài 43).'],
        ['<code>gpio-leds</code>', '—', 'Chuỗi <code>compatible</code> của driver <code>leds-gpio</code>: mỗi node con là một đèn LED nối vào một chân GPIO. Driver này có sẵn trong <code>Image</code> của bạn (<code>CONFIG_LEDS_GPIO=y</code>).']
      ] },

    /* ============================================================
       2. /chosen/bootargs
       ============================================================ */
    { t: 'h2', x: 'Dòng lệnh kernel có ba nguồn, và một thứ tự ưu tiên' },

    { t: 'p', x:
      'Từ Bài 32 tới giờ, bạn luôn đưa dòng lệnh cho kernel bằng <code>-append</code>, và Bài 41 ' +
      'đã mổ xẻ từng tham số trong đó. Nhưng <code>-append</code> là một tuỳ chọn của <b>QEMU</b>. ' +
      'Kernel chưa bao giờ nhìn thấy nó. Vậy chuỗi đó đi đường nào để vào tới kernel? Câu trả lời ' +
      'nằm ở hàm đọc node <code>/chosen</code> trong <code>drivers/of/fdt.c</code>:' },

    { t: 'code', where: 'out', nocopy: true, name: 'drivers/of/fdt.c (dòng 1115–1118)', lang: 'c', code:
      '\t/* Retrieve command line */\n' +
      '\tp = of_get_flat_dt_prop(node, "bootargs", &l);\n' +
      '\tif (p != NULL && l > 0)\n' +
      '\t\tstrscpy(cmdline, p, min(l, COMMAND_LINE_SIZE));',
      notes: ['<code>node</code> ở đây là node <code>/chosen</code>. Bạn sẽ tự đọc đoạn này ở bước 4.'] },

    { t: 'p', x:
      'Kernel ARM64 <b>chỉ</b> đọc dòng lệnh từ thuộc tính <code>bootargs</code> của ' +
      '<code>/chosen</code> — bootloader không có kênh nào khác để trao nó. Khi bạn gõ <code>-append \"…\"</code>, QEMU — ' +
      'đang đóng vai bootloader — ghi chuỗi đó vào <code>/chosen/bootargs</code> trước khi trao ' +
      'cây. U-Boot cũng làm y hệt với biến <code>bootargs</code> mà Bài 35 đã <code>setenv</code>. ' +
      'Nói cách khác, <code>-append</code> và <code>setenv bootargs</code> chỉ là hai cái tay khác ' +
      'nhau viết vào cùng một chỗ trong cây.' },

    { t: 'table',
      head: ['Nguồn', 'Ai viết', 'Khi nào thắng'],
      rows: [
        ['<code>/chosen/bootargs</code> có sẵn trong file <code>.dtb</code>',
         'Người viết DTS (lần này là bạn)',
         'Khi bootloader <b>không</b> ghi đè: với QEMU là khi không có <code>-append</code>.'],
        ['<code>-append</code> của QEMU / <code>setenv bootargs</code> của U-Boot',
         'Bootloader, ghi đè thuộc tính trên',
         'Luôn thắng nguồn trên, vì nó ghi <i>sau</i>. Bước 6 sẽ bắt quả tang: sau khi boot với <code>-append</code>, thuộc tính trong cây đã mang chuỗi mới.'],
        ['<code>CONFIG_CMDLINE</code> dịch cứng vào <code>Image</code>',
         'Người cấu hình kernel (Bài 39)',
         'Chỉ khi hai nguồn trên để trống — trừ khi bật <code>CMDLINE_FORCE</code>. Cấu hình của bạn có <code>CONFIG_CMDLINE=\"\"</code>, nên nguồn này không đóng góp gì.']
      ] },

    { t: 'cal', kind: 'tip', title: 'Một câu để nhớ: bootloader viết sau cùng, nên bootloader thắng',
      x: 'Đây là nguyên lý đáng nhớ vì nó cứu bạn hàng giờ trên bo mạch thật. Bạn sửa ' +
         '<code>bootargs</code> trong file <code>.dts</code>, build, nạp — và kernel vẫn dùng dòng ' +
         'lệnh cũ. Chín trên mười lần, U-Boot đang có một biến <code>bootargs</code> lưu trong ' +
         'môi trường (Bài 35) và lặng lẽ ghi đè lên cây của bạn. Còn giá trị thật kernel đang ' +
         'dùng thì không cần đoán: <code>cat /proc/cmdline</code> luôn cho biết.' },

    { t: 'p', x:
      'Vậy tại sao lại muốn đặt dòng lệnh trong cây? Vì trên sản phẩm thật, <b>cây đi theo bo ' +
      'mạch</b>. Một bo mạch dùng UART thứ ba làm console, bo khác dùng UART thứ nhất; một bo gắn ' +
      'eMMC, bo khác chạy từ NFS. Đặt <code>console=</code> và <code>root=</code> vào ' +
      '<code>/chosen/bootargs</code> của từng file <code>.dts</code> nghĩa là cùng một ' +
      '<code>Image</code>, cùng một bootloader, mà mỗi bo tự mang đúng dòng lệnh của mình.' },

    /* ============================================================
       3. LABEL TRONG CÂY ĐÃ DỊCH NGƯỢC
       ============================================================ */
    { t: 'h2', x: 'Cây dịch ngược không còn label — chỉ còn con số' },

    { t: 'p', x:
      'Bài 43 đã dạy: label chỉ tồn tại lúc dịch. Khi <code>dtc</code> gặp ' +
      '<code>&amp;gpio0</code>, nó tra xem node nào mang label <code>gpio0</code>, gắn cho node ' +
      'đó một thuộc tính <code>phandle</code> là một con số, rồi thay <code>&amp;gpio0</code> ' +
      'bằng chính con số ấy. Label biến mất khỏi file <code>.dtb</code>. Nên khi bạn dịch ngược ' +
      'cây của QEMU, đây là thứ bạn thấy:' },

    { t: 'code', where: 'out', nocopy: true, name: '~/bai45/virt.dts (hai đoạn)', lang: 'text', code:
      '\tgpio-keys {\n' +
      '\t\t…\n' +
      '\t\tpoweroff {\n' +
      '\t\t\tgpios = <0x8003 0x03 0x00>;\n' +
      '\t\t\tlinux,code = <0x74>;\n' +
      '\t\t\tlabel = "GPIO Key Poweroff";\n' +
      '\t\t};\n' +
      '\t};\n' +
      '\n' +
      '\tpl061@9030000 {\n' +
      '\t\tphandle = <0x8003>;\n' +
      '\t\t…\n' +
      '\t\tgpio-controller;\n' +
      '\t\t#gpio-cells = <0x02>;',
      notes: ['Bạn sẽ tự in hai đoạn này ở bước 1. Dấu <code>…</code> là chỗ đã lược bớt.'] },

    { t: 'p', x:
      'Đọc từ dưới lên. Node <code>pl061@9030000</code> — bộ điều khiển GPIO 8 chân của máy ' +
      '<code>virt</code> — mang <code>phandle = &lt;0x8003&gt;</code> và tự khai ' +
      '<code>#gpio-cells = &lt;0x02&gt;</code>: \"ai trỏ tới tôi thì phải kèm <b>2</b> ô tham ' +
      'số\". Node <code>poweroff</code> trỏ tới nó bằng <code>gpios = &lt;0x8003 0x03 0x00&gt;</code>: ' +
      'ô đầu là phandle, hai ô sau là tham số — chân số <b>3</b>, cờ <b>0</b> (mức cao là ' +
      'bật). Đây đúng là quy tắc <code>#…-cells</code> của Bài 43, nhưng viết bằng số trần. ' +
      'QEMU không dùng <code>dtc</code> để dựng cây, nên nó tự chọn số phandle từ ' +
      '<code>0x8000</code> trở lên — không có label nào từng tồn tại.' },

    { t: 'fig',
      cap: 'Một tham chiếu GPIO gồm ba ô. Ô đầu tìm ra <i>bộ điều khiển</i> nhờ phandle, hai ô ' +
           'sau do chính bộ điều khiển quy định cách đọc qua <code>#gpio-cells</code>. Khi bạn ' +
           'viết <code>&amp;gpio0</code> ở bước 3, <code>dtc</code> sinh ra đúng ô đầu này.',
      svg:
        '<svg viewBox="0 0 720 206" width="720" role="img" aria-label="Sơ đồ tham chiếu GPIO: thuộc tính gpios gồm ba ô 0x8003, 0x03, 0x00; ô đầu trỏ tới node pl061 có phandle 0x8003 và #gpio-cells bằng 2, hai ô sau là số chân và cờ">' +
        '<text class="d-ts" x="18" y="20">NODE DÙNG GPIO</text>' +
        '<rect class="d-box" x="18" y="28" width="300" height="74" rx="6"/>' +
        '<text class="d-tm" x="30" y="50">poweroff {</text>' +
        '<text class="d-tm" x="42" y="70">gpios = &lt;0x8003 0x03 0x00&gt;;</text>' +
        '<text class="d-tm" x="30" y="90">};</text>' +
        '<rect class="d-box-a" x="120" y="122" width="62" height="30" rx="4"/>' +
        '<text class="d-tm" x="128" y="142">0x8003</text>' +
        '<rect class="d-box" x="190" y="122" width="52" height="30" rx="4"/>' +
        '<text class="d-tm" x="200" y="142">0x03</text>' +
        '<rect class="d-box" x="250" y="122" width="52" height="30" rx="4"/>' +
        '<text class="d-tm" x="260" y="142">0x00</text>' +
        '<text class="d-ts" x="120" y="172">phandle</text>' +
        '<text class="d-ts" x="190" y="172">chân 3</text>' +
        '<text class="d-ts" x="250" y="172">cờ</text>' +
        '<text class="d-ts" x="190" y="190">hai ô này: do #gpio-cells = 2 quy định</text>' +
        '<line class="d-line" x1="151" y1="102" x2="151" y2="118"/>' +
        '<text class="d-ts" x="402" y="20">BỘ ĐIỀU KHIỂN GPIO</text>' +
        '<rect class="d-box-p" x="402" y="28" width="300" height="94" rx="6"/>' +
        '<text class="d-tm" x="414" y="50">pl061@9030000 {</text>' +
        '<text class="d-tm" x="426" y="70">phandle = &lt;0x8003&gt;;</text>' +
        '<text class="d-tm" x="426" y="88">gpio-controller;</text>' +
        '<text class="d-tm" x="426" y="106">#gpio-cells = &lt;0x02&gt;;</text>' +
        '<line class="d-line" x1="182" y1="137" x2="380" y2="137"/>' +
        '<line class="d-line" x1="380" y1="137" x2="380" y2="66"/>' +
        '<line class="d-line" x1="380" y1="66" x2="394" y2="66"/>' +
        '<path class="d-arrow" d="M 402 66 l -10 -5 l 0 10 z"/>' +
        '<text class="d-ts" x="402" y="150">Kernel tìm node có phandle bằng ô đầu,</text>' +
        '<text class="d-ts" x="402" y="168">đọc #gpio-cells để biết lấy thêm mấy ô,</text>' +
        '<text class="d-ts" x="402" y="186">rồi giao hai ô đó cho driver pl061 giải nghĩa.</text>' +
        '</svg>' },

    { t: 'p', x:
      'Vậy muốn node mới của bạn trỏ tới <code>pl061</code>, bạn có hai lựa chọn: chép tay số ' +
      '<code>0x8003</code>, hoặc <b>đặt lại label</b> cho node <code>pl061</code> rồi viết ' +
      '<code>&amp;gpio0</code>. Bài này chọn cách thứ hai.' },

    { t: 'cal', kind: 'why', title: 'Vì sao không chép thẳng số 0x8003',
      x: 'Vì con số đó thuộc về QEMU, không thuộc về bạn. Một phiên bản QEMU khác, hay chỉ cần ' +
         'thêm một thiết bị vào dòng lệnh, có thể đánh số lại — Bài 30 đã đo được <code>-smp ' +
         '2</code> làm đổi <b>35</b> dòng trong cây chính vì phandle bị đánh số lại dây chuyền. ' +
         'Chép số là tạo một phụ thuộc vô hình: cây vẫn dịch được, nhưng LED của bạn có thể lặng ' +
         'lẽ trỏ vào nhầm thiết bị. Label thì đi theo node. Còn một điều đáng yên tâm: node ' +
         '<code>pl061</code> đã có sẵn <code>phandle = &lt;0x8003&gt;</code>, và khi bạn thêm ' +
         'label vào, <code>dtc</code> <b>giữ nguyên</b> số đó thay vì cấp số mới — nên nút ' +
         '<code>poweroff</code> vốn trỏ bằng số trần vẫn trỏ đúng. Bước 3 sẽ kiểm chứng bằng ' +
         '<code>fdtget</code>.' },

    /* ============================================================
       4. THANG KIỂM CHỨNG BA TẦNG
       ============================================================ */
    { t: 'h2', x: 'Thang kiểm chứng ba tầng' },

    { t: 'p', x:
      'Bài 44 đã dạy năm giai đoạn từ node tới <code>probe()</code>. Khi bạn tự thêm một node, ' +
      'năm giai đoạn đó rút gọn thành <b>ba câu hỏi</b>, hỏi theo đúng thứ tự, và mỗi câu có một ' +
      'chỗ để nhìn. Dừng lại ở câu đầu tiên có câu trả lời \"không\" — đó là tầng đang hỏng. Tầng ' +
      'trên hỏng thì không cần hỏi tầng dưới.' },

    { t: 'fig',
      cap: 'Ba tầng, ba chỗ để nhìn. Điều quan trọng nhất: <b>không tầng nào in lỗi khi hỏng</b>. ' +
           'Node <code>disabled</code> không in gì, node không ai nhận cũng không in gì. Bạn phải ' +
           'tự đi xuống thang, và bước 4, 5 sẽ đi đủ ba tầng với bốn thứ bạn thêm vào.',
      svg:
        '<svg viewBox="0 0 720 268" width="720" role="img" aria-label="Thang kiểm chứng ba tầng: tầng 1 cây có tới kernel không, nhìn /proc/device-tree; tầng 2 node có thành thiết bị không, nhìn /sys/bus/platform/devices; tầng 3 thiết bị có driver không, nhìn liên kết driver; bên phải mỗi tầng là nguyên nhân thường gặp khi câu trả lời là không">' +
        '<text class="d-ts" x="18" y="18">CÂU HỎI VÀ CHỖ ĐỂ NHÌN</text>' +
        '<text class="d-ts" x="420" y="18">NẾU \"KHÔNG\" — THƯỜNG DO</text>' +
        '<rect class="d-box-p" x="18" y="28" width="380" height="60" rx="6"/>' +
        '<text class="d-t" x="30" y="50">Tầng 1 — Cây của tôi có tới được kernel?</text>' +
        '<text class="d-tm" x="30" y="72">ls /proc/device-tree/&lt;node&gt;</text>' +
        '<rect class="d-box-w" x="420" y="28" width="282" height="60" rx="6"/>' +
        '<text class="d-ts" x="432" y="50">quên -dtb, nạp nhầm file cũ,</text>' +
        '<text class="d-ts" x="432" y="68">blob quá lớn (bước 2)</text>' +
        '<rect class="d-box-p" x="18" y="108" width="380" height="60" rx="6"/>' +
        '<text class="d-t" x="30" y="130">Tầng 2 — Node có thành thiết bị?</text>' +
        '<text class="d-tm" x="30" y="152">ls /sys/bus/platform/devices</text>' +
        '<rect class="d-box-w" x="420" y="108" width="282" height="60" rx="6"/>' +
        '<text class="d-ts" x="432" y="130">status = \"disabled\", thiếu compatible,</text>' +
        '<text class="d-ts" x="432" y="148">cha không phải bus (Bài 44, giai đoạn 2)</text>' +
        '<rect class="d-box-p" x="18" y="188" width="380" height="60" rx="6"/>' +
        '<text class="d-t" x="30" y="210">Tầng 3 — Thiết bị có driver nhận?</text>' +
        '<text class="d-tm" x="30" y="232">ls -l …/devices/&lt;tên&gt;/driver</text>' +
        '<rect class="d-box-w" x="420" y="188" width="282" height="60" rx="6"/>' +
        '<text class="d-ts" x="432" y="210">không driver nào có chuỗi đó, driver</text>' +
        '<text class="d-ts" x="432" y="228">chưa bật, probe() từ chối (Bài 44)</text>' +
        '<line class="d-line" x1="208" y1="88" x2="208" y2="100"/>' +
        '<path class="d-arrow" d="M 208 108 l -5 -10 l 10 0 z"/>' +
        '<line class="d-line" x1="208" y1="168" x2="208" y2="180"/>' +
        '<path class="d-arrow" d="M 208 188 l -5 -10 l 10 0 z"/>' +
        '<line class="d-line" x1="398" y1="58" x2="412" y2="58"/>' +
        '<path class="d-arrow" d="M 420 58 l -10 -5 l 0 10 z"/>' +
        '<line class="d-line" x1="398" y1="138" x2="412" y2="138"/>' +
        '<path class="d-arrow" d="M 420 138 l -10 -5 l 0 10 z"/>' +
        '<line class="d-line" x1="398" y1="218" x2="412" y2="218"/>' +
        '<path class="d-arrow" d="M 420 218 l -10 -5 l 0 10 z"/>' +
        '<text class="d-ts" x="18" y="264">Đi từ trên xuống. Tầng 1 trả lời \"có\" thì mới có ý nghĩa để hỏi tầng 2.</text>' +
        '</svg>' },

    { t: 'p', x:
      'Để thấy cả ba tầng trả lời \"có\" lẫn \"không\", phần Thực hành sẽ thêm <b>bốn</b> thứ ' +
      'vào cây, mỗi thứ dừng ở một tầng khác nhau:' },

    { t: 'table',
      head: ['Bạn thêm', 'Dự đoán', 'Vì sao'],
      rows: [
        ['<code>bootargs</code> trong <code>/chosen</code>',
         'Có tác dụng — nếu không có <code>-append</code>',
         'Không phải thiết bị. Nó kiểm chứng tầng 1 theo cách mạnh nhất: kernel <i>làm theo</i> một thứ chỉ có trong cây của bạn.'],
        ['<code>sensor@b000000</code>, <code>compatible = \"learn,temp-sensor\"</code>',
         'Qua tầng 1, qua tầng 2, <b>dừng ở tầng 3</b>',
         'Có <code>compatible</code> nên thành <code>platform_device</code>, nhưng không driver nào có chuỗi đó.'],
        ['<code>sensor@b001000</code>, giống hệt nhưng <code>status = \"disabled\"</code>',
         'Qua tầng 1, <b>dừng ở tầng 2</b>',
         'Giai đoạn 2 bỏ qua node bị tắt, không in gì.'],
        ['<code>leds</code>, <code>compatible = \"gpio-leds\"</code>, một LED trên chân 0',
         'Qua cả ba tầng',
         'Driver <code>leds-gpio</code> có sẵn trong <code>Image</code>. Đây là node duy nhất sẽ thật sự <i>làm</i> một việc gì đó.']
      ] },

    { t: 'cal', kind: 'info', title: 'Vì sao không có driver cho \"learn,temp-sensor\" — và vì sao đó là điều tốt',
      x: 'Bạn có thể nghĩ một node không có driver là node vô dụng. Với bài này thì ngược lại: ' +
         'nó là cách sạch nhất để nhìn tầng 2 tách riêng khỏi tầng 3. Nó cũng là đúng tình ' +
         'huống bạn sẽ ở vào ở Bài 54: bạn viết node trước, thấy <code>platform_device</code> ' +
         'xuất hiện không có driver, rồi viết một platform driver có ' +
         '<code>{ .compatible = \"learn,temp-sensor\" }</code> trong <code>of_match_table</code> ' +
         'và nhìn liên kết <code>driver</code> hiện ra. Địa chỉ <code>0xb000000</code> được chọn ' +
         'vì nó nằm trong vùng trống của bản đồ bộ nhớ <code>virt</code> mà Bài 30 đã vẽ, sau ' +
         'khe virtio cuối cùng — không đụng thiết bị nào có sẵn.' },

    /* ============================================================
       THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: sửa cây của QEMU và theo node mới qua ba tầng' },

    { t: 'p', x:
      'Sáu bước. Bước 1–3 chạy trong WSL: lấy cây ra, thử boot bằng nó nguyên trạng (và thấy ' +
      'vì sao không được), rồi sửa và dịch lại. Bước 4–5 boot <b>một lần</b> bằng cây đã sửa và ' +
      'đi xuống thang ba tầng. Bước 6 boot thêm ba lần ngắn để xem bootloader — ở đây là QEMU — ' +
      'ghi đè lên cây của bạn ra sao, và hai node tranh nhau một chân GPIO. File nháp nằm trong ' +
      '<code>~/bai45</code>, xoá được khi học xong.' },

    { t: 'cal', kind: 'info', title: 'Cần gì trước khi bắt đầu',
      x: '<ul>' +
         '<li><code>~/bai38/linux-6.18.45</code> đã build (Bài 40) — dùng <code>Image</code> và ' +
         'đọc vài dòng mã nguồn.</li>' +
         '<li><code>~/bai32/initramfs.cpio.gz</code> (Bài 32).</li>' +
         '<li><code>dtc</code>, <code>fdtget</code>, <code>fdtput</code>, <code>fdtdump</code> ' +
         '(gói <code>device-tree-compiler</code>).</li>' +
         '<li><code>gdb-multiarch</code> (Bài 31) — chỉ cho một phép đo ở bước 2.</li>' +
         '<li><code>~/bai44/venv</code> nếu bạn còn giữ từ Bài 44 — để chạy <code>dt-validate</code> ' +
         'ở bước 3. Không có thì bỏ qua đoạn đó, phần còn lại không phụ thuộc vào nó.</li>' +
         '</ul>' +
         'Mọi kết quả dưới đây đo trên máy soạn bài với QEMU <b>4.2.1</b> và <code>dtc</code> ' +
         '<b>1.5.0</b> (Ubuntu 20.04). Phiên bản khác có thể in khác ở vài chỗ; những chỗ đó được ' +
         'ghi chú ngay tại chỗ.' },

    { t: 'steps', items: [

      /* ---------------- BƯỚC 1 ---------------- */
      { title: 'Bước 1 — Lấy cây ra và dịch ngược',
        blocks: [

        { t: 'p', x:
          'Xin QEMU một bản sao cây, bằng <b>đúng</b> dòng lệnh sẽ dùng để boot — có ' +
          '<code>-kernel</code> và <code>-initrd</code> — như bài học đắt giá của Bài 36. Không ' +
          'có <code>-append</code>: bạn sẽ tự viết dòng lệnh vào cây ở bước 3.' },

        { t: 'code', where: 'wsl', code:
          'mkdir -p ~/bai45 && cd ~/bai45\n' +
          'IMG=~/bai38/linux-6.18.45/arch/arm64/boot/Image\n' +
          'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 1G -nographic \\\n' +
          '  -kernel $IMG -initrd ~/bai32/initramfs.cpio.gz \\\n' +
          '  -machine dumpdtb=virt.dtb\n' +
          'ls -l virt.dtb',
          notes: ['Biến <code>IMG</code> được dùng lại ở mọi bước sau. Nếu bạn mở terminal mới giữa chừng, gõ lại hai dòng đầu.'] },

        { t: 'code', where: 'out', nocopy: true, code:
          '-rw-r--r-- 1 cah8hc cah8hc 1048576 Sep 28 17:06 virt.dtb',
          notes: ['Lệnh <code>qemu-system-aarch64</code> không in gì và trả về ngay. Tên chủ file và giờ là của máy soạn bài.'] },

        { t: 'p', x:
          '<b>1 048 576</b> byte — đúng 1 MiB, như Bài 43 và Bài 36 đã đo. Nhớ con số này: nó ' +
          'sẽ gây rắc rối ở bước 2. Giờ dịch ngược thành văn bản:' },

        { t: 'code', where: 'wsl', code:
          'dtc -I dtb -O dts -o virt.dts virt.dtb\n' +
          'wc -l virt.dts' },

        { t: 'code', where: 'out', nocopy: true, code:
          'virt.dts: Warning (avoid_unnecessary_addr_size): /gpio-keys: unnecessary #address-cells/#size-cells without "ranges" or child "reg" property\n' +
          '383 virt.dts' },

        { t: 'cal', kind: 'info', title: 'Một cảnh báo về cây của QEMU, không phải của bạn',
          x: 'Node <code>gpio-keys</code> khai <code>#address-cells</code> và <code>#size-cells</code> ' +
             'nhưng không node con nào có <code>reg</code> — nên hai thuộc tính đó thừa. Đó là quy ' +
             'tắc \"cha quyết định cách đọc <code>reg</code> của con\" của Bài 43, được ' +
             '<code>dtc</code> kiểm tra theo chiều ngược lại. Cây vẫn đúng, file vẫn được ghi. ' +
             '<b>383</b> dòng là của QEMU 4.2.1 với đúng dòng lệnh trên; Bài 43 đếm được 407 ' +
             'trên một phiên bản QEMU mới hơn có kèm <code>-append</code>.' },

        { t: 'p', x:
          'Xem node <code>/chosen</code> — nơi bạn sẽ ghi dòng lệnh vào ở bước 3:' },

        { t: 'code', where: 'wsl', code:
          "grep -n -A5 'chosen {' virt.dts" },

        { t: 'code', where: 'out', nocopy: true, code:
          '378:\tchosen {\n' +
          '379-\t\tlinux,initrd-end = <0x480fb983>;\n' +
          '380-\t\tlinux,initrd-start = <0x48000000>;\n' +
          '381-\t\tstdout-path = "/pl011@9000000";\n' +
          '382-\t};\n' +
          '383-};' },

        { t: 'cal', kind: 'info', title: 'Ba thuộc tính, không có bootargs — và hai trong số đó do -initrd sinh ra',
          x: '<code>stdout-path</code> là thứ Bài 42 đã dùng để giải thích vì sao kernel có ' +
             'console dù không có <code>console=</code>. Hai thuộc tính <code>linux,initrd-*</code> ' +
             'là địa chỉ đầu và cuối của initramfs trong RAM: ' +
             '<code>0x480fb983 − 0x48000000 = 0xfb983 = 1 030 531</code> byte — đúng kích thước ' +
             'file <code>initramfs.cpio.gz</code> của bạn (Bài 32 đã kiểm chứng phép trừ này). Thử ' +
             'dump lại <i>không có</i> <code>-kernel</code>/<code>-initrd</code>, hai dòng này biến ' +
             'mất và cây còn 381 dòng. Còn <code>bootargs</code> thì vắng mặt vì không có ' +
             '<code>-append</code>: đây là bằng chứng đầu tiên rằng <code>-append</code> đi vào ' +
             'đúng chỗ này. Số <code>1030531</code> sẽ khác nếu initramfs của bạn khác một byte.' },

        { t: 'p', x:
          'Cuối cùng, xem hai node mà bạn sẽ đụng tới: bộ điều khiển GPIO, và nút nguồn đang dùng ' +
          'một chân của nó:' },

        { t: 'code', where: 'wsl', code:
          "grep -n -A9 'pl061@9030000 {' virt.dts\n" +
          "grep -n -A10 'gpio-keys {' virt.dts" },

        { t: 'code', where: 'out', nocopy: true, code:
          '273:\tpl061@9030000 {\n' +
          '274-\t\tphandle = <0x8003>;\n' +
          '275-\t\tclock-names = "apb_pclk";\n' +
          '276-\t\tclocks = <0x8000>;\n' +
          '277-\t\tinterrupts = <0x00 0x07 0x04>;\n' +
          '278-\t\tgpio-controller;\n' +
          '279-\t\t#gpio-cells = <0x02>;\n' +
          '280-\t\tcompatible = "arm,pl061\\0arm,primecell";\n' +
          '281-\t\treg = <0x00 0x9030000 0x00 0x1000>;\n' +
          '282-\t};\n' +
          '261:\tgpio-keys {\n' +
          '262-\t\t#address-cells = <0x01>;\n' +
          '263-\t\t#size-cells = <0x00>;\n' +
          '264-\t\tcompatible = "gpio-keys";\n' +
          '265-\n' +
          '266-\t\tpoweroff {\n' +
          '267-\t\t\tgpios = <0x8003 0x03 0x00>;\n' +
          '268-\t\t\tlinux,code = <0x74>;\n' +
          '269-\t\t\tlabel = "GPIO Key Poweroff";\n' +
          '270-\t\t};\n' +
          '271-\t};' },

        { t: 'cal', kind: 'why', title: 'Chân 3 đã có chủ — nên LED của bạn sẽ dùng chân 0',
          x: 'Dòng 274 và dòng 267 cùng mang <code>0x8003</code>: nút <code>poweroff</code> trỏ ' +
             'tới <code>pl061</code> đúng như sơ đồ ở phần lý thuyết, và chiếm <b>chân 3</b>. ' +
             '<code>linux,code = &lt;0x74&gt;</code> là mã phím 116, <code>KEY_POWER</code>. ' +
             'Còn dòng 280 cho thấy cách <code>dtc</code> in một <i>danh sách</i> chuỗi khi dịch ' +
             'ngược: gộp thành một chuỗi, ngăn bằng <code>\\0</code> — đúng byte NUL mà Bài 44 ' +
             'dùng <code>tr</code> để tách. Bộ PL061 có <b>8</b> chân (<code>PL061_GPIO_NR 8</code> ' +
             'trong <code>drivers/gpio/gpio-pl061.c</code>), đánh số 0–7. Bạn sẽ dùng chân 0, ' +
             'chưa ai dùng. Bước 6 sẽ cố tình dùng chân 3 để xem chuyện gì xảy ra.' }
      ] },

      /* ---------------- BƯỚC 2 ---------------- */
      { title: 'Bước 2 — Boot bằng chính cây vừa lấy ra, và gặp sự im lặng',
        blocks: [

        { t: 'p', x:
          'Trước khi sửa gì, thử một điều tưởng như hiển nhiên: nạp lại nguyên xi cây QEMU vừa ' +
          'đưa. Nếu vòng sửa cây đúng, lần boot này phải giống hệt mọi lần boot trước đây. ' +
          'Lệnh dưới đây có <code>timeout 20</code> để tự dừng sau 20 giây, vì bạn sẽ thấy nó ' +
          'không tự dừng được:' },

        { t: 'code', where: 'wsl', code:
          'time timeout 20 qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 1G -nographic \\\n' +
          '  -kernel $IMG -initrd ~/bai32/initramfs.cpio.gz -dtb virt.dtb\n' +
          'echo "rc=$?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'qemu-system-aarch64: terminating on signal 15 from pid 149712 (timeout)\n' +
          '\n' +
          'real\t0m20.005s\n' +
          'user\t0m19.952s\n' +
          'sys\t0m0.050s\n' +
          'rc=124',
          notes: ['Số sau <code>pid</code> là PID của lệnh <code>timeout</code>, sẽ khác trên máy bạn.'] },

        { t: 'cal', kind: 'warn', title: 'Không một dòng nào từ kernel — và CPU vẫn chạy hết công suất',
          x: 'Dòng duy nhất là của QEMU, in ra lúc <code>timeout</code> giết nó. <code>rc=124</code> ' +
             'là mã <code>timeout</code> trả về khi phải giết lệnh con. Không có ' +
             '<code>Booting Linux</code>, không có lỗi. Nhưng để ý <code>user 0m19.952s</code> ' +
             'gần bằng <code>real</code>: máy ảo <b>không treo cứng</b>, nó đang quay tròn hết một ' +
             'nhân CPU. Đây là kiểu im lặng mà Bài 33 đã gặp khi phá hợp đồng khởi động — nhưng ' +
             'lần này bạn không phá gì cả. Cây là cây của chính QEMU.' },

        { t: 'p', x:
          'Kiểm chứng rằng cây không hỏng: dịch nó sang văn bản rồi dịch ngược lại thành một ' +
          'file nhị phân mới, và so nội dung:' },

        { t: 'code', where: 'wsl', code:
          'dtc -I dts -O dtb -o virt-rt.dtb virt.dts\n' +
          'ls -l virt-rt.dtb\n' +
          'dtc -I dtb -O dts virt-rt.dtb 2>/dev/null | diff - virt.dts && echo "IDENTICAL"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'virt.dts:261.12-271.4: Warning (avoid_unnecessary_addr_size): /gpio-keys: unnecessary #address-cells/#size-cells without "ranges" or child "reg" property\n' +
          'virt.dts:276.3-21: Warning (clocks_property): /pl061@9030000:clocks: cell 0 is not a phandle reference\n' +
          'virt.dts:302.3-21: Warning (clocks_property): /pl031@9010000:clocks: cell 0 is not a phandle reference\n' +
          'virt.dts:310.3-28: Warning (clocks_property): /pl011@9000000:clocks: cell 0 is not a phandle reference\n' +
          'virt.dts:310.3-28: Warning (clocks_property): /pl011@9000000:clocks: cell 1 is not a phandle reference\n' +
          'virt.dts:290.3-25: Warning (msi_parent_property): /pcie@10000000:msi-parent: cell 0 is not a phandle reference\n' +
          'virt.dts:267.4-31: Warning (gpios_property): /gpio-keys/poweroff:gpios: cell 0 is not a phandle reference\n' +
          '-rw-r--r-- 1 cah8hc cah8hc 7481 Sep 28 17:07 virt-rt.dtb\n' +
          'IDENTICAL' },

        { t: 'cal', kind: 'info', title: 'Cùng một nội dung, nhỏ hơn 140 lần',
          x: 'Dòng cuối: <code>IDENTICAL</code> — dịch ngược file mới ra đúng từng ký tự của ' +
             '<code>virt.dts</code>. Nội dung không mất gì. Nhưng file mới chỉ <b>7 481</b> byte ' +
             'so với <b>1 048 576</b>: phần chênh lệch là khoảng đệm trống mà QEMU chèn vào ' +
             '<code>dumpdtb</code>, không phải dữ liệu.<br><br>' +
             'Bảy dòng <code>Warning</code> đều cùng một ý: ở những chỗ <code>dtc</code> chờ một ' +
             'tham chiếu kiểu <code>&amp;label</code>, nó lại thấy một con số trần như ' +
             '<code>0x8000</code>. Đó chính là hậu quả của việc cây dịch ngược không còn label ' +
             '(phần lý thuyết). Các con số vẫn trỏ đúng, nên cảnh báo vô hại. Từ bước 3 bạn sẽ ' +
             'thêm <code>-q</code> để tắt chúng.' },

        { t: 'p', x:
          'Vậy nội dung đúng, chỉ có kích thước là khác. Đọc phần đầu file <code>virt.dtb</code> ' +
          'để xem nó tự khai kích thước bao nhiêu, rồi tìm giới hạn mà kernel ARM64 chấp nhận:' },

        { t: 'code', where: 'wsl', code:
          'fdtdump virt.dtb 2>/dev/null | head -n 3\n' +
          "grep -n 'MAX_FDT_SIZE' ~/bai38/linux-6.18.45/arch/arm64/include/asm/boot.h" },

        { t: 'code', where: 'out', nocopy: true, code:
          '/dts-v1/;\n' +
          '// magic:\t\t0xd00dfeed\n' +
          '// totalsize:\t\t0x100000 (1048576)\n' +
          '13:#define MAX_FDT_SIZE\t\tSZ_2M' },

        { t: 'cal', kind: 'info', title: '1 MiB nhỏ hơn 2 MiB — vậy vấn đề nằm ở đâu?',
          x: '<code>fdtdump</code> in phần đầu 40 byte của blob (Bài 43 đã gọi nó là <i>header</i>). ' +
             'Trường <code>totalsize</code> nói blob dài <b>1 048 576</b> byte. Kernel ARM64 từ ' +
             'chối mọi blob lớn hơn <code>MAX_FDT_SIZE</code> = <b>2 MiB</b> = 2 097 152 byte. ' +
             'Một triệu nhỏ hơn hai triệu, nên theo lý thì phải qua. Mảnh ghép còn thiếu là thứ ' +
             'kernel <i>thật sự</i> nhận được — không phải file trên đĩa, mà bản QEMU đặt vào RAM.' },

        { t: 'p', x:
          'Dùng lại kỹ thuật của Bài 33: dừng máy ảo đúng lúc kernel nhận quyền điều khiển, đọc ' +
          'thanh ghi <code>x0</code> — địa chỉ của cây — và hai từ đầu tiên ở địa chỉ đó. Làm hai ' +
          'lần, với file 1 MiB và file 7 481 byte:' },

        { t: 'code', where: 'wsl', code:
          'for d in virt.dtb virt-rt.dtb; do\n' +
          '  qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 1G \\\n' +
          '    -display none -serial null -monitor none -s -S \\\n' +
          '    -kernel $IMG -initrd ~/bai32/initramfs.cpio.gz -dtb $d &\n' +
          '  sleep 1\n' +
          "  gdb-multiarch -q -batch -ex 'target remote :1234' -ex 'break *0x40200000' \\\n" +
          "    -ex 'continue' -ex 'p/x $x0' -ex 'x/2wx $x0' -ex 'kill' 2>&1 | grep '0x48'\n" +
          '  wait\n' +
          'done' },

        { t: 'cmdx', title: 'Bắt kernel tại cửa, như Bài 33',
          cmd: "gdb-multiarch -q -batch -ex 'target remote :1234' -ex 'break *0x40200000' -ex 'continue' -ex 'p/x $x0' -ex 'x/2wx $x0' -ex 'kill'",
          rows: [
            ['<code>-s -S … &amp;</code>', 'QEMU mở cổng GDB 1234 và <b>đứng yên</b> ở lệnh đầu tiên, chạy nền.', '<code>-display none -serial null -monitor none</code> thay cho <code>-nographic</code> để không tranh cửa sổ terminal với GDB'],
            ['<code>-batch -ex …</code>', 'GDB chạy lần lượt các lệnh sau <code>-ex</code> rồi tự thoát.', 'Không cần gõ tay từng lệnh như Bài 33'],
            ['<code>break *0x40200000</code>', 'Dừng tại lệnh đầu tiên của kernel.', 'Bài 33: đoạn mồi 6 lệnh của QEMU nạp <code>x0</code> rồi nhảy tới đây'],
            ['<code>p/x $x0</code>', 'In thanh ghi <code>x0</code> dạng hex.', 'Theo hợp đồng khởi động ARM64, <code>x0</code> = địa chỉ vật lý của cây'],
            ['<code>x/2wx $x0</code>', 'Đọc 2 từ 32 bit tại địa chỉ đó.', 'Từ thứ nhất là <code>magic</code>, từ thứ hai là <code>totalsize</code>'],
            ['<code>grep \'0x48\'</code>', 'Chỉ giữ hai dòng chứa địa chỉ <code>0x48…</code>.', 'Bỏ các dòng thông báo của GDB']
          ] },

        { t: 'code', where: 'out', nocopy: true, code:
          '$1 = 0x48200000\n' +
          '0x48200000:\t0xedfe0dd0\t0x204e2000\n' +
          '$1 = 0x48200000\n' +
          '0x48200000:\t0xedfe0dd0\t0x92880000',
          notes: ['Xen giữa bốn dòng này, terminal của bạn còn in thêm hai lần <code>qemu-system-aarch64: QEMU: Terminated via GDBstub</code> — lời chào của QEMU khi GDB <code>kill</code> nó. Dòng đó đi thẳng ra terminal, không qua <code>grep</code>.'] },

        { t: 'cal', kind: 'why', title: 'QEMU phình cây ra gấp đôi — và 1 MiB gấp đôi thì vượt 2 MiB',
          x: 'Hai lần đều có <code>x0 = 0x48200000</code> và từ đầu <code>0xedfe0dd0</code> — ' +
             'chính là <code>d00dfeed</code> đọc ngược byte, vì CPU là little-endian còn cây lưu ' +
             'big-endian (Bài 33 đã gặp đúng giá trị này). Từ thứ hai là <code>totalsize</code>, ' +
             'cũng phải đọc ngược byte:<ul>' +
             '<li><code>0x204e2000</code> → <code>0x00204e20</code> = <b>2 117 152</b> byte, với file 1 048 576 byte.</li>' +
             '<li><code>0x92880000</code> → <code>0x00008892</code> = <b>34 962</b> byte, với file 7 481 byte.</li>' +
             '</ul>' +
             'Cả hai khớp đúng một công thức: <code>(kích_thước_file + 10000) × 2</code>. QEMU ' +
             '4.2.1 nới chỗ trống trong cây trước khi vá <code>/memory</code> và <code>/chosen</code> ' +
             'vào, để chắc chắn đủ chỗ ghi. Với file 7 KB thì vô hại. Với file 1 MiB, kết quả ' +
             '<b>2 117 152 &gt; 2 097 152</b>: kernel đọc <code>totalsize</code>, thấy vượt ' +
             '<code>MAX_FDT_SIZE</code>, và từ chối cả cây.' },

        { t: 'cal', kind: 'danger', title: 'Vì sao đến cả earlycon cũng không cứu được',
          x: 'Khi từ chối cây, kernel có in một dòng rõ ràng (<code>arch/arm64/kernel/setup.c</code>, ' +
             'dòng 185–186): <i>\"Error: invalid device tree blob … The dtb must be 8-byte aligned ' +
             'and must not exceed 2 MB in size\"</i>, rồi quay vòng vô tận. Nhưng nó in vào bộ đệm ' +
             'log, lúc chưa có console nào. Bài 41 dạy <code>earlycon</code> để thấy log sớm — và ' +
             'thử với <code>-append \"earlycon=pl011,0x9000000\"</code> vẫn chỉ ra đúng 1 dòng của ' +
             'QEMU. Lý do: <code>earlycon</code> là một tham số trong dòng lệnh, và dòng lệnh nằm ' +
             '<b>trong cái cây vừa bị từ chối</b>. Con gà và quả trứng. Trên bo mạch thật, chỉ có ' +
             'debugger phần cứng hoặc đọc bộ đệm log sau khi reset mới thấy được dòng đó.' },

        { t: 'p', x:
          'Nếu muốn tự xác nhận ngưỡng, dùng cờ <code>-S</code> của <code>dtc</code> để đệm cây ' +
          'tới một kích thước chọn trước. Công thức dự đoán ngưỡng ở ' +
          '<code>2 097 152 / 2 − 10 000 = 1 038 576</code> byte; thử hai kích thước hai bên:' },

        { t: 'code', where: 'wsl', code:
          'for s in 1015808 1040384; do\n' +
          '  dtc -q -I dts -O dtb -S $s -o pad.dtb virt.dts\n' +
          '  n=$(timeout 20 qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 1G -nographic \\\n' +
          '      -kernel $IMG -initrd ~/bai32/initramfs.cpio.gz -dtb pad.dtb < /dev/null | wc -l)\n' +
          '  echo "$s B -> $n lines"\n' +
          'done\n' +
          'rm -f pad.dtb',
          notes: ['<code>-S</code> = <b>S</b>ize: đệm file ra đúng số byte đó. <code>-q</code> = <b>q</b>uiet: tắt bảy cảnh báo đã thấy ở trên. <code>&lt; /dev/null</code> để QEMU không đọc bàn phím của bạn. Mỗi vòng mất 20 giây.'] },

        { t: 'code', where: 'out', nocopy: true, code:
          'qemu-system-aarch64: terminating on signal 15 from pid 149726 (timeout)\n' +
          '1015808 B -> 254 lines\n' +
          'qemu-system-aarch64: terminating on signal 15 from pid 149734 (timeout)\n' +
          '1040384 B -> 0 lines',
          notes: ['Số dòng của lần boot được (254) có thể lệch vài dòng giữa các lần chạy, tuỳ thời điểm <code>timeout</code> cắt.'] },

        { t: 'cal', kind: 'tip', title: 'Quy tắc rút ra: luôn dịch lại, không bao giờ nạp thẳng file dumpdtb',
          x: '<b>1 015 808</b> byte boot được (254 dòng log), <b>1 040 384</b> byte thì im lặng — ' +
             'ngưỡng nằm đúng giữa, khớp với phép tính. Dòng <code>terminating on signal 15</code> ' +
             'đi ra stderr nên không bị <code>wc -l</code> đếm. Con số <code>10000</code> và phép ' +
             'nhân đôi là của QEMU 4.2.1, được suy ra từ hai phép đo ở trên chứ không từ mã nguồn ' +
             'QEMU; phiên bản QEMU khác có thể đệm khác, và có thể boot được file 1 MiB. Nhưng ' +
             'quy tắc thì đúng ở mọi phiên bản: file của <code>dumpdtb</code> để <b>đọc</b>, file ' +
             'của <code>dtc</code> để <b>nạp</b>. Từ đây trở đi, bạn chỉ boot bằng cây do chính ' +
             'mình dịch.' }
      ] },

      /* ---------------- BƯỚC 3 ---------------- */
      { title: 'Bước 3 — Sửa cây: một label, một dòng lệnh, ba node',
        blocks: [

        { t: 'p', x:
          'Giữ nguyên <code>virt.dts</code> làm bản gốc để so sánh, và sửa trên một bản sao. ' +
          'Mở nó bằng trình soạn thảo quen tay — <code>nano</code> có sẵn trên Ubuntu:' },

        { t: 'code', where: 'wsl', code:
          'cp virt.dts board.dts\n' +
          'nano board.dts' },

        { t: 'p', x:
          '<b>Sửa 1 — đặt label cho bộ điều khiển GPIO.</b> Tìm dòng 273 (trong <code>nano</code>, ' +
          '<kbd>Ctrl</kbd>+<kbd>_</kbd> rồi gõ <code>273</code> để nhảy tới dòng) và thêm ' +
          '<code>gpio0: </code> vào trước tên node. Chỉ đổi đúng một dòng này, mọi dòng bên trong ' +
          'giữ nguyên:' },

        { t: 'code', where: 'file', name: '~/bai45/board.dts — dòng 273', lang: 'text', code:
          '\tgpio0: pl061@9030000 {' },

        { t: 'p', x:
          '<b>Sửa 2 — viết dòng lệnh vào cây.</b> Tìm node <code>chosen</code> ở cuối file và ' +
          'thêm một dòng <code>bootargs</code> ngay sau <code>stdout-path</code>. Tham số ' +
          '<code>board=learn</code> là một tham số kernel không tồn tại, thêm vào có chủ ý — ' +
          'Bài 41 đã cho thấy tham số lạ có dấu <code>=</code> sẽ được chuyển thành biến môi ' +
          'trường của tiến trình <code>init</code>, và nó sẽ là dấu vân tay chứng minh dòng lệnh ' +
          'đến từ cây của bạn:' },

        { t: 'code', where: 'file', name: '~/bai45/board.dts — node chosen', lang: 'text', code:
          '\tchosen {\n' +
          '\t\tlinux,initrd-end = <0x480fb983>;\n' +
          '\t\tlinux,initrd-start = <0x48000000>;\n' +
          '\t\tstdout-path = "/pl011@9000000";\n' +
          '\t\tbootargs = "console=ttyAMA0 rdinit=/init board=learn";\n' +
          '\t};' },

        { t: 'p', x:
          '<b>Sửa 3 — thêm ba node.</b> Đặt chúng ngay sau dấu <code>};</code> đóng node ' +
          '<code>chosen</code> và <b>trước</b> dấu <code>};</code> cuối cùng của file — tức là ' +
          'làm con của gốc <code>/</code>, ngang hàng với mọi node khác:' },

        { t: 'code', where: 'file', name: '~/bai45/board.dts — ba node mới, trước dòng cuối', lang: 'text', code:
          '\tsensor@b000000 {\n' +
          '\t\tcompatible = "learn,temp-sensor";\n' +
          '\t\treg = <0x00 0xb000000 0x00 0x1000>;\n' +
          '\t};\n' +
          '\n' +
          '\tsensor@b001000 {\n' +
          '\t\tcompatible = "learn,temp-sensor";\n' +
          '\t\treg = <0x00 0xb001000 0x00 0x1000>;\n' +
          '\t\tstatus = "disabled";\n' +
          '\t};\n' +
          '\n' +
          '\tleds {\n' +
          '\t\tcompatible = "gpio-leds";\n' +
          '\n' +
          '\t\tled-0 {\n' +
          '\t\t\tlabel = "learn:green:status";\n' +
          '\t\t\tgpios = <&gpio0 0 0>;\n' +
          '\t\t\tlinux,default-trigger = "heartbeat";\n' +
          '\t\t};\n' +
          '\t};' },

        { t: 'table',
          head: ['Dòng', 'Nghĩa', 'Vì sao viết như vậy'],
          rows: [
            ['<code>reg = &lt;0x00 0xb000000 0x00 0x1000&gt;</code>',
             'Một vùng địa chỉ: bắt đầu <code>0xb000000</code>, dài <code>0x1000</code> (4 KiB).',
             'Gốc của cây có <code>#address-cells = &lt;0x02&gt;</code> và <code>#size-cells = &lt;0x02&gt;</code> (dòng 5–6 của <code>virt.dts</code>), nên mỗi con số chiếm <b>hai</b> ô — quy tắc của Bài 43.'],
            ['<code>status = \"disabled\"</code>',
             'Node vẫn nằm trong cây, nhưng được đánh dấu \"đừng dùng\".',
             'Cách chuẩn để một file <code>.dtsi</code> của hãng chip khai mọi khối phần cứng, còn từng bo mạch chỉ bật khối mình dùng.'],
            ['<code>leds</code> không có <code>@</code>',
             'Tên node không có địa chỉ đơn vị.',
             'Node không có <code>reg</code> thì không được mang <code>@…</code> — đúng như <code>gpio-keys</code> của QEMU.'],
            ['<code>label = \"learn:green:status\"</code>',
             'Tên của đèn trong <code>/sys/class/leds</code>.',
             'Quy ước <code>thiết_bị:màu:chức_năng</code>. Binding mới khuyên dùng <code>color</code> + <code>function</code> thay thế, nhưng <code>label</code> cho tên dễ đọc hơn ở bài này.'],
            ['<code>gpios = &lt;&amp;gpio0 0 0&gt;</code>',
             'Chân 0 của bộ điều khiển mang label <code>gpio0</code>, cờ 0 (mức cao = sáng).',
             'Ba ô, đúng sơ đồ ở phần lý thuyết. <code>dtc</code> sẽ thay <code>&amp;gpio0</code> bằng phandle.'],
            ['<code>linux,default-trigger = \"heartbeat\"</code>',
             'Ngay khi đèn được tạo, gắn nó vào \"nhịp tim\" của kernel.',
             'Không cần gõ lệnh nào, đèn tự nhấp nháy hai lần một nhịp. <code>CONFIG_LEDS_TRIGGER_HEARTBEAT=y</code> có sẵn trong cấu hình của bạn.']
          ] },

        { t: 'p', x:
          'Lưu lại (<kbd>Ctrl</kbd>+<kbd>O</kbd>, <kbd>Enter</kbd>, <kbd>Ctrl</kbd>+<kbd>X</kbd>). ' +
          'Trước khi dịch, xem lại chính xác mình đã đổi gì so với bản gốc:' },

        { t: 'code', where: 'wsl', code:
          'diff virt.dts board.dts' },

        { t: 'code', where: 'out', nocopy: true, code:
          '273c273\n' +
          '< \tpl061@9030000 {\n' +
          '---\n' +
          '> \tgpio0: pl061@9030000 {\n' +
          '381a382,403\n' +
          '> \t\tbootargs = "console=ttyAMA0 rdinit=/init board=learn";\n' +
          '> \t};\n' +
          '> \n' +
          '> \tsensor@b000000 {\n' +
          '> \t\tcompatible = "learn,temp-sensor";\n' +
          '> \t\treg = <0x00 0xb000000 0x00 0x1000>;\n' +
          '> \t};\n' +
          '> \n' +
          '> \tsensor@b001000 {\n' +
          '> \t\tcompatible = "learn,temp-sensor";\n' +
          '> \t\treg = <0x00 0xb001000 0x00 0x1000>;\n' +
          '> \t\tstatus = "disabled";\n' +
          '> \t};\n' +
          '> \n' +
          '> \tleds {\n' +
          '> \t\tcompatible = "gpio-leds";\n' +
          '> \n' +
          '> \t\tled-0 {\n' +
          '> \t\t\tlabel = "learn:green:status";\n' +
          '> \t\t\tgpios = <&gpio0 0 0>;\n' +
          '> \t\t\tlinux,default-trigger = "heartbeat";\n' +
          '> \t\t};',
          notes: ['Nếu bạn thụt lề bằng dấu cách thay vì tab, các dòng <code>&gt;</code> sẽ trông hơi khác — <code>dtc</code> không quan tâm tới khoảng trắng. Nếu bạn đặt dòng <code>bootargs</code> ở chỗ khác trong <code>chosen</code>, số dòng trong dòng <code>381a382,403</code> cũng dịch theo.'] },

        { t: 'cal', kind: 'info', title: 'Đọc diff: một dòng đổi, 22 dòng thêm',
          x: '<code>273c273</code> — dòng 273 bị <b>c</b>hange: đúng label bạn vừa thêm. ' +
             '<code>381a382,403</code> — sau dòng 381 của bản gốc (dòng <code>stdout-path</code>) ' +
             'có 22 dòng được <b>a</b>dd. Để ý <code>diff</code> ghép phần thêm hơi lạ: nó coi ' +
             'dòng <code>};</code> của <code>chosen</code> cũ là dòng đóng node <code>leds</code> ' +
             'mới, nên dòng <code>\\t};</code> thứ hai trong danh sách mới là cái \"thêm\". Nội ' +
             'dung vẫn đúng — <code>diff</code> chỉ tìm cách mô tả ngắn nhất. Không còn dòng nào ' +
             'khác: bạn không lỡ tay sửa gì ngoài ý muốn.' },

        { t: 'p', x:
          'Dịch. Từ đây luôn có <code>-q</code> để tắt bảy cảnh báo vô hại đã giải thích ở bước 2 — ' +
          'lỗi thật vẫn được in:' },

        { t: 'code', where: 'wsl', code:
          'dtc -q -I dts -O dtb -o board.dtb board.dts && ls -l board.dtb' },

        { t: 'code', where: 'out', nocopy: true, code:
          '-rw-r--r-- 1 cah8hc cah8hc 7903 Sep 28 17:09 board.dtb' },

        { t: 'p', x:
          '<b>7 903</b> byte, so với 7 481 của cây gốc dịch lại: bốn thứ bạn thêm tốn đúng ' +
          '<b>422</b> byte. Kích thước này boot thoải mái — bước 2 đã chỉ ra ngưỡng nằm quanh ' +
          '1 MB. Giờ đọc ngược từ file nhị phân để chắc rằng <code>dtc</code> đã hiểu đúng ý bạn:' },

        { t: 'code', where: 'wsl', code:
          'fdtget board.dtb /chosen bootargs\n' +
          'fdtget -t x board.dtb /pl061@9030000 phandle\n' +
          'fdtget -t x board.dtb /leds/led-0 gpios\n' +
          'fdtget board.dtb /sensor@b001000 status' },

        { t: 'cmdx', title: 'fdtget với định dạng hex',
          cmd: 'fdtget -t x board.dtb /leds/led-0 gpios',
          rows: [
            ['<code>fdtget FILE NODE PROP</code>', 'In giá trị của thuộc tính <code>PROP</code> trong node <code>NODE</code>.', 'Cách gọi theo cặp node–thuộc tính của Bài 43'],
            ['<code>-t x</code>', '<b>T</b>ype = he<b>x</b>: in mỗi ô 32 bit dạng thập lục phân.', 'Thiếu cờ này, <code>fdtget</code> <i>đoán</i> kiểu và in số thập phân — Bài 43 đã dạy DTB không lưu kiểu'],
            ['<code>/leds/led-0</code>', 'Đường dẫn đầy đủ từ gốc.', 'Node không có <code>@</code> thì viết tên trần']
          ] },

        { t: 'code', where: 'out', nocopy: true, code:
          'console=ttyAMA0 rdinit=/init board=learn\n' +
          '8003\n' +
          '8003 0 0\n' +
          'disabled' },

        { t: 'cal', kind: 'why', title: 'Label đã thành số — và là đúng số cũ',
          x: 'Dòng 2: node <code>pl061</code> vẫn giữ phandle <code>8003</code>. <code>dtc</code> ' +
             'thấy node đã có sẵn thuộc tính <code>phandle</code> nên dùng luôn số đó cho label ' +
             '<code>gpio0</code>, không cấp số mới. Dòng 3: <code>&lt;&amp;gpio0 0 0&gt;</code> đã ' +
             'thành <code>8003 0 0</code> — cùng khuôn với <code>8003 3 0</code> của nút ' +
             '<code>poweroff</code>, chỉ khác số chân. Cả hai node giờ cùng trỏ vào một bộ điều ' +
             'khiển, như ý muốn. Dòng 1 và 4: dòng lệnh và trạng thái tắt đã nằm trong file nhị ' +
             'phân, sẵn sàng cho kernel đọc.' },

        { t: 'h4', x: 'Tuỳ chọn: hỏi bộ kiểm tra binding của Bài 44' },

        { t: 'p', x:
          'Nếu bạn còn giữ <code>~/bai44/venv</code>, cho <code>dt-validate</code> so cây mới với ' +
          'cây gốc. Đếm số dòng nhận xét của mỗi cây, rồi lọc những dòng nói về node của bạn:' },

        { t: 'code', where: 'wsl', code:
          '. ~/bai44/venv/bin/activate\n' +
          'S=~/bai38/linux-6.18.45/Documentation/devicetree/bindings/processed-schema.json\n' +
          'dt-validate -m -s $S virt-rt.dtb 2>&1 | wc -l\n' +
          'dt-validate -m -s $S board.dtb 2>&1 | wc -l\n' +
          "dt-validate -m -s $S board.dtb 2>&1 | grep -E 'sensor|leds'\n" +
          'deactivate' },

        { t: 'code', where: 'out', nocopy: true, code:
          '14\n' +
          '16\n' +
          "board.dtb: /sensor@b000000: failed to match any schema with compatible: ['learn,temp-sensor']\n" +
          "board.dtb: /sensor@b001000: failed to match any schema with compatible: ['learn,temp-sensor']" },

        { t: 'cal', kind: 'info', title: 'Hai dòng thêm, đều về cảm biến — node leds qua kiểm tra',
          x: 'Cây gốc của QEMU đã có <b>14</b> dòng nhận xét (tên node như <code>pl061@9030000</code> ' +
             'thay vì <code>gpio@…</code>, thiếu <code>model</code> ở gốc…) — đó là việc của QEMU, ' +
             'không phải của bạn. Cây của bạn có <b>16</b>: đúng hai dòng mới, đều là \"không có ' +
             'binding nào cho <code>learn,temp-sensor</code>\", như Bài 44 đã gặp với ' +
             '<code>learn,led-ctrl</code>. Node <code>leds</code> không bị nhắc tới: nó thoả ' +
             '<code>leds-gpio.yaml</code>, trong đó <code>gpios</code> là thuộc tính bắt buộc ' +
             'duy nhất của mỗi LED. Để ý <code>2&gt;&amp;1</code>: <code>dt-validate</code> in ' +
             'nhận xét ra <b>stderr</b>, nên thiếu nó thì <code>wc -l</code> đếm được <code>0</code>.' }
      ] },

      /* ---------------- BƯỚC 4 ---------------- */
      { title: 'Bước 4 — Boot bằng cây của bạn: tầng 1 và dòng lệnh',
        blocks: [

        { t: 'p', x:
          'Trước khi boot, đọc tận mắt đoạn mã kernel sẽ dùng để lấy dòng lệnh từ cây — đoạn đã ' +
          'trích ở phần lý thuyết:' },

        { t: 'code', where: 'wsl', code:
          "sed -n '1115,1118p' ~/bai38/linux-6.18.45/drivers/of/fdt.c" },

        { t: 'p', x:
          'Bốn dòng in ra trùng khối <code>drivers/of/fdt.c (dòng 1115–1118)</code> ở trên. Giờ ' +
          'boot. Để ý dòng lệnh QEMU <b>không có</b> <code>-append</code> — nếu kernel vẫn ' +
          'nhận được <code>console=ttyAMA0 rdinit=/init</code>, thì chuỗi đó chỉ có thể đến từ ' +
          'cây của bạn:' },

        { t: 'code', where: 'wsl', code:
          'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 1G -nographic \\\n' +
          '  -kernel $IMG -initrd ~/bai32/initramfs.cpio.gz \\\n' +
          '  -dtb board.dtb' },

        { t: 'cmdx', title: 'Khác gì so với mọi lần boot trước',
          cmd: 'qemu-system-aarch64 … -dtb board.dtb',
          rows: [
            ['<code>-dtb board.dtb</code>', 'Nạp cây của bạn thay cho cây QEMU tự dựng.', 'QEMU vẫn vá <code>/memory</code> và <code>/chosen</code> trước khi trao — bước 6 sẽ chứng minh'],
            ['không có <code>-append</code>', 'QEMU không ghi gì vào <code>/chosen/bootargs</code>.', 'Nên giá trị bạn viết ở bước 3 được giữ nguyên'],
            ['<code>-smp 2 -m 1G</code>', 'Giống hệt lúc <code>dumpdtb</code> ở bước 1.', 'Cây của bạn khai 2 CPU; khai lệch với <code>-smp</code> là tự chuốc rắc rối']
          ] },

        { t: 'p', x:
          'Log boot chạy qua như mọi khi. Tìm trong đó dòng <code>Kernel command line</code> — ' +
          'khoảng dòng thứ 32 trên màn hình:' },

        { t: 'code', where: 'out', nocopy: true, code:
          '[    0.000000] Kernel command line: console=ttyAMA0 rdinit=/init board=learn' },

        { t: 'p', x:
          'Kernel đã đọc đúng chuỗi trong cây, kể cả <code>board=learn</code>. Tại dấu nhắc ' +
          '<code>~ #</code>, xác nhận thêm từ bên trong — mọi lệnh ở bước 4 và 5 gõ vào ' +
          '<b>cùng một</b> lần boot này:' },

        { t: 'code', where: 'qemu', code:
          'cat /proc/cmdline\n' +
          'echo "board=$board"' },

        { t: 'code', where: 'out', nocopy: true, code:
          'console=ttyAMA0 rdinit=/init board=learn\n' +
          'board=learn' },

        { t: 'cal', kind: 'why', title: 'Dấu vân tay: một tham số bạn bịa ra đã thành biến môi trường',
          x: '<code>/proc/cmdline</code> là dòng lệnh kernel đang dùng — cùng chuỗi với dòng log. ' +
             'Dòng thứ hai mới là bằng chứng đẹp: shell của bạn có biến <code>$board</code> mang ' +
             'giá trị <code>learn</code>. Không ai <code>export</code> nó cả. Kernel không hiểu ' +
             '<code>board=</code>, và như Bài 41 đã đo, tham số lạ có dấu <code>=</code> được ' +
             'chuyển vào môi trường của <code>/init</code>, rồi shell BusyBox thừa kế. Chuỗi đi ' +
             'từ file <code>board.dts</code> trên WSL → <code>dtc</code> → <code>/chosen/bootargs</code> ' +
             '→ kernel → biến môi trường trong máy ảo. Sợi chỉ <code>/chosen/bootargs</code> mà Bài ' +
             '41 để lại đã được gỡ.' },

        { t: 'p', x:
          'Giờ đi <b>tầng 1</b> cho ba node mới: cây của bạn có thật sự tới được kernel không? ' +
          'Bài 42 đã dạy <code>/proc/device-tree</code> là cây đang chạy, trình bày thành thư ' +
          'mục. So số node ở gốc với cây gốc, và xem ba cái tên mới:' },

        { t: 'code', where: 'qemu', code:
          'ls /proc/device-tree | wc -l\n' +
          'ls -d /proc/device-tree/sensor* /proc/device-tree/leds\n' +
          'cat /proc/device-tree/sensor@b001000/status; echo' },

        { t: 'code', where: 'out', nocopy: true, code:
          '56\n' +
          '/proc/device-tree/leds            /proc/device-tree/sensor@b001000\n' +
          '/proc/device-tree/sensor@b000000\n' +
          'disabled' },

        { t: 'cal', kind: 'info', title: 'Tầng 1: cả ba node đều có mặt — kể cả node bị tắt',
          x: '<b>56</b> mục ở gốc; boot bằng <code>virt-rt.dtb</code> (cây gốc dịch lại) cho ' +
             '<b>53</b>. Chênh đúng <b>3</b>: hai <code>sensor</code> và <code>leds</code>. Dòng ' +
             'cuối: <code>sensor@b001000</code> nằm trong cây đang chạy với ' +
             '<code>status</code> = <code>disabled</code>. Đây là điểm dễ hiểu lầm nhất: ' +
             '<code>disabled</code> <b>không</b> xoá node khỏi cây. Kernel vẫn đọc nó, vẫn trình ' +
             'bày nó; chỉ có giai đoạn 2 là bỏ qua. <code>; echo</code> ở cuối vì giá trị chuỗi ' +
             'trong <code>/proc/device-tree</code> kết thúc bằng byte NUL, không có xuống dòng ' +
             '(Bài 42).' },

        { t: 'p', x:
          'Còn một cách nhìn nữa vào tầng 1: kích thước cây mà kernel thật sự nhận được. Bài 42 ' +
          'đo <code>/sys/firmware/fdt</code> ra đúng 1 MiB và gọi đó là vùng QEMU dành sẵn. ' +
          'Đo lại với cây của bạn:' },

        { t: 'code', where: 'qemu', code:
          'wc -c /sys/firmware/fdt' },

        { t: 'code', where: 'out', nocopy: true, code:
          '35806 /sys/firmware/fdt' },

        { t: 'cal', kind: 'why', title: 'Công thức của bước 2, xác nhận từ bên trong máy ảo',
          x: '<code>/sys/firmware/fdt</code> là nguyên văn blob mà kernel nhận lúc boot. ' +
             '<code>(7 903 + 10 000) × 2 = 35 806</code> — đúng từng byte với công thức đệm của ' +
             'QEMU 4.2.1 mà bạn suy ra bằng GDB ở bước 2. Thử boot lại <i>không có</i> ' +
             '<code>-dtb</code>: con số trở về <b>1 048 576</b>, như Bài 42. Nghĩa là con số ' +
             '1 MiB mà Bài 42 đo không phải \"vùng dành sẵn cố định\" theo nghĩa tuyệt đối, mà là ' +
             'kích thước của cây QEMU tự dựng — khi bạn đưa cây riêng, QEMU tính lại. Bài 42 vẫn ' +
             'đúng với điều nó đo: không có <code>-dtb</code> thì luôn là 1 MiB.' }
      ] },

      /* ---------------- BƯỚC 5 ---------------- */
      { title: 'Bước 5 — Tầng 2, tầng 3, và một đèn LED sinh ra từ cây',
        blocks: [

        { t: 'p', x:
          '<b>Tầng 2</b>: node nào đã thành <code>platform_device</code>? Vẫn trong lần boot ở ' +
          'bước 4, lọc danh sách thiết bị theo tên node của bạn:' },

        { t: 'code', where: 'qemu', code:
          "ls /sys/bus/platform/devices | grep -E 'sensor|leds'" },

        { t: 'code', where: 'out', nocopy: true, code:
          'b000000.sensor\n' +
          'leds' },

        { t: 'cal', kind: 'info', title: 'Hai trên ba — và node disabled im lặng biến mất',
          x: '<code>b000000.sensor</code> có mặt, đặt tên theo quy tắc Bài 44: <b>địa chỉ + tên ' +
             'node</b>. <code>leds</code> có mặt, chỉ mang tên vì không có <code>reg</code> — ' +
             'giống <code>psci</code> và <code>gpio-keys</code>. <code>sensor@b001000</code> ' +
             '<b>không</b> có: nó dừng ở tầng 2, đúng dự đoán. Không có dòng log nào báo điều đó. ' +
             'Tổng số thiết bị platform giờ là <b>44</b> (<code>ls /sys/bus/platform/devices | wc ' +
             '-l</code>), so với 42 của Bài 44: đúng hai thiết bị mới.' },

        { t: 'p', x:
          '<b>Tầng 3</b> cho node cảm biến. Nhìn vào thư mục thiết bị, và xem nó đã khai gì với ' +
          'userspace:' },

        { t: 'code', where: 'qemu', code:
          'ls /sys/bus/platform/devices/b000000.sensor\n' +
          'cat /sys/bus/platform/devices/b000000.sensor/uevent' },

        { t: 'code', where: 'out', nocopy: true, code:
          'driver_override       power                 waiting_for_supplier\n' +
          'modalias              subsystem\n' +
          'of_node               uevent\n' +
          'OF_NAME=sensor\n' +
          'OF_FULLNAME=/sensor@b000000\n' +
          'OF_COMPATIBLE_0=learn,temp-sensor\n' +
          'OF_COMPATIBLE_N=1\n' +
          'MODALIAS=of:NsensorT(null)Clearn,temp-sensor' },

        { t: 'cal', kind: 'why', title: 'Tầng 3: không có liên kết driver — thiết bị đang chờ người nhận',
          x: 'Danh sách file giống hệt từng chữ khe virtio trống <code>a000000</code> của Bài 44: ' +
             'có <code>of_node</code> (sinh ra từ cây), <b>không</b> có <code>driver</code>, còn ' +
             'giữ <code>waiting_for_supplier</code>. Nhưng lý do khác nhau. Khe virtio có driver ' +
             'khớp, <code>probe()</code> chạy rồi từ chối. Cảm biến của bạn <b>không có driver ' +
             'nào khớp</b>: không một bảng <code>of_match_table</code> nào trong kernel chứa ' +
             '<code>learn,temp-sensor</code>. Dòng <code>MODALIAS</code> là thứ kernel treo lên ' +
             'để tìm người nhận — cùng khuôn <code>of:N…T…C…</code> với danh bạ ' +
             '<code>modules.alias</code> ở Bài 44. Nếu có một module khai chuỗi này, ' +
             '<code>modprobe</code> sẽ nạp nó. Bài 54 sẽ viết đúng module đó.' },

        { t: 'p', x:
          'Giờ node <code>leds</code> — node duy nhất có driver. Đi thẳng tầng 3:' },

        { t: 'code', where: 'qemu', code:
          'ls -l /sys/bus/platform/devices/leds/driver\n' +
          'ls /sys/class/leds' },

        { t: 'code', where: 'out', nocopy: true, code:
          'lrwxrwxrwx    1 0        0                0 Sep 28 10:09 /sys/bus/platform/devices/leds/driver -> ../../../bus/platform/drivers/leds-gpio\n' +
          'learn:green:status',
          notes: ['Giờ trong dòng <code>ls -l</code> là giờ UTC của máy ảo lúc boot, sẽ khác trên máy bạn.'] },

        { t: 'cal', kind: 'info', title: 'Qua cả ba tầng — và sinh ra một thiết bị ở một lớp mới',
          x: 'Liên kết <code>driver</code> trỏ vào <code>leds-gpio</code>: chuỗi ' +
             '<code>gpio-leds</code> trong cây khớp đúng mục ' +
             '<code>{ .compatible = \"gpio-leds\", }</code> ở dòng 205 của ' +
             '<code>drivers/leds/leds-gpio.c</code>. Nhưng dòng thứ hai mới là thứ đáng chú ý: ' +
             'trong <code>/sys/class/leds</code> xuất hiện <code>learn:green:status</code> — ' +
             'đúng chuỗi <code>label</code> bạn viết. <code>probe()</code> của driver đã đọc node ' +
             'con <code>led-0</code>, lấy chân GPIO, và đăng ký một đèn LED với lõi LED của ' +
             'kernel. Một node trong cây → một <code>platform_device</code> → một thiết bị lớp ' +
             '<code>leds</code> mà ai cũng dùng được, không cần biết GPIO là gì.' },

        { t: 'p', x:
          'Đèn đang làm gì? Trigger nào đang điều khiển nó, và độ sáng thay đổi ra sao theo thời ' +
          'gian — đọc sáu lần, cách nhau một phần tư giây:' },

        { t: 'code', where: 'qemu', code:
          'cat /sys/class/leds/learn:green:status/trigger\n' +
          'for i in 1 2 3 4 5 6; do cat /sys/class/leds/learn:green:status/brightness; sleep 0.25; done' },

        { t: 'code', where: 'out', nocopy: true, code:
          'none default kbd-scrolllock kbd-numlock kbd-capslock kbd-kanalock kbd-shiftlock kbd-altgrlock kbd-ctrllock kbd-altlock kbd-shiftllock kbd-shiftrlock kbd-ctrlllock kbd-ctrlrlock timer disk-activity disk-read disk-write [heartbeat] cpu cpu0 cpu1 default-on panic\n' +
          '0\n' +
          '0\n' +
          '0\n' +
          '0\n' +
          '0\n' +
          '1',
          notes: ['Dãy 0/1 sẽ khác mỗi lần chạy — nó phụ thuộc bạn đọc rơi vào pha nào của nhịp tim. Chỉ cần thấy cả <code>0</code> lẫn <code>1</code>.'] },

        { t: 'cal', kind: 'info', title: 'Dấu ngoặc vuông là trigger đang dùng — và đèn đang nhấp nháy thật',
          x: 'File <code>trigger</code> liệt kê mọi trigger mà kernel có, cái đang dùng nằm trong ' +
             '<code>[ ]</code>: <code>[heartbeat]</code>, đúng giá trị ' +
             '<code>linux,default-trigger</code> bạn viết. Để ý <code>cpu0</code> và ' +
             '<code>cpu1</code>: có đúng hai vì <code>-smp 2</code>. Dãy số bên dưới cho thấy độ ' +
             'sáng đổi giữa <code>0</code> và <code>1</code> mà không ai gõ lệnh gì — trigger ' +
             '<code>heartbeat</code> bật đèn hai nhịp ngắn rồi tắt một khoảng dài hơn, và nhịp ' +
             'nhanh lên khi máy bận. Đọc 6 mẫu cách 0,25 giây phần lớn rơi vào khoảng tắt, nên ' +
             'thấy nhiều số <code>0</code> là bình thường.' },

        { t: 'p', x:
          'Đèn \"sáng\" nghĩa là gì ở tầng phần cứng? Lõi GPIO có một file tổng hợp trạng thái mọi ' +
          'chân, nằm trong <code>debugfs</code> — hệ thống file gỡ lỗi mà initramfs của bạn chưa ' +
          'gắn. Gắn nó, rồi đọc:' },

        { t: 'code', where: 'qemu', code:
          'mount -t debugfs none /sys/kernel/debug\n' +
          'cat /sys/kernel/debug/gpio' },

        { t: 'code', where: 'out', nocopy: true, code:
          'gpiochip0: 8 GPIOs, parent: amba/9030000.pl061, 9030000.pl061:\n' +
          ' gpio-0   (                    |learn:green:status  ) out lo \n' +
          ' gpio-3   (                    |GPIO Key Poweroff   ) in  lo IRQ ',
          notes: ['<code>lo</code>/<code>hi</code> ở cuối dòng <code>gpio-0</code> đổi theo nhịp tim, tuỳ lúc bạn đọc.'] },

        { t: 'cal', kind: 'why', title: 'Hai node trong cây, hai chân trên cùng một con chip',
          x: 'Dòng đầu: bộ điều khiển có <b>8</b> chân, cha là thiết bị AMBA ' +
             '<code>9030000.pl061</code> — chính node bạn gắn label <code>gpio0</code>. Hai dòng ' +
             'sau là hai chân đang có chủ, và tên chủ lấy từ cây:<ul>' +
             '<li><code>gpio-0</code>, chủ <code>learn:green:status</code>, hướng <code>out</code> ' +
             '— LED của bạn, từ <code>&lt;&amp;gpio0 0 0&gt;</code>.</li>' +
             '<li><code>gpio-3</code>, chủ <code>GPIO Key Poweroff</code>, hướng <code>in</code>, ' +
             'có <code>IRQ</code> — nút nguồn của QEMU, từ <code>&lt;0x8003 0x03 0x00&gt;</code>. ' +
             'Chân vào có ngắt, vì driver phím muốn được báo khi nút được bấm.</li>' +
             '</ul>' +
             'Hai tham chiếu viết theo hai cách — một bằng label, một bằng số trần — nhưng tới ' +
             'được cùng một bộ điều khiển, ở hai chân khác nhau. Sáu chân còn lại chưa ai nhận ' +
             'nên không được in.' },

        { t: 'p', x:
          'Cuối cùng, tự tay điều khiển đèn. Gỡ trigger để nhịp tim không giành quyền, rồi đặt ' +
          'độ sáng và nhìn chân GPIO đổi theo:' },

        { t: 'code', where: 'qemu', code:
          'echo none > /sys/class/leds/learn:green:status/trigger\n' +
          'echo 0 > /sys/class/leds/learn:green:status/brightness\n' +
          'grep gpio-0 /sys/kernel/debug/gpio\n' +
          'echo 1 > /sys/class/leds/learn:green:status/brightness\n' +
          'grep gpio-0 /sys/kernel/debug/gpio' },

        { t: 'code', where: 'out', nocopy: true, code:
          ' gpio-0   (                    |learn:green:status  ) out lo \n' +
          ' gpio-0   (                    |learn:green:status  ) out hi ' },

        { t: 'cal', kind: 'info', title: 'Ghi một chữ số vào file, chân của con chip đổi mức điện áp',
          x: 'Sau <code>echo 0</code>: chân 0 ở mức <code>lo</code>. Sau <code>echo 1</code>: ' +
             '<code>hi</code>. Trên bo mạch thật, <code>hi</code> nghĩa là chân đó lên 3,3 V và ' +
             'đèn sáng. Bạn không viết một dòng C nào, không biết thanh ghi nào của PL061 điều ' +
             'khiển chân 0 — driver <code>leds-gpio</code> và driver <code>pl061</code> lo hết, ' +
             'và cả hai đều biết phải làm gì nhờ đúng <b>một node</b> bạn thêm vào cây. Đây là ' +
             'điều Bài 42 hứa khi nói Device Tree tách phần cứng khỏi mã: cùng hai driver đó, ' +
             'trên bo mạch của bạn, với LED ở chân khác, chỉ cần sửa một con số trong ' +
             '<code>gpios</code>.' },

        { t: 'p', x:
          'Tắt máy ảo để chuẩn bị cho bước 6:' },

        { t: 'code', where: 'qemu', code: 'poweroff -f' }
      ] },

      /* ---------------- BƯỚC 6 ---------------- */
      { title: 'Bước 6 — Bootloader ghi đè cây của bạn, và hai node tranh một chân',
        blocks: [

        { t: 'p', x:
          'Sơ đồ đầu bài có một ô màu cảnh báo: QEMU vá cây trước khi trao cho kernel. Giờ bắt ' +
          'quả tang nó, hai lần. Lần thứ nhất: boot <b>cùng</b> <code>board.dtb</code>, nhưng ' +
          'thêm lại <code>-append</code> với một chuỗi khác chuỗi trong cây:' },

        { t: 'code', where: 'wsl', code:
          'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 1G -nographic \\\n' +
          '  -kernel $IMG -initrd ~/bai32/initramfs.cpio.gz \\\n' +
          '  -dtb board.dtb -append "console=ttyAMA0 rdinit=/init"' },

        { t: 'code', where: 'qemu', code:
          'cat /proc/cmdline\n' +
          'cat /proc/device-tree/chosen/bootargs; echo\n' +
          'poweroff -f' },

        { t: 'code', where: 'out', nocopy: true, code:
          'console=ttyAMA0 rdinit=/init\n' +
          'console=ttyAMA0 rdinit=/init' },

        { t: 'cal', kind: 'why', title: '-append không \"thắng\" trong kernel — nó xoá chuỗi của bạn trước khi kernel kịp thấy',
          x: 'Dòng lệnh đang dùng mất <code>board=learn</code>: <code>-append</code> đã thắng, ' +
             'đúng bảng ưu tiên ở phần lý thuyết. Nhưng dòng thứ hai mới dạy điều quan trọng: ' +
             'thuộc tính <code>/chosen/bootargs</code> <b>trong cây đang chạy</b> cũng mang chuỗi ' +
             'mới. Kernel không hề chọn giữa hai nguồn — nó chỉ có một nguồn, và QEMU đã ghi đè ' +
             'nguồn đó trước khi trao cây. File <code>board.dtb</code> trên đĩa vẫn nguyên ' +
             '<code>board=learn</code>; bản trong RAM thì không. U-Boot với biến ' +
             '<code>bootargs</code> làm đúng như vậy. Nên khi nghi ngờ, đừng đọc file ' +
             '<code>.dts</code> của mình — đọc <code>/proc/device-tree</code>.' },

        { t: 'p', x:
          'Lần thứ hai: bỏ <code>-append</code>, đổi <code>-m 1G</code> thành <code>-m 512</code>. ' +
          'Cây của bạn vẫn khai 1 GiB RAM ở node <code>memory@40000000</code>, vì nó được dump ' +
          'với <code>-m 1G</code>:' },

        { t: 'code', where: 'wsl', code:
          'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 512 -nographic \\\n' +
          '  -kernel $IMG -initrd ~/bai32/initramfs.cpio.gz -dtb board.dtb' },

        { t: 'code', where: 'qemu', code:
          'grep MemTotal /proc/meminfo\n' +
          'xxd -g4 /proc/device-tree/memory@40000000/reg\n' +
          'poweroff -f' },

        { t: 'code', where: 'out', nocopy: true, code:
          'MemTotal:         476148 kB\n' +
          '00000000: 00000000 40000000 00000000 20000000  ....@....... ...',
          notes: ['<code>MemTotal</code> lệch vài KB giữa các lần boot vì KASLR (Bài 42 đã ghi nhận). <code>20000000</code> thì cố định.'] },

        { t: 'cal', kind: 'info', title: 'Cây nói 1 GiB, kernel thấy 512 MiB — QEMU đã sửa /memory',
          x: '<code>xxd -g4</code> in thuộc tính <code>reg</code> thành bốn ô 32 bit: địa chỉ ' +
             '<code>0x00000000 40000000</code>, kích thước <code>0x00000000 20000000</code> = ' +
             '<b>512 MiB</b>. Trong file <code>board.dts</code>, dòng 19 vẫn ghi ' +
             '<code>0x40000000</code> = 1 GiB. <code>MemTotal</code> xác nhận kernel dùng con số ' +
             'của QEMU (<b>476 148</b> kB — phần còn lại là vùng kernel tự giữ, như Bài 32). ' +
             'Đây chính là việc bootloader làm trên bo mạch thật: đo RAM thật rồi ghi vào cây, để ' +
             'một file <code>.dtb</code> dùng được cho cả bản 512 MiB lẫn bản 1 GiB của cùng một ' +
             'bo mạch. Còn <code>/chosen/bootargs</code> lần này vẫn là chuỗi của bạn — không có ' +
             '<code>-append</code> thì QEMU không đụng vào nó.' },

        { t: 'p', x:
          'Cuối cùng, một lỗi mà <code>dtc</code> không thể bắt. Sửa LED sang <b>chân 3</b> — chân ' +
          'nút nguồn đang dùng. Lần này không cần mở trình soạn thảo: <code>fdtput</code> sửa ' +
          'thẳng trong file nhị phân, trên một bản sao:' },

        { t: 'code', where: 'wsl', code:
          'cp board.dtb busy.dtb\n' +
          'fdtput -t x busy.dtb /leds/led-0 gpios 8003 3 0\n' +
          'fdtget -t x busy.dtb /leds/led-0 gpios' },

        { t: 'cmdx', title: 'fdtput — người anh em ghi của fdtget',
          cmd: 'fdtput -t x busy.dtb /leds/led-0 gpios 8003 3 0',
          rows: [
            ['<code>fdtput FILE NODE PROP VALUE…</code>', 'Ghi đè thuộc tính <code>PROP</code> của <code>NODE</code> ngay trong file <code>.dtb</code>.', 'Không cần dịch ngược, không cần <code>dtc</code>. Tiện để thử nhanh một giá trị'],
            ['<code>-t x</code>', 'Các giá trị theo sau là số hex, mỗi số một ô 32 bit.', 'Phải khai kiểu, vì DTB không lưu kiểu — <code>fdtput</code> không biết <code>gpios</code> là mảng ô'],
            ['<code>8003 3 0</code>', 'Phandle của <code>pl061</code>, chân 3, cờ 0.', 'Không có label ở đây — <code>fdtput</code> làm việc với số trần, như cây QEMU dựng']
          ] },

        { t: 'code', where: 'out', nocopy: true, code:
          '8003 3 0' },

        { t: 'p', x:
          'Giá trị đã đổi. <code>dtc</code> không hề được gọi, và kể cả nếu được gọi, nó cũng ' +
          'không phàn nàn: hai node trỏ vào cùng một chân là hoàn toàn đúng cú pháp. Boot và xem ' +
          'ai giành được chân 3:' },

        { t: 'code', where: 'wsl', code:
          'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 1G -nographic \\\n' +
          '  -kernel $IMG -initrd ~/bai32/initramfs.cpio.gz -dtb busy.dtb' },

        { t: 'code', where: 'qemu', code:
          "dmesg | grep -E 'gpio-keys|leds'\n" +
          'ls /sys/class/leds\n' +
          'ls /sys/class/input\n' +
          'poweroff -f' },

        { t: 'code', where: 'out', nocopy: true, code:
          '[    0.616876] gpio-keys gpio-keys: error -EBUSY: failed to get gpio\n' +
          '[    0.617035] gpio-keys gpio-keys: probe with driver gpio-keys failed with error -16\n' +
          'learn:green:status',
          notes: ['Dòng cuối trống: <code>ls /sys/class/input</code> không in gì. Dấu thời gian sẽ khác trên máy bạn.'] },

        { t: 'cal', kind: 'danger', title: 'Ai đến trước người đó được — và kẻ thua là nút nguồn',
          x: 'LED vẫn được tạo (<code>learn:green:status</code> vẫn có mặt). Người thua là ' +
             '<code>gpio-keys</code>: <code>-EBUSY</code> (mã 16, \"thiết bị đang bận\") — chân 3 ' +
             'đã bị driver <code>leds-gpio</code> xin trước. <code>/sys/class/input</code> trống ' +
             'trơn; trong lần boot bình thường ở bước 4, nó có <code>event0</code> và ' +
             '<code>input0</code> — chính là nút nguồn. Hậu quả thật: máy ảo giờ <b>không phản ' +
             'ứng khi QEMU bấm nút nguồn</b>, và không có gì trên console báo điều đó. Không ai ' +
             'quyết định ai được ưu tiên; thứ tự <code>probe()</code> quyết định, và thứ tự đó có ' +
             'thể đổi khi bạn thêm một node khác. Đây là lỗi mà chỉ đọc sơ đồ mạch — và kiểm tra ' +
             '<code>/sys/kernel/debug/gpio</code> — mới tránh được.' },

        { t: 'p', x:
          'Khi không cần nữa, dọn thư mục nháp. <code>board.dts</code> là thứ duy nhất đáng giữ ' +
          'nếu bạn muốn quay lại thử nghiệm:' },

        { t: 'code', where: 'wsl', code:
          'ls ~/bai45\n' +
          'du -sh ~/bai45\n' +
          'rm -rf ~/bai45' },

        { t: 'code', where: 'out', nocopy: true, code:
          'board.dtb\n' +
          'board.dts\n' +
          'busy.dtb\n' +
          'virt.dtb\n' +
          'virt.dts\n' +
          'virt-rt.dtb\n' +
          '1.1M\t/home/cah8hc/bai45',
          notes: ['Kết quả trên được ghi qua một script nên <code>ls</code> in mỗi tên một dòng; trong terminal, cùng sáu tên sẽ nằm trên một hàng. Trên 1 MiB trong số đó là <code>virt.dtb</code> — khoảng đệm của <code>dumpdtb</code>, như Bài 43 đã nhận xét. Năm file còn lại cộng lại chưa tới 50 KB. Bài này không ghi gì vào <code>~/bai38</code> hay <code>~/bai32</code>.'] }
      ] }
    ] },

    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Mọi dòng dưới đây đều gặp thật trong lúc soạn bài. Bốn dòng đầu là thông báo; bốn dòng ' +
      'sau là <b>sự im lặng</b> — và với Device Tree, im lặng là trường hợp phổ biến hơn.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>ERROR (phandle_references): /leds/led-0: Reference to non-existent node or label \"gpio0\"</code><br><code>ERROR: Input tree has errors, aborting</code>, mã thoát 2',
         'Viết <code>&amp;gpio0</code> nhưng quên đặt label <code>gpio0:</code> trước node <code>pl061</code> — hoặc gõ sai tên một trong hai chỗ. Không có file <code>.dtb</code> nào được ghi.',
         'Thêm label vào dòng 273 như Sửa 1 ở bước 3. Label và tham chiếu phải trùng từng ký tự.'],

        ['<code>qemu-system-aarch64: rdinit=/init\": Could not open \'rdinit=/init\"\': No such file or directory</code>',
         'Chuỗi <code>-append</code> bị tách làm đôi ở dấu cách — thường vì cất cả <code>-append \"…\"</code> vào một biến shell rồi viết <code>$ARGS</code> không có ngoặc kép. QEMU coi nửa sau là tên file.',
         'Gõ <code>-append \"…\"</code> trực tiếp trên dòng lệnh, hoặc dùng mảng bash. Không phải lỗi của cây.'],

        ['<code>gpio-keys gpio-keys: error -EBUSY: failed to get gpio</code>',
         'Hai node trong cây xin cùng một chân GPIO. Driver probe sau thua. <code>dtc</code> và <code>dt-validate</code> đều không bắt được.',
         '<code>cat /sys/kernel/debug/gpio</code> (sau khi <code>mount -t debugfs</code>) để xem chân nào đã có chủ, rồi đổi số chân trong <code>gpios</code>.'],

        ['<code>platform leds: deferred probe pending: leds-gpio: Failed to get GPIO \'/leds/led-0\'</code>, khoảng 10 giây sau khi boot',
         'Số chân vượt quá số chân bộ điều khiển có — ví dụ <code>&lt;&amp;gpio0 8 0&gt;</code> trên PL061 chỉ có chân 0–7. Driver không lấy được GPIO nên hoãn <code>probe()</code> và chờ mãi. <code>/sys/class/leds</code> trống.',
         'Kiểm tra số chân với dòng <code>gpiochip0: 8 GPIOs</code> trong <code>/sys/kernel/debug/gpio</code>. Cơ chế \"hoãn probe\" này Bài 54 sẽ mổ xẻ.'],

        ['Không một dòng nào từ kernel, QEMU quay 100 % một nhân CPU — <b>im lặng</b>',
         'Nạp thẳng file <code>dumpdtb</code> 1 MiB bằng <code>-dtb</code>. QEMU 4.2.1 đệm nó lên <code>(size + 10000) × 2</code> = 2 117 152 byte, vượt <code>MAX_FDT_SIZE</code> 2 MiB; kernel từ chối cây trước khi có console. <code>earlycon</code> không cứu được.',
         'Luôn dịch ngược rồi dịch lại bằng <code>dtc</code> trước khi nạp. Bất kỳ lần boot nào im lặng tuyệt đối với <code>-dtb</code>: kiểm tra kích thước file trước tiên.'],

        ['Sửa <code>bootargs</code> trong <code>.dts</code>, nhưng <code>/proc/cmdline</code> vẫn là chuỗi cũ — <b>im lặng</b>',
         'Bootloader ghi đè <code>/chosen/bootargs</code>: với QEMU là <code>-append</code>, với U-Boot là biến <code>bootargs</code> trong môi trường. Hoặc quên dịch lại <code>.dtb</code> sau khi sửa.',
         'Đọc <code>/proc/device-tree/chosen/bootargs</code> trong máy — nếu nó khác file của bạn, có ai đó đã ghi đè. Bỏ <code>-append</code>, hoặc <code>setenv bootargs</code> trong U-Boot.'],

        ['Node có trong <code>/proc/device-tree</code> nhưng không có trong <code>/sys/bus/platform/devices</code> — <b>im lặng</b>',
         'Dừng ở tầng 2: <code>status = \"disabled\"</code>, thiếu <code>compatible</code>, hoặc node nằm dưới một cha không phải bus.',
         '<code>cat /proc/device-tree/&lt;node&gt;/status</code> trước tiên. Rồi kiểm tra <code>compatible</code> và vị trí node trong cây.'],

        ['Thiết bị có trong <code>/sys/bus/platform/devices</code> nhưng không có liên kết <code>driver</code> — <b>im lặng</b>',
         'Dừng ở tầng 3: không driver nào trong kernel có chuỗi <code>compatible</code> đó (như <code>learn,temp-sensor</code>), hoặc driver đã khớp nhưng <code>probe()</code> từ chối.',
         'Đọc <code>modalias</code> của thiết bị, rồi <code>grep</code> chuỗi <code>compatible</code> trong <code>drivers/</code> như Bài 44. Boot với <code>initcall_debug</code> để phân biệt \"không khớp\" với \"khớp nhưng từ chối\".']
      ] },

    { t: 'recap', title: 'Tóm tắt', items: [
      'Vòng sửa cây trên QEMU: <code>-machine dumpdtb=</code> → <code>dtc -I dtb -O dts</code> → sửa → <code>dtc -I dts -O dtb</code> → <code>-dtb</code>. Cây dịch ngược của máy <code>virt</code> có <b>383</b> dòng; bốn thứ bạn thêm tốn <b>422</b> byte (7 481 → 7 903).',
      '<b>Không bao giờ nạp thẳng file <code>dumpdtb</code>.</b> Nó dài <b>1 048 576</b> byte; QEMU 4.2.1 đệm thành <code>(size + 10000) × 2</code> = <b>2 117 152</b> byte, vượt <code>MAX_FDT_SIZE</code> = <b>2 MiB</b>, và kernel im lặng quay vòng. Ngưỡng đo được giữa 1 015 808 và 1 040 384 byte.',
      'Bootloader chỉ có <b>một</b> đường trao dòng lệnh cho kernel ARM64: <code>/chosen/bootargs</code>. <code>-append</code> và <code>setenv bootargs</code> đều ghi đè thuộc tính đó trước khi kernel đọc — nên bootloader luôn thắng. <code>CONFIG_CMDLINE</code> chỉ lấp chỗ trống.',
      'Cây dịch ngược không còn label, chỉ còn phandle số (<code>0x8003</code>). Đặt lại label (<code>gpio0:</code>) thay vì chép số; <code>dtc</code> giữ nguyên phandle có sẵn, nên tham chiếu cũ bằng số vẫn đúng.',
      '<b>Thang ba tầng</b>: <code>/proc/device-tree</code> (cây có tới kernel không) → <code>/sys/bus/platform/devices</code> (node có thành thiết bị không) → liên kết <code>driver</code> (có ai nhận không). Node <code>disabled</code> dừng ở tầng 2, <code>learn,temp-sensor</code> dừng ở tầng 3 — cả hai <b>không in gì</b>.',
      'Một node <code>gpio-leds</code> với <code>gpios = &lt;&amp;gpio0 0 0&gt;</code> sinh ra <code>/sys/class/leds/learn:green:status</code>, tự nhấp nháy theo <code>[heartbeat]</code>, và đổi chân 0 giữa <code>lo</code>/<code>hi</code> trong <code>/sys/kernel/debug/gpio</code> — không một dòng C.',
      '<code>-dtb</code> không có nghĩa là kernel nhận nguyên văn file của bạn: QEMU sửa <code>/memory</code> theo <code>-m</code> (512 MiB = <code>0x20000000</code>) và <code>/chosen/bootargs</code> theo <code>-append</code>. Khi nghi ngờ, đọc <code>/proc/device-tree</code>, không đọc file <code>.dts</code>.',
      'Hai node trên cùng một chân GPIO dịch không một cảnh báo; lúc chạy, driver probe sau nhận <code>-EBUSY</code> và thiết bị của nó biến mất.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: '<b>Chặng 08 khép lại ở đây</b>: bạn đã đi từ \"vì sao có Device Tree\" tới tự thêm một ' +
         'thiết bị và nhìn kernel nhận nó. Suốt bốn bài, userspace của bạn chỉ là một file ' +
         '<code>/init</code> ba dòng và một BusyBox — đủ để gõ <code>cat</code>, nhưng bạn đã ' +
         'phải tự <code>mount -t debugfs</code>, và Bài 41 từng thấy <code>/dev/kmsg</code> hỏng ' +
         'lặng lẽ vì thiếu <code>devtmpfs</code>. <b>Bài 46 — Rootfs gồm những gì</b> mở ' +
         'Chặng 09 bằng đúng câu hỏi đó: một hệ thống Linux tối thiểu thật sự cần những thư mục, ' +
         'file thiết bị và thư viện nào, và vì sao thiếu <code>/init</code> thì kernel in ' +
         '<code>No working init found</code> rồi panic.' }
  ],

  quiz: [
    { q: 'Bạn boot bằng <code>-dtb virt.dtb</code>, dùng nguyên file vừa lấy từ <code>-machine dumpdtb=</code>. Không một dòng nào hiện ra, QEMU chiếm 100 % một nhân CPU. Nguyên nhân khả dĩ nhất là gì?',
      opts: [
        'File <code>dumpdtb</code> bị hỏng, cần dump lại',
        'QEMU đệm blob 1 MiB lên hơn 2 MiB trước khi trao, kernel ARM64 từ chối cây vượt <code>MAX_FDT_SIZE</code> và quay vòng trước khi có console',
        'Thiếu <code>-append \"console=ttyAMA0\"</code>, nên kernel không biết in ra đâu',
        'Kernel không hỗ trợ <code>-dtb</code>, chỉ hỗ trợ cây QEMU tự dựng'
      ],
      a: 1,
      why: 'Bước 2 chứng minh cây không hỏng: dịch ngược file dịch lại cho ra đúng từng ký tự (<code>IDENTICAL</code>). GDB đọc <code>totalsize</code> tại <code>x0</code> ra 2 117 152 byte — lớn hơn <code>MAX_FDT_SIZE</code> = 2 097 152. Thiếu <code>console=</code> không gây im lặng, vì <code>/chosen/stdout-path</code> vẫn chỉ ra UART (Bài 42); và <code>earlycon</code> cũng không cứu, vì chính dòng lệnh nằm trong cái cây bị từ chối. Cách chữa: luôn dịch lại bằng <code>dtc</code>.' },

    { q: '<code>board.dtb</code> chứa <code>bootargs = \"console=ttyAMA0 rdinit=/init board=learn\"</code>. Bạn boot với <code>-dtb board.dtb -append \"console=ttyAMA0 rdinit=/init\"</code>. Trong máy ảo, <code>cat /proc/device-tree/chosen/bootargs</code> in ra gì?',
      opts: [
        '<code>console=ttyAMA0 rdinit=/init</code>, vì QEMU đã ghi đè thuộc tính trong cây trước khi trao cho kernel',
        '<code>console=ttyAMA0 rdinit=/init board=learn</code>, vì cây là của bạn',
        'Cả hai chuỗi nối vào nhau',
        'Không có gì, vì <code>-append</code> xoá thuộc tính <code>bootargs</code>'
      ],
      a: 0,
      why: 'Bước 6 bắt quả tang: cả <code>/proc/cmdline</code> lẫn thuộc tính trong cây đang chạy đều mang chuỗi của <code>-append</code>. Kernel không chọn giữa hai nguồn — nó chỉ đọc <code>/chosen/bootargs</code>, và bootloader (QEMU ở đây, U-Boot trên bo mạch thật) viết vào đó sau cùng. File <code>board.dtb</code> trên đĩa vẫn giữ <code>board=learn</code>; bản trong RAM thì không.' },

    { q: 'Bạn thêm node <code>sensor@b001000</code> có <code>status = \"disabled\"</code>. Sau khi boot, điều nào đúng?',
      opts: [
        'Node không có trong <code>/proc/device-tree</code>, vì kernel bỏ qua node bị tắt khi đọc cây',
        'Node có trong cả hai, nhưng thiếu liên kết <code>driver</code>',
        'Node có trong <code>/proc/device-tree</code> nhưng không có trong <code>/sys/bus/platform/devices</code>, và kernel không in dòng log nào về nó',
        'Kernel in cảnh báo \"node disabled\" trong <code>dmesg</code>'
      ],
      a: 2,
      why: 'Bước 4 cho thấy <code>/proc/device-tree/sensor@b001000</code> tồn tại, <code>status</code> đọc ra <code>disabled</code>: kernel vẫn đọc và trình bày node. Bước 5 cho thấy <code>ls /sys/bus/platform/devices</code> chỉ có <code>b000000.sensor</code>. Node dừng ở tầng 2 vì giai đoạn 2 (Bài 44) bỏ qua node bị tắt — lặng lẽ. "Có trong cả hai nhưng thiếu liên kết <code>driver</code>" là triệu chứng của tầng 3, như <code>sensor@b000000</code>.' },

    { q: 'Cây QEMU dịch ngược có <code>pl061@9030000 { phandle = &lt;0x8003&gt;; … }</code>. Bạn muốn node <code>led-0</code> trỏ tới nó. Cách nào bền vững nhất?',
      opts: [
        'Viết <code>gpios = &lt;0x8003 0 0&gt;</code>, vì số đó đã có trong cây',
        'Đặt label <code>gpio0:</code> trước tên node <code>pl061</code> và viết <code>gpios = &lt;&amp;gpio0 0 0&gt;</code>',
        'Viết <code>gpios = &lt;&amp;pl061@9030000 0 0&gt;</code>',
        'Xoá dòng <code>phandle</code> của <code>pl061</code> để <code>dtc</code> tự cấp số'
      ],
      a: 1,
      why: 'Số <code>0x8003</code> do QEMU chọn và có thể đổi khi dòng lệnh đổi — Bài 30 đo được <code>-smp 2</code> làm đổi 35 dòng vì phandle đánh số lại. Label đi theo node. Bước 3 kiểm chứng: sau khi thêm label, <code>fdtget -t x … phandle</code> vẫn in <code>8003</code> và <code>gpios</code> thành <code>8003 0 0</code>, nên nút <code>poweroff</code> vốn trỏ bằng số trần vẫn đúng. Xoá dòng <code>phandle</code> để <code>dtc</code> tự cấp số mới sẽ làm hỏng chính tham chiếu đó.' },

    { q: 'Bạn đặt LED lên chân 3 của PL061. <code>dtc</code> dịch không một cảnh báo, máy ảo boot bình thường, LED hoạt động. Nhưng <code>ls /sys/class/input</code> giờ trống, trong khi lần boot trước có <code>event0</code>. Chuyện gì đã xảy ra?',
      opts: [
        'Driver input chưa được bật trong cấu hình kernel',
        'LED và nút nguồn dùng chung chân là hợp lệ, <code>/sys/class/input</code> chỉ trống tạm thời',
        '<code>dt-validate</code> sẽ báo lỗi này nếu chạy nó',
        'Chân 3 đã được nút <code>poweroff</code> của <code>gpio-keys</code> dùng; <code>leds-gpio</code> xin trước nên <code>gpio-keys</code> nhận <code>-EBUSY</code> và không tạo được thiết bị input'
      ],
      a: 3,
      why: 'Bước 6 in đúng <code>gpio-keys gpio-keys: error -EBUSY: failed to get gpio</code>. <code>/sys/kernel/debug/gpio</code> ở bước 5 đã cho thấy chân 3 thuộc <code>GPIO Key Poweroff</code>. Không công cụ kiểm tra lúc build nào biết hai node cùng trỏ một chân là lỗi — cú pháp và binding đều đúng. Người thắng do thứ tự <code>probe()</code> quyết định, không phải do bạn.' },

    { q: 'Cây của bạn khai <code>memory@40000000 { reg = &lt;0x00 0x40000000 0x00 0x40000000&gt;; }</code> (1 GiB). Bạn boot với <code>-dtb board.dtb -m 512</code>. <code>MemTotal</code> trong máy ảo khoảng bao nhiêu, và vì sao?',
      opts: [
        'Kernel panic vì cây khai nhiều RAM hơn thực tế',
        'Khoảng 1 GiB, vì kernel tin cây',
        'Khoảng 1,5 GiB, vì kernel cộng hai con số',
        'Khoảng 476 000 kB (gần 512 MiB), vì QEMU — đóng vai bootloader — sửa <code>/memory</code> theo <code>-m</code> trước khi trao cây'
      ],
      a: 3,
      why: 'Bước 6: <code>xxd -g4 /proc/device-tree/memory@40000000/reg</code> in kích thước <code>20000000</code> = 512 MiB, dù file của bạn ghi <code>40000000</code>. <code>MemTotal</code> đọc ra 476 148 kB. Đây là một trong những việc chính của bootloader trên bo mạch thật: đo RAM thật rồi ghi vào cây, để một <code>.dtb</code> dùng được cho nhiều cấu hình bộ nhớ.' }
  ]
});

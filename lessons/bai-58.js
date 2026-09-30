/* Bài 58 — Driver cho bus I2C và SPI
   Chặng 10 — Kernel module và Driver
   Mô hình bus – adapter – client; i2c_driver + i2c_smbus_*; spi_driver + spi_transfer + spidev;
   khai báo thiết bị con trong Device Tree.
   Thực hành trên máy B (WSL2 Ubuntu 20.04, user cah8hc, GCC 9.4, QEMU 4.2.1, dtc 1.5.0), 2026-09-30:
   - Bước 1: xác nhận virt và raspi3 của QEMU 4.2.1 không có bus I2C nào gắn được thiết bị.
   - Bước 2: bật CONFIG_I2C_STUB=m (build lại 29,5 s), dùng i2cdetect/i2cget/i2cset của BusyBox.
   - Bước 3–4: driver ltemp (125 dòng) cho một cảm biến kiểu TMP102, tạo client qua new_device,
     cùng bốn cách sai (quên swap, trùng địa chỉ, địa chỉ trống, tmp102 từ chối thanh ghi cấu hình).
   - Bước 5: adapter giả i2csim (127 dòng) + buses.dts — client sinh ra từ node con trong DT.
   - Bước 6: controller SPI loopback spiloop (63 dòng) + client lspi (64 dòng) + spidev + spidev_test.
   Lệch so với dòng Bài 58 trong LO-TRINH.md: "machine raspi3b" không dùng được trên QEMU 4.2.1
   (tên raspi3b không tồn tại; khối I2C của raspi3 chỉ là vùng MMIO giữ chỗ, -device tmp105 báo
   No 'i2c-bus' bus found). Bài nói thẳng điều đó ở mục 6 và thay bằng adapter giả tự viết.
   SPI_LOOPBACK_TEST của kernel không dùng vì nó kiểm thử một controller thật có nối MOSI–MISO;
   "SPI loopback" ở đây là controller giả spiloop. Thử i2c-gpio trên gpio-sim: bus lên được nhưng
   không thiết bị nào ACK (13,3 s quét 16 địa chỉ, toàn "--") — ghi trong mục 6, không làm bước. */

Lesson.register({
  id: 'bai-58',
  title: 'Driver cho bus I2C và SPI',
  minutes: 65,
  practice: 'Thực hành 55 phút',
  level: 'Trung cấp',

  intro:
    'Ở Bài 57, mỗi chân GPIO mang đúng một bit. Một cảm biến nhiệt độ thật thì phải trả về 12 bit số đo, có ' +
    'thanh ghi cấu hình, ngưỡng cảnh báo, chế độ tiết kiệm điện — không ai kéo mười mấy dây cho một con chip giá ' +
    'vài nghìn đồng. Thay vào đó, hàng chục con chip dùng chung vài sợi dây gọi là <b>bus</b>: <b>I2C</b> với hai ' +
    'dây và địa chỉ 7 bit, <b>SPI</b> với bốn dây và tốc độ hàng chục MHz. Gần như mọi cảm biến, EEPROM, đồng hồ ' +
    'thời gian thực và chip quản lý nguồn trên một bo mạch nhúng nói chuyện qua một trong hai bus này.<br><br>' +
    'Tin tốt: bạn đã biết gần hết khung của bài này. Kernel chia việc thành ba vai — bộ điều khiển bus ' +
    '(<i>adapter</i>), thiết bị trên bus (<i>client</i>) và driver của thiết bị — đúng kiểu provider/consumer của ' +
    'Bài 57 và platform bus của Bài 54. Tin xấu: máy <code>virt</code> không có bus I2C hay SPI nào, và bạn sẽ tự ' +
    'kiểm chứng điều đó trước khi bắt đầu. Bài này vì thế dựng bus giả bằng <code>i2c-stub</code> của kernel và bằng ' +
    'hai driver bus nhỏ tự viết, rồi viết driver thiết bị trên đó — đúng phần code bạn sẽ viết khi cầm một bo mạch ' +
    'thật, vì driver thiết bị không bao giờ biết bus bên dưới là thật hay giả.',

  goals: [
    'Phân biệt ba vai adapter, client và driver của client trên bus I2C/SPI, và chỉ ra driver nào chạm vào thanh ghi phần cứng.',
    'Dùng <code>i2cdetect</code>, <code>i2cget</code>, <code>i2cset</code> trên bus giả <code>i2c-stub</code> để đọc/ghi thanh ghi, và đọc đúng các ký hiệu <code>--</code>, <code>UU</code> cùng lỗi <code>EBUSY</code>.',
    'Viết một <code>i2c_driver</code> đọc cảm biến kiểu TMP102 bằng <code>i2c_smbus_read_word_swapped()</code>, và chứng minh bằng số đo vì sao bản không swap trả về 62 thay vì 25 000.',
    'Khai báo thiết bị I2C và SPI làm node con trong Device Tree, giải thích <code>reg</code> của node con là địa chỉ 7 bit hoặc số chip select.',
    'Viết một <code>spi_driver</code> gửi <code>spi_transfer</code> full duplex và <code>spi_write_then_read()</code>, rồi nói chuyện với bus từ userspace qua <code>spidev</code> và <code>spidev_test</code>.',
    'Đọc một lỗi probe trên bus (<code>-ENXIO</code>, <code>-ENODEV</code>, <code>-16</code>, <code>unexpected config register value</code>) và biết nó sinh ra ở tầng nào.'
  ],

  blocks: [
    /* ============================================================
       1. BUS VÀ BA VAI
       ============================================================ */
    { t: 'h2', x: 'Vì sao cần bus, và ba vai trên một bus' },

    { t: 'p', x:
      'Một con chip cảm biến nhiệt độ như <b>TMP102</b> của Texas Instruments chứa bốn thanh ghi 16 bit: nhiệt độ, ' +
      'cấu hình, ngưỡng thấp, ngưỡng cao. Nối từng bit ra một chân GPIO thì cần 64 dây. Bus giải bài toán này bằng cách ' +
      'gửi dữ liệu <b>nối tiếp</b> — từng bit một theo nhịp đồng hồ — trên vài dây dùng chung, và thêm một cách để ' +
      'chọn chip nào đang được nói tới. I2C và SPI khác nhau chủ yếu ở cách chọn chip:' },

    { t: 'list', items: [
      '<b>I2C</b> giống một phòng họp chỉ có một micro. Mọi người cùng nghe, người chủ trì (<i>master</i>) gọi tên ' +
      '(<b>địa chỉ 7 bit</b>) ở đầu mỗi câu, chỉ người có tên đó trả lời, và người đó phải \"dạ\" (<b>ACK</b>) sau ' +
      'mỗi byte. Hai dây: <b>SDA</b> (dữ liệu) và <b>SCL</b> (đồng hồ).',
      '<b>SPI</b> giống một giáo viên có đường dây điện thoại riêng tới từng học sinh. Muốn nói với ai thì nhấc máy ' +
      'của người đó (kéo chân <b>CS</b> — <i>chip select</i> — của chip đó xuống thấp). Hai bên nói và nghe <b>cùng ' +
      'lúc</b> trên hai dây riêng <b>MOSI</b> và <b>MISO</b>, theo nhịp <b>SCLK</b>. Không ai \"dạ\" cả.'
    ] },

    { t: 'table',
      head: ['', 'I2C', 'SPI'],
      rows: [
        ['Số dây tín hiệu', '2 (SDA, SCL), dùng chung cho mọi chip', '3 dùng chung (SCLK, MOSI, MISO) + <b>1 CS riêng cho mỗi chip</b>'],
        ['Chọn chip bằng', 'Địa chỉ 7 bit trong byte đầu tiên (0x03–0x77 dùng được)', 'Chân CS xuống mức thấp'],
        ['Tốc độ điển hình', '100 kHz, 400 kHz, 1 MHz', 'Vài MHz tới vài chục MHz, tuỳ chip — ghi trong <code>spi-max-frequency</code>'],
        ['Chiều dữ liệu', 'Bán song công: mỗi lúc một bên nói', '<b>Song công</b> (full duplex): mỗi nhịp đồng hồ đẩy đi 1 bit và nhận về 1 bit'],
        ['Xác nhận', 'ACK sau mỗi byte — master biết ngay chip có mặt hay không', 'Không có. Master không thể biết đầu kia có ai'],
        ['Thường gặp', 'Cảm biến, EEPROM, RTC, chip quản lý nguồn (PMIC), chip cảm ứng', 'Flash NOR, ADC, màn hình, chip CAN, thẻ SD ở chế độ SPI']
      ] },

    { t: 'p', x:
      'Trong kernel, mỗi bus có <b>ba vai</b>, và phân vai này là điều quan trọng nhất của bài:' },

    { t: 'table',
      head: ['Vai', 'Là gì', 'Ai viết', 'Cấu trúc trong kernel'],
      rows: [
        ['<b>Adapter</b> (I2C) / <b>controller</b> (SPI)', 'Khối phần cứng trong SoC phát ra tín hiệu bus: bộ điều khiển I2C của BCM2837 trên Raspberry Pi, của i.MX…', 'Hãng làm SoC. Chỉ họ biết thanh ghi của khối đó', '<code>struct i2c_adapter</code> / <code>struct spi_controller</code>'],
        ['<b>Client</b> (I2C) / <b>device</b> (SPI)', 'Một con chip cụ thể ngồi trên bus: TMP102 ở địa chỉ 0x48, flash ở CS 0…', 'Không ai viết — <b>core</b> của bus tạo ra, thường từ Device Tree', '<code>struct i2c_client</code> / <code>struct spi_device</code>'],
        ['<b>Driver của client</b>', 'Code biết thanh ghi <i>của con chip</i>: đọc nhiệt độ, cấu hình ngưỡng…', '<b>Bạn</b>, hoặc hãng làm chip', '<code>struct i2c_driver</code> / <code>struct spi_driver</code>']
      ] },

    { t: 'p', x:
      'Driver của client <b>không bao giờ chạm vào thanh ghi của adapter</b>. Nó gọi một hàm như ' +
      '<code>i2c_smbus_read_word_data(client, 0x00)</code>, tức \"đọc thanh ghi 0x00 của con chip này\"; <b>i2c-core</b> ' +
      'tra xem client ngồi trên adapter nào rồi gọi hàm truyền của adapter đó. Nhờ vậy cùng một file ' +
      '<code>drivers/hwmon/tmp102.c</code> chạy được trên Raspberry Pi, trên i.MX, trên một dongle USB-I2C, và — bạn sẽ ' +
      'thấy ở bước 2 — trên một bus hoàn toàn giả chỉ tồn tại trong RAM.' },

    { t: 'fig', cap: 'Ba tầng của một bus trong kernel. Driver của client (tầng trên) chỉ nói với core; core chuyển yêu cầu xuống driver adapter/controller (tầng dưới), nơi duy nhất biết thanh ghi phần cứng. Bài này viết cả hai tầng: ltemp và lspi ở trên, i2csim và spiloop ở dưới — tầng dưới giả, tầng trên y như thật.',
      svg:
        '<svg viewBox="0 0 720 360" width="720" role="img" aria-label="Ba tầng bus I2C và SPI: driver client, core, driver adapter, phần cứng">' +
        '<text class="d-t" x="185" y="22" text-anchor="middle">I2C</text>' +
        '<text class="d-t" x="545" y="22" text-anchor="middle">SPI</text>' +
        '<rect class="d-box-a" x="20" y="34" width="330" height="70" rx="8"/>' +
        '<text class="d-t" x="185" y="56" text-anchor="middle">driver của client: struct i2c_driver</text>' +
        '<text class="d-tm" x="185" y="76" text-anchor="middle">ltemp.c · tmp102.c · lm75.c</text>' +
        '<text class="d-ts" x="185" y="94" text-anchor="middle">biết thanh ghi của con chip</text>' +
        '<rect class="d-box-a" x="370" y="34" width="330" height="70" rx="8"/>' +
        '<text class="d-t" x="535" y="56" text-anchor="middle">driver của device: struct spi_driver</text>' +
        '<text class="d-tm" x="535" y="76" text-anchor="middle">lspi.c · spidev.c · m25p80</text>' +
        '<text class="d-ts" x="535" y="94" text-anchor="middle">biết lệnh của con chip</text>' +
        '<path class="d-line" d="M185 104 V126"/><path class="d-arrow" d="M185 132 l-5 -8 h10 z"/>' +
        '<path class="d-line" d="M535 104 V126"/><path class="d-arrow" d="M535 132 l-5 -8 h10 z"/>' +
        '<text class="d-tm" x="195" y="122">i2c_smbus_read_word_data()</text>' +
        '<text class="d-tm" x="545" y="122">spi_sync()</text>' +
        '<rect class="d-box-p" x="20" y="134" width="330" height="62" rx="8"/>' +
        '<text class="d-t" x="185" y="158" text-anchor="middle">i2c-core</text>' +
        '<text class="d-ts" x="185" y="178" text-anchor="middle">client → adapter nào; tạo client từ DT; /dev/i2c-N</text>' +
        '<rect class="d-box-p" x="370" y="134" width="330" height="62" rx="8"/>' +
        '<text class="d-t" x="535" y="158" text-anchor="middle">spi core</text>' +
        '<text class="d-ts" x="535" y="178" text-anchor="middle">xếp hàng message; bật/tắt CS; tạo device từ DT</text>' +
        '<path class="d-line" d="M185 196 V218"/><path class="d-arrow" d="M185 224 l-5 -8 h10 z"/>' +
        '<path class="d-line" d="M535 196 V218"/><path class="d-arrow" d="M535 224 l-5 -8 h10 z"/>' +
        '<text class="d-tm" x="195" y="214">algo-&gt;smbus_xfer / xfer</text>' +
        '<text class="d-tm" x="545" y="214">transfer_one</text>' +
        '<rect class="d-box" x="20" y="226" width="330" height="62" rx="8"/>' +
        '<text class="d-t" x="185" y="250" text-anchor="middle">driver adapter: struct i2c_adapter</text>' +
        '<text class="d-tm" x="185" y="270" text-anchor="middle">i2c-bcm2835 · i2c-imx · i2c-stub · i2csim</text>' +
        '<rect class="d-box" x="370" y="226" width="330" height="62" rx="8"/>' +
        '<text class="d-t" x="535" y="250" text-anchor="middle">driver controller: struct spi_controller</text>' +
        '<text class="d-tm" x="535" y="270" text-anchor="middle">spi-bcm2835 · spi-imx · spiloop</text>' +
        '<path class="d-line" d="M185 288 V310"/><path class="d-arrow" d="M185 316 l-5 -8 h10 z"/>' +
        '<path class="d-line" d="M535 288 V310"/><path class="d-arrow" d="M535 316 l-5 -8 h10 z"/>' +
        '<rect class="d-box-w" x="20" y="318" width="680" height="34" rx="8"/>' +
        '<text class="d-ts" x="360" y="340" text-anchor="middle">thanh ghi của khối I2C/SPI trong SoC — hoặc, trong bài này, một mảng trong RAM</text>' +
        '</svg>' },

    { t: 'cal', kind: 'why', title: 'Vì sao tách adapter khỏi driver của chip',
      x: 'Cùng một con TMP102 có thể được hàn lên hàng trăm bo mạch dùng hàng chục SoC khác nhau. Nếu driver của nó phải ' +
         'tự bật tắt thanh ghi I2C của từng SoC, sẽ có hàng chục bản <code>tmp102.c</code>. Tách hai tầng thì có đúng ' +
         'một bản cho mỗi chip và một bản cho mỗi SoC — nhân hai số với nhau thành cộng. Đây là cùng một ý với ' +
         'provider/consumer của gpiolib ở Bài 57, và là lý do vì sao ở bước 5 bạn thay adapter giả bằng một adapter ' +
         'giả khác mà không sửa một dòng nào của driver cảm biến.' },

    { t: 'terms', items: [
      ['SDA / SCL', 'Serial Data / Serial Clock', 'Hai dây của I2C. Cả hai là <b>open-drain</b>: chip chỉ kéo được xuống 0, còn mức 1 là nhờ điện trở kéo lên'],
      ['Địa chỉ 7 bit', 'I2C address', 'Tên của chip trên bus I2C, thường cố định trong chip hoặc chọn bằng vài chân nối đất/nguồn. TMP102: 0x48–0x4B'],
      ['ACK / NACK', 'Acknowledge', 'Ở nhịp thứ 9 sau mỗi byte, bên nhận kéo SDA xuống 0 = ACK. Không ai kéo = NACK'],
      ['SMBus', 'System Management Bus', 'Một tập con của I2C do Intel định nghĩa, chỉ gồm vài kiểu giao dịch cố định (đọc byte, đọc word…). Phần lớn cảm biến dùng đúng các kiểu này'],
      ['SCLK / MOSI / MISO', 'SPI clock / Master Out Slave In / Master In Slave Out', 'Ba dây dùng chung của SPI. Tài liệu mới gọi là SDO/SDI, controller/target — cùng một thứ'],
      ['CS', 'Chip Select', 'Một dây riêng từ controller tới mỗi chip SPI. Mức thấp = chip đó được chọn'],
      ['Full duplex', 'Song công', 'Gửi và nhận cùng lúc: mỗi nhịp SCLK đẩy 1 bit ra MOSI và kéo 1 bit vào từ MISO']
    ] },

    /* ============================================================
       2. MỘT GIAO DỊCH I2C
       ============================================================ */
    { t: 'h2', x: 'Một giao dịch I2C, từng byte' },

    { t: 'p', x:
      'Mọi giao dịch I2C bắt đầu bằng điều kiện <b>START</b> (SDA xuống trong lúc SCL đang cao) và kết thúc bằng ' +
      '<b>STOP</b> (SDA lên trong lúc SCL cao). Byte đầu tiên luôn là <b>địa chỉ 7 bit dịch trái một bit, cộng bit ' +
      'R/W</b>: với địa chỉ 0x48, byte đó là <code>0x90</code> khi ghi và <code>0x91</code> khi đọc. Mọi chip trên bus ' +
      'đều nghe byte này; chỉ chip mang địa chỉ 0x48 kéo SDA xuống ở nhịp thứ 9 để trả lời ACK.' },

    { t: 'p', x:
      'Vì dây là open-drain, \"không ai trả lời\" có nghĩa vật lý rất rõ: không ai kéo SDA xuống, điện trở kéo lên giữ ' +
      'nó ở mức 1, và adapter đọc được NACK. Adapter báo lên bằng mã <b><code>-ENXIO</code></b> — đây là cách ' +
      '<code>i2cdetect</code> dò bus: gửi byte địa chỉ tới từng địa chỉ và xem chỗ nào có ACK. SPI không có cơ chế nào ' +
      'tương đương, nên không có công cụ <code>spidetect</code>.' },

    { t: 'p', x:
      'Đọc một thanh ghi 16 bit của TMP102 là một giao dịch SMBus kiểu <b>read word data</b>: ghi số hiệu thanh ghi, ' +
      'rồi <b>repeated START</b> (START lần nữa mà không STOP) và đọc hai byte. Hình dưới là đúng giao dịch mà driver ' +
      'của bạn ở bước 3 sinh ra khi đọc nhiệt độ 25 °C:' },

    { t: 'fig', cap: 'Giao dịch read word data tới thanh ghi 0x00 của chip 0x48. Chú giải dưới chuỗi byte cho biết ô nào do adapter gửi, ô nào do chip gửi. TMP102 gửi byte cao trước (0x19 rồi 0x00), nhưng SMBus quy ước byte thấp đến trước — nên i2c_smbus_read_word_data() ghép thành 0x0019, và phải đảo lại thành 0x1900.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Chuỗi byte của một giao dịch SMBus read word data và cách ghép byte">' +
        '<rect class="d-box-p" x="10" y="30" width="36" height="40" rx="4"/><text class="d-t" x="28" y="55" text-anchor="middle">S</text>' +
        '<rect class="d-box-p" x="50" y="30" width="96" height="40" rx="4"/><text class="d-tm" x="98" y="48" text-anchor="middle">0x48 + W</text><text class="d-tm" x="98" y="63" text-anchor="middle">= 0x90</text>' +
        '<rect class="d-box-w" x="150" y="30" width="30" height="40" rx="4"/><text class="d-t" x="165" y="55" text-anchor="middle">A</text>' +
        '<rect class="d-box-p" x="184" y="30" width="70" height="40" rx="4"/><text class="d-tm" x="219" y="48" text-anchor="middle">0x00</text><text class="d-ts" x="219" y="63" text-anchor="middle">thanh ghi</text>' +
        '<rect class="d-box-w" x="258" y="30" width="30" height="40" rx="4"/><text class="d-t" x="273" y="55" text-anchor="middle">A</text>' +
        '<rect class="d-box-p" x="292" y="30" width="36" height="40" rx="4"/><text class="d-t" x="310" y="55" text-anchor="middle">Sr</text>' +
        '<rect class="d-box-p" x="332" y="30" width="96" height="40" rx="4"/><text class="d-tm" x="380" y="48" text-anchor="middle">0x48 + R</text><text class="d-tm" x="380" y="63" text-anchor="middle">= 0x91</text>' +
        '<rect class="d-box-w" x="432" y="30" width="30" height="40" rx="4"/><text class="d-t" x="447" y="55" text-anchor="middle">A</text>' +
        '<rect class="d-box-w" x="466" y="30" width="60" height="40" rx="4"/><text class="d-tm" x="496" y="48" text-anchor="middle">0x19</text><text class="d-ts" x="496" y="63" text-anchor="middle">byte 1</text>' +
        '<rect class="d-box-p" x="530" y="30" width="30" height="40" rx="4"/><text class="d-t" x="545" y="55" text-anchor="middle">A</text>' +
        '<rect class="d-box-w" x="564" y="30" width="60" height="40" rx="4"/><text class="d-tm" x="594" y="48" text-anchor="middle">0x00</text><text class="d-ts" x="594" y="63" text-anchor="middle">byte 2</text>' +
        '<rect class="d-box-p" x="628" y="30" width="36" height="40" rx="4"/><text class="d-t" x="646" y="55" text-anchor="middle">N</text>' +
        '<rect class="d-box-p" x="668" y="30" width="42" height="40" rx="4"/><text class="d-t" x="689" y="55" text-anchor="middle">P</text>' +
        '<text class="d-ts" x="10" y="92">S = START · Sr = repeated START · A = ACK · N = NACK (master báo \"đủ rồi\") · P = STOP</text>' +
        '<rect class="d-box-p" x="10" y="102" width="14" height="12" rx="2"/><text class="d-ts" x="30" y="112">master (adapter) gửi</text>' +
        '<rect class="d-box-w" x="170" y="102" width="14" height="12" rx="2"/><text class="d-ts" x="190" y="112">chip 0x48 gửi</text>' +
        '<rect class="d-box" x="40" y="126" width="310" height="52" rx="8"/>' +
        '<text class="d-tm" x="195" y="148" text-anchor="middle">i2c_smbus_read_word_data()</text>' +
        '<text class="d-ts" x="195" y="168" text-anchor="middle">byte 2 &lt;&lt; 8 | byte 1 = 0x0019  →  sai: 62 mdeg</text>' +
        '<rect class="d-box-g" x="370" y="126" width="310" height="52" rx="8"/>' +
        '<text class="d-tm" x="525" y="148" text-anchor="middle">i2c_smbus_read_word_swapped()</text>' +
        '<text class="d-ts" x="525" y="168" text-anchor="middle">byte 1 &lt;&lt; 8 | byte 2 = 0x1900  →  25 000 mdeg</text>' +
        '<text class="d-ts" x="360" y="206" text-anchor="middle">0x1900 &gt;&gt; 4 = 0x190 = 400 bước × 0,0625 °C = 25,0 °C</text>' +
        '<text class="d-ts" x="360" y="226" text-anchor="middle">(12 bit số đo nằm ở đầu trái của 16 bit; 4 bit cuối luôn là 0)</text>' +
        '</svg>' },

    { t: 'p', x:
      'SMBus định nghĩa một số kiểu giao dịch cố định, và i2c-core cho mỗi kiểu một hàm. Đây là những hàm driver cảm ' +
      'biến dùng nhiều nhất; tất cả trả về <b>số âm</b> nếu lỗi, giá trị đọc được (≥ 0) nếu thành công:' },

    { t: 'table',
      head: ['Hàm', 'Giao dịch trên dây', 'Dùng khi'],
      rows: [
        ['<code>i2c_smbus_read_byte_data(c, reg)</code>', 'S addr+W A reg A Sr addr+R A <i>data</i> N P', 'Thanh ghi 8 bit'],
        ['<code>i2c_smbus_write_byte_data(c, reg, v)</code>', 'S addr+W A reg A v A P', 'Ghi thanh ghi 8 bit'],
        ['<code>i2c_smbus_read_word_data(c, reg)</code>', 'Như hình trên, <b>byte thấp trước</b>', 'Chip gửi byte thấp trước (hiếm với cảm biến)'],
        ['<code>i2c_smbus_read_word_swapped(c, reg)</code>', 'Như trên rồi đảo hai byte (<code>include/linux/i2c.h:162</code>)', 'Chip gửi <b>byte cao trước</b>: TMP102, LM75 và phần lớn cảm biến'],
        ['<code>i2c_smbus_read_i2c_block_data(c, reg, n, buf)</code>', 'S addr+W A reg A Sr addr+R A <i>n byte</i> N P', 'Đọc nhiều thanh ghi liền nhau'],
        ['<code>i2c_transfer(adap, msgs, n)</code>', 'Tuỳ ý: bạn tự dựng từng <code>struct i2c_msg</code>', 'Chip không theo SMBus (EEPROM lớn, chip cảm ứng)']
      ] },

    { t: 'cal', kind: 'warn', title: 'Byte order là lỗi driver I2C phổ biến nhất',
      x: 'Datasheet của TMP102 nói \"byte thứ nhất là MSB\". SMBus nói \"byte thứ nhất là LSB\". Hai quy ước ngược nhau, và ' +
         'không có trình biên dịch nào bắt được. Bước 4 cố tình dùng <code>i2c_smbus_read_word_data</code> thay cho bản ' +
         '<code>_swapped</code>: driver build sạch, probe thành công, và báo nhiệt độ <b>62 mili-độ</b> thay vì 25 000 ' +
         '— một con số đủ hợp lý để lọt qua nếu bạn không biết trước đáp án. Khi viết driver cho chip mới, luôn đặt một ' +
         'giá trị đã biết vào thanh ghi và đọc thử trước khi tin kết quả.' },

    { t: 'p', x:
      'Khi một giao dịch thất bại, adapter trả về một mã lỗi có nghĩa riêng trong thế giới I2C. Danh sách đầy đủ ở ' +
      '<code>Documentation/i2c/fault-codes.rst</code> (135 dòng) trong cây kernel của bạn; đây là những mã bài này gặp:' },

    { t: 'table',
      head: ['Mã', 'Ai trả', 'Nghĩa'],
      rows: [
        ['<code>-ENXIO</code>', 'Adapter', 'Byte địa chỉ không được ACK — thường là không có chip nào ở địa chỉ đó'],
        ['<code>-ENODEV</code>', '<code>probe()</code>', 'Có chip trả lời nhưng không phải chip driver mong đợi. <code>i2c-stub</code> cũng trả mã này cho địa chỉ trống'],
        ['<code>-EOPNOTSUPP</code>', 'Adapter', 'Adapter không làm được kiểu giao dịch được yêu cầu'],
        ['<code>-ETIMEDOUT</code>', 'Adapter', 'Giao dịch quá lâu, ví dụ chip giữ SCL (clock stretching) quá giới hạn'],
        ['<code>-EBUSY</code> (-16)', 'i2c-core, i2c-dev', 'Địa chỉ đã có client khác, hoặc userspace đụng vào địa chỉ đang có driver giữ']
      ] },

    { t: 'cal', kind: 'info', title: 'Driver core im lặng với -ENODEV và -ENXIO',
      x: '<code>drivers/base/dd.c:649–650</code> liệt kê hai mã này như \"không phải lỗi\": một <code>probe()</code> trả ' +
         '<code>-ENODEV</code> hoặc <code>-ENXIO</code> <b>không</b> sinh dòng <code>probe with driver … failed with ' +
         'error</code> như bạn đã thấy ở Bài 54 với <code>-22</code>. Ý đồ: \"chip không có mặt\" là chuyện bình thường ' +
         'trên một bo mạch có linh kiện tuỳ chọn. Hệ quả: nếu driver của bạn không tự in gì, một cảm biến vắng mặt sẽ ' +
         'biến mất không để lại dấu vết. Driver ở bước 3 dùng <code>dev_err_probe()</code> để luôn có một dòng log.' },

    /* ============================================================
       3. I2C_DRIVER
       ============================================================ */
    { t: 'h2', x: 'i2c_driver và struct i2c_client' },

    { t: 'p', x:
      'Một driver I2C có hình dạng gần như y hệt platform driver của Bài 54: một bảng <code>of_match_table</code>, một ' +
      'hàm <code>probe()</code> gọi một lần cho mỗi thiết bị khớp, một hàm <code>remove()</code>, và một macro đăng ký. ' +
      'Chỉ có kiểu tham số đổi: <code>probe()</code> nhận một <code>struct i2c_client *</code> thay vì ' +
      '<code>struct platform_device *</code>. Đây là phần trích <code>include/linux/i2c.h</code> dòng 270–300 và 331–350 ' +
      'của kernel bạn đang dùng, bỏ các trường không dùng tới:' },

    { t: 'table',
      head: ['Trường', 'Ý nghĩa'],
      rows: [
        ['<code>i2c_driver.probe</code>', '<code>int (*)(struct i2c_client *)</code> — <b>một</b> tham số trên 6.18. Sách và blog trước 6.3 viết hai tham số (thêm <code>const struct i2c_device_id *</code>); bản đó giờ là lỗi biên dịch, bước 4 cho bạn thấy'],
        ['<code>i2c_driver.remove</code>', '<code>void (*)(struct i2c_client *)</code> — trả <code>void</code>, giống platform driver 6.18'],
        ['<code>i2c_driver.id_table</code>', 'Bảng tên thiết bị kiểu cũ (<code>{ \"ltemp\" }</code>) — khớp khi client được tạo bằng tên, không có DT'],
        ['<code>driver.of_match_table</code>', 'Bảng <code>compatible</code> — khớp khi client sinh ra từ node DT (bước 5)'],
        ['<code>driver.dev_groups</code>', 'Thuộc tính sysfs tự tạo cho mỗi client đã bind — dùng như Bài 54'],
        ['<code>i2c_client.addr</code>', 'Địa chỉ 7 bit, lưu ở 7 bit thấp. Với sensor ở 0x48, <code>addr</code> = <code>0x48</code>, <b>không phải</b> 0x90'],
        ['<code>i2c_client.adapter</code>', 'Con trỏ tới adapter mà client ngồi trên. Driver chỉ dùng nó để hỏi khả năng (<code>i2c_check_functionality</code>) hoặc in tên'],
        ['<code>i2c_client.name</code>', 'Tên thiết bị: <code>\"ltemp\"</code> khi tạo bằng tay, phần sau dấu phẩy của <code>compatible</code> khi từ DT'],
        ['<code>i2c_client.dev</code>', '<code>struct device</code> nhúng bên trong — dùng cho <code>dev_info</code>, <code>devm_*</code>, <code>dev_get_drvdata</code>']
      ] },

    { t: 'p', x:
      'Tên thiết bị trong sysfs có dạng <b><code>BUS-ADDR</code></b>, ví dụ <code>0-0048</code> là client ở địa chỉ ' +
      '0x48 trên adapter số 0 (<code>drivers/i2c/i2c-core-base.c:893</code>, định dạng <code>\"%d-%04x\"</code>). Bạn ' +
      'sẽ gặp tên này suốt bài.' },

    { t: 'p', x:
      'Client có thể ra đời bằng ba cách, và driver không cần biết cách nào:' },

    { t: 'table',
      head: ['Cách', 'Khi nào', 'Ai gọi'],
      rows: [
        ['<b>Node con trong Device Tree</b>', 'Bo mạch thật. Đây là cách chuẩn trên ARM', 'i2c-core, lúc adapter đăng ký (<code>of_i2c_register_devices</code>, <code>i2c-core-base.c:1600</code>)'],
        ['<b><code>echo tên địa_chỉ &gt; …/new_device</code></b>', 'Thử nghiệm, gắn thêm chip lúc chạy', 'Bạn, từ shell — bước 3'],
        ['<b><code>i2c_new_client_device()</code></b>', 'Driver này tạo client cho chip phụ (ví dụ một PMIC có vài địa chỉ)', 'Code C trong kernel']
      ] },

    { t: 'cal', kind: 'tip', title: 'Muốn biết một hàm là EXPORT_SYMBOL hay _GPL — tra, đừng nhớ',
      x: 'Như Bài 50: <code>grep -w i2c_smbus_read_word_data ~/bai38/linux-6.18.45/Module.symvers</code>. Kết quả trên ' +
         'kernel này: <code>i2c_register_driver</code>, <code>i2c_smbus_read_word_data</code>, <code>i2c_add_adapter</code> ' +
         'là <code>EXPORT_SYMBOL</code>; còn <code>devm_i2c_add_adapter</code>, <code>i2c_new_client_device</code> và ' +
         '<b>toàn bộ</b> API của SPI (<code>spi_sync</code>, <code>__spi_register_driver</code>…) là ' +
         '<code>EXPORT_SYMBOL_GPL</code>. Một driver SPI không khai <code>MODULE_LICENSE(\"GPL\")</code> sẽ không link được.' },

    /* ============================================================
       4. THIẾT BỊ CON TRONG DEVICE TREE
       ============================================================ */
    { t: 'h2', x: 'Khai báo thiết bị con trong Device Tree' },

    { t: 'p', x:
      'Ở Bài 43 bạn đã học rằng <code>reg</code> của một node được đọc theo <code>#address-cells</code> và ' +
      '<code>#size-cells</code> của <b>node cha</b>. Bus I2C và SPI dùng đúng quy tắc đó để khai thiết bị con: node ' +
      'bus đặt <code>#address-cells = &lt;1&gt;</code> và <code>#size-cells = &lt;0&gt;</code>, tức \"mỗi con có một ' +
      'số địa chỉ, không có kích thước\". Con số đó mang nghĩa khác nhau tuỳ bus:' },

    { t: 'code', where: 'file', nocopy: true, name: 'hình dạng chung — rút gọn từ ~/bai58/buses.dts ở bước 5–6', code:
      'i2c-sim {                          /* the adapter: a platform device */\n' +
      '\tcompatible = "learn,i2c-sim";\n' +
      '\t#address-cells = <1>;\n' +
      '\t#size-cells = <0>;\n' +
      '\n' +
      '\tsensor@48 {                     /* a client: 7-bit address 0x48 */\n' +
      '\t\tcompatible = "learn,ltemp";\n' +
      '\t\treg = <0x48>;\n' +
      '\t};\n' +
      '};\n' +
      '\n' +
      'spi-loop {                         /* the controller: a platform device */\n' +
      '\tcompatible = "learn,spi-loopback";\n' +
      '\t#address-cells = <1>;\n' +
      '\t#size-cells = <0>;\n' +
      '\n' +
      '\tclient@0 {                      /* a device on chip select 0 */\n' +
      '\t\tcompatible = "learn,lspi";\n' +
      '\t\treg = <0>;\n' +
      '\t\tspi-max-frequency = <1000000>;\n' +
      '\t};\n' +
      '};' },

    { t: 'table',
      head: ['', 'Node con I2C', 'Node con SPI'],
      rows: [
        ['<code>reg</code>', '<b>Địa chỉ 7 bit</b> của chip trên bus', '<b>Số chip select</b> — chân CS thứ mấy của controller'],
        ['Thuộc tính bắt buộc khác', 'Không', '<code>spi-max-frequency</code> — tốc độ tối đa chip chịu được, lấy từ datasheet'],
        ['Thuộc tính tuỳ chọn hay gặp', '<code>interrupts</code>, <code>vcc-supply</code>, <code>label</code>', '<code>spi-cpol</code>, <code>spi-cpha</code> (chế độ SPI), <code>spi-cs-high</code>'],
        ['Tên trong sysfs', '<code>0-0048</code>', '<code>spi0.0</code> (<code>spi.c:608</code>: tên controller + <code>.</code> + CS)'],
        ['Thiếu <code>reg</code>', '<code>of_i2c: invalid reg on /…/sensor@48</code> — bước 5 cho bạn thấy', '<code>… has no valid \'reg\' property</code> (<code>spi.c:2431</code>)']
      ] },

    { t: 'p', x:
      'Điều quan trọng nhất: node con <b>không</b> trở thành platform device. Node bus là platform device và được ' +
      'platform driver của adapter/controller nắm (như <code>tsensor</code> ở Bài 54). Khi driver đó đăng ký adapter với ' +
      'i2c-core, <b>i2c-core</b> mới đi qua các node con và tạo <code>i2c_client</code> cho từng node. Không có driver ' +
      'adapter thì không có client nào, dù cây có mười node con — bạn sẽ thấy <code>/sys/bus/i2c/devices</code> rỗng ' +
      'trước <code>insmod</code> ở bước 5.' },

    { t: 'fig', cap: 'Hai bước biến một cây DT thành thiết bị trên bus. Bước 1 (lúc boot): node i2c-sim thành platform device. Bước 2 (lúc insmod i2csim.ko): adapter đăng ký, i2c-core đọc ba node con và tạo ba i2c_client, dù chỉ hai địa chỉ có chip trả lời. Client chỉ bị loại ở probe(), không phải lúc tạo.',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Từ node DT tới platform device, adapter và ba i2c_client">' +
        '<rect class="d-box" x="20" y="20" width="200" height="200" rx="8"/>' +
        '<text class="d-t" x="120" y="44" text-anchor="middle">buses.dtb</text>' +
        '<text class="d-tm" x="36" y="72">i2c-sim {</text>' +
        '<text class="d-tm" x="52" y="92">compatible = …</text>' +
        '<text class="d-tm" x="52" y="118">sensor@48</text>' +
        '<text class="d-tm" x="52" y="140">sensor@49</text>' +
        '<text class="d-tm" x="52" y="162">sensor@4a</text>' +
        '<text class="d-tm" x="36" y="186">}</text>' +
        '<path class="d-line" d="M220 80 H270"/><path class="d-arrow" d="M276 80 l-8 -5 v10 z"/>' +
        '<text class="d-ts" x="248" y="68" text-anchor="middle">boot</text>' +
        '<rect class="d-box-p" x="278" y="50" width="190" height="60" rx="8"/>' +
        '<text class="d-t" x="373" y="74" text-anchor="middle">platform device</text>' +
        '<text class="d-tm" x="373" y="94" text-anchor="middle">i2c-sim</text>' +
        '<path class="d-line" d="M373 110 V142"/><path class="d-arrow" d="M373 148 l-5 -8 h10 z"/>' +
        '<text class="d-ts" x="384" y="132">insmod i2csim.ko → probe()</text>' +
        '<rect class="d-box-p" x="278" y="150" width="190" height="60" rx="8"/>' +
        '<text class="d-t" x="373" y="174" text-anchor="middle">i2c_adapter</text>' +
        '<text class="d-tm" x="373" y="194" text-anchor="middle">i2c-0 \"learn i2c-sim\"</text>' +
        '<path class="d-line" d="M468 180 H510"/><path class="d-arrow" d="M516 180 l-8 -5 v10 z"/>' +
        '<text class="d-ts" x="492" y="168" text-anchor="middle">i2c-core</text>' +
        '<rect class="d-box-a" x="518" y="30" width="182" height="54" rx="8"/>' +
        '<text class="d-tm" x="609" y="52" text-anchor="middle">0-0048</text>' +
        '<text class="d-ts" x="609" y="70" text-anchor="middle">ltemp: probe OK</text>' +
        '<rect class="d-box-w" x="518" y="96" width="182" height="54" rx="8"/>' +
        '<text class="d-tm" x="609" y="118" text-anchor="middle">0-0049</text>' +
        '<text class="d-ts" x="609" y="136" text-anchor="middle">ltemp: -ENXIO, không ai ACK</text>' +
        '<rect class="d-box-a" x="518" y="162" width="182" height="54" rx="8"/>' +
        '<text class="d-tm" x="609" y="184" text-anchor="middle">0-004a</text>' +
        '<text class="d-ts" x="609" y="202" text-anchor="middle">tmp102: probe OK</text>' +
        '<path class="d-line" d="M510 180 V57 H516"/><path class="d-line" d="M510 180 V123 H516"/>' +
        '<rect class="d-box-g" x="20" y="240" width="680" height="44" rx="8"/>' +
        '<text class="d-ts" x="360" y="258" text-anchor="middle">Driver của client không biết client sinh ra từ DT hay từ new_device:</text>' +
        '<text class="d-ts" x="360" y="276" text-anchor="middle">ltemp.ko ở bước 3 (new_device, i2c-stub) và bước 5 (DT, i2csim) là cùng một file, không sửa dòng nào</text>' +
        '</svg>' },

    { t: 'cal', kind: 'why', title: 'Vì sao i2c-core, không phải platform bus, tạo thiết bị con',
      x: 'Platform bus (Bài 54) chỉ biết \"thiết bị ở địa chỉ MMIO này\". Một TMP102 không có địa chỉ MMIO nào — CPU không ' +
         'thể <code>readl()</code> nó. Cách duy nhất để nói với nó là qua adapter cha. Vì thế chỉ i2c-core, khi đã có ' +
         'adapter trong tay, mới tạo được một thiết bị dùng được. Kernel phản ánh đúng cấu trúc vật lý: chip ngồi trên ' +
         'dây của adapter, nên nó là con của adapter trong cây thiết bị (<code>readlink</code> ở bước 5 cho thấy ' +
         '<code>of_node</code> của <code>0-0048</code> trỏ vào <code>i2c-sim/sensor@48</code>).' },

    /* ============================================================
       5. SPI
       ============================================================ */
    { t: 'h2', x: 'spi_driver, spi_transfer và spi_message' },

    { t: 'p', x:
      'SPI đơn giản hơn I2C về điện nhưng khác một điểm căn bản về tư duy: <b>mọi giao dịch là trao đổi</b>. Mỗi nhịp ' +
      'SCLK, controller đẩy một bit ra MOSI <i>và</i> kéo một bit vào từ MISO — hình dung hai thanh ghi dịch nối thành ' +
      'vòng tròn. Muốn \"chỉ ghi\" thì bỏ qua những gì nhận về; muốn \"chỉ đọc\" thì vẫn phải đẩy ra thứ gì đó (thường ' +
      'là 0xFF hoặc 0x00) để có nhịp đồng hồ.' },

    { t: 'p', x:
      'Kernel mô tả một lần trao đổi bằng <b><code>struct spi_transfer</code></b> (<code>include/linux/spi/spi.h:1066</code>): ' +
      'một bộ đệm gửi <code>tx_buf</code>, một bộ đệm nhận <code>rx_buf</code> và độ dài <code>len</code> chung cho cả ' +
      'hai. Nhiều transfer ghép thành một <b><code>struct spi_message</code></b>; CS giữ ở mức thấp suốt cả message. ' +
      'Driver gửi message bằng <code>spi_sync()</code> (chờ xong mới trả về, ngủ được) hoặc <code>spi_async()</code>.' },

    { t: 'table',
      head: ['Hàm / trường', 'Làm gì'],
      rows: [
        ['<code>spi_transfer.tx_buf</code> / <code>rx_buf</code>', 'Một trong hai được phép <code>NULL</code>: không gửi (controller đẩy mức nghỉ) hoặc không lưu byte nhận'],
        ['<code>spi_transfer.speed_hz</code>, <code>bits_per_word</code>', '0 = lấy mặc định của thiết bị (<code>spi-max-frequency</code>, 8 bit)'],
        ['<code>spi_sync_transfer(spi, xfers, n)</code>', 'Gói <i>n</i> transfer vào một message rồi <code>spi_sync</code> — cách ngắn nhất'],
        ['<code>spi_write_then_read(spi, tx, ntx, rx, nrx)</code>', 'Hai transfer trong một message: gửi <i>ntx</i> byte, rồi nhận <i>nrx</i> byte. Kiểu \"gửi lệnh rồi đọc trả lời\" của hầu hết chip SPI'],
        ['<code>spi_w8r8(spi, cmd)</code>, <code>spi_w8r16(spi, cmd)</code>', 'Gửi 1 byte lệnh, đọc 1 hoặc 2 byte — bọc quanh <code>spi_write_then_read</code> (<code>spi.h:1531</code>, <code>:1556</code>)'],
        ['<code>spi_device.mode</code>', 'Chế độ SPI 0–3 (<code>SPI_CPOL</code> | <code>SPI_CPHA</code>) và các cờ như <code>SPI_CS_HIGH</code>, lấy từ DT']
      ] },

    { t: 'p', x:
      '<b>Chế độ SPI</b> là hai bit mà datasheet mọi chip SPI đều ghi: <b>CPOL</b> (đồng hồ nghỉ ở mức thấp hay cao) và ' +
      '<b>CPHA</b> (lấy mẫu ở sườn thứ nhất hay thứ hai). Bốn tổ hợp là mode 0–3. Controller và chip phải cùng mode, ' +
      'nếu không mọi bit lệch nửa nhịp và bạn nhận về rác — nhưng không có lỗi nào được báo, vì SPI không có ACK. Trong ' +
      'DT, mode 1 viết là <code>spi-cpha;</code>, mode 2 là <code>spi-cpol;</code>, mode 3 là cả hai.' },

    { t: 'p', x:
      'Phía controller, driver điền một <code>struct spi_controller</code>, trong đó hàm quan trọng nhất là ' +
      '<b><code>transfer_one()</code></b> (<code>spi.h:741</code>): spi core gọi nó cho từng <code>spi_transfer</code>, ' +
      'đã bật CS sẵn. Trả về 0 nghĩa là đã xong. Controller thật ghi <code>tx_buf</code> vào FIFO phần cứng và đọc ' +
      'FIFO nhận vào <code>rx_buf</code>; controller giả ở bước 6 chỉ <code>memcpy</code> từ cái này sang cái kia — ' +
      'một sợi dây nối MOSI với MISO.' },

    { t: 'cal', kind: 'info', title: 'spi_driver không có con trỏ adapter, và id_table vẫn quan trọng',
      x: '<code>struct spi_driver</code> (<code>spi.h:347</code>) có đúng năm trường: <code>id_table</code>, ' +
         '<code>probe</code>, <code>remove</code>, <code>shutdown</code>, <code>driver</code>. Khi khớp thiết bị, ' +
         '<code>spi_match_device()</code> (<code>drivers/spi/spi.c:370</code>) thử theo thứ tự: ' +
         '<code>driver_override</code> → <code>of_match_table</code> → ACPI → <code>id_table</code> (so với ' +
         '<code>modalias</code>). Lúc đăng ký, <code>__spi_register_driver</code> còn đi qua từng <code>compatible</code>: ' +
         'nếu phần sau dấu phẩy (<code>lspi</code> trong <code>learn,lspi</code>) không có trong <code>id_table</code>, ' +
         'nó in <code>SPI driver … has no spi_device_id for …</code> (<code>spi.c:511</code>). Lý do: ' +
         '<code>modalias</code> của thiết bị SPI là <code>spi:&lt;tên&gt;</code> chứ không phải <code>of:…</code> — bước 6 ' +
         'cho thấy <code>spi:lspi</code> — nên nạp module tự động theo alias cần tên đó có trong <code>id_table</code>. ' +
         'Driver <code>lspi</code> vì thế khai cả hai bảng.' },

    { t: 'h3', x: 'spidev: nói chuyện với bus SPI từ userspace' },

    { t: 'p', x:
      '<b><code>spidev</code></b> là một <code>spi_driver</code> đặc biệt: thay vì biết chip nào, nó tạo một character ' +
      'device <code>/dev/spidevB.C</code> (major <b>153</b>, <code>spidev.c:43</code>; B = số bus, C = chip select) cho ' +
      'phép chương trình userspace gửi <code>spi_transfer</code> bằng <code>ioctl(SPI_IOC_MESSAGE)</code>. Nó tương ' +
      'đương với <code>/dev/i2c-N</code> mà <code>i2cget</code> dùng — và cũng tương đương với <code>/dev/gpiochipN</code> ' +
      'của Bài 57: một cửa thứ hai ra phía userspace.' },

    { t: 'p', x:
      'Có một luật chơi mà rất nhiều hướng dẫn trên mạng làm sai: <b>không được viết <code>compatible = \"spidev\"</code> ' +
      'trong Device Tree</b>. DT mô tả phần cứng, còn \"spidev\" là một cách Linux cho userspace truy cập, không phải một ' +
      'con chip. Trên kernel của bạn, <code>spidev</code> chỉ nhận một danh sách <code>compatible</code> của các chip cụ thể ' +
      '(<code>spidev.c:720–735</code>, ví dụ <code>rohm,dh2228fv</code>), và từ chối thẳng nếu thấy chữ ' +
      '<code>spidev</code> (<code>spidev_of_check()</code>, <code>spidev.c:711</code>). Bước 6 cho bạn thấy cả hai cách ' +
      'sai và cách đúng.' },

    { t: 'cal', kind: 'tip', title: 'Khi nào dùng spidev, khi nào viết driver',
      x: 'spidev hợp để <b>thử</b> một chip mới — gửi vài byte lệnh, xem nó trả lời gì — trước khi viết driver, và cho ' +
         'những chip mà logic nằm hết ở userspace (một số màn hình, chip cấu hình FPGA). Nó không hợp khi chip có ngắt, ' +
         'cần timing chặt, hoặc cần xuất hiện dưới dạng một thiết bị chuẩn của kernel (hwmon, IIO, MTD). Quy tắc chọn ' +
         'giống Bài 53: userspace tự làm được thì để userspace làm; cần kernel đảm bảo thì viết driver.' },

    /* ============================================================
       6. THỰC HÀNH KHI KHÔNG CÓ BUS
       ============================================================ */
    { t: 'h2', x: 'Thực hành khi máy ảo không có bus' },

    { t: 'p', x:
      'Bài 30 đã nói trước: máy <code>virt</code> của QEMU không có bus I2C hay SPI. Kế hoạch ban đầu của lộ trình là ' +
      'chuyển sang machine Raspberry Pi của QEMU, nơi có bộ điều khiển I2C thật. Khi kiểm chứng trên QEMU <b>4.2.1</b> ' +
      '(bản Ubuntu 20.04 cài), kế hoạch đó không đứng vững: tên machine <code>raspi3b</code> chưa tồn tại (bản này gọi ' +
      'là <code>raspi3</code>), và khối I2C của <code>raspi3</code> chỉ là một vùng MMIO giữ chỗ — không có bus nào để ' +
      'gắn cảm biến vào. Bước 1 cho bạn tự thấy cả hai. Machine <code>mcimx7d-sabre</code> thì có bus I2C thật và nhận ' +
      '<code>-device tmp105</code>, nhưng là CPU 32 bit (Cortex-A7), cần một kernel ARM32 khác hẳn cây ' +
      '<code>~/bai38</code> — không đáng cho một bài về driver.' },

    { t: 'p', x:
      'Bài này vì thế thay tầng dưới cùng bằng phần mềm, và giữ nguyên tầng trên:' },

    { t: 'table',
      head: ['Công cụ', 'Đóng vai', 'Có sẵn?', 'Dùng ở'],
      rows: [
        ['<code>i2c-stub</code>', 'Adapter I2C giả + tối đa 10 chip giả, mỗi chip 256 thanh ghi rỗng', 'Có trong kernel, tắt trong <code>defconfig</code> — bật <code>=m</code>', 'Bước 2–4'],
        ['<code>i2csim.ko</code> (127 dòng, tự viết)', 'Adapter I2C giả <b>khai trong DT</b>, chip trả lời như TMP102 lúc bật nguồn', 'Viết trong bài', 'Bước 5'],
        ['<code>spiloop.ko</code> (63 dòng, tự viết)', 'Controller SPI giả, nối MOSI với MISO', 'Viết trong bài', 'Bước 6'],
        ['<code>tmp102.ko</code>, <code>spidev.ko</code>', 'Driver thật của kernel', 'Đã build ở Bài 40 (<code>=m</code>)', 'Bước 4–6']
      ] },

    { t: 'p', x:
      '<code>i2c-stub</code> có một hạn chế: nó tự tạo adapter khi được <code>insmod</code>, không gắn với node DT nào, ' +
      'nên không thể minh hoạ \"client sinh ra từ Device Tree\". <code>i2csim</code> lấp đúng chỗ đó: nó là một platform ' +
      'driver như Bài 54, và việc duy nhất nó làm là đăng ký một <code>i2c_adapter</code> — đúng cái các driver ' +
      '<code>i2c-bcm2835</code> hay <code>i2c-imx</code> làm trên phần cứng thật, chỉ khác là \"phần cứng\" là một mảng ' +
      'trong RAM.' },

    { t: 'cal', kind: 'warn', title: 'Cách \"thật hơn\" đã thử và không dùng được: i2c-gpio trên gpio-sim',
      x: 'Kernel có <code>i2c-gpio</code>: một adapter I2C đánh bit bằng hai chân GPIO. Ghép nó với <code>gpio-sim</code> ' +
         'của Bài 57 cho ra một bus I2C thật sự chạy START/ACK/STOP, khai được trong DT. Người viết bài đã dựng thử: bus ' +
         'lên được (<code>i2c-gpio: using lines 520 (SDA) and 521 (SCL)</code>, kèm cảnh báo <code>Slow GPIO pins might ' +
         'wreak havoc into I2C/SMBus bus timing</code> vì chân của gpio-sim có <code>can_sleep</code>), nhưng không có con ' +
         'chip giả nào ở đầu kia để kéo SDA xuống. <code>i2cdetect</code> quét 16 địa chỉ mất <b>13,3 giây</b> và ra toàn ' +
         '<code>--</code>. Muốn đi đường này cần thêm một \"slave\" giả trên cùng bus — quá phức tạp cho bài này.' },

    /* ============================================================
       THỰC HÀNH
       ============================================================ */
    { t: 'h2', x: 'Thực hành: từ bus giả tới driver thật' },

    { t: 'p', x:
      'Mọi lệnh <code>WSL</code> chạy trong <code>~/bai58</code>; mọi lệnh <code>QEMU</code> gõ vào shell BusyBox của ' +
      'máy ảo. Lệnh boot giống Bài 57: <code>-M virt -cpu cortex-a57 -smp 2 -m 512</code>, kernel ' +
      '<code>~/bai38/linux-6.18.45/arch/arm64/boot/Image</code>, initramfs là bản sao <code>~/bai32/initramfs</code> ' +
      'cộng các module của bài. Mỗi lần boot bắt đầu bằng <code>mount -t devtmpfs none /dev</code> (Bài 52). Các số ' +
      'trong ngoặc vuông của <code>dmesg</code> là thời gian từ lúc boot và sẽ khác trên máy bạn.' },

    { t: 'steps', items: [
      /* ---------------- BƯỚC 1 ---------------- */
      { title: 'Bước 1 — Xác nhận: virt và raspi3 không có bus để gắn chip',
        blocks: [
          { t: 'p', x:
            'Trước khi dựng bus giả, hãy chắc rằng thật sự không có bus thật. Bắt đầu với cây DT của <code>virt</code>: ' +
            'dump nó ra (quy trình Bài 45, cùng dòng lệnh sẽ dùng để boot) và đếm số dòng nhắc tới i2c hay spi.' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai58 && cd ~/bai58\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd ~/bai32/initramfs.cpio.gz -append "console=ttyAMA0 rdinit=/init" \\\n' +
            '  -machine dumpdtb=virt.dtb\n' +
            'dtc -q -I dtb -O dts -o virt.dts virt.dtb\n' +
            'wc -l virt.dts\n' +
            'grep -ciE "i2c|spi" virt.dts' },

          { t: 'code', where: 'out', nocopy: true, code:
            '384 virt.dts\n' +
            '0' },

          { t: 'p', x:
            '<b>384</b> dòng — khớp số Bài 56 đo được với <code>-smp 2</code>, nên đây đúng là cây bạn đã quen. <b>0</b> ' +
            'dòng nhắc tới i2c hay spi: không có node controller nào, nên kernel không có gì để tạo adapter. Nhưng ' +
            'cây DT là do QEMU sinh; có thể QEMU có bus mà không mô tả? Hỏi thẳng QEMU bằng cách đòi gắn một cảm biến ' +
            'nhiệt độ I2C mà nó biết giả lập — <code>tmp105</code>, họ hàng gần của TMP102:' },

          { t: 'code', where: 'wsl', code:
            'qemu-system-aarch64 -M virt -display none -device tmp105,address=0x48; echo "rc=$?"\n' +
            'qemu-system-aarch64 -M raspi3 -display none -device tmp105,address=0x48; echo "rc=$?"\n' +
            'qemu-system-aarch64 -M raspi3b -display none' },

          { t: 'code', where: 'out', nocopy: true, code:
            'qemu-system-aarch64: -device tmp105,address=0x48: No \'i2c-bus\' bus found for device \'tmp105\'\n' +
            'rc=1\n' +
            'qemu-system-aarch64: -device tmp105,address=0x48: No \'i2c-bus\' bus found for device \'tmp105\'\n' +
            'rc=1\n' +
            'qemu-system-aarch64: -M raspi3b: unsupported machine type \'raspi3b\'\n' +
            'Use -machine help to list supported machines' },

          { t: 'cmdx', cmd: 'qemu-system-aarch64 -M raspi3 -display none -device tmp105,address=0x48', rows: [
            ['-M raspi3', 'Machine Raspberry Pi 3 của QEMU 4.2.1. Bản QEMU mới hơn đổi tên thành <code>raspi3b</code>'],
            ['-display none', 'Không mở cửa sổ đồ hoạ; lỗi (nếu có) vẫn in ra stderr'],
            ['-device tmp105', 'Tạo một thiết bị giả lập TMP105. Nó là thiết bị I2C, nên QEMU phải tìm một bus kiểu <code>i2c-bus</code> để cắm'],
            ['address=0x48', 'Địa chỉ 7 bit của chip trên bus — cùng con số bạn sẽ viết vào <code>reg</code> trong DT']
          ] },

          { t: 'p', x:
            'Ba dòng, ba sự thật. <code>virt</code>: <code>No \'i2c-bus\' bus found</code>, <code>rc=1</code> — QEMU ' +
            'không có chỗ cắm, xác nhận điều cây DT nói. <code>raspi3</code>: <b>cùng thông báo</b>, dù Raspberry Pi thật ' +
            'có ba bộ điều khiển I2C. <code>raspi3b</code>: tên chưa tồn tại trên bản QEMU này. Vậy <code>raspi3</code> có ' +
            'gì ở chỗ I2C? Xem bản đồ bộ nhớ của nó qua monitor (Bài 30):' },

          { t: 'code', where: 'wsl', code:
            'printf \'info mtree\\nquit\\n\' | qemu-system-aarch64 -M raspi3 -display none -serial null -monitor stdio 2>&1 \\\n' +
            '  | grep -E \'i2c|spi\' | sort -u' },

          { t: 'code', where: 'out', nocopy: true, code:
            '      000000003f204000-000000003f20401f (prio -1000, i/o): bcm2835-spi0\n' +
            '    000000003f204000-000000003f20401f (prio -1000, i/o): bcm2835-spi0\n' +
            '      000000003f205000-000000003f20501f (prio -1000, i/o): bcm2835-i2c0\n' +
            '    000000003f205000-000000003f20501f (prio -1000, i/o): bcm2835-i2c0\n' +
            '      000000003f214000-000000003f2140ff (prio -1000, i/o): bcm2835-spis\n' +
            '    000000003f214000-000000003f2140ff (prio -1000, i/o): bcm2835-spis\n' +
            '      000000003f804000-000000003f80401f (prio -1000, i/o): bcm2835-i2c1\n' +
            '    000000003f804000-000000003f80401f (prio -1000, i/o): bcm2835-i2c1\n' +
            '      000000003f805000-000000003f80501f (prio -1000, i/o): bcm2835-i2c2\n' +
            '    000000003f805000-000000003f80501f (prio -1000, i/o): bcm2835-i2c2' },

          { t: 'cal', kind: 'why', title: '\"prio -1000\" nghĩa là: chỉ giữ chỗ, không có thiết bị',
            x: 'Các khối <code>bcm2835-i2c0/1/2</code> có đúng địa chỉ của SoC thật (<code>0x3f205000</code>, ' +
               '<code>0x3f804000</code>, <code>0x3f805000</code>), nhưng mức ưu tiên <b>-1000</b> là dấu hiệu QEMU dành ' +
               'cho vùng <b>chưa giả lập</b>: đọc trả về 0, ghi bị bỏ qua, chỉ để kernel không bị lỗi bus khi chạm vào. ' +
               'Không có bus I2C nào đằng sau — đó là lý do <code>tmp105</code> không có chỗ cắm. (Mỗi vùng hiện hai ' +
               'lần với hai mức thụt lề vì <code>info mtree</code> in cùng một vùng trong nhiều không gian địa chỉ — của ' +
               'từng CPU, của DMA… — ở độ sâu khác nhau; <code>sort -u</code> chỉ gộp các dòng giống hệt.) Bản QEMU mới ' +
               'hơn có thể đã giả lập khối này; người viết bài không kiểm chứng được trên máy có QEMU 4.2.1. Nếu máy bạn ' +
               'có QEMU mới, thử <code>-M raspi3b -device tmp105,address=0x48</code> — nếu không có lỗi, đó là một hướng tự ' +
               'khám phá thêm, cần <code>bcm2837-rpi-3-b.dtb</code> và driver <code>i2c-bcm2835</code> (đã có trong cây ' +
               '<code>~/bai38</code> ở dạng <code>=m</code>).' }
        ] },

      /* ---------------- BƯỚC 2 ---------------- */
      { title: 'Bước 2 — Bật i2c-stub và dùng i2c-tools trên một bus giả',
        blocks: [
          { t: 'p', x:
            'Kiểm tra kernel của bạn đang có gì ở mảng I2C/SPI. <code>~/bai38</code> là cây build của Bài 40, đã thêm ' +
            '<code>GPIO_SIM</code> ở Bài 57:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai38/linux-6.18.45\n' +
            'grep -E \'CONFIG_(I2C|I2C_CHARDEV|I2C_STUB|SPI|SPI_SPIDEV|SENSORS_TMP102)[ =]\' .config\n' +
            'grep -n -A3 \'^config I2C_STUB\' drivers/i2c/Kconfig' },

          { t: 'code', where: 'out', nocopy: true, code:
            'CONFIG_I2C=y\n' +
            'CONFIG_I2C_CHARDEV=y\n' +
            '# CONFIG_I2C_STUB is not set\n' +
            'CONFIG_SPI=y\n' +
            'CONFIG_SPI_SPIDEV=m\n' +
            'CONFIG_SENSORS_TMP102=m\n' +
            '# CONFIG_FPGA_MGR_LATTICE_SYSCONFIG_SPI is not set\n' +
            '102:config I2C_STUB\n' +
            '103-\ttristate "I2C/SMBus Test Stub"\n' +
            '104-\tdepends on m\n' +
            '105-\thelp' },

          { t: 'p', x:
            'i2c-core (<code>I2C=y</code>), spi core (<code>SPI=y</code>), <code>/dev/i2c-N</code> ' +
            '(<code>I2C_CHARDEV=y</code>), <code>spidev</code> và <code>tmp102</code> (đều <code>=m</code>) đã có sẵn ' +
            '— <code>defconfig</code> của arm64 bật chúng vì các bo mạch thật cần. Chỉ thiếu <code>I2C_STUB</code>. Dòng ' +
            '<code>FPGA_MGR…SPI</code> lọt vào vì regex khớp đuôi <code>_SPI</code>, bỏ qua. <code>depends on m</code> ' +
            'là một ràng buộc lạ: stub <b>chỉ</b> được build dạng module, không bao giờ built-in — vì nó cần tham số ' +
            '<code>chip_addr</code> lúc nạp. Bật nó như Bài 57 bật <code>GPIO_SIM</code>:' },

          { t: 'code', where: 'wsl', code:
            'cp .config ~/bai58/config.orig\n' +
            'scripts/config --module I2C_STUB\n' +
            'make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- PYTHON3=python3.9 olddefconfig\n' +
            'diff ~/bai58/config.orig .config' },

          { t: 'code', where: 'out', nocopy: true, code:
            '#\n' +
            '# No change to .config\n' +
            '#\n' +
            '4002c4002\n' +
            '< # CONFIG_I2C_STUB is not set\n' +
            '---\n' +
            '> CONFIG_I2C_STUB=m' },

          { t: 'p', x:
            'Một dòng đổi, không kéo theo gì — stub không <code>select</code> tuỳ chọn nào khác. Dòng ' +
            '<code># No change to .config</code> đọc hơi ngược: <code>scripts/config</code> đã sửa file rồi, nên ' +
            '<code>olddefconfig</code> thấy không còn gì phải thêm. <code>diff</code> mới là bằng chứng. Vì chỉ có một ' +
            'module mới, lần build này ngắn:' },

          { t: 'code', where: 'wsl', code:
            'time make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- PYTHON3=python3.9 -j$(nproc) Image modules > ~/bai58/build.log 2>&1\n' +
            'grep -E \'i2c-stub\' ~/bai58/build.log\n' +
            'modinfo -F parm drivers/i2c/i2c-stub.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            'real\t0m29.459s\n' +
            'user\t0m44.438s\n' +
            'sys\t0m12.994s\n' +
            '  CC [M]  drivers/i2c/i2c-stub.o\n' +
            '  CC [M]  drivers/i2c/i2c-stub.mod.o\n' +
            '  LD [M]  drivers/i2c/i2c-stub.ko\n' +
            'chip_addr:Chip addresses (up to 10, between 0x03 and 0x77) (array of ushort)\n' +
            'functionality:Override functionality bitfield (ulong)\n' +
            'bank_reg:Bank register (array of byte)\n' +
            'bank_mask:Bank value mask (array of byte)\n' +
            'bank_start:First banked register (array of byte)\n' +
            'bank_end:Last banked register (array of byte)' },

          { t: 'p', x:
            '<b>29,5 giây</b>, gần bằng 32,4 giây của Bài 57 — phần lớn là bước link lại <code>vmlinux</code> (Kbuild ' +
            'luôn làm lại vì <code>kernel/configs.o</code> nhúng <code>.config</code> mới). Tham số quan trọng là ' +
            '<code>chip_addr</code>: danh sách tối đa <b>10</b> địa chỉ, mỗi địa chỉ thành một chip giả. Dải ' +
            '<b>0x03–0x77</b> là dải địa chỉ 7 bit dùng được; 0x00–0x02 và 0x78–0x7F được I2C giữ cho mục đích đặc biệt. ' +
            'Thời gian build của bạn sẽ khác theo số nhân CPU.' },

          { t: 'p', x:
            'Dựng initramfs cho bài: bản sao của Bài 32 cộng module stub. <code>--strip-debug</code> bỏ thông tin debug ' +
            'để initramfs nhỏ (Bài 50):' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai58\n' +
            'cp -a ~/bai32/initramfs initramfs\n' +
            'mkdir -p initramfs/lib/modules\n' +
            'cp ~/bai38/linux-6.18.45/drivers/i2c/i2c-stub.ko initramfs/lib/modules/\n' +
            'aarch64-linux-gnu-strip --strip-debug initramfs/lib/modules/*.ko\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '3900 blocks' },

          { t: 'p', x:
            'Trong máy ảo, xem bus I2C trước và sau khi nạp stub, với một chip giả ở 0x48:' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'ls /sys/bus/i2c/devices\n' +
            'insmod /lib/modules/i2c-stub.ko chip_addr=0x48\n' +
            'ls /sys/bus/i2c/devices\n' +
            'cat /sys/bus/i2c/devices/i2c-0/name\n' +
            'ls -l /dev/i2c-0\n' +
            'i2cdetect -l' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ls /sys/bus/i2c/devices\n' +
            '~ # insmod /lib/modules/i2c-stub.ko chip_addr=0x48\n' +
            '[    5.262441] i2c-stub: Virtual chip at 0x48\n' +
            '~ # ls /sys/bus/i2c/devices\n' +
            'i2c-0\n' +
            '~ # cat /sys/bus/i2c/devices/i2c-0/name\n' +
            'SMBus stub driver\n' +
            '~ # ls -l /dev/i2c-0\n' +
            'crw-------    1 0        0          89,   0 Sep 30 10:24 /dev/i2c-0\n' +
            '~ # i2cdetect -l\n' +
            'i2c-0\tsmbus     \tSMBus stub driver               \tSMBus adapter' },

          { t: 'p', x:
            'Trước <code>insmod</code>: <code>/sys/bus/i2c/devices</code> rỗng — i2c-core có mặt nhưng không có adapter ' +
            'nào. Sau: một adapter <b><code>i2c-0</code></b> tên <code>SMBus stub driver</code>. i2c-core cấp số ' +
            'adapter từ 0 theo thứ tự đăng ký. <code>/dev/i2c-0</code> có major <b>89</b> — hằng số ' +
            '<code>I2C_MAJOR</code> (<code>include/linux/i2c-dev.h:14</code>), minor = số adapter; nó do ' +
            '<code>I2C_CHARDEV</code> tạo cho <b>mọi</b> adapter, và là cửa để các công cụ userspace nói chuyện với bus. ' +
            '<code>i2cdetect -l</code> đọc đúng các thông tin đó. Ngày giờ trong <code>ls -l</code> sẽ khác trên máy bạn.' },

          { t: 'p', x:
            'BusyBox của initramfs có sẵn năm applet I2C (<code>i2cdetect i2cdump i2cget i2cset i2ctransfer</code>), ' +
            'nên không cần cài gói <code>i2c-tools</code>. Quét bus:' },

          { t: 'code', where: 'qemu', code:
            'i2cdetect -y 0' },

          { t: 'code', where: 'out', nocopy: true, code:
            '     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f\n' +
            '00:          -- -- -- -- -- -- -- -- -- -- -- -- -- \n' +
            '10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- \n' +
            '20: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- \n' +
            '30: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- \n' +
            '40: -- -- -- -- -- -- -- -- 48 -- -- -- -- -- -- -- \n' +
            '50: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- \n' +
            '60: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- \n' +
            '70: -- -- -- -- -- -- -- --                         ' },

          { t: 'cmdx', cmd: 'i2cdetect -y 0', rows: [
            ['i2cdetect', 'Gửi một giao dịch ngắn tới từng địa chỉ 0x03–0x77 và ghi lại chỗ nào có trả lời'],
            ['-y', 'Không hỏi \"Continue? [Y/n]\". Không có cờ này nó dừng chờ bạn gõ — vì trên bus thật, dò địa chỉ có thể làm một số chip hiểu nhầm là lệnh'],
            ['0', 'Số adapter — số sau <code>i2c-</code> trong <code>i2cdetect -l</code>']
          ] },

          { t: 'p', x:
            'Lưới 8 hàng × 16 cột, mỗi ô một địa chỉ (hàng <code>40:</code> cột <code>8</code> = 0x48). ' +
            '<code>--</code> là \"không ai trả lời\" — với bus thật đó là NACK, với stub là <code>-ENODEV</code>. Chỉ ô ' +
            '0x48 hiện số: đúng chip bạn khai bằng <code>chip_addr</code>. Ô 0x00–0x02 và 0x78–0x7F để trống vì công cụ ' +
            'không dò dải dành riêng. Giờ đọc và ghi thanh ghi của chip giả:' },

          { t: 'code', where: 'qemu', code:
            'i2cset -y 0 0x48 0x01 0x60\n' +
            'i2cget -y 0 0x48 0x01\n' +
            'i2cset -y 0 0x48 0x00 0x1234 w\n' +
            'i2cget -y 0 0x48 0x00 w\n' +
            'i2cget -y 0 0x48 0x00 b\n' +
            'i2cget -y 0 0x48 0x01 b\n' +
            'i2cdump -y 0 0x48 b | head -3' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # i2cset -y 0 0x48 0x01 0x60\n' +
            '~ # i2cget -y 0 0x48 0x01\n' +
            '0x60\n' +
            '~ # i2cset -y 0 0x48 0x00 0x1234 w\n' +
            '~ # i2cget -y 0 0x48 0x00 w\n' +
            '0x1234\n' +
            '~ # i2cget -y 0 0x48 0x00 b\n' +
            '0x34\n' +
            '~ # i2cget -y 0 0x48 0x01 b\n' +
            '0x60\n' +
            '~ # i2cdump -y 0 0x48 b | head -3\n' +
            '     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f    0123456789abcdef\n' +
            '00: 34 60 00 00 00 00 00 00 00 00 00 00 00 00 00 00    4`..............\n' +
            '10: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00    ................' },

          { t: 'cmdx', cmd: 'i2cset -y 0 0x48 0x00 0x1234 w', rows: [
            ['0', 'Adapter số 0'],
            ['0x48', 'Địa chỉ chip — i2c-tools nhận địa chỉ 7 bit, không phải byte 0x90'],
            ['0x00', 'Số hiệu thanh ghi (\"command\" trong ngôn ngữ SMBus)'],
            ['0x1234', 'Giá trị cần ghi'],
            ['w', 'Kiểu giao dịch: <code>b</code> = byte (mặc định), <code>w</code> = word 16 bit. <code>i2cget</code> nhận cùng chữ cái']
          ] },

          { t: 'cal', kind: 'why', title: 'Ghi word 0x1234 vào thanh ghi 0 làm thay đổi hai ô: 0x34 ở ô 0 và giữ 0x60 ở ô 1',
            x: 'Đọc lại <code>w</code> ra <code>0x1234</code> như mong đợi, nhưng đọc <code>b</code> ở thanh ghi 0 chỉ ra ' +
               '<b><code>0x34</code></b> — byte thấp. Stub lưu mỗi thanh ghi là một word 16 bit (<code>u16 words[256]</code> ' +
               'trong <code>i2c-stub.c</code>); đọc byte trả về 8 bit thấp của word đó, còn word ở thanh ghi 1 vẫn giữ ' +
               '<code>0x60</code> đã ghi trước. <code>i2cdump</code> xác nhận: <code>34 60 00 …</code>. Đây không phải ' +
               'hành vi của mọi chip — là cách một mô hình phần mềm đơn giản chọn. Trên chip thật, đọc byte hay word ' +
               'cùng một thanh ghi ra gì là do datasheet quy định. Điều bài học: <code>i2c-stub</code> nhớ mọi thứ bạn ' +
               'ghi và trả lại y nguyên — đủ để giả một cảm biến bằng cách <b>ghi trước giá trị mà cảm biến đó sẽ trả</b>.' },

          { t: 'p', x:
            'Cuối cùng, hỏi một địa chỉ không có chip:' },

          { t: 'code', where: 'qemu', code:
            'i2cget -y 0 0x50 0x00; echo rc=$?' },

          { t: 'code', where: 'out', nocopy: true, code:
            'i2cget: read failed: No such device\n' +
            'rc=1' },

          { t: 'p', x:
            '<code>No such device</code> là chuỗi của <code>ENODEV</code>: <code>stub_xfer()</code> không tìm thấy 0x50 ' +
            'trong <code>chip_addr</code> nên trả <code>-ENODEV</code> (<code>i2c-stub.c:140</code>). Một adapter thật sẽ ' +
            'trả <code>-ENXIO</code> (<code>No such device or address</code>) — bảng mã lỗi ở mục 2 đã nói trước chỗ khác ' +
            'biệt này. Tắt máy ảo bằng <code>poweroff -f</code>.' }
        ] },

      /* ---------------- BƯỚC 3 ---------------- */
      { title: 'Bước 3 — Viết driver I2C client ltemp và gắn nó bằng new_device',
        blocks: [
          { t: 'p', x:
            'Driver cho một cảm biến \"kiểu TMP102\": thanh ghi 0x00 là nhiệt độ (12 bit, căn trái, 0,0625 °C mỗi bước, ' +
            'byte cao trước), thanh ghi 0x01 là cấu hình. Nó xuất nhiệt độ ra sysfs dưới dạng mili-độ — cùng đơn vị ' +
            'hwmon và Bài 51 dùng. Đọc toàn bộ trước, phần giải thích ở ngay dưới:' },

          { t: 'code', where: 'file', name: '~/bai58/ltemp/ltemp.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/*\n' +
            ' * I2C client driver for a TMP102-style temperature sensor ("learn,ltemp").\n' +
            ' * Register 0x00: temperature, 12 bits left-aligned, 0.0625 C per step, MSB first.\n' +
            ' * Register 0x01: configuration word.\n' +
            ' */\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/i2c.h>\n' +
            '#include <linux/of.h>\n' +
            '\n' +
            '#define LT_REG_TEMP	0x00\n' +
            '#define LT_REG_CONF	0x01\n' +
            '\n' +
            'struct lt_dev {\n' +
            '	struct i2c_client *client;\n' +
            '	unsigned int reads;             /* successful temperature reads */\n' +
            '};\n' +
            '\n' +
            'static int lt_read_mdeg(struct lt_dev *lt, int *mdeg)\n' +
            '{\n' +
            '	s32 raw = i2c_smbus_read_word_swapped(lt->client, LT_REG_TEMP);\n' +
            '\n' +
            '	if (raw < 0)\n' +
            '		return raw;             /* -ENXIO, -ETIMEDOUT, ... from the adapter */\n' +
            '	lt->reads++;\n' +
            '	/* keep the sign, drop the 4 unused bits, 62.5 milli-degrees per step */\n' +
            '	*mdeg = ((s16)raw >> 4) * 625 / 10;\n' +
            '	return 0;\n' +
            '}\n' +
            '\n' +
            'static ssize_t temp_mdeg_show(struct device *dev,\n' +
            '			      struct device_attribute *attr, char *buf)\n' +
            '{\n' +
            '	struct lt_dev *lt = dev_get_drvdata(dev);\n' +
            '	int mdeg, ret;\n' +
            '\n' +
            '	ret = lt_read_mdeg(lt, &mdeg);\n' +
            '	if (ret)\n' +
            '		return ret;\n' +
            '	return sysfs_emit(buf, "%d\\n", mdeg);\n' +
            '}\n' +
            'static DEVICE_ATTR_RO(temp_mdeg);\n' +
            '\n' +
            'static ssize_t reads_show(struct device *dev,\n' +
            '			  struct device_attribute *attr, char *buf)\n' +
            '{\n' +
            '	struct lt_dev *lt = dev_get_drvdata(dev);\n' +
            '\n' +
            '	return sysfs_emit(buf, "%u\\n", lt->reads);\n' +
            '}\n' +
            'static DEVICE_ATTR_RO(reads);\n' +
            '\n' +
            'static struct attribute *lt_attrs[] = {\n' +
            '	&dev_attr_temp_mdeg.attr,\n' +
            '	&dev_attr_reads.attr,\n' +
            '	NULL\n' +
            '};\n' +
            'ATTRIBUTE_GROUPS(lt);\n' +
            '\n' +
            'static int lt_probe(struct i2c_client *client)\n' +
            '{\n' +
            '	struct device *dev = &client->dev;\n' +
            '	struct lt_dev *lt;\n' +
            '	s32 conf;\n' +
            '	int mdeg, ret;\n' +
            '\n' +
            '	if (!i2c_check_functionality(client->adapter, I2C_FUNC_SMBUS_WORD_DATA))\n' +
            '		return dev_err_probe(dev, -EOPNOTSUPP,\n' +
            '				     "adapter has no SMBus word access\\n");\n' +
            '\n' +
            '	/* first bus transaction: is anybody there? */\n' +
            '	conf = i2c_smbus_read_word_swapped(client, LT_REG_CONF);\n' +
            '	if (conf < 0)\n' +
            '		return dev_err_probe(dev, conf, "no answer at 0x%02x\\n",\n' +
            '				     client->addr);\n' +
            '\n' +
            '	lt = devm_kzalloc(dev, sizeof(*lt), GFP_KERNEL);\n' +
            '	if (!lt)\n' +
            '		return -ENOMEM;\n' +
            '	lt->client = client;\n' +
            '	i2c_set_clientdata(client, lt);\n' +
            '\n' +
            '	ret = lt_read_mdeg(lt, &mdeg);\n' +
            '	if (ret)\n' +
            '		return ret;\n' +
            '\n' +
            '	dev_info(dev, "%s at 0x%02x on \\"%s\\": conf 0x%04x, %d mdeg\\n",\n' +
            '		 client->name, client->addr, client->adapter->name, conf, mdeg);\n' +
            '	return 0;\n' +
            '}\n' +
            '\n' +
            'static void lt_remove(struct i2c_client *client)\n' +
            '{\n' +
            '	struct lt_dev *lt = i2c_get_clientdata(client);\n' +
            '\n' +
            '	dev_info(&client->dev, "remove after %u reads\\n", lt->reads);\n' +
            '}\n' +
            '\n' +
            'static const struct i2c_device_id lt_id[] = {\n' +
            '	{ "ltemp" },\n' +
            '	{ }\n' +
            '};\n' +
            'MODULE_DEVICE_TABLE(i2c, lt_id);\n' +
            '\n' +
            'static const struct of_device_id lt_of_match[] = {\n' +
            '	{ .compatible = "learn,ltemp" },\n' +
            '	{ }\n' +
            '};\n' +
            'MODULE_DEVICE_TABLE(of, lt_of_match);\n' +
            '\n' +
            'static struct i2c_driver lt_driver = {\n' +
            '	.driver = {\n' +
            '		.name = "ltemp",\n' +
            '		.of_match_table = lt_of_match,\n' +
            '		.dev_groups = lt_groups,\n' +
            '	},\n' +
            '	.probe = lt_probe,\n' +
            '	.remove = lt_remove,\n' +
            '	.id_table = lt_id,\n' +
            '};\n' +
            'module_i2c_driver(lt_driver);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_AUTHOR("Embedded Linux course");\n' +
            'MODULE_DESCRIPTION("I2C client for a TMP102-style sensor");' },

          { t: 'table',
            head: ['Dòng', 'Làm gì, và vì sao'],
            rows: [
              ['<code>#include &lt;linux/i2c.h&gt;</code>', 'Toàn bộ API client: <code>struct i2c_client</code>, <code>i2c_smbus_*</code>, <code>module_i2c_driver</code>'],
              ['<code>lt_read_mdeg()</code>', 'Một giao dịch read word data tới thanh ghi 0x00. Kết quả âm là mã lỗi của adapter, trả thẳng lên'],
              ['<code>(s16)raw &gt;&gt; 4</code>', 'Ép về số có dấu 16 bit <b>trước</b> khi dịch, để nhiệt độ âm (bit 15 = 1) giữ dấu; dịch 4 bỏ phần không dùng'],
              ['<code>* 625 / 10</code>', '0,0625 °C = 62,5 mili-độ. Không có float trong kernel (Bài 51), nên nhân 625 rồi chia 10'],
              ['<code>temp_mdeg_show()</code>', 'Mỗi lần <code>cat</code> là một giao dịch I2C mới — sysfs không lưu cache. Driver thật thường giới hạn tần suất, vì bus I2C chậm'],
              ['<code>i2c_check_functionality()</code>', 'Hỏi adapter có làm được SMBus word không. Adapter đơn giản có thể chỉ làm được byte'],
              ['đọc <code>LT_REG_CONF</code> trong probe', '\"Có ai ở địa chỉ này không?\" — giao dịch đầu tiên. Thất bại thì dừng, và <code>dev_err_probe</code> in một dòng (mục 2: driver core im lặng với <code>-ENODEV</code>/<code>-ENXIO</code>)'],
              ['<code>i2c_set_clientdata()</code>', 'Gắn <code>lt</code> vào client, tương đương <code>platform_set_drvdata</code> ở Bài 54. <code>dev_get_drvdata</code> trong hàm sysfs đọc lại đúng con trỏ này'],
              ['<code>lt_id[]</code> + <code>lt_of_match[]</code>', 'Hai cách khớp: theo tên <code>\"ltemp\"</code> (bước này, qua <code>new_device</code>) và theo <code>compatible</code> (bước 5, qua DT)'],
              ['<code>module_i2c_driver()</code>', 'Sinh <code>module_init</code>/<code>module_exit</code> gọi <code>i2c_add_driver</code>/<code>i2c_del_driver</code> — như <code>module_platform_driver</code>']
            ] },

          { t: 'p', x:
            'Makefile là bản của Bài 57 đổi tên. Build:' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/bai58/ltemp && cd ~/bai58/ltemp\n' +
            'sed \'s/vgchip/ltemp/\' ~/bai57/vgchip/Makefile > Makefile\n' +
            'time make\n' +
            'modinfo -F alias ltemp.ko\n' +
            'aarch64-linux-gnu-nm -u ltemp.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            'make -C /home/cah8hc/bai38/linux-6.18.45 M=/home/cah8hc/bai58/ltemp ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- modules\n' +
            'make[1]: Entering directory \'/home/cah8hc/embedded-course/bai38/linux-6.18.45\'\n' +
            'make[2]: Entering directory \'/home/cah8hc/bai58/ltemp\'\n' +
            '  CC [M]  ltemp.o\n' +
            '  MODPOST Module.symvers\n' +
            '  CC [M]  ltemp.mod.o\n' +
            '  CC [M]  .module-common.o\n' +
            '  LD [M]  ltemp.ko\n' +
            'make[2]: Leaving directory \'/home/cah8hc/bai58/ltemp\'\n' +
            'make[1]: Leaving directory \'/home/cah8hc/embedded-course/bai38/linux-6.18.45\'\n' +
            '\n' +
            'real\t0m1.028s\n' +
            'user\t0m0.932s\n' +
            'sys\t0m0.101s\n' +
            'i2c:ltemp\n' +
            'of:N*T*Clearn,ltempC*\n' +
            'of:N*T*Clearn,ltemp\n' +
            '                 U dev_err_probe\n' +
            '                 U _dev_info\n' +
            '                 U devm_kmalloc\n' +
            '                 U i2c_del_driver\n' +
            '                 U i2c_register_driver\n' +
            '                 U i2c_smbus_read_word_data\n' +
            '                 U sysfs_emit' },

          { t: 'p', x:
            'Hai điều đáng để ý. <code>modinfo</code> có <b>ba</b> alias: <code>i2c:ltemp</code> từ <code>lt_id</code> và ' +
            'hai dạng <code>of:</code> từ <code>lt_of_match</code> — mỗi bảng <code>MODULE_DEVICE_TABLE</code> sinh alias ' +
            'riêng (Bài 54). Và <code>nm -u</code> có <code>i2c_smbus_read_word_data</code> chứ <b>không</b> có ' +
            '<code>i2c_smbus_read_word_swapped</code>: bản <code>_swapped</code> là hàm <code>static inline</code> trong ' +
            '<code>i2c.h</code>, gọi bản thường rồi <code>swab16()</code> kết quả. Đường dẫn ' +
            '<code>/home/cah8hc/…</code> và thời gian là của máy người viết.' },

          { t: 'p', x:
            'Giờ tạo một cảm biến giả. Stub không có sẵn giá trị nào, nên <b>ghi trước</b> vào thanh ghi đúng những gì ' +
            'một TMP102 ở 25 °C sẽ trả. Giá trị 25 °C là 0x1900 (hình ở mục 2). Nhưng <code>i2cset … w</code> gửi word ' +
            'theo quy ước SMBus — byte thấp trước — nên để chip \"gửi\" 0x19 rồi 0x00, bạn ghi <code>0x0019</code>. Tương ' +
            'tự, thanh ghi cấu hình lúc bật nguồn của TMP102 là 0x60A0, ghi thành <code>0xa060</code>. Thêm một chip thứ ' +
            'hai ở 0x4a để dùng ở bước 4:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai58\n' +
            'cp ltemp/ltemp.ko ~/bai38/linux-6.18.45/drivers/hwmon/tmp102.ko initramfs/lib/modules/\n' +
            'aarch64-linux-gnu-strip --strip-debug initramfs/lib/modules/*.ko\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'insmod /lib/modules/i2c-stub.ko chip_addr=0x48,0x4a\n' +
            'i2cset -y 0 0x48 0x00 0x0019 w\n' +
            'i2cset -y 0 0x48 0x01 0xa060 w\n' +
            'insmod /lib/modules/ltemp.ko\n' +
            'ls /sys/bus/i2c/drivers/ltemp' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /lib/modules/i2c-stub.ko chip_addr=0x48,0x4a\n' +
            '[    4.597825] i2c-stub: Virtual chip at 0x48\n' +
            '[    4.597932] i2c-stub: Virtual chip at 0x4a\n' +
            '~ # i2cset -y 0 0x48 0x00 0x0019 w\n' +
            '~ # i2cset -y 0 0x48 0x01 0xa060 w\n' +
            '~ # insmod /lib/modules/ltemp.ko\n' +
            '[    6.699677] ltemp: loading out-of-tree module taints kernel.\n' +
            '~ # ls /sys/bus/i2c/drivers/ltemp\n' +
            'bind    module  uevent  unbind' },

          { t: 'p', x:
            'Driver đã đăng ký, nhưng thư mục của nó chỉ có bốn file chuẩn — <b>không có thiết bị nào</b>. Stub có chip ' +
            'ở 0x48, nhưng i2c-core không biết chip đó <i>là gì</i>: I2C không có cách nào để hỏi một chip \"bạn tên ' +
            'gì\" như USB hay PCI. Ai đó phải khai. Trên bo mạch thật đó là DT (bước 5); ở đây bạn khai bằng tay qua ' +
            'file <code>new_device</code> của adapter:' },

          { t: 'code', where: 'qemu', code:
            'echo ltemp 0x48 > /sys/bus/i2c/devices/i2c-0/new_device\n' +
            'ls /sys/bus/i2c/devices\n' +
            'ls /sys/bus/i2c/devices/0-0048\n' +
            'cat /sys/bus/i2c/devices/0-0048/name /sys/bus/i2c/devices/0-0048/modalias\n' +
            'readlink /sys/bus/i2c/devices/0-0048/driver\n' +
            'cat /sys/bus/i2c/devices/0-0048/temp_mdeg' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # echo ltemp 0x48 > /sys/bus/i2c/devices/i2c-0/new_device\n' +
            '[    8.094702] ltemp 0-0048: ltemp at 0x48 on "SMBus stub driver": conf 0x60a0, 25000 mdeg\n' +
            '[    8.095035] i2c i2c-0: new_device: Instantiated device ltemp at 0x48\n' +
            '~ # ls /sys/bus/i2c/devices\n' +
            '0-0048  i2c-0\n' +
            '~ # ls /sys/bus/i2c/devices/0-0048\n' +
            'driver     name       reads      temp_mdeg\n' +
            'modalias   power      subsystem  uevent\n' +
            '~ # cat /sys/bus/i2c/devices/0-0048/name /sys/bus/i2c/devices/0-0048/modalias\n' +
            'ltemp\n' +
            'i2c:ltemp\n' +
            '~ # readlink /sys/bus/i2c/devices/0-0048/driver\n' +
            '../../../bus/i2c/drivers/ltemp\n' +
            '~ # cat /sys/bus/i2c/devices/0-0048/temp_mdeg\n' +
            '25000' },

          { t: 'cmdx', cmd: 'echo ltemp 0x48 > /sys/bus/i2c/devices/i2c-0/new_device', rows: [
            ['ltemp', 'Tên thiết bị — sẽ thành <code>client-&gt;name</code> và được so với <code>id_table</code> của mọi driver I2C'],
            ['0x48', 'Địa chỉ 7 bit'],
            ['i2c-0/new_device', 'File chỉ-ghi của adapter số 0 (<code>i2c-core-base.c:1265</code>). Mỗi adapter có một file riêng; có <code>delete_device</code> để làm ngược lại']
          ] },

          { t: 'cal', kind: 'why', title: 'Hai dòng log, hai tầng: driver của bạn in trước, i2c-core in sau',
            x: 'Thứ tự đáng chú ý. <code>new_device_store()</code> gọi <code>i2c_new_client_device()</code>, hàm này đăng ' +
               'ký client với driver core, driver core thấy tên <code>ltemp</code> khớp <code>lt_id</code> và gọi ' +
               '<code>lt_probe()</code> <b>ngay trong lúc đăng ký</b> — nên dòng của driver ra trước. Chỉ khi mọi thứ ' +
               'xong, i2c-core mới in <code>Instantiated device</code>. Dòng của driver xác nhận cả chuỗi: ' +
               '<code>conf 0x60a0</code> (đọc đúng thứ vừa ghi vào 0x01, sau khi swap), <code>25000 mdeg</code> (0x1900 → ' +
               '25,0 °C), tên adapter lấy qua <code>client-&gt;adapter-&gt;name</code>. Thiết bị tên <code>0-0048</code>, ' +
               '<code>modalias</code> là <code>i2c:ltemp</code> vì nó được tạo bằng tên chứ không từ DT. File ' +
               '<code>reads</code> và <code>temp_mdeg</code> xuất hiện nhờ <code>.dev_groups</code>.' },

          { t: 'p', x:
            'Giờ thử đụng vào chip từ userspace trong lúc driver đang giữ nó, rồi đổi nhiệt độ \"của cảm biến\":' },

          { t: 'code', where: 'qemu', code:
            'i2cget -y 0 0x48 0x00 w; echo rc=$?\n' +
            'i2cset -f -y 0 0x48 0x00 0x80e6 w\n' +
            'cat /sys/bus/i2c/devices/0-0048/temp_mdeg\n' +
            'cat /sys/bus/i2c/devices/0-0048/reads\n' +
            'i2cdetect -y 0 0x48 0x4b | sed -n \'1p;6p\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # i2cget -y 0 0x48 0x00 w; echo rc=$?\n' +
            'i2cget: can\'t set address to 0x48: Device or resource busy\n' +
            'rc=1\n' +
            '~ # i2cset -f -y 0 0x48 0x00 0x80e6 w\n' +
            '~ # cat /sys/bus/i2c/devices/0-0048/temp_mdeg\n' +
            '-25500\n' +
            '~ # cat /sys/bus/i2c/devices/0-0048/reads\n' +
            '3\n' +
            '~ # i2cdetect -y 0 0x48 0x4b | sed -n \'1p;6p\'\n' +
            '     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f\n' +
            '40:                         UU -- 4a --             ' },

          { t: 'cmdx', cmd: 'i2cdetect -y 0 0x48 0x4b', rows: [
            ['0x48 0x4b', 'Chỉ quét từ 0x48 tới 0x4b thay vì cả bus. Các ô ngoài dải để trống'],
            ['| sed -n \'1p;6p\'', 'Chỉ giữ dòng tiêu đề và dòng <code>40:</code> — năm dòng giữa đều trống']
          ] },

          { t: 'cal', kind: 'info', title: 'EBUSY, -f, và UU: ba cách i2c-dev tôn trọng driver trong kernel',
            x: '<code>i2cget</code> mở <code>/dev/i2c-0</code> rồi gọi <code>ioctl(I2C_SLAVE, 0x48)</code> để chọn chip. ' +
               'i2c-dev thấy 0x48 đã có một client <b>có driver</b> và từ chối bằng <code>-EBUSY</code> ' +
               '(<code>i2c-dev.c:414–415</code>) — không để userspace chen vào giữa hai giao dịch của driver. Cờ ' +
               '<code>-f</code> dùng <code>I2C_SLAVE_FORCE</code>, bỏ qua kiểm tra đó: được, nhưng là trách nhiệm của bạn. ' +
               'Ở đây nó dùng để \"đổi nhiệt độ\": <code>0x80e6</code> gửi theo SMBus là <code>0xe6 0x80</code>, tức 0xE680 ' +
               '— bit 15 bật, số âm: (0xE680 as s16) &gt;&gt; 4 = -408 bước × 62,5 = <b>-25 500</b> mili-độ. Driver ' +
               'giữ đúng dấu nhờ ép <code>(s16)</code> trước khi dịch. <code>reads</code> = 3: một lần trong ' +
               '<code>probe</code>, hai lần <code>cat temp_mdeg</code>. Trong <code>i2cdetect</code>, ô 0x48 giờ là ' +
               '<b><code>UU</code></b> — \"đang có driver giữ, không dò\"; 0x4a vẫn là số vì chưa ai nhận nó.' },

          { t: 'p', x:
            'Giữ máy ảo chạy, bước 4 dùng tiếp.' }
        ] },

      /* ---------------- BƯỚC 4 ---------------- */
      { title: 'Bước 4 — Bốn cách một driver I2C sai, và tmp102 thật của kernel',
        blocks: [
          { t: 'p', x:
            'Lỗi đầu tiên không cần máy ảo: <code>probe()</code> theo chữ ký cũ hai tham số, như trong hầu hết sách và ' +
            'blog trước 2023. Tạo một bản sao và sửa một dòng:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai58\n' +
            'mkdir -p v/oldprobe && cp ltemp/Makefile v/oldprobe/\n' +
            'sed \'s/^static int lt_probe(struct i2c_client \\*client)$/static int lt_probe(struct i2c_client *client, const struct i2c_device_id *id)/\' \\\n' +
            '  ltemp/ltemp.c > v/oldprobe/ltemp.c\n' +
            'cd v/oldprobe && make 2>&1 | grep -E \'error|note\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'ltemp.c:117:11: error: initialization of ‘int (*)(struct i2c_client *)’ from incompatible pointer type ‘int (*)(struct i2c_client *, const struct i2c_device_id *)’ [-Werror=incompatible-pointer-types]\n' +
            'ltemp.c:117:11: note: (near initialization for ‘lt_driver.probe’)' },

          { t: 'p', x:
            'Cùng loại lỗi với <code>remove</code> trả <code>int</code> ở Bài 54: kernel build với ' +
            '<code>-Werror=incompatible-pointer-types</code>, nên sai kiểu con trỏ hàm là lỗi cứng. Dòng 117 là ' +
            '<code>.probe = lt_probe,</code>. Trên kernel 6.18 của bạn, <code>struct i2c_driver</code> chỉ còn ' +
            '<code>probe</code> một tham số (<code>i2c.h:274</code>); driver cần biết mình khớp mục nào của ' +
            '<code>id_table</code> thì gọi <code>i2c_client_get_device_id(client)</code> (<code>i2c.h:191</code>). Gặp ' +
            'lỗi này khi port driver cũ: xoá tham số thứ hai.' },

          { t: 'p', x:
            'Lỗi thứ hai là cái bẫy byte order của mục 2. Bản sao thứ hai thay <code>_swapped</code> bằng bản thường — ' +
            'một chữ:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai58\n' +
            'mkdir -p v/noswap && cp ltemp/Makefile v/noswap/\n' +
            'sed \'s/i2c_smbus_read_word_swapped(lt->client, LT_REG_TEMP)/i2c_smbus_read_word_data(lt->client, LT_REG_TEMP)/\' \\\n' +
            '  ltemp/ltemp.c > v/noswap/ltemp.c\n' +
            'diff ltemp/ltemp.c v/noswap/ltemp.c\n' +
            '(cd v/noswap && make 2>&1 | grep -cE \'warning|error\')\n' +
            'cp v/noswap/ltemp.ko initramfs/lib/modules/ltemp_noswap.ko\n' +
            'aarch64-linux-gnu-strip --strip-debug initramfs/lib/modules/*.ko\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)' },

          { t: 'code', where: 'out', nocopy: true, code:
            '21c21\n' +
            '< \ts32 raw = i2c_smbus_read_word_swapped(lt->client, LT_REG_TEMP);\n' +
            '---\n' +
            '> \ts32 raw = i2c_smbus_read_word_data(lt->client, LT_REG_TEMP);\n' +
            '0\n' +
            '3961 blocks' },

          { t: 'p', x:
            '<b>0</b> cảnh báo — đúng như dự đoán, trình biên dịch không có cách nào biết. Chỉ thanh ghi nhiệt độ bị ' +
            'đổi; thanh ghi cấu hình vẫn đọc bằng <code>_swapped</code>. Khởi động lại máy ảo với initramfs mới (lệnh ' +
            'boot như bước 3) rồi chạy bốn thí nghiệm liền nhau:' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'insmod /lib/modules/i2c-stub.ko chip_addr=0x48,0x4a\n' +
            'i2cset -y 0 0x48 0x00 0x0019 w\n' +
            'i2cset -y 0 0x48 0x01 0xa060 w\n' +
            'insmod /lib/modules/ltemp_noswap.ko\n' +
            'echo ltemp 0x48 > /sys/bus/i2c/devices/i2c-0/new_device\n' +
            'cat /sys/bus/i2c/devices/0-0048/temp_mdeg' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /lib/modules/ltemp_noswap.ko\n' +
            '[    6.683388] ltemp: loading out-of-tree module taints kernel.\n' +
            '~ # echo ltemp 0x48 > /sys/bus/i2c/devices/i2c-0/new_device\n' +
            '[    7.398885] ltemp 0-0048: ltemp at 0x48 on "SMBus stub driver": conf 0x60a0, 62 mdeg\n' +
            '[    7.399184] i2c i2c-0: new_device: Instantiated device ltemp at 0x48\n' +
            '~ # cat /sys/bus/i2c/devices/0-0048/temp_mdeg\n' +
            '62' },

          { t: 'cal', kind: 'danger', title: '62 mili-độ: probe thành công, không có lỗi nào, và con số sai 400 lần',
            x: 'Cùng chip, cùng thanh ghi, cùng dữ liệu như bước 3, và <code>conf 0x60a0</code> vẫn đúng. Chỉ nhiệt độ ra ' +
               '<b>62</b> thay vì 25 000. Tính ngược: không swap thì <code>raw</code> = 0x0019, &gt;&gt; 4 = 1 bước × 62,5 ' +
               '= 62. Byte cao thật (0x19) rơi xuống 8 bit thấp và bị <code>&gt;&gt; 4</code> cắt gần hết, còn byte thấp ' +
               'thật (0x00) lên làm byte cao. Với một nhiệt độ có byte thấp khác 0, byte đó sẽ thành phần quyết định — con ' +
               'số nhảy lung tung, có thể âm. Driver vẫn \"chạy\". Loại lỗi này chỉ ' +
               'bắt được bằng một <b>giá trị biết trước</b>, và <code>i2c-stub</code> cho bạn đúng thứ đó: đặt giá trị ' +
               'vào thanh ghi, đọc qua driver, so sánh.' },

          { t: 'p', x:
            'Thay lại driver đúng, rồi thử lỗi thứ ba: khai cùng một địa chỉ hai lần.' },

          { t: 'code', where: 'qemu', code:
            'echo 0x48 > /sys/bus/i2c/devices/i2c-0/delete_device\n' +
            'rmmod ltemp\n' +
            'insmod /lib/modules/ltemp.ko\n' +
            'echo ltemp 0x48 > /sys/bus/i2c/devices/i2c-0/new_device\n' +
            'echo ltemp 0x48 > /sys/bus/i2c/devices/i2c-0/new_device; echo rc=$?' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # echo 0x48 > /sys/bus/i2c/devices/i2c-0/delete_device\n' +
            '[    8.798775] i2c i2c-0: delete_device: Deleting device ltemp at 0x48\n' +
            '[    8.800127] ltemp 0-0048: remove after 2 reads\n' +
            '~ # rmmod ltemp\n' +
            '~ # insmod /lib/modules/ltemp.ko\n' +
            '~ # echo ltemp 0x48 > /sys/bus/i2c/devices/i2c-0/new_device\n' +
            '[   10.904497] ltemp 0-0048: ltemp at 0x48 on "SMBus stub driver": conf 0x60a0, 25000 mdeg\n' +
            '[   10.905020] i2c i2c-0: new_device: Instantiated device ltemp at 0x48\n' +
            '~ # echo ltemp 0x48 > /sys/bus/i2c/devices/i2c-0/new_device; echo rc=$?\n' +
            '[   11.603987] i2c i2c-0: Failed to register i2c client ltemp at 0x48 (-16)\n' +
            'sh: write error: Device or resource busy\n' +
            'rc=1' },

          { t: 'p', x:
            '<code>delete_device</code> gỡ client, và vì thế gọi <code>lt_remove()</code>: <code>remove after 2 reads</code> ' +
            '(probe + một <code>cat</code>). Sau đó driver đúng cho lại <code>25000 mdeg</code> ở lần đầu. Lần hai: ' +
            '<b><code>-16</code></b> = <code>-EBUSY</code>, in từ <code>i2c-core-base.c:1038</code> sau khi ' +
            '<code>i2c_check_addr_busy()</code> thấy 0x48 đã có chủ. Một địa chỉ, một client — luật vật lý của I2C ' +
            '(hai chip cùng địa chỉ sẽ cùng trả lời và làm hỏng dữ liệu của nhau) được i2c-core áp ngay trong phần mềm. ' +
            'Lỗi thứ tư — khai một địa chỉ không có chip:' },

          { t: 'code', where: 'qemu', code:
            'echo ltemp 0x49 > /sys/bus/i2c/devices/i2c-0/new_device\n' +
            'ls /sys/bus/i2c/devices\n' +
            'ls /sys/bus/i2c/devices/0-0049\n' +
            'echo 0x49 > /sys/bus/i2c/devices/i2c-0/delete_device' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # echo ltemp 0x49 > /sys/bus/i2c/devices/i2c-0/new_device\n' +
            '[   12.309194] ltemp 0-0049: error -ENODEV: no answer at 0x49\n' +
            '[   12.312072] i2c i2c-0: new_device: Instantiated device ltemp at 0x49\n' +
            '~ # ls /sys/bus/i2c/devices\n' +
            '0-0048  0-0049  i2c-0\n' +
            '~ # ls /sys/bus/i2c/devices/0-0049\n' +
            'modalias   name       power      subsystem  uevent\n' +
            '~ # echo 0x49 > /sys/bus/i2c/devices/i2c-0/delete_device\n' +
            '[   14.410780] i2c i2c-0: delete_device: Deleting device ltemp at 0x49\n' +
            '' },

          { t: 'cal', kind: 'why', title: '\"Instantiated\" ngay sau \"no answer\": client tồn tại, chỉ không có driver',
            x: 'Hai dòng tưởng mâu thuẫn. <code>lt_probe</code> thất bại ở giao dịch đầu tiên (stub trả ' +
               '<code>-ENODEV</code> cho địa chỉ không có chip) và <code>dev_err_probe</code> in lý do. Nhưng ' +
               '<b>client</b> <code>0-0049</code> vẫn được tạo — i2c-core không hỏi bus trước khi tạo, nó tin lời khai. ' +
               'Thư mục <code>0-0049</code> không có <code>driver</code>, <code>temp_mdeg</code> hay <code>reads</code>: ' +
               'không driver nào nhận nó. Không có dòng <code>probe with driver … failed</code>: driver core im lặng với ' +
               '<code>-ENODEV</code> (mục 2) — nếu <code>lt_probe</code> không tự in, bạn sẽ không thấy gì. Trên bus ' +
               'thật mã sẽ là <code>-ENXIO</code>, bước 5 cho thấy.' },

          { t: 'p', x:
            'Cuối cùng, đem một driver <b>thật</b> của kernel tới chip thứ hai. <code>tmp102.ko</code> đã build sẵn từ ' +
            'Bài 40. Lần đầu, cố tình <b>không</b> chuẩn bị thanh ghi:' },

          { t: 'code', where: 'qemu', code:
            'insmod /lib/modules/tmp102.ko\n' +
            'echo tmp102 0x4a > /sys/bus/i2c/devices/i2c-0/new_device\n' +
            'i2cget -y 0 0x4a 0x01 w' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /lib/modules/tmp102.ko\n' +
            '~ # echo tmp102 0x4a > /sys/bus/i2c/devices/i2c-0/new_device\n' +
            '[   15.818778] tmp102 0-004a: unexpected config register value\n' +
            '[   15.819295] i2c i2c-0: new_device: Instantiated device tmp102 at 0x4a\n' +
            '~ # i2cget -y 0 0x4a 0x01 w\n' +
            '0x0000' },

          { t: 'p', x:
            '<code>unexpected config register value</code>: <code>tmp102_probe()</code> đọc thanh ghi 0x01 và kiểm tra ' +
            'hai bit R1:R0 (độ phân giải, <b>chỉ đọc</b>, luôn là <code>11</code> trên TMP102 thật) có đúng như ' +
            'datasheet không. Stub trả <code>0x0000</code> — không phải TMP102 — nên driver từ chối bằng ' +
            '<code>-ENODEV</code>. Đây là cách driver thật phòng thủ: một chip khác tình cờ ngồi ở 0x4a sẽ không bị ' +
            'ghi bậy vào thanh ghi. Và <code>i2cget</code> không bị <code>EBUSY</code>, vì client <code>0-004a</code> ' +
            'không có driver giữ. Chuẩn bị như một TMP102 thật rồi khai lại:' },

          { t: 'code', where: 'qemu', code:
            'echo 0x4a > /sys/bus/i2c/devices/i2c-0/delete_device\n' +
            'i2cset -y 0 0x4a 0x01 0xa060 w\n' +
            'i2cset -y 0 0x4a 0x00 0x0019 w\n' +
            'echo tmp102 0x4a > /sys/bus/i2c/devices/i2c-0/new_device\n' +
            'cat /sys/class/hwmon/hwmon0/name /sys/class/hwmon/hwmon0/temp1_input\n' +
            'i2cget -f -y 0 0x4a 0x01 w' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # echo tmp102 0x4a > /sys/bus/i2c/devices/i2c-0/new_device\n' +
            '[   19.336453] tmp102 0-004a: initialized\n' +
            '[   19.336928] i2c i2c-0: new_device: Instantiated device tmp102 at 0x4a\n' +
            '~ # cat /sys/class/hwmon/hwmon0/name /sys/class/hwmon/hwmon0/temp1_input\n' +
            'tmp102\n' +
            '50000\n' +
            '~ # i2cget -f -y 0 0x4a 0x01 w\n' +
            '0xb062' },

          { t: 'cal', kind: 'why', title: '50000, không phải 25000 — vì tmp102 đã ghi vào chip',
            x: 'Driver thật chạy và đăng ký một thiết bị <b>hwmon</b> (<code>/sys/class/hwmon/hwmon0</code>) — giao diện ' +
               'chuẩn mà <code>sensors</code> và các công cụ giám sát đọc. Nhưng nó báo <b>50 000</b>. Lý do nằm ở ' +
               '<code>0xb062</code>: trong <code>probe</code>, tmp102 <b>ghi</b> cấu hình mới — bật bit <b>EM</b> ' +
               '(<i>extended mode</i>, 0x0010) và TM (0x0200), <code>TMP102_CONFIG_SET</code> ở <code>tmp102.c:50</code>. ' +
               'Đọc theo SMBus, 0xb062 là byte 0x62 rồi 0xB0 trên dây, tức 0x62B0 theo thứ tự của TMP102 = 0x60A0 | 0x0200 ' +
               '| 0x0010. Vì driver luôn bật extended mode, nó luôn đọc nhiệt độ theo định dạng 13 bit: ' +
               '<code>tmp102_reg_to_mC()</code> tính <code>val × 1000 / 128</code>, nên 0x1900 = 6400 thành 6400 × 1000 / ' +
               '128 = 50 000 — gấp đôi, vì định dạng 12 bit bạn ghi vào có 1 bit ít hơn. Chip thật sẽ tự ' +
               'chuyển số đo sang định dạng 13 bit ngay khi EM bật; stub chỉ là một mảng ' +
               'nhớ, không biết gì về EM. Bài học không phải về TMP102 mà về giới hạn của mô hình giả: <b>stub trả lời ' +
               'được mọi giao dịch, nhưng không có hành vi</b>. Bước 5 dùng một adapter giả tự viết, trả lời như chip ' +
               'lúc mới bật nguồn — và tmp102 vẫn ra 50 000 vì cùng lý do.' },

          { t: 'p', x:
            'Tắt máy ảo bằng <code>poweroff -f</code>.' }
        ] },

      /* ---------------- BƯỚC 5 ---------------- */
      { title: 'Bước 5 — Adapter khai trong Device Tree: client tự sinh ra từ node con',
        blocks: [
          { t: 'p', x:
            'Bước 3 khai chip bằng tay. Trên bo mạch thật không ai gõ <code>new_device</code>: bo mạch có một node ' +
            'controller I2C trong DT với các node con, và driver của controller làm phần còn lại. Để làm đúng như thế ' +
            'trên <code>virt</code>, bạn cần một adapter <b>có node DT</b> — việc <code>i2c-stub</code> không làm được. ' +
            '<code>i2csim</code> là adapter đó, viết theo đúng khuôn một driver adapter thật, chỉ khác là \"thanh ghi\" ' +
            'là một mảng:' },

          { t: 'code', where: 'file', name: '~/bai58/i2csim/i2csim.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/*\n' +
            ' * Simulated SMBus controller ("learn,i2c-sim") for machines with no I2C bus.\n' +
            ' * Each address listed in "learn,sim-addrs" answers like a TMP102:\n' +
            ' * 16-bit registers, reg 0x00 = 25.0 C, reg 0x01 = 0x60a0 (power-on config).\n' +
            ' * Plays the role of the SoC vendor\'s adapter driver: clients never see it.\n' +
            ' */\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/platform_device.h>\n' +
            '#include <linux/i2c.h>\n' +
            '#include <linux/of.h>\n' +
            '\n' +
            '#define SIM_MAX_CHIPS	4\n' +
            '\n' +
            'struct sim_chip {\n' +
            '	u16 addr;\n' +
            '	u16 regs[256];                  /* stored MSB first, as on the wire */\n' +
            '};\n' +
            '\n' +
            'struct sim_bus {\n' +
            '	struct i2c_adapter adap;\n' +
            '	int nchips;\n' +
            '	struct sim_chip chips[SIM_MAX_CHIPS];\n' +
            '};\n' +
            '\n' +
            'static struct sim_chip *sim_find(struct sim_bus *bus, u16 addr)\n' +
            '{\n' +
            '	int i;\n' +
            '\n' +
            '	for (i = 0; i < bus->nchips; i++)\n' +
            '		if (bus->chips[i].addr == addr)\n' +
            '			return &bus->chips[i];\n' +
            '	return NULL;\n' +
            '}\n' +
            '\n' +
            'static int sim_smbus_xfer(struct i2c_adapter *adap, u16 addr,\n' +
            '			  unsigned short flags, char read_write, u8 command,\n' +
            '			  int size, union i2c_smbus_data *data)\n' +
            '{\n' +
            '	struct sim_bus *bus = i2c_get_adapdata(adap);\n' +
            '	struct sim_chip *chip = sim_find(bus, addr);\n' +
            '\n' +
            '	if (!chip)\n' +
            '		return -ENXIO;          /* nobody pulled SDA low: no ACK */\n' +
            '\n' +
            '	switch (size) {\n' +
            '	case I2C_SMBUS_QUICK:\n' +
            '		return 0;\n' +
            '	case I2C_SMBUS_BYTE_DATA:\n' +
            '		if (read_write == I2C_SMBUS_READ)\n' +
            '			data->byte = chip->regs[command] >> 8;\n' +
            '		else\n' +
            '			chip->regs[command] = data->byte << 8;\n' +
            '		return 0;\n' +
            '	case I2C_SMBUS_WORD_DATA:\n' +
            '		/* SMBus words travel low byte first; TMP102 sends MSB first */\n' +
            '		if (read_write == I2C_SMBUS_READ)\n' +
            '			data->word = swab16(chip->regs[command]);\n' +
            '		else\n' +
            '			chip->regs[command] = swab16(data->word);\n' +
            '		return 0;\n' +
            '	default:\n' +
            '		return -EOPNOTSUPP;\n' +
            '	}\n' +
            '}\n' +
            '\n' +
            'static u32 sim_functionality(struct i2c_adapter *adap)\n' +
            '{\n' +
            '	return I2C_FUNC_SMBUS_QUICK | I2C_FUNC_SMBUS_BYTE_DATA |\n' +
            '	       I2C_FUNC_SMBUS_WORD_DATA;\n' +
            '}\n' +
            '\n' +
            'static const struct i2c_algorithm sim_algo = {\n' +
            '	.smbus_xfer    = sim_smbus_xfer,\n' +
            '	.functionality = sim_functionality,\n' +
            '};\n' +
            '\n' +
            'static int sim_probe(struct platform_device *pdev)\n' +
            '{\n' +
            '	struct device *dev = &pdev->dev;\n' +
            '	struct sim_bus *bus;\n' +
            '	u32 addrs[SIM_MAX_CHIPS];\n' +
            '	int i, n;\n' +
            '\n' +
            '	bus = devm_kzalloc(dev, sizeof(*bus), GFP_KERNEL);\n' +
            '	if (!bus)\n' +
            '		return -ENOMEM;\n' +
            '\n' +
            '	n = of_property_read_variable_u32_array(dev->of_node, "learn,sim-addrs",\n' +
            '						addrs, 1, SIM_MAX_CHIPS);\n' +
            '	if (n < 0)\n' +
            '		return dev_err_probe(dev, n, "learn,sim-addrs\\n");\n' +
            '	for (i = 0; i < n; i++) {\n' +
            '		bus->chips[i].addr = addrs[i];\n' +
            '		bus->chips[i].regs[0x00] = 0x1900;      /* 25.0 C */\n' +
            '		bus->chips[i].regs[0x01] = 0x60a0;\n' +
            '	}\n' +
            '	bus->nchips = n;\n' +
            '\n' +
            '	bus->adap.owner = THIS_MODULE;\n' +
            '	bus->adap.algo = &sim_algo;\n' +
            '	bus->adap.dev.parent = dev;\n' +
            '	bus->adap.dev.of_node = dev->of_node;   /* lets the core find our children */\n' +
            '	strscpy(bus->adap.name, "learn i2c-sim", sizeof(bus->adap.name));\n' +
            '	i2c_set_adapdata(&bus->adap, bus);\n' +
            '\n' +
            '	dev_info(dev, "%d simulated chip(s), first at 0x%02x\\n", n, addrs[0]);\n' +
            '	return devm_i2c_add_adapter(dev, &bus->adap);\n' +
            '}\n' +
            '\n' +
            'static const struct of_device_id sim_of_match[] = {\n' +
            '	{ .compatible = "learn,i2c-sim" },\n' +
            '	{ }\n' +
            '};\n' +
            'MODULE_DEVICE_TABLE(of, sim_of_match);\n' +
            '\n' +
            'static struct platform_driver sim_driver = {\n' +
            '	.driver = {\n' +
            '		.name = "i2csim",\n' +
            '		.of_match_table = sim_of_match,\n' +
            '	},\n' +
            '	.probe = sim_probe,\n' +
            '};\n' +
            'module_platform_driver(sim_driver);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_DESCRIPTION("Simulated SMBus controller with TMP102-like chips");' },

          { t: 'table',
            head: ['Phần', 'Vai trò trên phần cứng thật'],
            rows: [
              ['<code>sim_smbus_xfer()</code>', 'Chỗ một driver thật ghi byte địa chỉ vào thanh ghi của khối I2C, chờ ngắt ACK/NACK, đọc byte về. Ở đây: tìm chip trong mảng, <code>-ENXIO</code> nếu không có — đúng mã một adapter thật trả khi không ai ACK'],
              ['<code>swab16()</code> khi đọc/ghi word', 'Chip giả lưu thanh ghi theo thứ tự của TMP102 (byte cao trước) và trả theo quy ước SMBus — để driver client phải dùng <code>_swapped</code> như với chip thật'],
              ['<code>sim_functionality()</code>', 'Khai những kiểu giao dịch adapter làm được. Không khai <code>I2C_FUNC_I2C</code> (giao dịch I2C thô) hay <code>SMBUS_BYTE</code> — <code>i2cdetect</code> sẽ cảnh báo về điều này'],
              ['<code>adap.dev.of_node = dev-&gt;of_node</code>', '<b>Dòng quan trọng nhất.</b> Nối adapter với node DT; nhờ nó <code>of_i2c_register_devices()</code> biết đi qua node con nào'],
              ['<code>devm_i2c_add_adapter()</code>', 'Đăng ký adapter; bản <code>devm_</code> tự gỡ khi thiết bị unbind (Bài 54). Mọi client con được tạo <b>bên trong</b> lời gọi này'],
              ['<code>learn,sim-addrs</code>', 'Thuộc tính riêng của adapter giả: chip nào \"hàn\" trên bus. Nó mô tả phần cứng giả, không liên quan tới node con — node con mô tả chip mà <i>bo mạch hứa</i> có']
            ] },

          { t: 'p', x:
            'Cây DT cho cả bước này và bước 6: include <code>virt.dts</code> đã dump ở bước 1, thêm một adapter I2C với ' +
            'ba node con và một controller SPI với hai node con. Để ý <code>sim-addrs</code> chỉ có 0x48 và 0x4a, trong ' +
            'khi có node con ở 0x49 — một chip bo mạch hứa nhưng không hàn:' },

          { t: 'code', where: 'file', name: '~/bai58/buses.dts', code:
            '/include/ "virt.dts"\n' +
            '\n' +
            '/ {\n' +
            '	i2c-sim {\n' +
            '		compatible = "learn,i2c-sim";\n' +
            '		learn,sim-addrs = <0x48 0x4a>;\n' +
            '		#address-cells = <1>;\n' +
            '		#size-cells = <0>;\n' +
            '\n' +
            '		sensor@48 {\n' +
            '			compatible = "learn,ltemp";\n' +
            '			reg = <0x48>;\n' +
            '		};\n' +
            '\n' +
            '		sensor@49 {\n' +
            '			compatible = "learn,ltemp";\n' +
            '			reg = <0x49>;\n' +
            '		};\n' +
            '\n' +
            '		sensor@4a {\n' +
            '			compatible = "ti,tmp102";\n' +
            '			reg = <0x4a>;\n' +
            '		};\n' +
            '	};\n' +
            '\n' +
            '	spi-loop {\n' +
            '		compatible = "learn,spi-loopback";\n' +
            '		#address-cells = <1>;\n' +
            '		#size-cells = <0>;\n' +
            '\n' +
            '		client@0 {\n' +
            '			compatible = "learn,lspi";\n' +
            '			reg = <0>;\n' +
            '			spi-max-frequency = <1000000>;\n' +
            '		};\n' +
            '\n' +
            '		dac@1 {\n' +
            '			compatible = "rohm,dh2228fv";\n' +
            '			reg = <1>;\n' +
            '			spi-max-frequency = <500000>;\n' +
            '		};\n' +
            '	};\n' +
            '};' },

          { t: 'p', x:
            'Hai node gốc đặt tên không có <code>@địa_chỉ</code> vì chúng không có <code>reg</code> — một controller thật ' +
            'sẽ có <code>reg</code> trỏ vào thanh ghi MMIO của nó và tên kiểu <code>i2c@3f804000</code>. ' +
            '<code>ti,tmp102</code> ở 0x4a là <code>compatible</code> thật trong <code>tmp102_of_match</code> ' +
            '(<code>tmp102.c:320</code>). <code>rohm,dh2228fv</code> ở CS 1 là một chip DAC có trong bảng của ' +
            '<code>spidev</code> — bước 6 giải thích vì sao chọn nó. Build ba module và cây, rồi dựng lại initramfs:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai58\n' +
            'for d in i2csim spiloop lspi; do mkdir -p $d; sed "s/vgchip/$d/" ~/bai57/vgchip/Makefile > $d/Makefile; done\n' +
            'for d in i2csim spiloop lspi; do (cd $d && make 2>&1 | grep -E \'LD|warning|error\'); done\n' +
            'dtc -I dts -O dtb -o buses.dtb buses.dts 2>&1 | grep -v \'^virt.dts\'\n' +
            'ls -l buses.dtb\n' +
            'rm -f initramfs/lib/modules/*\n' +
            'cp i2csim/i2csim.ko ltemp/ltemp.ko spiloop/spiloop.ko lspi/lspi.ko initramfs/lib/modules/\n' +
            'cp ~/bai38/linux-6.18.45/drivers/hwmon/tmp102.ko ~/bai38/linux-6.18.45/drivers/spi/spidev.ko initramfs/lib/modules/\n' +
            'aarch64-linux-gnu-strip --strip-debug initramfs/lib/modules/*.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            '  LD [M]  i2csim.ko\n' +
            '  LD [M]  spiloop.ko\n' +
            '  LD [M]  lspi.ko\n' +
            '-rw-r--r-- 1 cah8hc cah8hc 8080 Sep 30 17:32 buses.dtb' },

          { t: 'p', x:
            'Ba dòng <code>LD [M]</code> và không một <code>warning</code> nào: cả ba module build sạch. ' +
            '<code>grep -v</code> lọc bảy cảnh báo cũ của <code>virt.dts</code> mà Bài 45 đã giải thích, nên mọi dòng còn ' +
            'lại sẽ là của phần bạn thêm — và <b>không còn dòng nào</b>: <code>dtc</code> không phàn nàn gì về hai bus. ' +
            'Nếu bạn đặt tên node gốc kiểu <code>i2c@c000000</code> mà không có <code>reg</code>, sẽ có thêm cảnh báo ' +
            '<code>unit_address_vs_reg</code> — người viết đã gặp đúng điều này ở bản đầu. <code>buses.dtb</code> ' +
            '<b>8 080 B</b>, xa giới hạn 2 MiB của Bài 45.' },

          { t: 'code', where: 'wsl', code:
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)\n' +
            'qemu-system-aarch64 -M virt -cpu cortex-a57 -smp 2 -m 512 -nographic \\\n' +
            '  -kernel ~/bai38/linux-6.18.45/arch/arm64/boot/Image \\\n' +
            '  -initrd initramfs.cpio.gz -dtb buses.dtb \\\n' +
            '  -append "console=ttyAMA0 rdinit=/init"' },

          { t: 'p', x:
            'Trong máy ảo, trước khi nạp gì: node bus có thành platform device không, và bus I2C có gì?' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'ls /sys/bus/platform/devices | grep -E \'sim|loop\'\n' +
            'ls /sys/bus/i2c/devices' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ls /sys/bus/platform/devices | grep -E \'sim|loop\'\n' +
            'i2c-sim\n' +
            'spi-loop\n' +
            '~ # ls /sys/bus/i2c/devices\n' +
            '~ # ' },

          { t: 'p', x:
            'Hai node gốc đã là platform device (tên = tên node, vì không có <code>reg</code> để ghép như ' +
            '<code>b000000.sensor</code> ở Bài 54). Bus I2C rỗng: <b>chưa có adapter, nên ba node con chưa là gì cả</b>. ' +
            'Nạp driver adapter:' },

          { t: 'code', where: 'qemu', code:
            'insmod /lib/modules/i2csim.ko\n' +
            'ls /sys/bus/i2c/devices\n' +
            'cat /sys/bus/i2c/devices/i2c-0/name\n' +
            'cat /sys/bus/i2c/devices/0-0048/modalias\n' +
            'readlink /sys/bus/i2c/devices/0-0048/of_node\n' +
            'i2cdetect -y 0 0x48 0x4b' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /lib/modules/i2csim.ko\n' +
            '[    5.893330] i2csim: loading out-of-tree module taints kernel.\n' +
            '[    5.898334] i2csim i2c-sim: 2 simulated chip(s), first at 0x48\n' +
            '~ # ls /sys/bus/i2c/devices\n' +
            '0-0048  0-0049  0-004a  i2c-0\n' +
            '~ # cat /sys/bus/i2c/devices/i2c-0/name\n' +
            'learn i2c-sim\n' +
            '~ # cat /sys/bus/i2c/devices/0-0048/modalias\n' +
            'of:NsensorT(null)Clearn,ltemp\n' +
            '~ # readlink /sys/bus/i2c/devices/0-0048/of_node\n' +
            '../../../../../firmware/devicetree/base/i2c-sim/sensor@48\n' +
            '~ # i2cdetect -y 0 0x48 0x4b\n' +
            'i2cdetect: warning: can\'t use SMBus receive byte command, will skip some addresses\n' +
            '     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f\n' +
            '00:                                                 \n' +
            '10:                                                 \n' +
            '20:                                                 \n' +
            '30:                                                 \n' +
            '40:                         48 -- 4a --             \n' +
            '50:                                                 \n' +
            '60:                                                 \n' +
            '70:                                                 ' },

          { t: 'cal', kind: 'why', title: 'Một insmod, bốn thiết bị: adapter và ba client từ ba node con',
            x: 'Không có một dòng <code>echo … new_device</code> nào, vậy mà <code>0-0048</code>, <code>0-0049</code>, ' +
               '<code>0-004a</code> xuất hiện cùng lúc với <code>i2c-0</code> — i2c-core đi qua node con ngay trong ' +
               '<code>devm_i2c_add_adapter()</code>. Ba điều chứng minh chúng đến từ DT: <code>modalias</code> giờ là ' +
               '<code>of:NsensorT(null)Clearn,ltemp</code> thay vì <code>i2c:ltemp</code> của bước 3 (N = tên node, ' +
               'T = <code>device_type</code>, C = <code>compatible</code>); <code>of_node</code> trỏ vào ' +
               '<code>/i2c-sim/sensor@48</code>; và client <b>0-0049</b> có mặt dù không chip nào ở đó — i2c-core tin ' +
               'lời DT, như tin lời <code>new_device</code>. <code>i2cdetect</code> xác nhận chỉ 0x48 và 0x4a trả lời. ' +
               'Nó cảnh báo <code>can\'t use SMBus receive byte</code> vì <code>sim_functionality()</code> không khai ' +
               'kiểu đó và phải dò bằng kiểu khác (quick) — đây là thông tin, không phải lỗi.' },

          { t: 'p', x:
            'Giờ nạp driver của client. <b>Cùng file <code>ltemp.ko</code> của bước 3</b>, không sửa gì, cộng ' +
            '<code>tmp102</code>:' },

          { t: 'code', where: 'qemu', code:
            'insmod /lib/modules/ltemp.ko\n' +
            'insmod /lib/modules/tmp102.ko\n' +
            'ls /sys/bus/i2c/drivers/ltemp\n' +
            'cat /sys/bus/i2c/devices/0-0048/temp_mdeg\n' +
            'cat /sys/class/hwmon/hwmon0/name /sys/class/hwmon/hwmon0/temp1_input\n' +
            'i2cdetect -y 0 0x48 0x4b | sed -n \'1p;6p\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /lib/modules/ltemp.ko\n' +
            '[   10.098669] ltemp 0-0048: ltemp at 0x48 on "learn i2c-sim": conf 0x60a0, 25000 mdeg\n' +
            '[   10.099184] ltemp 0-0049: error -ENXIO: no answer at 0x49\n' +
            '~ # insmod /lib/modules/tmp102.ko\n' +
            '[   10.804394] hwmon hwmon0: temp1_input not attached to any thermal zone\n' +
            '[   10.804576] tmp102 0-004a: initialized\n' +
            '~ # ls /sys/bus/i2c/drivers/ltemp\n' +
            '0-0048  bind    module  uevent  unbind\n' +
            '~ # cat /sys/bus/i2c/devices/0-0048/temp_mdeg\n' +
            '25000\n' +
            '~ # cat /sys/class/hwmon/hwmon0/name /sys/class/hwmon/hwmon0/temp1_input\n' +
            'tmp102\n' +
            '50000\n' +
            '~ # i2cdetect -y 0 0x48 0x4b | sed -n \'1p;6p\'\n' +
            'i2cdetect: warning: can\'t use SMBus receive byte command, will skip some addresses\n' +
            '     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f\n' +
            '40:                         UU -- UU --             ' },

          { t: 'p', x:
            'Đọc từng dòng. Một <code>insmod ltemp.ko</code> sinh <b>hai</b> lời gọi <code>probe()</code> — một cho mỗi ' +
            'node con có <code>compatible = \"learn,ltemp\"</code> (\"module một lần, thiết bị mỗi lần\", Bài 54). ' +
            '<code>0-0048</code>: <code>25000 mdeg</code>, lần này tên adapter là <code>learn i2c-sim</code> và không ' +
            'cần ghi trước thanh ghi — chip giả của <code>i2csim</code> bật lên đã là 25 °C. <code>0-0049</code>: ' +
            '<b><code>-ENXIO</code></b>, không phải <code>-ENODEV</code> như stub — adapter viết theo chuẩn trả đúng ' +
            'mã \"không ai ACK\" (bảng ở mục 2). Thư mục driver chỉ liệt kê <code>0-0048</code>. tmp102 ra 50 000 vì ' +
            'cùng lý do đã giải thích ở bước 4: nó bật extended mode, chip giả không đổi định dạng theo. Dòng ' +
            '<code>not attached to any thermal zone</code> là thông tin của hwmon, không phải lỗi. Cả hai địa chỉ có ' +
            'driver giờ là <code>UU</code>.' },

          { t: 'p', x:
            'Cuối cùng, gỡ adapter trong khi client còn đang bound:' },

          { t: 'code', where: 'qemu', code:
            'rmmod i2csim\n' +
            'ls /sys/bus/i2c/devices\n' +
            'lsmod' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # rmmod i2csim\n' +
            '[   14.312181] ltemp 0-0048: remove after 2 reads\n' +
            '~ # ls /sys/bus/i2c/devices\n' +
            '~ # lsmod\n' +
            'Module                  Size  Used by    Tainted: G  \n' +
            'tmp102                 12288  0 \n' +
            'ltemp                  12288  0 \n' +
            '' },

          { t: 'cal', kind: 'info', title: 'Adapter đi thì client đi theo — driver ở lại',
            x: '<code>rmmod i2csim</code> không bị từ chối dù còn hai client đang có driver: gỡ adapter kéo theo gỡ mọi ' +
               'client con, và mỗi client bị gỡ thì <code>remove()</code> của driver nó chạy — <code>remove after 2 ' +
               'reads</code> (probe + một <code>cat</code>). <code>/sys/bus/i2c/devices</code> rỗng hoàn toàn. Nhưng ' +
               '<code>ltemp</code> và <code>tmp102</code> vẫn nằm trong <code>lsmod</code> với <code>Used by 0</code>: ' +
               'driver là module, thiết bị là thứ khác. <code>insmod i2csim.ko</code> lần nữa sẽ tạo lại ba client và ' +
               'hai driver đang chờ sẵn sẽ tự probe. Đây là cách một controller I2C trên thẻ cắm USB hoạt động: rút ' +
               'thẻ, mọi cảm biến sau nó biến mất; cắm lại, chúng về.' },

          { t: 'p', x:
            'Lỗi DT hay gặp nhất với bus là quên <code>reg</code> ở node con. Tắt máy ảo và tạo <code>bad.dts</code>: chỉ ' +
            'phần I2C của <code>buses.dts</code>, một node con, <b>không có <code>reg</code></b>:' },

          { t: 'code', where: 'file', name: '~/bai58/bad.dts', code:
            '/include/ "virt.dts"\n' +
            '\n' +
            '/ {\n' +
            '	i2c-sim {\n' +
            '		compatible = "learn,i2c-sim";\n' +
            '		learn,sim-addrs = <0x48>;\n' +
            '		#address-cells = <1>;\n' +
            '		#size-cells = <0>;\n' +
            '\n' +
            '		sensor@48 {\n' +
            '			compatible = "learn,ltemp";\n' +
            '		};\n' +
            '	};\n' +
            '};' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai58\n' +
            'dtc -I dts -O dtb -o bad.dtb bad.dts 2>&1 | grep -v \'^virt.dts\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            'bad.dts:10.13-12.5: Warning (unit_address_vs_reg): /i2c-sim/sensor@48: node has a unit name, but no reg property\n' +
            'bad.dts:4.10-13.4: Warning (avoid_unnecessary_addr_size): /i2c-sim: unnecessary #address-cells/#size-cells without "ranges" or child "reg" property' },

          { t: 'p', x:
            '<code>dtc</code> nhận ra: <code>sensor@48</code> có tên kèm địa chỉ mà không có <code>reg</code>, và ' +
            '<code>#address-cells</code> của <code>i2c-sim</code> thành vô dụng vì không con nào có <code>reg</code>. ' +
            'Nhưng đó chỉ là cảnh báo; file vẫn được tạo (Bài 43). Boot với <code>-dtb bad.dtb</code> thay cho ' +
            '<code>buses.dtb</code> (còn lại như lệnh boot ở trên):' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'insmod /lib/modules/i2csim.ko\n' +
            'ls /sys/bus/i2c/devices' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /lib/modules/i2csim.ko\n' +
            '[    4.554245] i2csim: loading out-of-tree module taints kernel.\n' +
            '[    4.558384] i2csim i2c-sim: 1 simulated chip(s), first at 0x48\n' +
            '[    4.559957] i2c i2c-0: of_i2c: invalid reg on /i2c-sim/sensor@48\n' +
            '[    4.560067] i2c i2c-0: Failed to create I2C device for /i2c-sim/sensor@48\n' +
            '~ # ls /sys/bus/i2c/devices\n' +
            'i2c-0' },

          { t: 'p', x:
            'Lần này lỗi đến từ <b>i2c-core</b>, không phải driver của bạn: <code>of_i2c_get_board_info()</code> ' +
            '(<code>i2c-core-of.c:37</code>) không đọc được địa chỉ và bỏ qua node. Adapter vẫn lên, nhưng không có ' +
            'client nào — driver cảm biến có nạp cũng không bao giờ được gọi. Khác với địa chỉ sai (client tạo ra rồi ' +
            'probe thất bại), thiếu <code>reg</code> là client <b>không bao giờ tồn tại</b>. Tắt máy ảo.' }
        ] },

      /* ---------------- BƯỚC 6 ---------------- */
      { title: 'Bước 6 — SPI: controller loopback, spi_driver, và spidev từ userspace',
        blocks: [
          { t: 'p', x:
            'Phía SPI dùng cùng cây <code>buses.dtb</code>. Controller giả <code>spiloop</code> nối MOSI vào MISO: mọi ' +
            'byte gửi đi quay về nguyên vẹn. Đó chính là cách kiểm tra một controller SPI thật trên bàn thí nghiệm — hàn ' +
            'một sợi dây nối hai chân — nên đầu ra dễ đoán, và mọi chỗ lệch khỏi dự đoán đều là bài học:' },

          { t: 'code', where: 'file', name: '~/bai58/spiloop/spiloop.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/*\n' +
            ' * Simulated SPI controller ("learn,spi-loopback"): MOSI is wired to MISO,\n' +
            ' * so every byte clocked out comes straight back in.\n' +
            ' * Plays the role of the SoC vendor\'s controller driver.\n' +
            ' */\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/platform_device.h>\n' +
            '#include <linux/spi/spi.h>\n' +
            '#include <linux/of.h>\n' +
            '\n' +
            'static int loop_transfer_one(struct spi_controller *ctlr,\n' +
            '			     struct spi_device *spi, struct spi_transfer *t)\n' +
            '{\n' +
            '	if (t->rx_buf) {\n' +
            '		if (t->tx_buf)\n' +
            '			memcpy(t->rx_buf, t->tx_buf, t->len);\n' +
            '		else\n' +
            '			memset(t->rx_buf, 0xff, t->len);  /* idle MOSI is high */\n' +
            '	}\n' +
            '	dev_dbg(&ctlr->dev, "cs%d: %u bytes at %u Hz\\n",\n' +
            '		spi_get_chipselect(spi, 0), t->len, t->speed_hz);\n' +
            '	return 0;                               /* 0 = finished synchronously */\n' +
            '}\n' +
            '\n' +
            'static int loop_probe(struct platform_device *pdev)\n' +
            '{\n' +
            '	struct spi_controller *ctlr;\n' +
            '\n' +
            '	ctlr = devm_spi_alloc_host(&pdev->dev, 0);\n' +
            '	if (!ctlr)\n' +
            '		return -ENOMEM;\n' +
            '\n' +
            '	ctlr->dev.of_node = pdev->dev.of_node;  /* children = SPI devices */\n' +
            '	ctlr->bus_num = -1;\n' +
            '	ctlr->num_chipselect = 2;\n' +
            '	ctlr->mode_bits = SPI_CPOL | SPI_CPHA | SPI_CS_HIGH | SPI_LSB_FIRST;\n' +
            '	ctlr->bits_per_word_mask = SPI_BPW_MASK(8);\n' +
            '	ctlr->max_speed_hz = 50000000;\n' +
            '	ctlr->transfer_one = loop_transfer_one;\n' +
            '\n' +
            '	dev_info(&pdev->dev, "loopback controller, %d chip selects\\n",\n' +
            '		 ctlr->num_chipselect);\n' +
            '	return devm_spi_register_controller(&pdev->dev, ctlr);\n' +
            '}\n' +
            '\n' +
            'static const struct of_device_id loop_of_match[] = {\n' +
            '	{ .compatible = "learn,spi-loopback" },\n' +
            '	{ }\n' +
            '};\n' +
            'MODULE_DEVICE_TABLE(of, loop_of_match);\n' +
            '\n' +
            'static struct platform_driver loop_driver = {\n' +
            '	.driver = {\n' +
            '		.name = "spiloop",\n' +
            '		.of_match_table = loop_of_match,\n' +
            '	},\n' +
            '	.probe = loop_probe,\n' +
            '};\n' +
            'module_platform_driver(loop_driver);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_DESCRIPTION("Simulated SPI controller with MOSI wired to MISO");' },

          { t: 'p', x:
            '<code>transfer_one()</code> là toàn bộ \"phần cứng\": có cả <code>tx_buf</code> và <code>rx_buf</code> thì ' +
            'chép; chỉ có <code>rx_buf</code> (bên gửi là <code>NULL</code>) thì điền 0xFF — mức nghỉ của MOSI được kéo ' +
            'lên. <code>bus_num = -1</code> để spi core tự cấp số bus. <code>mode_bits</code> khai các chế độ controller ' +
            'chịu được; một thiết bị đòi chế độ không có trong đó sẽ bị spi core từ chối lúc thêm. Client ' +
            '<code>lspi</code> gửi cùng bốn byte theo hai cách để so sánh:' },

          { t: 'code', where: 'file', name: '~/bai58/lspi/lspi.c', lang: 'c', code:
            '// SPDX-License-Identifier: GPL-2.0\n' +
            '/*\n' +
            ' * SPI client driver ("learn,lspi"): at probe it sends the same 4 bytes twice,\n' +
            ' * once full duplex (one spi_transfer with tx and rx) and once half duplex\n' +
            ' * (spi_write_then_read), and prints what came back on MISO.\n' +
            ' */\n' +
            '#include <linux/module.h>\n' +
            '#include <linux/spi/spi.h>\n' +
            '#include <linux/of.h>\n' +
            '\n' +
            'static int lspi_probe(struct spi_device *spi)\n' +
            '{\n' +
            '	u8 tx[4] = { 0x9f, 0x01, 0x02, 0x03 };\n' +
            '	u8 rx[4] = { 0 };\n' +
            '	struct spi_transfer xfer = {\n' +
            '		.tx_buf = tx,\n' +
            '		.rx_buf = rx,\n' +
            '		.len    = sizeof(tx),\n' +
            '	};\n' +
            '	int ret;\n' +
            '\n' +
            '	dev_info(&spi->dev, "cs %d, mode 0x%x, %u Hz, %d bits per word\\n",\n' +
            '		 spi_get_chipselect(spi, 0), spi->mode, spi->max_speed_hz,\n' +
            '		 spi->bits_per_word);\n' +
            '\n' +
            '	/* full duplex: 4 clocks-worth of bytes, MOSI and MISO at the same time */\n' +
            '	ret = spi_sync_transfer(spi, &xfer, 1);\n' +
            '	if (ret)\n' +
            '		return dev_err_probe(&spi->dev, ret, "full duplex\\n");\n' +
            '	dev_info(&spi->dev, "full duplex rx %*ph\\n", 4, rx);\n' +
            '\n' +
            '	/* half duplex: send 1 command byte, then clock in 3 bytes */\n' +
            '	memset(rx, 0, sizeof(rx));\n' +
            '	ret = spi_write_then_read(spi, tx, 1, rx, 3);\n' +
            '	if (ret)\n' +
            '		return dev_err_probe(&spi->dev, ret, "write then read\\n");\n' +
            '	dev_info(&spi->dev, "write_then_read rx %*ph\\n", 3, rx);\n' +
            '	return 0;\n' +
            '}\n' +
            '\n' +
            'static const struct of_device_id lspi_of_match[] = {\n' +
            '	{ .compatible = "learn,lspi" },\n' +
            '	{ }\n' +
            '};\n' +
            'MODULE_DEVICE_TABLE(of, lspi_of_match);\n' +
            '\n' +
            'static const struct spi_device_id lspi_id[] = {\n' +
            '	{ "lspi" },\n' +
            '	{ }\n' +
            '};\n' +
            'MODULE_DEVICE_TABLE(spi, lspi_id);\n' +
            '\n' +
            'static struct spi_driver lspi_driver = {\n' +
            '	.driver = {\n' +
            '		.name = "lspi",\n' +
            '		.of_match_table = lspi_of_match,\n' +
            '	},\n' +
            '	.probe = lspi_probe,\n' +
            '	.id_table = lspi_id,\n' +
            '};\n' +
            'module_spi_driver(lspi_driver);\n' +
            '\n' +
            'MODULE_LICENSE("GPL");\n' +
            'MODULE_DESCRIPTION("SPI client that compares full and half duplex");' },

          { t: 'p', x:
            'Hai lời gọi, cùng một <code>tx[0]</code> = 0x9F (lệnh \"đọc ID\" của hầu hết chip flash SPI). ' +
            '<code>spi_sync_transfer</code> với một transfer có cả tx và rx: bốn byte ra, bốn byte vào <b>cùng lúc</b>. ' +
            '<code>spi_write_then_read(spi, tx, 1, rx, 3)</code>: hai transfer trong một message — 1 byte ra (rx ' +
            'NULL), rồi 3 byte vào (tx NULL). Dự đoán trước khi chạy: với dây loopback, mỗi cách sẽ nhận về gì?' },

          { t: 'p', x:
            'Initramfs đã có <code>spiloop.ko</code>, <code>lspi.ko</code>, <code>spidev.ko</code> từ bước 5. Thêm ' +
            '<code>spidev_test</code> — công cụ kiểm tra của kernel, nằm sẵn trong <code>tools/spi/</code> — build tĩnh ' +
            'cho ARM64:' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai58\n' +
            'aarch64-linux-gnu-gcc -O2 -static -Wall -I ~/bai38/linux-6.18.45/include/uapi \\\n' +
            '  -o spidev_test ~/bai38/linux-6.18.45/tools/spi/spidev_test.c\n' +
            'ls -l spidev_test\n' +
            'cp spidev_test initramfs/bin/ && aarch64-linux-gnu-strip initramfs/bin/spidev_test\n' +
            '(cd initramfs && find . | cpio -o -H newc | gzip -9 > ../initramfs.cpio.gz)' },

          { t: 'code', where: 'out', nocopy: true, code:
            'In file included from /home/cah8hc/bai38/linux-6.18.45/tools/spi/spidev_test.c:23:\n' +
            '/home/cah8hc/bai38/linux-6.18.45/include/uapi/linux/types.h:10:2: warning: #warning "Attempt to use kernel headers from user space, see https://kernelnewbies.org/KernelHeaders" [-Wcpp]\n' +
            '   10 | #warning "Attempt to use kernel headers from user space, see https://kernelnewbies.org/KernelHeaders"\n' +
            '      |  ^~~~~~~\n' +
            '-rwxr-xr-x 1 cah8hc cah8hc 689176 Sep 30 17:53 spidev_test\n' +
            '5165 blocks' },

          { t: 'cmdx', cmd: 'aarch64-linux-gnu-gcc -O2 -static -Wall -I ~/bai38/linux-6.18.45/include/uapi -o spidev_test …/spidev_test.c', rows: [
            ['-static', 'Initramfs không có thư viện C động (Bài 46)'],
            ['-I …/include/uapi', 'Dùng header uapi của <b>kernel 6.18</b> thay vì của gói <code>linux-libc-dev-arm64-cross</code> (5.4). Thiếu nó: <code>error: ‘SPI_TX_OCTAL’ undeclared</code> — hằng số mới hơn header 5.4, giống tình huống <code>GPIO_V2_*</code> ở Bài 57']
          ] },

          { t: 'p', x:
            'Cảnh báo <code>#warning</code> là header uapi thô tự nhắc rằng cách chuẩn là <code>make headers_install</code>; ' +
            'với một công cụ thử nghiệm thì bỏ qua được. Binary <b>689 176 B</b>. Boot lại với <code>-dtb buses.dtb</code> ' +
            '(cùng lệnh bước 5) và nạp controller:' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'insmod /lib/modules/spiloop.ko\n' +
            'ls /sys/bus/spi/devices /sys/class/spi_master\n' +
            'cat /sys/bus/spi/devices/spi0.0/modalias /sys/bus/spi/devices/spi0.1/modalias' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # insmod /lib/modules/spiloop.ko\n' +
            '[    4.581381] spiloop: loading out-of-tree module taints kernel.\n' +
            '[    4.585845] spiloop spi-loop: loopback controller, 2 chip selects\n' +
            '~ # ls /sys/bus/spi/devices /sys/class/spi_master\n' +
            '/sys/bus/spi/devices:\n' +
            'spi0.0  spi0.1\n' +
            '\n' +
            '/sys/class/spi_master:\n' +
            'spi0\n' +
            '~ # cat /sys/bus/spi/devices/spi0.0/modalias /sys/bus/spi/devices/spi0.1/modalias\n' +
            'spi:lspi\n' +
            'spi:dh2228fv' },

          { t: 'p', x:
            'Cùng cơ chế với I2C: controller đăng ký → spi core đọc hai node con → hai <code>spi_device</code> ra đời, ' +
            'tên <b><code>spi0.0</code></b> và <b><code>spi0.1</code></b> = controller <code>spi0</code> + chip select ' +
            '(chính là <code>reg</code> của node con). <code>modalias</code> có dạng <code>spi:</code> + phần sau dấu ' +
            'phẩy của <code>compatible</code> — không phải <code>of:…</code> như I2C — nên <code>id_table</code> của ' +
            'driver SPI phải có tên đó (mục 5). Nạp client:' },

          { t: 'code', where: 'qemu', code:
            'insmod /lib/modules/lspi.ko' },

          { t: 'code', where: 'out', nocopy: true, code:
            '[    6.696172] lspi spi0.0: cs 0, mode 0x0, 1000000 Hz, 8 bits per word\n' +
            '[    6.697859] lspi spi0.0: full duplex rx 9f 01 02 03\n' +
            '[    6.698233] lspi spi0.0: write_then_read rx ff ff ff' },

          { t: 'cal', kind: 'why', title: 'Cùng dây loopback, hai kết quả: 9f 01 02 03 và ff ff ff',
            x: 'Dòng đầu là những gì spi core đọc từ DT: CS 0 (<code>reg</code>), mode 0 (không có <code>spi-cpol</code>/' +
               '<code>spi-cpha</code>), <b>1 000 000 Hz</b> (<code>spi-max-frequency</code>), 8 bit mặc định. ' +
               '<b>Full duplex</b>: bốn byte ra MOSI, cùng bốn nhịp đó MISO mang về đúng bốn byte — dây loopback. ' +
               '<b>Write-then-read</b>: transfer đầu gửi 0x9F nhưng không có <code>rx_buf</code>, nên byte quay về bị bỏ; ' +
               'transfer thứ hai có <code>rx_buf</code> nhưng <b>không có gì để gửi</b>, controller đẩy mức nghỉ 0xFF, ' +
               'và loopback trả về đúng 0xFF. Trên một chip flash thật, ba byte đó sẽ là mã nhà sản xuất và mã chip — ' +
               'chip trả lời <i>sau</i> khi nhận lệnh, nên \"gửi rồi đọc\" là đúng kiểu. Nếu bạn dùng full duplex với chip ' +
               'đó, byte đầu nhận về sẽ là rác (chip chưa biết lệnh là gì khi byte lệnh đang được gửi). Đây là điều ' +
               'phải đọc trong datasheet: chip trả lời <b>cùng lúc</b> hay <b>sau</b> lệnh.' },

          { t: 'p', x:
            'Giờ đến userspace. <code>spi0.1</code> có <code>compatible = \"rohm,dh2228fv\"</code>, một mục trong bảng ' +
            'của <code>spidev</code>:' },

          { t: 'code', where: 'qemu', code:
            'insmod /lib/modules/spidev.ko\n' +
            'ls -l /dev/spidev*\n' +
            'readlink /sys/bus/spi/devices/spi0.1/driver\n' +
            'spidev_test -D /dev/spidev0.1 -p \'HELLO\' -v\n' +
            'spidev_test -D /dev/spidev0.1 -s 250000 -H -p \'ab\' -v' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # ls -l /dev/spidev*\n' +
            'crw-------    1 0        0         153,   0 Sep 30 10:32 /dev/spidev0.1\n' +
            '~ # readlink /sys/bus/spi/devices/spi0.1/driver\n' +
            '../../../../../../bus/spi/drivers/spidev\n' +
            '~ # spidev_test -D /dev/spidev0.1 -p \'HELLO\' -v\n' +
            'spi mode: 0x0\n' +
            'bits per word: 8\n' +
            'max speed: 500000 Hz (500 kHz)\n' +
            'TX | 48 45 4C 4C 4F __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __  |HELLO|\n' +
            'RX | 48 45 4C 4C 4F __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __  |HELLO|\n' +
            '~ # spidev_test -D /dev/spidev0.1 -s 250000 -H -p \'ab\' -v\n' +
            'spi mode: 0x1\n' +
            'bits per word: 8\n' +
            'max speed: 250000 Hz (250 kHz)\n' +
            'TX | 61 62 __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __  |ab|\n' +
            'RX | 61 62 __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __ __  |ab|' },

          { t: 'cmdx', cmd: 'spidev_test -D /dev/spidev0.1 -s 250000 -H -p \'ab\' -v', rows: [
            ['-D /dev/spidev0.1', 'Thiết bị: bus 0, chip select 1'],
            ['-s 250000', 'Tốc độ Hz cho lần trao đổi này. Mặc định là <code>max_speed_hz</code> của thiết bị (500 kHz, từ DT)'],
            ['-H', 'Bật CPHA → mode 1. Đổi <code>spi-&gt;mode</code> qua <code>ioctl(SPI_IOC_WR_MODE32)</code>'],
            ['-p \'ab\'', 'Chuỗi cần gửi (tối đa 32 byte hiển thị); thiếu <code>-p</code> nó gửi một mẫu cố định'],
            ['-v', 'In cả TX và RX dạng hex + ASCII']
          ] },

          { t: 'p', x:
            '<code>/dev/spidev0.1</code> có major <b>153</b> (<code>SPIDEV_MAJOR</code>), minor 0 — minor cấp theo thứ tự, ' +
            'không liên quan số CS; tên <code>spidev0.1</code> mới mang bus và CS. Chỉ <code>spi0.1</code> có node, vì ' +
            '<code>spi0.0</code> đã thuộc về <code>lspi</code> — một thiết bị, một driver, như I2C. <code>max speed: ' +
            '500000 Hz</code> đọc từ <code>spi-max-frequency</code> của <code>dac@1</code>. Loopback trả lại ' +
            '<code>HELLO</code> nguyên vẹn. Lần hai đổi tốc độ và mode 1 chỉ bằng cờ dòng lệnh; loopback không quan tâm ' +
            'mode — chip thật thì có. Ngày giờ trong <code>ls -l</code> sẽ khác trên máy bạn.' },

          { t: 'p', x:
            'Bây giờ cách sai mà nhiều hướng dẫn trên mạng dạy. Tắt máy ảo, tạo hai biến thể của <code>buses.dts</code> ' +
            'chỉ khác ở <code>compatible</code> của <code>dac@1</code>. Chúng nằm trong <code>v/</code>, nên đường dẫn ' +
            '<code>/include/</code> phải thêm <code>../</code> (Bài 56: đường dẫn tính từ thư mục của file):' },

          { t: 'code', where: 'wsl', code:
            'cd ~/bai58 && mkdir -p v\n' +
            'sed -e \'s/"rohm,dh2228fv";/"spidev";/\' -e \'s|"virt.dts"|"../virt.dts"|\' buses.dts > v/spidev1.dts\n' +
            'sed -e \'s/"rohm,dh2228fv";/"rohm,dh2228fv", "spidev";/\' -e \'s|"virt.dts"|"../virt.dts"|\' buses.dts > v/spidev2.dts\n' +
            'grep -n spidev v/spidev1.dts v/spidev2.dts\n' +
            'for n in 1 2; do dtc -q -I dts -O dtb -o v/spidev$n.dtb v/spidev$n.dts; done' },

          { t: 'code', where: 'out', nocopy: true, code:
            'v/spidev1.dts:38:\t\t\tcompatible = "spidev";\n' +
            'v/spidev2.dts:38:\t\t\tcompatible = "rohm,dh2228fv", "spidev";' },

          { t: 'p', x:
            'Boot hai lần, <code>-dtb v/spidev1.dtb</code> rồi <code>-dtb v/spidev2.dtb</code> (còn lại như lệnh bước 5), ' +
            'mỗi lần gõ:' },

          { t: 'code', where: 'qemu', code:
            'mount -t devtmpfs none /dev\n' +
            'insmod /lib/modules/spiloop.ko\n' +
            'insmod /lib/modules/spidev.ko\n' +
            'cat /sys/bus/spi/devices/spi0.1/modalias\n' +
            'ls /dev | grep spi' },

          { t: 'code', where: 'out', nocopy: true, name: 'spidev1.dtb rồi spidev2.dtb, bỏ dòng spiloop', code:
            '~ # insmod /lib/modules/spidev.ko\n' +
            '~ # cat /sys/bus/spi/devices/spi0.1/modalias\n' +
            'spi:spidev\n' +
            '~ # ls /dev | grep spi\n' +
            '~ # \n' +
            '------------------------------------------------------------\n' +
            '~ # insmod /lib/modules/spidev.ko\n' +
            '[    5.292685] spidev spi0.1: spidev listed directly in DT is not supported\n' +
            '[    5.292822] spidev spi0.1: probe with driver spidev failed with error -22\n' +
            '~ # cat /sys/bus/spi/devices/spi0.1/modalias\n' +
            'spi:dh2228fv\n' +
            '~ # ls /dev | grep spi\n' +
            '~ # ' },

          { t: 'p', x:
            'Hai lần boot, hai kiểu thất bại khác hẳn nhau — và lần đầu còn tệ hơn vì <b>không có gì để đọc</b>. Tóm ' +
            'lại cùng với cách đúng:' },

          { t: 'table',
            head: ['<code>compatible</code> của <code>dac@1</code>', '<code>modalias</code>', 'Kết quả'],
            rows: [
              ['<code>\"spidev\"</code>', '<code>spi:spidev</code>', '<b>Không một dòng log nào</b>, không có <code>/dev/spidev0.1</code>. spidev không có <code>of_match</code> nào khớp chữ <code>spidev</code>, còn <code>id_table</code> của nó không chứa <code>\"spidev\"</code> → không bao giờ probe'],
              ['<code>\"rohm,dh2228fv\", \"spidev\"</code>', '<code>spi:dh2228fv</code>', 'Khớp mục đầu, probe chạy, rồi <code>spidev_of_check()</code> thấy chữ <code>spidev</code>: <code>spidev spi0.1: spidev listed directly in DT is not supported</code> + <code>probe with driver spidev failed with error -22</code>'],
              ['<code>\"rohm,dh2228fv\"</code>', '<code>spi:dh2228fv</code>', '<code>/dev/spidev0.1</code> xuất hiện — cách của bước này']
            ] },

          { t: 'cal', kind: 'warn', title: 'Hướng dẫn trên mạng bảo viết compatible = "spidev" — trên kernel này nó im lặng không làm gì',
            x: 'Đây là lỗi gây mất thời gian nhất với SPI: DT dịch được, boot bình thường, <code>spi0.1</code> có trong ' +
               'sysfs, nhưng <code>/dev/spidev*</code> không bao giờ xuất hiện và <b>không có một dòng lỗi nào</b>. Cách ' +
               'chẩn đoán: <code>cat /sys/bus/spi/devices/spi0.1/modalias</code> — nếu ra <code>spi:spidev</code>, node ' +
               'của bạn đang dùng cách cũ. Cách sửa trên bo mạch thật: dùng <code>compatible</code> <b>thật</b> của con chip ' +
               'và thêm nó vào driver phù hợp; chỉ khi đang thử nghiệm mới mượn một mục có sẵn trong bảng của spidev.' },

          { t: 'p', x:
            'Cuối cùng, gỡ controller khi hai thiết bị còn đang bound:' },

          { t: 'code', where: 'qemu', code:
            'rmmod spiloop; echo rc=$?\n' +
            'ls /sys/bus/spi/devices /dev | grep spi\n' +
            'lsmod' },

          { t: 'code', where: 'out', nocopy: true, code:
            '~ # rmmod spiloop; echo rc=$?\n' +
            'rc=0\n' +
            '~ # ls /sys/bus/spi/devices /dev | grep spi\n' +
            '/sys/bus/spi/devices:\n' +
            '~ # lsmod\n' +
            'Module                  Size  Used by    Tainted: G  \n' +
            'spidev                 20480  0 \n' +
            'lspi                   12288  0 ' },

          { t: 'p', x:
            'Giống I2C ở bước 5: controller đi, <code>spi0.0</code> và <code>spi0.1</code> đi theo, ' +
            '<code>/dev/spidev0.1</code> biến mất (<code>grep spi</code> chỉ còn dòng tiêu đề của thư mục rỗng), còn hai ' +
            'driver ở lại trong <code>lsmod</code>. <code>lspi</code> không có hàm <code>remove</code> nên không in gì — ' +
            'nó không giữ tài nguyên nào cần trả.' },

          { t: 'cal', kind: 'tip', title: 'Dọn dẹp và giữ lại gì',
            x: '<code>~/bai58</code> (8,8 MB) chứa bốn driver, <code>buses.dts</code>, initramfs và các biến thể ' +
               'trong <code>v/</code>. Bài 59 mở Chặng 11 — build system — và không đọc gì từ đây, nên có thể xoá bằng ' +
               '<code>rm -rf ~/bai58</code>; nếu muốn giữ một driver I2C client làm mẫu cho portfolio (mục tiêu M9 của ' +
               'lộ trình), giữ <code>~/bai58/ltemp</code>. <code>~/bai57</code> không còn bài nào cần. <b>Không</b> ' +
               'hoàn tác <code>CONFIG_I2C_STUB=m</code> trong <code>~/bai38</code>: nó vô hại, và nếu hoàn tác bạn phải ' +
               'build lại <code>Image</code> thêm 30 giây.' }
        ] }
    ] },

    /* ============================================================
       LỖI THƯỜNG GẶP
       ============================================================ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>No \'i2c-bus\' bus found for device \'tmp105\'</code>', 'Machine QEMU không có bus I2C nào gắn được thiết bị — <code>virt</code>, và <code>raspi3</code> trên QEMU 4.2.1', 'Dùng bus giả của bài này; hoặc một machine có bus thật (<code>mcimx7d-sabre</code>, QEMU mới hơn)'],
        ['<code>unsupported machine type \'raspi3b\'</code>', 'QEMU 4.2.1 gọi machine này là <code>raspi3</code>', '<code>qemu-system-aarch64 -M help | grep rasp</code>'],
        ['<code>/sys/bus/i2c/drivers/ltemp</code> chỉ có <code>bind module uevent unbind</code>', 'Driver đã nạp nhưng chưa có client nào: I2C không tự dò chip', 'Khai client qua DT hoặc <code>echo tên địa_chỉ &gt; …/new_device</code>'],
        ['<code>Failed to register i2c client ltemp at 0x48 (-16)</code>', 'Địa chỉ đã có client khác trên cùng adapter', '<code>ls /sys/bus/i2c/devices</code>; <code>delete_device</code> client cũ trước'],
        ['<code>ltemp 0-0049: error -ENXIO: no answer at 0x49</code> (hoặc <code>-ENODEV</code> với i2c-stub)', 'Không chip nào ACK ở địa chỉ đó: sai địa chỉ, chip chưa có nguồn, hoặc chưa hàn', '<code>i2cdetect -y N</code> xem địa chỉ thật; kiểm tra lại <code>reg</code> và datasheet (TMP102: 0x48–0x4B theo chân ADD0)'],
        ['Không một dòng log nào khi chip vắng mặt', '<code>probe()</code> trả <code>-ENODEV</code>/<code>-ENXIO</code> — driver core không in gì (<code>dd.c:649–650</code>)', 'Dùng <code>dev_err_probe()</code> trong <code>probe()</code> của bạn'],
        ['<code>i2cget: can\'t set address to 0x48: Device or resource busy</code>', 'Địa chỉ đang có driver giữ (<code>UU</code> trong <code>i2cdetect</code>)', 'Đọc qua sysfs của driver; nếu thật sự cần, <code>-f</code> (tự chịu trách nhiệm)'],
        ['Nhiệt độ ra số nhỏ vô lý (62) hoặc nhảy lung tung', 'Đọc word bằng <code>i2c_smbus_read_word_data</code> với chip gửi byte cao trước', 'Dùng <code>i2c_smbus_read_word_swapped</code>; thử bằng giá trị biết trước'],
        ['<code>error: initialization of ‘int (*)(struct i2c_client *)’ from incompatible pointer type</code>', '<code>probe</code> hai tham số theo API trước 6.3', 'Bỏ tham số <code>id</code>; dùng <code>i2c_client_get_device_id()</code> nếu cần'],
        ['<code>tmp102 0-004a: unexpected config register value</code>', 'Chip ở địa chỉ đó không trả thanh ghi cấu hình như TMP102 (bit R1:R0 phải là 11)', 'Kiểm tra đúng chip, đúng địa chỉ; với i2c-stub, ghi trước <code>0xa060</code> vào thanh ghi 1'],
        ['<code>of_i2c: invalid reg on /i2c-sim/sensor@48</code> + <code>Failed to create I2C device</code>', 'Node con thiếu <code>reg</code> (hoặc sai kiểu); <code>dtc</code> chỉ cảnh báo', 'Thêm <code>reg = &lt;0x48&gt;</code>; đọc kỹ cảnh báo <code>i2c_bus_reg</code>/<code>unit_address_vs_reg</code> của <code>dtc</code>'],
        ['<code>i2cdetect: warning: can\'t use SMBus receive byte command</code>', 'Adapter không khai <code>I2C_FUNC_SMBUS_READ_BYTE</code>', 'Thông tin, không phải lỗi — nó dò bằng kiểu khác'],
        ['Có <code>spi0.1</code> nhưng không có <code>/dev/spidev0.1</code>, không log nào; <code>modalias</code> là <code>spi:spidev</code>', '<code>compatible = \"spidev\"</code> trong DT — spidev không khớp tên đó', 'Dùng <code>compatible</code> thật của chip (hoặc một mục trong <code>spidev_dt_ids</code> khi thử nghiệm)'],
        ['<code>spidev listed directly in DT is not supported</code> + <code>error -22</code>', '<code>compatible</code> có cả chip thật lẫn <code>\"spidev\"</code>', 'Bỏ <code>\"spidev\"</code> khỏi danh sách'],
        ['<code>error: ‘SPI_TX_OCTAL’ undeclared</code> khi build <code>spidev_test</code>', 'Header uapi của toolchain (5.4) cũ hơn kernel 6.18', 'Thêm <code>-I ~/bai38/linux-6.18.45/include/uapi</code>'],
        ['<code>FATAL ERROR: Couldn\'t open \"virt.dts\"</code> khi dịch file trong <code>v/</code>', '<code>/include/</code> tính đường dẫn từ thư mục của file đang dịch', 'Viết <code>/include/ \"../virt.dts\"</code> (Bài 56)'],
        ['<code>insmod: can\'t insert \'…/spiloop.ko\': No such file or directory</code>', 'initramfs đang là bản của bước trước — chưa copy module hoặc chưa đóng lại <code>cpio</code>', '<code>ls initramfs/lib/modules</code>, rồi chạy lại dòng <code>find . | cpio …</code>']
      ] },

    /* ============================================================
       RECAP
       ============================================================ */
    { t: 'recap', items: [
      'Mỗi bus có <b>ba vai</b>: adapter/controller (driver của hãng SoC, biết thanh ghi), client/device (do core tạo, thường từ DT), và driver của client (bạn viết, chỉ gọi API của core). Driver client <b>không bao giờ</b> chạm thanh ghi của adapter.',
      '<b>I2C</b>: 2 dây, địa chỉ <b>7 bit</b> (0x03–0x77), ACK sau mỗi byte → <code>i2cdetect</code> dò được, không ai trả lời = <b><code>-ENXIO</code></b>. <b>SPI</b>: 3 dây chung + <b>1 CS mỗi chip</b>, full duplex, không ACK → không dò được.',
      '<code>i2c_driver</code> trên 6.18: <code>probe(struct i2c_client *)</code> <b>một</b> tham số, <code>remove</code> trả <code>void</code>, <code>id_table</code> + <code>of_match_table</code>, <code>module_i2c_driver</code>. Tên thiết bị <code>0-0048</code> = adapter 0, địa chỉ 0x48.',
      'Chip gửi byte cao trước (TMP102, LM75) → <b><code>i2c_smbus_read_word_swapped</code></b>. Quên swap: 25 000 thành <b>62</b> mili-độ, không lỗi, không cảnh báo — chỉ bắt được bằng giá trị biết trước.',
      'Node con trong DT: node bus có <code>#address-cells = &lt;1&gt;</code>, <code>#size-cells = &lt;0&gt;</code>; <code>reg</code> = <b>địa chỉ 7 bit</b> (I2C) hoặc <b>số CS</b> (SPI, kèm <code>spi-max-frequency</code>). Client chỉ sinh ra khi driver adapter đăng ký; thiếu <code>reg</code> → client không bao giờ tồn tại.',
      '<code>i2c-stub</code> (<code>CONFIG_I2C_STUB=m</code>, build lại <b>29,5 s</b>) + <code>new_device</code> để thử driver; <code>/dev/i2c-N</code> major <b>89</b>; <code>UU</code> = đang có driver giữ, <code>i2cget</code> nhận <code>EBUSY</code>. Stub nhớ mọi giá trị nhưng <b>không có hành vi</b> — tmp102 ra 50 000 thay vì 25 000.',
      'SPI: <code>spi_transfer</code> (tx, rx, len) gộp thành <code>spi_message</code>, gửi bằng <code>spi_sync</code>. Loopback: full duplex trả <code>9f 01 02 03</code>, <code>spi_write_then_read</code> trả <code>ff ff ff</code>. Controller chỉ cần <code>transfer_one()</code>.',
      '<code>spidev</code> → <code>/dev/spidevB.C</code> (major <b>153</b>). <b>Không</b> viết <code>compatible = \"spidev\"</code>: một mình thì im lặng không có node; kèm chip thật thì <code>error -22</code>.'
    ] },

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo',
      x: 'Bài 58 khép lại Chặng 10: bạn đã viết driver cho character device, platform device, ngắt, MMIO, GPIO và giờ là ' +
         'hai bus nối tiếp — đủ để đọc hiểu phần lớn thư mục <code>drivers/</code>. Nhưng hãy nhìn lại cách bạn đã làm việc ' +
         'từ Chặng 07 tới giờ: gõ tay <code>scripts/config</code>, nhớ build lại <code>Image</code> khi bật một tuỳ chọn ' +
         '<code>=y</code>, sao chép <code>~/bai32/initramfs</code> sang từng thư mục bài, <code>cp</code> từng ' +
         '<code>.ko</code>, rồi <code>cpio</code> lại mỗi lần đổi một file. Bài này thôi đã đóng gói initramfs <b>năm ' +
         'lần</b>. <b>Bài 59 — Vì sao cần build system</b> mở Chặng 11 bằng chính câu hỏi đó: làm sao để một người khác, ' +
         'hay chính bạn sáu tháng sau, dựng lại đúng hệ thống này — cùng kernel, cùng <code>.config</code>, cùng rootfs — ' +
         'bằng một lệnh.' }
  ],

  quiz: [
    { q: 'Bạn nạp driver cảm biến I2C, <code>insmod</code> trả 0, nhưng <code>/sys/bus/i2c/drivers/&lt;tên&gt;/</code> chỉ có <code>bind module uevent unbind</code> và <code>dmesg</code> không có dòng nào từ driver. Nguyên nhân khả dĩ nhất?',
      opts: [
        'Driver thiếu <code>MODULE_LICENSE(\"GPL\")</code> nên <code>probe()</code> bị chặn',
        'Chưa có <code>i2c_client</code> nào khớp driver: không ai khai chip (DT hay <code>new_device</code>), hoặc adapter cha chưa được nạp',
        'Chip không ACK nên i2c-core xoá thiết bị khỏi sysfs',
        'Bus I2C đang bận vì <code>i2cdetect</code> chạy nền'
      ],
      a: 1,
      why: 'I2C không có cơ chế tự liệt kê như USB/PCI: client chỉ tồn tại khi ai đó khai. Không client → không <code>probe()</code> → không log. Nếu chip không ACK, client vẫn được tạo (<code>0-0049</code> ở bước 4 và 5 vẫn có trong <code>/sys/bus/i2c/devices</code>) và driver của bạn sẽ có cơ hội in lỗi trong <code>probe()</code>. Thiếu license thì <code>modpost</code> đã chặn lúc build (Bài 50). Luôn kiểm tra theo thứ tự: có adapter chưa (<code>i2cdetect -l</code>), có client chưa (<code>ls /sys/bus/i2c/devices</code>), rồi mới đến driver.' },

    { q: 'Datasheet của một cảm biến ghi: \"thanh ghi nhiệt độ 16 bit, byte đầu tiên truyền đi là MSB\". Hàm nào đọc đúng giá trị?',
      opts: [
        '<code>i2c_smbus_read_word_data()</code>',
        '<code>i2c_smbus_read_byte_data()</code> hai lần rồi cộng',
        '<code>i2c_smbus_read_word_swapped()</code>',
        '<code>spi_w8r16()</code>'
      ],
      a: 2,
      why: 'Quy ước SMBus là byte thấp đến trước, nên <code>read_word_data</code> đặt byte đầu tiên (ở đây là MSB) vào 8 bit thấp — sai thứ tự. <code>read_word_swapped</code> gọi bản thường rồi <code>swab16()</code>. Bước 4 đo được hậu quả: 25 000 mili-độ thành 62. Đọc hai byte riêng lẻ bằng hai giao dịch có thể được nếu chip hỗ trợ, nhưng giữa hai lần đọc chip có thể cập nhật số đo, cho ra hai nửa của hai phép đo khác nhau. <code>spi_w8r16</code> là API của SPI.' },

    { q: 'Trong <code>i2cdetect -y 0</code> bạn thấy <code>UU</code> ở ô 0x48 và <code>4a</code> ở ô 0x4a. Điều gì đúng?',
      opts: [
        '0x48 hỏng, 0x4a hoạt động',
        '0x48 có một client đã bind driver nên công cụ không dò; 0x4a có chip trả lời nhưng chưa driver nào giữ',
        'Cả hai đều chưa có driver; UU nghĩa là chip đang bận',
        '0x48 là chip SPI dùng chung chân với I2C'
      ],
      a: 1,
      why: '<code>UU</code> = địa chỉ đang thuộc về một driver trong kernel; i2c-dev không chen vào (và <code>i2cget</code> sẽ nhận <code>EBUSY</code>, như bước 3). Một số hex nghĩa là có ACK và chưa ai nhận. <code>--</code> là không ai trả lời. Ở bước 3, 0x48 là <code>UU</code> vì <code>ltemp</code> đã bind, 0x4a là <code>4a</code> vì tmp102 chưa được khai.' },

    { q: 'Node DT sau có gì sai? <code>i2c@3f804000 { … #address-cells = &lt;1&gt;; #size-cells = &lt;0&gt;; sensor@48 { compatible = \"ti,tmp102\"; }; };</code>',
      opts: [
        'Thiếu <code>spi-max-frequency</code>',
        'Thiếu <code>reg = &lt;0x48&gt;</code> trong node con: i2c-core báo <code>of_i2c: invalid reg</code> và không tạo client',
        '<code>#size-cells</code> phải là 1',
        'Tên node con phải là <code>tmp102@48</code>'
      ],
      a: 1,
      why: 'Phần <code>@48</code> trong tên node chỉ là nhãn cho người đọc; kernel lấy địa chỉ từ <code>reg</code>. Thiếu nó, <code>dtc</code> chỉ cảnh báo (<code>unit_address_vs_reg</code>, <code>i2c_bus_reg</code>) còn i2c-core bỏ qua node — bước 5 đã tái hiện đúng lỗi này với <code>bad.dts</code>. <code>spi-max-frequency</code> là thuộc tính của thiết bị SPI. <code>#size-cells = &lt;0&gt;</code> là đúng: thiết bị trên bus không có kích thước. Tên node nên là chức năng chung (<code>sensor</code>, <code>temperature-sensor</code>), không phải tên chip.' },

    { q: 'Một chip flash SPI nhận lệnh 0x9F rồi trả 3 byte ID. Driver dùng một <code>spi_transfer</code> duy nhất với <code>tx = {0x9F, 0, 0, 0}</code>, <code>rx</code> 4 byte. ID nằm ở đâu trong <code>rx</code>?',
      opts: [
        '<code>rx[0..2]</code>',
        '<code>rx[1..3]</code> — byte đầu nhận về cùng lúc với byte lệnh đang được gửi, khi chip chưa biết lệnh là gì',
        'Không nhận được gì vì SPI không có ACK',
        '<code>rx</code> chứa lại <code>9f 00 00 00</code> như loopback'
      ],
      a: 1,
      why: 'SPI full duplex: mỗi nhịp đồng hồ đẩy một bit ra và kéo một bit vào. Trong 8 nhịp đầu chip còn đang nhận 0x9F nên byte nó gửi về vô nghĩa; ID ra từ byte thứ hai. Đó là lý do <code>spi_write_then_read(spi, tx, 1, rx, 3)</code> tiện hơn: nó bỏ byte vô nghĩa giùm bạn. Chỉ trên dây loopback của bước 6 mới nhận lại đúng những gì gửi — <code>9f 01 02 03</code>.' },

    { q: 'Bạn thêm <code>dac@0 { compatible = \"spidev\"; reg = &lt;0&gt;; … };</code> dưới controller SPI, nạp <code>spidev.ko</code>. <code>/sys/bus/spi/devices/spi0.0</code> có mặt nhưng không có <code>/dev/spidev0.0</code> và <code>dmesg</code> im lặng. Vì sao?',
      opts: [
        'Thiếu <code>mount -t devtmpfs</code>',
        'spidev trên kernel này không khớp <code>compatible = \"spidev\"</code> nên không bao giờ probe — <code>modalias</code> là <code>spi:spidev</code>, không có trong bảng của nó',
        'Chip select 0 luôn dành cho controller',
        '<code>spidev</code> chỉ chạy trên bus thật, không chạy trên controller giả'
      ],
      a: 1,
      why: 'Từ khi <code>spidev</code> chỉ nhận danh sách <code>compatible</code> của các chip cụ thể, chữ <code>spidev</code> trong DT không khớp gì cả, và không khớp thì không có <code>probe()</code> để in lỗi. Bước 6 tái hiện: <code>modalias</code> = <code>spi:spidev</code>, không log, không node. Nếu viết kèm một chip thật, spidev probe rồi từ chối rõ ràng bằng <code>error -22</code>. Thiếu devtmpfs chỉ làm mất node trong <code>/dev</code>, không giải thích được <code>modalias</code> <code>spi:spidev</code>; CS 0 là CS bình thường (<code>lspi</code> dùng nó); và spidev chạy tốt trên <code>spiloop</code> khi dùng <code>rohm,dh2228fv</code>.' }
  ]
});

/* Bài 18 — Giải phẫu file ELF */
Lesson.register({
  id: 'bai-18',
  title: 'Giải phẫu file ELF',
  minutes: 55,
  practice: 'Thực hành 35 phút',
  level: 'Trung cấp',

  intro:
    'Bài này đóng lại Chặng 02 bằng cách mở nắp cái hộp mà bạn đã dùng suốt bốn bài qua. ' +
    '<code>gcc</code> sinh ra một file — file đó có cấu trúc gì bên trong? Vì sao ' +
    '<code>size</code> báo <code>bss = 16 424</code> byte trong khi cả file chỉ nặng ' +
    '<b>16 184</b> byte, tức là <b>ít hơn cả phần bss</b>? Vì sao trình thông dịch động biết ' +
    'phải nạp file nào? Và điểm bắt đầu của chương trình có thật sự là <code>main</code> ' +
    'không? Câu trả lời cho tất cả nằm trong một định dạng duy nhất: <b>ELF</b> — thứ mà ' +
    'chương trình, thư viện, file <code>.o</code>, module kernel và cả nhân Linux đều dùng chung.',

  goals: [
    'Đọc được ELF header bằng <code>readelf -h</code> và giải thích ý nghĩa từng trường quan trọng',
    'Phân biệt được <b>section</b> (dành cho trình liên kết) và <b>segment</b> (dành cho kernel lúc nạp)',
    'Giải thích được vì sao <code>.bss</code> chiếm RAM nhưng <b>không</b> chiếm byte nào trên đĩa, và tự chứng minh bằng một biến 1 MB',
    'Dùng thành thạo <code>readelf</code>, <code>objdump</code>, <code>nm</code>, <code>strings</code>, <code>size</code>, <code>file</code> để soi một file nhị phân lạ',
    'Đo được <code>strip</code> và <code>--gc-sections</code> tiết kiệm bao nhiêu byte, trên số liệu thật',
    'Nhận diện được kiến trúc của một file ELF chỉ bằng 16 byte đầu tiên'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. ELF LÀ GÌ
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'ELF — một định dạng cho năm loại file khác nhau' },

    { t: 'p', x:
      '<b>ELF</b> viết tắt của <b>Executable and Linkable Format</b>. Cái tên đã nói hết: một ' +
      'định dạng dùng cho <i>cả</i> thứ chạy được (<i>executable</i>) <i>lẫn</i> thứ đem đi ' +
      'liên kết (<i>linkable</i>). Bạn đã tạo ra bốn trong năm loại dưới đây mà chưa biết ' +
      'chúng cùng một định dạng.' },

    { t: 'table',
      head: ['Loại', '<code>Type</code> trong header', 'Ví dụ bạn đã tạo', 'Ai đọc nó'],
      rows: [
        ['File đối tượng', '<code>REL</code>', '<code>add.o</code> (Bài 15)', 'Trình liên kết'],
        ['Chương trình PIE', '<code>DYN</code>', '<code>hello</code>, <code>prog_dynamic</code>', 'Kernel + <code>ld.so</code>'],
        ['Chương trình tĩnh', '<code>EXEC</code>', '<code>hello_static</code> (Bài 17)', 'Kernel'],
        ['Thư viện dùng chung', '<code>DYN</code>', '<code>libops.so</code> (Bài 17)', '<code>ld.so</code>'],
        ['Core dump', '<code>CORE</code>', 'sinh ra khi chương trình sập', '<code>gdb</code>']
      ]},

    { t: 'cal', kind: 'info', title: 'Kernel Linux và module kernel cũng là ELF', x:
      '<p><code>vmlinux</code> — nhân Linux chưa nén — là một file ELF loại <code>EXEC</code>. ' +
      'Mỗi module <code>.ko</code> là một file ELF loại <code>REL</code>, tức là cùng loại với ' +
      '<code>add.o</code> của bạn.</p>' +
      '<p>Đó là lý do mọi công cụ bạn học trong bài này dùng được nguyên vẹn ở ' +
      '<b>Chặng 10</b> khi bạn soi module kernel, và ở <b>Chặng 07</b> khi bạn xem xét ' +
      '<code>vmlinux</code> sau khi biên dịch nhân. Bốn mươi lăm phút bỏ ra ở đây sẽ được ' +
      'dùng lại suốt phần còn lại của lộ trình.</p>' },

    { t: 'p', x:
      'Cách nhanh nhất để biết một file là gì — và đây là lệnh đầu tiên nên gõ khi cầm một ' +
      'file nhị phân lạ:' },

    { t: 'code', where: 'wsl', code: 'file sample' },

    { t: 'code', where: 'out', nocopy: true, code:
      'sample: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=7449f0dd46fd68fb9c2897326b42e25dd3f8b6b6, for GNU/Linux 3.2.0, not stripped' },

    { t: 'cmdx', cmd: 'file sample', title: 'Đọc từng mảnh của dòng trả lời',
      rows: [
        ['<code>ELF 64-bit</code>', 'Định dạng ELF, con trỏ và địa chỉ dài 64 bit', 'Máy 32 bit sẽ là <code>ELF 32-bit</code> — rất phổ biến trên ARM nhúng'],
        ['<code>LSB</code>', '<b>Least Significant Byte first</b> = little-endian', 'x86 và ARM hiện đại đều little-endian; một số chip mạng cũ là <code>MSB</code>'],
        ['<code>pie executable</code>', 'Chương trình <b>độc lập vị trí</b>', 'Hệ quả của <code>-fPIE</code> mặc định trên Ubuntu, để ASLR hoạt động'],
        ['<code>x86-64</code>', 'Kiến trúc CPU', 'Bản ARM64 sẽ hiện <code>ARM aarch64</code> — đây là trường quyết định file chạy được ở đâu'],
        ['<code>dynamically linked</code>', 'Cần thư viện <code>.so</code> lúc chạy', 'Bài 17. Bản <code>-static</code> hiện <code>statically linked</code>'],
        ['<code>interpreter /lib64/…</code>', 'Trình thông dịch động cần thiết', 'Chuỗi này nằm trong section <code>.interp</code>, ta sẽ mở ra xem'],
        ['<code>BuildID[sha1]=…</code>', 'Mã băm định danh bản build này', 'Dùng để ghép file nhị phân với đúng gói symbol khi gỡ lỗi'],
        ['<code>for GNU/Linux 3.2.0</code>', 'Phiên bản kernel tối thiểu', 'Đến từ section <code>.note.ABI-tag</code>'],
        ['<code>not stripped</code>', 'Còn bảng ký hiệu', 'Sau <code>strip</code> sẽ thành <code>stripped</code>']
      ]},

    { t: 'cal', kind: 'tip', title: 'file không đoán theo phần mở rộng — nó đọc nội dung', x:
      '<p>Linux <b>không</b> dùng đuôi file để xác định loại. <code>file</code> mở file ra, đọc ' +
      'vài byte đầu và tra một cơ sở dữ liệu "số phù thuỷ" (<i>magic number</i>) đặt tại ' +
      '<code>/usr/share/misc/magic.mgc</code>.</p>' +
      '<p>Bạn có thể đổi tên <code>sample</code> thành <code>sample.txt</code>, ' +
      '<code>sample.exe</code> hay không đuôi gì — <code>file</code> vẫn trả lời y hệt, và ' +
      'chương trình vẫn chạy y hệt. ' +
      'Đây là điểm khác biệt cơ bản so với Windows, nơi đuôi <code>.exe</code> mang ý nghĩa ' +
      'thật sự.</p>' },

    /* ══════════════════════════════════════════════
       2. ELF HEADER
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'ELF header — 64 byte đầu tiên chứa tấm bản đồ' },

    { t: 'p', x:
      'Mọi file ELF bắt đầu bằng một header cố định 64 byte (với ELF64). Header này không ' +
      'chứa mã hay dữ liệu — nó chỉ nói cho người đọc biết <b>phần còn lại nằm ở đâu</b>.' },

    { t: 'code', where: 'wsl', code: 'readelf -h sample' },

    { t: 'code', where: 'out', nocopy: true, code:
      'ELF Header:\n' +
      '  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00 \n' +
      '  Class:                             ELF64\n' +
      '  Data:                              2\'s complement, little endian\n' +
      '  Version:                           1 (current)\n' +
      '  OS/ABI:                            UNIX - System V\n' +
      '  ABI Version:                       0\n' +
      '  Type:                              DYN (Position-Independent Executable file)\n' +
      '  Machine:                           Advanced Micro Devices X86-64\n' +
      '  Version:                           0x1\n' +
      '  Entry point address:               0x10e0\n' +
      '  Start of program headers:          64 (bytes into file)\n' +
      '  Start of section headers:          14200 (bytes into file)\n' +
      '  Flags:                             0x0\n' +
      '  Size of this header:               64 (bytes)\n' +
      '  Size of program headers:           56 (bytes)\n' +
      '  Number of program headers:         14\n' +
      '  Size of section headers:           64 (bytes)\n' +
      '  Number of section headers:         31\n' +
      '  Section header string table index: 30' },

    { t: 'p', x: 'Mười sáu byte đầu — gọi là <code>e_ident</code> — có thể xem trực tiếp:' },

    { t: 'code', where: 'wsl', code: 'xxd -l 16 sample' },

    { t: 'code', where: 'out', nocopy: true, code:
      '00000000: 7f45 4c46 0201 0100 0000 0000 0000 0000  .ELF............' },

    { t: 'fig',
      svg:
        '<svg viewBox="0 0 720 210" width="720" role="img" aria-label="Giai ma 16 byte e_ident dau tien cua mot file ELF">' +
        '<text class="d-t" x="20" y="20">16 byte e_ident</text>' +

        '<rect class="d-box-p" x="20" y="32" width="60" height="38" rx="5"/>' +
        '<text class="d-tm" x="50" y="56" text-anchor="middle">7f</text>' +
        '<rect class="d-box-p" x="82" y="32" width="120" height="38" rx="5"/>' +
        '<text class="d-tm" x="142" y="56" text-anchor="middle">45 4c 46</text>' +
        '<rect class="d-box-a" x="204" y="32" width="44" height="38" rx="5"/>' +
        '<text class="d-tm" x="226" y="56" text-anchor="middle">02</text>' +
        '<rect class="d-box-a" x="250" y="32" width="44" height="38" rx="5"/>' +
        '<text class="d-tm" x="272" y="56" text-anchor="middle">01</text>' +
        '<rect class="d-box" x="296" y="32" width="44" height="38" rx="5"/>' +
        '<text class="d-tm" x="318" y="56" text-anchor="middle">01</text>' +
        '<rect class="d-box-g" x="342" y="32" width="44" height="38" rx="5"/>' +
        '<text class="d-tm" x="364" y="56" text-anchor="middle">00</text>' +
        '<rect class="d-box" x="388" y="32" width="180" height="38" rx="5"/>' +
        '<text class="d-tm" x="478" y="56" text-anchor="middle">00 ... 00  (8 byte dem)</text>' +

        '<line class="d-line" x1="50" y1="70" x2="50" y2="88"/>' +
        '<text class="d-ts" x="20" y="102">0x7f — khong the go nham tu ban phim</text>' +
        '<line class="d-line" x1="142" y1="70" x2="142" y2="112"/>' +
        '<text class="d-ts" x="20" y="126">&quot;ELF&quot; dang ASCII</text>' +
        '<line class="d-line" x1="226" y1="70" x2="226" y2="136"/>' +
        '<text class="d-ts" x="240" y="150">02 = ELF64   (01 = ELF32)</text>' +
        '<line class="d-line" x1="272" y1="70" x2="272" y2="160"/>' +
        '<text class="d-ts" x="286" y="174">01 = little-endian   (02 = big-endian)</text>' +
        '<line class="d-line" x1="364" y1="70" x2="364" y2="184"/>' +
        '<text class="d-ts" x="378" y="198">OS/ABI: 00 = System V, 03 = GNU/Linux</text>' +
        '</svg>',
      cap:
        'Bốn byte đầu là chữ ký nhận dạng: kernel kiểm tra chúng trước khi chịu nạp file. ' +
        'Byte thứ 5 và 6 cho biết độ rộng con trỏ và thứ tự byte — đọc được chúng là bạn biết ' +
        'file dành cho máy nào.' },

    { t: 'cal', kind: 'why', title: 'Vì sao byte đầu tiên là 0x7f chứ không phải một chữ cái', x:
      '<p><code>0x7f</code> là ký tự DEL — <b>không in được, không gõ được từ bàn phím</b>. ' +
      'Chọn nó là chủ đích: nếu một file văn bản thuần lỡ bắt đầu bằng "ELF", nó vẫn không ' +
      'bị nhầm là ELF thật.</p>' +
      '<p>Cùng ý tưởng đó xuất hiện khắp nơi: PNG bắt đầu bằng <code>89 50 4e 47</code> (byte ' +
      'cao rồi mới đến "PNG"), file <code>.class</code> của Java bắt đầu bằng ' +
      '<code>cafebabe</code>.</p>' +
      '<p>Đây cũng chính là thứ kernel kiểm tra đầu tiên khi bạn gõ <code>./sample</code>. Sai ' +
      'chữ ký → <code>Exec format error</code>, đúng lỗi bạn đã cố tình gây ra ở Bài 3.</p>' },

    { t: 'p', x:
      'Bây giờ so cùng chương trình biên dịch chéo cho ARM64. Chỉ <b>hai byte</b> khác nhau ' +
      'trong 16 byte đầu, nhưng chúng quyết định file chạy được ở đâu:' },

    { t: 'code', where: 'wsl', code:
      'aarch64-linux-gnu-gcc -O2 -static -o sample_arm sample.c\n' +
      'xxd -l 16 sample\n' +
      'xxd -l 16 sample_arm\n' +
      'readelf -h sample_arm | grep -E \'OS/ABI|Type|Machine|Entry\'' },

    { t: 'code', where: 'out', nocopy: true, code:
      '00000000: 7f45 4c46 0201 0100 0000 0000 0000 0000  .ELF............\n' +
      '00000000: 7f45 4c46 0201 0103 0000 0000 0000 0000  .ELF............\n' +
      '  OS/ABI:                            UNIX - GNU\n' +
      '  Type:                              EXEC (Executable file)\n' +
      '  Machine:                           AArch64\n' +
      '  Entry point address:               0x400600' },

    { t: 'cal', kind: 'info', title: 'Kiến trúc không nằm trong 16 byte đầu — nó nằm ngay sau', x:
      '<p>Byte thứ 8 khác nhau (<code>00</code> so với <code>03</code>) chỉ vì OS/ABI, không ' +
      'phải vì kiến trúc.</p>' +
      '<p>Trường <code>Machine</code> nằm ở <b>byte 18–19</b>, ngay sau <code>e_ident</code>. ' +
      'Đó mới là thứ kernel đối chiếu với CPU. Trên máy bạn nó là ' +
      '<code>Advanced Micro Devices X86-64</code>; bản ARM64 là <code>AArch64</code> — nên ' +
      '<code>./sample_arm</code> cho <code>Exec format error</code>, thoát <b>126</b>, đúng như ' +
      'Bài 3 và Bài 13 đã đo.</p>' +
      '<p>Chú ý thêm: bản ARM64 có <code>Type: EXEC</code> và điểm vào <b>cố định</b> ' +
      '<code>0x400600</code>, còn bản x86 có <code>Type: DYN</code> và điểm vào ' +
      '<code>0x10e0</code> — một <b>độ lệch</b>, vì địa chỉ thật chỉ được biết lúc chạy. ' +
      'Nguyên nhân: bản ARM dùng <code>-static</code> nên không cần PIE.</p>' },

    /* ══════════════════════════════════════════════
       3. SECTION
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Section — bản đồ dành cho trình liên kết' },

    { t: 'p', x:
      'File dùng làm ví dụ suốt bài này cố tình có mỗi loại dữ liệu một biến, để bạn tìm được ' +
      'chúng ở đúng chỗ:' },

    { t: 'code', where: 'file', name: '~/bai18/sample.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <string.h>\n' +
      '\n' +
      'int    init_count   = 42;\n' +
      'int    zero_count;\n' +
      'char   buffer[16384];\n' +
      'const char *name = "embedded device";\n' +
      'static int private_val = 7;\n' +
      '\n' +
      'int increment(void) { return ++init_count; }\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    memset(buffer, 0, sizeof buffer);\n' +
      '    printf("%s: %d %d\\n", name, increment(), private_val);\n' +
      '    return 0;\n' +
      '}',
      notes: ['Năm biến toàn cục, mỗi biến sẽ rơi vào một section khác nhau: ' +
              '<code>init_count</code> và <code>private_val</code> có giá trị khác 0 → ' +
              '<code>.data</code>; <code>zero_count</code> và <code>buffer</code> ngầm ' +
              'bằng 0 → <code>.bss</code>; chuỗi <code>"embedded device"</code> → ' +
              '<code>.rodata</code>.'] },

    { t: 'code', where: 'wsl', code:
      'gcc -O2 -o sample sample.c\n' +
      'readelf -S -W sample' },

    { t: 'code', where: 'out', nocopy: true, code:
      'There are 31 section headers, starting at offset 0x3778:\n' +
      '\n' +
      'Section Headers:\n' +
      '  [Nr] Name              Type            Address          Off    Size   ES Flg Lk Inf Al\n' +
      '  [ 0]                   NULL            0000000000000000 000000 000000 00      0   0  0\n' +
      '  [ 1] .note.gnu.build-id NOTE            0000000000000350 000350 000024 00   A  0   0  4\n' +
      '  [ 2] .interp           PROGBITS        0000000000000374 000374 00001c 00   A  0   0  1\n' +
      '  [ 3] .gnu.hash         GNU_HASH        0000000000000390 000390 000024 00   A  4   0  8\n' +
      '  [ 4] .dynsym           DYNSYM          00000000000003b8 0003b8 0000c0 18   A  5   1  8\n' +
      '  [ 5] .dynstr           STRTAB          0000000000000478 000478 0000a8 00   A  0   0  1\n' +
      '  [ 8] .rela.dyn         RELA            0000000000000570 000570 0000d8 18   A  4   0  8\n' +
      '  [10] .init             PROGBITS        0000000000001000 001000 00001b 00  AX  0   0  4\n' +
      '  [11] .plt              PROGBITS        0000000000001020 001020 000030 10  AX  0   0 16\n' +
      '  [14] .text             PROGBITS        0000000000001080 001080 000164 00  AX  0   0 16\n' +
      '  [15] .fini             PROGBITS        00000000000011e4 0011e4 00000d 00  AX  0   0  4\n' +
      '  [16] .rodata           PROGBITS        0000000000002000 002000 00001f 00   A  0   0  4\n' +
      '  [21] .init_array       INIT_ARRAY      0000000000003db0 002db0 000008 08  WA  0   0  8\n' +
      '  [23] .dynamic          DYNAMIC         0000000000003dc0 002dc0 0001f0 10  WA  5   0  8\n' +
      '  [24] .got              PROGBITS        0000000000003fb0 002fb0 000050 08  WA  0   0  8\n' +
      '  [25] .data             PROGBITS        0000000000004000 003000 000020 00  WA  0   0  8\n' +
      '  [26] .bss              NOBITS          0000000000004020 003020 004028 00  WA  0   0 32\n' +
      '  [27] .comment          PROGBITS        0000000000000000 003020 000026 01  MS  0   0  1\n' +
      '  [28] .symtab           SYMTAB          0000000000000000 003048 0003f0 18     29  18  8\n' +
      '  [29] .strtab           STRTAB          0000000000000000 003438 000223 00      0   0  1\n' +
      '  [30] .shstrtab         STRTAB          0000000000000000 00365b 00011a 00      0   0  1',
      notes: ['Đây là bản rút gọn — file thật có <b>31</b> section. Cờ <code>-W</code> ' +
              '(<i>wide</i>) ngăn <code>readelf</code> ngắt dòng, gần như luôn nên dùng.'] },

    { t: 'p', x: 'Những section bạn cần thuộc lòng, theo đúng thứ tự xuất hiện:' },

    { t: 'table',
      head: ['Section', 'Chứa gì', 'Cờ', 'Ví dụ trong <code>sample.c</code>'],
      rows: [
        ['<code>.text</code>', 'Mã máy', '<code>AX</code> — nạp, <b>thi hành được</b>, chỉ đọc', 'Thân của <code>main</code> và <code>increment</code>'],
        ['<code>.rodata</code>', 'Hằng chỉ đọc', '<code>A</code> — nạp, <b>không ghi được</b>', 'Chuỗi <code>"embedded device"</code> và <code>"%s: %d %d\\n"</code>'],
        ['<code>.data</code>', 'Biến toàn cục có giá trị khởi tạo khác 0', '<code>WA</code> — nạp, <b>ghi được</b>', '<code>init_count = 42</code>, <code>private_val = 7</code>, con trỏ <code>name</code>'],
        ['<code>.bss</code>', 'Biến toàn cục bằng 0', '<code>WA</code> + kiểu <b><code>NOBITS</code></b>', '<code>zero_count</code>, <code>buffer[16384]</code>'],
        ['<code>.interp</code>', 'Đường dẫn trình thông dịch động', '<code>A</code>', '<code>/lib64/ld-linux-x86-64.so.2</code>'],
        ['<code>.dynamic</code>', 'Bảng <code>NEEDED</code>, <code>SONAME</code>, <code>RUNPATH</code>…', '<code>WA</code>', 'Chính là thứ <code>readelf -d</code> in ra ở Bài 17'],
        ['<code>.got</code>', 'Global Offset Table', '<code>WA</code>', 'Bảng địa chỉ mà mã PIC tra cứu — Bài 17'],
        ['<code>.symtab</code> / <code>.strtab</code>', 'Bảng ký hiệu và tên của chúng', '<i>không có <code>A</code></i>', 'Thứ <code>nm</code> đọc. <b>Không được nạp vào RAM</b>'],
        ['<code>.comment</code>', 'Chuỗi phiên bản trình biên dịch', '<code>MS</code>', '<code>GCC: (Ubuntu 15.2.0-16ubuntu1) 15.2.0</code>']
      ]},

    { t: 'cal', kind: 'why', title: 'Cột Flg là phần quan trọng nhất của bảng — nó là chính sách bảo mật', x:
      '<p><b><code>A</code></b> (<i>alloc</i>) = section này được <b>nạp vào bộ nhớ</b> lúc ' +
      'chạy. Không có <code>A</code> → chỉ tồn tại trên đĩa, phục vụ công cụ. Chú ý ' +
      '<code>.symtab</code>, <code>.strtab</code> và <code>.comment</code> đều <b>không</b> có ' +
      '<code>A</code>: chúng không tốn một byte RAM nào — và đó là lý do <code>strip</code> ' +
      'chỉ giảm dung lượng <i>đĩa</i>, không giảm RAM.</p>' +
      '<p><b><code>X</code></b> = thi hành được. <b><code>W</code></b> = ghi được. Hãy để ý ' +
      'trong toàn bộ bảng <b>không có section nào vừa <code>W</code> vừa <code>X</code></b>. ' +
      'Đây là nguyên tắc <b>W^X</b> (write xor execute): vùng nào ghi được thì không chạy ' +
      'được, vùng nào chạy được thì không ghi được. Nó chặn cả một họ tấn công tràn bộ đệm.</p>' +
      '<p>Bạn sẽ thấy nguyên tắc này được kernel thực thi ở tầng <b>segment</b> ngay dưới đây.</p>' },

    /* ══════════════════════════════════════════════
       4. NOBITS
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'NOBITS — vì sao .bss không tốn một byte nào trên đĩa' },

    { t: 'p', x:
      'Trong bảng trên, mọi section đều có kiểu <code>PROGBITS</code> — trừ một. ' +
      '<code>.bss</code> có kiểu <b><code>NOBITS</code></b>, nghĩa đen là "không có byte nào". ' +
      'Đây là chi tiết tạo ra nghịch lý mà bài mở đầu đã nêu:' },

    { t: 'code', where: 'wsl', code:
      'size sample\n' +
      'stat -c \'%s %n\' sample' },

    { t: 'code', where: 'out', nocopy: true, code:
      '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
      '   1651\t    624\t  16424\t  18699\t   490b\tsample\n' +
      '16184 sample' },

    { t: 'cal', kind: 'info', title: 'bss = 16 424 byte, nhưng cả file chỉ nặng 16 184 byte', x:
      '<p>Phần <code>.bss</code> <b>lớn hơn toàn bộ file chứa nó</b>. Không có phép màu nào ' +
      'ở đây — <code>.bss</code> đơn giản là <b>không nằm trong file</b>.</p>' +
      '<p>Trong bảng section, <code>.bss</code> có <code>Off = 003020</code> và ' +
      '<code>Size = 004028</code>. Nhưng section ngay sau nó, <code>.comment</code>, cũng bắt ' +
      'đầu ở <code>Off = 003020</code> — <b>trùng vị trí</b>. Với <code>NOBITS</code>, trường ' +
      '<code>Off</code> vô nghĩa; nó không chiếm chỗ nên section kế tiếp ghi đè lên ngay.</p>' +
      '<p>Điều duy nhất được ghi lại là <b>kích thước</b>. Lúc nạp chương trình, kernel đọc ' +
      'con số đó, cấp đúng bấy nhiêu bộ nhớ và <b>điền toàn số 0</b>.</p>' },

    { t: 'p', x: 'Chứng minh trực tiếp — tăng mảng từ 16 KB lên <b>1 MB</b> và đo lại:' },

    { t: 'code', where: 'wsl', code:
      'sed \'s/buffer\\[16384\\]/buffer[1048576]/\' sample.c > sample_big.c\n' +
      'gcc -O2 -o sample_big sample_big.c\n' +
      'stat -c \'%s %n\' sample sample_big\n' +
      'size sample_big' },

    { t: 'code', where: 'out', nocopy: true, code:
      '16184 sample\n' +
      '16192 sample_big\n' +
      '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
      '   1651\t    624\t1048616\t1050891\t 10090b\tsample_big' },

    { t: 'cal', kind: 'why', title: 'Thêm 1 MB biến mà file gần như không to thêm', x:
      '<p><code>bss</code> nhảy từ <b>16 424</b> lên <b>1 048 616</b> byte — tăng hơn ' +
      '<b>1 triệu</b> byte. Kích thước file: từ <b>16 184</b> lên <b>16 192</b> byte — chỉ ' +
      '<b>lệch 8 byte</b>, và 8 byte đó không liên quan gì tới mảng: nó đến từ bảng ký hiệu ' +
      '(<code>.strtab</code>) đổi kích thước theo cách trình liên kết sắp xếp chuỗi tên, một ' +
      'chi tiết cực nhỏ so với 1 048 576 byte mà mảng đã "biến mất".</p>' +
      '<p>Lý do rất thực dụng: một mảng 1 MB toàn số 0 nếu lưu thật vào file thì đó là 1 MB ' +
      'số 0 vô nghĩa. Ghi lại <i>con số</i> 1 048 576 tốn 8 byte là đủ.</p>' +
      '<p>Trong nhúng, điều này có nghĩa: một bộ đệm lớn khai báo toàn cục ' +
      '<b>không</b> làm phình firmware trên flash, nhưng <b>vẫn</b> ngốn RAM lúc chạy. Nếu ' +
      'thiết bị của bạn có 32 MB flash và 16 MB RAM thì đây là hai ngân sách hoàn toàn khác ' +
      'nhau, và <code>size</code> là công cụ để theo dõi cả hai.</p>' },

    { t: 'p', x: 'Đối chứng — cùng dung lượng nhưng là biến <b>có khởi tạo</b>:' },

    { t: 'code', where: 'file', name: '~/bai18/sample_data.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      'int buffer[262144] = { 1 };\n' +
      'int main(void) { printf("%d\\n", buffer[0]); return 0; }' },

    { t: 'code', where: 'wsl', code:
      'gcc -O2 -o sample_data sample_data.c\n' +
      'stat -c \'%s %n\' sample_data\n' +
      'size sample_data' },

    { t: 'code', where: 'out', nocopy: true, code:
      '1064592 sample_data\n' +
      '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
      '   1412\t1049192\t      8\t1050612\t 1007f4\tsample_data' },

    { t: 'cal', kind: 'danger', title: 'Một phần tử khác 0 đẩy cả mảng 1 MB vào file', x:
      '<p><code>= { 1 }</code> khởi tạo phần tử đầu bằng 1, 262 143 phần tử còn lại bằng 0. ' +
      'Nhưng vì mảng có <i>bộ khởi tạo</i>, toàn bộ nó rơi vào <code>.data</code> — và ' +
      '<code>.data</code> là <code>PROGBITS</code>, phải nằm thật trong file.</p>' +
      '<p>Kết quả: file phình từ <b>16 184</b> lên <b>1 064 592</b> byte — <b>gấp 65,8 lần</b>, ' +
      'chỉ vì một số 1.</p>' +
      '<p>Đây là cái bẫy dung lượng phổ biến nhất trong firmware nhúng. Nếu bạn thấy ảnh ' +
      'firmware to bất thường, <code>size</code> và <code>readelf -S</code> là hai lệnh đầu ' +
      'tiên nên gõ. Cách sửa: bỏ bộ khởi tạo và gán giá trị trong <code>main()</code>, hoặc ' +
      'đánh dấu mảng <code>const</code> để nó vào <code>.rodata</code> và được ánh xạ thẳng ' +
      'từ flash mà không tốn RAM.</p>' },

    /* ══════════════════════════════════════════════
       5. SEGMENT
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Segment — bản đồ dành cho kernel' },

    { t: 'p', x:
      'Section là cách <b>trình liên kết</b> nhìn file: 31 mảnh có tên, phân loại tỉ mỉ. ' +
      'Nhưng kernel lúc nạp chương trình không quan tâm tới tên hay tới việc ' +
      '<code>.rodata</code> khác <code>.eh_frame</code> ở chỗ nào. Nó chỉ cần biết: ' +
      '<b>vùng nào của file phải đưa vào bộ nhớ, ở địa chỉ nào, với quyền gì</b>. Cách nhìn ' +
      'đó gọi là <b>segment</b>.' },

    { t: 'code', where: 'wsl', code: 'readelf -l -W sample | head -29' },

    { t: 'code', where: 'out', nocopy: true, code:
      'Elf file type is DYN (Position-Independent Executable file)\n' +
      'Entry point 0x10e0\n' +
      'There are 14 program headers, starting at offset 64\n' +
      '\n' +
      'Program Headers:\n' +
      '  Type           Offset   VirtAddr           PhysAddr           FileSiz  MemSiz   Flg Align\n' +
      '  PHDR           0x000040 0x0000000000000040 0x0000000000000040 0x000310 0x000310 R   0x8\n' +
      '  INTERP         0x000374 0x0000000000000374 0x0000000000000374 0x00001c 0x00001c R   0x1\n' +
      '      [Requesting program interpreter: /lib64/ld-linux-x86-64.so.2]\n' +
      '  LOAD           0x000000 0x0000000000000000 0x0000000000000000 0x000678 0x000678 R   0x1000\n' +
      '  LOAD           0x001000 0x0000000000001000 0x0000000000001000 0x0001f1 0x0001f1 R E 0x1000\n' +
      '  LOAD           0x002000 0x0000000000002000 0x0000000000002000 0x000168 0x000168 R   0x1000\n' +
      '  LOAD           0x002db0 0x0000000000003db0 0x0000000000003db0 0x000270 0x004298 RW  0x1000\n' +
      '  DYNAMIC        0x002dc0 0x0000000000003dc0 0x0000000000003dc0 0x0001f0 0x0001f0 RW  0x8\n' +
      '  NOTE           0x000350 0x0000000000000350 0x0000000000000350 0x000024 0x000024 R   0x4\n' +
      '  NOTE           0x002118 0x0000000000002118 0x0000000000002118 0x000030 0x000030 R   0x8\n' +
      '  NOTE           0x002148 0x0000000000002148 0x0000000000002148 0x000020 0x000020 R   0x4\n' +
      '  GNU_PROPERTY   0x002118 0x0000000000002118 0x0000000000002118 0x000030 0x000030 R   0x8\n' +
      '  GNU_EH_FRAME   0x002020 0x0000000000002020 0x0000000000002020 0x00003c 0x00003c R   0x4\n' +
      '  GNU_STACK      0x000000 0x0000000000000000 0x0000000000000000 0x000000 0x000000 RW  0x10\n' +
      '  GNU_RELRO      0x002db0 0x0000000000003db0 0x0000000000003db0 0x000250 0x000250 R   0x1\n' +
      '\n' +
      ' Section to Segment mapping:\n' +
      '  Segment Sections...\n' +
      '   00     \n' +
      '   01     .interp \n' +
      '   02     .note.gnu.build-id .interp .gnu.hash .dynsym .dynstr .gnu.version .gnu.version_r .rela.dyn .rela.plt \n' +
      '   03     .init .plt .plt.got .plt.sec .text .fini' },

    { t: 'cal', kind: 'info', title: 'Ba dòng NOTE thay vì một — vì sao', x:
      '<p>Toolchain hiện tại của bạn (GCC/binutils cập nhật) tách siêu dữ liệu ' +
      '<code>.note.gnu.build-id</code>, <code>.note.gnu.property</code> và ' +
      '<code>.note.ABI-tag</code> thành <b>ba</b> segment <code>NOTE</code> riêng thay vì gộp ' +
      'chung một segment như các bản binutils cũ hơn. Đây thuần tuý là cách trình liên kết tổ ' +
      'chức <i>metadata</i>, không ảnh hưởng gì tới <code>LOAD</code> — segment mà chương ' +
      'trình thật sự cần để chạy vẫn y nguyên bốn đoạn như phần tiếp theo phân tích.</p>' },

    { t: 'cal', kind: 'why', title: 'Dòng LOAD thứ tư chứa lời giải thích cuối cùng cho .bss', x:
      '<p>Nhìn đoạn <code>LOAD</code> có cờ <code>RW</code>:</p>' +
      '<p><code>FileSiz 0x000270</code> = <b>624</b> byte đọc từ file.<br>' +
      '<code>MemSiz&nbsp; 0x004298</code> = <b>17 048</b> byte chiếm trong RAM.</p>' +
      '<p>Chênh lệch <b>16 424</b> byte — <b>đúng bằng kích thước <code>.bss</code></b>.</p>' +
      '<p>Kernel đọc hai con số này và làm đúng một việc: ánh xạ 624 byte từ file, rồi cấp ' +
      'thêm 16 424 byte và <b>điền số 0</b>. Toàn bộ cơ chế <code>.bss</code> gói gọn trong ' +
      'sự chênh lệch giữa <code>FileSiz</code> và <code>MemSiz</code>. Đây là chỗ để bạn ' +
      '<b>kiểm chứng</b> chứ không phải tin lời.</p>' },

    { t: 'fig',
      svg:
        '<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Section duoc gom thanh segment, va segment duoc kernel anh xa vao bo nho">' +
        '<text class="d-t" x="20" y="20">FILE TREN DIA — 31 section</text>' +
        '<text class="d-t" x="430" y="20">BO NHO KHI CHAY — 4 doan LOAD</text>' +

        '<rect class="d-box" x="20" y="32" width="180" height="30" rx="4"/>' +
        '<text class="d-tm" x="110" y="52" text-anchor="middle">.interp .dynsym .rela</text>' +
        '<rect class="d-box-p" x="20" y="66" width="180" height="30" rx="4"/>' +
        '<text class="d-tm" x="110" y="86" text-anchor="middle">.init .plt .text .fini</text>' +
        '<rect class="d-box-a" x="20" y="100" width="180" height="30" rx="4"/>' +
        '<text class="d-tm" x="110" y="120" text-anchor="middle">.rodata .eh_frame</text>' +
        '<rect class="d-box-g" x="20" y="134" width="180" height="30" rx="4"/>' +
        '<text class="d-tm" x="110" y="154" text-anchor="middle">.dynamic .got .data</text>' +
        '<rect class="d-box-w" x="20" y="168" width="180" height="30" rx="4"/>' +
        '<text class="d-tm" x="110" y="188" text-anchor="middle">.bss  (NOBITS)</text>' +
        '<rect class="d-box" x="20" y="202" width="180" height="30" rx="4"/>' +
        '<text class="d-tm" x="110" y="222" text-anchor="middle">.symtab .strtab</text>' +

        '<line class="d-line" x1="200" y1="47" x2="418" y2="47"/>' +
        '<path class="d-arrow" d="M418 47 l-8 -4 v8 z"/>' +
        '<line class="d-line" x1="200" y1="81" x2="418" y2="81"/>' +
        '<path class="d-arrow" d="M418 81 l-8 -4 v8 z"/>' +
        '<line class="d-line" x1="200" y1="115" x2="418" y2="115"/>' +
        '<path class="d-arrow" d="M418 115 l-8 -4 v8 z"/>' +
        '<line class="d-line" x1="200" y1="149" x2="418" y2="160"/>' +
        '<path class="d-arrow" d="M418 160 l-8 -2 l0 8 z"/>' +
        '<line class="d-line" x1="200" y1="183" x2="418" y2="176"/>' +
        '<path class="d-arrow" d="M418 176 l-8 2 l0 -8 z"/>' +
        '<line class="d-line" x1="200" y1="217" x2="300" y2="217"/>' +
        '<text class="d-ts" x="306" y="221">KHONG co co A — khong duoc nap</text>' +

        '<rect class="d-box" x="424" y="32" width="276" height="30" rx="4"/>' +
        '<text class="d-tm" x="562" y="52" text-anchor="middle">LOAD  R    1656 B</text>' +
        '<rect class="d-box-p" x="424" y="66" width="276" height="30" rx="4"/>' +
        '<text class="d-tm" x="562" y="86" text-anchor="middle">LOAD  R E   497 B</text>' +
        '<rect class="d-box-a" x="424" y="100" width="276" height="30" rx="4"/>' +
        '<text class="d-tm" x="562" y="120" text-anchor="middle">LOAD  R     360 B</text>' +
        '<rect class="d-box-g" x="424" y="134" width="276" height="30" rx="4"/>' +
        '<text class="d-tm" x="562" y="154" text-anchor="middle">LOAD  RW  FileSiz 624 B</text>' +
        '<rect class="d-box-w" x="424" y="168" width="276" height="30" rx="4"/>' +
        '<text class="d-tm" x="562" y="188" text-anchor="middle">... MemSiz 17 048 B — dien so 0</text>' +

        '<rect class="d-box" x="424" y="212" width="276" height="42" rx="4"/>' +
        '<text class="d-ts" x="440" y="230">17 048 - 624 = 16 424 = dung kich thuoc .bss</text>' +
        '<text class="d-ts" x="440" y="246">Khong doan nao vua W vua X — nguyen tac W^X</text>' +

        '<text class="d-ts" x="20" y="276">Section = cach TRINH LIEN KET nhin file   ·   Segment = cach KERNEL nhin file   ·   Cung mot du lieu, hai goc nhin</text>' +
        '</svg>',
      cap:
        'Nhiều section có cùng quyền truy cập được gom vào một segment, vì đơn vị cấp phát ' +
        'nhỏ nhất của bộ nhớ ảo là một trang 4 KB. Chênh lệch FileSiz/MemSiz của segment RW ' +
        'chính là .bss.' },

    { t: 'table',
      head: ['Segment', 'Nhiệm vụ', 'Vì sao cần biết'],
      rows: [
        ['<code>LOAD</code>', 'Vùng phải được ánh xạ vào bộ nhớ', '<b>Loại quan trọng nhất.</b> Mọi thứ khác chỉ là ghi chú'],
        ['<code>INTERP</code>', 'Đường dẫn trình thông dịch động', 'Kernel đọc dòng này rồi khởi động <code>ld.so</code> <b>trước</b> chương trình của bạn'],
        ['<code>DYNAMIC</code>', 'Trỏ tới bảng <code>.dynamic</code>', 'Nơi <code>ld.so</code> tìm danh sách <code>NEEDED</code> của Bài 17'],
        ['<code>GNU_STACK</code>', 'Quyền của ngăn xếp', 'Cờ <code>RW</code> (không có <code>E</code>) = <b>ngăn xếp không thi hành được</b>. Nếu thấy <code>RWE</code>, đó là một lỗ hổng'],
        ['<code>GNU_RELRO</code>', 'Vùng chuyển sang chỉ đọc sau khi nạp xong', '<i>RELocation Read-Only</i>: bảo vệ GOT khỏi bị ghi đè sau khi <code>ld.so</code> điền xong'],
        ['<code>NOTE</code>', 'Siêu dữ liệu: BuildID, phiên bản ABI', 'Nguồn của <code>BuildID[sha1]=…</code> mà <code>file</code> in ra']
      ]},

    { t: 'p', x:
      'Section <code>.interp</code> chứa đúng chuỗi mà bạn đã gặp ở cuối output ' +
      '<code>ldd</code> trong Bài 17:' },

    { t: 'code', where: 'wsl', code: 'readelf -p .interp sample' },

    { t: 'code', where: 'out', nocopy: true, code:
      'String dump of section \'.interp\':\n' +
      '  [     0]  /lib64/ld-linux-x86-64.so.2' },

    { t: 'cal', kind: 'info', title: 'Đây là mắt xích còn thiếu giữa Bài 17 và bài này', x:
      '<p>Ở Bài 17 bạn thấy <code>/lib64/ld-linux-x86-64.so.2</code> trong output ' +
      '<code>ldd</code> mà không rõ nó từ đâu ra. Giờ thì rõ: nó là một chuỗi <b>28 byte ghi ' +
      'cứng trong file</b>, ở section <code>.interp</code>.</p>' +
      '<p>Trình tự đầy đủ khi bạn gõ <code>./sample</code>: kernel kiểm tra magic <code>7f ELF</code> ' +
      '→ thấy có segment <code>INTERP</code> → đọc chuỗi trong đó → nạp ' +
      '<code>ld.so</code> → trao quyền cho <code>ld.so</code> → <code>ld.so</code> nạp các ' +
      '<code>.so</code> theo <code>NEEDED</code> → cuối cùng mới nhảy tới điểm vào của chương ' +
      'trình bạn.</p>' +
      '<p>Chương trình <code>-static</code> <b>không có</b> segment <code>INTERP</code>, nên ' +
      'kernel nhảy thẳng vào — đó là lý do nó khởi động nhanh hơn.</p>' },

    /* ══════════════════════════════════════════════
       6. KÝ HIỆU
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Ký hiệu — mỗi biến nằm ở section nào' },

    { t: 'p', x:
      'Ở Bài 15 bạn dùng <code>nm</code> để phân biệt <code>T</code> và <code>U</code>. Giờ ' +
      'bạn đã có bản đồ section, chữ cái mà <code>nm</code> in ra trở nên có nghĩa hoàn ' +
      'chỉnh: <b>mỗi chữ cái là một section</b>.' },

    { t: 'code', where: 'wsl', code:
      'nm sample | grep -E \' [BbDdRrTtUuVvWw] \' | sort -k3' },

    { t: 'code', where: 'out', nocopy: true, code:
      '                 U __libc_start_main@GLIBC_2.34\n' +
      '                 U __printf_chk@GLIBC_2.3.4\n' +
      '                 U memset@GLIBC_2.2.5\n' +
      '                 w _ITM_deregisterTMCloneTable\n' +
      '                 w _ITM_registerTMCloneTable\n' +
      '                 w __cxa_finalize@GLIBC_2.2.5\n' +
      '                 w __gmon_start__\n' +
      '0000000000003dc0 d _DYNAMIC\n' +
      '0000000000003fb0 d _GLOBAL_OFFSET_TABLE_\n' +
      '0000000000002000 R _IO_stdin_used\n' +
      '0000000000002114 r __FRAME_END__\n' +
      '0000000000002020 r __GNU_EH_FRAME_HDR\n' +
      '0000000000004020 D __TMC_END__\n' +
      '0000000000002148 r __abi_tag\n' +
      '0000000000004020 B __bss_start\n' +
      '0000000000004000 D __data_start\n' +
      '0000000000001180 t __do_global_dtors_aux\n' +
      '0000000000003db8 d __do_global_dtors_aux_fini_array_entry\n' +
      '0000000000004008 D __dso_handle\n' +
      '0000000000003db0 d __frame_dummy_init_array_entry\n' +
      '0000000000004020 D _edata\n' +
      '0000000000008048 B _end\n' +
      '00000000000011e4 T _fini\n' +
      '0000000000001000 T _init\n' +
      '00000000000010e0 T _start\n' +
      '0000000000004040 B buffer\n' +
      '0000000000004020 b completed.0\n' +
      '0000000000004000 W data_start\n' +
      '0000000000001110 t deregister_tm_clones\n' +
      '00000000000011c0 t frame_dummy\n' +
      '00000000000011d0 T increment\n' +
      '0000000000004010 D init_count\n' +
      '0000000000001080 T main\n' +
      '0000000000004018 D name\n' +
      '0000000000001140 t register_tm_clones\n' +
      '0000000000008040 B zero_count' },

    { t: 'cal', kind: 'info', title: 'Nhiều ký hiệu lạ hơn bạn tưởng — đó là bộ máy khởi động của glibc', x:
      '<p>Danh sách đầy đủ dài hơn năm biến bạn khai báo rất nhiều: <code>_ITM_*</code>, ' +
      '<code>_DYNAMIC</code>, <code>_GLOBAL_OFFSET_TABLE_</code>, <code>__frame_dummy...</code>, ' +
      '<code>register_tm_clones</code>… đều do <code>crt1.o</code>/<code>crti.o</code> và GCC ' +
      'chèn vào, không phải do bạn viết. Đừng cố nhớ hết — chỉ cần nhận ra <b>sáu ký hiệu của ' +
      'riêng bạn</b>: <code>main</code>, <code>increment</code>, <code>init_count</code>, ' +
      '<code>name</code>, <code>buffer</code>, <code>zero_count</code>.</p>' },

    { t: 'table',
      head: ['Chữ', 'Section', 'Ý nghĩa', 'Trong ví dụ'],
      rows: [
        ['<code>T</code>', '<code>.text</code>', 'Hàm, <b>xuất ra ngoài</b> (chữ hoa = global)', '<code>main</code>, <code>increment</code>, <code>_start</code>'],
        ['<code>t</code>', '<code>.text</code>', 'Hàm, <b>chỉ dùng nội bộ</b> (<code>static</code>)', '<code>frame_dummy</code>, <code>register_tm_clones</code>'],
        ['<code>D</code>', '<code>.data</code>', 'Biến có khởi tạo, ghi được', '<code>init_count</code>, <code>name</code>'],
        ['<code>B</code>', '<code>.bss</code>', 'Biến bằng 0', '<code>buffer</code>, <code>zero_count</code>'],
        ['<code>R</code>', '<code>.rodata</code>', 'Dữ liệu chỉ đọc', '<code>_IO_stdin_used</code>'],
        ['<code>U</code>', '<i>chưa xác định</i>', '<b>Cần</b> nhưng chưa có — phải do thư viện cung cấp', '<code>memset</code>, <code>__printf_chk</code>'],
        ['<code>w</code>', '—', '<b>Weak</b> — dùng nếu có, bỏ qua nếu không, không báo lỗi', '<code>__gmon_start__</code>']
      ]},

    { t: 'cal', kind: 'info', title: 'private_val biến mất, printf đổi tên, và buffer cách zero_count 16 KB', x:
      '<p><b><code>private_val</code> không xuất hiện.</b> Nó là <code>static</code> và chỉ ' +
      'được đọc một lần, nên <code>-O2</code> đã thay nó bằng hằng số <code>7</code> ngay ' +
      'trong mã. Biến biến mất hoàn toàn — một minh chứng rằng tối ưu hoá thay đổi cả bảng ký ' +
      'hiệu.</p>' +
      '<p><b><code>printf</code> thành <code>__printf_chk</code>.</b> Ubuntu bật sẵn ' +
      '<code>_FORTIFY_SOURCE</code>: khi biết trước kích thước bộ đệm, GCC gọi phiên bản có ' +
      'kiểm tra tràn. Bạn <i>viết</i> <code>printf</code> nhưng <i>gọi</i> hàm khác.</p>' +
      '<p><b>Địa chỉ nói lên bố cục.</b> <code>buffer</code> ở <code>0x4040</code>, ' +
      '<code>zero_count</code> ở <code>0x8040</code> — cách nhau đúng <code>0x4000</code> ' +
      '= 16 384 byte, đúng kích thước mảng. Và <code>_end</code> ở <code>0x8048</code> đánh ' +
      'dấu điểm kết thúc của mọi dữ liệu tĩnh.</p>' },

    { t: 'p', x:
      'Muốn đọc dữ liệu thật trong một section thay vì chỉ đọc tên, dùng <code>-x</code> ' +
      '(hex) hoặc <code>-p</code> (chuỗi):' },

    { t: 'code', where: 'wsl', code:
      'readelf -x .rodata sample\n' +
      'readelf -x .data sample' },

    { t: 'code', where: 'out', nocopy: true, code:
      'Hex dump of section \'.rodata\':\n' +
      '  0x00002000 01000200 25733a20 25642025 640a0065 ....%s: %d %d..e\n' +
      '  0x00002010 6d626564 64656420 64657669 636500   mbedded device.\n' +
      '\n' +
      'Hex dump of section \'.data\':\n' +
      '  0x00004000 00000000 00000000 08400000 00000000 .........@......\n' +
      '  0x00004010 2a000000 00000000 0f200000 00000000 *........ ......' },

    { t: 'cal', kind: 'tip', title: 'Tìm số 42 trong đống byte đó', x:
      '<p>Ở địa chỉ <code>0x4010</code> — đúng nơi <code>nm</code> báo <code>init_count</code> ' +
      'nằm — bạn thấy <code>2a 00 00 00</code>. <code>0x2a</code> = <b>42</b>. Đó chính là giá ' +
      'trị bạn viết trong mã nguồn, nằm nguyên vẹn trong file trên đĩa.</p>' +
      '<p>Bốn byte <code>00</code> theo sau là phần đệm căn lề 8 byte. Và thứ tự ' +
      '<code>2a 00 00 00</code> chứ không phải <code>00 00 00 2a</code> chính là ' +
      '<b>little-endian</b> mà ELF header đã khai báo — byte thấp trước.</p>' +
      '<p>Ở <code>0x4018</code> có <code>0f 20 00 00</code> = <code>0x200f</code>: đó là con ' +
      'trỏ <code>name</code>, trỏ vào giữa <code>.rodata</code> — đúng vị trí chuỗi ' +
      '<code>"embedded device"</code> bắt đầu.</p>' },

    /* ══════════════════════════════════════════════
       7. _START
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Chương trình không bắt đầu ở main' },

    { t: 'p', x:
      'ELF header khai <code>Entry point address: 0x10e0</code>. Nhưng <code>nm</code> cho ' +
      'biết <code>main</code> nằm ở <code>0x1080</code>. Hai địa chỉ khác nhau — vậy chỗ nào ' +
      'là điểm bắt đầu thật?' },

    { t: 'code', where: 'wsl', code:
      'readelf -h sample | grep Entry\n' +
      'nm sample | grep -E \' T (main|_start)$\'\n' +
      'objdump -d --start-address=0x10e0 --stop-address=0x1100 sample | tail -5' },

    { t: 'code', where: 'out', nocopy: true, code:
      '  Entry point address:               0x10e0\n' +
      '00000000000010e0 T _start\n' +
      '0000000000001080 T main\n' +
      '    10f1:\t50                   \tpush   %rax\n' +
      '    10f2:\t54                   \tpush   %rsp\n' +
      '    10f3:\t45 31 c0             \txor    %r8d,%r8d\n' +
      '    10f6:\t31 c9                \txor    %ecx,%ecx\n' +
      '    10f8:\t48 8d 3d 81 ff ff ff \tlea    -0x7f(%rip),%rdi        # 1080 <main>' },

    { t: 'cal', kind: 'why', title: 'main chỉ là một tham số truyền cho glibc', x:
      '<p>Điểm vào thật là <b><code>_start</code></b> ở <code>0x10e0</code>, do file ' +
      '<code>crt1.o</code> của glibc cung cấp — chính là file mà bạn đã thấy ' +
      '<code>collect2</code> ghép vào ở Bài 15.</p>' +
      '<p>Dòng cuối là mấu chốt: <code>lea -0x7f(%rip),%rdi</code> nạp <b>địa chỉ của ' +
      '<code>main</code></b> vào thanh ghi <code>%rdi</code> — thanh ghi mang tham số thứ ' +
      'nhất theo quy ước gọi hàm x86-64. Ngay sau đó <code>_start</code> gọi ' +
      '<code>__libc_start_main</code>, và chính hàm này mới gọi <code>main</code> của bạn.</p>' +
      '<p>Trước khi <code>main</code> chạy, <code>__libc_start_main</code> đã làm rất nhiều ' +
      'việc: dựng <code>argc</code>/<code>argv</code>/<code>environ</code>, khởi tạo ' +
      '<code>stdio</code>, chạy mọi hàm trong <code>.init_array</code> (các hàm đánh dấu ' +
      '<code>__attribute__((constructor))</code>), và đăng ký <code>exit</code> để dọn dẹp ' +
      'sau khi <code>main</code> trả về.</p>' +
      '<p>Đây là lý do <code>hello world</code> tĩnh nặng 816 912 byte: phần lớn không phải mã ' +
      'của bạn, mà là bộ máy khởi động và <code>printf</code> của glibc.</p>' },

    /* ══════════════════════════════════════════════
       8. CẮT BỚT
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Cắt bớt: strip và --gc-sections' },

    { t: 'p', x:
      'Bảng ký hiệu không có cờ <code>A</code>, tức là không bao giờ được nạp vào RAM. Với ' +
      'thiết bị nhúng, đó là mấy chục KB nằm không trên flash. <code>strip</code> cắt chúng đi:' },

    { t: 'code', where: 'wsl', code:
      'cp sample sample_strip && strip sample_strip\n' +
      'stat -c \'%s %n\' sample sample_strip\n' +
      './sample_strip\n' +
      'nm sample_strip' },

    { t: 'code', where: 'out', nocopy: true, code:
      '16184 sample\n' +
      '14480 sample_strip\n' +
      'embedded device: 43 7\n' +
      'nm: sample_strip: no symbols' },

    { t: 'p', x: 'Hiệu quả rõ hơn nhiều trên bản liên kết tĩnh:' },

    { t: 'code', where: 'wsl', code:
      'gcc -O2 -static -o sample_static sample.c\n' +
      'cp sample_static sample_static_strip && strip sample_static_strip\n' +
      'stat -c \'%s %n\' sample_static sample_static_strip' },

    { t: 'code', where: 'out', nocopy: true, code:
      '816992 sample_static\n' +
      '735512 sample_static_strip' },

    { t: 'table',
      head: ['File', 'Trước <code>strip</code>', 'Sau <code>strip</code>', 'Giảm'],
      rows: [
        ['<code>sample</code> (động)', '16 184 B', '14 480 B', '1 704 B — <b>10,5 %</b>'],
        ['<code>sample_static</code> (tĩnh)', '816 992 B', '735 512 B', '81 480 B — <b>10,0 %</b>']
      ]},

    { t: 'cal', kind: 'warn', title: 'strip không làm chương trình chạy nhanh hơn hay tốn ít RAM hơn', x:
      '<p>Nó chỉ cắt các section không có cờ <code>A</code>. Những section đó vốn đã không ' +
      'được nạp, nên RAM lúc chạy <b>không đổi một byte</b>. Cái được là dung lượng ' +
      '<b>flash</b> — và đó thường là ràng buộc thật của thiết bị nhúng.</p>' +
      '<p>Cái mất: mọi thông tin gỡ lỗi. Khi chương trình sập, backtrace sẽ chỉ còn địa chỉ ' +
      'trần thay vì tên hàm.</p>' +
      '<p><b>Cách làm chuẩn trong ngành</b> — và cũng là cách Yocto làm ở Chặng 11: giữ lại ' +
      'bản không strip trên máy phát triển, đưa bản đã strip lên thiết bị. Khi cần gỡ lỗi, ' +
      'dùng <code>BuildID</code> để ghép hai bản lại. Đó chính là công dụng của chuỗi ' +
      '<code>BuildID[sha1]=…</code> mà <code>file</code> in ra.</p>' },

    { t: 'p', x:
      'Cách thứ hai là loại bỏ những <b>hàm không ai gọi</b>. Ở Bài 17 bạn đã thấy trình liên ' +
      'kết chỉ lấy nguyên một file <code>.o</code>; cặp cờ dưới đây đẩy độ mịn xuống <b>từng ' +
      'hàm</b>:' },

    { t: 'code', where: 'file', name: '~/bai18/multi_func.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      'int func_a(int x) { return x + 1; }\n' +
      'int func_b(int x) { return x * 2; }\n' +
      'int func_c(int x) { return x - 3; }\n' +
      'int func_d(int x) { return x / 4; }\n' +
      'int func_e(int x) { return x % 5; }\n' +
      'int main(void) { printf("%d\\n", func_a(10)); return 0; }' },

    { t: 'code', where: 'wsl', code:
      'gcc -O2 -o multi_normal multi_func.c\n' +
      'gcc -O2 -ffunction-sections -fdata-sections -Wl,--gc-sections -o multi_gc multi_func.c\n' +
      'stat -c \'%s %n\' multi_normal multi_gc\n' +
      'nm multi_normal | grep -c \' T func_\'\n' +
      'nm multi_gc | grep -c \' T func_\'' },

    { t: 'code', where: 'out', nocopy: true, code:
      '16120 multi_normal\n' +
      '15856 multi_gc\n' +
      '5\n' +
      '0' },

    { t: 'cmdx', cmd: 'gcc -ffunction-sections -fdata-sections -Wl,--gc-sections',
      title: 'Ba cờ phải đi cùng nhau',
      rows: [
        ['<code>-ffunction-sections</code>', 'Đặt <b>mỗi hàm vào một section riêng</b>: <code>.text.func_a</code>, <code>.text.func_b</code>…', 'Không có nó, cả năm hàm nằm chung trong <code>.text</code> và không thể tách rời'],
        ['<code>-fdata-sections</code>', 'Tương tự cho biến toàn cục', 'Cần khi có nhiều bảng dữ liệu lớn không dùng tới'],
        ['<code>-Wl,--gc-sections</code>', 'Bảo trình liên kết <b>vứt bỏ section nào không ai tham chiếu tới</b>', 'Đây mới là cờ thật sự cắt. Hai cờ trên chỉ tạo điều kiện'],
        ['<code>-Wl,--print-gc-sections</code>', 'In ra danh sách những gì bị vứt', 'Rất nên thêm khi mới dùng, để thấy nó cắt đúng cái mình nghĩ']
      ]},

    { t: 'cal', kind: 'info', title: 'Cả 5 hàm biến mất, nhưng chỉ tiết kiệm 264 byte — vì sao đáng bàn', x:
      '<p>Bản thường giữ đủ <b>5</b> hàm dù chỉ dùng một. Bản <code>--gc-sections</code> còn ' +
      '<b>0</b> — <code>func_a</code> đã được <code>-O2</code> nội tuyến thẳng vào ' +
      '<code>main</code>, bốn hàm còn lại bị vứt.</p>' +
      '<p>Nhưng kích thước chỉ giảm từ <b>16 120</b> xuống <b>15 856</b> byte — <b>1,6 %</b>. ' +
      'Vì bốn hàm cộng lại chỉ vài chục byte, còn phần lớn file là bộ khởi động của glibc.</p>' +
      '<p>Con số này đổi hoàn toàn khi bạn liên kết tĩnh với một thư viện lớn mà chỉ dùng vài ' +
      'hàm — trường hợp rất điển hình trong firmware nhúng. <b>Chặng 09</b> sẽ dùng đúng cặp ' +
      'cờ này để thu nhỏ ảnh rootfs, và ở đó mức tiết kiệm tính bằng trăm KB.</p>' +
      '<p>Bài học phương pháp: <b>luôn đo trước khi tin</b>. Một kỹ thuật tối ưu đúng về ' +
      'nguyên lý vẫn có thể vô nghĩa ở quy mô cụ thể của bạn.</p>' },

    /* ══════════════════════════════════════════════
       9. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: mổ một file ELF từ đầu đến cuối' },

    { t: 'p', x:
      'Bảy bước, mỗi bước một công cụ. Kết thúc, bạn sẽ soi được bất kỳ file nhị phân nào ' +
      'gặp trong nghề. Mọi output dưới đây là kết quả thật, chụp lại khi chạy đúng những ' +
      'lệnh này trên máy bạn.' },

    { t: 'steps', items: [

      /* ---- Bước 1 ---- */
      { title: 'Dựng chương trình mẫu và đọc ELF header', blocks: [
        { t: 'code', where: 'wsl', code: 'mkdir -p ~/bai18-th && cd ~/bai18-th' },

        { t: 'code', where: 'file', name: '~/bai18-th/sample.c', lang: 'c', code:
          '#include <stdio.h>\n' +
          '#include <string.h>\n' +
          '\n' +
          'int    init_count   = 42;\n' +
          'int    zero_count;\n' +
          'char   buffer[16384];\n' +
          'const char *name = "embedded device";\n' +
          'static int private_val = 7;\n' +
          '\n' +
          'int increment(void) { return ++init_count; }\n' +
          '\n' +
          'int main(void)\n' +
          '{\n' +
          '    memset(buffer, 0, sizeof buffer);\n' +
          '    printf("%s: %d %d\\n", name, increment(), private_val);\n' +
          '    return 0;\n' +
          '}' },

        { t: 'code', where: 'wsl', code:
          'gcc -O2 -o sample sample.c\n' +
          './sample\n' +
          'file sample\n' +
          'readelf -h sample | grep -E \'Magic|Class|Data|Type|Machine|Entry|Number of\'' },

        { t: 'code', where: 'out', nocopy: true, code:
          'embedded device: 43 7\n' +
          'sample: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=7449f0dd46fd68fb9c2897326b42e25dd3f8b6b6, for GNU/Linux 3.2.0, not stripped\n' +
          '  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00 \n' +
          '  Class:                             ELF64\n' +
          '  Data:                              2\'s complement, little endian\n' +
          '  Type:                              DYN (Position-Independent Executable file)\n' +
          '  Machine:                           Advanced Micro Devices X86-64\n' +
          '  Entry point address:               0x10e0\n' +
          '  Number of program headers:         14\n' +
          '  Number of section headers:         31' },

        { t: 'cal', kind: 'tip', title: 'BuildID của bạn sẽ khác', x:
          '<p>Chuỗi <code>BuildID[sha1]=…</code> là mã băm tính từ nội dung file. Nếu bạn gõ ' +
          'lại <code>sample.c</code> giống hệt từng ký tự, BuildID sẽ trùng; lệch một dấu cách ' +
          'là nó khác. Các số khác (<code>0x10e0</code>, <code>31</code>, <code>14</code>) ' +
          'phải trùng — chúng chỉ phụ thuộc trình biên dịch và cờ.</p>' +
          '<p><code>43</code> trong output là <code>42 + 1</code> vì <code>increment()</code> ' +
          'tăng <code>init_count</code> trước khi trả về.</p>' }
      ]},

      /* ---- Bước 2 ---- */
      { title: 'Tìm mỗi biến trong đúng section của nó', blocks: [
        { t: 'code', where: 'wsl', code:
          'readelf -S -W sample | grep -E \'\\[Nr\\]|\\.text|\\.rodata|\\.data|\\.bss|\\.symtab\'' },

        { t: 'code', where: 'out', nocopy: true, code:
          '  [Nr] Name              Type            Address          Off    Size   ES Flg Lk Inf Al\n' +
          '  [14] .text             PROGBITS        0000000000001080 001080 000164 00  AX  0   0 16\n' +
          '  [16] .rodata           PROGBITS        0000000000002000 002000 00001f 00   A  0   0  4\n' +
          '  [25] .data             PROGBITS        0000000000004000 003000 000020 00  WA  0   0  8\n' +
          '  [26] .bss              NOBITS          0000000000004020 003020 004028 00  WA  0   0 32\n' +
          '  [28] .symtab           SYMTAB          0000000000000000 003048 0003f0 18     29  18  8' },

        { t: 'p', x: 'Bây giờ đối chiếu từng biến với dải địa chỉ của section:' },

        { t: 'code', where: 'wsl', code:
          'nm sample | grep -E \' [BDRT] (buffer|init_count|zero_count|name|main|increment|private_val)$\' | sort' },

        { t: 'code', where: 'out', nocopy: true, code:
          '0000000000001080 T main\n' +
          '00000000000011d0 T increment\n' +
          '0000000000004010 D init_count\n' +
          '0000000000004018 D name\n' +
          '0000000000004040 B buffer\n' +
          '0000000000008040 B zero_count' },

        { t: 'table',
          head: ['Ký hiệu', 'Địa chỉ', 'Nằm trong section', 'Vì sao'],
          rows: [
            ['<code>main</code>, <code>increment</code>', '<code>0x1080</code>, <code>0x11d0</code>', '<code>.text</code> (<code>0x1080</code>+<code>0x164</code>)', 'Là mã máy'],
            ['<code>init_count</code>, <code>name</code>', '<code>0x4010</code>, <code>0x4018</code>', '<code>.data</code> (<code>0x4000</code>+<code>0x20</code>)', 'Có giá trị khởi tạo khác 0'],
            ['<code>buffer</code>, <code>zero_count</code>', '<code>0x4040</code>, <code>0x8040</code>', '<code>.bss</code> (<code>0x4020</code>+<code>0x4028</code>)', 'Ngầm bằng 0'],
            ['<code>private_val</code>', '<i>không có</i>', '—', '<code>static</code> + <code>-O2</code> → bị thay bằng hằng số <code>7</code>']
          ]},

        { t: 'p', x: 'Đọc dữ liệu thô của <code>.data</code> để nhìn tận mắt số 42:' },

        { t: 'code', where: 'wsl', code: 'readelf -x .data sample' },

        { t: 'code', where: 'out', nocopy: true, code:
          'Hex dump of section \'.data\':\n' +
          '  0x00004000 00000000 00000000 08400000 00000000 .........@......\n' +
          '  0x00004010 2a000000 00000000 0f200000 00000000 *........ ......' },

        { t: 'cal', kind: 'why', title: 'Ba con số cần đọc ra ở đây', x:
          '<p><b><code>0x4010</code> → <code>2a 00 00 00</code></b>. <code>nm</code> báo ' +
          '<code>init_count</code> ở <code>0x4010</code>; <code>0x2a</code> = <b>42</b>. Đây ' +
          'là giá trị bạn viết trong mã nguồn, nằm nguyên trong file.</p>' +
          '<p><b>Thứ tự byte.</b> <code>2a 00 00 00</code> chứ không phải ' +
          '<code>00 00 00 2a</code> — byte thấp trước, đúng như ELF header khai ' +
          '<code>little endian</code>.</p>' +
          '<p><b><code>0x4018</code> → <code>0f 20 00 00</code></b> = <code>0x200f</code>. Đó là ' +
          'con trỏ <code>name</code>, trỏ vào <code>.rodata</code> (bắt đầu ở ' +
          '<code>0x2000</code>) — chính là nơi chuỗi <code>"embedded device"</code> nằm.</p>' }
      ]},

      /* ---- Bước 3 ---- */
      { title: 'Chứng minh .bss không tốn byte nào trên đĩa', blocks: [
        { t: 'code', where: 'wsl', code:
          'size sample\n' +
          'stat -c \'%s %n\' sample' },

        { t: 'code', where: 'out', nocopy: true, code:
          '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
          '   1651\t    624\t  16424\t  18699\t   490b\tsample\n' +
          '16184 sample' },

        { t: 'cal', kind: 'info', title: 'Cột bss đã lớn hơn cả file — đúng nghịch lý mở đầu bài', x:
          '<p><code>size</code> báo <code>bss = 16 424</code> byte, còn <code>stat</code> ngay dưới ' +
          'cho biết cả file <code>sample</code> chỉ nặng <b>16 184</b> byte — <b>nhỏ hơn chính phần ' +
          '<code>.bss</code> của nó</b>. Đây đúng là con số bạn đã suy ra ở mục 4: <code>.bss</code> có ' +
          'kiểu <code>NOBITS</code> nên không chiếm byte nào trên đĩa, chỉ ghi lại <i>kích thước</i> để ' +
          'kernel tự cấp phát và điền số 0 lúc nạp.</p>' +
          '<p>Để chắc đây không phải trùng hợp giữa hai con số, hãy đổi hẳn kích thước mảng rồi đo lại — ' +
          'bước tiếp theo làm đúng việc đó.</p>' },

        { t: 'p', x: 'Tăng mảng lên 1 MB rồi đo lại — đây là phép thử quyết định:' },

        { t: 'code', where: 'wsl', code:
          'sed \'s/buffer\\[16384\\]/buffer[1048576]/\' sample.c > sample_big.c\n' +
          'gcc -O2 -o sample_big sample_big.c\n' +
          'stat -c \'%s %n\' sample sample_big\n' +
          'size sample_big' },

        { t: 'code', where: 'out', nocopy: true, code:
          '16184 sample\n' +
          '16192 sample_big\n' +
          '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
          '   1651\t    624\t1048616\t1050891\t 10090b\tsample_big' },

        { t: 'p', x: 'Đối chứng: cùng dung lượng nhưng là biến <b>có khởi tạo</b>:' },

        { t: 'code', where: 'file', name: '~/bai18-th/sample_data.c', lang: 'c', code:
          '#include <stdio.h>\n' +
          'int buffer[262144] = { 1 };\n' +
          'int main(void) { printf("%d\\n", buffer[0]); return 0; }' },

        { t: 'code', where: 'wsl', code:
          'gcc -O2 -o sample_data sample_data.c\n' +
          'stat -c \'%s %n\' sample_data\n' +
          'size sample_data' },

        { t: 'code', where: 'out', nocopy: true, code:
          '1064592 sample_data\n' +
          '   text\t   data\t    bss\t    dec\t    hex\tfilename\n' +
          '   1412\t1049192\t      8\t1050612\t 1007f4\tsample_data' },

        { t: 'cal', kind: 'info', title: 'Ba con số cạnh nhau', x:
          '<p><b>16 184</b> — 16 KB mảng trong <code>.bss</code>.<br>' +
          '<b>16 192</b> — 1 MB mảng trong <code>.bss</code>. <i>Gần như không đổi</i> ' +
          '(lệch 8 byte so với dòng trên, do bảng ký hiệu — không liên quan tới kích thước ' +
          'mảng).<br>' +
          '<b>1 064 592</b> — 1 MB mảng trong <code>.data</code>. <b>Gấp 65,8 lần</b> so với ' +
          'chương trình gốc.</p>' +
          '<p>Nhìn thẳng vào cột <code>bss</code> của <code>size</code>: nó nhảy từ <b>16 424</b> lên ' +
          '<b>1 048 616</b> byte — đúng khoảng 1 MB mà bạn vừa thêm vào mảng. Nhưng file trên đĩa gần ' +
          'như không nhúc nhích, vì phần tăng thêm đó <b>chưa từng được ghi thành byte thật</b> — nó chỉ ' +
          'đổi một con số trong section header.</p>' +
          '<p>Khác biệt lớn giữa hai trường hợp cuối chỉ là bốn ký tự <code>= { 1 }</code>.</p>' +
          '<p>Hãy nhớ kỹ điều này khi sau này bạn thấy một ảnh firmware phình bất thường.</p>' }
      ]},

      /* ---- Bước 4 ---- */
      { title: 'Nhìn file bằng con mắt của kernel', blocks: [
        { t: 'code', where: 'wsl', code:
          'readelf -l -W sample | grep -E \'LOAD|INTERP|GNU_STACK|GNU_RELRO|interpreter\'' },

        { t: 'code', where: 'out', nocopy: true, code:
          '  INTERP         0x000374 0x0000000000000374 0x0000000000000374 0x00001c 0x00001c R   0x1\n' +
          '      [Requesting program interpreter: /lib64/ld-linux-x86-64.so.2]\n' +
          '  LOAD           0x000000 0x0000000000000000 0x0000000000000000 0x000678 0x000678 R   0x1000\n' +
          '  LOAD           0x001000 0x0000000000001000 0x0000000000001000 0x0001f1 0x0001f1 R E 0x1000\n' +
          '  LOAD           0x002000 0x0000000000002000 0x0000000000002000 0x000168 0x000168 R   0x1000\n' +
          '  LOAD           0x002db0 0x0000000000003db0 0x0000000000003db0 0x000270 0x004298 RW  0x1000\n' +
          '  GNU_STACK      0x000000 0x0000000000000000 0x0000000000000000 0x000000 0x000000 RW  0x10\n' +
          '  GNU_RELRO      0x002db0 0x0000000000003db0 0x0000000000003db0 0x000250 0x000250 R   0x1' },

        { t: 'p', x:
          'Bốn đoạn <code>LOAD</code>, ba đoạn đầu có <code>FileSiz</code> bằng ' +
          '<code>MemSiz</code>. Đoạn thứ tư thì không — hãy tính chênh lệch:' },

        { t: 'code', where: 'wsl', code:
          'python3 -c "print(\'MemSiz - FileSiz =\', 0x4298 - 0x270)"\n' +
          'readelf -S -W sample | grep \'\\.bss\'' },

        { t: 'code', where: 'out', nocopy: true, code:
          'MemSiz - FileSiz = 16424\n' +
          '  [26] .bss              NOBITS        0000000000004020 003020 004028 00  WA  0   0 32' },

        { t: 'cal', kind: 'why', title: '16 424 = 0x4028 = đúng kích thước .bss', x:
          '<p>Bạn vừa tự tay chứng minh cơ chế <code>.bss</code> ở tầng thấp nhất. Kernel đọc ' +
          'hai con số <code>FileSiz</code> và <code>MemSiz</code>, ánh xạ 624 byte đầu từ file, ' +
          'rồi cấp thêm 16 424 byte và điền số 0.</p>' +
          '<p>Đây cũng là chỗ kiểm tra nguyên tắc <b>W^X</b>: trong bốn đoạn <code>LOAD</code>, ' +
          'không đoạn nào có cả <code>W</code> lẫn <code>E</code>. Đoạn ' +
          '<code>GNU_STACK</code> là <code>RW</code> chứ không <code>RWE</code> — ngăn xếp ' +
          'không thi hành được.</p>' },

        { t: 'p', x: 'Cuối cùng, đọc chuỗi trong <code>.interp</code>:' },

        { t: 'code', where: 'wsl', code: 'readelf -p .interp sample' },

        { t: 'code', where: 'out', nocopy: true, code:
          'String dump of section \'.interp\':\n' +
          '  [     0]  /lib64/ld-linux-x86-64.so.2' },

        { t: 'cal', kind: 'tip', title: 'Đây là dòng cuối trong output ldd của Bài 17', x:
          '<p>Bạn vừa tìm ra nguồn gốc của nó: một chuỗi ghi cứng trong file, chiếm ' +
          '<code>0x1c</code> = 28 byte.</p>' +
          '<p>Thử ngay để thấy khác biệt: <code>gcc -O2 -static -o sample_static sample.c</code> ' +
          'rồi <code>readelf -l -W sample_static | grep INTERP</code> — <b>không có kết quả</b>. ' +
          'Bản tĩnh không cần trình thông dịch nào, nên kernel nhảy thẳng vào chương trình.</p>' }
      ]},

      /* ---- Bước 5 ---- */
      { title: 'Tìm điểm bắt đầu thật của chương trình', blocks: [
        { t: 'code', where: 'wsl', code:
          'readelf -h sample | grep Entry\n' +
          'nm sample | grep -E \' T (main|_start)$\'\n' +
          'objdump -d --start-address=0x10e0 --stop-address=0x1100 sample | tail -5' },

        { t: 'code', where: 'out', nocopy: true, code:
          '  Entry point address:               0x10e0\n' +
          '00000000000010e0 T _start\n' +
          '0000000000001080 T main\n' +
          '    10f1:\t50                   \tpush   %rax\n' +
          '    10f2:\t54                   \tpush   %rsp\n' +
          '    10f3:\t45 31 c0             \txor    %r8d,%r8d\n' +
          '    10f6:\t31 c9                \txor    %ecx,%ecx\n' +
          '    10f8:\t48 8d 3d 81 ff ff ff \tlea    -0x7f(%rip),%rdi        # 1080 <main>' },

        { t: 'cmdx', cmd: 'objdump -d --start-address=0x10e0 --stop-address=0x1100 sample',
          title: 'Dịch ngược một khoảng địa chỉ',
          rows: [
            ['<code>-d</code>', '<i>disassemble</i> — dịch mã máy ngược thành hợp ngữ', 'Chỉ dịch các section có cờ <code>X</code>'],
            ['<code>--start-address</code>', 'Bắt đầu từ địa chỉ này', 'Rất hữu ích khi chỉ muốn xem một hàm, tránh hàng nghìn dòng'],
            ['<code>--stop-address</code>', 'Dừng ở địa chỉ này', 'Nếu điểm cắt rơi giữa một lệnh nhiều byte, dòng cuối sẽ hiện <code>.byte</code> thay vì hợp ngữ đầy đủ — bình thường, không phải lỗi'],
            ['<code>-D</code>', 'Dịch <b>mọi</b> section, kể cả dữ liệu', 'Dùng khi nghi ngờ có mã giấu trong section dữ liệu'],
            ['<code>-S</code>', 'Xen mã nguồn C vào giữa hợp ngữ', 'Chỉ hoạt động khi biên dịch với <code>-g</code>']
          ]},

        { t: 'cal', kind: 'why', title: 'main không phải điểm vào — nó là tham số', x:
          '<p>Điểm vào là <code>_start</code> ở <code>0x10e0</code>, cách <code>main</code> ' +
          '(<code>0x1080</code>) đúng <code>0x60</code> byte.</p>' +
          '<p>Dòng <code>lea -0x7f(%rip),%rdi # 1080 &lt;main&gt;</code> nạp <b>địa chỉ</b> của ' +
          '<code>main</code> vào <code>%rdi</code> — thanh ghi mang tham số thứ nhất. Ngay ' +
          'sau đó <code>_start</code> gọi <code>__libc_start_main</code>, và hàm này mới gọi ' +
          '<code>main</code>.</p>' +
          '<p>Thứ tự đầy đủ: kernel → <code>ld.so</code> → <code>_start</code> → ' +
          '<code>__libc_start_main</code> → các hàm <code>.init_array</code> → ' +
          '<code>main</code>. Chương trình của bạn là mắt xích <b>cuối cùng</b>.</p>' }
      ]},

      /* ---- Bước 6 ---- */
      { title: 'Đo strip và --gc-sections', blocks: [
        { t: 'code', where: 'wsl', code:
          'cp sample sample_strip && strip sample_strip\n' +
          'stat -c \'%s %n\' sample sample_strip\n' +
          './sample_strip\n' +
          'nm sample_strip' },

        { t: 'code', where: 'out', nocopy: true, code:
          '16184 sample\n' +
          '14480 sample_strip\n' +
          'embedded device: 43 7\n' +
          'nm: sample_strip: no symbols' },

        { t: 'cal', kind: 'info', title: 'File nhỏ đi 1 704 byte, chương trình chạy y hệt, bảng ký hiệu biến mất', x:
          '<p><code>sample_strip</code> còn <b>14 480</b> byte so với <b>16 184</b> byte của bản gốc — ' +
          'giảm <b>1 704</b> byte, tức khoảng <b>10,5 %</b>. <code>./sample_strip</code> vẫn in đúng ' +
          '<code>embedded device: 43 7</code> giống hệt bản chưa strip, vì <code>strip</code> chỉ đụng ' +
          'tới <code>.symtab</code> và <code>.strtab</code> — hai section không có cờ <code>A</code>, ' +
          'chưa bao giờ được nạp và không phải là mã hay dữ liệu mà chương trình cần để chạy.</p>' +
          '<p>Cái mất hiện ngay ở dòng cuối: <code>nm sample_strip</code> báo <code>no symbols</code> vì ' +
          'bảng ký hiệu đã bị cắt hẳn. Trên bản liên kết tĩnh, số byte tuyệt đối tiết kiệm được sẽ lớn ' +
          'hơn nhiều — đo ngay dưới đây.</p>' },

        { t: 'p', x: 'Trên bản liên kết tĩnh, con số lớn hơn nhiều:' },

        { t: 'code', where: 'wsl', code:
          'gcc -O2 -static -o sample_static sample.c\n' +
          'cp sample_static sample_static_strip && strip sample_static_strip\n' +
          'stat -c \'%s %n\' sample_static sample_static_strip' },

        { t: 'code', where: 'out', nocopy: true, code:
          '816992 sample_static\n' +
          '735512 sample_static_strip' },

        { t: 'cal', kind: 'info', title: 'Cắt 81 480 byte mà chương trình vẫn chạy y nguyên', x:
          '<p><b>10,0 %</b> dung lượng biến mất, và <code>./sample_strip</code> vẫn in đúng ' +
          '<code>embedded device: 43 7</code>. Vì những gì bị cắt (<code>.symtab</code>, ' +
          '<code>.strtab</code>) vốn không có cờ <code>A</code> — chưa bao giờ được nạp.</p>' +
          '<p>Giá phải trả hiện ra ngay: <code>nm</code> báo <code>no symbols</code>. Nếu ' +
          'chương trình này sập trên thiết bị, bạn sẽ chỉ nhận được địa chỉ trần.</p>' },

        { t: 'p', x: 'Bây giờ thử loại bỏ những hàm không ai gọi:' },

        { t: 'code', where: 'file', name: '~/bai18-th/multi_func.c', lang: 'c', code:
          '#include <stdio.h>\n' +
          'int func_a(int x) { return x + 1; }\n' +
          'int func_b(int x) { return x * 2; }\n' +
          'int func_c(int x) { return x - 3; }\n' +
          'int func_d(int x) { return x / 4; }\n' +
          'int func_e(int x) { return x % 5; }\n' +
          'int main(void) { printf("%d\\n", func_a(10)); return 0; }' },

        { t: 'code', where: 'wsl', code:
          'gcc -O2 -o multi_normal multi_func.c\n' +
          'gcc -O2 -ffunction-sections -fdata-sections -Wl,--gc-sections -o multi_gc multi_func.c\n' +
          'stat -c \'%s %n\' multi_normal multi_gc\n' +
          'nm multi_normal | grep -c \' T func_\'\n' +
          'nm multi_gc | grep -c \' T func_\'' },

        { t: 'code', where: 'out', nocopy: true, code:
          '16120 multi_normal\n' +
          '15856 multi_gc\n' +
          '5\n' +
          '0' },

        { t: 'cal', kind: 'tip', title: 'Đo được 1,6 % — và đó cũng là một kết quả', x:
          '<p>Năm hàm giữ nguyên ở bản thường, biến sạch ở bản <code>--gc-sections</code>. ' +
          'Nhưng file chỉ nhỏ đi <b>264 byte</b>, vì bốn hàm bị vứt vốn rất bé.</p>' +
          '<p>Đừng bỏ qua kết quả này. Nó dạy một thói quen quan trọng hơn cả kỹ thuật: ' +
          '<b>đo trước khi tin</b>. Cùng cặp cờ đó, khi áp lên một thư viện tĩnh lớn ở ' +
          'Chặng 09, sẽ cắt hàng trăm KB.</p>' }
      ]},

      /* ---- Bước 7 ---- */
      { title: 'Nhận diện kiến trúc chỉ bằng 16 byte', blocks: [
        { t: 'p', x:
          'Bước cuối nối bài này với Bài 3 và Bài 13. Biên dịch chéo cho ARM64 rồi so header:' },

        { t: 'code', where: 'wsl', code:
          'aarch64-linux-gnu-gcc -O2 -static -o sample_arm sample.c\n' +
          'readelf -h sample_arm | grep -E \'Type|Machine|Entry\'\n' +
          'xxd -l 16 sample\n' +
          'xxd -l 16 sample_arm\n' +
          './sample_arm\n' +
          'echo "exit=$?"' },

        { t: 'code', where: 'out', nocopy: true, code:
          '  Type:                              EXEC (Executable file)\n' +
          '  Machine:                           AArch64\n' +
          '  Entry point address:               0x400600\n' +
          '00000000: 7f45 4c46 0201 0100 0000 0000 0000 0000  .ELF............\n' +
          '00000000: 7f45 4c46 0201 0103 0000 0000 0000 0000  .ELF............\n' +
          'bash: ./sample_arm: cannot execute binary file: Exec format error\n' +
          'exit=126' },

        { t: 'cal', kind: 'why', title: 'Vòng tròn khép lại: Bài 3 hỏi, Bài 18 trả lời', x:
          '<p>Ở Bài 3 bạn cố tình chạy một file ARM64 trên x86 và nhận ' +
          '<code>Exec format error</code>. Lúc đó bạn chỉ biết "sai kiến trúc". Giờ bạn biết ' +
          '<b>chính xác byte nào</b> gây ra điều đó.</p>' +
          '<p>Mười sáu byte đầu gần như giống hệt — chỉ byte thứ 8 khác (<code>00</code> so ' +
          'với <code>03</code>), mà đó chỉ là OS/ABI. Trường quyết định là ' +
          '<code>Machine</code>, nằm ở <b>byte 18–19</b>: <code>0x3e</code> cho x86-64 và ' +
          '<code>0xb7</code> cho AArch64.</p>' +
          '<p>Kernel đọc đúng hai byte đó, thấy không khớp CPU, và từ chối — trả về ' +
          '<code>ENOEXEC</code>, shell dịch thành mã thoát <b>126</b>. Ở <b>Chặng 05</b> bạn ' +
          'sẽ khiến file này chạy được, bằng cách nạp cả một nhân Linux ARM64 trong QEMU.</p>' },

        { t: 'p', x: 'Dọn dẹp:' },

        { t: 'code', where: 'wsl', code: 'cd ~ && rm -rf ~/bai18-th' }
      ]}

    ]},

    /* ══════════════════════════════════════════════
       10. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'p', x:
      'Phần lớn "lỗi" của <code>readelf</code> và <code>objdump</code> thực ra là <b>câu trả ' +
      'lời</b> — chúng đang nói cho bạn biết một sự thật về file. Học cách đọc chúng như ' +
      'thông tin, không phải như thất bại.' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>Section \'.bss\' has no data to dump.</code>',
         'Bạn chạy <code>readelf -x .bss</code>. <code>.bss</code> có kiểu <code>NOBITS</code> nên <b>không có byte nào</b> trong file để đổ ra',
         'Không phải lỗi — đây chính là bằng chứng cho toàn bộ mục 4. Dùng <code>readelf -S</code> để xem kích thước, không dùng <code>-x</code>'],

        ['<code>readelf: Warning: Section \'.interp\' was not dumped because it does not exist</code>',
         'File liên kết tĩnh, không cần trình thông dịch động nên không có section <code>.interp</code>',
         'Không phải lỗi — đây là cách nhanh nhất để xác nhận một file đã liên kết tĩnh hoàn toàn'],

        ['<code>There is no dynamic section in this file.</code>',
         'Chạy <code>readelf -d</code> trên file tĩnh; nó không có phụ thuộc động nào',
         'Tương tự trên. Kết hợp với <code>ldd</code> báo <code>not a dynamic executable</code> để chắc chắn'],

        ['<code>readelf: Error: \'khong_co\': No such file</code> (thoát <b>1</b>)',
         'Sai tên file hoặc sai thư mục',
         'Đây mới là lỗi thật. Kiểm tra bằng <code>ls</code>; chú ý phân biệt hoa thường'],

        ['<code>readelf: Error: vanban.txt: Failed to read file header</code>',
         'File không phải ELF — bốn byte đầu không phải <code>7f 45 4c 46</code>',
         'Chạy <code>file</code> trước. Nếu là script shell thì mở bằng trình soạn thảo, nếu là ảnh nén thì giải nén trước'],

        ['<code>nm: sample_strip: no symbols</code>',
         'File đã bị <code>strip</code>, section <code>.symtab</code> không còn',
         'Với thư viện động, dùng <code>nm -D</code>. Với file thực thi đã strip, không lấy lại được — giữ bản chưa strip trên máy build'],

        ['<code>objdump -d</code> chỉ hiện <code>&lt;.text&gt;:</code> thay vì <code>&lt;main&gt;:</code>',
         'File đã bị <code>strip</code> nên không còn tên hàm để gắn nhãn',
         'Mã máy vẫn dịch ngược bình thường, chỉ mất nhãn. Đối chiếu địa chỉ với bản chưa strip'],

        ['<code>strings</code> vẫn thấy chuỗi và phiên bản GCC sau khi <code>strip</code>',
         'Nhầm lẫn phổ biến: <code>strip</code> chỉ cắt <code>.symtab</code>/<code>.strtab</code>, <b>không</b> đụng tới <code>.rodata</code> và <code>.comment</code>',
         'Muốn bỏ chuỗi phiên bản: <code>strip -R .comment</code>. Chuỗi trong <code>.rodata</code> thì không bỏ được — chương trình cần chúng'],

        ['<code>./sample_arm: cannot execute binary file: Exec format error</code> (thoát <b>126</b>)',
         'Trường <code>Machine</code> trong ELF header không khớp CPU',
         'Kiểm tra bằng <code>readelf -h | grep Machine</code>. Cần QEMU (Chặng 05) hoặc thiết bị thật để chạy'],

        ['<code>objdump -d</code> in ra dòng cuối <code>.byte 0xff</code>',
         'Bạn dùng <code>--stop-address</code> cắt vào giữa một lệnh nhiều byte',
         'Không phải lỗi. Tăng <code>--stop-address</code> lên vài byte nếu muốn thấy trọn lệnh'],

        ['Ảnh firmware to bất thường mà mã nguồn không đổi mấy',
         'Một mảng lớn có bộ khởi tạo đã rơi từ <code>.bss</code> vào <code>.data</code>',
         '<code>size</code> để thấy cột nào phình, rồi <code>readelf -S -W</code> và <code>nm --size-sort -S</code> để tìm thủ phạm']
      ]},

    /* ══════════════════════════════════════════════
       11. RECAP
       ══════════════════════════════════════════════ */
    { t: 'recap', items: [
      '<b>ELF</b> là định dạng chung cho file <code>.o</code>, chương trình, thư viện <code>.so</code>, module kernel <code>.ko</code> và cả <code>vmlinux</code>. Học nó một lần, dùng suốt lộ trình.',
      'Bốn byte đầu <b><code>7f 45 4c 46</code></b> là chữ ký kernel kiểm tra trước khi nạp. Byte 5 = độ rộng con trỏ, byte 6 = thứ tự byte; trường <b><code>Machine</code></b> (byte 18–19) mới quyết định file chạy được trên CPU nào.',
      '<b>Section</b> là cách trình liên kết nhìn file (31 mảnh có tên); <b>segment</b> là cách kernel nhìn file (4 đoạn <code>LOAD</code>). Cùng một dữ liệu, hai góc nhìn phục vụ hai mục đích.',
      'Cột <code>Flg</code> là chính sách bảo mật: <code>A</code> = được nạp vào RAM, <code>W</code> = ghi được, <code>X</code> = thi hành được. <b>Không section nào vừa <code>W</code> vừa <code>X</code></b> — nguyên tắc W^X.',
      '<code>.bss</code> có kiểu <b><code>NOBITS</code></b>: chỉ ghi lại <i>kích thước</i>, không ghi dữ liệu. Bạn đã tự chứng minh: mảng 1 MB trong <code>.bss</code> giữ file gần như nguyên (<b>16 192</b> so với <b>16 184</b> byte ban đầu — lệch 8 byte không liên quan tới mảng), trong khi cùng mảng đó trong <code>.data</code> đẩy file lên <b>1 064 592</b> byte — <b>gấp 65,8 lần</b>, chỉ vì <code>= { 1 }</code>.',
      'Cơ chế <code>.bss</code> nằm ở chênh lệch <b><code>MemSiz</code> − <code>FileSiz</code></b> của đoạn <code>LOAD</code> ghi được: <b>17 048 − 624 = 16 424</b> byte, đúng bằng kích thước <code>.bss</code>. Kernel cấp bấy nhiêu bộ nhớ và điền số 0.',
      'Điểm vào chương trình là <b><code>_start</code></b> (<code>0x10e0</code>) chứ không phải <code>main</code> (<code>0x1080</code>). <code>_start</code> truyền địa chỉ <code>main</code> cho <code>__libc_start_main</code> — đó là lý do bản tĩnh nặng 816 912 byte.',
      '<code>strip</code> cắt <b>10 %</b> dung lượng (816 992 → 735 512 byte trên bản tĩnh) nhưng <b>không giảm RAM</b>, vì <code>.symtab</code> vốn không có cờ <code>A</code>. Giữ bản chưa strip để gỡ lỗi, ghép lại bằng <code>BuildID</code>.',
      '<code>-ffunction-sections -fdata-sections -Wl,--gc-sections</code> vứt bỏ hàm không ai gọi — ở ví dụ này chỉ được <b>1,6 %</b>, nhưng sẽ đáng kể khi liên kết tĩnh với thư viện lớn. <b>Luôn đo trước khi tin.</b>',
      'Bộ công cụ soi file nhị phân: <code>file</code> (đây là gì) → <code>readelf -h</code> (header) → <code>readelf -S -W</code> (section) → <code>readelf -l -W</code> (segment) → <code>nm</code> (ký hiệu) → <code>size</code> (dung lượng) → <code>objdump -d</code> (mã máy) → <code>strings</code> (chuỗi).'
    ]},

    { t: 'cal', kind: 'tip', title: 'Bài tiếp theo', x:
      '<p>Chặng 02 kết thúc ở đây. Bạn đã đi trọn con đường từ <code>hello.c</code> tới từng ' +
      'byte trong file nhị phân, và trả lời được câu hỏi mở đầu chặng: 816 912 byte so với ' +
      '15 952 byte, vì sao và khi nào nên chọn cái nào.</p>' +
      '<p><b>Bài 19 — Syscall và File I/O</b> mở <b>Chặng 03: Lập trình hệ thống Linux</b>, ' +
      'nơi phần lớn công việc hằng ngày của một kỹ sư Embedded Linux thực sự diễn ra.</p>' +
      '<p>Bạn sẽ vượt qua một ranh giới mới: từ userspace gọi thẳng vào kernel. ' +
      '<code>open</code>, <code>read</code>, <code>write</code>, <code>close</code> — bốn hàm ' +
      'đứng sau mọi thao tác với thiết bị trong <code>/dev</code> và <code>/sys</code>. Bạn ' +
      'sẽ dùng <code>strace</code> để nhìn xuyên qua một chương trình đang chạy và <b>đếm</b> ' +
      'số lời gọi hệ thống, rồi so <code>write()</code> thuần với <code>printf()</code> có ' +
      'đệm — chênh lệch đo được sẽ giải thích vì sao thư viện chuẩn tồn tại.</p>' +
      '<p>Và <code>__libc_start_main</code> mà bạn vừa gặp ở bước 5 sẽ hiện ra đầy đủ trong ' +
      'output <code>strace</code> đầu tiên của bạn.</p>' },

    { t: 'hr' }

  ],

  quiz: [
    {
      q: 'Chương trình của bạn khai báo <code>char buffer[1048576];</code> ở phạm vi toàn cục. Sau khi biên dịch, file thực thi vẫn chỉ nặng gần như trước (16 192 so với 16 184 byte của bản gốc). Vì sao?',
      opts: [
        'Trình biên dịch đã nén mảng đó lại',
        'Mảng rơi vào <code>.bss</code> — section kiểu <code>NOBITS</code> chỉ ghi lại kích thước, kernel cấp bộ nhớ và điền số 0 lúc nạp',
        'Mảng bị <code>-O2</code> loại bỏ vì không được dùng',
        'Mảng được cấp phát trên ngăn xếp nên không nằm trong file'
      ],
      a: 1,
      why: 'Biến toàn cục không có bộ khởi tạo (hoặc khởi tạo bằng 0) rơi vào <code>.bss</code>. Kiểu <code>NOBITS</code> nghĩa là "không có byte nào trong file" — chỉ trường <code>Size</code> được ghi lại. Bạn kiểm chứng được ở tầng segment: đoạn <code>LOAD</code> ghi được có <code>FileSiz</code> 624 byte nhưng <code>MemSiz</code> 17 048 byte, chênh đúng bằng <code>.bss</code>. Lưu ý quan trọng cho nhúng: nó <b>không</b> tốn flash nhưng <b>vẫn</b> tốn RAM.'
    },
    {
      q: 'Cùng mảng đó, bạn đổi thành <code>char buffer[1048576] = { 1 };</code>. Điều gì xảy ra với kích thước file?',
      opts: [
        'Không đổi — chỉ có một phần tử khác 0',
        'Tăng thêm đúng 1 byte',
        'Tăng lên hơn 1 MB, vì có bộ khởi tạo nên cả mảng chuyển sang <code>.data</code> và <code>.data</code> phải nằm thật trong file',
        'Giảm xuống, vì trình biên dịch tối ưu được nhiều hơn'
      ],
      a: 2,
      why: 'Quy tắc là <b>có bộ khởi tạo hay không</b>, không phải <i>bao nhiêu phần tử khác 0</i>. Có <code>= { 1 }</code> thì cả mảng vào <code>.data</code>, mà <code>.data</code> có kiểu <code>PROGBITS</code> nên toàn bộ nội dung — kể cả 262 143 số 0 — phải được ghi thật vào file. Đo trên máy bạn: <b>16 184</b> byte thành <b>1 064 592</b> byte, gấp <b>65,8 lần</b>. Đây là nguyên nhân số một khiến ảnh firmware phình bất thường.'
    },
    {
      q: 'Section và segment khác nhau thế nào?',
      opts: [
        'Section dành cho chương trình 32 bit, segment dành cho 64 bit',
        'Section là cách trình liên kết nhìn file (nhiều mảnh có tên, phân loại chi tiết); segment là cách kernel nhìn file (ít vùng, gom theo quyền truy cập để ánh xạ vào bộ nhớ)',
        'Section nằm trong RAM, segment nằm trên đĩa',
        'Chúng là hai tên gọi của cùng một thứ'
      ],
      a: 1,
      why: 'Cùng một dữ liệu, hai bảng mục lục cho hai người đọc khác nhau. Trình liên kết cần biết <code>.text</code> khác <code>.rodata</code> ở chỗ nào để ghép các file <code>.o</code>; kernel chỉ cần biết "ánh xạ vùng này, quyền R+X". Vì đơn vị cấp phát bộ nhớ ảo nhỏ nhất là một trang 4 KB, nhiều section cùng quyền được gom vào một segment — trên máy bạn 31 section gom thành 4 đoạn <code>LOAD</code>. Cả hai đều mô tả file trên đĩa; chỉ segment mới nói về việc nạp vào RAM.'
    },
    {
      q: 'ELF header khai <code>Entry point address: 0x10e0</code> nhưng <code>nm</code> báo <code>main</code> ở <code>0x1080</code>. Điều này có nghĩa gì?',
      opts: [
        'File bị hỏng — hai giá trị phải trùng nhau',
        'Điểm vào thật là <code>_start</code> do glibc cung cấp; nó chuẩn bị môi trường rồi truyền địa chỉ <code>main</code> cho <code>__libc_start_main</code>',
        '<code>0x10e0</code> là địa chỉ của hàm <code>exit</code>',
        'Chênh lệch là do ASLR ngẫu nhiên hoá địa chỉ'
      ],
      a: 1,
      why: 'Kernel nhảy vào <code>_start</code> (từ <code>crt1.o</code>), không phải <code>main</code>. Bạn thấy bằng chứng trong <code>objdump</code>: lệnh <code>lea -0x7f(%rip),%rdi # 1080 &lt;main&gt;</code> nạp địa chỉ <code>main</code> vào thanh ghi tham số thứ nhất, rồi gọi <code>__libc_start_main</code>. Hàm đó dựng <code>argc/argv/environ</code>, khởi tạo <code>stdio</code>, chạy <code>.init_array</code>, rồi mới gọi <code>main</code>. Đáp án D sai vì ASLR chỉ dịch chuyển <i>toàn bộ</i> ảnh khi nạp — chênh lệch giữa hai địa chỉ trong file thì cố định.'
    },
    {
      q: 'Thiết bị của bạn có 8 MB flash và 64 MB RAM. Firmware hiện chiếm 7,6 MB flash. Đồng nghiệp đề xuất chạy <code>strip</code> lên mọi file nhị phân. Nhận định nào đúng?',
      opts: [
        'Vô ích, vì <code>strip</code> không đụng tới mã máy',
        'Có ích cho flash (khoảng 10 % dựa trên số đo trong bài), nhưng không giảm RAM lúc chạy, và mất khả năng đọc tên hàm khi gỡ lỗi',
        'Có ích cho cả flash lẫn RAM, vì bảng ký hiệu được nạp vào bộ nhớ',
        'Nguy hiểm, vì chương trình sẽ không chạy được sau khi strip'
      ],
      a: 1,
      why: 'Đo được trên máy bạn: 816 992 → 735 512 byte, giảm <b>10,0 %</b> — với 7,6 MB firmware thì đó là khoảng 760 KB flash, rất đáng kể ở ngưỡng 8 MB. Nhưng RAM không đổi một byte, vì <code>.symtab</code> và <code>.strtab</code> <b>không có cờ <code>A</code></b> nên chưa bao giờ được nạp (loại đáp án C). Chương trình vẫn chạy bình thường (loại D). Cái mất là backtrace có tên hàm — nên cách làm chuẩn là lưu bản chưa strip trên máy build và ghép lại qua <code>BuildID</code> khi cần.'
    },
    {
      q: 'Bạn nhận một file nhị phân lạ từ thiết bị của khách hàng, chưa biết nó là gì và không dám chạy. Thứ tự lệnh nào hợp lý nhất?',
      opts: [
        '<code>./file</code> để xem nó làm gì, rồi mới phân tích',
        '<code>ldd file</code> trước tiên để biết nó cần thư viện nào',
        '<code>file</code> → <code>readelf -h</code> → <code>readelf -S -W</code> → <code>strings</code>, tất cả đều chỉ đọc, không thực thi gì',
        '<code>strip file</code> để bỏ phần thừa rồi <code>objdump -d</code> cho gọn'
      ],
      a: 2,
      why: 'Nguyên tắc: <b>đọc trước, chạy sau</b>. <code>file</code> cho biết loại và kiến trúc; <code>readelf -h</code> xác nhận; <code>readelf -S -W</code> cho thấy bố cục; <code>strings</code> thường lộ ra đường dẫn, URL, thông báo lỗi. Không lệnh nào trong số đó thực thi mã của file. Đáp án B nguy hiểm hơn vẻ ngoài: <code>ldd</code> <b>thật sự nhờ trình thông dịch động nạp file</b>, nên với file không tin cậy hãy dùng <code>readelf -d</code> thay thế. Đáp án D huỷ hoại chính thứ bạn cần nhất — bảng ký hiệu — và <code>strip</code> ghi đè file gốc.'
    }
  ]
});

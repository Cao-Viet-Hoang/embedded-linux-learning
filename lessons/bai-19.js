/* Bài 19 — Syscall và File I/O */
Lesson.register({
  id: 'bai-19',
  title: 'Syscall và File I/O',
  minutes: 55,
  practice: 'Thực hành 40 phút',
  level: 'Trung cấp',

  intro:
    'Chặng 02 dạy bạn biến mã nguồn thành một file nhị phân. Nhưng file đó mới chỉ biết tính ' +
    'toán trong bộ nhớ của chính nó. Muốn đọc một cảm biến, ghi một log, bật một chân GPIO ' +
    'hay nói chuyện qua mạng, chương trình phải <b>nhờ nhân Linux làm hộ</b> — vì nó không có ' +
    'quyền chạm vào phần cứng. Cánh cửa duy nhất để nhờ vả đó gọi là <b>syscall</b>. Bài này ' +
    'mở cánh cửa ấy ra: bạn sẽ tự viết một chương trình chép file bằng đúng năm lệnh gọi hệ ' +
    'thống <code>open read write close lseek</code>, đo xem một syscall đắt hơn một lời gọi ' +
    'hàm thường <b>bao nhiêu lần</b>, và dùng <code>strace</code> để nhìn xuyên qua bất kỳ ' +
    'chương trình nào — kể cả chương trình không có mã nguồn.',

  goals: [
    'Giải thích được ranh giới <b>user space / kernel space</b> và vì sao nó tồn tại',
    'Viết được chương trình C dùng trực tiếp <code>open</code>, <code>read</code>, <code>write</code>, <code>close</code>, <code>lseek</code> — không qua <code>stdio</code>',
    'Hiểu <b>file descriptor</b> là gì, vì sao 0/1/2 luôn được chiếm sẵn, và kiểm chứng qua <code>/proc/self/fd</code>',
    'Xử lý lỗi đúng cách bằng <code>errno</code>, <code>perror</code>, <code>strerror</code> — và biết khi nào <code>errno</code> <b>không</b> có ý nghĩa',
    'Đo được chênh lệch giữa syscall thuần và <code>stdio</code> có đệm, bằng cả thời gian lẫn số lần gọi',
    'Dùng <code>strace</code> để xem một chương trình đang gọi gì vào nhân, và đọc được kết quả'
  ],

  blocks: [

    /* ══════════════════════════════════════════════
       1. RANH GIỚI USER / KERNEL
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Vì sao chương trình của bạn không được phép chạm vào phần cứng' },

    { t: 'p', x:
      'Ở Bài 18 bạn đã thấy kernel nạp file ELF của bạn vào bộ nhớ rồi nhảy tới <code>_start</code>. ' +
      'Từ giây phút đó, chương trình chạy trong một chế độ CPU bị hạn chế gọi là <b>user mode</b>. ' +
      'Trong chế độ này, CPU <i>từ chối thực thi</i> mọi lệnh máy đụng tới phần cứng: đọc cổng ' +
      'vào/ra, đổi bảng trang bộ nhớ, tắt ngắt, truy cập thanh ghi điều khiển. Thử là chương ' +
      'trình bị bắn ra ngay với <code>SIGSEGV</code> hoặc <code>SIGILL</code>.' },

    { t: 'p', x:
      'Đây không phải sự phiền hà — đó là <b>điều kiện sống</b> của một hệ điều hành đa nhiệm. ' +
      'Nếu bất kỳ chương trình nào cũng ghi thẳng vào ổ đĩa thì một dòng mã sai của một ứng dụng ' +
      'bất kỳ sẽ xoá sổ toàn bộ máy. Trên thiết bị nhúng, hậu quả cụ thể hơn: một tiến trình đo ' +
      'nhiệt độ bị lỗi có thể ghi đè lên vùng flash chứa firmware và biến thiết bị thành cục gạch.' },

    { t: 'fig',
      cap: 'Chỉ có một lối đi từ user space vào kernel space, và nó hẹp có chủ đích: mọi yêu cầu đều phải khai báo bằng một số hiệu syscall.',
      svg:
        '<svg viewBox="0 0 720 330" width="720" role="img" aria-label="Sơ đồ ranh giới user space và kernel space, syscall là cổng duy nhất đi qua">' +
        '<rect class="d-box" x="20" y="16" width="680" height="118" rx="8"/>' +
        '<text class="d-t" x="36" y="40">USER SPACE — chế độ hạn chế</text>' +
        '<rect class="d-box-p" x="44" y="54" width="150" height="60" rx="6"/>' +
        '<text class="d-t" x="70" y="80">copy.c</text>' +
        '<text class="d-ts" x="60" y="98">chương trình của bạn</text>' +
        '<rect class="d-box-p" x="214" y="54" width="150" height="60" rx="6"/>' +
        '<text class="d-t" x="252" y="80">bash</text>' +
        '<text class="d-ts" x="240" y="98">shell đang chạy</text>' +
        '<rect class="d-box-a" x="384" y="54" width="292" height="60" rx="6"/>' +
        '<text class="d-t" x="474" y="80">glibc (libc.so.6)</text>' +
        '<text class="d-ts" x="404" y="98">bọc syscall lại thành hàm C: open(), read(), write()</text>' +

        '<line class="d-line" x1="360" y1="134" x2="360" y2="166"/>' +
        '<path class="d-arrow" d="M360 174 l-6 -10 h12 z"/>' +
        '<rect class="d-box-w" x="236" y="150" width="248" height="34" rx="6"/>' +
        '<text class="d-t" x="288" y="172">lệnh máy  syscall  / svc #0</text>' +

        '<line class="d-line" x1="20" y1="200" x2="700" y2="200"/>' +
        '<text class="d-ts" x="20" y="216">— ranh giới đặc quyền do CPU cưỡng chế —</text>' +

        '<rect class="d-box" x="20" y="224" width="680" height="90" rx="8"/>' +
        '<text class="d-t" x="36" y="248">KERNEL SPACE — toàn quyền</text>' +
        '<rect class="d-box-g" x="44" y="260" width="146" height="42" rx="6"/>' +
        '<text class="d-t" x="66" y="286">bảng syscall</text>' +
        '<rect class="d-box-g" x="206" y="260" width="146" height="42" rx="6"/>' +
        '<text class="d-t" x="240" y="286">VFS / ext4</text>' +
        '<rect class="d-box-g" x="368" y="260" width="146" height="42" rx="6"/>' +
        '<text class="d-t" x="404" y="286">driver thiết bị</text>' +
        '<rect class="d-box-g" x="530" y="260" width="146" height="42" rx="6"/>' +
        '<text class="d-t" x="566" y="286">phần cứng thật</text>' +
        '</svg>' },

    { t: 'terms', items: [
      ['User space', '', 'Vùng chạy của mọi chương trình thường. CPU ở chế độ hạn chế, không đụng được phần cứng, mỗi tiến trình có không gian địa chỉ riêng.'],
      ['Kernel space', '', 'Vùng chạy của nhân Linux. Toàn quyền với phần cứng, và <b>chỉ có một</b> — mọi tiến trình dùng chung nhân.'],
      ['Syscall', 'system call', 'Lời gọi hệ thống. Cơ chế duy nhất để mã user space yêu cầu nhân làm một việc đặc quyền.'],
      ['glibc', 'GNU C Library', 'Thư viện C bạn đã liên kết ở Bài 17. Phần lớn hàm của nó chỉ là lớp bọc mỏng quanh một syscall.'],
      ['POSIX', '', 'Chuẩn quy định tên và hành vi các hàm hệ thống (<code>open</code>, <code>fork</code>…). Nhờ nó, mã viết cho Linux thường dịch được trên BSD, macOS, QNX.']
    ]},

    { t: 'cal', kind: 'why', title: 'Vì sao dân nhúng buộc phải hiểu tầng này', x:
      '<p>Trên máy để bàn, bạn có thể lập trình cả đời mà chỉ dùng <code>fopen</code> và không ' +
      'bao giờ nghĩ tới syscall. Trên thiết bị nhúng thì không:</p>' +
      '<ul>' +
      '<li>Đọc cảm biến, bật LED, đọc nút bấm — tất cả đều là <code>open</code> + <code>read</code> ' +
      'hoặc <code>ioctl</code> trên một file trong <code>/dev</code> hay <code>/sys</code>.</li>' +
      '<li>Mỗi syscall là một lần chuyển ngữ cảnh có giá. Vòng lặp đọc cảm biến 1000 Hz gọi sai ' +
      'cách sẽ ngốn CPU và ăn pin.</li>' +
      '<li>Khi thiết bị treo mà không có debugger, <code>strace</code> gắn vào tiến trình là công ' +
      'cụ chẩn đoán đầu tiên và nhiều khi là duy nhất.</li>' +
      '</ul>' +
      '<p>Bài 53 sẽ dạy bạn viết <i>phía kernel</i> của <code>ioctl</code>. Bài này dạy phía ' +
      'userspace gọi nó — phải hiểu bên gọi trước.</p>' },

    /* ══════════════════════════════════════════════
       2. MỘT SYSCALL DIỄN RA THẾ NÀO
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Một syscall thực sự diễn ra thế nào' },

    { t: 'p', x:
      'Khi bạn viết <code>write(1, "hi", 2)</code>, chuyện xảy ra theo đúng sáu bước sau. Hãy đọc ' +
      'kỹ, vì mọi hành vi lạ ở phần sau của bài đều giải thích được bằng sơ đồ này.' },

    { t: 'list', ordered: true, items: [
      'Chương trình gọi hàm <code>write()</code> — đây vẫn là một hàm C bình thường, nằm trong <code>libc.so.6</code>.',
      'Hàm đó đặt <b>số hiệu syscall</b> vào một thanh ghi quy ước (<code>rax</code> trên x86-64, <code>x8</code> trên ARM64) và các tham số vào các thanh ghi khác.',
      'Nó thực thi lệnh máy <code>syscall</code> (x86-64) hoặc <code>svc #0</code> (ARM64). CPU <b>chuyển sang kernel mode</b> và nhảy tới một điểm vào cố định do nhân đăng ký.',
      'Nhân tra <b>bảng syscall</b> theo số hiệu, kiểm tra tham số (con trỏ có hợp lệ không, tiến trình có quyền không), rồi làm việc.',
      'Nhân đặt kết quả vào thanh ghi trả về và quay lại user mode.',
      'Lớp bọc trong glibc kiểm tra kết quả: nếu là giá trị âm biểu thị lỗi, nó đặt <code>errno</code> rồi trả về <code>-1</code> cho bạn.'
    ]},

    { t: 'fig',
      cap: 'Bước 4 là chỗ tốn thời gian: CPU phải đổi chế độ, đổi ngăn xếp và làm mất hiệu lực một phần bộ đệm dự đoán — đó là lý do syscall đắt hơn lời gọi hàm hàng chục lần.',
      svg:
        '<svg viewBox="0 0 720 250" width="720" role="img" aria-label="Sáu bước của một lời gọi hệ thống write từ chương trình tới nhân và quay về">' +
        '<rect class="d-box-p" x="16" y="30" width="120" height="46" rx="6"/>' +
        '<text class="d-tm" x="40" y="52">write(1,p,2)</text>' +
        '<text class="d-ts" x="46" y="68">mã của bạn</text>' +

        '<line class="d-line" x1="136" y1="53" x2="184" y2="53"/>' +
        '<path class="d-arrow" d="M192 53 l-10 -6 v12 z"/>' +
        '<text class="d-ts" x="140" y="45">1</text>' +

        '<rect class="d-box-a" x="192" y="30" width="140" height="46" rx="6"/>' +
        '<text class="d-t" x="220" y="50">lớp bọc glibc</text>' +
        '<text class="d-tm" x="212" y="68">rax = 1 ; syscall</text>' +

        '<line class="d-line" x1="332" y1="53" x2="380" y2="53"/>' +
        '<path class="d-arrow" d="M388 53 l-10 -6 v12 z"/>' +
        '<text class="d-ts" x="336" y="45">2·3</text>' +

        '<rect class="d-box-w" x="388" y="24" width="150" height="58" rx="6"/>' +
        '<text class="d-t" x="404" y="46">đổi sang</text>' +
        '<text class="d-t" x="404" y="64">KERNEL MODE</text>' +

        '<line class="d-line" x1="538" y1="53" x2="586" y2="53"/>' +
        '<path class="d-arrow" d="M594 53 l-10 -6 v12 z"/>' +

        '<rect class="d-box-g" x="594" y="30" width="110" height="46" rx="6"/>' +
        '<text class="d-t" x="612" y="52">sys_write()</text>' +
        '<text class="d-ts" x="626" y="68">4</text>' +

        '<line class="d-line" x1="649" y1="96" x2="649" y2="128"/>' +
        '<path class="d-arrow" d="M649 136 l-6 -10 h12 z"/>' +

        '<rect class="d-box-g" x="470" y="136" width="234" height="46" rx="6"/>' +
        '<text class="d-t" x="486" y="158">VFS → driver → phần cứng</text>' +
        '<text class="d-ts" x="486" y="175">ghi thật sự vào terminal / đĩa / socket</text>' +

        '<line class="d-line" x1="470" y1="159" x2="380" y2="159"/>' +
        '<path class="d-arrow" d="M372 159 l10 -6 v12 z"/>' +
        '<text class="d-ts" x="392" y="152">5</text>' +

        '<rect class="d-box-a" x="196" y="136" width="176" height="46" rx="6"/>' +
        '<text class="d-t" x="212" y="157">glibc xét kết quả</text>' +
        '<text class="d-ts" x="212" y="174">lỗi → errno, trả về −1</text>' +

        '<line class="d-line" x1="196" y1="159" x2="140" y2="159"/>' +
        '<path class="d-arrow" d="M132 159 l10 -6 v12 z"/>' +
        '<text class="d-ts" x="152" y="152">6</text>' +

        '<rect class="d-box-p" x="16" y="136" width="116" height="46" rx="6"/>' +
        '<text class="d-t" x="40" y="164">về chỗ cũ</text>' +

        '<text class="d-ts" x="16" y="215">Đo trên máy của bạn: vòng này mất 116–139 ns, còn một lời gọi hàm thường chỉ mất 0,5–2,4 ns.</text>' +
        '</svg>' },

    { t: 'p', x:
      '<b>Số hiệu syscall phụ thuộc kiến trúc.</b> Đây là chi tiết quan trọng với người làm nhúng, ' +
      'vì bạn sẽ biên dịch cùng một mã nguồn cho x86-64 và ARM64. Hai file header dưới đây có sẵn ' +
      'trên máy bạn — cùng một tên hàm nhưng khác số:' },

    { t: 'code', where: 'wsl', code:
      'grep -E \'#define __NR_(read|write|openat|close|lseek|exit|getpid)\\b\' \\\n' +
      '  /usr/include/x86_64-linux-gnu/asm/unistd_64.h' },

    { t: 'code', where: 'out', nocopy: true, code:
      '#define __NR_read 0\n' +
      '#define __NR_write 1\n' +
      '#define __NR_close 3\n' +
      '#define __NR_lseek 8\n' +
      '#define __NR_exit 60\n' +
      '#define __NR_openat 257' },

    { t: 'table',
      head: ['Syscall', 'Số hiệu x86-64', 'Số hiệu ARM64', 'Nhận xét'],
      rows: [
        ['<code>read</code>', '0', '63', 'Khác hoàn toàn'],
        ['<code>write</code>', '1', '64', 'Khác hoàn toàn'],
        ['<code>close</code>', '3', '57', ''],
        ['<code>lseek</code>', '8', '62', ''],
        ['<code>openat</code>', '257', '56', 'ARM64 <b>không có</b> <code>open</code>, chỉ có <code>openat</code>'],
        ['<code>getpid</code>', '39', '172', ''],
        ['<code>exit</code>', '60', '93', '']
      ]},

    { t: 'cal', kind: 'info', title: 'ARM64 bỏ hẳn open — và đó là lý do strace hiện openat', x:
      '<p>Khi bạn viết <code>open("source.txt", O_RDONLY)</code>, glibc trên máy x86-64 hiện đại ' +
      '<b>không</b> gọi syscall số 2. Nó gọi <code>openat(AT_FDCWD, "source.txt", O_RDONLY)</code> — ' +
      'syscall số 257. Vì thế trong <code>strace</code> bạn sẽ luôn thấy <code>openat</code> chứ ' +
      'không phải <code>open</code>, dù mã nguồn viết <code>open</code>.</p>' +
      '<p><code>AT_FDCWD</code> là một hằng đặc biệt nghĩa là "đường dẫn tương đối tính từ thư mục ' +
      'làm việc hiện tại". Bộ syscall <code>*at</code> ra đời để tránh một lớp lỗi bảo mật: giữa ' +
      'lúc kiểm tra đường dẫn và lúc mở nó, kẻ tấn công có thể đổi một thư mục trên đường dẫn ' +
      'thành liên kết mềm. Truyền thẳng file descriptor của thư mục thì không có khe hở đó.</p>' },

    { t: 'p', x:
      'Muốn nhìn tận mắt lệnh máy <code>syscall</code>, hãy bỏ qua glibc và gọi thẳng bằng số hiệu. ' +
      'Hàm <code>syscall()</code> của glibc chỉ làm đúng việc nạp thanh ghi và bắn lệnh:' },

    { t: 'code', where: 'file', name: 'raw.c', lang: 'c', code:
      '#include <sys/syscall.h>\n' +
      '#include <unistd.h>\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    const char *s = "Hello from raw syscall\\n";\n' +
      '    syscall(SYS_write, 1, s, 23);\n' +
      '    syscall(SYS_exit, 7);\n' +
      '    return 0;   /* never reached */\n' +
      '}' },

    { t: 'code', where: 'wsl', code: 'gcc -Wall -o raw raw.c\n./raw\necho "exit=$?"' },

    { t: 'code', where: 'out', nocopy: true, code:
      'Hello from raw syscall\nexit=7' },

    { t: 'cal', kind: 'info', title: 'Chương trình này chết trước khi return', x:
      '<p><code>SYS_exit</code> kết thúc tiến trình <b>ngay lập tức</b> trong nhân. Dòng ' +
      '<code>return 0</code> không bao giờ chạy — bằng chứng là <code>$?</code> bằng <b>7</b>, ' +
      'không phải 0.</p>' +
      '<p>Lưu ý sự khác nhau bạn sẽ gặp lại ở Bài 20: <code>exit()</code> của thư viện C có xả ' +
      'đệm <code>stdio</code> và chạy các hàm đăng ký qua <code>atexit</code>; syscall ' +
      '<code>SYS_exit</code> thì không làm gì cả. Nếu chương trình dùng <code>printf</code> rồi ' +
      'thoát bằng syscall thô, dữ liệu trong đệm sẽ mất trắng.</p>' },

    /* ══════════════════════════════════════════════
       3. FILE DESCRIPTOR
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'File descriptor — một con số đại diện cho mọi thứ' },

    { t: 'p', x:
      'Nhân không trả cho bạn con trỏ tới cấu trúc nội bộ của nó — làm thế thì user space lại ' +
      'chạm được vào bộ nhớ nhân. Thay vào đó, mỗi tiến trình có một <b>bảng file descriptor</b> ' +
      'nằm trong nhân, và <code>open</code> trả về <b>chỉ số dòng</b> trong bảng đó. Một số ' +
      'nguyên nhỏ, vô hại, chỉ có ý nghĩa với đúng tiến trình đó.' },

    { t: 'table',
      head: ['fd', 'Tên POSIX', 'Hằng trong C', 'Ai gán sẵn'],
      rows: [
        ['<b>0</b>', '<code>stdin</code>', '<code>STDIN_FILENO</code>', 'Shell, trước khi chạy chương trình'],
        ['<b>1</b>', '<code>stdout</code>', '<code>STDOUT_FILENO</code>', 'Shell'],
        ['<b>2</b>', '<code>stderr</code>', '<code>STDERR_FILENO</code>', 'Shell'],
        ['<b>3 trở đi</b>', '—', '—', 'Chính chương trình của bạn, mỗi lần <code>open</code>']
      ]},

    { t: 'cal', kind: 'why', title: 'Vì sao chuyển hướng của shell hoạt động được', x:
      '<p>Khi bạn gõ <code>./copy &gt; result.txt</code>, shell <b>mở file trước</b>, rồi ép ' +
      'file descriptor đó thành số 1, rồi mới chạy chương trình. Chương trình của bạn vẫn ghi ' +
      'vào fd 1 như thường và hoàn toàn không biết đích đến đã đổi.</p>' +
      '<p>Đó chính là ý nghĩa của câu "mọi thứ trong Linux là file": file thường, terminal, ' +
      'ống dẫn, socket mạng, chân GPIO — tất cả đều lộ ra dưới dạng một fd, và cùng dùng ' +
      '<code>read</code>/<code>write</code>. Bài 20 sẽ cho bạn thấy cơ chế ép số này ' +
      '(<code>dup2</code>) và tự tay dựng lại một phép chuyển hướng.</p>' },

    { t: 'p', x:
      'Quy tắc cấp phát rất đơn giản và bạn cần nhớ: <b>nhân luôn trả về số nhỏ nhất còn trống</b>. ' +
      'Hãy kiểm chứng bằng một chương trình bốn dòng:' },

    { t: 'code', where: 'file', name: 'fd.c', lang: 'c', code:
      '#include <fcntl.h>\n' +
      '#include <unistd.h>\n' +
      '#include <stdio.h>\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    printf("open #1 -> fd=%d\\n", open("source.txt", O_RDONLY));\n' +
      '    printf("open #2 -> fd=%d\\n", open("source.txt", O_RDONLY));\n' +
      '    printf("open #3 -> fd=%d\\n", open("source.txt", O_RDONLY));\n' +
      '    close(4);\n' +
      '    printf("close fd 4, reopen -> fd=%d\\n", open("source.txt", O_RDONLY));\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'out', nocopy: true, code:
      'open #1 -> fd=3\n' +
      'open #2 -> fd=4\n' +
      'open #3 -> fd=5\n' +
      'close fd 4, reopen -> fd=4' },

    { t: 'cal', kind: 'info', title: 'Kết quả này là hành vi được chuẩn hoá, không phải tình cờ', x:
      '<p>POSIX <b>bắt buộc</b> trả về fd nhỏ nhất còn trống. Nhờ đó mới có một thủ thuật kinh ' +
      'điển: đóng fd 1 rồi <code>open</code> ngay lập tức thì file mới chắc chắn nhận số 1, tức ' +
      'là trở thành <code>stdout</code>. Bài 20 dùng đúng tính chất này.</p>' +
      '<p>Mặt trái: nếu một thư viện nào đó đóng nhầm fd của bạn, một fd hoàn toàn khác sẽ ' +
      'chiếm chỗ và chương trình ghi dữ liệu vào sai file mà không hề báo lỗi. Đây là loại lỗi ' +
      'khó chịu nhất trong lập trình hệ thống.</p>' },

    { t: 'p', x:
      'Muốn nhìn bảng fd của một tiến trình đang sống, hãy đọc <code>/proc/&lt;pid&gt;/fd</code>. ' +
      'Lối tắt <code>/proc/self</code> luôn trỏ tới chính tiến trình đang đọc:' },

    { t: 'code', where: 'wsl', code: 'ls -l /proc/self/fd' },

    { t: 'code', where: 'out', nocopy: true, code:
      'total 0\n' +
      'lr-x------ 1 shinarus shinarus 64 Aug  5 22:15 0 -> pipe:[73676]\n' +
      'l-wx------ 1 shinarus shinarus 64 Aug  5 22:15 1 -> pipe:[73677]\n' +
      'l-wx------ 1 shinarus shinarus 64 Aug  5 22:15 2 -> pipe:[73678]\n' +
      'lr-x------ 1 shinarus shinarus 64 Aug  5 22:15 3 -> /proc/12970/fd\n' +
      'lrwx------ 1 shinarus shinarus 64 Aug  5 22:15 7 -> /dev/ptmx' },

    { t: 'cal', kind: 'tip', title: 'Vì sao lại có fd 3 mà bạn không mở', x:
      '<p>Chính lệnh <code>ls</code> đã mở thư mục <code>/proc/self/fd</code> để liệt kê nó — ' +
      'và fd đó xuất hiện trong danh sách của chính nó. Chi tiết vui: đích trỏ tới ' +
      '<code>/proc/12970/fd</code> chứ không phải <code>/proc/self/fd</code>, vì nhân đã phân giải ' +
      '<code>self</code> thành số PID thật của lệnh <code>ls</code> — máy bạn sẽ ra số khác. ' +
      'fd <b>7</b> trỏ tới <code>/dev/ptmx</code> — đó là đầu cuối giả mà chính shell của bạn ' +
      'giữ mở để kiểm soát tác vụ, không phải do <code>ls</code> tạo ra.</p>' +
      '<p>Nếu bạn chuyển hướng ra file — <code>ls -l /proc/self/fd &gt; out.txt</code> — thì dòng 1 ' +
      'sẽ trỏ tới <code>out.txt</code> thay vì đích cũ của nó (một ống dẫn hoặc một terminal, tuỳ ' +
      'cách bạn gọi lệnh). Đây là cách nhanh nhất để biết một tiến trình treo đang mở những gì ' +
      'trên thiết bị thật.</p>' },

    /* ══════════════════════════════════════════════
       4. NĂM LỆNH GỌI NỀN TẢNG
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Năm lệnh gọi nền tảng: open, read, write, close, lseek' },

    { t: 'p', x:
      'Toàn bộ việc vào/ra file trên Linux quy về năm hàm này. Chúng khai báo trong ' +
      '<code>&lt;fcntl.h&gt;</code> và <code>&lt;unistd.h&gt;</code>. Tra tài liệu chính thức bằng ' +
      '<code>man 2 &lt;tên&gt;</code> — <b>mục 2 của man là syscall</b>, mục 3 là hàm thư viện.' },

    { t: 'table',
      head: ['Hàm', 'Nguyên mẫu rút gọn', 'Trả về khi thành công', 'Trả về khi lỗi'],
      rows: [
        ['<code>open</code>', '<code>int open(const char *đường_dẫn, int cờ, ... mode_t quyền)</code>', 'fd ≥ 0', '<code>-1</code>'],
        ['<code>read</code>', '<code>ssize_t read(int fd, void *đệm, size_t n)</code>', 'số byte đọc được (có thể &lt; n); <b>0 = hết file</b>', '<code>-1</code>'],
        ['<code>write</code>', '<code>ssize_t write(int fd, const void *đệm, size_t n)</code>', 'số byte đã ghi (có thể &lt; n)', '<code>-1</code>'],
        ['<code>close</code>', '<code>int close(int fd)</code>', '<code>0</code>', '<code>-1</code>'],
        ['<code>lseek</code>', '<code>off_t lseek(int fd, off_t khoảng, int mốc)</code>', 'vị trí mới tính từ đầu file', '<code>(off_t)-1</code>']
      ]},

    { t: 'cmdx', cmd: 'open("log.txt", O_WRONLY | O_CREAT | O_APPEND, 0644)',
      title: 'Các cờ của open — ghép bằng toán tử OR bit',
      rows: [
        ['<code>O_RDONLY</code>', 'Chỉ đọc', 'Ba cờ chế độ này <b>loại trừ nhau</b>, phải chọn đúng một'],
        ['<code>O_WRONLY</code>', 'Chỉ ghi', ''],
        ['<code>O_RDWR</code>', 'Đọc và ghi', ''],
        ['<code>O_CREAT</code>', 'Tạo file nếu chưa có', '<b>Bắt buộc</b> phải truyền thêm tham số quyền, nếu không quyền sẽ là rác trên ngăn xếp'],
        ['<code>O_TRUNC</code>', 'Cắt file về 0 byte nếu đã tồn tại', 'Đây là hành vi của <code>&gt;</code> trong shell'],
        ['<code>O_APPEND</code>', 'Mọi lần ghi đều tự nhảy về cuối file', 'Hành vi của <code>&gt;&gt;</code>. Thao tác nhảy-rồi-ghi là <b>nguyên tử</b> — bắt buộc dùng cho file log có nhiều tiến trình cùng ghi'],
        ['<code>O_EXCL</code>', 'Đi kèm <code>O_CREAT</code>: lỗi nếu file đã tồn tại', 'Cách tạo file khoá an toàn trước chạy đua'],
        ['<code>O_NONBLOCK</code>', 'Không chờ; không có dữ liệu thì trả về lỗi <code>EAGAIN</code>', 'Cốt lõi của vòng lặp sự kiện — Bài 24'],
        ['<code>O_SYNC</code>', 'Chỉ trả về sau khi dữ liệu nằm thật trên thiết bị', 'Rất chậm nhưng chống mất dữ liệu khi mất điện đột ngột — vấn đề sống còn của thiết bị nhúng'],
        ['<code>0644</code>', 'Quyền cho file mới: chủ đọc-ghi, còn lại chỉ đọc', 'Số <b>bát phân</b>, phải có số 0 đứng đầu. Quyền thật = <code>0644 &amp; ~umask</code>']
      ]},

    { t: 'cal', kind: 'warn', title: 'read và write được phép làm ít hơn bạn yêu cầu', x:
      '<p>Đây là cái bẫy số một của người mới. <code>write(fd, đệm, 1000)</code> hoàn toàn có thể ' +
      'trả về <b>512</b> mà <i>không phải lỗi</i>. Nguyên nhân: ống dẫn đầy, socket nghẽn, tín ' +
      'hiệu ngắt giữa chừng, thiết bị chỉ nhận từng khối.</p>' +
      '<p>Mã đúng luôn phải lặp cho tới khi ghi hết:</p>' +
      '<p><code>while (n &gt; 0) { m = write(fd, p, n); if (m &lt; 0) return -1; p += m; n -= m; }</code></p>' +
      '<p>Với <code>read</code> thì ngược lại: giá trị trả về <b>0</b> mới nghĩa là hết file, còn ' +
      'trả về ít hơn yêu cầu là bình thường. Nhầm hai điều này là nguyên nhân kinh điển của lỗi ' +
      '"file chép xong bị cụt" chỉ xảy ra trên thiết bị thật chứ không xảy ra trên máy bạn.</p>' },

    { t: 'p', x:
      '<code>lseek</code> di chuyển <b>con trỏ vị trí</b> — nhân nhớ giúp bạn đang đọc/ghi tới đâu ' +
      'trong file. Ba mốc: <code>SEEK_SET</code> (tính từ đầu), <code>SEEK_CUR</code> (từ vị trí ' +
      'hiện tại), <code>SEEK_END</code> (từ cuối). Mẹo thường dùng: ' +
      '<code>lseek(fd, 0, SEEK_END)</code> trả về đúng kích thước file.' },

    { t: 'cal', kind: 'info', title: 'lseek vượt quá cuối file tạo ra "lỗ" — và lỗ không tốn đĩa', x:
      '<p>Bạn sẽ chứng minh điều này ở phần thực hành: ghi 3 byte, nhảy tới mốc 10 MB, ghi thêm ' +
      '4 byte. Kết quả là một file mà <code>ls -l</code> báo <b>10 485 764</b> byte nhưng ' +
      '<code>du</code> báo chỉ chiếm <b>8 KB</b> thật trên đĩa.</p>' +
      '<p>Hệ thống file ext4 đơn giản là không cấp block nào cho vùng ở giữa; khi đọc, nhân trả về ' +
      'số 0. Đây gọi là <i>sparse file</i>. Ảnh đĩa của thiết bị nhúng thường là sparse — file ' +
      '<code>rootfs.img</code> 2 GB có thể chỉ tốn 300 MB thật. Nhớ điều này khi chép ảnh đĩa: ' +
      '<code>cp</code> giữ được lỗ, còn <code>cat a &gt; b</code> thì làm phình lên đủ 2 GB.</p>' },

    /* ══════════════════════════════════════════════
       5. ERRNO
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'errno — nhân nói lỗi gì, và khi nào được phép tin nó' },

    { t: 'p', x:
      'Syscall chỉ trả về <code>-1</code>, không kèm lý do. Lý do nằm trong biến toàn cục ' +
      '<code>errno</code> (khai báo trong <code>&lt;errno.h&gt;</code>). Ba cách đọc nó:' },

    { t: 'table',
      head: ['Cách', 'Dùng khi', 'Ví dụ kết quả'],
      rows: [
        ['<code>perror("open")</code>', 'In nhanh ra <code>stderr</code>', '<code>open: No such file or directory</code>'],
        ['<code>strerror(errno)</code>', 'Cần ghép chuỗi lỗi vào thông báo của mình', '<code>"No such file or directory"</code>'],
        ['So sánh trực tiếp <code>errno == ENOENT</code>', 'Cần <b>xử lý khác nhau</b> theo từng loại lỗi', 'ví dụ: không có file thì tạo mới, hết quyền thì thoát']
      ]},

    { t: 'table',
      head: ['Hằng', 'Số', 'Thông báo', 'Gặp khi'],
      rows: [
        ['<code>ENOENT</code>', '2', 'No such file or directory', 'Sai đường dẫn — lỗi phổ biến nhất'],
        ['<code>EACCES</code>', '13', 'Permission denied', 'Không đủ quyền. Rất hay gặp khi mở <code>/dev/*</code> mà không thuộc nhóm đúng'],
        ['<code>EBADF</code>', '9', 'Bad file descriptor', 'fd không tồn tại hoặc đã đóng'],
        ['<code>EISDIR</code>', '21', 'Is a directory', 'Mở thư mục để ghi'],
        ['<code>EAGAIN</code>', '11', 'Resource temporarily unavailable', 'fd <code>O_NONBLOCK</code> chưa có dữ liệu — <b>không phải lỗi thật</b>'],
        ['<code>EINTR</code>', '4', 'Interrupted system call', 'Tín hiệu cắt ngang lời gọi — Bài 21 xử lý triệt để'],
        ['<code>ENOSPC</code>', '28', 'No space left on device', 'Đầy đĩa. Trên nhúng là hết flash'],
        ['<code>ENXIO</code>', '6', 'No such device or address', 'Có file thiết bị nhưng driver không nhận']
      ]},

    { t: 'code', where: 'file', name: 'error.c', lang: 'c', code:
      '#include <fcntl.h>\n' +
      '#include <unistd.h>\n' +
      '#include <stdio.h>\n' +
      '#include <errno.h>\n' +
      '#include <string.h>\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    int fd;\n' +
      '\n' +
      '    fd = open("/no/such/path/here", O_RDONLY);\n' +
      '    printf("1) ret=%d errno=%d %s\\n", fd, errno, strerror(errno));\n' +
      '\n' +
      '    fd = open("/etc/shadow", O_RDONLY);\n' +
      '    printf("2) ret=%d errno=%d %s\\n", fd, errno, strerror(errno));\n' +
      '\n' +
      '    fd = open("/etc", O_WRONLY);\n' +
      '    printf("3) ret=%d errno=%d %s\\n", fd, errno, strerror(errno));\n' +
      '\n' +
      '    /* errno is NOT cleared on success */\n' +
      '    fd = open("/etc/hostname", O_RDONLY);\n' +
      '    printf("4) ret=%d errno=%d %s  <- succeeded but errno still stale\\n",\n' +
      '           fd, errno, strerror(errno));\n' +
      '\n' +
      '    errno = 0;\n' +
      '    if (close(999) < 0)\n' +
      '        perror("5) close(999)");\n' +
      '    return 0;\n' +
      '}' },

    { t: 'code', where: 'out', nocopy: true, code:
      '1) ret=-1 errno=2 No such file or directory\n' +
      '2) ret=-1 errno=13 Permission denied\n' +
      '3) ret=-1 errno=21 Is a directory\n' +
      '4) ret=3 errno=21 Is a directory  <- succeeded but errno still stale\n' +
      '5) close(999): Bad file descriptor' },

    { t: 'cal', kind: 'danger', title: 'Dòng 4 là cái bẫy phải nhớ suốt đời', x:
      '<p><code>open("/etc/hostname")</code> ở dòng 4 <b>thành công</b> — nó trả về fd <b>3</b>. ' +
      'Nhưng <code>errno</code> vẫn mang giá trị <b>21</b> sót lại từ lần lỗi trước, vì ' +
      '<b>syscall thành công không bao giờ xoá <code>errno</code></b>. Chuẩn C chỉ bảo đảm nó ' +
      'được <i>đặt</i> khi có lỗi, không bảo đảm được <i>dọn</i> khi thành công.</p>' +
      '<p>Quy tắc bắt buộc: <b>chỉ đọc <code>errno</code> sau khi đã kiểm tra giá trị trả về là ' +
      'giá trị báo lỗi.</b> Viết <code>if (errno) ...</code> để phát hiện lỗi là sai, và nó sẽ ' +
      'sinh ra những báo lỗi ma quái không cách nào lần ra.</p>' +
      '<p>Ngoại lệ: vài hàm như <code>strtol</code> không có giá trị trả về riêng cho lỗi. Với ' +
      'chúng bạn phải tự <code>errno = 0;</code> ngay trước khi gọi — như dòng 5 trong ví dụ.</p>' },

    /* ══════════════════════════════════════════════
       6. GIÁ CỦA MỘT SYSCALL
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Một syscall đắt hơn một lời gọi hàm bao nhiêu?' },

    { t: 'p', x:
      'Câu trả lời quyết định cách bạn viết mọi vòng lặp vào/ra về sau. Hãy đo chứ đừng đoán: ' +
      'một triệu lời gọi hàm thường, so với một triệu lần gọi <code>getpid</code> qua syscall ' +
      'thô. Chọn <code>getpid</code> vì nhân gần như không làm gì — cái ta đo là <b>chi phí đi ' +
      'qua ranh giới</b>, không phải chi phí công việc.' },

    { t: 'code', where: 'file', name: 'cost.c', lang: 'c', code:
      '#include <stdio.h>\n' +
      '#include <time.h>\n' +
      '#include <unistd.h>\n' +
      '#include <sys/syscall.h>\n' +
      '\n' +
      '#define N 1000000\n' +
      '\n' +
      'static long plain_call(long x) { return x + 1; }\n' +
      '\n' +
      'int main(void)\n' +
      '{\n' +
      '    struct timespec t1, t2;\n' +
      '    volatile long total = 0;\n' +
      '\n' +
      '    clock_gettime(CLOCK_MONOTONIC, &t1);\n' +
      '    for (int i = 0; i < N; i++) total += plain_call(i);\n' +
      '    clock_gettime(CLOCK_MONOTONIC, &t2);\n' +
      '    double a = (t2.tv_sec - t1.tv_sec) * 1e9 + (t2.tv_nsec - t1.tv_nsec);\n' +
      '    printf("plain call    : %8.1f ns/call\\n", a / N);\n' +
      '\n' +
      '    clock_gettime(CLOCK_MONOTONIC, &t1);\n' +
      '    for (int i = 0; i < N; i++) total += syscall(SYS_getpid);\n' +
      '    clock_gettime(CLOCK_MONOTONIC, &t2);\n' +
      '    double b = (t2.tv_sec - t1.tv_sec) * 1e9 + (t2.tv_nsec - t1.tv_nsec);\n' +
      '    printf("syscall call  : %8.1f ns/call\\n", b / N);\n' +
      '    printf("slower by     : %8.1fx\\n", b / a);\n' +
      '    return 0;\n' +
      '}' },

    { t: 'cmdx', cmd: 'volatile long total = 0;', title: 'Ba chi tiết bắt buộc của một phép đo tử tế',
      rows: [
        ['<code>volatile</code>', 'Cấm trình biên dịch bỏ qua vòng lặp', 'Không có nó, <code>-O2</code> thấy <code>total</code> không được dùng và xoá sạch vòng lặp — bạn sẽ đo được 0 ns'],
        ['<code>CLOCK_MONOTONIC</code>', 'Đồng hồ chỉ tăng, không bị NTP chỉnh giật lùi', 'Dùng <code>CLOCK_REALTIME</code> có thể ra khoảng thời gian âm khi đồng hồ được đồng bộ giữa chừng'],
        ['<code>syscall(SYS_getpid)</code>', 'Gọi thẳng số hiệu, bỏ qua lớp bọc glibc', 'Bắt buộc: hàm <code>getpid()</code> của glibc <b>có bộ nhớ đệm</b> — gọi một triệu lần chỉ tốn đúng một syscall, và phép đo sẽ vô nghĩa']
      ]},

    { t: 'code', where: 'wsl', code: 'gcc -Wall -O2 -o cost cost.c\n./cost' },

    { t: 'code', where: 'out', nocopy: true, code:
      'plain call    :      0.5 ns/call\n' +
      'syscall call  :    124.9 ns/call\n' +
      'slower by     :    254.9x' },

    { t: 'cal', kind: 'warn', title: 'Chạy nhiều lần — con số này dao động rất mạnh', x:
      '<p>Chín lần đo trên máy bạn cho: lời gọi hàm <b>0,5–2,4 ns</b>, syscall <b>116–139 ns</b>, ' +
      'tỉ lệ <b>55–274 lần</b>. Đừng trích một con số duy nhất rồi coi đó là chân lý.</p>' +
      '<p>Vì sao dao động? Vì WSL2 là một máy ảo chạy chung 6 CPU với Windows, và vì các biện ' +
      'pháp phòng chống lỗ hổng Spectre/Meltdown buộc mỗi lần vào/ra nhân phải xả bộ đệm dự ' +
      'đoán nhánh — chi phí phụ thuộc tải của máy. Trên phần cứng nhúng thật, con số tuyệt đối ' +
      'khác hẳn, nhưng <b>bậc độ lớn thì giống</b>: syscall đắt hơn lời gọi hàm khoảng hai bậc ' +
      'thập phân.</p>' +
      '<p>Kết luận thực dụng duy nhất bạn cần mang theo: <b>gọi ít syscall hơn, mỗi lần làm ' +
      'nhiều việc hơn.</b></p>' },

    /* ══════════════════════════════════════════════
       7. SYSCALL THUẦN VS STDIO
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Syscall thuần và stdio có đệm — cùng kết quả, khác 358 lần số syscall' },

    { t: 'p', x:
      'Bạn đã dùng <code>printf</code> và <code>fopen</code> từ Bài 14. Giờ mới đến lúc biết ' +
      'chúng thật sự là gì: <b><code>stdio</code> là một lớp đệm nằm trong user space, phía trên ' +
      'syscall</b>. <code>fprintf</code> không gọi vào nhân — nó chép byte vào một mảng trong ' +
      'bộ nhớ tiến trình, và chỉ khi mảng đó đầy mới gọi một lần <code>write</code>.' },

    { t: 'fig',
      cap: 'stdio đổi 200 000 lần vượt biên giới lấy 559 lần — cùng một kết quả trên đĩa, nhưng nhanh hơn 7,6 lần.',
      svg:
        '<svg viewBox="0 0 720 280" width="720" role="img" aria-label="So sánh đường đi dữ liệu khi ghi bằng write thuần và khi ghi qua stdio có đệm">' +
        '<text class="d-t" x="20" y="22">Cách 1 — write() từng dòng</text>' +
        '<rect class="d-box-p" x="20" y="34" width="120" height="42" rx="6"/>' +
        '<text class="d-ts" x="34" y="52">vòng lặp</text>' +
        '<text class="d-ts" x="34" y="68">200 000 dòng</text>' +
        '<line class="d-line" x1="140" y1="55" x2="196" y2="55"/>' +
        '<path class="d-arrow" d="M204 55 l-10 -6 v12 z"/>' +
        '<rect class="d-box-w" x="204" y="34" width="180" height="42" rx="6"/>' +
        '<text class="d-t" x="220" y="60">200 000 syscall write</text>' +
        '<line class="d-line" x1="384" y1="55" x2="440" y2="55"/>' +
        '<path class="d-arrow" d="M448 55 l-10 -6 v12 z"/>' +
        '<rect class="d-box" x="448" y="34" width="120" height="42" rx="6"/>' +
        '<text class="d-t" x="480" y="60">a.txt</text>' +
        '<text class="d-ts" x="586" y="52">real 0,130 s</text>' +
        '<text class="d-ts" x="586" y="68">sys  0,095 s</text>' +

        '<line class="d-line" x1="20" y1="104" x2="700" y2="104"/>' +

        '<text class="d-t" x="20" y="134">Cách 2 — fprintf() qua đệm stdio</text>' +
        '<rect class="d-box-p" x="20" y="146" width="120" height="42" rx="6"/>' +
        '<text class="d-ts" x="34" y="164">vòng lặp</text>' +
        '<text class="d-ts" x="34" y="180">200 000 dòng</text>' +
        '<line class="d-line" x1="140" y1="167" x2="180" y2="167"/>' +
        '<path class="d-arrow" d="M188 167 l-10 -6 v12 z"/>' +
        '<rect class="d-box-a" x="188" y="146" width="150" height="42" rx="6"/>' +
        '<text class="d-t" x="204" y="166">đệm 4096 byte</text>' +
        '<text class="d-ts" x="204" y="182">nằm trong user space</text>' +
        '<line class="d-line" x1="338" y1="167" x2="378" y2="167"/>' +
        '<path class="d-arrow" d="M386 167 l-10 -6 v12 z"/>' +
        '<rect class="d-box-g" x="386" y="146" width="150" height="42" rx="6"/>' +
        '<text class="d-t" x="406" y="172">559 syscall write</text>' +
        '<line class="d-line" x1="536" y1="167" x2="576" y2="167"/>' +
        '<path class="d-arrow" d="M584 167 l-10 -6 v12 z"/>' +
        '<rect class="d-box" x="584" y="146" width="116" height="42" rx="6"/>' +
        '<text class="d-t" x="616" y="172">b.txt</text>' +
        '<text class="d-ts" x="20" y="216">real 0,017 s   ·   sys 0,004 s   ·   hai file giống nhau từng byte (cmp không báo gì)</text>' +
        '<text class="d-ts" x="20" y="248">2 288 890 byte ÷ 4096 = 558,8 → 559 lần ghi. Con số 559 không phải ngẫu nhiên.</text>' +
        '</svg>' },

    { t: 'table',
      head: ['', '<code>write()</code> từng dòng', '<code>fprintf()</code> qua stdio'],
      rows: [
        ['Thời gian thực (tốt nhất trong 3 lần)', '<b>0,130 s</b>', '<b>0,017 s</b>'],
        ['Thời gian trong nhân (<code>sys</code>)', '0,095 s', '0,004 s'],
        ['Số lần gọi <code>write</code>', '<b>200 000</b>', '<b>559</b>'],
        ['Kích thước file kết quả', '2 288 890 byte', '2 288 890 byte'],
        ['Kết luận', '', '<b>nhanh hơn 7,6 lần</b>, ít hơn <b>358 lần</b> số syscall']
      ]},

    { t: 'cal', kind: 'info', title: 'Ba chế độ đệm của stdio — và vì sao chúng làm bạn bối rối', x:
      '<p>glibc chọn chế độ đệm <b>theo đích đến</b>, tự động, ngay lần ghi đầu tiên:</p>' +
      '<ul>' +
      '<li><b>Đệm toàn phần</b> (4096 byte) — khi <code>stdout</code> là file hoặc ống dẫn. ' +
      'Chỉ ghi thật khi đầy đệm hoặc khi <code>fclose</code>/kết thúc chương trình.</li>' +
      '<li><b>Đệm theo dòng</b> — khi <code>stdout</code> là terminal. Gặp <code>\\n</code> là xả.</li>' +
      '<li><b>Không đệm</b> — <code>stderr</code>, luôn luôn. Vì thông báo lỗi phải ra ngoài ' +
      'trước khi chương trình kịp sập.</li>' +
      '</ul>' +
      '<p>Hệ quả bạn sẽ gặp ngay ở phần thực hành: chạy <code>./error</code> trong terminal thì ' +
      'năm dòng ra đúng thứ tự 1→5; nhưng chạy <code>./error &gt; out.txt 2&gt;&amp;1</code> thì ' +
      'dòng <b>5</b> (đi qua <code>stderr</code>, không đệm) lại nằm <b>đầu file</b>, trước cả ' +
      'dòng 1. Không có gì hỏng cả — chỉ là <code>stdout</code> vừa đổi sang chế độ đệm toàn ' +
      'phần và giữ dữ liệu tới tận lúc thoát.</p>' },

    { t: 'cal', kind: 'why', title: 'Vậy bao giờ dùng syscall thuần, bao giờ dùng stdio?', x:
      '<p><b>Dùng <code>stdio</code></b> khi làm việc với văn bản, khi cần <code>printf</code> ' +
      'định dạng, khi ghi log thông thường. Nó nhanh hơn nhiều mà bạn không phải làm gì.</p>' +
      '<p><b>Dùng syscall thuần</b> khi:</p>' +
      '<ul>' +
      '<li>Làm việc với <code>/dev</code> và <code>/sys</code> — thiết bị thường cần mỗi lần ' +
      'đọc/ghi ứng đúng một thao tác, đệm sẽ phá vỡ ngữ nghĩa đó;</li>' +
      '<li>Cần <code>ioctl</code>, <code>mmap</code>, <code>poll</code> — chúng làm việc trên fd, ' +
      'không làm việc trên <code>FILE *</code>;</li>' +
      '<li>Cần kiểm soát chính xác thời điểm dữ liệu rời khỏi tiến trình (log sự cố, ghi vào ' +
      'flash trước khi mất điện);</li>' +
      '<li>Đang viết mã cực nhỏ không muốn kéo theo cả <code>stdio</code> — vấn đề thật khi ' +
      'dùng musl/BusyBox ở Chặng 09.</li>' +
      '</ul>' +
      '<p>Cầu nối giữa hai thế giới: <code>fileno(FILE *)</code> lấy fd ra, <code>fdopen(int)</code> ' +
      'bọc fd thành <code>FILE *</code>. Đừng trộn lẫn hai lớp trên cùng một file cùng lúc — ' +
      'thứ tự byte sẽ không như bạn nghĩ.</p>' },

    /* ══════════════════════════════════════════════
       8. STRACE
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'strace — nhìn xuyên qua một chương trình không có mã nguồn' },

    { t: 'p', x:
      'Vì <b>mọi</b> tương tác với thế giới bên ngoài đều phải đi qua syscall, chỉ cần chặn ' +
      'syscall là bạn biết hết chương trình đang làm gì với hệ thống — mở file nào, ghi gì, kết ' +
      'nối tới đâu, hỏng ở đâu. Đó là <code>strace</code>. Nó không cần mã nguồn, không cần ' +
      'symbol, không cần biên dịch lại.' },

    { t: 'p', x:
      '<code>strace</code> chưa có sẵn trên máy bạn, hãy cài nó cùng <code>ltrace</code> ' +
      '(công cụ anh em, chặn <i>lời gọi hàm thư viện</i> thay vì syscall). Bạn sẽ dùng cả hai ' +
      'suốt Chặng 03 và Chặng 12:' },

    { t: 'code', where: 'wsl', code: 'sudo apt install -y strace ltrace' },

    { t: 'code', where: 'wsl', code: 'strace --version | head -1' },

    { t: 'code', where: 'out', nocopy: true, code: 'strace -- version 6.19' },

    { t: 'cmdx', cmd: 'strace -e trace=openat,read,write,close -o trace.txt ./copy source.txt dest.txt',
      title: 'Những tuỳ chọn strace dùng hằng ngày',
      rows: [
        ['<code>-e trace=…</code>', 'Chỉ theo dõi các syscall được liệt kê', 'Không có nó, một chương trình "hello world" cũng ra 40 dòng nhiễu từ lúc nạp thư viện'],
        ['<code>-e trace=file</code>', 'Nhóm dựng sẵn: mọi syscall có nhận đường dẫn', 'Câu trả lời cho "nó tìm file cấu hình ở đâu?"'],
        ['<code>-o trace.txt</code>', 'Ghi vết ra file thay vì màn hình', '<b>Bắt buộc</b> khi chương trình cũng in ra màn hình, nếu không hai luồng trộn vào nhau'],
        ['<code>-c</code>', 'Không in từng dòng, chỉ tổng kết theo loại', 'Câu trả lời cho "nó gọi cái gì nhiều nhất?"'],
        ['<code>-f</code>', 'Theo cả tiến trình con', 'Bắt buộc từ Bài 20 trở đi, khi có <code>fork</code>'],
        ['<code>-p 1234</code>', 'Gắn vào tiến trình đang chạy', 'Vũ khí chính khi một daemon trên thiết bị bị treo'],
        ['<code>-T</code>', 'In thời gian mỗi syscall tốn', 'Tìm chỗ nghẽn'],
        ['<code>-s 200</code>', 'In tới 200 ký tự chuỗi thay vì 32', 'Khi cần đọc nội dung đã ghi']
      ]},

    { t: 'code', where: 'wsl',
      notes: ['Luôn dùng <code>-o</code> khi chương trình cũng in ra màn hình. Nếu không, dòng <code>fd src=3 fd dst=4</code> của <code>copy</code> sẽ chen ngang vào giữa một dòng vết của <code>strace</code>.'],
      code: 'strace -e trace=openat,read,write,close -o trace.txt ./copy source.txt dest.txt\ncat trace.txt' },

    { t: 'code', where: 'out', nocopy: true, code:
      'openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 3\n' +
      'close(3)                                = 0\n' +
      'openat(AT_FDCWD, "/usr/lib/x86_64-linux-gnu/libc.so.6", O_RDONLY|O_CLOEXEC) = 3\n' +
      'read(3, "\\177ELF\\2\\1\\1\\3\\0\\0\\0\\0\\0\\0\\0\\0\\3\\0>\\0\\1\\0\\0\\0 \\250\\2\\0\\0\\0\\0\\0"..., 832) = 832\n' +
      'close(3)                                = 0\n' +
      'openat(AT_FDCWD, "source.txt", O_RDONLY) = 3\n' +
      'openat(AT_FDCWD, "dest.txt", O_WRONLY|O_CREAT|O_TRUNC, 0644) = 4\n' +
      'read(3, "line 1\\nline 2\\nline 3\\n", 4096) = 21\n' +
      'write(4, "line 1\\nline 2\\nline 3\\n", 21) = 21\n' +
      'read(3, "", 4096)                       = 0\n' +
      'close(3)                                = 0\n' +
      'close(4)                                = 0\n' +
      'write(1, "fd src=3  fd dst=4\\n", 19)    = 19\n' +
      '+++ exited with 0 +++' },

    { t: 'p', x:
      'Đọc kỹ đoạn này, nó chứa gần như toàn bộ bài học. Sáu điều đáng chú ý:' },

    { t: 'list', ordered: true, items: [
      'Bốn dòng đầu là <b>trình liên kết động</b> đang nạp <code>libc.so.6</code> — đúng cơ chế bạn học ở Bài 17, giờ nhìn thấy tận mắt. <code>\\177ELF</code> chính là 4 byte phù thuỷ của Bài 18.',
      '<code>read(3, ..., 4096) = 21</code>: yêu cầu 4096 byte, nhận về <b>21</b>. Đúng bằng kích thước <code>source.txt</code>. Đây là <i>đọc thiếu</i> mà không phải lỗi.',
      '<code>read(3, "", 4096) = 0</code>: giá trị trả về <b>0</b> — dấu hiệu duy nhất báo <b>hết file</b>. Vòng lặp <code>while</code> trong chương trình dừng ở đây.',
      'fd của <code>source.txt</code> là <b>3</b>, đúng như dự đoán: 0/1/2 đã bị chiếm, 3 là số nhỏ nhất còn trống. Sau khi <code>libc.so.6</code> đóng fd 3, số đó được tái sử dụng.',
      '<code>printf</code> trong mã nguồn hiện ra dưới dạng <b>một</b> <code>write(1, …)</code> ở cuối cùng — bằng chứng trực tiếp rằng <code>stdio</code> có đệm.',
      'Kernel nhận được đúng cờ <code>O_WRONLY|O_CREAT|O_TRUNC</code> và quyền <code>0644</code> mà bạn truyền vào <code>open</code>. <code>strace</code> tự giải mã từ số nguyên sang tên hằng.'
    ]},

    { t: 'cal', kind: 'tip', title: 'strace -c: câu hỏi "chương trình này gọi gì nhiều nhất?"', x:
      '<p>Với <code>./copy</code>, tổng kết là <b>41 syscall, 1 lỗi</b> — trong đó chỉ 9 lời gọi ' +
      'là công việc thật, còn lại là chi phí khởi động tiến trình và nạp thư viện. Với ' +
      '<code>cat /etc/hostname</code>, con số là <b>137 syscall, 5 lỗi</b>.</p>' +
      '<p>Hãy ghi nhớ bậc độ lớn đó: <b>mỗi lần khởi động một tiến trình động tốn hơn trăm ' +
      'syscall</b>. Đây là lý do một script shell gọi <code>grep</code> trong vòng lặp 1000 lần ' +
      'chậm hơn hẳn một lần <code>grep</code> duy nhất, và là lý do BusyBox gộp mọi lệnh vào một ' +
      'file nhị phân duy nhất ở Chặng 09.</p>' },

    { t: 'cal', kind: 'warn', title: 'strace làm chương trình chậm đi hàng chục lần', x:
      '<p>Nhìn cột <code>seconds</code> trong bảng tổng kết ở phần thực hành: 200 000 lần ' +
      '<code>write</code> được báo là <b>4,79 giây</b>, trong khi chạy không có <code>strace</code> ' +
      'thì cả chương trình chỉ mất <b>0,130 giây</b> — chênh <b>37 lần</b>.</p>' +
      '<p>Nguyên nhân: mỗi syscall bị chặn hai lần bằng cơ chế <code>ptrace</code>, mỗi lần là ' +
      'một lượt chuyển ngữ cảnh sang tiến trình <code>strace</code>. Vì thế:</p>' +
      '<ul>' +
      '<li><b>Dùng <code>strace</code> để đếm và để hiểu, đừng dùng nó để đo tốc độ.</b></li>' +
      '<li>Không gắn <code>strace</code> vào một daemon có ràng buộc thời gian thực trên thiết ' +
      'bị đang chạy thật — bạn có thể tự tay làm nó trễ hạn.</li>' +
      '</ul>' },

    /* ══════════════════════════════════════════════
       9. THỰC HÀNH
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Thực hành: viết lại lệnh cp bằng năm syscall' },

    { t: 'p', x:
      'Bạn sẽ dựng một chương trình chép file hoạt động thật, ép nó lỗi để nhìn <code>errno</code>, ' +
      'đo giá của đệm, tạo một file 10 MB chỉ tốn 8 KB, rồi đọc thiết bị thật trong ' +
      '<code>/dev</code> và <code>/sys</code>. Toàn bộ mất khoảng 40 phút.' },

    { t: 'steps', items: [

      /* ---------- BƯỚC 1 ---------- */
      { title: 'Chuẩn bị thư mục làm việc và công cụ',
        blocks: [
          { t: 'p', x:
            'Giữ nguyên nếp làm việc từ các chặng trước: mỗi bài một thư mục riêng dưới ' +
            '<code>~/embedded</code>. Nhớ làm trong <code>~</code> chứ không phải ' +
            '<code>/mnt/c</code> — Bài 1 đã đo được chênh lệch <b>52 lần</b> về tốc độ ' +
            'hệ thống file.' },

          { t: 'code', where: 'wsl', code:
            'mkdir -p ~/embedded/bai19 && cd ~/embedded/bai19\n' +
            'sudo apt install -y strace ltrace manpages-dev\n' +
            'MANWIDTH=80 man 2 write | head -13' },

          { t: 'code', where: 'out', nocopy: true, code:
            'write(2)                      System Calls Manual                      write(2)\n' +
            '\n' +
            'NAME\n' +
            '       write - write to a file descriptor\n' +
            '\n' +
            'LIBRARY\n' +
            '       Standard C library (libc, -lc)\n' +
            '\n' +
            'SYNOPSIS\n' +
            '       #include <unistd.h>\n' +
            '\n' +
            '       ssize_t write(size_t count;\n' +
            '                     int fd, const void buf[count], size_t count);' },

          { t: 'cal', kind: 'tip', title: 'man mục 2 là tài liệu tham khảo chính của cả Chặng 03', x:
            '<p>Mười ba dòng bạn vừa giới hạn bằng <code>head -13</code> chỉ đủ tới hết mục ' +
            '<b>SYNOPSIS</b>. Dòng <code>LIBRARY: Standard C library (libc, -lc)</code> xác nhận ' +
            'đúng điều bạn đã thấy ở sơ đồ user/kernel phía trên: <code>write()</code> mà bạn gọi ' +
            'trong C là một hàm nằm trong <code>libc.so.6</code>, không phải bản thân syscall. ' +
            'Bỏ <code>| head -13</code> đi để đọc tiếp — <b>RETURN VALUE</b> và <b>ERRORS</b> nằm ' +
            'ngay phía dưới, chưa xuất hiện trong 13 dòng này.</p>' +
            '<p><code>man 2 write</code> — syscall. <code>man 3 printf</code> — hàm thư viện C. ' +
            'Cùng một cái tên có thể tồn tại ở nhiều mục: thử <code>man 2 open</code> và ' +
            '<code>man 3 fopen</code>.</p>' +
            '<p>Mục cần đọc đầu tiên trong mọi trang man mục 2 là <b>RETURN VALUE</b> và ' +
            '<b>ERRORS</b> — chúng liệt kê chính xác từng giá trị <code>errno</code> có thể xảy ' +
            'ra và nguyên nhân. Đây là tài liệu, không phải chỗ để đoán.</p>' }
        ]},

      /* ---------- BƯỚC 2 ---------- */
      { title: 'Viết copy.c — lệnh cp tối giản',
        blocks: [
          { t: 'p', x:
            'Chương trình này dùng đúng bốn syscall: <code>open</code> hai lần, ' +
            '<code>read</code>, <code>write</code>, <code>close</code>. Hãy chú ý vòng lặp ' +
            'ghi lồng bên trong — nó xử lý đúng trường hợp <code>write</code> ghi thiếu.' },

          { t: 'code', where: 'file', name: 'copy.c', lang: 'c', code:
            '#include <fcntl.h>\n' +
            '#include <unistd.h>\n' +
            '#include <stdio.h>\n' +
            '#include <errno.h>\n' +
            '#include <string.h>\n' +
            '\n' +
            'int main(int argc, char *argv[])\n' +
            '{\n' +
            '    char buf[4096];\n' +
            '    int src, dst;\n' +
            '    ssize_t n;\n' +
            '\n' +
            '    if (argc != 3) {\n' +
            '        fprintf(stderr, "Usage: %s <src> <dst>\\n", argv[0]);\n' +
            '        return 1;\n' +
            '    }\n' +
            '\n' +
            '    src = open(argv[1], O_RDONLY);\n' +
            '    if (src < 0) {\n' +
            '        fprintf(stderr, "open %s: %s (errno=%d)\\n",\n' +
            '                argv[1], strerror(errno), errno);\n' +
            '        return 1;\n' +
            '    }\n' +
            '\n' +
            '    dst = open(argv[2], O_WRONLY | O_CREAT | O_TRUNC, 0644);\n' +
            '    if (dst < 0) {\n' +
            '        fprintf(stderr, "open %s: %s (errno=%d)\\n",\n' +
            '                argv[2], strerror(errno), errno);\n' +
            '        close(src);\n' +
            '        return 1;\n' +
            '    }\n' +
            '\n' +
            '    while ((n = read(src, buf, sizeof buf)) > 0) {\n' +
            '        ssize_t written = 0;\n' +
            '        while (written < n) {                       /* write can write fewer bytes than requested */\n' +
            '            ssize_t m = write(dst, buf + written, n - written);\n' +
            '            if (m < 0) {\n' +
            '                perror("write");\n' +
            '                close(src); close(dst);\n' +
            '                return 1;\n' +
            '            }\n' +
            '            written += m;\n' +
            '        }\n' +
            '    }\n' +
            '    if (n < 0) {                                   /* n == 0 means end of file */\n' +
            '        perror("read");\n' +
            '        close(src); close(dst);\n' +
            '        return 1;\n' +
            '    }\n' +
            '\n' +
            '    printf("fd src=%d  fd dst=%d\\n", src, dst);\n' +
            '    close(src);\n' +
            '    close(dst);\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -O2 -o copy copy.c\n' +
            'printf \'line 1\\nline 2\\nline 3\\n\' > source.txt\n' +
            './copy source.txt dest.txt\n' +
            'cmp source.txt dest.txt && echo "IDENTICAL BYTE FOR BYTE"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'fd src=3  fd dst=4\n' +
            'IDENTICAL BYTE FOR BYTE' },

          { t: 'cal', kind: 'info', title: 'fd=3 và fd=4 không phải ngẫu nhiên, và cmp im lặng là kết quả tốt', x:
            '<p><code>copy</code> không mở gì khác trước đó, nên khi nó gọi <code>open(argv[1], ...)</code> ' +
            'lần đầu, 0/1/2 đã bị shell chiếm hết — đúng quy tắc "trả về số nhỏ nhất còn trống" ở mục ' +
            '<i>File descriptor</i> phía trên. <code>src</code> nhận <b>3</b>, rồi <code>dst</code> nhận <b>4</b> ' +
            'khi <code>open(argv[2], ...)</code> chạy tiếp ngay sau đó.</p>' +
            '<p><code>cmp</code> không in gì cả khi hai file giống hệt nhau — im lặng ở đây là thành công, ' +
            'không phải chương trình treo. Đó là bằng chứng vòng lặp <code>while (written &lt; n)</code> đã ' +
            'ghi đúng và đủ số byte, kể cả khi một lần gọi <code>write</code> chọn ghi ít hơn yêu cầu.</p>' },

          { t: 'cmdx', cmd: 'while ((n = read(src, buf, sizeof buf)) > 0)',
            title: 'Vì sao vòng lặp phải viết đúng như vậy',
            rows: [
              ['<code>sizeof buf</code>', 'Kích thước đệm, do trình biên dịch tính', 'Không viết cứng số <code>4096</code> ở hai chỗ — đổi một chỗ quên chỗ kia là tràn bộ đệm'],
              ['<code>&gt; 0</code>', 'Chỉ lặp khi thật sự đọc được byte nào', 'Viết <code>!= 0</code> sẽ lặp vô hạn khi gặp lỗi, vì <code>-1</code> cũng khác 0'],
              ['<code>n == 0</code>', 'Hết file — thoát vòng lặp bình thường', 'Đây là <b>cách duy nhất</b> biết đã hết file'],
              ['<code>n &lt; 0</code>', 'Lỗi thật, kiểm tra sau vòng lặp', 'Nếu bỏ qua, file chép ra bị cụt mà chương trình vẫn báo thành công'],
              ['<code>ssize_t</code>', 'Số nguyên có dấu, đủ rộng cho kích thước', 'Dùng <code>int</code> sẽ tràn với file &gt; 2 GB; dùng <code>size_t</code> (không dấu) làm <code>-1</code> thành một số khổng lồ và mất luôn khả năng bắt lỗi']
            ]},

          { t: 'cal', kind: 'info', title: 'Vì sao đệm 4096 byte chứ không phải 100 hay 1 000 000', x:
            '<p>4096 byte là kích thước một <b>trang bộ nhớ</b> và cũng là kích thước block mặc ' +
            'định của ext4. Đọc đúng bằng bội số của trang thì nhân không phải ghép hay cắt dữ ' +
            'liệu, và đó cũng chính là kích thước đệm mà <code>stdio</code> tự chọn — bạn đã ' +
            'thấy con số 4096 hiện ra trong <code>strace</code>.</p>' +
            '<p>Đệm quá nhỏ (ví dụ 1 byte) thì số syscall bùng nổ. Đệm quá lớn (1 MB) thì tốn ' +
            'RAM mà không nhanh thêm bao nhiêu — điều đáng quan tâm khi thiết bị chỉ có 64 MB ' +
            'RAM. Con số hợp lý trong thực tế nằm giữa 4 KB và 64 KB.</p>' }
        ]},

      /* ---------- BƯỚC 3 ---------- */
      { title: 'Nhìn xuyên chương trình bằng strace',
        blocks: [
          { t: 'p', x:
            'Bây giờ đối chiếu mã nguồn bạn vừa viết với những gì nhân thật sự nhận được. ' +
            'Lọc riêng bốn syscall liên quan tới file để bỏ nhiễu khởi động:' },

          { t: 'code', where: 'wsl', code:
            'strace -e trace=openat,read,write,close -o trace.txt ./copy source.txt dest.txt\n' +
            'tail -9 trace.txt' },

          { t: 'code', where: 'out', nocopy: true, code:
            'openat(AT_FDCWD, "source.txt", O_RDONLY) = 3\n' +
            'openat(AT_FDCWD, "dest.txt", O_WRONLY|O_CREAT|O_TRUNC, 0644) = 4\n' +
            'read(3, "line 1\\nline 2\\nline 3\\n", 4096) = 21\n' +
            'write(4, "line 1\\nline 2\\nline 3\\n", 21) = 21\n' +
            'read(3, "", 4096)                       = 0\n' +
            'close(3)                                = 0\n' +
            'close(4)                                = 0\n' +
            'write(1, "fd src=3  fd dst=4\\n", 19)    = 19\n' +
            '+++ exited with 0 +++' },

          { t: 'cal', kind: 'tip', title: 'Đúng chín dòng bạn đã đọc kỹ ở mục lý thuyết phía trên', x:
            '<p>Đây là chính xác đoạn vết bạn đã phân tích theo sáu điểm ở mục lý thuyết ' +
            '<i>strace — nhìn xuyên qua một chương trình không có mã nguồn</i>: hai <code>openat</code> ' +
            'cấp fd 3 và 4, cặp <code>read</code>/<code>write</code> 21 byte, dòng ' +
            '<code>read(3, "", 4096) = 0</code> báo hết file, hai <code>close</code>, rồi một ' +
            '<code>write(1, …)</code> duy nhất ứng với lệnh <code>printf</code> trong mã nguồn. Dòng nào ' +
            'chưa rõ nghĩa, quay lại sáu điểm đã liệt kê ở đó trước khi làm bước tiếp theo.</p>' },

          { t: 'p', x:
            'Rồi đếm tổng thể xem một chương trình 60 dòng thật ra tốn bao nhiêu lời gọi vào nhân:' },

          { t: 'code', where: 'wsl',
            notes: ['<code>-S calls</code> sắp xếp theo số lần gọi, <code>-U name,calls,errors</code> chỉ giữ ba cột đó — bỏ cột thời gian vốn dao động mỗi lần chạy.'],
            code: 'strace -c -S calls -U name,calls,errors -o stats.txt ./copy source.txt dest.txt\ncat stats.txt' },

          { t: 'code', where: 'out', nocopy: true, code:
            'syscall              calls    errors\n' +
            '---------------- --------- ---------\n' +
            'mmap                     8          \n' +
            'close                    4          \n' +
            'openat                   4          \n' +
            'read                     3          \n' +
            'fstat                    3          \n' +
            'mprotect                 3          \n' +
            'brk                      3          \n' +
            'write                    2          \n' +
            'pread64                  2          \n' +
            'munmap                   1          \n' +
            'access                   1         1\n' +
            'execve                   1          \n' +
            'arch_prctl               1          \n' +
            'set_tid_address          1          \n' +
            'set_robust_list          1          \n' +
            'prlimit64                1          \n' +
            'getrandom                1          \n' +
            'rseq                     1          \n' +
            '---------------- --------- ---------\n' +
            'total                   41         1' },

          { t: 'cal', kind: 'why', title: '41 syscall cho một chương trình chép 21 byte', x:
            '<p>Chỉ <b>9</b> trong số đó là việc thật (2 <code>openat</code>, 2 <code>read</code>, ' +
            '2 <code>write</code>, 2 <code>close</code>, 1 <code>execve</code>). 32 lời gọi còn ' +
            'lại là chi phí cố định: nạp <code>ld.so.cache</code>, mở và ánh xạ ' +
            '<code>libc.so.6</code>, đặt quyền bộ nhớ bằng <code>mprotect</code>, khởi tạo TLS.</p>' +
            '<p>Cột <code>errors</code> báo <b>1</b> lỗi — và đó là chuyện <i>bình thường</i>: ' +
            '<code>access("/etc/ld.so.preload")</code> trả về <code>ENOENT</code> vì file đó ' +
            'không tồn tại. Bài học: <b>thấy lỗi trong <code>strace</code> không có nghĩa ' +
            'là chương trình hỏng.</b> Rất nhiều lỗi là phép thử có chủ ý.</p>' +
            '<p>Con số 32-syscall-cố-định này chính là lý do Chặng 09 quan tâm tới liên kết tĩnh ' +
            'và tới BusyBox: trên thiết bị khởi động 300 tiến trình lúc boot, đó là 10 000 ' +
            'syscall chỉ để bắt đầu.</p>' }
        ]},

      /* ---------- BƯỚC 4 ---------- */
      { title: 'Ép lỗi để nhìn errno hoạt động',
        blocks: [
          { t: 'p', x:
            'Một chương trình hệ thống tốt được đánh giá bằng cách nó <b>hỏng</b>. Hãy ép ' +
            '<code>copy</code> vào hai tình huống lỗi khác nhau và xem nó có nói đúng nguyên nhân ' +
            'không:' },

          { t: 'code', where: 'wsl', code:
            './copy missing.txt out.txt ; echo "exit=$?"\n' +
            './copy /etc/shadow out.txt  ; echo "exit=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            'open missing.txt: No such file or directory (errno=2)\n' +
            'exit=1\n' +
            'open /etc/shadow: Permission denied (errno=13)\n' +
            'exit=1' },

          { t: 'cal', kind: 'info', title: 'Cùng một nhánh if trong copy.c, hai nguyên nhân khác nhau', x:
            '<p>Cả hai lệnh đều rơi vào đúng nhánh <code>if (src &lt; 0)</code> của <code>copy.c</code> — ' +
            'cả hai đều lỗi khi mở <b>đối số nguồn</b>, chưa hề chạm tới <code>dst</code>. Nhưng ' +
            '<code>errno</code> khác nhau đúng như bảng hằng lỗi ở mục <i>errno</i> phía trên: thiếu ' +
            'file ra <b>2 (ENOENT)</b>, không đủ quyền ra <b>13 (EACCES)</b>. Cùng một dòng ' +
            '<code>strerror(errno)</code> tự in đúng câu tương ứng — chương trình không cần viết riêng ' +
            'nhánh cho từng loại lỗi.</p>' +
            '<p>Mã thoát <b>1</b> ở cả hai lần đến từ đúng một dòng <code>return 1;</code> ngay sau ' +
            'nhánh đó — <code>copy</code> phân biệt nguyên nhân khi <i>in thông báo</i>, nhưng không hề ' +
            'phân biệt khi <i>quyết định mã thoát</i>.</p>' },

          { t: 'p', x:
            'Bây giờ tới bài học quan trọng nhất về <code>errno</code>. Biên dịch và chạy ' +
            '<code>error.c</code> ở phần lý thuyết, <b>hai lần</b> — một lần ra terminal, một lần ' +
            'chuyển hướng vào file:' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -o error error.c\n' +
            './error\n' +
            'echo "=== bay gio chuyen huong ===" \n' +
            './error > out.txt 2>&1\n' +
            'cat out.txt' },

          { t: 'code', where: 'out', nocopy: true, code:
            '1) ret=-1 errno=2 No such file or directory\n' +
            '2) ret=-1 errno=13 Permission denied\n' +
            '3) ret=-1 errno=21 Is a directory\n' +
            '4) ret=3 errno=21 Is a directory  <- succeeded but errno still stale\n' +
            '5) close(999): Bad file descriptor\n' +
            '=== bay gio chuyen huong ===\n' +
            '5) close(999): Bad file descriptor\n' +
            '1) ret=-1 errno=2 No such file or directory\n' +
            '2) ret=-1 errno=13 Permission denied\n' +
            '3) ret=-1 errno=21 Is a directory\n' +
            '4) ret=3 errno=21 Is a directory  <- succeeded but errno still stale' },

          { t: 'cal', kind: 'danger', title: 'Hai phát hiện, cả hai đều làm hỏng ngày làm việc của người mới', x:
            '<p><b>Một.</b> Dòng 4 thành công (fd = 3) nhưng <code>errno</code> vẫn là 21 sót ' +
            'lại từ dòng 3. <b>Syscall thành công không dọn <code>errno</code>.</b> Chỉ đọc ' +
            '<code>errno</code> sau khi giá trị trả về đã báo lỗi.</p>' +
            '<p><b>Hai.</b> Khi chuyển hướng, dòng <b>5</b> nhảy lên <b>đầu</b>. Nó đi qua ' +
            '<code>perror</code> → <code>stderr</code> → <b>không đệm</b> → ra file ngay. Bốn ' +
            'dòng kia đi qua <code>printf</code> → <code>stdout</code>, mà <code>stdout</code> ' +
            'khi trỏ vào file thì chuyển sang <b>đệm toàn phần</b> và chỉ xả lúc chương trình ' +
            'thoát.</p>' +
            '<p>Trên thiết bị nhúng, hiện tượng này giết người thật: log của bạn ghi vào file, ' +
            'thiết bị mất điện đột ngột, và <b>4 KB log cuối cùng — đúng đoạn ghi lại nguyên ' +
            'nhân sự cố — biến mất</b> vì còn nằm trong đệm user space. Cách chữa: ' +
            '<code>setvbuf(stdout, NULL, _IOLBF, 0)</code> để ép đệm theo dòng, hoặc ' +
            '<code>fflush()</code> sau mỗi bản ghi quan trọng, hoặc dùng thẳng <code>write</code>.</p>' }
        ]},

      /* ---------- BƯỚC 5 ---------- */
      { title: 'Đo giá của đệm: 200 000 syscall so với 559',
        blocks: [
          { t: 'p', x:
            'Cùng một kết quả trên đĩa, hai cách đi. Chương trình dưới đây ghi 200 000 dòng bằng ' +
            'một trong hai cách, chọn bằng tham số dòng lệnh:' },

          { t: 'code', where: 'file', name: 'lines.c', lang: 'c', code:
            '#include <stdio.h>\n' +
            '#include <string.h>\n' +
            '#include <unistd.h>\n' +
            '#include <fcntl.h>\n' +
            '\n' +
            '#define LINE_COUNT 200000\n' +
            '\n' +
            '/* write() can write fewer bytes -> always loop until done */\n' +
            'static int write_all(int fd, const char *p, size_t n)\n' +
            '{\n' +
            '    while (n > 0) {\n' +
            '        ssize_t m = write(fd, p, n);\n' +
            '        if (m < 0) return -1;\n' +
            '        p += m; n -= m;\n' +
            '    }\n' +
            '    return 0;\n' +
            '}\n' +
            '\n' +
            'static void syscall_way(const char *path)\n' +
            '{\n' +
            '    int fd = open(path, O_WRONLY | O_CREAT | O_TRUNC, 0644);\n' +
            '    char line[64];\n' +
            '    for (int i = 0; i < LINE_COUNT; i++) {\n' +
            '        int n = snprintf(line, sizeof line, "line %d\\n", i);\n' +
            '        write_all(fd, line, n);\n' +
            '    }\n' +
            '    close(fd);\n' +
            '}\n' +
            '\n' +
            'static void stdio_way(const char *path)\n' +
            '{\n' +
            '    FILE *f = fopen(path, "w");\n' +
            '    for (int i = 0; i < LINE_COUNT; i++)\n' +
            '        fprintf(f, "line %d\\n", i);\n' +
            '    fclose(f);\n' +
            '}\n' +
            '\n' +
            'int main(int argc, char *argv[])\n' +
            '{\n' +
            '    if (argc != 3) {\n' +
            '        fprintf(stderr, "Usage: %s <syscall|stdio> <file>\\n", argv[0]);\n' +
            '        return 1;\n' +
            '    }\n' +
            '    if (strcmp(argv[1], "syscall") == 0) syscall_way(argv[2]);\n' +
            '    else                                 stdio_way(argv[2]);\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -Wextra -O2 -o lines lines.c\n' +
            'TIMEFORMAT=\'real %3R  user %3U  sys %3S\'\n' +
            'for i in 1 2 3; do time ./lines syscall a.txt; done\n' +
            'for i in 1 2 3; do time ./lines stdio   b.txt; done\n' +
            'cmp a.txt b.txt && echo "FILES ARE IDENTICAL"' },

          { t: 'cmdx', cmd: "TIMEFORMAT='real %3R  user %3U  sys %3S'",
            title: 'Ba trường in ra bởi time — cột nào mới thật sự đo syscall',
            rows: [
              ['<code>%R</code>', 'Thời gian thực đã trôi qua (<i>wall clock</i>)', 'Gồm cả lúc tiến trình bị hệ điều hành tạm dừng để nhường CPU — không phải con số đo riêng chương trình'],
              ['<code>%U</code>', 'Số giây CPU chạy trong <b>user mode</b>', 'Thời gian tính toán thuần trong mã của bạn, không tính lúc chờ nhân'],
              ['<code>%S</code>', 'Số giây CPU chạy trong <b>kernel mode</b>', 'Cột quan trọng nhất bài này: mỗi syscall cộng thêm đúng vào đây'],
              ['<code>%3</code>', 'In 3 chữ số sau dấu phẩy', 'Giống mặc định của bash; đặt lại <code>TIMEFORMAT</code> ở đây chỉ để gộp cả ba số thành một dòng dễ so sánh, thay vì in trên ba dòng riêng như mặc định']
            ]},

          { t: 'code', where: 'out', nocopy: true, code:
            'real 0.131  user 0.032  sys 0.099\n' +
            'real 0.130  user 0.036  sys 0.095\n' +
            'real 0.137  user 0.032  sys 0.102\n' +
            'real 0.017  user 0.012  sys 0.004\n' +
            'real 0.019  user 0.009  sys 0.010\n' +
            'real 0.020  user 0.019  sys 0.000\n' +
            'FILES ARE IDENTICAL' },

          { t: 'p', x:
            'Giờ đếm chính xác số lần vượt biên giới. Đây mới là con số giải thích chênh lệch trên:' },

          { t: 'code', where: 'wsl', code:
            'strace -c -e trace=write ./lines syscall a.txt 2>&1 | sed -n \'3p\'\n' +
            'strace -c -e trace=write ./lines stdio   b.txt 2>&1 | sed -n \'3p\'' },

          { t: 'code', where: 'out', nocopy: true, code:
            '100.00    4.785954          23    200000           write\n' +
            '100.00    0.008001          14       559           write' },

          { t: 'table',
            head: ['Chỉ số', '<code>write()</code> thuần', '<code>stdio</code>', 'Tỉ lệ'],
            rows: [
              ['Thời gian thực tốt nhất', '0,130 s', '0,017 s', '<b>7,6 lần</b>'],
              ['Thời gian trong nhân', '0,095 s', '0,004 s', '23,8 lần'],
              ['Số lần gọi <code>write</code>', '200 000', '559', '<b>358 lần</b>'],
              ['Byte mỗi lần gọi', '≈ 11', '4096', '—']
            ]},

          { t: 'cal', kind: 'info', title: 'Kiểm tra con số 559 — nó phải đúng bằng phép chia', x:
            '<p>File kết quả nặng <b>2 288 890</b> byte. Chia cho đệm 4096: <b>558,8</b>. Làm ' +
            'tròn lên vì phần dư cũng phải được ghi → <b>559</b>. Đúng khớp với ' +
            '<code>strace</code>.</p>' +
            '<p>Khi một phép đo khớp với phép tính đơn giản như vậy, bạn biết mình đã hiểu đúng ' +
            'cơ chế chứ không phải chỉ nhớ một con số. Hãy thử: đổi đệm bằng ' +
            '<code>setvbuf(f, NULL, _IOFBF, 65536)</code> đặt ngay sau <code>fopen</code>, số ' +
            'lần <code>write</code> phải tụt xuống còn 35.</p>' +
            '<p>Chú ý cột thời gian dưới <code>strace</code>: <b>4,79 s</b> cho 200 000 lời gọi. ' +
            'Chạy không có <code>strace</code> thì chỉ 0,130 s. <code>strace</code> làm chậm ' +
            '<b>37 lần</b> — dùng nó để đếm, đừng dùng để đo.</p>' }
        ]},

      /* ---------- BƯỚC 6 ---------- */
      { title: 'lseek: tạo file 10 MB chỉ tốn 8 KB đĩa',
        blocks: [
          { t: 'p', x:
            'Bước này chứng minh <code>lseek</code> làm gì với con trỏ vị trí, và cho bạn thấy ' +
            'khái niệm <i>sparse file</i> mà bạn sẽ gặp lại mỗi lần làm việc với ảnh đĩa ở ' +
            'Chặng 09.' },

          { t: 'code', where: 'file', name: 'sparse.c', lang: 'c', code:
            '#include <fcntl.h>\n' +
            '#include <unistd.h>\n' +
            '#include <stdio.h>\n' +
            '\n' +
            'int main(void)\n' +
            '{\n' +
            '    int fd = open("sparse.bin", O_WRONLY | O_CREAT | O_TRUNC, 0644);\n' +
            '    off_t pos;\n' +
            '\n' +
            '    write(fd, "HEAD", 4);\n' +
            '    pos = lseek(fd, 10 * 1024 * 1024, SEEK_SET);\n' +
            '    printf("after lseek, pos = %lld\\n", (long long)pos);\n' +
            '    write(fd, "TAIL", 4);\n' +
            '\n' +
            '    pos = lseek(fd, 0, SEEK_CUR);\n' +
            '    printf("current pos      = %lld\\n", (long long)pos);\n' +
            '    pos = lseek(fd, 0, SEEK_END);\n' +
            '    printf("file size        = %lld\\n", (long long)pos);\n' +
            '    close(fd);\n' +
            '    return 0;\n' +
            '}' },

          { t: 'code', where: 'wsl', code:
            'gcc -Wall -o sparse sparse.c\n./sparse\nls -l sparse.bin\ndu -h sparse.bin\ndu --apparent-size -h sparse.bin' },

          { t: 'code', where: 'out', nocopy: true, code:
            'after lseek, pos = 10485760\n' +
            'current pos      = 10485764\n' +
            'file size        = 10485764\n' +
            '-rw-r--r-- 1 shinarus shinarus 10485764 Aug  5 22:13 sparse.bin\n' +
            '8.0K\tsparse.bin\n' +
            '11M\tsparse.bin' },

          { t: 'p', x:
            'Đọc thử ba vị trí trong file để xác nhận phần giữa thật sự là số 0:' },

          { t: 'code', where: 'wsl', code:
            'xxd -s 0        -l 16 sparse.bin\n' +
            'xxd -s 5242880  -l 16 sparse.bin\n' +
            'xxd -s 10485760 -l 16 sparse.bin' },

          { t: 'cmdx', cmd: 'xxd -s 5242880 -l 16 sparse.bin',
            title: 'Hai cờ của xxd cần để đọc đúng một vùng trong file lớn',
            rows: [
              ['<code>-s &lt;offset&gt;</code>', 'Nhảy tới vị trí byte tuyệt đối trước khi đọc (<i>seek</i>)', 'Không có nó, <code>xxd</code> luôn đọc từ đầu file — vô dụng với file 10 MB mà bạn chỉ muốn xem ở giữa'],
              ['<code>-l &lt;len&gt;</code>', 'Chỉ đọc và in đúng <i>len</i> byte rồi dừng', 'Không có nó, <code>xxd</code> in hết phần còn lại của file — với <code>sparse.bin</code> là hàng triệu dòng toàn số 0']
            ]},

          { t: 'code', where: 'out', nocopy: true, code:
            '00000000: 4845 4144 0000 0000 0000 0000 0000 0000  HEAD............\n' +
            '00500000: 0000 0000 0000 0000 0000 0000 0000 0000  ................\n' +
            '00a00000: 5441 494c                                TAIL' },

          { t: 'cal', kind: 'why', title: 'ls nói 10 MB, du nói 8 KB — ai đúng?', x:
            '<p>Cả hai. <code>ls -l</code> báo <b>kích thước logic</b>: chỉ số byte cuối cùng ' +
            'cộng một. <code>du</code> báo <b>số block đã cấp phát thật</b>. Cờ ' +
            '<code>--apparent-size</code> ép <code>du</code> báo theo cách của <code>ls</code>, ' +
            'nên nó hiện <b>11M</b>.</p>' +
            '<p>Vùng ở giữa chưa bao giờ được ghi nên ext4 không cấp block nào; khi đọc, nhân ' +
            'trả về số 0 mà không đụng tới đĩa. 8 KB thật sự dùng là hai block chứa ' +
            '<code>HEAD</code> và <code>TAIL</code>.</p>' +
            '<p><b>Hệ quả thực tế ở Chặng 09.</b> File <code>rootfs.img</code> 2 GB có thể chỉ ' +
            'chiếm 300 MB đĩa. Nhưng <code>cat rootfs.img &gt; copy.img</code> sẽ ghi thật cả ' +
            '2 GB số 0 và làm phình bản sao lên đủ 2 GB, còn <code>cp --sparse=always</code> hay ' +
            '<code>rsync -S</code> thì giữ nguyên lỗ. Ghi ảnh đĩa vào thẻ SD thì ngược lại: lỗ ' +
            'bắt buộc phải trở thành số 0 thật, và đó là lý do <code>dd</code> ghi thẻ luôn tốn ' +
            'đủ thời gian cho toàn bộ 2 GB.</p>' }
        ]},

      /* ---------- BƯỚC 7 ---------- */
      { title: 'Đọc thiết bị thật trong /dev và /sys',
        blocks: [
          { t: 'p', x:
            'Đây là lý do bạn học cả bài này. Trên thiết bị nhúng, cảm biến và chân GPIO hiện ra ' +
            'dưới dạng file trong <code>/dev</code> và <code>/sys</code>, và bạn nói chuyện với ' +
            'chúng bằng đúng <code>open</code>/<code>read</code>/<code>write</code> vừa học. Bắt ' +
            'đầu bằng bốn thiết bị ảo có sẵn ở mọi hệ Linux:' },

          { t: 'code', where: 'wsl', code: 'ls -l /dev/null /dev/zero /dev/urandom /dev/full' },

          { t: 'code', where: 'out', nocopy: true, code:
            'crw-rw-rw- 1 root root 1, 7 Aug  4 22:42 /dev/full\n' +
            'crw-rw-rw- 1 root root 1, 3 Aug  4 22:42 /dev/null\n' +
            'crw-rw-rw- 1 root root 1, 9 Aug  4 22:42 /dev/urandom\n' +
            'crw-rw-rw- 1 root root 1, 5 Aug  4 22:42 /dev/zero' },

          { t: 'cmdx', cmd: 'crw-rw-rw- 1 root root 1, 3 /dev/null',
            title: 'Đọc một dòng ls trong /dev — nó khác file thường ở đâu',
            rows: [
              ['<code>c</code>', 'Thiết bị <b>ký tự</b> — đọc/ghi theo dòng byte, không định vị được', '<code>b</code> là thiết bị <b>khối</b> (ổ đĩa, thẻ SD); <code>-</code> là file thường'],
              ['<code>1,</code>', '<b>Số hiệu chính</b> (major) = 1', 'Chỉ ra <b>driver nào</b> phụ trách. Major 1 là driver bộ nhớ trong nhân'],
              ['<code>3</code>', '<b>Số hiệu phụ</b> (minor) = 3', 'Chỉ ra <b>thiết bị nào</b> trong số các thiết bị của driver đó'],
              ['(không có cột kích thước)', 'File thiết bị không có nội dung trên đĩa', 'Chỗ mà file thường ghi kích thước, ở đây là cặp major/minor']
            ]},

          { t: 'code', where: 'wsl', code:
            'dd if=/dev/urandom bs=8 count=1 2>/dev/null | xxd\n' +
            'dd if=/dev/zero    bs=16 count=1 2>/dev/null | xxd\n' +
            'echo hello > /dev/null ; echo "write to /dev/null -> exit=$?"\n' +
            'echo hello > /dev/full ; echo "write to /dev/full -> exit=$?"' },

          { t: 'code', where: 'out', nocopy: true, code:
            '00000000: e6ac 6494 0790 f491                      ..d.....\n' +
            '00000000: 0000 0000 0000 0000 0000 0000 0000 0000  ................\n' +
            'write to /dev/null -> exit=0\n' +
            'bash: echo: write error: No space left on device\n' +
            'write to /dev/full -> exit=1',
            notes: ['Dòng đầu là 8 byte ngẫu nhiên — máy bạn chắc chắn ra giá trị khác. Ba dòng còn lại phải giống hệt.'] },

          { t: 'cal', kind: 'info', title: '/dev/zero luôn trả về số 0, /dev/null luôn nuốt trọn dữ liệu', x:
            '<p>Dòng thứ hai (<code>dd if=/dev/zero</code>) toàn <b>0000</b> — <code>/dev/zero</code> không ' +
            'đọc từ đâu cả, driver của nó chỉ chép byte 0 vào bộ đệm bạn đưa, bao nhiêu cũng được. Ghi vào ' +
            '<code>/dev/null</code> thì ngược lại: dữ liệu bị driver vứt ngay khi vào tới, không chạm RAM ' +
            'hay đĩa, nên <code>echo hello &gt; /dev/null</code> luôn trả về <b>exit=0</b> dù không ai đọc ' +
            'lại được "hello" ở đâu nữa.</p>' +
            '<p>Cả hai đều mang <b>major 1</b> như bạn vừa thấy ở dòng <code>ls -l</code> phía trên — cùng ' +
            'driver bộ nhớ trong nhân, chỉ khác số hiệu phụ. Dùng chúng để tạo dữ liệu giả ' +
            '(<code>/dev/zero</code>) hoặc bỏ output không cần (<code>/dev/null</code>) mà không tốn một ' +
            'byte đĩa thật nào.</p>' },

          { t: 'cal', kind: 'tip', title: '/dev/full tồn tại để bạn thử được nhánh xử lý lỗi', x:
            '<p>Ba thiết bị đầu thì quen thuộc. Cái thứ tư mới là công cụ nghề: <b>mọi lần ghi ' +
            'vào <code>/dev/full</code> đều thất bại với <code>ENOSPC</code></b> (errno 28, ' +
            '<i>No space left on device</i>).</p>' +
            '<p>Đây là cách rẻ nhất để kiểm thử nhánh xử lý lỗi ghi trong chương trình của bạn — ' +
            'nhánh mà bình thường không bao giờ chạy tới, nên cũng là nhánh hay có lỗi nhất. Trên ' +
            'thiết bị nhúng, đầy flash là chuyện xảy ra thường xuyên chứ không phải giả định: ' +
            'log chạy vài tháng là đầy.</p>' +
            '<p>Hãy thử ngay với chương trình bạn vừa viết — <code>./copy source.txt /dev/full</code> ' +
            'phải cho ra:</p>' +
            '<p><code>write: No space left on device</code> và mã thoát <b>1</b>.</p>' +
            '<p>Nếu nó im lặng báo thành công, nghĩa là bạn đã bỏ kiểm tra giá trị trả về của ' +
            '<code>write</code> ở đâu đó.</p>' },

          { t: 'p', x:
            'Còn <code>/sys</code> là <b>hệ thống file ảo</b> do nhân sinh ra trong bộ nhớ, phơi ' +
            'bày cấu trúc phần cứng dưới dạng cây thư mục. Không byte nào của nó nằm trên đĩa:' },

          { t: 'code', where: 'wsl', code:
            'cat /sys/devices/system/cpu/online\n' +
            'cat /proc/sys/kernel/osrelease\n' +
            'ls -l /proc/sys/vm/drop_caches' },

          { t: 'code', where: 'out', nocopy: true, code:
            '0-5\n' +
            '6.18.33.2-microsoft-standard-WSL2\n' +
            '--w------- 1 root root 0 Aug  5 22:11 /proc/sys/vm/drop_caches' },

          { t: 'cal', kind: 'info', title: '0-5 chính là sáu CPU đã nhắc ở mục đo giá syscall', x:
            '<p><code>0-5</code> là danh sách CPU logic đang bật, đánh số từ 0 — nghĩa là máy có đúng ' +
            '<b>6 CPU</b>, khớp với con số "WSL2 là một máy ảo chạy chung 6 CPU với Windows" đã nêu ở ' +
            'mục <i>Một syscall đắt hơn một lời gọi hàm bao nhiêu?</i> phía trên. Đó cũng là lý do phép ' +
            'đo syscall dao động mạnh giữa các lần chạy: 6 CPU đó chia sẻ với toàn bộ tiến trình Windows ' +
            'khác đang chạy cùng lúc.</p>' +
            '<p><code>osrelease</code> xác nhận đúng bản nhân bạn đang chạy suốt bài này: ' +
            '<code>6.18.33.2-microsoft-standard-WSL2</code>.</p>' },

          { t: 'cal', kind: 'why', title: 'Đây chính là cách bạn sẽ bật một chiếc đèn LED', x:
            '<p>Trên một board thật, bật đèn LED đúng nghĩa đen là:</p>' +
            '<p><code>echo 1 &gt; /sys/class/leds/led0/brightness</code></p>' +
            '<p>Bên dưới câu lệnh đó là <code>open</code> + <code>write</code> + <code>close</code> ' +
            '— y hệt những gì bạn vừa viết trong <code>copy.c</code>. Không có API bí ẩn nào cả.</p>' +
            '<p>Chú ý quyền của <code>drop_caches</code>: <code>--w-------</code>, tức là ' +
            '<b>chỉ ghi, chỉ root</b>. Nhiều file trong <code>/sys</code> như vậy — mở bằng ' +
            '<code>O_RDONLY</code> sẽ nhận <code>EACCES</code>. Và kích thước báo <b>0</b> dù ' +
            '<code>cat</code> vẫn ra nội dung, vì nội dung được nhân sinh ra <i>tại thời điểm ' +
            'bạn đọc</i> chứ không nằm sẵn ở đâu.</p>' +
            '<p>Bài 57 sẽ dùng chính cơ chế này qua giao diện GPIO chardev và thư viện ' +
            '<code>libgpiod</code> — đã cài sẵn trên máy bạn từ Chặng 00.</p>' }
        ]}
    ]},

    /* ══════════════════════════════════════════════
       10. LỖI THƯỜNG GẶP
       ══════════════════════════════════════════════ */
    { t: 'h2', x: 'Lỗi thường gặp' },

    { t: 'table',
      head: ['Thông báo', 'Nguyên nhân', 'Cách xử lý'],
      rows: [
        ['<code>ignoring return value of \'write\' declared with attribute \'warn_unused_result\'</code>',
         'Gọi <code>write</code> mà không dùng giá trị trả về. Cảnh báo này gặp thật khi soạn <code>lines.c</code>',
         'Đừng dập bằng <code>(void)</code>. Viết hàm <code>write_all()</code> lặp cho tới khi ghi hết — như bản cuối trong bài'],
        ['<code>error: \'O_RDONLY\' undeclared</code>',
         'Thiếu <code>#include &lt;fcntl.h&gt;</code>',
         'Tra <code>man 2 open</code>, mục <b>SYNOPSIS</b> liệt kê đúng những header cần thiết'],
        ['<code>warning: implicit declaration of function \'read\'</code>',
         'Thiếu <code>#include &lt;unistd.h&gt;</code>',
         'Rất nguy hiểm trên 64 bit: C mặc định coi hàm trả về <code>int</code>, làm hỏng giá trị <code>ssize_t</code>. Luôn dịch với <code>-Wall</code> và không bỏ qua cảnh báo'],
        ['<code>open: Permission denied</code> khi mở file trong <code>/dev</code>',
         'Không đủ quyền, hoặc không thuộc nhóm sở hữu thiết bị',
         'Xem <code>ls -l /dev/&lt;tên&gt;</code> để biết nhóm, rồi <code>sudo usermod -aG &lt;nhóm&gt; $USER</code>. Đây là bước bắt buộc với <code>gpiochip</code>, <code>i2c</code>, <code>spidev</code> ở Chặng 10'],
        ['File chép ra bị cụt, chỉ thiếu vài trăm byte cuối',
         'Không lặp khi <code>write</code> ghi thiếu, hoặc quên <code>close</code>/<code>fclose</code> nên đệm chưa được xả',
         'Luôn lặp quanh <code>write</code>; luôn <code>close</code> và <b>kiểm tra giá trị trả về của <code>close</code></b> — lỗi ghi có thể xuất hiện tận lúc đóng file'],
        ['Chương trình chạy đúng trên terminal, sai thứ tự khi <code>&gt; out.txt</code>',
         '<code>stdout</code> đổi từ đệm theo dòng sang đệm toàn phần, còn <code>stderr</code> không đệm — bạn đã thấy tận mắt ở Bước 4',
         'Ép chế độ bằng <code>setvbuf(stdout, NULL, _IOLBF, 0)</code>, hoặc <code>fflush(stdout)</code> tại các mốc quan trọng'],
        ['Xử lý lỗi báo sai nguyên nhân, hoặc báo lỗi khi không có lỗi',
         'Đọc <code>errno</code> mà chưa kiểm tra giá trị trả về. Syscall thành công <b>không</b> xoá <code>errno</code>',
         'Chỉ đọc <code>errno</code> bên trong nhánh <code>if (kq &lt; 0)</code>. Không bao giờ viết <code>if (errno) ...</code>'],
        ['<code>strace: Operation not permitted</code> khi dùng <code>-p</code>',
         'Không được phép gắn vào tiến trình của người khác, hoặc <code>ptrace_scope</code> bị siết',
         '<code>sudo strace -p &lt;pid&gt;</code>. Xem quy tắc hiện hành bằng <code>cat /proc/sys/kernel/yama/ptrace_scope</code>'],
        ['Chương trình chậm hẳn khi bật <code>strace</code>',
         'Không phải lỗi — mỗi syscall bị chặn hai lần qua <code>ptrace</code>. Đo được <b>37 lần</b> chậm hơn trong bài',
         'Dùng <code>strace</code> để đếm và để hiểu; đo tốc độ thì chạy bằng <code>time</code> không có <code>strace</code>'],
        ['<code>ls</code> báo file to, đĩa vẫn còn trống nhiều',
         'Sparse file — <code>ls</code> báo kích thước logic, <code>du</code> báo block thật',
         'Bình thường. Nhớ dùng <code>cp --sparse=always</code> hoặc <code>rsync -S</code> khi nhân bản ảnh đĩa, nếu không bản sao sẽ phình lên đủ kích thước logic']
      ]},

    /* ══════════════════════════════════════════════
       11. RECAP
       ══════════════════════════════════════════════ */
    { t: 'recap', title: 'Tóm tắt Bài 19', items: [
      'CPU chạy chương trình của bạn ở <b>user mode</b>, nơi mọi lệnh chạm phần cứng đều bị cấm. <b>Syscall</b> là cánh cửa duy nhất sang <b>kernel mode</b>.',
      'Số hiệu syscall <b>phụ thuộc kiến trúc</b>: <code>write</code> là <b>1</b> trên x86-64 nhưng <b>64</b> trên ARM64. ARM64 không có <code>open</code>, chỉ có <code>openat</code> — vì thế <code>strace</code> luôn hiện <code>openat</code>.',
      'Một syscall tốn <b>116–139 ns</b> trên máy bạn, so với <b>0,5–2,4 ns</b> cho một lời gọi hàm thường: đắt hơn khoảng <b>hai bậc thập phân</b>. Nguyên tắc: gọi ít lần, mỗi lần làm nhiều việc.',
      '<b>File descriptor</b> là chỉ số dòng trong bảng của nhân. <b>0/1/2</b> do shell gán sẵn; <code>open</code> luôn trả về <b>số nhỏ nhất còn trống</b>. Soi bằng <code>ls -l /proc/&lt;pid&gt;/fd</code>.',
      '<code>read</code> và <code>write</code> <b>được phép làm ít hơn bạn yêu cầu</b>. Chỉ <code>read</code> trả về <b>0</b> mới nghĩa là hết file. Luôn lặp quanh <code>write</code>.',
      '<code>errno</code> <b>chỉ có nghĩa sau khi giá trị trả về báo lỗi</b> — syscall thành công không dọn nó. Bạn đã thấy fd hợp lệ đi kèm <code>errno=21</code> sót lại.',
      '<code>stdio</code> là lớp đệm <b>4096 byte</b> trong user space. Ghi 200 000 dòng: syscall thuần cần <b>200 000</b> lần <code>write</code>, <code>stdio</code> chỉ cần <b>559</b> — ít hơn <b>358 lần</b>, nhanh hơn <b>7,6 lần</b>, kết quả giống hệt từng byte.',
      '<code>lseek</code> vượt cuối file tạo <b>lỗ</b>: file <b>10 485 764</b> byte theo <code>ls</code> chỉ chiếm <b>8 KB</b> thật theo <code>du</code>.',
      '<code>strace</code> cho bạn thấy mọi thứ một chương trình làm với hệ thống, không cần mã nguồn — nhưng làm nó chậm khoảng <b>37 lần</b>.',
      '<code>/dev</code> và <code>/sys</code> biến phần cứng thành file. Bật một chiếc LED chính là <code>open</code> + <code>write</code> + <code>close</code> — không có gì khác so với <code>copy.c</code> bạn vừa viết.'
    ]},

    { t: 'cal', kind: 'info', title: 'Bài tiếp theo', x:
      '<p><b>Bài 20 — Tiến trình: fork, exec, wait.</b> Bài này bạn mới chỉ điều khiển được ' +
      '<i>một</i> luồng thực thi. Bài sau bạn sẽ tạo ra tiến trình mới bằng <code>fork()</code> — ' +
      'hàm kỳ lạ nhất trong toàn bộ POSIX vì nó <b>trả về hai lần</b>, một lần trong tiến trình ' +
      'cha và một lần trong tiến trình con.</p>' +
      '<p>Bạn sẽ tự tay dựng lại thứ mà shell làm mỗi lần bạn gõ một lệnh, đo xem ' +
      '<code>fork</code> + <code>exec</code> tốn bao nhiêu mili-giây, nhìn thấy một tiến trình ' +
      '<b>zombie</b> thật trong <code>ps</code>, và cuối bài là biến chương trình của mình thành ' +
      'một <b>daemon</b> tách khỏi terminal — đúng dạng tiến trình nền mà thiết bị nhúng chạy ' +
      'suốt ngày đêm. Kỹ thuật <code>dup2</code> đã hé lộ trong bài này sẽ được dùng ở đó.</p>' }
    ],

  quiz: [
    {
      q: 'Vì sao chương trình C của bạn không thể tự ghi thẳng vào ổ đĩa mà bắt buộc phải gọi <code>write</code>?',
      opts: [
        'Vì trình biên dịch không sinh được lệnh máy truy cập đĩa',
        'Vì CPU chạy mã của bạn ở user mode và từ chối thực thi mọi lệnh đặc quyền; chỉ nhân — chạy ở kernel mode — mới chạm được phần cứng',
        'Vì ổ đĩa đã bị hệ thống file khoá lại',
        'Vì ngôn ngữ C không có kiểu dữ liệu biểu diễn địa chỉ phần cứng'
      ],
      a: 1,
      why: 'Đây là ràng buộc do <b>CPU</b> cưỡng chế, không phải do trình biên dịch hay ngôn ngữ. Ở user mode, lệnh đặc quyền bị chặn ngay tại phần cứng và tiến trình bị bắn ra bằng tín hiệu. Nếu không có ranh giới này, một lỗi trong bất kỳ chương trình nào cũng có thể phá huỷ toàn bộ hệ thống — trên thiết bị nhúng là ghi đè lên vùng flash chứa firmware. Syscall là cửa duy nhất, và nó hẹp có chủ đích: mọi yêu cầu phải khai báo bằng một số hiệu để nhân kiểm tra được.'
    },
    {
      q: 'Bạn viết <code>open("a.txt", O_RDONLY)</code> nhưng <code>strace</code> lại hiện <code>openat(AT_FDCWD, "a.txt", O_RDONLY) = 3</code>. Giải thích nào đúng?',
      opts: [
        '<code>strace</code> hiển thị sai tên syscall',
        'glibc chuyển lời gọi <code>open</code> thành syscall <code>openat</code> với <code>AT_FDCWD</code> nghĩa là "tương đối với thư mục hiện tại" — ARM64 thậm chí không còn syscall <code>open</code> nữa',
        'Chương trình đã bị tối ưu hoá và gọi nhầm hàm',
        '<code>openat</code> chỉ xuất hiện khi mở file bằng đường dẫn tương đối'
      ],
      a: 1,
      why: 'Bộ syscall <code>*at</code> ra đời để bịt một lớp lỗi bảo mật: giữa lúc kiểm tra đường dẫn và lúc mở nó, kẻ tấn công có thể thay một thư mục trên đường dẫn bằng liên kết mềm. Truyền thẳng fd của thư mục gốc thì không có khe hở đó. Các kiến trúc mới như ARM64 bỏ luôn <code>open</code> khỏi bảng syscall — trên ARM64 chỉ có <code>openat</code> số <b>56</b>. Đáp án D sai: <code>AT_FDCWD</code> vẫn được truyền ngay cả với đường dẫn tuyệt đối, nhân chỉ đơn giản bỏ qua nó.'
    },
    {
      q: 'Đoạn mã sau sai ở đâu?<br><code>int n = read(fd, buf, 1000);<br>if (errno != 0) { perror("read"); return 1; }</code>',
      opts: [
        'Phải dùng <code>ssize_t</code> thay cho <code>int</code> — đó là lỗi duy nhất',
        'Kiểm tra <code>errno</code> thay vì kiểm tra giá trị trả về: <code>read</code> có thể thành công trong khi <code>errno</code> vẫn mang giá trị sót lại từ một lời gọi lỗi trước đó',
        'Thiếu <code>errno = 0;</code> trước khi gọi <code>read</code> — thêm dòng đó là đủ',
        'Không có lỗi gì, đoạn mã này đúng'
      ],
      a: 1,
      why: 'Bạn đã thấy tận mắt trong <code>error.c</code>: dòng 4 mở <code>/etc/hostname</code> <b>thành công</b>, trả về fd <b>3</b>, nhưng <code>errno</code> vẫn là <b>21</b> sót lại từ dòng 3. Chuẩn C chỉ bảo đảm <code>errno</code> được <i>đặt</i> khi lỗi, không bảo đảm được <i>dọn</i> khi thành công. Cách đúng là <code>if (n &lt; 0) { perror("read"); ... }</code>. Đáp án A đúng một phần — <code>int</code> thật sự sẽ tràn với file lớn — nhưng đó không phải lỗi nghiêm trọng nhất ở đây. Đáp án C chỉ vá tạm: nó không sửa được sai lầm gốc là dùng <code>errno</code> làm cờ báo lỗi.'
    },
    {
      q: 'Chương trình ghi log của bạn dùng <code>fprintf</code> và chạy trên thiết bị nhúng. Thiết bị mất điện đột ngột, và bạn phát hiện file log mất khoảng 4 KB cuối — đúng đoạn ghi lại nguyên nhân sự cố. Nguyên nhân khả dĩ nhất?',
      opts: [
        'Hệ thống file ext4 bị hỏng khi mất điện',
        'Dữ liệu vẫn nằm trong đệm 4096 byte của <code>stdio</code> trong user space, chưa kịp đi qua <code>write</code> để tới nhân',
        'Flash bị lỗi ở những block cuối',
        '<code>fprintf</code> không hỗ trợ ghi thêm vào cuối file'
      ],
      a: 1,
      why: 'Con số <b>4 KB</b> chính là đầu mối: đó đúng bằng kích thước đệm mặc định của <code>stdio</code> mà bạn đã đo được qua <code>strace</code> (559 lần <code>write</code> cho 2 288 890 byte). Khi <code>stdout</code> hoặc <code>FILE *</code> trỏ vào file, glibc chuyển sang đệm toàn phần và chỉ gọi <code>write</code> khi đệm đầy — mất điện thì toàn bộ nội dung đệm biến mất cùng với RAM. Ba cách chữa, theo mức độ an toàn tăng dần: <code>setvbuf(f, NULL, _IOLBF, 0)</code> để xả theo dòng; <code>fflush()</code> sau mỗi bản ghi quan trọng; hoặc dùng thẳng <code>write</code> kèm <code>O_SYNC</code> khi thật sự không được phép mất dữ liệu.'
    },
    {
      q: 'Vòng lặp nào dưới đây chép file đúng trong mọi trường hợp?',
      opts: [
        '<code>while ((n = read(fd, b, 4096)) != 0) write(fd2, b, n);</code>',
        '<code>while ((n = read(fd, b, 4096)) > 0) { write_all(fd2, b, n); }</code> với <code>write_all</code> lặp cho tới khi ghi hết, và kiểm tra <code>n &lt; 0</code> sau vòng lặp',
        '<code>n = read(fd, b, 4096); write(fd2, b, 4096);</code>',
        '<code>while (read(fd, b, 4096) > 0) write(fd2, b, 4096);</code>'
      ],
      a: 1,
      why: 'Ba lỗi cần tránh cùng lúc. (A) dùng <code>!= 0</code> nên khi <code>read</code> trả về <code>-1</code> vòng lặp chạy mãi, đồng thời truyền <code>n = -1</code> vào <code>write</code>. (C) và (D) luôn ghi đủ 4096 byte bất kể đọc được bao nhiêu — file kết quả sẽ dính rác ở cuối, và với file nhỏ hơn 4096 byte thì rác đó là dữ liệu chưa khởi tạo trên ngăn xếp. (D) còn bỏ luôn giá trị trả về của <code>read</code>. Chỉ (B) xử lý đủ ba tình huống: <code>n &gt; 0</code> là dữ liệu thật, <code>n == 0</code> là hết file, <code>n &lt; 0</code> là lỗi — cộng thêm việc lặp quanh <code>write</code> vì <code>write</code> được phép ghi thiếu.'
    },
    {
      q: 'Một daemon trên thiết bị nhúng đang chạy nhưng "không phản hồi". Bạn có shell trên thiết bị, biết PID là 812, nhưng không có mã nguồn và không có debugger. Bước chẩn đoán đầu tiên hợp lý nhất là gì?',
      opts: [
        'Khởi động lại daemon và hy vọng lỗi không tái diễn',
        '<code>sudo strace -p 812</code> để xem nó đang kẹt ở syscall nào, kết hợp <code>ls -l /proc/812/fd</code> để biết nó đang mở những gì',
        'Chạy <code>strace</code> trên toàn hệ thống để bắt mọi tiến trình',
        'Dùng <code>ltrace -p 812</code> vì lời gọi thư viện cho nhiều thông tin hơn syscall'
      ],
      a: 1,
      why: 'Đây là quy trình chuẩn khi không có gì ngoài một cái shell. <code>strace -p</code> gắn vào tiến trình đang sống và cho biết ngay nó <i>đang treo ở đâu</i> — đứng im tại <code>read</code> trên một socket, quay vòng vô hạn quanh <code>EAGAIN</code>, hay bị chặn tại một <code>ioctl</code> trên thiết bị không phản hồi. Đọc thêm <code>/proc/812/fd</code> cho biết fd đó thật sự trỏ tới đâu. Đáp án A xoá mất bằng chứng. Đáp án C không khả thi và làm cả hệ thống chậm 40 lần — nhớ rằng <code>strace</code> có giá. Đáp án D yếu hơn vì <code>ltrace</code> chỉ thấy được lời gọi hàm thư viện <b>động</b>, mà daemon nhúng thường liên kết tĩnh; hơn nữa "không phản hồi" gần như luôn nghĩa là đang kẹt trong một syscall chứ không phải trong mã user space.'
    }
  ]
});

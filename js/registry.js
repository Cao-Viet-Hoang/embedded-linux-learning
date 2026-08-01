/* ============================================================
   REGISTRY — cấu trúc khoá học và kho nội dung bài.

   • COURSE  : khung chương trình (14 chặng / 70 bài). Luôn hiển thị
               đầy đủ trong sidebar, kể cả bài chưa viết nội dung.
   • LESSONS : nội dung thật, do các file trong lessons/ tự đăng ký
               qua Lesson.register(). Bài nào chưa có ở đây thì
               sidebar hiện mờ và bấm vào sẽ báo "chưa viết".
   ============================================================ */
(function (global) {
  'use strict';

  var COURSE = {
    title: 'Embedded Linux — Từ số 0 đến đi làm',
    modules: [
      {
        id: 'm0', num: '00', name: 'Nhập môn',
        desc: 'Hiểu mình đang học cái gì trước khi gõ dòng lệnh đầu tiên',
        lessons: [
          { id: 'bai-01', n: 1, title: 'Embedded Linux là gì và tại sao nó ở khắp mọi nơi' },
          { id: 'bai-02', n: 2, title: 'Toàn cảnh luồng khởi động' },
          { id: 'bai-03', n: 3, title: 'Môi trường học: WSL2 và QEMU' }
        ]
      },
      {
        id: 'm1', num: '01', name: 'Linux căn bản',
        desc: 'Dùng terminal thành thạo, không cần tra cứu cho thao tác hằng ngày',
        lessons: [
          { id: 'bai-04', n: 4,  title: 'Shell và cấu trúc một câu lệnh' },
          { id: 'bai-05', n: 5,  title: 'Hệ thống file Linux (FHS)' },
          { id: 'bai-06', n: 6,  title: 'Điều hướng, thao tác và xem file' },
          { id: 'bai-07', n: 7,  title: 'Soạn thảo trong terminal: nano và vim' },
          { id: 'bai-08', n: 8,  title: 'Người dùng, nhóm, quyền và sudo' },
          { id: 'bai-09', n: 9,  title: 'Tiến trình, job và tín hiệu' },
          { id: 'bai-10', n: 10, title: 'Pipe, redirect và triết lý Unix' },
          { id: 'bai-11', n: 11, title: 'Tìm kiếm và xử lý văn bản' },
          { id: 'bai-12', n: 12, title: 'Quản lý gói' },
          { id: 'bai-13', n: 13, title: 'Bash script' }
        ]
      },
      {
        id: 'm2', num: '02', name: 'C và công cụ build',
        desc: 'Chuyện gì xảy ra giữa file .c và file thực thi',
        lessons: [
          { id: 'bai-14', n: 14, title: 'C cho embedded — ôn tập trọng tâm' },
          { id: 'bai-15', n: 15, title: 'Bốn giai đoạn biên dịch' },
          { id: 'bai-16', n: 16, title: 'Make và Makefile' },
          { id: 'bai-17', n: 17, title: 'Thư viện tĩnh và động' },
          { id: 'bai-18', n: 18, title: 'Giải phẫu file ELF' }
        ]
      },
      {
        id: 'm3', num: '03', name: 'Lập trình hệ thống Linux',
        desc: 'Viết ứng dụng userspace nói chuyện được với hệ điều hành',
        lessons: [
          { id: 'bai-19', n: 19, title: 'Syscall và File I/O' },
          { id: 'bai-20', n: 20, title: 'Tiến trình: fork, exec, wait' },
          { id: 'bai-21', n: 21, title: 'Tín hiệu và tắt máy êm' },
          { id: 'bai-22', n: 22, title: 'Luồng và đồng bộ với pthread' },
          { id: 'bai-23', n: 23, title: 'Giao tiếp liên tiến trình (IPC)' },
          { id: 'bai-24', n: 24, title: 'Socket và I/O đa kênh' }
        ]
      },
      {
        id: 'm4', num: '04', name: 'Cross-compilation',
        desc: 'Build phần mềm cho kiến trúc khác với máy đang ngồi',
        lessons: [
          { id: 'bai-25', n: 25, title: 'Vì sao phải cross-compile' },
          { id: 'bai-26', n: 26, title: 'Giải phẫu một toolchain' },
          { id: 'bai-27', n: 27, title: 'Cross-compile chương trình đầu tiên cho ARM64' },
          { id: 'bai-28', n: 28, title: 'Tự build toolchain với crosstool-NG' }
        ]
      },
      {
        id: 'm5', num: '05', name: 'QEMU và luồng khởi động',
        desc: 'Biến QEMU thành board phát triển của bạn',
        lessons: [
          { id: 'bai-29', n: 29, title: 'QEMU: nguyên lý hoạt động' },
          { id: 'bai-30', n: 30, title: 'Machine virt của ARM64' },
          { id: 'bai-31', n: 31, title: 'Bộ tham số dòng lệnh QEMU' },
          { id: 'bai-32', n: 32, title: 'Boot kernel đầu tiên trong QEMU' }
        ]
      },
      {
        id: 'm6', num: '06', name: 'Bootloader U-Boot',
        desc: 'Làm chủ giai đoạn trước khi kernel chạy',
        lessons: [
          { id: 'bai-33', n: 33, title: 'Nhiệm vụ của bootloader' },
          { id: 'bai-34', n: 34, title: 'Build U-Boot cho QEMU' },
          { id: 'bai-35', n: 35, title: 'Dòng lệnh U-Boot' },
          { id: 'bai-36', n: 36, title: 'Nạp kernel qua mạng và FIT image' }
        ]
      },
      {
        id: 'm7', num: '07', name: 'Linux Kernel',
        desc: 'Build, cấu hình và hiểu kernel như sản phẩm bạn kiểm soát',
        lessons: [
          { id: 'bai-37', n: 37, title: 'Kiến trúc kernel' },
          { id: 'bai-38', n: 38, title: 'Source kernel và cách định hướng' },
          { id: 'bai-39', n: 39, title: 'Kconfig và menuconfig' },
          { id: 'bai-40', n: 40, title: 'Build kernel ARM64 và boot' },
          { id: 'bai-41', n: 41, title: 'Kernel cmdline, log và tối ưu kích thước' }
        ]
      },
      {
        id: 'm8', num: '08', name: 'Device Tree',
        desc: 'Mô tả phần cứng cho kernel — kỹ năng phân biệt người làm nghề',
        lessons: [
          { id: 'bai-42', n: 42, title: 'Vì sao Device Tree ra đời' },
          { id: 'bai-43', n: 43, title: 'Cú pháp DTS' },
          { id: 'bai-44', n: 44, title: 'Binding và cơ chế khớp driver' },
          { id: 'bai-45', n: 45, title: 'Thực hành Device Tree với QEMU virt' }
        ]
      },
      {
        id: 'm9', num: '09', name: 'Root filesystem',
        desc: 'Tự tay dựng hệ thống file gốc từ con số không',
        lessons: [
          { id: 'bai-46', n: 46, title: 'Rootfs gồm những gì' },
          { id: 'bai-47', n: 47, title: 'BusyBox — dựng rootfs bằng tay' },
          { id: 'bai-48', n: 48, title: 'initramfs và các loại rootfs' },
          { id: 'bai-49', n: 49, title: 'init: từ /init đến systemd' }
        ]
      },
      {
        id: 'm10', num: '10', name: 'Kernel module và Driver',
        desc: 'Chặng nặng nhất, và cũng là chặng quyết định giá trị nghề nghiệp',
        lessons: [
          { id: 'bai-50', n: 50, title: 'Module đầu tiên' },
          { id: 'bai-51', n: 51, title: 'Luật chơi trong kernel space' },
          { id: 'bai-52', n: 52, title: 'Character device driver' },
          { id: 'bai-53', n: 53, title: 'Giao tiếp user ↔ kernel' },
          { id: 'bai-54', n: 54, title: 'Platform driver và Device Tree' },
          { id: 'bai-55', n: 55, title: 'Ngắt và xử lý trễ' },
          { id: 'bai-56', n: 56, title: 'Truy cập phần cứng: MMIO và đồng bộ' },
          { id: 'bai-57', n: 57, title: 'Đọc datasheet và GPIO hiện đại' },
          { id: 'bai-58', n: 58, title: 'Driver cho bus I2C và SPI' }
        ]
      },
      {
        id: 'm11', num: '11', name: 'Build system',
        desc: 'Từ làm thủ công sang quy trình tái lập được',
        lessons: [
          { id: 'bai-59', n: 59, title: 'Vì sao cần build system' },
          { id: 'bai-60', n: 60, title: 'Buildroot từ đầu đến cuối' },
          { id: 'bai-61', n: 61, title: 'Buildroot nâng cao' },
          { id: 'bai-62', n: 62, title: 'Yocto — khái niệm và so sánh' }
        ]
      },
      {
        id: 'm12', num: '12', name: 'Debug, đo đạc, tối ưu',
        desc: 'Kỹ năng thực chiến — thứ được hỏi nhiều nhất khi phỏng vấn',
        lessons: [
          { id: 'bai-63', n: 63, title: 'Debug kernel bằng GDB' },
          { id: 'bai-64', n: 64, title: 'Đọc kernel panic và oops' },
          { id: 'bai-65', n: 65, title: 'Ftrace và các công cụ theo vết' },
          { id: 'bai-66', n: 66, title: 'Đo và tối ưu thời gian boot' }
        ]
      },
      {
        id: 'm13', num: '13', name: 'Thành phẩm và nghề nghiệp',
        desc: 'Ghép tất cả lại thành sản phẩm mang đi phỏng vấn được',
        lessons: [
          { id: 'bai-67', n: 67, title: 'Dự án tổng hợp' },
          { id: 'bai-68', n: 68, title: 'Bảo mật và secure boot' },
          { id: 'bai-69', n: 69, title: 'Cập nhật OTA' },
          { id: 'bai-70', n: 70, title: 'Chuyển sang hardware thật và phỏng vấn' }
        ]
      }
    ]
  };

  /* ---------- Kho nội dung ---------- */
  var LESSONS = {};

  var Lesson = {
    register: function (data) {
      if (!data || !data.id) {
        console.error('[registry] Bài học thiếu id:', data);
        return;
      }
      if (LESSONS[data.id]) {
        console.warn('[registry] Bài "' + data.id + '" bị đăng ký trùng, bản sau ghi đè bản trước.');
      }
      LESSONS[data.id] = data;
    },
    get: function (id) { return LESSONS[id] || null; },
    has: function (id) { return !!LESSONS[id]; },
    all: function () { return LESSONS; }
  };

  /* ---------- Tiện ích tra cứu ---------- */
  var Course = {
    data: COURSE,

    /* Danh sách phẳng theo đúng thứ tự học, kèm tham chiếu chặng */
    flat: (function () {
      var out = [];
      COURSE.modules.forEach(function (m) {
        m.lessons.forEach(function (l) {
          out.push({
            id: l.id, n: l.n, title: l.title,
            moduleId: m.id, moduleName: m.name, moduleNum: m.num
          });
        });
      });
      return out;
    })(),

    find: function (id) {
      for (var i = 0; i < this.flat.length; i++) {
        if (this.flat[i].id === id) { return this.flat[i]; }
      }
      return null;
    },

    indexOf: function (id) {
      for (var i = 0; i < this.flat.length; i++) {
        if (this.flat[i].id === id) { return i; }
      }
      return -1;
    },

    prev: function (id) { var i = this.indexOf(id); return i > 0 ? this.flat[i - 1] : null; },
    next: function (id) { var i = this.indexOf(id); return (i >= 0 && i < this.flat.length - 1) ? this.flat[i + 1] : null; },

    total: function () { return this.flat.length; },

    /* Số bài đã viết nội dung */
    readyCount: function () {
      return this.flat.filter(function (l) { return Lesson.has(l.id); }).length;
    },

    moduleOf: function (id) {
      for (var i = 0; i < COURSE.modules.length; i++) {
        var m = COURSE.modules[i];
        for (var j = 0; j < m.lessons.length; j++) {
          if (m.lessons[j].id === id) { return m; }
        }
      }
      return null;
    }
  };

  global.COURSE = COURSE;
  global.Lesson = Lesson;
  global.Course = Course;
})(window);

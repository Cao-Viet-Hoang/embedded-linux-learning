# Embedded Linux — Từ số 0 đến đi làm

Ứng dụng web học Embedded Linux bằng tiếng Việt, dành cho người **mới hoàn toàn** với Linux.
Mỗi bài giải thích chi tiết từng câu lệnh và **lý do** dùng câu lệnh đó, kèm phần thực hành
chạy trực tiếp trên WSL2 + QEMU.

## Mở ứng dụng

Nhấp đúp vào `index.html`. Không cần cài đặt, không cần máy chủ web, không cần Internet.

## Nội dung

- [`LO-TRINH.md`](LO-TRINH.md) — lộ trình đầy đủ **70 bài / 14 chặng**, mốc năng lực M1–M11,
  thời lượng dự kiến 8–11 tháng.
- Bài đã viết: **40 / 70** — trọn vẹn **Chặng 0 · Nhập môn**, **Chặng 1 · Linux căn bản**,
  **Chặng 2 · C và công cụ build**, **Chặng 3 · Lập trình hệ thống Linux**,
  **Chặng 4 · Biên dịch chéo**, **Chặng 5 · QEMU và luồng khởi động**,
  **Chặng 6 · Bootloader U-Boot**, và bốn bài đầu của **Chặng 7 · Linux Kernel**:
  1. Embedded Linux là gì và tại sao nó ở khắp mọi nơi
  2. Toàn cảnh luồng khởi động
  3. Môi trường học: WSL2 và QEMU
  4. Shell và cấu trúc một câu lệnh
  5. Hệ thống file Linux (FHS)
  6. Điều hướng, thao tác và xem file
  7. Soạn thảo trong terminal: nano và vim
  8. Người dùng, nhóm, quyền và sudo
  9. Tiến trình, job và tín hiệu
  10. Pipe, redirect và triết lý Unix
  11. Tìm kiếm và xử lý văn bản
  12. Quản lý gói
  13. Bash script
  14. C cho embedded — ôn tập trọng tâm
  15. Bốn giai đoạn biên dịch
  16. Make và Makefile
  17. Thư viện tĩnh và động
  18. Giải phẫu file ELF
  19. Syscall và File I/O
  20. Tiến trình: fork, exec, wait
  21. Tín hiệu và tắt máy êm
  22. Luồng và đồng bộ với pthread
  23. Giao tiếp liên tiến trình (IPC)
  24. Socket và I/O đa kênh
  25. Vì sao phải cross-compile
  26. Giải phẫu một toolchain
  27. Cross-compile chương trình đầu tiên cho ARM64
  28. Tự build toolchain với crosstool-NG
  29. QEMU: nguyên lý hoạt động
  30. Machine `virt` của ARM64
  31. Bộ tham số dòng lệnh QEMU
  32. Boot kernel đầu tiên trong QEMU
  33. Nhiệm vụ của bootloader
  34. Build U-Boot cho QEMU
  35. Dòng lệnh U-Boot
  36. Nạp kernel qua mạng và FIT image
  37. Kiến trúc kernel
  38. Source kernel và cách định hướng
  39. Kconfig và menuconfig
  40. Build kernel ARM64 và boot
- Bộ bài tập đã viết: **25 / 70** — `bt-01` … `bt-25` đi kèm Bài 1 → 25. Xem ở mục **Bài tập** trên sidebar.
- [`CLAUDE.md`](CLAUDE.md) — quy ước làm việc và chuẩn thiết kế bài học (tiếng Anh, dành cho phiên làm việc sau). Mục §0 chỉ ra phần còn lại nằm ở đâu: [`docs/`](docs/) và [`.claude/skills/`](.claude/skills/).

## Tính năng

| Tính năng | Mô tả |
|---|---|
| Theo dõi tiến độ | Đánh dấu hoàn thành từng bài, vòng tròn tiến độ trên thanh trên cùng |
| Huy hiệu môi trường | Mỗi khối lệnh ghi rõ chạy ở **PowerShell**, **WSL**, **QEMU** hay **U-Boot** |
| Sao chép lệnh | Một nút cho mỗi khối lệnh |
| Mổ xẻ câu lệnh | Bảng giải thích từng tham số của lệnh |
| Tự kiểm tra | Quiz cuối bài, có giải thích đáp án |
| Bài tập | Mỗi bài có một bộ bài tập riêng ở `#/bt-NN`: trắc nghiệm chấm tự động, câu tự luận tự chấm theo tiêu chí, và bảng tra "sai câu nào thì đọc lại mục nào" |
| Giao diện sáng / tối | Tự nhớ lựa chọn |
| Tìm kiếm | Toàn văn, không phân biệt dấu — gõ `tien trinh` vẫn ra `tiến trình`. Phím tắt <kbd>/</kbd> |
| Đồng bộ nhiều máy | Tiến độ, đáp án quiz và bài tập nằm trên Firebase Firestore, mở máy nào cũng có |

### Nơi dữ liệu được lưu

Từ 10/08/2026, **toàn bộ tiến độ học nằm trên máy chủ**, không còn bản sao trong trình
duyệt. Chỉ những thứ thuộc về riêng máy bạn mới ở lại `localStorage`: giao diện sáng/tối,
trạng thái thu gọn sidebar, chặng đang mở, và tên người dùng.

Bấm nút đồng bộ ở thanh trên cùng và nhập một tên (3–40 ký tự, chỉ chữ không dấu, số,
`-` và `_`). Đây **không phải tài khoản**: không mật khẩu, không đăng nhập. Tên người dùng
chỉ là khoá tra dữ liệu, và chỉ những tên nằm trong danh sách trắng ở
[`firebase/firestore.rules`](firebase/firestore.rules) mới dùng được.

Mỗi thao tác hiện lên ngay lập tức rồi mới ghi lên máy chủ. Nếu ghi hỏng — mất mạng, sai
quyền, quá 6 giây — thao tác đó **được hoàn tác** và có thông báo giải thích, để bạn không
bao giờ học tiếp trên một trang đã ngừng ghi nhận. Riêng ô tự luận thì không bao giờ bị xoá
chữ: nó chỉ đổi nhãn thành *Chưa lưu được*, gõ tiếp là thử lại.

Khi chưa nối được máy chủ: bài học, tìm kiếm và giao diện vẫn đầy đủ, nhưng các nút đánh
dấu hoàn thành, quiz và bài tập bị khoá, còn mọi con số tiến độ hiện `—` thay vì một số có
thể sai. SDK Firebase chỉ được tải sau khi trang đã vẽ xong, nên lúc offline trang không
phải chờ nó.

## Cấu trúc

```
index.html            khung ứng dụng, khai báo thứ tự nạp script
css/
  tokens.css          biến thiết kế: màu, font, khoảng cách  (nguồn duy nhất)
  base.css            reset và typography
  layout.css          thanh trên cùng, sidebar, mục lục, breakpoint
  components.css      toàn bộ khối nội dung bài học
  exercise.css        riêng cho trang bài tập
js/
  icons.js            bộ icon SVG inline
  toast.js            thông báo góc màn hình khi ghi hỏng và giao diện vừa hoàn tác
  store.js            tuỳ chọn máy trong localStorage, tiến độ trong RAM + ghi lên máy chủ
  registry.js         khung 70 bài + kho nội dung đã đăng ký
  render.js           dựng HTML từ dữ liệu block  (bộ máy đồng nhất style)
  search.js           chỉ mục tìm kiếm trong bộ nhớ
  exercises.js        kho bộ bài tập + tiến độ riêng của bài tập
  render-ex.js        dựng HTML cho trang bài tập  (7 kiểu chấm)
  cloud.js            Firestore: nghe thay đổi, ghi từng trường, hoàn tác khi hỏng
  account.js          hộp thoại nhập tên + chấm trạng thái đồng bộ
  app.js              định tuyến, sidebar, mục lục, quiz, sao chép
lessons/
  bai-01.js           nội dung Bài 1
  bai-02.js           nội dung Bài 2
  bai-03.js           nội dung Bài 3
exercises/
  bt-01.js            bộ bài tập của Bài 1
firebase/
  firestore.rules     danh sách trắng tên người dùng, nạp lên bằng tay
LO-TRINH.md           lộ trình 70 bài
CLAUDE.md             quy ước cốt lõi cho phiên làm việc sau
docs/                 tài liệu tra cứu: môi trường đã đo, cách chạy lệnh, ghi chú khoá học
.claude/skills/       hướng dẫn chi tiết: viết bài, viết bài tập, lưu tiến độ
```

## Thêm một bài mới

Nội dung bài là **dữ liệu**, không phải HTML. Mọi bài đi qua cùng một bộ hàm dựng
trong `render.js`, nên style không thể lệch giữa các bài.

1. Tạo `lessons/bai-XX.js`:

```js
Lesson.register({
  id: 'bai-02',
  title: 'Toàn cảnh luồng khởi động',
  minutes: 30,
  practice: 'Thực hành 20 phút',
  level: 'Người mới bắt đầu',
  intro: 'Đoạn mở đầu…',
  goals: ['Mục tiêu 1', 'Mục tiêu 2'],
  blocks: [
    { t: 'h2', x: 'Tiêu đề mục' },
    { t: 'p',  x: 'Một đoạn văn.' },
    { t: 'code', where: 'wsl', code: 'uname -r' },
    { t: 'cal', kind: 'why', x: '<p>Vì sao lại dùng lệnh này…</p>' }
  ],
  quiz: [
    { q: 'Câu hỏi?', opts: ['A', 'B'], a: 0, why: 'Giải thích đáp án.' }
  ]
});
```

2. Thêm một dòng vào `index.html`, **trước** `js/app.js`:

```html
<script src="lessons/bai-02.js"></script>
```

`id` phải trùng với id đã khai trong `js/registry.js`. Bài chưa viết vẫn hiện trong
sidebar nhưng ở trạng thái mờ.

### Các loại block

| `t` | Dùng để | Trường chính |
|---|---|---|
| `h2` `h3` `h4` | Tiêu đề (`h2`/`h3` tự vào mục lục) | `x` |
| `p` | Đoạn văn | `x`, `muted` |
| `list` | Danh sách | `items`, `ordered` |
| `code` | Khối lệnh kiểu terminal | `where`, `code`, `lang`, `name`, `notes`, `nocopy` |
| `cmdx` | Mổ xẻ câu lệnh theo tham số | `cmd`, `rows: [[token, mô tả, ghi chú]]` |
| `cal` | Hộp nhấn mạnh | `kind`: `info` `tip` `warn` `danger` `why` |
| `table` | Bảng | `head`, `rows` |
| `steps` | Các bước thực hành đánh số | `items: [{ title, blocks }]` |
| `fig` | Sơ đồ SVG | `svg`, `cap` |
| `terms` | Bảng thuật ngữ | `items: [[thuật ngữ, viết tắt, mô tả]]` |
| `recap` | Tóm tắt cuối bài | `items` |

Giá trị `where` của khối `code`: `ps` (PowerShell), `psadm` (PowerShell Administrator),
`wsl`, `qemu`, `uboot`, `file` (nội dung file), `out` (kết quả in ra).

> Trong `x`, `items`, `rows`… được phép dùng HTML (`<b>`, `<code>`, `<i>`).
> Riêng `code` và các token của `cmdx` được escape tự động — cứ viết lệnh nguyên văn.

## Môi trường thực hành

- Windows 11 + WSL2 + Ubuntu
- QEMU (`qemu-system-arm`, `qemu-system-misc`)
- Toolchain: `gcc-aarch64-linux-gnu`, `gdb-multiarch`, `device-tree-compiler`, `u-boot-tools`

Chi tiết cấu hình và danh sách gói nằm trong phần *Chuẩn bị môi trường* của
[`LO-TRINH.md`](LO-TRINH.md).

# Embedded Linux — Từ số 0 đến đi làm

Ứng dụng web học Embedded Linux bằng tiếng Việt, dành cho người **mới hoàn toàn** với Linux.
Mỗi bài giải thích chi tiết từng câu lệnh và **lý do** dùng câu lệnh đó, kèm phần thực hành
chạy trực tiếp trên WSL2 + QEMU.

## Mở ứng dụng

Nhấp đúp vào `index.html`. Không cần cài đặt, không cần máy chủ web, không cần Internet.

## Nội dung

- [`LO-TRINH.md`](LO-TRINH.md) — lộ trình đầy đủ **70 bài / 14 chặng**, mốc năng lực M1–M11,
  thời lượng dự kiến 8–11 tháng.
- Bài đã viết: **24 / 70** — trọn vẹn **Chặng 0 · Nhập môn**, **Chặng 1 · Linux căn bản**,
  **Chặng 2 · C và công cụ build** và **Chặng 3 · Lập trình hệ thống Linux**:
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
- [`CLAUDE.md`](CLAUDE.md) — quy ước làm việc và chuẩn thiết kế bài học (tiếng Anh, dành cho phiên làm việc sau).

## Tính năng

| Tính năng | Mô tả |
|---|---|
| Theo dõi tiến độ | Đánh dấu hoàn thành từng bài, vòng tròn tiến độ trên thanh trên cùng |
| Huy hiệu môi trường | Mỗi khối lệnh ghi rõ chạy ở **PowerShell**, **WSL**, **QEMU** hay **U-Boot** |
| Sao chép lệnh | Một nút cho mỗi khối lệnh |
| Mổ xẻ câu lệnh | Bảng giải thích từng tham số của lệnh |
| Tự kiểm tra | Quiz cuối bài, có giải thích đáp án |
| Giao diện sáng / tối | Tự nhớ lựa chọn |
| Tìm kiếm | Toàn văn, không phân biệt dấu — gõ `tien trinh` vẫn ra `tiến trình`. Phím tắt <kbd>/</kbd> |

Tiến độ, đáp án quiz và chủ đề giao diện lưu trong `localStorage` của trình duyệt.

## Cấu trúc

```
index.html            khung ứng dụng, khai báo thứ tự nạp script
css/
  tokens.css          biến thiết kế: màu, font, khoảng cách  (nguồn duy nhất)
  base.css            reset và typography
  layout.css          thanh trên cùng, sidebar, mục lục, breakpoint
  components.css      toàn bộ khối nội dung bài học
js/
  icons.js            bộ icon SVG inline
  store.js            localStorage: chủ đề, tiến độ, quiz
  registry.js         khung 70 bài + kho nội dung đã đăng ký
  render.js           dựng HTML từ dữ liệu block  (bộ máy đồng nhất style)
  search.js           chỉ mục tìm kiếm trong bộ nhớ
  app.js              định tuyến, sidebar, mục lục, quiz, sao chép
lessons/
  bai-01.js           nội dung Bài 1
  bai-02.js           nội dung Bài 2
  bai-03.js           nội dung Bài 3
LO-TRINH.md           lộ trình 70 bài
CLAUDE.md             quy ước viết bài cho phiên làm việc sau
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

# Hướng dẫn Cài đặt & Cấu hình Hệ thống Luyện Thuật Toán (LeetCode) cho Hidev.dev

Tài liệu này hướng dẫn chi tiết cách thiết lập lại hệ thống Backend (OJ Engine & Dataset) trên VPS phụ và tích hợp Giao diện (Frontend) trên VPS chính Hidev.dev.

---

## 1. Mô hình Kiến trúc
* **VPS chính (Hidev.dev)**: Chứa Frontend Next.js chịu trách nhiệm hiển thị danh sách bài tập, trình soạn thảo Code Playground và giao tiếp với Gemini AI để lấy review nhận xét code.
* **VPS phụ (LeetCode Backend)**: Chứa API phục vụ danh sách đề bài, testcase mẫu từ dataset và thực thi code của người dùng trong môi trường cô lập bằng User hệ thống có quyền hạn thấp (`sandbox`).

---

## 2. Hướng dẫn Setup Backend (VPS phụ - `103.77.246.184`)

### Bước 2.1: Chuẩn bị Môi trường hệ thống
SSH vào VPS phụ bằng quyền `root` và chạy các lệnh cài đặt cơ bản:
```bash
# Cập nhật danh sách gói & cài đặt curl
apt update && apt install curl git -y

# Thêm repository NodeSource cho Node.js 22 & cài đặt Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Cài đặt trình biên dịch/runtime cho các ngôn ngữ hỗ trợ
apt install python3 g++ golang-go openjdk-17-jdk -y

# Cài đặt PM2 toàn cục để quản lý tiến trình chạy nền
npm install -g pm2
```

**Ngôn ngữ được hỗ trợ và phương thức thực thi:**

| Ngôn ngữ | Phương thức | Ghi chú |
|-----------|-------------|---------|
| JavaScript | Local sandbox (Node.js) | Chạy trực tiếp trên VPS |
| Python 3 | Local sandbox (python3) | Chạy trực tiếp trên VPS |
| C++ | Gemini AI simulation | Gemini mô phỏng biên dịch & chạy |
| C | Gemini AI simulation | Gemini mô phỏng biên dịch & chạy |
| Java | Gemini AI simulation | Gemini mô phỏng biên dịch & chạy |
| Go | Gemini AI simulation | Gemini mô phỏng biên dịch & chạy |

### Bước 2.2: Tạo User Sandbox để chạy code an toàn
Để tránh việc người dùng nộp các đoạn mã nguy hiểm phá hoại hệ thống (ví dụ: `rm -rf /`), chúng ta chạy code của họ dưới một User hệ thống không có quyền sudo (`sandbox`):
```bash
# Tạo user sandbox nếu chưa có
id sandbox || useradd -m -s /bin/bash sandbox
```

### Bước 2.3: Tải Dataset bài tập LeetCode
Chúng ta sử dụng dataset chất lượng cao chứa sẵn ~2,900 bài tập Leetcode đầy đủ mô tả, ví dụ, starter code mẫu:
```bash
# Clone dataset bài tập về thư mục root
git clone https://github.com/neenza/leetcode-problems.git /root/leetcode-problems
```

### Bước 2.4: Cài đặt code nguồn Backend
Tạo thư mục Backend `/root/leetcode-backend` gồm các file sau:
1. `package.json` (Chứa các thư viện `express`, `cors`, `dotenv`)
2. `runner.js` (Thực thi code của người dùng bằng cách ghi file tạm vào `/tmp` và chạy qua lệnh `su - sandbox -c "node / python3 ..."` kèm timeout 3 giây)
3. `server.js` (API server phục vụ danh sách bài, chi tiết bài và chấm điểm qua testcase mẫu kết hợp Gemini AI review)

Chạy các lệnh sau tại thư mục Backend:
```bash
cd /root/leetcode-backend

# Cài đặt thư viện Node.js
npm install

# Tạo file cấu hình biến môi trường
echo "GEMINI_API_KEY=Key_Gemini_Cua_Ban" > .env
```

### Bước 2.5: Chạy dịch vụ Backend bằng PM2
```bash
# Khởi chạy ứng dụng và lưu cấu hình khởi động tự động
pm2 start server.js --name leetcode-be
pm2 save
```
* **Port mặc định**: `5005`
* **Kiểm tra trạng thái**: `pm2 status` hoặc `pm2 logs leetcode-be`
* **Kiểm tra nhanh API hoạt động**: `curl http://localhost:5005/api/problems?limit=1`

---

## 3. Hướng dẫn Setup Frontend (VPS chính - `20.78.11.141`)

Tính năng LeetCode được tích hợp sẵn cơ chế **Tắt/Bật linh hoạt (Conditional Feature)**. Khi bạn điền URL của Leetcode Backend vào biến môi trường, giao diện và menu "Luyện thuật toán" sẽ tự động hiển thị. Nếu biến trống, tính năng sẽ tự ẩn đi hoàn toàn.

### Bước 3.1: Thêm biến môi trường
Mở file `.env` trên VPS chính Hidev.dev và thêm dòng sau:
```env
NEXT_PUBLIC_LEETCODE_URL=http://103.77.246.184:5005
```

### Bước 3.2: Rebuild & Reload PM2
Do Next.js cần compile biến môi trường `NEXT_PUBLIC_` vào bundle lúc build, bạn cần chạy build lại:
```bash
# Chạy build (khuyên dùng build với tùy chọn RAM ảo tối đa cũ của VPS nếu RAM thấp)
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Reload lại PM2 để áp dụng phiên bản mới
pm2 reload all
```

---

## 4. Bảo trì & Quản lý

### Cách cập nhật lại chỉ mục bài tập (Re-index)
Khi bạn bổ sung hoặc thay đổi các file bài tập JSON trong thư mục `/root/leetcode-problems/problems`, bạn không cần khởi động lại server. Chỉ cần gửi một yêu cầu POST tới endpoint sau để cập nhật danh sách bài tập mới trong bộ nhớ cache:
```bash
curl -X POST http://localhost:5005/api/problems/reindex
```
Server sẽ tự động quét lại toàn bộ thư mục và cập nhật chỉ mục ngay lập tức!

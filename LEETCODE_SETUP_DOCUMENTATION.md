# LEETCODE ONLINE JUDGE SYSTEM - VS CODE IDE SETUP DOCUMENTATION

Tài liệu hướng dẫn hệ thống **LeetCode Platform** hoàn chỉnh, thuần **Online Judge (OJ)** không sử dụng AI, trang bị trình soạn thảo **Monaco VS Code Editor**.

---

## 🏗️ 1. ARCHITECTURE OVERVIEW (TỔNG QUAN KIẾN TRÚC)

```
[ Frontend: hidev.dev ] (Next.js App Router + Monaco VS Code Editor)
         │
         │  HTTP REST API (/api/problems, /api/submissions, /api/languages)
         ▼
[ Backend: leetcode-backend ] (Node.js Express + Native Compiler Runner)
         │
         └── Native Execution (Thực thi trực tiếp trong Sandbox):
             JavaScript, TypeScript, Python 3, C, C++, Java, Go, Rust, PHP, Ruby
```

---

## 🖥️ 2. BACKEND SETUP (VPS `103.77.246.184:5005`)

### Các Ngôn Ngữ Được Hỗ Trợ Trực Tiếp (Native Compilers Only):
1. **JavaScript** (`node`)
2. **TypeScript** (`npx tsx`)
3. **Python / Python 3** (`python3`)
4. **C** (`gcc -lm -Wall`)
5. **C++** (`g++ -std=c++17 -Wall`)
6. **Java** (`javac` + OpenJDK 21)
7. **Go** (`go run`)
8. **Rust** (`rustc`)
9. **PHP** (`php-cli`)
10. **Ruby** (`ruby`)

### Cài đặt môi trường trên VPS:

```bash
# 1. Update system & compilers
apt update && apt upgrade -y
apt install -y build-essential gcc g++ default-jdk golang-go rustc php-cli ruby python3 nodejs npm

# 2. Setup Sandbox isolation user
useradd -m -s /bin/bash sandbox 2>/dev/null || true
mkdir -p /tmp/leetcode_run
chmod 777 /tmp/leetcode_run

# 3. Start Backend with PM2
cd /root/leetcode-backend
npm install
pm2 restart leetcode-be || pm2 start server.js --name leetcode-be
```

---

## 🎨 3. FRONTEND FEATURES & VS CODE EDITOR

### Tính Năng Nổi Bật Trên Frontend:
- **Trình Soạn Thảo VS Code (Monaco Editor)**: Giao diện chuẩn VS Code Dark (`vs-dark`), tự động tô màu cú pháp, đánh số dòng, tự động thụt lề & đóng ngoặc.
- **Chỉ Hiển Thị Ngôn Ngữ Thực Tế**: Tự động lọc ra đúng các ngôn ngữ đã được cài đặt môi trường trên VPS.
- **Chỉ Số Thực Thi Chi Tiết**: Đo thời gian chạy chính xác tính bằng millisecond (`ms`), số lượng testcases vượt qua (`3 / 3 Passed`).
- **Nút "Bài tiếp theo →"**: Khi chấm bài đạt **Accepted**, hệ thống cho phép chuyển nhanh sang bài tập tiếp theo.
- **Lưu Trạng Thái & Code Tự Động**: Tự động lưu code đang viết của từng bài theo từng ngôn ngữ trong `localStorage`. Hiển thị badge **Solved** trên danh sách bài tập.
- **Giao Diện Sạch Bỏ Icon Emoji**: Thiết kế tối giản, chuyên nghiệp cho lập trình viên.

---

## 🧪 4. VERIFICATION

Kiểm tra API chấm bài C++ trực tiếp từ Terminal:

```bash
curl -X POST http://103.77.246.184:5005/api/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "two-sum",
    "lang": "cpp",
    "code": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> mp;\n        for (size_t i = 0; i < nums.size(); i++) {\n            if (mp.count(target - nums[i])) return {mp[target - nums[i]], (int)i};\n            mp[nums[i]] = i;\n        }\n        return {};\n    }\n};"
  }'
```

Kết quả phản hồi:
- `"status": "Accepted"`
- `"executionTimeMs": 20`
- `"totalPassed": 3`
- `"executionMode": "native"`

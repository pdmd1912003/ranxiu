# Ranxiu

Nền tảng học tiếng Trung trực quan và toàn diện theo lộ trình chuẩn New HSK (HSK 1, HSK 2, Pinyin, Bài khóa, Từ vựng, Flashcard tương tác).

## 🚀 Tính Năng Chính
- **Giáo trình chuẩn New HSK:** Đầy đủ các bài học New HSK 1 và New HSK 2 với từ vựng, ngữ pháp, bài khóa và phát âm.
- **Bảng chữ cái Pinyin:** Bảng phát âm tương tác toàn diện kèm thanh mẫu, vận mẫu và thanh điệu.
- **Học từ vựng theo bài khóa:** Từ vựng được phân nhóm trực quan theo từng bài khóa nhỏ, hỗ trợ flashcard chạy nét đồng thời.
- **Tập viết chữ Hán (Hanzi Writer):** Hiển thị thứ tự nét bút chuẩn xác trong ô mễ tự (Tianzige).
- **Hệ thống Audio kép:** Tách biệt độc lập giữa Audio bài khóa và Audio luyện nghe từ vựng.
- **Cổng quản trị giáo viên:** Hỗ trợ tải file audio riêng (.mp3, .m4a), dán link hoặc thu âm trực tiếp lên Cloud Firestore.

## 🛠️ Cài Đặt & Chạy Cục Bộ (Local Development)

### Yêu cầu:
- Node.js (khuyến nghị phiên bản v18 trở lên)
- Trình quản lý gói `npm`

### Các bước thực hiện:
1. **Cài đặt thư viện dependencies:**
   ```bash
   npm install
   ```

2. **Cấu hình biến môi trường:**
   - Sao chép file `.env.example` thành `.env`:
     ```bash
     cp .env.example .env
     ```
   - Điền thông số cấu hình Firebase của dự án vào file `.env`.

3. **Chạy máy chủ phát triển:**
   ```bash
   npm run dev
   ```

4. **Đóng gói sản phẩm (Production Build):**
   ```bash
   npm run build
   ```

## 🌐 Triển Khai (Deployment)
Dự án được cấu hình sẵn sàng để triển khai lên **Firebase Hosting**:
```bash
npx firebase-tools deploy --only hosting
```

# 📖 Hướng Dẫn Sử Dụng - Ditch Speechify

## Mục Lục
1. [Giới Thiệu](#giới-thiệu)
2. [Logic Hoạt Động](#logic-hoạt-động)
3. [Cài Đặt](#cài-đặt)
4. [Hướng Dẫn Sử Dụng Chi Tiết](#hướng-dẫn-sử-dụng-chi-tiết)
5. [Tính Năng Nâng Cao](#tính-năng-nâng-cao)
6. [Câu Hỏi Thường Gặp](#câu-hỏi-thường-gặp)

---

## Giới Thiệu

**Ditch Speechify** là ứng dụng Text-to-Speech (TTS) miễn phí, mã nguồn mở, thay thế cho Speechify (giá $139/năm). Ứng dụng giúp bạn nghe đọc văn bản, PDF, và tài liệu Word một cách tự nhiên.

### Tính Năng Chính:
- 🆓 **100% Miễn phí** - Không phí subscription, không quảng cáo
- 🔒 **Bảo mật** - Chạy hoàn toàn offline, dữ liệu không rời khỏi máy
- 📄 **Hỗ trợ nhiều định dạng** - PDF, Word (.docx), TXT
- 🎙️ **Giọng đọc tự nhiên** - Sử dụng giọng đọc có sẵn trong hệ thống
- ⏯️ **Tạm dừng & Tiếp tục** - Ghi nhớ vị trí đọc
- 🎛️ **Tùy chỉnh** - Điều chỉnh tốc độ và cao độ giọng

---

## Logic Hoạt Động

### Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────────────┐
│                     TRÌNH DUYỆT WEB                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Frontend (HTML/CSS/JS)              │   │
│  │                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │   │
│  │  │ Upload Area  │  │  Text Area   │  │  Controls │ │   │
│  │  │ (PDF/Word/   │  │ (Paste text) │  │ (Play/    │ │   │
│  │  │  TXT)        │  │              │  │  Pause)   │ │   │
│  │  └──────────────┘  └──────────────┘  └───────────┘ │   │
│  │                                                      │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │           Web Speech API (Browser)            │   │   │
│  │  │        (Chuyển đổi text thành giọng nói)     │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP (localhost:8888)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Python FastAPI)                   │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Serve        │  │ PDF Parser   │  │ Word Parser      │  │
│  │ Static Files │  │ (PyPDF2)     │  │ (python-docx)    │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                              │
│  Endpoints:                                                  │
│  GET  /            → Trang chủ HTML                         │
│  POST /api/extract-pdf  → Trích xuất text từ PDF           │
│  POST /api/extract-docx → Trích xuất text từ Word          │
│  GET  /health      → Kiểm tra trạng thái server             │
└─────────────────────────────────────────────────────────────┘
```

### Quy Trình Hoạt Động

#### 1. Khởi Động Ứng Dụng
```
python main.py
    │
    ▼
FastAPI Server khởi động (port 8888)
    │
    ▼
Mở browser: http://localhost:8888
    │
    ▼
index.html được tải, kèm script.js và style.css
```

#### 2. Nhập Văn Bản

**Cách 1: Paste trực tiếp**
```
Người dùng paste text → Lưu vào localStorage → Sẵn sàng đọc
```

**Cách 2: Upload file TXT**
```
Upload file .txt → Đọc trực tiếp bằng JavaScript → Hiển thị trong textarea
```

**Cách 3: Upload file PDF/Word**
```
Upload file → Gửi đến Backend API → PyPDF2/python-docx xử lý
    → Trả về text thuần → Hiển thị trong textarea
```

#### 3. Phát Giọng Đọc

```
Nhấn Play
    │
    ▼
Chia văn bản thành từng câu (splitIntoSentences)
    │
    ▼
Tạo SpeechSynthesisUtterance cho câu hiện tại
    │
    ▼
Áp dụng: giọng đọc + tốc độ + cao độ
    │
    ▼
speechSynthesis.speak() → Browser đọc câu
    │
    ▼
onend event → Chuyển sang câu tiếp theo
    │
    ▼
Lặp lại cho đến hết văn bản
```

#### 4. Tạm Dừng & Tiếp Tục

```
Pause:
  - Ghi nhớ currentIndex (vị trí câu hiện tại)
  - speechSynthesis.cancel() dừng giọng đọc

Resume:
  - Bắt đầu từ currentIndex đã lưu
  - Tiếp tục đọc từ câu đó
```

---

## Cài Đặt

### Yêu Cầu Hệ Thống
- Python 3.8 trở lên
- Trình duyệt web hiện đại (Chrome, Firefox, Safari, Edge)
- Pip (trình quản lý package Python)

### Các Bước Cài Đặt

#### Bước 1: Clone Repository
```bash
git clone https://github.com/nihal-5/ditch-speechify.git
cd ditch-speechify
```

#### Bước 2: Cài Đặt Dependencies
```bash
pip install -r requirements.txt
```

Hoặc cài đặt từng package:
```bash
pip install fastapi uvicorn PyPDF2 python-docx aiofiles
```

#### Bước 3: Khởi Động Server
```bash
python main.py
```

Bạn sẽ thấy thông báo:
```
  🎙️  Ditch Speechify - Free TTS Reader
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📍 Open in your browser:
     http://localhost:8888

  💡 Press Ctrl+C to stop the server
```

#### Bước 4: Mở Trình Duyệt
Truy cập: **http://localhost:8888**

---

## Hướng Dẫn Sử Dụng Chi Tiết

### 1. Giao Diện Chính

```
┌────────────────────────────────────────────────────────┐
│  🎙️ Ditch Speechify                    [100% Free]    │
│     Why pay $139/yr when this is free?  [⭐ GitHub]   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  📄 Upload or Paste Your Text                         │
│  ┌────────────────────────────────────────────────┐  │
│  │     ⬆️ Drop PDF, Word, or TXT file here        │  │
│  │        or click to browse                      │  │
│  └────────────────────────────────────────────────┘  │
│                        OR                              │
│  ┌────────────────────────────────────────────────┐  │
│  │ Paste your text here and click Play...        │  │
│  │                                                │  │
│  └────────────────────────────────────────────────┘  │
│  [Clear Text]                                         │
│                                                        │
├────────────────────────────────────────────────────────┤
│  🎛️ Voice Settings                                    │
│  Voice: [⭐ Samantha ▼]                               │
│  Speed: [====●====] 1.0x                              │
│  Pitch: [====●====] 0                                 │
│                                                        │
├────────────────────────────────────────────────────────┤
│              [▶️ Play]  [⏹️ Stop]                      │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    │
│  0:00                                       5:30      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 2. Cách Nhập Văn Bản

#### Cách 1: Paste Text
1. Copy văn bản từ nguồn bất kỳ (web, Word, email...)
2. Paste vào ô textarea
3. Text tự động được lưu

#### Cách 2: Upload File
1. Click vào vùng "Drop PDF, Word, or TXT file here"
2. Chọn file từ máy tính
3. Hoặc kéo thả file trực tiếp vào vùng này

**Định dạng được hỗ trợ:**
- `.txt` - Plain text
- `.pdf` - PDF documents
- `.docx` - Microsoft Word
- `.doc` - Microsoft Word (legacy)

### 3. Chọn Giọng Đọc

1. Click vào dropdown "Voice"
2. Giọng có ⭐ là giọng chất lượng cao
3. Các giọng được ưu tiên:
   - **macOS:** Siri voices, Samantha, Alex
   - **Windows:** Microsoft Zira, Microsoft David
   - **Chrome:** Google US English, Google UK English

### 4. Điều Chỉnh Tốc Độ & Cao Độ

#### Tốc độ (Speed)
- **0.5x** - Rất chậm (dùng để học ngôn ngữ)
- **1.0x** - Bình thường
- **1.5x** - Nhanh
- **2.0x** - Rất nhanh

#### Cao độ (Pitch)
- **-10** - Giọng trầm
- **0** - Bình thường
- **+10** - Giọng cao

### 5. Các Nút Điều Khiển

| Nút | Chức năng |
|-----|-----------|
| ▶️ **Play** | Bắt đầu đọc từ đầu |
| ⏸️ **Pause** | Tạm dừng, ghi nhớ vị trí |
| ▶️ **Resume** | Tiếp tục từ vị trí đã dừng |
| ⏹️ **Stop** | Dừng và quay lại đầu |

---

## Tính Năng Nâng Cao

### 1. Double-Click để Đọc từ Vị Trí Bất Kỳ

1. Di chuyển con trỏ đến câu muốn bắt đầu
2. **Double-click** (click đúp) vào vị trí đó
3. Ứng dụng sẽ bắt đầu đọc từ câu chứa vị trí click

### 2. Auto-Save

- Văn bản được tự động lưu vào localStorage
- Khi mở lại ứng dụng, văn bản trước đó vẫn còn
- Không lo mất dữ liệu khi đóng browser

### 3. Live Preview Khi Chỉnh Tốc Độ

- Khi đang phát, điều chỉnh Speed hoặc Pitch
- Thay đổi được áp dụng ngay lập tức cho câu đang đọc

---

## Câu Hỏi Thường Gặp

### Q: Ứng dụng có an toàn không?
**A:** Có. Xem [SECURITY_ANALYSIS.md](SECURITY_ANALYSIS.md) để biết chi tiết. Dữ liệu của bạn không bao giờ rời khỏi máy tính.

### Q: Tại sao không có giọng nào hiển thị?
**A:** 
1. Đợi vài giây để browser tải giọng
2. Thử refresh trang
3. Kiểm tra cài đặt Text-to-Speech của hệ điều hành

### Q: Làm sao để có giọng đọc chất lượng cao hơn?
**A:**
- **macOS:** System Settings → Accessibility → Spoken Content → Download giọng "Enhanced"
- **Windows:** Settings → Time & Language → Speech → Download giọng mới
- **Chrome:** Tự động có Google voices

### Q: File PDF không đọc được?
**A:** 
- PDF có thể là dạng scan (hình ảnh)
- Thử copy text thủ công và paste vào

### Q: Server không khởi động được?
**A:** 
1. Kiểm tra Python version: `python --version` (cần 3.8+)
2. Cài đặt lại dependencies: `pip install -r requirements.txt`
3. Kiểm tra port 8888 có đang được sử dụng không

### Q: Làm sao dừng server?
**A:** Nhấn `Ctrl+C` trong terminal

---

## Liên Hệ & Đóng Góp

- **Repository:** [GitHub](https://github.com/nihal-5/ditch-speechify)
- **Issues:** Báo lỗi qua GitHub Issues
- **Contributing:** Xem README.md

---

*Tài liệu cập nhật: Tháng 12 năm 2024*

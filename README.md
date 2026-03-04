"# TelegramBotGAS_LogAndAntiSpamBot" 


///////////////English////////////////



//////////Tiếng Việt Phía dưới//////////////
# Telegram Group Manager & Anti-Spam Bot

A robust Google Apps Script (GAS) application designed to manage Telegram groups. This bot seamlessly integrates two independent modules: an automated anti-spam monitor and a secure message logger using Google Sheets.



## Key Features

1. **Intelligent Anti-Spam System:** Monitors message frequency in groups. If a user exceeds the threshold (10 messages per minute), the bot automatically mutes them for 10 minutes.
2. **Secure Activity Logging:** Accurately logs all group messages (Timestamp, Chat ID, User ID, Full Name, and Text) into a Google Spreadsheet.
3. **Concurrency Handling:** Utilizes Google Apps Script `LockService` to prevent data overwriting when multiple users send messages simultaneously.
4. **Optimized Memory Usage:** Uses `CacheService` for lightning-fast message counting without exhausting Google Sheets API quotas.

## Architecture & Logic Explanation

* **Spam Detection (`CacheService`):** Instead of reading/writing to a database, the bot stores a temporary counter in Google's server RAM (`CacheService`) with a Time-To-Live (TTL) of 60 seconds. The key format is `spam_[chatId]_[userId]`. If the counter hits 11 within this window, the restriction is triggered.
* **Auto-Unmute (`restrictChatMember`):** The bot uses Telegram's `until_date` parameter when restricting a user. By passing a Unix timestamp of "current time + 10 minutes", Telegram's internal servers automatically lift the restriction when the time expires. No cron jobs or triggers are needed on the GAS side.
* **Concurrent Logging (`LockService`):** High-traffic groups generate concurrent POST requests. `LockService.getScriptLock()` acts as a queue manager, granting exclusive write access to the spreadsheet for one request at a time (up to a 3-second wait) to ensure data integrity.

## Setup Instructions

### 1. Prerequisites
* A Telegram Bot Token from [@BotFather](https://t.me/botfather).
* A new Google Sheet (extract the `SHEET_ID` from its URL).

### 2. Apps Script Configuration
1. Open your Google Sheet > **Extensions** > **Apps Script**.
2. Paste the provided source code into the editor.
3. Locate the `setupEnvironment()` function. Replace `YOUR_BOT_TOKEN_HERE` and `YOUR_GOOGLE_SHEET_ID` with your actual credentials.

### 3. Deployment
1. Click **Deploy** > **New deployment** > **Web app**.
2. Set **Execute as** to `Me`.
3. Set **Who has access** to `Anyone`.
4. Click **Deploy** and authorize the script. Copy the generated **Web App URL**.

### 4. Initialization
1. Paste the copied Web App URL into the `WEBAPP_URL` variable inside `setupEnvironment()`.
2. Run `setupEnvironment` from the Apps Script editor to save properties.
3. Run `setWebhook` to bind the bot to your Web App.

### 5. Group Configuration (Crucial)
* Add the bot to your Telegram group.
* Promote the bot to **Administrator**.
* Ensure the bot has the **Ban Users** (or Restrict Members) permission, otherwise, the mute function will fail.

---
---

# Bot Quản Lý Nhóm & Chống Spam Telegram

Một ứng dụng Google Apps Script (GAS) mạnh mẽ được thiết kế để quản lý các nhóm Telegram. Bot này tích hợp mượt mà hai phân hệ độc lập: hệ thống giám sát chống spam tự động và hệ thống ghi nhật ký tin nhắn an toàn bằng Google Sheets.

## Các Tính Năng Chính

1. **Hệ Thống Chống Spam Thông Minh:** Giám sát tần suất gửi tin nhắn trong nhóm. Nếu một người dùng vượt quá ngưỡng cho phép (10 tin nhắn/phút), bot sẽ tự động cấm chat (mute) người đó trong 10 phút.
2. **Ghi Nhật Ký An Toàn:** Lưu trữ chính xác tất cả tin nhắn của nhóm (Thời gian, ID Nhóm, ID Người dùng, Họ tên, và Nội dung) vào Google Sheets.
3. **Xử Lý Đồng Thời:** Sử dụng `LockService` của Google Apps Script để ngăn chặn tình trạng ghi đè dữ liệu khi nhiều người dùng nhắn tin cùng một lúc.
4. **Tối Ưu Bộ Nhớ:** Sử dụng `CacheService` để đếm tin nhắn với tốc độ siêu tốc trên RAM mà không làm cạn kiệt giới hạn gọi API của Google Sheets.

## Kiến Trúc & Giải Thích Logic

* **Phát Hiện Spam (`CacheService`):** Thay vì đọc/ghi vào cơ sở dữ liệu, bot lưu một biến đếm tạm thời trên RAM máy chủ của Google (`CacheService`) với thời gian tồn tại (TTL) là 60 giây. Định dạng khóa là `spam_[chatId]_[userId]`. Nếu biến đếm chạm mức 11 trong khoảng thời gian này, lệnh trừng phạt sẽ được kích hoạt.
* **Tự Động Mở Khóa (`restrictChatMember`):** Bot sử dụng tham số `until_date` của Telegram khi hạn chế người dùng. Bằng cách truyền vào dấu thời gian Unix "thời gian hiện tại + 10 phút", máy chủ của Telegram sẽ tự động gỡ bỏ hạn chế khi hết hạn. Không cần thiết lập các hàm hẹn giờ (triggers) phức tạp trên GAS.
* **Ghi Nhật Ký Đồng Thời (`LockService`):** Các nhóm hoạt động mạnh sẽ tạo ra các yêu cầu POST đồng thời. `LockService.getScriptLock()` hoạt động như một trình quản lý hàng đợi, cấp quyền ghi độc quyền vào bảng tính cho từng yêu cầu một (thời gian chờ tối đa 3 giây) để đảm bảo tính toàn vẹn của dữ liệu.

## Hướng Dẫn Cài Đặt

### 1. Yêu Cầu Ban Đầu
* Token của Telegram Bot lấy từ [@BotFather](https://t.me/botfather).
* Một Google Sheet mới (lấy `SHEET_ID` từ đường dẫn URL).

### 2. Cấu Hình Apps Script
1. Mở Google Sheet > **Tiện ích mở rộng (Extensions)** > **Apps Script**.
2. Dán mã nguồn được cung cấp vào trình chỉnh sửa.
3. Tìm hàm `setupEnvironment()`. Thay thế `YOUR_BOT_TOKEN_HERE` và `YOUR_GOOGLE_SHEET_ID` bằng thông tin thực tế của bạn.

### 3. Triển Khai (Deployment)
1. Nhấp vào **Triển khai (Deploy)** > **Triển khai mới (New deployment)** > **Ứng dụng web (Web app)**.
2. Mục **Thực thi dưới dạng (Execute as)** chọn `Tôi (Me)`.
3. Mục **Người có quyền truy cập (Who has access)** chọn `Bất kỳ ai (Anyone)`.
4. Nhấp **Triển khai**, cấp quyền cho tập lệnh. Sao chép **URL Ứng dụng web (Web App URL)**.

### 4. Khởi Tạo Hệ Thống
1. Dán URL Ứng dụng web vừa sao chép vào biến `WEBAPP_URL` trong hàm `setupEnvironment()`.
2. Chạy hàm `setupEnvironment` trên thanh công cụ để lưu các thuộc tính.
3. Chạy hàm `setWebhook` để kết nối bot với Web App của bạn.

### 5. Cấu Hình Nhóm (Quan Trọng)
* Thêm bot vào nhóm Telegram của bạn.
* Cấp quyền **Quản trị viên (Administrator)** cho bot.
* Đảm bảo bot có quyền **Cấm người dùng (Ban Users / Restrict Members)**, nếu không tính năng mute sẽ không hoạt động.

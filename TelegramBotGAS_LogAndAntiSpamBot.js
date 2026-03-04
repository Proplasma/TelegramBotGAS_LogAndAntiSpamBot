//TelegramBotGAS_LogAndAntiSpamBot



/**
 * ============================================================
 * PHẦN 1: CẤU HÌNH & SETUP 
 * ============================================================
 */

function AutoSetUpBot() {
  Logger.log("Bắt đầu thiết lập...");
  setupEnvironment();
  setWebhook();
}

function setupEnvironment() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperties({
    'BOT_TOKEN': 'YOUR_BOT_TOKEN_HERE',      // <--- Thay Token Bot Telegram
    'WEBAPP_URL': 'YOUR_WEBAPP_URL_HERE',    // <--- Thay URL Web App
    'SHEET_ID': 'YOUR_GOOGLE_SHEET_ID'       // <--- Thay ID Google Sheet
  });
  Logger.log("Đã lưu cấu hình. Hãy chạy hàm setWebhook.");
}

/**
 * ============================================================
 * PHẦN 2: CÁC HÀM HỖ TRỢ (HELPER FUNCTIONS)
 * ============================================================
 */

function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    token: props.getProperty('BOT_TOKEN'),
    webAppUrl: props.getProperty('WEBAPP_URL'),
    ssId: props.getProperty('SHEET_ID')
  };
}

function getTelegramUrl() {
  const token = getConfig().token;
  if (!token) throw new Error("Chưa có Token cấu hình.");
  return "https://api.telegram.org/bot" + token;
}

function setWebhook() {
  const config = getConfig();
  const url = getTelegramUrl() + "/setWebhook?url=" + config.webAppUrl;
  const response = UrlFetchApp.fetch(url);
  Logger.log("Set Webhook: " + response.getContentText());
}

function sendText(chatId, text) {
  const url = getTelegramUrl() + "/sendMessage";
  const payload = {
    chat_id: chatId,
    text: text
  };
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };
  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    Logger.log("Lỗi gửi tin: " + e.toString());
  }
}

// Hàm mới: Hạn chế (Mute) người dùng
function muteUser(chatId, userId, minutes) {
  const url = getTelegramUrl() + "/restrictChatMember";
  
  // Tính toán thời điểm mở khóa (Unix timestamp tính bằng giây)
  const untilDate = Math.floor(Date.now() / 1000) + (minutes * 60);
  
  const payload = {
    chat_id: chatId,
    user_id: userId,
    permissions: {
      can_send_messages: false // Rút quyền gửi tin nhắn
    },
    until_date: untilDate
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true // Giúp log được lỗi chi tiết nếu bot thiếu quyền
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    Logger.log("Kết quả Mute: " + response.getContentText());
  } catch (e) {
    Logger.log("Lỗi gọi API Mute: " + e.toString());
  }
}

/**
 * ============================================================
 * PHẦN 3: LOGIC CHÍNH (MAIN LOGIC)
 * ============================================================
 */

function doGet(e) {
  return HtmlService.createHtmlOutput("Hệ thống Bot Quản lý Nhóm đang hoạt động.");
}

function doPost(e) {
  try {
    const config = getConfig();
    if (!config.ssId) return;

    const data = JSON.parse(e.postData.contents);
    if (!data.message) return; // Chỉ xử lý tin nhắn mới

    const msg = data.message;
    const chatId = msg.chat.id;
    const chatType = msg.chat.type; // Xác định loại chat: private, group, supergroup
    const userId = msg.from.id;
    const text = msg.text || "[Không phải văn bản/Sticker/Ảnh]";
    const fullName = (msg.from.first_name + " " + (msg.from.last_name || "")).trim();

    // ==========================================
    // MODULE 1: GIÁM SÁT SPAM (Chỉ chạy trong nhóm)
    // ==========================================
    if (chatType === "group" || chatType === "supergroup") {
      const cache = CacheService.getScriptCache();
      const cacheKey = "spam_" + chatId + "_" + userId;
      let count = cache.get(cacheKey);

      if (count == null) {
        // Nếu chưa có dữ liệu, khởi tạo biến đếm là 1, tồn tại trong 60 giây
        cache.put(cacheKey, "1", 60);
      } else {
        count = parseInt(count) + 1;
        cache.put(cacheKey, count.toString(), 60); // Cập nhật lại số đếm

        // Nếu chạm mốc 11 tin nhắn (vượt quá 10)
        if (count === 11) {
          muteUser(chatId, userId, 10); // Mute 10 phút
          sendText(chatId, "⚠️ Cảnh báo: Người dùng " + fullName + " đã bị cấm chat 10 phút do gửi tin nhắn quá nhanh.");
          return; // Kết thúc luồng, không log tin nhắn vi phạm này vào Sheet
        } else if (count > 11) {
          return; // Đã xử lý Mute, chặn việc log các tin nhắn dồn dập tiếp theo
        }
      }
    }

    // ==========================================
    // MODULE 2: GHI NHẬT KÝ VÀO GOOGLE SHEETS
    // ==========================================
    const lock = LockService.getScriptLock();
    try {
      // Chờ tối đa 3 giây để lấy quyền ghi, tránh xung đột khi nhiều người nhắn cùng lúc
      if (lock.tryLock(3000)) {
        const ss = SpreadsheetApp.openById(config.ssId);
        const sheet = ss.getSheets()[0];
        sheet.appendRow([new Date(), chatId, userId, fullName, text]);
      } else {
        Logger.log("Timeout: Không thể lấy quyền LockService cho tin nhắn của " + userId);
      }
    } catch (err) {
      Logger.log("Lỗi ghi Sheet: " + err.message);
    } finally {
      // Bắt buộc phải giải phóng khóa
      lock.releaseLock();
    }

  } catch (e) {
    Logger.log("LỖI NGHIÊM TRỌNG: " + e.toString());
  }
}
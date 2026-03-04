//TelegramBotGAS_LogAndAntiSpamBot


/**
 * ============================================================
 * PHẦN 1: CẤU HÌNH & SETUP 
 * ============================================================
 */

function AutoSetUpBot() {
  Logger.log("Bat dau thiet lap...");
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
  Logger.log("Da luu cau hinh. Hay chay ham setWebhook.");
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
  if (!token) throw new Error("Chua co Token cau hinh.");
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
    Logger.log("Loi gui tin: " + e.toString());
  }
}

function muteUser(chatId, userId, minutes) {
  const url = getTelegramUrl() + "/restrictChatMember";
  const untilDate = Math.floor(Date.now() / 1000) + (minutes * 60);
  
  const payload = {
    chat_id: chatId,
    user_id: userId,
    permissions: {
      can_send_messages: false
    },
    until_date: untilDate
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    Logger.log("Ket qua Mute: " + response.getContentText());
  } catch (e) {
    Logger.log("Loi goi API Mute: " + e.toString());
  }
}

// Hàm lấy URL tải file trực tiếp từ Telegram
function getFileUrl(fileId) {
  const config = getConfig();
  const url = "https://api.telegram.org/bot" + config.token + "/getFile?file_id=" + fileId;
  
  try {
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    
    if (data.ok && data.result) {
      const filePath = data.result.file_path;
      return "https://api.telegram.org/file/bot" + config.token + "/" + filePath;
    }
  } catch (e) {
    Logger.log("Loi khi lay duong dan file: " + e.toString());
  }
  return "Khong the lay link";
}

/**
 * ============================================================
 * PHẦN 3: LOGIC CHÍNH (MAIN LOGIC)
 * ============================================================
 */

function doGet(e) {
  return HtmlService.createHtmlOutput("He thong Bot Quan ly Nhom dang hoat dong.");
}

function doPost(e) {
  try {
    const config = getConfig();
    if (!config.ssId) return;

    const data = JSON.parse(e.postData.contents);
    if (!data.message) return; // Chỉ xử lý tin nhắn mới

    const msg = data.message;
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    const userId = msg.from.id;
    const fullName = (msg.from.first_name + " " + (msg.from.last_name || "")).trim();

    // ==========================================
    // MODULE 1: PHÂN LOẠI VÀ LẤY DỮ LIỆU TIN NHẮN
    // ==========================================
    let textContent = "";
    
    if (msg.text) {
      textContent = msg.text; 
    } else if (msg.photo) {
      const highestResPhoto = msg.photo[msg.photo.length - 1];
      const fileUrl = getFileUrl(highestResPhoto.file_id);
      const caption = msg.caption ? " | Chu thich: " + msg.caption : "";
      textContent = "[Hinh anh] Link: " + fileUrl + caption;
    } else if (msg.document) {
      // Áp dụng lấy link cho cả tài liệu (PDF, Word, Excel...)
      const fileUrl = getFileUrl(msg.document.file_id);
      textContent = "[Tai lieu: " + (msg.document.file_name || "Khong ten") + "] Link: " + fileUrl;
    } else if (msg.video) {
      // Áp dụng lấy link cho video
      const fileUrl = getFileUrl(msg.video.file_id);
      const caption = msg.caption ? " | Chu thich: " + msg.caption : "";
      textContent = "[Video] Link: " + fileUrl + caption;
    } else if (msg.sticker) {
      textContent = "[Sticker] " + (msg.sticker.emoji || "");
    } else if (msg.voice) {
      const fileUrl = getFileUrl(msg.voice.file_id);
      textContent = "[Tin nhan thoai] Link: " + fileUrl;
    } else {
      textContent = "[Dinh dang khac khong xac dinh]";
    }

    // ==========================================
    // MODULE 2: GIÁM SÁT SPAM (Chỉ chạy trong nhóm)
    // ==========================================
    if (chatType === "group" || chatType === "supergroup") {
      const cache = CacheService.getScriptCache();
      const cacheKey = "spam_" + chatId + "_" + userId;
      let count = cache.get(cacheKey);

      if (count == null) {
        cache.put(cacheKey, "1", 60);
      } else {
        count = parseInt(count) + 1;
        cache.put(cacheKey, count.toString(), 60);

        if (count === 11) {
          muteUser(chatId, userId, 10);
          sendText(chatId, "Canh bao: Nguoi dung " + fullName + " da bi cam chat 10 phut do gui tin nhan qua nhanh.");
          return;
        } else if (count > 11) {
          return; 
        }
      }
    }

    // ==========================================
    // MODULE 3: GHI NHẬT KÝ VÀO GOOGLE SHEETS
    // ==========================================
    const lock = LockService.getScriptLock();
    try {
      if (lock.tryLock(3000)) {
        const ss = SpreadsheetApp.openById(config.ssId);
        const sheet = ss.getSheets()[0];
        sheet.appendRow([new Date(), chatId, userId, fullName, textContent]);
      } else {
        Logger.log("Timeout LockService cho user: " + userId);
      }
    } catch (err) {
      Logger.log("Loi ghi Sheet: " + err.message);
    } finally {
      lock.releaseLock();
    }

  } catch (e) {
    Logger.log("LOI NGHIEM TRONG: " + e.toString());
  }
}
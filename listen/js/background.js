import { Config } from './config.js';
import { TTSManager } from './services/tts-manager.js';

// 初始化扩展
chrome.runtime.onInstalled.addListener(() => {
  // 创建上下文菜单
  chrome.contextMenus.create({ id: "readSelectedText", title: "朗读选中文本", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "readFromScreenshot", title: "从截图中朗读文本", contexts: ["page"] });

  // 设置默认配置
  chrome.storage.sync.get(Config.defaultSettings, (items) => {
    // Merge defaults with existing, but for now just ensure defaults exist if empty
    // Actually chrome.storage.sync.get with object returns defaults if keys missing
    // We want to set them if they are completely missing to ensure consistency
    chrome.storage.sync.set(items);
  });
});

// 处理上下文菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "readSelectedText" && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, { action: "readText", text: info.selectionText });
  } else if (info.menuItemId === "readFromScreenshot") {
    chrome.tabs.sendMessage(tab.id, { action: "captureScreen" });
  }
});

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "processScreenshot") {
    sendResponse({ success: true, message: "截图处理功能正在开发中" });
    return true;
  }

  if (request.action === 'generateTTS') {
    (async () => {
      try {
        const { text } = request;
        // Get settings, merging with defaults
        const stored = await chrome.storage.sync.get(Config.defaultSettings);
        const settings = { ...Config.defaultSettings, ...stored };

        const result = await TTSManager.generate(text, settings);
        sendResponse({ success: true, ...result });
      } catch (e) {
        console.error('TTS Error:', e);
        sendResponse({ success: false, error: String(e.message || e) });
      }
    })();
    return true; // Async response
  }

  if (request.action === 'getSettings') {
    chrome.storage.sync.get(request.keys || {}, (res) => sendResponse(res));
    return true;
  }

  if (request.action === 'captureVisibleTab') {
    try {
      chrome.tabs.captureVisibleTab(undefined, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: String(chrome.runtime.lastError.message || chrome.runtime.lastError) });
          return;
        }
        sendResponse({ success: true, dataUrl });
      });
    } catch (e) {
      sendResponse({ success: false, error: String(e) });
    }
    return true;
  }

  if (request.action === 'ocrImage') {
    (async () => {
      try {
        const { imageB64, mimeType } = request;
        const stored = await chrome.storage.sync.get(Config.defaultSettings);
        const settings = { ...Config.defaultSettings, ...stored };

        if (!settings.apiKey) { sendResponse({ success: false, error: '缺少API密钥' }); return; }
        if (settings.aiProvider !== 'gemini') { sendResponse({ success: false, error: '当前仅实现 Gemini OCR' }); return; }

        // Reuse Gemini logic or keep simple here for now. 
        // Ideally OCR should also be a service, but for this refactor step we keep it here to minimize scope creep
        // or we can quickly move it to a service. Let's keep it here but clean it up.

        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
        const body = {
          contents: [{
            role: 'user',
            parts: [
              { text: 'Extract all readable text from the image. Return plain text only.' },
              { inlineData: { mimeType: mimeType || 'image/png', data: imageB64 } }
            ]
          }]
        };

        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': settings.apiKey },
          body: JSON.stringify(body)
        });

        if (!resp.ok) {
          const errText = await resp.text();
          sendResponse({ success: false, error: `OCR失败: ${resp.status} ${errText}` });
          return;
        }

        const data = await resp.json();
        let text = '';
        try {
          const candidates = data.candidates || [];
          for (const c of candidates) {
            const parts = (c.content && c.content.parts) || [];
            for (const p of parts) {
              if (typeof p.text === 'string' && p.text.trim()) { text += p.text + '\n'; }
            }
          }
          text = text.trim();
        } catch (_) { }

        if (!text) { sendResponse({ success: false, error: '未识别到文本' }); return; }
        sendResponse({ success: true, text });

      } catch (e) {
        sendResponse({ success: false, error: String(e) });
      }
    })();
    return true;
  }

  if (request.action === 'reinjectContent' && sender?.tab?.id) {
    try {
      const tabId = sender.tab.id;
      chrome.scripting.insertCSS({ target: { tabId }, files: ['css/content.css'] }, () => {
        chrome.scripting.executeScript({ target: { tabId }, files: ['js/content.js'] }, () => {
          sendResponse({ success: true });
        });
      });
    } catch (e) {
      sendResponse({ success: false, error: String(e) });
    }
    return true;
  }

  return true;
});

// 命令快捷键
chrome.commands?.onCommand.addListener((command) => {
  if (command === 'ocr-and-read') {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs && tabs[0];
        if (!tab || !tab.id) return;
        try { chrome.tabs.sendMessage(tab.id, { action: 'captureScreen' }); } catch (_) { }
      });
    } catch (_) { }
  }
});

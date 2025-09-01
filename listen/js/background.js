// 背景脚本 - 处理插件生命周期和上下文菜单

// 初始化扩展
chrome.runtime.onInstalled.addListener(() => {
  // 创建上下文菜单
  chrome.contextMenus.create({ id: "readSelectedText", title: "朗读选中文本", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "readFromScreenshot", title: "从截图中朗读文本", contexts: ["page"] });

  // 设置默认配置
  chrome.storage.sync.set({
    voice: 'default', rate: 1.0, pitch: 1.0, volume: 1.0,
    autoDetectLanguage: true, preferredLanguage: 'zh-CN',
    useAdvancedAI: false, aiProvider: 'openai', apiKey: '', apiBaseUrl: 'https://api.openai.com/v1',
    aiVoice: 'alloy', aiLanguageCode: 'zh-CN',
    enableOCR: true, autoReadSelected: false
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

// 监听来自内容脚本或弹出窗口的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "processScreenshot") {
    sendResponse({ success: true, message: "截图处理功能正在开发中" });
    return true;
  }

  if (request.action === 'generateTTS') {
    (async () => {
      try {
        const { text } = request;
        const settings = await chrome.storage.sync.get({
          aiProvider: 'openai', apiKey: '', apiBaseUrl: 'https://api.openai.com/v1',
          aiVoice: 'alloy', aiLanguageCode: 'zh-CN', rate: 1.0, pitch: 1.0
        });
        if (!settings.apiKey) { sendResponse({ success: false, error: '缺少API密钥' }); return; }

        if (settings.aiProvider === 'openai') {
          const url = `${settings.apiBaseUrl}/audio/speech`;
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
            body: JSON.stringify({ model: 'tts-1', voice: settings.aiVoice, input: text, format: 'mp3' })
          });
          if (!resp.ok) { const errText = await resp.text(); sendResponse({ success: false, error: `TTS失败: ${resp.status} ${errText}` }); return; }
          const arrayBuf = await resp.arrayBuffer();
          sendResponse({ success: true, audioData: arrayBuf, mimeType: 'audio/mpeg' });
          return;
        }

        if (settings.aiProvider === 'google') {
          const base = settings.apiBaseUrl || 'https://texttospeech.googleapis.com/v1';
          const url = `${base}/text:synthesize`;
          const payload = {
            input: { text },
            voice: { languageCode: settings.aiLanguageCode || 'zh-CN', name: settings.aiVoice || undefined },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: Math.min(4.0, Math.max(0.25, settings.rate)),
              pitch: Math.min(20.0, Math.max(-20.0, (settings.pitch - 1.0) * 20))
            }
          };
          const resp = await fetch(url + `?key=${encodeURIComponent(settings.apiKey)}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
          });
          if (!resp.ok) { const errText = await resp.text(); sendResponse({ success: false, error: `Google TTS失败: ${resp.status} ${errText}` }); return; }
          const data = await resp.json();
          if (!data.audioContent) { sendResponse({ success: false, error: 'Google返回缺少audioContent' }); return; }
          const binary = atob(data.audioContent);
          const len = binary.length; const buf = new Uint8Array(len);
          for (let i = 0; i < len; i++) buf[i] = binary.charCodeAt(i);
          sendResponse({ success: true, audioData: buf.buffer, mimeType: 'audio/mpeg' });
          return;
        }

        if (settings.aiProvider === 'gemini') {
          const base = (settings.apiBaseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
          const fullPath = base; // 用户现在提供完整的URL

          // 依据官方文档 (ai.google.dev/gemini-api/docs/speech-generation) 修正请求体
          const body = {
            contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: settings.aiVoice || 'Kore' // 使用文档中的有效语音作为默认值
                  }
                }
              }
            }
          };

          const resp = await fetch(fullPath, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': settings.apiKey },
            body: JSON.stringify(body)
          });
          if (!resp.ok) { const errText = await resp.text(); sendResponse({ success: false, error: `Gemini TTS失败: ${resp.status} ${errText}` }); return; }
          const data = await resp.json();

          let b64 = null;
          try {
            const candidates = data.candidates || [];
            for (const c of candidates) {
              const parts = (c.content && c.content.parts) || [];
              for (const p of parts) {
                if (p.inlineData && p.inlineData.data) { b64 = p.inlineData.data; break; }
                if (p.audio && p.audio.data) { b64 = p.audio.data; break; }
              }
              if (b64) break;
            }
          } catch (_) {}

          if (!b64) { sendResponse({ success: false, error: 'Gemini返回中未找到音频数据' }); return; }

          // 使用更健壮的方式将 base64(PCM) 转换为带WAV头的 ArrayBuffer
          const pcmData = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
          const pcmLen = pcmData.length;
          const numChannels = 1;
          const sampleRate = 24000;
          const bytesPerSample = 2; // s16le
          const dataSize = pcmLen;
          const headerSize = 44;
          const wavBuffer = new ArrayBuffer(headerSize + dataSize);
          const view = new DataView(wavBuffer);
          function writeStr(offset, str) { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); }
          let offset = 0;
          writeStr(offset, 'RIFF'); offset += 4;
          view.setUint32(offset, 36 + dataSize, true); offset += 4; // chunkSize
          writeStr(offset, 'WAVE'); offset += 4;
          writeStr(offset, 'fmt '); offset += 4;
          view.setUint32(offset, 16, true); offset += 4; // subchunk1Size
          view.setUint16(offset, 1, true); offset += 2; // audioFormat PCM
          view.setUint16(offset, numChannels, true); offset += 2;
          view.setUint32(offset, sampleRate, true); offset += 4;
          view.setUint32(offset, sampleRate * numChannels * bytesPerSample, true); offset += 4; // byteRate
          view.setUint16(offset, numChannels * bytesPerSample, true); offset += 2; // blockAlign
          view.setUint16(offset, 8 * bytesPerSample, true); offset += 2; // bitsPerSample
          writeStr(offset, 'data'); offset += 4;
          view.setUint32(offset, dataSize, true); offset += 4;
          new Uint8Array(wavBuffer).set(pcmData, headerSize);

          // 额外返回base64，避免前端在消息传递中出现ArrayBuffer克隆问题
          function bufferToBase64(buffer) {
            const bytes = new Uint8Array(buffer);
            const chunkSize = 0x8000;
            let binary = '';
            for (let i = 0; i < bytes.length; i += chunkSize) {
              binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
            }
            return btoa(binary);
          }
          const wavB64 = bufferToBase64(wavBuffer);

          sendResponse({ success: true, audioData: wavBuffer, audioB64: wavB64, mimeType: 'audio/wav' });
          return;
        }

        if (settings.aiProvider === 'deepseek') {
          sendResponse({ success: false, error: 'DeepSeek TTS暂未接入' });
          return;
        }

        sendResponse({ success: false, error: '不支持的AI提供商' });
      } catch (e) {
        sendResponse({ success: false, error: String(e) });
      }
    })();
    return true; // 异步响应
  }

  return true;
});

// 命令快捷键（占位）
chrome.commands?.onCommand.addListener((command) => {
  // 可在此处理快捷键触发
}); 
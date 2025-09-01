// 内容脚本 - 处理文本选择和朗读功能

// 全局变量
let isReading = false;
let speechSynthesis = window.speechSynthesis;
let speechUtterance = null;
let selectedText = '';
let floatingButton = null;
let audioPlayer = null;
let currentObjectUrl = null;
let audioContext = null;
let audioBufferSource = null;

// 创建悬浮按钮
function createFloatingButton() {
  if (floatingButton) {
    document.body.removeChild(floatingButton);
  }
  
  floatingButton = document.createElement('div');
  floatingButton.id = 'listen-floating-button';
  floatingButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7zm1-11h-2v4H7v2h4v4h2v-4h4v-2h-4V8z"/></svg>';
  floatingButton.style.display = 'none';
  
  floatingButton.addEventListener('click', () => {
    if (selectedText) {
      readText(selectedText);
    }
  });
  
  document.body.appendChild(floatingButton);
}

// 显示悬浮按钮在选中文本附近
function showFloatingButton(x, y) {
  if (!floatingButton) {
    createFloatingButton();
  }
  
  floatingButton.style.display = 'flex';
  floatingButton.style.left = `${x}px`;
  floatingButton.style.top = `${y}px`;
}

// 隐藏悬浮按钮
function hideFloatingButton() {
  if (floatingButton) {
    floatingButton.style.display = 'none';
  }
}

// 停止并释放 WebAudio
function cleanupWebAudio() {
  try {
    if (audioBufferSource) {
      audioBufferSource.stop(0);
      audioBufferSource.disconnect();
      audioBufferSource = null;
    }
  } catch (_) {}
  try {
    if (audioContext) {
      // 不立即关闭，以避免频繁创建销毁，可按需保持；此处选择关闭释放资源
      audioContext.close();
    }
  } catch (_) {}
  audioContext = null;
}

// 清理音频资源
function cleanupAudio() {
  if (audioPlayer) {
    audioPlayer.pause();
    // 将 src 设为 '' 会导致 NotSupportedError，所以我们只将播放器设为 null
    audioPlayer = null;
  }
  cleanupWebAudio();
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

// 监听文本选择事件
document.addEventListener('mouseup', (e) => {
  const selection = window.getSelection();
  selectedText = selection.toString().trim();
  
  if (selectedText) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const buttonX = rect.right;
    const buttonY = window.scrollY + rect.top;

    // 如果开启自动朗读则直接朗读，否则显示按钮
    chrome.storage.sync.get({ autoReadSelected: false }, (cfg) => {
      if (cfg.autoReadSelected) {
        readText(selectedText);
        hideFloatingButton();
      } else {
        showFloatingButton(buttonX, buttonY);
      }
    });
  } else {
    hideFloatingButton();
  }
});

// 点击页面其他区域时隐藏按钮
document.addEventListener('click', (e) => {
  if (floatingButton && !floatingButton.contains(e.target)) {
    hideFloatingButton();
  }
});

// 朗读文本函数
function readText(text) {
  if (!text || !text.trim()) return;
  if (isReading) {
    stopReading();
  }

  chrome.storage.sync.get({
    voice: 'default',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    autoDetectLanguage: true,
    preferredLanguage: 'zh-CN',
    useAdvancedAI: false,
    apiKey: '',
    aiProvider: 'openai',
    apiBaseUrl: 'https://api.openai.com/v1',
    aiModel: 'gpt-4o-mini-tts',
    aiVoice: 'alloy'
  }, (settings) => {
    // 优先使用高级AI
    if (settings.useAdvancedAI && settings.apiKey) {
      generateTTSViaAI(text, settings);
      return;
    }
    // 本地TTS回退
    speakWithWebSpeech(text, settings);
  });
}

function speakWithWebSpeech(text, settings) {
  cleanupAudio();
  speechUtterance = new SpeechSynthesisUtterance(text);
  speechUtterance.rate = settings.rate;
  speechUtterance.pitch = settings.pitch;
  speechUtterance.volume = settings.volume;
  if (settings.autoDetectLanguage) {
    if (/[^\x00-\x7F]/.test(text) && /[\u4e00-\u9fa5]/.test(text)) {
      speechUtterance.lang = 'zh-CN';
    } else if (/[\u4e00-\u9fa5]/.test(text)) {
      speechUtterance.lang = 'zh-CN';
    } else if (/[ぁ-んァ-ン]/.test(text)) {
      speechUtterance.lang = 'ja-JP';
    } else if (/[а-яА-Я]/.test(text)) {
      speechUtterance.lang = 'ru-RU';
    } else {
      speechUtterance.lang = 'en-US';
    }
  } else {
    speechUtterance.lang = settings.preferredLanguage;
  }
  if (settings.voice !== 'default') {
    const voices = speechSynthesis.getVoices();
    for (let i = 0; i < voices.length; i++) {
      if (voices[i].name === settings.voice) {
        speechUtterance.voice = voices[i];
        break;
      }
    }
  }
  speechUtterance.onstart = () => { isReading = true; };
  speechUtterance.onend = () => { isReading = false; };
  speechUtterance.onerror = () => { isReading = false; };
  speechSynthesis.speak(speechUtterance);
}

async function playWithWebAudio(data) {
  try {
    cleanupWebAudio();
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    let arrayBuffer;
    if (data instanceof ArrayBuffer) {
      arrayBuffer = data;
    } else if (data instanceof Blob) {
      arrayBuffer = await data.arrayBuffer();
    } else if (data && data.buffer instanceof ArrayBuffer) {
      arrayBuffer = data.buffer;
    } else {
      throw new TypeError('Unsupported audio data type for WebAudio');
    }

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioBufferSource = audioContext.createBufferSource();
    audioBufferSource.buffer = audioBuffer;
    audioBufferSource.connect(audioContext.destination);
    return new Promise((resolve, reject) => {
      audioBufferSource.onended = () => { resolve(); };
      try {
        audioBufferSource.start(0);
      } catch (e) { reject(e); }
    });
  } catch (e) {
    console.error('WebAudio 播放失败:', e);
    throw e;
  }
}

function generateTTSViaAI(text, settings) {
  cleanupAudio();
  isReading = true;
  chrome.runtime.sendMessage({ action: 'generateTTS', text }, async (resp) => {
    if (!resp || !resp.success || (!resp.audioData && !resp.audioB64)) {
      isReading = false;
      speakWithWebSpeech(text, settings);
      return;
    }
    try {
      let blob;
      const mime = resp.mimeType || 'audio/mpeg';
      if (resp.audioB64) {
        // 优先用 base64 构建 Blob，避免 ArrayBuffer 传递中的克隆问题
        const byteChars = atob(resp.audioB64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: mime });
      } else {
        const arrayBuf = resp.audioData;
        blob = new Blob([arrayBuf], { type: mime });
      }

      const url = URL.createObjectURL(blob);
      currentObjectUrl = url;
      audioPlayer = new Audio();
      audioPlayer.src = url;
      audioPlayer.onended = () => { isReading = false; cleanupAudio(); };
      audioPlayer.onerror = (e) => { 
        console.error("AI 音频播放器错误:", e);
        // 使用 WebAudio 回退（从 Blob 获取 ArrayBuffer）
        playWithWebAudio(blob).then(() => {
          isReading = false;
          cleanupAudio();
        }).catch(() => {
          isReading = false; 
          cleanupAudio();
          speakWithWebSpeech(text, settings);
        });
      };
      
      const playPromise = audioPlayer.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("AI 音频播放失败:", error);
          // 使用 WebAudio 作为回退（从 Blob 获取 ArrayBuffer）
          playWithWebAudio(blob).then(() => {
            isReading = false;
            cleanupAudio();
          }).catch(() => {
            isReading = false; 
            cleanupAudio();
            speakWithWebSpeech(text, settings);
          });
        });
      }
    } catch (e) {
      isReading = false;
      speakWithWebSpeech(text, settings);
    }
  });
}

// 停止朗读
function stopReading() {
  cleanupAudio();
  if (speechSynthesis && speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
  isReading = false;
}

// 截图功能（暂时为占位符）
function captureScreen() {
  alert('截图功能正在开发中，敬请期待！');
}

// 监听来自背景脚本与弹窗的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "readText" && request.text) {
    readText(request.text);
    sendResponse({ success: true });
  } else if (request.action === "readSelectedText") {
    const sel = window.getSelection();
    const txt = (sel && sel.toString && sel.toString().trim()) || selectedText;
    if (txt) {
      readText(txt);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: '未检测到选中文本' });
    }
  } else if (request.action === "captureScreen") {
    captureScreen();
    sendResponse({ success: true });
  } else if (request.action === "stopReading") {
    stopReading();
    sendResponse({ success: true });
  }
  return true;
});

// 初始化
createFloatingButton(); 
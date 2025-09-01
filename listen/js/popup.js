// 弹出窗口的JavaScript文件

// 获取DOM元素
const readSelectedBtn = document.getElementById('readSelected');
const readFromScreenshotBtn = document.getElementById('readFromScreenshot');
const stopReadingBtn = document.getElementById('stopReading');
const autoDetectLanguageToggle = document.getElementById('autoDetectLanguage');
const rateSlider = document.getElementById('rate');
const preferredLanguageSelect = document.getElementById('preferredLanguage');
const openOptionsLink = document.getElementById('openOptions');

// 加载用户设置
function loadSettings() {
  chrome.storage.sync.get({
    voice: 'default',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    autoDetectLanguage: true,
    preferredLanguage: 'zh-CN'
  }, (settings) => {
    // 应用设置到UI
    autoDetectLanguageToggle.checked = settings.autoDetectLanguage;
    rateSlider.value = settings.rate;
    preferredLanguageSelect.value = settings.preferredLanguage;
    
    // 如果首选语言不在列表中，添加它
    if (!Array.from(preferredLanguageSelect.options).some(option => option.value === settings.preferredLanguage)) {
      const option = document.createElement('option');
      option.value = settings.preferredLanguage;
      option.textContent = settings.preferredLanguage;
      preferredLanguageSelect.appendChild(option);
      preferredLanguageSelect.value = settings.preferredLanguage;
    }
  });
}

// 保存设置
function saveSettings() {
  chrome.storage.sync.set({
    autoDetectLanguage: autoDetectLanguageToggle.checked,
    rate: parseFloat(rateSlider.value),
    preferredLanguage: preferredLanguageSelect.value
  });
}

// 读取选中的文本
function readSelectedText() {
  // 获取当前活动标签页
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      // 向内容脚本发送消息，请求读取选中的文本
      chrome.tabs.sendMessage(tabs[0].id, { action: "readSelectedText" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('错误:', chrome.runtime.lastError);
        }
      });
    }
  });
}

// 从截图中读取文本
function readFromScreenshot() {
  // 获取当前活动标签页
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      // 向内容脚本发送消息，请求捕获屏幕
      chrome.tabs.sendMessage(tabs[0].id, { action: "captureScreen" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('错误:', chrome.runtime.lastError);
        }
      });
    }
  });
}

// 停止朗读
function stopReading() {
  // 获取当前活动标签页
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      // 向内容脚本发送消息，请求停止朗读
      chrome.tabs.sendMessage(tabs[0].id, { action: "stopReading" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('错误:', chrome.runtime.lastError);
        }
      });
    }
  });
}

// 打开选项页面
function openOptions() {
  chrome.runtime.openOptionsPage();
}

// 事件监听器
readSelectedBtn.addEventListener('click', readSelectedText);
readFromScreenshotBtn.addEventListener('click', readFromScreenshot);
stopReadingBtn.addEventListener('click', stopReading);
openOptionsLink.addEventListener('click', openOptions);

// 设置变更事件
autoDetectLanguageToggle.addEventListener('change', saveSettings);
rateSlider.addEventListener('change', saveSettings);
preferredLanguageSelect.addEventListener('change', saveSettings);

// 初始化
document.addEventListener('DOMContentLoaded', loadSettings); 
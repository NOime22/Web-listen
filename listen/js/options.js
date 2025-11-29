// 选项页面的JavaScript文件

// 获取DOM元素
const aiProviderSelect = document.getElementById('aiProvider');
const apiKeyInput = document.getElementById('apiKey');
const toggleApiKeyBtn = document.getElementById('toggleApiKey');
const apiBaseUrlInput = document.getElementById('apiBaseUrl');
const aiModelInput = document.getElementById('aiModel');
const modelSuggestions = document.getElementById('modelSuggestions');
const enableFloatingButtonToggle = document.getElementById('enableFloatingButton');
const enableOCRToggle = document.getElementById('enableOCR');
const ocrEditModeToggle = document.getElementById('ocrEditMode');
const ocrMethodSelect = document.getElementById('ocrMethod');
const ocrLanguageSelect = document.getElementById('ocrLanguage');
const testAIButton = document.getElementById('testAIButton');
const testAIResult = document.getElementById('testAIResult');
const resetBtn = document.getElementById('resetBtn');
const saveBtn = document.getElementById('saveBtn');

// 默认设置（按要求：默认 Gemini；丢弃本地TTS；自动检测语言写死为 true、无自动朗读）
import { Config } from './config.js';

const defaultSettings = Config.defaultSettings;
const providerPresets = Config.providers;

function applyPreset(provider) {
  const preset = providerPresets[provider];
  if (!preset) return;

  // Update Base URL if empty or matching another preset
  if (apiBaseUrlInput) {
    apiBaseUrlInput.value = preset.baseUrl;
  }

  // Update Model suggestions
  if (modelSuggestions && preset.models) {
    modelSuggestions.innerHTML = '';
    preset.models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      modelSuggestions.appendChild(option);
    });
  }

  // Set default model if input is empty
  if (aiModelInput && !aiModelInput.value) {
    aiModelInput.value = preset.defaultModel || '';
  }
}

// 加载设置
function loadSettings() {
  chrome.storage.sync.get(defaultSettings, (settings) => {
    if (aiProviderSelect) aiProviderSelect.value = settings.aiProvider || 'gemini';
    if (apiBaseUrlInput) apiBaseUrlInput.value = settings.apiBaseUrl || Config.providers[settings.aiProvider]?.baseUrl || '';
    if (aiModelInput) aiModelInput.value = settings.aiModel || Config.providers[settings.aiProvider]?.defaultModel || '';

    // Update suggestions based on current provider
    applyPreset(settings.aiProvider || 'gemini');
    // Restore user's specific model choice if applyPreset overwrote it (it shouldn't if we check value, but good to be safe)
    if (aiModelInput && settings.aiModel) aiModelInput.value = settings.aiModel;
    if (apiBaseUrlInput && settings.apiBaseUrl) apiBaseUrlInput.value = settings.apiBaseUrl;
    // Use the hardcoded API key from config as default if empty
    if (apiKeyInput) {
      const apiKey = settings.apiKey && settings.apiKey.trim() !== '' ? settings.apiKey : Config.defaultSettings.apiKey;
      apiKeyInput.value = apiKey || '';
    }
    if (enableFloatingButtonToggle) enableFloatingButtonToggle.checked = settings.enableFloatingButton !== false;
    if (enableOCRToggle) enableOCRToggle.checked = settings.enableOCR !== false;
    if (ocrEditModeToggle) ocrEditModeToggle.checked = settings.ocrEditMode === true;
    if (ocrMethodSelect) ocrMethodSelect.value = settings.ocrMethod || 'local';
    if (ocrLanguageSelect) ocrLanguageSelect.value = settings.ocrLanguage || 'chi_sim+eng';
  });
}

// 保存设置
function saveSettings() {
  // 根据 Model 自动补齐 Voice（无 UI，但需要存储以供后端使用）
  const provider = aiProviderSelect ? aiProviderSelect.value : 'gemini';
  // Voice is less critical now, can be handled by backend or default
  const voiceByProvider = providerPresets[provider]?.defaultVoice || 'Kore';

  const settings = {
    useAdvancedAI: true,
    aiProvider: provider,
    apiKey: apiKeyInput ? apiKeyInput.value : '',
    apiBaseUrl: apiBaseUrlInput ? apiBaseUrlInput.value : '',
    aiModel: aiModelInput ? aiModelInput.value : '',
    aiVoice: voiceByProvider,
    enableFloatingButton: enableFloatingButtonToggle ? enableFloatingButtonToggle.checked : true,
    enableOCR: enableOCRToggle ? enableOCRToggle.checked : true,
    ocrEditMode: ocrEditModeToggle ? ocrEditModeToggle.checked : false,
    ocrMethod: ocrMethodSelect ? ocrMethodSelect.value : 'local',
    ocrLanguage: ocrLanguageSelect ? ocrLanguageSelect.value : 'chi_sim+eng',
    // 保留但不在 UI 展示
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    autoDetectLanguage: true,
    preferredLanguage: 'zh-CN'
  };

  chrome.storage.sync.set(settings, () => {
    const s = document.createElement('div');
    s.textContent = '设置已保存';
    s.style.position = 'fixed';
    s.style.bottom = '20px';
    s.style.left = '50%';
    s.style.transform = 'translateX(-50%)';
    s.style.backgroundColor = '#14AE5C';
    s.style.color = '#fff';
    s.style.padding = '10px 16px';
    s.style.borderRadius = '6px';
    s.style.zIndex = '1000';
    document.body.appendChild(s);
    setTimeout(() => { document.body.removeChild(s); }, 1600);
  });
}

// 重置默认
function resetToDefaults() {
  if (!confirm('确定要重置所有设置为默认值吗？')) return;
  chrome.storage.sync.set(defaultSettings, () => {
    loadSettings();
    const r = document.createElement('div');
    r.textContent = '已重置为默认设置';
    r.style.position = 'fixed'; r.style.bottom = '20px'; r.style.left = '50%'; r.style.transform = 'translateX(-50%)';
    r.style.backgroundColor = '#FF9800'; r.style.color = '#fff'; r.style.padding = '10px 16px'; r.style.borderRadius = '6px'; r.style.zIndex = '1000';
    document.body.appendChild(r); setTimeout(() => { document.body.removeChild(r); }, 1600);
  });
}

// 连接测试（直接走 generateTTS）
function testAI() {
  if (!testAIResult) return;
  testAIResult.textContent = '测试中...';
  const t0 = performance.now();
  chrome.runtime.sendMessage({ action: 'generateTTS', text: 'Hello' }, (resp) => {
    const ms = Math.round(performance.now() - t0);
    if (!resp || !resp.success) {
      testAIResult.textContent = `失败：${resp?.error || '未知错误'}（耗时${ms}ms）`;
      testAIResult.style.color = '#d93025';
      return;
    }
    testAIResult.textContent = `成功：mime=${resp.mimeType || 'unknown'}（耗时${ms}ms）`;
    testAIResult.style.color = '#188038';
  });
}

// 事件绑定
aIProviderBind();
function aIProviderBind() {
  if (aiProviderSelect) aiProviderSelect.addEventListener('change', () => { applyPreset(aiProviderSelect.value); });
}
if (toggleApiKeyBtn) toggleApiKeyBtn.addEventListener('click', () => {
  if (!apiKeyInput) return;
  const showing = apiKeyInput.type === 'password';
  apiKeyInput.type = showing ? 'text' : 'password';
  toggleApiKeyBtn.setAttribute('aria-pressed', showing ? 'true' : 'false');
  toggleApiKeyBtn.title = showing ? '隐藏' : '显示';
});
if (saveBtn) saveBtn.addEventListener('click', saveSettings);
if (resetBtn) resetBtn.addEventListener('click', resetToDefaults);
if (testAIButton) testAIButton.addEventListener('click', testAI);

document.addEventListener('DOMContentLoaded', loadSettings); 

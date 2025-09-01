// 选项页面的JavaScript文件

// 获取DOM元素
const autoDetectLanguageToggle = document.getElementById('autoDetectLanguage');
const preferredLanguageSelect = document.getElementById('preferredLanguage');
const voiceSelect = document.getElementById('voice');
const rateSlider = document.getElementById('rate');
const rateValue = document.getElementById('rateValue');
const pitchSlider = document.getElementById('pitch');
const pitchValue = document.getElementById('pitchValue');
const volumeSlider = document.getElementById('volume');
const volumeValue = document.getElementById('volumeValue');
const useAdvancedAIToggle = document.getElementById('useAdvancedAI');
const aiProviderSelect = document.getElementById('aiProvider');
const apiKeyInput = document.getElementById('apiKey');
const toggleApiKeyBtn = document.getElementById('toggleApiKey');
const apiBaseUrlInput = document.getElementById('apiBaseUrl');
const aiVoiceInput = document.getElementById('aiVoice');
const aiLanguageCodeInput = document.getElementById('aiLanguageCode');
const enableOCRToggle = document.getElementById('enableOCR');
const autoReadSelectedToggle = document.getElementById('autoReadSelected');
const resetBtn = document.getElementById('resetBtn');
const saveBtn = document.getElementById('saveBtn');

// 默认设置
const defaultSettings = {
  voice: 'default',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  autoDetectLanguage: true,
  preferredLanguage: 'zh-CN',
  useAdvancedAI: false,
  aiProvider: 'openai',
  apiKey: '',
  apiBaseUrl: 'https://api.openai.com/v1',
  aiVoice: 'alloy',
  aiLanguageCode: 'zh-CN',
  enableOCR: true,
  autoReadSelected: false
};

// 主流AI提供商预设
const providerPresets = {
  openai: {
    apiBaseUrl: 'https://api.openai.com/v1',
    aiVoice: 'alloy',
    aiLanguageCode: ''
  },
  google: {
    apiBaseUrl: 'https://texttospeech.googleapis.com/v1',
    aiVoice: 'zh-CN-Wavenet-A',
    aiLanguageCode: 'zh-CN'
  },
  deepseek: {
    apiBaseUrl: 'https://api.deepseek.com/v1',
    aiVoice: 'zh-cn-male',
    aiLanguageCode: ''
  },
  gemini: {
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
    aiVoice: 'Kore',
    aiLanguageCode: ''
  }
};

// 根据AI提供商应用预设
function applyPreset(provider) {
  const preset = providerPresets[provider];
  if (preset) {
    if (!apiBaseUrlInput.value && preset.apiBaseUrl) {
      apiBaseUrlInput.value = preset.apiBaseUrl;
    }
    if (!aiVoiceInput.value && preset.aiVoice) {
      aiVoiceInput.value = preset.aiVoice;
    }
    if (!aiLanguageCodeInput.value && preset.aiLanguageCode) {
      aiLanguageCodeInput.value = preset.aiLanguageCode;
    }
  }
}

// 加载可用语音
function loadVoices() {
  while (voiceSelect.options.length > 1) {
    voiceSelect.remove(1);
  }
  const voices = window.speechSynthesis.getVoices();
  voices.forEach(voice => {
    const option = document.createElement('option');
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceSelect.appendChild(option);
  });
}

if ('speechSynthesis' in window) {
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
  } else {
    loadVoices();
  }
}

// 加载用户设置
function loadSettings() {
  chrome.storage.sync.get(defaultSettings, (settings) => {
    autoDetectLanguageToggle.checked = settings.autoDetectLanguage;
    preferredLanguageSelect.value = settings.preferredLanguage;

    if (settings.voice !== 'default') {
      if (!Array.from(voiceSelect.options).some(option => option.value === settings.voice)) {
        const option = document.createElement('option');
        option.value = settings.voice;
        option.textContent = settings.voice;
        voiceSelect.appendChild(option);
      }
      voiceSelect.value = settings.voice;
    }

    rateSlider.value = settings.rate; rateValue.textContent = settings.rate.toFixed(1);
    pitchSlider.value = settings.pitch; pitchValue.textContent = settings.pitch.toFixed(1);
    volumeSlider.value = settings.volume; volumeValue.textContent = settings.volume.toFixed(1);

    // 高级设置
    useAdvancedAIToggle.checked = settings.useAdvancedAI;
    aiProviderSelect.value = settings.aiProvider;
    apiKeyInput.value = settings.apiKey;
    apiBaseUrlInput.value = settings.apiBaseUrl;
    aiVoiceInput.value = settings.aiVoice;
    aiLanguageCodeInput.value = settings.aiLanguageCode;
    enableOCRToggle.checked = settings.enableOCR;
    autoReadSelectedToggle.checked = settings.autoReadSelected;

    // 切换到某个提供商时，若字段为空，自动填入预设
    if (useAdvancedAIToggle.checked) {
      applyPreset(aiProviderSelect.value);
    }

    updateUIState();
  });
}

// 更新UI状态
function updateUIState() {
  preferredLanguageSelect.disabled = autoDetectLanguageToggle.checked;
  const enabled = useAdvancedAIToggle.checked;
  aiProviderSelect.disabled = !enabled;
  apiKeyInput.disabled = !enabled;
  apiBaseUrlInput.disabled = !enabled;
  aiVoiceInput.disabled = !enabled;
  aiLanguageCodeInput.disabled = !enabled;
}

// 保存设置
function saveSettings() {
  const settings = {
    voice: voiceSelect.value,
    rate: parseFloat(rateSlider.value),
    pitch: parseFloat(pitchSlider.value),
    volume: parseFloat(volumeSlider.value),
    autoDetectLanguage: autoDetectLanguageToggle.checked,
    preferredLanguage: preferredLanguageSelect.value,
    useAdvancedAI: useAdvancedAIToggle.checked,
    aiProvider: aiProviderSelect.value,
    apiKey: apiKeyInput.value,
    apiBaseUrl: apiBaseUrlInput.value || providerPresets[aiProviderSelect.value]?.apiBaseUrl || 'https://api.openai.com/v1',
    aiVoice: aiVoiceInput.value || providerPresets[aiProviderSelect.value]?.aiVoice,
    aiLanguageCode: aiLanguageCodeInput.value || providerPresets[aiProviderSelect.value]?.aiLanguageCode || 'zh-CN',
    enableOCR: enableOCRToggle.checked,
    autoReadSelected: autoReadSelectedToggle.checked
  };
  chrome.storage.sync.set(settings, () => {
    const saveStatus = document.createElement('div');
    saveStatus.textContent = '设置已保存';
    saveStatus.style.position = 'fixed';
    saveStatus.style.bottom = '20px';
    saveStatus.style.left = '50%';
    saveStatus.style.transform = 'translateX(-50%)';
    saveStatus.style.backgroundColor = '#4CAF50';
    saveStatus.style.color = 'white';
    saveStatus.style.padding = '10px 20px';
    saveStatus.style.borderRadius = '4px';
    saveStatus.style.zIndex = '1000';
    document.body.appendChild(saveStatus);
    setTimeout(() => { document.body.removeChild(saveStatus); }, 2000);
  });
}

// 重置为默认设置
function resetToDefaults() {
  if (confirm('确定要重置所有设置为默认值吗？')) {
    chrome.storage.sync.set(defaultSettings, () => {
      loadSettings();
      const resetStatus = document.createElement('div');
      resetStatus.textContent = '已重置为默认设置';
      resetStatus.style.position = 'fixed';
      resetStatus.style.bottom = '20px';
      resetStatus.style.left = '50%';
      resetStatus.style.transform = 'translateX(-50%)';
      resetStatus.style.backgroundColor = '#FF9800';
      resetStatus.style.color = 'white';
      resetStatus.style.padding = '10px 20px';
      resetStatus.style.borderRadius = '4px';
      resetStatus.style.zIndex = '1000';
      document.body.appendChild(resetStatus);
      setTimeout(() => { document.body.removeChild(resetStatus); }, 2000);
    });
  }
}

// 切换提供商时尝试自动填充
aiProviderSelect.addEventListener('change', () => {
  if (!useAdvancedAIToggle.checked) return;
  applyPreset(aiProviderSelect.value);
});

// 切换API密钥可见性
function toggleApiKeyVisibility() {
  if (apiKeyInput.type === 'password') { apiKeyInput.type = 'text'; toggleApiKeyBtn.textContent = '🔒'; }
  else { apiKeyInput.type = 'password'; toggleApiKeyBtn.textContent = '👁️'; }
}

// 事件监听器
autoDetectLanguageToggle.addEventListener('change', updateUIState);
useAdvancedAIToggle.addEventListener('change', updateUIState);
rateSlider.addEventListener('input', () => { rateValue.textContent = parseFloat(rateSlider.value).toFixed(1); });
pitchSlider.addEventListener('input', () => { pitchValue.textContent = parseFloat(pitchSlider.value).toFixed(1); });
volumeSlider.addEventListener('input', () => { volumeValue.textContent = parseFloat(volumeSlider.value).toFixed(1); });
toggleApiKeyBtn.addEventListener('click', toggleApiKeyVisibility);
saveBtn.addEventListener('click', saveSettings);
resetBtn.addEventListener('click', resetToDefaults);

document.addEventListener('DOMContentLoaded', loadSettings); 
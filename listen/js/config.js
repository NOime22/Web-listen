export const Config = {
    defaultSettings: {
        autoDetectLanguage: true,
        useAdvancedAI: true,
        aiProvider: 'gemini',
        aiModel: 'gemini-2.0-flash-exp', // Default model
        apiKey: 'AIzaSyCS5PHtyldxjajMFaAcqXDwfWg1cqA5f7c', // User requested hardcoded key for testing
        apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
        aiVoice: 'Kore',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        preferredLanguage: 'zh-CN',
        enableOCR: true,
        enableFloatingButton: true,
        ocrMethod: 'local', // 'local' (Tesseract.js) or 'cloud' (Gemini API)
        ocrLanguage: 'chi_sim+eng', // Tesseract language: chi_sim, chi_tra, eng, or combinations
        ocrEditMode: false // Edit text before reading
    },

    providers: {
        openai: {
            baseUrl: 'https://api.openai.com/v1',
            models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
            defaultModel: 'gpt-4o',
            defaultVoice: 'alloy'
        },
        gemini: {
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
            models: ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro'],
            defaultModel: 'gemini-2.0-flash-exp',
            defaultVoice: 'Kore'
        },
        google: {
            baseUrl: 'https://texttospeech.googleapis.com/v1',
            models: ['en-US-Neural2-A', 'zh-CN-Neural2-A'], // Placeholder for Google TTS models if needed
            defaultModel: 'zh-CN-Neural2-A',
            defaultVoice: 'zh-CN-Standard-A'
        },
        custom: {
            baseUrl: '',
            models: [],
            defaultModel: '',
            defaultVoice: ''
        }
    }
};

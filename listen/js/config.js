export const Config = {
    defaultSettings: {
        autoDetectLanguage: true,
        useAdvancedAI: true,
        aiProvider: 'gemini',
        apiKey: 'AIzaSyCS5PHtyldxjajMFaAcqXDwfWg1cqA5f7c', // User requested hardcoded key for testing
        apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
        aiVoice: 'Kore',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        preferredLanguage: 'zh-CN',
        enableOCR: true,
        enableFloatingButton: true,
        ocrMethod: 'local', // 'local' (Tesseract.js) or 'cloud' (Gemini API)
        ocrLanguage: 'chi_sim+eng' // Tesseract language: chi_sim, chi_tra, eng, or combinations
    },

    providers: {
        openai: {
            baseUrl: 'https://api.openai.com/v1',
            defaultVoice: 'alloy'
        },
        gemini: {
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
            defaultVoice: 'Kore'
        },
        google: {
            baseUrl: 'https://texttospeech.googleapis.com/v1',
            defaultVoice: 'zh-CN-Standard-A'
        }
    }
};

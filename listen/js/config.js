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
        ocrLanguage: 'chi_sim+eng', // Tesseract language: chi_sim, chi_tra, eng, or combinations
        ocrEditMode: false, // Edit text before reading
        ocrModel: 'gemini-2.0-flash-exp' // Default OCR model
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
    },

    // Predefined model lists for easy selection
    ttsModels: [
        { value: 'gemini-2.5-flash-preview-tts', label: 'Gemini 2.5 Flash TTS (Preview)' },
        { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)' }
    ],

    ocrModels: [
        { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
    ]
};

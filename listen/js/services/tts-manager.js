import { GeminiTTS } from './gemini-tts.js';
import { OpenAITTS } from './openai-tts.js';
import { GoogleTTS } from './google-tts.js';

export class TTSManager {
    static createProvider(settings) {
        switch (settings.aiProvider) {
            case 'openai':
                return new OpenAITTS(settings);
            case 'google':
                return new GoogleTTS(settings);
            case 'gemini':
            default:
                return new GeminiTTS(settings);
        }
    }

    static async generate(text, settings) {
        const provider = this.createProvider(settings);
        return await provider.generate(text);
    }
}

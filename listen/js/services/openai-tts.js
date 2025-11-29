import { TTSProvider } from './tts-provider.js';
import { fetchWithTimeout } from '../utils.js';

export class OpenAITTS extends TTSProvider {
    async generate(text) {
        this.validate();
        const url = `${this.settings.apiBaseUrl}/audio/speech`;

        const resp = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.settings.apiKey}`
            },
            body: JSON.stringify({
                model: 'tts-1',
                voice: this.settings.aiVoice || 'alloy',
                input: text,
                format: 'mp3'
            })
        });

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`OpenAI TTS失败: ${resp.status} ${errText}`);
        }

        const arrayBuf = await resp.arrayBuffer();
        return {
            audioData: arrayBuf,
            mimeType: 'audio/mpeg'
        };
    }
}

import { TTSProvider } from './tts-provider.js';
import { fetchWithTimeout } from '../utils.js';

export class GoogleTTS extends TTSProvider {
    async generate(text) {
        this.validate();
        const base = this.settings.apiBaseUrl || 'https://texttospeech.googleapis.com/v1';
        const url = `${base}/text:synthesize?key=${encodeURIComponent(this.settings.apiKey)}`;

        const payload = {
            input: { text },
            voice: {
                languageCode: this.settings.aiLanguageCode || 'zh-CN',
                name: this.settings.aiVoice || undefined
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: Math.min(2.0, Math.max(0.25, this.settings.rate)),
                pitch: Math.min(20.0, Math.max(-20.0, (this.settings.pitch - 1.0) * 20))
            }
        };

        const resp = await fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`Google TTS失败: ${resp.status} ${errText}`);
        }

        const data = await resp.json();
        if (!data.audioContent) {
            throw new Error('Google返回缺少audioContent');
        }

        // Convert Base64 to ArrayBuffer
        const binary = atob(data.audioContent);
        const len = binary.length;
        const buf = new Uint8Array(len);
        for (let i = 0; i < len; i++) buf[i] = binary.charCodeAt(i);

        return {
            audioData: buf.buffer,
            mimeType: 'audio/mpeg'
        };
    }
}

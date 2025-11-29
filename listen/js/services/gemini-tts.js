import { TTSProvider } from './tts-provider.js';
import { fetchWithTimeout, bufferToBase64 } from '../utils.js';

export class GeminiTTS extends TTSProvider {
    async generate(text) {
        this.validate();
        const base = (this.settings.apiBaseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
        // Handle both full URL and base URL cases roughly, but Config has the full URL for Gemini usually
        // If the user provided URL contains 'generateContent', use it as is.
        let url = base;
        if (!url.includes('generateContent')) {
            // Fallback or construct if needed
            url = `${base}/models/gemini-2.5-flash-preview-tts:generateContent`;
        }

        const body = {
            contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: this.settings.aiVoice || 'Kore' }
                    }
                }
            }
        };

        const resp = await fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.settings.apiKey },
            body: JSON.stringify(body)
        });

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`Gemini TTS失败: ${resp.status} ${errText}`);
        }

        const data = await resp.json();
        let b64 = null;
        try {
            const candidates = data.candidates || [];
            for (const c of candidates) {
                const parts = (c.content && c.content.parts) || [];
                for (const p of parts) {
                    if (p.inlineData && p.inlineData.data) { b64 = p.inlineData.data; break; }
                    if (p.audio && p.audio.data) { b64 = p.audio.data; break; }
                }
                if (b64) break;
            }
        } catch (_) { }

        if (!b64) throw new Error('Gemini返回中未找到音频数据');

        // Convert raw PCM (from Gemini) to WAV for browser compatibility
        // Gemini returns: 24kHz, 1 channel, 16-bit PCM (usually)
        // We need to wrap it in a WAV header
        const pcmData = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const wavBuffer = this.createWavHeader(pcmData);

        return {
            audioB64: bufferToBase64(wavBuffer),
            mimeType: 'audio/wav'
        };
    }

    createWavHeader(pcmData) {
        const numChannels = 1;
        const sampleRate = 24000;
        const bytesPerSample = 2;
        const dataSize = pcmData.length;
        const headerSize = 44;
        const wavBuffer = new ArrayBuffer(headerSize + dataSize);
        const view = new DataView(wavBuffer);

        function writeStr(offset, str) { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); }

        let offset = 0;
        writeStr(offset, 'RIFF'); offset += 4;
        view.setUint32(offset, 36 + dataSize, true); offset += 4;
        writeStr(offset, 'WAVE'); offset += 4;
        writeStr(offset, 'fmt '); offset += 4;
        view.setUint32(offset, 16, true); offset += 4;
        view.setUint16(offset, 1, true); offset += 2;
        view.setUint16(offset, numChannels, true); offset += 2;
        view.setUint32(offset, sampleRate, true); offset += 4;
        view.setUint32(offset, sampleRate * numChannels * bytesPerSample, true); offset += 4;
        view.setUint16(offset, numChannels * bytesPerSample, true); offset += 2;
        view.setUint16(offset, 8 * bytesPerSample, true); offset += 2;
        writeStr(offset, 'data'); offset += 4;
        view.setUint32(offset, dataSize, true); offset += 4;

        new Uint8Array(wavBuffer).set(pcmData, headerSize);
        return wavBuffer;
    }
}

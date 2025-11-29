export class TTSProvider {
    constructor(settings) {
        this.settings = settings;
    }

    async generate(text) {
        throw new Error('Method not implemented');
    }

    validate() {
        if (!this.settings.apiKey) {
            throw new Error('缺少API密钥');
        }
    }
}

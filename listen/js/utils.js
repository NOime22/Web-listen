export async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 20000, ...rest } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort('timeout'), timeout);
    try {
        const response = await fetch(resource, { ...rest, signal: controller.signal });
        return response;
    } finally {
        clearTimeout(id);
    }
}

export function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

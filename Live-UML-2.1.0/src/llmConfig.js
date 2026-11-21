const crypto = require('crypto');
const http = require('http');
const https = require('https');

// These are presets for OpenAI-compatible Chat Completions, not native Anthropic APIs.
const PROVIDERS = {
    deepseek: { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-flash' },
    openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: '' },
    openrouter: { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: '' },
    ollama: { label: 'Ollama (local)', baseUrl: 'http://127.0.0.1:11434/v1', model: '' },
    lmstudio: { label: 'LM Studio (local)', baseUrl: 'http://127.0.0.1:1234/v1', model: '' },
    custom: { label: 'Custom (OpenAI-compatible)', baseUrl: '', model: '' }
};

function normalizeBaseUrl(value) {
    let url;
    try { url = new URL(String(value || '').trim()); }
    catch { throw new Error('Enter a valid HTTP or HTTPS base URL.'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Base URL must use HTTP or HTTPS.');
    if (url.username || url.password || url.search || url.hash) throw new Error('Do not put credentials, query parameters, or fragments in the base URL.');
    if (/\/(chat\/completions|models)\/?$/.test(url.pathname)) throw new Error('Enter the base URL, not the /chat/completions or /models endpoint.');
    return url.href.replace(/\/+$/, '');
}

function secretName(baseUrl) {
    return 'liveUml.llm.apiKey:' + crypto.createHash('sha256').update(normalizeBaseUrl(baseUrl)).digest('hex');
}

function isLocalEndpoint(baseUrl) {
    try { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseUrl).hostname); }
    catch { return false; }
}

function isDeepSeekEndpoint(baseUrl) {
    try { return ['https://api.deepseek.com', 'https://api.deepseek.com/v1'].includes(normalizeBaseUrl(baseUrl)); }
    catch { return false; }
}

function inferProvider(baseUrl) {
    try {
        const normalized = normalizeBaseUrl(baseUrl);
        return Object.keys(PROVIDERS).find(key => PROVIDERS[key].baseUrl === normalized) || 'custom';
    } catch { return 'custom'; }
}

function validateConnection(settings, requireModel = true) {
    const provider = String(settings.llmProvider || 'custom');
    if (!Object.prototype.hasOwnProperty.call(PROVIDERS, provider)) throw new Error('Choose a supported provider preset or Custom.');
    const baseUrl = normalizeBaseUrl(settings.llmBaseUrl);
    const model = String(settings.llmModel || '').trim();
    if (requireModel && !model) throw new Error('Enter a model ID, or use Test connection to load the available models.');
    const timeoutMs = Number(settings.llmTimeoutMs);
    if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) throw new Error('Timeout must be between 1000 and 120000 milliseconds.');
    return { provider, baseUrl, model, timeoutMs };
}

function testConnection({ baseUrl, apiKey, timeoutMs = 15000 }) {
    const normalized = normalizeBaseUrl(baseUrl);
    if (!apiKey && !isLocalEndpoint(normalized)) return Promise.reject(new Error('Enter an API key for this endpoint. Keys are not shared between providers.'));
    return new Promise((resolve, reject) => {
        const url = new URL(normalized + '/models');
        const lib = url.protocol === 'http:' ? http : https;
        let timer;
        const finish = (error, result) => { clearTimeout(timer); error ? reject(error) : resolve(result); };
        // Deliberately do not follow redirects carrying an Authorization header.
        const request = lib.get(url, { headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {} }, response => {
            let data = '';
            response.setEncoding('utf8');
            response.on('data', chunk => {
                data += chunk;
                if (data.length > 2 * 1024 * 1024) request.destroy(new Error('Model list response is too large.'));
            });
            response.on('error', error => finish(error));
            response.on('aborted', () => finish(new Error('Connection test response was interrupted.')));
            response.on('end', () => {
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    finish(new Error(`HTTP ${response.statusCode}. Check the base URL, provider, and API key.`));
                    return;
                }
                try {
                    const payload = JSON.parse(data);
                    if (!Array.isArray(payload.data)) throw new Error('Model list is not OpenAI-compatible. Check the base URL.');
                    const models = [...new Set(payload.data.map(item => item?.id)
                        .filter(id => typeof id === 'string' && id.length <= 200 && (!apiKey || !id.includes(apiKey))))].sort().slice(0, 500);
                    finish(null, { models, message: `Connected. Found ${models.length} available model IDs.` });
                } catch (error) { finish(new Error(error instanceof SyntaxError ? 'Endpoint did not return a JSON model list.' : error.message)); }
            });
        });
        request.on('error', error => finish(new Error(String(error.message).split(apiKey || '\0').join('[redacted]'))));
        timer = setTimeout(() => request.destroy(new Error('Connection test timed out. Check whether the server is running.')), timeoutMs);
    });
}

module.exports = { PROVIDERS, normalizeBaseUrl, secretName, isLocalEndpoint, isDeepSeekEndpoint, inferProvider, validateConnection, testConnection };

/**
 * summaries.js — one small-LLM call per function, cached by content hash.
 *
 * Talks to any OpenAI-compatible /chat/completions endpoint: DeepSeek,
 * LM Studio (http://127.0.0.1:1234/v1), Ollama (/v1), OpenAI.
 * Uses node:http/https so it runs on VS Code's bundled Node without fetch.
 */
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { isLocalEndpoint } = require('./llmConfig');

const cache = new Map(); // hash -> result
const MAX_CACHE = 500;

const SYSTEM_PROMPT =
    'You explain code to a developer looking at a call/flow diagram. ' +
    'Answer with ONE JSON object and nothing else: ' +
    '{"summary": string, "inputs": string[], "output": string}. ' +
    '"summary" is at most 30 words, plain language, says what the function does and on what data. ' +
    '"inputs" lists each parameter as "name: type" using the type visible in code; write "untyped" when none is given. ' +
    '"output" is the return type, or "none" when the function returns nothing. ' +
    'Never invent identifiers, types or behaviour that the code does not show. ' +
    'When docs are supplied for a call, describe that call with the documented meaning.';

function hashOf({ name, body, language, docs }) {
    return crypto.createHash('sha256').update(`${language}\0${name}\0${body}\0${docs || ''}`).digest('hex');
}

function extractImports(source) {
    const out = [];
    for (const line of source.split('\n')) {
        const t = line.trim();
        if (/^(import|from|#include|require|const .*require\()/.test(t)) out.push(t);
        if (out.length >= 20) break;
    }
    return out.join('\n');
}

function postJson(urlStr, headers, payload, timeoutMs, signal) {
    return new Promise((resolve, reject) => {
        let url;
        try { url = new URL(urlStr); } catch { reject(new Error('Invalid summary endpoint URL')); return; }
        if (!['http:', 'https:'].includes(url.protocol)) { reject(new Error('Summary endpoint must use HTTP or HTTPS')); return; }
        if (signal?.aborted) { reject(new Error('Request aborted')); return; }
        const lib = url.protocol === 'http:' ? http : https;
        const body = Buffer.from(JSON.stringify(payload), 'utf8');
        let timer;
        const finish = (error, value) => {
            clearTimeout(timer);
            signal?.removeEventListener('abort', abort);
            if (error) reject(error); else resolve(value);
        };
        const req = lib.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': body.length, ...headers }
        }, (res) => {
            let data = '';
            res.setEncoding('utf8');
            res.on('data', chunk => {
                data += chunk;
                if (data.length > 1024 * 1024) req.destroy(new Error('Summary response exceeds 1 MB'));
            });
            res.on('error', error => finish(error));
            res.on('aborted', () => finish(new Error('Summary response interrupted')));
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) finish(null, data);
                else finish(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
            });
        });
        const abort = () => req.destroy(new Error('Request aborted'));
        req.on('error', error => finish(error));
        // A socket inactivity timeout resets on keep-alive whitespace; use a wall-clock deadline.
        timer = setTimeout(() => req.destroy(new Error('Request timeout')), timeoutMs || 30000);
        signal?.addEventListener('abort', abort, { once: true });
        req.end(body);
    });
}

/** Strip ```json fences and parse; fall back to treating the text as the summary. */
function parseCompletion(raw) {
    let payload;
    try {
        payload = JSON.parse(raw);
    } catch {
        throw new Error('Endpoint did not return a chat completion');
    }
    const message = payload?.choices?.[0]?.message ?? {};
    // Thinking models (Qwen3-style) may leave `content` empty and put the chain of
    // thought in `reasoning_content`. A JSON object inside it is still usable; the
    // raw reasoning never is — it must not end up in the panel.
    const content = String(message.content || '').trim();
    const reasoning = String(message.reasoning_content || '').trim();
    const text = (content || reasoning)
        .replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const candidates = text.match(/\{[\s\S]*?\}(?=[^{}]*$)|{[^{}]*}/g) || [];
    for (let i = candidates.length - 1; i >= 0; i--) {
        try {
            const obj = JSON.parse(candidates[i]);
            if (obj && typeof obj === 'object' && obj.summary) {
                return {
                    summary: String(obj.summary).trim(),
                    inputs: Array.isArray(obj.inputs) ? obj.inputs.map(String) : [],
                    output: String(obj.output || '').trim()
                };
            }
        } catch { /* not the object we want */ }
    }
    if (!content) return null;   // reasoning-only reply: no usable summary
    return { summary: content, inputs: [], output: '' };
}

/**
 * @param {{name:string, body:string, language:string, imports?:string,
 *          config:{enabled:boolean, baseUrl:string, model:string, apiKey:string}}} args
 * @returns {Promise<null|{summary:string, inputs:string[], output:string, cached?:boolean}>}
 */
async function summarize({ name, body, language, imports, docs, config, force = false, signal }) {
    if (!config || !config.enabled || !config.baseUrl || !config.model) return null;
    if (!config.apiKey && !isLocalEndpoint(config.baseUrl)) return null;
    if (!body || !body.trim()) return null;

    const key = hashOf({ name, body, language, docs }) + crypto.createHash('sha256')
        .update(JSON.stringify([imports || '', config.baseUrl, config.model, config.apiKey])).digest('hex');
    if (!force && cache.has(key)) return { ...cache.get(key), cached: true };

    const userPrompt =
        `Language: ${language}\n` +
        (imports ? `Imports:\n${imports}\n` : '') +
        (docs ? `Docs for called symbols:\n${docs.slice(0, 2000)}\n` : '') +
        `Function:\n${body.slice(0, 4000)}`;

    const raw = await postJson(
        config.baseUrl.replace(/\/$/, '') + '/chat/completions',
        config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
        {
            model: config.model,
            temperature: 0.2,
            max_tokens: 900,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
            ]
        },
        config.timeoutMs || 30000,
        signal
    );

    const result = parseCompletion(raw);
    if (!result) return null;
    if (result.summary) {
        if (cache.size >= MAX_CACHE) cache.clear(); // ponytail: whole-cache flush, LRU only if hit rate matters
        cache.set(key, result);
    }
    return result;
}

function clearCache() { cache.clear(); }

module.exports = { summarize, clearCache, extractImports, parseCompletion, hashOf, postJson };

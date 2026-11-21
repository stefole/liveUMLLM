const crypto = require('crypto');
const { postJson } = require('./summaries');
const { isLocalEndpoint } = require('./llmConfig');

const cache = new Map();
const MAX_CACHE = 100;
const PROMPT = 'You review source code together with its generated UML diagram. ' +
    'Find only concrete, defensible algorithmic or performance inefficiencies visible in BOTH the code and the diagram: ' +
    'work repeated inside a loop that does not depend on the loop variable, recomputing a constant or buffer every iteration, ' +
    'quadratic scans where a set/map would do, repeated I/O or allocations in a hot loop, unnecessary re-sorting, or redundant passes. ' +
    'Do not invent problems, do not comment on style, naming, missing error handling, or micro-optimizations. ' +
    'In a whole-file diagram, if repeated work happens inside a caller function, prefer the caller function label when it exists. ' +
    'Answer with ONE JSON object and nothing else: ' +
    '{"summary": string, "issues": [{"label": string, "severity": "high"|"medium"|"low", "title": string, ' +
    '"explanation": string, "line": number|null, "suggestion": string}]}. ' +
    '"summary" is at most 40 words. Each issue label MUST be copied verbatim from the provided diagram label list; ' +
    'if no label fits, omit the issue. "line" is the displayed source line number, or null if not localizable. ' +
    'Explanation is at most 60 words and names the repeated work and why it costs. Suggestion is concrete and at most 40 words. ' +
    'Return an empty issues array when the code is already reasonable. ' +
    'Return only the JSON object — no markdown fences, preamble, or prose. Keep summary under 30 words.';

function hashOf(input) {
    return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

function extractLabels(diagramCode, mode) {
    const labels = new Set();
    const add = value => {
        const text = String(value || '').replace(/\\n/g, ' ').trim();
        if (text && text.length <= 200 && !/^(start|stop|end|yes|no)$/i.test(text)) labels.add(text);
    };
    const source = String(diagramCode || '');
    if (mode === 'mermaid') {
        for (const match of source.matchAll(/\["?([^"\]]+)"?\]|\{["']?([^}"']+)["']?\}|\(\(([^)]+)\)\)/g)) {
            add(match[1] || match[2] || match[3]);
        }
    } else {
        for (const match of source.matchAll(/^\s*:([^;]+);/gm)) add(match[1]);
        for (const match of source.matchAll(/^\s*(?:if|elseif)\s*\(([^)]+)\)/gm)) add(match[1]);
        for (const match of source.matchAll(/(?:rectangle|card|node|usecase)\s+"([^"]+)"/g)) add(match[1]);
        for (const match of source.matchAll(/^\s*(?:class|interface|enum)\s+(\w+)/gm)) add(match[1]);
    }
    return [...labels].slice(0, 120);
}

function parseAnalysis(raw) {
    let payload;
    try { payload = JSON.parse(raw); } catch { throw new Error('Endpoint did not return a chat completion'); }
    const message = payload?.choices?.[0]?.message ?? {};
    const text = String(message.content || message.reasoning_content || '')
        .replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    let object = null;
    const candidates = text.match(/\{[\s\S]*\}(?=[^{}]*$)|{[^{}]*}/g) || [];
    for (let i = candidates.length - 1; i >= 0 && !object; i--) {
        try { const parsed = JSON.parse(candidates[i]); if (parsed && Array.isArray(parsed.issues)) object = parsed; }
        catch { /* keep looking */ }
    }
    if (!object) throw new Error('Model response was not a JSON analysis object');
    const severities = new Set(['high', 'medium', 'low']);
    const issues = object.issues.slice(0, 8).map((issue, index) => ({
        id: 'issue-' + index,
        label: String(issue.label || '').trim(),
        severity: severities.has(issue.severity) ? issue.severity : 'medium',
        title: String(issue.title || 'Potential inefficiency').trim().slice(0, 160),
        explanation: String(issue.explanation || '').trim().slice(0, 900),
        suggestion: String(issue.suggestion || '').trim().slice(0, 500),
        line: Number.isInteger(issue.line) && issue.line > 0 ? issue.line : null
    })).filter(issue => issue.label && issue.explanation);
    return { summary: String(object.summary || '').trim().slice(0, 600), issues };
}

async function analyze({ code, diagramCode, mode, labels, config, signal, force = false }) {
    if (!config?.enabled || !config.baseUrl || !config.model) return null;
    if (!config.apiKey && !isLocalEndpoint(config.baseUrl)) return null;
    const labelList = labels && labels.length ? labels : extractLabels(diagramCode, mode);
    if (!code?.trim() || !labelList.length) return null;
    const cacheKey = hashOf({ v: 1, code, diagramCode, mode, model: config.model, baseUrl: config.baseUrl });
    if (!force && cache.has(cacheKey)) return cache.get(cacheKey);
    const user = `Language: ${config.language || 'unknown'}\n` +
        `Diagram labels (use these exact strings for "label"):\n${labelList.map(label => `- ${label}`).join('\n')}\n\n` +
        `Diagram source:\n${String(diagramCode).slice(0, 5000)}\n\n` +
        `Code with file line numbers:\n${code.slice(0, 8000)}`;
    const send = (system, maxTokens) => postJson(config.baseUrl.replace(/\/$/, '') + '/chat/completions',
        config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
        { model: config.model, temperature: 0, max_tokens: maxTokens, response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }] },
        config.timeoutMs || 30000, signal);
    let result;
    try {
        result = parseAnalysis(await send(PROMPT, 1200));
    } catch (error) {
        if (!/JSON analysis object|chat completion/.test(error.message)) throw error;
        // Reasoning-heavy models occasionally exhaust the token budget before the
        // closing brace. Retry once with a larger budget and a minimal instruction.
        const retrySystem = 'Return only one valid JSON object: {"summary": string, "issues": [...]}. ' +
            'No prose, no markdown. Keep it under 250 words total.';
        result = parseAnalysis(await send(retrySystem, 2200));
    }
    if (cache.size >= MAX_CACHE) cache.clear();
    cache.set(cacheKey, result);
    return result;
}

function clearCache() { cache.clear(); }

module.exports = { analyze, parseAnalysis, extractLabels, clearCache };

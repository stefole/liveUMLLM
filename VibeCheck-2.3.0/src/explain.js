const crypto = require('crypto');
const { postJson } = require('./summaries');
const { isLocalEndpoint } = require('./llmConfig');

const CATEGORIES = ['compute', 'decision', 'loop', 'io', 'return'];
const cache = new Map();
const MAX_CACHE = 80;

const PROMPT = 'You turn source code into a plain, readable flow diagram for a developer. ' +
    'Do NOT use UML notation: no diamonds, no start/end dots, no swimlanes, no activity syntax. ' +
    'Use only rounded boxes and arrows. ' +
    'Every arrow MUST carry an edge label (-->|"short reason"|) explaining why that transition happens. ' +
    'Produce a Mermaid "flowchart TD" with 4-10 nodes: each node is N#("a short phrase describing that step\'s purpose"), ' +
    'and edges are N# -->|"short reason"| N#. ' +
    'Answer with ONE JSON object and nothing else: ' +
    '{"mermaid": string, "components": [{"id":"N1","label":"...","explanation":"one or two sentences explaining this step and the data it touches",' +
    '"category":"compute|decision|loop|io|return","line":number|null}]}. ' +
    'Node labels stay under 8 words and name what the code does, not variable names. ' +
    'Do not include classDef, style, or markdown fences. Each component id must match a node in the mermaid string. ' +
    'Return only JSON.';

function hashOf(input) {
    return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

function parseExplain(raw) {
    let payload;
    try { payload = JSON.parse(raw); } catch { throw new Error('Endpoint did not return a chat completion'); }
    const message = payload?.choices?.[0]?.message ?? {};
    const text = String(message.content || message.reasoning_content || '')
        .replace(/^```(?:json|mermaid)?/i, '').replace(/```$/, '').trim();
    let object = null;
    const candidates = text.match(/\{[\s\S]*\}(?=[^{}]*$)|{[^{}]*}/g) || [];
    for (let i = candidates.length - 1; i >= 0 && !object; i--) {
        try {
            const parsed = JSON.parse(candidates[i]);
            if (parsed && typeof parsed.mermaid === 'string' && Array.isArray(parsed.components)) object = parsed;
        } catch { /* keep looking */ }
    }
    if (!object) throw new Error('Model response was not a JSON explain object');
    const mermaid = String(object.mermaid).replace(/^```(?:mermaid)?\s*/i, '').replace(/```\s*$/, '').trim();
    if (!/flowchart/.test(mermaid)) throw new Error('Explain result was not a flowchart');
    const components = object.components.slice(0, 12).map(component => ({
        id: String(component.id || '').trim(),
        label: String(component.label || '').trim().slice(0, 160),
        explanation: String(component.explanation || '').trim().slice(0, 900),
        category: CATEGORIES.includes(component.category) ? component.category : 'compute',
        line: Number.isInteger(component.line) && component.line > 0 ? component.line : null
    })).filter(component => component.id && component.label);
    return { mermaid, components };
}

async function explain({ code, name, language, config, signal, force = false }) {
    if (!config?.enabled || !config.baseUrl || !config.model) return null;
    if (!config.apiKey && !isLocalEndpoint(config.baseUrl)) return null;
    if (!code?.trim()) return null;
    const cacheKey = hashOf({ v: 1, code, model: config.model, baseUrl: config.baseUrl });
    if (!force && cache.has(cacheKey)) return cache.get(cacheKey);
    const user = `Language: ${language}\nFunction or file: ${name}\n\nCode with file line numbers:\n${code.slice(0, 8000)}`;
    const raw = await postJson(config.baseUrl.replace(/\/$/, '') + '/chat/completions',
        config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
        { model: config.model, temperature: 0.2, max_tokens: 1400, response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: PROMPT }, { role: 'user', content: user }] },
        config.timeoutMs || 30000, signal);
    const result = parseExplain(raw);
    if (cache.size >= MAX_CACHE) cache.clear();
    cache.set(cacheKey, result);
    return result;
}

function clearCache() { cache.clear(); }

module.exports = { explain, parseExplain, clearCache, CATEGORIES };

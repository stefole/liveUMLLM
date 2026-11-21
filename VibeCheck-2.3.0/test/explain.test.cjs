const test = require('node:test');
const assert = require('node:assert');
const { parseExplain } = require('../src/explain');

test('parseExplain accepts a clean OpenAI-style completion', () => {
    const result = parseExplain(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
            mermaid: 'flowchart TD\nN1("compute") -->|"then"| N2("decide")',
            components: [
                { id: 'N1', label: 'compute', explanation: 'does the work', category: 'compute', line: 3 },
                { id: 'N2', label: 'decide', explanation: 'branches', category: 'decision', line: null }
            ]
        }) } }]
    }));
    assert.match(result.mermaid, /flowchart/);
    assert.strictEqual(result.components.length, 2);
    assert.strictEqual(result.components[0].category, 'compute');
    assert.strictEqual(result.components[0].line, 3);
    assert.strictEqual(result.components[1].line, null);
});

test('parseExplain tolerates markdown fences and stray text', () => {
    const result = parseExplain(JSON.stringify({
        choices: [{ message: { content: '```json\n' + JSON.stringify({
            mermaid: '```mermaid\nflowchart TD\nN1("a") -->|"why"| N2("b")\n```',
            components: [{ id: 'N1', label: 'a', explanation: 'x', category: 'io', line: 1 }]
        }) + '\n```' } }]
    }));
    assert.match(result.mermaid, /flowchart/);
    assert.strictEqual(result.components[0].category, 'io');
});

test('parseExplain rejects non-flowchart output', () => {
    assert.throws(() => parseExplain(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ mermaid: 'classDiagram\nA', components: [] }) } }]
    })), /flowchart/);
});

test('parseExplain clamps unknown categories to compute', () => {
    const result = parseExplain(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
            mermaid: 'flowchart TD\nN1("a")',
            components: [{ id: 'N1', label: 'a', explanation: 'x', category: 'banana', line: 5 }]
        }) } }]
    }));
    assert.strictEqual(result.components[0].category, 'compute');
});

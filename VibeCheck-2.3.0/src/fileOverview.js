const path = require('path');

function signatureOf(func) {
    return String(func.body || '').split('\n')[0].trim().slice(0, 160);
}

function escapeLabel(text) {
    return String(text).replace(/"/g, "'").replace(/[\r\n]+/g, ' ');
}

function buildFileOverview(functions, { mode, fileName }) {
    const nodes = [];
    const seen = new Map();
    for (const func of functions) {
        const base = func.name;
        const count = (seen.get(base) || 0) + 1;
        seen.set(base, count);
        nodes.push({ name: base, label: count === 1 ? base : `${base} (${count})`,
            line: func.startLine + 1, signature: signatureOf(func) });
    }
    const byName = new Map();
    for (const node of nodes) if (!byName.has(node.name)) byName.set(node.name, node);
    const edges = [];
    const names = [...byName.keys()].filter(name => /^[A-Za-z_$][\w$]*$/.test(name));
    functions.forEach((func, index) => {
        const source = String(func.body || '');
        const from = nodes[index];
        if (!from) return;
        for (const name of names) {
            if (name === func.name) continue;
            const called = new RegExp(`(^|[^\\w$.])${name.replace(/[$]/g, '\\$')}\\s*\\(`).test(source);
            if (called) edges.push({ from: from.label, to: byName.get(name).label });
        }
    });
    const title = escapeLabel(fileName || path.basename(fileName || 'file'));
    let code;
    if (mode === 'mermaid') {
        const lines = ['---', `title: ${title}`, '---', 'flowchart TD'];
        for (const node of nodes) lines.push(`  ${idOf(node.label)}["${escapeLabel(node.label)}"]`);
        for (const edge of edges) lines.push(`  ${idOf(edge.from)} --> ${idOf(edge.to)}`);
        code = lines.join('\n');
    } else {
        const lines = ['@startuml', '!pragma layout smetana', 'top to bottom direction', 'skinparam backgroundColor #FEFEFE',
            'skinparam rectangleBackgroundColor #E8F4FD', 'skinparam rectangleBorderColor #2980b9',
            'skinparam arrowColor #2980b9', 'skinparam defaultFontSize 14', 'skinparam rectangleFontSize 14', `title ${title}`];
        for (const node of nodes) lines.push(`rectangle "${escapeLabel(node.label)}" as ${idOf(node.label)}`);
        // Chain invisible down-links so the sidebar gets a vertical overview even
        // when functions do not call each other.
        for (let i = 0; i + 1 < nodes.length; i++) lines.push(`${idOf(nodes[i].label)} -[hidden]down-> ${idOf(nodes[i + 1].label)}`);
        for (const edge of edges) lines.push(`${idOf(edge.from)} --> ${idOf(edge.to)}`);
        code = lines.join('\n') + '\n@enduml';
    }
    return { code, nodes: nodes.map(({ name, label, line, signature }) => ({ name, label, line, signature })) };
}

function idOf(label) {
    return 'F' + require('crypto').createHash('md5').update(String(label)).digest('hex').slice(0, 8);
}

module.exports = { buildFileOverview };

const core = require('./core');

/**
 * Map diagram labels back to source lines so the webview can show hover docs and
 * jump to code. Labels are the statement text the diagram providers emit; keep
 * several variants because providers may trim or transform values.
 */
function buildCodeMap(func, language, document, maxEntries = 60) {
    const entries = [];
    const sourceText = String(func.rawBody || func.body || '');
    let statements = [];
    try { statements = core.extractStatements(sourceText, language) || []; } catch { statements = []; }
    const seen = new Set();
    for (const statement of statements) {
        if (!statement || !Number.isInteger(statement.line)) continue;
        const line = func.startLine + statement.line - 1;
        if (line < 0) continue;
        const text = document && line < document.lineCount ? document.lineAt(line).text.trim() : '';
        const labels = [statement.raw, statement.value, text]
            .filter(value => typeof value === 'string')
            .map(value => value.trim().replace(/;$/, ''))
            .filter(value => value.length >= 3);
        const key = line + '\0' + labels[0];
        if (!labels.length || seen.has(key)) continue;
        seen.add(key);
        entries.push({ labels, line, text: text || labels[0] });
        if (entries.length >= maxEntries) break;
    }
    return entries;
}

module.exports = { buildCodeMap };

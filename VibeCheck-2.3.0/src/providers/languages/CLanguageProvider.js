const BaseLanguageProvider = require('./BaseLanguageProvider');

class CLanguageProvider extends BaseLanguageProvider {
    constructor() {
        super('c');
    }

    processPreprocessor(code) {
        const lines = code.split('\n');
        const result = [];
        const stack = [];
        let skipDepth = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            if (trimmed.startsWith('#if ') || trimmed.startsWith('#if\t')) {
                const condition = trimmed.substring(3).trim();
                const isTrue = condition === '1' || condition === 'true';
                if (skipDepth > 0) { skipDepth++; stack.push({ type: 'if', active: false, hasActiveBranch: false }); }
                else { const active = isTrue; stack.push({ type: 'if', active, hasActiveBranch: active }); if (!active) skipDepth = 1; }
                result.push('');
                continue;
            }
            if (trimmed.startsWith('#ifdef ')) {
                if (skipDepth > 0) { skipDepth++; stack.push({ type: 'ifdef', active: false, hasActiveBranch: false }); }
                else { stack.push({ type: 'ifdef', active: true, hasActiveBranch: true }); }
                result.push('');
                continue;
            }
            if (trimmed.startsWith('#ifndef ')) {
                if (skipDepth > 0) { skipDepth++; stack.push({ type: 'ifndef', active: false, hasActiveBranch: false }); }
                else { stack.push({ type: 'ifndef', active: true, hasActiveBranch: true }); }
                result.push('');
                continue;
            }
            if (trimmed.startsWith('#elif ')) {
                if (stack.length > 0) {
                    const top = stack[stack.length - 1];
                    if (skipDepth > 0) { if (!top.hasActiveBranch) { top.active = true; top.hasActiveBranch = true; skipDepth = 0; } }
                    else { top.active = false; skipDepth = 1; }
                }
                result.push('');
                continue;
            }
            if (trimmed.startsWith('#else')) {
                if (stack.length > 0) {
                    const top = stack[stack.length - 1];
                    if (skipDepth > 0) { if (!top.hasActiveBranch) { top.active = true; top.hasActiveBranch = true; skipDepth = 0; } }
                    else { top.active = false; skipDepth = 1; }
                }
                result.push('');
                continue;
            }
            if (trimmed.startsWith('#endif')) {
                if (stack.length > 0) { const top = stack.pop(); if (skipDepth > 0 && !top.active) skipDepth--; }
                result.push('');
                continue;
            }
            if (trimmed.startsWith('#')) { result.push(''); continue; }
            result.push(skipDepth === 0 ? line : '');
        }
        return result.join('\n');
    }

    parseFunctions(sourceCode) {
        const processedCode = this.processPreprocessor(sourceCode);
        return super.parseFunctions(processedCode);
    }

    matchFunctionStart(line) {
        const trimmed = line.trim();
        if (/^\s*(if|else|while|for|switch|return|typedef|struct|union|enum|#)/.test(trimmed)) return null;

        const keywords = ['if', 'else', 'while', 'for', 'switch', 'return', 'sizeof', 'typedef'];
        
        // Inline function: void test() { or int* getName() { or void change(int s) { current = s; }
        // Capture group 1 is the function name, but for pointer returns like "byte *funcName()",
        // the * may be captured. We strip leading * from the captured name.
        const funcPattern = /^[\w\s*]+\s+(\*?\w+)\s*\([^)]*\)\s*\{?\s*.*$/;
        let match = trimmed.match(funcPattern);
        if (match && match[1] && !keywords.includes(match[1])) return { name: match[1].replace(/^\*+/, '') };

        // Namespace-qualified inline: void Device::test() { or int Device::getCount() {
        const nsInlineFuncPattern = /^([A-Za-z_]\w*)\s+([A-Za-z_]\w*)::([A-Za-z_]\w*)\s*\([^)]*\)\s*\{?\s*(?:\/\/.*)?$/;
        match = trimmed.match(nsInlineFuncPattern);
        if (match && match[3] && !keywords.includes(match[3])) return { name: match[3] };

        const multiLineFuncPattern = /^([\w:<>,\s*&]+)\s+(\w+)\s*\([^)]*[,\(]\s*$/;
        match = trimmed.match(multiLineFuncPattern);
        if (match && match[2] && !keywords.includes(match[2])) return { name: match[2] };

        const nsFuncPattern = /^([A-Za-z_]\w*)::([A-Za-z_]\w*)\s*\([^)]*(?:[,\(]\s*)?$/;
        match = trimmed.match(nsFuncPattern);
        if (match && match[2] && !keywords.includes(match[2])) return { name: match[2] };

        const nsReturnFuncPattern = /^([A-Za-z_]\w*)\s+([A-Za-z_]\w*)::([A-Za-z_]\w*)\s*\([^)]*(?:[,\(]\s*)?$/;
        match = trimmed.match(nsReturnFuncPattern);
        if (match && match[3] && !keywords.includes(match[3])) return { name: match[3] };

        const simpleFuncPattern = /^([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*\([^)]*(?:[,\(]\s*)?$/;
        match = trimmed.match(simpleFuncPattern);
        if (match && match[2] && !keywords.includes(match[2])) return { name: match[2] };

        return null;
    }

    matchClassStart(line) {
        const trimmed = line.trim();
        // matches: class MyClass : public Parent1, public Parent2 {
        // Also handles template bases (Base<int>) and namespace-qualified (NS::Base)
        const classPattern = /^\s*(?:class|struct)\s+(\w+)(?:\s*:\s*([^{]+))?\s*\{?/;
        const match = trimmed.match(classPattern);
        if (match) {
            const inheritPart = match[2];
            const bases = inheritPart ? inheritPart.split(',').map(p => {
                return p.trim().replace(/^(?:public|protected|private|virtual)\s+/, '').trim();
            }).filter(Boolean) : [];
            return {
                name: match[1],
                parent: bases[0] || null,
                interfaces: bases.slice(1)
            };
        }
        return null;
    }

    parseClasses(sourceCode) {
        const processedCode = this.processPreprocessor(sourceCode);
        return super.parseClasses(processedCode);
    }

    parseClassesLight(sourceCode) {
        const processedCode = this.processPreprocessor(sourceCode);
        return super.parseClassesLight(processedCode);
    }
}

module.exports = CLanguageProvider;

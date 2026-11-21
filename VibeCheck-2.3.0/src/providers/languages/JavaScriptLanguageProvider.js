const BaseLanguageProvider = require('./BaseLanguageProvider');

class JavaScriptLanguageProvider extends BaseLanguageProvider {
    constructor() {
        super('javascript');
    }

    matchFunctionStart(line) {
        const trimmed = line.trim();
        if (/^\s*(if|else|while|for|switch|return|class|interface|enum|import|export|default|static|async|public|private|protected)\b/.test(trimmed) && 
            !/^\s*(static|async|public|private|protected)\s+[a-zA-Z_$]/.test(trimmed)) {
            return null;
        }

        // Standard function: function name()
        const funcPattern = /function\s+([a-zA-Z_$][\w$]*)/;
        let match = trimmed.match(funcPattern);
        if (match) return { name: match[1] };

        // Class method: name(args) {
        // Matches: myMethod(a, b) { or async myMethod() { or static myMethod() {
        const methodPattern = /^\s*(?:async\s+|static\s+|public\s+|private\s+|protected\s+)*([a-zA-Z_$][\w$]*)\s*\([^)]*\)\s*\{?/;
        match = trimmed.match(methodPattern);
        if (match && match[1]) {
            const keywords = ['if', 'else', 'while', 'for', 'switch', 'return', 'class', 'interface', 'enum', 'import', 'export', 'default', 'constructor', 'get', 'set'];
            if (!keywords.includes(match[1])) return { name: match[1] };
        }

        return null;
    }

    matchClassStart(line) {
        const trimmed = line.trim();
        // matches: export default class MyClass extends Parent<Type> {
        // matches: interface MyIface extends Parent {
        const classPattern = /^\s*(?:export|default|class|interface|abstract|\s)*\s*(class|interface)\s+(\w+)(?:\s+extends\s+(\w+(?:\s*<[^>]*>)?(?:\.[\w<>]+)*))?(?:\s+implements\s+([\w\s,]+))?\s*\{?/;
        const match = trimmed.match(classPattern);
        if (match) {
            const interfaces = match[4] ? match[4].split(',').map(s => s.trim()) : [];
            return {
                name: match[2],
                parent: match[3] || null,
                interfaces: interfaces,
                isInterface: match[1] === 'interface'
            };
        }
        return null;
    }
}

module.exports = JavaScriptLanguageProvider;

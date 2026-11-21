const BaseLanguageProvider = require('./BaseLanguageProvider');

class JavaLanguageProvider extends BaseLanguageProvider {
    constructor() {
        super('java');
    }

    matchFunctionStart(line) {
        const trimmed = line.trim();
        if (/^\s*(if|else|while|for|switch|return|class|interface|enum|import|package|@|try|catch|finally)\b/.test(trimmed)) return null;

        const keywords = ['if', 'else', 'while', 'for', 'switch', 'return', 'class', 'interface', 'new', 'try', 'catch', 'finally', 'throw'];

        // Match method start: [modifiers] [type-params] [return-type] name (
        // Matches: public void test(
        // Matches: static <T> T get(
        // Matches: MyClass(
        const methodStartPattern = /^\s*(?:(?:public|private|protected|static|final|abstract|synchronized|native|default|transient|volatile)\s+)*(?:<[^>]+>\s*)?(?:[\w<>\\[\]]+\s+)?(\w+)\s*\(/;
        
        let match = trimmed.match(methodStartPattern);
        if (match && match[1] && !keywords.includes(match[1])) {
            return { name: match[1] };
        }

        return null;
    }

    matchClassStart(line) {
        const trimmed = line.trim();
        // matches: public abstract class MyClass extends Parent<String> implements Iface1, Iface2 {
        const classPattern = /^\s*(?:public|protected|private|static|final|abstract|\s)*\s*(class|interface|enum)\s+(\w+)(?:\s+extends\s+(\w+(?:\s*<[^>]*>)?(?:\.[\w<>]+)*))?(?:\s+implements\s+([\w\s,]+))?\s*\{?/;
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

module.exports = JavaLanguageProvider;

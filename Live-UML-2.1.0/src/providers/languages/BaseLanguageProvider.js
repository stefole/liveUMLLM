const LanguageProvider = require('./LanguageProvider');
const StatementParser = require('../utils/StatementParser');

class BaseLanguageProvider extends LanguageProvider {
    constructor(language) {
        super(language);
    }

    parseFunctions(sourceCode) {
        const functions = [];
        const rawLines = sourceCode.split('\n');
        const cleanedLines = StatementParser.removeComments(sourceCode).split('\n');

        let i = 0;
        while (i < cleanedLines.length) {
            const funcMatch = this.matchFunctionStart(cleanedLines[i]);
            if (funcMatch) {
                const funcBody = this.extractFunctionBody(cleanedLines, i);
                if (funcBody) {
                    // Extract raw body from original source to preserve string content
                    const rawBody = rawLines.slice(i, funcBody.endLine + 1).join('\n');
                    functions.push({
                        name: funcMatch.name,
                        startLine: i,
                        body: funcBody.body,
                        rawBody: rawBody,
                        endLine: funcBody.endLine
                    });
                    i = funcBody.endLine + 1;
                    continue;
                }
            }
            i++;
        }
        return functions;
    }

    parseClasses(sourceCode) {
        const classes = [];
        const cleanedLines = StatementParser.removeComments(sourceCode).split('\n');
        
        let i = 0;
        while (i < cleanedLines.length) {
            let line = cleanedLines[i];
            let classMatch = this.matchClassStart(line);
            
            // Handle multi-line class declarations (e.g., implements/extends spanning multiple lines)
            if (classMatch && !line.includes('{')) {
                let j = i + 1;
                while (j < cleanedLines.length) {
                    const nextLine = cleanedLines[j];
                    line += ' ' + nextLine.trim();
                    classMatch = this.matchClassStart(line);
                    if (nextLine.includes('{') && classMatch) {
                        break;
                    }
                    j++;
                }
            }
            
            if (classMatch) {
                const classBody = this.extractClassBody(cleanedLines, i);
                if (classBody) {
                    const methods = this.extractMethods(classBody.body);
                    classes.push({
                        name: classMatch.name,
                        parent: classMatch.parent || null,
                        interfaces: classMatch.interfaces || [],
                        isInterface: classMatch.isInterface || false,
                        startLine: i,
                        body: classBody.body,
                        endLine: classBody.endLine,
                        methods: methods
                    });
                    i = classBody.endLine + 1;
                    continue;
                }
            }
            i++;
        }
        return classes;
    }

    parseClassesLight(sourceCode) {
        const classes = [];
        const lines = sourceCode.split('\n');

        for (let i = 0; i < lines.length; i++) {
            let line = this._stripInlineComments(lines[i]);
            let classMatch = this.matchClassStart(line);

            // Handle multi-line class declarations
            if (classMatch && !line.includes('{')) {
                let j = i + 1;
                while (j < lines.length) {
                    const nextLine = this._stripInlineComments(lines[j]);
                    line += ' ' + nextLine.trim();
                    classMatch = this.matchClassStart(line);
                    if (nextLine.includes('{') && classMatch) {
                        break;
                    }
                    j++;
                }
            }

            if (classMatch) {
                classes.push({
                    name: classMatch.name,
                    parent: classMatch.parent || null,
                    interfaces: classMatch.interfaces || [],
                    isInterface: classMatch.isInterface || false
                });
            }
        }
        return classes;
    }

    extractMethods(body) {
        const methods = [];
        const lines = body.split('\n');
        const seen = new Set();
        let braceDepth = 0;
        for (const line of lines) {
            // Track brace depth to avoid extracting methods from nested classes/closures
            for (let ci = 0; ci < line.length; ci++) {
                if (line[ci] === '\\') { ci++; continue; }
                if (line[ci] === '{') braceDepth++;
                else if (line[ci] === '}') braceDepth--;
            }
            if (braceDepth > 1) continue; // Inside a nested scope — skip
            const match = this.matchFunctionStart(line);
            if (match && match.name && !seen.has(match.name)) {
                methods.push(match.name);
                seen.add(match.name);
            }
        }
        return methods;
    }

    matchClassStart(line) {
        return null;
    }

    _stripInlineComments(line) {
        const singleLineIdx = line.indexOf('//');
        if (singleLineIdx >= 0) line = line.substring(0, singleLineIdx);
        const blockStart = line.indexOf('/*');
        if (blockStart >= 0) {
            const blockEnd = line.indexOf('*/', blockStart + 2);
            if (blockEnd >= 0) {
                line = line.substring(0, blockStart) + line.substring(blockEnd + 2);
            }
        }
        return line;
    }

    extractClassBody(lines, startLine) {
        return this.extractFunctionBody(lines, startLine);
    }

    extractFunctionBody(lines, startLine) {
        if (this.language === 'python') {
            return this.extractPythonFunctionBody(lines, startLine);
        } else {
            return this.extractBraceFunctionBody(lines, startLine);
        }
    }

    extractPythonFunctionBody(lines, startLine) {
        const defLine = lines[startLine];
        const indentMatch = defLine.match(/^(\s*)/);
        const defIndent = indentMatch ? indentMatch[1].length : 0;
        let bodyLines = [defLine];
        
        for (let i = startLine + 1; i < lines.length; i++) {
            const line = lines[i];
            const lineIndentMatch = line.match(/^(\s*)/);
            const lineIndent = lineIndentMatch ? lineIndentMatch[1].length : 0;
            
            if (line.trim() === '' || line.trim().startsWith('#')) {
                bodyLines.push(line);
                continue;
            }
            if (lineIndent <= defIndent) {
                return { body: bodyLines.join('\n'), endLine: i - 1 };
            }
            bodyLines.push(line);
        }
        return { body: bodyLines.join('\n'), endLine: lines.length - 1 };
    }

    extractBraceFunctionBody(lines, startLine) {
        let braceCount = 0;
        let foundOpen = false;
        let bodyLines = [];
        
        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];
            bodyLines.push(line);
            // Use index-based loop so we can skip escaped characters (e.g. \{ in regex literals)
            for (let ci = 0; ci < line.length; ci++) {
                if (line[ci] === '\\') { ci++; continue; } // skip escaped char
                if (line[ci] === '{') { braceCount++; foundOpen = true; }
                else if (line[ci] === '}') braceCount--;
            }
            if (foundOpen && braceCount === 0) {
                return { body: bodyLines.join('\n'), endLine: i };
            }
        }
        return null;
    }
}

module.exports = BaseLanguageProvider;

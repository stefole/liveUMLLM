const vscode = require('vscode');
const core = require('./core.js');
const registry = require('./registry');
const { spawn } = require('child_process');
const { getWebviewHtml } = require('./webview');
const crypto = require('crypto');
const path = require('path');
const tsProvider = require('./providers/utils/TreeSitterProvider');
const Visualizer = require('./visualizer');
const logger = require('./logger');
const summaries = require('./summaries');

const palette = require('./palette');

let sidebarProvider = null;
let currentLanguage = '';
let plantUmlServer = null;
let _typingInProgress = false;

class PlantUmlServerManager {
    constructor() {
        this.process = null;
        this.port = null;
    }

    async start() {
        const config = vscode.workspace.getConfiguration('liveUml');
        const javaPath = config.get('javaPath', 'java');
        const jarPath = path.join(__dirname, '..', 'plantuml', 'plantuml.jar');

        try {
            this.port = await core.findAvailablePort(8080);
            logger.log(`Starting PlantUML server on port ${this.port} with java=${javaPath}`);
            console.log(`Live UML: Starting PlantUML server on port ${this.port}`);

            this.process = spawn(javaPath, [
                '-Djava.awt.headless=true',
                '-jar', jarPath,
                `-picoweb:${this.port}`
            ]);
            this.process.on('error', error => {
                logger.warn(`PlantUML server unavailable: ${error.message}`);
                this.process = null;
                this.port = null;
            });

            this.process.stdout.on('data', (data) => {
                logger.debug(`PlantUML Server stdout: ${data}`);
            });
            this.process.stderr.on('data', (data) => {
                logger.warn(`PlantUML Server stderr: ${data}`);
                console.error(`PlantUML Server Error: ${data}`);
            });
            this.process.on('close', (code) => {
                logger.log(`PlantUML Server exited with code ${code}`);
                console.log(`PlantUML Server exited with code ${code}`);
                this.process = null;
                this.port = null;
            });

            await new Promise(resolve => setTimeout(resolve, 1500));
            const url = this.getUrl();
            logger.log(`PlantUML server ready at ${url}`);
            return url;
        } catch (err) {
            logger.error(`Failed to start PlantUML server: ${err.message}`);
            console.error('Failed to start PlantUML server:', err);
            return null;
        }
    }

    stop() {
        logger.log('Stopping PlantUML server');
        if (this.process) {
            this.process.kill();
            this.process = null;
            this.port = null;
        }
    }

    getUrl() {
        return this.port ? `http://localhost:${this.port}` : null;
    }
}

async function activate(context) {
    const ext = vscode.extensions.getExtension('bitlab.live-uml');
    const extVersion = ext?.packageJSON?.version || 'unknown';
    logger.log(`Live UML activating — v${extVersion}, VS Code ${vscode.version}, platform=${process.platform}, arch=${process.arch}`);
    logger.log(`Config: javaPath="${vscode.workspace.getConfiguration('liveUml').get('javaPath', 'java')}", classExcludePatterns="${vscode.workspace.getConfiguration('liveUml').get('classExcludePatterns', 'node_modules, build, bin, dist, target')}", debug=${logger.VERBOSE}`);
    const jarPath = path.join(__dirname, '..', 'plantuml', 'plantuml.jar');
    const fs = require('fs');
    logger.log(`PlantUML jar ${fs.existsSync(jarPath) ? 'present' : 'MISSING'} at ${jarPath}`);
    console.log('Live UML Extension Active');

    plantUmlServer = new PlantUmlServerManager();
    plantUmlServer.start();
    context.subscriptions.push({ dispose: () => {
        plantUmlServer?.stop();
        sidebarProvider?._summaryAbort?.abort();
        sidebarProvider?._currentVisualizer?.killProcess();
    } });

    // Tree-sitter WASM is loaded lazily on demand (only for state diagrams).
    // Eager loading all 6 language WASM files (~7 MB) at activation blocks
    // the event loop with WebAssembly compilation for ~20-30 seconds.
    // See generate() where !tsProvider.isReady() triggers lazy loading.
    sidebarProvider = new LiveUmlSidebar(context);
    try { await sidebarProvider.loadApiKey(); }
    catch { logger.warn('Saved summary key could not be loaded; configure it in the sidebar settings.'); }

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'liveUmlSidebar-webview',
            sidebarProvider,
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    );

    context.subscriptions.push(vscode.commands.registerCommand('liveUml.show', () => {
        vscode.commands.executeCommand('workbench.view.extension.live-uml');
    }));
    const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    statusItem.text = '$(type-hierarchy) Live UML';
    statusItem.tooltip = 'Show Live UML sidebar';
    statusItem.command = 'liveUml.show';
    statusItem.show();
    context.subscriptions.push(statusItem);

    context.subscriptions.push(vscode.commands.registerCommand('liveUml.refresh', () => {
        if (sidebarProvider && sidebarProvider.isViewVisible()) sidebarProvider.refresh();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('liveUml.regenerateSummary', () => sidebarProvider?.regenerateSummary()));
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('liveUml.llm') && sidebarProvider) {
            sidebarProvider._summaryAbort?.abort();
            summaries.clearCache();
            sidebarProvider._lastFunctionHash = null;
            if (sidebarProvider.isViewVisible()) sidebarProvider.refresh();
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('extension.openClass', async (className) => {
        if (!className || !sidebarProvider) return;

        sidebarProvider.post({ type: 'loading', name: className });

        // Determine the current language extension to avoid cross-language navigation
        const activeExt = vscode.window.activeTextEditor
            ? path.extname(vscode.window.activeTextEditor.document.uri.fsPath)
            : '';

        // Strategy 1: Fast Cache Lookup (O(1) after initial scan)
        let targetUri = null;
        if (activeExt) {
            if (sidebarProvider && sidebarProvider._classCache.has(activeExt)) {
                const cachedClasses = sidebarProvider._classCache.get(activeExt);
                const match = cachedClasses.find(c => c.name === className);
                if (match && match.fileUri) {
                    targetUri = match.fileUri;
                }
            }

            // Strategy 2: Direct file search (Fallback if cache missed)
            if (!targetUri) {
                try {
                    const langFiles = await vscode.workspace.findFiles(
                        `**/*${activeExt}`,
                        '**/node_modules/**'
                    );
                    const languageId = activeExt === '.java' ? 'java'
                        : activeExt === '.py' ? 'python'
                        : activeExt === '.ts' ? 'typescript'
                        : activeExt === '.cpp' || activeExt === '.cc' || activeExt === '.cxx' ? 'cpp'
                        : 'javascript';
                    const provider = registry.getLanguageProvider(languageId);

                    for (const file of langFiles) {
                        try {
                            const bytes = await vscode.workspace.fs.readFile(file);
                            const content = Buffer.from(bytes).toString('utf8');
                            const parsed = provider.parseClasses(content);
                            if (parsed.some(c => c.name === className)) {
                                targetUri = file;
                                break;
                            }
                        } catch (e) { /* skip unreadable files */ }
                    }
                } catch (e) {
                    console.warn('Live UML: direct file search failed, falling back to symbol provider', e);
                }
            }
        }

        // Strategy 2: Workspace symbol provider as fallback, scoped to the current language
        if (!targetUri) {
            let symbols = await vscode.commands.executeCommand('vscode.executeWorkspaceSymbolProvider', className);

            // Filter to the current language extension to prevent cross-language navigation
            const langSymbols = activeExt
                ? symbols?.filter(s => s.location.uri.fsPath.endsWith(activeExt))
                : symbols;

            const candidates = (langSymbols && langSymbols.length > 0) ? langSymbols : symbols;

            let symbol = candidates?.find(s => {
                const isTarget = (s.name === className || s.name.endsWith('.' + className));
                const isCorrectKind = (s.kind === vscode.SymbolKind.Class || s.kind === vscode.SymbolKind.Interface || s.kind === vscode.SymbolKind.Struct);
                return isTarget && isCorrectKind;
            });
            if (!symbol) {
                symbol = candidates?.find(s => s.name === className || s.name.endsWith('.' + className));
            }
            if (symbol) targetUri = symbol.location.uri;
        }

        if (targetUri) {
            const doc = await vscode.workspace.openTextDocument(targetUri);
            await vscode.window.showTextDocument(doc);

            // Clear hash state so the diagram always re-generates after navigation
            sidebarProvider._lastClassHash = null;
            sidebarProvider._lastClassName = null;
            sidebarProvider.currentClassName = className;
            sidebarProvider.currentDiagramType = 'class';
            // Small delay to let VS Code register the new active editor
            setTimeout(() => sidebarProvider.refresh(), 100);
        } else {
            // Not found — clear loading by re-generating current view
            sidebarProvider._lastClassHash = null;
            sidebarProvider.refresh();
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('extension.selectStateVar', async (stateVar) => {
        if (!stateVar || !sidebarProvider) return;
        const functionName = sidebarProvider.currentFunctionName;
        if (functionName) {
            sidebarProvider.selectedStateVars.set(functionName, stateVar);
        }
        sidebarProvider.refresh();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('extension.openFunction', async (functionName) => {
        if (!functionName || !sidebarProvider) return;

        // Immediate visual feedback
        sidebarProvider.post({ type: 'loading', name: functionName });

        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const functions = parseFunctions(editor.document);
            const func = functions.find(f => f.name === functionName);
            if (func) {
                const lines = editor.document.getText().split('\n');
                const firstLine = func.body.split('\n')[0];
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes(firstLine)) {
                        editor.selection = new vscode.Selection(i, 0, i, 0);
                        editor.revealRange(new vscode.Range(i, 0, i, 0), vscode.TextEditorRevealType.InCenter);
                        break;
                    }
                }
                sidebarProvider.currentFunctionName = functionName;
                sidebarProvider.refresh();
                return;
            }
        }

        const symbols = await vscode.commands.executeCommand('vscode.executeWorkspaceSymbolProvider', functionName);
        if (symbols && symbols.length > 0) {
            // Support Java methods which might be package-qualified in the symbol list
            const symbol = symbols.find(s => (s.name === functionName || s.name.endsWith('.' + functionName)) &&
                (s.kind === vscode.SymbolKind.Method || s.kind === vscode.SymbolKind.Function));

            const target = symbol || symbols[0];
            const doc = await vscode.workspace.openTextDocument(target.location.uri);
            const editor = await vscode.window.showTextDocument(doc, {
                selection: new vscode.Range(target.location.range.start, target.location.range.start)
            });

            sidebarProvider.currentFunctionName = functionName;
            sidebarProvider.refresh();
        }
    }));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
        if (!sidebarProvider || !sidebarProvider.isViewVisible()) return;
        sidebarProvider.refresh();
    }));

    let selectionDebounceTimer = null;
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(() => {
        if (!sidebarProvider || !sidebarProvider.isViewVisible()) return;
        if (_typingInProgress) return;

        if (selectionDebounceTimer) clearTimeout(selectionDebounceTimer);
        selectionDebounceTimer = setTimeout(() => {
            sidebarProvider.refresh();
        }, 300);
    }));

    let debounceTimer = null;
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) => {
        if (!sidebarProvider || !sidebarProvider.isViewVisible()) return;
        if (vscode.window.activeTextEditor && e.document === vscode.window.activeTextEditor.document) {
            _typingInProgress = true;
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                _typingInProgress = false;
                sidebarProvider.refresh();
            }, 1200);
        }
    }));

    // Invalidate the class cache when source files are saved, created, deleted or renamed.
    // This ensures the workspace scan stays fresh without paying the cost on every keystroke.
    const invalidateCacheForUri = (uri) => {
        const ext = path.extname(uri.fsPath);
        const uriStr = uri.toString();
        if (sidebarProvider) {
            sidebarProvider._classCache.delete(`light:${ext}:${uriStr}`);
            sidebarProvider._classCache.delete(`full:${ext}:${uriStr}`);
            sidebarProvider._classCache.delete(ext); // Also clear aggregate cache
            sidebarProvider._fileContentCache.delete(`content:${ext}:${uriStr}`);
            sidebarProvider._workspaceFileCountCache = { ext: '', count: 0 };
        }
    };
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(doc => invalidateCacheForUri(doc.uri)));
    context.subscriptions.push(vscode.workspace.onDidCreateFiles(e => e.files.forEach(f => invalidateCacheForUri(f))));
    context.subscriptions.push(vscode.workspace.onDidDeleteFiles(e => e.files.forEach(f => invalidateCacheForUri(f))));
    context.subscriptions.push(vscode.workspace.onDidRenameFiles(e => e.files.forEach(f => {
        invalidateCacheForUri(f.oldUri);
        invalidateCacheForUri(f.newUri);
    })));

    // Java is only needed for the PlantUML renderer; warn when the user picks it.
    // (Validating here nagged every Mermaid user on a machine without a JRE.)
}

async function validateJavaOnActivation(context) {
    const config = vscode.workspace.getConfiguration('liveUml');
    const javaPath = config.get('javaPath', 'java');

    try {
        await new Promise((resolve, reject) => {
            require('child_process').exec(`"${javaPath}" -version`, { timeout: 10000 }, (error, stdout, stderr) => {
                if (error) reject(error);
                else resolve(stderr || stdout);
            });
        });
    } catch (err) {
        const action = await vscode.window.showWarningMessage(
            `Live UML: Java not found at "${javaPath}". PlantUML diagram generation requires Java.`,
            'Open Settings', 'Learn More'
        );
        if (action === 'Open Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'liveUml.javaPath');
        } else if (action === 'Learn More') {
            vscode.window.showInformationMessage('PlantUML requires Java. Please install it and set the path in settings.');
        }
    }
}

class LiveUmlSidebar {
    static _requestCounter = 0;

    constructor(context) {
        this.context = context;
        this.view = null;
        this.currentFunctionName = null;
        this.currentClassName = null;
        this.currentDiagramType = 'flowchart';
        const savedMode = context.globalState?.get('diagramMode', 'mermaid');
        this.currentDiagramMode = savedMode === 'plantuml' ? 'plantuml' : 'mermaid';
        this.diagramTheme = 'dark';          // 'dark' | 'light'
        this._viewVisible = false;
        this._generationInProgress = false;
        this._lastFunctionHash = null;
        this._lastDiagramType = null;
        this._lastDocumentUri = null;
        this._lastClassName = null;
        this._lastClassHash = null;
        this._classCache = new Map(); // key: ext (combined) and `light:${ext}:${uri}` per file – ParsedClass[]; invalidated on file events
        this._fileContentCache = new Map(); // key: `content:${ext}:${uri}` – raw UTF-8 file content; invalidated alongside _classCache
        this._lastSelectedStateVar = null;
        this.selectedStateVars = new Map();
        this._workspaceFileCountCache = { ext: '', count: 0 };
    }

    isViewVisible() { return this._viewVisible; }

    async setDiagramMode(mode) {
        if (!['plantuml', 'mermaid'].includes(mode)) return false;
        this.currentDiagramMode = mode;
        try { await this.context.globalState?.update('diagramMode', mode); }
        catch { logger.warn('Could not save the preferred diagram renderer.'); }
        return true;
    }

    async loadApiKey() {
        this._storedApiKey = await this.context.secrets.get('liveUml.llm.apiKey') || '';
    }

    async saveApiKey(value) {
        if (typeof value !== 'string' || !value.trim()) return;
        const key = value.trim();
        await this.context.secrets.store('liveUml.llm.apiKey', key);
        this._storedApiKey = key;
        this._summaryAbort?.abort();
        summaries.clearCache();
        this._lastFunctionHash = null;
    }

    _summaryConfig() {
        const c = vscode.workspace.getConfiguration('liveUml');
        return {
            enabled: c.get('llm.enabled', true),
            updateMode: c.get('llm.updateMode', 'automatic'),
            baseUrl: c.get('llm.baseUrl', 'https://api.deepseek.com/v1'),
            model: c.get('llm.model', 'deepseek-flash'),
            apiKey: this._storedApiKey || c.get('llm.apiKey', '') ||
                    process.env.LIVEUML_LLM_KEY ||
                    process.env.DEEPSEEK_API_KEY || '',
            timeoutMs: c.get('llm.timeoutMs', 30000)
        };
    }

    async _runSummary(req, document, requestId, force = false) {
        const cfg = this._summaryConfig();
        const status = (state, message) => this.post({ type: 'summaryStatus', status: state,
            message, name: req.name, requestId, enabled: cfg.enabled, updateMode: cfg.updateMode });
        if (!cfg.enabled) { status('disabled'); return; }
        if (!force && cfg.updateMode === 'manual') { status('idle'); return; }
        if (!cfg.apiKey) { status('error', 'Open the sidebar gear settings and enter your AI API key.'); return; }
        this._summaryAbort?.abort();
        const controller = new AbortController();
        this._summaryAbort = controller;
        const sequence = this._summarySequence = (this._summarySequence || 0) + 1;
        const current = () => !controller.signal.aborted && sequence === this._summarySequence && this._currentRequestId === requestId;
        status('loading');
        let hoverTimer;
        try {
            // Hover providers are third-party extensions and may never settle.
            const docs = await Promise.race([this._hoverDocs(document, req),
                new Promise(resolve => { hoverTimer = setTimeout(() => resolve(''), 1200); })]);
            clearTimeout(hoverTimer);
            if (!current()) return;
            const result = await summaries.summarize({ ...req, docs, config: cfg, force, signal: controller.signal });
            if (!current()) return;
            if (result) this.post({ type: 'summary', name: req.name, requestId, ...result });
            else status('error', 'The model returned no usable summary.');
        } catch (error) {
            if (current()) status('error', String(error.message).replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]'));
        } finally {
            clearTimeout(hoverTimer);
        }
    }

    async regenerateSummary() {
        const editor = vscode.window.activeTextEditor;
        if (!editor || this.currentDiagramType === 'class') return;
        const func = parseFunctions(editor.document).find(f => f.name === this.currentFunctionName);
        if (!func) return;
        await this._runSummary({ name: func.name, body: func.rawBody || func.body,
            language: editor.document.languageId, startLine: func.startLine,
            imports: summaries.extractImports(editor.document.getText()) }, editor.document, this._currentRequestId, true);
    }

    // Hover text VS Code/Pylance shows for the symbols the body calls — grounds the
    // summary in real library docs instead of the model's memory of the API.
    async _hoverDocs(document, req) {
        // ponytail: 6 symbols, first 300 chars each; raise the cap if summaries get vague.
        const skip = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'print', 'len',
            'range', 'def', 'int', 'str', 'float', 'bool', 'list', 'dict', 'set', 'tuple', 'super',
            'self', 'isinstance', 'getattr', 'setattr', 'open', 'map', 'filter', 'sorted', 'sum',
            'min', 'max', 'abs', 'any', 'all', 'type', 'zip', 'enumerate', 'await', 'new']);
        const names = [...new Set([...req.body.matchAll(/([A-Za-z_][\w.]*)\s*\(/g)].map(m => m[1]))]
            .filter(n => !skip.has(n.split('.').pop()))
            .slice(0, 6);
        if (!names.length) return '';

        const text = document.getText();
        const from = document.offsetAt(new vscode.Position(req.startLine || 0, 0));
        const out = [];
        for (const name of names) {
            const base = name.split('.').pop();
            const idx = text.indexOf(base + '(', from);
            if (idx < 0) continue;
            try {
                const hovers = await vscode.commands.executeCommand(
                    'vscode.executeHoverProvider', document.uri, document.positionAt(idx));
                const doc = (hovers || [])
                    .flatMap(h => h.contents || [])
                    .map(c => (typeof c === 'string' ? c : c.value || ''))
                    .join('\n')
                    .replace(/```[a-z]*\n?/gi, '')
                    .replace(/\n{2,}/g, '\n')
                    .trim();
                if (doc) out.push(`${name}: ${doc.slice(0, 300)}`);
            } catch (e) {
                logger.debug(`_hoverDocs(${name}): ${e.message}`);
            }
        }
        return out.join('\n');
    }

    _computeFunctionHash(body) {
        if (!body) return null;
        return crypto.createHash('md5').update(body).digest('hex');
    }

    resolveWebviewView(webviewView) {
        logger.log('resolveWebviewView: Live UML sidebar webview requested');
        this.view = webviewView;
        this._viewVisible = true;
        const mermaidRoot = vscode.Uri.joinPath(this.context.extensionUri, 'mermaid');
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [mermaidRoot]
        };
        const html = this.getHtml();
        logger.log(`resolveWebviewView: enableScripts=true, localResourceRoots=[${mermaidRoot.toString()}], html.length=${html.length}`);
        webviewView.webview.html = html;

        webviewView.onDidChangeVisibility(() => {
            this._viewVisible = webviewView.visible;
            logger.log(`resolveWebviewView: sidebar visibility changed -> visible=${this._viewVisible}`);
            if (this._viewVisible) this.refresh();
        });

        webviewView.webview.onDidReceiveMessage(async (msg) => {
            logger.debug(`onDidReceiveMessage: type=${msg.type}${msg.functionName ? `, functionName=${msg.functionName}` : ''}${msg.className ? `, className=${msg.className}` : ''}`);
            switch (msg.type) {
                case 'ready':
                    this._lastFunctionHash = null;
                    this._lastClassHash = null;
                    await this.refresh();
                    break;
                case 'refresh': this.refresh(); break;
                case 'regenerateSummary': await this.regenerateSummary(); break;
                case 'changeDiagramType':
                    logger.log(`changeDiagramType: ${msg.diagramType}`);
                    this.currentDiagramType = msg.diagramType;
                    if (this.currentFunctionName) await this.generate(this.currentFunctionName, msg.diagramType);
                    break;
                case 'changeDiagramMode':
                    logger.log(`changeDiagramMode: ${msg.diagramMode}`);
                    if (!await this.setDiagramMode(msg.diagramMode)) break;
                    if (msg.diagramMode === 'plantuml') validateJavaOnActivation(this.context);
                    this._lastFunctionHash = null;
                    this._lastClassHash = null;
                    this._lastClassName = null;
                    this._lastDiagramType = null;
                    this._lastDocumentUri = null;
                    this._lastSelectedStateVar = null;
                    if (this.currentFunctionName || this.currentClassName) {
                        await this.refresh();
                    }
                    break;
                case 'setTheme':
                    logger.log(`setTheme: ${msg.theme}`);
                    this.diagramTheme = msg.theme === 'light' ? 'light' : 'dark';
                    this._lastFunctionHash = null;
                    this._lastClassHash = null;
                    await this.refresh();
                    break;
                case 'selectFunction':
                    logger.log(`selectFunction: ${msg.functionName}`);
                    this.currentFunctionName = msg.functionName;
                    await this.generate(msg.functionName, this.currentDiagramType);
                    break;
                case 'selectClass':
                    logger.log(`selectClass: ${msg.className}`);
                    this.currentClassName = msg.className;
                    await this.generate(msg.className, 'class');
                    break;
                case 'showInfo': vscode.window.showInformationMessage(msg.message); break;
                case 'showError': vscode.window.showErrorMessage(msg.message); break;
                case 'savePng': {
                    // The webview can't name downloads, so the extension writes the file.
                    logger.log(`savePng: ${msg.name} (${Math.round((msg.data || '').length * 0.75)} bytes)`);
                    const target = await vscode.window.showSaveDialog({
                        defaultUri: vscode.Uri.joinPath(
                            vscode.workspace.workspaceFolders?.[0]?.uri || vscode.Uri.file(require('os').homedir()),
                            msg.name || 'diagram.png'),
                        filters: { Images: ['png'] }
                    });
                    if (target) {
                        await vscode.workspace.fs.writeFile(target, Buffer.from(msg.data, 'base64'));
                        vscode.window.showInformationMessage(`Saved ${require('path').basename(target.fsPath)}`);
                    }
                    break;
                }
                case 'log':
                    if (msg.level === 'error') logger.error(`[Webview] ${msg.message}`);
                    else if (msg.level === 'warn') logger.warn(`[Webview] ${msg.message}`);
                    else logger.log(`[Webview] ${msg.message}`);
                    break;
                case 'openSettings':
                    this.view.webview.postMessage({
                        type: 'showSettings',
                        settings: {
                            javaPath: vscode.workspace.getConfiguration('liveUml').get('javaPath', 'java'),
                            llmEnabled: this._summaryConfig().enabled,
                            llmUpdateMode: this._summaryConfig().updateMode,
                            hasApiKey: !!this._summaryConfig().apiKey,
                            classExcludePatterns: vscode.workspace.getConfiguration('liveUml').get('classExcludePatterns', 'node_modules, build, bin, dist, target')
                        }
                    });
                    break;
                case 'saveSettings':
                    try { await this.saveApiKey(msg.settings.llmApiKey); }
                    catch {
                        this.post({ type: 'settingsError', message: 'Could not save the API key to VS Code secret storage. Please retry.' });
                        break;
                    }
                    if (typeof msg.settings.llmEnabled === 'boolean') {
                        await vscode.workspace.getConfiguration('liveUml').update('llm.enabled', msg.settings.llmEnabled, vscode.ConfigurationTarget.Global);
                    }
                    if (['automatic', 'manual'].includes(msg.settings.llmUpdateMode)) {
                        await vscode.workspace.getConfiguration('liveUml').update('llm.updateMode', msg.settings.llmUpdateMode, vscode.ConfigurationTarget.Global);
                    }
                    if (msg.settings.javaPath !== undefined) {
                        await vscode.workspace.getConfiguration('liveUml').update('javaPath', msg.settings.javaPath, vscode.ConfigurationTarget.Global);
                    }
                    if (msg.settings.classExcludePatterns !== undefined) {
                        await vscode.workspace.getConfiguration('liveUml').update('classExcludePatterns', msg.settings.classExcludePatterns, vscode.ConfigurationTarget.Global);
                    }
                    this.view.webview.postMessage({ type: 'settingsSaved' });
                    await this.refresh();
                    break;
                case 'command':
                    if (msg.command === 'extension.openClass') {
                        vscode.commands.executeCommand('extension.openClass', msg.args);
                    } else {
                        vscode.commands.executeCommand(msg.command, msg.args);
                    }
                    break;
            }
        });

        // Refresh after the webview has installed its message listener (ready handshake).
    }

    async refresh() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            logger.log('refresh(): no active editor');
            this.post({ type: 'noEditor' });
            return;
        }

        currentLanguage = editor.document.languageId;
        logger.debug(`refresh(): language=${currentLanguage}, uri=${editor.document.uri.toString()}`);

        const functions = parseFunctions(editor.document);
        const classes = parseClasses(editor.document);
        const cursorLine = editor.selection.active.line;

        logger.debug(`refresh(): ${functions.length} functions, ${classes.length} classes, cursor at line ${cursorLine}`);

        // Stats
        let totalFiles = 0;
        let ext = '';
        if (currentLanguage === 'java') ext = '.java';
        else if (currentLanguage === 'python') ext = '.py';
        else if (currentLanguage === 'javascript') ext = '.js';
        else if (currentLanguage === 'typescript') ext = '.ts';
        else if (currentLanguage === 'cpp') ext = '.cpp';

        if (ext) {
            if (this._workspaceFileCountCache.ext !== ext) {
                const excludeDirs = (vscode.workspace.getConfiguration('liveUml').get('classExcludePatterns', 'node_modules, build, bin, dist, target') || '')
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean);
                const excludeGlob = excludeDirs.length > 0
                    ? `{${excludeDirs.map(d => `**/${d}/**`).join(',')}}`
                    : undefined;
                const files = await vscode.workspace.findFiles(`**/*${ext}`, excludeGlob);
                totalFiles = files.length;
                this._workspaceFileCountCache = { ext, count: totalFiles };
            } else {
                totalFiles = this._workspaceFileCountCache.count;
            }
        }

        const currentFunc = functions.find(f => cursorLine >= f.startLine && cursorLine <= f.endLine);

        const currentCls = classes.find(c => cursorLine >= c.startLine && cursorLine <= c.endLine);

        if (currentCls && this.currentDiagramType === 'class') {
            this.currentClassName = currentCls.name;
        }

        const newFunctionName = currentFunc ? currentFunc.name : (functions.length > 0 ? functions[0].name : null);
        const newClassName = currentCls ? currentCls.name : (this.currentClassName || (classes.length > 0 ? classes[0].name : null));
        const newDocUri = editor.document.uri.toString();

        this.post({
            type: 'update',
            functions: functions.map(f => f.name),
            classes: classes.map(c => c.name),
            currentFunction: newFunctionName,
            currentClass: newClassName,
            stats: {
                totalFiles: totalFiles,
                totalClasses: classes.length,
                language: currentLanguage
            },
            diagramType: this.currentDiagramType,
            diagramMode: this.currentDiagramMode,
            theme: this.diagramTheme,
            verbose: logger.VERBOSE,
            summaryEnabled: this._summaryConfig().enabled,
            summaryUpdateMode: this._summaryConfig().updateMode
        });

        logger.debug(`refresh(): will generate for target=${newFunctionName || newClassName}, type=${this.currentDiagramType}`);
        if (this.currentDiagramType === 'class') {
            if (newClassName) {
                this.currentClassName = newClassName;
                await this.generate(newClassName, 'class');
            }
        } else {
            if (currentFunc) {
                this.currentFunctionName = currentFunc.name;
                await this.generate(currentFunc.name, this.currentDiagramType);
            } else if (functions.length > 0) {
                this.currentFunctionName = functions[0].name;
                await this.generate(functions[0].name, this.currentDiagramType);
            }
        }
    }

    post(msg) { if (this.view) this.view.webview.postMessage(msg); }

    async generate(targetName, type) {
        const requestId = ++LiveUmlSidebar._requestCounter;
        this._latestGenerationId = requestId;
        let pendingSummary = null;
        logger.log(`generate(${targetName}, ${type}) starting — requestId=${requestId}, generationInProgress=${this._generationInProgress}`);

        const visualizer = new Visualizer(this.currentDiagramMode);
        visualizer.setRequestId(requestId);

        try {
            const editor = vscode.window.activeTextEditor;
            // Output/log channels are documents too — never diagram their text.
            if (!editor || !['file', 'untitled', 'vscode-notebook-cell'].includes(editor.document.uri.scheme)) {
                logger.log(`generate(): no file editor (${editor?.document.uri.scheme || 'none'}), aborting`);
                this.post({ type: 'noEditor' });
                return;
            }

            let diagramCode = '';
            let hashSource = '';
            let classCount = 0;
            let externalGuesses = [];
            let stateVars = [];
            let activeStateVar = null;
            let serverUrl = null;
            pendingSummary = null;

            if (type === 'class') {
                logger.debug('generate(): class diagram path');
                const ext = path.extname(editor.document.uri.fsPath);
                let classes = parseClasses(editor.document);
                logger.debug(`generate(): ${classes.length} classes in current file`);

                const extraClasses = await this.findWorkspaceClasses(targetName, editor.document);
                if (this._latestGenerationId !== requestId) return;
                if (extraClasses && extraClasses.length > 0) {
                    const existingNames = new Set(classes.map(c => c.name));
                    extraClasses.forEach(c => {
                        if (!existingNames.has(c.name)) {
                            classes.push(c);
                            existingNames.add(c.name);
                        }
                    });
                    logger.debug(`generate(): +${extraClasses.length} workspace classes, total=${classes.length}`);
                }

                const firstResult = visualizer.generateClass(targetName, classes, currentLanguage);
                logger.debug(`generate(): first-pass displayClassNames=${JSON.stringify(firstResult.displayClassNames)}`);

                if (firstResult.displayClassNames && firstResult.displayClassNames.length > 0) {
                    await this._resolveDisplayClassMethods(classes, firstResult.displayClassNames, ext);
                    if (this._latestGenerationId !== requestId) return;
                    logger.debug('generate(): resolved display class methods');
                }

                const result = visualizer.generateClass(targetName, classes, currentLanguage);
                diagramCode = result.uml || result.mermaidCode || '';
                classCount = result.classCount;
                const currentHash = crypto.createHash('md5').update(diagramCode).digest('hex');
                logger.debug(`generate(): class hash check — lastHash=${this._lastClassHash?.slice(0,8)}, newHash=${currentHash.slice(0,8)}`);
                if (this._lastClassHash === currentHash && this._lastClassName === targetName &&
                    this._lastDiagramType === type && this._lastDocumentUri === editor.document.uri.toString()) {
                    logger.debug('generate(): class hash unchanged, skipping render');
                    return;
                }
                this._lastClassHash = currentHash;
            } else if (type === 'state') {
                logger.debug('generate(): state diagram path');
                const functions = parseFunctions(editor.document);
                const func = functions.find(f => f.name === targetName);
                if (!func) {
                    logger.debug(`generate(): target function "${targetName}" not found`);
                    return;
                }
                const selectedStateVar = this.selectedStateVars.get(targetName) || null;
                pendingSummary = { name: func.name, body: func.rawBody || func.body,
                    language: currentLanguage, startLine: func.startLine,
                    imports: summaries.extractImports(editor.document.getText()) };
                logger.debug(`generate(): selectedStateVar=${selectedStateVar}`);
                if (!tsProvider.isReady()) {
                    logger.debug('generate(): waiting for tree-sitter WASM to be ready');
                    await tsProvider.ready();
                    if (this._latestGenerationId !== requestId) return;
                }
                const result = visualizer.generateState(targetName, functions, currentLanguage, selectedStateVar);
                externalGuesses = result.externalGuesses || [];
                diagramCode = result.uml || result.mermaidCode || '';
                stateVars = result.stateVars || [];
                activeStateVar = result.activeStateVar || null;
                logger.debug(`generate(): state result — eligible=${result.eligible}, stateVars=${JSON.stringify(stateVars)}, diagramCode.length=${diagramCode.length}`);
                if (!result.eligible) {
                    logger.debug('generate(): state not eligible, sending empty diagram');
                    this._currentRequestId = requestId;
                    this._summaryAbort?.abort();
                    this._lastDiagramType = type;
                    this._lastDocumentUri = editor.document.uri.toString();
                    this._lastFunctionHash = null;
                    this._lastSelectedStateVar = null;
                    this.post({
                        type: 'diagram',
                        name: targetName,
                        svg: '<div class="empty-state">No state transitions detected in this scope</div>',
                        plantUml: '',
                        mermaidCode: visualizer.isMermaid() ? diagramCode : '',
                        diagramMode: this.currentDiagramMode,
                        classCount: 0,
                        scopeWarning: false,
                        externalGuesses: [],
                        stateVars: [],
                        activeStateVar: null,
                        requestId
                    });
                    void this._runSummary(pendingSummary, editor.document, requestId);
                    return;
                }
                hashSource = targetName + (func.rawBody || func.body) + summaries.extractImports(editor.document.getText());
                const newHash = this._computeFunctionHash(hashSource);
                logger.debug(`generate(): state hash check — lastHash=${this._lastFunctionHash?.slice(0,8)}, newHash=${newHash.slice(0,8)}`);
                if (this._lastFunctionHash === newHash && this.currentFunctionName === targetName &&
                    this._lastDiagramType === type && this._lastDocumentUri === editor.document.uri.toString() &&
                    this._lastSelectedStateVar === activeStateVar) {
                    logger.debug('generate(): state hash unchanged, skipping render');
                    return;
                }
                this._lastFunctionHash = newHash;
                this._lastSelectedStateVar = activeStateVar;
            } else {
                logger.debug(`generate(): ${type} diagram path`);
                const functions = parseFunctions(editor.document);
                const func = functions.find(f => f.name === targetName);
                if (!func) {
                    logger.debug(`generate(): target function "${targetName}" not found`);
                    return;
                }
                diagramCode = visualizer.generateFlowchart(func.name, func.body, currentLanguage);
                if (type === 'sequence') {
                    diagramCode = visualizer.generateSequence(func.name, func.body, currentLanguage);
                }
                pendingSummary = {
                    name: func.name,
                    body: func.rawBody || func.body,
                    language: currentLanguage,
                    startLine: func.startLine,
                    imports: summaries.extractImports(editor.document.getText())
                };
                hashSource = targetName + (func.rawBody || func.body) + summaries.extractImports(editor.document.getText());
                const newHash = this._computeFunctionHash(hashSource);
                logger.debug(`generate(): ${type} hash check — lastHash=${this._lastFunctionHash?.slice(0,8)}, newHash=${newHash?.slice(0,8)}`);
                if (this._lastFunctionHash === newHash && this.currentFunctionName === targetName &&
                    this._lastDiagramType === type && this._lastDocumentUri === editor.document.uri.toString()) {
                    logger.debug('generate(): hash unchanged, skipping render');
                    return;
                }
                this._lastFunctionHash = newHash;
            }

            this._currentRequestId = requestId;
            this._currentVisualizer?.killProcess();
            this._summaryAbort?.abort();
            this._currentVisualizer = visualizer;
            logger.debug(`generate(): set _currentRequestId=${requestId}, diagramCode.length=${diagramCode.length}`);

            if (this._currentRequestId !== requestId) {
                logger.debug('generate(): stale request (after _currentRequestId set), aborting');
                return;
            }

            this._generationInProgress = true;
            this.post({ type: 'loading', name: targetName, requestId });
            // Summaries must not depend on Java/diagram rendering completing.
            if (pendingSummary) {
                void this._runSummary(pendingSummary, editor.document, requestId);
                pendingSummary = null;
            }
            logger.debug(`generate(): posted loading message for requestId=${requestId}`);

            serverUrl = plantUmlServer ? plantUmlServer.getUrl() : null;
            logger.debug(`generate(): serverUrl=${serverUrl}, about to call visualizer.render()`);
            const isDarkPlantUml = this.currentDiagramMode === 'plantuml' && this.diagramTheme === 'dark';
            const renderCode = isDarkPlantUml ? palette.darkenPalette(diagramCode) : diagramCode;
            const rendered = await visualizer.render(renderCode, this.context, serverUrl, requestId);
            if (isDarkPlantUml && rendered.svg) rendered.svg = palette.fixDarkSvg(rendered.svg);
            logger.debug(`generate(): visualizer.render() completed, svg.length=${rendered.svg?.length || 0}`);

            if (this._currentRequestId !== requestId) {
                logger.debug('generate(): stale request (after render), aborting diagram post');
                return;
            }

            this._lastDiagramType = type;
            this._lastDocumentUri = editor.document.uri.toString();
            if (type === 'class') this._lastClassName = targetName;

            logger.log(`generate(): posting diagram result for requestId=${requestId}, svg.length=${rendered.svg?.length || 0}`);
            this.post({
                type: 'diagram',
                name: targetName,
                svg: rendered.svg,
                plantUml: visualizer.isPlantUML() ? diagramCode : '',
                mermaidCode: visualizer.isMermaid() ? diagramCode : '',
                diagramMode: this.currentDiagramMode,
                classCount: classCount,
                scopeWarning: externalGuesses && externalGuesses.length > 0,
                externalGuesses,
                stateVars,
                activeStateVar,
                requestId
            });


        } catch (err) {
            if (err.name === 'AbortError' || err.message === 'Process killed') {
                logger.debug(`generate(): caught ${err.name}: ${err.message} — returning silently`);
                return;
            }
            logger.error(`generate(): ${err.message}`, err.stack);
            console.error('Generation error:', err);
            this.post({ type: 'error', message: err.message });
        } finally {
            if (this._currentRequestId === requestId) {
                this._generationInProgress = false;
                this._currentVisualizer = null;
                logger.debug(`generate(): finally — reset _generationInProgress for requestId=${requestId}`);
            } else {
                logger.debug(`generate(): finally — _currentRequestId (${this._currentRequestId}) !== requestId (${requestId}), skipping reset`);
            }
        }
    }

    async findWorkspaceClasses(targetName, currentDoc) {
        // Notebook cell text is Python/etc., not raw .ipynb JSON to scan as a source file.
        if (currentDoc.uri.scheme === 'vscode-notebook-cell') return [];
        const ext = path.extname(currentDoc.uri.fsPath);

        const cacheKey = `${ext}`;
        if (this._classCache.has(cacheKey)) {
            logger.debug(`findWorkspaceClasses(): cache hit for ${ext} (${this._classCache.get(cacheKey).length} classes)`);
            return this._classCache.get(cacheKey);
        }
        logger.debug(`findWorkspaceClasses(): cache miss for ${ext}, scanning workspace...`);

        const languageId = ext === '.java' ? 'java'
            : ext === '.py' ? 'python'
            : ext === '.ts' ? 'typescript'
            : ext === '.cpp' || ext === '.cc' || ext === '.cxx' ? 'cpp'
            : 'javascript';
        const provider = registry.getLanguageProvider(languageId);

        // Build exclude glob from user setting (comma-separated directory names)
        const excludeDirs = (vscode.workspace.getConfiguration('liveUml').get('classExcludePatterns', 'node_modules, build, bin, dist, target') || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        const excludeGlob = excludeDirs.length > 0
            ? `{${excludeDirs.map(d => `**/${d}/**`).join(',')}}`
            : undefined;

        const files = await vscode.workspace.findFiles(
            `**/*${ext}`,
            excludeGlob
        );

        const results = await Promise.all(files.map(async file => {
            try {
                const contentBytes = await vscode.workspace.fs.readFile(file);
                const content = Buffer.from(contentBytes).toString('utf8');
                // Light parse: extract class headers only (name, parent, interfaces)
                // avoids expensive comment-removal, body-extraction, and method-scanning
                // for every file in the workspace. Full parsing (including methods) is
                // done lazily only for classes that end up in the diagram displaySet.
                const parsed = provider.parseClassesLight(content);
                parsed.forEach(c => c.fileUri = file); // Attach URI for fast navigation
                // Cache per file (light)
                const fileKey = `light:${ext}:${file.toString()}`;
                this._classCache.set(fileKey, parsed);
                // Cache raw content for lazy method resolution
                this._fileContentCache.set(`content:${ext}:${file.toString()}`, content);
                return parsed;
            } catch (e) {
                return [];
            }
        }));

        const allClasses = [].concat(...results);
        // Also store a combined cache for the extension for quick fallback
        this._classCache.set(cacheKey, allClasses);
        return allClasses;
    }

    // Resolve methods for classes in the display set that came from workspace (light-parsed, no methods).
    // Reads cached file content, full-parses the file, and extracts methods for each target class.
    async _resolveDisplayClassMethods(classes, displayClassNames, ext) {
        const languageId = ext === '.java' ? 'java'
            : ext === '.py' ? 'python'
            : ext === '.ts' ? 'typescript'
            : ext === '.cpp' || ext === '.cc' || ext === '.cxx' ? 'cpp'
            : 'javascript';
        const provider = registry.getLanguageProvider(languageId);

        // Collect unique files that have displayed classes needing methods
        const fileUris = new Set();
        const classByFile = new Map();
        for (const name of displayClassNames) {
            const cls = classes.find(c => c.name === name);
            // Classes from current editor already have methods; only resolve workspace classes
            if (cls && (!cls.methods || cls.methods.length === 0) && cls.fileUri) {
                const uriStr = cls.fileUri.toString();
                fileUris.add(uriStr);
                if (!classByFile.has(uriStr)) classByFile.set(uriStr, []);
                classByFile.get(uriStr).push(cls);
            }
        }

        await Promise.all(Array.from(fileUris).map(async (uriStr) => {
            const fileUri = vscode.Uri.parse(uriStr);
            const fileKey = `content:${ext}:${uriStr}`;

            // Get cached content or re-read
            let content = this._fileContentCache.get(fileKey);
            if (!content) {
                try {
                    const bytes = await vscode.workspace.fs.readFile(fileUri);
                    content = Buffer.from(bytes).toString('utf8');
                    this._fileContentCache.set(fileKey, content);
                } catch (e) {
                    return;
                }
            }

            // Full-parse the file to extract methods
            const fullParsed = provider.parseClasses(content);
            const fullKey = `full:${ext}:${uriStr}`;
            this._classCache.set(fullKey, fullParsed);

            // Attach methods to the light class objects
            const targetClasses = classByFile.get(uriStr);
            for (const targetCls of targetClasses) {
                const match = fullParsed.find(c => c.name === targetCls.name);
                if (match && match.methods) {
                    targetCls.methods = match.methods;
                }
            }
        }));
    }

    getHtml() {
        // Mermaid ships with the extension (mermaid/mermaid.js, alongside the
        // bundled plantuml/plantuml.jar) and is served via asWebviewUri so
        // nothing is ever fetched from the internet.
        let mermaidScriptUri = '';
        if (this.view) {
            mermaidScriptUri = this.view.webview.asWebviewUri(
                vscode.Uri.joinPath(this.context.extensionUri, 'mermaid', 'mermaid.js')
            ).toString();
        }
        const extensionVersion = vscode.extensions.getExtension('bitlab.live-uml')?.packageJSON?.version || '1.0.7';
        return getWebviewHtml(mermaidScriptUri, extensionVersion);
    }
}

function parseFunctions(document) {
    const text = document.getText();
    const languageId = document.languageId;
    const provider = registry.getLanguageProvider(languageId);
    const parsedFunctions = provider.parseFunctions(text);

    if (parsedFunctions.length === 0) {
        return [{ name: 'file_content', body: text }];
    }
    return parsedFunctions;
}

function parseClasses(document) {
    const text = document.getText();
    const languageId = document.languageId;
    const provider = registry.getLanguageProvider(languageId);
    return provider.parseClasses(text);
}

module.exports = { activate };

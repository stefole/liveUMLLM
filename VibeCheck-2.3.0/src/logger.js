const vscodeRef = (() => {
    try { return require('vscode'); } catch (e) { return null; }
})();

let _outputChannel = null;

function getChannel() {
    if (!_outputChannel) {
        if (vscodeRef) {
            _outputChannel = vscodeRef.window.createOutputChannel('VibeCheck');
        } else {
            _outputChannel = { appendLine: () => { }, show: () => { } };
        }
    }
    return _outputChannel;
}

// Debug/verbose output is controlled by the vibecheck.debug configuration.
function isVerbose() {
    try {
        if (vscodeRef && vscodeRef.workspace && vscodeRef.workspace.getConfiguration) {
            return vscodeRef.workspace.getConfiguration('vibecheck').get('debug', false) === true;
        }
    } catch (e) { /* fall through */ }
    return false;
}

function _now() {
    return new Date().toISOString().slice(11, 23);
}

function _fmt(...args) {
    return args.map(a => {
        if (typeof a === 'string') return a;
        if (a instanceof Error) return a.stack || a.message;
        try { return JSON.stringify(a); } catch (e) { return String(a); }
    }).join(' ');
}

// Info-level lifecycle and operation messages: always written to the Output channel.
function log(...args) {
    getChannel().appendLine(`[${_now()}] ${_fmt(...args)}`);
}

// Verbose diagnostics: only written when vibecheck.debug is true.
function debug(...args) {
    if (!isVerbose()) return;
    getChannel().appendLine(`[${_now()}] DEBUG: ${_fmt(...args)}`);
}

function warn(...args) {
    getChannel().appendLine(`[${_now()}] WARN: ${_fmt(...args)}`);
}

function error(...args) {
    getChannel().appendLine(`[${_now()}] ERROR: ${_fmt(...args)}`);
}

// Reveal the "VibeCheck" channel in the Output panel. `preserveFocus` keeps
// focus in the editor so activating the extension does not yank the user.
function show(preserveFocus = true) {
    getChannel().show(preserveFocus);
}

module.exports = { log, debug, warn, error, show };

// Live getter so `logger.VERBOSE` (used to enable webview console logging)
// always reflects the current configuration.
Object.defineProperty(module.exports, 'VERBOSE', { get: () => isVerbose() });

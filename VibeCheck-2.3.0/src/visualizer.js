const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const core = require('./core');
const registry = require('./registry');
const logger = require('./logger');

class Visualizer {
    constructor(mode) {
        this.mode = mode;
        this._providers = {};
        const suffixes = ['flowchart', 'class'];
        for (const type of suffixes) {
            this._providers[type] = registry.getDiagramProvider(type, mode);
        }
    }

    isMermaid() { return this.mode === 'mermaid'; }
    isPlantUML() { return this.mode === 'plantuml'; }

    getSourceLabel() { return this.mode === 'mermaid' ? 'Mermaid' : 'PlantUML'; }

    generateFlowchart(name, body, language) {
        return this._providers['flowchart'].generate(name, body, language);
    }

    generateClass(targetClassName, classes, language) {
        return this._providers['class'].generate(targetClassName, classes, language);
    }

    getCodeKey() {
        return this.isMermaid() ? 'mermaidCode' : 'plantUml';
    }

    async render(plantUmlCode, context, serverUrl, requestId) {
        logger.log(`Visualizer.render() called — mode=${this.mode}, requestId=${requestId}, code.length=${plantUmlCode?.length || 0}`);
        if (this.isMermaid()) {
            logger.debug('Visualizer.render(): Mermaid mode, returning code directly');
            return { svg: '', mermaidCode: plantUmlCode, plantUml: '' };
        }
        logger.log('Visualizer.render(): PlantUML mode, spawning Java process');
        const svg = await this._generatePlantUMLSVGWithProcess(plantUmlCode, context, serverUrl, requestId);
        logger.debug(`Visualizer.render(): SVG received, length=${svg?.length || 0}`);
        return { svg, mermaidCode: '', plantUml: plantUmlCode };
    }

    async _generatePlantUMLSVGWithProcess(plantUmlCode, context, serverUrl, requestId) {
        if (serverUrl) {
            logger.log(`Visualizer: attempting PlantUML server at ${serverUrl}`);
            try {
                const result = await core.generatePlantUMLSVGServer(plantUmlCode, serverUrl);
                logger.log('Visualizer: PlantUML server succeeded');
                return result;
            } catch (err) {
                logger.warn(`PlantUML Server Error (falling back): ${err.message}`);
            }
        } else {
            logger.log('Visualizer: no server URL, using direct Java process');
        }

        let javaPath = 'java';
        try {
            const vscode = require('vscode');
            const config = vscode.workspace.getConfiguration('vibecheck');
            javaPath = config.get('javaPath', 'java');
        } catch (e) {
            javaPath = 'java';
        }
        const jarPath = path.join(context.extensionPath, 'plantuml', 'plantuml.jar');

        if (!fs.existsSync(jarPath)) {
            logger.error(`Visualizer: jar not found at ${jarPath}`);
            throw new Error('Java or PlantUML jar missing');
        }

        logger.log(`Visualizer: spawning java process — java=${javaPath}, jar=${jarPath}, requestId=${requestId}`);

        return new Promise((resolve, reject) => {
            const child = spawn(javaPath, [
                '-Djava.awt.headless=true',
                '-jar', jarPath,
                '-tsvg', '-pipe'
            ]);

            this._currentProcess = child;
            const timer = setTimeout(() => {
                reject(new Error('PlantUML rendering timed out after 15 seconds. Check the Java path or switch to Mermaid.'));
                child.kill();
            }, 15000);
            let stdout = '';
            let stderr = '';
            let stdoutSize = 0;
            let stderrSize = 0;

            child.stdout.on('data', data => {
                stdout += data.toString();
                stdoutSize += data.length;
            });
            child.stderr.on('data', data => {
                stderr += data.toString();
                stderrSize += data.length;
            });

            child.on('error', (err) => {
                clearTimeout(timer);
                logger.error(`Visualizer: process error — ${err.message}`);
                reject(err);
            });

            child.on('close', code => {
                clearTimeout(timer);
                logger.debug(`Visualizer: process closed — code=${code}, stdout=${stdoutSize} bytes, stderr=${stderrSize} bytes, currentReq=${this._currentRequestId}, expectedReq=${requestId}`);
                if (this._currentRequestId !== requestId) {
                    reject(new Error('Process killed'));
                    return;
                }
                if (code === 0) {
                    logger.log(`Visualizer: PlantUML process succeeded (${stdoutSize} bytes)`);
                    resolve(stdout);
                } else {
                    logger.error(`Visualizer: PlantUML process failed with code ${code}: ${stderr || '(no stderr)'}`);
                    reject(new Error(stderr || 'PlantUML failed'));
                }
            });

            const codePreview = plantUmlCode.length > 200 ? plantUmlCode.slice(0, 200) + '...' : plantUmlCode;
            logger.debug(`Visualizer: writing ${plantUmlCode.length} bytes to stdin: ${codePreview}`);
            child.stdin.on('error', error => {
                clearTimeout(timer);
                reject(error);
                child.kill();
            });
            child.stdin.write(plantUmlCode);
            child.stdin.end();
        });
    }

    killProcess() {
        if (this._currentProcess) {
            logger.debug('Visualizer.killProcess(): killing existing process');
            try { this._currentProcess.kill(); } catch (e) {
                logger.warn(`Visualizer.killProcess(): error killing process — ${e.message}`);
            }
            this._currentProcess = null;
        }
    }

    setRequestId(id) {
        logger.debug(`Visualizer.setRequestId(${id})`);
        this._currentRequestId = id;
    }
}

module.exports = Visualizer;

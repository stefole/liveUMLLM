

const { PROVIDERS } = require('./llmConfig');

function getWebviewHtml(mermaidScriptUri, extensionVersion) {
    return `
        <html>
        <head>
        <style>
            :root {
                --bg-primary: #1e1e1e;
                --bg-secondary: #252526;
                --bg-tertiary: #2d2d2d;
                --bg-hover: #333333;
                --bg-active: #37373d;
                --text-primary: #e0e0e0;
                --text-secondary: #969696;
                --text-muted: #6e6e6e;
                --accent: #4fc3f7;
                --accent-hover: #29b6f6;
                --accent-dim: rgba(79, 195, 247, 0.15);
                --border: #3c3c3c;
                --success: #4caf50;
                --warning: #ff9800;
                --error: #f44336;
                --radius: 8px;
                --radius-sm: 4px;
                --shadow: 0 2px 8px rgba(0,0,0,0.3);
                --diagram-bg: #1e1e1e;
            }

            :root[data-theme="light"] {
                --bg-primary: #ffffff;
                --bg-secondary: #f3f3f3;
                --bg-tertiary: #e8e8e8;
                --bg-hover: #e0e0e0;
                --bg-active: #d6d6d6;
                --text-primary: #1f1f1f;
                --text-secondary: #5a5a5a;
                --text-muted: #8a8a8a;
                --accent: #0288d1;
                --accent-hover: #0277bd;
                --accent-dim: rgba(2, 136, 209, 0.12);
                --border: #d0d0d0;
                --shadow: 0 2px 8px rgba(0,0,0,0.08);
                --diagram-bg: #ffffff;
            }

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                background: var(--bg-primary);
                color: var(--text-primary);
                font-size: 13px;
                line-height: 1.5;
                overflow-x: hidden;
            }

            .welcome {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 32px 20px;
                text-align: center;
                min-height: 300px;
            }

            .welcome-icon {
                font-size: 48px;
                margin-bottom: 16px;
                opacity: 0.6;
            }

            .welcome h2 {
                font-size: 18px;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 8px;
            }

            .welcome p {
                color: var(--text-secondary);
                font-size: 13px;
                max-width: 280px;
                line-height: 1.6;
            }

            .welcome-steps {
                margin-top: 24px;
                text-align: left;
                width: 100%;
                max-width: 280px;
            }

            .welcome-step {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 10px 12px;
                background: var(--bg-tertiary);
                border-radius: var(--radius);
                margin-bottom: 8px;
                border: 1px solid var(--border);
            }

            .welcome-step .step-num {
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background: var(--accent-dim);
                color: var(--accent);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 700;
                flex-shrink: 0;
            }

            .welcome-step .step-text {
                color: var(--text-secondary);
                font-size: 12px;
                line-height: 1.5;
            }

            .welcome-step .step-text strong {
                color: var(--text-primary);
            }

            .header {
                padding: 6px 12px;
                display: flex;
                align-items: center;
                gap: 8px;
                border-bottom: 1px solid var(--border);
                background: var(--bg-secondary);
            }

            .header-title {
                font-size: 13px;
                font-weight: 600;
                color: var(--text-primary);
                white-space: nowrap;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .header-title .badge {
                font-size: 9px;
                background: var(--accent-dim);
                color: var(--accent);
                padding: 1px 6px;
                border-radius: 10px;
                font-weight: 500;
            }

            .header-stats {
                flex: 1;
                text-align: center;
                font-size: 10px;
                color: var(--text-muted);
                white-space: nowrap;
            }

            .header-actions {
                display: flex;
                gap: 4px;
            }

            .header-actions button {
                background: none;
                border: 1px solid var(--border);
                color: var(--text-secondary);
                width: 26px;
                height: 26px;
                border-radius: var(--radius-sm);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                transition: all 0.15s ease;
            }

            .header-actions button:hover {
                background: var(--bg-hover);
                color: var(--text-primary);
                border-color: var(--accent);
            }

            .function-bar {
                padding: 8px 12px;
                border-bottom: 1px solid var(--border);
            }

            .function-select {
                width: 100%;
                background: var(--bg-tertiary);
                color: var(--text-primary);
                border: 1px solid var(--border);
                border-radius: var(--radius);
                padding: 6px 10px;
                font-size: 12px;
                font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
                cursor: pointer;
                outline: none;
                transition: border-color 0.15s ease;
                appearance: none;
                -webkit-appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23969696' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 8px center;
                padding-right: 28px;
            }

            .function-select:focus {
                border-color: var(--accent);
            }

            .function-select option {
                background: var(--bg-secondary);
                color: var(--text-primary);
            }

            .tabs {
                display: flex;
                gap: 2px;
                padding: 8px 12px;
                background: var(--bg-secondary);
                border-bottom: 1px solid var(--border);
            }

            .mode-tabs {
                display: flex;
                justify-content: center;
                gap: 2px;
                padding: 6px 12px;
                background: var(--bg-secondary);
                border-bottom: 1px solid var(--border);
            }

            .mode-tabs .tab {
                flex: 1;
                padding: 3px 12px;
                text-align: center;
                font-size: 10px;
                font-weight: 600;
                color: var(--text-muted);
                background: transparent;
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                cursor: pointer;
                transition: all 0.15s ease;
                position: relative;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .mode-tabs .tab:hover {
                color: var(--text-secondary);
                background: var(--bg-hover);
            }

            .mode-tabs .tab.active {
                color: var(--accent);
                background: var(--accent-dim);
                border-color: var(--accent);
            }

            .mode-tabs .tab.active::after {
                display: none;
            }

            .tab {
                flex: 1;
                padding: 5px 8px;
                text-align: center;
                font-size: 11px;
                font-weight: 500;
                color: var(--text-muted);
                background: transparent;
                border: none;
                border-radius: var(--radius-sm);
                cursor: pointer;
                transition: all 0.15s ease;
                position: relative;
            }

            .tab:hover {
                color: var(--text-secondary);
                background: var(--bg-hover);
            }

            .tab.active {
                color: var(--accent);
                background: var(--accent-dim);
            }

            .tab.active::after {
                content: '';
                position: absolute;
                bottom: -8px;
                left: 50%;
                transform: translateX(-50%);
                width: 20px;
                height: 2px;
                background: var(--accent);
                border-radius: 1px;
            }

            .diagram-container {
                padding: 12px;
            }

            .diagram-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            .state-var-selector {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 10px;
                padding: 6px 10px;
                background: var(--bg-secondary);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
            }

            .state-var-selector .selector-label {
                font-size: 11px;
                color: var(--text-muted);
                font-weight: 500;
            }

            .state-var-selector .selector-pills {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }

            .state-var-selector .pill {
                background: var(--bg-tertiary);
                border: 1px solid var(--border);
                color: var(--text-secondary);
                padding: 2px 8px;
                border-radius: 12px;
                cursor: pointer;
                font-size: 10px;
                transition: all 0.15s ease;
                outline: none;
            }

            .state-var-selector .pill:hover {
                background: var(--bg-hover);
                color: var(--text-primary);
                border-color: var(--accent);
            }

            .state-var-selector .pill.active {
                background: var(--accent);
                color: #1e1e1e;
                border-color: var(--accent);
                font-weight: 600;
            }

            .diagram-title {
                font-size: 12px;
                font-weight: 500;
                color: var(--text-secondary);
                font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
            }

            .diagram-title .func-name {
                color: var(--accent);
            }

            .diagram-actions {
                display: flex;
                gap: 4px;
            }

            .diagram-actions button, .diagram-zoom button, #regenerateSummary, #testConnection {
                background: var(--bg-tertiary);
                border: 1px solid var(--border);
                color: var(--text-secondary);
                padding: 3px 8px;
                border-radius: var(--radius-sm);
                cursor: pointer;
                font-size: 10px;
                transition: all 0.15s ease;
            }

            .diagram-actions button:hover, .diagram-zoom button:hover, #regenerateSummary:hover, #testConnection:hover {
                background: var(--bg-hover);
                color: var(--text-primary);
                border-color: var(--accent);
            }

            .element-hover {
                position: fixed;
                z-index: 40;
                max-width: 320px;
                padding: 9px 11px;
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                background: var(--bg-secondary);
                color: var(--text-primary);
                box-shadow: 0 8px 24px rgba(0,0,0,.45);
                font-size: 11px;
                line-height: 1.5;
                pointer-events: none;
            }
            .element-hover .h-title { color: var(--accent); font-weight: 600; margin-bottom: 3px; }
            .element-hover .h-line { color: var(--text-muted); font-family: ui-monospace,Consolas,monospace; font-size: 10px; }
            .element-hover .h-docs { margin-top: 5px; color: var(--text-secondary); white-space: pre-wrap; max-height: 150px; overflow: hidden; }
            .element-hover .h-issue { margin-top: 5px; color: var(--warning); }

            [data-issue].node-issue-high rect, [data-issue].node-issue-high polygon, [data-issue].node-issue-high path,
            [data-issue].node-issue-medium rect, [data-issue].node-issue-medium polygon, [data-issue].node-issue-medium path,
            [data-issue].node-issue-low rect, [data-issue].node-issue-low polygon, [data-issue].node-issue-low path {
                stroke-width: 3px !important;
            }
            [data-issue].node-issue-high rect, [data-issue].node-issue-high polygon, [data-issue].node-issue-high path { stroke: #ff5c5c !important; fill: #3a2026 !important; }
            [data-issue].node-issue-medium rect, [data-issue].node-issue-medium polygon, [data-issue].node-issue-medium path { stroke: #e2a03f !important; fill: #3a3020 !important; }
            [data-issue].node-issue-low rect, [data-issue].node-issue-low polygon, [data-issue].node-issue-low path { stroke: #d7ba7d !important; fill: #333022 !important; }
            [data-issue] text { fill: #ffffff !important; }
            [data-issue] { cursor: pointer; }

            .analysis-panel {
                margin: 8px 12px 0;
                padding: 10px 12px;
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                background: var(--bg-secondary);
                font-size: 11px;
            }
            .analysis-title { display:flex; align-items:center; justify-content:space-between; color: var(--text-muted); font-size:10px; text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px; }
            .analysis-summary { color: var(--text-secondary); line-height:1.5; }
            .issue-row { display:flex; gap:7px; align-items:flex-start; padding:6px 0; border-top:1px solid var(--border); cursor:pointer; }
            .issue-row:hover { color: var(--accent); }
            .issue-dot { width:8px; height:8px; border-radius:50%; margin-top:4px; flex-shrink:0; }
            .issue-dot.high { background:#ff5c5c; } .issue-dot.medium { background:#e2a03f; } .issue-dot.low { background:#d7ba7d; }
            .issue-title { color: var(--text-primary); font-weight:500; }
            .issue-meta { color: var(--text-muted); font-size:10px; margin-top:1px; }

            .details-open .element-hover { display: none !important; }

            .element-details {
                position: fixed;
                left: 8px;
                right: 8px;
                bottom: 8px;
                z-index: 30;
                max-height: 48vh;
                overflow: auto;
                padding: 10px 12px; border:1px solid var(--accent-dim);
                border-radius: var(--radius-sm); background: var(--bg-secondary); box-shadow: 0 10px 30px rgba(0,0,0,.5); font-size: 11px;
            }
            .element-details .detail-head { display:flex; justify-content:space-between; align-items:center; gap:8px; }
            .element-details .detail-label { color: var(--accent); font-weight:600; font-family: ui-monospace,Consolas,monospace; }
            .element-details .detail-code { background: var(--bg-tertiary); padding:6px 8px; border-radius:4px; margin:6px 0; font-family: ui-monospace,Consolas,monospace; font-size:10px; white-space:pre-wrap; }
            .element-details .detail-docs { color: var(--text-secondary); white-space:pre-wrap; max-height:100px; overflow:auto; margin:5px 0; }
            .element-details .detail-issue { border-left:3px solid #ff5c5c; padding-left:8px; margin-top:8px; }
            .element-details button { margin-top:6px; }

            .onboarding-card { margin-top:14px; padding:12px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg-secondary); text-align:left; }
            .onboarding-card h3 { margin:0 0 4px; font-size:12px; color:var(--text-primary); }
            .onboarding-card p { margin:0 0 8px; font-size:11px; color:var(--text-secondary); line-height:1.5; }
            .onboarding-card .setting-row { padding:6px 0; }
            .onboarding-card .setting-input { width:100%; box-sizing:border-box; }
            .onboarding-card .btn-save, .onboarding-card .btn-cancel { margin-top:8px; }
            .onboarding-success { color: var(--accent); margin-top:6px; }

            .diagram-zoom {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 5px;
                margin-bottom: 8px;
                color: var(--text-secondary);
                font-size: 11px;
            }

            #regenerateSummary { padding: 5px 9px; font-size: 11px; }
            #regenerateSummary:disabled { cursor: wait; opacity: 0.55; }

            .diagram-zoom button:focus-visible {
                outline: 2px solid var(--accent);
                outline-offset: 2px;
            }

            .diagram-view {
                background: var(--diagram-bg);
                border-radius: var(--radius);
                overflow: auto;
                box-shadow: var(--shadow);
                min-height: 100px;
                max-height: 60vh;
                padding: 12px;
                display: block;
                position: relative;
                transition: opacity 0.1s ease-in-out;
            }

            .diagram-view.loading {
                opacity: 0.7;
            }

            .diagram-view svg {
                display: block;
                max-width: none;
                flex-shrink: 0;
                margin: 0 auto;
            }

            .mermaid svg text {
                font-size: 13px !important;
            }
            .mermaid .classGroup rect {
                rx: 4px !important;
            }
            .mermaid .label {
                font-size: 13px !important;
            }
            .mermaid .edgeLabel {
                font-size: 11px !important;
            }
            .mermaid .node rect,
            .mermaid .node ellipse,
            .mermaid .node circle,
            .mermaid .node polygon {
                stroke-width: 1.5px !important;
            }
            .mermaid .flowchart-link {
                stroke-width: 1.5px !important;
            }

            .loading-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px 20px;
                gap: 12px;
            }

            .spinner {
                width: 28px;
                height: 28px;
                border: 3px solid var(--border);
                border-top-color: var(--accent);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .loading-text {
                color: var(--text-muted);
                font-size: 12px;
            }

            .error-state {
                padding: 20px;
                text-align: center;
                color: var(--error);
                font-size: 12px;
                background: rgba(244, 67, 54, 0.08);
                border-radius: var(--radius);
                border: 1px solid rgba(244, 67, 54, 0.2);
            }

            .empty-state {
                padding: 40px 20px;
                text-align: center;
                color: var(--text-muted);
                font-size: 12px;
            }

            .empty-state .empty-icon {
                font-size: 32px;
                margin-bottom: 8px;
                opacity: 0.5;
            }

            .code-section {
                margin-top: 12px;
                border: 1px solid var(--border);
                border-radius: var(--radius);
                overflow: hidden;
                display: block;
                height: auto;
            }

            details.code-section[open] {
                display: flex;
                flex-direction: column;
                resize: vertical;
                height: 200px;
                min-height: 60px;
            }

            .code-header {
                cursor: pointer;
                list-style: none;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 6px 10px;
                background: var(--bg-tertiary);
                border-bottom: 1px solid var(--border);
                font-size: 11px;
                color: var(--text-muted);
                flex-shrink: 0;
            }

            .code-header button {
                background: none;
                border: 1px solid var(--border);
                color: var(--text-secondary);
                padding: 2px 8px;
                border-radius: var(--radius-sm);
                cursor: pointer;
                font-size: 10px;
                transition: all 0.15s ease;
            }

            .code-header button:hover {
                background: var(--bg-hover);
                color: var(--text-primary);
            }

            .code-content {
                background: #1a1a2e;
                padding: 10px;
                font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
                font-size: 11px;
                line-height: 1.6;
                color: #a0a0c0;
                overflow: auto;
                white-space: pre;
                flex: 1;
                min-height: 0;
            }

            .status-bar {
                padding: 6px 12px;
                border-top: 1px solid var(--border);
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 10px;
                color: var(--text-muted);
            }

            .status-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: var(--success);
                flex-shrink: 0;
            }

            .status-dot.loading {
                background: var(--warning);
                animation: pulse 1s ease-in-out infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
            }

            .status-dot.error {
                background: var(--error);
            }

            ::-webkit-scrollbar {
                width: 6px;
                height: 6px;
            }

            ::-webkit-scrollbar-track {
                background: transparent;
            }

            ::-webkit-scrollbar-thumb {
                background: var(--border);
                border-radius: 3px;
            }

            ::-webkit-scrollbar-thumb:hover {
                background: var(--text-muted);
            }

            .settings-panel {
                padding: 12px;
                border-bottom: 1px solid var(--border);
                background: var(--bg-secondary);
            }

            .settings-panel .settings-title {
                font-size: 12px;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .settings-panel .settings-title button {
                background: none;
                border: 1px solid var(--border);
                color: var(--text-secondary);
                width: 22px;
                height: 22px;
                border-radius: var(--radius-sm);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                transition: all 0.15s ease;
            }

            .settings-panel .settings-title button:hover {
                background: var(--bg-hover);
                color: var(--text-primary);
                border-color: var(--accent);
            }

            .setting-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid var(--border);
            }

            .setting-row:last-child {
                border-bottom: none;
            }

            .setting-label {
                font-size: 12px;
                color: var(--text-primary);
                flex: 1;
            }

            .setting-desc {
                font-size: 10px;
                color: var(--text-muted);
                margin-top: 2px;
            }

            .setting-input {
                background: var(--bg-tertiary);
                color: var(--text-primary);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                padding: 4px 8px;
                font-size: 11px;
                width: 80px;
                text-align: center;
                outline: none;
                transition: border-color 0.15s ease;
            }

            .setting-input:focus {
                border-color: var(--accent);
            }

            .setting-input.wide {
                width: 160px;
                text-align: left;
                font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
                font-size: 10px;
            }

            .connection-setting { flex-direction: column; align-items: stretch; gap: 5px; }
            .connection-setting .setting-input { width: 100%; box-sizing: border-box; text-align: left; }
            .connection-test { padding: 10px 0; font-size: 11px; }
            #connectionTestStatus { margin-top: 7px; overflow-wrap: anywhere; }
            #testConnection:disabled { opacity: 0.6; cursor: wait; }

            .toggle-switch {
                position: relative;
                width: 36px;
                height: 20px;
                flex-shrink: 0;
            }

            .toggle-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: var(--bg-tertiary);
                border: 1px solid var(--border);
                border-radius: 20px;
                transition: all 0.2s ease;
            }

            .toggle-slider:before {
                content: '';
                position: absolute;
                height: 14px;
                width: 14px;
                left: 2px;
                bottom: 2px;
                background: var(--text-muted);
                border-radius: 50%;
                transition: all 0.2s ease;
            }

            .toggle-switch input:checked + .toggle-slider {
                background: var(--accent-dim);
                border-color: var(--accent);
            }

            .toggle-switch input:checked + .toggle-slider:before {
                transform: translateX(16px);
                background: var(--accent);
            }

            .settings-actions {
                display: flex;
                gap: 8px;
                margin-top: 12px;
                padding-top: 8px;
                border-top: 1px solid var(--border);
            }

            .settings-actions button {
                flex: 1;
                padding: 6px 12px;
                border-radius: var(--radius-sm);
                cursor: pointer;
                font-size: 11px;
                font-weight: 500;
                transition: all 0.15s ease;
                border: 1px solid var(--border);
            }

            .btn-save {
                background: var(--accent);
                color: #1e1e1e;
                border-color: var(--accent) !important;
            }

            .btn-save:hover {
                background: var(--accent-hover);
            }

            .btn-cancel {
                background: var(--bg-tertiary);
                color: var(--text-secondary);
            }

            .btn-cancel:hover {
                background: var(--bg-hover);
                color: var(--text-primary);
            }

            .settings-saved-msg {
                text-align: center;
                padding: 8px;
                font-size: 11px;
                color: var(--success);
                animation: fadeIn 0.2s ease;
            }

            .fade-in {
                animation: fadeIn 0.2s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(4px); }
                to { opacity: 1; transform: translateY(0); }
            }
        </style>
        </head>
        <body>
            <div id="app"></div>
            <script src="${mermaidScriptUri}"></script>
            <script>
                // Mermaid is bundled locally (mermaid/mermaid.js, alongside the bundled
                // plantuml/plantuml.jar) and served through the webview's own
                // resource loading, so the extension works fully offline and
                // never contacts the internet.
                // Guard anyway: if the file is ever missing, 'mermaid' is left
                // undefined. Never let that crash the panel — PlantUML mode (the
                // default) renders SVG entirely in the extension and does not
                // need mermaid at all.
                const mermaidLib = (typeof mermaid !== 'undefined') ? mermaid : null;

                try {
                    if (mermaidLib) {
                        mermaidLib.initialize({
                            startOnLoad: false,
                            theme: 'default',
                            themeVariables: {
                                primaryColor: '#E8F4FD',
                                primaryTextColor: '#1a1a2e',
                                primaryBorderColor: '#2980b9',
                                lineColor: '#2980b9',
                                secondaryColor: '#FFF3CD',
                                tertiaryColor: '#FEFEFE',
                                fontSize: '14px'
                            },
                            flowchart: { useMaxWidth: true, htmlLabels: true },
                            sequence: { useMaxWidth: true, showSequenceNumbers: false },
                            class: { useMaxWidth: true },
                            state: { useMaxWidth: true }
                        });
                    } else {
                        console.warn('[LiveUML] Mermaid CDN script did not load (offline or blocked CDN). PlantUML mode still works; Mermaid mode will show an error.');
                    }
                } catch (e) {
                    console.error('[LiveUML] mermaid.initialize() failed:', e);
                }

                const vscode = acquireVsCodeApi();
                const providerPresets = ${JSON.stringify(PROVIDERS)};
                let connectionTestSequence = 0;
                let connectionKeyTimer;
                const fieldsCache = {};
                let hoverState = null;
                let docsRequestSeq = 0;
                const docsByLine = {};
                const hoverElement = document.createElement('div');
                hoverElement.id = 'elementHover';
                hoverElement.className = 'element-hover';
                hoverElement.style.display = 'none';
                document.body.appendChild(hoverElement);
                const detailsElement = document.createElement('div');
                detailsElement.id = 'elementDetails';
                detailsElement.className = 'element-details';
                detailsElement.style.display = 'none';
                document.body.appendChild(detailsElement);

                // Forward any webview runtime error to the extension's Output
                // channel so a blank panel can be diagnosed without opening the
                // webview developer tools.
                window.addEventListener('error', (e) => {
                    const detail = e.error && e.error.stack ? e.error.stack : (e.error ? e.error.message : (e.message || 'Unknown webview error'));
                    console.error('[LiveUML] webview error:', detail);
                    try {
                        vscode.postMessage({ type: 'log', level: 'error', message: 'Webview: ' + detail });
                    } catch (err) { /* webview not ready yet */ }
                });

                function verboseLog(...args) {
                    if (state && state.verbose) {
                        console.log('[LiveUML]', ...args);
                    }
                }
                let state = {
                    functions: [],
                    classes: [],
                    currentFunction: null,
                    currentClass: null,
                    diagramType: 'file',
                    diagramMode: 'plantuml',
                    diagramZoom: 1,
                    diagramZoomMode: 'actual',
                    diagramSvg: null,
                    plantUmlCode: null,
                    mermaidCode: null,
                    renderedMermaidSvg: null,
                    lastRequestId: 0,
                    isLoading: false,
                    hasEditor: true,
                    error: null,
                    showSettings: false,
                    scopeWarning: false,
                    externalGuesses: [],
                    stateVars: [],
                    activeStateVar: null,
                    stats: { totalFiles: 0, totalClasses: 0, language: '' },
                    verbose: false,
                    theme: 'dark',
                    summary: null,
                    summaryStatus: 'idle',
                    summaryError: '',
                    summaryEnabled: true,
                    summaryUpdateMode: 'automatic',
                    analysisEnabled: true,
                    analysis: null,
                    analysisStatus: 'idle',
                    analysisError: '',
                    analysisSummary: '',
                    elementDetails: null,
                    codeMap: [],
                    fileNodes: [],
                    diagramKind: 'file',
                    fileName: '',
                    settingsSaved: false,
                    settings: {
                        javaPath: 'java',
                        classExcludePatterns: 'node_modules, build, bin, dist, target'
                    }
                };

                const savedState = vscode.getState();
                if (savedState) {
                    state = { ...state, ...savedState };
                }
                // The extension's request counter starts at 1 on every new
                // session, but the persisted lastRequestId can be higher (from a
                // previous session). Without resetting it, every incoming
                // diagram/loading message would look "stale" (reqId <
                // lastRequestId) and be ignored — leaving the panel frozen on the
                // last cached diagram after a VS Code restart. Reset the
                // per-session sequencing state so fresh messages are accepted.
                state.lastRequestId = 0;
                state.isLoading = false;
                applyTheme();
                applyMermaidTheme();

                window.addEventListener('message', e => {
                    const msg = e.data;
                    verboseLog('message received:', msg.type, msg);
                    switch (msg.type) {
                        case 'update':
                            state.functions = msg.functions;
                            state.classes = msg.classes || [];
                            if (state.currentFunction !== msg.currentFunction) {
                                state.summary = null;
                                state.summaryStatus = 'idle';
                                state.summaryError = '';
                            }
                            state.currentFunction = msg.currentFunction;
                            state.summaryEnabled = msg.summaryEnabled !== false;
                            state.summaryUpdateMode = msg.summaryUpdateMode || 'automatic';
                            state.analysisEnabled = msg.analysisEnabled === true;
                            state.fileName = msg.fileName || state.fileName;
                            state.currentClass = msg.currentClass;
                            state.stats = msg.stats || state.stats;
                            state.diagramType = msg.diagramType || state.diagramType;
                            state.diagramMode = msg.diagramMode || state.diagramMode;
                            state.theme = msg.theme || state.theme;
                            applyTheme();
                            applyMermaidTheme();
                            state.verbose = msg.verbose || false;
                            state.hasEditor = true;
                            state.error = null;
                            verboseLog('state updated:', state.currentFunction, state.currentClass);
                            render();
                            vscode.setState(state);
                            break;
                        case 'navUpdate': break;
                        case 'noEditor':
                            verboseLog('no editor, resetting state');
                            state.hasEditor = false;
                            state.functions = [];
                            state.classes = [];
                            state.currentFunction = null;
                            state.currentClass = null;
                            state.diagramSvg = null;
                            state.plantUmlCode = null;
                            state.mermaidCode = null;
                            state.renderedMermaidSvg = null;
                            state.lastRequestId = 0;
                            state.isLoading = false;
                            state.error = null;
                            state.stateVars = [];
                            state.activeStateVar = null;
                            state.analysis = null;
                            state.analysisStatus = 'idle';
                            state.elementDetails = null;
                            if (msg.settings) state.settings = msg.settings;
                            render();
                            vscode.setState(state);
                            break;
                        case 'loading': {
                            const loadReqId = msg.requestId || 0;
                            verboseLog('loading: requestId=' + loadReqId + ', lastRequestId=' + state.lastRequestId);
                            if (loadReqId < (state.lastRequestId || 0)) {
                                verboseLog('loading: stale request, ignoring');
                                break;
                            }
                            state.lastRequestId = loadReqId;
                            state.isLoading = true;
                            state.error = null;
                            state.summary = null;
                            state.summaryStatus = 'idle';
                            state.summaryError = '';
                            state.stateVars = [];
                            state.activeStateVar = null;
                            render();
                            break;
                        }
                        case 'diagram': {
                            const reqId = msg.requestId || 0;
                            verboseLog('diagram: requestId=' + reqId + ', lastRequestId=' + state.lastRequestId + ', svg.length=' + (msg.svg ? msg.svg.length : 0) + ', mermaidCode.length=' + (msg.mermaidCode ? msg.mermaidCode.length : 0));
                            if (reqId < (state.lastRequestId || 0)) {
                                verboseLog('diagram: stale request, ignoring');
                                break;
                            }
                            state.lastRequestId = reqId;
                            state.codeMap = Array.isArray(msg.codeMap) ? msg.codeMap : [];
                            state.fileNodes = Array.isArray(msg.fileNodes) ? msg.fileNodes : [];
                            state.diagramKind = msg.kind || state.diagramType;
                            state.analysis = null;
                            state.analysisStatus = 'idle';
                            state.analysisSummary = '';
                            state.analysisError = '';
                            state.elementDetails = null;
                            state.isLoading = false;
                            state.diagramSvg = msg.svg;
                            state.plantUmlCode = msg.plantUml;
                            state.mermaidCode = msg.mermaidCode;
                            state.diagramMode = msg.diagramMode || state.diagramMode;
                            state.error = null;
                            state.scopeWarning = msg.scopeWarning || false;
                            state.externalGuesses = msg.externalGuesses || [];
                            state.stateVars = msg.stateVars || [];
                            state.activeStateVar = msg.activeStateVar || null;
                            if (msg.classCount !== undefined && state.diagramType === 'class') {
                                state.stats.totalClasses = msg.classCount;
                            }

                            if (state.diagramMode === 'mermaid' && msg.mermaidCode) {
                                verboseLog('diagram: rendering mermaid...');
                                if (!mermaidLib) {
                                    verboseLog('diagram: mermaid unavailable, showing fallback error');
                                    state.isLoading = false;
                                    state.error = 'Mermaid library failed to load (CDN blocked or no internet). Switch to PlantUML mode, or check the Live UML output panel for details.';
                                    render();
                                    vscode.setState(state);
                                    break;
                                }
                                renderMermaid(reqId);
                            } else {
                                verboseLog('diagram: no mermaid, rendering SVG directly');
                                state.renderedMermaidSvg = null;
                                render();
                                vscode.setState(state);
                            }
                            break;
                        }
                        case 'summary': {
                            verboseLog('summary:', msg.name, msg.summary);
                            if (msg.name && msg.name === state.currentFunction && msg.requestId === state.lastRequestId) {
                                state.summaryStatus = 'ready';
                                state.summaryError = '';
                                state.summary = {
                                    name: msg.name,
                                    summary: msg.summary || '',
                                    inputs: msg.inputs || [],
                                    output: msg.output || ''
                                };
                                render();
                                vscode.setState(state);
                            }
                            break;
                        }
                        case 'summaryStatus':
                            if (msg.name !== state.currentFunction || msg.requestId !== state.lastRequestId) break;
                            state.summaryStatus = msg.status;
                            state.summaryError = msg.message || '';
                            state.summaryEnabled = msg.enabled;
                            state.summaryUpdateMode = msg.updateMode;
                            render();
                            break;
                        case 'error':
                            verboseLog('error:', msg.message);
                            state.isLoading = false;
                            state.error = msg.message;
                            render();
                            break;
                        case 'showSettings':
                            verboseLog('showSettings');
                            state.settingsError = '';
                            state.availableModels = [];
                            state.connectionTestMessage = '';
                            state.connectionTestStatus = 'idle';
                            connectionTestSequence++;
                            state.showSettings = true;
                            state.settings = msg.settings;
                            render();
                            break;
                        case 'connectionKeyStatus': {
                            const base = document.getElementById('settingLlmBaseUrl');
                            if (!base || base.value.trim() !== msg.baseUrl) break;
                            state.settings.hasApiKey = msg.hasApiKey;
                            document.getElementById('settingLlmApiKey').placeholder = msg.hasApiKey
                                ? 'Key saved for this endpoint — enter to replace' : 'Paste a key for this endpoint (optional locally)';
                            break;
                        }
                        case 'connectionTestResult':
                            if (msg.requestId !== connectionTestSequence) break;
                            state.connectionTestStatus = msg.success ? 'success' : 'error';
                            state.connectionTestMessage = msg.message;
                            state.availableModels = msg.success ? msg.models : [];
                            render();
                            break;
                        case 'analysisLoading':
                            if (msg.requestId !== state.lastRequestId) break;
                            state.analysisStatus = 'loading';
                            state.analysisError = '';
                            render();
                            break;
                        case 'analysis':
                            if (msg.requestId !== state.lastRequestId) break;
                            state.analysisStatus = msg.skipped ? 'skipped' : 'ready';
                            state.analysis = msg.skipped ? null : { summary: msg.summary || '', issues: msg.issues || [] };
                            state.analysisSummary = msg.summary || '';
                            render();
                            break;
                        case 'analysisError':
                            if (msg.requestId !== state.lastRequestId) break;
                            state.analysisStatus = 'error';
                            state.analysisError = msg.message || 'Analysis failed';
                            render();
                            break;
                        case 'symbolDocsResult': {
                            if (hoverState && hoverState.requestId === msg.requestId) {
                                docsByLine['line:' + msg.line] = msg.docs || '';
                                const target = document.getElementById('hoverDocs');
                                if (target) target.textContent = msg.docs || 'No hover documentation available.';
                            }
                            const details = state.elementDetails;
                            if (!details || details.docsRequestId !== msg.requestId) break;
                            details.docs = msg.docs || 'No hover documentation available for this location.';
                            details.docsLoading = false;
                            fieldsCache[msg.requestId] = msg.docs || '';
                            render();
                            break;
                        }
                        case 'demoOpened':
                            state.hasEditor = true;
                            state.settingsSaved = false;
                            render();
                            break;
                        case 'settingsError':
                            state.settingsError = msg.message;
                            render();
                            break;
                        case 'settingsSaved':
                            verboseLog('settingsSaved');
                            state.settingsSaved = true;
                            state.settings.hasApiKey = true;
                            state.showSettings = false;
                            render();
                            break;
                    }
                });

                let _mermaidSeq = 0;
                function renderMermaid(reqId, code) {
                    const source = code || state.mermaidCode;
                    if (!mermaidLib || !source) return;
                    const uniqueId = 'mermaid-' + reqId + '-' + (++_mermaidSeq);
                    mermaidLib.render(uniqueId, source)
                        .then(({ svg }) => {
                            if (reqId < (state.lastRequestId || 0)) {
                                verboseLog('mermaid render: stale, ignoring');
                                return;
                            }
                            state.renderedMermaidSvg = svg;
                            render();
                            vscode.setState(state);
                        })
                        .catch(err => {
                            if (reqId < (state.lastRequestId || 0)) return;
                            console.error('Mermaid render error:', err);
                            state.renderedMermaidSvg = null;
                            state.error = err.message || 'Mermaid parsing error';
                            render();
                            vscode.setState(state);
                        });
                }

                function applyTheme() {
                    document.documentElement.setAttribute('data-theme', state.theme === 'light' ? 'light' : 'dark');
                }

                function applyMermaidTheme() {
                    if (!mermaidLib) return;
                    const dark = state.theme === 'dark';
                    try {
                        mermaidLib.initialize({
                            startOnLoad: false,
                            theme: dark ? 'dark' : 'default',
                            themeVariables: dark ? {
                                primaryColor: '#23303b',
                                primaryTextColor: '#e0e0e0',
                                primaryBorderColor: '#4fc3f7',
                                lineColor: '#7f8c9b',
                                secondaryColor: '#3a3320',
                                tertiaryColor: '#2d2d2d',
                                fontSize: '14px'
                            } : {
                                primaryColor: '#E8F4FD',
                                primaryTextColor: '#1a1a2e',
                                primaryBorderColor: '#2980b9',
                                lineColor: '#2980b9',
                                secondaryColor: '#FFF3CD',
                                tertiaryColor: '#FEFEFE',
                                fontSize: '14px'
                            },
                            flowchart: { useMaxWidth: true, htmlLabels: true },
                            sequence: { useMaxWidth: true, showSequenceNumbers: false },
                            class: { useMaxWidth: true },
                            state: { useMaxWidth: true }
                        });
                    } catch (e) {
                        console.error('[LiveUML] mermaid.initialize() failed:', e);
                    }
                }

                function toggleTheme() {
                    state.theme = state.theme === 'light' ? 'dark' : 'light';
                    applyTheme();
                    applyMermaidTheme();
                    vscode.postMessage({ type: 'setTheme', theme: state.theme });
                    if (state.diagramMode === 'mermaid' && state.mermaidCode) {
                        state.renderedMermaidSvg = null;
                        renderMermaid(state.lastRequestId || 0);
                    } else {
                        render();
                    }
                    vscode.setState(state);
                }

                function render() {
                    const app = document.getElementById('app');
                    // Keep form edits (including transient password input) in DOM-only
                    // snapshots, never in persisted webview state or HTML attributes.
                    const pendingSettings = (state.showSettings || !state.hasEditor) ? Array.from(document.querySelectorAll('.settings-panel input, .settings-panel select, .onboarding-card input, .onboarding-card select'))
                        .map(input => ({ id: input.id, value: input.value, checked: input.checked, tag: input.tagName })) : [];
                    const focused = pendingSettings.some(input => input.id === document.activeElement?.id) ? document.activeElement : null;
                    const focusId = focused?.id;
                    const advancedOpen = state.showSettings && document.querySelector('.settings-panel details')?.open;
                    const selection = focused && ['text', 'password'].includes(focused.type) ? [focused.selectionStart, focused.selectionEnd] : null;
                    verboseLog('render(): isLoading=' + state.isLoading + ', hasEditor=' + state.hasEditor + ', functions.length=' + (state.functions ? state.functions.length : 0) + ', classes.length=' + (state.classes ? state.classes.length : 0) + ', error=' + (state.error || 'null') + ', hasSvg=' + (state.diagramSvg ? 'yes' : 'no') + ', mermaidCode=' + (state.mermaidCode ? 'yes' : 'no') + ', renderedMermaid=' + (state.renderedMermaidSvg ? 'yes' : 'no'));
                    if (!state.hasEditor || (Array.isArray(state.functions) && state.functions.length === 0 && Array.isArray(state.classes) && state.classes.length === 0)) {
                        app.innerHTML = renderWelcome();
                    } else {
                        app.innerHTML = renderMain();
                        const advanced = document.querySelector('.settings-panel details');
                        if (advanced) advanced.open = !!advancedOpen;
                        for (const saved of pendingSettings) {
                            const input = document.getElementById(saved.id);
                            if (input) { input.value = saved.value; if (input.type === 'checkbox') input.checked = saved.checked; }
                        }
                        if (focusId && document.getElementById(focusId)) {
                            const input = document.getElementById(focusId); input.focus();
                            if (selection) input.setSelectionRange(...selection);
                        }
                        attachEvents();
                        applyDiagramSizing();
                        if (state.diagramMode === 'mermaid') {
                            if (state.renderedMermaidSvg) {
                                attachMermaidClassClicks();
                            } else if (state.mermaidCode && mermaidLib) {
                                setTimeout(() => {
                                    try {
                                        mermaidLib.run({ nodes: document.querySelectorAll('.mermaid') }).then(() => {
                                            attachMermaidClassClicks();
                                        }).catch(e => {
                                            console.error('Mermaid render error:', e);
                                        });
                                    } catch (e) {
                                        console.error('Mermaid render error:', e);
                                    }
                                }, 50);
                            }
                        }
                    }
                    syncElementDetails();
                }

                function diagramDimensions(svg) {
                    const box = svg.viewBox.baseVal;
                    return {
                        width: box.width || parseFloat(svg.getAttribute('width')) || 300,
                        height: box.height || parseFloat(svg.getAttribute('height')) || 150
                    };
                }

                function applyDiagramSizing() {
                    const view = document.getElementById('diagramView');
                    const svg = view && view.querySelector('svg');
                    if (!svg) return;
                    const size = diagramDimensions(svg);
                    const style = getComputedStyle(view);
                    const available = Math.max(1, view.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
                    const zoom = state.diagramZoomMode === 'fit'
                        ? Math.min(1, available / size.width)
                        : Math.min(4, Math.max(0.1, Number(state.diagramZoom) || 1));
                    // Override Mermaid's inline max-width/100% width as well as our CSS.
                    svg.style.maxWidth = 'none';
                    svg.style.width = (size.width * zoom) + 'px';
                    svg.style.height = (size.height * zoom) + 'px';
                    const label = document.getElementById('diagramZoomLabel');
                    if (label) label.textContent = Math.round(zoom * 100) + '%' + (state.diagramZoomMode === 'fit' ? ' fit' : '');
                }

                function zoomDiagram(factor) {
                    const svg = document.querySelector('#diagramView svg');
                    if (!svg) return;
                    const zoom = svg.getBoundingClientRect().width / diagramDimensions(svg).width;
                    state.diagramZoom = Math.min(4, Math.max(0.1, zoom * factor));
                    state.diagramZoomMode = 'actual';
                    applyDiagramSizing();
                    vscode.setState(state);
                }

                function fitDiagram() {
                    state.diagramZoomMode = 'fit';
                    applyDiagramSizing();
                    vscode.setState(state);
                }

                function actualDiagramSize() {
                    state.diagramZoom = 1;
                    state.diagramZoomMode = 'actual';
                    applyDiagramSizing();
                    vscode.setState(state);
                }

                function renderWelcome() {
                    return \`
                        <div class="welcome fade-in">
                            <div class="welcome-icon">📊</div>
                            <h2>Live UML</h2>
                            <p>Whole-file diagrams, function drill-down, hover documentation, and algorithmic review — rendered locally.</p>
                            <div class="onboarding-card">
                                <h3>1 · Connect an AI provider</h3>
                                <p>Needed for summaries, hover insights, and inefficiency analysis. DeepSeek is preselected; any OpenAI-compatible endpoint works. Without a key, diagrams still work.</p>
                                \${renderConnectionFields()}
                                \${state.settingsError ? '<div role="alert" style="color:var(--error);">' + escapeHtml(state.settingsError) + '</div>' : ''}
                                \${state.settingsSaved ? '<div class="onboarding-success">Connection saved. Open a file or the demo to see it in action.</div>' : ''}
                                <button class="btn-save" onclick="saveSettings()">Save connection</button>
                            </div>
                            <div class="onboarding-card">
                                <h3>2 · Try the demo</h3>
                                <p>Opens an untitled Python file with a deliberately inefficient hot loop, then shows the file overview, hover docs, and colour-coded analysis.</p>
                                <button class="btn-save" onclick="openDemoFile()">Open demo file</button>
                            </div>
                            <div class="onboarding-card">
                                <h3>3 · Open your own file</h3>
                                <p>Open Python, JavaScript, TypeScript, Java, C, C++, or a Jupyter notebook cell. The File tab shows the whole file; click any function node to drill in.</p>
                                <p style="color:var(--text-muted);margin:0;">Tip: PlantUML is the default renderer. Switch to Mermaid if Java is unavailable.</p>
                            </div>
                        </div>
                    \`;
                }

                function renderEmpty() {
                    return \`
                        <div class="empty-state fade-in">
                            <div class="empty-icon">🔍</div>
                            <p>No functions found in this file</p>
                            <p style="margin-top: 4px; font-size: 11px;">Try opening a file with function definitions</p>
                        </div>
                    \`;
                }

                function renderMain() {
                    const funcOptions = state.functions.map(f => 
                        \`<option value="\${f}" \${state.diagramKind !== 'file' && f === state.currentFunction ? 'selected' : ''}>\${f}</option>\`
                    ).join('');

                    const classOptions = state.classes.map(c => 
                        \`<option value="\${c}" \${c === state.currentClass ? 'selected' : ''}>\${c}</option>\`
                    ).join('');

                    const placeholderOption = (!funcOptions && !classOptions) ? \`
                        <option disabled>No items available</option>
                    \` : '';

                    const select = state.diagramType === 'class' ? 
                        \`<select class="function-select" id="classSelect" onchange="selectClass(this.value)">
                            \${classOptions || placeholderOption}
                        </select>\` :
                        \`<select class="function-select" id="funcSelect" onchange="selectFunction(this.value)">
                            \${state.diagramKind === 'file' || state.diagramType === 'file' ? '<option value="" selected>Whole file — jump to a function…</option>' : ''}
                            \${funcOptions || placeholderOption}
                        </select>\`;

                    const classTab = state.stats.language !== 'c' ? 
                        \`<button class="tab \${state.diagramType === 'class' ? 'active' : ''}" onclick="changeType('class')">Class</button>\` : '';

                    const isMermaid = state.diagramMode === 'mermaid';
                    const hasDiagram = isMermaid ? (state.renderedMermaidSvg || (state.diagramSvg && state.diagramSvg.includes('empty-state'))) : state.diagramSvg;

                    const mermaidBlocked = isMermaid && state.mermaidCode && !mermaidLib;
                    const effectiveError = state.error || (mermaidBlocked ? 'Mermaid library is not available on this machine (CDN blocked or no internet). Switch to PlantUML mode, or check the Live UML output panel for details.' : null);

                    const diagramContent = state.isLoading ? renderLoading() :
                        effectiveError ? renderError(effectiveError) :
                        hasDiagram ? renderDiagram() :
                        renderSelectPrompt();

                    const settingsPanel = state.showSettings ? renderSettings() : '';
                    const summaryHtml = renderSummary();
                    const analysisHtml = renderAnalysisPanel();

                    const statusText = state.isLoading ? 'Generating diagram...' :
                        state.error ? 'Error generating diagram' :
                        hasDiagram ? (isMermaid ? 'Mermaid diagram ready' : 'PlantUML diagram ready') :
                        'Select an item';

                    const showStats = state.diagramType === 'class';
                    const statsHtml = showStats
                        ? (state.stats.language === 'c'
                            ? 'Not applicable for C'
                            : 'Workspace: ' + state.stats.totalFiles + ' files \u00B7 Scope: ' + state.stats.totalClasses + ' classes')
                        : '';

                    return \`
                        <div class="header">
                            <div class="header-title">
                                Live UML
                                <span class="badge">v${extensionVersion}</span>
                            </div>
                            <div class="header-stats">\${statsHtml}</div>
                            <div class="header-actions">
                                <button onclick="toggleTheme()" title="\${state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}">\${state.theme === 'dark' ? '☀' : '🌙'}</button>
                                <button onclick="openSettings()" title="Settings">⚙</button>
                            </div>
                        </div>
                        \${settingsPanel}
                        <div class="mode-tabs">
                            <button class="tab \${state.diagramMode === 'plantuml' ? 'active' : ''}" onclick="changeMode('plantuml')">PlantUML</button>
                            <button class="tab \${state.diagramMode === 'mermaid' ? 'active' : ''}" onclick="changeMode('mermaid')">Mermaid</button>
                        </div>
                        <div class="function-bar">
                            \${select}
                        </div>
                        <div class="tabs">
                            <button class="tab \${state.diagramType === 'file' ? 'active' : ''}" onclick="changeType('file')">File</button>
                            <button class="tab \${state.diagramType === 'flowchart' ? 'active' : ''}" onclick="changeType('flowchart')">Flowchart</button>
                            <button class="tab \${state.diagramType === 'sequence' ? 'active' : ''}" onclick="changeType('sequence')">Sequence</button>
                            <button class="tab \${state.diagramType === 'state' ? 'active' : ''}" onclick="changeType('state')">State</button>
                            \${classTab}
                        </div>
                            \${summaryHtml}
                        <div class="diagram-container fade-in">
                            \${diagramContent}
                        </div>
                        \${analysisHtml}
                        <div class="status-bar">
                            <span class="status-dot \${state.isLoading ? 'loading' : state.error ? 'error' : ''}"></span>
                            \${statusText}
                        </div>
                    \`;
                }

                function renderSummary() {
                    const s = state.summary;
                    if (state.diagramKind === 'file' || !state.summaryEnabled || !state.currentFunction || state.diagramType === 'class') return '';
                    const io = [];
                    if (s && s.inputs && s.inputs.length) io.push('in: ' + s.inputs.join(', '));
                    if (s && s.output) io.push('out: ' + s.output);
                    const message = state.summaryStatus === 'loading' ? 'Generating summary...' :
                        state.summaryStatus === 'error' ? state.summaryError :
                        s && s.summary ? s.summary :
                        state.summaryUpdateMode === 'manual' ? 'Manual mode: press Generate summary.' : 'Summary will update when the function changes.';
                    return \`
                        <div id="summaryPanel" style="margin:8px 12px 0;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-secondary);">
                            <div style="font-size:10px;color:var(--text-muted);margin-bottom:5px;">AI SUMMARY · \${state.summaryUpdateMode}</div>
                            <button id="regenerateSummary" onclick="regenerateSummary()" \${state.summaryStatus === 'loading' ? 'disabled' : ''}>\${s ? 'Regenerate summary' : 'Generate summary'}</button>
                            <div role="status" style="margin-top:6px;font-size:12px;line-height:1.55;color:var(--text-primary);">\${escapeHtml(message)}</div>
                            \${io.length ? \`<div style="margin-top:7px;font-size:11px;color:var(--text-secondary);font-family:ui-monospace,Consolas,monospace;">\${escapeHtml(io.join('   ·   '))}</div>\` : ''}
                        </div>\`;
                }

                function renderConnectionFields() {
                    const provider = state.settings.llmProvider || 'deepseek';
                    const options = Object.entries(providerPresets).map(([id, preset]) =>
                        '<option value="' + id + '" ' + (provider === id ? 'selected' : '') + '>' + escapeHtml(preset.label) + '</option>').join('');
                    const models = (state.availableModels || []).map(id => '<option value="' + escapeAttr(id) + '"></option>').join('');
                    return \`
                        <div class="setting-row"><label><input type="checkbox" id="settingLlmEnabled" \${state.settings.llmEnabled !== false ? 'checked' : ''}> AI summaries + code analysis</label></div>
                        <div class="setting-row connection-setting">
                            <label class="setting-label" for="settingLlmProvider">Provider</label>
                            <select class="setting-input" id="settingLlmProvider" onchange="changeProvider(this.value)">\${options}</select>
                            <div class="setting-desc">OpenAI-compatible Chat Completions. Presets fill the endpoint; the model stays editable.</div>
                        </div>
                        <div class="setting-row connection-setting">
                            <label class="setting-label" for="settingLlmBaseUrl">Base URL</label>
                            <input class="setting-input wide" id="settingLlmBaseUrl" type="text" spellcheck="false" value="\${escapeAttr(state.settings.llmBaseUrl || '')}" oninput="connectionEndpointChanged()" placeholder="https://your-provider.example/v1">
                            <div class="setting-desc">Base endpoint only, without /chat/completions or /models.</div>
                        </div>
                        <div class="setting-row connection-setting">
                            <label class="setting-label" for="settingLlmModel">Model ID</label>
                            <input class="setting-input wide" id="settingLlmModel" type="text" spellcheck="false" list="llmModels" value="\${escapeAttr(state.settings.llmModel || '')}" placeholder="Enter a model ID or load models below">
                            <datalist id="llmModels">\${models}</datalist>
                        </div>
                        <div class="setting-row connection-setting">
                            <label class="setting-label" for="settingLlmApiKey">API key</label>
                            <input class="setting-input wide" type="password" id="settingLlmApiKey" autocomplete="new-password" spellcheck="false" placeholder="\${state.settings.hasApiKey ? 'Key saved for this endpoint — enter to replace' : 'Paste a key for this endpoint (optional locally)'}">
                            <div class="setting-desc">Stored in VS Code secret storage, scoped per endpoint. Blank keeps this endpoint's saved key.</div>
                        </div>
                        <div class="setting-row connection-setting">
                            <label class="setting-label" for="settingLlmTimeoutMs">Request timeout (ms)</label>
                            <input class="setting-input" id="settingLlmTimeoutMs" type="number" min="1000" max="120000" step="1000" value="\${escapeAttr(state.settings.llmTimeoutMs || 30000)}">
                        </div>
                        <div class="connection-test">
                            <button id="testConnection" onclick="testAiConnection()" \${state.connectionTestStatus === 'testing' ? 'disabled' : ''}>Test connection / load models</button>
                            <div id="connectionTestStatus" role="status" style="color:\${state.connectionTestStatus === 'error' ? 'var(--error)' : 'var(--text-secondary)'};">\${escapeHtml(state.connectionTestMessage || '')}</div>
                        </div>
                        <div class="setting-row connection-setting">
                            <label for="settingLlmUpdateMode">Summary updates</label>
                            <select id="settingLlmUpdateMode" class="setting-input">
                                <option value="automatic" \${state.settings.llmUpdateMode !== 'manual' ? 'selected' : ''}>Automatic (after edits)</option>
                                <option value="manual" \${state.settings.llmUpdateMode === 'manual' ? 'selected' : ''}>Manual (button only)</option>
                            </select>
                        </div>
                        <div class="setting-row"><label><input type="checkbox" id="settingLlmAnalyze" \${state.settings.llmAnalyze !== false ? 'checked' : ''}> Flag algorithmic inefficiencies on the diagram</label></div>\`;
                }

                function renderSettings() {
                    return \`
                        <div class="settings-panel fade-in">
                            <div class="settings-title"><span>⚙ AI connection & settings</span><button onclick="closeSettings()" title="Close">✕</button></div>
                            \${renderConnectionFields()}
                            <details><summary>Diagram / Java settings</summary>
                                <div class="setting-row connection-setting"><label for="settingJavaPath">Java executable</label><input class="setting-input wide" type="text" id="settingJavaPath" value="\${escapeAttr(state.settings.javaPath || 'java')}" placeholder="/usr/bin/java"></div>
                                <div class="setting-row connection-setting"><label for="settingExcludePatterns">Class exclude directories</label><input class="setting-input wide" type="text" id="settingExcludePatterns" value="\${escapeAttr(state.settings.classExcludePatterns || '')}" placeholder="node_modules, build, bin"></div>
                            </details>
                            \${state.settingsError ? '<div role="alert" style="color:var(--error);">' + escapeHtml(state.settingsError) + '</div>' : ''}
                            <div class="settings-actions"><button class="btn-cancel" onclick="closeSettings()">Cancel</button><button class="btn-save" onclick="saveSettings()">Save</button></div>
                        </div>\`;
                }

                function renderLoading() {
                    const isMermaid = state.diagramMode === 'mermaid';
                    const hasDiagram = isMermaid ? state.renderedMermaidSvg : state.diagramSvg;
                    if (hasDiagram) return renderDiagram();
                    return \`
                        <div class="loading-state">
                            <div class="spinner"></div>
                            <div class="loading-text">Analyzing <strong>\${state.currentFunction}</strong>...</div>
                        </div>
                    \`;
                }

                function renderError(message) {
                    return \`<div class="error-state">⚠️ \${message || state.error}</div>\`;
                }

                function renderSelectPrompt() {
                    const type = state.diagramType === 'class' ? 'class' : 'function';
                    return \`
                        <div class="empty-state">
                            <div class="empty-icon">👆</div>
                            <p>Select a \${type} to view its diagram</p>
                        </div>
                    \`;
                }

                function renderDiagram() {
                    const scopeWarning = state.scopeWarning ? \`
                        <div style="padding: 6px 12px; margin-bottom: 8px; background: rgba(255, 152, 0, 0.1); border: 1px solid rgba(255, 152, 0, 0.3); border-radius: var(--radius-sm); font-size: 11px; color: var(--warning);">
                            ⚠ State variables inferred heuristically
                        </div>
                    \` : '';
                    const externalGuessNote = state.externalGuesses && state.externalGuesses.length > 0 ? \`
                        <div style="padding: 6px 12px; margin-bottom: 8px; background: rgba(33, 150, 243, 0.1); border: 1px solid rgba(33, 150, 243, 0.3); border-radius: var(--radius-sm); font-size: 11px; color: #64b5f6;">
                            ℹ Transition assumed: <code>\${state.externalGuesses.join(', ')}</code>() was called with a state-like argument but its implementation was not parsed (external). The state update was inferred heuristically.
                        </div>
                    \` : '';
                    const stateVarSelector = (state.diagramType === 'state' && state.stateVars && state.stateVars.length > 1) ? \`
                        <div class="state-var-selector fade-in">
                            <span class="selector-label">State Variable:</span>
                            <div class="selector-pills">
                                \${state.stateVars.map(v => \`
                                    <button class="pill \${v === state.activeStateVar ? 'active' : ''}" onclick="selectStateVar('\${v}')" >\${v}</button>
                                \`).join('')}
                            </div>
                        </div>
                    \` : '';
                    const isMermaid = state.diagramMode === 'mermaid';
                    const sourceLabel = isMermaid ? 'Mermaid' : 'PlantUML';
                    const diagramBody = isMermaid
                        ? (state.renderedMermaidSvg || ((state.diagramSvg && state.diagramSvg.includes('empty-state')) ? state.diagramSvg : ''))
                        : state.diagramSvg || '';
                    const codeSection = isMermaid
                        ? (state.mermaidCode ? renderSourceCode('Mermaid', state.mermaidCode) : '')
                        : (state.plantUmlCode ? renderSourceCode('PlantUML', state.plantUmlCode) : '');
                    return \`
                        <div class="diagram-header">
                            <div class="diagram-title">
                                <span class="func-name">\${escapeHtml(state.diagramKind === 'file' ? (state.fileName || 'File overview') : (state.currentFunction || ''))}</span>
                            </div>
                            <div class="diagram-actions">
                                <button onclick="copySource()" title="Copy \${sourceLabel} source code to clipboard">📋 Code</button>
                                \${isMermaid ? '' : '<button onclick="copyDiagram()" title=\"Copy diagram image (SVG) to clipboard\">🖼️ Copy SVG</button>'}
                                <button onclick="downloadAsPng()" title="Download diagram as PNG image">⬇ PNG</button>
                            </div>
                        </div>
                        \${stateVarSelector}
                        \${scopeWarning}
                        \${externalGuessNote}
                        <div class="diagram-zoom" aria-label="Diagram zoom controls">
                            <button id="diagramZoomOut" onclick="zoomDiagram(0.8)" title="Zoom out" aria-label="Zoom out">−</button>
                            <span id="diagramZoomLabel" aria-live="polite">100%</span>
                            <button id="diagramZoomIn" onclick="zoomDiagram(1.25)" title="Zoom in" aria-label="Zoom in">+</button>
                            <button id="diagramFit" onclick="fitDiagram()" title="Fit entire diagram to sidebar width">Fit</button>
                            <button id="diagramActualSize" onclick="actualDiagramSize()" title="Readable original size; scroll to explore">1:1</button>
                        </div>
                        <div class="diagram-view \${state.isLoading ? 'loading' : ''}" id="diagramView">
                            \${diagramBody}
                        </div>
                        \${codeSection}
                    \`;
                }

                function renderSourceCode(label, code) {
                    return \`
                        <details class="code-section">
                            <summary class="code-header"><span>\${label} Source</span><button onclick="event.preventDefault();copySource()" title="Copy \${label} source code to clipboard">📋 Copy</button></summary>
                            <div class="code-content">\${escapeHtml(code)}</div>
                        </details>
                    \`;
                }

                function escapeHtml(text) {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                }

                function escapeAttr(value) {
                    return escapeHtml(String(value ?? '')).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                }

                function renderAnalysisPanel() {
                    if (state.diagramKind === 'class' || state.diagramType === 'class' || !state.analysisEnabled) return '';
                    let panel = '';
                    if (state.analysisStatus === 'loading') {
                        panel = \`<div class="analysis-panel"><div class="analysis-title"><span>Algorithm review</span><span>analysing…</span></div></div>\`;
                    } else if (state.analysisStatus === 'error') {
                        panel = \`<div class="analysis-panel"><div class="analysis-title"><span>Algorithm review</span><span>unavailable</span></div><div class="issue-meta">\${escapeHtml(state.analysisError)}</div></div>\`;
                    } else if (state.analysis && (state.analysis.summary || state.analysis.issues.length)) {
                        const rows = state.analysis.issues.map(issue => \`
                            <div class="issue-row" onclick="selectIssue('\${issue.id}')" role="button" tabindex="0" title="Show details">
                                <span class="issue-dot \${issue.severity}"></span>
                                <div><div class="issue-title">\${escapeHtml(issue.title)}</div>
                                <div class="issue-meta">\${issue.line ? 'line ' + issue.line + ' · ' : ''}\${issue.severity} severity · click to explain</div></div>
                            </div>\`).join('');
                        panel = \`<div class="analysis-panel">
                            <div class="analysis-title"><span>Algorithm review</span><span>\${state.analysis.issues.length} issue\${state.analysis.issues.length === 1 ? '' : 's'}</span></div>
                            \${state.analysis.summary ? '<div class="analysis-summary">' + escapeHtml(state.analysis.summary.slice(0, 260)) + (state.analysis.summary.length > 260 ? '…' : '') + '</div>' : ''}
                            \${rows || '<div class="issue-meta">No obvious algorithmic inefficiencies found.</div>'}
                        </div>\`;
                    }
                    return panel;
                }

                function syncElementDetails() {
                    if (state.elementDetails) {
                        detailsElement.innerHTML = renderElementDetails();
                        detailsElement.style.display = 'block';
                        document.body.classList.add('details-open');
                        hoverElement.style.display = 'none';
                    } else {
                        detailsElement.style.display = 'none';
                        detailsElement.innerHTML = '';
                        document.body.classList.remove('details-open');
                    }
                }

                function closeElementDetails() {
                    state.elementDetails = null;
                    render();
                }

                function renderElementDetails() {
                    const d = state.elementDetails;
                    const issue = d.issue;
                    return \`
                        <div class="detail-head"><span class="detail-label">\${escapeHtml(d.label || '')}</span><button onclick="closeElementDetails()" title="Close">✕</button></div>
                        \${d.line !== null && d.line !== undefined ? '<div class="issue-meta">line ' + (d.line + 1) + '</div>' : ''}
                        \${d.text ? '<div class="detail-code">' + escapeHtml(d.text) + '</div>' : ''}
                        <div class="detail-docs">\${d.docsLoading ? 'Fetching hover documentation…' : escapeHtml(d.docs || 'No hover documentation available for this location.')}</div>
                        \${issue ? \`<div class="detail-issue" style="border-color:\${issue.severity === 'high' ? '#ff5c5c' : issue.severity === 'medium' ? '#e2a03f' : '#d7ba7d'}">
                            <strong>\${escapeHtml(issue.title)}</strong>
                            <div style="margin-top:4px;color:var(--text-secondary);">\${escapeHtml(issue.explanation)}</div>
                            \${issue.suggestion ? '<div style="margin-top:5px;color:var(--text-secondary);"><em>Suggestion:</em> ' + escapeHtml(issue.suggestion) + '</div>' : ''}
                        </div>\` : ''}
                        \${d.line !== null && d.line !== undefined ? '<button onclick="revealLine(' + d.line + ')">Go to line</button>' : ''}
                        \${d.functionName ? '<button onclick="drillFromDetails()">Open function flowchart</button>' : ''}
                    \`;
                }

                function drillFromDetails() {
                    const name = state.elementDetails?.functionName;
                    if (!name) return;
                    state.elementDetails = null;
                    state.currentFunction = name;
                    state.isLoading = true;
                    render();
                    vscode.postMessage({ type: 'drillFunction', functionName: name });
                }

                function revealLine(line) { vscode.postMessage({ type: 'revealLine', line }); }

                function selectFunction(name) {
                    if (!name) return;
                    if (state.diagramType === 'file') {
                        state.currentFunction = name;
                        state.isLoading = true;
                        render();
                        vscode.postMessage({ type: 'drillFunction', functionName: name });
                        return;
                    }
                    if (state.currentFunction === name) return;
                    verboseLog('selectFunction:', name);
                    state.currentFunction = name;
                    state.isLoading = true;
                    state.renderedMermaidSvg = null;
                    render();
                    vscode.postMessage({ type: 'command', command: 'extension.openFunction', args: name });
                }

                function selectClass(name) {
                    if (state.currentClass === name) return;
                    verboseLog('selectClass:', name);
                    state.currentClass = name;
                    state.isLoading = true;
                    state.renderedMermaidSvg = null;
                    render();
                    vscode.postMessage({ type: 'command', command: 'extension.openClass', args: name });
                }

                function selectStateVar(name) {
                    if (state.activeStateVar === name) return;
                    verboseLog('selectStateVar:', name);
                    state.activeStateVar = name;
                    state.isLoading = true;
                    state.renderedMermaidSvg = null;
                    render();
                    vscode.postMessage({ type: 'command', command: 'extension.selectStateVar', args: name });
                }

                function changeType(type) {
                    if (state.diagramType === type) return;
                    verboseLog('changeType:', type);
                    state.diagramType = type;
                    state.isLoading = true;
                    state.renderedMermaidSvg = null;
                    render();
                    vscode.postMessage({ type: 'changeDiagramType', diagramType: type });
                }

                function changeMode(mode) {
                    if (state.diagramMode === mode) return;
                    verboseLog('changeMode:', mode);
                    state.diagramMode = mode;
                    state.isLoading = true;
                    state.renderedMermaidSvg = null;
                    render();
                    vscode.postMessage({ type: 'changeDiagramMode', diagramMode: mode });
                }

                function openSettings() { vscode.postMessage({ type: 'openSettings' }); }
                function closeSettings() { connectionTestSequence++; state.showSettings = false; render(); }

                function collectSettings() {
                    const value = id => document.getElementById(id);
                    return {
                        javaPath: (value('settingJavaPath')?.value || 'java').trim(),
                        classExcludePatterns: (value('settingExcludePatterns')?.value || '').trim(),
                        llmEnabled: value('settingLlmEnabled') ? value('settingLlmEnabled').checked : state.settings.llmEnabled !== false,
                        llmUpdateMode: value('settingLlmUpdateMode')?.value || 'automatic',
                        llmProvider: value('settingLlmProvider')?.value || 'deepseek',
                        llmBaseUrl: (value('settingLlmBaseUrl')?.value || '').trim(),
                        llmModel: (value('settingLlmModel')?.value || '').trim(),
                        llmTimeoutMs: Number(value('settingLlmTimeoutMs')?.value || 30000),
                        llmAnalyze: value('settingLlmAnalyze') ? value('settingLlmAnalyze').checked : state.settings.llmAnalyze !== false,
                        llmApiKey: value('settingLlmApiKey')?.value || ''
                    };
                }

                function openDemoFile() { vscode.postMessage({ type: 'openDemo' }); }

                function changeProvider(provider) {
                    const preset = providerPresets[provider];
                    if (!preset) return;
                    document.getElementById('settingLlmBaseUrl').value = preset.baseUrl;
                    document.getElementById('settingLlmModel').value = preset.model;
                    document.getElementById('settingLlmApiKey').value = '';
                    connectionEndpointChanged(true);
                }

                function connectionEndpointChanged(fromPreset) {
                    if (!fromPreset) document.getElementById('settingLlmProvider').value = 'custom';
                    connectionTestSequence++;
                    state.availableModels = [];
                    state.connectionTestStatus = 'idle';
                    state.connectionTestMessage = '';
                    state.settings.hasApiKey = false;
                    state.settingsError = '';
                    document.querySelector('.settings-panel [role="alert"]')?.remove();
                    document.getElementById('connectionTestStatus').textContent = '';
                    document.getElementById('llmModels').innerHTML = '';
                    document.getElementById('testConnection').disabled = false;
                    document.getElementById('settingLlmApiKey').placeholder = 'Paste a key for this endpoint (optional locally)';
                    clearTimeout(connectionKeyTimer);
                    const baseUrl = document.getElementById('settingLlmBaseUrl').value.trim();
                    connectionKeyTimer = setTimeout(() => vscode.postMessage({ type: 'connectionKeyStatus', baseUrl }), 250);
                }

                function testAiConnection() {
                    const settings = collectSettings();
                    const requestId = ++connectionTestSequence;
                    state.connectionTestStatus = 'testing';
                    state.connectionTestMessage = 'Testing connection and loading model IDs...';
                    render();
                    vscode.postMessage({ type: 'testConnection', requestId, settings });
                }

                function saveSettings() {
                    const settings = collectSettings();
                    document.getElementById('settingLlmApiKey').value = '';
                    connectionTestSequence++;
                    vscode.postMessage({ type: 'saveSettings', settings });
                }

                function refresh() { vscode.postMessage({ type: 'refresh' }); }
                function regenerateSummary() { vscode.postMessage({ type: 'regenerateSummary' }); }

                function copySource() {
                    const code = state.diagramMode === 'mermaid' ? state.mermaidCode : state.plantUmlCode;
                    const label = state.diagramMode === 'mermaid' ? 'Mermaid' : 'PlantUML';
                    if (code) {
                        navigator.clipboard.writeText(code).then(() => {
                            vscode.postMessage({ type: 'showInfo', message: label + ' source code copied to clipboard' });
                        });
                    }
                }

                function copyDiagram() {
                    const svgEl = document.querySelector('.diagram-view svg');
                    if (svgEl) {
                        const svgData = new XMLSerializer().serializeToString(svgEl);
                        const svgDoc = '<?xml version="1.0" encoding="UTF-8"?>' + svgData;
                        navigator.clipboard.writeText(svgDoc).then(() => {
                            vscode.postMessage({ type: 'showInfo', message: 'Diagram image (SVG) copied to clipboard' });
                        });
                    }
                }

                function getSvgElement() {
                    return document.querySelector('.diagram-view svg');
                }

                function downloadAsPng() {
                    const svgEl = getSvgElement();
                    if (!svgEl) {
                        vscode.postMessage({ type: 'showError', message: 'No diagram to export' });
                        return;
                    }
                    // Serialise a sized clone: a viewBox-less SVG rasterises at 300x150.
                    const box = svgEl.getBoundingClientRect();
                    const clone = svgEl.cloneNode(true);
                    clone.setAttribute('width', Math.ceil(box.width));
                    clone.setAttribute('height', Math.ceil(box.height));
                    if (!clone.getAttribute('viewBox')) {
                        clone.setAttribute('viewBox', '0 0 ' + Math.ceil(box.width) + ' ' + Math.ceil(box.height));
                    }
                    const svgString = new XMLSerializer().serializeToString(clone);
                    const img = new Image();
                    img.onload = () => {
                        vscode.postMessage({ type: 'log', level: 'info', message: 'png: rasterising ' + img.naturalWidth + 'x' + img.naturalHeight });
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth * 2;
                        canvas.height = img.naturalHeight * 2;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = state.theme === 'dark' ? '#1e1e1e' : '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.scale(2, 2);
                        ctx.drawImage(img, 0, 0);
                        canvas.toBlob((blob) => {
                            const reader = new FileReader();
                            reader.onload = () => {
                                const bytes = new Uint8Array(reader.result);
                                let binary = '';
                                for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                                const base64 = btoa(binary);
                                vscode.postMessage({
                                    type: 'savePng',
                                    name: (state.currentFunction || 'diagram') + '.png',
                                    data: base64
                                });
                            };
                            reader.readAsArrayBuffer(blob);
                        }, 'image/png');
                    };
                    // UTF-8-safe base64 data URL: btoa alone throws on non-Latin1 labels,
                    // and blob: URLs are blocked by the webview CSP.
                    const bytes = new TextEncoder().encode(svgString);
                    let binary = '';
                    for (const b of bytes) binary += String.fromCharCode(b);
                    img.onerror = () => vscode.postMessage({ type: 'showError', message: 'Could not rasterise diagram' });
                    img.src = 'data:image/svg+xml;base64,' + btoa(binary);
                }

                function normalizeLabel(text) {
                    return String(text || '').toLowerCase().split(String.fromCharCode(96)).join('').replace(/["'’“”]/g, '').replace(/[^a-z0-9_+.]+/g, ' ').replace(/\s+/g, ' ').trim();
                }

                function findCodeEntry(label) {
                    const target = normalizeLabel(label);
                    if (!target) return null;
                    const fileNode = (state.fileNodes || []).find(node => normalizeLabel(node.label) === target || normalizeLabel(node.name) === target);
                    if (fileNode) return { line: fileNode.line - 1, text: fileNode.signature || fileNode.name, functionName: fileNode.name, label: fileNode.label };
                    let best = null, bestScore = 0;
                    for (const entry of state.codeMap || []) {
                        for (const candidate of entry.labels || []) {
                            const value = normalizeLabel(candidate);
                            if (!value) continue;
                            let score = 0;
                            if (value === target) score = 100;
                            else if (value.startsWith(target) || target.startsWith(value)) score = Math.min(value.length, target.length);
                            else {
                                let i = 0;
                                while (i < value.length && i < target.length && value[i] === target[i]) i++;
                                if (i >= 6) score = i;
                            }
                            if (score > bestScore) { bestScore = score; best = entry; }
                        }
                    }
                    return bestScore >= 6 ? { line: best.line, text: best.text } : null;
                }

                function issueForLabel(label) {
                    const target = normalizeLabel(label);
                    const issues = state.analysis?.issues || [];
                    return issues.find(issue => {
                        const value = normalizeLabel(issue.label);
                        return value === target || (value && (value.includes(target) || target.includes(value)));
                    }) || null;
                }

                function clickableGroup(textEl) {
                    let element = textEl;
                    for (let i = 0; i < 7 && element && element.tagName !== 'svg'; i++, element = element.parentElement) {
                        if (element.tagName === 'g' && element.querySelector('rect, polygon, path, circle, ellipse')) return element;
                    }
                    return textEl.parentElement;
                }

                function diagramLabelNodes() {
                    const svg = document.querySelector('#diagramView svg');
                    if (!svg) return [];
                    const groups = [...svg.querySelectorAll('g.node, g.activity, g.entity')];
                    const texts = [...svg.querySelectorAll('text')]
                        .filter(node => !node.closest('g.node, g.activity, g.entity'));
                    return [...groups, ...texts];
                }

                function bestTextNode(label) {
                    const target = normalizeLabel(label);
                    let best = null, bestScore = 0;
                    diagramLabelNodes().forEach(node => {
                        const value = normalizeLabel(node.textContent);
                        if (!value) return;
                        let score = 0;
                        if (value === target) score = 100;
                        else if (value.startsWith(target) || target.startsWith(value)) score = Math.min(value.length, target.length);
                        else {
                            let i = 0;
                            while (i < value.length && i < target.length && value[i] === target[i]) i++;
                            if (i >= 8) score = i;
                        }
                        if (score > bestScore) { bestScore = score; best = node; }
                    });
                    return bestScore >= 6 ? best : null;
                }

                function applyIssueStyles() {
                    document.querySelectorAll('[data-issue]').forEach(element => {
                        element.removeAttribute('data-issue');
                        element.classList.remove('node-issue-high', 'node-issue-medium', 'node-issue-low');
                    });
                    const issues = state.analysis?.issues || [];
                    if (!issues.length) return;
                    for (const issue of issues) {
                        const text = bestTextNode(issue.label);
                        if (!text) continue;
                        const group = clickableGroup(text);
                        if (!group) continue;
                        group.setAttribute('data-issue', issue.id);
                        group.classList.add('node-issue-' + issue.severity);
                    }
                }

                function attachDiagramInteractions() {
                    const svg = document.querySelector('#diagramView svg');
                    if (!svg) return;
                    diagramLabelNodes().forEach(node => {
                        if (!node.textContent.trim()) return;
                        node.style.cursor = 'pointer';
                        node.addEventListener('mouseenter', event => showNodeHover(event, node.textContent));
                        node.addEventListener('mousemove', event => positionHover(event));
                        node.addEventListener('mouseleave', hideNodeHover);
                        node.addEventListener('click', event => {
                            const label = node.textContent;
                            const issue = issueForLabel(label);
                            if (issue) { event.stopPropagation(); showElementDetails(label, issue); return; }
                            const match = findCodeEntry(label);
                            if (match?.functionName) {
                                event.stopPropagation();
                                state.currentFunction = match.functionName;
                                state.isLoading = true;
                                render();
                                vscode.postMessage({ type: 'drillFunction', functionName: match.functionName });
                                return;
                            }
                            if (match) { event.stopPropagation(); showElementDetails(label, null); }
                        });
                    });
                }

                function positionHover(event) {
                    const element = document.getElementById('elementHover');
                    if (!element || element.style.display === 'none') return;
                    const width = Math.min(320, window.innerWidth - 24);
                    element.style.left = Math.max(8, Math.min(event.clientX + 14, window.innerWidth - width - 8)) + 'px';
                    element.style.top = Math.max(8, Math.min(event.clientY + 14, window.innerHeight - 140)) + 'px';
                }

                function showNodeHover(event, label) {
                    if (state.elementDetails || document.querySelector('.element-details')) return;
                    const match = findCodeEntry(label);
                    if (!match && !issueForLabel(label)) return;
                    const issue = issueForLabel(label);
                    const element = document.getElementById('elementHover');
                    hoverState = { label, line: match?.line, text: match?.text || '', requestId: null };
                    element.innerHTML = '<div class="h-title">' + escapeHtml(label) + '</div>' +
                        (match ? '<div class="h-line">' + (match.line + 1) + ': ' + escapeHtml(match.text) + '</div>' : '') +
                        (issue ? '<div class="h-issue">⚠ ' + escapeHtml(issue.title) + ' · click to explain</div>' : '<div class="h-line">click for docs and code location</div>') +
                        '<div class="h-docs" id="hoverDocs"></div>';
                    element.style.display = 'block';
                    positionHover(event);
                    if (match && match.line !== null) {
                        const key = 'line:' + match.line;
                        if (docsByLine[key]) {
                            document.getElementById('hoverDocs').textContent = docsByLine[key];
                        } else {
                            const requestId = 'hover-' + (++docsRequestSeq);
                            hoverState.requestId = requestId;
                            vscode.postMessage({ type: 'symbolDocs', requestId, line: match.line, text: match.text });
                        }
                    }
                }

                function hideNodeHover() {
                    const element = document.getElementById('elementHover');
                    if (element) element.style.display = 'none';
                    hoverState = null;
                }

                function showElementDetails(label, issue) {
                    hideNodeHover();
                    const match = findCodeEntry(label);
                    const requestId = 'details-' + (++docsRequestSeq);
                    const fileNode = (state.fileNodes || []).find(node => normalizeLabel(node.label) === normalizeLabel(label));
                    state.elementDetails = { label, line: match?.line ?? (issue?.line ? issue.line - 1 : null),
                        text: match?.text || '', docs: '', docsLoading: !!match && match.line !== null,
                        docsRequestId: requestId, issue: issue || issueForLabel(label), functionName: fileNode?.name || match?.functionName || null };
                    if (match && match.line !== null) {
                        vscode.postMessage({ type: 'symbolDocs', requestId, line: match.line, text: match.text });
                    }
                    render();
                }

                function selectIssue(id) {
                    const issue = (state.analysis?.issues || []).find(item => item.id === id);
                    if (!issue) return;
                    const node = bestTextNode(issue.label);
                    if (node) node.closest('[data-issue], g')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    showElementDetails(issue.label, issue);
                }

                function attachEvents() {
                    const svg = document.querySelector('.diagram-view svg');
                    if (svg) {
                        svg.querySelectorAll('a').forEach(a => {
                            let href = a.getAttribute('xlink:href') || a.getAttribute('href');
                            if (href && href.startsWith('command://')) {
                                a.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    const path = href.substring(10);
                                    const [cmd, args] = path.split('?');
                                    vscode.postMessage({ type: 'command', command: cmd, args: args });
                                });
                            } else if (href && href.startsWith('command:')) {
                                a.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    const path = href.substring(8);
                                    const [cmd, args] = path.split('?');
                                    vscode.postMessage({ type: 'command', command: cmd, args: args });
                                });
                            }
                        });
                    }
                    attachDiagramInteractions();
                    applyIssueStyles();
                }

                function attachMermaidClassClicks() {
                    const svg = document.querySelector('.diagram-view svg');
                    if (!svg || state.diagramType !== 'class') return;
                    
                    svg.querySelectorAll('.classGroup, g[id]').forEach(g => {
                        let className = null;
                        
                        const titleEl = g.querySelector('title');
                        if (titleEl) {
                            className = titleEl.textContent.trim();
                        }
                        
                        if (!className) {
                            const labelEl = g.querySelector('.label');
                            if (labelEl) {
                                className = labelEl.textContent.trim();
                            }
                        }
                        
                        if (!className || !className.trim()) return;
                        
                        const clickable = g.querySelector('rect') || g.querySelector('polygon') || g;
                        if (clickable) {
                            clickable.style.cursor = 'pointer';
                            clickable.addEventListener('click', (e) => {
                                e.stopPropagation();
                                vscode.postMessage({
                                    type: 'command',
                                    command: 'extension.openClass',
                                    args: className
                                });
                            });
                        }
                    });
                }

                let observedDiagramWidth = 0;
                new ResizeObserver(entries => {
                    const width = entries[0].contentRect.width;
                    if (width !== observedDiagramWidth) {
                        observedDiagramWidth = width;
                        applyDiagramSizing();
                    }
                }).observe(document.getElementById('app'));
                render();
                vscode.postMessage({ type: 'ready' });
            </script>
        </body>
        </html>`;
}

module.exports = {
    getWebviewHtml
};

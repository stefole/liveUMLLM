# Changelog

All notable changes to the VibeCheck extension (formerly "Live UML", then "Codeflow") will be documented in this file.

## [2.3.0]
- **Renamed to VibeCheck** — display name, view/command/config identifiers (`vibecheck.*`), output channel, and environment variables (`VIBECHECK_LLM_KEY` / `VIBECHECK_LLM_BASE_URL`) all renamed from the former `liveUml`/Codeflow naming.
- **Refocused on explanation over UML notation**.
- **Trim**: removed the Sequence and State Machine diagram types. The toolbar now offers Overview, Flowchart, and Class diagram only.
- **Explain is the main view** (the default renderer). It shows an LLM-generated, color-coded flow diagram with text in nodes and edge labels, plus a list of explanation cards.
- **Concrete code snippets**: Explain cards and the details panel now show the actual source lines a node maps to, and document what each step does.
- **Deterministic explanation fallback**: when no model is configured or hover docs are missing, every node still gets an explanation derived from its source — hover and click never go silent.
- **File-wide overview** view with per-function call edges.
- **Theme-aware colors**: the UI, Mermaid, and PlantUML now follow the VS Code theme automatically — Tokyo Night-inspired palette in dark mode, Solarized in light mode. Light mode no longer renders a dark diagram.
- **UI polish**: refreshed header, tabs, explanation cards, and hover/details panels with the new palette.

## [2.1.0]
- Add onboarding when no file is open: provider connection form (provider, base URL, model, endpoint-scoped key, timeout, test connection/load models), plus a one-click demo Python file that exercises the full flow.
- Default renderer is now PlantUML (Java required); Mermaid remains available and is remembered per user once selected.
- Add a whole-file **File** view: every function in the active file, with call edges when functions call each other.
- Hover any diagram node to see its source line, that line's code, and hover documentation.
- Add algorithmic review: the configured model analyses the diagram plus source, colours nodes by severity, and lists concrete issues.
- Add `liveUml.llm.analyze` (default true) and a sidebar toggle. Analysis runs independently of diagram rendering and never blocks it.
- Strip HTML from hover docs, retry reasoning-model JSON once, collapse diagram source by default, and show the file view vertically to fit the sidebar.

## [2.0.11]
- Add complete sidebar AI connection setup: DeepSeek, OpenAI, OpenRouter, Ollama, LM Studio, and Custom OpenAI-compatible presets; editable base URL, model ID, API key, and timeout.
- Add Test connection / load models using the entered endpoint's model catalog, with visible success/authentication/network errors and model ID suggestions.
- Save credentials per normalized endpoint in SecretStorage; switching endpoints never reuses another provider's key. Existing DeepSeek secret storage is migrated safely.
- Support keyless loopback servers without sending an empty Authorization header. Connection tests do not save unsaved settings or request a paid completion.
- Preserve unsaved form edits and focus across background diagram/summary updates, and validate connection fields before saving.

## [2.0.10]
- Render diagrams at readable native size instead of shrinking every diagram into the sidebar width.
- Add zoom in/out, Fit to width, and 1:1 controls for both Mermaid and PlantUML. Large diagrams scroll in a bounded viewport; Fit responds to sidebar resizing.
- Increase Mermaid's base label size to 14 px. Zooming does not regenerate diagrams or call the AI model.
- Remember the selected renderer across VS Code reloads, including PlantUML.

## [2.0.9]
- Support active Python/Jupyter notebook cells instead of silently rejecting `vscode-notebook-cell` documents and leaving the Analyzing spinner running.
- Start AI summaries independently of diagram rendering; manual summary generation no longer waits for Java.
- Bound local PlantUML rendering to 15 seconds and handle process input errors.
- Scope notebook class parsing to the active cell rather than scanning notebook JSON as source code.

## [2.0.8]
- Add a masked AI API key field directly to the sidebar gear settings.
- Save sidebar-entered keys in VS Code SecretStorage, restore them on restart, and never send saved keys back to the webview or put them into settings.json.
- Keep existing settings/environment key fallback; leaving the sidebar key field blank preserves the current key.

## [2.0.7]
- Fix permanent Analyzing state when clicking an already-selected diagram tab or item.
- Remove duplicate function/class generation triggered by sidebar navigation.
- Add automatic/manual AI summary settings in the sidebar and VS Code settings, plus an explicit Generate/Regenerate button and Command Palette action.
- Bound hover documentation collection, use total HTTP deadlines, handle response interruptions, cancel superseded requests, and show summary errors separately from diagrams.
- Include raw function content, imports, model, endpoint, and credentials in cache invalidation; explicit regeneration bypasses the cache.
- Prevent slow workspace scans from overwriting newer diagrams; fix previous-renderer cancellation and dispose Java processes on shutdown.
- Handle missing Java executables without crashing the extension host.

## [2.0.6]
- LLM function summaries: a short description (plus inputs and return type) of the
  selected function, generated once per function body and cached by content hash.
  Works with any OpenAI-compatible endpoint (`liveUml.llm.baseUrl`): DeepSeek by
  default, LM Studio / Ollama locally. No key configured → summaries are skipped.
- Light/dark theme toggle in the panel header. Mermaid re-renders with the matching
  theme; PlantUML output gets its palette remapped for dark.
- Default diagram mode is now Mermaid: PlantUML needs a JRE, and a missing `java`
  left the panel showing an error instead of a diagram.

## [2.0.5]
- Fix diagram regeneration loop / flicker on Windows: the extension no longer
  auto-reveals the "Live UML" Output channel at activation. That reveal disturbed
  workbench focus and seeded a storm of spurious editor events, driving endless
  `generate()` → re-render → flicker cycles (all diagram types, PlantUML and
  Mermaid). Logging still works — open via **View → Output → Live UML**, or
  enable verbose diagnostics with the `liveUml.debug` setting.
- PlantUML server fallback is no longer printed to the developer console via
  `console.error`; it is now logged as a `WARN` line in the Output channel.

## [2.0.4]
- Remove all CDN usage: Mermaid is now bundled locally (`mermaid/mermaid.js`)
  and served via `asWebviewUri`. The extension is fully offline and never
  contacts the internet — consistent with the "total privacy" guarantee and the
  bundled PlantUML jar. Fixes blank sidebar on restricted/offline machines where
  the Mermaid CDN was unreachable (previously the failed fetch crashed the whole
  webview).
- Add logging to the "Live UML" Output channel for launch, webview, PlantUML
  server and diagram-generation lifecycle. Enable verbose diagnostics via the
  new `liveUml.debug` setting.
- Webview runtime errors are now forwarded to the Output channel for
  diagnosing a blank panel.

## [2.0.3]
- Fix mermaid flowchart 'return' after loop.

## [2.0.2]
- Fix rendering due to cached `lastRequestId` after a VS Code restart (panel
  froze on the previous session's diagram).
- Fix mermaid sequence-diagram parse error for `try`/`catch`/`finally`

## [2.0.0] - 2026-06-28
- Added mermaid support

## [1.2.0] - 2026-06-21
- Refactoring: use AST for state diagram.

## [1.1.7] - 2026-06-15
- Class Diagram: fix multiline class declaration

## [1.1.6] - 2026-06-14
- State Machine: fix fasle transitions

## [1.1.5] - 2026-06-13
- State machine: false positive filtering to eliminate non-FSM variables
- State machine: improved variable name hints (state/status ending patterns)
- State machine: title now shows detected state variable name
- State machine: fixed external API callee compatibility with underscore values
- Class diagram: Add exclude pattern in setting to improve performance

## [1.1.4] - 2026-06-07
- Improve performance of class diagram generation

## [1.1.3] - 2026-06-06
- State Machine: Improve the view for multi states

## [1.1.2] - 2026-05-28
- State machine: Switch state filtering bug fix

## [1.1.1] - 2026-05-27
- Add weight for multi states in function

## [1.1.0] - 2026-05-24
- Added state machine support and 
- Improve class diagram stability

## [1.0.9] - 2026-05-21
- Minor Bug fixes in class diagram 

## [1.0.8] - 2026-05-20
- Enhance class diagram view and navigation to avoid flooding

## [1.0.7] - 2026-05-17
- Add class diagram support

## [1.0.6] - 2026-05-16
- Significant improvement in rendering

## [1.0.5] - 2026-05-16
- Add github repo link

## [1.0.4] - 2026-05-01
- Fix rendering of demo

## [1.0.3] - 2026-05-01
- Fix assignment for 'auto' for C++

## [1.0.2] - 2026-04-28
- Bug fixes and add readability

## [1.0.1] - 2026-04-27
- Bug fixes for multilines, multidecision points and handle wider statements cleanly. 

## [1.0.0] - 2026-04-26

### Added
- **Multi-language support**: C, C++, Java, JavaScript, TypeScript, Python
- **Live diagram generation**: Automatically generates PlantUML diagrams as you type
- **Flowchart diagrams**: Visualize control flow with decision points, loops, function calls, and return statements
- **Sequence diagrams**: Show function call sequences and interactions between components
- **Real-time synchronization**: Diagrams update automatically when code changes
- **Sidebar integration**: Dedicated activity bar view listing all functions/methods in the current file
- **PlantUML export**: Copy generated PlantUML code for use in Confluence and other tools
- **Auto-detection**: Automatically detects functions and methods in source code
- **Java path configuration**: Configurable Java executable path via extension settings or sidebar UI
- **Comprehensive testing**: Test suite with example files for each supported language

# Live UML

Visualize C, C++, Java, JavaScript, TypeScript, and Python code as live flowcharts, sequence, state, and class diagrams in the sidebar. Diagram generation and rendering run locally with bundled Mermaid and PlantUML. Optional AI summaries send the selected function, imports, and limited hover documentation to your configured model endpoint; use a local endpoint or disable summaries if code must remain on your machine.

## AI summaries and update controls

Open the sidebar gear, paste your key in **AI API key (DeepSeek / compatible endpoint)**, and click **Save**. The password field is masked; keys entered here use VS Code secret storage, not settings.json. Reopen settings to see **Key configured**; the saved key is never displayed. Leave the field blank to keep the existing key, or enter a replacement and save. This configures only Live UML, not other AI tools.

The same panel lets you enable/disable **AI summaries** and choose **Summary updates**:

- **Automatic (after edits)** (default): updates after a 1.2-second typing pause. Unchanged function content reuses the cached summary; moving the cursor or clicking the active tab does not make a new paid call. Changes to the function's raw text, imports, endpoint, model, or API key invalidate the relevant cache.
- **Manual (button only)**: edits still update diagrams, but never trigger AI requests. Click **Generate summary** when wanted.
- **Regenerate summary** always bypasses the cache and sends a fresh request, in either mode. Also available as **Live UML: Regenerate AI Summary** in the Command Palette.

The same controls are in VS Code Settings as `liveUml.llm.enabled` and `liveUml.llm.updateMode` (`automatic` / `manual`). Endpoint/model settings remain `liveUml.llm.baseUrl` and `liveUml.llm.model`. Configure your own key with `liveUml.llm.apiKey` or the extension-host environment variable `LIVEUML_LLM_KEY` (fallback: `DEEPSEEK_API_KEY`). Settings-based keys are stored in your local VS Code settings; do not commit them to workspace settings or share them.

Hover documentation collection is bounded to 1.2 seconds; summaries continue without docs if a language extension does not respond. The HTTP request has a total deadline (`liveUml.llm.timeoutMs`, default 30 seconds), including servers that send keep-alive whitespace. Errors are shown in the summary panel without hiding a valid diagram. Superseded requests are cancelled and stale replies cannot overwrite the current function.

## Features

- **Multi-language support**: C, C++, Java, JavaScript, TypeScript, Python
- **Live diagram generation**: Automatically generates diagrams as you type
- **Multiple diagram types**: Flowcharts and sequence diagrams
- **Real-time synchronization**: Diagrams update automatically when code changes
- **Sidebar integration**: View and generate diagrams from the sidebar
- **PlantUML export**: Copy PlantUML code to use in other tools like Confluence
- **Auto-detection**: Automatically detects functions/methods in your code

## Demo

### Click a Function → Instant Diagram
Click on code in IDE and visualize it instantly.

![As you click](https://raw.githubusercontent.com/codenaveed/media/main/liveuml/demoAll.gif)

### Live Diagram as You Type
Diagrams update in real-time as you write code — no need to click anything.

![As you type](https://raw.githubusercontent.com/codenaveed/media/main/liveuml/demotype.gif)

### Class Diagram

![Class Diagram](https://raw.githubusercontent.com/codenaveed/media/main/liveuml/democlass.png)

### State Diagram

![State Diagram](https://raw.githubusercontent.com/codenaveed/media/main/liveuml/demostate.png)

### Export & Copy
Download the generated diagram as PNG or copy the PlantUML code for use in Confluence and other tools.

![Exporting the diagram](https://raw.githubusercontent.com/codenaveed/media/main/liveuml/demoexport.png)

## Usage

**Jupyter notebooks:** click inside a supported code cell in an `.ipynb` editor. Diagrams and summaries use that active cell's source, without executing the notebook or needing a running kernel. Switching cells updates the function list. Cross-cell class/state discovery is not implemented. Mermaid needs no Java; PlantUML requires a working Java executable and reports a timeout if a local render exceeds 15 seconds. Summary requests run independently of diagram rendering.

1. Open a supported file (C, C++, Java, JavaScript, TypeScript, Python) in VS Code.
2. Click the **Live UML** icon in the activity bar to open the sidebar.
3. The sidebar will list all functions and classes available in your current file.
4. Select a diagram type from the tabs:
   - **Flowchart**: Control flow visualization for a function.
   - **Sequence**: Function call sequences for a function.
   - **Class**: Workspace-wide object-oriented hierarchy for a class.
   - **State Machine**: State machine visualization for a function.
5. Diagrams update automatically as you type or change files.
6. **Interact**: In Class Diagrams, click on any class box to instantly jump to its source code and re-center the diagram.
7. Click **"📋 Code"** or **"🖼️ Copy SVG"** to export your diagram for Confluence or other tools.

## Supported Languages

| Language   | File Extensions                          |
|------------|------------------------------------------|
| C/C++      | `.c`, `.h`, `.cpp`, `.cc`, `.cxx`, `.hpp` |
| Java       | `.java`                                  |
| JavaScript | `.js`                                    |
| TypeScript | `.ts`, `.tsx`                            |
| Python     | `.py`                                    |

## Diagram Format

### Readable sizing and zoom

Diagrams open at **1:1** native SVG size so labels stay readable. Larger diagrams scroll horizontally/vertically rather than compressing into tiny text. Use **− / +** to zoom, **Fit** to see the full width, and **1:1** to return to the original scale. Fit adapts when the sidebar width changes; small diagrams are not stretched. These controls work with Mermaid and PlantUML and do not regenerate the diagram or make AI requests. Your most recently selected renderer is remembered across reloads.
Diagrams are rendered live on sidebar in following formats:
- PlantUML
- Mermaid

## Diagram Types

### Flowchart
Visualizes the control flow of a function, showing:
- Decision points (if/else, switch)
- Loops (for, while)
- Function calls
- Return statements

### Sequence Diagram
Shows the sequence of function calls and interactions within a method:
- Function/method calls
- Return values
- Interactions between components

### Class Diagram (OO Languages)
Visualizes the object-oriented structure of your codebase with intelligent navigation:
- **Workspace-Wide Discovery**: Automatically finds all classes and interfaces across your entire project, not just the current file.
- **Contextual Bounding**: To prevent massive, unreadable diagrams, the view is strictly scoped to the *active class's context*. It displays the full inheritance path up to the root, the path down to the leaves, and immediate siblings.
- **Information Scent**: If a class has connections outside the current focused view, it displays a clickable indicator (e.g., `+ 2 hidden subclasses [+]`) so you know there's more to explore.
- **Click-to-Navigate**: Click any class box in the diagram to instantly open that file in your editor. This automatically re-centers the diagram around the new class, allowing you to seamlessly "pan" around your entire software architecture!

### State Machine Diagram

Infers a state machine from a function. Each detected state variable gets its own `state` section in PlantUML. Scope: current file.

#### 1. Variable Detection

Scans all functions for candidate variables, scores them:

| Signal | Points |
|--------|--------|
| Switch discriminant | +3 |
| Assignment inside switch body | +3 |
| Compared (≥2 distinct values) via `==`/`!=`/`>`/`<`/`>=`/`<=` | +2 |
| ≥3 distinct assigned values | +1 |
| ≥4 distinct assigned values | +1 |
| Name hints (`state`/`status`/`phase`/`mode`/`step`/`stage`, or ending in `*State`/`*Status`) | +1 |

Score ≥2 → candidate. 

#### 2. Call Graph Expansion

Traverses callees up to depth 2 (cycle-guarded). When a callee assigns its parameter to a state variable. 
In some cases, callee is not found in found in the current file then heuristically determines the transition. 

## Requirements

- **VS Code** 1.60 or higher
- **Java 8+** (required for PlantUML diagram generation)

> Java is not bundled with the extension to keep the download size small 

## Extension Settings

This extension contributes the following settings:

* `liveUml.javaPath`: Path to the Java executable used to run PlantUML. Set this if Java is not in your system PATH, or to use a specific Java installation.

## Additional Info

The extension generates standard PlantUML code that can be used with:
- Confluence PlantUML macros
- PlantUML desktop applications
- Online PlantUML editors
- Documentation tools with PlantUML support

## Credits
- Flaticon for logo

## License

MIT

# VibeCheck

Explain code by looking at it. **VibeCheck** turns your Python, JavaScript, TypeScript, C, C++, and Java source into a clean, color-coded diagram in the VS Code sidebar — with AI-written explanations as the centerpiece — so you can understand and navigate unfamiliar code at a glance.

## What it gives you

- **Explain view** (default) — an AI-generated, color-coded flow diagram with readable text in the nodes *and* on the edges, plus a scrollable list of explanation cards. No UML glyph soup; just plain boxes and arrows that say what each step does.
- **Flowchart view** — a classic function flowchart, rendered in PlantUML or Mermaid.
- **Class diagram view** — a class's structure and relationships, with workspace-wide discovery.
- **Overview view** — a whole-file map of every function and the calls between them.
- **Hover anything** — hover a node to see its source, line number, hover docs, and a plain-language explanation. When no hover docs exist, VibeCheck still explains the node from the code itself.
- **Click to dive in** — clicking a node opens a details panel with the concrete code snippet, its explanation, docs, and **Go to line** / **Open flowchart** actions.
- **Algorithmic review** — optionally ask your model to flag inefficiencies and color the affected nodes.
- **Theme-aware** — follows your VS Code theme automatically: a Tokyo Night-inspired palette in dark mode, Solarized in light mode. PlantUML, Mermaid, and the UI all swap together.

## Getting started

1. Open a code file.
2. Click **VibeCheck** in the activity bar. The **Explain** view builds automatically.
3. (Optional) Click the ⚙ gear to connect an LLM for richer explanations and analysis:
   - Pick a provider (DeepSeek, OpenAI, OpenRouter, Ollama, LM Studio, or Custom).
   - Enter the base URL, model ID, and an API key — the key is stored in VS Code **secret storage**, never in `settings.json` or the workspace.
   - Click **Test connection** to verify the endpoint first.
4. On first run with no file open, **Open demo file** loads a sample with explanations, coloring, and clickable nodes.

Without a model, Explain falls back to a deterministic flowchart derived from your code, and every node still gets an explanation, so nothing is ever left blank.

## Views

| View | Purpose |
| --- | --- |
| **Explain** | Plain, color-coded flow with per-step explanations + code snippets (default) |
| **Flowchart** | Function control flow in PlantUML or Mermaid |
| **Class diagram** | Class structure and relationships |
| **Overview** | Whole-file function/call map |

There are two switchers: **diagram type** (Overview / Flowchart / Class) chooses *what* is visualized, and **renderer** (Explain / PlantUML / Mermaid) chooses *how* it is drawn.

## AI connection and update controls

The sidebar gear panel covers everything:

- **Provider preset** — DeepSeek, OpenAI, OpenRouter, Ollama, LM Studio, or Custom (all OpenAI-compatible Chat Completions).
- **Base URL / Model** — editable; use a base endpoint ending in `/v1`, not `/chat/completions`. Local endpoints (Ollama/LM Studio) work without a key.
- **API key** — masked, stored in VS Code SecretStorage, scoped to the exact endpoint. Changing providers never reuses another endpoint's key.
- **Test connection / load models** — checks the endpoint and loads model-ID suggestions.
- **Request timeout** — 1000–120000 ms.

Summary controls:

- **Enabled** — turn AI explanations on/off.
- **Update mode** — **Automatic** (regenerate after a 1.2 s typing pause; unchanged content reuses the cache) or **Manual** (only on request).
- **Regenerate** — always bypasses the cache and sends a fresh request.

## Configuration

| Setting | Default | Purpose |
| --- | --- | --- |
| `vibecheck.llm.enabled` | `true` | Enable AI explanations/analysis |
| `vibecheck.llm.updateMode` | `automatic` | When to regenerate summaries |
| `vibecheck.llm.analyze` | `true` | Flag algorithmic inefficiencies |
| `vibecheck.llm.provider` | `deepseek` | Provider preset |
| `vibecheck.llm.baseUrl` | DeepSeek | OpenAI-compatible base URL |
| `vibecheck.llm.model` | `deepseek-flash` | Model ID |
| `vibecheck.llm.timeoutMs` | `30000` | Request timeout |
| `vibecheck.javaPath` | `java` | Java executable (PlantUML only) |

## Supported languages

| Language | Extensions |
| --- | --- |
| C / C++ | `.c`, `.h`, `.cpp`, `.cc`, `.cxx`, `.hpp` |
| Java | `.java` |
| JavaScript | `.js` |
| TypeScript | `.ts`, `.tsx` |
| Python | `.py` |

## Privacy

Diagram generation is local. AI features (Explain, analysis) send the selected function/file source, imports, and diagram source to the endpoint you configure. Use a local model (Ollama/LM Studio) or disable AI if code must never leave your machine. No API key is written to settings, the workspace, or the packaged extension.

## Requirements

- VS Code 1.60+.
- Java (only for the PlantUML renderer — Explain and Mermaid need no Java).

## Development

```
npm install
npm test
```

The test suite covers the summarizer, PlantUML/Mermaid render timeouts, provider credential scoping, and secret-storage behavior.

## License

MIT

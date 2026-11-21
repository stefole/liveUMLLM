# liveUMLLM
VibeCheck

Install: This is a VS Code extension that is installed from .vsix (backup.vsix)! 

Explain code by looking at it. VibeCheck turns Python, JavaScript, TypeScript, C, C++, and Java source into a clean, color-coded diagram in the VS Code sidebar — with AI-written explanations as the centerpiece.

Views

- Explain (default) — AI-generated, color-coded flow diagram with readable text in nodes and edges, plus explanation cards. No UML glyphs.
- Flowchart — function control flow (PlantUML or Mermaid).
- Class diagram — class structure and relationships.
- Overview — whole-file map of functions and their call edges.

Getting started

1. Open a code file, click VibeCheck in the activity bar.
2. The Explain view builds automatically. No model? It falls back to a deterministic flowchart, and every node still gets an explanation.
3. Click ⚙ to connect an LLM (DeepSeek, OpenAI, OpenRouter, Ollama, LM Studio, Custom) — enter base URL, model, and API key (stored in VS Code secret storage). Use Test connection to verify.

Hover & click

- Hover any node → source line, hover docs, and a plain-language explanation (never blank, even without docs).
- Click a node → concrete code snippet, its explanation, and Go to line / Open flowchart.

Theme & privacy

- Follows VS Code theme automatically (Tokyo Night in dark, Solarized in light).
- Diagrams render locally; AI features send only the selected function/file source to your endpoint. No API key is ever written to settings or the workspace.

Config

vibecheck.llm.* (enabled, updateMode, analyze, provider, baseUrl, model, timeoutMs) and vibecheck.javaPath (Java, PlantUML only).

MIT.

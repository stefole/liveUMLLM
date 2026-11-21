# Live UML → Redesign Requirements & Proposal

## Scope decision
Keep ONLY two diagram types. Drop everything else.
- **Function flowchart** (the useful "UML/flow" type)
- **Class diagram**
- REMOVE: sequence, state machine, file-scope class discovery extras, external-guess
  machinery, state-variable picker, and any leftover activity/swimlane fluff.

## Explicit user demands
1. **Trim**: remove all diagram types except flowchart + class diagram. Remove the
   "completely different concept" machinery (PlantUML synthesis of sequence/state/etc.).
2. **Rewrite the source/repo**: new name, rewrite README(s), purge stale docs.
3. **Redo the UI completely** — it's "still quite crap".
4. **Light/dark**: PlantUML currently always renders dark theme. Must render light in
   light mode (and swap automatically).
5. **Hover must explain**: when no hover documentation exists, the plugin must still
   explain the element (never just "no docs available").
6. **Explain = the main view** (make Explain primary, not a tertiary tab).
7. **Explain view clicks → concrete code snippet + per-function docs** (what it does),
   not just a one-liner.
8. **File-wide view**: a proper file-wide overview is desired.
9. **Design inspiration**: VS Code themes —
   - Dark: Tokyo Night / "we'll talk your nights" (Tokyo Night).
   - Light: Solarized.
   - Research real palettes, apply them.

## My proposed additions (for a developer)
- **Code snippet panel** in Explain details: the actual source block (with line numbers)
  for the clicked component, plus the function signature and its docstring/leading
  comment rendered as the "what it does" doc.
- **Symbol tree / outline** in the sidebar so navigating a large file is one click.
- **Compact "call graph" tab** (still only flowchart/class — no new diagram dialect),
  color-coded by the same Explain categories.
- **"Open in editor" affordance** on every node/card (reveal exact line).
- **Empty-state onboarding** with a demo file, so first run isn't blank.
- **Keyboard-friendly**: Enter to drill, Esc to close details.
- **Copilot-style status line**: tiny status (analyzing / ready / error) instead of loud spinners.

## Design language (proposed)
- **Dark = Tokyo Night** palette (bg #1a1b26, panels #16161e, accent #7aa2f7, cyan #7dcfff,
  magenta #bb9af7, green #9ece6a, amber #e0af68, red #f7768e).
- **Light = Solarized Light** palette (bg #fdf6e3, panels #eee8d5, accent #268bd2,
  green #859900, amber #b58900, red #dc322f, violet #6c71c4).
- Category → color mapping reused consistently across Explain diagram, cards, and issue badges.

# ARCA Browser Extension — Foundation (Phase 1)

This directory contains the first version of the ARCA Browser Extension foundation, establishing the structure, developer-oriented popup interface, platform detection, and background service setup.

## Folder Structure

```text
extension/
├── manifest.json            # Extension manifest declaring permissions and entrypoints
├── vite.config.ts           # Build configuration using Vite and Rollup
├── tsconfig.json            # TypeScript configuration
├── package.json             # Build scripts and dependencies
├── popup/
│   ├── popup.html           # Popup UI HTML structure
│   ├── popup.tsx            # Popup React component and lifecycle
│   └── popup.css            # Developer-themed styling (no gradients or glassmorphic elements)
├── background/
│   └── background.ts        # Service worker initialization and console logger
├── content/
│   └── platformDetector.ts  # Lightweight host URL-based platform detector
└── assets/
    ├── icon16.png           # 16x16 icon file
    ├── icon48.png           # 48x48 icon file
    └── icon128.png          # 128x128 icon file
```

## Current Features (Phase 1)
- **Extension Architecture**: A structured, modular, production-ready layout utilizing Vite + Rollup and TypeScript.
- **Lightweight Platform Detection**: Detects ChatGPT, Claude, and Gemini dynamically from the active tab domain without DOM manipulation or heavy SDK overhead.
- **Developer Settings**: Compact developer-focused popup UI featuring:
  - Enabled/Disabled status indicator.
  - Detected platform information.
  - Toggle switch for Developer Mode (visual state only).
  - Clean, dark-mode developer console layout.
- **Background Worker**: Service worker initialization script logging `ARCA Extension Initialized` upon load.

## Planned Future Phases
1. **SDK Integration**: Bundling and embedding the ARCA SDK directly into the extension context.
2. **Context Governance Widget**: UI badges inside chat windows demonstrating real-time token savings and rules verification.
3. **Active Prompt Optimization**: Real-time interception and optimization of prompts sent to the target LLM.
4. **Local DB Storage**: Synchronization of client-side memories in IndexedDB.

## Limitations
- Prompt interception and modification are disabled in this phase.
- Communication between popup, background, and content scripts is disabled in this phase.
- SDK rules loading and API endpoints are placeholders.

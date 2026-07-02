# ARCA: Adaptive Context Governance Framework

ARCA is a browser-native, full-stack Adaptive Context Governance Framework designed to extend the effective context window of Large Language Models (LLMs) through client-side semantic memory management, intelligent fading, validation-driven compression, and platform-aware token budget allocation.

Rather than acting as a traditional text compressor, ARCA manages the entire conversational memory lifecycle.

---

# 🌌 Core Research Contribution

Traditional prompt optimization tools focus primarily on text compression algorithms (e.g., LLMLingua and lexical filters). ARCA introduces **Adaptive Context Governance**, treating the context window as a dynamic, finite system managed through:

- **Semantic Memory Hierarchy** – Segmenting memory into Immutable, Persistent, Session, and Ephemeral tiers.
- **Semantic Fading** – Forgetting based on utility, reference density, and importance rather than chronological age.
- **Memory Relationship Mapping** – Constructing a directed graph of memory dependencies to prevent orphaned context.
- **Validation & Repair Loops** – Ensuring critical constraints (e.g., negative constraints and variable names) are preserved and automatically repaired if damaged.
- **Adaptive Token Budget Allocation** – Platform-aware token budgeting for ChatGPT, Claude, Gemini, and local LLMs.
- **Developer Policy Engine** – Configurable policies such as Never Forget, Never Compress, Expire After X, and Priority Overrides.
- **Visual Memory Governance** – Interactive dashboard for memory visualization and analytics.

---

# 🏗️ Architecture

```
Conversation Input
       ↓
Semantic Classifier (Transformers.js)
       ↓
Memory Hierarchy (Immutable, Persistent, Session, Ephemeral)
       ↓
Memory Store (IndexedDB / LocalStorage)
       ↓
Importance Scoring Engine
       ↓
Semantic Fading Engine
       ↓
Token Compression Engine
       ↓
Validation Engine
       ↓
Repair Engine
       ↓
Adaptive Context Budget Allocator
       ↓
Developer Policy Engine
       ↓
Optimized Prompt Injection
       ↓
Visual Dashboard
```

---

# 📁 Project Structure

```
ARCA/
│
├── sdk/          # Core Adaptive Context Governance SDK
├── dashboard/    # React-based visualization dashboard
├── extension/    # Browser extension integration
└── README.md
```

---

# ⚙️ Tech Stack

### Core SDK

- TypeScript
- IndexedDB
- LocalStorage fallback
- Transformers.js
- ONNX Embeddings

### Dashboard

- React 18
- Vite
- Tailwind CSS
- React Flow
- Framer Motion

### Browser Extension

- Chrome Extension Manifest V3
- TypeScript

---

# 🚀 Features

- Semantic Memory Hierarchy
- Adaptive Context Allocation
- Dynamic Importance Scoring
- Semantic Fading
- Memory Relationship Mapping
- Validation & Repair Pipeline
- Token Compression
- Platform Detection
- Developer Policy Engine
- Import / Export Memory Support

---

# 📦 Public SDK API

The ARCA SDK exposes the following public APIs:

| API | Description |
|------|-------------|
| `ingest()` | Ingests and classifies new memories. |
| `retrieve()` | Retrieves relevant memories for a prompt. |
| `optimize()` | Produces an optimized prompt using semantic memory management. |
| `clear()` | Clears all stored memories. |
| `archive()` | Archives a selected memory. |
| `restore()` | Restores an archived memory. |
| `configure()` | Updates SDK configuration. |
| `exportMemories()` | Exports memories to JSON. |
| `importMemories()` | Imports memories from JSON. |

---

# 💻 Example

```typescript
import { ARCA } from "arca-sdk";

const arca = new ARCA();

await arca.ingest(
  "The backend uses PostgreSQL."
);

const result = await arca.optimize(
  "Build a login page",
  "chatgpt"
);

console.log(result.optimizedPrompt);
```

---

# ⚙️ Configuration

```typescript
const arca = new ARCA();

arca.configure({
  confidenceThreshold: 80
});
```

---

# 🧠 Memory Types

ARCA organizes memories into four semantic categories:

| Memory Type | Purpose |
|-------------|---------|
| Immutable | Permanent project rules and constraints. |
| Persistent | Long-term project knowledge. |
| Session | Context relevant to the current conversation. |
| Ephemeral | Temporary information that may fade over time. |

---

# 🔐 Developer Policies

ARCA supports configurable memory policies:

- Never Forget
- Never Compress
- Expire After X
- Priority Overrides

These policies allow developers to control the lifecycle of individual memories.

---

# 🚀 Getting Started

Clone the repository:

```bash
git clone <repository-url>
cd ARCA
```

Install dependencies:

```bash
npm install
```

Build the SDK:

```bash
npm run build:sdk
```

Run the dashboard:

```bash
npm run dev:dashboard
```

---

# 📄 License

MIT License.

---

# 👨‍💻 Authors

Developed as part of the **ARCA (Adaptive Context Governance Framework)** research project for efficient semantic memory management and context optimization in Large Language Models.
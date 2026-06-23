# ARCA: Adaptive Context Governance Framework

ARCA is a browser-native, full-stack Adaptive Context Governance Framework designed to extend the effective context window of Large Language Models (LLMs) through client-side semantic memory management, intelligent fading, validation-driven compression, and platform-aware token budget allocation. 

Rather than acting as a traditional text compressor, ARCA manages the entire conversational memory lifecycle.

---

## 🌌 Core Research Contribution

Traditional prompt optimization tools focus heavily on text compression algorithms (e.g., LLMLingua, lexical filters). ARCA introduces **Adaptive Context Governance**, treating the context window as a dynamic, finite system managed through:
- **Semantic Memory Hierarchy:** Segmenting memory into Immutable, Persistent, Session, and Ephemeral tiers.
- **Semantic Fading:** Forgetting based on utility, reference density, and importance rather than chronological age.
- **Memory Relationship Mapping:** Constructing a directed graph of memory dependencies to prevent orphaned context.
- **Validation & Repair Loops:** Ensuring critical constraints (e.g., negative constraints, variable names) are preserved and automatically repaired if damaged.
- **Adaptive Token Budget Allocation:** Platform-aware (ChatGPT vs. Claude vs. Gemini vs. Local LLMs) formatting and budget throttling.
- **Visual Memory Governance:** An interactive developer dashboard and memory relationship graph.

---

## 🏗️ Architecture

```
Conversation Input
       ↓
Semantic Classifier (Transformers.js)
       ↓
Memory Hierarchy (Immutable, Persistent, Session, Ephemeral)
       ↓
Memory Store (IndexedDB / LocalStorage)
       ↓
Importance Scoring Engine (Dynamic weight 0-100)
       ↓
Semantic Fading Engine (Utility-based forgetting)
       ↓
Token Compression Engine (Context abbreviation / Syntactic density)
       ↓
Validation Engine (Constraint preservation checks)
       ↓
Repair Engine (Iterative delta patch injection)
       ↓
Adaptive Budget Allocator (Platform detection: ChatGPT / Claude / Gemini / Local)
       ↓
Optimized Prompt Injector (Chrome Extension & Developer SDK)
       ↓
Visual Dashboard (React Flow Graph + Analytics Panel)
```

---

## 🛠️ Project Structure

The project is structured as a multi-package workspace:
- **`packages/sdk`**: Reusable context governance framework for developer integrations.
- **`packages/dashboard`**: Visual Memory Dashboard built with React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, and React Flow.
- **`packages/extension`**: Chrome Extension wrapper integrating the SDK and Dashboard overlay into LLM frontends (ChatGPT, Claude, Gemini, Perplexity).

---

## ⚙️ Tech Stack

- **Core & Extension**: TypeScript, Chrome Extension APIs, Manifest V3, IndexedDB.
- **AI / Embeddings**: Transformers.js (`all-MiniLM-L6-v2` ONNX model), client-side vector utilities.
- **Dashboard**: React 18, Vite, Tailwind CSS, Framer Motion, React Flow.
- **Design Aesthetic**: Professional research-tool appearance utilizing Deep Navy, Slate, Soft Blue, White, and Accent Teal.

---

## 🚀 Getting Started

Instructions for installation, building, and running the browser extension and dashboard will be documented in the respective directories as they are built.

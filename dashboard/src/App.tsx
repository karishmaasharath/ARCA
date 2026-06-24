import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  Edge,
  Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  ShieldAlert, 
  BrainCircuit, 
  Sliders, 
  Plus, 
  Search, 
  Pin, 
  Send, 
  CheckCircle,
  Database,
  TrendingDown,
  Info
} from 'lucide-react';

import { ARCA, Memory, MemoryType, PlatformType, ContextHealth } from 'arca-sdk';
import { MemoryNode } from './MemoryNode';

// Seed default data to populate dashboard immediately
const DEFAULT_MEMORIES = [
  { content: "Never use Firebase; stick strictly to SQL databases.", type: "immutable" as MemoryType },
  { content: "Always enforce GDPR and HIPAA compliance for user data.", type: "immutable" as MemoryType },
  { content: "Our backend stack is built using Python, FastAPI, and SQLAlchemy.", type: "persistent" as MemoryType },
  { content: "We host our database on PostgreSQL 16 on Amazon RDS.", type: "persistent" as MemoryType },
  { content: "Build a responsive registration page with email verification.", type: "session" as MemoryType },
  { content: "Add a database schema script for user profile metadata.", type: "session" as MemoryType },
  { content: "Hello! I am excited to start collaborating on this codebase.", type: "ephemeral" as MemoryType },
  { content: "Thank you for the quick reviews, that makes sense.", type: "ephemeral" as MemoryType },
  { content: "The office coffee machine is broken.", type: "ephemeral" as MemoryType },
  { content: "Schedule the quarterly marketing review.", type: "session" as MemoryType },
  { content: "The design team prefers dark blue branding.", type: "persistent" as MemoryType },
  { content: "Remember to order pizza for Friday.", type: "ephemeral" as MemoryType },
  { content: "Our social media strategy focuses on Instagram.", type: "persistent" as MemoryType },
];

const NODE_TYPES = {
  memoryNode: MemoryNode
};

export default function App() {
  const arca = useMemo(() => new ARCA(), []);

  // State Management
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | MemoryType>('all');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<MemoryType | 'auto'>('auto');
  
  // Playground State
  const [promptInput, setPromptInput] = useState(
    "Hello team! I'm ready to write some code. Let's build the signup API endpoint. Since we need it done quickly, I was thinking we could spin up a Firebase instance to store user data. Let me know if that works or if there are specific rules. Thanks!"
  );
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('chatgpt');
  const [optimizedResult, setOptimizedResult] = useState<{
    optimizedPrompt: string;
    metrics: ContextHealth;
    activeMemories: Memory[];
    fadedMemories: Memory[];
  } | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activePlaygroundTab, setActivePlaygroundTab] = useState<'optimized' | 'pipeline'>('optimized');

  // React Flow State
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Fetch memories from DB
  const refreshMemories = useCallback(async () => {
    const store = arca.getStore();
    let data = await store.getAll();
    
    // Seed database if empty
    if (data.length === 0) {
      for (const item of DEFAULT_MEMORIES) {
        await arca.ingest(item.content, { type: item.type });
      }
      data = await store.getAll();
    }
    setMemories(data);
  }, [arca]);

  // Handle initialization
  useEffect(() => {
    refreshMemories();
  }, [refreshMemories]);

  // Handle changes in memory list & rebuild graph layout
  useEffect(() => {
    const layoutNodes: Node[] = [];
    const layoutEdges: Edge[] = [];

    // Map memory types to layout columns (x coordinates)
    const typeX: Record<MemoryType, number> = {
      immutable: 50,
      persistent: 350,
      session: 650,
      ephemeral: 950
    };

    // Keep track of index per type to increment Y offset
    const typeCount: Record<MemoryType, number> = {
      immutable: 0,
      persistent: 0,
      session: 0,
      ephemeral: 0
    };

    memories.forEach((mem) => {
      const x = typeX[mem.type];
      const y = typeCount[mem.type] * 180 + 60;
      typeCount[mem.type]++;

      layoutNodes.push({
        id: mem.id,
        type: 'memoryNode',
        position: { x, y },
        data: {
          id: mem.id,
          content: mem.content,
          type: mem.type,
          score: mem.importanceScore,
          pinned: mem.pinned,
          onPin: handlePin,
          onDelete: handleDelete
        }
      });

      // Construct relationship edges
      mem.relatedMemories.forEach(relId => {
        // Avoid duplicate edges (render only one direction in UI)
        if (mem.id < relId) {
          layoutEdges.push({
            id: `edge-${mem.id}-${relId}`,
            source: mem.id,
            target: relId,
            animated: true,
            style: { stroke: 'rgba(91, 192, 190, 0.4)', strokeWidth: 2 }
          });
        }
      });
    });

    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [memories]);

  // Action Handlers
  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      const opts: { type?: MemoryType } = {};
      if (newType !== 'auto') {
        opts.type = newType;
      }
      await arca.ingest(newContent, opts);
      setNewContent('');
      setNewType('auto');
      await refreshMemories();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePin = async (id: string) => {
    const mem = memories.find(m => m.id === id);
    if (mem) {
      await arca.pin(id, !mem.pinned);
      await refreshMemories();
    }
  };

  const handleDelete = async (id: string) => {
    await arca.delete(id);
    await refreshMemories();
  };

  const handlePromote = async (id: string, type: MemoryType) => {
    await arca.promote(id, type);
    await refreshMemories();
  };

  const handleRunOptimizer = async () => {
    if (!promptInput.trim()) return;
    setIsOptimizing(true);
    // Artificially delay slightly to make flow clear in UI
    setTimeout(async () => {
      try {
        const result = await arca.optimize(promptInput, selectedPlatform);
        setOptimizedResult(result);
      } catch (err) {
        console.error(err);
      } finally {
        setIsOptimizing(false);
      }
    }, 400);
  };

  // Run initial simulation
  useEffect(() => {
    if (memories.length > 0 && !optimizedResult) {
      handleRunOptimizer();
    }
  }, [memories]);

  // Filter memories based on search query and category tabs
  const filteredMemories = useMemo(() => {
    return memories.filter(mem => {
      const matchesSearch = mem.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = selectedTab === 'all' || mem.type === selectedTab;
      return matchesSearch && matchesTab;
    });
  }, [memories, searchQuery, selectedTab]);

  // Compute analytics totals
  const countByType = useMemo(() => {
    const counts = { immutable: 0, persistent: 0, session: 0, ephemeral: 0 };
    memories.forEach(m => counts[m.type]++);
    return counts;
  }, [memories]);

  return (
    <div className="flex flex-col min-h-screen bg-navy-dark text-gray-100 selection:bg-teal selection:text-navy-dark">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-navy/80 backdrop-blur-md border-b border-slate-dark shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal/10 border border-teal flex items-center justify-center text-teal shadow-teal/20 shadow-inner">
            <BrainCircuit size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white font-mono flex items-center gap-1.5">
              ARCA <span className="text-teal font-sans text-xs px-2 py-0.5 rounded-full border border-teal/30 bg-teal/5">Context Governance</span>
            </h1>
            <p className="text-[10px] text-gray-400 font-mono">CLIENT-SIDE COGNITIVE SCHEMATIZATION PLATFORM</p>
          </div>
        </div>
        
        {/* Live Status indicators */}
        <div className="flex items-center gap-6 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal animate-ping"></span>
            <span className="text-gray-300">SYSTEM: ACTIVE</span>
          </div>
          <div className="h-4 w-px bg-slate-dark"></div>
          <div className="flex items-center gap-2">
            <Database size={14} className="text-softblue" />
            <span className="text-gray-400">IndexedDB: LOCALSTORE</span>
          </div>
        </div>
      </header>

      {/* Main Panel */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden max-w-[1600px] w-full mx-auto">
        
        {/* LEFT COLUMN: Memory Governance Panel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col bg-navy border border-slate-dark rounded-xl shadow-lg p-5 max-h-[85vh] overflow-y-auto">
          <h2 className="text-sm font-semibold tracking-wider font-mono text-white mb-4 flex items-center gap-2 border-b border-slate-dark pb-2">
            <Sliders size={16} className="text-teal" /> MEMORY GOVERNANCE PANEL
          </h2>

          {/* Add Memory Form */}
          <form onSubmit={handleIngest} className="bg-navy-light/40 border border-slate-dark p-3.5 rounded-lg mb-5">
            <span className="text-[10px] font-mono text-gray-400 block mb-1">INGEST NEW MEMORY STATEMENT</span>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="e.g. Avoid third party hosting for REST APIs."
              className="w-full h-16 bg-navy-dark text-xs p-2.5 rounded border border-slate-dark focus:outline-none focus:border-teal font-mono placeholder:text-gray-500 resize-none mb-3"
            />
            <div className="flex gap-2">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as MemoryType | 'auto')}
                className="flex-1 bg-navy-dark border border-slate-dark rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-teal text-gray-300"
              >
                <option value="auto">Auto Classify (ONNX)</option>
                <option value="immutable">Immutable (Strict Rule)</option>
                <option value="persistent">Persistent (Fact)</option>
                <option value="session">Session (Task)</option>
                <option value="ephemeral">Ephemeral (Context)</option>
              </select>
              <button
                type="submit"
                className="bg-teal hover:bg-teal-dark text-navy-dark font-semibold px-4 py-1.5 rounded text-xs flex items-center gap-1.5 transition-colors font-mono"
              >
                <Plus size={14} /> INGEST
              </button>
            </div>
          </form>

          {/* Search and Filters */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search active memory store..."
                className="w-full bg-navy-dark pl-8 pr-3 py-2 rounded text-xs border border-slate-dark focus:outline-none focus:border-teal font-mono"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-slate-dark pb-3">
              {(['all', 'immutable', 'persistent', 'session', 'ephemeral'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded uppercase transition-colors ${
                    selectedTab === tab 
                      ? 'bg-teal text-navy-dark font-bold' 
                      : 'bg-navy-light text-gray-400 hover:text-white border border-slate-dark/40'
                  }`}
                >
                  {tab} ({tab === 'all' ? memories.length : countByType[tab]})
                </button>
              ))}
            </div>
          </div>

          {/* Memory List Cards */}
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {filteredMemories.length === 0 ? (
              <div className="text-center py-8 text-gray-500 font-mono text-xs">
                No matching memories in governance store.
              </div>
            ) : (
              filteredMemories.map(mem => (
                <div 
                  key={mem.id}
                  className={`border p-3 rounded-lg bg-navy-light/20 transition-all ${
                    mem.type === 'immutable' ? 'border-teal/30 hover:border-teal/60' : 'border-slate-dark hover:border-slate/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-bold tracking-wider ${
                      mem.type === 'immutable' ? 'bg-teal/10 text-teal' :
                      mem.type === 'persistent' ? 'bg-blue-400/10 text-blue-300' :
                      mem.type === 'session' ? 'bg-purple-400/10 text-purple-300' :
                      'bg-gray-400/10 text-gray-400'
                    }`}>
                      {mem.type}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-gray-500">Importance: {mem.importanceScore}</span>
                      <button 
                        onClick={() => handlePin(mem.id)}
                        className={`text-gray-400 hover:text-teal transition-colors ${mem.pinned ? 'text-teal' : ''}`}
                      >
                        <Pin size={11} className={mem.pinned ? 'fill-teal' : ''} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-200 font-mono leading-relaxed break-words bg-navy-dark/40 p-2 rounded mb-2">
                    {mem.content}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 border-t border-slate-dark/50 pt-2">
                    <span>Refs: {mem.referenceCount}</span>
                    <div className="flex gap-2">
                      {mem.type !== 'immutable' && (
                        <>
                          <button
                            onClick={() => handlePromote(mem.id, 'immutable')}
                            className="hover:text-teal text-gray-400 transition-colors"
                          >
                            Lock
                          </button>
                          <button
                            onClick={() => handleDelete(mem.id)}
                            className="hover:text-red-400 text-gray-400 transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Simulator & Graph (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6 max-h-[85vh] overflow-y-auto pr-1">
          
          {/* Top Panel: Analytics Header (Health & savings) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-navy border border-slate-dark p-4 rounded-xl shadow-md">
              <span className="text-[10px] font-mono text-gray-400 block mb-1">CONTEXT HEALTH</span>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold tracking-tight text-white font-mono">
                  {optimizedResult ? `${optimizedResult.metrics.healthScore}%` : '—'}
                </span>
                <CheckCircle size={18} className="text-teal mb-1" />
              </div>
              <div className="w-full bg-slate-dark h-1 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-teal h-full transition-all duration-300"
                  style={{ width: optimizedResult ? `${optimizedResult.metrics.healthScore}%` : '0%' }}
                />
              </div>
            </div>

            <div className="bg-navy border border-slate-dark p-4 rounded-xl shadow-md">
              <span className="text-[10px] font-mono text-gray-400 block mb-1">RULE PRESERVATION</span>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold tracking-tight text-white font-mono">
                  {optimizedResult ? `${optimizedResult.metrics.rulePreservationRate}%` : '—'}
                </span>
                <ShieldAlert size={18} className="text-teal mb-1" />
              </div>
              <div className="w-full bg-slate-dark h-1 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-teal h-full transition-all duration-300"
                  style={{ width: optimizedResult ? `${optimizedResult.metrics.rulePreservationRate}%` : '0%' }}
                />
              </div>
            </div>

            <div className="bg-navy border border-slate-dark p-4 rounded-xl shadow-md">
              <span className="text-[10px] font-mono text-gray-400 block mb-1">TOKEN SAVINGS</span>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold tracking-tight text-white font-mono">
                  {optimizedResult ? `${optimizedResult.metrics.tokenSavingsRate}%` : '—'}
                </span>
                <TrendingDown size={18} className="text-teal mb-1" />
              </div>
              <div className="w-full bg-slate-dark h-1 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-teal h-full transition-all duration-300"
                  style={{ width: optimizedResult ? `${optimizedResult.metrics.tokenSavingsRate}%` : '0%' }}
                />
              </div>
            </div>

            <div className="bg-navy border border-slate-dark p-4 rounded-xl shadow-md">
              <span className="text-[10px] font-mono text-gray-400 block mb-1">TOTAL SYSTEM TOKENS</span>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold tracking-tight text-white font-mono">
                  {optimizedResult ? `${optimizedResult.metrics.compressedTokens}` : '0'}
                </span>
                <span className="text-[10px] text-gray-500 font-mono mb-1">
                  Orig: {optimizedResult ? optimizedResult.metrics.originalTokens : '0'}
                </span>
              </div>
              <div className="text-[9px] text-gray-400 font-mono mt-2 uppercase tracking-wide">
                platform: <span className="text-teal">{selectedPlatform}</span>
              </div>
            </div>
          </div>

          {/* Tab Selection: Graph View vs. Optimizer Playground */}
          <div className="flex-1 bg-navy border border-slate-dark rounded-xl shadow-lg flex flex-col min-h-[450px] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-dark bg-navy-light/20">
              <div className="flex gap-2">
                <button
                  onClick={() => setActivePlaygroundTab('optimized')}
                  className={`px-4 py-1.5 rounded text-xs font-mono uppercase transition-colors ${
                    activePlaygroundTab === 'optimized' 
                      ? 'bg-slate-dark text-white border border-teal/40' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Simulation Playground
                </button>
                <button
                  onClick={() => setActivePlaygroundTab('pipeline')}
                  className={`px-4 py-1.5 rounded text-xs font-mono uppercase transition-colors ${
                    activePlaygroundTab === 'pipeline' 
                      ? 'bg-slate-dark text-white border border-teal/40' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Interactive Memory Graph ({memories.length})
                </button>
              </div>

              {/* Platform Selector */}
              {activePlaygroundTab === 'optimized' && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-mono">PLATFORM TARGET:</span>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value as PlatformType)}
                    className="bg-navy-dark border border-slate-dark rounded px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-teal text-gray-200"
                  >
                    <option value="chatgpt">ChatGPT (Moderate)</option>
                    <option value="claude">Claude (Minimal)</option>
                    <option value="gemini">Gemini (Memory Structuring)</option>
                    <option value="local">Local Model (Aggressive)</option>
                  </select>
                </div>
              )}
            </div>

            {/* TAB CONTENT: Simulator Playground */}
            {activePlaygroundTab === 'optimized' && (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-5 overflow-hidden">
                {/* Left Side: Input Prompt */}
                <div className="flex flex-col h-full min-h-[300px]">
                  <span className="text-[10px] font-mono text-gray-400 mb-1.5 flex items-center gap-1">
                    <Info size={11} className="text-teal" /> INPUT USER PROMPT
                  </span>
                  <textarea
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="Enter chat prompts here to evaluate context optimization..."
                    className="flex-1 bg-navy-dark text-xs p-4 rounded-lg border border-slate-dark focus:outline-none focus:border-teal font-mono placeholder:text-gray-600 resize-none leading-relaxed"
                  />
                  <button
                    onClick={handleRunOptimizer}
                    disabled={isOptimizing}
                    className="mt-3 bg-teal hover:bg-teal-dark disabled:bg-slate/40 text-navy-dark font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition-all font-mono"
                  >
                    <Send size={14} />
                    {isOptimizing ? 'RUNNING GOVERNANCE PIPELINE...' : 'RUN ADAPTIVE OPTIMIZER'}
                  </button>
                </div>

                {/* Right Side: Governed Output */}
                <div className="flex flex-col h-full min-h-[300px] border-t md:border-t-0 md:border-l border-slate-dark/50 pt-4 md:pt-0 md:pl-4">
                  <span className="text-[10px] font-mono text-gray-400 mb-1.5 flex items-center justify-between">
                    <span>GOVERNED PROMPT OUTPUT (SENT TO LLM)</span>
                    {optimizedResult && (
                      <span className="text-teal uppercase font-bold text-[9px]">
                        Saved {optimizedResult.metrics.originalTokens - optimizedResult.metrics.compressedTokens} Tokens
                      </span>
                    )}
                  </span>
                  <div className="flex-1 bg-navy-dark p-4 rounded-lg border border-slate-dark font-mono text-xs overflow-y-auto leading-relaxed select-text text-gray-300 whitespace-pre-wrap">
                    {optimizedResult ? (
                      optimizedResult.optimizedPrompt
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-600">
                        Click 'Run Adaptive Optimizer' to test.
                      </div>
                    )}
                  </div>
                  
                  {/* Faded Memories list details */}
                  {optimizedResult && optimizedResult.fadedMemories.length > 0 && (
                    <div className="mt-3 p-3 bg-red-950/15 border border-red-900/30 rounded-lg">
                      <span className="text-[9px] font-mono text-red-300 block font-bold uppercase tracking-wider mb-1">
                        ⚠️ Faded from Context (Pruned due to budget limits)
                      </span>
                      <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                        {optimizedResult.fadedMemories.map(m => (
                          <div key={m.id} className="text-[10px] font-mono text-gray-300 border-b border-red-900/10 pb-1.5 last:border-0 last:pb-0">
                            <div>• <span className="font-bold text-red-400">[{m.type}]</span> {m.content}</div>
                            {m.explanation && (
                              <div className="text-gray-500 pl-3 italic mt-0.5">
                                Reason: {m.explanation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Interactive Graph */}
            {activePlaygroundTab === 'pipeline' && (
              <div className="flex-1 min-h-[450px] relative bg-[#040810]">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodeTypes={NODE_TYPES}
                  fitView
                >
                  <Background color="rgba(91, 192, 190, 0.08)" gap={16} size={1} />
                  <Controls className="!bg-navy !border-slate-dark !fill-gray-100" />
                  <MiniMap 
                    nodeColor={(node) => {
                      if (node.data.type === 'immutable') return '#5BC0BE';
                      if (node.data.type === 'persistent') return '#3A506B';
                      if (node.data.type === 'session') return '#82D2D0';
                      return '#1C2541';
                    }}
                    className="!bg-navy-dark !border-slate-dark"
                  />
                </ReactFlow>

                {/* Graph Legend overlay */}
                <div className="absolute bottom-4 left-4 z-10 bg-navy/95 border border-slate-dark p-3 rounded-lg shadow-lg font-mono text-[9px] space-y-1.5 select-none">
                  <div className="font-bold text-gray-400 uppercase border-b border-slate-dark pb-1 mb-1.5">Graph Legend</div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded bg-navy-light border border-teal"></span>
                    <span className="text-gray-300">Immutable (Rules, 100pts)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded bg-slate-dark border border-softblue"></span>
                    <span className="text-gray-300">Persistent (Facts, 70pts)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded bg-[#1b2b4c] border border-blue-400/50"></span>
                    <span className="text-gray-300">Session (Tasks, 40pts)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded bg-navy border border-gray-700"></span>
                    <span className="text-gray-300">Ephemeral (Chitchat, 10pts)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-px border-t-2 border-teal opacity-50"></span>
                    <span className="text-gray-400">Semantic Overlap Link</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-dark bg-navy-dark text-center font-mono text-[10px] text-gray-500">
        ARCA Adaptive Context Governance Platform — Sandbox Research Interface v1.0.0
      </footer>
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Search, 
  Pin, 
  Send, 
  CheckCircle,
  Database,
  TrendingDown,
  Info,
  ClipboardList,
  MessageSquare,
  Trash2,
  Lock
} from 'lucide-react';

import {
  ARCA,
  Memory,
  MemoryType,
  PlatformType,
  ContextHealth,
  MemoryMigrations
} from 'arca-sdk';
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

interface HierarchyConfig {
  type: MemoryType;
  title: string;
  badgeText: string;
  icon: any;
  color: string;
  badgeStyle: string;
  dotColor: string;
  textColor: string;
  description: string;
}

const HIERARCHY_CONFIG: HierarchyConfig[] = [
  {
    type: 'immutable',
    title: 'Rules',
    badgeText: 'Immutable',
    icon: ShieldAlert,
    color: 'purple',
    badgeStyle: 'bg-purple-500/10 text-purple-300 border border-purple-500/20',
    dotColor: 'bg-purple-400',
    textColor: 'text-purple-300',
    description: 'Immutable developer rules and system constraints.'
  },
  {
    type: 'persistent',
    title: 'Project Knowledge',
    badgeText: 'Persistent',
    icon: Database,
    color: 'blue',
    badgeStyle: 'bg-blue-500/10 text-blue-300 border border-blue-500/20',
    dotColor: 'bg-blue-400',
    textColor: 'text-blue-300',
    description: 'Persistent details of the project tech stack and facts.'
  },
  {
    type: 'session',
    title: 'Current Tasks',
    badgeText: 'Session',
    icon: ClipboardList,
    color: 'green',
    badgeStyle: 'bg-green-500/10 text-green-300 border border-green-500/20',
    dotColor: 'bg-green-400',
    textColor: 'text-green-300',
    description: 'Active tasks and check-list items for the session.'
  },
  {
    type: 'ephemeral',
    title: 'Conversation',
    badgeText: 'Ephemeral',
    icon: MessageSquare,
    color: 'gray',
    badgeStyle: 'bg-gray-400/10 text-gray-400 border border-gray-400/20',
    dotColor: 'bg-gray-400',
    textColor: 'text-gray-400',
    description: 'Short-term context, user greetings, and discussion notes.'
  }
];

export default function App() {
  const arca = useMemo(() => new ARCA(), []);

  // State Management
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtering & Sorting State
  const [selectedTypes, setSelectedTypes] = useState<Record<MemoryType, boolean>>({
    immutable: true,
    persistent: true,
    session: true,
    ephemeral: true
  });
  const [pinnedFilter, setPinnedFilter] = useState<'all' | 'pinned' | 'unpinned'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'importance' | 'references'>('newest');

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

  // Action Handlers
  const handlePin = useCallback(async (id: string) => {
    const mem = memories.find(m => m.id === id);
    if (mem) {
      await arca.pin(id, !mem.pinned);
      await refreshMemories();
    }
  }, [arca, memories, refreshMemories]);

  const handleDelete = useCallback(async (id: string) => {
    await arca.delete(id);
    await refreshMemories();
  }, [arca, refreshMemories]);

  const handlePromote = useCallback(async (id: string, type: MemoryType) => {
    await arca.promote(id, type);
    await refreshMemories();
  }, [arca, refreshMemories]);

  // Handle initialization
  useEffect(() => {
    const initialize = async () => {
      await refreshMemories();
      await MemoryMigrations.backfillEmbeddings(arca.getStore());
      await refreshMemories();
    };
    initialize();
  }, [arca, refreshMemories]);

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
          importanceScore: mem.importanceScore,
          pinned: mem.pinned,
          onPin: handlePin,
          onDelete: handleDelete
        }
      });

      // Construct relationship edges
      mem.relatedMemories.forEach(relId => {
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
  }, [memories, handlePin, handleDelete, setNodes, setEdges]);

  const handleRunOptimizer = async () => {
    if (!promptInput.trim()) return;
    setIsOptimizing(true);
    setTimeout(async () => {
      try {
        const result = await arca.optimize(promptInput, selectedPlatform);
        setOptimizedResult(result);
        await refreshMemories();
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

  // Filters & sorting memoization
  const filteredAndSortedMemories = useMemo(() => {
    const filtered = memories.filter(mem => {
      const matchesSearch = mem.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedTypes[mem.type];
      const matchesPinned = 
        pinnedFilter === 'all' ? true :
        pinnedFilter === 'pinned' ? mem.pinned :
        !mem.pinned;
      return matchesSearch && matchesType && matchesPinned;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return b.timestamp - a.timestamp;
      }
      if (sortBy === 'importance') {
        return b.importanceScore - a.importanceScore;
      }
      if (sortBy === 'references') {
        return (b.referenceCount || 0) - (a.referenceCount || 0);
      }
      return 0;
    });

    return filtered;
  }, [memories, searchQuery, selectedTypes, pinnedFilter, sortBy]);

  // UI Handlers
  const toggleTypeFilter = (type: MemoryType) => {
    setSelectedTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-navy-dark text-gray-100 selection:bg-teal selection:text-navy-dark">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-3 bg-navy/80 backdrop-blur-md border-b border-slate-dark shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal/10 border border-teal flex items-center justify-center text-teal shadow-teal/20 shadow-inner">
            <BrainCircuit size={18} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white font-mono flex items-center gap-1.5">
              ARCA <span className="text-teal font-sans text-[10px] px-1.5 py-0.2 rounded-full border border-teal/30 bg-teal/5">Context Governance</span>
            </h1>
            <p className="text-[9px] text-gray-400 font-mono">DEVELOPER CONSOLE</p>
          </div>
        </div>
        
        {/* Live Status indicators */}
        <div className="flex items-center gap-4 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal animate-ping"></span>
            <span className="text-gray-300">SYSTEM: ACTIVE</span>
          </div>
          <div className="h-3 w-px bg-slate-dark"></div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <Database size={12} className="text-softblue" />
            <span>IndexedDB</span>
          </div>
        </div>
      </header>

      {/* Main Panel */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden max-w-[1600px] w-full mx-auto">
        
        {/* LEFT COLUMN: Memory Governance Panel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col bg-navy border border-slate-dark rounded-xl shadow-lg p-4 max-h-[88vh] overflow-y-auto">
          <h2 className="text-xs font-semibold tracking-wider font-mono text-white mb-3 flex items-center gap-1.5 border-b border-slate-dark pb-2 uppercase">
            <Sliders size={14} className="text-teal" /> Memory Store
          </h2>

          {/* Search and Filters */}
          <div className="space-y-3 mb-4 pb-3 border-b border-slate-dark/40">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2 text-gray-400" size={12} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memories..."
                className="w-full bg-navy-dark pl-7 pr-3 py-1.5 rounded text-[11px] border border-slate-dark focus:outline-none focus:border-teal font-mono placeholder:text-gray-500"
              />
            </div>

            {/* Type Toggles */}
            <div className="flex flex-wrap gap-1">
              {HIERARCHY_CONFIG.map(config => {
                const isActive = selectedTypes[config.type];
                const count = memories.filter(m => m.type === config.type).length;
                return (
                  <button
                    key={config.type}
                    onClick={() => toggleTypeFilter(config.type)}
                    className={`px-2 py-0.5 text-[8px] font-mono rounded-full border transition-all flex items-center gap-1 ${
                      isActive 
                        ? `${config.badgeStyle} ring-1 ring-white/5` 
                        : 'bg-navy-dark text-gray-500 border-slate-dark/30 hover:text-gray-400'
                    }`}
                  >
                    <span className={`w-1 h-1 rounded-full ${isActive ? config.dotColor : 'bg-gray-700'}`}></span>
                    {config.title} ({count})
                  </button>
                );
              })}
            </div>

            {/* Pinned filter & Sort By */}
            <div className="grid grid-cols-2 gap-3 pt-0.5">
              {/* Pinned State */}
              <div className="flex bg-navy-dark rounded p-0.5 border border-slate-dark/50 items-center justify-between">
                {(['all', 'pinned', 'unpinned'] as const).map(option => (
                  <button
                    key={option}
                    onClick={() => setPinnedFilter(option)}
                    className={`flex-1 px-1 py-0.5 text-[8px] rounded uppercase font-bold transition-colors ${
                      pinnedFilter === option 
                        ? 'bg-teal text-navy-dark' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-navy-dark border border-slate-dark/50 rounded px-1.5 py-0.5 text-[9px] font-mono focus:outline-none focus:border-teal text-gray-200"
              >
                <option value="newest">Newest First</option>
                <option value="importance">Highest Importance</option>
                <option value="references">Most Referenced</option>
              </select>
            </div>
          </div>

          {/* Grouped Memories List */}
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {filteredAndSortedMemories.length === 0 ? (
              <div className="text-center py-6 text-gray-500 font-mono text-[10px]">
                No matching memories.
              </div>
            ) : (
              HIERARCHY_CONFIG.map(config => {
                const sectionMemories = filteredAndSortedMemories.filter(m => m.type === config.type);
                if (sectionMemories.length === 0) return null;
                const Icon = config.icon;

                return (
                  <div key={config.type} className="space-y-1.5">
                    {/* Section Header */}
                    <div className="flex items-center gap-1.5 px-1 py-0.5 border-b border-slate-dark/30">
                      <Icon size={12} className={config.textColor} />
                      <span className="font-mono text-[9px] font-bold text-gray-300 uppercase tracking-wider">
                        {config.title}
                      </span>
                      <span className="text-[8px] text-gray-500 font-mono">
                        ({sectionMemories.length})
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="space-y-1.5">
                      {sectionMemories.map(mem => (
                        <div 
                          key={mem.id}
                          className="border border-slate-dark/60 p-2 rounded bg-navy-light/10 hover:bg-navy-light/20 transition-all"
                          title={`Importance Score: ${mem.importanceScore}`}
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[8px] px-1.5 py-0.2 rounded font-mono uppercase font-bold tracking-wider border ${config.badgeStyle}`}>
                              {config.badgeText}
                            </span>
                            
                            <button 
                              onClick={() => handlePin(mem.id)}
                              className={`p-0.5 rounded hover:bg-white/5 transition-colors ${mem.pinned ? 'text-blue-400' : 'text-gray-500 hover:text-white'}`}
                              title={mem.pinned ? 'Unpin Memory' : 'Pin Memory'}
                            >
                              <Pin size={10} className={mem.pinned ? 'fill-blue-400 text-blue-400' : ''} />
                            </button>
                          </div>

                          {/* Content */}
                          <p className="text-[11px] text-gray-200 font-mono leading-normal break-words bg-navy-dark/40 p-2 rounded border border-white/5 select-text selection:bg-teal selection:text-navy-dark mb-1">
                            {mem.content}
                          </p>

                          {/* Actions */}
                          <div className="flex justify-end gap-2 text-[8px] font-mono">
                            {mem.type !== 'immutable' && (
                              <>
                                <button
                                  onClick={() => handlePromote(mem.id, 'immutable')}
                                  className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5"
                                  title="Promote to Immutable Rule"
                                >
                                  <Lock size={8} /> Lock
                                </button>
                                <button
                                  onClick={() => handleDelete(mem.id)}
                                  className="text-red-400 hover:text-red-300 font-bold flex items-center gap-0.5"
                                  title="Delete Memory"
                                >
                                  <Trash2 size={8} /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Simulator & Graph (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4 max-h-[88vh] overflow-y-auto pr-1">
          
          {/* Top Panel: Analytics Header (Health & savings) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-navy border border-slate-dark p-3 rounded-lg shadow-md">
              <span className="text-[9px] font-mono text-gray-400 block mb-0.5">CONTEXT HEALTH</span>
              <div className="flex items-end justify-between">
                <span className="text-xl font-bold tracking-tight text-white font-mono">
                  {optimizedResult ? `${optimizedResult.metrics.healthScore}%` : '—'}
                </span>
                <CheckCircle size={15} className="text-teal mb-0.5" />
              </div>
              <div className="w-full bg-slate-dark h-1 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="bg-teal h-full transition-all duration-300"
                  style={{ width: optimizedResult ? `${optimizedResult.metrics.healthScore}%` : '0%' }}
                />
              </div>
            </div>

            <div className="bg-navy border border-slate-dark p-3 rounded-lg shadow-md">
              <span className="text-[9px] font-mono text-gray-400 block mb-0.5">RULE PRESERVATION</span>
              <div className="flex items-end justify-between">
                <span className="text-xl font-bold tracking-tight text-white font-mono">
                  {optimizedResult ? `${optimizedResult.metrics.rulePreservationRate}%` : '—'}
                </span>
                <ShieldAlert size={15} className="text-teal mb-0.5" />
              </div>
              <div className="w-full bg-slate-dark h-1 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="bg-teal h-full transition-all duration-300"
                  style={{ width: optimizedResult ? `${optimizedResult.metrics.rulePreservationRate}%` : '0%' }}
                />
              </div>
            </div>

            <div className="bg-navy border border-slate-dark p-3 rounded-lg shadow-md">
              <span className="text-[9px] font-mono text-gray-400 block mb-0.5">TOKEN SAVINGS</span>
              <div className="flex items-end justify-between">
                <span className="text-xl font-bold tracking-tight text-white font-mono">
                  {optimizedResult ? `${optimizedResult.metrics.tokenSavingsRate}%` : '—'}
                </span>
                <TrendingDown size={15} className="text-teal mb-0.5" />
              </div>
              <div className="w-full bg-slate-dark h-1 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="bg-teal h-full transition-all duration-300"
                  style={{ width: optimizedResult ? `${optimizedResult.metrics.tokenSavingsRate}%` : '0%' }}
                />
              </div>
            </div>

            <div className="bg-navy border border-slate-dark p-3 rounded-lg shadow-md flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-mono text-gray-400 block mb-0.5">TOTAL SYSTEM TOKENS</span>
                <div className="flex items-end justify-between">
                  <span className="text-xl font-bold tracking-tight text-white font-mono">
                    {optimizedResult ? `${optimizedResult.metrics.compressedTokens}` : '0'}
                  </span>
                  <span className="text-[9px] text-gray-500 font-mono mb-0.5">
                    Orig: {optimizedResult ? optimizedResult.metrics.originalTokens : '0'}
                  </span>
                </div>
              </div>
              <div className="text-[8px] text-gray-400 font-mono uppercase mt-1 tracking-wide">
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
                      if (node.data.type === 'immutable') return '#8b5cf6'; // purple-500
                      if (node.data.type === 'persistent') return '#3b82f6'; // blue-500
                      if (node.data.type === 'session') return '#10b981'; // green-500
                      return '#6b7280'; // gray-500
                    }}
                    className="!bg-navy-dark !border-slate-dark"
                  />
                </ReactFlow>

                {/* Graph Legend overlay */}
                <div className="absolute bottom-4 left-4 z-10 bg-navy/95 border border-slate-dark p-3 rounded-lg shadow-lg font-mono text-[9px] space-y-1.5 select-none">
                  <div className="font-bold text-gray-400 uppercase border-b border-slate-dark pb-1 mb-1.5">Graph Legend</div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded bg-purple-500"></span>
                    <span className="text-gray-300">Immutable (Rules, 100pts)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded bg-blue-500"></span>
                    <span className="text-gray-300">Persistent (Facts, 70pts)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded bg-green-500"></span>
                    <span className="text-gray-300">Session (Tasks, 40pts)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded bg-gray-500"></span>
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
      <footer className="py-3 border-t border-slate-dark bg-navy-dark text-center font-mono text-[9px] text-gray-500">
        ARCA Adaptive Context Governance Platform — Sandbox Research Interface v1.0.0
      </footer>
    </div>
  );
}

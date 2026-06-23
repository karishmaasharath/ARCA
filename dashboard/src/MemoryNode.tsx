import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Pin, Trash2, ShieldAlert } from 'lucide-react';
import { MemoryType } from 'arca-sdk';

interface MemoryNodeProps {
  data: {
    id: string;
    content: string;
    type: MemoryType;
    score: number;
    pinned: boolean;
    onPin: (id: string) => void;
    onDelete: (id: string) => void;
  };
}

export const MemoryNode = memo(({ data }: MemoryNodeProps) => {
  const typeColors: Record<MemoryType, string> = {
    immutable: 'bg-navy-light border-teal text-white shadow-teal/20',
    persistent: 'bg-slate-dark border-softblue text-gray-100 shadow-slate-900',
    session: 'bg-[#1b2b4c] border-blue-400/50 text-gray-100',
    ephemeral: 'bg-navy border-gray-700/50 text-gray-300'
  };

  const badgeColors: Record<MemoryType, string> = {
    immutable: 'bg-teal/20 text-teal border border-teal/40',
    persistent: 'bg-blue-400/10 text-blue-300 border border-blue-400/20',
    session: 'bg-purple-400/10 text-purple-300 border border-purple-400/20',
    ephemeral: 'bg-gray-400/10 text-gray-400 border border-gray-400/20'
  };

  return (
    <div className={`w-64 rounded-lg border p-3 font-sans transition-all duration-200 shadow-lg ${typeColors[data.type]} hover:scale-[1.02]`}>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-teal" />
      
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${badgeColors[data.type]}`}>
          {data.type}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-gray-400">Score: {data.score}</span>
          {data.pinned && <Pin size={10} className="text-teal fill-teal" />}
        </div>
      </div>

      <p className="text-xs font-mono leading-relaxed line-clamp-3 mb-3 bg-[#050b14]/50 p-1.5 rounded border border-white/5 select-none">
        {data.content}
      </p>

      <div className="flex items-center justify-between border-t border-white/5 pt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onPin(data.id);
          }}
          className={`p-1 rounded hover:bg-white/5 transition-colors ${data.pinned ? 'text-teal' : 'text-gray-400'}`}
          title={data.pinned ? 'Unpin Memory' : 'Pin Memory'}
        >
          <Pin size={12} className={data.pinned ? 'fill-teal' : ''} />
        </button>
        {data.type === 'immutable' && (
          <span className="text-[10px] text-teal/80 flex items-center gap-1 font-mono">
            <ShieldAlert size={10} /> Lock
          </span>
        )}
        {data.type !== 'immutable' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete(data.id);
            }}
            className="p-1 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
            title="Delete Memory"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-teal" />
    </div>
  );
});

MemoryNode.displayName = 'MemoryNode';

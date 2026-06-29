import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Pin, Trash2, ShieldAlert } from 'lucide-react';
import { MemoryType } from 'arca-sdk';

interface MemoryNodeProps {
  data: {
    id: string;
    content: string;
    type: MemoryType;
    importanceScore: number;
    pinned: boolean;
    onPin: (id: string) => void;
    onDelete: (id: string) => void;
  };
}

export const MemoryNode = memo(({ data }: MemoryNodeProps) => {
  const typeColors: Record<MemoryType, string> = {
    immutable: 'bg-navy-light border-purple-500/30 text-white shadow-purple-500/5',
    persistent: 'bg-slate-dark border-blue-500/30 text-gray-100 shadow-slate-900',
    session: 'bg-[#1b2b4c] border-green-500/20 text-gray-100',
    ephemeral: 'bg-navy border-gray-700/50 text-gray-300'
  };

  const badgeColors: Record<MemoryType, string> = {
    immutable: 'bg-purple-500/10 text-purple-300 border border-purple-500/20',
    persistent: 'bg-blue-500/10 text-blue-300 border border-blue-500/20',
    session: 'bg-green-500/10 text-green-300 border border-green-500/20',
    ephemeral: 'bg-gray-400/10 text-gray-400 border border-gray-400/20'
  };

  const badgeLabels: Record<MemoryType, string> = {
    immutable: '🟣 Immutable',
    persistent: '🔵 Persistent',
    session: '🟢 Session',
    ephemeral: '⚪ Ephemeral'
  };

  return (
    <div 
      className={`w-64 rounded-lg border p-2.5 font-sans transition-all duration-200 shadow-lg ${typeColors[data.type]} hover:scale-[1.01]`}
      title={`Importance Score: ${data.importanceScore}`}
    >
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-teal" />
      
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[8px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${badgeColors[data.type]}`}>
          {badgeLabels[data.type]}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onPin(data.id);
          }}
          className={`p-0.5 rounded hover:bg-white/5 transition-colors ${data.pinned ? 'text-blue-400' : 'text-gray-400'}`}
          title={data.pinned ? 'Unpin Memory' : 'Pin Memory'}
        >
          <Pin size={11} className={data.pinned ? 'fill-blue-400 text-blue-400' : ''} />
        </button>
      </div>

      <p className="text-xs font-mono leading-relaxed line-clamp-3 mb-2 bg-[#050b14]/50 p-1.5 rounded border border-white/5 select-none">
        {data.content}
      </p>

      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        {data.type === 'immutable' ? (
          <span className="text-[9px] text-purple-400 flex items-center gap-1 font-mono">
            <ShieldAlert size={10} /> Lock
          </span>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onDelete(data.id);
              }}
              className="text-[9px] hover:text-red-400 text-gray-400 transition-colors flex items-center gap-0.5"
              title="Delete Memory"
            >
              <Trash2 size={10} /> Delete
            </button>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-teal" />
    </div>
  );
});

MemoryNode.displayName = 'MemoryNode';

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import {
  Brain, ShieldCheck, Cpu, Database, Zap, Settings,
  Sparkles, Layers, ChevronRight, ChevronDown, CheckCircle2
} from 'lucide-react';
import clsx from 'clsx';

export interface ConceptNodeData {
  id: string;
  label: string;
  description: string;
  category: string;
  keywords: string[];
  isRoot?: boolean;
  hasChildren?: boolean;
  childCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: (id: string) => void;
  onSelectNode?: (nodeData: ConceptNodeData) => void;
}

const getCategoryStyles = (category: string = '', isRoot?: boolean) => {
  if (isRoot) {
    return {
      border: 'border-teal-500/80 shadow-teal-500/30 shadow-lg',
      bg: 'bg-gradient-to-br from-teal-950/90 via-slate-900/95 to-cyan-950/90',
      badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      iconColor: 'text-teal-400',
      accent: 'from-teal-500 to-cyan-400',
      glow: '#14b8a6',
    };
  }

  const cat = category.toLowerCase();
  if (cat.includes('arch') || cat.includes('system')) {
    return {
      border: 'border-cyan-500/60 shadow-cyan-500/10 shadow-md',
      bg: 'bg-slate-900/90 hover:bg-slate-900',
      badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      iconColor: 'text-cyan-400',
      accent: 'from-cyan-500 to-blue-500',
      glow: '#06b6d4',
    };
  }
  if (cat.includes('sec') || cat.includes('auth') || cat.includes('guard')) {
    return {
      border: 'border-rose-500/60 shadow-rose-500/10 shadow-md',
      bg: 'bg-slate-900/90 hover:bg-slate-900',
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      iconColor: 'text-rose-400',
      accent: 'from-rose-500 to-red-500',
      glow: '#f43f5e',
    };
  }
  if (cat.includes('data') || cat.includes('flow') || cat.includes('vector')) {
    return {
      border: 'border-purple-500/60 shadow-purple-500/10 shadow-md',
      bg: 'bg-slate-900/90 hover:bg-slate-900',
      badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      iconColor: 'text-purple-400',
      accent: 'from-purple-500 to-indigo-500',
      glow: '#a855f7',
    };
  }
  if (cat.includes('perf') || cat.includes('cache') || cat.includes('scale')) {
    return {
      border: 'border-amber-500/60 shadow-amber-500/10 shadow-md',
      bg: 'bg-slate-900/90 hover:bg-slate-900',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      iconColor: 'text-amber-400',
      accent: 'from-amber-500 to-yellow-500',
      glow: '#f59e0b',
    };
  }
  return {
    border: 'border-emerald-500/60 shadow-emerald-500/10 shadow-md',
    bg: 'bg-slate-900/90 hover:bg-slate-900',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    accent: 'from-emerald-500 to-teal-500',
    glow: '#10b981',
  };
};

const CustomConceptNode: React.FC<NodeProps> = ({ data, selected, targetPosition, sourcePosition }) => {
  const nodeData = data as unknown as ConceptNodeData;
  const styles = getCategoryStyles(nodeData.category, nodeData.isRoot);

  return (
    <div
      onClick={() => nodeData.onSelectNode?.(nodeData)}
      className={clsx(
        'w-[260px] rounded-2xl border transition-all duration-200 p-3.5 backdrop-blur-xl relative cursor-pointer group text-slate-100',
        styles.bg,
        styles.border,
        selected ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-slate-950 scale-[1.02]' : 'hover:border-slate-400/80 hover:scale-[1.01]'
      )}
    >
      {/* React Flow Target Handle (Input Connection) */}
      {!nodeData.isRoot && (
        <Handle
          type="target"
          position={targetPosition || Position.Left}
          className="!w-3 !h-3 !bg-teal-400 !border-2 !border-slate-950 !rounded-full transition-transform hover:scale-125"
        />
      )}

      {/* Top Header: Icon + Category Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center justify-center flex-shrink-0">
            {nodeData.isRoot ? (
              <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
            ) : (
              <Brain className={`w-3.5 h-3.5 ${styles.iconColor}`} />
            )}
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border truncate font-mono uppercase tracking-wider ${styles.badge}`}>
            {nodeData.isRoot ? 'CORE TOPIC' : (nodeData.category || 'CONCEPT')}
          </span>
        </div>

        {/* Expand / Collapse Branch Button */}
        {nodeData.hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              nodeData.onToggleCollapse?.(nodeData.id);
            }}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-300 transition-colors shadow-sm"
            title={nodeData.isCollapsed ? 'Expand sub-branches' : 'Collapse sub-branches'}
          >
            <span className="font-mono text-[9px] font-bold text-teal-400">
              {nodeData.childCount ? `+${nodeData.childCount}` : ''}
            </span>
            {nodeData.isCollapsed ? (
              <ChevronRight className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-teal-400" />
            )}
          </button>
        )}
      </div>

      {/* Concept Label */}
      <h3 className="text-xs font-bold text-white leading-snug line-clamp-2 mb-1.5">
        {nodeData.label}
      </h3>

      {/* Short Description */}
      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2 font-sans">
        {nodeData.description}
      </p>

      {/* Keyword Tags Footer */}
      {nodeData.keywords && nodeData.keywords.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap pt-1.5 border-t border-slate-800/80">
          {nodeData.keywords.slice(0, 2).map((kw, i) => (
            <span
              key={i}
              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 font-mono"
            >
              #{kw}
            </span>
          ))}
          {nodeData.keywords.length > 2 && (
            <span className="text-[9px] text-slate-500 font-mono">
              +{nodeData.keywords.length - 2}
            </span>
          )}
        </div>
      )}

      {/* React Flow Source Handle (Output Connection) */}
      {nodeData.hasChildren && (
        <Handle
          type="source"
          position={sourcePosition || Position.Right}
          className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-950 !rounded-full transition-transform hover:scale-125"
        />
      )}
    </div>
  );
};

export default memo(CustomConceptNode);

import React, { useState } from 'react';
import { X, FileText, Copy, Check, Target, Hash, FileCode, Layers, Sparkles } from 'lucide-react';
import type { CitationDto } from '../types';
import toast from 'react-hot-toast';

interface CitationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  citation: CitationDto | null;
  citationIndex?: number;
}

const CitationDetailModal: React.FC<CitationDetailModalProps> = ({
  isOpen,
  onClose,
  citation,
  citationIndex = 0,
}) => {
  const [copied, setCopied] = useState(false);
  const [showRawMeta, setShowRawMeta] = useState(false);

  if (!isOpen || !citation) return null;

  const score = citation.similarityScore ?? 0;
  const pct = (score * 100).toFixed(1);
  const matchType = (citation.metadata?.matchType as string) || 'SEMANTIC_VECTOR';

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(citation.snippet);
    setCopied(true);
    toast.success('Citation snippet copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-[#0b0f19] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/15 text-teal-400 border border-teal-500/30 font-mono">
                  CITATION #{citationIndex + 1}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {matchType === 'DOCUMENT_OVERVIEW' ? '📑 Overview' : matchType === 'KEYWORD' ? '🔍 Keyword' : '🧠 Semantic Vector'}
                </span>
              </div>
              <h2 className="text-sm font-bold text-slate-100 mt-1 truncate max-w-md">
                {citation.fileName || 'Source Document'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Metadata Cards Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">Relevance Match</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Target className="w-4 h-4 text-teal-400" />
                <span className="text-sm font-bold text-teal-300 font-mono">{pct}%</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">Page Number</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-slate-200">
                  {citation.pageNumber ? `Page ${citation.pageNumber}` : 'N/A'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">Chunk Index</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Hash className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold text-slate-200">
                  {citation.chunkIndex != null ? `#${citation.chunkIndex}` : 'Index 0'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">Character Length</span>
              <div className="flex items-center gap-1.5 mt-1">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-slate-200 font-mono">
                  {citation.snippet.length} chars
                </span>
              </div>
            </div>
          </div>

          {/* Snippet Content Display Card */}
          <div className="rounded-xl border border-slate-800 bg-[#070b14] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-xs font-semibold text-slate-300">Verified Knowledge Passage</span>
              </div>
              <button
                onClick={handleCopySnippet}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-300 font-medium transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>
            <div className="p-4 overflow-x-auto">
              <p className="text-xs text-slate-200 font-mono leading-relaxed whitespace-pre-wrap selection:bg-teal-500/30">
                {citation.snippet}
              </p>
            </div>
          </div>

          {/* Collapsible Raw Metadata */}
          {citation.metadata && (
            <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-900/30">
              <button
                type="button"
                onClick={() => setShowRawMeta(!showRawMeta)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors"
              >
                <span>Raw Embedding Metadata</span>
                <span className="text-[10px] text-slate-500 font-mono">{showRawMeta ? 'Hide' : 'View JSON'}</span>
              </button>
              {showRawMeta && (
                <div className="p-3 bg-black/50 border-t border-slate-800 text-[11px] font-mono text-slate-400 overflow-x-auto">
                  <pre>{JSON.stringify(citation.metadata, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-800 bg-slate-900/60">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CitationDetailModal;

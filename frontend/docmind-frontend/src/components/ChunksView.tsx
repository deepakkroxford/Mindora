import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers, Loader2, FileText, RefreshCw, ChevronDown, ChevronUp,
  Search, Hash, BookOpen, Database, Copy, Check, Tag, X,
} from 'lucide-react';
import { chatApi } from '../services/api';
import { useApp } from '../context/AppContext';
import type { CitationDto } from '../types';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const ChunkCard: React.FC<{ chunk: CitationDto; index: number }> = ({ chunk, index }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const score = chunk.similarityScore != null ? chunk.similarityScore : null;
  const pct = score != null ? (score * 100).toFixed(1) : null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(chunk.snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Chunk text copied');
  };

  return (
    <div
      className={clsx(
        'border rounded-2xl bg-white dark:bg-slate-900/60 overflow-hidden group transition-all duration-200 shadow-sm',
        expanded ? 'border-teal-500/50 shadow-md shadow-teal-500/10' : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
      )}
    >
      {/* Chunk Header */}
      <div
        className="flex items-center gap-3 p-3.5 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Index badge */}
        <div className="flex-shrink-0 w-8 h-8 bg-teal-50 dark:bg-teal-500/15 border border-teal-200 dark:border-teal-500/25 rounded-xl flex items-center justify-center shadow-2xs">
          <span className="text-xs font-bold text-teal-700 dark:text-teal-400 font-mono">#{chunk.chunkIndex ?? index}</span>
        </div>

        {/* File name & snippet preview */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{chunk.fileName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {chunk.pageNumber != null && (
              <span className="text-[11px] text-teal-700 dark:text-teal-400/90 flex items-center gap-0.5 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 px-1.5 py-0.2 rounded font-mono font-medium">
                <FileText className="w-2.5 h-2.5" /> p.{chunk.pageNumber}
              </span>
            )}
            <span className="text-xs text-slate-500 line-clamp-1 max-w-sm font-mono">
              {chunk.snippet.slice(0, 75)}…
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {pct != null && (
            <span className="text-xs bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/25 px-2 py-0.5 rounded-full font-mono font-bold">
              {pct}%
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all rounded-lg opacity-0 group-hover:opacity-100"
            title="Copy chunk text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <div className="p-1 text-slate-400">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#070b14]/70 animate-fade-in p-4 space-y-3">
          {/* Full text snippet */}
          <div className="relative bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-mono">{chunk.snippet}</p>
            <button
              onClick={handleCopy}
              className="absolute top-2.5 right-2.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Copy snippet"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Metadata Grid */}
          {chunk.metadata && Object.keys(chunk.metadata).length > 0 && (
            <div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1 font-bold uppercase tracking-wider">
                <Hash className="w-3 h-3 text-teal-600 dark:text-teal-400" /> Metadata Properties
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {Object.entries(chunk.metadata)
                  .filter(([k]) => !['snippet'].includes(k))
                  .map(([k, v]) => (
                    <div key={k} className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-xl p-2.5 shadow-2xs">
                      <p className="text-[10px] text-slate-500 capitalize font-semibold">{k.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-800 dark:text-slate-200 mt-0.5 truncate font-mono font-medium">{String(v)}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ChunksView: React.FC = () => {
  const { selectedDocumentId, documents } = useApp();
  const [chunks, setChunks] = useState<CitationDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [textFilter, setTextFilter] = useState('');

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);

  const loadChunks = useCallback(async (q = query) => {
    setIsLoading(true);
    try {
      const res = await chatApi.searchSimilarity({
        query: q.trim() || 'document content text data information',
        documentId: selectedDocumentId ?? undefined,
        topK: 50,
        similaritySearch: 0.0,
      });
      setChunks(res.data.matches);
      setHasLoaded(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load vector chunks');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDocumentId, query]);

  useEffect(() => {
    if (selectedDocumentId) loadChunks();
    else { setChunks([]); setHasLoaded(false); }
  }, [selectedDocumentId]);

  const filtered = textFilter
    ? chunks.filter((c) =>
        c.snippet.toLowerCase().includes(textFilter.toLowerCase()) ||
        c.fileName.toLowerCase().includes(textFilter.toLowerCase())
      )
    : chunks;

  const uniqueFiles = [...new Set(chunks.map((c) => c.fileName))];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100">
      {/* ── Chunks Control Studio ── */}
      <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 flex-shrink-0 bg-white dark:bg-[#0f172a]/60 shadow-2xs">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-teal-50 dark:bg-teal-500/15 border border-teal-200 dark:border-teal-500/25 rounded-xl flex items-center justify-center shadow-sm">
                <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Vector Chunks Explorer</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Inspect chunk embeddings stored in pgvector database</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasLoaded && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                  <span className="bg-teal-50 dark:bg-slate-900 border border-teal-200 dark:border-slate-800 px-2.5 py-1 rounded-lg text-teal-800 dark:text-teal-300 font-bold shadow-2xs">
                    {filtered.length} chunks
                  </span>
                </div>
              )}

              <button
                onClick={() => loadChunks()}
                disabled={isLoading}
                className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-1.5 rounded-xl transition-all shadow-2xs font-semibold disabled:opacity-40"
              >
                <RefreshCw className={clsx('w-3.5 h-3.5 text-teal-600 dark:text-teal-400', isLoading && 'animate-spin')} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Search / Filter Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/10 transition-all shadow-sm">
              <Database className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadChunks()}
                placeholder="Vector similarity prompt (empty = all)"
                className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
              />
              <button
                onClick={() => loadChunks()}
                disabled={isLoading}
                className="text-[10px] font-bold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 uppercase tracking-wider"
              >
                Query
              </button>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/10 transition-all shadow-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={textFilter}
                onChange={(e) => setTextFilter(e.target.value)}
                placeholder="Filter loaded chunks by keyword…"
                className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
              />
              {textFilter && (
                <button onClick={() => setTextFilter('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Chunks List ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-4xl mx-auto">
          {!hasLoaded && !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl flex items-center justify-center mb-4 text-teal-600 dark:text-teal-400 shadow-md">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200 mb-1">Inspect pgvector chunks</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed mb-6 font-medium">
                {selectedDoc
                  ? `Browse chunk vectors extracted from "${selectedDoc.filename}".`
                  : 'Load all chunk vector records across indexed workspace documents.'}
              </p>
              <button
                onClick={() => loadChunks()}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-cyan-500 text-white text-sm font-semibold rounded-2xl transition-all shadow-md shadow-teal-600/20 active:scale-[0.98]"
              >
                <BookOpen className="w-4 h-4" />
                <span>Load Vector Chunks</span>
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-teal-600 dark:text-teal-400 animate-spin" />
                <div className="absolute inset-0 blur-xl bg-teal-500/20 rounded-full" />
              </div>
              <div className="text-center">
                <p className="text-slate-900 dark:text-slate-200 font-bold">Loading vector records…</p>
                <p className="text-xs text-slate-500 mt-1">Retrieving embeddings and chunk metadata</p>
              </div>
            </div>
          )}

          {hasLoaded && !isLoading && filtered.length === 0 && (
            <div className="text-center py-16">
              <Tag className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-800 dark:text-slate-300 font-bold">{textFilter ? 'No chunks match keyword filter' : 'No vector chunks found'}</p>
              <p className="text-xs text-slate-500 mt-1">
                {textFilter ? 'Try clearing the text filter.' : 'Upload documents to generate vector embeddings.'}
              </p>
            </div>
          )}

          {hasLoaded && !isLoading && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map((chunk, i) => (
                <ChunkCard key={`${chunk.documentId}-${chunk.chunkIndex}-${i}`} chunk={chunk} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChunksView;

import React, { useState } from 'react';
import {
  Search, Loader2, FileText, ChevronDown, ChevronUp,
  AlertCircle, Filter, Layers, SlidersHorizontal, Tag,
  BarChart2, Sparkles, X, Globe,
} from 'lucide-react';
import { chatApi } from '../services/api';
import { useApp } from '../context/AppContext';
import type { CitationDto, SearchResultDto } from '../types';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const SEARCH_TYPES = [
  { label: 'All Queries', icon: '🔍', placeholder: 'Search concepts, semantics, keywords, or topics across documents…' },
  { label: 'Clauses & Provisions', icon: '📜', placeholder: 'Find specific clauses, covenants, or contract terms…' },
  { label: 'Facts & Statistics', icon: '📊', placeholder: 'Extract numerical metrics, financial figures, or data points…' },
  { label: 'Definitions', icon: '📚', placeholder: 'Look up domain definitions, acronyms, or key entities…' },
];

function getScoreColor(score: number) {
  if (score >= 0.8) return { bar: 'bg-emerald-500', badge: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 border-emerald-200 dark:border-emerald-400/25', label: 'High Match' };
  if (score >= 0.6) return { bar: 'bg-amber-500', badge: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 border-amber-200 dark:border-amber-400/25', label: 'Medium Match' };
  return { bar: 'bg-rose-500', badge: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-400/10 border-rose-200 dark:border-rose-400/25', label: 'Low Match' };
}

const ResultCard: React.FC<{ match: CitationDto; index: number }> = ({ match, index }) => {
  const [expanded, setExpanded] = useState(false);
  const score = match.similarityScore ?? 0;
  const pct = (score * 100).toFixed(1);
  const { bar, badge, label } = getScoreColor(score);

  return (
    <div className="border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 animate-fade-in group shadow-sm">
      {/* Top color accent strip */}
      <div className={clsx('h-0.5 w-full', bar)} />

      <div className="p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-start gap-3.5 mb-3">
          <div className="flex-shrink-0 w-7 h-7 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-center justify-center text-xs font-bold text-teal-700 dark:text-teal-400 group-hover:border-teal-500/40 transition-colors">
            {index + 1}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-sm">{match.fileName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {match.pageNumber != null && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                      <FileText className="w-3 h-3 text-teal-600 dark:text-teal-400" /> p.{match.pageNumber}
                    </span>
                  )}
                  {match.chunkIndex != null && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">chunk #{match.chunkIndex}</span>
                  )}
                </div>
              </div>

              {/* Score badge */}
              <div className="text-right flex-shrink-0">
                <span className={clsx('text-xs font-bold px-2.5 py-0.5 rounded-full border font-mono shadow-2xs', badge)}>
                  {label} · {pct}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Similarity progress bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mb-3">
          <div className={clsx('h-1.5 rounded-full transition-all duration-500', bar)} style={{ width: `${pct}%` }} />
        </div>

        {/* Snippet */}
        <p className={clsx('text-xs sm:text-sm text-slate-800 dark:text-slate-300 leading-relaxed font-mono bg-slate-50 dark:bg-[#070b14]/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80', !expanded && 'line-clamp-3')}>
          {match.snippet}
        </p>

        {match.snippet.length > 180 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 mt-2.5 transition-colors font-semibold"
          >
            {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Expand full text</>}
          </button>
        )}

        {/* Metadata pills */}
        {match.metadata && Object.keys(match.metadata).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
            {Object.entries(match.metadata)
              .filter(([k]) => !['documentId', 'fileName', 'snippet'].includes(k))
              .slice(0, 5)
              .map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-400 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700/50">
                  <Tag className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" />
                  <span className="text-slate-500 font-medium">{k}:</span> {String(v)}
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SearchView: React.FC = () => {
  const { selectedDocumentId, documents, setSelectedDocumentId } = useApp();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResultDto | null>(null);
  const [topK, setTopK] = useState(10);
  const [minSimilarity, setMinSimilarity] = useState(0.3);
  const [selectedType, setSelectedType] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await chatApi.searchSimilarity({
        query: query.trim(),
        documentId: selectedDocumentId ?? undefined,
        topK,
        similaritySearch: minSimilarity,
      });
      setResults(res.data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const EXAMPLE_QUERIES = [
    'payment terms and deadlines', 'termination clause', 'liability limit',
    'intellectual property rights', 'governing law and jurisdiction', 'warranty conditions',
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100">
      {/* ── Search Control Studio ── */}
      <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 flex-shrink-0 bg-white dark:bg-[#0f172a]/60 shadow-2xs">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Top Bar: Title & Filter toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-teal-50 dark:bg-teal-500/15 border border-teal-200 dark:border-teal-500/25 rounded-xl flex items-center justify-center shadow-sm">
                <Search className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Semantic Search Studio</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Vector similarity lookup across document embeddings</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={clsx(
                  'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all font-medium',
                  showFilters
                    ? 'bg-teal-50 dark:bg-teal-500/15 border-teal-300 dark:border-teal-500/30 text-teal-700 dark:text-teal-300 shadow-sm font-semibold'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Filters {showFilters && 'Active'}</span>
              </button>
            </div>
          </div>

          {/* Search Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {SEARCH_TYPES.map((type, i) => (
              <button
                key={i}
                onClick={() => setSelectedType(i)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 shadow-2xs',
                  selectedType === i
                    ? 'bg-teal-50 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-500/40 shadow-sm'
                    : 'bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/80'
                )}
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>

          {/* Search Input Bar */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl px-4 py-2.5 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/10 transition-all shadow-sm">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={SEARCH_TYPES[selectedType].placeholder}
                className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={handleSearch}
              disabled={!query.trim() || isSearching}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-cyan-500 disabled:opacity-40 text-white text-sm font-semibold rounded-2xl transition-all shadow-md shadow-teal-600/20 hover:shadow-teal-500/30 active:scale-[0.98]"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Search</span>
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="p-4 bg-white dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 animate-fade-in space-y-4 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Top Results Limit (Top K)</label>
                    <span className="text-xs font-bold text-teal-700 dark:text-teal-400 font-mono">{topK}</span>
                  </div>
                  <input
                    type="range" min={1} max={25} value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                    className="w-full h-1.5 accent-teal-600 bg-slate-200 dark:bg-slate-800 rounded-full cursor-pointer"
                  />
                  <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                    <span>1 chunk</span><span>25 chunks</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Minimum Similarity Threshold</label>
                    <span className="text-xs font-bold text-teal-700 dark:text-teal-400 font-mono">{(minSimilarity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range" min={0} max={1} step={0.05} value={minSimilarity}
                    onChange={(e) => setMinSimilarity(Number(e.target.value))}
                    className="w-full h-1.5 accent-teal-600 bg-slate-200 dark:bg-slate-800 rounded-full cursor-pointer"
                  />
                  <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                    <span>0% (Broad)</span><span>100% (Strict)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Example prompt chips */}
          {!results && !isSearching && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-xs text-slate-500 font-medium">Try searching:</span>
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => setQuery(q)}
                  className="text-xs bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 hover:border-teal-300 dark:hover:border-teal-500/40 hover:bg-teal-50/50 dark:hover:bg-teal-950/30 px-3 py-1 rounded-full transition-all shadow-2xs font-medium"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Search Results List ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-4xl mx-auto">
          {!results && !isSearching && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl flex items-center justify-center mb-4 text-teal-600 dark:text-teal-400 shadow-md">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200 mb-1">Discover insights across your documents</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed font-medium">
                Type any query above to perform similarity vector matching against indexed document chunks.
              </p>
            </div>
          )}

          {isSearching && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-teal-600 dark:text-teal-400 animate-spin" />
                <div className="absolute inset-0 blur-xl bg-teal-500/20 rounded-full" />
              </div>
              <div className="text-center">
                <p className="text-slate-900 dark:text-slate-200 font-bold">Scanning vector embeddings…</p>
                <p className="text-xs text-slate-500 mt-1">Ranking similarity across all document chunks</p>
              </div>
            </div>
          )}

          {results && !isSearching && (
            <div className="space-y-4">
              {/* Results summary bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    Found <strong>{results.totalMatches}</strong> match{results.totalMatches !== 1 ? 'es' : ''} for
                  </span>
                  <span className="text-sm font-bold text-teal-700 dark:text-teal-400">"{results.query}"</span>
                </div>

                {results.totalMatches > 0 && (
                  <button
                    onClick={() => setResults(null)}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium"
                  >
                    Clear results
                  </button>
                )}
              </div>

              {results.totalMatches === 0 ? (
                <div className="text-center py-16">
                  <Layers className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-800 dark:text-slate-300 font-bold">No matching vector chunks found</p>
                  <p className="text-xs text-slate-500 mt-1">Try lowering the similarity threshold or broadening your search terms.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.matches.map((match, i) => (
                    <ResultCard key={i} match={match} index={i} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchView;

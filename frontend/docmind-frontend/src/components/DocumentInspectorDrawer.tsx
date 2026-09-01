import React, { useState, useEffect, useMemo } from 'react';
import {
  X, FileText, Layers, Image as ImageIcon, Search, Copy, Check,
  Brain, GraduationCap, MessageSquare, Sparkles,
  ExternalLink, Database, RefreshCw, ShieldCheck, CheckCircle2, AlertCircle, ChevronRight,
  Filter, ArrowRight
} from 'lucide-react';
import { documentApi, diagramApi } from '../services/api';
import { useApp } from '../context/AppContext';
import type { DocumentChunkDto, DocumentDiagramDto } from '../types';
import { DiagramLightboxModal } from './DiagramLightboxModal';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const DocumentInspectorDrawer: React.FC = () => {
  const {
    inspectingDocument,
    setInspectingDocument,
    setSelectedDocumentIds,
    setActiveTab,
    setIsSidebarOpen
  } = useApp();

  const [activeTab, setActiveInternalTab] = useState<'chunks' | 'diagrams' | 'actions'>('chunks');
  const [chunks, setChunks] = useState<DocumentChunkDto[]>([]);
  const [diagrams, setDiagrams] = useState<DocumentDiagramDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPageFilter, setSelectedPageFilter] = useState<number | 'ALL'>('ALL');
  const [copiedChunkId, setCopiedChunkId] = useState<string | number | null>(null);
  const [selectedDiagramForLightbox, setSelectedDiagramForLightbox] = useState<DocumentDiagramDto | null>(null);

  // Fetch chunks and diagrams whenever inspectingDocument changes
  useEffect(() => {
    if (!inspectingDocument) {
      setChunks([]);
      setDiagrams([]);
      return;
    }

    const loadDetails = async () => {
      setIsLoading(true);
      try {
        const [chunksRes, diagramsRes] = await Promise.allSettled([
          documentApi.getChunks(inspectingDocument.id),
          diagramApi.getByDocument(inspectingDocument.id)
        ]);

        if (chunksRes.status === 'fulfilled' && chunksRes.value.success && chunksRes.value.data) {
          setChunks(chunksRes.value.data);
        } else {
          setChunks([]);
        }

        if (diagramsRes.status === 'fulfilled' && diagramsRes.value.success && diagramsRes.value.data) {
          setDiagrams(diagramsRes.value.data);
        } else {
          setDiagrams([]);
        }
      } catch (err: any) {
        console.error('Failed to load document details:', err);
        toast.error('Failed to load document vector details');
      } finally {
        setIsLoading(false);
      }
    };

    loadDetails();
    setSearchQuery('');
    setSelectedPageFilter('ALL');
    setActiveInternalTab('chunks');
  }, [inspectingDocument]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInspectingDocument(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setInspectingDocument]);

  // Distinct list of pages
  const availablePages = useMemo(() => {
    const pages = new Set<number>();
    chunks.forEach((c) => {
      if (c.pageNumber != null) pages.add(c.pageNumber);
    });
    return Array.from(pages).sort((a, b) => a - b);
  }, [chunks]);

  // Filtered Chunks
  const filteredChunks = useMemo(() => {
    return chunks.filter((c) => {
      const matchesPage = selectedPageFilter === 'ALL' || c.pageNumber === selectedPageFilter;
      const matchesQuery = !searchQuery.trim() || c.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPage && matchesQuery;
    });
  }, [chunks, selectedPageFilter, searchQuery]);

  // Calculations for Health Badges
  const avgTokensPerChunk = useMemo(() => {
    if (chunks.length === 0) return 0;
    const total = chunks.reduce((acc, c) => acc + (c.estimatedTokens || 0), 0);
    return Math.round(total / chunks.length);
  }, [chunks]);

  const totalEstimatedTokens = useMemo(() => {
    return chunks.reduce((acc, c) => acc + (c.estimatedTokens || 0), 0);
  }, [chunks]);

  if (!inspectingDocument) return null;

  const handleCopyChunk = async (chunk: DocumentChunkDto, idx: number) => {
    try {
      await navigator.clipboard.writeText(chunk.content);
      const identifier = chunk.id || idx;
      setCopiedChunkId(identifier);
      setTimeout(() => setCopiedChunkId(null), 2000);
      toast.success(`Copied Chunk #${chunk.chunkIndex}`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleLaunchChat = () => {
    setSelectedDocumentIds([inspectingDocument.id]);
    setActiveTab('chat');
    setInspectingDocument(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
    toast.success(`Scoped chat to: ${inspectingDocument.filename}`);
  };

  const handleLaunchMindMap = () => {
    setSelectedDocumentIds([inspectingDocument.id]);
    setActiveTab('mindmap');
    setInspectingDocument(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
    toast.success(`Scoped Mind Map to: ${inspectingDocument.filename}`);
  };

  const handleLaunchQuiz = () => {
    setSelectedDocumentIds([inspectingDocument.id]);
    setActiveTab('study');
    setInspectingDocument(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
    toast.success(`Scoped Study Hub to: ${inspectingDocument.filename}`);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setInspectingDocument(null)}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 transition-opacity duration-300 animate-fade-in"
      />

      {/* Slide-out Drawer from Right */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white dark:bg-[#090e1a] border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col overflow-hidden animate-slide-in-right">
        
        {/* ── 1. Top Header ── */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-[#0c1322]/90 backdrop-blur-xl flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20 flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate" title={inspectingDocument.filename}>
                  {inspectingDocument.filename}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30 font-mono">
                  {inspectingDocument.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap font-mono font-medium">
                <span>{formatBytes(inspectingDocument.fileSize)}</span>
                <span>•</span>
                <span>{inspectingDocument.totalPages || 1} Pages</span>
                <span>•</span>
                <span>{chunks.length || inspectingDocument.totalChunks || 0} Chunks</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setInspectingDocument(null)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title="Close Inspector (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── 2. Vector Indexing Health Banner (4 KPI Badges) ── */}
        <div className="p-4 bg-slate-100/70 dark:bg-gradient-to-r dark:from-teal-950/20 dark:via-cyan-950/20 dark:to-purple-950/20 border-b border-slate-200 dark:border-slate-800/80 flex-shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Vector Indexing Health & Diagnostics</span>
            </span>
            <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/30 px-2 py-0.5 rounded-full flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span>PgVector Synced</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* KPI 1: Status */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Embedding Status</p>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 mt-0.5 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready
              </p>
            </div>

            {/* KPI 2: Model */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Vector Space</p>
              <p className="text-xs font-bold text-teal-700 dark:text-teal-300 truncate mt-0.5 font-mono" title="1536-dim OpenAI Cosine">
                1536-dim
              </p>
            </div>

            {/* KPI 3: Token Density */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Avg Chunk Size</p>
              <p className="text-xs font-bold text-cyan-700 dark:text-cyan-300 mt-0.5 font-mono">
                ~{avgTokensPerChunk} tokens
              </p>
            </div>

            {/* KPI 4: Extracted Diagrams */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Extracted Charts</p>
              <p className="text-xs font-bold text-purple-700 dark:text-purple-300 mt-0.5 font-mono">
                {diagrams.length} Diagrams
              </p>
            </div>
          </div>
        </div>

        {/* ── 3. Tab Switcher ── */}
        <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-slate-50/70 dark:bg-[#070b14]/50 flex-shrink-0">
          <button
            onClick={() => setActiveInternalTab('chunks')}
            className={clsx(
              'pb-3 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2',
              activeTab === 'chunks'
                ? 'border-teal-600 dark:border-teal-500 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Extracted Chunks ({chunks.length})</span>
          </button>

          <button
            onClick={() => setActiveInternalTab('diagrams')}
            className={clsx(
              'pb-3 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2',
              activeTab === 'diagrams'
                ? 'border-purple-600 dark:border-purple-500 text-purple-700 dark:text-purple-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Diagram Gallery ({diagrams.length})</span>
          </button>

          <button
            onClick={() => setActiveInternalTab('actions')}
            className={clsx(
              'pb-3 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2',
              activeTab === 'actions'
                ? 'border-cyan-600 dark:border-cyan-500 text-cyan-700 dark:text-cyan-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Actions</span>
          </button>
        </div>

        {/* ── 4. Tab Contents ── */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50/40 dark:bg-[#070b14]">
          
          {/* TAB 1: CHUNKS STREAM */}
          {activeTab === 'chunks' && (
            <div className="space-y-4">
              
              {/* Search & Page Filter Bar */}
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search inside extracted chunks..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Page Selector Filter Chips */}
                {availablePages.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 pr-1">
                      <Filter className="w-3 h-3" /> Page:
                    </span>
                    <button
                      onClick={() => setSelectedPageFilter('ALL')}
                      className={clsx(
                        'px-2.5 py-0.5 rounded-lg font-mono font-semibold transition-colors',
                        selectedPageFilter === 'ALL'
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      )}
                    >
                      All ({chunks.length})
                    </button>
                    {availablePages.map((pg) => {
                      const count = chunks.filter((c) => c.pageNumber === pg).length;
                      return (
                        <button
                          key={pg}
                          onClick={() => setSelectedPageFilter(pg)}
                          className={clsx(
                            'px-2.5 py-0.5 rounded-lg font-mono font-semibold transition-colors whitespace-nowrap',
                            selectedPageFilter === pg
                              ? 'bg-teal-600 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                          )}
                        >
                          p.{pg} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Chunks List */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <RefreshCw className="w-6 h-6 text-teal-600 dark:text-teal-400 animate-spin" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Loading vector chunks from PostgreSQL...</p>
                </div>
              ) : filteredChunks.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs bg-white dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-6">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-slate-700 dark:text-slate-400">No matching chunks found</p>
                  <p className="text-[11px] text-slate-500 mt-1">Try modifying your search filter or page selection.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredChunks.map((chunk, idx) => {
                    const identifier = chunk.id || idx;
                    const isCopied = copiedChunkId === identifier;
                    return (
                      <div
                        key={identifier}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/50 p-4 space-y-2.5 shadow-sm hover:border-teal-500/40 transition-all group"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/25 font-mono font-bold text-[11px]">
                              Chunk #{chunk.chunkIndex}
                            </span>
                            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                              Page {chunk.pageNumber}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              • ~{chunk.estimatedTokens} tokens
                            </span>
                          </div>

                          <button
                            onClick={() => handleCopyChunk(chunk, idx)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-teal-100 dark:hover:bg-teal-600 transition-colors"
                            title="Copy snippet"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>

                        {/* Chunk Content */}
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
                          {chunk.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DIAGRAM GALLERY */}
          {activeTab === 'diagrams' && (
            <div className="space-y-4">
              {diagrams.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs bg-white dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-6">
                  <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-slate-700 dark:text-slate-400">No embedded architecture diagrams detected</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                    PDFBox diagram extractor searches for visual architecture charts, sequence diagrams, and flowcharts during PDF indexing.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {diagrams.map((diag) => (
                    <div
                      key={diag.id}
                      onClick={() => setSelectedDiagramForLightbox(diag)}
                      className="group rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/50 overflow-hidden cursor-pointer shadow-sm hover:border-purple-500/50 transition-all"
                    >
                      <div className="relative aspect-video bg-slate-950/90 flex items-center justify-center overflow-hidden">
                        <img
                          src={`/api/v1/diagrams/${diag.id}/image`}
                          alt={`Extracted diagram page ${diag.pageNumber}`}
                          className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <span className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold shadow-lg flex items-center gap-1.5">
                            <ExternalLink className="w-3.5 h-3.5" /> Inspect Diagram
                          </span>
                        </div>
                      </div>

                      <div className="p-3 flex items-center justify-between text-xs bg-white dark:bg-slate-900/80">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-200">
                            Page {diag.pageNumber}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1 font-mono">
                            ({diag.width}x{diag.height}px)
                          </span>
                        </div>
                        <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-500/25">
                          Visual Citation
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 1-CLICK AI ACTIONS */}
          {activeTab === 'actions' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/25 space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Document-Scoped Intelligence</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Launch any of Mindora's AI generative engines directly with this document pre-scoped in memory.
                </p>
              </div>

              <div className="space-y-3">
                {/* 1. Launch Chat */}
                <div
                  onClick={handleLaunchChat}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-cyan-500/50 hover:bg-cyan-50/20 dark:hover:bg-slate-900/80 cursor-pointer transition-all flex items-center justify-between group shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Ask Questions in Chat</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Chat with grounded citations & multi-modal diagram retrieval.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>

                {/* 2. Launch Mind Map */}
                <div
                  onClick={handleLaunchMindMap}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-amber-500/50 hover:bg-amber-50/20 dark:hover:bg-slate-900/80 cursor-pointer transition-all flex items-center justify-between group shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                      <Brain className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Generate Concept Mind Map</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Extract hierarchical React Flow concept networks & taxonomy.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>

                {/* 3. Launch Quiz */}
                <div
                  onClick={handleLaunchQuiz}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-purple-500/50 hover:bg-purple-50/20 dark:hover:bg-slate-900/80 cursor-pointer transition-all flex items-center justify-between group shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Generate Study Hub Quiz</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Create active-recall test questions & 3D flashcard decks.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── 5. Footer ── */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0c1322]/90 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 flex-shrink-0">
          <div className="flex items-center gap-1.5 font-medium">
            <Database className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Total Index Size: <strong>{totalEstimatedTokens.toLocaleString()}</strong> tokens</span>
          </div>
          <button
            onClick={() => setInspectingDocument(null)}
            className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md shadow-teal-600/20 transition-all active:scale-95"
          >
            Done
          </button>
        </div>

      </div>

      {/* Lightbox for full diagram inspection */}
      <DiagramLightboxModal
        diagram={selectedDiagramForLightbox}
        onClose={() => setSelectedDiagramForLightbox(null)}
      />
    </>
  );
};

export default DocumentInspectorDrawer;

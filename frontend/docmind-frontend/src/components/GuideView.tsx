import React from 'react';
import {
  Brain, Zap, ShieldAlert, Layers, Mic, Volume2, Search,
  FileText, Upload, Sparkles, CheckCircle2, ArrowRight, Database,
  Cpu, BarChart3, MessageSquare, Terminal, Eye, ExternalLink, Globe,
  ShieldCheck, RefreshCw, GitCompare, Clock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface GuideViewProps {
  onUploadClick?: () => void;
}

const GuideView: React.FC<GuideViewProps> = ({ onUploadClick }) => {
  const { setActiveTab, documents, selectAllDocuments } = useApp();

  const capabilities = [
    {
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      tag: "CORE RETRIEVAL",
      tagColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      title: "Parallel Hybrid Search (pgvector + Keyword RRF)",
      desc: "Combines 1536-dimensional semantic vector embeddings (pgvector) with PostgreSQL ILIKE/BM25 exact keyword matching executed concurrently on separate worker threads and merged via Reciprocal Rank Fusion (K=60) for 100% recall."
    },
    {
      icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
      tag: "HALLUCINATION PREVENTION",
      tagColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      title: "Anti-Hallucination Guardrails & Query Routing",
      desc: "If top similarity match is low (<45% for unscoped queries), Mindora activates Guardrail mode, disclaims out-of-domain knowledge, strips false citations, and answers safely from general AI knowledge."
    },
    {
      icon: <GitCompare className="w-5 h-5 text-teal-400" />,
      tag: "MULTI-DOCUMENT RAG",
      tagColor: "bg-teal-500/10 text-teal-400 border-teal-500/20",
      title: "Multi-Document Scoping & Cross-Document Comparison",
      desc: "Select 2 or more documents simultaneously using sidebar checkboxes or the chat scope pill to perform cross-document comparisons, contract differentials, or joint spec analysis."
    },
    {
      icon: <Mic className="w-5 h-5 text-cyan-400" />,
      tag: "VOICE INTELLIGENCE",
      tagColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      title: "Voice-to-Text & Read Aloud Audio AI",
      desc: "Real-time speech recognition converts spoken queries directly into the chat prompt with live waveform feedback. Assistant messages feature 1-click Text-to-Speech audio playback."
    },
    {
      icon: <Eye className="w-5 h-5 text-indigo-400" />,
      tag: "CITATIONS & METADATA",
      tagColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
      title: "Citation Deep-Dive Inspector",
      desc: "Every answer provides verified citations with page numbers, chunk indices, and similarity match percentages. Click the inspect icon to explore raw embedding vectors and full text passages."
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-emerald-400" />,
      tag: "PERFORMANCE & TELEMETRY",
      tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      title: "Live Token Analytics & Latency Telemetry",
      desc: "Real-time token usage calculation (Prompt vs Completion), similarity score radar, TTFT response latency metrics, and 1-click Markdown / JSON transcript export."
    },
    {
      icon: <Clock className="w-5 h-5 text-purple-400" />,
      tag: "CONVERSATIONAL MEMORY",
      tagColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      title: "Persistent Multi-Turn Chat History & Conversational Memory",
      desc: "Full conversation persistence in PostgreSQL (conversations & chat_messages tables). Automatically feeds recent dialogue turns into LLM context for seamless follow-up inquiries with async AI title generation."
    },
    {
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      tag: "SEMANTIC CACHING & SCALE",
      tagColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      title: "Redis Semantic Cache & Distributed Rate Limiter",
      desc: "Instantaneous <15ms response latency and $0 token cost for repeated or scoped queries using Redis key normalization. Enforces distributed token bucket rate limits (30 req/min) with automatic cache invalidation on file changes."
    }
  ];

  const steps = [
    {
      num: "01",
      title: "Upload Your Documents",
      desc: "Upload PDF, DOCX, TXT, MD, or CSV files. Apache Tika extracts text, Spring AI splits content into 700-character chunks (100-character overlap), generates embeddings, and indexes them in PostgreSQL pgvector.",
      action: onUploadClick ? { label: "Upload Document", onClick: onUploadClick, icon: Upload } : undefined
    },
    {
      num: "02",
      title: "Scope or Compare Documents",
      desc: "Choose a single document for scoped inquiry, check 2+ documents to run multi-document comparisons, or leave unselected to query across your entire organization's library.",
      action: { label: "View Documents", onClick: () => setActiveTab('chunks'), icon: Layers }
    },
    {
      num: "03",
      title: "Ask via Voice or Text",
      desc: "Type your query or click the glowing 🎙️ Microphone button to speak. Mindora streams responses token-by-token with sub-second Time-To-First-Token (TTFT).",
      action: { label: "Open Chat Assistant", onClick: () => setActiveTab('chat'), icon: MessageSquare }
    },
    {
      num: "04",
      title: "Verify Citations & Metadata",
      desc: "Inspect citations beneath each answer to view source page numbers, match percentages, and exact passage snippets to ensure 100% factual accuracy."
    },
    {
      num: "05",
      title: "Export & Analyze Telemetry",
      desc: "Click 'Analytics & Graph' to view token consumption and similarity charts, or export conversations to Markdown (.md) or JSON (.json) for sharing."
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 p-4 sm:p-8 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-12 pb-16 animate-fade-in">
        
        {/* ── 1. Hero Platform Banner ── */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700/60 bg-gradient-to-br from-white via-teal-50/50 to-slate-100 dark:from-[#0f172a] dark:via-[#111c35] dark:to-[#0b1329] p-6 sm:p-10 shadow-xl dark:shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

          <div className="relative z-10 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-300 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400 animate-pulse" />
              <span>MINDORA ENTERPRISE RAG PLATFORM</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Next-Generation Document Intelligence & <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-teal-600 via-cyan-600 to-emerald-600 dark:from-teal-400 dark:via-cyan-400 dark:to-emerald-400 bg-clip-text text-transparent">
                Multi-Modal RAG Architecture
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 max-w-3xl leading-relaxed">
              Mindora is a production-grade Document Analysis & Question-Answering system built on 
              <strong> Spring Boot 3.4.3</strong>, <strong>PostgreSQL pgvector</strong>, <strong>Spring AI</strong>, and <strong>React</strong>. 
              It provides parallel hybrid semantic + keyword retrieval, out-of-domain guardrails, real-time voice chat, and deep citation verification.
            </p>

            {/* Quick Action CTAs */}
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button
                onClick={() => setActiveTab('chat')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-cyan-500 !text-white text-xs sm:text-sm font-semibold shadow-lg shadow-teal-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <MessageSquare className="w-4 h-4 !text-white" />
                <span className="!text-white">Launch Chat Assistant</span>
                <ArrowRight className="w-4 h-4 ml-1 !text-white" />
              </button>

              {onUploadClick && (
                <button
                  onClick={onUploadClick}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium transition-all shadow-sm"
                >
                  <Upload className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Upload Documents</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('search')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium transition-all shadow-sm"
              >
                <Search className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Semantic Search Explorer</span>
              </button>
            </div>

            {/* System Status Pills */}
            <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex-wrap text-[11px] text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5 bg-white dark:bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                <span>Spring Boot 3.4.3</span>
              </span>
              <span className="flex items-center gap-1.5 bg-white dark:bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm">
                <Database className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                <span>PostgreSQL + pgvector</span>
              </span>
              <span className="flex items-center gap-1.5 bg-white dark:bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm">
                <Brain className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                <span>Spring AI + OpenAI</span>
              </span>
              <span className="flex items-center gap-1.5 bg-white dark:bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm">
                <Mic className="w-3 h-3 text-rose-500 dark:text-rose-400" />
                <span>Web Speech AI</span>
              </span>
              <span className="flex items-center gap-1.5 bg-white dark:bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm">
                <ShieldCheck className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                <span>Active Guardrails</span>
              </span>
              <span className="flex items-center gap-1.5 bg-white dark:bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm">
                <Clock className="w-3 h-3 text-purple-500 dark:text-purple-400" />
                <span>Persistent Chat History</span>
              </span>
              <span className="flex items-center gap-1.5 bg-white dark:bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm">
                <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Redis Semantic Cache (6379)</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── 2. Capabilities Grid ── */}
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Core Platform Capabilities</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Engineered for accuracy, low latency, and zero hallucination across complex document bases.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {capabilities.map((cap, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/90 transition-all duration-200 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center">
                      {cap.icon}
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border font-mono ${cap.tagColor}`}>
                      {cap.tag}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    {cap.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. Step-by-Step How To Use Guide ── */}
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>How to Use Mindora (Step-by-Step)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Follow these simple steps to analyze documents, extract insights, and compare files.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 space-y-3 relative overflow-hidden shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-teal-600/30 dark:text-teal-500/30 font-mono">
                    {step.num}
                  </span>
                  {step.action && (
                    <button
                      onClick={step.action.onClick}
                      className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 bg-teal-50 dark:bg-teal-500/10 hover:bg-teal-100 dark:hover:bg-teal-500/20 border border-teal-200 dark:border-teal-500/20 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <step.action.icon className="w-3.5 h-3.5" />
                      <span>{step.action.label}</span>
                    </button>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">
                  {step.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. Technical Architecture Flowchart ── */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <span>High-Level Technical Architecture</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              End-to-end data ingestion, vector indexing, and parallel hybrid inference pipeline.
            </p>
          </div>

          {/* Architecture Pipeline Flow */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
              <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 font-mono uppercase">1. INGESTION</span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">Apache Tika + Chunking</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">Parses PDF, DOCX, TXT into 700-char semantic chunks with 100-char overlap.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
              <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 font-mono uppercase">2. VECTORIZATION</span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">OpenAI + pgvector</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">Generates 1536-dim embeddings and indexes into PostgreSQL pgvector vector_store.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono uppercase">3. HYBRID RETRIEVAL</span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">Async Vector + Keyword</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">Runs pgvector cosine similarity + SQL ILIKE concurrently, merged with RRF K=60.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono uppercase">4. INFERENCE & STREAM</span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">Spring AI + SSE</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">Streams tokens directly to React frontend with verified citation references.</p>
            </div>
          </div>
        </div>

        {/* ── 5. Bottom Ready CTA ── */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-teal-500/10 border border-teal-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Ready to explore your documents?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Start chatting or search across all indexed chunks in your workspace.</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab('chat')}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-cyan-500 !text-white text-xs font-bold shadow-md transition-all active:scale-95"
            >
              <span className="!text-white">Start Chatting</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GuideView;

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Bot, User, Loader2, ChevronDown, ChevronUp, FileText,
  Zap, Sparkles, RotateCcw, Square, Copy, Check, Wifi, WifiOff,
  AlertTriangle, ThumbsUp, MoreHorizontal,
} from 'lucide-react';
import { chatApi } from '../services/api';
import { useApp } from '../context/AppContext';
import type { Message, CitationDto } from '../types';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

/* ─── Prompt templates ──────────────────────────────────────────── */
const PROMPT_TEMPLATES = [
  {
    category: 'Summarization',
    icon: '📋',
    gradient: 'from-indigo-500/15 to-purple-500/15',
    border: 'border-indigo-500/25',
    accent: 'text-indigo-400',
    templates: [
      { label: 'Executive Summary', prompt: 'Provide a concise executive summary of the key points in this document.' },
      { label: 'Key Findings', prompt: 'What are the key findings and conclusions from this document?' },
      { label: 'Action Items', prompt: 'List all action items, tasks, and next steps mentioned in this document.' },
    ],
  },
  {
    category: 'Legal & Compliance',
    icon: '⚖️',
    gradient: 'from-cyan-500/15 to-blue-500/15',
    border: 'border-cyan-500/25',
    accent: 'text-cyan-400',
    templates: [
      { label: 'Key Clauses', prompt: 'What are the most important clauses and provisions in this document?' },
      { label: 'Obligations', prompt: 'What obligations and responsibilities are defined in this document?' },
      { label: 'Risk Analysis', prompt: 'Identify potential risks, liabilities, and red flags in this document.' },
    ],
  },
  {
    category: 'Analysis',
    icon: '🔍',
    gradient: 'from-emerald-500/15 to-teal-500/15',
    border: 'border-emerald-500/25',
    accent: 'text-emerald-400',
    templates: [
      { label: 'Data Points', prompt: 'Extract all key data points, statistics, and metrics from this document.' },
      { label: 'Definitions', prompt: 'List and explain all key terms and definitions used in this document.' },
      { label: 'Timeline', prompt: 'Create a chronological timeline of all events and dates mentioned.' },
    ],
  },
];

/* ─── Markdown renderer ─────────────────────────────────────────── */
function renderMarkdown(content: string): React.ReactNode[] {
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  const renderInline = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*|_.*?_)/g);
    return parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={j} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={j} className="italic text-slate-300">{part.slice(1, -1)}</em>;
      if (part.startsWith('_') && part.endsWith('_') && part.length > 2) return <em key={j} className="italic text-slate-300">{part.slice(1, -1)}</em>;
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={j} className="px-1.5 py-0.5 bg-[#0f172a] text-purple-300 rounded text-xs font-mono border border-[#334155]">{part.slice(1, -1)}</code>;
      return part;
    });
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('### ')) { nodes.push(<h3 key={i} className="text-sm font-semibold text-white mt-3 mb-1">{renderInline(line.slice(4))}</h3>); i++; continue; }
    if (line.startsWith('## '))  { nodes.push(<h2 key={i} className="text-base font-semibold text-white mt-3 mb-1">{renderInline(line.slice(3))}</h2>); i++; continue; }
    if (line.startsWith('# '))   { nodes.push(<h1 key={i} className="text-lg font-bold text-white mt-3 mb-1">{renderInline(line.slice(2))}</h1>); i++; continue; }
    if (line.startsWith('> '))   { nodes.push(<blockquote key={i} className="border-l-2 border-indigo-500 pl-3 text-slate-400 italic my-1">{renderInline(line.slice(2))}</blockquote>); i++; continue; }
    if (line.startsWith('---'))  { nodes.push(<hr key={i} className="border-[#334155] my-2" />); i++; continue; }

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3);
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++; }
      nodes.push(
        <pre key={i} className="bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-3 overflow-x-auto my-2">
          {lang && <div className="text-[10px] text-slate-500 mb-1.5 uppercase font-mono">{lang}</div>}
          <code className="text-xs text-slate-200 font-mono leading-relaxed whitespace-pre">{codeLines.join('\n')}</code>
        </pre>
      );
      i++; continue;
    }

    // Bullet list
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* ') || lines[i].startsWith('• '))) {
        items.push(<li key={i}>{renderInline(lines[i].slice(2))}</li>);
        i++;
      }
      nodes.push(<ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 ml-1 my-1 text-slate-200">{items}</ul>);
      continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={i}>{renderInline(lines[i].replace(/^\d+\. /, ''))}</li>);
        i++;
      }
      nodes.push(<ol key={`ol-${i}`} className="list-decimal list-inside space-y-0.5 ml-1 my-1 text-slate-200">{items}</ol>);
      continue;
    }

    if (line === '') { nodes.push(<div key={i} className="h-1.5" />); i++; continue; }
    nodes.push(<p key={i} className="text-slate-200 leading-relaxed">{renderInline(line)}</p>);
    i++;
  }
  return nodes;
}

/* ─── Citation card ─────────────────────────────────────────────── */
const CitationCard: React.FC<{ citation: CitationDto; index: number }> = ({ citation, index }) => {
  const [expanded, setExpanded] = useState(false);
  const score = citation.similarityScore ?? 0;
  const pct = (score * 100).toFixed(0);
  const barColor = score >= 0.8 ? 'bg-emerald-500' : score >= 0.6 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 0.8 ? 'text-emerald-400' : score >= 0.6 ? 'text-amber-400' : 'text-red-400';

  const ext = citation.fileName?.split('.').pop()?.toLowerCase();
  const extColors: Record<string, string> = { pdf: 'text-red-400', docx: 'text-blue-400', csv: 'text-green-400', md: 'text-purple-400' };

  return (
    <div className="border border-[#334155] rounded-xl overflow-hidden bg-[#0f172a] hover:border-[#475569] transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 p-2.5 text-left"
      >
        <span className="flex-shrink-0 w-5 h-5 bg-indigo-500/15 text-indigo-400 rounded-md text-xs flex items-center justify-center font-bold border border-indigo-500/20">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <FileText className={clsx('w-3 h-3 flex-shrink-0', extColors[ext ?? ''] ?? 'text-slate-400')} />
            <p className="text-xs text-slate-200 font-medium truncate">{citation.fileName}</p>
            {citation.pageNumber && <span className="text-xs text-slate-500 flex-shrink-0">p.{citation.pageNumber}</span>}
          </div>
          {/* Similarity bar */}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1 bg-[#1e293b] rounded-full overflow-hidden">
              <div className={clsx('h-1 rounded-full', barColor)} style={{ width: `${pct}%` }} />
            </div>
            <span className={clsx('text-[10px] font-bold flex-shrink-0', textColor)}>{pct}%</span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-[#1e293b] animate-fade-in">
          <p className="text-xs text-slate-400 leading-relaxed mt-2">{citation.snippet}</p>
        </div>
      )}
    </div>
  );
};

/* ─── Message bubble ────────────────────────────────────────────── */
const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';
  const [showCitations, setShowCitations] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const timeStr = message.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={clsx('flex gap-3 group', isUser ? 'flex-row-reverse' : 'flex-row')}
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
    >
      {/* Avatar */}
      <div className={clsx(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm mt-0.5',
        isUser
          ? 'bg-indigo-600 shadow-indigo-500/30'
          : 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/30'
      )}>
        {isUser ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-white" />}
      </div>

      {/* Content */}
      <div className={clsx('max-w-[78%] min-w-0', isUser ? 'items-end' : 'items-start')}>
        <div className={clsx(
          'rounded-2xl px-4 py-3 text-sm',
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm shadow-sm shadow-indigo-500/20'
            : 'bg-[#1e293b] border border-[#334155] rounded-tl-sm'
        )}>
          <div className="space-y-0.5">
            {isUser
              ? <p className="text-white leading-relaxed">{message.content}</p>
              : renderMarkdown(message.content)
            }
          </div>
          {/* Streaming cursor */}
          {message.isStreaming && <span className="cursor-blink" />}
        </div>

        {/* Footer: citations + actions */}
        <div className={clsx('flex items-center gap-2 mt-1.5', isUser ? 'justify-end' : 'justify-start')}>
          {/* Timestamp */}
          <span className={clsx('text-xs text-slate-600 transition-opacity', showTime ? 'opacity-100' : 'opacity-0')}>
            {timeStr}
          </span>

          {!isUser && message.responseTimeMs && (
            <span className="flex items-center gap-1 text-xs text-slate-600">
              <Zap className="w-2.5 h-2.5" />{message.responseTimeMs}ms
            </span>
          )}

          {/* Copy button (assistant only) */}
          {!isUser && !message.isStreaming && message.content && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-all"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Citations */}
        {!isUser && (message.citations?.length ?? 0) > 0 && !message.isStreaming && (
          <div className="mt-2">
            <button
              onClick={() => setShowCitations(!showCitations)}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <FileText className="w-3 h-3" />
              {message.citations!.length} source{message.citations!.length > 1 ? 's' : ''}
              {showCitations ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showCitations && (
              <div className="mt-2 space-y-1.5 animate-fade-in">
                {message.citations!.map((c, i) => (
                  <CitationCard key={i} citation={c} index={i} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Typing indicator ───────────────────────────────────────────── */
const TypingIndicator = () => (
  <div className="flex gap-3 animate-fade-in">
    <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
      <Bot className="w-3.5 h-3.5 text-white" />
    </div>
    <div className="bg-[#1e293b] border border-[#334155] rounded-2xl rounded-tl-sm px-4 py-3">
      <div className="flex items-center gap-1 h-4">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  </div>
);

/* ─── Main ChatView ──────────────────────────────────────────────── */
const ChatView: React.FC = () => {
  const {
    selectedDocumentId,
    documents,
    selectedConversationId,
    setSelectedConversationId,
    fetchConversations,
  } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMode, setStreamingMode] = useState(true);
  const [conversationId, setConversationId] = useState<string | undefined>(selectedConversationId ?? undefined);
  const [showTemplates, setShowTemplates] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);

  // Load past conversation messages when a history item is selected
  useEffect(() => {
    if (selectedConversationId) {
      setConversationId(selectedConversationId);
      setShowTemplates(false);
      chatApi
        .getMessages(selectedConversationId)
        .then((res) => {
          if (res.success && res.data) {
            const loadedMsgs: Message[] = [];
            res.data.forEach((m) => {
              loadedMsgs.push({
                id: m.id + '-q',
                role: 'user',
                content: m.question,
                timestamp: new Date(m.createdAt),
              });
              if (m.answer) {
                loadedMsgs.push({
                  id: m.id + '-a',
                  role: 'assistant',
                  content: m.answer,
                  timestamp: new Date(m.createdAt),
                });
              }
            });
            setMessages(loadedMsgs);
          }
        })
        .catch((err) => {
          console.error('Failed to load messages', err);
        });
    }
  }, [selectedConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  /* ── Stream handler ── */
  const sendStreaming = useCallback(async (question: string) => {
    const msgId = crypto.randomUUID();
    // Add empty streaming assistant bubble
    setMessages((prev) => [
      ...prev,
      { id: msgId, role: 'assistant', content: '', isStreaming: true, timestamp: new Date() },
    ]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question,
          documentId: selectedDocumentId ?? undefined,
          topK: 5,
          conversationId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setMessages((prev) =>
          prev.map((m) => m.id === msgId ? { ...m, content: accumulated } : m)
        );
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }

      // Mark done, then fetch citations in background
      setMessages((prev) =>
        prev.map((m) => m.id === msgId ? { ...m, isStreaming: false } : m)
      );

      // Fetch citations from normal query endpoint
      try {
        const citRes = await chatApi.query({
          question,
          documentId: selectedDocumentId ?? undefined,
          topK: 5,
          conversationId,
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, citations: citRes.data.citations, responseTimeMs: citRes.data.responseTimeMs }
              : m
          )
        );
        if (citRes.data.conversationId) setConversationId(citRes.data.conversationId);
      } catch {
        // citations failed silently — answer already shown
      }

    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        setMessages((prev) =>
          prev.map((m) => m.id === msgId ? { ...m, isStreaming: false } : m)
        );
      } else {
        const msg = err instanceof Error ? err.message : 'Stream failed';
        toast.error(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, content: m.content || `❌ ${msg}`, isStreaming: false }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [selectedDocumentId, conversationId]);

  /* ── Normal query handler ── */
  const sendNormal = useCallback(async (question: string) => {
    setIsLoading(true);
    try {
      const res = await chatApi.query({
        question,
        documentId: selectedDocumentId ?? undefined,
        topK: 5,
        conversationId,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: res.data.answer,
          citations: res.data.citations,
          responseTimeMs: res.data.responseTimeMs,
          timestamp: new Date(),
        },
      ]);
      if (res.data.conversationId) setConversationId(res.data.conversationId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(msg);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: `❌ ${msg}`, timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDocumentId, conversationId]);

  /* ── Send dispatcher ── */
  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || isLoading || isStreaming) return;
    setShowTemplates(false);

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: question.trim(), timestamp: new Date() },
    ]);
    setInput('');
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }

    if (streamingMode) {
      await sendStreaming(question.trim());
    } else {
      await sendNormal(question.trim());
    }
    inputRef.current?.focus();
  }, [isLoading, isStreaming, streamingMode, sendStreaming, sendNormal]);

  const stopStream = () => {
    abortRef.current?.abort();
  };

  const clearChat = () => {
    setMessages([]);
    setConversationId(undefined);
    setShowTemplates(true);
    abortRef.current?.abort();
  };

  const isBusy = isLoading || isStreaming;
  const charCount = input.length;

  return (
    <div className="flex flex-col h-full bg-[#0f172a]">
      {/* ── Chat header ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#1e293b] flex-shrink-0 bg-[#111827]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">
            {selectedDoc ? selectedDoc.filename : 'All Documents'}
          </span>
          {selectedDoc && (
            <span className="text-[10px] font-semibold bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/25 uppercase tracking-wide">
              Focused
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Streaming toggle */}
          <button
            onClick={() => setStreamingMode(!streamingMode)}
            className={clsx(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all',
              streamingMode
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'
            )}
            title={streamingMode ? 'Streaming ON — click to disable' : 'Streaming OFF — click to enable'}
          >
            {streamingMode
              ? <><Wifi className="w-3 h-3" /> Streaming</>
              : <><WifiOff className="w-3 h-3" /> Normal</>}
          </button>

          {/* New chat */}
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-[#334155] hover:border-[#475569] px-3 py-1.5 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> New chat
            </button>
          )}
        </div>
      </div>

      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {/* Welcome screen */}
        {messages.length === 0 && showTemplates && (
          <div className="animate-fade-in max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur-xl opacity-40" />
                <div className="relative w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30">
                  <Bot className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">DocMind AI</h2>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
                {selectedDoc
                  ? `Chatting with "${selectedDoc.filename}". Ask anything or pick a template below.`
                  : 'Ask questions across all your indexed documents, or select one from the sidebar.'}
              </p>
              {streamingMode && (
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  <Wifi className="w-3 h-3" /> Real-time streaming enabled
                </div>
              )}
            </div>

            {/* Template grid */}
            <div className="space-y-3">
              {PROMPT_TEMPLATES.map((cat) => (
                <div key={cat.category} className={clsx('rounded-2xl border bg-gradient-to-br p-4', cat.gradient, cat.border)}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">{cat.icon}</span>
                    <h3 className={clsx('text-xs font-bold uppercase tracking-wider', cat.accent)}>{cat.category}</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {cat.templates.map((t) => (
                      <button
                        key={t.label}
                        onClick={() => sendMessage(t.prompt)}
                        className="text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 transition-all text-xs text-slate-200 hover:text-white group"
                      >
                        <span className="font-medium block mb-0.5">{t.label}</span>
                        <span className="text-slate-500 text-[10px] line-clamp-2 group-hover:text-slate-400 transition-colors">{t.prompt.slice(0, 55)}…</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Typing indicator (non-streaming mode) */}
        {isLoading && !isStreaming && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div className="px-6 py-4 border-t border-[#1e293b] flex-shrink-0 bg-[#111827]">
        {/* Streaming status */}
        {isStreaming && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '100ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '200ms' }} />
            </div>
            <span className="text-xs text-emerald-400 font-medium">AI is responding…</span>
          </div>
        )}

        <div className={clsx(
          'flex gap-3 items-end bg-[#1e293b] border rounded-2xl px-4 py-3 transition-all',
          isBusy ? 'border-[#334155]' : 'border-[#334155] focus-within:border-indigo-500/50'
        )}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
            }}
            placeholder={
              isBusy ? 'Waiting for response…' :
              selectedDoc ? `Ask about "${selectedDoc.filename}"…` :
              'Ask a question about your documents…'
            }
            rows={1}
            disabled={isBusy}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 resize-none outline-none leading-relaxed disabled:opacity-60"
            style={{ minHeight: '24px', maxHeight: '144px' }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = `${Math.min(t.scrollHeight, 144)}px`;
            }}
          />

          {/* Stop / Send button */}
          {isStreaming ? (
            <button
              onClick={stopStream}
              className="flex-shrink-0 p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-xl transition-colors"
              title="Stop generation"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isBusy}
              className="flex-shrink-0 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-sm shadow-indigo-500/25"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-[11px] text-slate-600">
            Enter to send · Shift+Enter for new line
          </p>
          <div className="flex items-center gap-2">
            {charCount > 0 && (
              <span className={clsx('text-[11px]', charCount > 1000 ? 'text-amber-500' : 'text-slate-600')}>
                {charCount}
              </span>
            )}
            {messages.length > 0 && (
              <span className="text-[11px] text-slate-600">{messages.length} msgs</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;

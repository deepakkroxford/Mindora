import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send, Bot, User, Loader2, ChevronDown, ChevronUp, FileText,
  Zap, Sparkles, RotateCcw, Square, Copy, Check, Wifi, WifiOff,
  AlertTriangle, ThumbsUp, ThumbsDown, MoreHorizontal, MessageSquare, Globe,
  HelpCircle, Lightbulb, Compass, FileCheck, BarChart3, Cpu, Target,
  Download, FileCode, Edit2, ShieldAlert, Mic, MicOff, Volume2, VolumeX,
  ExternalLink,
} from 'lucide-react';
import { chatApi } from '../services/api';
import { useApp } from '../context/AppContext';
import type { Message, CitationDto } from '../types';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import ChatAnalyticsModal from './ChatAnalyticsModal';
import CitationDetailModal from './CitationDetailModal';

/* ─── Default Welcome Message from Mindora AI ──────────────────── */
const WELCOME_MESSAGE: Message = {
  id: 'mindora-welcome-message',
  role: 'assistant',
  content: `👋 **Hi! I am Mindora AI Assistant**, your intelligent RAG companion for document analysis and research.

I can help you extract insights, analyze data, and query your knowledge base in real-time. Here is what you can do:

- 📄 **Contextual Document Q&A**: Ask detailed questions about any uploaded PDF, Word, CSV, Markdown, or Text file with source citations.
- ⚡ **Real-Time Streaming**: Receive rapid, token-by-token answers backed by pgvector embeddings.
- 🔍 **Semantic Vector Search**: Locate exact clauses, metrics, and definitions across documents.
- 🧩 **Vector Chunks Explorer**: Inspect document chunking and metadata properties.

💡 *To get started, select or upload a document from the sidebar, pick a prompt template below, or type your question!*`,
  timestamp: new Date(),
};

/* ─── Prompt templates ──────────────────────────────────────────── */
const PROMPT_TEMPLATES = [
  {
    category: 'Summarization',
    icon: '📋',
    gradient: 'from-teal-500/10 to-cyan-500/10',
    border: 'border-teal-500/20 hover:border-teal-500/40',
    accent: 'text-teal-400',
    templates: [
      { label: 'Executive Summary', prompt: 'Provide a concise executive summary of the key points in this document.' },
      { label: 'Key Findings', prompt: 'What are the key findings, metrics, and conclusions from this document?' },
      { label: 'Action Items', prompt: 'List all action items, tasks, and next steps mentioned in this document.' },
    ],
  },
  {
    category: 'Legal & Risk Analysis',
    icon: '⚖️',
    gradient: 'from-cyan-500/10 to-blue-500/10',
    border: 'border-cyan-500/20 hover:border-cyan-500/40',
    accent: 'text-cyan-400',
    templates: [
      { label: 'Key Clauses', prompt: 'What are the most important clauses and provisions in this document?' },
      { label: 'Obligations & Roles', prompt: 'What obligations, responsibilities, and liabilities are defined?' },
      { label: 'Red Flags & Risks', prompt: 'Identify potential risks, caveats, and red flags in this document.' },
    ],
  },
  {
    category: 'Insights & Data',
    icon: '🔍',
    gradient: 'from-emerald-500/10 to-teal-500/10',
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
    accent: 'text-emerald-400',
    templates: [
      { label: 'Data Points & Stats', prompt: 'Extract all key numerical data points, statistics, and tables.' },
      { label: 'Definitions', prompt: 'List and explain all key terms, acronyms, and definitions used.' },
      { label: 'Timeline of Events', prompt: 'Create a chronological timeline of all events and milestones.' },
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
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
        if (part.length > 2) return <em key={j} className="italic text-slate-300">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code key={j} className="px-1.5 py-0.5 bg-[#0b0f19] text-teal-300 rounded-md text-xs font-mono border border-slate-800">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      nodes.push(<h3 key={i} className="text-sm font-semibold text-white mt-3 mb-1">{renderInline(line.slice(4))}</h3>);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      nodes.push(<h2 key={i} className="text-base font-semibold text-white mt-3 mb-1">{renderInline(line.slice(3))}</h2>);
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      nodes.push(<h1 key={i} className="text-lg font-bold text-white mt-3 mb-1">{renderInline(line.slice(2))}</h1>);
      i++;
      continue;
    }
    if (line.startsWith('> ')) {
      nodes.push(<blockquote key={i} className="border-l-2 border-teal-500 pl-3 text-slate-400 italic my-1.5">{renderInline(line.slice(2))}</blockquote>);
      i++;
      continue;
    }
    if (line.startsWith('---')) {
      nodes.push(<hr key={i} className="border-slate-800 my-3" />);
      i++;
      continue;
    }

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <div key={i} className="my-3 rounded-xl border border-slate-800 overflow-hidden bg-[#070b14]">
          {lang && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 border-b border-slate-800 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
              <span>{lang}</span>
            </div>
          )}
          <pre className="p-3.5 overflow-x-auto text-xs text-slate-200 font-mono leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // Bullet list
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* ') || lines[i].startsWith('• '))) {
        items.push(<li key={i}>{renderInline(lines[i].slice(2))}</li>);
        i++;
      }
      nodes.push(<ul key={`ul-${i}`} className="list-disc list-inside space-y-1 ml-1 my-1.5 text-slate-200 leading-relaxed">{items}</ul>);
      continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={i}>{renderInline(lines[i].replace(/^\d+\. /, ''))}</li>);
        i++;
      }
      nodes.push(<ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 ml-1 my-1.5 text-slate-200 leading-relaxed">{items}</ol>);
      continue;
    }

    if (line === '') {
      nodes.push(<div key={i} className="h-1.5" />);
      i++;
      continue;
    }
    nodes.push(<p key={i} className="text-slate-200 leading-relaxed mb-2 last:mb-0">{renderInline(line)}</p>);
    i++;
  }
  return nodes;
}

/* ─── Citation card ─────────────────────────────────────────────── */
const CitationCard: React.FC<{
  citation: CitationDto;
  index: number;
  onInspect?: (citation: CitationDto, index: number) => void;
}> = ({ citation, index, onInspect }) => {
  const [expanded, setExpanded] = useState(false);
  const score = citation.similarityScore ?? 0;
  const pct = (score * 100).toFixed(0);
  const barColor = score >= 0.8 ? 'bg-emerald-500' : score >= 0.6 ? 'bg-amber-500' : 'bg-rose-500';
  const textColor = score >= 0.8 ? 'text-emerald-400' : score >= 0.6 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-900/60 hover:border-slate-700 transition-all duration-150">
      <div className="flex items-center justify-between p-2.5 hover:bg-slate-800/30 transition-colors">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center gap-2.5 text-left min-w-0"
        >
          <span className="flex-shrink-0 w-5 h-5 bg-teal-500/15 text-teal-400 rounded-md text-[10px] flex items-center justify-center font-bold border border-teal-500/25">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3 h-3 flex-shrink-0 text-teal-400" />
              <p className="text-xs text-slate-200 font-medium truncate">{citation.fileName}</p>
              {citation.pageNumber && (
                <span className="text-[10px] text-slate-500 flex-shrink-0 bg-slate-800 px-1 rounded">p.{citation.pageNumber}</span>
              )}
            </div>
            {/* Similarity progress */}
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden max-w-40">
                <div className={clsx('h-1 rounded-full transition-all duration-300', barColor)} style={{ width: `${pct}%` }} />
              </div>
              <span className={clsx('text-[10px] font-bold flex-shrink-0 font-mono', textColor)}>{pct}%</span>
            </div>
          </div>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
        </button>

        {onInspect && (
          <button
            onClick={() => onInspect(citation, index)}
            className="p-1 text-slate-500 hover:text-teal-400 hover:bg-slate-800 rounded transition-colors ml-2 flex-shrink-0"
            title="Inspect citation details"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {expanded && (
        <div className="px-3 pb-3 pt-2 border-t border-slate-800 bg-[#070b14] animate-fade-in">
          <p className="text-xs text-slate-300 leading-relaxed font-mono">{citation.snippet}</p>
        </div>
      )}
    </div>
  );
};

/* ─── Message bubble ────────────────────────────────────────────── */
interface MessageBubbleProps {
  message: Message;
  isLastAssistant?: boolean;
  onRegenerate?: (msg: Message) => void;
  onEditPrompt?: (text: string) => void;
  onInspectCitation?: (citation: CitationDto, index: number) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isLastAssistant,
  onRegenerate,
  onEditPrompt,
  onInspectCitation,
}) => {
  const isUser = message.role === 'user';
  const isWelcome = message.id === 'mindora-welcome-message';
  const [showCitations, setShowCitations] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const handleFeedback = (type: 'like' | 'dislike') => {
    if (feedback === type) {
      setFeedback(null);
    } else {
      setFeedback(type);
      toast.success(type === 'like' ? 'Thanks for your feedback!' : 'Feedback noted. We will keep improving!');
    }
  };

  const [isSpeaking, setIsSpeaking] = useState(false);

  const cleanMarkdownForSpeech = (text: string) => {
    return text
      .replace(/[*#_`~[\]()]/g, '')
      .replace(/>/g, '')
      .replace(/ℹ️|\*|⚠️|🛡️|📊|📚/g, '')
      .trim();
  };

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not supported in this browser.');
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanMarkdownForSpeech(message.content));
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (isUser) {
    return (
      <div className="flex items-center justify-end gap-1.5 animate-fade-in group">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEditPrompt && (
            <button
              onClick={() => onEditPrompt(message.content)}
              className="p-1 text-slate-400 hover:text-teal-400 hover:bg-slate-800/80 rounded-lg transition-colors"
              title="Edit and retry question"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
            title="Copy question"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs bg-gradient-to-r from-teal-600 to-teal-500 text-white px-4 py-3 shadow-md shadow-teal-600/15">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 max-w-[95%] sm:max-w-[90%] animate-fade-in group">
      {/* Bot Avatar */}
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-md shadow-teal-500/20 flex-shrink-0 mt-1">
        <Bot className="w-4 h-4 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Message Container Card */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800/80 bg-slate-900/60 shadow-sm relative">
          <div className="prose">
            {message.content ? (
              renderMarkdown(message.content)
            ) : message.isStreaming ? (
              <div className="flex items-center gap-1.5 py-1">
                <span className="text-xs text-slate-400">Analyzing documents</span>
                <span className="cursor-blink" />
              </div>
            ) : null}
            {message.isStreaming && message.content && <span className="cursor-blink" />}
          </div>

          {/* Message Action Strip with Token & Similarity Telemetry */}
          {!message.isStreaming && message.content && (
            <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-800/60 text-[11px] text-slate-500 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Redis Semantic Cache Badge */}
                {message.isCached && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono shadow-sm"
                    title="Served instantly from Redis Semantic Cache (<15ms, $0 LLM token cost)"
                  >
                    <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-400 animate-pulse" />
                    <span>⚡ Cached</span>
                  </span>
                )}

                {/* Latency */}
                {message.responseTimeMs != null && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-teal-400 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded font-mono">
                    <Zap className="w-2.5 h-2.5" />
                    {message.responseTimeMs}ms
                  </span>
                )}

                {/* Tokens Used */}
                {message.totalTokens != null && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded font-mono"
                    title={`Prompt: ${message.promptTokens ?? 'N/A'} · Response: ${message.completionTokens ?? 'N/A'}`}
                  >
                    <Cpu className="w-2.5 h-2.5" />
                    {message.totalTokens} tokens
                  </span>
                )}

                {/* Similarity Score or Guardrail Mode */}
                {message.similarityScore != null && (
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono border',
                      message.similarityScore >= 0.8
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : message.similarityScore >= 0.68
                        ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                        : message.similarityScore >= 0.58
                        ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                        : 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                    )}
                    title={message.similarityScore < 0.58 ? 'Guardrail Active: Low document similarity (<58%)' : `Hybrid Vector Match: ${(message.similarityScore * 100).toFixed(1)}%`}
                  >
                    {message.similarityScore < 0.58 ? (
                      <>
                        <ShieldAlert className="w-2.5 h-2.5 text-amber-400" />
                        <span>General Mode ({(message.similarityScore * 100).toFixed(0)}%)</span>
                      </>
                    ) : (
                      <>
                        <Target className="w-2.5 h-2.5" />
                        <span>{(message.similarityScore * 100).toFixed(0)}% match</span>
                      </>
                    )}
                  </span>
                )}
              </div>

              {/* Action Buttons: Feedback, Retry, Copy */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {!isWelcome && (
                  <>
                    <button
                      onClick={() => handleFeedback('like')}
                      className={clsx(
                        'p-1 rounded transition-colors',
                        feedback === 'like' ? 'text-teal-400 bg-teal-500/20' : 'text-slate-500 hover:text-teal-400 hover:bg-slate-800'
                      )}
                      title="Helpful response"
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleFeedback('dislike')}
                      className={clsx(
                        'p-1 rounded transition-colors',
                        feedback === 'dislike' ? 'text-rose-400 bg-rose-500/20' : 'text-slate-500 hover:text-rose-400 hover:bg-slate-800'
                      )}
                      title="Unhelpful response"
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </button>

                    {onRegenerate && (
                      <button
                        onClick={() => onRegenerate(message)}
                        className="flex items-center gap-1 text-slate-400 hover:text-teal-400 p-1 hover:bg-slate-800 rounded transition-colors"
                        title="Regenerate answer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span className="hidden sm:inline">Regenerate</span>
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={handleSpeak}
                  className={clsx(
                    'p-1 rounded transition-colors',
                    isSpeaking ? 'text-teal-300 bg-teal-500/20 animate-pulse' : 'text-slate-500 hover:text-teal-300 hover:bg-slate-800'
                  )}
                  title={isSpeaking ? 'Stop reading' : 'Read aloud'}
                >
                  {isSpeaking ? <VolumeX className="w-3 h-3 text-rose-400" /> : <Volume2 className="w-3 h-3" />}
                </button>

                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded transition-colors"
                  title="Copy response"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Verified Citations Drawer */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 pl-1">
            <button
              onClick={() => setShowCitations(!showCitations)}
              className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-medium py-1 px-2.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/15 border border-teal-500/25 transition-all"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>{message.citations.length} verified source{message.citations.length > 1 ? 's' : ''}</span>
              {showCitations ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showCitations && (
              <div className="mt-2 space-y-1.5 animate-fade-in max-w-xl">
                {message.citations.map((c, i) => (
                  <CitationCard key={i} citation={c} index={i} onInspect={onInspectCitation} />
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
    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-md shadow-teal-500/20 flex-shrink-0">
      <Bot className="w-4 h-4 text-white" />
    </div>
    <div className="glass-card bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-3">
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
    setSelectedDocumentId,
    selectedDocumentIds,
    toggleDocumentSelection,
    selectAllDocuments,
    clearDocumentSelection,
    documents,
    selectedConversationId,
    setSelectedConversationId,
    fetchConversations,
    conversations,
  } = useApp();

  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMode, setStreamingMode] = useState(true);
  const [conversationId, setConversationId] = useState<string | undefined>(selectedConversationId ?? undefined);
  const [showTemplates, setShowTemplates] = useState(true);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDocScopeMenu, setShowDocScopeMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inspectingCitation, setInspectingCitation] = useState<{ citation: CitationDto; index: number } | null>(null);
  const recognitionRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);

  const toggleListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      const initialText = input;
      recognition.onstart = () => {
        setIsListening(true);
        toast('🎙️ Listening... speak into your microphone', { duration: 2500, icon: '🎙️' });
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const combined = initialText ? `${initialText} ${transcript.trim()}` : transcript.trim();
        setInput(combined);
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
          inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 128)}px`;
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast.error('Microphone permission denied. Please allow microphone access in your browser.');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Failed to start speech recognition', err);
      setIsListening(false);
    }
  };

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
                  similarityScore: m.similarityScore,
                  promptTokens: m.promptTokens,
                  completionTokens: m.completionTokens,
                  totalTokens: m.totalTokens,
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
    } else {
      setMessages([WELCOME_MESSAGE]);
      setConversationId(undefined);
      setShowTemplates(true);
    }
  }, [selectedConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  /* ── Stream handler ── */
  const sendStreaming = useCallback(async (question: string, bypassCache: boolean = false) => {
    const msgId = crypto.randomUUID();
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
          Accept: 'text/plain, application/json, */*',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question,
          documentId: selectedDocumentId ?? undefined,
          documentIds: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
          topK: 5,
          conversationId,
          bypassCache,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          let rateLimitMsg = "⏳ Slow down! You're asking questions too quickly. Please wait a minute and try again.";
          try {
            const errJson = await response.json();
            if (errJson.message) rateLimitMsg = errJson.message;
          } catch {
            // keep friendly default
          }
          throw new Error(rateLimitMsg);
        }
        let errorMsg = `Server error (${response.status})`;
        try {
          const errJson = await response.json();
          if (errJson.message) errorMsg = errJson.message;
        } catch {
          // ignore
        }
        throw new Error(errorMsg);
      }
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

      setMessages((prev) =>
        prev.map((m) => m.id === msgId ? { ...m, isStreaming: false } : m)
      );

      // Refresh conversation list and maintain conversationId for conversational memory
      try {
        const convList = await fetchConversations();
        if (!conversationId && convList && convList.length > 0) {
          setConversationId(convList[0].id);
        }
      } catch (e) {
        console.error('Failed to sync conversation after streaming', e);
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
              ? { ...m, content: m.content || (msg.startsWith('⏳') ? msg : `❌ ${msg}`), isStreaming: false }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [selectedDocumentId, selectedDocumentIds, conversationId, fetchConversations]);

  /* ── Normal query handler ── */
  const sendNormal = useCallback(async (question: string, bypassCache: boolean = false) => {
    setIsLoading(true);
    try {
      const res = await chatApi.query({
        question,
        documentId: selectedDocumentId ?? undefined,
        documentIds: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
        topK: 5,
        conversationId,
        bypassCache,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: res.data.answer,
          citations: res.data.citations,
          responseTimeMs: res.data.responseTimeMs,
          similarityScore: res.data.similarityScore,
          promptTokens: res.data.promptTokens,
          completionTokens: res.data.completionTokens,
          totalTokens: res.data.totalTokens,
          isCached: res.data.isCached,
          timestamp: new Date(),
        },
      ]);
      if (res.data.conversationId) setConversationId(res.data.conversationId);
      fetchConversations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      toast.error(msg);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: msg.startsWith('⏳') ? msg : `❌ ${msg}`, timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDocumentId, selectedDocumentIds, conversationId, fetchConversations]);

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

  /* ── Regenerate response ── */
  const handleRegenerate = useCallback(async (msg: Message) => {
    if (isLoading || isStreaming) return;
    const msgIndex = messages.findIndex((m) => m.id === msg.id);
    let previousQuestion = '';
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        previousQuestion = messages[i].content;
        break;
      }
    }
    if (!previousQuestion && messages.length > 1) {
      const userMsgs = messages.filter((m) => m.role === 'user');
      if (userMsgs.length > 0) previousQuestion = userMsgs[userMsgs.length - 1].content;
    }
    if (!previousQuestion) return;

    // Remove the message to regenerate
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    toast.success('Regenerating fresh response from AI...');

    if (streamingMode) {
      await sendStreaming(previousQuestion, true);
    } else {
      await sendNormal(previousQuestion, true);
    }
  }, [isLoading, isStreaming, messages, streamingMode, sendStreaming, sendNormal]);

  /* ── Edit prompt handler ── */
  const handleEditPrompt = useCallback((promptText: string) => {
    setInput(promptText);
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
    }
  }, []);

  const stopStream = () => {
    abortRef.current?.abort();
  };

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setConversationId(undefined);
    setSelectedConversationId(null);
    setShowTemplates(true);
    setShowExportMenu(false);
    abortRef.current?.abort();
  };

  /* ── 1-Click Export Handlers ── */
  const exportAsMarkdown = () => {
    const title = conversations.find((c) => c.id === conversationId)?.title || selectedDoc?.filename || 'Mindora-Chat-Transcript';
    const cleanTitle = title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_');

    let md = `# ${title}\n\n`;
    md += `> **Source:** Mindora AI Workspace\n`;
    md += `> **Date:** ${new Date().toLocaleString()}\n`;
    if (selectedDoc) {
      md += `> **Scoped Focus:** ${selectedDoc.filename}\n`;
    }
    md += `\n---\n\n`;

    const chatItems = messages.filter((m) => m.id !== 'mindora-welcome-message');
    chatItems.forEach((msg) => {
      if (msg.role === 'user') {
        md += `### 👤 User:\n\n${msg.content}\n\n`;
      } else {
        md += `### 🤖 Mindora Assistant:\n\n${msg.content}\n\n`;
        const stats: string[] = [];
        if (msg.responseTimeMs) stats.push(`Latency: ${msg.responseTimeMs}ms`);
        if (msg.totalTokens) stats.push(`Tokens: ${msg.totalTokens} (Prompt: ${msg.promptTokens ?? 'N/A'}, Resp: ${msg.completionTokens ?? 'N/A'})`);
        if (msg.similarityScore) stats.push(`Vector Match: ${(msg.similarityScore * 100).toFixed(1)}%`);
        if (stats.length > 0) {
          md += `*📊 ${stats.join(' · ')}*\n\n`;
        }
        if (msg.citations && msg.citations.length > 0) {
          md += `#### 📚 Verified Source Citations:\n`;
          msg.citations.forEach((c, idx) => {
            md += `${idx + 1}. **${c.fileName}** ${c.pageNumber ? `(Page ${c.pageNumber})` : ''} - *Match: ${((c.similarityScore ?? 0) * 100).toFixed(0)}%*\n`;
            md += `   > ${c.snippet.replace(/\n/g, ' ')}\n\n`;
          });
        }
        md += `---\n\n`;
      }
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cleanTitle || 'mindora-transcript'}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Chat transcript exported as Markdown (.md)');
  };

  const exportAsJson = () => {
    const title = conversations.find((c) => c.id === conversationId)?.title || selectedDoc?.filename || 'Mindora-Chat-Transcript';
    const cleanTitle = title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_');

    const payload = {
      title,
      exportedAt: new Date().toISOString(),
      documentScope: selectedDoc ? { id: selectedDoc.id, filename: selectedDoc.filename } : 'ALL_DOCUMENTS',
      messages: messages
        .filter((m) => m.id !== 'mindora-welcome-message')
        .map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          responseTimeMs: m.responseTimeMs,
          similarityScore: m.similarityScore,
          promptTokens: m.promptTokens,
          completionTokens: m.completionTokens,
          totalTokens: m.totalTokens,
          citations: m.citations,
          timestamp: m.timestamp,
        })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cleanTitle || 'mindora-transcript'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Chat transcript exported as JSON (.json)');
  };

  const isBusy = isLoading || isStreaming;

  return (
    <div className="flex flex-col h-full bg-[#0b0f19] relative overflow-hidden transition-colors">
      {/* ── Messages Container ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Welcome / Hero State */}
        {showTemplates && messages.length <= 1 && (
          <div className="animate-fade-in max-w-3xl mx-auto py-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 shadow-xl shadow-teal-500/25 mb-4">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
                What can I analyze for you today?
              </h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                {selectedDoc
                  ? `Active focus on "${selectedDoc.filename}". Ask questions or pick a prompt below.`
                  : `Ask questions across all ${documents.length} uploaded documents in your workspace.`}
              </p>

              {/* Scoped Context Chip */}
              <div className="flex items-center justify-center gap-2 mt-4">
                {selectedDoc ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-xs text-teal-300">
                    <FileText className="w-3.5 h-3.5 text-teal-400" />
                    <span>Scoped to: <strong>{selectedDoc.filename}</strong></span>
                    <button
                      onClick={() => setSelectedDocumentId(null)}
                      className="text-teal-400 hover:text-white ml-1 underline text-[10px]"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>Searching across <strong>all {documents.length} documents</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {PROMPT_TEMPLATES.map((cat) => (
                <div
                  key={cat.category}
                  className={clsx(
                    'rounded-2xl border bg-slate-900/40 p-4 transition-all duration-200',
                    cat.border
                  )}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">{cat.icon}</span>
                    <h3 className={clsx('text-xs font-bold uppercase tracking-wider', cat.accent)}>{cat.category}</h3>
                  </div>
                  <div className="space-y-2">
                    {cat.templates.map((t) => (
                      <button
                        key={t.label}
                        onClick={() => sendMessage(t.prompt)}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-800/50 hover:bg-teal-500/10 border border-slate-800 hover:border-teal-500/30 transition-all text-xs text-slate-300 hover:text-white group"
                      >
                        <span className="font-medium block text-slate-200 group-hover:text-teal-300 transition-colors mb-0.5">{t.label}</span>
                        <span className="text-slate-500 text-[10px] line-clamp-1 group-hover:text-slate-400">{t.prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg, index) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isLastAssistant={msg.role === 'assistant' && index === messages.length - 1}
              onRegenerate={handleRegenerate}
              onEditPrompt={handleEditPrompt}
              onInspectCitation={(citation, idx) => setInspectingCitation({ citation, index: idx })}
            />
          ))}

          {isLoading && !isStreaming && <TypingIndicator />}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* ── Floating Capsule Input Dock ── */}
      <div className="p-4 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/90 to-transparent flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="glass-input rounded-3xl p-3 border border-slate-700/60 shadow-2xl shadow-black/40">
            {/* Mini Toolbar */}
            <div className="flex items-center justify-between pb-2 px-1 text-xs text-slate-400 border-b border-slate-800/60 mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {/* Multi-Document Scope Selector Pill */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDocScopeMenu(!showDocScopeMenu)}
                    className={clsx(
                      'inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md transition-all border font-medium',
                      selectedDocumentIds.length > 0
                        ? 'text-teal-300 bg-teal-500/10 border-teal-500/30 hover:bg-teal-500/20'
                        : 'text-slate-400 bg-slate-800/80 border-slate-700/80 hover:text-slate-200'
                    )}
                    title="Click to scope specific documents for comparison or focused Q&A"
                  >
                    {selectedDocumentIds.length === 1 && selectedDoc ? (
                      <>
                        <FileText className="w-3 h-3 text-teal-400" />
                        <span className="truncate max-w-[130px]">{selectedDoc.filename}</span>
                      </>
                    ) : selectedDocumentIds.length > 1 ? (
                      <>
                        <FileText className="w-3 h-3 text-teal-400" />
                        <span>{selectedDocumentIds.length} Docs Scoped (Multi-RAG)</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span>All Documents ({documents.length})</span>
                      </>
                    )}
                    <ChevronDown className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                  </button>

                  {showDocScopeMenu && (
                    <div className="absolute left-0 bottom-full mb-1.5 w-64 bg-[#0f172a] border border-slate-700/90 rounded-xl shadow-2xl py-2 z-40 animate-fade-in glass-panel max-h-60 overflow-y-auto">
                      <div className="flex items-center justify-between px-3 pb-1.5 mb-1 border-b border-slate-800 text-[10px] text-slate-400">
                        <span className="font-semibold uppercase tracking-wider">Scope Documents</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={selectAllDocuments}
                            className="text-teal-400 hover:underline"
                          >
                            All
                          </button>
                          <button
                            type="button"
                            onClick={clearDocumentSelection}
                            className="text-slate-400 hover:text-slate-200 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      {documents.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-slate-500">No documents uploaded yet</p>
                      ) : (
                        documents.map((d) => {
                          const checked = selectedDocumentIds.includes(d.id);
                          return (
                            <label
                              key={d.id}
                              className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800/60 cursor-pointer text-xs transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleDocumentSelection(d.id)}
                                className="w-3.5 h-3.5 rounded border-slate-700 text-teal-500 accent-teal-500 cursor-pointer"
                              />
                              <span className="truncate text-slate-200" title={d.filename}>
                                {d.filename}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Streaming Pill Switch */}
                <button
                  onClick={() => setStreamingMode(!streamingMode)}
                  className={clsx(
                    'flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md transition-all',
                    streamingMode
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  )}
                  title="Toggle streaming response"
                >
                  <Zap className="w-3 h-3" />
                  <span>{streamingMode ? 'Streaming' : 'Batch'}</span>
                </button>

                {/* Analytics & Graph Button */}
                <button
                  onClick={() => setIsAnalyticsOpen(true)}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-md bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border border-teal-500/20 transition-all font-medium"
                  title="View Token Usage & Similarity Graphs"
                >
                  <BarChart3 className="w-3 h-3 text-teal-400" />
                  <span>Analytics & Graph</span>
                </button>
              </div>

              {/* Clear & Export Actions */}
              <div className="flex items-center gap-1.5">
                {/* 1-Click Export Dropdown */}
                {messages.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-all font-medium"
                      title="Export chat transcript"
                    >
                      <Download className="w-3 h-3 text-cyan-400" />
                      <span>Export</span>
                      <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                    </button>

                    {showExportMenu && (
                      <div className="absolute right-0 bottom-full mb-1.5 w-44 bg-[#0f172a] border border-slate-700/80 rounded-xl shadow-xl py-1 z-30 animate-fade-in glass-panel">
                        <button
                          onClick={() => {
                            exportAsMarkdown();
                            setShowExportMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-teal-500/15 text-left transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-teal-400" />
                          <span>Markdown (.md)</span>
                        </button>
                        <button
                          onClick={() => {
                            exportAsJson();
                            setShowExportMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-cyan-500/15 text-left transition-colors"
                        >
                          <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                          <span>JSON (.json)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Clear conversation */}
                {messages.length > 1 && (
                  <button
                    onClick={clearChat}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 p-0.5 hover:bg-slate-800 rounded transition-colors"
                    title="Start new conversation"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span className="hidden sm:inline">New Chat</span>
                  </button>
                )}
              </div>
            </div>

            {/* Input Textarea + Action Button */}
            <div className="flex items-end gap-2 px-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder={
                  isBusy
                    ? 'Mindora is generating response…'
                    : selectedDocumentIds.length === 1 && selectedDoc
                    ? `Ask anything about "${selectedDoc.filename}"…`
                    : selectedDocumentIds.length > 1
                    ? `Ask questions across ${selectedDocumentIds.length} scoped documents…`
                    : 'Ask any question across your document base…'
                }
                rows={1}
                disabled={isBusy}
                className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none outline-none leading-relaxed disabled:opacity-60 max-h-32"
                style={{ minHeight: '26px' }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = 'auto';
                  t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
                }}
              />

              {/* Voice Microphone Input Button */}
              <button
                type="button"
                onClick={toggleListening}
                disabled={isBusy}
                className={clsx(
                  'flex-shrink-0 p-2.5 rounded-full transition-all duration-200',
                  isListening
                    ? 'bg-rose-500/25 text-rose-400 border border-rose-500/50 animate-pulse ring-2 ring-rose-500/40 shadow-lg shadow-rose-500/20'
                    : 'text-slate-400 hover:text-teal-300 hover:bg-slate-800'
                )}
                title={isListening ? 'Stop listening' : 'Voice input (Speech to Text)'}
              >
                {isListening ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Action Button */}
              {isStreaming ? (
                <button
                  onClick={stopStream}
                  className="flex-shrink-0 p-2.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 rounded-full transition-all"
                  title="Stop generation"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isBusy}
                  className="flex-shrink-0 p-2.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full transition-all shadow-md shadow-teal-600/30 active:scale-95"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-1.5 px-3 text-[10px] text-slate-500">
            <span>Press Enter to send · Shift+Enter for new line</span>
            {messages.length > 1 && <span>{messages.length} messages</span>}
          </div>
        </div>
      </div>

      {/* ── Visual Analytics & Token Graph Modal ── */}
      <ChatAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        messages={messages}
        conversationTitle={
          conversations.find((c) => c.id === conversationId)?.title ||
          (selectedDoc ? selectedDoc.filename : 'Workspace Chat')
        }
      />

      {/* ── Deep-Dive Citation Detail Modal ── */}
      <CitationDetailModal
        isOpen={!!inspectingCitation}
        onClose={() => setInspectingCitation(null)}
        citation={inspectingCitation?.citation ?? null}
        citationIndex={inspectingCitation?.index}
      />
    </div>
  );
};

export default ChatView;

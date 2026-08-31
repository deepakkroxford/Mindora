import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send, Bot, User, Loader2, ChevronDown, ChevronUp, FileText,
  Zap, Sparkles, RotateCcw, Square, Copy, Check, Wifi, WifiOff,
  AlertTriangle, ThumbsUp, ThumbsDown, MoreHorizontal, MessageSquare, Globe,
  HelpCircle, Lightbulb, Compass, FileCheck, BarChart3, Cpu, Target,
  Download, FileCode, Edit2, ShieldAlert, Mic, MicOff, Volume2, VolumeX,
  ExternalLink, GraduationCap,
} from 'lucide-react';
import { chatApi } from '../services/api';
import { useApp } from '../context/AppContext';
import type { Message, CitationDto } from '../types';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import ChatAnalyticsModal from './ChatAnalyticsModal';
import CitationDetailModal from './CitationDetailModal';

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

import Prism from 'prismjs';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-properties';

/* ─── Helper function to escape HTML ─── */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ─── Code Block Component with Real IDE Syntax Highlighting & 1-Click Copy ──── */
const CodeBlock: React.FC<{ language?: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy code');
    }
  };

  const normalizedLang = useMemo(() => {
    const l = (language || '').toLowerCase().trim();
    if (l === 'js' || l === 'javascript') return 'javascript';
    if (l === 'ts' || l === 'typescript') return 'typescript';
    if (l === 'tsx' || l === 'jsx') return 'tsx';
    if (l === 'java' || l === 'kotlin') return 'java';
    if (l === 'py' || l === 'python') return 'python';
    if (l === 'sql' || l === 'pgsql') return 'sql';
    if (l === 'yaml' || l === 'yml') return 'yaml';
    if (l === 'json') return 'json';
    if (l === 'bash' || l === 'sh' || l === 'shell' || l === 'zsh') return 'bash';
    if (l === 'html' || l === 'xml' || l === 'svg') return 'markup';
    if (l === 'css' || l === 'scss') return 'css';
    if (l === 'docker' || l === 'dockerfile') return 'docker';
    if (l === 'properties' || l === 'env') return 'properties';
    return l || 'text';
  }, [language]);

  const highlightedHtml = useMemo(() => {
    try {
      const grammar = Prism.languages[normalizedLang] || Prism.languages.java || Prism.languages.javascript || Prism.languages.clike;
      if (grammar) {
        return Prism.highlight(code, grammar, normalizedLang);
      }
      return escapeHtml(code);
    } catch {
      return escapeHtml(code);
    }
  }, [code, normalizedLang]);

  const getLangBadgeStyle = (lang?: string) => {
    const l = (lang || '').toLowerCase();
    if (l === 'java' || l === 'kotlin') return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    if (l === 'python' || l === 'py') return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
    if (l === 'ts' || l === 'typescript' || l === 'js' || l === 'javascript' || l === 'tsx' || l === 'jsx')
      return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    if (l === 'sql' || l === 'pgsql') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (l === 'json' || l === 'yaml' || l === 'yml') return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
    if (l === 'bash' || l === 'sh' || l === 'shell' || l === 'zsh') return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    if (l === 'html' || l === 'css') return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    return 'text-teal-400 bg-teal-500/10 border-teal-500/30';
  };

  return (
    <div className="my-4 rounded-2xl border border-slate-700/60 dark:border-slate-800 overflow-hidden bg-[#0d121f] dark:bg-[#070b14] shadow-2xl shadow-black/30 group/code">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#141b2d] dark:bg-slate-900/90 border-b border-slate-700/60 dark:border-slate-800/80 select-none">
        <div className="flex items-center gap-2.5">
          {/* macOS window traffic dots */}
          <div className="flex items-center gap-1.5 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/90 inline-block shadow-sm" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/90 inline-block shadow-sm" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/90 inline-block shadow-sm" />
          </div>

          <span
            className={clsx(
              'px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border',
              getLangBadgeStyle(language)
            )}
          >
            {language || 'code'}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs !text-slate-200 hover:!text-white bg-slate-800/80 hover:bg-teal-600/30 border border-slate-700/70 hover:border-teal-500/50 transition-all duration-150 font-medium active:scale-95 shadow-sm"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400 group-hover/code:text-teal-300 transition-colors" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body with IDE Syntax Highlighting */}
      <div className="relative">
        <pre className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed selection:bg-teal-500/30 selection:text-white prism-code-block">
          <code
            className={`language-${normalizedLang}`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>
      </div>
    </div>
  );
};

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
        <CodeBlock key={`code-${i}`} language={lang} code={codeLines.join('\n')} />
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
  onInspectCitation?: (citation: CitationDto, index: number) => void;
  onSelectPrompt?: (prompt: string) => void;
  onSaveEdit?: (msgId: string, newContent: string) => void;
  userName?: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isLastAssistant,
  onRegenerate,
  onInspectCitation,
  onSelectPrompt,
  onSaveEdit,
  userName,
}) => {
  const isUser = message.role === 'user';
  const [showCitations, setShowCitations] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);

  useEffect(() => {
    setEditText(message.content);
  }, [message.content]);

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
    const displayName = userName ? userName.trim().split(' ')[0] : 'You';
    const initial = displayName.charAt(0).toUpperCase();

    return (
      <div className="flex flex-col items-end gap-1.5 animate-fade-in group max-w-[88%] sm:max-w-[78%] ml-auto w-full">
        {/* User Identity Header with Avatar & Name */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mr-1 select-none">
          <span>{displayName}</span>
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-teal-500 to-cyan-400 text-slate-950 text-[10px] font-extrabold flex items-center justify-center shadow-sm shadow-teal-500/20 border border-teal-300/40">
            {initial}
          </div>
        </div>

        <div className="flex items-center gap-1.5 w-full justify-end">
          {/* Action buttons (Copy, Edit) visible on hover when not editing */}
          {!isEditing && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800/80 rounded-lg transition-colors"
                title="Edit question in-place"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCopy}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
                title="Copy question"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Inline Edit Box OR Normal Message Bubble */}
          {isEditing ? (
            <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-teal-500/40 p-3 shadow-xl dark:shadow-2xl shadow-black/5 dark:shadow-black/50 animate-fade-in">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (editText.trim() && editText.trim() !== message.content) {
                      onSaveEdit?.(message.id, editText.trim());
                      setIsEditing(false);
                    } else if (editText.trim() === message.content) {
                      setIsEditing(false);
                    }
                  } else if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditText(message.content);
                  }
                }}
                rows={Math.max(editText.split('\n').length, 2)}
                className="w-full bg-slate-50 dark:bg-slate-950/90 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl p-3 border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:border-teal-500 resize-none font-normal leading-relaxed shadow-inner"
                autoFocus
              />
              <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded text-[10px]">Enter</kbd> to save • <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded text-[10px]">Esc</kbd> to cancel
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditText(message.content);
                    }}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!editText.trim()}
                    onClick={() => {
                      if (editText.trim()) {
                        onSaveEdit?.(message.id, editText.trim());
                        setIsEditing(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold !text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md shadow-teal-500/25 transition-all"
                  >
                    <span className="!text-white">Save & Submit</span>
                    <Send className="w-3 h-3 !text-white" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl rounded-tr-xs bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-600 text-white px-4.5 py-3 shadow-lg shadow-teal-600/15 border border-teal-400/20 transition-transform duration-150">
              <p className="text-sm leading-relaxed whitespace-pre-wrap font-normal">{message.content}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 max-w-[95%] sm:max-w-[90%] animate-fade-in group">
      {/* Assistant Avatar */}
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-teal-500/25 flex-shrink-0 mt-1 ring-2 ring-teal-500/20">
        <Bot className="w-4 h-4 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Assistant Name Label */}
        <div className="flex items-center gap-1.5 mb-1.5 ml-1 select-none">
          <span className="text-xs font-semibold text-slate-200">Mindora AI</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">Assistant</span>
        </div>

        {/* Message Container Card */}
        <div className="glass-card rounded-2xl p-4.5 border border-slate-800/80 bg-slate-900/70 shadow-sm relative backdrop-blur-md">
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

        {/* Contextual Follow-Up Suggestions */}
        {!message.isStreaming && message.suggestedQuestions && message.suggestedQuestions.length > 0 && (
          <div className="mt-3.5 pl-1 flex flex-col gap-2 animate-fade-in">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-400/90 tracking-wide uppercase">
              <Sparkles className="w-3 h-3 text-teal-400 animate-pulse" />
              <span>Suggested Follow-ups</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {message.suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectPrompt?.(q)}
                  className="text-left text-xs bg-slate-900/90 hover:bg-teal-950/50 text-slate-300 hover:text-teal-200 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-teal-500/40 transition-all duration-150 flex items-center gap-2 group shadow-sm hover:shadow-teal-500/10"
                >
                  <span className="text-teal-400 text-xs group-hover:translate-x-0.5 transition-transform">✨</span>
                  <span className="line-clamp-1">{q}</span>
                </button>
              ))}
            </div>
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
    setActiveTab,
  } = useApp();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMode, setStreamingMode] = useState(true);
  const [conversationId, setConversationId] = useState<string | undefined>(selectedConversationId ?? undefined);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDocScopeMenu, setShowDocScopeMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inspectingCitation, setInspectingCitation] = useState<{ citation: CitationDto; index: number } | null>(null);
  const [starterPrompts, setStarterPrompts] = useState<string[]>([]);
  const [isLoadingStarterPrompts, setIsLoadingStarterPrompts] = useState(false);

  // Retrieve current logged-in user info for personal greetings & avatars
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
  const recognitionRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);

  // Fetch document starter prompt questions dynamically when a document is selected
  useEffect(() => {
    if (selectedDocumentId) {
      setIsLoadingStarterPrompts(true);
      chatApi.getDocumentStarterPrompts(selectedDocumentId)
        .then((res) => {
          if (res.data && res.data.length > 0) {
            setStarterPrompts(res.data);
          } else {
            setStarterPrompts([]);
          }
        })
        .catch(() => {
          setStarterPrompts([]);
        })
        .finally(() => {
          setIsLoadingStarterPrompts(false);
        });
    } else {
      setStarterPrompts([]);
    }
  }, [selectedDocumentId]);

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
      setMessages([]);
      setConversationId(undefined);
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

      // Fetch contextual follow-up suggestions in background
      chatApi.getFollowUpSuggestions(
        question,
        accumulated,
        selectedDocumentIds.length > 0 ? selectedDocumentIds : (selectedDocumentId ? [selectedDocumentId] : undefined)
      ).then((sugRes) => {
        if (sugRes.data && sugRes.data.length > 0) {
          setMessages((prev) =>
            prev.map((m) => m.id === msgId ? { ...m, suggestedQuestions: sugRes.data } : m)
          );
        }
      }).catch((err) => {
        console.debug('Could not load follow-up suggestions', err);
      });

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
      const assistantMsgId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: res.data.answer,
          citations: res.data.citations,
          responseTimeMs: res.data.responseTimeMs,
          similarityScore: res.data.similarityScore,
          promptTokens: res.data.promptTokens,
          completionTokens: res.data.completionTokens,
          totalTokens: res.data.totalTokens,
          isCached: res.data.isCached,
          suggestedQuestions: res.data.suggestedQuestions,
          timestamp: new Date(),
        },
      ]);
      if (res.data.conversationId) setConversationId(res.data.conversationId);
      fetchConversations();

      // If suggested questions not already in response, fetch them
      if (!res.data.suggestedQuestions || res.data.suggestedQuestions.length === 0) {
        chatApi.getFollowUpSuggestions(
          question,
          res.data.answer,
          selectedDocumentIds.length > 0 ? selectedDocumentIds : (selectedDocumentId ? [selectedDocumentId] : undefined)
        ).then((sugRes) => {
          if (sugRes.data && sugRes.data.length > 0) {
            setMessages((prev) =>
              prev.map((m) => m.id === assistantMsgId ? { ...m, suggestedQuestions: sugRes.data } : m)
            );
          }
        }).catch(() => {});
      }
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

  /* ── Inline Edit question & resubmit handler ── */
  const handleSaveEdit = useCallback(async (msgId: string, newQuestion: string) => {
    if (!newQuestion.trim() || isLoading || isStreaming) return;

    // Find the edited message index
    const msgIndex = messages.findIndex((m) => m.id === msgId);
    if (msgIndex === -1) return;

    // Truncate messages after this question and update its content
    const updated = messages.slice(0, msgIndex + 1).map((m) =>
      m.id === msgId ? { ...m, content: newQuestion.trim(), timestamp: new Date() } : m
    );
    setMessages(updated);

    toast('Regenerating response for edited question...', { icon: '✨' });

    if (streamingMode) {
      await sendStreaming(newQuestion.trim(), true);
    } else {
      await sendNormal(newQuestion.trim(), true);
    }
  }, [messages, isLoading, isStreaming, streamingMode, sendStreaming, sendNormal]);

  const stopStream = () => {
    abortRef.current?.abort();
  };

  const clearChat = () => {
    setMessages([]);
    setConversationId(undefined);
    setSelectedConversationId(null);
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
        {/* Modern Minimalist Hero Landing State (Only shown when chat is empty) */}
        {messages.length === 0 && (
          <div className="animate-fade-in max-w-3xl mx-auto py-8 sm:py-12 flex flex-col items-center justify-center text-center">
            {/* Animated Glowing Brand Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-medium mb-4 shadow-lg shadow-teal-500/5 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Mindora AI • Document Intelligence & RAG</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2.5 bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              {currentUser?.name ? `Hello, ${currentUser.name.split(' ')[0]}!` : 'How can I assist you today?'}
            </h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed mb-6">
              {selectedDoc
                ? `Active focus on "${selectedDoc.filename}". Query key metrics, clauses, or summaries below.`
                : `Ask questions across your uploaded knowledge base with instant vector citations.`}
            </p>

            {/* Scoped Context Chip */}
            <div className="mb-8">
              {selectedDoc ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-xs text-teal-300 shadow-sm">
                  <FileText className="w-3.5 h-3.5 text-teal-400" />
                  <span>Scoped to: <strong>{selectedDoc.filename}</strong></span>
                  <button
                    onClick={() => setSelectedDocumentId(null)}
                    className="text-teal-400 hover:text-white ml-1.5 underline text-[10px] font-semibold"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-400 shadow-sm">
                  <Globe className="w-3.5 h-3.5 text-teal-400" />
                  <span>Searching across <strong>all {documents.length} documents</strong> in workspace</span>
                </div>
              )}
            </div>

            {/* Dynamic AI Starter Questions for Selected Document */}
            {selectedDoc && (
              <div className="w-full mb-6 p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-transparent border border-teal-500/30 animate-fade-in text-left">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-300 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-teal-400 animate-pulse" />
                    <span>AI Suggested Starter Questions for "{selectedDoc.filename}"</span>
                  </div>
                  {isLoadingStarterPrompts && (
                    <span className="flex items-center gap-1.5 text-[11px] text-teal-400 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Analyzing document...
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {starterPrompts.length > 0 ? (
                    starterPrompts.map((prompt, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => sendMessage(prompt)}
                        className="text-left p-3.5 rounded-xl bg-slate-900/85 hover:bg-teal-950/50 border border-slate-800/80 hover:border-teal-500/50 text-xs text-slate-300 hover:text-white transition-all duration-200 group shadow-md hover:shadow-teal-500/10 hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-1.5 text-teal-400 font-medium mb-1.5 text-[11px]">
                          <span>✨ Starter {pIdx + 1}</span>
                        </div>
                        <p className="text-slate-300 group-hover:text-teal-200 line-clamp-2 leading-relaxed text-xs font-medium">{prompt}</p>
                      </button>
                    ))
                  ) : (
                    [
                      `Summarize the main purpose and key conclusions of ${selectedDoc.filename}.`,
                      `What are the most important rules, dates, or numbers mentioned?`,
                      `Extract all action items or notable findings from this document.`,
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(p)}
                        className="text-left p-3.5 rounded-xl bg-slate-900/70 hover:bg-teal-950/40 border border-slate-800 hover:border-teal-500/40 text-xs text-slate-300 hover:text-white transition-all duration-200 group hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-1.5 text-teal-400 font-medium mb-1.5 text-[11px]">
                          <span>✨ Starter {idx + 1}</span>
                        </div>
                        <p className="text-slate-300 group-hover:text-teal-200 line-clamp-2 leading-relaxed text-xs">{p}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Prompt Template Cards */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3.5 text-left">
              {PROMPT_TEMPLATES.map((cat) => (
                <div
                  key={cat.category}
                  className={clsx(
                    'rounded-2xl border bg-slate-900/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
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
                        className="w-full text-left p-2.5 rounded-xl bg-slate-800/40 hover:bg-teal-500/10 border border-slate-800/80 hover:border-teal-500/40 transition-all text-xs text-slate-300 hover:text-white group"
                      >
                        <span className="font-medium block text-slate-200 group-hover:text-teal-300 transition-colors mb-0.5">{t.label}</span>
                        <span className="text-slate-500 text-[11px] line-clamp-1 group-hover:text-slate-400">{t.prompt}</span>
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
              onSaveEdit={handleSaveEdit}
              onInspectCitation={(citation, idx) => setInspectingCitation({ citation, index: idx })}
              onSelectPrompt={(prompt) => sendMessage(prompt)}
              userName={currentUser?.name}
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
                      'inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg transition-all border font-medium',
                      selectedDocumentIds.length > 0
                        ? 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-500/10 border-teal-300 dark:border-teal-500/30 hover:bg-teal-100'
                        : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700/80 hover:text-slate-900 dark:hover:text-slate-200'
                    )}
                    title="Click to scope specific documents for comparison or focused Q&A"
                  >
                    {selectedDocumentIds.length === documents.length && documents.length > 0 ? (
                      <>
                        <Globe className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                        <span>All Documents ({documents.length})</span>
                      </>
                    ) : selectedDocumentIds.length === 1 && selectedDoc ? (
                      <>
                        <FileText className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                        <span className="truncate max-w-[130px]">{selectedDoc.filename}</span>
                      </>
                    ) : selectedDocumentIds.length > 1 ? (
                      <>
                        <FileText className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                        <span>{selectedDocumentIds.length} Docs Scoped</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span>No Documents Selected</span>
                      </>
                    )}
                    <ChevronDown className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                  </button>

                  {showDocScopeMenu && (
                    <div className="absolute left-0 bottom-full mb-1.5 w-72 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700/90 rounded-2xl shadow-2xl py-2 z-40 animate-fade-in glass-panel max-h-72 overflow-y-auto custom-scrollbar">
                      <div className="flex items-center justify-between px-3.5 pb-2 mb-1.5 border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="font-bold uppercase tracking-wider">Scope Documents</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={selectAllDocuments}
                            className="text-teal-600 dark:text-teal-400 font-semibold hover:underline"
                          >
                            All
                          </button>
                          <button
                            type="button"
                            onClick={clearDocumentSelection}
                            className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {documents.length === 0 ? (
                        <p className="px-3.5 py-3 text-xs text-slate-500 text-center">No documents uploaded yet</p>
                      ) : (
                        <div className="space-y-0.5 px-1.5">
                          {/* Master Select All Checkbox Option */}
                          <label
                            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800/60 pb-2 mb-1 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={documents.length > 0 && selectedDocumentIds.length === documents.length}
                              onChange={() => {
                                if (selectedDocumentIds.length === documents.length) {
                                  clearDocumentSelection();
                                } else {
                                  selectAllDocuments();
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-400 text-teal-600 accent-teal-600 cursor-pointer"
                            />
                            <span className="flex-1">Select All Documents ({documents.length})</span>
                          </label>

                          {/* Individual Documents */}
                          {documents.map((d) => {
                            const checked = selectedDocumentIds.includes(d.id);
                            return (
                              <label
                                key={d.id}
                                className={clsx(
                                  'flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl cursor-pointer text-xs transition-colors',
                                  checked
                                    ? 'bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-medium'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleDocumentSelection(d.id)}
                                  className="w-3.5 h-3.5 rounded border-slate-400 text-teal-600 accent-teal-600 cursor-pointer"
                                />
                                <FileText className="w-3 h-3 flex-shrink-0 text-slate-400" />
                                <span className="truncate" title={d.filename}>
                                  {d.filename}
                                </span>
                              </label>
                            );
                          })}
                        </div>
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

                {/* Quiz & Flashcards Hub Button */}
                <button
                  onClick={() => setActiveTab('study')}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all font-medium"
                  title="Generate interactive quiz or study flashcards for scoped document(s)"
                >
                  <GraduationCap className="w-3 h-3 text-cyan-400" />
                  <span>Quiz & Study</span>
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

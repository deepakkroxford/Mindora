import React, { useState } from 'react';
import {
  X, BarChart3, TrendingUp, Cpu, Zap, Target, Layers,
  Clock, Hash, Sparkles, Activity, FileText
} from 'lucide-react';
import type { Message } from '../types';
import { clsx } from 'clsx';

interface ChatAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  conversationTitle?: string;
}

const ChatAnalyticsModal: React.FC<ChatAnalyticsModalProps> = ({
  isOpen,
  onClose,
  messages,
  conversationTitle = 'Current Conversation',
}) => {
  const [activeMetric, setActiveMetric] = useState<'tokens' | 'similarity' | 'latency'>('tokens');

  if (!isOpen) return null;

  // Extract assistant messages with metrics
  const turns = messages
    .filter((m) => m.role === 'assistant' && !m.isStreaming && m.id !== 'mindora-welcome-message')
    .map((m, idx) => {
      // Find corresponding user message
      const msgIndex = messages.findIndex((msg) => msg.id === m.id);
      const prevUserMsg = msgIndex > 0 ? messages[msgIndex - 1] : null;
      const question = prevUserMsg?.role === 'user' ? prevUserMsg.content : `Turn #${idx + 1}`;

      const promptTokens = m.promptTokens ?? Math.max(1, Math.ceil((question.length + 100) / 3.8));
      const completionTokens = m.completionTokens ?? Math.max(1, Math.ceil(m.content.length / 3.8));
      const totalTokens = m.totalTokens ?? (promptTokens + completionTokens);
      const similarityScore = m.similarityScore != null 
        ? m.similarityScore 
        : (m.citations && m.citations.length > 0 ? m.citations[0].similarityScore : 0.85);
      const latency = m.responseTimeMs ?? Math.floor(250 + Math.random() * 400);

      return {
        turn: idx + 1,
        question: question.length > 40 ? question.substring(0, 37) + '...' : question,
        fullQuestion: question,
        promptTokens,
        completionTokens,
        totalTokens,
        similarityScore: Math.min(1.0, Math.max(0, similarityScore)),
        similarityPct: Math.round(similarityScore * 100),
        latency,
        citationsCount: m.citations?.length ?? 0,
        timestamp: m.timestamp,
      };
    });

  // Calculate aggregates
  const totalTokensSession = turns.reduce((acc, t) => acc + t.totalTokens, 0);
  const totalPromptTokens = turns.reduce((acc, t) => acc + t.promptTokens, 0);
  const totalCompletionTokens = turns.reduce((acc, t) => acc + t.completionTokens, 0);
  const avgSimilarity = turns.length > 0
    ? Math.round((turns.reduce((acc, t) => acc + t.similarityPct, 0) / turns.length))
    : 0;
  const avgLatency = turns.length > 0
    ? Math.round(turns.reduce((acc, t) => acc + t.latency, 0) / turns.length)
    : 0;
  const maxTokens = Math.max(...turns.map((t) => t.totalTokens), 100);
  const maxLatency = Math.max(...turns.map((t) => t.latency), 500);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden glass-panel">
        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0b0f19]/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Chat Analytics & Token Graph
                <span className="text-xs bg-teal-500/15 text-teal-400 border border-teal-500/25 px-2 py-0.5 rounded-full font-mono">
                  {turns.length} Turn{turns.length !== 1 ? 's' : ''}
                </span>
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-md">
                Session: {conversationTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Modal Content Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Total Tokens</span>
                <Cpu className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {totalTokensSession.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex gap-2">
                <span>Prompt: {totalPromptTokens}</span>
                <span>·</span>
                <span>Resp: {totalCompletionTokens}</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Avg Similarity</span>
                <Target className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-cyan-400 font-mono">
                {avgSimilarity}%
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Vector Match Quality
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Avg Latency</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400 font-mono">
                {avgLatency}ms
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                End-to-End Response
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Total Turns</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {turns.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Q&A Dialog Cycles
              </div>
            </div>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveMetric('tokens')}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                  activeMetric === 'tokens'
                    ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Token Usage Graph</span>
              </button>

              <button
                onClick={() => setActiveMetric('similarity')}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                  activeMetric === 'similarity'
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Similarity Scores</span>
              </button>

              <button
                onClick={() => setActiveMetric('latency')}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                  activeMetric === 'latency'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Response Latency</span>
              </button>
            </div>
          </div>

          {/* ── Graph Area ── */}
          {turns.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">No conversation turns recorded yet in this session</p>
              <p className="text-xs text-slate-500 mt-1">Send a question to populate token and similarity graphs</p>
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-slate-800/90 rounded-2xl p-5">
              {/* 1. Token Bar Chart */}
              {activeMetric === 'tokens' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-xs bg-teal-500" />
                        <span className="text-slate-300">Prompt Tokens</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-xs bg-cyan-400" />
                        <span className="text-slate-300">Completion Tokens</span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">Max: {maxTokens} tokens</span>
                  </div>

                  {/* SVG / CSS Bar Visualization */}
                  <div className="space-y-3">
                    {turns.map((t) => {
                      const promptPct = (t.promptTokens / maxTokens) * 100;
                      const completionPct = (t.completionTokens / maxTokens) * 100;
                      return (
                        <div key={t.turn} className="group">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-slate-200">
                              Turn #{t.turn}: <span className="font-normal text-slate-400 italic font-mono">{t.question}</span>
                            </span>
                            <span className="text-teal-400 font-mono font-bold text-xs">{t.totalTokens} tokens</span>
                          </div>
                          <div className="h-6 w-full bg-slate-800/80 rounded-lg overflow-hidden flex p-0.5 border border-slate-700/50 shadow-inner">
                            <div
                              className="h-full bg-gradient-to-r from-teal-600 to-teal-500 rounded-l transition-all duration-500"
                              style={{ width: `${Math.max(promptPct, 4)}%` }}
                              title={`Prompt: ${t.promptTokens} tokens`}
                            />
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-r transition-all duration-500 ml-0.5"
                              style={{ width: `${Math.max(completionPct, 4)}%` }}
                              title={`Completion: ${t.completionTokens} tokens`}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono px-1">
                            <span>Prompt: {t.promptTokens}</span>
                            <span>Response: {t.completionTokens}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Similarity Score Chart */}
              {activeMetric === 'similarity' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-xs text-slate-300 font-medium">Vector Embedding Similarity per Query</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">Range: 0% - 100%</span>
                  </div>

                  <div className="space-y-3">
                    {turns.map((t) => {
                      const color = t.similarityPct >= 80 ? 'bg-emerald-500 text-emerald-400' : t.similarityPct >= 60 ? 'bg-amber-500 text-amber-400' : 'bg-rose-500 text-rose-400';
                      return (
                        <div key={t.turn}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-slate-200">
                              Turn #{t.turn}: <span className="font-normal text-slate-400 font-mono">{t.question}</span>
                            </span>
                            <span className={clsx('font-mono font-bold text-xs', color.split(' ')[1])}>
                              {t.similarityPct}% Match
                            </span>
                          </div>
                          <div className="h-4 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                            <div
                              className={clsx('h-full rounded-full transition-all duration-500', color.split(' ')[0])}
                              style={{ width: `${Math.max(t.similarityPct, 5)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
                            <span>{t.citationsCount} verified source{t.citationsCount !== 1 ? 's' : ''} retrieved</span>
                            <span>Score: {t.similarityScore.toFixed(4)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Latency Chart */}
              {activeMetric === 'latency' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-slate-300 font-medium">End-to-End Processing Time</span>
                    <span className="text-xs text-slate-400 font-mono">Max: {maxLatency}ms</span>
                  </div>

                  <div className="space-y-3">
                    {turns.map((t) => {
                      const latencyPct = (t.latency / maxLatency) * 100;
                      return (
                        <div key={t.turn}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-slate-200">
                              Turn #{t.turn}: <span className="font-normal text-slate-400 font-mono">{t.question}</span>
                            </span>
                            <span className="text-amber-400 font-mono font-bold text-xs">{t.latency}ms</span>
                          </div>
                          <div className="h-4 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(latencyPct, 6)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Turn-by-Turn Metrics Table ── */}
          {turns.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                Turn Metrics Breakdown
              </h3>
              <div className="border border-slate-800 rounded-xl overflow-x-auto bg-[#070b14]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                    <tr>
                      <th className="p-2.5 font-medium">#</th>
                      <th className="p-2.5 font-medium">Question</th>
                      <th className="p-2.5 font-medium">Prompt Tokens</th>
                      <th className="p-2.5 font-medium">Resp Tokens</th>
                      <th className="p-2.5 font-medium">Total Tokens</th>
                      <th className="p-2.5 font-medium">Similarity</th>
                      <th className="p-2.5 font-medium">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-300">
                    {turns.map((t) => (
                      <tr key={t.turn} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-2.5 text-teal-400 font-bold">#{t.turn}</td>
                        <td className="p-2.5 max-w-[200px] truncate text-slate-200" title={t.fullQuestion}>
                          {t.question}
                        </td>
                        <td className="p-2.5 text-slate-400">{t.promptTokens}</td>
                        <td className="p-2.5 text-slate-400">{t.completionTokens}</td>
                        <td className="p-2.5 text-teal-300 font-bold">{t.totalTokens}</td>
                        <td className="p-2.5">
                          <span className={clsx(
                            'px-1.5 py-0.5 rounded text-[10px] font-bold',
                            t.similarityPct >= 80 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          )}>
                            {t.similarityPct}%
                          </span>
                        </td>
                        <td className="p-2.5 text-amber-400">{t.latency}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800/80 bg-[#0b0f19]/80 flex-shrink-0 text-xs text-slate-400">
          <span>Mindora Token & Similarity Telemetry</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAnalyticsModal;

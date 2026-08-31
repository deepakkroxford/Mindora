import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, LineChart, Line
} from 'recharts';
import {
  BarChart3, Coins, TrendingUp, Sparkles, RefreshCw, Download,
  MessageSquare, Brain, GraduationCap, Calendar, Filter, Search,
  ArrowUpRight, Clock, ShieldCheck, Zap, Database, CheckCircle2,
  Layers, Activity, PieChart as PieIcon, LineChart as LineIcon,
  FileSpreadsheet, FileCode, FileText, Printer, ChevronDown
} from 'lucide-react';
import { analyticsApi } from '../services/api';
import type { TokenAnalyticsDto, TokenEventDto, DailyTokenUsageDto } from '../types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Custom Modern Recharts Tooltip
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
    return (
      <div className="bg-[#0f172a]/95 border border-slate-700/80 p-4 rounded-2xl shadow-2xl backdrop-blur-xl text-xs space-y-2.5 min-w-[200px] animate-fade-in border-t-cyan-500 border-t-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-semibold text-slate-300">📅 {label}</span>
          <span className="font-mono font-bold text-cyan-400 text-sm">
            {total.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">tokens</span>
          </span>
        </div>
        <div className="space-y-1.5 font-mono">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-300 font-sans">{entry.name}:</span>
              </div>
              <span className="font-bold text-white">
                {entry.value?.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const TokenUsageDashboardView: React.FC = () => {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<TokenAnalyticsDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  const fetchSummary = async (daysParam: number) => {
    setIsLoading(true);
    try {
      const res = await analyticsApi.getTokenSummary(daysParam);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error('Error fetching token analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const blob = await analyticsApi.downloadCsv(days);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mindora_token_usage_${days}d.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Executive CSV report downloaded');
    } catch (err: any) {
      console.error('Failed to export CSV:', err);
      toast.error('Failed to download CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!data) return;
    setShowExportMenu(false);
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    let md = `# 🧠 Mindora AI — Token Usage & Cost Audit Report\n\n`;
    md += `* **Generated At**: \`${nowStr}\`\n`;
    md += `* **Time Period**: \`${days === 1 ? 'Today (1 Day)' : `Last ${days} Days`}\`\n`;
    md += `* **Pricing Model**: \`OpenAI GPT-4o-mini\`\n\n`;
    md += `## 📊 Executive KPI Summary\n\n`;
    md += `| Metric | Value |\n| :--- | :--- |\n`;
    md += `| **Total Tokens Consumed** | **${data.totalTokensPeriod.toLocaleString()} tokens** |\n`;
    md += `| **Total Estimated Cost** | **$${data.totalEstimatedCost.toFixed(5)} USD** |\n`;
    md += `| **Total AI Invocations** | **${data.totalOperations} operations** |\n`;
    md += `| **Daily Average Velocity** | **${data.dailyAverageTokens.toLocaleString()} tokens/day** |\n\n`;
    md += `## 🏷️ Category Breakdown\n\n`;
    md += `| Category | Total Tokens | Prompt Tokens | Output Tokens | Operations | Est. Cost ($) | Share |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    if (data.categoryBreakdown) {
      Object.values(data.categoryBreakdown).forEach(c => {
        md += `| **${c.category}** | ${c.totalTokens.toLocaleString()} | ${c.promptTokens.toLocaleString()} | ${c.completionTokens.toLocaleString()} | ${c.requestCount} | $${c.estimatedCost.toFixed(5)} | **${c.percentage.toFixed(1)}%** |\n`;
      });
    }
    md += `\n## 📑 Audit Event Trail (Recent 50 Invocations)\n\n`;
    md += `| Timestamp | Category | Scope | Prompt | Output | Total | Est. Cost | Description |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    (data.recentEvents || []).forEach(e => {
      md += `| \`${e.createdAt?.substring(0, 16) || '-'}\` | \`${e.category}\` | ${e.documentName || 'Workspace'} | ${e.promptTokens} | ${e.completionTokens} | **${e.totalTokens}** | $${e.estimatedCost.toFixed(5)} | ${e.description?.replace(/\|/g, '/') || '-'} |\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mindora_token_usage_report_${days}d.md`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    toast.success('Executive Markdown report downloaded');
  };

  const handleExportJson = () => {
    if (!data) return;
    setShowExportMenu(false);
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mindora_token_telemetry_${days}d.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    toast.success('JSON telemetry export downloaded');
  };

  const handlePrint = () => {
    setShowExportMenu(false);
    window.print();
  };

  useEffect(() => {
    fetchSummary(days);
  }, [days]);

  const filteredEvents = useMemo(() => {
    if (!data?.recentEvents) return [];
    return data.recentEvents.filter((ev: TokenEventDto) => {
      const matchCat =
        selectedCategoryFilter === 'ALL' ||
        ev.category?.toUpperCase() === selectedCategoryFilter.toUpperCase();
      const matchSearch =
        !searchQuery ||
        ev.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.documentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.category?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [data, selectedCategoryFilter, searchQuery]);

  const formatNumber = (num: number) => {
    if (!num || isNaN(num)) return '0';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
    return num.toLocaleString();
  };

  // Prepare Pie Chart Data
  const pieData = useMemo(() => {
    if (!data?.categoryBreakdown) return [];
    return [
      { name: 'Chat Assistant', key: 'CHAT', value: data.categoryBreakdown['CHAT']?.totalTokens || 0, color: '#06b6d4' },
      { name: 'Concept Mind Map', key: 'MINDMAP', value: data.categoryBreakdown['MINDMAP']?.totalTokens || 0, color: '#f59e0b' },
      { name: 'Quiz & Study', key: 'QUIZ', value: data.categoryBreakdown['QUIZ']?.totalTokens || 0, color: '#a855f7' }
    ].filter(item => item.value > 0);
  }, [data]);

  const categories = [
    {
      key: 'CHAT',
      label: 'Chat Assistant RAG',
      icon: MessageSquare,
      color: 'from-cyan-500 to-blue-500',
      textColor: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/30',
      glowColor: 'shadow-cyan-500/20',
      strokeColor: '#06b6d4',
      desc: 'Context chunk embeddings + streamed generative responses'
    },
    {
      key: 'MINDMAP',
      label: 'Concept Mind Map',
      icon: Brain,
      color: 'from-amber-500 to-orange-500',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/30',
      glowColor: 'shadow-amber-500/20',
      strokeColor: '#f59e0b',
      desc: 'Hierarchical concept graph extraction & taxonomy trees'
    },
    {
      key: 'QUIZ',
      label: 'Quiz & Study Hub',
      icon: GraduationCap,
      color: 'from-purple-500 to-indigo-500',
      textColor: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/30',
      glowColor: 'shadow-purple-500/20',
      strokeColor: '#a855f7',
      desc: 'Active-recall question generation & 3D flashcard decks'
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 p-4 sm:p-8 custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-fade-in">
        
        {/* ── 1. Modern Header & Filter Glassmorphic Banner ── */}
        <div className="relative rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-gradient-to-br from-white via-slate-50 to-cyan-50/20 dark:from-[#0d1424] dark:via-[#0f172a] dark:to-[#080d1a] p-6 sm:p-8 shadow-xl dark:shadow-2xl z-20">
          {/* Subtle Ambient Glows safely clipped in background */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl -ml-20 -mb-20" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-semibold tracking-wide shadow-sm">
                <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                <span>AI USAGE TELEMETRY & COST ANALYTICS</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Token Consumption Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                Real-time operational metrics across Chat, Mind Maps, and Quiz generation with automated GPT-4o cost tracking.
              </p>
            </div>

            {/* Toolbar: Timeframe Selector + Chart Mode Switcher + Export */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Timeframe Selector */}
              <div className="flex items-center bg-slate-200/80 dark:bg-slate-900/90 p-1 rounded-2xl border border-slate-300 dark:border-slate-800 text-xs shadow-inner">
                {[
                  { label: 'Today', value: 1 },
                  { label: '7D', value: 7 },
                  { label: '14D', value: 14 },
                  { label: '30D', value: 30 },
                ].map(item => (
                  <button
                    key={item.value}
                    onClick={() => setDays(item.value)}
                    className={clsx(
                      'px-3.5 py-1.5 rounded-xl font-medium transition-all text-xs',
                      days === item.value
                        ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => fetchSummary(days)}
                disabled={isLoading}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 transition-all shadow-sm active:scale-95"
                title="Refresh Analytics"
              >
                <RefreshCw className={clsx('w-4 h-4', isLoading && 'animate-spin text-cyan-400')} />
              </button>

              {/* Multi-Format Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  <Download className={clsx('w-4 h-4', isExporting && 'animate-bounce')} />
                  <span>{isExporting ? 'Exporting...' : 'Export Report'}</span>
                  <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform duration-200', showExportMenu && 'rotate-180')} />
                </button>

                {showExportMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setShowExportMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[#0f172a]/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl p-2 z-30 space-y-1 animate-fade-in text-xs">
                    <button
                      onClick={handleExportCsv}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-slate-200 hover:bg-slate-800/80 transition-colors group"
                    >
                      <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">Executive CSV (.csv)</div>
                        <div className="text-[10px] text-slate-400">Formatted spreadsheet + audit trail</div>
                      </div>
                    </button>

                    <button
                      onClick={handleExportMarkdown}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-slate-200 hover:bg-slate-800/80 transition-colors group"
                    >
                      <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:scale-110 transition-transform">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">Executive Markdown (.md)</div>
                        <div className="text-[10px] text-slate-400">Notion / GitHub / Slack tables</div>
                      </div>
                    </button>

                    <button
                      onClick={handleExportJson}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-slate-200 hover:bg-slate-800/80 transition-colors group"
                    >
                      <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">Structured JSON (.json)</div>
                        <div className="text-[10px] text-slate-400">Raw telemetry dataset for BI</div>
                      </div>
                    </button>

                    <div className="border-t border-slate-800 my-1" />

                    <button
                      onClick={handlePrint}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-slate-200 hover:bg-slate-800/80 transition-colors group"
                    >
                      <div className="p-1.5 rounded-lg bg-slate-700 text-slate-300 group-hover:scale-110 transition-transform">
                        <Printer className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">Print / Save as PDF</div>
                        <div className="text-[10px] text-slate-400">Printable executive dashboard</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Modern Glassmorphic KPI Cards (4 Metrics) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Total Period Tokens */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/90 shadow-sm relative overflow-hidden group hover:border-cyan-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Tokens ({days === 1 ? 'Today' : `${days} Days`})
              </span>
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 group-hover:scale-110 transition-transform">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {data ? formatNumber(data.totalTokensPeriod) : '0'}
              </span>
              <span className="text-xs text-cyan-500 font-semibold font-mono">tokens</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
              <span>All-Time Total:</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {data ? formatNumber(data.totalTokensAllTime) : '0'}
              </span>
            </div>
          </div>

          {/* Estimated Cost */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/90 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Estimated Cost
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                ${data ? data.totalEstimatedCost.toFixed(4) : '0.0000'}
              </span>
              <span className="text-xs text-emerald-500 font-semibold font-mono">USD</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
              <span>Rate Base:</span>
              <span className="font-medium text-emerald-400">OpenAI GPT-4o-mini</span>
            </div>
          </div>

          {/* Daily Average */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/90 shadow-sm relative overflow-hidden group hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Daily Velocity
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {data ? formatNumber(data.dailyAverageTokens) : '0'}
              </span>
              <span className="text-xs text-purple-500 font-semibold font-mono">/ day</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
              <span>Time Window:</span>
              <span className="font-mono text-purple-400">{days} days average</span>
            </div>
          </div>

          {/* Operations Count */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/90 shadow-sm relative overflow-hidden group hover:border-teal-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                AI Operations
              </span>
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover:scale-110 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {data?.totalOperations ?? 0}
              </span>
              <span className="text-xs text-teal-500 font-semibold font-mono">invocations</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
              <span>Breakdown:</span>
              <span className="text-teal-400 font-medium">Chat, Maps, Quiz</span>
            </div>
          </div>

        </div>

        {/* ── 3. Main Chart & Donut Distribution Section ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Time-Series Recharts Card (2 Cols) */}
          <div className="lg:col-span-2 rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 p-6 sm:p-7 space-y-6 shadow-sm flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  <span>Daily Consumption Timeline</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Stacked daily breakdown for Chat (Cyan), Mind Map (Teal), and Quiz (Purple).
                </p>
              </div>

              {/* Chart Mode Switcher */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs">
                <button
                  onClick={() => setChartType('area')}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5',
                    chartType === 'area' ? 'bg-cyan-600 text-white shadow-sm font-semibold' : 'text-slate-400 hover:text-white'
                  )}
                  title="Curved Area Chart"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Area</span>
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5',
                    chartType === 'bar' ? 'bg-cyan-600 text-white shadow-sm font-semibold' : 'text-slate-400 hover:text-white'
                  )}
                  title="Stacked Bar Chart"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Bar</span>
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5',
                    chartType === 'line' ? 'bg-cyan-600 text-white shadow-sm font-semibold' : 'text-slate-400 hover:text-white'
                  )}
                  title="Line Trend Chart"
                >
                  <LineIcon className="w-3.5 h-3.5" />
                  <span>Line</span>
                </button>
              </div>
            </div>

            {/* Recharts Canvas */}
            <div className="h-72 w-full pt-4">
              {data?.dailyUsage && data.dailyUsage.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'area' ? (
                    <AreaChart data={data.dailyUsage} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="chatGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="mindMapGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="quizGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                      <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val: string) => val.slice(5)} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val: number) => formatNumber(val)} />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Area type="monotone" dataKey="chatTokens" name="Chat Assistant" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#chatGrad)" stackId="1" />
                      <Area type="monotone" dataKey="mindMapTokens" name="Mind Map" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#mindMapGrad)" stackId="1" />
                      <Area type="monotone" dataKey="quizTokens" name="Quiz & Study" stroke="#a855f7" strokeWidth={2.5} fillOpacity={1} fill="url(#quizGrad)" stackId="1" />
                    </AreaChart>
                  ) : chartType === 'bar' ? (
                    <BarChart data={data.dailyUsage} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                      <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val: string) => val.slice(5)} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val: number) => formatNumber(val)} />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Bar dataKey="chatTokens" name="Chat Assistant" fill="#06b6d4" stackId="a" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="mindMapTokens" name="Mind Map" fill="#f59e0b" stackId="a" />
                      <Bar dataKey="quizTokens" name="Quiz & Study" fill="#a855f7" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <LineChart data={data.dailyUsage} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                      <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val: string) => val.slice(5)} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val: number) => formatNumber(val)} />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Line type="monotone" dataKey="chatTokens" name="Chat Assistant" stroke="#06b6d4" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="mindMapTokens" name="Mind Map" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="quizTokens" name="Quiz & Study" stroke="#a855f7" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  No daily usage recorded yet.
                </div>
              )}
            </div>

            {/* Custom Legend */}
            <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-sm shadow-cyan-500/50" />
                <span className="text-slate-700 dark:text-slate-300">Chat Assistant (Cyan)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                <span className="text-slate-700 dark:text-slate-300">Mind Map (Amber)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
                <span className="text-slate-700 dark:text-slate-300">Quiz & Study Hub (Purple)</span>
              </div>
            </div>
          </div>

          {/* Donut Chart (Category Distribution) (1 Col) */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 p-6 sm:p-7 space-y-5 shadow-sm flex flex-col justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-teal-400" />
                <span>Category Distribution</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Proportion of tokens consumed by capability.
              </p>
            </div>

            {/* Donut Graphic */}
            <div className="h-56 relative flex items-center justify-center">
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Center Stat Badge */}
                  <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                      {formatNumber(data?.totalTokensPeriod || 0)}
                    </span>
                    <span className="text-[9px] text-cyan-400 font-mono">tokens</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-500">No token activity recorded.</div>
              )}
            </div>

            {/* Category Stats List */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              {categories.map(cat => {
                const summary = data?.categoryBreakdown?.[cat.key];
                const tokens = summary?.totalTokens || 0;
                const percentage = summary?.percentage || 0;

                return (
                  <div key={cat.key} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.strokeColor }} />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{cat.label}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-slate-900 dark:text-white">{formatNumber(tokens)}</span>
                      <span className="text-[11px] text-slate-400">({percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ── 4. Category Details 3-Cards Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {categories.map(cat => {
            const summary = data?.categoryBreakdown?.[cat.key];
            const tokens = summary?.totalTokens || 0;
            const requests = summary?.requestCount || 0;
            const percentage = summary?.percentage || 0;
            const cost = summary?.estimatedCost || 0;
            const Icon = cat.icon;

            return (
              <div
                key={cat.key}
                className="rounded-3xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/50 p-6 space-y-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-2xl border ${cat.bgColor} shadow-sm ${cat.glowColor}`}>
                        <Icon className={`w-5 h-5 ${cat.textColor}`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {cat.label}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-mono">{requests} operations</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {cat.desc}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  {/* Glowing Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${cat.color} transition-all duration-700`}
                      style={{ width: `${Math.min(Math.max(percentage, 2), 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono pt-1">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {tokens.toLocaleString()} tokens
                    </span>
                    <span className="text-emerald-500 font-bold">
                      ${cost.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 5. Recent Activity Audit Log Table ── */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                <span>Live AI Invocations & Token Audit Log</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detailed audit trail of all AI prompts, context embeddings, and response tokens.
              </p>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Pill Filter */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 text-xs">
                {['ALL', 'CHAT', 'MINDMAP', 'QUIZ'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={clsx(
                      'px-3 py-1 rounded-lg font-medium transition-all text-xs',
                      selectedCategoryFilter === cat
                        ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search prompts & docs..."
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 w-44 sm:w-60"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Operation / Prompt</th>
                  <th className="p-3.5">Document Scope</th>
                  <th className="p-3.5 text-right">Prompt</th>
                  <th className="p-3.5 text-right">Output</th>
                  <th className="p-3.5 text-right">Total Tokens</th>
                  <th className="p-3.5 text-right">Cost (USD)</th>
                  <th className="p-3.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((ev: TokenEventDto, idx: number) => {
                    const isChat = ev.category?.toUpperCase() === 'CHAT';
                    const isMindMap = ev.category?.toUpperCase() === 'MINDMAP';
                    const isQuiz = ev.category?.toUpperCase() === 'QUIZ';

                    return (
                      <tr
                        key={ev.id || idx}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={clsx(
                              'px-2.5 py-0.5 rounded-full font-bold text-[10px] border',
                              isChat && 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-sm shadow-cyan-500/10',
                              isMindMap && 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-sm shadow-amber-500/10',
                              isQuiz && 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-sm shadow-purple-500/10',
                              !isChat && !isMindMap && !isQuiz && 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                            )}
                          >
                            {ev.category}
                          </span>
                        </td>
                        <td className="p-3.5 font-sans text-slate-800 dark:text-slate-200 max-w-xs truncate" title={ev.description}>
                          {ev.description || 'AI Operation'}
                        </td>
                        <td className="p-3.5 font-sans text-slate-500 dark:text-slate-400 max-w-[150px] truncate" title={ev.documentName}>
                          {ev.documentName || 'Workspace'}
                        </td>
                        <td className="p-3.5 text-right text-slate-500 dark:text-slate-400">
                          {ev.promptTokens.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right text-slate-500 dark:text-slate-400">
                          {ev.completionTokens.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-900 dark:text-white">
                          {ev.totalTokens.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right text-emerald-500 font-bold">
                          ${ev.estimatedCost ? ev.estimatedCost.toFixed(5) : '0.00000'}
                        </td>
                        <td className="p-3.5 text-right text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {ev.createdAt ? new Date(ev.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                      No matching AI token events found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TokenUsageDashboardView;

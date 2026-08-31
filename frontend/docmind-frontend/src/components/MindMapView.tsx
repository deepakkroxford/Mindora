import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Brain, Sparkles, RefreshCw, ZoomIn, ZoomOut, Maximize2,
  ChevronRight, ChevronDown, CheckSquare, Square, FileText,
  MessageSquare, Copy, Check, Info, Layers, Tag, ArrowRight,
  Download, Image as ImageIcon, Code, FileDown, Database,
  Trash2, Clock, Zap, FolderOpen, Calendar
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { mindMapApi } from '../services/api';
import type { MindMapNodeDto, MindMapResponseDto } from '../types';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

// Node positioning layout interface
interface LayoutNode {
  data: MindMapNodeDto;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  collapsed: boolean;
  children: LayoutNode[];
  parent?: LayoutNode;
}

// Category color configurations
const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; glow: string; hex: string }> = {
  'Architecture': {
    bg: 'bg-cyan-500/10 dark:bg-cyan-950/40',
    border: 'border-cyan-500/40',
    text: 'text-cyan-600 dark:text-cyan-300',
    dot: 'bg-cyan-400',
    glow: 'rgba(6, 182, 212, 0.25)',
    hex: '#06b6d4',
  },
  'Security': {
    bg: 'bg-emerald-500/10 dark:bg-emerald-950/40',
    border: 'border-emerald-500/40',
    text: 'text-emerald-600 dark:text-emerald-300',
    dot: 'bg-emerald-400',
    glow: 'rgba(16, 185, 129, 0.25)',
    hex: '#10b981',
  },
  'Data Flow': {
    bg: 'bg-indigo-500/10 dark:bg-indigo-950/40',
    border: 'border-indigo-500/40',
    text: 'text-indigo-600 dark:text-indigo-300',
    dot: 'bg-indigo-400',
    glow: 'rgba(99, 102, 241, 0.25)',
    hex: '#6366f1',
  },
  'Configuration': {
    bg: 'bg-amber-500/10 dark:bg-amber-950/40',
    border: 'border-amber-500/40',
    text: 'text-amber-600 dark:text-amber-300',
    dot: 'bg-amber-400',
    glow: 'rgba(245, 158, 11, 0.25)',
    hex: '#f59e0b',
  },
  'Best Practice': {
    bg: 'bg-purple-500/10 dark:bg-purple-950/40',
    border: 'border-purple-500/40',
    text: 'text-purple-600 dark:text-purple-300',
    dot: 'bg-purple-400',
    glow: 'rgba(168, 85, 247, 0.25)',
    hex: '#a855f7',
  },
  'Performance': {
    bg: 'bg-rose-500/10 dark:bg-rose-950/40',
    border: 'border-rose-500/40',
    text: 'text-rose-600 dark:text-rose-300',
    dot: 'bg-rose-400',
    glow: 'rgba(244, 63, 94, 0.25)',
    hex: '#f43f5e',
  },
  'Core Concept': {
    bg: 'bg-teal-500/10 dark:bg-teal-950/40',
    border: 'border-teal-500/40',
    text: 'text-teal-600 dark:text-teal-300',
    dot: 'bg-teal-400',
    glow: 'rgba(20, 184, 166, 0.25)',
    hex: '#14b8a6',
  },
};

const DEFAULT_CATEGORY_COLOR = {
  bg: 'bg-slate-500/10 dark:bg-slate-800/60',
  border: 'border-slate-400/40',
  text: 'text-slate-700 dark:text-slate-300',
  dot: 'bg-slate-400',
  glow: 'rgba(148, 163, 184, 0.2)',
  hex: '#94a3b8',
};

export const MindMapView: React.FC = () => {
  const {
    documents,
    selectedDocumentIds,
    toggleDocumentSelection,
    selectAllDocuments,
    clearDocumentSelection,
    setActiveTab,
  } = useApp();

  // Data & Loading state
  const [mindMapData, setMindMapData] = useState<MindMapResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [maxDepth, setMaxDepth] = useState<number>(3);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Saved Database Records State
  const [savedMindMaps, setSavedMindMaps] = useState<MindMapResponseDto[]>([]);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  // Interaction State
  const [selectedNode, setSelectedNode] = useState<MindMapNodeDto | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  // Canvas Transform State (Pan & Zoom)
  const [zoom, setZoom] = useState<number>(0.9);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 80, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const isAllSelected = documents.length > 0 && selectedDocumentIds.length === documents.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      clearDocumentSelection();
    } else {
      selectAllDocuments();
    }
  };

  // Fetch Saved Mind Maps from PostgreSQL
  const fetchSavedMindMaps = useCallback(async () => {
    setIsLoadingSaved(true);
    try {
      const response = await mindMapApi.getSavedMindMaps();
      if (response.success && response.data) {
        setSavedMindMaps(response.data);
      }
    } catch {
      // silent
    } finally {
      setIsLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedMindMaps();
  }, [fetchSavedMindMaps]);

  // Generate Mind Map API Call
  const handleGenerateMindMap = useCallback(async () => {
    if (selectedDocumentIds.length === 0) {
      toast.error('Please select at least 1 document (or check "Select All") to generate a mind map.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await mindMapApi.generateMindMap({
        documentIds: selectedDocumentIds,
        maxDepth,
      });

      if (response.success && response.data) {
        setMindMapData(response.data);
        setSelectedNode(response.data.rootNode);
        setCollapsedNodes(new Set());
        setZoom(0.85);
        setPan({ x: 80, y: 200 });
        fetchSavedMindMaps();

        if (response.data.isCached) {
          toast.success('Loaded cached concept map! ⚡ 0 Tokens');
        } else {
          toast.success(`Generated and saved to database! 🧠 (${response.data.tokensUsed || 0} Tokens)`);
        }
      } else {
        toast.error(response.message || 'Failed to generate mind map');
      }
    } catch {
      toast.error('An error occurred while generating mind map.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDocumentIds, maxDepth, fetchSavedMindMaps]);

  // Load a Saved Mind Map from DB
  const handleLoadSavedMap = (map: MindMapResponseDto) => {
    setMindMapData(map);
    setSelectedNode(map.rootNode);
    setCollapsedNodes(new Set());
    setZoom(0.85);
    setPan({ x: 80, y: 200 });
    setShowSavedModal(false);
    toast.success(`Loaded saved mind map: "${map.title}" 💾`);
  };

  // Delete a Saved Mind Map from DB
  const handleDeleteSavedMap = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const resp = await mindMapApi.deleteMindMap(id);
      if (resp.success) {
        setSavedMindMaps((prev) => prev.filter((m) => m.id !== id));
        if (mindMapData?.id === id) {
          setMindMapData(null);
          setSelectedNode(null);
        }
        toast.success('Mind map record deleted from database');
      }
    } catch {
      toast.error('Failed to delete mind map record');
    }
  };

  // Toggle Collapse on a Node
  const toggleCollapse = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Pan Canvas Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.4), 2.2));
  };

  const handleResetZoom = () => {
    setZoom(0.85);
    setPan({ x: 80, y: 200 });
  };

  // Build recursive layout hierarchy coordinates
  const layoutTree = useMemo((): LayoutNode | null => {
    if (!mindMapData || !mindMapData.rootNode) return null;

    const NODE_WIDTH = 230;
    const NODE_HEIGHT = 90;
    const HORIZONTAL_GAP = 140;
    const VERTICAL_GAP = 35;

    let currentY = 0;

    function buildLayout(node: MindMapNodeDto, depth: number): LayoutNode {
      const isCollapsed = collapsedNodes.has(node.id);
      const childLayouts: LayoutNode[] = [];

      if (!isCollapsed && node.children && node.children.length > 0) {
        for (const child of node.children) {
          childLayouts.push(buildLayout(child, depth + 1));
        }
      }

      let nodeY: number;
      if (childLayouts.length === 0) {
        nodeY = currentY;
        currentY += NODE_HEIGHT + VERTICAL_GAP;
      } else {
        const firstChildY = childLayouts[0].y;
        const lastChildY = childLayouts[childLayouts.length - 1].y;
        nodeY = (firstChildY + lastChildY) / 2;
      }

      const nodeX = depth * (NODE_WIDTH + HORIZONTAL_GAP);

      const layoutNode: LayoutNode = {
        data: node,
        x: nodeX,
        y: nodeY,
        width: depth === 0 ? 260 : NODE_WIDTH,
        height: NODE_HEIGHT,
        depth,
        collapsed: isCollapsed,
        children: childLayouts,
      };

      childLayouts.forEach((c) => (c.parent = layoutNode));
      return layoutNode;
    }

    return buildLayout(mindMapData.rootNode, 0);
  }, [mindMapData, collapsedNodes]);

  // Flatten nodes and connections for rendering
  const { allNodes, allLinks } = useMemo(() => {
    if (!layoutTree) return { allNodes: [], allLinks: [] };

    const nodes: LayoutNode[] = [];
    const links: { id: string; from: { x: number; y: number }; to: { x: number; y: number }; category: string }[] = [];

    function traverse(node: LayoutNode) {
      nodes.push(node);
      for (const child of node.children) {
        links.push({
          id: `${node.data.id}->${child.data.id}`,
          from: { x: node.x + node.width, y: node.y + node.height / 2 },
          to: { x: child.x, y: child.y + child.height / 2 },
          category: child.data.category || 'Core Concept',
        });
        traverse(child);
      }
    }

    traverse(layoutTree);
    return { allNodes: nodes, allLinks: links };
  }, [layoutTree]);

  // Helper to generate standalone SVG markup for export
  const generateExportSvgString = useCallback(() => {
    if (!layoutTree || allNodes.length === 0) return null;

    const minX = Math.min(...allNodes.map((n) => n.x)) - 80;
    const minY = Math.min(...allNodes.map((n) => n.y)) - 80;
    const maxX = Math.max(...allNodes.map((n) => n.x + n.width)) + 80;
    const maxY = Math.max(...allNodes.map((n) => n.y + n.height)) + 80;

    const width = Math.max(maxX - minX, 800);
    const height = Math.max(maxY - minY, 500);

    let pathsSvg = '';
    allLinks.forEach((link) => {
      const fromX = link.from.x - minX;
      const fromY = link.from.y - minY;
      const toX = link.to.x - minX;
      const toY = link.to.y - minY;
      const deltaX = toX - fromX;
      const curvature = deltaX * 0.5;
      const d = `M ${fromX} ${fromY} C ${fromX + curvature} ${fromY}, ${toX - curvature} ${toY}, ${toX} ${toY}`;
      pathsSvg += `<path d="${d}" fill="none" stroke="#14b8a6" stroke-width="2.5" stroke-opacity="0.8" />`;
    });

    let nodesSvg = '';
    allNodes.forEach((node) => {
      const nx = node.x - minX;
      const ny = node.y - minY;
      const isRoot = node.depth === 0;
      const color = CATEGORY_COLORS[node.data.category] || DEFAULT_CATEGORY_COLOR;

      const fill = isRoot ? 'url(#rootGrad)' : '#0f172a';
      const stroke = isRoot ? '#2dd4bf' : color.hex;
      const categoryText = (node.data.category || 'Concept').toUpperCase();
      const labelText = node.data.label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      nodesSvg += `
        <g transform="translate(${nx}, ${ny})">
          <rect width="${node.width}" height="${node.height}" rx="16" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />
          ${
            !isRoot
              ? `<text x="14" y="24" fill="${color.hex}" font-size="9" font-weight="700" font-family="system-ui, sans-serif">${categoryText}</text>`
              : ''
          }
          <text x="14" y="${isRoot ? 48 : 50}" fill="#ffffff" font-size="${isRoot ? 14 : 12}" font-weight="700" font-family="system-ui, sans-serif">
            ${labelText.length > 28 ? labelText.substring(0, 26) + '...' : labelText}
          </text>
        </g>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
        <defs>
          <linearGradient id="rootGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#0d9488" />
            <stop offset="100%" stop-color="#0891b2" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="#080d1a" />
        ${pathsSvg}
        ${nodesSvg}
      </svg>
    `.trim();
  }, [layoutTree, allNodes, allLinks]);

  // Download Handlers
  const handleDownloadSvg = () => {
    const svgStr = generateExportSvgString();
    if (!svgStr) return;
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const title = mindMapData?.title?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Concept_MindMap';
    a.href = url;
    a.download = `${title}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
    toast.success('Downloaded Mind Map as SVG! 📐');
  };

  const handleDownloadPng = () => {
    const svgStr = generateExportSvgString();
    if (!svgStr) return;

    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const scale = 2; // 2x Retina Resolution
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        const title = mindMapData?.title?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Concept_MindMap';
        a.href = pngUrl;
        a.download = `${title}.png`;
        a.click();
        toast.success('Downloaded Mind Map as High-Res PNG! 🖼️');
      }
      URL.revokeObjectURL(url);
      setShowDownloadMenu(false);
    };

    img.src = url;
  };

  const handleDownloadMarkdown = () => {
    if (!mindMapData || !mindMapData.rootNode) return;

    function buildMarkdown(node: MindMapNodeDto, indent: number): string {
      const space = '  '.repeat(indent);
      let res = `${space}- **${node.label}** (${node.category || 'Concept'}): ${node.description}\n`;
      if (node.keywords && node.keywords.length > 0) {
        res += `${space}  *Keywords*: ${node.keywords.join(', ')}\n`;
      }
      if (node.children) {
        for (const c of node.children) {
          res += buildMarkdown(c, indent + 1);
        }
      }
      return res;
    }

    const md = `# ${mindMapData.title}\n\n*Generated by Mindora RAG Concept Engine*\n\n` + buildMarkdown(mindMapData.rootNode, 0);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const title = mindMapData?.title?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Concept_MindMap';
    a.href = url;
    a.download = `${title}_Outline.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
    toast.success('Downloaded Markdown Outline (.md)! 📄');
  };

  const handleCopyOutline = () => {
    if (!mindMapData || !mindMapData.rootNode) return;

    function buildMarkdown(node: MindMapNodeDto, indent: number): string {
      const space = '  '.repeat(indent);
      let res = `${space}- **${node.label}** (${node.category || 'Concept'}): ${node.description}\n`;
      if (node.children) {
        for (const c of node.children) {
          res += buildMarkdown(c, indent + 1);
        }
      }
      return res;
    }

    const md = `# ${mindMapData.title}\n\n` + buildMarkdown(mindMapData.rootNode, 0);
    navigator.clipboard.writeText(md);
    setShowDownloadMenu(false);
    toast.success('Concept outline copied to clipboard! 📋');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#080d1a] text-slate-900 dark:text-slate-100">
      
      {/* ── 1. Top Control & Scoping Bar ── */}
      <div className="px-6 py-4 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex-shrink-0 z-10 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 flex-shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  Concept Mind Map & Hierarchy
                </h1>
                {mindMapData && (
                  <>
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-300">
                      {mindMapData.totalNodes} Nodes Synthesized
                    </span>
                    {/* Token Consumption Badge */}
                    <span className={clsx(
                      "text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1",
                      mindMapData.tokensUsed && mindMapData.tokensUsed > 0
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    )}>
                      <Zap className="w-3 h-3" />
                      <span>{mindMapData.tokensUsed && mindMapData.tokensUsed > 0 ? `${mindMapData.tokensUsed.toLocaleString()} Tokens Used` : '0 Tokens (Cached / DB)'}</span>
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Explore structural relationships, sub-mechanisms, and core entities extracted from document vectors.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Saved Mind Maps Button */}
            <button
              onClick={() => {
                fetchSavedMindMaps();
                setShowSavedModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/80 text-xs font-semibold text-purple-700 dark:text-purple-300 transition-colors shadow-sm"
              title="View Persistent Mind Maps in PostgreSQL"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Saved Records ({savedMindMaps.length})</span>
            </button>

            {/* Depth selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-950 rounded-xl p-0.5 border border-slate-200 dark:border-slate-800">
              {[2, 3, 4].map((d) => (
                <button
                  key={d}
                  onClick={() => setMaxDepth(d)}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                    maxDepth === d
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  {d} Levels
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerateMindMap}
              disabled={isLoading || selectedDocumentIds.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 !text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              <span>{isLoading ? 'Synthesizing Graph...' : selectedDocumentIds.length === 0 ? 'Pick Documents' : 'Generate Mind Map'}</span>
            </button>

            {/* Download Dropdown */}
            {mindMapData && (
              <div className="relative">
                <button
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
                  title="Download Mind Map Options"
                >
                  <Download className="w-3.5 h-3.5 text-teal-500" />
                  <span>Download Graph</span>
                  <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                </button>

                {showDownloadMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl py-2 z-40 animate-fade-in glass-panel">
                    <div className="px-3.5 pb-1.5 mb-1 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Export Format
                    </div>

                    <button
                      onClick={handleDownloadPng}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium"
                    >
                      <ImageIcon className="w-4 h-4 text-cyan-500" />
                      <div>
                        <div className="font-semibold">PNG Image (.png)</div>
                        <div className="text-[10px] text-slate-500">High-resolution Retina visual</div>
                      </div>
                    </button>

                    <button
                      onClick={handleDownloadSvg}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium"
                    >
                      <Code className="w-4 h-4 text-teal-500" />
                      <div>
                        <div className="font-semibold">Scalable Vector (.svg)</div>
                        <div className="text-[10px] text-slate-500">Lossless vector graphics</div>
                      </div>
                    </button>

                    <button
                      onClick={handleDownloadMarkdown}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium"
                    >
                      <FileDown className="w-4 h-4 text-indigo-500" />
                      <div>
                        <div className="font-semibold">Markdown File (.md)</div>
                        <div className="text-[10px] text-slate-500">Structured concept breakdown</div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                    <button
                      onClick={handleCopyOutline}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium"
                    >
                      <Copy className="w-4 h-4 text-purple-500" />
                      <span>Copy Outline to Clipboard</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Document Filter Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Master Select All Checkbox */}
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className={clsx(
                'inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-semibold border transition-all',
                isAllSelected
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
              )}
            >
              {isAllSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-white" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>Select All Documents ({documents.length})</span>
            </button>

            {/* Individual Documents */}
            {documents.map((doc) => {
              const isSelected = selectedDocumentIds.includes(doc.id);
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => toggleDocumentSelection(doc.id)}
                  className={clsx(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all cursor-pointer',
                    isSelected
                      ? 'bg-teal-500/15 border-teal-500/50 text-teal-700 dark:text-teal-300 shadow-sm ring-1 ring-teal-500/30'
                      : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  )}
                >
                  {isSelected ? (
                    <CheckSquare className="w-3 h-3 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                  ) : (
                    <Square className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  )}
                  <FileText className="w-3 h-3 opacity-70 flex-shrink-0" />
                  <span className="max-w-[130px] truncate">{doc.filename}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 2. Interactive SVG Canvas & Concept Inspector ── */}
      <div className="flex-1 relative overflow-hidden flex">
        
        {/* Main Canvas Area */}
        <div
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className={clsx(
            'flex-1 h-full w-full relative overflow-hidden select-none',
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          )}
        >
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-25"
            style={{
              backgroundImage: 'radial-gradient(#14b8a6 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
          />

          {/* Floating Zoom & Canvas Controls */}
          <div className="absolute bottom-6 left-6 z-20 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
            <button
              onClick={() => setZoom((prev) => Math.min(prev + 0.15, 2.2))}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold px-2 text-slate-500">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((prev) => Math.max(prev - 0.15, 0.4))}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800 mx-1" />
            <button
              onClick={handleResetZoom}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Reset & Center View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Empty Prompt State */}
          {!isLoading && !mindMapData && selectedDocumentIds.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center p-6 z-10 pointer-events-none">
              <div className="p-8 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md text-center max-w-md space-y-4 pointer-events-auto">
                <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-500">
                  <Brain className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Select Documents to Map Concepts
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pick your documents from the bar above to visualize key concepts, hierarchy, and relationships.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={selectAllDocuments}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 !text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
                  >
                    <CheckSquare className="w-4 h-4 !text-white" />
                    <span>Select All Documents ({documents.length})</span>
                  </button>

                  {savedMindMaps.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        fetchSavedMindMaps();
                        setShowSavedModal(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1.5"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Open Saved Records</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loading Shimmer */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center p-6 z-10 bg-slate-900/20 backdrop-blur-xs">
              <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 text-center space-y-4 shadow-2xl animate-pulse">
                <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto text-teal-500">
                  <Sparkles className="w-7 h-7 animate-spin" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Synthesizing Hierarchical Mind Map...
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                    Extracting core topics, clustering relationships, and saving to database.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SVG Connection Links & Transformed Graph Canvas */}
          {layoutTree && (
            <div
              className="absolute origin-top-left transition-transform duration-75 ease-out"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              }}
            >
              {/* SVG Connecting Bézier Curves */}
              <svg
                ref={svgRef}
                className="absolute top-0 left-0 overflow-visible pointer-events-none"
                style={{ width: '4000px', height: '3000px' }}
              >
                <defs>
                  <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
                  </linearGradient>
                </defs>

                {allLinks.map((link) => {
                  const deltaX = link.to.x - link.from.x;
                  const curvature = deltaX * 0.5;
                  const path = `M ${link.from.x} ${link.from.y} C ${link.from.x + curvature} ${link.from.y}, ${link.to.x - curvature} ${link.to.y}, ${link.to.x} ${link.to.y}`;

                  return (
                    <g key={link.id}>
                      <path
                        d={path}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="text-slate-300 dark:text-slate-700/80 transition-all"
                      />
                      <path
                        d={path}
                        fill="none"
                        stroke="url(#linkGradient)"
                        strokeWidth="2"
                        strokeDasharray="6 4"
                        className="animate-pulse"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Render Nodes */}
              {allNodes.map((node) => {
                const isRoot = node.depth === 0;
                const isSelected = selectedNode?.id === node.data.id;
                const hasChildren = node.data.children && node.data.children.length > 0;
                const isCollapsed = collapsedNodes.has(node.data.id);
                const colorConfig = CATEGORY_COLORS[node.data.category] || DEFAULT_CATEGORY_COLOR;

                return (
                  <div
                    key={node.data.id}
                    onClick={() => setSelectedNode(node.data)}
                    className={clsx(
                      'absolute rounded-2xl border transition-all duration-200 cursor-pointer shadow-lg select-none group',
                      isRoot
                        ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white border-teal-400 shadow-teal-500/20'
                        : clsx(
                            'bg-white dark:bg-slate-900/90',
                            colorConfig.border,
                            isSelected
                              ? 'ring-2 ring-teal-500 shadow-xl scale-[1.02]'
                              : 'hover:scale-[1.02] hover:shadow-xl'
                          )
                    )}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: `${node.width}px`,
                      minHeight: `${node.height}px`,
                    }}
                  >
                    <div className="p-3.5 space-y-1.5 relative">
                      {/* Node Header Row */}
                      <div className="flex items-center justify-between gap-2">
                        {!isRoot && (
                          <span
                            className={clsx(
                              'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                              colorConfig.bg,
                              colorConfig.text,
                              colorConfig.border
                            )}
                          >
                            {node.data.category || 'Concept'}
                          </span>
                        )}

                        {/* Collapse / Expand Badge */}
                        {hasChildren && (
                          <button
                            onClick={(e) => toggleCollapse(node.data.id, e)}
                            className={clsx(
                              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ml-auto',
                              isRoot
                                ? 'bg-white/20 hover:bg-white/30 text-white border-white/40'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            )}
                            title={isCollapsed ? 'Expand branch' : 'Collapse branch'}
                          >
                            {isCollapsed ? '+' : '−'}
                          </button>
                        )}
                      </div>

                      {/* Node Title */}
                      <h4
                        className={clsx(
                          'text-xs font-bold leading-snug line-clamp-2',
                          isRoot ? 'text-white text-sm' : 'text-slate-900 dark:text-slate-100'
                        )}
                      >
                        {node.data.label}
                      </h4>

                      {/* Child count preview pill */}
                      {hasChildren && isCollapsed && (
                        <div className="pt-1">
                          <span className="text-[10px] font-mono text-teal-500 font-bold">
                            +{node.data.children?.length} sub-branches hidden
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 3. Concept Deep-Dive Side Inspector Sheet ── */}
        {selectedNode && (
          <div className="w-80 sm:w-96 bg-white/95 dark:bg-[#0d1526]/95 backdrop-blur-xl border-l border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-2xl z-30 animate-fade-in custom-scrollbar overflow-y-auto">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span
                    className={clsx(
                      'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border inline-block',
                      CATEGORY_COLORS[selectedNode.category]?.bg || DEFAULT_CATEGORY_COLOR.bg,
                      CATEGORY_COLORS[selectedNode.category]?.text || DEFAULT_CATEGORY_COLOR.text,
                      CATEGORY_COLORS[selectedNode.category]?.border || DEFAULT_CATEGORY_COLOR.border
                    )}
                  >
                    {selectedNode.category || 'Core Concept'}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                    {selectedNode.label}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              {/* Description Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400">
                  <Info className="w-3.5 h-3.5" />
                  <span>Concept Overview</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedNode.description}
                </p>
              </div>

              {/* Keywords / Entity Tags */}
              {selectedNode.keywords && selectedNode.keywords.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Tag className="w-3.5 h-3.5 text-teal-500" />
                    <span>Key Entities & Terms</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedNode.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 text-xs font-mono font-medium"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Child Nodes List */}
              {selectedNode.children && selectedNode.children.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Layers className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Sub-Components ({selectedNode.children.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedNode.children.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedNode(c)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-teal-50 dark:hover:bg-teal-950/30 border border-slate-200 dark:border-slate-800 text-left transition-colors group"
                      >
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-300 truncate">
                          {c.label}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 1-Click Action: Ask AI about this concept */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <button
                onClick={() => {
                  setActiveTab('chat');
                  toast.success(`Switched to Chat! Ask about "${selectedNode.label}" 💬`);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 !text-white text-xs font-bold shadow-lg shadow-teal-600/25 transition-all active:scale-98"
              >
                <MessageSquare className="w-4 h-4 !text-white" />
                <span>Ask AI About This Concept</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── 4. Saved Mind Maps Modal ── */}
      {showSavedModal && (
        <div
          onClick={() => setShowSavedModal(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Saved Mind Maps (PostgreSQL)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Revisit any previously synthesized concept map instantly.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSavedModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Modal Body List */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
              {isLoadingSaved ? (
                <div className="text-center py-12 space-y-2">
                  <RefreshCw className="w-6 h-6 text-purple-500 animate-spin mx-auto" />
                  <p className="text-xs text-slate-500">Loading saved records...</p>
                </div>
              ) : savedMindMaps.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <FolderOpen className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Saved Records Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Generate your first Concept Mind Map and it will automatically be saved to PostgreSQL here!
                  </p>
                </div>
              ) : (
                savedMindMaps.map((map) => {
                  const dateStr = map.createdAt
                    ? new Date(map.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Saved';

                  return (
                    <div
                      key={map.id}
                      onClick={() => handleLoadSavedMap(map)}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 bg-slate-50/60 dark:bg-slate-950/40 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-all cursor-pointer flex items-center justify-between gap-4 group"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {map.title}
                          </h4>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                            {map.totalNodes} Nodes
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{dateStr}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3 text-teal-500" />
                            <span>
                              {map.documentNames && map.documentNames.length > 0
                                ? map.documentNames.join(', ')
                                : 'Knowledge Base'}
                            </span>
                          </span>
                          {map.tokensUsed !== undefined && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-mono">
                                <Zap className="w-3 h-3" />
                                <span>{map.tokensUsed.toLocaleString()} tokens</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => handleDeleteSavedMap(map.id!, e)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                          title="Delete saved record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleLoadSavedMap(map)}
                          className="px-3.5 py-1.5 rounded-xl bg-teal-600 group-hover:bg-teal-500 text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-1"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MindMapView;

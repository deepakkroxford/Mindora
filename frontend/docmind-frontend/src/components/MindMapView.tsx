import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng, toSvg } from 'html-to-image';
import {
  Brain, Sparkles, RefreshCw, ZoomIn, ZoomOut, Maximize2,
  ChevronRight, ChevronDown, CheckSquare, Square, FileText,
  MessageSquare, Copy, Check, Info, Layers, Tag, ArrowRight,
  Download, Image as ImageIcon, Code, FileDown, Database,
  Trash2, Clock, Zap, FolderOpen, Calendar, Compass, Move,
  Network, Sliders, CheckCircle2, Save, Edit3, Plus, X,
  AlertCircle, PanelLeftOpen, PanelLeftClose
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { mindMapApi } from '../services/api';
import type { MindMapNodeDto, MindMapResponseDto } from '../types';
import CustomConceptNode from './graph/CustomConceptNode';
import type { ConceptNodeData } from './graph/CustomConceptNode';
import { getLayoutedElements } from '../utils/graphLayout';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const nodeTypes = {
  conceptNode: CustomConceptNode,
};

const CATEGORIES = [
  'Architecture',
  'Security',
  'Data Flow',
  'Configuration',
  'Performance',
  'Best Practice',
  'Core Topic',
  'Concept'
];

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
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDocSidebarOpen, setIsDocSidebarOpen] = useState(false);
  const [maxDepth, setMaxDepth] = useState<number>(3);
  const [layoutDirection, setLayoutDirection] = useState<'LR' | 'TB'>('LR');
  const [edgeType, setEdgeType] = useState<'smoothstep' | 'default' | 'straight'>('smoothstep');

  // Saved Database Records State
  const [savedMindMaps, setSavedMindMaps] = useState<MindMapResponseDto[]>([]);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Interaction & Node Editing State
  const [selectedNode, setSelectedNode] = useState<ConceptNodeData | null>(null);
  const [isEditingNode, setIsEditingNode] = useState(false);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Edit Form Fields
  const [editLabel, setEditLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editKeywords, setEditKeywords] = useState<string[]>([]);
  const [newKeywordInput, setNewKeywordInput] = useState('');

  // Add Child Form Fields
  const [childLabel, setChildLabel] = useState('');
  const [childDescription, setChildDescription] = useState('');
  const [childCategory, setChildCategory] = useState('Concept');

  // React Flow State
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Fetch Saved Mind Maps from Database
  const fetchSavedMindMaps = async () => {
    setIsLoadingSaved(true);
    try {
      const res = await mindMapApi.getSavedMindMaps();
      if (res.success && res.data) {
        setSavedMindMaps(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load saved mind maps:', err);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  useEffect(() => {
    fetchSavedMindMaps();
  }, []);

  // When a node is selected, initialize the edit form
  useEffect(() => {
    if (selectedNode) {
      setEditLabel(selectedNode.label || '');
      setEditDescription(selectedNode.description || '');
      setEditCategory(selectedNode.category || 'Concept');
      setEditKeywords(selectedNode.keywords ? [...selectedNode.keywords] : []);
      setIsEditingNode(false);
      setIsAddingChild(false);
    }
  }, [selectedNode]);

  // Toggle Collapse on a Node
  const handleToggleCollapse = useCallback((nodeId: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Select Node for Inspector Drawer
  const handleSelectNode = useCallback((nodeData: ConceptNodeData) => {
    setSelectedNode(nodeData);
  }, []);

  // Transform hierarchical MindMap tree to React Flow Elements
  const rawGraphElements = useMemo(() => {
    if (!mindMapData?.rootNode) return { nodes: [], edges: [] };

    const nodesList: Node[] = [];
    const edgesList: Edge[] = [];

    const traverse = (node: MindMapNodeDto, parentId?: string, isRoot = false) => {
      const isCollapsed = collapsedNodes.has(node.id);
      const hasChildren = !!(node.children && node.children.length > 0);

      nodesList.push({
        id: node.id,
        type: 'conceptNode',
        position: { x: 0, y: 0 },
        data: {
          id: node.id,
          label: node.label,
          description: node.description,
          category: node.category || (isRoot ? 'Core Topic' : 'Concept'),
          keywords: node.keywords || [],
          isRoot,
          hasChildren,
          childCount: node.children ? node.children.length : 0,
          isCollapsed,
          onToggleCollapse: handleToggleCollapse,
          onSelectNode: handleSelectNode,
        },
      });

      if (parentId) {
        edgesList.push({
          id: `e-${parentId}-${node.id}`,
          source: parentId,
          target: node.id,
          type: edgeType,
          animated: true,
          style: { stroke: isRoot ? '#14b8a6' : '#06b6d4', strokeWidth: 2 },
        });
      }

      if (hasChildren && !isCollapsed) {
        node.children!.forEach((child) => traverse(child, node.id, false));
      }
    };

    traverse(mindMapData.rootNode, undefined, true);
    return { nodes: nodesList, edges: edgesList };
  }, [mindMapData, collapsedNodes, edgeType, handleToggleCollapse, handleSelectNode]);

  // Apply Dagre Auto-Layout
  useEffect(() => {
    if (rawGraphElements.nodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const layouted = getLayoutedElements(
      rawGraphElements.nodes,
      rawGraphElements.edges,
      layoutDirection
    );
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [rawGraphElements, layoutDirection, setNodes, setEdges]);

  // Generate Mind Map Handler
  const handleGenerateMindMap = async () => {
    if (selectedDocumentIds.length === 0) {
      toast.error('Please select at least one document to generate a Knowledge Graph.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await mindMapApi.generateMindMap({
        documentIds: selectedDocumentIds,
        maxDepth,
      });

      if (res.success && res.data) {
        setMindMapData(res.data);
        setCollapsedNodes(new Set());
        setSelectedNode(null);
        setHasUnsavedChanges(false);
        if (res.data.isCached) {
          toast.success('Retrieved instant Knowledge Graph (Redis Cache Hit)!');
        } else {
          toast.success(`Generated interactive Knowledge Graph with ${res.data.totalNodes} concept nodes!`);
        }
        fetchSavedMindMaps();
      } else {
        toast.error(res.message || 'Failed to generate Knowledge Graph.');
      }
    } catch (err: any) {
      console.error('Error generating mind map:', err);
      toast.error(err.response?.data?.message || 'Error generating Knowledge Graph.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save or Update Knowledge Graph in PostgreSQL Vault
  const handleSaveToVault = async () => {
    if (!mindMapData || !mindMapData.rootNode) {
      toast.error('No knowledge graph to save.');
      return;
    }

    setIsSaving(true);
    try {
      let res;
      if (mindMapData.id) {
        // Update existing record
        res = await mindMapApi.updateMindMap(mindMapData.id, mindMapData);
      } else {
        // Save as new record
        res = await mindMapApi.saveMindMap(mindMapData);
      }

      if (res.success && res.data) {
        setMindMapData(res.data);
        setHasUnsavedChanges(false);
        toast.success(`Knowledge Graph saved to Vault!`);
        fetchSavedMindMaps();
      } else {
        toast.error(res.message || 'Failed to save to vault.');
      }
    } catch (err: any) {
      console.error('Save to vault error:', err);
      toast.error('Failed to save Knowledge Graph to vault.');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper: Recursively update node in tree
  const updateNodeInTree = (
    root: MindMapNodeDto,
    targetId: string,
    updated: Partial<MindMapNodeDto>
  ): MindMapNodeDto => {
    if (root.id === targetId) {
      return { ...root, ...updated };
    }
    if (!root.children || root.children.length === 0) {
      return root;
    }
    return {
      ...root,
      children: root.children.map((c) => updateNodeInTree(c, targetId, updated)),
    };
  };

  // Helper: Recursively add child node
  const addChildInTree = (
    root: MindMapNodeDto,
    parentId: string,
    newChild: MindMapNodeDto
  ): MindMapNodeDto => {
    if (root.id === parentId) {
      const existing = root.children || [];
      return {
        ...root,
        children: [...existing, newChild],
      };
    }
    if (!root.children || root.children.length === 0) {
      return root;
    }
    return {
      ...root,
      children: root.children.map((c) => addChildInTree(c, parentId, newChild)),
    };
  };

  // Helper: Recursively delete node
  const deleteNodeInTree = (
    root: MindMapNodeDto,
    targetId: string
  ): MindMapNodeDto | null => {
    if (root.id === targetId) return null;
    if (!root.children || root.children.length === 0) return root;

    const filtered = root.children
      .map((c) => deleteNodeInTree(c, targetId))
      .filter((c): c is MindMapNodeDto => c !== null);

    return {
      ...root,
      children: filtered,
    };
  };

  // Helper: Count total nodes
  const countTotalNodes = (root: MindMapNodeDto): number => {
    let count = 1;
    if (root.children) {
      root.children.forEach((c) => {
        count += countTotalNodes(c);
      });
    }
    return count;
  };

  // Apply Node Edits to Graph
  const handleApplyNodeEdit = () => {
    if (!mindMapData?.rootNode || !selectedNode) return;

    const updatedRoot = updateNodeInTree(mindMapData.rootNode, selectedNode.id, {
      label: editLabel.trim() || selectedNode.label,
      description: editDescription.trim(),
      category: editCategory,
      keywords: editKeywords,
    });

    const updatedData: MindMapResponseDto = {
      ...mindMapData,
      rootNode: updatedRoot,
      totalNodes: countTotalNodes(updatedRoot),
    };

    setMindMapData(updatedData);
    setHasUnsavedChanges(true);
    setIsEditingNode(false);

    // Update selectedNode state
    setSelectedNode({
      ...selectedNode,
      label: editLabel.trim() || selectedNode.label,
      description: editDescription.trim(),
      category: editCategory,
      keywords: editKeywords,
    });

    toast.success('Concept updated on canvas. Click "Save to Vault" to persist changes.');
  };

  // Add Child Node to Selected Concept
  const handleAddChildToSelected = () => {
    if (!mindMapData?.rootNode || !selectedNode || !childLabel.trim()) return;

    const newChildNode: MindMapNodeDto = {
      id: `custom-node-${Date.now()}`,
      label: childLabel.trim(),
      description: childDescription.trim() || 'Custom added concept note.',
      category: childCategory,
      keywords: [],
      children: [],
    };

    const updatedRoot = addChildInTree(mindMapData.rootNode, selectedNode.id, newChildNode);

    const updatedData: MindMapResponseDto = {
      ...mindMapData,
      rootNode: updatedRoot,
      totalNodes: countTotalNodes(updatedRoot),
    };

    setMindMapData(updatedData);
    setHasUnsavedChanges(true);
    setIsAddingChild(false);
    setChildLabel('');
    setChildDescription('');

    // Ensure branch is expanded to see new child
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      next.delete(selectedNode.id);
      return next;
    });

    toast.success(`Added sub-concept "${newChildNode.label}" to graph!`);
  };

  // Delete Selected Node Branch
  const handleDeleteSelectedNode = () => {
    if (!mindMapData?.rootNode || !selectedNode) return;
    if (selectedNode.isRoot) {
      toast.error('Cannot delete root core topic node.');
      return;
    }

    const updatedRoot = deleteNodeInTree(mindMapData.rootNode, selectedNode.id);
    if (!updatedRoot) return;

    const updatedData: MindMapResponseDto = {
      ...mindMapData,
      rootNode: updatedRoot,
      totalNodes: countTotalNodes(updatedRoot),
    };

    setMindMapData(updatedData);
    setSelectedNode(null);
    setHasUnsavedChanges(true);
    toast.success('Concept node removed from graph.');
  };

  // Delete Saved Mind Map Record
  const handleDeleteMindMap = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await mindMapApi.deleteMindMap(id);
      if (res.success) {
        toast.success('Knowledge Graph removed from vault.');
        setSavedMindMaps((prev) => prev.filter((m) => m.id !== id));
        if (mindMapData?.id === id) {
          setMindMapData(null);
          setSelectedNode(null);
          setHasUnsavedChanges(false);
        }
      }
    } catch (err: any) {
      toast.error('Failed to delete Knowledge Graph.');
    }
  };

  // Export Canvas as High-Res PNG
  const handleExportPng = async () => {
    if (!reactFlowWrapper.current) return;
    setShowExportMenu(false);
    try {
      const dataUrl = await toPng(reactFlowWrapper.current, {
        backgroundColor: '#070b14',
        quality: 1,
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `${mindMapData?.title || 'mindora_knowledge_graph'}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Exported high-resolution Knowledge Graph PNG');
    } catch (err) {
      console.error('Export PNG failed:', err);
      toast.error('Failed to export PNG');
    }
  };

  // Export Markdown Taxonomy
  const handleExportMarkdown = () => {
    if (!mindMapData?.rootNode) return;
    setShowExportMenu(false);

    let md = `# 🧠 ${mindMapData.title || 'Mindora Knowledge Graph'}\n\n`;
    md += `* **Documents**: ${mindMapData.documentNames?.join(', ') || 'All Library'}\n`;
    md += `* **Total Nodes**: ${mindMapData.totalNodes}\n`;
    md += `* **Generated At**: ${new Date(mindMapData.createdAt).toLocaleString()}\n\n---\n\n`;

    const traverse = (node: MindMapNodeDto, depth = 0) => {
      const indent = '  '.repeat(depth);
      md += `${indent}- **${node.label}** (${node.category || 'Concept'})\n`;
      if (node.description) {
        md += `${indent}  > ${node.description}\n`;
      }
      if (node.keywords && node.keywords.length > 0) {
        md += `${indent}  *Tags*: \`#${node.keywords.join('` `#')}\`\n`;
      }
      if (node.children) {
        node.children.forEach((child) => traverse(child, depth + 1));
      }
    };

    traverse(mindMapData.rootNode, 0);

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${mindMapData.title || 'knowledge_graph'}_taxonomy.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success('Exported Markdown taxonomy outline');
  };

  // Launch 1-Click AI Query in Chat
  const handleAskAiAboutConcept = (conceptLabel: string) => {
    const prompt = `Can you explain "${conceptLabel}" in detail based on the indexed documents, its core architecture, and how it connects to surrounding systems?`;
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
    toast.success('Prompt copied! Switching to Chat Assistant...');
    setActiveTab('chat');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#070b14] overflow-hidden">
      
      {/* ── Top Header & Config Glassmorphic Toolbar ── */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0d1424]/90 backdrop-blur-xl px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 z-20">
        
        {/* Title & Stats */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white flex-shrink-0">
            <Network className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                Interactive Knowledge Graph
              </h1>
              {hasUnsavedChanges && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-bold uppercase tracking-wider font-mono animate-pulse">
                  Unsaved Edits
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md">
              {mindMapData ? `${mindMapData.title} • ${mindMapData.totalNodes} Nodes` : 'Select documents and generate a concept network.'}
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* Scope Documents Collapsible Toggle */}
          <button
            onClick={() => setIsDocSidebarOpen(!isDocSidebarOpen)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-sm',
              isDocSidebarOpen
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-teal-500/10'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            )}
            title="Toggle Scope Documents Sidebar"
          >
            {isDocSidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5 text-teal-400" /> : <PanelLeftOpen className="w-3.5 h-3.5 text-teal-400" />}
            <span>Scope ({selectedDocumentIds.length})</span>
          </button>

          {/* Saved Maps Vault Button */}
          <button
            onClick={() => setShowSavedModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all shadow-sm"
          >
            <FolderOpen className="w-3.5 h-3.5 text-teal-400" />
            <span>Vault ({savedMindMaps.length})</span>
          </button>

          {/* 💾 Save to Vault Button */}
          {mindMapData && (
            <button
              onClick={handleSaveToVault}
              disabled={isSaving}
              className={clsx(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm active:scale-95',
                hasUnsavedChanges
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white border-amber-400/50 shadow-amber-500/20 animate-pulse'
                  : 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border-teal-500/30'
              )}
              title="Save current knowledge graph to PostgreSQL Vault"
            >
              <Save className={clsx('w-3.5 h-3.5', isSaving && 'animate-spin')} />
              <span>{isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved to Vault'}</span>
            </button>
          )}

          {/* Layout Switcher (LR vs TB) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 rounded-xl p-1 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setLayoutDirection('LR')}
              className={clsx(
                'px-2.5 py-1 rounded-lg font-medium transition-all text-xs flex items-center gap-1',
                layoutDirection === 'LR'
                  ? 'bg-teal-600 text-white font-semibold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
              title="Horizontal Tree Layout (Left to Right)"
            >
              <ArrowRight className="w-3 h-3" />
              <span>Horizontal</span>
            </button>
            <button
              onClick={() => setLayoutDirection('TB')}
              className={clsx(
                'px-2.5 py-1 rounded-lg font-medium transition-all text-xs flex items-center gap-1',
                layoutDirection === 'TB'
                  ? 'bg-teal-600 text-white font-semibold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
              title="Vertical Tree Layout (Top to Bottom)"
            >
              <ChevronDown className="w-3 h-3" />
              <span>Vertical</span>
            </button>
          </div>

          {/* Depth Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Depth:</span>
            <select
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              className="bg-transparent font-bold text-teal-600 dark:text-teal-400 outline-none cursor-pointer"
            >
              <option value={2} className="bg-slate-900 text-white">2 (Macro)</option>
              <option value={3} className="bg-slate-900 text-white">3 (Standard)</option>
              <option value={4} className="bg-slate-900 text-white">4 (Deep Graph)</option>
            </select>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateMindMap}
            disabled={isLoading || selectedDocumentIds.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Sparkles className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
            <span>{isLoading ? 'Synthesizing...' : 'Generate Graph'}</span>
          </button>

          {/* Export Dropdown */}
          {mindMapData && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-all shadow-sm"
                title="Export Knowledge Graph"
              >
                <Download className="w-4 h-4 text-teal-400" />
              </button>

              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#0f172a]/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl p-2 z-30 space-y-1 animate-fade-in text-xs">
                    <button
                      onClick={handleExportPng}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      <ImageIcon className="w-4 h-4 text-teal-400" />
                      <div>
                        <div className="font-semibold text-white">Export High-Res PNG</div>
                        <div className="text-[10px] text-slate-400">Full 2x canvas snapshot</div>
                      </div>
                    </button>
                    <button
                      onClick={handleExportMarkdown}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      <Code className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="font-semibold text-white">Export Markdown Outline</div>
                        <div className="text-[10px] text-slate-400">Hierarchical taxonomy tree</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Main Canvas & Sidebar Container ── */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Document Selection Collapsible Drawer Panel */}
        {isDocSidebarOpen && (
          <div className="w-72 border-r border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0a0f1d]/95 backdrop-blur-xl p-4 flex flex-col justify-between z-10 animate-fade-in shadow-2xl">
            <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-teal-400" />
                  <span>Scope Docs ({selectedDocumentIds.length})</span>
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    onClick={selectAllDocuments}
                    className="text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                  >
                    All
                  </button>
                  <span className="text-slate-400">•</span>
                  <button
                    onClick={clearDocumentSelection}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setIsDocSidebarOpen(false)}
                    className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white ml-1"
                    title="Minimize Scope Panel"
                  >
                    <PanelLeftClose className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Document Checkbox List */}
              <div className="space-y-1.5">
                {documents.map((doc) => {
                  const isSelected = selectedDocumentIds.includes(doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => toggleDocumentSelection(doc.id)}
                      className={clsx(
                        'p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 text-xs',
                        isSelected
                          ? 'bg-teal-500/10 border-teal-500/40 text-slate-900 dark:text-white shadow-sm'
                          : 'bg-white/40 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                      )}
                    >
                      <div className={clsx('flex-shrink-0', isSelected ? 'text-teal-500' : 'text-slate-400')}>
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </div>
                      <span className="truncate font-medium flex-1" title={doc.filename}>
                        {doc.filename}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Stats in Drawer */}
            {mindMapData && (
              <div className="p-3.5 rounded-2xl bg-teal-950/20 border border-teal-500/30 space-y-2 mt-4 text-[11px]">
                <div className="flex items-center justify-between text-teal-400 font-bold">
                  <span>Network Statistics</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono">
                  <div>Nodes: <span className="text-white font-bold">{mindMapData.totalNodes}</span></div>
                  <div>Tokens: <span className="text-white font-bold">{mindMapData.tokensUsed}</span></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── React Flow Interactive Canvas ── */}
        <div ref={reactFlowWrapper} className="flex-1 h-full w-full relative bg-[#070b14]">
          {nodes.length > 0 ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.2}
              maxZoom={2.5}
              proOptions={{ hideAttribution: true }}
              className="dark"
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#1e293b" />
              <Controls className="!bg-[#0f172a]/90 !border-slate-700 !shadow-xl !rounded-2xl !p-1 !text-slate-200" />
              <MiniMap
                nodeColor={(n) => (n.data?.isRoot ? '#14b8a6' : '#06b6d4')}
                maskColor="rgba(7, 11, 20, 0.75)"
                className="!bg-[#0d1424]/90 !border !border-slate-800 !rounded-2xl !shadow-2xl overflow-hidden"
              />

              {/* Top-Right Canvas Info Overlay */}
              <Panel position="top-right" className="bg-[#0f172a]/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-[11px] text-slate-400 font-mono space-y-0.5 shadow-lg">
                <div className="flex items-center gap-2 text-teal-400 font-bold">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Interactive Node Canvas</span>
                </div>
                <div>Drag nodes • Double-click node to edit • Zoom freely</div>
              </Panel>
            </ReactFlow>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-xl shadow-teal-500/10">
                <Network className="w-8 h-8 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-white">No Knowledge Graph Generated Yet</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Select documents on the left sidebar and click <strong>Generate Graph</strong> to construct an interactive concept network.
                </p>
              </div>
              <button
                onClick={handleGenerateMindMap}
                disabled={isLoading || selectedDocumentIds.length === 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-teal-500/20 transition-all hover:scale-105"
              >
                Synthesize Graph Now
              </button>
            </div>
          )}

          {/* ── Concept Inspector & Node Editor Side Drawer ── */}
          {selectedNode && (
            <div className="absolute top-4 right-4 bottom-4 w-84 sm:w-96 rounded-3xl bg-[#0d1424]/95 border border-slate-700/80 shadow-2xl backdrop-blur-2xl p-6 z-20 flex flex-col justify-between animate-fade-in text-xs space-y-4 overflow-y-auto custom-scrollbar">
              
              {/* EDIT MODE */}
              {isEditingNode ? (
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-teal-400" />
                      <h2 className="text-sm font-bold text-white">Edit Concept Node</h2>
                    </div>
                    <button
                      onClick={() => setIsEditingNode(false)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Concept Label */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Concept Title</label>
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  {/* Category Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Category Pillar</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-teal-400 text-xs focus:outline-none focus:border-teal-500"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Description</label>
                    <textarea
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  {/* Keywords Tag Manager */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Semantic Tags</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {editKeywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-teal-300 font-mono text-[10px] flex items-center gap-1"
                        >
                          #{kw}
                          <button
                            onClick={() => setEditKeywords(editKeywords.filter((_, idx) => idx !== i))}
                            className="hover:text-rose-400"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newKeywordInput}
                        onChange={(e) => setNewKeywordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newKeywordInput.trim()) {
                            e.preventDefault();
                            if (!editKeywords.includes(newKeywordInput.trim())) {
                              setEditKeywords([...editKeywords, newKeywordInput.trim()]);
                            }
                            setNewKeywordInput('');
                          }
                        }}
                        placeholder="Type tag & press Enter..."
                        className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  {/* Apply / Cancel Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={handleApplyNodeEdit}
                      className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow-md shadow-teal-600/20"
                    >
                      Apply to Canvas
                    </button>
                    <button
                      onClick={() => setIsEditingNode(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : isAddingChild ? (
                /* ADD CHILD SUB-CONCEPT MODE */
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-cyan-400" />
                      <h2 className="text-sm font-bold text-white">Add Sub-Concept</h2>
                    </div>
                    <button
                      onClick={() => setIsAddingChild(false)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                    Adding child node under <strong className="text-teal-400">"{selectedNode.label}"</strong>
                  </div>

                  {/* Concept Label */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Sub-Concept Title</label>
                    <input
                      type="text"
                      value={childLabel}
                      onChange={(e) => setChildLabel(e.target.value)}
                      placeholder="e.g. Distributed Lock Mechanism"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Category Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Category</label>
                    <select
                      value={childCategory}
                      onChange={(e) => setChildCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-teal-400 text-xs focus:outline-none focus:border-cyan-500"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Description / Notes</label>
                    <textarea
                      rows={3}
                      value={childDescription}
                      onChange={(e) => setChildDescription(e.target.value)}
                      placeholder="What this concept does..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Add / Cancel Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={handleAddChildToSelected}
                      disabled={!childLabel.trim()}
                      className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-md shadow-cyan-600/20 disabled:opacity-50"
                    >
                      Add Node
                    </button>
                    <button
                      onClick={() => setIsAddingChild(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* VIEW / INSPECT MODE */
                <div className="space-y-4 flex-1">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="space-y-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[10px] font-bold uppercase tracking-wider font-mono">
                        {selectedNode.category || 'Concept Node'}
                      </span>
                      <h2 className="text-base font-black text-white leading-tight">
                        {selectedNode.label}
                      </h2>
                    </div>
                    <button
                      onClick={() => setSelectedNode(null)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Actions Toolbar: Edit Node, Add Child, Delete */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditingNode(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold transition-colors"
                      title="Edit Node Title, Description, and Category"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                      <span>Edit Node</span>
                    </button>

                    <button
                      onClick={() => setIsAddingChild(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold transition-colors"
                      title="Add child concept node"
                    >
                      <Plus className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Add Child</span>
                    </button>

                    {!selectedNode.isRoot && (
                      <button
                        onClick={handleDeleteSelectedNode}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                        title="Delete this branch from graph"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Concept Description</span>
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                      {selectedNode.description || 'No detailed description available.'}
                    </p>
                  </div>

                  {/* Keywords Tags */}
                  {selectedNode.keywords && selectedNode.keywords.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-teal-400" />
                        <span>Associated Semantic Tags</span>
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {selectedNode.keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700/80 text-teal-300 font-mono text-[11px]"
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 1-Click AI Assistant Launcher */}
              {!isEditingNode && !isAddingChild && (
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <button
                    onClick={() => handleAskAiAboutConcept(selectedNode.label)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{copiedPrompt ? 'Prompt Copied! Opening...' : 'Ask AI About This Concept'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* ── Saved Mind Maps Vault Modal ── */}
      {showSavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-[#0d1424] border border-slate-700 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Knowledge Graph Vault</h3>
                  <p className="text-xs text-slate-400">Persisted concept graphs in PostgreSQL</p>
                </div>
              </div>
              <button
                onClick={() => setShowSavedModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
              {savedMindMaps.length > 0 ? (
                savedMindMaps.map((map) => (
                  <div
                    key={map.id}
                    onClick={() => {
                      setMindMapData(map);
                      setCollapsedNodes(new Set());
                      setSelectedNode(null);
                      setHasUnsavedChanges(false);
                      setShowSavedModal(false);
                      toast.success(`Loaded Knowledge Graph "${map.title}"`);
                    }}
                    className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-teal-500/40 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-white group-hover:text-teal-300 transition-colors text-sm">
                        {map.title}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-3">
                        <span>📊 {map.totalNodes} Nodes</span>
                        <span>📅 {new Date(map.createdAt).toLocaleDateString()}</span>
                        <span>⚡ {map.tokensUsed} tokens</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDeleteMindMap(map.id, e)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                        title="Delete from Vault"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No saved knowledge graphs in your vault yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MindMapView;

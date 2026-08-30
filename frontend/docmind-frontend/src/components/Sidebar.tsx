import React, { useState, useMemo } from 'react';
import {
  Brain, MessageSquare, Search, Layers, Plus, Upload, Trash2, ChevronDown, ChevronUp,
  CheckCircle, Clock, AlertCircle, Loader2, X, FileType, FilePieChart, FileText, File,
  FolderOpen, Sun, Moon, LogOut, Sparkles, Filter, Check, PanelLeftClose, Edit2, BookOpen,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import type { DocumentMetadataDto, DocumentStatus, ConversationDto } from '../types';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

interface SidebarProps {
  onUploadClick: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getFileEmoji(contentType: string): React.ReactNode {
  if (contentType.includes('pdf')) return <FileText className="w-4 h-4 text-rose-400" />;
  if (contentType.includes('word') || contentType.includes('docx')) return <FileType className="w-4 h-4 text-sky-400" />;
  if (contentType.includes('csv')) return <FilePieChart className="w-4 h-4 text-emerald-400" />;
  return <File className="w-4 h-4 text-teal-400" />;
}

const STATUS_CONFIG: Record<DocumentStatus, { icon: React.ReactNode; color: string; dot: string; label: string }> = {
  INDEXED: {
    icon: <CheckCircle className="w-3 h-3" />,
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    dot: 'bg-emerald-400',
    label: 'Indexed',
  },
  PROCESSING: {
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    dot: 'bg-amber-400 animate-pulse',
    label: 'Processing',
  },
  UPLOADING: {
    icon: <Clock className="w-3 h-3" />,
    color: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
    dot: 'bg-sky-400 animate-pulse',
    label: 'Uploading',
  },
  FAILED: {
    icon: <AlertCircle className="w-3 h-3" />,
    color: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
    dot: 'bg-rose-400',
    label: 'Failed',
  },
};

const StatusBadge: React.FC<{ status: DocumentStatus }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border', cfg.color)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

const DocumentItem: React.FC<{ doc: DocumentMetadataDto }> = ({ doc }) => {
  const { selectedDocumentIds, toggleDocumentSelection, deleteDocument, setIsSidebarOpen } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isSelected = selectedDocumentIds.includes(doc.id);

  const handleDelete = () => {
    if (confirmDelete) {
      deleteDocument(doc.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 2500);
    }
  };

  return (
    <div
      className={clsx(
        'rounded-xl border transition-all duration-200 overflow-hidden group',
        isSelected
          ? 'border-teal-500/60 bg-teal-500/10 shadow-sm shadow-teal-500/10 ring-1 ring-teal-500/30'
          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/50'
      )}
    >
      {/* Main row */}
      <div
        className="flex items-start gap-2.5 p-2.5 cursor-pointer"
        onClick={() => {
          toggleDocumentSelection(doc.id);
          if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
          }
        }}
      >
        {/* Checkbox indicator */}
        <div className="pt-0.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className="w-3.5 h-3.5 rounded border-slate-700 text-teal-500 focus:ring-teal-400 bg-slate-950/60 cursor-pointer accent-teal-500"
          />
        </div>

        <div className={clsx(
          'p-1.5 rounded-lg flex-shrink-0 mt-0.5 transition-colors',
          isSelected ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
        )}>
          {getFileEmoji(doc.contentType)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs font-semibold text-slate-100 truncate leading-tight" title={doc.filename}>
              {doc.filename}
            </p>
            {isSelected && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/15 border border-teal-500/30 px-1.5 py-0.2 rounded-full">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <StatusBadge status={doc.status} />
            <span className="text-[11px] text-slate-500">{formatBytes(doc.fileSize)}</span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="p-1 hover:bg-slate-700/60 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            title={expanded ? 'Collapse details' : 'Expand details'}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            className={clsx(
              'p-1 rounded-lg transition-all text-xs',
              confirmDelete
                ? 'bg-rose-500/20 text-rose-400 px-1.5 font-medium border border-rose-500/30'
                : 'opacity-0 group-hover:opacity-100 hover:bg-rose-500/15 hover:text-rose-400 text-slate-500'
            )}
            title="Delete document"
          >
            {confirmDelete ? 'Confirm?' : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded info */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-800 bg-slate-950/40 animate-fade-in">
          <div className="grid grid-cols-3 gap-1.5 mt-1.5">
            {doc.totalChunks != null && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-1.5 text-center">
                <p className="text-sm font-bold text-teal-400">{doc.totalChunks}</p>
                <p className="text-[10px] text-slate-500">chunks</p>
              </div>
            )}
            {doc.totalPages != null && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-1.5 text-center">
                <p className="text-sm font-bold text-slate-200">{doc.totalPages}</p>
                <p className="text-[10px] text-slate-500">pages</p>
              </div>
            )}
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-1.5 text-center">
              <p className="text-xs font-semibold text-slate-300">{formatDate(doc.createdAt)}</p>
              <p className="text-[10px] text-slate-500">uploaded</p>
            </div>
          </div>
          {doc.errorMessage && (
            <div className="mt-2 px-2 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <p className="text-[11px] text-rose-400 leading-snug">{doc.errorMessage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ConversationListItem: React.FC<{
  conv: ConversationDto;
  isSelected: boolean;
}> = ({ conv, isSelected }) => {
  const {
    setSelectedConversationId,
    setActiveTab,
    setIsSidebarOpen,
    deleteConversation,
    renameConversation,
  } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conv.title);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSaveRename = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (!editTitle.trim() || editTitle.trim() === conv.title) {
      setIsEditing(false);
      return;
    }
    const success = await renameConversation(conv.id, editTitle.trim());
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(conv.title);
    setIsEditing(false);
  };

  return (
    <div
      onClick={() => {
        if (isEditing) return;
        setSelectedConversationId(conv.id);
        setActiveTab('chat');
        if (window.innerWidth < 768) setIsSidebarOpen(false);
      }}
      className={clsx(
        'p-2.5 rounded-xl border cursor-pointer transition-all duration-150 flex items-start justify-between gap-2 group',
        isSelected
          ? 'border-teal-500/60 bg-teal-500/10 text-white shadow-sm'
          : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50'
      )}
    >
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveRename(e);
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1"
          >
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              autoFocus
              className="w-full text-xs bg-slate-950 border border-teal-500/60 rounded px-1.5 py-0.5 text-white focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
            <button
              type="submit"
              className="p-1 text-teal-400 hover:text-teal-300 hover:bg-teal-500/20 rounded transition-colors"
              title="Save name"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCancelRename}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <>
            <p className="text-xs font-medium truncate group-hover:text-white transition-colors" title={conv.title}>
              {conv.title}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {conv.messageCount} msg{conv.messageCount !== 1 ? 's' : ''} · {formatDate(conv.updatedAt)}
            </p>
          </>
        )}
      </div>

      {!isEditing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditTitle(conv.title);
              setIsEditing(true);
            }}
            className="p-1 text-slate-500 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Rename chat"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!confirmDelete) {
                setConfirmDelete(true);
                setTimeout(() => setConfirmDelete(false), 3000);
              } else {
                deleteConversation(conv.id);
              }
            }}
            className={clsx(
              'p-1 rounded-lg transition-colors text-xs',
              confirmDelete ? 'text-rose-400 bg-rose-500/20 font-medium px-1.5' : 'text-slate-500 hover:text-rose-400 hover:bg-slate-800'
            )}
            title={confirmDelete ? 'Click again to confirm delete' : 'Delete chat session'}
          >
            {confirmDelete ? 'Confirm?' : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ onUploadClick }) => {
  const {
    documents,
    isLoadingDocuments,
    selectedDocumentId,
    setSelectedDocumentId,
    selectedDocumentIds,
    selectAllDocuments,
    clearDocumentSelection,
    isSidebarOpen,
    setIsSidebarOpen,
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    deleteConversation,
    fetchConversations,
    activeTab,
    setActiveTab,
  } = useApp();

  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'documents' | 'history'>('documents');
  const [searchQuery, setSearchQuery] = useState('');

  // Retrieve user info from storage
  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleNewChat = () => {
    setSelectedConversationId(null);
    setActiveTab('chat');
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    return documents.filter((d) => d.filename.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [documents, searchQuery]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [conversations, searchQuery]);

  const navItems = [
    { id: 'chat' as const, label: 'Chat Assistant', icon: MessageSquare, badge: null },
    { id: 'search' as const, label: 'Semantic Search', icon: Search, badge: null },
    { id: 'chunks' as const, label: 'Vector Chunks', icon: Layers, badge: documents.length > 0 ? `${documents.length}` : null },
    { id: 'guide' as const, label: 'Platform Guide & Arch', icon: BookOpen, badge: 'NEW' },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        />
      )}

      <aside
        className={clsx(
          'flex flex-col bg-[#0b0f19] border-r border-slate-800/80 transition-all duration-300 z-50',
          // Desktop behavior: relative layout with fixed height
          'md:relative md:h-full md:translate-x-0',
          // Mobile behavior: drawer layout
          'fixed inset-y-0 left-0 h-full',
          isSidebarOpen ? 'w-80 translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 overflow-hidden'
        )}
      >
        {/* ── 1. Top Brand Header ── */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-800/70 flex-shrink-0 bg-[#0f172a]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-md shadow-teal-500/25">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-white">Mindora</span>
                <span className="text-[9px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/25 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                  RAG
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">Document Intelligence</p>
            </div>
          </div>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Close sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* ── 2. "+ New Chat" Action ── */}
        <div className="p-3 border-b border-slate-800/60 flex-shrink-0">
          <button
            onClick={handleNewChat}
            className="w-full group relative flex items-center justify-between px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-teal-600/25 hover:shadow-teal-500/35 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
              <span>New Conversation</span>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-teal-200 opacity-75 group-hover:opacity-100 animate-pulse" />
          </button>
        </div>

        {/* ── 3. Main Navigation Switcher ── */}
        <div className="px-3 py-2 border-b border-slate-800/60 flex-shrink-0 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={clsx(
                  'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150',
                  isActive
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={clsx('w-4 h-4', isActive ? 'text-teal-400' : 'text-slate-400')} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded-md text-slate-400 font-mono">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── 4. Sub-Section Tabs (Documents / History) ── */}
        <div className="px-3 pt-3 flex-shrink-0">
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => { setActiveSection('documents'); setSearchQuery(''); }}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                activeSection === 'documents'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Docs ({documents.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveSection('history');
                setSearchQuery('');
                fetchConversations();
              }}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                activeSection === 'history'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>History ({conversations.length})</span>
            </button>
          </div>

          {/* Quick search input */}
          <div className="mt-2 relative">
            <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeSection === 'documents' ? 'Search documents…' : 'Search chat sessions…'}
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-900/80 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* ── 5. Scrollable Library List ── */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {activeSection === 'documents' ? (
            <>
              {/* Document upload CTA button */}
              <button
                onClick={onUploadClick}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-dashed border-slate-700/80 hover:border-teal-500/50 bg-slate-900/40 hover:bg-teal-500/5 rounded-xl text-xs text-slate-400 hover:text-teal-300 transition-all group"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 transition-colors" />
                <span>Upload New Files</span>
              </button>

              {/* Active document scope banner */}
              {selectedDocumentIds.length > 0 && (
                <div className="px-2.5 py-1.5 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-center justify-between gap-2">
                  <span className="text-[11px] text-teal-300 font-medium truncate">
                    {selectedDocumentIds.length === 1
                      ? '1 Document Scoped'
                      : `${selectedDocumentIds.length} Docs Scoped (Multi-RAG)`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAllDocuments}
                      className="text-[10px] text-slate-400 hover:text-teal-300 transition-colors"
                    >
                      All
                    </button>
                    <button
                      onClick={clearDocumentSelection}
                      className="text-[10px] text-teal-400 hover:text-white underline underline-offset-2 flex-shrink-0"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Document list */}
              {isLoadingDocuments ? (
                <div className="flex flex-col items-center justify-center h-28 gap-2">
                  <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
                  <p className="text-xs text-slate-500">Loading documents…</p>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-36 text-center px-4">
                  <p className="text-xs text-slate-400 font-medium">No documents found</p>
                  <p className="text-[11px] text-slate-500 mt-1">Upload PDF, DOCX, TXT, MD or CSV files.</p>
                </div>
              ) : (
                filteredDocuments.map((doc) => <DocumentItem key={doc.id} doc={doc} />)
              )}
            </>
          ) : (
            /* History Section */
            <>
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-36 text-center px-4">
                  <p className="text-xs text-slate-400 font-medium">No chat history found</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {searchQuery ? 'Try a different search keyword.' : 'Start a conversation to save past queries.'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <ConversationListItem
                    key={conv.id}
                    conv={conv}
                    isSelected={selectedConversationId === conv.id}
                  />
                ))
              )}
            </>
          )}
        </div>

        {/* ── 6. Bottom User Profile Footer ── */}
        <div className="p-3 border-t border-slate-800/80 flex-shrink-0 bg-[#0f172a]/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-teal-500/30 flex-shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-200 truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email || 'Logged in'}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={toggleTheme}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
              >
                {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-teal-400" />}
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

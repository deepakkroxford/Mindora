import React from 'react';
import {
  PanelLeft, FileText, X, ChevronRight, Upload, Sparkles,
  Layers, Search, MessageSquare, Globe, Sun, Moon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { clsx } from 'clsx';

interface NavbarProps {
  onUploadClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onUploadClick }) => {
  const {
    activeTab,
    isSidebarOpen,
    setIsSidebarOpen,
    documents,
    selectedDocumentId,
    setSelectedDocumentId,
  } = useApp();

  const { isDark, toggleTheme } = useTheme();

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);

  const getTabInfo = () => {
    switch (activeTab) {
      case 'chat':
        return { label: 'Chat Assistant', icon: MessageSquare };
      case 'search':
        return { label: 'Semantic Search', icon: Search };
      case 'chunks':
        return { label: 'Vector Chunks Explorer', icon: Layers };
      default:
        return { label: 'Assistant', icon: MessageSquare };
    }
  };

  const currentTab = getTabInfo();
  const TabIcon = currentTab.icon;

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800/80 flex-shrink-0 z-20 transition-colors">
      {/* Left: Sidebar Toggle + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors border border-transparent hover:border-slate-700/60 flex-shrink-0"
          title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <PanelLeft className={clsx('w-4 h-4 transition-transform duration-200', !isSidebarOpen && 'text-teal-400')} />
        </button>

        {/* Breadcrumb Context */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span className="text-slate-500">Workspace</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
          </div>

          {selectedDoc ? (
            <div className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 px-2.5 py-1 rounded-lg max-w-[200px] sm:max-w-[280px]">
              <FileText className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
              <span className="text-xs text-teal-200 font-medium truncate" title={selectedDoc.filename}>
                {selectedDoc.filename}
              </span>
              <button
                onClick={() => setSelectedDocumentId(null)}
                className="text-teal-400 hover:text-white p-0.5 hover:bg-teal-500/20 rounded transition-colors ml-1"
                title="Clear document filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/50 px-2.5 py-1 rounded-lg">
              <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-300 font-medium">All Documents</span>
              <span className="text-[10px] bg-slate-700/80 text-slate-400 px-1.5 py-0.2 rounded-md font-mono">
                {documents.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Center: Current Tab Badge */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-xs text-slate-300 font-medium shadow-inner">
        <TabIcon className="w-3.5 h-3.5 text-teal-400" />
        <span>{currentTab.label}</span>
      </div>

      {/* Right: Theme Toggle & Quick Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-xl transition-colors border border-transparent hover:border-slate-700/60"
          title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-teal-400" />}
        </button>

        <button
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-cyan-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-teal-600/20 hover:shadow-teal-500/30 active:scale-[0.98]"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Upload Files</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;

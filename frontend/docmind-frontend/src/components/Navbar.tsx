import React from 'react';
import {
  Brain, MessageSquare, Search, Layers, Upload, PanelLeft, FileText, ChevronRight, Sun, Moon, LogOut,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

interface NavbarProps {
  onUploadClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onUploadClick }) => {
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, documents, selectedDocumentId } = useApp();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const tabs: { id: 'chat' | 'search' | 'chunks'; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'chunks', label: 'Chunks', icon: Layers },
  ];

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);

  return (
    <header className="flex items-center h-14 px-4 bg-[#111827] border-b border-[#1e293b] flex-shrink-0 z-10">
      {/* Left: sidebar toggle + logo */}
      <div className="flex items-center gap-3 w-64 flex-shrink-0">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1.5 hover:bg-[#1e293b] rounded-lg transition-colors group"
          title="Toggle sidebar"
        >
          <PanelLeft className={clsx('w-4 h-4 transition-colors', isSidebarOpen ? 'text-slate-400' : 'text-indigo-400')} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-500/40">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">Mindora</span>
          <span className="hidden sm:block text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">
            AI
          </span>
        </div>
      </div>

      {/* Center: tab navigation */}
      <nav className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-1 bg-[#1e293b] border border-[#334155] rounded-xl p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                activeTab === id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:block">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Right: document context + theme + upload + logout */}
      <div className="flex items-center gap-2 justify-end w-72">
        {selectedDoc && (
          <div className="hidden lg:flex items-center gap-1.5 bg-[#1e293b] border border-[#334155] px-2.5 py-1.5 rounded-lg max-w-[140px]">
            <FileText className="w-3 h-3 text-indigo-400 flex-shrink-0" />
            <span className="text-xs text-slate-300 truncate">{selectedDoc.filename}</span>
            <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-[#1e293b] rounded-xl transition"
          title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
        </button>

        <button
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-sm shadow-indigo-500/30"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Upload</span>
        </button>

        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-[#1e293b] rounded-xl transition"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;

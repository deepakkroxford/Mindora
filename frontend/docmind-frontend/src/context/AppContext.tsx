import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { DocumentMetadataDto, ConversationDto } from '../types';
import { documentApi, chatApi } from '../services/api';
import toast from 'react-hot-toast';

interface AppContextType {
  documents: DocumentMetadataDto[];
  selectedDocumentId: string | null;
  setSelectedDocumentId: (id: string | null) => void;
  selectedDocumentIds: string[];
  setSelectedDocumentIds: (ids: string[]) => void;
  toggleDocumentSelection: (id: string) => void;
  selectAllDocuments: () => void;
  clearDocumentSelection: () => void;
  fetchDocuments: () => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  isLoadingDocuments: boolean;
  activeTab: 'chat' | 'search' | 'chunks' | 'guide' | 'study' | 'mindmap' | 'tokens';
  setActiveTab: (tab: 'chat' | 'search' | 'chunks' | 'guide' | 'study' | 'mindmap' | 'tokens') => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (v: boolean) => void;
  conversations: ConversationDto[];
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
  fetchConversations: () => Promise<ConversationDto[]>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, newTitle: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<DocumentMetadataDto[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'search' | 'chunks' | 'guide' | 'study' | 'mindmap' | 'tokens'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const selectedDocumentId = selectedDocumentIds.length === 1 ? selectedDocumentIds[0] : null;

  const setSelectedDocumentId = useCallback((id: string | null) => {
    setSelectedDocumentIds(id ? [id] : []);
  }, []);

  const toggleDocumentSelection = useCallback((id: string) => {
    setSelectedDocumentIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }, []);

  const selectAllDocuments = useCallback(() => {
    setSelectedDocumentIds(documents.map((d) => d.id));
  }, [documents]);

  const clearDocumentSelection = useCallback(() => {
    setSelectedDocumentIds([]);
  }, []);

  const fetchDocuments = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setIsLoadingDocuments(true);
    try {
      const resp = await documentApi.getAll();
      if (resp.success && resp.data) {
        setDocuments(resp.data);
      }
    } catch (err) {
      console.error('Failed to fetch documents', err);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  const fetchConversations = useCallback(async (): Promise<ConversationDto[]> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return [];
      const resp = await chatApi.getConversations();
      if (resp.success && resp.data) {
        setConversations(resp.data);
        return resp.data;
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch conversations', err);
      return [];
    }
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    try {
      await documentApi.delete(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (selectedDocumentId === id) setSelectedDocumentId(null);
      toast.success('Document deleted successfully');
    } catch {
      toast.error('Failed to delete document');
    }
  }, [selectedDocumentId]);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await chatApi.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (selectedConversationId === id) setSelectedConversationId(null);
      toast.success('Chat deleted');
    } catch {
      toast.error('Failed to delete chat');
    }
  }, [selectedConversationId]);

  const renameConversation = useCallback(async (id: string, newTitle: string): Promise<boolean> => {
    if (!newTitle.trim()) return false;
    try {
      const resp = await chatApi.updateConversation(id, newTitle.trim());
      if (resp.success && resp.data) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: resp.data.title } : c))
        );
        toast.success('Chat renamed');
        return true;
      }
      return false;
    } catch {
      toast.error('Failed to rename chat');
      return false;
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchConversations();
  }, [fetchDocuments, fetchConversations]);

  return (
    <AppContext.Provider
      value={{
        documents,
        selectedDocumentId,
        setSelectedDocumentId,
        selectedDocumentIds,
        setSelectedDocumentIds,
        toggleDocumentSelection,
        selectAllDocuments,
        clearDocumentSelection,
        fetchDocuments,
        deleteDocument,
        isLoadingDocuments,
        activeTab,
        setActiveTab,
        isSidebarOpen,
        setIsSidebarOpen,
        conversations,
        selectedConversationId,
        setSelectedConversationId,
        fetchConversations,
        deleteConversation,
        renameConversation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};

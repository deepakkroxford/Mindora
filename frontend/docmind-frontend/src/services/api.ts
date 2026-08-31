import axios from 'axios';
import type {
  ApiResponse,
  ChatMessageDto,
  ChatRequestDto,
  ChatResponseDto,
  ConversationDto,
  DocumentMetadataDto,
  DocumentResponseDto,
  LoginRequestDto,
  LoginResponseDto,
  RegisterRequestDto,
  SearchRequestDto,
  SearchResultDto,
  ForgotPasswordRequestDto,
  ResetPasswordRequestDto,
  QuizGenerationRequestDto,
  QuizResponseDto,
  FlashcardDeckResponseDto,
  QuizSubmitResultRequestDto,
  QuizAttemptResponseDto,
  MindMapNodeDto,
  MindMapResponseDto,
  MindMapGenerationRequestDto,
  DocumentDiagramDto,
  TokenAnalyticsDto,
} from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach Authorization Bearer token to all outgoing requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle 401 and 429 responses with user-friendly messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } else if (error.response?.status === 429) {
      const serverMessage = error.response?.data?.message;
      error.message = serverMessage || "⏳ Slow down! You're sending requests too quickly. Please wait a minute and try again.";
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authApi = {
  login: async (request: LoginRequestDto): Promise<ApiResponse<LoginResponseDto>> => {
    const { data } = await api.post<ApiResponse<LoginResponseDto>>('/auth/login', request);
    return data;
  },

  register: async (request: RegisterRequestDto): Promise<ApiResponse<LoginResponseDto>> => {
    const { data } = await api.post<ApiResponse<LoginResponseDto>>('/auth/register', request);
    return data;
  },

  refresh: async (): Promise<ApiResponse<LoginResponseDto>> => {
    const { data } = await api.post<ApiResponse<LoginResponseDto>>('/auth/refresh');
    return data;
  },

  forgotPassword: async (request: ForgotPasswordRequestDto): Promise<ApiResponse<void>> => {
    const { data } = await api.post<ApiResponse<void>>('/auth/forgot-password', request);
    return data;
  },

  resetPassword: async (request: ResetPasswordRequestDto): Promise<ApiResponse<void>> => {
    const { data } = await api.post<ApiResponse<void>>('/auth/reset-password', request);
    return data;
  },
};

// Document APIs
export const documentApi = {
  upload: async (file: File, onProgress?: (pct: number) => void): Promise<ApiResponse<DocumentResponseDto>> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<ApiResponse<DocumentResponseDto>>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });
    return data;
  },

  uploadMultiple: async (files: File[], onProgress?: (pct: number) => void): Promise<ApiResponse<DocumentResponseDto[]>> => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    const { data } = await api.post<ApiResponse<DocumentResponseDto[]>>('/documents/upload-multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });
    return data;
  },

  getAll: async (): Promise<ApiResponse<DocumentMetadataDto[]>> => {
    const { data } = await api.get<ApiResponse<DocumentMetadataDto[]>>('/documents');
    return data;
  },

  getById: async (id: string): Promise<ApiResponse<DocumentMetadataDto>> => {
    const { data } = await api.get<ApiResponse<DocumentMetadataDto>>(`/documents/${id}`);
    return data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const { data } = await api.delete<ApiResponse<void>>(`/documents/${id}`);
    return data;
  },
};

// Chat APIs
export const chatApi = {
  query: async (request: ChatRequestDto): Promise<ApiResponse<ChatResponseDto>> => {
    const { data } = await api.post<ApiResponse<ChatResponseDto>>('/chat/query', request);
    return data;
  },

  searchSimilarity: async (request: SearchRequestDto): Promise<ApiResponse<SearchResultDto>> => {
    const { data } = await api.post<ApiResponse<SearchResultDto>>('/chat/search/similarity', request);
    return data;
  },

  getConversations: async (): Promise<ApiResponse<ConversationDto[]>> => {
    const { data } = await api.get<ApiResponse<ConversationDto[]>>('/chat/conversations');
    return data;
  },

  getMessages: async (conversationId: string): Promise<ApiResponse<ChatMessageDto[]>> => {
    const { data } = await api.get<ApiResponse<ChatMessageDto[]>>(`/chat/conversations/${conversationId}/messages`);
    return data;
  },

  deleteConversation: async (conversationId: string): Promise<ApiResponse<void>> => {
    const { data } = await api.delete<ApiResponse<void>>(`/chat/conversations/${conversationId}`);
    return data;
  },

  updateConversation: async (conversationId: string, title: string): Promise<ApiResponse<ConversationDto>> => {
    const { data } = await api.patch<ApiResponse<ConversationDto>>(`/chat/conversations/${conversationId}`, { title });
    return data;
  },

  getFollowUpSuggestions: async (question: string, answer: string, documentIds?: string[]): Promise<ApiResponse<string[]>> => {
    const { data } = await api.post<ApiResponse<string[]>>('/chat/suggestions/follow-up', {
      question,
      answer,
      documentIds
    });
    return data;
  },

  getDocumentStarterPrompts: async (documentId: string): Promise<ApiResponse<string[]>> => {
    const { data } = await api.get<ApiResponse<string[]>>(`/chat/suggestions/document/${documentId}`);
    return data;
  },
};

// Diagram APIs
export const diagramApi = {
  getByDocument: async (documentId: string): Promise<ApiResponse<DocumentDiagramDto[]>> => {
    const { data } = await api.get<ApiResponse<DocumentDiagramDto[]>>(`/diagrams/document/${documentId}`);
    return data;
  },
};

// Study Hub & Quiz APIs
export const studyApi = {
  generateQuiz: async (request: QuizGenerationRequestDto): Promise<ApiResponse<QuizResponseDto>> => {
    const { data } = await api.post<ApiResponse<QuizResponseDto>>('/study/quiz', request);
    return data;
  },

  generateFlashcards: async (request: QuizGenerationRequestDto): Promise<ApiResponse<FlashcardDeckResponseDto>> => {
    const { data } = await api.post<ApiResponse<FlashcardDeckResponseDto>>('/study/flashcards', request);
    return data;
  },

  submitQuizResult: async (request: QuizSubmitResultRequestDto): Promise<ApiResponse<QuizAttemptResponseDto>> => {
    const { data } = await api.post<ApiResponse<QuizAttemptResponseDto>>('/study/quiz/submit', request);
    return data;
  },

  getQuizHistory: async (): Promise<ApiResponse<QuizAttemptResponseDto[]>> => {
    const { data } = await api.get<ApiResponse<QuizAttemptResponseDto[]>>('/study/quiz/history');
    return data;
  },
};

// Mind Map APIs
export const mindMapApi = {
  generateMindMap: async (request: MindMapGenerationRequestDto): Promise<ApiResponse<MindMapResponseDto>> => {
    const { data } = await api.post<ApiResponse<MindMapResponseDto>>('/mindmap/generate', request);
    return data;
  },

  getSavedMindMaps: async (): Promise<ApiResponse<MindMapResponseDto[]>> => {
    const { data } = await api.get<ApiResponse<MindMapResponseDto[]>>('/mindmap/saved');
    return data;
  },

  saveMindMap: async (request: MindMapResponseDto): Promise<ApiResponse<MindMapResponseDto>> => {
    const { data } = await api.post<ApiResponse<MindMapResponseDto>>('/mindmap/save', request);
    return data;
  },

  updateMindMap: async (id: string, request: MindMapResponseDto): Promise<ApiResponse<MindMapResponseDto>> => {
    const { data } = await api.put<ApiResponse<MindMapResponseDto>>(`/mindmap/${id}`, request);
    return data;
  },

  deleteMindMap: async (id: string): Promise<ApiResponse<void>> => {
    const { data } = await api.delete<ApiResponse<void>>(`/mindmap/${id}`);
    return data;
  },
};

// Token Analytics APIs
export const analyticsApi = {
  getTokenSummary: async (days: number = 30): Promise<ApiResponse<TokenAnalyticsDto>> => {
    const { data } = await api.get<ApiResponse<TokenAnalyticsDto>>(`/analytics/tokens/summary?days=${days}`);
    return data;
  },

  downloadCsv: async (days: number = 30): Promise<Blob> => {
    const res = await api.get(`/analytics/tokens/export?days=${days}`, {
      responseType: 'blob',
    });
    return res.data;
  },

  exportCsvUrl: (days: number = 30): string => {
    return `/api/v1/analytics/tokens/export?days=${days}`;
  },
};

export default api;

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

// Interceptor to handle 401 Unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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
};

export default api;

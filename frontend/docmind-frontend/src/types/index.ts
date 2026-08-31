// API Types matching Spring Boot backend DTOs

export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
  timestamp: string;
}

export type DocumentStatus = 'UPLOADING' | 'PROCESSING' | 'INDEXED' | 'FAILED';

export interface DocumentMetadataDto {
  id: string;
  filename: string;
  contentType: string;
  fileSize: number;
  totalPages: number | null;
  totalChunks: number | null;
  status: DocumentStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentResponseDto {
  id: string;
  fileName: string;
  fileSize: number;
  status: DocumentStatus;
  chunksCreated: number | null;
  message: string;
}

export interface CitationDto {
  documentId: string;
  fileName: string;
  chunkIndex: number;
  pageNumber: number | null;
  snippet: string;
  similarityScore: number;
  metadata: Record<string, unknown>;
}

export interface ChatRequestDto {
  question: string;
  documentId?: string;
  documentIds?: string[];
  topK?: number;
  minSimilarity?: number;
  conversationId?: string;
  bypassCache?: boolean;
}

export interface ChatResponseDto {
  answer: string;
  conversationId: string;
  citations: CitationDto[];
  responseTimeMs: number;
  similarityScore?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  isCached?: boolean;
  suggestedQuestions?: string[];
}

export interface FollowUpSuggestionRequestDto {
  question: string;
  answer: string;
  documentIds?: string[];
}

export interface SearchRequestDto {
  query: string;
  documentId?: string;
  topK?: number;
  similaritySearch?: number;
}

export interface SearchResultDto {
  query: string;
  totalMatches: number;
  matches: CitationDto[];
}

export interface LoginRequestDto {
  email: string;
  password?: string;
}

export interface RegisterRequestDto {
  name: string;
  email: string;
  password?: string;
  confirmPassword?: string;
}

export interface LoginResponseDto {
  token: string;
  type: string;
  email: string;
  name: string;
  role: string;
  expiresIn: number;
}

export interface ForgotPasswordRequestDto {
  email: string;
}

export interface ResetPasswordRequestDto {
  email: string;
  otp: string;
  newPassword?: string;
  confirmPassword?: string;
}


export interface ConversationDto {
  id: string;
  title: string;
  description: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageDto {
  id: string;
  conversationId: string;
  question: string;
  answer: string;
  documentId: string | null;
  similarityScore: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  createdAt: string;
}

// UI Types
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: CitationDto[];
  responseTimeMs?: number;
  similarityScore?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  isCached?: boolean;
  suggestedQuestions?: string[];
  timestamp: Date;
  isStreaming?: boolean;
}

export interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  result?: DocumentResponseDto;
}

// Study Hub & Quiz Types
export interface QuizQuestionDto {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  sourceSnippet?: string;
}

export interface QuizResponseDto {
  title: string;
  documentNames: string[];
  questions: QuizQuestionDto[];
  difficulty: string;
  isCached: boolean;
}

export interface FlashcardDto {
  id: string;
  front: string;
  back: string;
  category?: string;
  hint?: string;
}

export interface FlashcardDeckResponseDto {
  title: string;
  documentNames: string[];
  cards: FlashcardDto[];
  isCached: boolean;
}

export interface QuizGenerationRequestDto {
  documentIds?: string[];
  numQuestions?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  focusArea?: string;
}

export interface QuizSubmitResultRequestDto {
  quizTitle: string;
  documentNames: string[];
  score: number;
  totalQuestions: number;
  percentage: number;
  difficulty: string;
}

export interface QuizAttemptResponseDto {
  id: string;
  quizTitle: string;
  documentNames: string[];
  score: number;
  totalQuestions: number;
  percentage: number;
  difficulty: string;
  createdAt: string;
}

// Mind Map & Concept Hierarchy Types
export interface MindMapNodeDto {
  id: string;
  label: string;
  description: string;
  category: string;
  keywords: string[];
  children?: MindMapNodeDto[];
}

export interface MindMapResponseDto {
  id?: string;
  title: string;
  documentNames: string[];
  rootNode: MindMapNodeDto;
  totalNodes: number;
  tokensUsed?: number;
  isCached: boolean;
  createdAt?: string;
}

export interface MindMapGenerationRequestDto {
  documentIds?: string[];
  maxDepth?: number;
  focusArea?: string;
}




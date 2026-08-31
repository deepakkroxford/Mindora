import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GraduationCap, Sparkles, BookOpen, CheckCircle2, XCircle, RefreshCw,
  ArrowRight, ArrowLeft, Trophy, Layers, Target, HelpCircle,
  Clock, Award, ChevronRight, ChevronDown, Check, Zap, Shuffle,
  FileText, Lightbulb, AlertCircle, ArrowUpRight, History, Calendar,
  BarChart2, CheckSquare, Square
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { studyApi } from '../services/api';
import type {
  QuizResponseDto, QuizQuestionDto, FlashcardDeckResponseDto, FlashcardDto,
  QuizAttemptResponseDto
} from '../types';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

export const StudyHubView: React.FC = () => {
  const {
    documents,
    selectedDocumentIds,
    toggleDocumentSelection,
    selectAllDocuments,
    clearDocumentSelection,
    setActiveTab,
  } = useApp();

  // Mode: 'quiz' | 'flashcards' | 'history'
  const [mode, setMode] = useState<'quiz' | 'flashcards' | 'history'>('quiz');

  // Configuration
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Loading & Data state
  const [isLoading, setIsLoading] = useState(false);
  const [quizData, setQuizData] = useState<QuizResponseDto | null>(null);
  const [flashcardData, setFlashcardData] = useState<FlashcardDeckResponseDto | null>(null);
  const [showDocScopeDropdown, setShowDocScopeDropdown] = useState(false);

  // History state
  const [historyList, setHistoryList] = useState<QuizAttemptResponseDto[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Quiz Gameplay State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  // Flashcards State
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [masteredCards, setMasteredCards] = useState<Set<string>>(new Set());

  // Selected Documents
  const selectedDocs = useMemo(() => {
    return documents.filter((d) => selectedDocumentIds.includes(d.id));
  }, [documents, selectedDocumentIds]);

  const isAllSelected = documents.length > 0 && selectedDocumentIds.length === documents.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      clearDocumentSelection();
    } else {
      selectAllDocuments();
    }
  };

  // Fetch History
  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const response = await studyApi.getQuizHistory();
      if (response.success && response.data) {
        setHistoryList(response.data);
      }
    } catch {
      // silent
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Load or Generate Quiz
  const handleGenerateQuiz = useCallback(async () => {
    if (selectedDocumentIds.length === 0) {
      toast.error('Please select at least 1 document (or check "Select All") to generate a quiz.');
      return;
    }

    setIsLoading(true);
    setIsQuizSubmitted(false);
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    try {
      const response = await studyApi.generateQuiz({
        documentIds: selectedDocumentIds,
        numQuestions,
        difficulty,
      });

      if (response.success && response.data) {
        setQuizData(response.data);
        if (response.data.isCached) {
          toast.success('Loaded cached quiz instantly! ⚡');
        } else {
          toast.success('New interactive quiz ready! 🎯');
        }
      } else {
        toast.error(response.message || 'Failed to generate quiz');
      }
    } catch {
      toast.error('An error occurred while generating the quiz.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDocumentIds, numQuestions, difficulty]);

  // Load or Generate Flashcards
  const handleGenerateFlashcards = useCallback(async () => {
    if (selectedDocumentIds.length === 0) {
      toast.error('Please select at least 1 document (or check "Select All") to generate flashcards.');
      return;
    }

    setIsLoading(true);
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
    setShowHint(false);
    try {
      const response = await studyApi.generateFlashcards({
        documentIds: selectedDocumentIds,
        numQuestions: Math.max(numQuestions, 5),
      });

      if (response.success && response.data) {
        setFlashcardData(response.data);
        if (response.data.isCached) {
          toast.success('Loaded study deck instantly! ⚡');
        } else {
          toast.success('New flashcards deck created! 🎴');
        }
      } else {
        toast.error(response.message || 'Failed to generate flashcards');
      }
    } catch {
      toast.error('An error occurred while generating flashcards.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDocumentIds, numQuestions]);

  // Keyboard navigation for flashcards
  useEffect(() => {
    if (mode !== 'flashcards' || !flashcardData || isLoading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsCardFlipped((prev) => !prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextCard();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevCard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, flashcardData, currentCardIndex, isLoading]);

  // Quiz Answer Selection
  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (isQuizSubmitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  // Calculate Quiz Score
  const quizScore = useMemo(() => {
    if (!quizData || !quizData.questions) return { score: 0, total: 0, percentage: 0 };
    const total = quizData.questions.length;
    let score = 0;
    quizData.questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctOptionIndex) {
        score++;
      }
    });
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    return { score, total, percentage };
  }, [quizData, userAnswers]);

  // Handle Quiz Submission & PostgreSQL Persistence
  const handleSubmitQuiz = async () => {
    setIsQuizSubmitted(true);
    toast.success('Quiz submitted! Check your score! 🏆');

    try {
      await studyApi.submitQuizResult({
        quizTitle: quizData?.title || 'Document Knowledge Quiz',
        documentNames: quizData?.documentNames || [],
        score: quizScore.score,
        totalQuestions: quizScore.total,
        percentage: quizScore.percentage,
        difficulty: quizData?.difficulty || difficulty,
      });
      fetchHistory();
    } catch {
      // non-blocking
    }
  };

  // Flashcards helpers
  const handleNextCard = () => {
    if (!flashcardData) return;
    setIsCardFlipped(false);
    setShowHint(false);
    setCurrentCardIndex((prev) => (prev + 1) % flashcardData.cards.length);
  };

  const handlePrevCard = () => {
    if (!flashcardData) return;
    setIsCardFlipped(false);
    setShowHint(false);
    setCurrentCardIndex((prev) => (prev - 1 + flashcardData.cards.length) % flashcardData.cards.length);
  };

  const handleShuffleDeck = () => {
    if (!flashcardData) return;
    const shuffled = [...flashcardData.cards].sort(() => Math.random() - 0.5);
    setFlashcardData({ ...flashcardData, cards: shuffled });
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
    setShowHint(false);
    toast.success('Shuffled cards! 🔀');
  };

  const toggleCardMastery = (cardId: string) => {
    setMasteredCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const currentCard: FlashcardDto | undefined = flashcardData?.cards[currentCardIndex];
  const currentQuestion: QuizQuestionDto | undefined = quizData?.questions[currentQuestionIndex];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 p-4 sm:p-8 custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-fade-in">

        {/* ── 1. Top Hub Header ── */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 sm:p-8 shadow-xl shadow-black/5 dark:shadow-black/20">
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

          <div className="relative z-10 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400 text-xs font-semibold tracking-wide mb-2">
                  <GraduationCap className="w-3.5 h-3.5 text-teal-500 animate-bounce" />
                  <span>AI LEARNING & MASTERY ENGINE</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                  Interactive Study & Quiz Hub
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                  Select your documents below and generate customized quizzes or 3D flashcards.
                </p>
              </div>

              {/* Mode Toggle Switcher */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 self-start sm:self-center shadow-inner flex-wrap gap-1">
                <button
                  onClick={() => setMode('quiz')}
                  className={clsx(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
                    mode === 'quiz'
                      ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-300 shadow-md border border-slate-200 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Quiz</span>
                </button>
                <button
                  onClick={() => setMode('flashcards')}
                  className={clsx(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
                    mode === 'flashcards'
                      ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-300 shadow-md border border-slate-200 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Flashcards</span>
                </button>
                <button
                  onClick={() => setMode('history')}
                  className={clsx(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
                    mode === 'history'
                      ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-300 shadow-md border border-slate-200 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>History ({historyList.length})</span>
                </button>
              </div>
            </div>

            {/* Document Scoping Filter & Config Controls */}
            {mode !== 'history' && (
              <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                {/* Document Selector Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Master Select All Checkbox */}
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className={clsx(
                        'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                        isAllSelected
                          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                      )}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-white" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>Select All Documents ({documents.length})</span>
                    </button>

                    {/* Clear selection */}
                    {selectedDocumentIds.length > 0 && !isAllSelected && (
                      <button
                        type="button"
                        onClick={clearDocumentSelection}
                        className="text-xs text-slate-500 hover:text-rose-500 underline transition-colors"
                      >
                        Clear selection ({selectedDocumentIds.length})
                      </button>
                    )}
                  </div>

                  {/* Difficulty & Count Options */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {mode === 'quiz' && (
                      <div className="flex items-center bg-slate-100 dark:bg-slate-950 rounded-lg p-0.5 border border-slate-200 dark:border-slate-800">
                        {(['easy', 'medium', 'hard'] as const).map((d) => (
                          <button
                            key={d}
                            onClick={() => setDifficulty(d)}
                            className={clsx(
                              'px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-all',
                              difficulty === d
                                ? d === 'easy'
                                  ? 'bg-emerald-500 text-white shadow-sm'
                                  : d === 'medium'
                                  ? 'bg-amber-500 text-white shadow-sm'
                                  : 'bg-rose-500 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            )}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center bg-slate-100 dark:bg-slate-950 rounded-lg p-0.5 border border-slate-200 dark:border-slate-800">
                      {[5, 8, 10].map((num) => (
                        <button
                          key={num}
                          onClick={() => setNumQuestions(num)}
                          className={clsx(
                            'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all',
                            numQuestions === num
                              ? 'bg-teal-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          )}
                        >
                          {num} {mode === 'quiz' ? 'Qs' : 'Cards'}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={mode === 'quiz' ? handleGenerateQuiz : handleGenerateFlashcards}
                      disabled={isLoading || selectedDocumentIds.length === 0}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 !text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={clsx('w-3.5 h-3.5', isLoading && 'animate-spin')} />
                      <span>{isLoading ? 'Generating...' : selectedDocumentIds.length === 0 ? 'Pick Documents' : 'Generate Now'}</span>
                    </button>
                  </div>
                </div>

                {/* Individual Document Selection Chips */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-xs text-slate-500 font-medium">Select Docs:</span>
                  {documents.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No documents uploaded yet</span>
                  ) : (
                    documents.map((doc) => {
                      const isSelected = selectedDocumentIds.includes(doc.id);
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => toggleDocumentSelection(doc.id)}
                          className={clsx(
                            'inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border transition-all cursor-pointer',
                            isSelected
                              ? 'bg-teal-500/15 border-teal-500/50 text-teal-700 dark:text-teal-300 shadow-sm ring-1 ring-teal-500/30'
                              : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          )}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          )}
                          <FileText className="w-3 h-3 opacity-70 flex-shrink-0" />
                          <span className="max-w-[140px] truncate">{doc.filename}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 2. Loading Shimmer State ── */}
        {isLoading && (
          <div className="p-12 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-center space-y-4 animate-pulse">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto text-teal-500">
              <Sparkles className="w-7 h-7 animate-spin" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {mode === 'quiz' ? 'Synthesizing Interactive Quiz...' : 'Crafting 3D Flashcard Deck...'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Mindora is reading your selected document(s), extracting core concepts, and generating challenging questions with verified explanations.
              </p>
            </div>
          </div>
        )}

        {/* ── 3. Unselected Document Prompt (when nothing selected) ── */}
        {!isLoading && mode !== 'history' && selectedDocumentIds.length === 0 && (
          <div className="p-10 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-500">
              <FileText className="w-7 h-7 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Please Select Document(s) to Begin
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Choose one or more specific documents from the list above, or check <strong>"Select All Documents"</strong> to generate your customized study deck.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={selectAllDocuments}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 !text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
              >
                <CheckSquare className="w-4 h-4 !text-white" />
                <span>Select All Documents ({documents.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* ── 4. QUIZ MODE: Active Quiz Playing ── */}
        {!isLoading && mode === 'quiz' && quizData && !isQuizSubmitted && currentQuestion && selectedDocumentIds.length > 0 && (
          <div className="space-y-6 animate-fade-in">
            {/* Quiz Progress & Question Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-300 text-xs font-bold font-mono">
                  Question {currentQuestionIndex + 1} of {quizData.questions.length}
                </span>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  {quizData.title}
                </span>
              </div>

              {/* Question selector dots */}
              <div className="flex items-center gap-1.5">
                {quizData.questions.map((q, idx) => {
                  const isAnswered = userAnswers[q.id] !== undefined;
                  const isCurrent = currentQuestionIndex === idx;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={clsx(
                        'w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center font-mono',
                        isCurrent
                          ? 'bg-teal-600 text-white ring-2 ring-teal-500/40 scale-110 shadow-sm'
                          : isAnswered
                          ? 'bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      )}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-500 to-cyan-500 h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${((Object.keys(userAnswers).length) / quizData.questions.length) * 100}%`,
                }}
              />
            </div>

            {/* Question Card */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 sm:p-8 shadow-xl shadow-black/5 dark:shadow-black/20 space-y-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
                {currentQuestion.question}
              </h2>

              {/* Options Grid */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, optIdx) => {
                  const isSelected = userAnswers[currentQuestion.id] === optIdx;
                  const optionLetters = ['A', 'B', 'C', 'D'];

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(currentQuestion.id, optIdx)}
                      className={clsx(
                        'w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-all duration-200 group',
                        isSelected
                          ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                          : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/90'
                      )}
                    >
                      <span
                        className={clsx(
                          'w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 transition-colors',
                          isSelected
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                        )}
                      >
                        {optionLetters[optIdx]}
                      </span>

                      <span className={clsx(
                        'text-sm font-medium pt-0.5 leading-relaxed',
                        isSelected ? 'text-teal-900 dark:text-teal-100 font-semibold' : 'text-slate-700 dark:text-slate-300'
                      )}>
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-3">
                  {currentQuestionIndex < quizData.questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestionIndex((prev) => Math.min(quizData.questions.length - 1, prev + 1))}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 !text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all active:scale-95"
                    >
                      <span>Next Question</span>
                      <ArrowRight className="w-4 h-4 !text-white" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={Object.keys(userAnswers).length === 0}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 !text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4 !text-white" />
                      <span>Submit & View Scorecard</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 5. QUIZ MODE: Scorecard & Results Dashboard ── */}
        {!isLoading && mode === 'quiz' && quizData && isQuizSubmitted && (
          <div className="space-y-8 animate-fade-in">
            {/* Visual Score Summary Card */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-8 shadow-2xl shadow-black/10 dark:shadow-black/40 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="max-w-md mx-auto space-y-6">
                {/* Circular Score Graph SVG */}
                <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-slate-200 dark:stroke-slate-800"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className={clsx(
                        'transition-all duration-1000 ease-out',
                        quizScore.percentage >= 80
                          ? 'stroke-emerald-500'
                          : quizScore.percentage >= 60
                          ? 'stroke-amber-500'
                          : 'stroke-rose-500'
                      )}
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - quizScore.percentage / 100)}`}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>

                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                      {quizScore.percentage}%
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Accuracy
                    </span>
                  </div>
                </div>

                {/* Score Message Banner */}
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                    {quizScore.percentage >= 80 ? (
                      <span className="text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                        <Trophy className="w-4 h-4" /> Mastery Achieved!
                      </span>
                    ) : quizScore.percentage >= 60 ? (
                      <span className="text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5">
                        <Award className="w-4 h-4" /> Good Understanding!
                      </span>
                    ) : (
                      <span className="text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4" /> Needs Review & Practice
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white pt-2">
                    You answered {quizScore.score} out of {quizScore.total} questions correctly.
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Saved to your persistent score history in PostgreSQL database.
                  </p>
                </div>

                {/* Retake & Action Buttons */}
                <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                  <button
                    onClick={() => {
                      setUserAnswers({});
                      setIsQuizSubmitted(false);
                      setCurrentQuestionIndex(0);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retake Quiz</span>
                  </button>

                  <button
                    onClick={handleGenerateQuiz}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 !text-white text-xs font-bold shadow-md shadow-teal-600/25 transition-all active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 !text-white" />
                    <span>New Questions</span>
                  </button>

                  <button
                    onClick={() => setMode('history')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-300 dark:border-purple-800 transition-all active:scale-95"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View History</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Detailed Question Review List */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-500" />
                <span>Question-by-Question Review</span>
              </h3>

              <div className="space-y-3">
                {quizData.questions.map((q, idx) => {
                  const selectedOpt = userAnswers[q.id];
                  const isCorrect = selectedOpt === q.correctOptionIndex;
                  const isExpanded = expandedReviewId === q.id;
                  const optionLetters = ['A', 'B', 'C', 'D'];

                  return (
                    <div
                      key={q.id}
                      className={clsx(
                        'rounded-2xl border transition-all overflow-hidden bg-white dark:bg-slate-900/60 shadow-sm',
                        isCorrect
                          ? 'border-emerald-500/40 dark:border-emerald-500/30'
                          : 'border-rose-500/40 dark:border-rose-500/30'
                      )}
                    >
                      <button
                        onClick={() => setExpandedReviewId(isExpanded ? null : q.id)}
                        className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span
                            className={clsx(
                              'w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold font-mono flex-shrink-0',
                              isCorrect
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            )}
                          >
                            {idx + 1}
                          </span>

                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {q.question}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {isCorrect ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Correct Answer</span>
                              ) : (
                                <span className="text-rose-600 dark:text-rose-400 font-medium">✗ Incorrect (Your answer: {selectedOpt !== undefined ? optionLetters[selectedOpt] : 'None'})</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <ChevronDown
                          className={clsx('w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ml-2', isExpanded && 'rotate-180')}
                        />
                      </button>

                      {isExpanded && (
                        <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-800/80 space-y-4 text-xs">
                          {/* Options breakdown */}
                          <div className="space-y-2 pt-3">
                            {q.options.map((opt, optIdx) => {
                              const isThisCorrect = optIdx === q.correctOptionIndex;
                              const isThisUserSelection = selectedOpt === optIdx;

                              return (
                                <div
                                  key={optIdx}
                                  className={clsx(
                                    'flex items-center justify-between p-3 rounded-xl border',
                                    isThisCorrect
                                      ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500/50 text-emerald-900 dark:text-emerald-200'
                                      : isThisUserSelection
                                      ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-500/50 text-rose-900 dark:text-rose-200'
                                      : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                  )}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="font-mono font-bold">{optionLetters[optIdx]}.</span>
                                    <span>{opt}</span>
                                  </div>
                                  {isThisCorrect && (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Correct</span>
                                  )}
                                  {isThisUserSelection && !isThisCorrect && (
                                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Your Answer</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* AI Explanation Box */}
                          <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-500/20 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider text-[10px]">
                              <Lightbulb className="w-3.5 h-3.5" />
                              <span>Explanation</span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                              {q.explanation}
                            </p>
                            {q.sourceSnippet && (
                              <p className="text-[11px] text-slate-500 italic pt-1 border-t border-teal-500/10">
                                Source excerpt: "{q.sourceSnippet}"
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── 6. FLASHCARDS MODE: 3D Flippable Flashcards Deck ── */}
        {!isLoading && mode === 'flashcards' && flashcardData && currentCard && selectedDocumentIds.length > 0 && (
          <div className="space-y-6 animate-fade-in">
            {/* Flashcard Header Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 text-xs font-bold font-mono">
                  Card {currentCardIndex + 1} of {flashcardData.cards.length}
                </span>
                {currentCard.category && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                    {currentCard.category}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleShuffleDeck}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors shadow-sm"
                >
                  <Shuffle className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="hidden sm:inline">Shuffle</span>
                </button>

                <button
                  onClick={() => toggleCardMastery(currentCard.id)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-sm',
                    masteredCards.has(currentCard.id)
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : 'bg-white dark:bg-slate-800 hover:bg-slate-100 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  )}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{masteredCards.has(currentCard.id) ? 'Mastered' : 'Mark Mastered'}</span>
                </button>
              </div>
            </div>

            {/* 3D Flip Card Container */}
            <div
              onClick={() => setIsCardFlipped(!isCardFlipped)}
              className="relative min-h-[320px] sm:min-h-[360px] w-full cursor-pointer select-none rounded-3xl transition-all duration-300 transform hover:scale-[1.01]"
              style={{ perspective: '1200px' }}
            >
              <div
                className={clsx(
                  'w-full h-full min-h-[320px] sm:min-h-[360px] rounded-3xl p-8 sm:p-12 flex flex-col justify-between border shadow-2xl transition-all duration-500 relative',
                  isCardFlipped
                    ? 'bg-gradient-to-br from-slate-900 via-[#131c31] to-[#0d1627] border-cyan-500/40 text-white shadow-cyan-500/10'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-black/5 dark:shadow-black/30'
                )}
              >
                {/* Card Top Label */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span className="font-mono uppercase tracking-wider font-bold text-[10px]">
                      {isCardFlipped ? 'Answer & Core Takeaway' : 'Core Concept / Question'}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    Click card or press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 text-[10px]">Space</kbd> to flip
                  </span>
                </div>

                {/* Card Content */}
                <div className="my-auto py-6 text-center space-y-4">
                  {!isCardFlipped ? (
                    <h3 className="text-xl sm:text-2xl font-bold leading-snug max-w-2xl mx-auto text-slate-900 dark:text-white">
                      {currentCard.front}
                    </h3>
                  ) : (
                    <p className="text-base sm:text-lg text-cyan-100 font-medium leading-relaxed max-w-2xl mx-auto">
                      {currentCard.back}
                    </p>
                  )}

                  {/* Hint Accordion */}
                  {currentCard.hint && !isCardFlipped && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHint(!showHint);
                      }}
                      className="inline-block mt-3"
                    >
                      {showHint ? (
                        <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs font-medium max-w-md mx-auto animate-fade-in">
                          💡 Hint: {currentCard.hint}
                        </div>
                      ) : (
                        <button className="text-xs text-slate-400 hover:text-amber-500 dark:hover:text-amber-300 underline underline-offset-4 transition-colors">
                          Need a hint?
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <span>{currentCard.category || 'Document Knowledge'}</span>
                  <span className="text-teal-600 dark:text-teal-400 font-semibold">
                    {isCardFlipped ? 'Tap to flip back' : 'Tap to reveal answer'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Card Navigation Deck Controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handlePrevCard}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-800 transition-all active:scale-95 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous Card</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-500">
                  {masteredCards.size} / {flashcardData.cards.length} Mastered
                </span>
              </div>

              <button
                onClick={handleNextCard}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 !text-white text-xs font-bold shadow-lg shadow-cyan-600/25 transition-all active:scale-95"
              >
                <span>Next Card</span>
                <ArrowRight className="w-4 h-4 !text-white" />
              </button>
            </div>
          </div>
        )}

        {/* ── 7. HISTORY MODE: Past Quiz Attempts in PostgreSQL ── */}
        {mode === 'history' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-500" />
                  <span>Historical Quiz Attempts & Scores</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Permanent records saved in PostgreSQL database.
                </p>
              </div>

              <button
                onClick={fetchHistory}
                disabled={isLoadingHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                <RefreshCw className={clsx('w-3.5 h-3.5', isLoadingHistory && 'animate-spin')} />
                <span>Refresh</span>
              </button>
            </div>

            {historyList.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-3">
                <BarChart2 className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Quiz Attempts Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Take your first interactive quiz on any uploaded document, and your score history will be recorded here!
                </p>
                <button
                  onClick={() => setMode('quiz')}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-1.5"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Take a Quiz Now</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {historyList.map((attempt) => {
                  const pct = attempt.percentage;
                  const dateStr = new Date(attempt.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={attempt.id}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {attempt.quizTitle}
                          </h4>
                          <span
                            className={clsx(
                              'text-[10px] font-bold px-2 py-0.5 rounded-full capitalize font-mono border',
                              attempt.difficulty === 'easy'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : attempt.difficulty === 'hard'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            )}
                          >
                            {attempt.difficulty}
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
                              {attempt.documentNames && attempt.documentNames.length > 0
                                ? attempt.documentNames.join(', ')
                                : 'Entire Knowledge Base'}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div className="flex items-center gap-4 flex-shrink-0 self-end sm:self-center">
                        <div className="text-right">
                          <div className="text-base font-black font-mono text-slate-900 dark:text-white">
                            {attempt.score} / {attempt.totalQuestions}
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold uppercase">
                            {pct >= 80 ? 'Mastery' : pct >= 60 ? 'Proficient' : 'Practice'}
                          </div>
                        </div>

                        <div
                          className={clsx(
                            'w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm font-mono border shadow-md',
                            pct >= 80
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : pct >= 60
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          )}
                        >
                          {pct}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default StudyHubView;

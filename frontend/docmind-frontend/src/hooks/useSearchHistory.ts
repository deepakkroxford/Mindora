import { useState, useCallback, useEffect } from 'react';

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

export const useSearchHistory = (maxItems: number = 10) => {
  const [history, setHistory] = useState<SearchHistoryItem[]>(() => {
    const saved = localStorage.getItem('searchHistory');
    return saved ? JSON.parse(saved) : [];
  });

  const addToHistory = useCallback((query: string) => {
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.query !== query);
      const newHistory = [
        { query, timestamp: Date.now() },
        ...filtered,
      ].slice(0, maxItems);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      return newHistory;
    });
  }, [maxItems]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('searchHistory');
  }, []);

  const removeFromHistory = useCallback((query: string) => {
    setHistory((prev) => {
      const newHistory = prev.filter((item) => item.query !== query);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  return { history, addToHistory, clearHistory, removeFromHistory };
};

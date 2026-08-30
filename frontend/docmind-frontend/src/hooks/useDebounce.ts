import { useCallback, useRef, useEffect } from 'react';

export const useDebounce = <T extends any[]>(
  callback: (...args: T) => void,
  delay: number
) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedCallback = useCallback(
    (...args: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

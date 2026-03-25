import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseAutocompleteOptions<T> {
  searchFn: (query: string) => Promise<T[]>;
  minChars?: number;
  debounceMs?: number;
}

export interface UseAutocompleteReturn<T> {
  results: T[];
  isLoading: boolean;
  query: string;
  setQuery: (q: string) => void;
  clear: () => void;
}

export function useAutocomplete<T>(
  options: UseAutocompleteOptions<T>,
): UseAutocompleteReturn<T> {
  const { searchFn, minChars = 2, debounceMs = 300 } = options;

  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const searchFnRef = useRef(searchFn);
  searchFnRef.current = searchFn;

  const setQuery = useCallback(
    (q: string) => {
      setQueryState(q);

      // Clear pending timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (q.length < minChars) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      timerRef.current = setTimeout(() => {
        const currentId = ++requestIdRef.current;

        searchFnRef
          .current(q)
          .then((data) => {
            // Only update if this is still the latest request
            if (currentId === requestIdRef.current) {
              setResults(data);
              setIsLoading(false);
            }
          })
          .catch(() => {
            if (currentId === requestIdRef.current) {
              setResults([]);
              setIsLoading(false);
            }
          });
      }, debounceMs);
    },
    [minChars, debounceMs],
  );

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    requestIdRef.current++;
    setQueryState('');
    setResults([]);
    setIsLoading(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { results, isLoading, query, setQuery, clear };
}

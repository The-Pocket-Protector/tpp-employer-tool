import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutocomplete } from '../useAutocomplete';

describe('useAutocomplete', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not fire search when query is below minChars', () => {
    const searchFn = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(() =>
      useAutocomplete({ searchFn, minChars: 2 }),
    );

    act(() => {
      result.current.setQuery('a');
    });

    vi.advanceTimersByTime(500);
    expect(searchFn).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it('fires search after debounce delay (300ms default)', async () => {
    const searchFn = vi.fn().mockResolvedValue([{ id: 1, name: 'Test' }]);
    const { result } = renderHook(() => useAutocomplete({ searchFn }));

    act(() => {
      result.current.setQuery('tes');
    });

    // Before debounce: no call yet
    expect(searchFn).not.toHaveBeenCalled();

    // After debounce: search fires
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(searchFn).toHaveBeenCalledWith('tes');
    expect(result.current.results).toEqual([{ id: 1, name: 'Test' }]);
    expect(result.current.isLoading).toBe(false);
  });

  it('cancels stale requests - only latest result is shown', async () => {
    let callCount = 0;
    const searchFn = vi.fn().mockImplementation((q: string) => {
      callCount++;
      const thisCall = callCount;
      return new Promise((resolve) => {
        // First call resolves slower than second
        setTimeout(
          () => resolve([{ id: thisCall, name: q }]),
          thisCall === 1 ? 200 : 50,
        );
      });
    });

    const { result } = renderHook(() => useAutocomplete({ searchFn }));

    // Type first query
    act(() => {
      result.current.setQuery('first');
    });

    // Fire first debounce
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Type second query before first resolves
    act(() => {
      result.current.setQuery('second');
    });

    // Fire second debounce
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Let second resolve (50ms)
    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    // Second result should be shown
    expect(result.current.results).toEqual([{ id: 2, name: 'second' }]);

    // Let first resolve (200ms total) - should be ignored since it's stale
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Still shows second result, not first
    expect(result.current.results).toEqual([{ id: 2, name: 'second' }]);
  });

  it('clear() resets query, results and loading', async () => {
    const searchFn = vi.fn().mockResolvedValue([{ id: 1, name: 'Test' }]);
    const { result } = renderHook(() => useAutocomplete({ searchFn }));

    act(() => {
      result.current.setQuery('test');
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.results).toHaveLength(1);

    act(() => {
      result.current.clear();
    });

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('clears results when query drops below minChars', async () => {
    const searchFn = vi.fn().mockResolvedValue([{ id: 1, name: 'Test' }]);
    const { result } = renderHook(() =>
      useAutocomplete({ searchFn, minChars: 3 }),
    );

    act(() => {
      result.current.setQuery('tes');
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.results).toHaveLength(1);

    act(() => {
      result.current.setQuery('te');
    });

    expect(result.current.results).toEqual([]);
  });

  it('sets isLoading true while waiting for debounce and search', () => {
    const searchFn = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useAutocomplete({ searchFn }));

    act(() => {
      result.current.setQuery('test');
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('handles search errors gracefully', async () => {
    const searchFn = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useAutocomplete({ searchFn }));

    act(() => {
      result.current.setQuery('test');
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});

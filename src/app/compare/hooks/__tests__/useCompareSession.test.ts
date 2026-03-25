import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCompareSession } from '../useCompareSession';
import { useCompareStore } from '@/stores/compare.store';

// Mock syncSession
vi.mock('@/services/compare.service', () => ({
  syncSession: vi.fn().mockResolvedValue('test-session-id'),
}));

import { syncSession } from '@/services/compare.service';

const mockedSyncSession = vi.mocked(syncSession);

describe('useCompareSession', () => {
  beforeEach(() => {
    // Reset store to initial state
    useCompareStore.getState().reset();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('restores sessionId from sessionStorage on mount', () => {
    sessionStorage.setItem('compare_session_id', 'restored-id');

    renderHook(() => useCompareSession());

    expect(useCompareStore.getState().sessionId).toBe('restored-id');
  });

  it('does not overwrite existing sessionId from store', () => {
    sessionStorage.setItem('compare_session_id', 'old-id');
    useCompareStore.getState().setField('sessionId', 'existing-id');

    renderHook(() => useCompareSession());

    expect(useCompareStore.getState().sessionId).toBe('existing-id');
  });

  it('auto-syncs on step change', async () => {
    useCompareStore.getState().setFlow('ntm');
    mockedSyncSession.mockResolvedValue('synced-id');

    renderHook(() => useCompareSession());

    // Change the step
    await act(async () => {
      useCompareStore.getState().nextStep();
    });

    // Allow async sync to complete
    await vi.waitFor(() => {
      expect(mockedSyncSession).toHaveBeenCalled();
    });
  });

  it('writes sessionId to sessionStorage after sync', async () => {
    useCompareStore.getState().setFlow('ntm');
    mockedSyncSession.mockResolvedValue('new-session-id');

    renderHook(() => useCompareSession());

    await act(async () => {
      useCompareStore.getState().nextStep();
    });

    await vi.waitFor(() => {
      expect(sessionStorage.getItem('compare_session_id')).toBe('new-session-id');
    });
  });

  it('writes sessionId to sessionStorage when sessionId changes in store', () => {
    renderHook(() => useCompareSession());

    act(() => {
      useCompareStore.getState().setField('sessionId', 'updated-id');
    });

    expect(sessionStorage.getItem('compare_session_id')).toBe('updated-id');
  });

  it('exposes manual updateSession that triggers sync', async () => {
    mockedSyncSession.mockResolvedValue('manual-sync-id');

    const { result } = renderHook(() => useCompareSession());

    await act(async () => {
      await result.current.updateSession();
    });

    expect(mockedSyncSession).toHaveBeenCalled();
    expect(sessionStorage.getItem('compare_session_id')).toBe('manual-sync-id');
  });
});

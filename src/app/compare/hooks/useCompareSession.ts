import { useEffect, useCallback, useRef } from 'react';
import { useCompareStore } from '@/stores/compare.store';
import { syncSession } from '@/services/compare.service';

const SESSION_STORAGE_KEY = 'compare_session_id';

export interface UseCompareSessionReturn {
  session: ReturnType<typeof useCompareStore.getState>;
  sessionId: string;
  updateSession: () => Promise<void>;
}

export function useCompareSession(): UseCompareSessionReturn {
  const store = useCompareStore();
  const { currentStep, sessionId, setField, flow } = store;
  const prevStepRef = useRef(currentStep);

  // Restore sessionId from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored && !useCompareStore.getState().sessionId) {
      setField('sessionId', stored);
    }
  }, [setField]);

  // Auto-sync on step change
  useEffect(() => {
    if (prevStepRef.current !== currentStep && flow) {
      prevStepRef.current = currentStep;
      syncSession()
        .then((id) => {
          if (id) {
            sessionStorage.setItem(SESSION_STORAGE_KEY, String(id));
          }
        })
        .catch((err) => console.error('Failed to sync compare session:', err));
    }
  }, [currentStep, flow]);

  // Persist sessionId to sessionStorage whenever it changes
  useEffect(() => {
    if (sessionId) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
  }, [sessionId]);

  const updateSession = useCallback(async () => {
    try {
      const id = await syncSession();
      if (id) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, String(id));
      }
    } catch (err) {
      console.error('Failed to sync compare session:', err);
    }
  }, []);

  return { session: store, sessionId, updateSession };
}

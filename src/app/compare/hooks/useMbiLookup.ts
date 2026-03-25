import { useState, useCallback } from 'react';
import { useCompareStore } from '@/stores/compare.store';
import { lookupMbi } from '@/services/compare.service';
import type { MbiLookupRequest, MbiLookupResponse } from '@/types/compare';

export interface UseMbiLookupReturn {
  lookup: (data: MbiLookupRequest) => Promise<void>;
  result: MbiLookupResponse | null;
  isLoading: boolean;
  error: string | null;
}

export function useMbiLookup(): UseMbiLookupReturn {
  const [result, setResult] = useState<MbiLookupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setField = useCompareStore((s) => s.setField);

  const lookup = useCallback(
    async (data: MbiLookupRequest) => {
      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        const resp = await lookupMbi(data);
        setResult(resp);

        // Populate store fields
        if (resp.mbi) setField('mbi', resp.mbi);
        if (resp.part_a_date) setField('partADate', resp.part_a_date);
        if (resp.part_b_date) setField('partBDate', resp.part_b_date);
        setField(
          'subscriberName',
          `${data.first_name} ${data.last_name}`,
        );
        setField('verified', true);
      } catch {
        setError('Verification failed. Please check your information and try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [setField],
  );

  return { lookup, result, isLoading, error };
}

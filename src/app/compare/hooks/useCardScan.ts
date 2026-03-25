import { useState, useCallback } from 'react';
import { useCompareStore } from '@/stores/compare.store';
import { scanCard } from '@/services/compare.service';
import type { CardScanResponse } from '@/types/compare';

export interface UseCardScanReturn {
  scan: (file: File) => Promise<void>;
  result: CardScanResponse | null;
  isScanning: boolean;
  error: string | null;
}

export function useCardScan(): UseCardScanReturn {
  const [result, setResult] = useState<CardScanResponse | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setField = useCompareStore((s) => s.setField);

  const scan = useCallback(
    async (file: File) => {
      setIsScanning(true);
      setError(null);
      setResult(null);

      try {
        const resp = await scanCard(file);
        setResult(resp);

        // Populate store fields
        if (resp.name) setField('subscriberName', resp.name);
        if (resp.carrier) setField('carrierName', resp.carrier);
        if (resp.memberId) setField('memberId', resp.memberId);
        if (resp.mbi) setField('mbi', resp.mbi);
        if (resp.part_a_date) setField('partADate', resp.part_a_date);
        if (resp.part_b_date) setField('partBDate', resp.part_b_date);
      } catch {
        setError('Card scan failed. Please try again.');
      } finally {
        setIsScanning(false);
      }
    },
    [setField],
  );

  return { scan, result, isScanning, error };
}

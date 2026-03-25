import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCardScan } from '../useCardScan';
import { useCompareStore } from '@/stores/compare.store';

vi.mock('@/services/compare.service', () => ({
  scanCard: vi.fn(),
}));

import { scanCard } from '@/services/compare.service';

const mockedScanCard = vi.mocked(scanCard);

describe('useCardScan', () => {
  beforeEach(() => {
    useCompareStore.getState().reset();
    vi.clearAllMocks();
  });

  it('sets isScanning true during scan and false after', async () => {
    let resolvePromise!: (value: Awaited<ReturnType<typeof scanCard>>) => void;
    mockedScanCard.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const { result } = renderHook(() => useCardScan());

    expect(result.current.isScanning).toBe(false);

    let scanPromise: Promise<void>;
    act(() => {
      scanPromise = result.current.scan(new File([], 'card.jpg'));
    });

    expect(result.current.isScanning).toBe(true);

    await act(async () => {
      resolvePromise!({
        name: 'John Doe',
        carrier: 'Medicare',
        memberId: '123',
        mbi: 'ABC123',
        part_a_date: '2024-01-01',
        part_b_date: '2024-03-01',
        confidence: 0.95,
      });
      await scanPromise;
    });

    expect(result.current.isScanning).toBe(false);
  });

  it('populates store on success', async () => {
    mockedScanCard.mockResolvedValue({
      name: 'Jane Doe',
      carrier: 'Humana',
      memberId: 'MEM456',
      mbi: 'MBI789',
      part_a_date: '2023-06-01',
      part_b_date: '2023-09-01',
      confidence: 0.9,
    });

    const { result } = renderHook(() => useCardScan());

    await act(async () => {
      await result.current.scan(new File([], 'card.jpg'));
    });

    const store = useCompareStore.getState();
    expect(store.subscriberName).toBe('Jane Doe');
    expect(store.carrierName).toBe('Humana');
    expect(store.memberId).toBe('MEM456');
    expect(store.mbi).toBe('MBI789');
    expect(store.partADate).toBe('2023-06-01');
    expect(store.partBDate).toBe('2023-09-01');

    expect(result.current.result).toEqual(
      expect.objectContaining({ name: 'Jane Doe', mbi: 'MBI789' }),
    );
    expect(result.current.error).toBeNull();
  });

  it('sets error on failure', async () => {
    mockedScanCard.mockRejectedValue(new Error('Scan failed'));

    const { result } = renderHook(() => useCardScan());

    await act(async () => {
      await result.current.scan(new File([], 'card.jpg'));
    });

    expect(result.current.error).toBe('Card scan failed. Please try again.');
    expect(result.current.result).toBeNull();
    expect(result.current.isScanning).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMbiLookup } from '../useMbiLookup';
import { useCompareStore } from '@/stores/compare.store';

vi.mock('@/services/compare.service', () => ({
  lookupMbi: vi.fn(),
}));

import { lookupMbi } from '@/services/compare.service';

const mockedLookupMbi = vi.mocked(lookupMbi);

describe('useMbiLookup', () => {
  beforeEach(() => {
    useCompareStore.getState().reset();
    vi.clearAllMocks();
  });

  it('sets isLoading true during lookup and false after', async () => {
    let resolvePromise!: (value: Awaited<ReturnType<typeof lookupMbi>>) => void;
    mockedLookupMbi.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const { result } = renderHook(() => useMbiLookup());

    expect(result.current.isLoading).toBe(false);

    let lookupPromise: Promise<void>;
    act(() => {
      lookupPromise = result.current.lookup({
        first_name: 'John',
        last_name: 'Doe',
        dob: '1955-01-01',
        mbi: '1EG4TE5MK72',
      });
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise!({
        mbi: 'ABC123DEF',
        part_a_date: '2020-01-01',
        part_b_date: '2020-03-01',
        status: 'Active',
      });
      await lookupPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('populates store on success', async () => {
    mockedLookupMbi.mockResolvedValue({
      mbi: 'XYZ987',
      part_a_date: '2021-06-01',
      part_b_date: '2021-09-01',
      status: 'Active',
    });

    const { result } = renderHook(() => useMbiLookup());

    await act(async () => {
      await result.current.lookup({
        first_name: 'Jane',
        last_name: 'Smith',
        dob: '1960-05-15',
        mbi: '5UR4EM5WA82',
      });
    });

    const store = useCompareStore.getState();
    expect(store.mbi).toBe('XYZ987');
    expect(store.partADate).toBe('2021-06-01');
    expect(store.partBDate).toBe('2021-09-01');
    expect(store.subscriberName).toBe('Jane Smith');
    expect(store.verified).toBe(true);

    expect(result.current.result).toEqual(
      expect.objectContaining({ mbi: 'XYZ987', status: 'Active' }),
    );
    expect(result.current.error).toBeNull();
  });

  it('sets error on failure', async () => {
    mockedLookupMbi.mockRejectedValue(new Error('Lookup failed'));

    const { result } = renderHook(() => useMbiLookup());

    await act(async () => {
      await result.current.lookup({
        first_name: 'John',
        last_name: 'Doe',
        dob: '1955-01-01',
        mbi: '1EG4TE5MK72',
      });
    });

    expect(result.current.error).toBe(
      'Lookup failed. Please check your information and try again.',
    );
    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});

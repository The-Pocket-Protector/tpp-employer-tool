import type {
  Provider,
  Drug,
  Pharmacy,
  CompareSession,
  MbiLookupRequest,
  MbiLookupResponse,
  CardScanResponse,
  RecommendResponse,
} from '@/types/compare';
import {
  searchDoctors,
  searchHospitals as searchHospitalsService,
  searchDrugsService,
  createCompareSession,
  updateCompareSession,
  syncSession as syncSessionService,
  lookupMbi as lookupMbiService,
  scanCard as scanCardService,
  submitForRecommendation,
  type HospitalSearchResult,
} from '@/services/compare.service';
import { tppApi } from '@/lib/axios';

const MIN_QUERY_LENGTH = 2;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

export async function searchProviders(
  q: string,
  zip?: string,
  limit?: number,
): Promise<Provider[]> {
  if (q.length < MIN_QUERY_LENGTH) return [];
  const results = await searchDoctors(q, zip ?? '');
  return limit ? results.slice(0, limit) : results;
}

export async function searchHospitals(
  q: string,
  zip?: string,
  limit?: number,
): Promise<HospitalSearchResult[]> {
  if (q.length < MIN_QUERY_LENGTH) return [];
  const results = await searchHospitalsService(zip ?? '');
  const filtered = results.filter((h) =>
    h.name.toLowerCase().includes(q.toLowerCase()),
  );
  return limit ? filtered.slice(0, limit) : filtered;
}

export async function searchDrugs(
  q: string,
  limit?: number,
): Promise<Drug[]> {
  if (q.length < MIN_QUERY_LENGTH) return [];
  const results = await searchDrugsService(q);
  return limit ? results.slice(0, limit) : results;
}

export async function searchPharmacies(
  q: string,
  zip?: string,
  limit?: number,
): Promise<Pharmacy[]> {
  if (q.length < MIN_QUERY_LENGTH) return [];
  const { data } = await tppApi.get('/pharmacies', {
    params: { q, zip, limit: limit ?? 20 },
  });
  const pharmacies: AnyObj[] = data?.pharmacies ?? [];
  return pharmacies.map((p) => ({
    npi: String(p.npi ?? ''),
    name: String(p.name ?? ''),
    address: String(p.address ?? ''),
    chain: p.chain ? String(p.chain) : undefined,
  }));
}

export async function createSession(session: CompareSession): Promise<string> {
  return createCompareSession(session);
}

export async function updateSession(
  id: string,
  session: CompareSession,
): Promise<void> {
  return updateCompareSession(id, session);
}

export async function syncSession(): Promise<string | void> {
  return syncSessionService();
}

export async function lookupMbi(
  req: MbiLookupRequest,
): Promise<MbiLookupResponse> {
  return lookupMbiService(req);
}

export async function scanCard(file: File): Promise<CardScanResponse> {
  return scanCardService(file);
}

export async function submitRecommendation(
  session: CompareSession,
): Promise<RecommendResponse> {
  return submitForRecommendation(session);
}

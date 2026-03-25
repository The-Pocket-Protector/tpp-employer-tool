import type {
  MbiLookupRequest,
  MbiLookupResponse,
  CardScanResponse,
  Provider,
  Hospital,
  RecommendResponse,
  CompareSession,
} from '@/types/compare';
import { lookupZipV3 } from './zip.service';
import { performEligibilityCheck } from './stedi.service';
import { tppApi, createApiInstance } from '@/lib/axios';

// --- Compare session API (tpp-backend) ---

const RAILWAY_API_URL = import.meta.env.VITE_RAILWAY_API_URL || 'http://localhost:8000/api';
const compareApi = createApiInstance(RAILWAY_API_URL);

interface CompareSessionResponse {
  session_id: string;
  status: string;
  created_at: string;
  expires_at: string;
}

/** Build the session_data payload from the full store state. */
function buildSessionData(session: CompareSession) {
  return {
    currentStep: session.currentStep,
    identifyMode: session.identifyMode,
    ntmSituation: session.ntmSituation,
    zip: session.zip,
    county: session.county,
    state: session.state,
    mbi: session.mbi,
    partADate: session.partADate,
    partBDate: session.partBDate,
    subscriberName: session.subscriberName,
    dob: session.dob,
    carrierName: session.carrierName,
    memberId: session.memberId,
    verified: session.verified,
    doctors: session.doctors,
    hospitals: session.hospitals,
    drugs: session.drugs,
    pharmacyType: session.pharmacyType,
    pharmacyName: session.pharmacyName,
    csnpConditions: session.csnpConditions,
    medicaid: session.medicaid,
    benefits: session.benefits,
    benefitNotes: session.benefitNotes,
    currentCarrier: session.currentCarrier,
    currentPlanName: session.currentPlanName,
    switchReasons: session.switchReasons,
  };
}

/** Create a new compare session on the backend. Returns session_id. */
export async function createCompareSession(session: CompareSession): Promise<string> {
  const { data } = await compareApi.post<CompareSessionResponse>('/compare/session', {
    flow_type: session.flow,
    session_data: buildSessionData(session),
    mbi: session.mbi || undefined,
    zip: session.zip || undefined,
  });
  return data.session_id;
}

/** Update an existing compare session with current wizard state. */
export async function updateCompareSession(sessionId: string, session: CompareSession): Promise<void> {
  await compareApi.patch<CompareSessionResponse>(`/compare/session/${sessionId}`, {
    session_data: buildSessionData(session),
    mbi: session.mbi || undefined,
    zip: session.zip || undefined,
  });
}

/**
 * Sync the current store state to the backend.
 * Creates a new session if one doesn't exist, otherwise updates.
 * Returns the session ID.
 */
let _syncInFlight: Promise<string | void> | null = null;

export async function syncSession(): Promise<string | void> {
  // Prevent concurrent syncs from racing
  if (_syncInFlight) {
    await _syncInFlight;
  }

  // Dynamic import to avoid circular dependency
  const { useCompareStore } = await import('@/stores/compare.store');
  const state = useCompareStore.getState();

  if (!state.flow) return;

  const doSync = async () => {
    if (!state.sessionId) {
      const id = await createCompareSession(state);
      useCompareStore.getState().setField('sessionId', id);
      return id;
    } else {
      await updateCompareSession(state.sessionId, state);
      return state.sessionId;
    }
  };

  _syncInFlight = doSync().finally(() => { _syncInFlight = null; });
  return _syncInFlight;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

export async function lookupMbi(request: MbiLookupRequest): Promise<MbiLookupResponse> {
  const cardData = {
    subscriberName: `${request.first_name} ${request.last_name}`,
    memberId: request.mbi,
    carrierName: 'Medicare',
    groupNumber: '',
    state: '',
  };

  const result: AnyObj = await performEligibilityCheck(
    cardData,
    request.dob.replace(/-/g, ''),
    '',
  );

  const status = result.eligibility?.status ?? 'Unknown';
  if (status === 'Error' || result.eligibility?.error) {
    throw new Error(result.eligibility?.error || 'Invalid MBI or eligibility check failed. Please verify your MBI and try again.');
  }

  return {
    mbi: request.mbi,
    part_a_date: result.eligibility?.effectiveDate ?? '',
    part_b_date: '',
    status,
  };
}

export async function scanCard(file: File): Promise<CardScanResponse> {
  const form = new FormData();
  form.append('image', file);
  const { data } = await compareApi.post<CardScanResponse>('/compare/card-scan', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function searchDoctors(query: string, zip: string): Promise<Provider[]> {
  const { data } = await tppApi.get('/physicians', {
    params: { q: query, zip, limit: 20 },
  });
  const physicians: AnyObj[] = data?.physicians ?? [];
  return physicians.map((r) => ({
    npi: String(r.npi ?? ''),
    name: String(r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : r.name ?? '').trim(),
    specialty: r.specialty ? String(r.specialty) : undefined,
    address: r.address ? `${r.address}, ${r.city ?? ''} ${r.state ?? ''}`.trim() : undefined,
  }));
}

interface DrugSearchResult {
  rxcui: string;
  drug_name: string;
  form?: string;
  strength?: string;
}

export async function searchDrugsService(query: string): Promise<DrugSearchResult[]> {
  const { data } = await tppApi.get('/drugs', {
    params: { q: query, limit: 20 },
  });
  const drugs: AnyObj[] = data?.drugs ?? [];
  return drugs.map((d) => ({
    rxcui: String(d.rxcui ?? d.id ?? ''),
    drug_name: String(d.drug_name ?? d.name ?? ''),
    form: d.dosage_strength ? String(d.dosage_strength) : undefined,
    strength: undefined,
  }));
}

export async function lookupZip(zipCode: string) {
  return lookupZipV3(zipCode);
}

const BENEFIT_TO_PRIORITY: Record<string, string> = {
  'Drug Coverage': 'drug-coverage',
  'Low Premium': 'low-premium',
  'Low Out-of-Pocket': 'low-oop',
  'Keep My Doctors': 'keep-doctors',
  'Dental': 'dental',
  'Vision': 'vision',
  'Hearing': 'hearing',
  'OTC Allowance': 'otc',
  'Fitness': 'fitness',
};

export async function submitForRecommendation(
  session: CompareSession,
): Promise<RecommendResponse> {
  const payload = {
    zip: session.zip,
    county: session.county || undefined,
    state: session.state || undefined,
    doctors: session.doctors.map((d) => ({ npi: d.npi, name: d.name })),
    drugs: session.drugs.map((d) => ({ name: d.drug_name })),
    priorities: session.benefits
      .map((b) => BENEFIT_TO_PRIORITY[b] ?? b.toLowerCase().replace(/\s+/g, '-'))
      .filter(Boolean),
    plan_types: session.flow === 'pdp' ? ['PDP'] : ['HMO', 'PPO'],
  };

  const { data } = await tppApi.post('/recommend', payload);
  return data as RecommendResponse;
}

export interface HospitalSearchResult extends Hospital {
  rating?: number;
}

export async function searchHospitals(zip: string): Promise<HospitalSearchResult[]> {
  const { data } = await tppApi.get('/hospitals', {
    params: { zip, limit: 10 },
  });
  const hospitals: AnyObj[] = data?.hospitals ?? [];
  return hospitals.map((h) => ({
    ccn: String(h.provider_id ?? h.ccn ?? ''),
    name: String(h.hospital_name ?? h.name ?? ''),
    city: String(h.city ?? ''),
    state: String(h.state ?? ''),
    rating: h.overall_rating ? Number(h.overall_rating) : undefined,
  }));
}

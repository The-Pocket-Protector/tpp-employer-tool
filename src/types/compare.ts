import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const FlowTypeSchema = z.enum(['ntm', 'magic', 'pdp']);
export type FlowType = z.infer<typeof FlowTypeSchema>;

export const IdentifyModeSchema = z.enum(['card', 'manual', 'skip']);
export type IdentifyMode = z.infer<typeof IdentifyModeSchema>;

export const NtmSituationSchema = z.enum(['group', 'retirement', 'turning65', 'disability']);
export type NtmSituation = z.infer<typeof NtmSituationSchema>;

// ============================================
// Provider / Hospital / Drug
// ============================================

export const ProviderSchema = z.object({
  npi: z.string(),
  name: z.string(),
  specialty: z.string().optional(),
  address: z.string().optional(),
});
export type Provider = z.infer<typeof ProviderSchema>;

export const HospitalSchema = z.object({
  ccn: z.string(),
  name: z.string(),
  city: z.string(),
  state: z.string(),
});
export type Hospital = z.infer<typeof HospitalSchema>;

export const DrugSchema = z.object({
  rxcui: z.string(),
  drug_name: z.string(),
  form: z.string().optional(),
  strength: z.string().optional(),
});
export type Drug = z.infer<typeof DrugSchema>;

export const PharmacySchema = z.object({
  npi: z.string(),
  name: z.string(),
  address: z.string(),
  chain: z.string().optional(),
});
export type Pharmacy = z.infer<typeof PharmacySchema>;

// ============================================
// MBI Lookup
// ============================================

export const MbiLookupRequestSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  dob: z.string().min(1),
  mbi: z.string().min(11).max(11),
});
export type MbiLookupRequest = z.infer<typeof MbiLookupRequestSchema>;

export const MbiLookupResponseSchema = z.object({
  mbi: z.string(),
  part_a_date: z.string(),
  part_b_date: z.string(),
  status: z.string(),
});
export type MbiLookupResponse = z.infer<typeof MbiLookupResponseSchema>;

// ============================================
// Card Scan
// ============================================

export const CardScanResponseSchema = z.object({
  mbi: z.string().optional(),
  part_a_date: z.string().optional(),
  part_b_date: z.string().optional(),
  name: z.string().optional(),
  carrier: z.string().optional(),
  memberId: z.string().optional(),
  planId: z.string().optional(),
  confidence: z.number(),
});
export type CardScanResponse = z.infer<typeof CardScanResponseSchema>;

// ============================================
// Plan Recommendation (from tpp-api /api/recommend)
// ============================================

export const DrugDetailSchema = z.object({
  drug_name: z.string(),
  covered: z.boolean(),
  tier: z.number().optional(),
  prior_auth: z.boolean().optional(),
  step_therapy: z.boolean().optional(),
  quantity_limit: z.boolean().optional(),
  estimated_annual_cost: z.number().optional(),
});
export type DrugDetail = z.infer<typeof DrugDetailSchema>;

export const PlanScoresSchema = z.object({
  drug_coverage: z.number().optional(),
  premium: z.number().optional(),
  out_of_pocket: z.number().optional(),
  doctor_network: z.number().optional(),
  star_rating: z.number().optional(),
  benefits: z.number().optional(),
});
export type PlanScores = z.infer<typeof PlanScoresSchema>;

export const PlanRecommendationSchema = z.object({
  rank: z.number(),
  contract_id: z.string(),
  plan_id: z.string(),
  segment_id: z.string().optional(),
  plan_name: z.string(),
  carrier: z.string(),
  plan_type: z.string(),
  star_rating: z.number().optional(),
  monthly_premium: z.number(),
  estimated_annual_drug_cost: z.number().optional(),
  drugs_covered: z.number().optional(),
  drugs_total: z.number().optional(),
  drug_details: z.array(DrugDetailSchema).optional(),
  doctors_in_network: z.number().optional(),
  doctors_total: z.number().optional(),
  moop: z.number().optional(),
  overall_score: z.number().optional(),
  scores: PlanScoresSchema.optional(),
  key_benefits: z.array(z.string()).optional(),
  reasoning: z.string().optional(),
  enrollment_url: z.string().optional(),
  enrollment_tier: z.string().optional(),
  disclaimers: z.array(z.string()).optional(),
});
export type PlanRecommendation = z.infer<typeof PlanRecommendationSchema>;

export const RecommendResponseSchema = z.object({
  recommendations: z.array(PlanRecommendationSchema),
  total_plans_scored: z.number().optional(),
  zip: z.string().optional(),
  county: z.string().optional(),
  state: z.string().optional(),
  weights_used: z.record(z.string(), z.number()).optional(),
});
export type RecommendResponse = z.infer<typeof RecommendResponseSchema>;

// ============================================
// Step Keys
// ============================================

export type StepKey =
  | 'ntm-situation'
  | 'identify'
  | 'current-plan'
  | 'zip'
  | 'doctors'
  | 'hospitals'
  | 'drugs'
  | 'pharmacy'
  | 'csnp'
  | 'medicaid'
  | 'benefits'
  | 'recommendation';

// ============================================
// Compare Session (full state)
// ============================================

export const CompareSessionSchema = z.object({
  flow: FlowTypeSchema.nullable(),
  currentStep: z.number(),
  identifyMode: IdentifyModeSchema.nullable(),
  ntmSituation: NtmSituationSchema.nullable(),
  zip: z.string(),
  county: z.string(),
  state: z.string(),
  mbi: z.string(),
  partADate: z.string(),
  partBDate: z.string(),
  subscriberName: z.string(),
  dob: z.string(),
  carrierName: z.string(),
  memberId: z.string(),
  doctors: z.array(ProviderSchema),
  hospitals: z.array(HospitalSchema),
  drugs: z.array(DrugSchema),
  pharmacyType: z.enum(['retail', 'mail', 'preferred']).nullable(),
  pharmacyName: z.string(),
  csnpConditions: z.array(z.string()),
  medicaid: z.enum(['yes', 'no', 'unsure']).nullable(),
  benefits: z.array(z.string()),
  benefitNotes: z.string(),
  currentCarrier: z.string(),
  currentPlanName: z.string(),
  switchReasons: z.array(z.string()),
  verified: z.boolean(),
  recommendations: z.array(PlanRecommendationSchema),
  sessionId: z.string(),
});
export type CompareSession = z.infer<typeof CompareSessionSchema>;

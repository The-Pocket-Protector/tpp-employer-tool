import type { FlowType, StepKey, CompareSession } from '@/types/compare';

export const FLOW_STEPS: Record<FlowType, StepKey[]> = {
  ntm: [
    'ntm-situation',
    'identify',
    'zip',
    'doctors',
    'hospitals',
    'drugs',
    'pharmacy',
    'csnp',
    'medicaid',
    'benefits',
    'recommendation',
  ],
  magic: [
    'identify',
    'current-plan',
    'zip',
    'doctors',
    'hospitals',
    'drugs',
    'pharmacy',
    'csnp',
    'medicaid',
    'benefits',
    'recommendation',
  ],
  pdp: [
    'identify',
    'zip',
    'drugs',
    'pharmacy',
    'recommendation',
  ],
};

type ValidationFn = (data: CompareSession, flow: FlowType) => boolean;

export const STEP_VALIDATION: Record<StepKey, ValidationFn> = {
  'ntm-situation': (data) => data.ntmSituation !== null,
  'identify': () => true,
  'current-plan': () => true,
  'zip': (data) => /^\d{5}$/.test(data.zip),
  'doctors': () => true,
  'hospitals': () => true,
  'drugs': (data, flow) => {
    if (flow === 'pdp') {
      return data.drugs.length >= 1 && data.drugs.every((d) => d.drug_name.trim() !== '');
    }
    return true;
  },
  'pharmacy': () => true,
  'csnp': () => true,
  'medicaid': (data) => data.medicaid !== null,
  'benefits': () => true,
  'recommendation': () => true,
};

export const SKIPPABLE_STEPS: Set<StepKey> = new Set([
  'identify',
  'current-plan',
  'doctors',
  'hospitals',
  'pharmacy',
  'csnp',
  'benefits',
]);

interface StepMeta {
  label: string;
  buttonText: string;
}

export const STEP_META: Record<StepKey, StepMeta> = {
  'ntm-situation': { label: 'Your Situation', buttonText: 'Continue' },
  'identify': { label: 'Verify Identity', buttonText: 'Continue' },
  'current-plan': { label: 'Current Plan', buttonText: 'Continue' },
  'zip': { label: 'Your Location', buttonText: 'Continue' },
  'doctors': { label: 'Your Doctors', buttonText: 'Continue' },
  'hospitals': { label: 'Your Hospitals', buttonText: 'Continue' },
  'drugs': { label: 'Your Medications', buttonText: 'Continue' },
  'pharmacy': { label: 'Pharmacy Preference', buttonText: 'Continue' },
  'csnp': { label: 'Chronic Conditions', buttonText: 'Continue' },
  'medicaid': { label: 'Medicaid Status', buttonText: 'Continue' },
  'benefits': { label: 'Benefit Priorities', buttonText: 'Continue' },
  'recommendation': { label: 'Your Plan', buttonText: 'Find My Plan' },
};

export function getStepKey(flow: FlowType, stepIndex: number): StepKey | undefined {
  return FLOW_STEPS[flow]?.[stepIndex];
}

export function getFlowLength(flow: FlowType): number {
  return FLOW_STEPS[flow]?.length ?? 0;
}

export function isStepValid(stepKey: StepKey, data: CompareSession, flow: FlowType): boolean {
  return STEP_VALIDATION[stepKey](data, flow);
}

export function isSkippable(stepKey: StepKey, flow: FlowType): boolean {
  if (stepKey === 'drugs' && flow === 'pdp') return false;
  return SKIPPABLE_STEPS.has(stepKey);
}

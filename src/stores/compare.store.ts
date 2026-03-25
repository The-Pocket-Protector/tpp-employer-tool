import { create } from 'zustand';
import type {
  FlowType,
  IdentifyMode,
  Provider,
  Hospital,
  Drug,
  PlanRecommendation,
  CompareSession,
} from '@/types/compare';

interface CompareActions {
  setFlow: (flow: FlowType) => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setIdentifyMode: (mode: IdentifyMode) => void;
  setField: <K extends keyof CompareSession>(key: K, value: CompareSession[K]) => void;
  addDoctor: (doctor: Provider) => void;
  removeDoctor: (npi: string) => void;
  addHospital: (hospital: Hospital) => void;
  removeHospital: (ccn: string) => void;
  addDrug: (drug: Drug) => void;
  removeDrug: (rxcui: string) => void;
  toggleBenefit: (benefit: string) => void;
  toggleCsnpCondition: (condition: string) => void;
  toggleSwitchReason: (reason: string) => void;
  setRecommendations: (plans: PlanRecommendation[], sessionId: string) => void;
  reset: () => void;
}

const initialState: CompareSession = {
  flow: null,
  currentStep: 0,
  identifyMode: null,
  ntmSituation: null,
  zip: '',
  county: '',
  state: '',
  mbi: '',
  partADate: '',
  partBDate: '',
  subscriberName: '',
  dob: '',
  carrierName: '',
  memberId: '',
  doctors: [],
  hospitals: [],
  drugs: [],
  pharmacyType: null,
  pharmacyName: '',
  csnpConditions: [],
  medicaid: null,
  benefits: [],
  benefitNotes: '',
  currentCarrier: '',
  currentPlanName: '',
  switchReasons: [],
  verified: false,
  recommendations: [],
  sessionId: '',
};

export const useCompareStore = create<CompareSession & CompareActions>((set) => ({
  ...initialState,

  setFlow: (flow) => set({ flow, currentStep: 0 }),

  setStep: (step) => set({ currentStep: step }),

  nextStep: () => set((s) => ({ currentStep: s.currentStep + 1 })),

  prevStep: () => set((s) => ({ currentStep: Math.max(0, s.currentStep - 1) })),

  setIdentifyMode: (mode) => set({ identifyMode: mode }),

  setField: (key, value) => set({ [key]: value }),

  addDoctor: (doctor) =>
    set((s) => ({
      doctors: s.doctors.some((d) => d.npi === doctor.npi)
        ? s.doctors
        : [...s.doctors, doctor],
    })),

  removeDoctor: (npi) =>
    set((s) => ({ doctors: s.doctors.filter((d) => d.npi !== npi) })),

  addHospital: (hospital) =>
    set((s) => ({
      hospitals: s.hospitals.some((h) => h.ccn === hospital.ccn)
        ? s.hospitals
        : [...s.hospitals, hospital],
    })),

  removeHospital: (ccn) =>
    set((s) => ({ hospitals: s.hospitals.filter((h) => h.ccn !== ccn) })),

  addDrug: (drug) =>
    set((s) => ({
      drugs: s.drugs.some((d) => d.rxcui === drug.rxcui)
        ? s.drugs
        : [...s.drugs, drug],
    })),

  removeDrug: (rxcui) =>
    set((s) => ({ drugs: s.drugs.filter((d) => d.rxcui !== rxcui) })),

  toggleBenefit: (benefit) =>
    set((s) => ({
      benefits: s.benefits.includes(benefit)
        ? s.benefits.filter((b) => b !== benefit)
        : [...s.benefits, benefit],
    })),

  toggleCsnpCondition: (condition) =>
    set((s) => ({
      csnpConditions: s.csnpConditions.includes(condition)
        ? s.csnpConditions.filter((c) => c !== condition)
        : [...s.csnpConditions, condition],
    })),

  toggleSwitchReason: (reason) =>
    set((s) => ({
      switchReasons: s.switchReasons.includes(reason)
        ? s.switchReasons.filter((r) => r !== reason)
        : [...s.switchReasons, reason],
    })),

  setRecommendations: (plans, sessionId) =>
    set({ recommendations: plans, sessionId }),

  reset: () => set(initialState),
}));

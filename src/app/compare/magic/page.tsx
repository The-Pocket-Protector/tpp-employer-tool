import { useEffect } from 'react';
import { useCompareStore } from '@/stores/compare.store';
import { FLOW_STEPS } from '@/stores/flow-config';
import type { StepKey } from '@/types/compare';
import StepTransition from '../components/ui/StepTransition';
import IdentifyStep from '../components/IdentifyStep';
import CurrentPlanStep from '../components/CurrentPlanStep';
import ZipStep from '../components/ZipStep';
import DoctorStep from '../components/DoctorStep';
import HospitalStep from '../components/HospitalStep';
import DrugStep from '../components/DrugStep';
import PharmacyStep from '../components/PharmacyStep';
import CsnpStep from '../components/CsnpStep';
import MedicaidStep from '../components/MedicaidStep';
import BenefitsStep from '../components/BenefitsStep';
import RecommendationPage from '../components/RecommendationPage';

const STEP_MAP: Record<StepKey, React.ComponentType> = {
  'ntm-situation': () => null,
  'identify': IdentifyStep,
  'current-plan': CurrentPlanStep,
  'zip': ZipStep,
  'doctors': DoctorStep,
  'hospitals': HospitalStep,
  'drugs': DrugStep,
  'pharmacy': PharmacyStep,
  'csnp': CsnpStep,
  'medicaid': MedicaidStep,
  'benefits': BenefitsStep,
  'recommendation': RecommendationPage,
};

export default function MagicFlow() {
  const { currentStep, setFlow } = useCompareStore();

  useEffect(() => {
    setFlow('magic');
  }, [setFlow]);

  const steps = FLOW_STEPS.magic;
  const stepKey = steps[currentStep] ?? steps[0];
  const StepComponent = STEP_MAP[stepKey];

  return (
    <StepTransition stepKey={stepKey}>
      <StepComponent />
    </StepTransition>
  );
}

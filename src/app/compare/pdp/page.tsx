import { useEffect } from 'react';
import { useCompareStore } from '@/stores/compare.store';
import { FLOW_STEPS } from '@/stores/flow-config';
import type { StepKey } from '@/types/compare';
import StepTransition from '../components/ui/StepTransition';
import IdentifyStep from '../components/IdentifyStep';
import ZipStep from '../components/ZipStep';
import DrugStep from '../components/DrugStep';
import PharmacyStep from '../components/PharmacyStep';
import RecommendationPage from '../components/RecommendationPage';

const STEP_MAP: Record<StepKey, React.ComponentType> = {
  'ntm-situation': () => null,
  'identify': IdentifyStep,
  'current-plan': () => null,
  'zip': ZipStep,
  'doctors': () => null,
  'hospitals': () => null,
  'drugs': DrugStep,
  'pharmacy': PharmacyStep,
  'csnp': () => null,
  'medicaid': () => null,
  'benefits': () => null,
  'recommendation': RecommendationPage,
};

export default function PdpFlow() {
  const { currentStep, setFlow } = useCompareStore();

  useEffect(() => {
    setFlow('pdp');
  }, [setFlow]);

  const steps = FLOW_STEPS.pdp;
  const stepKey = steps[currentStep] ?? steps[0];
  const StepComponent = STEP_MAP[stepKey];

  return (
    <StepTransition stepKey={stepKey}>
      <StepComponent />
    </StepTransition>
  );
}
